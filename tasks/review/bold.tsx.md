# bold.tsx 软件架构评审报告

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/bold.tsx`
**评审角色**: 软件架构专家
**评审日期**: 2026-05-24
**总行数**: 33 行 | **导出**: 1 个 `ICommand` 对象

---

## 一、架构定位

该文件是 `@uiw/react-md-editor` 编辑器**命令模式（Command Pattern）** 的一个具体实现，负责"加粗"操作。它遵循库内统一命令接口 `ICommand`，与 `italic`、`strikethrough`、`link` 等命令构成平行的策略族。

**模块依赖关系**:

```
bold.tsx
  ├── ICommand, ExecuteState, TextAreaTextApi  (commands/index.ts — 接口契约层)
  ├── selectWord()                             (utils/markdownUtils.ts — 选区算法层)
  └── executeCommand()                         (utils/markdownUtils.ts — 文本变换层)
```

**架构角色**: UI 命令层（Presentation Command Layer）——声明式定义命令元数据 + 命令执行逻辑。

---

## 二、架构优点

| # | 优点 | 架构意义 |
|---|------|----------|
| 1 | **命令模式标准实现** | `ICommand` 接口统一了 name/keyCommand/shortcuts/prefix/icon/execute，工具栏、快捷键、执行引擎均通过同一接口解耦 |
| 2 | **声明式元数据 + 命令式执行** | 元数据（prefix、shortcuts、buttonProps）与行为（execute）分离，工具栏渲染器只读元数据，不耦合执行逻辑 |
| 3 | **算法下沉到工具层** | `selectWord` 和 `executeCommand` 提取到 `markdownUtils.ts`，加粗/斜体/删除线共享同一套算法，避免命令间代码重复 |
| 4 | **跨平台快捷键抽象** | `ctrlcmd+b` 由框架解析为 Ctrl（Win/Linux）或 Cmd（Mac），命令层无需关心平台差异 |
| 5 | **策略族对齐** | 所有 inline 命令（bold/italic/strikethrough/code）结构一致，新增 inline 格式命令只需复制模板改 prefix 和 icon |

---

## 三、架构问题

### P1 - 非空断言绕过类型契约（高）

**位置**: 第 23 行、第 30 行

```typescript
prefix: state.command.prefix!,  // 两次
```

**架构分析**:

`ICommandBase` 接口定义 `prefix?: string`（可选），这是**接口契约**的一部分——调用方应当能安全地假设 `prefix` 可能不存在。`bold.tsx` 自身硬编码了 `prefix: '**'`，所以运行时确实不为空。但 `execute` 函数签名 `(state: ExecuteState, api: TextAreaTextApi)` 接收的是泛型 `state.command`，并非 `bold` 对象本身。

**问题本质**: 实现层的确定性假设（`prefix` 一定有值）与接口契约的不确定性（`prefix` 可选）产生了**契约语义冲突**。非空断言 `!` 是在编译期压制了这一冲突，而非在架构层面解决它。

**架构层面修复方案**:

方案 A — 收紧接口契约：将 `prefix` 从 `ICommand` 基接口移到 `IInlineCommand extends ICommand` 中声明为必选，使类型系统在编译期保证 inline 命令必须有 prefix：

```typescript
interface IInlineCommand extends ICommand {
  prefix: string;  // 必选，非 optional
}
```

方案 B — 在 execute 内做防御性检查，早返回：

```typescript
execute: (state, api) => {
  const prefix = state.command.prefix;
  if (!prefix) return;
  // ...
}
```

方案 A 更优——它从类型系统层面消除了整类问题，而非逐个函数打补丁。

---

### P2 - 命令对象混合了 UI 声明与业务逻辑（中）

**位置**: 整个对象结构

```typescript
export const bold: ICommand = {
  name: 'bold',
  keyCommand: 'bold',
  shortcuts: 'ctrlcmd+b',
  prefix: '**',
  buttonProps: { ... },
  icon: (<svg .../>),
  execute: (state, api) => { ... },
};
```

**架构分析**:

`bold` 对象同时承载了三类职责：
1. **UI 渲染数据**（icon、buttonProps）——工具栏按钮渲染用
2. **交互元数据**（name、shortcuts、keyCommand）——快捷键绑定和命令分发用
3. **文本操作逻辑**（prefix、execute）——文档模型变换用

当命令数量增多（该库有 20+ 个命令），每条命令都内联一个 JSX SVG 图标，导致：
- 命令模块**无法独立于 React 测试**（icon 是 JSX 表达式）
- 图标资源与逻辑代码耦合，无法独立替换/懒加载图标

**建议**: 将 `icon` 改为 `iconName: string` 或 `icon: () => ReactNode`（工厂函数），由工具栏渲染器按需加载图标资源。这是"配置与资源分离"的标准做法。

---

### P3 - execute 函数的"两阶段状态变更"缺乏事务性保障（中）

**位置**: 第 20-31 行

```typescript
execute: (state, api) => {
  // 阶段 1: 选区扩展
  const newSelectionRange = selectWord({ ... });
  const state1 = api.setSelectionRange(newSelectionRange);
  // 阶段 2: 文本包裹/解包裹
  executeCommand({ ... });
}
```

**架构分析**:

`execute` 是一个**两阶段操作**：先修改选区，再修改文本。这两个阶段分别调用 `api.setSelectionRange` 和 `executeCommand`（内部也调用 `api`），存在以下架构隐患：

1. **非原子性**: 如果阶段 2 失败，阶段 1 的选区变更已生效但无法回滚
2. **隐式状态依赖**: `executeCommand` 依赖 `state1.selectedText`（阶段 1 的输出），但传入的 `selection` 参数却用 `state.selection`（阶段 0 的值），这种跨阶段的状态混用增加认知复杂度
3. **API 设计问题**: `TextAreaTextApi` 同时暴露了选区操作和文本操作，命令实现者必须正确编排调用顺序，API 层面没有提供"原子命令"的能力

**建议**: 提供 `api.executeInlineCommand(prefix)` 这样的高层 API，内部封装选区扩展 + 文本变换的事务性操作，将两阶段逻辑下沉到 API 层。

---

### P4 - 变量命名不反映架构角色（低）

**位置**: 第 25 行、第 29 行

```typescript
const state1 = api.setSelectionRange(newSelectionRange);
// ...
selectedText: state1.selectedText,
selection: state.selection,
```

**架构分析**:

在命令模式的执行上下文中，存在两个有架构意义的状态阶段：
- **初始状态** (`state`): 用户触发命令时的编辑器快照
- **选区扩展后状态** (`state1`): 算法扩展选区后的编辑器快照

`state1` 这个命名无法表达其在状态机中的角色。在架构文档或新人阅读代码时，需要额外推理才能理解 `state` 和 `state1` 的关系。

**建议**: `state` → `initialState`，`state1` → `expandedState`。

---

### P5 - 缺少命令行为的可测试性设计（低）

**位置**: `execute` 函数

**架构分析**:

`execute` 函数的签名 `(state: ExecuteState, api: TextAreaTextApi) => void` 返回 `void`，意味着：
1. 调用者无法通过返回值判断命令是否成功执行
2. 调用者无法获取命令执行后的新编辑器状态（需要重新从 textarea 读取）
3. 单元测试只能验证 `api` 的调用序列（mock），无法做基于状态的断言

从可测试性角度看，`execute` 应返回新状态或至少返回 `boolean`/`Result` 类型。

---

### P6 - SVG 图标硬编码尺寸不利于主题适配（提示）

**位置**: 第 12 行

```tsx
width="12" height="12"
```

在主题化架构中，图标尺寸应随设计 token 变化。硬编码 `12px` 无法被 CSS 变量或主题系统覆盖。建议使用 `currentColor` + `em` 单位或通过 CSS class 控制。

---

### P7 - FontAwesome 图标数据无归属声明（提示）

SVG path 数据与 FontAwesome Solid `fa-bold` 图标一致。FontAwesome Solid 采用 CC BY 4.0 / SIL OFL 1.1 许可，而 `@uiw/react-md-editor` 声明 MIT 许可。属于包级别的合规审计范畴，非该文件架构问题。

---

## 四、架构原则审查

| 原则 | 评估 | 说明 |
|------|------|------|
| **单一职责 (SRP)** | 通过 | 模块只负责加粗命令，职责单一 |
| **开闭原则 (OCP)** | 通过 | 通过 `ICommand` 接口扩展新命令无需修改已有代码 |
| **里氏替换 (LSP)** | 部分通过 | `bold` 可替换为任何 `ICommand`，但 `execute` 中 `prefix!` 隐含了 `IInlineCommand` 的特化假设 |
| **接口隔离 (ISP)** | 部分通过 | `ICommand` 接口过胖（UI 属性 + 逻辑属性混合），不同命令不一定需要所有字段 |
| **依赖倒置 (DIP)** | 通过 | 依赖抽象（`ICommand`、`TextAreaTextApi`），不依赖具体实现 |
| **命令模式** | 通过 | 标准命令模式实现，元数据与执行分离 |
| **DRY** | 通过 | `selectWord`/`executeCommand` 复用，无重复逻辑 |

---

## 五、架构改进建议（按影响力排序）

| 优先级 | 建议 | 影响范围 | 工作量 |
|--------|------|----------|--------|
| 1 | 引入 `IInlineCommand extends ICommand`，`prefix` 声明为必选 | 所有 inline 命令模块 | 中 |
| 2 | 提供 `api.executeInlineCommand(prefix)` 高层 API | `TextAreaTextApi` + 所有 inline 命令 | 中 |
| 3 | `icon` 改为工厂函数或资源引用 | 所有命令模块 + 工具栏渲染器 | 中 |
| 4 | `execute` 返回新状态或 `Result` 类型 | `ICommand` 接口 + 所有命令 + 调用方 | 大 |
| 5 | 变量重命名：`state`/`state1` → `initialState`/`expandedState` | 本文件 | 小 |

---

## 六、评审总结

`bold.tsx` 是一个结构简洁、职责单一的命令模块，正确遵循了命令模式。它在命令族内具有良好的一致性和可扩展性。

核心架构隐患集中在**接口契约与实现假设的冲突**（P1 非空断言）和**职责混合**（P2 UI 资源与逻辑耦合）。这两个问题在单个文件中影响有限，但在 20+ 个命令组成的系统中，会累积为可维护性和可测试性的系统性技术债。

| 维度 | 评分（1-5） | 说明 |
|------|-------------|------|
| 模式遵循 | 5 | 标准命令模式，无偏差 |
| 接口契约完整性 | 3 | `prefix!` 绕过了接口契约的可选语义 |
| 职责分离 | 3 | UI 资源（icon）与命令逻辑混合在同一对象 |
| 可测试性 | 2 | execute 返回 void，只能通过 mock 验证 |
| 可扩展性 | 4 | 新增同类命令成本极低（复制改 prefix/icon） |
| 错误处理架构 | 2 | 无事务性保障，异常冒泡到调用方 |
| **综合** | **3.3** | 模式正确但接口设计和可测试性有架构债务 |

---

*评审基于 @uiw/react-md-editor@4.1.0 源码，TypeScript strict mode 未启用*
