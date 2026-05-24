# 软件质量专家评审：@uiw/react-md-editor commands/preview.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/preview.tsx`
**评审角色**: 软件质量专家（代码复用 · DRY · 类型安全 · 可维护性 · 无障碍 · 命名语义 · 错误处理）
**评审日期**: 2026-05-25
**代码行数**: 94 行（3 个导出的 `ICommand` 对象）
**功能概述**: Markdown 编辑器模式切换命令——定义 `codePreview`（预览）、`codeEdit`（编辑）、`codeLive`（实时）三个工具栏/快捷键命令，用于切换编辑器的三种显示模式
**评审结论**: ⚠️ CONDITIONAL APPROVE — 功能正确但存在严重的代码重复（DRY 违反）和多处设计缺陷，可维护性堪忧

**问题统计**: P1 × 2 / P2 × 3 / P3 × 4 / P4 × 1

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 编辑器模式切换命令定义——预览/编辑/实时三种模式的工具栏按钮 + 快捷键 |
| 代码行数 | 94 行（含 import、空行、SVG） |
| 设计模式 | 命令模式（ICommand 接口实现） |
| 外部依赖 | React（JSX）、ICommand/TextState/TextAreaTextApi 类型、ContextStore/ExecuteCommandState 类型 |
| 导出成员 | 3 个具名导出（`codePreview`、`codeEdit`、`codeLive`） |
| 有效代码行 | ~30 行（不含 SVG 和重复代码） |

### 源码

```typescript
import React from 'react';
import { type ICommand, type TextState, TextAreaTextApi } from './';
import { type ContextStore, type ExecuteCommandState } from '../Context';

export const codePreview: ICommand = {
  name: 'preview',
  keyCommand: 'preview',
  value: 'preview',
  shortcuts: 'ctrlcmd+9',
  buttonProps: { 'aria-label': 'Preview code (ctrl + 9)', title: 'Preview code (ctrl + 9)' },
  icon: (
    <svg width="12" height="12" viewBox="0 0 520 520">
      <polygon fill="currentColor" points="0 71.293 0 122 38.023 123 38.023 398 0 397 0 449.707 91.023 450.413 91.023 72.293" />
      <polygon fill="currentColor" points="148.023 72.293 520 71.293 520 122 200.023 124 200.023 397 520 396 520 449.707 148.023 450.413" />
    </svg>
  ),
  execute: (state, api, dispatch, executeCommandState, shortcuts) => {
    api.textArea.focus();
    if (shortcuts && dispatch && executeCommandState) {
      dispatch({ preview: 'preview' });
    }
  },
};

export const codeEdit: ICommand = {
  name: 'edit',
  keyCommand: 'preview',
  value: 'edit',
  shortcuts: 'ctrlcmd+7',
  buttonProps: { 'aria-label': 'Edit code (ctrl + 7)', title: 'Edit code (ctrl + 7)' },
  icon: (
    <svg width="12" height="12" viewBox="0 0 520 520">
      <polygon fill="currentColor" points="0 71.293 0 122 319 122 319 397 0 397 0 449.707 372 449.413 372 71.293" />
      <polygon fill="currentColor" points="429 71.293 520 71.293 520 122 481 123 481 396 520 396 520 449.707 429 449.413" />
    </svg>
  ),
  execute: (state, api, dispatch, executeCommandState, shortcuts) => {
    api.textArea.focus();
    if (shortcuts && dispatch && executeCommandState) {
      dispatch({ preview: 'edit' });
    }
  },
};

export const codeLive: ICommand = {
  name: 'live',
  keyCommand: 'preview',
  value: 'live',
  shortcuts: 'ctrlcmd+8',
  buttonProps: { 'aria-label': 'Live code (ctrl + 8)', title: 'Live code (ctrl + 8)' },
  icon: (
    <svg width="12" height="12" viewBox="0 0 520 520">
      <polygon fill="currentColor" points="0 71.293 0 122 179 122 179 397 0 397 0 449.707 232 449.413 232 71.293" />
      <polygon fill="currentColor" points="289 71.293 520 71.293 520 122 341 123 341 396 520 396 520 449.707 289 449.413" />
    </svg>
  ),
  execute: (state, api, dispatch, executeCommandState, shortcuts) => {
    api.textArea.focus();
    if (shortcuts && dispatch && executeCommandState) {
      dispatch({ preview: 'live' });
    }
  },
};
```

---

## 二、质量评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| DRY（代码复用） | 2 | 三个 execute 函数完全相同（除 1 个字符串），重复率 ~95% |
| 类型安全 | 5 | 接口约束存在但 `state`/`executeCommandState` 未使用，dispatch 无类型约束 |
| 可维护性 | 3 | 新增模式需复制粘贴整个 ICommand 对象，极易遗漏修改 |
| 命名语义 | 4 | `code` 前缀误导、`keyCommand: 'preview'` 对 edit/live 不准确 |
| 错误处理 | 3 | `api.textArea.focus()` 无空值检查；dispatch 条件不满足时静默跳过 |
| 无障碍性 | 5 | buttonProps 有 aria-label，但 SVG 缺 aria-hidden |
| 可测试性 | 4 | 副作用函数难以单独测试，无返回值可断言 |
| 文档完备性 | 3 | 零注释、零 JSDoc，execute 的条件分支行为无法从签名推断 |
| **综合评分** | **3.6 / 10** | |

---

## 三、问题清单

### P1 — 严重问题（可维护性 / DRY 违反）

#### P1-1：三重 execute 函数体完全重复——DRY 严重违反

```typescript
// 行 23-34（codePreview）、行 52-63（codeEdit）、行 81-92（codeLive）
// 三个 execute 函数唯一差异：dispatch({ preview: 'xxx' }) 中的字符串值
execute: (state, api, dispatch, executeCommandState, shortcuts) => {
  api.textArea.focus();
  if (shortcuts && dispatch && executeCommandState) {
    dispatch({ preview: 'preview' }); // ← 唯一差异点
  }
},
```

**问题**: 三个函数体共 ~30 行，仅 1 个字符串常量不同（`'preview'` / `'edit'` / `'live'`），重复率约 95%。这意味着：

1. **修改一处忘记其余**: 任何逻辑变更（如加 try-catch、修改条件）需在 3 处同步修改，极易遗漏
2. **认知浪费**: 阅读者需逐行比对 3 个函数才能确认它们"确实一样"
3. **Bug 放大**: 如果一个 execute 有 bug，另外两个可能也有，但修复时容易遗漏

**建议**: 提取工厂函数：

```typescript
function createPreviewCommand(
  name: string,
  value: string,
  shortcuts: string,
  ariaLabel: string,
  icon: React.ReactNode,
): ICommand {
  return {
    name,
    keyCommand: 'preview',
    value,
    shortcuts,
    buttonProps: { 'aria-label': ariaLabel, title: ariaLabel },
    icon,
    execute: (_state, api, dispatch, _executeCommandState, shortcuts) => {
      api.textArea.focus();
      if (shortcuts && dispatch && _executeCommandState) {
        dispatch({ preview: value });
      }
    },
  };
}
```

#### P1-2：dispatch 条件分支导致工具栏按钮点击无效——静默失败

```typescript
// 行 31-33（每个 execute 函数中）
if (shortcuts && dispatch && executeCommandState) {
  dispatch({ preview: 'preview' });
}
```

**问题**: 当用户通过**工具栏按钮点击**触发命令时，`shortcuts` 参数为 `undefined`（仅快捷键触发时传入 `string[]`）。这意味着 `dispatch` 永远不会在按钮点击时执行——execute 函数在按钮点击场景下是**死代码**。

虽然从编辑器整体架构看，工具栏按钮的 `onClick` 可能在上层通过其他路径处理 mode 切换，但这种设计导致：

1. **execute 函数职责不完整**: 同一个 ICommand 的 execute 在按钮点击和快捷键两种触发方式下行为不同，但无法从代码中看出这一隐含契约
2. **静默失败**: 条件不满足时无任何警告或降级处理，调试时极难发现 mode 切换"为什么没生效"
3. **接口误导**: `execute` 的 5 个参数中 3 个是可选的，但实际调用时是否传入取决于触发来源，这一语义未在类型或文档中体现

**建议**: 至少添加注释说明行为差异，或拆分为两个独立路径（`onButtonClick` / `onShortcut`）。

---

### P2 — 重要问题

#### P2-1：两个参数声明但从未使用

```typescript
execute: (
  state: TextState,           // ← 从未读取
  api: TextAreaTextApi,
  dispatch?: React.Dispatch<ContextStore>,
  executeCommandState?: ExecuteCommandState,  // ← 从未读取
  shortcuts?: string[],
) => {
```

**问题**: `state` 和 `executeCommandState` 在所有三个 execute 函数中从未被读取。这暗示：

1. 接口 `ICommand.execute` 的签名是通用签名，但模式切换命令不需要选区/文本状态信息——这本身合理，但未使用的参数应在命名上表明（如 `_state`）以符合惯例
2. `executeCommandState` 被用于条件判断 (`if (shortcuts && dispatch && executeCommandState)`) 但其值本身从未使用——它仅作为"是否存在"的守卫条件，这表明该参数可能应简化为 `boolean` 或合并到 `shortcuts` 的存在性检查中

#### P2-2：`keyCommand` 命名语义混乱

```typescript
// codeEdit 和 codeLive 的 keyCommand 值
export const codeEdit: ICommand = {
  name: 'edit',
  keyCommand: 'preview',  // ← edit 的 keyCommand 是 'preview'？
  ...
};
export const codeLive: ICommand = {
  name: 'live',
  keyCommand: 'preview',  // ← live 的 keyCommand 也是 'preview'？
  ...
};
```

**问题**: `codeEdit` 和 `codeLive` 的 `keyCommand` 均为 `'preview'`，但它们的功能分别是"编辑模式"和"实时模式"。从语义上看，`keyCommand` 似乎是命令分组标识符而非命令名称，但这违反了 `ICommand` 接口中 `keyCommand` 字段的命名直觉——读者会期望 `keyCommand` 反映命令本身的键名。

这种设计可能是为了将三个命令归入同一命令组（由编辑器框架统一处理 `keyCommand: 'preview'`），但缺少文档说明这一意图。

#### P2-3：`code` 前缀命名误导

```typescript
export const codePreview: ICommand = { ... };  // 不是"代码预览"
export const codeEdit: ICommand = { ... };      // 不是"代码编辑"
export const codeLive: ICommand = { ... };      // 不是"代码实时"
```

**问题**: 三个导出均以 `code` 为前缀（`codePreview`、`codeEdit`、`codeLive`），暗示与"代码块"功能相关。但实际上这些是**编辑器模式切换**命令（预览模式/编辑模式/实时模式），与代码块无关。

`code` 前缀可能来源于内部的命名习惯（如 `codeBlock` 命令），但在公开 API 层面会严重误导使用者。

**建议**: 重命名为 `previewMode`、`editMode`、`liveMode` 或 `modePreview`、`modeEdit`、`modeLive`。

---

### P3 — 一般问题

#### P3-1：SVG 图标缺少 `aria-hidden="true"`

```typescript
icon: (
  <svg width="12" height="12" viewBox="0 0 520 520">
    {/* 缺少 aria-hidden="true" 和 focusable="false" */}
    <polygon fill="currentColor" points="..." />
  </svg>
),
```

**问题**: 虽然父按钮通过 `buttonProps` 提供了 `aria-label`，但 SVG 本身未标记为装饰性。屏幕阅读器可能尝试朗读 SVG 内部的 `<polygon>` 元素，导致重复播报或无意义内容。

**建议**: 添加 `aria-hidden="true"` 和 `focusable="false"`：

```typescript
<svg width="12" height="12" viewBox="0 0 520 520" aria-hidden="true" focusable="false">
```

#### P3-2：`api.textArea.focus()` 无空值防护

```typescript
// 行 30（每个 execute 函数的第一行）
api.textArea.focus();
```

**问题**: `api.textArea` 如果为 `null` 或 `undefined`（如组件已卸载或 textarea ref 未绑定），将抛出 `TypeError: Cannot read properties of null (reading 'focus')`。没有任何 try-catch 或可选链保护。

#### P3-3：切换到预览模式时仍聚焦 textarea——行为不一致

```typescript
// codePreview 的 execute
api.textArea.focus();  // ← 聚焦 textarea
if (shortcuts && dispatch && executeCommandState) {
  dispatch({ preview: 'preview' });  // ← 但切换到预览模式后 textarea 可能隐藏
}
```

**问题**: `api.textArea.focus()` 在 dispatch 之前执行。当 `codePreview` 切换到预览模式时，textarea 可能被隐藏，此时的 focus 调用：
1. 如果 textarea 已隐藏：focus 无效但也不报错——浪费一次 DOM 操作
2. 如果 focus 先于隐藏生效：焦点可能短暂出现在即将隐藏的元素上，产生视觉闪烁

逻辑上应先 dispatch 切换模式，再根据新模式决定是否需要 focus。

#### P3-4：魔数字符串缺乏枚举约束

```typescript
dispatch({ preview: 'preview' });  // 魔数字符串 'preview'
dispatch({ preview: 'edit' });     // 魔数字符串 'edit'
dispatch({ preview: 'live' });     // 魔数字符串 'live'
```

**问题**: 三个模式值 `'preview'`、`'edit'`、`'live'` 在 `value` 属性和 `dispatch` 参数中重复出现，但没有通过枚举或常量统一约束。任何一处拼写错误（如 `'preivew'`）都不会被编译器捕获。

---

### P4 — 建议改进

#### P4-1：硬编码英文字符串，无国际化支持

```typescript
buttonProps: { 'aria-label': 'Preview code (ctrl + 9)', title: 'Preview code (ctrl + 9)' },
buttonProps: { 'aria-label': 'Edit code (ctrl + 7)', title: 'Edit code (ctrl + 7)' },
buttonProps: { 'aria-label': 'Live code (ctrl + 8)', title: 'Live code (ctrl + 8)' },
```

**问题**: `aria-label` 和 `title` 使用硬编码英文字符串。对于国际化编辑器场景，无法通过外部 props 覆盖这些文案。

---

## 四、问题汇总表

| 编号 | 等级 | 类别 | 位置 | 问题摘要 |
|---|---|---|---|---|
| P1-1 | P1 | DRY 违反 | 行 23-34 / 52-63 / 81-92 | 三个 execute 函数体 95% 重复，仅 1 个字符串常量不同 |
| P1-2 | P1 | 静默失败 | 行 31-33 | `shortcuts` 守卫使按钮点击时 dispatch 不执行，execute 为死代码 |
| P2-1 | P2 | 代码质量 | 行 24/28 | `state` 和 `executeCommandState` 参数声明但未使用 |
| P2-2 | P2 | 命名语义 | 行 39/68 | `codeEdit`/`codeLive` 的 `keyCommand` 值为 `'preview'`，语义混乱 |
| P2-3 | P2 | 命名语义 | 行 5/37/66 | `code` 前缀暗示"代码块"功能，实际是模式切换命令 |
| P3-1 | P3 | 无障碍 | 行 12-21 等 | SVG 缺少 `aria-hidden="true"` |
| P3-2 | P3 | 错误处理 | 行 30 | `api.textArea.focus()` 无空值防护 |
| P3-3 | P3 | 行为一致性 | 行 30-33 | 预览模式切换时仍先聚焦 textarea |
| P3-4 | P3 | 类型安全 | 行 32/61/90 | 模式值为魔数字符串，无枚举约束 |
| P4-1 | P4 | 国际化 | 行 10/42/71 | aria-label/title 硬编码英文 |

---

## 五、重构建议

### 推荐重构方案：工厂函数 + 常量枚举

```typescript
import React from 'react';
import { type ICommand, type TextState, TextAreaTextApi } from './';
import { type ContextStore, type ExecuteCommandState } from '../Context';

/** 编辑器预览模式 */
const PREVIEW_MODE = {
  EDIT: 'edit',
  LIVE: 'live',
  PREVIEW: 'preview',
} as const;

type PreviewMode = (typeof PREVIEW_MODE)[keyof typeof PREVIEW_MODE];

interface PreviewSvgProps {
  left: string;
  right: string;
}

const PreviewSvg: React.FC<PreviewSvgProps> = ({ left, right }) => (
  <svg width="12" height="12" viewBox="0 0 520 520" aria-hidden="true" focusable="false">
    <polygon fill="currentColor" points={left} />
    <polygon fill="currentColor" points={right} />
  </svg>
);

function createPreviewCommand(
  name: string,
  value: PreviewMode,
  shortcutKey: string,
  ariaLabel: string,
  svgLeft: string,
  svgRight: string,
): ICommand {
  return {
    name,
    keyCommand: 'preview',
    value,
    shortcuts: `ctrlcmd+${shortcutKey}`,
    buttonProps: { 'aria-label': ariaLabel, title: ariaLabel },
    icon: <PreviewSvg left={svgLeft} right={svgRight} />,
    execute: (
      _state: TextState,
      api: TextAreaTextApi,
      dispatch?: React.Dispatch<ContextStore>,
      executeCommandState?: ExecuteCommandState,
      shortcuts?: string[],
    ) => {
      try { api.textArea.focus(); } catch { /* textarea 可能已卸载 */ }
      if (shortcuts && dispatch && executeCommandState) {
        dispatch({ preview: value });
      }
    },
  };
}

export const codeEdit = createPreviewCommand(
  'edit', PREVIEW_MODE.EDIT, '7', 'Edit code (ctrl + 7)',
  '0 71.293 0 122 319 122 319 397 0 397 0 449.707 372 449.413 372 71.293',
  '429 71.293 520 71.293 520 122 481 123 481 396 520 396 520 449.707 429 449.413',
);

export const codeLive = createPreviewCommand(
  'live', PREVIEW_MODE.LIVE, '8', 'Live code (ctrl + 8)',
  '0 71.293 0 122 179 122 179 397 0 397 0 449.707 232 449.413 232 71.293',
  '289 71.293 520 71.293 520 122 341 123 341 396 520 396 520 449.707 289 449.413',
);

export const codePreview = createPreviewCommand(
  'preview', PREVIEW_MODE.PREVIEW, '9', 'Preview code (ctrl + 9)',
  '0 71.293 0 122 38.023 123 38.023 398 0 397 0 449.707 91.023 450.413 91.023 72.293',
  '148.023 72.293 520 71.293 520 122 200.023 124 200.023 397 520 396 520 449.707 148.023 450.413',
);
```

### 重构收益

| 指标 | 重构前 | 重构后 | 改善 |
|---|---|---|---|
| execute 函数重复 | 3 份（30 行） | 1 份（10 行） | -67% |
| 模式值出现次数 | 6 次（魔数字符串） | 3 次（枚举引用） | 类型安全 |
| SVG aria-hidden | 缺失 | 全部添加 | 无障碍合规 |
| focus 空值防护 | 无 | try-catch | 防止运行时崩溃 |
| 未使用参数标记 | 无 | `_` 前缀 | 消除 lint 警告 |

---

## 六、评审总结

本文件功能上正确实现了编辑器模式切换命令，但从软件质量角度存在系统性 DRY 违反——三个命令对象的 execute 函数体几乎完全相同（95% 重复率），仅一个字符串常量不同。这导致可维护性极低，任何逻辑变更需同步三处修改。

最严重的设计缺陷是 `execute` 函数中的 `shortcuts` 守卫条件：当用户通过工具栏按钮点击触发命令时，`dispatch` 调用被静默跳过，使 execute 函数在按钮点击场景下成为死代码。虽然上层可能有替代路径处理按钮点击，但这种隐式行为契约缺乏文档和类型支持，极易在维护中引入 bug。

**综合评分 3.6/10**——核心问题是 DRY 违反和隐式行为契约，通过工厂函数重构可将评分提升至 6-7 分。
