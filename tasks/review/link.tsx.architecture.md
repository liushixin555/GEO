# 软件架构专家评审：link.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/link.tsx`
**评审角色**: 软件架构专家（模块边界 · 依赖关系 · 设计模式 · 扩展性 · 职责划分 · 数据流 · 架构一致性）
**评审日期**: 2026-05-25
**代码行数**: 58 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"链接"命令实现，根据选区内容智能插入 `[text](url)` 格式链接，支持 Ctrl/Cmd+L 快捷键触发，包含三种行为分支（URL 自动识别、空白插入模板、文本包裹）
**评审结论**: ⚠️ APPROVE WITH COMMENTS — 架构定位正确，但在命令实现层中引入了不属于该层的 URL 检测职责，且三路分支策略的硬编码模式与架构一致性要求冲突

**问题统计**: HIGH × 1 / MEDIUM × 3 / LOW × 1 / INFO × 2

---

## 一、架构定位分析

### 1.1 模块在系统中的位置

```
react-md-editor 分层架构
┌─────────────────────────────────────────────────────────────┐
│                      表现层 (Presentation)                   │
│  Editor.tsx → Toolbar → Button(render)                      │
│                          ↓ 触发                              │
├─────────────────────────────────────────────────────────────┤
│                   命令编排层 (Orchestration)                  │
│  TextAreaCommandOrchestrator.executeCommand()                │
│    → 构建 ExecuteState { command, ...textState }             │
│    → 调用 command.execute(state, api, ...)                   │
│                          ↓                                   │
├─────────────────────────────────────────────────────────────┤
│               命令实现层 (Command Implementation)  ← link.tsx 在此层
│  italic.tsx | bold.tsx | code.tsx | link.tsx | image.tsx    │
│    → 依赖: selectWord(), executeCommand()                    │
│                          ↓                                   │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层 (Infrastructure)                │
│  markdownUtils.ts (selectWord, executeCommand, getSurroundingWord) │
│  TextAreaTextApi (setSelectionRange, replaceSelection)       │
│  InsertTextAtPosition (DOM 操作)                             │
└─────────────────────────────────────────────────────────────┘
```

**link.tsx 的架构角色**: 命令实现层的具体策略（Strategy），遵循命令模式（Command Pattern）。与 italic/bold 等简单格式化命令不同，link.tsx 是该层中复杂度最高的模块之一（与 image.tsx 并列）。

### 1.2 依赖关系图

```
link.tsx 依赖拓扑
──────────────────────────────────────────
                      link.tsx
                   ╱          ╲
                  ╱            ╲
    commands/index.ts      utils/markdownUtils.ts
    (类型导入)              (行为导入)
         │                    │
         │              ┌─────┴─────┐
         │              │           │
    ICommand 接口    selectWord  executeCommand
    ExecuteState        │           │
    TextAreaTextApi     │           │
                   ┌────┘     ┌─────┘
                   │          │
            getSurroundingWord  TextAreaTextApi
                   │          .replaceSelection()
                   │          .setSelectionRange()
                   │
            TextRange (返回值)
```

**依赖方向评价**: ✅ 所有依赖指向下层（基础设施层），无循环依赖，无跨层直接访问。

### 1.3 被依赖关系

```
Afferent 依赖链（谁使用了 link.tsx）
──────────────────────────────────────────
commands/index.ts → getCommands() → 注册到默认命令列表
                                     │
                                     ▼
                              Editor.tsx / Toolbar
                              → 用户通过按钮或 Ctrl+L 触发
```

**Afferent 耦合 (Ca)**: 1（仅被 commands/index.ts 导入）
**Efferent 耦合 (Ce)**: 3（React, commands/index.ts 类型, markdownUtils.ts）
**不稳定性 (I)**: 3/(1+3) = 0.75 → 叶子模块，高不稳定性正常

---

## 二、架构问题详细分析

### H1. [HIGH] 职责越界 — URL 检测逻辑不属于命令实现层

**架构层面**: 分层架构 · 单一职责原则 (SRP)

**问题分析**:

link.tsx 的 `execute` 函数（L20-L57）包含了三种截然不同的策略逻辑：

```typescript
execute: (state, api) => {
  // 策略 1: URL 检测 + 反转链接结构 (L28-37)
  if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
    // URL 检测 → 重新选区 → 生成 [占位](URL)
  }
  // 策略 2: 空选区模板插入 (L39-46)
  else if (state1.selectedText.length === 0) {
    // 插入 [title](url) 模板
  }
  // 策略 3: 文本包裹 (L48-55)
  else {
    // 包裹为 [选中文本](url)
  }
}
```

**架构问题**:

```
理想分层（职责边界清晰）:
┌─────────────────────────────────────────┐
│ 命令实现层 (link.tsx)                    │
│   职责: 声明命令配置 + 编排执行流程       │
│   不应包含: URL 检测、分支策略选择         │
├─────────────────────────────────────────┤
│ 策略层 (linkStrategy.ts)  ← 缺失        │
│   职责: 智能识别选区内容类型              │
│   提供: detectUrl(), selectStrategy()     │
├─────────────────────────────────────────┤
│ 基础设施层 (markdownUtils.ts)            │
│   职责: 纯文本操作 (selectWord, wrap)     │
└─────────────────────────────────────────┘

当前实际分层（职责越界）:
┌─────────────────────────────────────────┐
│ 命令实现层 (link.tsx)                    │
│   职责: 命令配置 + 执行 + URL检测 +       │  ← 职责膨胀
│         策略选择 + 硬编码值管理            │
├─────────────────────────────────────────┤
│ 基础设施层 (markdownUtils.ts)            │
│   职责: 纯文本操作                        │
└─────────────────────────────────────────┘
```

**影响范围**:
1. URL 检测逻辑 (`includes('http') || includes('www')`) 被内联在 execute 中，无法被其他命令复用（image.tsx 有完全相同的逻辑，但各自独立实现）
2. 三路分支策略的耦合使得修改任何一条分支都需要理解全部三条分支的上下文
3. 硬编码的 prefix/suffix 值（`'[]('`、`')'`、`'[title'`、`'](url)'`）散布在函数体中，与命令配置层的 `prefix`/`suffix` 形成两套独立的配置源

**架构改进建议**:

```typescript
// 策略 1: 将 URL 检测提取为基础设施层工具函数
// utils/markdownUtils.ts
export function isUrlLike(text: string): boolean {
  return /^(https?:\/\/|ftp:\/\/|www\.)/i.test(text.trim());
}

// 策略 2: 使用策略对象替代 if-else 分支
// commands/link.tsx
const linkStrategies = {
  urlDetected: (state, api, text) => { /* ... */ },
  emptySelection: (state, api) => { /* ... */ },
  textWrapping: (state, api, text) => { /* ... */ },
};

execute: (state, api) => {
  const range = selectWord({...});
  const state1 = api.setSelectionRange(range);

  if (isUrlLike(state1.selectedText)) {
    return linkStrategies.urlDetected(state, api, state1.selectedText);
  }
  if (state1.selectedText.length === 0) {
    return linkStrategies.emptySelection(state, api);
  }
  return linkStrategies.textWrapping(state, api, state1.selectedText);
}
```

**严重性理由**: HIGH — 这是架构层面的问题。link.tsx 承担了超出命令实现层职责范围的逻辑，导致与 image.tsx 的代码重复（DRY 违反）和未来维护成本增长。此问题在 italic.tsx 等简单命令中不存在。

---

### M1. [MEDIUM] 双重配置源 — 命令 prefix/suffix 与硬编码值并存

**架构层面**: 配置一致性 · 单一数据源原则

**问题映射**:

```
link.tsx 中 prefix/suffix 的来源分布:
──────────────────────────────────────────

命令配置层（L9-L10）:
  prefix: '['           ← 配置源 1（声明式）
  suffix: '](url)'      ← 配置源 1（声明式）

execute 函数中的使用:
  L24:  state.command.prefix!    → 使用配置源 1 ✅
  L25:  state.command.suffix     → 使用配置源 1 ✅
  L29:  prefix: '[]('            → 硬编码值 ✗（配置源 2）
  L30:  suffix: ')'              → 硬编码值 ✗（配置源 2）
  L35:  prefix: '[]('            → 硬编码值 ✗（配置源 2）
  L36:  suffix: ')'              → 硬编码值 ✗（配置源 2）
  L44:  prefix: '[title'         → 硬编码值 ✗（配置源 3）
  L45:  suffix: '](url)'         → 与配置源 1 碰巧一致 ⚠️
  L53:  state.command.prefix!    → 使用配置源 1 ✅
  L54:  state.command.suffix     → 使用配置源 1 ✅
```

**架构影响**:

| 场景 | 影响 |
|------|------|
| 用户自定义 link 命令的 prefix/suffix | 分支 A（URL 检测）和分支 B（模板插入）不会遵循自定义值 |
| 库升级修改默认 prefix | 需要同步修改 execute 中的 3 处硬编码值 |
| 添加新的链接变体命令 | 无法复用 link.tsx 的 execute 逻辑 |

**与 image.tsx 的对比**:

```
硬编码值分布对比:
──────────────────────────────────────────
                  link.tsx       image.tsx
分支 A prefix:    '[](' (硬编码)  state.command.prefix! (配置)
分支 A suffix:    ')'   (硬编码)  state.command.suffix  (配置)
分支 B prefix:    '[title'(硬编码) '![image'(硬编码)
分支 C prefix:    配置            '!['   (硬编码)
──────────────────────────────────────────

结论: 两个文件的硬编码策略完全不一致，缺乏统一的架构规范
```

**建议修复**: 统一使用命令配置值，或引入 `overrides` 配置字段

```typescript
// 方案: 为特殊分支提供声明式覆盖
export const link: ICommand = {
  name: 'link',
  prefix: '[',
  suffix: '](url)',
  strategies: {
    urlDetected: { prefix: '[](', suffix: ')' },
    emptySelection: { prefix: '[title', suffix: '](url)' },
  },
  execute: (state, api) => {
    // 所有分支从统一的配置源取值
  },
};
```

**严重程度**: MEDIUM — 不影响当前功能，但使自定义命令扩展失效，违反了命令模式"配置驱动"的架构原则。

---

### M2. [MEDIUM] 与 image.tsx 代码结构高度同构但缺乏共享抽象 — DRY 架构级违反

**架构层面**: 代码复用 · 抽象层级

**同构度分析**:

```
link.tsx vs image.tsx 逐行对比:
──────────────────────────────────────────
步骤                        link.tsx    image.tsx    差异
────────────────────────────────────────────────────────
1. selectWord 初始选区      L21-26      L21-26       相同
2. setSelectionRange        L27         L27          相同
3. URL 检测条件             L28         L28          相同（都是 includes）
4. 分支A: 重新 selectWord   L29-37      L29-36       prefix/suffix 来源不同
5. 分支B: 空选区模板        L39-46      L38-45       占位符不同
6. 分支C: 文本包裹          L48-55      L47-54       prefix 来源不同
────────────────────────────────────────────────────────

代码重复率: ~85%（仅 prefix/suffix 值和占位符文本不同）
```

**架构问题本质**: link.tsx 和 image.tsx 实现了相同的"智能链接类命令"策略模式，但由于没有提取共享抽象，两者各自独立演化，导致：
1. URL 检测逻辑各自实现（两份相同但独立的 `includes('http')` 代码）
2. 分支策略的 prefix/suffix 来源不一致（link 分支 A 硬编码，image 分支 A 用配置）
3. 修复 URL 检测 bug 需要同步修改两个文件

**建议抽象**:

```typescript
// commands/createSmartLinkCommand.ts
export function createSmartLinkCommand(options: {
  name: string;
  prefix: string;
  suffix: string;
  urlPrefix: string;       // URL 检测后的反转 prefix，如 '[](' 或 '![]('
  urlSuffix: string;       // URL 检测后的反转 suffix，如 ')'
  templatePrefix: string;  // 空选区模板 prefix，如 '[title' 或 '![alt'
  templateSuffix: string;  // 空选区模板 suffix
  // ... 其他配置
}): ICommand {
  return {
    ...options,
    execute: (state, api) => {
      // 统一的三路分支逻辑
    },
  };
}

// link.tsx 简化为
export const link: ICommand = createSmartLinkCommand({
  name: 'link',
  prefix: '[',
  suffix: '](url)',
  urlPrefix: '[](',
  urlSuffix: ')',
  templatePrefix: '[title',
  templateSuffix: '](url)',
  // ...
});
```

**权衡**: 作为第三方库，每个文件自包含有其可读性优势。但对于 85% 重复的代码，提取共享抽象的维护收益远大于成本。

**严重程度**: MEDIUM — 不影响运行时行为，但导致 bug 修复需要跨文件同步，维护成本与"智能链接类命令"数量线性增长。

---

### M3. [MEDIUM] execute 函数数据流中 selection 语义跨阶段混用

**架构层面**: 数据流设计 · 状态管理

**问题追踪**:

```
execute(state, api) 数据流:

state.selection ─── [A] 原始选区（用户光标位置）
       │
       ▼
selectWord(state.text, state.selection, prefix)
       │
       ▼
newSelectionRange ── [B] 扩展后选区
       │
       ▼
api.setSelectionRange(newSelectionRange)
       │
       ▼
state1 ─────────── [C] DOM 更新后的状态
  ├─ .selectedText → 用于 URL 检测 ✅
  │
  ├── [分支 A] 重新计算:
  │     newSelectionRange = selectWord(state.text, state.selection, ...) ← 回到 [A]！
  │     state1 = api.setSelectionRange(...)                              ← [B] 的重新计算
  │     executeCommand(selection: state.selection[A], selectedText: state1.selectedText[C'])
  │                    ↑ 原始选区                    ↑ 第二次扩展后的文本
  │
  ├── [分支 B] executeCommand(selection: state.selection[A], selectedText: state1.selectedText[C])
  │                    ↑ 原始选区                    ↑ 第一次扩展后的文本
  │
  └── [分支 C] executeCommand(selection: state.selection[A], selectedText: state1.selectedText[C])
                      ↑ 原始选区                    ↑ 第一次扩展后的文本
```

**架构问题**:

1. **分支 A 的状态回退**: 分支 A 在 L29 使用 `state.selection`（阶段 A）而非 `state1.selection`（阶段 C）重新调用 `selectWord`。这意味着分支 A 丢弃了第一次 `selectWord` 的计算结果，基于原始状态重新计算。这在当前逻辑下是正确的（因为 URL 检测需要用不同的 prefix 重新选区），但隐含了一个关键假设：`state.text` 在 `setSelectionRange` 调用后不会改变。

2. **跨阶段状态混合**: `executeCommand` 在所有分支中都混合使用 `state.selection`（阶段 A）和 `state1.selectedText`（阶段 C 或 C'）。这种"跨阶段状态混合"在当前逻辑下碰巧正确，但缺乏架构层面的清晰性。

3. **let 变量重赋值**: `newSelectionRange` 和 `state1` 在分支 A 中被重赋值，这使得数据流追踪更加困难。变量的含义在重赋值前后发生了变化。

**对比 italic.tsx**: italic.tsx 中不存在此问题，因为它只有一路分支，数据流是线性的。link.tsx 的三路分支使得状态混用问题被放大。

**建议**: 引入不可变数据流，每个分支使用独立的变量名

```typescript
execute: (state, api) => {
  const initialRange = selectWord({...state, prefix: state.command.prefix ?? '['});
  const afterInitial = api.setSelectionRange(initialRange);

  if (isUrlLike(afterInitial.selectedText)) {
    const urlRange = selectWord({text: state.text, selection: state.selection, prefix: '[](', suffix: ')'});
    const afterUrl = api.setSelectionRange(urlRange);
    return executeCommand({api, selectedText: afterUrl.selectedText, selection: state.selection, prefix: '[](', suffix: ')'});
  }

  if (afterInitial.selectedText.length === 0) {
    return executeCommand({api, selectedText: afterInitial.selectedText, selection: state.selection, prefix: '[title', suffix: '](url)'});
  }

  return executeCommand({api, selectedText: afterInitial.selectedText, selection: state.selection, prefix: state.command.prefix ?? '[', suffix: state.command.suffix});
},
```

---

### L1. [LOW] SVG data-name 属性复制粘贴错误

**位置**: L13 — `<svg data-name="italic" ...>`

**架构影响**: 非功能性属性，不影响渲染和交互。但在架构一致性方面，link.tsx 的 SVG `data-name` 为 `"italic"` 而非 `"link"`，表明该文件是从 italic.tsx 复制而来，复制后未做完整审查。

**修复**: `<svg data-name="link" ...>`

---

## 三、架构模式评价

### 3.1 命令模式（Command Pattern）实现评价

| 模式要素 | 实现情况 | 与 italic/bold 对比 | 评价 |
|---------|---------|-------------------|------|
| 命令接口 (ICommand) | 统一接口 | 相同 | ✅ 标准实现 |
| 具体命令 (ConcreteCommand) | link 对象 | 相同结构，execute 更复杂 | ⚠️ 复杂度超出典型命令 |
| 调用者 (Invoker) | TextAreaCommandOrchestrator | 相同 | ✅ 解耦良好 |
| 接收者 (Receiver) | TextAreaTextApi | 相同 | ✅ 封装良好 |
| 策略选择 | 内联 if-else | italic 无此概念 | ❌ 应提取为独立策略 |
| 撤销/重做 | 未实现 | 相同 | ⚠️ 缺少 undo 栈 |

**模式符合度**: 6/10 — 命令模式的基本结构正确，但 link.tsx 的 execute 函数包含了策略选择逻辑，违反了命令模式"命令对象只封装操作"的原则。

### 3.2 模块内聚性分析

```
link.tsx 内聚度评估 (LCOM — Lack of Cohesion of Methods)

模块属性:
  name, keyCommand, shortcuts, prefix, suffix, buttonProps, icon, execute

属性-方法关联:
  execute → 使用 prefix, suffix, (间接使用 name 通过 state.command)
  icon    → 独立（仅被 Toolbar 渲染使用）
  buttonProps → 独立（仅被 Button 组件使用）
  name/keyCommand/shortcuts → 独立（仅被注册/快捷键系统使用）

execute 函数内部职责:
  1. 选区扩展 (selectWord)         → 文本操作
  2. URL 检测 (includes)            → 内容识别  ← 额外职责
  3. 策略选择 (if-else)             → 流程控制  ← 额外职责
  4. 模板插入 ([title](url))        → 内容生成  ← 额外职责
  5. 文本包裹 ([text](url))         → 格式化操作

内聚度: 逻辑内聚 (Logical Cohesion) — 比通信内聚低一级
  → execute 内的 5 项职责通过 if-else 控制流组合，而非数据流
  → 对比 italic.tsx: 通信内聚 (Communicational Cohesion)
  → 评价: link.tsx 的内聚度低于同层其他命令模块
```

### 3.3 耦合度分析

```
link.tsx 耦合矩阵
──────────────────────────────────────────
依赖目标          耦合类型      耦合强度  评价
──────────────────────────────────────────
React            数据耦合      弱        ✅ 仅用于 JSX
ICommand         规范耦合      中        ✅ 必需的类型契约
ExecuteState     规范耦合      中        ✅ 执行上下文
TextAreaTextApi  规范耦合      中        ✅ DOM 操作抽象
selectWord       数据耦合      弱        ✅ 纯函数
executeCommand   数据耦合      弱        ✅ 纯函数
──────────────────────────────────────────

额外隐式耦合:
  '[](' / ')' / '[title' / '](url)'  内容耦合  强  ❌ 硬编码值与 markdownUtils.ts 的行为形成隐式契约
  URL 检测逻辑 ('http' / 'www')      内容耦合  强  ❌ 与 image.tsx 存在隐式的行为同步要求

总评: link.tsx 的显式耦合与同层模块一致，但隐式耦合（硬编码值）显著高于 italic/bold 等简单命令
```

---

## 四、架构扩展性评估

### 4.1 开闭原则 (OCP) 评估

```
扩展场景                          需要修改 link.tsx?    评价
──────────────────────────────────────────────────────────────
修改链接格式 (如 <a href="...">)  是 (三路分支全部)    ❌ 不符合 OCP
修改快捷键                        否 (配置驱动)        ✅
修改图标                          否 (直接替换 icon)   ✅
自定义 prefix/suffix              部分 (仅分支 C 遵循) ⚠️ 行为不对称
改进 URL 检测                     是 (内联逻辑)        ❌
添加新的分支策略                  是 (修改 if-else)    ❌
支持 Markdown 变体                是 (硬编码值)        ❌
添加 undo 支持                    是 (execute 返回值)  ⚠️
──────────────────────────────────────────────────────────────

OCP 符合度: 2/8 — 显著低于 italic.tsx 的 3/6，大部分行为扩展需要修改 execute 函数体
```

### 4.2 替换性评估

```
link 对象可替换性:
  ── 作为 ICommand 类型被消费 → ✅ 任何 ICommand 实现均可替换
  ── 在 getCommands() 数组中注册 → ✅ 位置无关，按序排列
  ── 通过 shortcuts 触发 → ✅ 快捷键系统通过 keyCommand 匹配
  ── 自定义命令复用 execute → ❌ 三路分支逻辑与 link 特定值深度绑定

结论: 模块在"注册-触发"层面完全可替换，但 execute 函数不可复用
```

### 4.3 架构层级复杂度对比

```
命令实现层复杂度梯度:
──────────────────────────────────────────
低 ←────────────────────────────────────────→ 高

italic    bold    strikethrough    code    comment    link    image
  │         │          │            │        │         │        │
  └─────────┴──────────┴────────────┘        │         │        │
     单路径 execute（无策略选择）              │         │        │
                                              └─────────┴────────┘
                                              三路径 execute（含策略选择）

link.tsx 和 image.tsx 处于命令实现层复杂度的最高端。
是否应该继续留在命令实现层，还是应提升为独立子系统？
→ 建议: 引入 createSmartLinkCommand 工厂函数，将策略选择提升为可配置的元模式
```

---

## 五、架构评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块边界清晰度 | 6/10 | URL 检测和策略选择超出命令实现层职责 |
| 依赖方向正确性 | 9/10 | 全部依赖指向基础设施层，无反向依赖 |
| 设计模式一致性 | 6/10 | 命令模式基本结构正确，但策略选择内联化 |
| 接口契约完整性 | 6/10 | prefix 可选但 execute 隐式依赖，与 italic 同问题 |
| DRY 原则遵守 | 4/10 | 与 image.tsx 85% 代码重复 |
| 配置单一来源 | 4/10 | 三套 prefix/suffix 配置源并存（命令配置 + 硬编码 URL + 硬编码模板） |
| 数据流清晰度 | 5/10 | selection 跨阶段混用，分支 A 存在状态回退 |
| 扩展性 | 4/10 | OCP 符合度 2/8，大部分行为扩展需修改 execute |
| **综合评分** | **5.5/10** | |

---

## 六、修复建议优先级

| 优先级 | 编号 | 建议 | 影响范围 | 工作量 |
|--------|------|------|----------|--------|
| P1 | H1 | 将 URL 检测逻辑提取为 markdownUtils.ts 中的 `isUrlLike()` 工具函数 | link.tsx + image.tsx | 小 |
| P2 | M2 | 创建 `createSmartLinkCommand` 工厂函数，消除 link/image 85% 代码重复 | link.tsx + image.tsx | 中 |
| P2 | M1 | 统一 prefix/suffix 配置源，消除 execute 中的硬编码值 | link.tsx | 中 |
| P3 | M3 | 重构数据流，使用不可变变量替代 let 重赋值 | link.tsx | 小 |
| P3 | L1 | 修正 SVG data-name 为 "link" | link.tsx | 极小 |

---

## 七、总结

`link.tsx` 在架构定位上正确地属于命令实现层，遵循了命令模式的基本结构，依赖方向正确，模块可替换。但其 execute 函数是命令实现层中复杂度最高的实现之一，引入了三个不属于该层职责的核心问题：

1. **职责越界**（H1）— URL 检测逻辑应在基础设施层或独立的策略模块中，而非内联在命令的 execute 函数中。这使得 URL 检测无法被 image.tsx 复用，导致 85% 代码重复。

2. **双重配置源**（M1）— execute 中存在三套独立的 prefix/suffix 值来源，破坏了命令模式"配置驱动"的架构原则。自定义命令无法覆盖分支 A 和分支 B 的行为。

3. **数据流不透明**（M3）— 三路分支共享 `let` 变量并通过重赋值实现状态回退，使得数据流追踪困难，增加了维护者的认知负担。

与同层的 italic/bold/strikethrough 等简单命令相比（综合评分 7.1），link.tsx 的架构质量显著偏低（5.5），根本原因是将策略选择和内容识别逻辑下放到了命令实现层。

**核心建议**: 引入 `createSmartLinkCommand` 工厂函数 + `isUrlLike` 工具函数，将"智能链接类命令"的通用逻辑提升为可复用的架构组件。这不仅能消除 link/image 间的代码重复，还能使未来新增类似命令（如脚注引用 `[text][1]`）变得简单。
