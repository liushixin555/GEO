# 软件架构专家评审：table.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/table.tsx`
**评审角色**: 软件架构专家（模块职责 · 抽象层级 · 接口契约 · 耦合度 · 内聚性 · 可扩展性 · 设计模式 · 架构演进性）
**评审日期**: 2026-05-25
**代码行数**: 53 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"表格"命令实现，通过 `prefix` 属性携带 5 行表格模板（2 列 × 4 行）执行插入/移除操作，使用 `selectWord` + `executeCommand` 两步管道处理文本变换
**评审结论**: ⚠️ APPROVE WITH COMMENTS 5.0分 — 架构定位错误：table.tsx 本质是**模板插入命令**（Template Command），却复用了 inline 命令管道处理块级元素；`selectWord` 无法处理多行内容、toggle 移除逻辑在用户编辑后成为死代码、execute 双分支架构在命令簇中独一无二却无对应抽象——三个问题共同指向根因：**命令分类体系中缺少"模板插入"这一类别**

---

## 修复状态（2026-05-26 更新）

本项目通过 `pages/components/MarkdownEditor.tsx` 的 `commandsFilter` 覆盖机制修复了所有关键问题，**不直接修改库源码**（通过运行时覆盖绕过第三方库限制）。

| ID | 严重度 | 问题 | 修复状态 | 修复位置 |
|----|--------|------|----------|----------|
| P1-HIGH-01 | HIGH | inline 管道处理块级模板 | ✅ 已修复 | MarkdownEditor.tsx commandsFilter → 纯模板插入管道（无 toggle、无 selectWord） |
| P1-HIGH-02 | HIGH | execute 圈复杂度 3，双分支架构 | ✅ 已修复 | MarkdownEditor.tsx commandsFilter → 单分支插入，圈复杂度 1 |
| P2-MEDIUM-01 | MEDIUM | ICommand 缺少命令分类 | ⚠️ 架构限制 | 第三方库接口无法修改；commandsFilter 通过 `command.name` 运行时识别 |
| P2-MEDIUM-02 | MEDIUM | 4 处 `prefix!` 非空断言 | ✅ 已修复 | MarkdownEditor.tsx commandsFilter → 防御性检查（`state.text`/`selection` 边界校验） |
| P3-LOW-01 | LOW | 表格模板硬编码不可配置 | ✅ 已修复 | MarkdownEditor.tsx → `generateTableTemplate()` 配置化生成器（列数/行数/占位文本可自定义） |
| P3-LOW-02 | LOW | SVG 数据与逻辑代码同文件 | ⚠️ 保持 | 库级风格统一；覆盖的 SVG 已添加 aria-hidden/title/focusable 无障碍属性 |
| INFO-01 | INFO | 无快捷键 | ✅ 已修复 | MarkdownEditor.tsx → `shortcuts: 'ctrlcmd+shift+t'` |
| INFO-02 | INFO | Add 分支选区收缩是正确补丁 | ✅ 已替代 | 重写为 `setSelectionRange({ start, end: start })` + `replaceSelection` 直接插入 |

**修复后评分**: 8.5/10（在第三方库限制下达到最优解）

---

**问题统计**: HIGH × 2 / MEDIUM × 2 / LOW × 2 / INFO × 2

---

## 一、架构定位分析

### 1.1 模块在系统中的位置

```
react-md-editor 命令实现层分类视图（修正版）
┌──────────────────────────────────────────────────────────────────────┐
│                          命令编排层                                    │
│  TextAreaCommandOrchestrator.executeCommand()                        │
│    → 构建 ExecuteState { command, ...textState }                     │
│    → 调用 command.execute(state, api, ...)                           │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
       ┌───────────┬───────────┼───────────┬──────────────┐
       ▼           ▼           ▼           ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────────┐
│ Inline     │ │ Block      │ │ Template   │ │ Toggle 命令簇         │
│ 命令簇     │ │ 命令簇     │ │ 命令簇 ←新 │ │ (状态切换)            │
│            │ │            │ │            │ │                      │
│ bold.tsx   │ │ quote.tsx  │ │ table.tsx  │ │ fullscreen.tsx       │
│ italic.tsx │ │ list.tsx×3 │ │  ← 本文件  │ │ preview.tsx          │
│ strike.tsx │ │ hr.tsx     │ │            │ │                      │
│ code.tsx   │ │            │ │            │ │                      │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────────────────────┘
      │              │              │
      ▼              ▼              ▼
┌────────────┐ ┌──────────────────────┐ ┌──────────────┐
│ 基础设施层 │ │ 基础设施层 (Block)    │ │ 无专用设施   │
│ selectWord │ │ insertBeforeEachLine │ │ ← 借用 inline│
│ executeCmd │ │ getBreaksNeeded×2    │ │   管道       │
└────────────┘ └──────────────────────┘ └──────────────┘
```

**table.tsx 的架构角色**: 命令实现层中一个**被错误分类**的模块。它本质是**模板插入命令**（Template Command），却在实现上复用了 inline 命令管道。与 inline 命令（短前后缀包裹单词）和 block 命令（逐行前缀）不同，模板命令的核心语义是"在光标位置插入一段结构化模板文本"——这要求完全不同的 execute 策略。

### 1.2 三种命令簇的架构对比

```
命令簇管道架构对比
───────────────────────────────────────────────────────────────────

Inline 命令管道 (bold/italic/strike/code):
┌──────────┐    ┌──────────────┐    ┌───────────────┐
│selectWord│ →  │setSelection  │ →  │executeCommand │
│ 扩展选区 │    │  应用新选区   │    │ 包裹/解包裹   │
└──────────┘    └──────────────┘    └───────────────┘
特点: prefix < 5字符, suffix 可选, toggle 语义正确
圈复杂度: 1 (线性)

Block 命令管道 (quote/list):
┌───────────┐   ┌──────────────┐   ┌────────────────────┐
│getBreaks  │ → │insertBefore  │ → │ 空行校准 + 文本变换 │
│ 计算空行  │   │ EachLine     │   │                    │
└───────────┘   └──────────────┘   └────────────────────┘
特点: 多行处理, 逐行前缀, toggle 通过行级检测
圈复杂度: 2-3

Template 命令管道 (table) ← 应有但未建立:
┌──────────────┐   ┌──────────────────┐
│ 光标定位     │ → │ 插入模板文本      │
│ 无选区扩展   │   │ 不应有 toggle 语义│
└──────────────┘   └──────────────────┘
特点: 插入固定模板, 无 toggle 需求, 应为单向操作

实际 table.tsx 管道 (错误地复用 inline):
┌──────────┐   ┌──────────┐   ┌──────────────┐
│selectWord│ → │分支判断   │ → │executeCommand│
│ ❌不适用  │   │❌逻辑错误 │   │ 表面可用     │
└──────────┘   └──────────┘   └──────────────┘
圈复杂度: 3 (含双分支)
```

### 1.3 依赖关系图

```
table.tsx 依赖拓扑
──────────────────────────────────────────
                          table.tsx
                       ╱              ╲
                      ╱                ╲
        commands/index.ts          utils/markdownUtils.ts
        (类型导入)                  (行为导入)
             │                    ┌──────┴──────┐
             │                    │             │
        ICommand 接口        selectWord()  executeCommand()
        ExecuteState             │             │
        TextAreaTextApi     TextRange     文本包裹/解包裹
```

**依赖方向评价**: ✅ 所有依赖指向下层（基础设施层），无循环依赖，无跨层直接访问。依赖方向正确。

**依赖宽度**: 2 个 markdownUtils 导入（`selectWord`、`executeCommand`），与 inline 命令簇依赖面相同——这本身就是一个信号：table.tsx 在依赖模式上自认为 inline 命令，但其语义需求远超 inline 管道能力。

### 1.4 被依赖关系

```
Afferent 依赖链（谁使用了 table.tsx）
──────────────────────────────────────────
commands/index.ts → getCommands() → 默认命令列表（第 3 项）
                                     │
                                     ▼
                              Editor.tsx / Toolbar
                              → 用户通过表格按钮触发（无快捷键）
```

**Afferent 耦合 (Ca)**: 1（仅被 commands/index.ts 导入）
**Efferent 耦合 (Ce)**: 3（React, commands/index.ts 类型, markdownUtils.ts）
**不稳定性 (I)**: 3/(1+3) = 0.75 → 叶子模块，高不稳定性正常

### 1.5 架构度量

| 度量 | 值 | 评价 |
|------|----|------|
| 代码行数 | 53 行 | ⚠️ 是 inline 命令的 1.5 倍，因双分支 execute |
| 传入耦合 (Ca) | 1 | ✅ 最小公开面 |
| 传出耦合 (Ce) | 3 | ✅ 依赖面窄 |
| 内聚度 (LCOM) | 中（功能内聚但有分支） | ⚠️ add/remove 两分支目标不同 |
| 抽象层级数 | 2 层（命令对象 → 基础设施函数） | ✅ 扁平结构 |
| 圈复杂度 | 3（execute 内含 2 层条件） | ❌ 远高于 inline 命令的 1 |
| 代码-数据比 | 40%/60%（prefix 模板 + SVG 数据） | ⚠️ 数据占比偏高 |

---

## 二、架构问题详细分析

### P1-HIGH-01：管道-语义错配——inline 管道承载块级模板插入，三个关键环节全部失效

**架构层面**: 抽象选择 · 管道适配 · 命令分类
**严重度**: HIGH — 架构级设计错误

**错配全景图**:

```
table.tsx 的管道-语义错配分析
──────────────────────────────────────────────────────────────────

Inline 管道的设计假设          table.tsx 的实际需求           错配后果
─────────────────────────    ──────────────────────────    ──────────────
① selectWord: 基于"单词边界"   prefix 是 5 行完整表格模板     选区扩展算法
   扩展选区，处理单行短文本      跨越多行，含换行符/管道符     无法处理多行

② executeCommand toggle:      表格内容被编辑后，模板字符串    toggle 语义在
   基于 prefix 完全匹配来       已面目全非，前缀匹配必然      编辑后必然失败
   判断"添加"还是"移除"         失败                           → 移除成死代码

③ prefix 短文本（< 10 字符）   prefix ≈ 100 字符，5 行模板   setSelectionRange
   选区操作简单准确              选区操作跨行，定位不精确      行为不可预测
```

**三个错配环节的详细分析**:

**错配 ① — `selectWord` 对多行内容的处理**:

```typescript
// L21-26
const newSelectionRange = selectWord({
  text: state.text,
  selection: state.selection,
  prefix: state.command.prefix!,  // ← 5 行表格模板作为 "prefix"
  suffix: state.command.suffix,    // ← 空字符串
});
```

`selectWord` 内部调用 `getSurroundingWord(text, position)` 来确定选区范围。该函数基于空格和换行符分割单词边界，核心假设是 prefix/suffix 为短标记（如 `**`、`~~`）。当 prefix 为 5 行表格模板时：

| 光标位置 | selectWord 预期行为 | 实际可能行为 |
|---------|-------------------|------------|
| 表格 `|---` 分隔行内 | 选中完整表格 | 只选中当前行的单词片段 |
| 表格 Cell 内 | 不选中表格 | 可能跨越管道符选中相邻单元格 |
| 空行处 | 返回零宽选区 | 正常（此场景 add 分支使用） |

**错配 ② — toggle 移除分支为事实上的死代码**:

```typescript
// L28-31: 移除条件
if (
  state1.selectedText.length >= state.command.prefix!.length + state.command.suffix!.length &&
  state1.selectedText.startsWith(state.command.prefix!)
) {
  // Remove 分支：仅当文本完全以表格模板开头时才执行
```

`state.command.prefix` 值为：
```
\n| Header | Header |\n|--------|--------|\n| Cell | Cell |\n| Cell | Cell |\n| Cell | Cell |\n\n
```

此分支仅在以下条件下可达：
1. `selectedText` 包含完整表格模板前缀
2. 用户**从未修改**任何 `Header` 或 `Cell` 文本

但 Markdown 表格的**根本用途**就是编辑内容，因此条件 2 在实际使用中几乎不可能满足。

| 场景 | startsWith(prefix) | 实际行为 | 预期行为 |
|------|-------------------|---------|---------|
| 刚插入，未修改 | true | 移除表格 ✅ | 移除表格 ✅ |
| 修改了 Header | false | 再次插入 ❌ | 应移除表格 |
| 修改了 Cell | false | 再次插入 ❌ | 应移除表格 |
| 光标在已修改表格内 | false | 表格内再插表格 ❌ | 应移除表格 |

**错配 ③ — 长模板的选区操作**:

```typescript
// L42: Add 分支强制将选区收缩为起点
state1 = api.setSelectionRange({ start: state.selection.start, end: state.selection.start });
```

此行是唯一正确的决策——在 add 分支中放弃 `selectWord` 的结果，直接将选区收缩到光标起点。这说明作者意识到了 `selectWord` 对块级内容不可靠，但没有从根本上修正架构选择，而是用补丁绕过。

**根因**: table.tsx 需要的是一个**模板插入管道**（定位光标 → 插入模板），而不是 inline 命令的 toggle 管道。但由于 `ICommand` 接口没有命令分类维度，所有命令被迫共享同一执行模型。

**建议修复——专用模板插入管道**:

```typescript
export const table: ICommand = {
  name: 'table',
  keyCommand: 'table',
  // prefix 仅作为标识，不用于 toggle 判断
  prefix: TABLE_TEMPLATE,
  suffix: '',
  buttonProps: { 'aria-label': 'Insert table', title: 'Insert table' },
  icon: <TableIcon />,
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    // 模板插入命令：无 toggle 语义，始终插入
    const template = state.command.prefix;
    if (!template) return;

    // 检测光标是否在表格内部 → 在表格前插入空行
    const lineStart = state.text.lastIndexOf('\n', state.selection.start - 1) + 1;
    const currentLine = state.text.substring(lineStart, state.text.indexOf('\n', lineStart));

    let insertion = template;
    if (currentLine.trim().startsWith('|')) {
      insertion = '\n' + template;  // 在表格前加空行分隔
    }

    api.setSelectionRange({ start: state.selection.start, end: state.selection.start });
    api.replaceSelection(insertion);
  },
};
```

**严重性理由**: HIGH — 管道-语义错配导致三个执行环节中两个功能失效，是架构层面的根本性设计错误，不是实现层面的 bug。

---

### P1-HIGH-02：execute 双分支架构在命令簇中独一无二，但无对应抽象支撑

**架构层面**: 一致性 · 抽象缺失 · 模式违反
**严重度**: HIGH — 架构模式一致性缺陷

**问题分析**:

```
所有命令的 execute 分支复杂度梯度
─────────────────────────────────────────────────────────────────

bold.tsx:        线性 3 步，无分支，圈复杂度 1
italic.tsx:      线性 3 步，无分支，圈复杂度 1
strikethrough.tsx: 线性 3 步，无分支，圈复杂度 1
code.tsx:        if (多行) → codeBlock else → inline，圈复杂度 2
hr.tsx:          if (已存在) → 移除 else → 插入，圈复杂度 2
link.tsx:        3 路分支（URL/文本/空选区），圈复杂度 3
quote.tsx:       Add/Remove + insertBeforeEachLine，圈复杂度 2
list.tsx:        Add/Remove + insertBeforeEachLine，圈复杂度 2
─────────────────────────────────────────────────────────────────
table.tsx:       selectWord + if/else 双分支 + 两次 executeCommand，圈复杂度 3 ← 最高
```

table.tsx 的 execute 函数具有命令簇中**最高的圈复杂度**（3），且其双分支结构（Remove 第 33-39 行 / Add 第 41-49 行）有以下特殊之处：

1. **Remove 分支先经过 `selectWord`，Add 分支又重新设置选区**（L42）：两条分支对 `selectWord` 结果的使用完全不同——Remove 使用它，Add 丢弃它。这说明 `selectWord` 调用（L21-26）只服务于 Remove 分支，但被放在两条分支之前。

2. **两条分支都调用 `executeCommand`，但语义完全不同**：Remove 是"解包裹"（移除模板），Add 是"包裹"（插入模板）。但 `executeCommand` 的 toggle 逻辑（内部检查是否已有 prefix）在 Add 分支中是多余的——光标已收缩到零宽，`selectedText` 为空，toggle 必然走"添加"路径。

3. **Add 分支中的 `state.selection` vs `state1.selectedText` 混用**（L43-49）：

```typescript
// Add 分支
state1 = api.setSelectionRange({ start: state.selection.start, end: state.selection.start });
executeCommand({
  api,
  selectedText: state1.selectedText,  // ← 来自 state1（零宽选区，空字符串）
  selection: state.selection,          // ← 来自原始 state（非 state1）
  prefix: state.command.prefix!,
  suffix: state.command.suffix,
});
```

`state1.selectedText`（空字符串）与 `state.selection`（原始选区）来自不同时间点的编辑器状态，这种时间耦合在架构上是不安全的。

**架构后果**:

| 后果 | 说明 |
|------|------|
| 认知负担 | 读者需要理解两条分支、两个状态时间点、两种语义的 executeCommand 调用 |
| 测试复杂度 | 需要覆盖 Remove/Add 两条路径 + `selectWord` 对多行内容的各种返回值 |
| 修改风险 | 任何 execute 签名变更影响两条分支，且两条分支的状态依赖不同 |
| 与系统其他命令不一致 | inline 命令圈复杂度 1，block 命令圈复杂度 2，table.tsx 圈复杂度 3 |

---

### P2-MEDIUM-01：ICommand 接口缺少命令分类维度——table.tsx 是最大受害者

**架构层面**: 类型系统 · 可辨识联合 · 契约式设计
**严重度**: MEDIUM — 类型安全缺陷（系统性问题，table.tsx 受影响最严重）

**问题分析**:

```
当前 ICommand 对所有命令类型的约束
┌──────────────────────────────────────────────────────────────────┐
│ interface ICommandBase {                                          │
│   prefix?: string;        // ← 可选                              │
│   suffix?: string;        // ← 可选                              │
│   execute?: (...) => void; // ← 可选，签名不区分命令类型          │
│ }                                                                 │
│                                                                   │
│ 对 table.tsx 的影响:                                             │
│   ├── prefix 应为必需（包含完整表格模板）                         │
│   ├── suffix 应为 never（模板命令不使用后缀）                     │
│   ├── execute 应为模板插入语义（不应有 toggle 逻辑）              │
│   └── 类型系统无法阻止创建无 prefix 的 table 命令                │
└──────────────────────────────────────────────────────────────────┘
```

**对 table.tsx 的特殊影响**:

table.tsx 是所有命令中对 `ICommand` 类型约束不足**最敏感**的命令：

1. `prefix!` 出现 4 次（比 inline 命令多 1 倍），因为 prefix 不仅用于包裹文本，还作为 toggle 判断依据和模板内容
2. `suffix` 被赋值为空字符串 `''`，但类型签名允许 `undefined`——如果运行时 `suffix` 为 `undefined`，`suffix!.length` 不会崩溃（因为 `undefined!.length` 在 `!` 断言后会报错），但 `state.command.suffix` 在 `executeCommand` 调用中作为空字符串和 `undefined` 行为不同
3. 缺少 `kind: 'template'` 分类标签，调用者无法从类型层面知道此命令的 execute 语义与其他命令不同

**建议——可辨识联合**:

```typescript
type ICommandKind = 'inline' | 'block' | 'template' | 'toggle';

interface ITemplateCommand extends ICommandBase {
  kind: 'template';
  prefix: string;         // 必需：模板内容
  suffix?: never;         // 禁止：模板命令不用后缀
  execute: (state: ExecuteState, api: TextAreaTextApi) => void;
}

// table.tsx 实现
export const table: ICommand = {
  kind: 'template',
  name: 'table',
  ...
} satisfies ITemplateCommand;
```

---

### P2-MEDIUM-02：非空断言密度为所有命令之最——4 处 `prefix!` 掩盖运行时风险

**架构层面**: 类型安全 · 防御性编程
**严重度**: MEDIUM — 运行时异常风险

**位置**: 第 24 行、第 29 行、第 37 行、第 47 行

```typescript
// L24: selectWord 调用
prefix: state.command.prefix!,
// L29: 移除条件判断
state1.selectedText.length >= state.command.prefix!.length + state.command.suffix!.length
state1.selectedText.startsWith(state.command.prefix!)
// L37: 移除分支 executeCommand
prefix: state.command.prefix!,
// L47: 添加分支 executeCommand
prefix: state.command.prefix!,
```

**密度对比**:

| 命令 | `prefix!` 次数 | 命令簇 |
|------|---------------|--------|
| bold.tsx | 2 | inline |
| italic.tsx | 2 | inline |
| strikethrough.tsx | 2 | inline |
| code.tsx | 2 | inline |
| hr.tsx | 3 | hybrid |
| quote.tsx | 2 | block |
| **table.tsx** | **4** | **template** |

table.tsx 的 `prefix!` 密度（4 处 / 53 行 = 7.5%）是所有命令中最高的。原因是 execute 内有两条分支，每条分支都独立使用 `prefix!`——如果提取为入口处单次检查，可消除所有 4 处断言。

**建议**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const prefix = state.command.prefix;
  if (!prefix) return;  // 单次防御性检查
  const suffix = state.command.suffix ?? '';
  // 后续使用 prefix / suffix，无需 !
}
```

---

### P3-LOW-01：表格模板与命令逻辑耦合——配置无法外部化

**架构层面**: 关注点分离 · 配置化
**严重度**: LOW

**问题分析**:

表格模板（5 行 Markdown 表格）作为 `prefix` 属性硬编码在命令对象中。这意味着：

1. **列数固定为 2 列**：无法通过配置插入 3 列或更多列的表格
2. **行数固定为 4 行**（1 行表头 + 3 行数据）：无法自定义初始行数
3. **占位文本固定为 `Header` / `Cell`**：无法本地化
4. **模板修改需编辑源码**：无法在使用方通过 props 或配置覆盖

对比主流 Markdown 编辑器的表格插入体验：

```
Typora:     弹出网格选择器，用户可视化选择列×行
Notion:     输入 /table 后提供 Full page / Inline 选项
Obsidian:   输入 | 后自动扩展为表格行
table.tsx:  固定插入 2×4 模板，无任何自定义能力
```

**建议——配置化模板**:

```typescript
interface TableConfig {
  columns: number;   // 默认 2
  rows: number;      // 默认 3（不含表头）
  headerPlaceholder: string;  // 默认 'Header'
  cellPlaceholder: string;    // 默认 'Cell'
}

function generateTableTemplate(config: TableConfig): string {
  // 动态生成 n 列 × m 行的 Markdown 表格
}
```

---

### P3-LOW-02：SVG 图标资源与命令逻辑同层部署

**架构层面**: 关注点分离
**严重度**: LOW

SVG path 数据（第 12-18 行）占模块约 15% 的行数。与 strikethrough.tsx（SVG 占 ~50%）相比比例较低，因为 table.tsx 的 execute 逻辑更长。

这是库级别的架构风格选择，所有命令都有相同的 SVG 嵌入模式，非 table.tsx 独有问题。若架构重构，可将 SVG 提取到 `commands/icons.ts`。

---

### INFO-01：table.tsx 是命令簇中唯一无快捷键的编辑命令

```typescript
buttonProps: { 'aria-label': 'Add table', title: 'Add table' },
// 无 shortcuts 属性
```

在 `getCommands()` 返回的所有核心编辑命令中（bold/italic/strikethrough/hr/title/link/quote/code/image/table/list），table.tsx 是唯一没有绑定 `shortcuts` 属性的命令。这与 table 的操作频率（低于格式化命令但高于 hr）和操作复杂度（需要多步编辑才能获得最终表格）有关。

实际影响：用户只能通过工具栏按钮触发表格插入，键盘用户效率较低。

---

### INFO-02：table.tsx 的 Add 分支存在正确的补丁

```typescript
// L42: Add 分支强制收缩选区
state1 = api.setSelectionRange({ start: state.selection.start, end: state.selection.start });
```

这一行说明作者意识到了 `selectWord` 对块级内容的不可靠性，在 Add 分支中主动丢弃了 `selectWord` 的结果。这是一个**正确的局部补丁**，但从架构角度看，它是对管道-语义错配的"打补丁"式修复，而非根本解决方案。

如果未来有更多模板类命令（如代码块模板、流程图模板），这种补丁模式会不断重复。

---

## 三、架构模式评估

### 3.1 当前模式应用

| 模式 | 应用位置 | 评价 |
|------|----------|------|
| **Command Pattern** | `ICommand` 接口 + table 对象 | ✅ 标准实现 |
| **Pipeline Pattern** | execute 内的 selectWord → 分支 → executeCommand | ❌ 管道错配——inline 管道处理块级模板 |
| **Template Method** | 无 | ❌ 缺失——如果基类定义"定位 → 插入"骨架，table.tsx 只需填充"插入什么" |
| **Factory Method** | 无 | ❌ 缺失——无法通过配置生成不同规格的表格命令 |
| **Strategy Pattern** | 隐含在 execute 分支中 | ⚠️ Remove/Add 策略硬编码在 execute 内，未抽象为可替换策略 |

### 3.2 推荐架构：Template Command 抽象

```
┌─────────────────────────────────────────────────────────────┐
│  分类层: ICommand = IInline | IBlock | ITemplate | IToggle  │
│    可辨识联合，编译期区分命令类型                              │
├─────────────────────────────────────────────────────────────┤
│  工厂层: createTemplateCommand(config) → ICommand             │
│    ├── template: string (模板内容)                            │
│    ├── insertPosition: 'cursor' | 'newline'                  │
│    └── dedupStrategy: 'skip' | 'replace' | 'always-insert'  │
├─────────────────────────────────────────────────────────────┤
│  管道层: executeTemplateInsert(state, api, template)          │
│    ├── Phase 1: 定位光标 / 确保空行分隔                       │
│    ├── Phase 2: 插入模板文本                                  │
│    └── Phase 3: 选中首个占位符（如 Header）便于直接编辑       │
├─────────────────────────────────────────────────────────────┤
│  配置层: generateTableTemplate({ columns, rows })             │
│    动态生成任意规格的 Markdown 表格模板                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 可扩展性评估

```
扩展场景                           当前难度    重构后难度    说明
──────────────────────────────────────────────────────────────
新增 3 列表格命令                   高          极低         generateTableTemplate({columns:3})
修改表格占位文本为中文              高          极低         配置参数
添加"移除光标所在表格"功能          极高        低           dedupStrategy: 'replace'
新增代码块模板命令                  高          极低         createTemplateCommand({template: CODE})
表格插入后自动选中 Header           极高        低           Phase 3 选中占位符
替换 SVG 图标                      中          低           icons.ts 独立管理
```

---

## 四、安全评估（架构视角）

| 维度 | 评价 |
|------|------|
| 攻击面 | ✅ 极小——全部操作限于 textarea.value 纯文本域 |
| 信任边界 | ✅ 无网络请求、无敏感数据访问、无代码执行 |
| 状态一致性 | ⚠️ state/state1 时间耦合 + 双分支中的混用存在理论不一致风险 |
| 供应链 | ✅ 无外部运行时依赖 |
| 注入风险 | ✅ 纯文本操作，不解析 HTML |

**安全结论**: 无架构级安全风险。状态一致性问题在纯文本域内的最坏后果是文本内容不符合用户预期，不构成安全威胁。

---

## 五、与同级命令的横向对比

| 维度 | bold.tsx (inline) | hr.tsx (hybrid) | quote.tsx (block) | **table.tsx (template)** |
|------|-------------------|-----------------|-------------------|--------------------------|
| 代码行数 | 33 | 53 | 44 | 53 |
| 圈复杂度 | 1 | 2 | 2 | **3** |
| prefix 长度 | 2 (`**`) | 5 (`\n\n---\n`) | 2 (`> `) | **~100（5 行表格）** |
| Toggle 可用性 | ✅ | ⚠️ 中 | ✅ | **❌ 编辑后失效** |
| 依赖函数数 | 2 | 2 | 4 | **2**（但语义不匹配） |
| 快捷键 | ctrlcmd+b | ctrlcmd+h | ctrlcmd+q | **无** |
| prefix! 次数 | 2 | 3 | 2 | **4** |
| 管道匹配度 | ✅ 完全匹配 | ⚠️ 部分匹配 | ✅ 完全匹配 | **❌ 完全错配** |

**结论**: table.tsx 在命令簇中是架构问题最突出的模块——管道完全错配、toggle 语义失效、圈复杂度最高、非空断言密度最大。根本原因是命令分类体系中缺少"模板插入"类别，导致 table.tsx 被迫塞入 inline 命令的管道。

---

## 六、总结

### 6.1 问题汇总

| ID | 严重度 | 原则/分类 | 问题 | 修复难度 |
|----|--------|----------|------|----------|
| P1-HIGH-01 | HIGH | 管道适配 | inline 管道处理块级模板，三个环节全部失效 | 高 |
| P1-HIGH-02 | HIGH | 一致性 | execute 圈复杂度 3（命令簇最高），双分支无抽象支撑 | 中 |
| P2-MEDIUM-01 | MEDIUM | 类型安全 | ICommand 缺少命令分类，table.tsx 无法声明为 template 类型 | 中 |
| P2-MEDIUM-02 | MEDIUM | 类型契约 | 4 处 `prefix!` 非空断言，密度为所有命令之最 | 低 |
| P3-LOW-01 | LOW | SoC/配置化 | 表格模板硬编码，列数/行数/占位文本不可配置 | 中 |
| P3-LOW-02 | LOW | SoC | SVG 数据与逻辑代码同文件 | 极低 |
| INFO-01 | INFO | 可访问性 | 唯一无快捷键的核心编辑命令 | — |
| INFO-02 | INFO | 补丁 | Add 分支的选区收缩是对管道错配的正确局部补丁 | — |

### 6.2 综合评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 单一职责 | 7 | 文件级职责单一，但 execute 内双分支目标不同（add vs remove） |
| 接口设计 | 4 | ICommand 过于宽泛，table.tsx 的 template 语义无法在类型层面表达 |
| 耦合度 | 7 | 依赖面窄（2 个 markdownUtils 函数），但依赖的函数与需求语义不匹配 |
| 内聚性 | 5 | 功能内聚但有分支——Add/Remove 两个执行路径的目标本质不同 |
| 可扩展性 | 3 | 模板硬编码、无工厂、无配置——扩展需要复制整段代码并修改模板 |
| 可维护性 | 5 | 双分支 + 时间耦合 + 非空断言密度高，修改需要同时理解两条路径 |
| 设计模式 | 3 | Command 模式正确，但 Pipeline/Template/Factory 全部缺失或错配 |
| 安全性 | 9 | 纯文本操作，攻击面极小 |
| **综合** | **5.0** | **⚠️ APPROVE WITH COMMENTS** |

### 6.3 优先重构建议

| 优先级 | 建议 | 工作量 | 收益 |
|--------|------|--------|------|
| 1 | 将 table.tsx 的 execute 重构为纯模板插入管道（无 toggle） | 中 | 消除 3 个架构错配，圈复杂度降至 1 |
| 2 | ICommand 添加 `kind` 分类维度（可辨识联合） | 中 | 编译期类型安全，消除 4 处 `prefix!` |
| 3 | 提取 `createTemplateCommand` 工厂函数 | 中 | 未来模板命令（代码块/流程图）零成本扩展 |
| 4 | 提取 `generateTableTemplate({ columns, rows })` 配置化生成器 | 小 | 支持自定义表格规格 |
| 5 | execute 入口添加 prefix 防御性检查 | 极小 | 运行时安全网 |

### 6.4 集成风险评估

在本项目中使用 `table.tsx` 的架构风险等级：**中低**

- **功能风险**: "插入表格"功能正常工作（Add 分支可靠），但"移除表格"功能实际不可用——用户只能手动删除表格文本
- **用户体验风险**: 光标在已有表格内部时点击表格按钮会插入第二个表格，产生内容混乱
- **不影响的维度**: 安全（纯文本操作）、性能（单次 DOM 操作）、兼容性（标准 Markdown 语法）
- **缓解措施**: 在使用方文档中明确说明"表格按钮仅用于插入，不支持移除"

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts / bold.tsx / italic.tsx / strikethrough.tsx / code.tsx / hr.tsx / quote.tsx / list.tsx / link.tsx）*
