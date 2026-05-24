# 软件架构专家评审：quote.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/quote.tsx`
**评审角色**: 软件架构专家（模块职责 · 抽象层级 · 接口契约 · 耦合度 · 内聚性 · 可扩展性 · 设计模式 · 架构演进性）
**评审日期**: 2026-05-25
**代码行数**: 44 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"引用"命令实现，通过 `> ` 前缀为选中文本添加/移除引用块（blockquote），支持 Ctrl/Cmd+Q 快捷键触发，使用 `insertBeforeEachLine` 处理多行引用场景
**评审结论**: ✅ APPROVE WITH COMMENTS 6.5分 — 架构定位正确，属于命令实现层的块级命令变体，数据流线性清晰（优于 link.tsx 的三路分支）；但块级命令模式未抽象、与 list.tsx 存在隐性结构重复、ICommand 接口缺少命令分类维度

**问题统计**: HIGH × 1 / MEDIUM × 3 / LOW × 2 / INFO × 2

---

## 一、架构定位分析

### 1.1 模块在系统中的位置

```
react-md-editor 命令实现层分类视图
┌──────────────────────────────────────────────────────────────────────┐
│                          命令编排层                                    │
│  TextAreaCommandOrchestrator.executeCommand()                        │
│    → 构建 ExecuteState { command, ...textState }                     │
│    → 调用 command.execute(state, api, ...)                           │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────────┐
              ▼                ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ Inline 命令簇     │ │ Block 命令簇      │ │ Toggle 命令簇         │
│ (使用executeCmd) │ │ (使用insertEach)  │ │ (状态切换)            │
│                  │ │                  │ │                      │
│ bold.tsx         │ │ quote.tsx ← 本文件│ │ fullscreen.tsx       │
│ italic.tsx       │ │ list.tsx (×3)    │ │ preview.tsx          │
│ strikethrough.tsx│ │ hr.tsx           │ │                      │
│ code.tsx         │ │                  │ │                      │
└──────┬───────────┘ └──────┬───────────┘ └──────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────────┐ ┌──────────────────────────────────────────────┐
│ 基础设施层        │ │ 基础设施层 (Block 专用)                        │
│ executeCommand() │ │ insertBeforeEachLine()                        │
│ selectWord()     │ │ getBreaksNeededForEmptyLineBefore()           │
│ getSurroundingWord()│ getBreaksNeededForEmptyLineAfter()           │
└──────────────────┘ └──────────────────────────────────────────────┘
```

**quote.tsx 的架构角色**: 命令实现层的**块级命令**（Block Command），与 list.tsx 同属一个子簇。区别于 bold/italic 等行内命令（使用 `executeCommand` 包装），块级命令直接使用 `insertBeforeEachLine` + 空行计算来处理多行文本。

### 1.2 依赖关系图

```
quote.tsx 依赖拓扑
──────────────────────────────────────────
                          quote.tsx
                       ╱              ╲
                      ╱                ╲
        commands/index.ts          utils/markdownUtils.ts
        (类型导入)                  (行为导入)
             │                    ┌──────┼──────────────┐
             │                    │      │              │
        ICommand 接口        selectWord  getBreaks*  insertBeforeEachLine
        ExecuteState             │    (×2 函数)         │
        TextAreaTextApi          │                      │
                             TextRange              { modifiedText,
                                                    insertionLength }
```

**依赖方向评价**: ✅ 所有依赖指向下层（基础设施层），无循环依赖，无跨层直接访问。

**依赖宽度**: 4 个 markdownUtils 导入（`selectWord`、`getBreaksNeededForEmptyLineBefore`、`getBreaksNeededForEmptyLineAfter`、`insertBeforeEachLine`），与 list.tsx 的依赖面完全一致——这是块级命令的共同特征。

### 1.3 被依赖关系

```
Afferent 依赖链（谁使用了 quote.tsx）
──────────────────────────────────────────
commands/index.ts → getCommands() → 默认命令列表
                                     │
                                     ▼
                              Editor.tsx / Toolbar
                              → 用户通过按钮或 Ctrl+Q 触发
```

**Afferent 耦合 (Ca)**: 1（仅被 commands/index.ts 导入）
**Efferent 耦合 (Ce)**: 3（React, commands/index.ts 类型, markdownUtils.ts）
**不稳定性 (I)**: 3/(1+3) = 0.75 → 叶子模块，高不稳定性正常

### 1.4 架构度量

| 度量 | 值 | 评价 |
|------|----|------|
| 代码行数 | 44 行 | ✅ 适中 |
| 传入耦合 (Ca) | 1 | ✅ 最小公开面 |
| 传出耦合 (Ce) | 5（4 个 markdownUtils + 1 React） | ⚠️ 偏高——块级命令共性 |
| 内聚度 (LCOM) | 高（通信内聚） | ✅ execute 内所有操作围绕同一数据流 |
| 抽象层级数 | 2 层（命令对象 → 基础设施函数） | ✅ 扁平结构适合当前规模 |
| 圈复杂度 | 1（execute 内无条件分支） | ✅ 线性数据流 |
| 代码-数据比 | 60%/40%（逻辑 vs SVG 数据） | ✅ SVG 占比合理 |

---

## 二、架构问题详细分析

### P1-HIGH-01：块级命令模式未抽象——quote.tsx 与 list.tsx 的隐性结构重复

**架构层面**: DRY · 抽象缺失 · 设计模式提取
**严重度**: HIGH — 架构级设计缺陷

**同构度分析**:

```
quote.tsx execute (L24-42) vs list.tsx makeList (L11-45) 逐行对比:
─────────────────────────────────────────────────────────────────────
步骤                           quote.tsx              list.tsx (Add 分支)
─────────────────────────────────────────────────────────────────────
1. selectWord 扩展选区          L25-29                 L12-13
   └── state.command.prefix!    L28                    通过参数

2. api.setSelectionRange        L30                    L13
   └── state1                   state1                 state1

3. 计算空行分隔                  L31-35                 L15-19
   ├── breaksBeforeCount        getBreaks...Before     getBreaks...Before
   ├── breaksBefore             Array(n).join('\n')    Array(n).join('\n')
   ├── breaksAfterCount         getBreaks...After      getBreaks...After
   └── breaksAfter              Array(n).join('\n')    Array(n).join('\n')

4. 逐行文本变换                 L37                    L21
   └── insertBeforeEachLine     state1.selectedText    state1.selectedText
       modifiedText             .modifiedText          .modifiedText

5. 替换文本                     L38                    L43
   └── api.replaceSelection     breaks+modified+breaks breaks+modified+breaks

6. 光标定位                     L40-42                 L44-45
   └── selectionStart/End       计算+setSelectionRange 计算+setSelectionRange
─────────────────────────────────────────────────────────────────────
代码重复率: ~90%（仅差异：prefix 来源和变量命名）
```

**问题本质**:

quote.tsx 的 execute 函数与 list.tsx 的 `makeList` 的"Add 分支"实现了**完全相同的六步管道**，但没有提取共享抽象：

```
块级命令通用管道（未被显式建模）:
┌─────────────────────────────────────────────────────┐
│ Phase 1: selectWord(state) → 扩展选区               │
│ Phase 2: api.setSelectionRange(range) → 应用选区    │
│ Phase 3: getBreaks*() → 计算空行分隔                │
│ Phase 4: insertBeforeEachLine(text, prefix) → 变换  │
│ Phase 5: api.replaceSelection() → 写入文本          │
│ Phase 6: api.setSelectionRange() → 定位光标         │
└─────────────────────────────────────────────────────┘
```

**架构后果**:

| 后果 | 说明 |
|------|------|
| Bug 修复扩散 | 空行计算逻辑的 bug 需要同步修改 quote.tsx 和 list.tsx |
| 行为不一致风险 | 两份独立实现可能因微小差异导致行为偏差（如 `Array(n+1).join('\n')` vs `'\n'.repeat(n)`） |
| 扩展成本倍增 | 添加新的块级命令（如缩进 `    `）需要复制整段管道逻辑 |
| 测试冗余 | 相同的管道逻辑需要分别测试 |

**重构建议——块级命令管道函数**:

```typescript
// utils/blockCommand.ts
export function executeBlockCommand(
  state: ExecuteState,
  api: TextAreaTextApi,
  prefix: string,
): void {
  const range = selectWord({ text: state.text, selection: state.selection, prefix });
  const afterSelection = api.setSelectionRange(range);

  const breaksBeforeCount = getBreaksNeededForEmptyLineBefore(afterSelection.text, afterSelection.selection.start);
  const breaksAfterCount = getBreaksNeededForEmptyLineAfter(afterSelection.text, afterSelection.selection.end);

  const { modifiedText } = insertBeforeEachLine(afterSelection.selectedText, prefix);

  api.replaceSelection(`${'\n'.repeat(breaksBeforeCount)}${modifiedText}${'\n'.repeat(breaksAfterCount)}`);

  const selectionStart = afterSelection.selection.start + breaksBeforeCount;
  api.setSelectionRange({ start: selectionStart, end: selectionStart + modifiedText.length });
}

// quote.tsx 简化为
execute: (state, api) => executeBlockCommand(state, api, state.command.prefix ?? '> '),

// list.tsx makeList 的 Add 分支也可调用 executeBlockCommand
```

**严重性理由**: HIGH — 90% 代码重复是架构层面的抽象缺失。quote.tsx 作为独立命令文件，其 execute 逻辑完全可以从 list.tsx 的 `makeList` 中提取为通用管道，而非重新实现一遍。

---

### P2-MEDIUM-01：ICommand 接口缺少命令分类维度——Inline/Block/Toggle 共享同一类型

**架构层面**: 类型系统 · 接口契约 · 可辨识联合
**严重度**: MEDIUM — 类型安全缺陷

**问题分析**:

```
当前 ICommand 接口设计:
┌────────────────────────────────────────────────────────────────┐
│ interface ICommandBase<T> {                                     │
│   prefix?: string;        // ← 可选，但 quote/list 必需         │
│   suffix?: string;        // ← 可选，但 bold/italic 必需         │
│   keyCommand?: string;    // ← 可选，但所有命令都设置            │
│   execute?: (...) => void; // ← 可选，但所有命令都实现           │
│ }                                                               │
│                                                                 │
│ 问题: ICommand 无法从类型层面区分:                               │
│   ├── inline 命令 (bold/italic/code) → 需要 prefix + suffix     │
│   ├── block 命令 (quote/list)     → 需要 prefix，使用不同管道   │
│   └── toggle 命令 (fullscreen)    → 不需要 prefix/suffix        │
└────────────────────────────────────────────────────────────────┘
```

**对 quote.tsx 的影响**:

1. `prefix` 声明为 `prefix?: string`，但 quote.tsx 的 execute 函数通过 `state.command.prefix!` 断言其必存在
2. 类型系统无法阻止创建一个 `keyCommand: 'quote'` 但没有 `prefix` 的命令对象
3. 调用者无法从类型签名判断一个 ICommand 是行内命令还是块级命令

**架构改进建议——可辨识联合**:

```typescript
type ICommandKind = 'inline' | 'block' | 'toggle';

interface IBlockCommand extends ICommandBase {
  kind: 'block';
  keyCommand: string;     // 必需
  prefix: string;         // 必需（非可选）
  suffix?: never;         // 块级命令不使用 suffix
}

interface IInlineCommand extends ICommandBase {
  kind: 'inline';
  keyCommand: string;
  prefix: string;
  suffix: string;         // 必需（非可选）
}

type ICommand = IBlockCommand | IInlineCommand | IToggleCommand;
```

**收益**: TypeScript 编译器可在 `switch(state.command.kind)` 分支中自动收窄类型，消除非空断言需求。

---

### P2-MEDIUM-02：execute 函数混合纯计算与副作用——阶段不可独立测试

**架构层面**: 关注点分离 · 可测试性 · 纯函数设计
**严重度**: MEDIUM — 可测试性缺陷

**问题分析**:

```
quote.tsx execute 函数的职责分解:
──────────────────────────────────────────
阶段 | 操作                           | 纯/副作用 | 可独立测试
─────┼────────────────────────────────┼──────────┼──────────
 1   | selectWord() 选区扩展          | 纯计算    | ✅
 2   | api.setSelectionRange()        | DOM 副作用│ ❌ 需要 mock
 3   | getBreaksNeeded*() 空行计算     | 纯计算    | ✅
 4   | Array(n).join('\n') 字符串构建  | 纯计算    | ✅
 5   | insertBeforeEachLine() 逐行变换 | 纯计算    | ✅
 6   | api.replaceSelection()         | DOM 副作用│ ❌ 需要 mock
 7   | api.setSelectionRange()        | DOM 副作用│ ❌ 需要 mock
──────────────────────────────────────────

纯计算阶段占比: 4/7 (57%)
副作用阶段占比: 3/7 (43%)
```

**架构问题**:

所有 7 个阶段线性耦合在一个函数中。纯计算阶段（1, 3, 4, 5）完全可以提取为纯函数，不依赖 `api` 对象，从而实现：
- 无需 mock `TextAreaTextApi` 即可测试选区扩展逻辑
- 无需 mock DOM 即可测试空行计算和文本变换
- 可以在浏览器/Node.js 之外的环境中复用计算逻辑

**重构建议——纯计算 + 副作用分离**:

```typescript
// 纯计算函数——可独立测试
function computeQuoteTransform(
  text: string,
  selection: TextRange,
  prefix: string,
): { replacement: string; newRange: TextRange } {
  const range = selectWord({ text, selection, prefix });
  const selectedText = text.slice(range.start, range.end);

  const breaksBeforeCount = getBreaksNeededForEmptyLineBefore(text, range.start);
  const breaksAfterCount = getBreaksNeededForEmptyLineAfter(text, range.end);

  const { modifiedText } = insertBeforeEachLine(selectedText, prefix);

  const replacement = '\n'.repeat(breaksBeforeCount) + modifiedText + '\n'.repeat(breaksAfterCount);
  const newRange = {
    start: range.start + breaksBeforeCount,
    end: range.start + breaksBeforeCount + modifiedText.length,
  };

  return { replacement, newRange };
}

// 副作用函数——仅在 execute 中调用
execute: (state, api) => {
  const prefix = state.command.prefix ?? '> ';
  const range = selectWord({ text: state.text, selection: state.selection, prefix });
  api.setSelectionRange(range);

  const { replacement, newRange } = computeQuoteTransform(state.text, state.selection, prefix);
  api.replaceSelection(replacement);
  api.setSelectionRange(newRange);
},
```

**收益**: `computeQuoteTransform` 可用纯字符串输入输出进行单元测试，无需任何 mock。

---

### P2-MEDIUM-03：非空断言绕过类型契约——与所有命令共享的系统性问题

**架构层面**: 类型安全 · 契约式设计
**严重度**: MEDIUM — 运行时异常风险

**位置**: 第 28 行、第 37 行

```typescript
// 第 28 行
prefix: state.command.prefix!,
// 第 37 行
const modifiedText = insertBeforeEachLine(state1.selectedText, state.command.prefix!);
```

**影响分析**:

```
undefined 传播路径:
state.command.prefix = undefined (假设框架分发错误)
  │
  ├── [路径 1] → selectWord({ prefix: undefined })
  │   └── getSurroundingWord() 中 prefix.length → TypeError
  │
  └── [路径 2] → insertBeforeEachLine(text, undefined)
      └── typeof insertBefore === 'string' → false
          └── insertBefore(line, i) → undefined is not a function → TypeError
```

**与其他命令的对比**:

| 命令 | `prefix!` 使用次数 | 风险等级 |
|------|-------------------|---------|
| bold.tsx | 2 | 相同 |
| italic.tsx | 2 | 相同 |
| quote.tsx | 2 | 相同 |
| list.tsx | 1 (在 makeList 中) | 相同 |
| link.tsx | 3 | 更高 |
| code.tsx | 2 | 相同 |

**结论**: 这是**系统性架构问题**，根因在 `ICommandBase.prefix` 的可选性声明。

**建议**: 在 execute 入口添加防御性检查，见 P2-MEDIUM-01 的可辨识联合方案。

---

### P3-LOW-01：SVG 图标资源与命令逻辑同层部署

**架构层面**: 关注点分离 · 资源管理
**严重度**: LOW — 代码组织

**位置**: 第 16-22 行

```typescript
icon: (
  <svg width="12" height="12" viewBox="0 0 520 520">
    <path fill="currentColor" d="M520,95.75 L520,225.75 C520,364.908906..." />
  </svg>
),
```

SVG path 数据占模块体积的 ~40%（约 7 行 / 44 行总行数），属于**静态资源**而非**逻辑代码**。

**与同类命令对比**: 所有命令（bold/italic/list/link/code）都有相同的 SVG 嵌入模式，是库级别的架构风格选择，非 quote.tsx 独有问题。

**建议**: 若架构重构，可将 SVG 图标提取到 `commands/icons.ts`：

```typescript
// commands/icons.ts
export const QuoteIcon = () => <svg>...</svg>;

// quote.tsx
import { QuoteIcon } from './icons';
```

---

### P3-LOW-02：变量命名 `state1` 无法传达语义——时间耦合隐式化

**架构层面**: 可读性 · 数据流清晰度
**严重度**: LOW

**位置**: 第 30 行

```typescript
const state1 = api.setSelectionRange(newSelectionRange);
```

`state` → `state1` 的转换意味着"应用新选区后的编辑器状态"。但 `state1` 这个名称：
1. 无法表达其语义（"选区已更新的状态"）
2. 隐含了与 `state` 的时间耦合——读者必须理解 `state1` 继承了 `state.text` 但覆盖了 `state.selection`
3. 后续代码混用 `state1.text`（第 31/33 行）和 `state1.selectedText`（第 37 行），增加了理解负担

**建议**: `selectedState` 或 `afterSelectionUpdate`。

---

### INFO-01：quote.tsx 是块级命令中架构最简洁的实现

在所有块级命令中，quote.tsx 的 execute 函数是**唯一没有条件分支**的实现：

```
块级命令 execute 复杂度梯度:
──────────────────────────────────────────
quote.tsx    list.tsx (makeList)
  │              │
  │  线性管道     │  if-else (Add/Remove 双路径)
  │  圈复杂度=1   │  圈复杂度=8
  │              │
  └──────────────┘
     quote.tsx 的简单性使其成为
     提取块级命令管道的最佳起点
```

**架构建议**: 以 quote.tsx 的 execute 为模板，提取通用块级命令管道函数（见 P1-HIGH-01）。

---

### INFO-02：与 hr.tsx 的架构差异

```
quote.tsx vs hr.tsx 架构对比:
──────────────────────────────────────────
维度              quote.tsx           hr.tsx
──────────────────────────────────────────
命令类型          block               block
prefix            '> '                '---'
多行处理          insertBeforeEachLine 无 (单行插入)
空行计算          是 (Before + After)  是 (仅 After)
选区扩展          selectWord          无 (不基于选区)
执行管道          6 步                4 步
──────────────────────────────────────────

结论: hr.tsx 是简化的块级命令（无多行/无选区扩展），
      quote.tsx 是完整的块级命令（含多行+选区扩展），
      list.tsx 是最复杂的块级命令（含 Add/Remove 双路径）
```

---

## 三、架构模式评估

### 3.1 当前模式应用

| 模式 | 应用位置 | 评价 |
|------|----------|------|
| **Command Pattern** | `ICommand` 接口 + quote 对象 | ✅ 标准实现，支持注册/执行/快捷键 |
| **Pipeline Pattern** | execute 内的 6 步线性流程 | ⚠️ 隐式管道——未显式建模为可组合阶段 |
| **Strategy Pattern** | 无 | N/A——只有一种策略（添加引用） |
| **Factory Method** | 无 | ❌ 缺失——块级命令无工厂抽象 |
| **Template Method** | 无 | ❌ 缺失——quote/list 共享结构但无共享抽象 |

### 3.2 推荐架构：块级命令管道 + 工厂

```
┌─────────────────────────────────────────────────────────────┐
│  工厂层: createBlockCommand(config) → ICommand               │
│    消除 quote/list 的结构性重复                               │
├─────────────────────────────────────────────────────────────┤
│  管道层: executeBlockCommand(state, api, prefix)              │
│    ├── Phase 1: selectWord (纯函数)                          │
│    ├── Phase 2: computeBreaks (纯函数)                       │
│    ├── Phase 3: insertBeforeEachLine (纯函数)                │
│    ├── Phase 4: replaceSelection (副作用)                    │
│    └── Phase 5: setSelectionRange (副作用)                   │
├─────────────────────────────────────────────────────────────┤
│  类型层: IBlockCommand extends ICommandBase                   │
│    prefix: string (必需，非可选)                              │
│    消除 state.command.prefix! 非空断言                        │
├─────────────────────────────────────────────────────────────┤
│  资源层: icons.ts                                             │
│    SVG 图标数据独立管理                                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 可扩展性评估

```
扩展场景                         当前难度    重构后难度    说明
─────────────────────────────────────────────────────────
新增块级命令（如缩进）            高          低           工厂 + 管道函数
修改引用前缀                     低          低           prefix 参数化
支持嵌套引用                     高          中           管道阶段可插入缩进逻辑
添加引用移除(Toggle)             高          低           新增 Remove 策略
修改空行规则                     高          低           Phase 2 可独立修改
替换 SVG 图标                    中          低           资源层独立管理
修改选区扩展策略                 高          低           Phase 1 可独立替换
```

---

## 四、安全评估（架构视角）

| 维度 | 评价 |
|------|------|
| 攻击面 | ✅ 极小——全部操作限于 textarea.value 纯文本域 |
| 信任边界 | ✅ 无网络请求、无敏感数据访问、无代码执行 |
| 状态一致性 | ⚠️ state/state1 时间耦合存在理论上的不一致风险，但安全影响为零 |
| 供应链 | ✅ 无外部运行时依赖（仅 React JSX + 内部工具函数） |
| 注入风险 | ✅ 纯文本操作，textarea.value 不解析 HTML |

**安全结论**: 无架构级安全风险。

---

## 五、总结

### 5.1 问题汇总

| ID | 严重度 | 原则/分类 | 问题 | 修复难度 |
|----|--------|----------|------|----------|
| P1-HIGH-01 | HIGH | DRY/抽象 | 与 list.tsx 90% 管道结构重复，块级命令无共享抽象 | 中 |
| P2-MEDIUM-01 | MEDIUM | 类型安全 | ICommand 缺少命令分类，prefix 可选但块级命令必需 | 中 |
| P2-MEDIUM-02 | MEDIUM | SoC/可测试性 | execute 混合纯计算与副作用，4/7 阶段无法独立测试 | 低 |
| P2-MEDIUM-03 | MEDIUM | 类型契约 | `prefix!` 非空断言绕过类型检查，系统性问题 | 低 |
| P3-LOW-01 | LOW | SoC | SVG 数据（~40% 体积）与逻辑代码同文件 | 极低 |
| P3-LOW-02 | LOW | 可读性 | `state1` 命名不传达语义 | 极低 |
| INFO-01 | INFO | 复杂度 | 块级命令中架构最简洁的实现（圈复杂度=1） | — |
| INFO-02 | INFO | 分类 | 与 hr.tsx（简化）/ list.tsx（完整）形成块级命令梯度 | — |

### 5.2 综合评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 单一职责 | 8 | 文件级职责单一，execute 内部线性流程无分支 |
| 接口设计 | 5 | ICommand 过于宽泛，prefix 可选但实际必需 |
| 耦合度 | 6 | 对 markdownUtils 依赖合理但偏宽，时间耦合存在 |
| 内聚性 | 8 | 通信内聚——所有操作围绕同一数据流 |
| 可扩展性 | 5 | 无工厂/管道抽象，扩展需复制代码 |
| 可维护性 | 7 | 结构清晰，线性流程易理解 |
| 设计模式 | 6 | Command 模式正确，但块级命令管道/工厂缺失 |
| 安全性 | 9 | 纯文本操作，攻击面极小 |
| **综合** | **6.5** | **✅ APPROVE WITH COMMENTS** |

### 5.3 优先重构建议

| 优先级 | 建议 | 工作量 | 收益 |
|--------|------|--------|------|
| 1 | 提取 `executeBlockCommand` 管道函数（以 quote.tsx 为模板） | 中 | 消除 quote/list 90% 重复，新增块级命令仅需配置 |
| 2 | ICommand 添加命令分类维度（可辨识联合） | 中 | 消除 `prefix!` 非空断言，编译期类型安全 |
| 3 | execute 内纯计算阶段提取为独立纯函数 | 小 | 可独立测试，无需 mock DOM |
| 4 | SVG 图标提取到 `icons.ts` | 小 | 降低模块体积 40%，关注点分离 |

### 5.4 集成风险评估

在本项目中使用 `quote.tsx` 的架构风险等级：**低**

- 作为 `@uiw/react-md-editor` 的工具栏命令使用，不作为自定义扩展点
- 交互范围限于 textarea 文本操作，无网络/存储/权限相关逻辑
- 架构问题（块级命令未抽象、ICommand 分类缺失）影响的是库自身的可维护性，不影响使用方
- quote.tsx 的线性 execute 管道在运行时行为上稳定可靠，无分支条件，不会出现 link.tsx 式的策略选择错误

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts / list.tsx / bold.tsx / hr.tsx）*
