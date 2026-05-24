# 软件架构专家评审：list.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/list.tsx`
**评审角色**: 软件架构专家（模块职责 · 抽象层级 · 接口契约 · 耦合度 · 内聚性 · 可扩展性 · 设计模式 · 架构演进性）
**评审日期**: 2026-05-25
**代码行数**: 107 行（1 个导出辅助函数 + 3 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器列表命令实现——`unorderedListCommand`（无序列表 `- `）、`orderedListCommand`（有序列表 `1. `）、`checkedListCommand`（任务列表 `- [ ] `），共享 `makeList` 辅助函数处理添加/移除列表标记逻辑
**评审结论**: ⚠️ CONDITIONAL APPROVE 6.0分 — 架构骨架合理（Command + Template Method），但 `makeList` 违反 SRP、命令对象缺乏工厂抽象、状态转换模型缺失、接口契约隐式耦合；建议重构为分层管道架构

**问题统计**: HIGH × 2 / MEDIUM × 4 / LOW × 3 / INFO × 2

---

## 一、架构全景

### 1.1 模块依赖图

```
                    ┌─────────────────────────────┐
                    │      commands/index.ts       │
                    │   (ICommand 注册表 + 类型)    │
                    └──────────┬──────────────────┘
                               │ 类型依赖: ICommand, ExecuteState, TextAreaTextApi
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                       list.tsx                                │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  makeList(state, api, insertBefore)                     │  │
│  │    ↓ 调用                                               │  │
│  │    ├── selectWord()          ← 选区扩展                 │  │
│  │    ├── getBreaksNeeded*()    ← 空行计算                 │  │
│  │    └── insertBeforeEachLine() ← 逐行变换               │  │
│  └────────────────────────────────────────────────────────┘  │
│         ↑              ↑              ↑                        │
│    unorderedList  orderedList   checkedList                    │
│    (prefix:'- ')  (prefix:'1.')  (prefix:'- [ ] ')            │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────────┐
                    │   utils/markdownUtils.ts     │
                    │  selectWord()                │
                    │  getBreaksNeeded*()          │
                    │  insertBeforeEachLine()      │
                    │  AlterLineFunction 类型      │
                    └─────────────────────────────┘
```

### 1.2 职责分配矩阵

| 职责 | 承载者 | 评价 |
|------|--------|------|
| 命令元数据（名称/快捷键/图标） | 三个 ICommand 对象 | ✅ 正确归属 |
| 列表添加/移除核心逻辑 | `makeList` 函数 | ❌ 过重——承担 4 项子职责 |
| 选区计算 | `selectWord`（外部依赖） | ✅ 委托合理 |
| 空行分隔 | `getBreaksNeeded*`（外部依赖） | ✅ 委托合理 |
| 文本变换 | `insertBeforeEachLine`（外部依赖） | ✅ 委托合理 |
| DOM 操作 | `TextAreaTextApi`（外部依赖） | ✅ 正确委托 |
| 状态转换 | `makeList` 内隐式处理 | ❌ 无显式模型 |

### 1.3 架构度量

| 度量 | 值 | 评价 |
|------|----|------|
| 传入耦合 (Ca) | 5（5 个 markdownUtils 函数） | ⚠️ 偏高——单一工具模块依赖面过宽 |
| 传出耦合 (Ce) | 3（3 个 ICommand + 1 个 makeList） | ✅ 适当的公开 API 面 |
| 内聚度 (LCOM) | 中等 | ⚠️ makeList 混合多个关注点 |
| 抽象层级数 | 2 层（命令对象 → 辅助函数） | ✅ 扁平结构适合当前规模 |
| 代码-数据比 | 40%/60%（逻辑 vs SVG 数据） | ⚠️ SVG 数据占模块体积 ~50% |

---

## 二、架构问题详细分析

### P1-HIGH-01：`makeList` 违反单一职责原则（SRP）

**位置**: `list.tsx:11-46`
**SOLID 原则**: SRP（Single Responsibility Principle）
**严重度**: HIGH — 架构级设计缺陷

```typescript
export const makeList = (state, api, insertBefore) => {
  // 职责 1: 选区扩展 + 应用 (L12-13)
  const newSelectionRange = selectWord({...});
  const state1 = api.setSelectionRange(newSelectionRange);

  // 职责 2: 空行分隔计算 (L15-19)
  const breaksBeforeCount = getBreaksNeededForEmptyLineBefore(...);
  const breaksBefore = Array(breaksBeforeCount + 1).join('\n');
  const breaksAfterCount = getBreaksNeededForEmptyLineAfter(...);
  const breaksAfter = Array(breaksAfterCount + 1).join('\n');

  // 职责 3: 文本变换 (L21)
  const { modifiedText, insertionLength } = insertBeforeEachLine(...);

  // 职责 4: 移除路径——边界调整 + 替换 (L22-38)
  if (insertionLength < 0) { ... }

  // 职责 5: 添加路径——拼接 + 光标定位 (L39-45)
  else { ... }
};
```

**问题分析**:

`makeList` 承担了 **5 项可独立变化的职责**：

| # | 职责 | 变化原因 | 可独立测试 |
|---|------|----------|-----------|
| 1 | 选区扩展策略 | 选中算法可能优化 | ❌ 耦合在函数中 |
| 2 | 空行分隔规则 | Markdown 风格可能调整 | ❌ |
| 3 | 逐行文本变换 | 新列表类型 | ✅ insertBeforeEachLine |
| 4 | 移除逻辑（边界+替换+光标） | 移除策略可能变 | ❌ |
| 5 | 添加逻辑（拼接+光标） | 添加策略可能变 | ❌ |

**架构后果**:
- 无法对单个职责进行单元测试（需构造完整 state + api mock）
- 修改任一职责可能影响其他职责（如修改空行计算影响光标定位）
- 函数圈复杂度 8，认知负荷高

**重构建议——管道架构**:

```typescript
// 阶段 1: 纯计算——选区扩展
function expandSelection(state: ExecuteState, prefix: string): SelectionRange {
  return selectWord({ text: state.text, selection: state.selection, prefix });
}

// 阶段 2: 纯计算——文本变换 + 空行
function transformText(text: string, selection: SelectionRange, insertBefore: string | AlterLineFunction) {
  const breaksBefore = '\n'.repeat(getBreaksNeededForEmptyLineBefore(text, selection.start));
  const breaksAfter = '\n'.repeat(getBreaksNeededForEmptyLineAfter(text, selection.end));
  const { modifiedText, insertionLength } = insertBeforeEachLine(text.slice(selection.start, selection.end), insertBefore);
  return { modifiedText, insertionLength, breaksBefore, breaksAfter };
}

// 阶段 3: 副作用——DOM 操作
function applyToList(api: TextAreaTextApi, selection: SelectionRange, transformed: TransformedText) {
  if (transformed.insertionLength < 0) {
    applyRemoval(api, selection, transformed.modifiedText);
  } else {
    applyInsertion(api, selection, transformed);
  }
}
```

**收益**: 每个阶段可独立测试、独立替换、组合使用。

---

### P1-HIGH-02：命令对象缺乏工厂抽象，结构重复度高

**位置**: `list.tsx:48-106`
**设计原则**: DRY + Factory Pattern
**严重度**: HIGH — 可扩展性瓶颈

**重复结构分析**:

```
unorderedListCommand          orderedListCommand          checkedListCommand
─────────────────            ─────────────────           ──────────────────
name: 'unordered-list'       name: 'ordered-list'        name: 'checked-list'
keyCommand: 'list'     ════  keyCommand: 'list'     ════  keyCommand: 'list'
shortcuts: 'ctrl+shift+u'    shortcuts: 'ctrl+shift+o'   shortcuts: 'ctrl+shift+c'
prefix: '- '                 prefix: '1. '               prefix: '- [ ] '
buttonProps: {               buttonProps: {              buttonProps: {
  aria-label: `Add ...`        aria-label: `Add ...`       aria-label: `Add ...`
  title: `Add ...`             title: `Add ...`            title: `Add ...`
}                            }                           }
icon: <svg ...>              icon: <svg ...>             icon: <svg ...>
execute: (s, a) =>           execute: (s, a) =>          execute: (s, a) =>
  makeList(s, a, '- ')         makeList(s, a, fn)          makeList(s, a, fn)
```

**问题分析**:

三个命令的 `ICommand` 结构有 **80% 相同**，差异仅在：
1. `name` 字符串
2. `prefix` 字符串
3. `shortcuts` 后缀字母
4. `icon` SVG 数据
5. `execute` 的 `insertBefore` 参数

当前每个命令独立声明，导致：
- 添加新列表类型需复制完整对象（如要添加定义列表 `: ` 前缀，需再写 ~20 行）
- `buttonProps` 的 `aria-label` 和 `title` 模式完全一致但重复书写
- SVG 图标数据占每个命令 ~15 行，淹没在结构代码中

**重构建议——工厂函数**:

```typescript
interface ListCommandConfig {
  name: string;
  prefix: string;
  shortcutSuffix: string;
  insertBefore: string | AlterLineFunction;
  icon: React.ReactNode;
}

function createListCommand(config: ListCommandConfig): ICommand {
  return {
    name: config.name,
    keyCommand: 'list',
    shortcuts: `ctrl+shift+${config.shortcutSuffix}`,
    prefix: config.prefix,
    buttonProps: {
      'aria-label': `Add ${config.name} (${config.shortcuts})`,
      title: `Add ${config.name} (${config.shortcuts})`,
    },
    icon: config.icon,
    execute: (state: ExecuteState, api: TextAreaTextApi) => {
      makeList(state, api, config.insertBefore);
    },
  };
}

// 使用
export const unorderedListCommand = createListCommand({
  name: 'unordered-list',
  prefix: '- ',
  shortcutSuffix: 'u',
  insertBefore: '- ',
  icon: <SvgUnorderedList />,
});
```

**收益**: 新增列表类型仅需 1 个配置对象 + 1 行调用，消除结构重复。

---

### P2-MEDIUM-01：状态转换模型缺失，`state`/`state1` 隐式契约

**位置**: `list.tsx:12-44`
**设计原则**: Explicit State Transition
**严重度**: MEDIUM — 维护隐患

```typescript
const state1 = api.setSelectionRange(newSelectionRange);  // L13

// Remove 分支 (L24-38):
//   使用 state.text (原始文本) + state1.selection (更新选区) + state.text.length (原始长度)
// Add 分支 (L40-44):
//   使用 state1.selection.start (更新选区) + breaksBeforeCount (从 state1 计算)
```

**问题分析**:

`state` → `state1` 的转换缺乏显式模型：

```
state (入参)
  │
  ├── state.text           → 在 Remove 分支中被读取 (L26, 30)
  ├── state.selection      → 仅用于 selectWord 计算
  │
  └──→ api.setSelectionRange()
        │
        └──→ state1 (返回值)
              ├── state1.text           → 未被读取（但 state.text 被读取）
              ├── state1.selection      → Remove 和 Add 分支都读取
              └── state1.selectedText   → Add 分支读取
```

**架构风险**:
1. **时间耦合（Temporal Coupling）**: 代码依赖 `setSelectionRange` 不修改 `text` 这一隐式契约。如果 `TextAreaTextApi` 实现变更（如添加自动格式化），`state.text !== state1.text` 将导致 Remove 分支基于过期数据计算
2. **可读性**: 读者必须追踪哪个变量在哪个时间点被修改，认知负荷高
3. **不可测试性**: 无法在不 mock `TextAreaTextApi` 的情况下测试状态转换逻辑

**重构建议**:

```typescript
// 显式状态类型
interface ListState {
  readonly text: string;
  readonly selection: { start: number; end: number };
  readonly selectedText: string;
}

// 显式转换函数
function computeSelectionState(state: ListState, range: SelectionRange): ListState {
  return {
    text: state.text,
    selection: range,
    selectedText: state.text.slice(range.start, range.end),
  };
}
```

---

### P2-MEDIUM-02：`makeList` 公开 API 与内部实现契约不一致

**位置**: `list.tsx:11`
**设计原则**: Interface Segregation + Contract by Design
**严重度**: MEDIUM — API 设计缺陷

```typescript
export const makeList = (
  state: ExecuteState,
  api: TextAreaTextApi,
  insertBefore: string | AlterLineFunction
) => {
  const newSelectionRange = selectWord({
    text: state.text,
    selection: state.selection,
    prefix: state.command.prefix!  // ❌ 隐式前置条件：state.command.prefix 必须存在
  });
```

**问题分析**:

`makeList` 的公开接口签名为 `(state, api, insertBefore)`，但存在 **3 个隐式前置条件**：

| 前置条件 | 接口表达 | 运行时后果 |
|----------|----------|-----------|
| `state.command.prefix` 非空 | `!` 非空断言绕过 | `prefix.length` → TypeError |
| `state.text` 与 DOM textarea 同步 | 无约束 | 选区计算错误 |
| `api` 方法调用顺序敏感 | 无文档 | Remove 分支依赖先调用 `setSelectionRange` |

这违反了**契约式设计（Design by Contract）**原则：调用者无法从接口签名推断使用约束。

**重构建议**:

```typescript
// 方案 A: 将 prefix 提升为显式参数
export const makeList = (
  state: ExecuteState,
  api: TextAreaTextApi,
  insertBefore: string | AlterLineFunction,
  prefix: string  // 显式参数，非 state.command.prefix
) => { ... };

// 方案 B: 运行时前置条件检查
export const makeList = (state: ExecuteState, api: TextAreaTextApi, insertBefore: string | AlterLineFunction) => {
  const prefix = state.command.prefix;
  if (!prefix) {
    console.warn('makeList: state.command.prefix is required');
    return;
  }
  // ...
};
```

---

### P2-MEDIUM-03：Remove/Add 双路径违反开闭原则（OCP）

**位置**: `list.tsx:22-45`
**SOLID 原则**: OCP（Open/Closed Principle）
**严重度**: MEDIUM — 可扩展性限制

```typescript
if (insertionLength < 0) {
  // Remove 路径: 边界扩展 → 替换 → 光标定位 (15 行逻辑)
} else {
  // Add 路径: 空行拼接 → 替换 → 光标定位 (6 行逻辑)
}
```

**问题分析**:

当前只有 Remove 和 Add 两条路径。如果需要扩展（如 Toggle 模式、仅格式化不添加/移除），必须修改 `makeList` 内部逻辑，违反 OCP。

两条路径的**差异点**：

| 步骤 | Remove | Add |
|------|--------|-----|
| 选区调整 | 扩展前后换行边界 | 不调整 |
| 文本替换 | 仅 `modifiedText` | `breaksBefore + modifiedText + breaksAfter` |
| 光标定位 | `selectionStart → selectionStart + modifiedText.length` | `selectionStart + breaksBeforeCount → + modifiedText.length` |

**重构建议——策略模式**:

```typescript
interface ListOperationStrategy {
  adjustSelection(state: ListState): SelectionRange;
  buildReplacement(state: ListState, transformed: TransformedText): string;
  computeCursorRange(start: number, transformed: TransformedText): SelectionRange;
}

const removeStrategy: ListOperationStrategy = { ... };
const addStrategy: ListOperationStrategy = { ... };

function getStrategy(insertionLength: number): ListOperationStrategy {
  return insertionLength < 0 ? removeStrategy : addStrategy;
}
```

---

### P2-MEDIUM-04：SVG 图标数据与命令逻辑同层部署

**位置**: `list.tsx:58-63, 77-82, 96-101`
**设计原则**: Separation of Concerns
**严重度**: MEDIUM — 代码组织

```typescript
export const unorderedListCommand: ICommand = {
  // ... 元数据 (6 行)
  icon: (
    <svg data-name="unordered-list" width="12" height="12" viewBox="0 0 512 512">
      <path fill="currentColor" d="M96 96c0 26.51-21.49..." />  {/* ~200 字符的 path 数据 */}
    </svg>
  ),
  // ... execute (3 行)
};
```

**问题分析**:

- 三个 SVG 图标共占 ~45 行（模块体积的 42%），属于**资源数据**而非**逻辑代码**
- 图标数据内联在命令对象中，无法按需加载或替换
- 修改图标需要修改逻辑文件，违反关注点分离

**重构建议**:

```typescript
// icons.ts
export const UnorderedListIcon = () => <svg>...</svg>;
export const OrderedListIcon = () => <svg>...</svg>;
export const CheckedListIcon = () => <svg>...</svg>;

// list.tsx
import { UnorderedListIcon, OrderedListIcon, CheckedListIcon } from './icons';
```

---

### P3-LOW-01：`ICommand` 接口约束不足

**位置**: 类型定义层（影响 `list.tsx:48,70,89`）
**设计原则**: Type Safety

`ICommand` 接口中 `prefix` 为可选属性（`prefix?: string`），但 `makeList` 将其作为必需参数使用。这表明接口定义与实际使用场景不匹配：

- 列表命令**需要** `prefix`（用于 `selectWord`）
- 部分命令（如 `fullscreen`）不需要 `prefix`
- 但两者共享同一 `ICommand` 接口

**建议**: 使用可辨识联合（Discriminated Union）：

```typescript
type ICommand = IInlineCommand | IListCommand | IToggleCommand;

interface IListCommand extends ICommandBase {
  keyCommand: 'list';
  prefix: string;  // 必需
}

interface IToggleCommand extends ICommandBase {
  keyCommand: 'fullscreen' | 'preview';
  // 无 prefix
}
```

---

### P3-LOW-02：`AlterLineFunction` 类型不够表达力

**位置**: `list.tsx:8`（导入），影响 `L11` 签名

```typescript
insertBefore: string | AlterLineFunction
```

`AlterLineFunction` 是 `(item: string, index: number) => string` 的类型别名，但无法区分：
- **固定前缀**（如 `'- '`、`'- [ ] '`）—— 结果不依赖 item/index
- **动态前缀**（如 `(item, index) => `${index + 1}. ``）—— 结果依赖 index

**建议**: 使用语义化类型区分：

```typescript
type StaticPrefix = string;
type DynamicPrefix = (item: string, index: number) => string;
type ListPrefix = StaticPrefix | DynamicPrefix;
```

---

### P3-LOW-03：模块导出面过大

**位置**: `list.tsx:11,48,70,89`

模块导出 4 个成员：`makeList`（辅助函数）+ 3 个命令对象。但 `makeList` 作为内部实现细节不应暴露为公开 API：

- 当前仅被同模块的 3 个 `execute` 函数调用
- `export` 意味着外部代码可直接调用，增加了模块的公开契约面
- 任何 `makeList` 签名变更都是 breaking change

**建议**: 移除 `makeList` 的 `export`，仅保留 3 个命令对象作为模块公开 API。

---

### INFO-01：模块依赖方向正确但宽度偏大

模块对 `markdownUtils` 有 5 个导入（`selectWord`、`getBreaksNeededForEmptyLineBefore`、`getBreaksNeededForEmptyLineAfter`、`insertBeforeEachLine`、`AlterLineFunction`），这些是列表操作必需的工具函数，依赖方向正确（高层→低层工具）。但 5 个导入点增加了模块与工具层的耦合面。

---

### INFO-02：架构风格与 inline 命令的一致性

`list.tsx` 的架构风格与 `bold.tsx` / `italic.tsx` 等内联命令有结构性差异：

| 维度 | inline 命令 | list 命令 |
|------|------------|-----------|
| 核心逻辑 | 委托 `executeCommand` | 自定义 `makeList` |
| 命令数量 | 1 文件 1 命令 | 1 文件 3 命令 |
| 辅助函数 | 无 | `makeList` |
| 快捷键格式 | `ctrlcmd+*` | `ctrl+shift+*` |

这种差异源于列表操作的多行复杂性，是合理的架构分化。但快捷键格式的不一致应统一。

---

## 三、架构模式评估

### 3.1 当前模式应用

| 模式 | 应用位置 | 评价 |
|------|----------|------|
| **Command Pattern** | `ICommand` 接口 + 3 个命令对象 | ✅ 标准实现，支持注册/执行/快捷键 |
| **Template Method** | `makeList` 作为骨架，`insertBefore` 参数化差异 | ⚠️ 实现为函数而非类继承，缺少钩子点 |
| **Strategy Pattern** | `insertBefore: string | AlterLineFunction` | ⚠️ 仅在此一处使用，Remove/Add 路径未策略化 |
| **Factory Method** | 无 | ❌ 缺失——应添加 `createListCommand` 工厂 |

### 3.2 推荐架构：分层管道 + 工厂

```
┌─────────────────────────────────────────────────────────┐
│  工厂层: createListCommand(config) → ICommand             │
│    消除命令对象的结构重复                                   │
├─────────────────────────────────────────────────────────┤
│  管道层: makeList(state, api, insertBefore)               │
│    ├── Phase 1: 选区计算 (纯函数)                         │
│    ├── Phase 2: 文本变换 (纯函数)                         │
│    ├── Phase 3: 策略选择 (Remove / Add)                   │
│    └── Phase 4: DOM 操作 (副作用)                         │
├─────────────────────────────────────────────────────────┤
│  策略层: RemoveStrategy / AddStrategy                     │
│    每种操作独立封装选区调整 + 替换 + 光标定位                │
├─────────────────────────────────────────────────────────┤
│  资源层: icons.ts                                         │
│    SVG 图标数据独立管理                                    │
└─────────────────────────────────────────────────────────┘
```

### 3.3 可扩展性评估

```
扩展场景                       当前难度    重构后难度    说明
─────────────────────────────────────────────────────────
新增列表类型（如定义列表）      中          低           工厂 + 配置对象
修改列表前缀                   低          低           prefix 参数化
添加嵌套列表支持               高          中           管道阶段可插入缩进逻辑
添加 Toggle 模式               高          低           新增 ToggleStrategy
替换 SVG 图标                  中          低           资源层独立管理
修改空行规则                   高          低           Phase 2 可独立修改
```

---

## 四、安全评估（架构视角）

| 维度 | 评价 |
|------|------|
| 攻击面 | ✅ 极小——全部操作限于 textarea.value 纯文本域 |
| 信任边界 | ✅ 无网络请求、无敏感数据访问、无代码执行 |
| 状态一致性 | ⚠️ state/state1 混用存在理论上的不一致风险，但安全影响为零（仅影响文本编辑正确性） |
| 供应链 | ✅ 无外部运行时依赖（仅 React JSX + 内部工具函数） |

**安全结论**: 无架构级安全风险。

---

## 五、总结

### 5.1 问题汇总

| ID | 严重度 | 原则/分类 | 问题 | 修复难度 |
|----|--------|----------|------|----------|
| P1-HIGH-01 | HIGH | SRP | `makeList` 承担 5 项职责，圈复杂度 8 | 中 |
| P1-HIGH-02 | HIGH | DRY/Factory | 3 个命令对象 80% 结构重复，无工厂抽象 | 低 |
| P2-MEDIUM-01 | MEDIUM | 显式状态 | state/state1 转换无模型，时间耦合 | 低 |
| P2-MEDIUM-02 | MEDIUM | 接口契约 | 3 个隐式前置条件，调用者无法从签名推断 | 低 |
| P2-MEDIUM-03 | MEDIUM | OCP | Remove/Add 硬编码 if-else，扩展需改内部 | 中 |
| P2-MEDIUM-04 | MEDIUM | SoC | SVG 数据（42% 体积）与逻辑代码同文件 | 低 |
| P3-LOW-01 | LOW | 类型安全 | `ICommand` 接口 `prefix` 可选但实际必需 | 中 |
| P3-LOW-02 | LOW | 类型表达力 | `AlterLineFunction` 无法区分固定/动态前缀 | 低 |
| P3-LOW-03 | LOW | 封装性 | `makeList` 不应 export，暴露内部实现 | 极低 |
| INFO-01 | INFO | 耦合 | 对 markdownUtils 5 个导入点 | — |
| INFO-02 | INFO | 一致性 | 与 inline 命令的架构风格/快捷键差异 | — |

### 5.2 综合评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 单一职责 | 4 | makeList 承担过多职责，Remove/Add 双路径混合 |
| 接口设计 | 5 | ICommand 过于宽泛，makeList 隐式契约多 |
| 耦合度 | 6 | 对 markdownUtils 依赖合理但偏宽，时间耦合存在 |
| 内聚性 | 6 | 命令对象内聚，makeList 内聚度偏低 |
| 可扩展性 | 5 | 无工厂抽象，扩展需复制代码或改内部逻辑 |
| 可维护性 | 6 | 结构清晰但缺文档，SVG 数据干扰阅读 |
| 设计模式 | 7 | Command + Template Method 基本正确 |
| 安全性 | 9 | 纯文本操作，攻击面极小 |
| **综合** | **6.0** | ⚠️ CONDITIONAL APPROVE |

### 5.3 优先重构建议

| 优先级 | 建议 | 工作量 | 收益 |
|--------|------|--------|------|
| 1 | 提取 `createListCommand` 工厂函数 | 小 | 消除 80% 结构重复，新增列表类型仅需配置 |
| 2 | `makeList` 拆分为纯计算管道 + DOM 操作阶段 | 中 | 可独立测试、独立替换各阶段 |
| 3 | SVG 图标提取到 `icons.ts` | 小 | 降低模块体积 42%，关注点分离 |
| 4 | Remove/Add 策略模式化 | 中 | 满足 OCP，支持未来 Toggle 等新模式 |
| 5 | `makeList` 移除 `export`，增加前置条件检查 | 极小 | 收窄公开 API 面，增加防御性 |

### 5.4 集成风险评估

在本项目中使用 `list.tsx` 的架构风险等级：**低**

- 作为 `@uiw/react-md-editor` 的工具栏命令使用，不作为自定义扩展点
- 三个命令的交互范围限于 textarea 文本操作
- 架构问题（SRP 违反、缺乏工厂）影响的是库自身的可维护性，不影响使用方
- 如果项目需要自定义列表命令，建议复制 `makeList` 逻辑并独立实现，不依赖此 export

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts）*
