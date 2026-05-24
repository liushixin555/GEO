# fullscreen.tsx — 代码安全专家评审

**文件路径**: `node_modules/@uiw/react-md-editor/src/commands/fullscreen.tsx`
**评审日期**: 2026-05-25
**评审类型**: 代码安全专家评审
**评审人**: Claude Code (安全评审模式)

---

## 评审总览

| 维度 | 评分 | 说明 |
|------|------|------|
| **整体安全评分** | **8.5 / 10** | 组件逻辑简单、无外部输入注入面，风险可控 |
| 输入验证 | 8/10 | 参数为内部传递的 React 状态对象，无用户可控输入面 |
| XSS 风险 | 9/10 | SVG 为硬编码静态内容，无动态拼接 |
| 状态安全 | 9/10 | 仅切换 boolean 值，无原型污染路径 |
| 快捷键冲突 | 7/10 | `ctrlcmd+0` 与浏览器默认"重置缩放"冲突 |
| 全屏滥用风险 | 8/10 | 仅设置 React 状态，未直接调用 Fullscreen API，但下游可能被滥用 |

---

## 逐行安全分析

### L1-L4: 导入声明

```tsx
import React from 'react';
import { type ICommand, TextState, type TextAreaTextApi } from './';
import { type ContextStore, type ExecuteCommandState } from '../Context';
```

- **风险**: `ContextStore` 接口定义了 `[key: string]: any` 索引签名（见 Context.tsx:29），允许任意属性赋值。
- **影响**: 本文件中未利用此特性，不构成直接威胁。但若 `dispatch` 调用时误传用户可控数据，可能导致状态污染。
- **建议**: 在使用侧确保 `dispatch` 的 payload 仅包含已知属性，不传入外部未过滤数据。

### L5-L9: 命令定义

```tsx
export const fullscreen: ICommand = {
  name: 'fullscreen',
  keyCommand: 'fullscreen',
  shortcuts: 'ctrlcmd+0',
  value: 'fullscreen',
```

- **风险**: `ctrlcmd+0` 快捷键与浏览器默认行为冲突。
  - **Chrome/Edge/Firefox**: `Ctrl+0` 为"重置页面缩放至100%"
  - **安全影响**: 拦截浏览器快捷键可能被用于阻碍用户操作（如无法重置被恶意放大的页面），属于 UX 安全范畴
- **严重度**: 低。编辑器场景下用户有明确意图触发全屏，且浏览器可通过 Esc 键退出全屏。
- **建议**: 考虑使用 `F11` 或其他非冲突快捷键，或在 `execute` 中调用 `event.preventDefault()` 前判断焦点是否在编辑器内。

### L10: buttonProps 可访问性

```tsx
buttonProps: { 'aria-label': 'Toggle fullscreen (ctrl + 0)', title: 'Toggle fullscreen (ctrl+ 0)' },
```

- **问题**: `aria-label` 和 `title` 中的空格不一致（`ctrl + 0` vs `ctrl+ 0`），属于可访问性缺陷。
- **安全影响**: 无直接安全风险，但可能导致辅助技术用户误读操作提示。

### L11-L18: SVG 图标

```tsx
icon: (
  <svg width="12" height="12" viewBox="0 0 520 520">
    <path fill="currentColor" d="M118 171..." />
  </svg>
),
```

- **风险**: 无。SVG 路径数据为硬编码常量字符串，不含任何动态拼接。
- **验证**: 路径数据 `d="M118..."` 为纯数学坐标描述，无 `<script>`、`onload`、`href="javascript:"` 等危险属性。
- **结论**: 安全。无 SVG 注入风险。

### L19-L31: execute 函数

```tsx
execute: (
  state: TextState,
  api: TextAreaTextApi,
  dispatch?: React.Dispatch<ContextStore>,
  executeCommandState?: ExecuteCommandState,
  shortcuts?: string[],
) => {
  api.textArea.focus();
  if (shortcuts && dispatch && executeCommandState) {
    dispatch({ fullscreen: !executeCommandState.fullscreen });
  }
},
```

#### 安全分析点：

**1. `api.textArea.focus()` — L26**

- **操作**: 无条件聚焦 textarea。
- **风险**: 低。`textArea` 为内部 DOM 引用（由 `TextAreaTextApi` 构造函数注入），非用户可控。
- **潜在问题**: 若 `textArea` 引用已卸载的 DOM 节点（stale reference），`focus()` 调用可能抛出异常，但不会产生安全漏洞。
- **建议**: 可添加可选链 `api.textArea?.focus()` 防御性编程，但非安全问题。

**2. 条件守卫 `if (shortcuts && dispatch && executeCommandState)` — L27**

- **分析**: 三重存在性检查，确保所有依赖项非空后才执行 dispatch。守卫逻辑正确。
- **注意**: 当用户点击按钮触发时（非快捷键），`shortcuts` 为 `undefined`，此分支**不执行**。这意味着点击全屏按钮不会触发状态切换？
- **验证**: 查看调用方 `TextAreaCommandOrchestrator.executeCommand`（index.ts:178-179），`shortcuts` 参数仅在快捷键触发时传入。按钮点击走另一条路径。
- **风险**: 这可能是一个**功能 Bug**而非安全问题——如果全屏仅能通过快捷键触发而按钮点击无效。但这也可能是设计意图，全屏按钮在其他地方处理。

**3. `dispatch({ fullscreen: !executeCommandState.fullscreen })` — L28**

- **操作**: 切换 boolean 状态值。
- **风险**: 无。
  - `fullscreen` 为固定字符串键，非计算属性
  - `!executeCommandState.fullscreen` 结果只能是 `true` 或 `false`
  - `ExecuteCommandState` 类型为 `Pick<ContextStore, 'fullscreen' | 'preview' | 'highlightEnable'>`，`fullscreen` 类型为 `boolean | undefined`
  - `!undefined` → `true`，`!true` → `false`，`!false` → `true`，逻辑正确
- **结论**: 无注入、无污染、无越权风险。

---

## 全屏滥用（Fullscreen Phishing）分析

全屏模式是一个已知的 UI 安全攻击向量：

- **攻击场景**: 恶意网页进入全屏后伪造浏览器地址栏/SSL 指示器，诱导用户输入凭据。
- **本文件风险**: **低**。此组件仅设置 React 状态 `{ fullscreen: true/false }`，不直接调用 `Element.requestFullscreen()` 浏览器 API。实际全屏效果的实现取决于下游消费者如何响应此状态变化。
- **缓解措施**: 浏览器在全屏模式下会显示"按 Esc 退出全屏"提示，且只允许用户手势触发 `requestFullscreen()`。
- **建议**: 若下游实现调用了 `requestFullscreen()`，确保：
  1. 仅响应用户主动操作（click/keydown），不通过脚本自动进入全屏
  2. 提供 Esc 键退出路径
  3. 全屏状态下不隐藏安全相关的浏览器 UI 元素

---

## 上下文风险评估

### ContextStore 索引签名 `[key: string]: any`

`Context.tsx:29` 定义了开放式索引签名，允许任意属性写入 React 状态：

```tsx
export interface ContextStore {
  // ...已知属性...
  [key: string]: any;  // ⚠️ 任意属性
}
```

- **影响范围**: 全局。所有通过 `dispatch` 更新状态的命令都受此影响。
- **本文件**: 仅使用 `fullscreen` 已知属性，未利用索引签名。
- **建议**: 移除 `[key: string]: any`，改用精确类型定义。若需要扩展性，使用泛型或联合类型。

### reducer 实现为浅合并

```tsx
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };
}
```

- **风险**: 浅合并不防止 `__proto__` 或 `constructor` 等特殊键名污染。
- **本文件**: payload 为 `{ fullscreen: boolean }`，安全。
- **总体建议**: 在 reducer 中过滤 action 的键名，排除原型链属性。

---

## 发现汇总

| # | 级别 | 发现 | 位置 | 建议 |
|---|------|------|------|------|
| 1 | ℹ️ 信息 | `ctrlcmd+0` 与浏览器"重置缩放"冲突 | L8 | 考虑更换快捷键或添加焦点判断 |
| 2 | ℹ️ 信息 | `aria-label` 与 `title` 空格不一致 | L10 | 统一格式 |
| 3 | ⚠️ 低 | 按钮点击时 `shortcuts` 为空导致 execute 逻辑跳过 | L27 | 确认是否为设计意图，若为 Bug 则修复 |
| 4 | ⚠️ 低 | `ContextStore` 索引签名 `[key: string]: any` 允许任意属性 | Context.tsx:29 | 移除或改用精确类型 |
| 5 | ℹ️ 信息 | 全屏状态可用于 UI 欺骗（依赖下游实现） | L28 | 下游调用 `requestFullscreen()` 时需确保用户手势触发 |
| 6 | ✅ 安全 | SVG 图标为硬编码静态内容，无注入风险 | L11-L18 | 无需修改 |
| 7 | ✅ 安全 | dispatch payload 为固定 boolean 切换，无注入面 | L28 | 无需修改 |

---

## 结论

`fullscreen.tsx` 是一个低风险组件。核心逻辑仅切换一个 boolean 状态值，无用户可控输入、无动态内容渲染、无外部 API 调用。主要关注点在于：

1. **快捷键冲突**（信息级）—— 不构成安全威胁但影响用户体验
2. **ContextStore 开放式类型**（低级）—— 本文件未利用，但作为共享类型存在系统性风险
3. **全屏 API 滥用潜力**（依赖下游）—— 本文件仅设置状态标志，实际风险取决于消费者实现

**评审结论**: ✅ **通过** — 无需修改，建议关注上述信息级发现。
