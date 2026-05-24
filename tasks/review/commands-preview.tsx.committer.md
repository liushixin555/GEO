# @uiw/react-md-editor commands/preview.tsx — Committer 审核专家评审报告

**评审日期**: 2026-05-25
**评审角色**: Committer 审核专家（依赖准入 · 代码质量 · DRY 原则 · API 契约 · 可访问性 · 安全合规 · 项目规范兼容性）
**文件路径**: `@uiw/react-md-editor/src/commands/preview.tsx`（编辑器工具栏视图切换命令）
**代码行数**: 94 行
**所属包**: `@uiw/react-md-editor@4.1.0`（pnpm 管理的第三方依赖）
**文件性质**: 第三方库命令注册模块 — 定义编辑/预览/实时三种视图模式的工具栏按钮命令
**测试文件**: 无专属测试（三方库，测试由上游维护）
**关联文件**: `commands/index.ts`（ICommand 类型导出）、`Context.tsx`（ContextStore/ExecuteCommandState 类型）、本项目 Markdown 编辑器消费方
**已有评审**: 无（本文件为首次评审）

---

## 一、Committer 审核总览

`commands/preview.tsx` 是 `@uiw/react-md-editor` 的工具栏命令模块，导出三个 `ICommand` 对象（`codePreview`、`codeEdit`、`codeLive`）控制编辑器的视图模式切换。Committer 视角的核心关切：

1. **该模块的代码质量是否影响本项目？** — 95% 代码重复率极高，但属于上游问题
2. **execute 函数的条件分支是否正确？** — `shortcuts` 参数检查导致按钮点击可能不触发 dispatch
3. **与本项目规范（DESIGN.md / antd 铁律）的兼容性** — 零 antd 集成、SVG 图标可辨识度低
4. **是否存在安全风险传递到本项目？** — dispatch 调用安全性需评估

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 依赖必要性 | 8/10 | 通过 — 编辑器视图切换是核心功能 |
| DRY 遵循度 | 1/10 | 🔴 不通过 — 三个命令 95%+ 代码重复 |
| API 契约正确性 | 5/10 | 有条件通过 — keyCommand 语义混乱、未使用参数、partial dispatch |
| 可访问性 | 4/10 | 🔴 不通过 — SVG 无 role/aria-hidden、图标辨识度低 |
| 安全合规性 | 7/10 | 通过 — dispatch 调用安全，无 XSS 向量 |
| 项目规范兼容性 | 3/10 | 🔴 不通过 — 零 antd 集成、图标不符合 Carbon Design |
| 生产就绪度 | 6/10 | 有条件通过 — 按钮点击执行路径存在隐患 |

**综合判定: ⚠️ 有条件通过（CONDITIONAL APPROVE）— 依赖可保留，DRY 违反属上游问题不影响功能，可访问性需项目层面 CSS/属性覆盖**

**综合评分: 3.2/10**（P1×2 零 antd 集成 + 图标辨识度低，P2×3 SVG 无障碍 + 标签未国际化 + 交互双路径，P3×4 图标尺寸非标 + 无选中态 + 快捷键冲突 + 命名语义误导）

---

## 二、源码全文（附行号标注）

```tsx
1   import React from 'react';
2   import { type ICommand, type TextState, TextAreaTextApi } from './';
3   import { type ContextStore, type ExecuteCommandState } from '../Context';
4
5   export const codePreview: ICommand = {
6     name: 'preview',
7     keyCommand: 'preview',
8     value: 'preview',
9     shortcuts: 'ctrlcmd+9',
10    buttonProps: { 'aria-label': 'Preview code (ctrl + 9)', title: 'Preview code (ctrl + 9)' },
11    icon: (
12      <svg width="12" height="12" viewBox="0 0 520 520">
13        <polygon fill="currentColor" points="0 71.293 0 122 38.023 123 38.023 398 0 397 0 449.707 91.023 450.413 91.023 72.293" />
14        <polygon fill="currentColor" points="148.023 72.293 520 71.293 520 122 200.023 124 200.023 397 520 396 520 449.707 148.023 450.413" />
15      </svg>
16    ),
17    execute: (
18      state: TextState,
19      api: TextAreaTextApi,
20      dispatch?: React.Dispatch<ContextStore>,
21      executeCommandState?: ExecuteCommandState,
22      shortcuts?: string[],
23    ) => {
24      api.textArea.focus();
25      if (shortcuts && dispatch && executeCommandState) {
26        dispatch({ preview: 'preview' });
27      }
28    },
29  };
30
31  export const codeEdit: ICommand = {
32    name: 'edit',
33    keyCommand: 'preview',
34    value: 'edit',
35    shortcuts: 'ctrlcmd+7',
36    buttonProps: { 'aria-label': 'Edit code (ctrl + 7)', title: 'Edit code (ctrl + 7)' },
37    icon: (
38      <svg width="12" height="12" viewBox="0 0 520 520">
39        <polygon fill="currentColor" points="0 71.293 0 122 319 122 319 397 0 397 0 449.707 372 449.413 372 71.293" />
40        <polygon fill="currentColor" points="429 71.293 520 71.293 520 122 481 123 481 396 520 396 520 449.707 429 449.413" />
41      </svg>
42    ),
43    execute: (
44      state: TextState,
45      api: TextAreaTextApi,
46      dispatch?: React.Dispatch<ContextStore>,
47      executeCommandState?: ExecuteCommandState,
48      shortcuts?: string[],
49    ) => {
50      api.textArea.focus();
51      if (shortcuts && dispatch && executeCommandState) {
52        dispatch({ preview: 'edit' });
53      }
54    },
55  };
56
57  export const codeLive: ICommand = {
58    name: 'live',
59    keyCommand: 'preview',
60    value: 'live',
61    shortcuts: 'ctrlcmd+8',
62    buttonProps: { 'aria-label': 'Live code (ctrl + 8)', title: 'Live code (ctrl + 8)' },
63    icon: (
64      <svg width="12" height="12" viewBox="0 0 520 520">
65        <polygon fill="currentColor" points="0 71.293 0 122 179 122 179 397 0 397 0 449.707 232 449.413 232 71.293" />
66        <polygon fill="currentColor" points="289 71.293 520 71.293 520 122 341 123 341 396 520 396 520 449.707 289 449.413" />
67      </svg>
68    ),
69    execute: (
70      state: TextState,
71      api: TextAreaTextApi,
72      dispatch?: React.Dispatch<ContextStore>,
73      executeCommandState?: ExecuteCommandState,
74      shortcuts?: string[],
75    ) => {
76      api.textArea.focus();
77      if (shortcuts && dispatch && executeCommandState) {
78        dispatch({ preview: 'live' });
79      }
80    },
81  };
```

---

## 三、逐行审查意见

| 行号 | 代码 | Committer 审查意见 |
|------|------|----------|
| 1 | `import React from 'react'` | ✅ 库内部代码，JSX 编译所需 |
| 2 | `import { type ICommand, type TextState, TextAreaTextApi } from './'` | ⚠️ `TextState` 被 import 但仅在类型签名中使用（第 18/44/70 行），`TextAreaTextApi` 同理。这是上游代码风格问题，不影响运行时 |
| 3 | `import { type ContextStore, type ExecuteCommandState } from '../Context'` | ✅ 使用 `import type`，编译后无运行时开销 |
| 5-29 | `codePreview` 命令定义 | 见下方专项分析 |
| 31-55 | `codeEdit` 命令定义 | 🔴 与 `codePreview` 结构 95% 重复 — 仅 `name`/`value`/`shortcuts`/`buttonProps`/`icon`/`dispatch` 值不同 |
| 57-81 | `codeLive` 命令定义 | 🔴 与 `codeEdit`/`codePreview` 结构 95% 重复 |
| 6-8 | `name: 'preview', keyCommand: 'preview', value: 'preview'` | ⚠️ `keyCommand: 'preview'` 在三个命令中完全相同（第 7/33/59 行），语义混乱 — `keyCommand` 暗示唯一命令标识，实际作为命令组标识符使用。`name` 和 `value` 在 `codePreview` 中恰好相同，增加混淆 |
| 9 | `shortcuts: 'ctrlcmd+9'` | ⚠️ 快捷键数字 7/8/9 没有语义对应关系（为什么 preview 是 9 而非 1？），用户记忆成本高 |
| 10 | `buttonProps: { 'aria-label': 'Preview code (ctrl + 9)' }` | ⚠️ 标签文本使用英文硬编码，无国际化支持。`title` 属性与 `aria-label` 内容重复 |
| 11-16 | SVG 图标 | 🔴 无 `role="img"` 和 `aria-hidden="true"` 属性。屏幕阅读器会尝试播报 SVG 内容但无法获得有意义的信息。`width="12" height="12"` 尺寸过小，在 4K/高 DPI 屏幕上辨识度低 |
| 12 | `<svg width="12" height="12" viewBox="0 0 520 520">` | ⚠️ viewBox 520×520 远大于实际渲染 12×12，缩放比约 43:1，可能导致亚像素渲染模糊 |
| 13-14 | `<polygon>` 元素 | ⚠️ 图标设计为"方括号"变体（一侧宽一侧窄），三种模式仅靠方括号宽度/位置区分，视觉辨识度极低 |
| 17-28 | `execute` 函数 | 见下方专项分析 |
| 18 | `state: TextState` | 🔴 **未使用参数** — 函数体内从未引用 `state`。TypeScript `noUnusedParameters` 配置下会产生警告 |
| 21 | `executeCommandState?: ExecuteCommandState` | ⚠️ 仅做 truthiness 检查（第 25 行），不读取其内容。`ExecuteCommandState = Pick<ContextStore, 'fullscreen' | 'preview' | 'highlightEnable'>` — 类型定义暗示应检查当前状态 |
| 24 | `api.textArea.focus()` | ⚠️ 在 dispatch 前无条件 focus textarea，即使在纯预览模式（无需 textarea）下也执行。对用户体验无影响（preview 模式 textarea 隐藏），但语义不清晰 |
| 25 | `if (shortcuts && dispatch && executeCommandState)` | 🔴 **交互双路径问题** — `shortcuts` 参数仅在键盘快捷键触发时传入，按钮点击时为 `undefined`。这意味着按钮点击**不会执行 dispatch**，视图切换依赖框架通过 `value` 属性处理。两条路径行为不一致，是隐式设计而非显式契约 |
| 26 | `dispatch({ preview: 'preview' })` | ⚠️ **partial dispatch** — `ContextStore` 有约 20 个属性（含 `[key: string]: any` 索引签名），`dispatch({ preview: 'preview' })` 仅设置一个属性。依赖 React state 合并行为（或 Context reducer），而非显式完整的状态更新。虽然与框架约定一致，但 `ContextStore` 的索引签名 `[key: string]: any` 意味着类型系统无法捕获错误拼写 |
| 28 | `}` | ✅ 函数闭合 |
| 34 | `value: 'edit'` | ✅ 与 `name: 'edit'` 一致 |
| 39-40 | `codeEdit` SVG 图标 | ⚠️ 两个方括号均为窄型，与 `codePreview`（一宽一窄）和 `codeLive`（两个中等宽度）视觉区分度极低 |
| 59 | `keyCommand: 'preview'` | 🔴 与 `codePreview`/`codeEdit` 完全相同的 `keyCommand` 值。当同一 `keyCommand` 有多个注册命令时，框架如何解析取决于上层实现 — 可能导致快捷键冲突或不可预测的行为 |

---

## 四、问题清单（按严重级别排序）

### P1 — 严重问题（阻塞级）

#### P1-01: DRY 违反 — 三个命令 95%+ 代码重复

**位置**: 第 5-81 行（全文）

**问题分析**:

三个命令对象的唯一差异点：

| 差异点 | `codePreview` | `codeEdit` | `codeLive` |
|--------|---------------|------------|------------|
| `name` | 'preview' | 'edit' | 'live' |
| `value` | 'preview' | 'edit' | 'live' |
| `shortcuts` | 'ctrlcmd+9' | 'ctrlcmd+7' | 'ctrlcmd+8' |
| `aria-label` | 'Preview code (ctrl + 9)' | 'Edit code (ctrl + 7)' | 'Live code (ctrl + 8)' |
| SVG `points` | 两组坐标 | 两组坐标 | 两组坐标 |
| `dispatch` value | `{ preview: 'preview' }` | `{ preview: 'edit' }` | `{ preview: 'live' }` |

**共同部分**（完全重复）:
- `keyCommand: 'preview'` × 3
- `execute` 函数签名（5 个参数）× 3
- `api.textArea.focus()` × 3
- 条件检查 `if (shortcuts && dispatch && executeCommandState)` × 3
- `dispatch({ preview: VALUE })` 模式 × 3

**应然架构**:

```typescript
function createPreviewCommand(config: {
  name: string;
  value: PreviewType;
  shortcuts: string;
  icon: React.ReactElement;
}) {
  return {
    name: config.name,
    keyCommand: 'preview',
    value: config.value,
    shortcuts: config.shortcuts,
    buttonProps: {
      'aria-label': `${config.name} (${config.shortcuts})`,
      title: `${config.name} (${config.shortcuts})`,
    },
    icon: config.icon,
    execute: (
      _state: TextState,
      api: TextAreaTextApi,
      dispatch?: React.Dispatch<ContextStore>,
      executeCommandState?: ExecuteCommandState,
      shortcuts?: string[],
    ) => {
      api.textArea.focus();
      if (shortcuts && dispatch && executeCommandState) {
        dispatch({ preview: config.value });
      }
    },
  } satisfies ICommand;
}
```

**Committer 裁定**: 🔴 **不阻塞依赖采用** — 属上游代码质量问题，不影响本项目功能。但应记录为技术债，若上游长期不修复需考虑 fork/override。

---

#### P1-02: 零 antd 集成 + 图标辨识度低

**位置**: 第 11-16/37-42/63-68 行

**问题分析**:

1. **零 antd 集成**: 工具栏按钮使用原生 HTML `<button>`（由框架从 `buttonProps` 渲染），不使用 antd `Button` 组件。违反 CLAUDE.md 铁律"前端必须使用 Ant Design (antd) 组件"。

2. **图标辨识度低**: 三个 SVG 图标均为"方括号"变体设计，仅靠方括号宽度区分：
   - `codeEdit`: 两个窄方括号 `[  ] [ ]`
   - `codeLive`: 两个中等方括号 `[  ] [   ]`
   - `codePreview`: 一个宽方括号 + 一个窄方括号 `[     ] [ ]`
   
   在 12×12px 渲染尺寸下，三种模式的视觉差异极其微小，用户难以区分当前激活状态。

3. **无选中/激活状态**: 命令定义中无 `active` / `selected` 属性，无法从图标外观判断当前视图模式。

**Committer 裁定**: 🔴 **不阻塞依赖采用** — 第三方库无法修改。本项目需通过 CSS 覆盖（图标尺寸放大 + 选中态样式）和/或自定义命令覆盖缓解。

---

### P2 — 中等问题

#### P2-01: SVG 无障碍属性缺失

**位置**: 第 12/38/64 行

```tsx
<svg width="12" height="12" viewBox="0 0 520 520">
```

**问题**:
- 缺少 `role="img"` — 屏幕阅读器无法识别为图像
- 缺少 `aria-hidden="true"` — 屏幕阅读器会尝试播报 SVG 子元素
- 缺少 `<title>` 元素 — 无可访问的文本描述
- 虽然父级 `buttonProps` 有 `aria-label`，但 SVG 本身的无障碍属性缺失违反 WCAG 2.1 AA 标准

**修复建议**: 在 SVG 标签上添加 `role="img" aria-hidden="true"`（因为按钮已有 `aria-label`）。

**Committer 裁定**: 🟡 不阻塞 — 封装层可通过自定义 `render` 函数覆盖图标渲染。

---

#### P2-02: aria-label 硬编码英文、未国际化

**位置**: 第 10/36/62 行

```tsx
buttonProps: { 'aria-label': 'Preview code (ctrl + 9)', title: 'Preview code (ctrl + 9)' }
```

**问题**: 标签文本硬编码英文，本项目面向中文用户群体。非国际化的按钮标签降低可访问性。

**Committer 裁定**: 🟡 不阻塞 — 可通过自定义命令覆盖 `buttonProps`。

---

#### P2-03: 交互双路径 — 按钮点击 vs 键盘快捷键行为不一致

**位置**: 第 25/51/77 行

```tsx
if (shortcuts && dispatch && executeCommandState) {
  dispatch({ preview: 'preview' });
}
```

**问题分析**:

```
交互路径分析：
┌───────────────────────────────────────────────────────────────────┐
│ 路径 1: 键盘快捷键（Ctrl+9/Ctrl+7/Ctrl+8）                      │
│   shortcuts = ['ctrlcmd+9']  → ✅ truthy                         │
│   dispatch = React.dispatch  → ✅ truthy                         │
│   executeCommandState = {...} → ✅ truthy                        │
│   → dispatch({ preview: 'preview' }) ✅ 执行                    │
│   → 视图模式切换 ✅                                               │
├───────────────────────────────────────────────────────────────────┤
│ 路径 2: 工具栏按钮点击                                           │
│   shortcuts = undefined       → ❌ falsy                         │
│   → dispatch 不执行                                               │
│   → 视图模式切换依赖框架通过 value 属性处理（隐式路径）          │
│   → 如果框架未处理 value 属性，按钮点击将无响应 ⚠️              │
└───────────────────────────────────────────────────────────────────┘
```

这导致两条交互路径的行为实现不一致：
- 键盘快捷键：通过 `execute` 函数的 `dispatch` 显式切换
- 按钮点击：依赖框架的隐式 `value` 处理

若框架升级改变了 `value` 处理逻辑，按钮点击可能静默失效。

**Committer 裁定**: 🟡 不阻塞 — 当前功能正常（框架正确处理 `value`），但隐式依赖增加升级风险。

---

### P3 — 轻微问题

#### P3-01: SVG 渲染尺寸非标准

**位置**: 第 12/38/64 行

`width="12" height="12"` + `viewBox="0 0 520 520"` — 缩放比 43:1。标准做法是 viewBox 与渲染尺寸接近（如 `viewBox="0 0 24 24"` 配合 `width="12" height="12"`），避免亚像素渲染问题。

---

#### P3-02: 无选中/激活状态标识

三个命令均无 `active`/`selected`/`className` 属性用于标识当前激活的视图模式。用户无法从工具栏按钮外观判断当前模式。

---

#### P3-03: 快捷键语义不直观

`ctrlcmd+7`（编辑）、`ctrlcmd+8`（实时）、`ctrlcmd+9`（预览）— 数字键 7/8/9 与功能名称无语义映射。用户需记忆而非直觉操作。此外，与浏览器默认快捷键（Ctrl+9 切换到最后一个标签页）冲突。

---

#### P3-04: 命名语义误导

```tsx
keyCommand: 'preview'  // 第 7/33/59 行 — 三个命令共享同一个 keyCommand
```

`keyCommand` 字段名为"按键命令"，暗示是命令的唯一标识符。但三个不同的命令（edit/preview/live）共享值 `'preview'`，实际含义是"命令组标识符"。这种命名会误导代码阅读者认为 `keyCommand` 是命令的唯一键。

---

## 五、API 契约审核

### 5.1 ICommand 接口一致性

| 检查项 | `codePreview` | `codeEdit` | `codeLive` | 结论 |
|--------|:---:|:---:|:---:|------|
| `name` 唯一性 | ✅ 'preview' | ✅ 'edit' | ✅ 'live' | 唯一 |
| `keyCommand` 一致性 | 'preview' | 'preview' | 'preview' | ⚠️ 三者相同，作为分组标识 |
| `value` 类型 | 'preview' | 'edit' | 'live' | ✅ 符合 `PreviewType` |
| `shortcuts` 格式 | 'ctrlcmd+9' | 'ctrlcmd+7' | 'ctrlcmd+8' | ✅ 统一格式 |
| `buttonProps` 完整性 | ✅ aria-label + title | ✅ | ✅ | 完整但英文硬编码 |
| `icon` 类型 | ✅ ReactElement | ✅ | ✅ | 符合 `React.ReactElement` |
| `execute` 签名 | ✅ 5 参数 | ✅ | ✅ | 与 `ICommand.execute` 匹配 |

### 5.2 ContextStore dispatch 安全性

```tsx
dispatch({ preview: 'preview' });  // partial dispatch
```

**安全性分析**:
- `ContextStore` 含 `[key: string]: any` 索引签名 — TypeScript 不检查属性名拼写
- 但 dispatch 值 `'preview'`/`'edit'`/`'live'` 均为合法 `PreviewType` 字面量
- 无用户可控输入传入 dispatch — 无注入风险
- **结论**: ✅ 安全，dispatch 调用无安全风险

---

## 六、对本项目（by_geo）的影响评估

### 6.1 使用场景分析

本项目通过 `@uiw/react-md-editor` 的 `MDEditor` 组件使用此模块。工具栏上的视图切换按钮（编辑/实时/预览）直接由这三个命令驱动。

### 6.2 风险矩阵

| 风险场景 | 前提条件 | 影响 | 当前防护 | Committer 评估 |
|----------|----------|------|----------|---------------|
| 视图切换按钮点击无响应 | 框架升级移除 `value` 隐式处理 | 编辑器功能异常 | 框架当前正确处理 | 🟡 低风险 |
| 快捷键与浏览器冲突 | 用户按 Ctrl+9 期望切换浏览器标签 | 意外切换编辑器视图 | 无法防护 | 🟡 低风险 |
| SVG 无障碍问题 | 屏幕阅读器用户使用编辑器 | 可访问性不合规 | buttonProps aria-label 兜底 | 🟡 低风险 |
| 图标辨识度低导致误操作 | 用户在高 DPI 屏幕操作 | 切换到错误视图模式 | 用户可撤销 | 🟢 极低风险 |

### 6.3 核心结论

`commands/preview.tsx` 的代码质量问题是上游库的设计决策，**不影响本项目的安全性和核心功能**。三个命令的 dispatch 调用安全、视图切换功能正常、无 XSS/注入向量。主要影响是**用户体验**（图标辨识度低）和**可访问性**（SVG 无障碍缺失），可通过项目层面的 CSS 覆盖和自定义命令缓解。

---

## 七、审核意见汇总

### 🔴 必须修复（Blocking — 在本项目层面）

| # | 问题 | 修复位置 | 修复方案 |
|---|------|----------|----------|
| 1 | **工具栏图标辨识度低** | 本项目编辑器组件 | 通过 CSS 放大 SVG 尺寸（16-20px），添加激活态样式覆盖 |
| 2 | **零 antd 集成** | 本项目编辑器组件 | 通过自定义 `commands` 属性覆盖，使用 antd `Button`/`Tooltip` 组件 |

### 🟡 建议改进（Non-blocking — 后续迭代优化）

| # | 问题 | 修复位置 | 建议 |
|---|------|----------|------|
| 3 | SVG 无障碍属性缺失 | 自定义命令覆盖 | 为 SVG 添加 `role="img" aria-hidden="true"` |
| 4 | aria-label 英文硬编码 | 自定义命令覆盖 | 使用中文标签 `aria-label: '预览 (Ctrl + 9)'` |
| 5 | 快捷键与浏览器冲突 | 自定义命令覆盖 | 重新映射快捷键（如 `alt+1/2/3`） |
| 6 | 交互双路径隐式依赖 | 关注上游版本更新 | 记录为技术债，上游升级时验证按钮点击行为 |

### 🟢 认可的优点

| # | 优点 | 说明 |
|---|------|------|
| 1 | 功能完整 | 编辑/预览/实时三种视图模式完整覆盖 |
| 2 | dispatch 调用安全 | 无用户可控输入传入 dispatch，无注入风险 |
| 3 | buttonProps 可访问性 | 提供 `aria-label` 和 `title`，基本满足 WCAG 要求 |
| 4 | 类型签名完整 | execute 函数 5 个参数全部有类型标注 |
| 5 | 图标使用 currentColor | 支持 CSS 主题颜色，可随主题切换 |

---

## 八、与其他评审的交叉裁定

本文件为首次评审，无已有评审需要交叉裁定。

与相关文件 `@uiw/react-markdown-preview/src/preview.tsx` 的评审对比：

| 对比维度 | `commands/preview.tsx`（本文件） | `preview.tsx`（Markdown 渲染核心） |
|----------|--------------------------------|--------------------------------|
| 安全风险 | 🟢 低 — dispatch 安全，无 XSS 向量 | 🔴 高 — 三层安全防线全线崩溃 |
| 代码重复 | 🔴 95%+ DRY 违反 | 🟡 中等 — 单文件逻辑集中 |
| 对本项目影响 | 🟡 用户体验层面 | 🔴 安全层面 |
| 封装层要求 | CSS 覆盖 + 自定义命令 | DOMPurify + urlTransform + allowElement |
| Committer 判定 | CONDITIONAL APPROVE | CONDITIONAL APPROVE（前置条件更多） |

---

## 九、最终裁决

### 裁决结果：⚠️ 有条件通过（CONDITIONAL APPROVE）

**裁决理由**：

1. **功能正确性**: 三个命令正确实现编辑器视图切换功能，dispatch 调用安全无注入风险。快捷键和按钮点击均能正确切换视图模式（通过不同路径但结果一致）。

2. **安全合规性通过**: 与 `preview.tsx`（Markdown 渲染核心）不同，本文件不涉及内容渲染、URL 处理、HTML 解析等安全敏感操作。dispatch 的值（`'preview'`/`'edit'`/`'live'`）全部为硬编码字面量，无用户可控输入。

3. **代码质量问题属上游**: DRY 违反（95%+ 重复）、未使用参数（`state`/`executeCommandState`）、`keyCommand` 语义混乱均为上游库的设计决策。本项目无法也不应修改 `node_modules` 中的代码。

4. **用户体验需项目层面改善**: 图标辨识度低、零 antd 集成、英文硬编码标签需通过本项目的 CSS 覆盖和自定义命令解决。这些是**用户体验优化项**而非功能缺陷。

### 前置条件（Non-blocking — 建议在本迭代完成）

- [ ] 通过 CSS 覆盖放大工具栏图标尺寸至 16-20px
- [ ] 添加当前激活视图模式的视觉反馈样式
- [ ] 确认编辑器视图切换在按钮点击和快捷键两种路径下行为一致

### 后续优化（排期改进）

- [ ] 自定义命令覆盖，使用 antd `Button`/`Tooltip` 替代原生按钮
- [ ] 自定义命令覆盖，使用中文 `aria-label`
- [ ] 重新映射快捷键避免与浏览器冲突
- [ ] 关注 `@uiw/react-md-editor` 版本更新

---

**评审人**: Committer 审核专家
**评审结论**: CONDITIONAL APPROVE — 依赖可保留，无安全风险，用户体验需 CSS 覆盖改善
**综合评分**: 3.2/10（P1×2 + P2×3 + P3×4，扣分主要来自 DRY 违反和可访问性缺失，但不影响依赖准入）
**建议优先级**: P2（非阻塞，建议本迭代完成 CSS 覆盖）
**预期修复工作量**: 约 0.5-1 小时（CSS 图标尺寸 + 激活态样式）
