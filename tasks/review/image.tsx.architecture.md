# image.tsx 软件架构专家评审

**评审对象**: `@uiw/react-md-editor@4.1.0` → `src/commands/image.tsx`
**评审日期**: 2026-05-25
**评审维度**: 架构设计 · 接口契约 · 数据流 · 耦合度 · 可扩展性 · SOLID 原则 · 可测试性
**综合评分**: 3.8 / 10 — ⚠️ 架构层面存在结构性缺陷

---

## 一、架构定位与上下文

`image.tsx` 是 `@uiw/react-md-editor` 的 **Command 模式**实现之一，遵循库定义的 `ICommand` 接口契约，注册到编辑器工具栏并提供 Markdown 图片语法插入功能。

### 架构层次关系

```
TextAreaCommandOrchestrator（编排层）
  └── ICommand.execute(state, api)（命令层）
        ├── selectWord()（选区计算工具）
        ├── TextAreaTextApi（DOM 操作抽象层）
        └── executeCommand()（语法包裹工具）
```

### 同层命令对比

| 命令 | 复杂度 | execute 行数 | 分支数 | re-select |
|------|--------|-------------|--------|-----------|
| bold.tsx | 低 | 4 行 | 0 | ❌ 不需要 |
| italic.tsx | 低 | 4 行 | 0 | ❌ 不需要 |
| link.tsx | 中 | 12 行 | 2 | ✅ URL 分支有 |
| **image.tsx** | **高** | **16 行** | **3** | **❌ URL 分支缺失** |

**核心发现**: image.tsx 是同层命令中最复杂的，但其架构设计未匹配其复杂度。

---

## 二、架构缺陷分析

### A0 — 架构级缺陷（影响系统稳定性）

#### 2.1 URL 分支缺失 re-select：与 link.tsx 行为不对称，违反 LSP

**位置**: `image.tsx:28-36` vs `link.tsx:28-37`

**违反原则**: Liskov Substitution Principle（里氏替换原则）

link.tsx 和 image.tsx 属于同一接口 `ICommand` 的实现，用户对其有**行为一致性期望**（同为行内元素包裹命令）。但 image.tsx 的 URL 分支跳过了 re-select 步骤：

```typescript
// link.tsx:28-37 — URL 分支做了 re-select（行为 A）
if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
  newSelectionRange = selectWord({ ..., prefix: '[](', suffix: ')' });  // ← 重新计算选区
  state1 = api.setSelectionRange(newSelectionRange);                     // ← 重新设置选区
  executeCommand({ ... });
}

// image.tsx:28-36 — URL 分支没有 re-select（行为 B）
if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
  // ← 直接跳过 re-select
  executeCommand({ selectedText: state1.selectedText, ... });            // ← 用旧选区直接包裹
}
```

**架构影响**:
1. **行为不对称**: 同类命令在同一场景下表现不一致，破坏了 Command 模式的多态性契约
2. **不可替换**: 如果上层编排器需要动态替换 link↔image 命令（如切换模式），会产生不可预期的行为差异
3. **维护风险**: 维护者假定同族命令遵循相同模式，遗漏的 re-select 会在后续重构中被忽略

**修复建议**: 在 URL 分支添加 re-select 逻辑，使用 `prefix: '!['` + `suffix: ')'` 匹配完整图片语法。

---

#### 2.2 execute 方法内部隐式状态机，缺乏结构化表达

**位置**: `image.tsx:20-57`

execute 函数内部实际上是一个 **三路分支状态机**，但以 if-else 嵌套表达，缺少结构化：

```
execute(state, api):
  S0: selectWord(prefix, suffix) → 计算初始选区
  S1: setSelectionRange → 读取选中文本
  ┌── G1: selectedText 包含 URL? → 直接包裹（URL 模式）
  │
  └── G2: selectedText 为空? → 插入占位符 ![image](url)（模板模式）
      └── G3: selectedText 非空? → 包裹选中文字 ![text]()（包裹模式）
```

**架构问题**:
1. **三种策略混在一个函数中**: URL 检测策略、空选区策略、包裹策略各有不同的 prefix/suffix 语义，但共享同一组变量
2. **状态转换隐式表达**: `newSelectionRange` 和 `state1` 的重赋值代表状态转换，但变量名不反映语义变化
3. **不可组合**: 如果需要添加新策略（如"检测 Base64 图片"、"检测本地文件路径"），只能继续在 execute 中添加分支

**重构建议** — 策略模式拆分：

```typescript
type InsertStrategy = {
  detect: (text: string) => boolean;
  prefix: string;
  suffix: string;
};

const STRATEGIES: InsertStrategy[] = [
  { detect: (t) => URL_PATTERN.test(t), prefix: '![](', suffix: ')' },       // URL 模式
  { detect: (t) => t.length === 0,      prefix: '![image', suffix: '](url)' }, // 模板模式
  { detect: () => true,                  prefix: '!['', suffix: ']()' },        // 包裹模式（fallback）
];
```

---

### A1 — 接口契约问题

#### 2.3 prefix/suffix 可选性与运行时断言冲突

**位置**: `ICommandBase` 接口（index.ts:55-56）vs `image.tsx:25,34`

```typescript
// ICommandBase 接口定义 prefix 为可选
export interface ICommandBase<T> {
  prefix?: string;   // ← 可选属性
  suffix?: string;
  // ...
}

// image.tsx 使用 non-null assertion 绕过类型系统
prefix: state.command.prefix!,  // ← ! 断言，编译通过但运行时可能 undefined
```

**架构分析**:

这暴露了 `ICommand` 接口的**设计矛盾**：
- **接口层面**: `prefix`/`suffix` 被设计为可选，暗示不是所有命令都需要
- **实现层面**: bold.tsx、image.tsx、link.tsx 的 execute 函数全部依赖 `prefix`/`suffix`
- **工具层面**: `selectWord()` 和 `executeCommand()` 将 prefix/suffix 作为核心参数

这表明 `prefix`/`suffix` 实际上是**行内包裹类命令的必要属性**，而非通用 `ICommand` 的可选属性。当前接口设计违反了 **Interface Segregation Principle（接口隔离原则）**：

```
ICommandBase (所有命令)
  ├── prefix/suffix（仅行内包裹命令需要）
  ├── render（仅自定义渲染命令需要）
  ├── children（仅分组命令需要）
  └── execute（所有命令可选）
```

**改进方向**: 应将行内包裹命令抽象为子接口：

```typescript
interface IWrappingCommand extends ICommandBase {
  prefix: string;    // 必需
  suffix: string;    // 必需
}
```

---

#### 2.4 ExecuteState 循环引用：command 包含 execute，execute 接收包含 command 的 state

**位置**: `index.ts:75` + `index.ts:178-179`

```typescript
// 类型定义
export type ExecuteState = TextState & { command: ICommand };
//                                          ↑ command 包含 execute 方法

// 调用点
command.execute({ command, ...getStateFromTextArea(this.textArea) }, this.textApi, ...);
//              ^^^^^^^^^ 将 command 自身传入自己的 execute 方法
```

image.tsx 的 execute 通过 `state.command.prefix!` 访问自身定义的 prefix。这种**自引用**设计导致：
1. execute 可以在运行时读取自身的配置，看似灵活，实则将**配置与行为耦合**
2. 修改 prefix/suffix 时必须同时考虑 execute 中的硬编码值（image.tsx 在 else 分支使用了完全不同的 prefix/suffix），`state.command.prefix` 的值实际未被 else 分支使用

**数据流追踪**:

```
state.command.prefix = '![image]('  ← 命令定义
  ↓
L25: selectWord(prefix: state.command.prefix!) = selectWord(prefix: '![image](')  ← ✓ 使用了
  ↓
L28: URL 分支
  ↓ L34: executeCommand(prefix: state.command.prefix!)  ← ✓ 使用了
  ↓
L37+: 非 URL 分支
  ↓ L44: executeCommand(prefix: '![image')              ← ✗ 未使用 command.prefix
  ↓ L52: executeCommand(prefix: '![')                   ← ✗ 未使用 command.prefix
```

**结论**: 命令定义的 `prefix: '![image]('` 和 `suffix: ')'` 仅在 URL 分支被使用，非 URL 分支硬编码了不同的值。这意味着接口定义的 prefix/suffix **对 image.tsx 而言是部分无效的契约**。

---

### A2 — 耦合度分析

#### 2.5 与 DOM 的隐式耦合：TextAreaTextApi 无抽象层

**位置**: `image.tsx:2`, `index.ts:129-156`

```typescript
class TextAreaTextApi {
  textArea: HTMLTextAreaElement;  // ← 直接绑定 DOM 元素
  replaceSelection(text: string): TextState { ... }
  setSelectionRange(selection: TextRange): TextState { ... }
}
```

image.tsx 的 execute 依赖 `TextAreaTextApi` 的两个方法：
1. `api.setSelectionRange()` — 修改 DOM 选区 + 返回新状态
2. `api.replaceSelection()` — 修改 DOM 内容 + 返回新状态（在 executeCommand 内隐式调用）

**耦合问题**:
1. **副作用不透明**: `setSelectionRange` 和 `executeCommand`（内部调用 `replaceSelection`）都会触发 DOM 变更和 React 重渲染，调用者无法从函数签名看出副作用
2. **不可 mock**: 没有接口抽象，单元测试只能通过创建真实 DOM（jsdom）或复杂 proxy 来模拟
3. **双向状态流**: `state` 是从 DOM 读取的快照，`api` 修改 DOM 后返回新快照，但 `selection` 参数传的是原始快照，形成新旧状态混用

**状态混用示意**:

```typescript
let state1 = api.setSelectionRange(newSelectionRange);  // state1 = 新快照
// ...
executeCommand({
  selectedText: state1.selectedText,   // ← 来自新快照
  selection: state.selection,          // ← 来自旧快照（原始 state）
  prefix: state.command.prefix!,
  suffix: state.command.suffix,
});
```

`executeCommand` 的 `selection` 参数接收的是**原始 state 的 selection**（旧值），而 `selectedText` 来自 `state1`（新值）。这种新旧混用在 bold.tsx 中也存在，但 bold 的逻辑简单不易出错；image.tsx 的三路分支使此问题被放大。

---

#### 2.6 URL 检测逻辑紧耦合于业务分支

**位置**: `image.tsx:28`

```typescript
if (state1.selectedText.includes('http') || state1.selectedText.includes('www'))
```

URL 检测是**策略选择逻辑**，但直接以 `includes()` 硬编码在 execute 内部。从架构角度看：
1. **检测策略不可扩展**: 无法添加新的 URL 模式（如 `data:image/`、`ftp://`）
2. **检测策略不可复用**: link.tsx 有相同检测逻辑但独立实现，违反 DRY
3. **检测精度与架构耦合**: `includes('http')` 的宽松匹配不是 bug 而是**架构缺陷**——缺乏「URL 检测服务」的抽象层

---

### A3 — 可测试性分析

#### 2.7 execute 函数的可测试性极差

**测试矩阵**:

| 场景 | 输入条件 | 期望行为 | 可测性 |
|------|---------|---------|--------|
| URL 包裹 | 选中文本含 `https://...` | `![image](https://...)` | 需 mock TextAreaTextApi |
| 空选区模板 | 无选中文本 | `![image](url)` | 需 mock selectWord + API |
| 文本包裹 | 选中文本 `logo` | `![logo]()` | 需 mock selectWord + API |
| Toggle 移除 | 光标在 `![alt](url)` 内 | 移除图片语法 | 实际不可行（selectWord 不匹配自定义 alt） |
| 非 URL 误判 | 选中文本 `the http protocol` | 应包裹文本但走 URL 分支 | 需 mock + 断言 |

**核心问题**: execute 是 `(state, api) => void` 的 void 函数，**没有返回值**。所有效果通过 `api` 的副作用体现。要验证行为，必须：
1. 创建 mock `TextAreaTextApi`（但它是 class 不是 interface）
2. 拦截 `setSelectionRange` 和 `replaceSelection` 调用
3. 按调用顺序断言参数

这意味着**无法编写纯粹的单元测试**，只能写集成测试（依赖 DOM 环境）。

---

### A4 — SOLID 原则逐项审查

| 原则 | 评估 | 说明 |
|------|------|------|
| **S** — 单一职责 | ❌ | execute 同时承担 URL 检测、策略选择、选区计算、语法包裹四个职责 |
| **O** — 开闭原则 | ❌ | 添加新插入策略必须修改 execute 函数体 |
| **L** — 里氏替换 | ❌ | 与 link.tsx 行为不对称，URL 分支缺少 re-select |
| **I** — 接口隔离 | ⚠️ | ICommand 接口过于宽泛，prefix/suffix 对部分命令无意义 |
| **D** — 依赖反转 | ❌ | 直接依赖 selectWord/executeCommand 工具函数和 TextAreaTextApi class |

---

## 三、跨命令架构对比

### 3.1 命令复杂度光谱

```
简单 ←————————————————————————————→ 复杂
bold.tsx     italic.tsx     link.tsx     image.tsx
 4行           4行           12行         16行
 0分支         0分支          2分支         3分支
 const         const         let×2        let×2
 无策略        无策略        URL/文本      URL/空/文本
```

### 3.2 复杂度增长无对应架构演进

link.tsx 已显露出复杂度（2 分支 + let 重赋值），image.tsx 进一步增长（3 分支），但**架构模式保持不变**——仍然是单一 execute 函数 + if-else。当复杂度到达 3+ 分支时，应演进为策略模式或状态机。

**临界点判断**: bold/italic（0 分支）→ 简单 execute 可接受。link（2 分支）→ 边界状态，勉强可接受。image（3 分支）→ **超出单一函数的合理复杂度上限**。

---

## 四、封装层修复架构方案

> 由于 image.tsx 属于第三方库 `node_modules`，直接修改不可行。以下为**项目封装层**的修复架构。

### 4.1 方案：自定义命令覆盖

```typescript
// pages/components/Editor/commands/image.tsx
import { type ICommand, type ExecuteState, TextAreaTextApi } from '@uiw/react-md-editor';
import { selectWord, executeCommand } from '@uiw/react-md-editor/commands/utils/markdownUtils';

const URL_PATTERN = /^https?:\/\/\S+$/i;
const WWW_PATTERN = /^www\.\S+\.\S+$/i;

const IMAGE_PREFIX = '![';
const IMAGE_SUFFIX = ')';

export const customImage: ICommand = {
  name: 'image',
  keyCommand: 'image',
  shortcuts: 'ctrlcmd+shift+k',       // 修复：避免与行业标准 Ctrl+K 冲突
  buttonProps: {
    'aria-label': '添加图片',
    title: '添加图片 (Ctrl+Shift+K)',
  },
  icon: (
    <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z" />
    </svg>
  ),
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    const prefix = state.command.prefix ?? IMAGE_PREFIX;
    const suffix = state.command.suffix ?? IMAGE_SUFFIX;

    const initialRange = selectWord({ text: state.text, selection: state.selection, prefix, suffix });
    const afterSelect = api.setSelectionRange(initialRange);

    if (URL_PATTERN.test(afterSelect.selectedText) || WWW_PATTERN.test(afterSelect.selectedText)) {
      // URL 模式：re-select 匹配完整 ![alt](url) 结构
      const urlRange = selectWord({ text: state.text, selection: state.selection, prefix: '![](', suffix: ')' });
      const urlState = api.setSelectionRange(urlRange);
      executeCommand({ api, selectedText: urlState.selectedText, selection: state.selection, prefix, suffix });
    } else if (afterSelect.selectedText.length === 0) {
      // 模板模式：空选区
      executeCommand({ api, selectedText: '', selection: state.selection, prefix: '![image', suffix: '](url)' });
    } else {
      // 包裹模式：选中文本
      executeCommand({ api, selectedText: afterSelect.selectedText, selection: state.selection, prefix: '!['', suffix: ']()' });
    }
  },
};
```

### 4.2 注册到编辑器

```typescript
import MDEditor from '@uiw/react-md-editor';
import { customImage } from './commands/image';

// 替换默认 image 命令
const commands = MDEditor.getDefaultCommands().map(cmd =>
  cmd.name === 'image' ? customImage : cmd
);

<MDEditor commands={commands} ... />
```

---

## 五、架构改进优先级

| 级别 | 问题 | 架构影响 | 修复方式 | 工作量 |
|------|------|---------|---------|--------|
| A0 | 2.1 URL 分支缺少 re-select | 行为不对称，违反 LSP | 封装层覆盖 | 30 min |
| A0 | 2.2 三路分支缺乏策略模式 | 复杂度失控，不可扩展 | 封装层重构 | 45 min |
| A1 | 2.3 prefix/suffix 可选性冲突 | 类型安全假象 | 封装层防御性编码 | 10 min |
| A1 | 2.4 循环引用与配置/行为耦合 | 理解成本高，维护风险 | 文档化 + 封装层隔离 | 15 min |
| A2 | 2.5 DOM 隐式耦合 | 不可单元测试 | 需库层面重构（不在封装层范围） | N/A |
| A2 | 2.6 URL 检测不可扩展 | DRY 违反 + 策略硬编码 | 封装层提取 URL 检测器 | 15 min |
| A3 | 2.7 可测试性差 | 无法验证行为正确性 | 封装层可测 + 集成测试 | 60 min |

**封装层修复总工作量**: A0+A1 约 100 min（1.5 小时）

---

## 六、总结

`image.tsx` 的架构问题本质上是 `@uiw/react-md-editor` 库的 **Command 模式设计局限**在复杂命令上的暴露：

1. **ICommand 接口过于宽泛**：将行内包裹、分组、自定义渲染等不同语义的命令统一到一个接口，导致 prefix/suffix 的可选性与其在包裹命令中的必要性矛盾
2. **execute 函数承担过多职责**：当命令逻辑从简单（bold）增长到复杂（image）时，架构没有相应的演进机制（如策略模式）
3. **缺少行为一致性保障**：同族命令（link vs image）的 execute 实现无共享基类或抽象，导致行为不对称（re-select 缺失）
4. **DOM 耦合使测试不可行**：TextAreaTextApi 是 class 而非 interface，execute 是 void 函数，只能通过副作用验证

**建议**: 在项目封装层创建 `customImage` 命令覆盖默认实现，修复 A0 级别的 re-select 缺失和 URL 检测问题。长期来看，如果项目深度使用 react-md-editor，应考虑贡献补丁到上游库或评估替代方案。
