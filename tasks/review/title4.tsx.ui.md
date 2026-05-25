# 软件UI专家评审：title4.tsx

**文件**: `@uiw/react-md-editor/src/commands/title4.tsx`
**评审角色**: 软件UI专家（用户界面设计 · 交互体验 · 设计系统合规 · 可访问性 · 视觉层级 · 响应式适配）
**评审日期**: 2026-05-25
**评审基准**: 已应用 `patches/@uiw__react-md-editor@4.1.0.patch` 后的 patched 版本
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 工具栏按钮功能可用，但在 DESIGN.md 合规、antd 集成、视觉一致性、交互反馈方面存在多项 UI 层面缺陷）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器工具栏中"四级标题"按钮的命令对象 |
| 代码行数 | 24 行（1 个主命令对象 + 1 个废弃别名） |
| 导出接口 | 2 个（`heading4` 推荐导出 + `title4` 废弃别名） |
| UI 元素 | 工具栏按钮图标（`<div>` 纯文本 + 内联样式） |
| 快捷键 | `Ctrl/Cmd + 4` |
| 无障碍属性 | `aria-label`、`title`、`role="img"`、`aria-hidden`（patched） |

### patched 版本代码全貌

```typescript
import React from 'react';
import { headingExecute } from './headingUtils';
import { ICommand, ExecuteState, TextAreaTextApi } from './';

export const heading4: ICommand = {
  name: 'heading4',
  keyCommand: 'heading4',
  shortcuts: 'ctrlcmd+4',
  prefix: '#### ',
  suffix: '',
  buttonProps: { 'aria-label': 'Insert Heading 4 (ctrl + 4)', title: 'Insert Heading 4 (ctrl + 4)' },
  icon: <div style={{ fontSize: 14, textAlign: 'left' }} role="img" aria-hidden="true">Heading 4</div>,
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    headingExecute({ state, api, prefix: state.command.prefix ?? '#### ', suffix: state.command.suffix ?? '' });
  },
};

/** @deprecated Since v4.0.0. Use `heading4` instead. */
export const title4: ICommand = heading4;
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| DESIGN.md 视觉规范合规 | 4 | fontSize 14px 接近 body-sm，但内联样式无法被 Carbon token 覆盖 |
| antd 集成度 | 2 | 完全使用原生 `<div>` 和内联样式，未使用任何 antd 组件 |
| 视觉层级一致性 | 5 | 与 bold/italic 的 SVG 图标风格割裂；同族 fontSize 递减非等差 |
| 交互反馈设计 | 6 | 快捷键 + 按钮双入口，aria-label/title 提供基本提示 |
| 可访问性（WCAG） | 7 | patched 版本已添加 role/aria-hidden，aria-label 完整 |
| 响应式与触摸适配 | 4 | 无触摸目标尺寸定义，工具栏按钮尺寸依赖外部 CSS |
| 国际化/本地化 | 2 | "Heading 4" 硬编码英文，aria-label/title 不可配置 |
| **综合评分** | **4.3 / 10** | |

---

## 三、DESIGN.md 合规性逐项审查

### 3.1 排版合规（Typography）

| DESIGN.md Token | 期望值 | 实际值 | 合规 |
|---|---|---|---|
| `typography.body-sm` fontSize | 14px | 14px | ✅ 字号匹配 |
| `typography.body-sm` fontWeight | 400 | 未指定（继承） | 🟡 取决于父元素 |
| `typography.body-sm` letterSpacing | 0.16px | 未指定 | ❌ 缺少 letter-spacing |
| `typography.body-sm` lineHeight | 1.29 | 未指定 | 🟡 取决于父元素 |
| `fontFamily` | IBM Plex Sans | 未指定 | 🟡 取决于父元素 |

**分析**: `fontSize: 14` 恰好与 DESIGN.md 的 `typography.body-sm`（14px）一致，这是巧合还是有意的对齐？

对比同族文件的 fontSize 分布：

```
heading1: fontSize: 18  → 匹配 typography.body-lg (18px)
heading2: fontSize: 16  → 匹配 typography.body (16px)
heading3: fontSize: 15  → 无匹配 token（介于 body 16px 和 body-sm 14px 之间）
heading4: fontSize: 14  → 匹配 typography.body-sm (14px)    ← 本文件
heading5: fontSize: 12  → 匹配 typography.caption (12px)
heading6: fontSize: 11  → 无匹配 token（低于 caption 12px）
```

heading1/2/4/5 的 fontSize 可对应到 DESIGN.md 的排版 token，但 heading3（15px）和 heading6（11px）落在了 token 间隙中。**整体递减序列未遵循 DESIGN.md 的排版阶梯**。

### 3.2 颜色合规（Colors）

| DESIGN.md 规范 | 实际实现 | 合规 |
|---|---|---|
| `{colors.ink}` #161616 用于文本 | 未指定 color | 🟡 继承父元素，可能偏离 |
| `{colors.primary}` #0f62fe 用于交互元素 | 未使用 | 🟡 工具栏按钮由外部 CSS 控制 |
| `{colors.ink-muted}` #525252 用于次要文本 | 未使用 | — |

**分析**: icon div 不指定 `color` 属性，完全依赖父容器（工具栏）的 CSS。如果工具栏全局样式未设置 `{colors.ink}`，按钮文本可能呈现浏览器默认黑色（通常为 `#000000`），而非 Carbon 规范的 `{colors.ink}` (#161616)。两者的差异虽微小（#000 vs #161616），但在严格的 Carbon 设计系统中属于规范偏差。

### 3.3 间距合规（Spacing）

| DESIGN.md 规范 | 实际实现 | 合规 |
|---|---|---|
| 按钮内边距 12px 16px | 未指定 padding | 🟡 由外部工具栏 CSS 控制 |
| 4px 基准网格 | 无间距定义 | — |
| 触摸目标 48px 最小 | 无尺寸约束 | ❌ 未保证 |

### 3.4 圆角合规（Rounded）

| DESIGN.md 规范 | 实际实现 | 合规 |
|---|---|---|
| `{rounded.none}` 0px | 未指定 border-radius | 🟡 由外部 CSS 控制 |

### 3.5 综合规规矩阵

| DESIGN.md 维度 | 合规等级 | 说明 |
|---|---|---|
| 排版（字号） | 🟡 部分 | fontSize 14px 匹配 body-sm，但缺少 fontWeight/letterSpacing/lineHeight |
| 颜色 | 🟡 部分 | 未指定，依赖外部 CSS |
| 间距 | 🟡 部分 | 未指定，依赖外部 CSS |
| 圆角 | 🟡 部分 | 未指定，依赖外部 CSS |
| 内联样式 vs CSS 变量 | ❌ 不合规 | 使用内联 style 对象，无法被 DESIGN.md token 覆盖 |

**核心问题**: 内联样式 `style={{ fontSize: 14 }}` 将视觉属性硬编码在 JavaScript 中，无法通过 CSS 变量、antd ConfigProvider 或 Carbon theme token 进行动态调整。这与 DESIGN.md 的 **ConfigProvider 主题驱动** 模式根本冲突。

---

## 四、antd 集成度分析

### 4.1 当前 antd 使用情况

| antd 组件 | 是否使用 | 替代方案 | 合规性 |
|---|---|---|---|
| `Button` | ❌ 未使用 | 原生 `<div>` + 内联样式 | 违反 CLAUDE.md 铁律 |
| `Tooltip` | ❌ 未使用 | HTML `title` 属性 | 功能降级 |
| `Typography` | ❌ 未使用 | 原生 `<div>` + 内联样式 | 不合规 |
| `ConfigProvider` | ❌ 未使用 | 无主题集成 | 无法覆盖 |

### 4.2 与 CLAUDE.md 铁律的冲突

CLAUDE.md 铁律第一条明确要求：

> **前端必须使用 Ant Design (antd) 组件** — 禁止使用原生 HTML 元素替代 antd 提供的组件（Button、Input、Form、Card、Menu、Layout、Table、Modal 等）

当前实现使用 `<div style={{...}}>` 渲染工具栏按钮图标，**完全绕过 antd 组件体系**。

**缓解因素**: 此文件属于第三方库（`@uiw/react-md-editor`）内部实现，不属于本项目前端代码。直接修改为 antd 组件需要 fork 整个库或通过 patch 深度定制。

### 4.3 建议的封装方案

由于无法直接修改第三方库，建议在本项目的编辑器封装层补充 antd 集成：

```tsx
// pages/components/MarkdownEditor.tsx 中自定义命令图标
import { Button, Tooltip } from 'antd';
import { heading4 } from '@uiw/react-md-editor/commands/title4';

const customHeading4 = {
  ...heading4,
  // 通过 CSS 覆盖工具栏按钮样式，对齐 DESIGN.md token
  buttonProps: {
    ...heading4.buttonProps,
    className: 'carbon-toolbar-btn',
    style: {
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: '14px',
      fontWeight: 400,
      letterSpacing: '0.16px',
      color: 'var(--color-ink, #161616)',
      borderRadius: 0,
      padding: '12px 16px',
    },
  },
};
```

---

## 五、UI 层面问题清单

### P1 — 严重问题（影响用户体验与设计系统合规）

#### UI-P1-01：内联样式硬编码 fontSize — 无法被 DESIGN.md token 系统覆盖

```typescript
icon: <div style={{ fontSize: 14, textAlign: 'left' }} role="img" aria-hidden="true">Heading 4</div>,
```

**UI 问题分析**:

React 的 `style` 属性编译为内联 `style="font-size: 14px"`，CSS 优先级最高（仅次于 `!important`）。这意味着：

1. **无法通过 CSS 变量覆盖**: DESIGN.md 定义了 `--font-size-body-sm: 14px`，但内联样式的优先级高于任何 CSS 选择器
2. **无法通过 antd ConfigProvider 调整**: antd 的 token 系统通过 CSS 变量工作，内联样式绕过了这一机制
3. **无法响应 prefers-reduced-motion 或 prefers-contrast**: 用户操作系统的无障碍偏好设置无法影响内联样式
4. **缩放场景下不可自适应**: 14px 是绝对像素值，不使用 `rem`/`em`，在用户调整浏览器缩放比例时行为僵硬

**DESIGN.md 影响**: Carbon Design System 通过 CSS 变量实现主题切换（亮色/暗色）。内联样式将本文件的工具栏按钮排除在主题系统之外。

**建议修复**:

```typescript
// 方案 A: CSS 类名 + data 属性（推荐——可被主题覆盖）
icon: <div className="wmd-button-icon" data-heading="4" role="img" aria-hidden="true">Heading 4</div>,
```

```css
/* global.css */
.wmd-button-icon[data-heading="4"] {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: var(--font-size-body-sm, 14px);
  font-weight: var(--font-weight-body, 400);
  letter-spacing: var(--letter-spacing-body, 0.16px);
  text-align: left;
}
```

---

#### UI-P1-02：图标风格与同库其他命令不一致 — 工具栏视觉割裂

```typescript
// title4.tsx — 纯文本 div
icon: <div style={{ fontSize: 14, textAlign: 'left' }}>Heading 4</div>

// bold.tsx — SVG 矢量图标
icon: <svg viewBox="0 0 20 20"><path fill="currentColor" d="..." /></svg>

// heading（title.tsx） — SVG 矢量图标
icon: <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M3 2h2v4.5h4V2h2v12H9V8.5H5V14H3V2z" /></svg>
```

**UI 问题分析**:

工具栏中同时存在两种截然不同的图标渲染模式：

| 模式 | 使用者 | 渲染方式 | 缩放适配 | 主题化 |
|---|---|---|---|---|
| SVG 矢量图标 | bold, italic, strikethrough, heading | `<svg>` + `fill="currentColor"` | ✅ 无损缩放 | ✅ 颜色随 CSS 变化 |
| 纯文本 div | heading1-6 | `<div>` + 内联 fontSize | ❌ 高 DPI 可能模糊 | ❌ 硬编码样式 |

**用户体验影响**:

1. **视觉一致性破坏**: 用户在工具栏中看到的图标一半是矢量线条，一半是文字按钮，视觉节奏被打破
2. **缩放场景劣化**: 当用户设置浏览器缩放 > 100%（常见于 4K 显示器用户），SVG 图标保持清晰，文字图标可能出现渲染差异
3. **配色不一致**: SVG 使用 `fill="currentColor"` 跟随父元素颜色，文字 div 依赖 `color` CSS 属性——两者的颜色继承路径不同，可能在某些主题下产生色差

**建议修复**: 统一使用 SVG 图标或通过 CSS 类名统一样式策略。

---

#### UI-P1-03：触摸目标未达 48px 最小规范 — 移动端可访问性缺陷

```typescript
buttonProps: { 'aria-label': 'Insert Heading 4 (ctrl + 4)', title: 'Insert Heading 4 (ctrl + 4)' }
// 注意：无 style 或 className 指定按钮尺寸
```

**UI 问题分析**:

DESIGN.md 明确规定触摸目标最小 48px：

> Carbon spec: 48px minimum tap target. Buttons and inputs hold 48px on touch viewports.

`heading4` 的 `buttonProps` 未包含任何尺寸相关属性（`width`、`height`、`minHeight`、`padding`）。按钮的实际尺寸完全取决于 `@uiw/react-md-editor` 工具栏的 CSS 实现。

**风险**: 如果工具栏 CSS 未为按钮设置最小 48px 触摸区域，移动端用户点击 heading4 按钮时将面临：
1. 触控困难——按钮太小，容易误触相邻按钮
2. WCAG 2.1 §2.5.8 Target Size (Enhanced) 不合规
3. 在 Carbon Design System 审计中会被标记为 Critical

**建议修复**: 在本项目的全局 CSS 中为编辑器工具栏按钮设置最小触摸尺寸：

```css
/* 确保 Markdown 编辑器工具栏按钮满足 48px 触摸目标 */
.w-md-editor-toolbar button,
.w-md-editor-toolbar [role="button"] {
  min-width: 48px;
  min-height: 48px;
}

@media (pointer: fine) {
  /* 桌面端鼠标指针可缩小为默认尺寸 */
  .w-md-editor-toolbar button,
  .w-md-editor-toolbar [role="button"] {
    min-width: unset;
    min-height: unset;
  }
}
```

---

### P2 — 中等问题（影响设计系统集成和开发体验）

#### UI-P2-01：HTML title 属性作为 tooltip 不可定制 — 交互体验降级

```typescript
buttonProps: { 'aria-label': 'Insert Heading 4 (ctrl + 4)', title: 'Insert Heading 4 (ctrl + 4)' }
```

**UI 问题分析**:

1. **原生 title tooltip 的局限**:
   - 延迟显示（通常 500-1000ms），不符合现代 UI 的即时反馈预期
   - 样式完全由操作系统/浏览器控制，无法匹配 Carbon 或 antd 的 tooltip 样式
   - 在移动设备上不可用（无 hover 状态）
   - 不支持富文本（无法显示快捷键为 `kbd` 标签样式）

2. **与 antd Tooltip 的差距**: antd 的 `Tooltip` 组件提供：
   - 可定制的主题和样式
   - 精确的出现/消失动画
   - 支持放置位置（top/bottom/left/right）
   - 移动端长按触发
   - `ConfigProvider` 主题一致性

3. **与 Carbon Design System 的差距**: Carbon 的 Tooltip 组件提供：
   - 交互式和只读两种模式
   - 焦点管理和键盘导航
   - 可定制的触发图标

**建议修复**: 在本项目的编辑器封装层使用 antd Tooltip 覆盖原生 title：

```tsx
import { Tooltip } from 'antd';

const ToolbarButton = ({ command, children }) => (
  <Tooltip title={`${command.name} (${command.shortcuts})`} placement="bottom">
    <button {...command.buttonProps}>{children}</button>
  </Tooltip>
);
```

---

#### UI-P2-02：aria-label 和 title 硬编码英文 — 不支持国际化

```typescript
buttonProps: {
  'aria-label': 'Insert Heading 4 (ctrl + 4)',
  title: 'Insert Heading 4 (ctrl + 4)'
}
```

**UI 问题分析**:

1. **项目面向中文用户**: CLAUDE.md 要求时间格式化为中国时区，但工具栏提示文本仍为英文
2. **aria-label 是屏幕阅读器的语音播报内容**: 中文用户使用屏幕阅读器时，将听到英文 "Insert Heading Four Control Plus Four"，语义不友好
3. **title tooltip 对中文用户可读性差**: 悬停提示为英文 "Insert Heading 4 (ctrl + 4)"，不符合项目语言规范

**建议修复**:

```typescript
// 通过 i18n 配置注入中文文本
buttonProps: {
  'aria-label': t('editor.heading4.ariaLabel', '插入四级标题 (Ctrl + 4)'),
  title: t('editor.heading4.title', '插入四级标题 (Ctrl + 4)')
}
```

---

#### UI-P2-03：fontSize 递减序列非等差 — 视觉层级逻辑不统一

```typescript
// 六个标题命令的 fontSize 对比：
heading1: fontSize: 18  // 级差: —
heading2: fontSize: 16  // 级差: -2
heading3: fontSize: 15  // 级差: -1
heading4: fontSize: 14  // 级差: -1    ← 本文件
heading5: fontSize: 12  // 级差: -2
heading6: fontSize: 11  // 级差: -1
```

**UI 问题分析**:

等差递减（每级 -2）预期为 `18, 16, 14, 12, 10, 8`，但实际为 `18, 16, 15, 14, 12, 11`。

这个非等差序列可能是有意为之——避免低级别字号过小（10px、8px 在工具栏中几乎不可读），但：

1. **缺乏设计意图文档**: 没有注释说明为什么 H3-H4 用 -1 递减而 H2-H3、H4-H5 用 -2
2. **与 DESIGN.md 排版 token 不对齐**: DESIGN.md 定义的字号阶梯为 76/60/42/32/24/20/18/16/14/12px（约 0.75-0.8 倍递减），而工具栏的递减模式完全不同
3. **视觉层级感知不一致**: -2、-1、-1、-2、-1 的不规则变化可能导致用户感知到的标题级别差异不均匀

**对本文件的影响**: heading4 的 14px 恰好位于 DESIGN.md `body-sm` token 上，属于"合理的巧合"。但作为系统性问题，整个 fontSize 序列应重新设计。

---

#### UI-P2-04：快捷键 Ctrl+4 与浏览器标签页切换冲突

```typescript
shortcuts: 'ctrlcmd+4',
```

**UI 问题分析**:

1. **浏览器默认行为**: `Ctrl+4`（Windows/Linux）或 `Cmd+4`（macOS）是"切换到第四个标签页"的浏览器快捷键
2. **冲突处理**: 编辑器需要在快捷键处理中调用 `event.preventDefault()` 来拦截浏览器默认行为
3. **用户预期冲突**: 用户可能习惯使用 Ctrl+4 切换标签页，在编辑器焦点内意外触发标题插入
4. **反馈缺失**: 如果 `preventDefault` 未被正确调用，用户按下 Ctrl+4 会同时插入标题前缀并切换标签页——这是一种"双重操作"的用户体验灾难

**DESIGN.md 视角**: Carbon Design System 的键盘交互规范要求快捷键不与平台/浏览器默认行为冲突。如果冲突不可避免，应在 UI 中明确提示（如 tooltip 中标注"仅编辑器焦点内生效"）。

**建议**: 在 tooltip 中添加上下文说明：

```
"插入四级标题（编辑器内 Ctrl+4）"
```

---

### P3 — 轻微问题（UI 品质与交互细节）

#### UI-P3-01：`textAlign: 'left'` 在工具栏上下文中可能不合适

```typescript
icon: <div style={{ fontSize: 14, textAlign: 'left' }}>Heading 4</div>
```

**分析**: 工具栏按钮通常是居中布局。`textAlign: 'left'` 使 "Heading 4" 文本左对齐，可能在某些工具栏布局中显得不协调。如果工具栏按钮宽度固定，左对齐的文本会与居中对齐的图标按钮（bold、italic 等）产生视觉偏移。

#### UI-P3-02：缺少 hover/active/focus 视觉状态定义

```typescript
buttonProps: { 'aria-label': '...', title: '...' }
// 无 hover/active/focus 状态样式
```

**分析**: 按钮的视觉反馈（hover 背景色、active 按下态、focus 焦点环）完全依赖工具栏的 CSS 实现。`heading4` 的 `buttonProps` 不包含任何状态相关属性。如果工具栏 CSS 未为按钮定义这些状态，用户将无法通过视觉反馈判断：
- 鼠标是否悬停在按钮上（hover）
- 按钮是否被按下（active）
- 按钮是否获得键盘焦点（focus）

DESIGN.md 的焦点规范要求：`2px {colors.primary} outline + 1px {colors.hairline-strong} underline`。

#### UI-P3-03：六个标题按钮在工具栏中的视觉区分度不足

**分析**: 标题工具栏通常将 H1-H6 放入一个下拉菜单（通过 `title.tsx` 的 `heading` 命令实现分组），但下拉菜单展开后六个选项的视觉区分完全依赖 fontSize 差异。当 H5(12px) 和 H6(11px) 的差异仅为 1px 时，用户几乎无法通过视觉区分。

---

## 六、与同族文件的横向 UI 对比

| 检查项 | heading1 | heading2 | heading3 | heading4 | heading5 | heading6 | 一致性 |
|---|---|---|---|---|---|---|---|
| 内联 style | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| role="img" | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| aria-hidden | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| aria-label 格式 | 标准 | 标准 | 标准 | 标准 | 标准 | 标准 | ✅ |
| fontSize | 18 | 16 | 15 | 14 | 12 | 11 | ⚠️ 非等差 |
| 图标风格 | 文本 div | 文本 div | 文本 div | 文本 div | 文本 div | 文本 div | ✅ |
| ?? 防御性默认值 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 七、与 antd 集成兼容性分析

| antd 交互模式 | heading4 兼容性 | 说明 |
|---|---|---|
| `ConfigProvider` 主题 | ❌ 不受影响 | 内联样式绕过 antd token 系统 |
| `Tooltip` 组件 | ❌ 不使用 | 使用原生 HTML title 属性 |
| `Button` 组件 | ❌ 不使用 | 使用原生 `<div>` 渲染 |
| 国际化 `ConfigProvider.locale` | ❌ 不支持 | aria-label/title 硬编码英文 |
| 暗色主题 | ❌ 不适配 | 未指定颜色，依赖外部 CSS |
| `theme` token 覆盖 | ❌ 不生效 | 内联样式优先级最高 |

---

## 八、改进建议汇总

| 优先级 | 编号 | 建议 | 工作量 | UI 收益 |
|---|---|---|---|---|
| P1 | UI-P1-01 | 内联样式改为 CSS 类名 + DESIGN.md 变量 | 中 | 主题化合规 |
| P1 | UI-P1-02 | 统一图标风格（SVG 或统一样式策略） | 大 | 视觉一致性 |
| P1 | UI-P1-03 | 工具栏按钮补充 48px 触摸目标 | 小 | 移动端可用性 |
| P2 | UI-P2-01 | 用 antd Tooltip 替代原生 title | 中 | 交互体验提升 |
| P2 | UI-P2-02 | aria-label/title 国际化支持 | 中 | 中文用户友好 |
| P2 | UI-P2-03 | fontSize 递减序列规范化 | 小 | 视觉层级一致性 |
| P2 | UI-P2-04 | 快捷键冲突提示 | 小 | 用户预期管理 |
| P3 | UI-P3-01 | 评估 textAlign:'left' 的必要性 | 小 | 布局一致性 |
| P3 | UI-P3-02 | 补充 hover/active/focus 视觉状态 | 小 | 交互反馈 |
| P3 | UI-P3-03 | 改善 H5/H6 的视觉区分度 | 小 | 可用性 |

---

## 九、对本项目（by_geo）的集成建议

由于 `title4.tsx` 属于第三方库内部实现，无法直接修改。建议在本项目中采取以下策略补偿 UI 缺陷：

### 9.1 全局 CSS 补偿（最低成本，立即可行）

```css
/* global.css — 编辑器工具栏 DESIGN.md 合规补偿 */

/* 工具栏按钮基础样式对齐 Carbon Design System */
.w-md-editor-toolbar button {
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: var(--font-size-body-sm, 14px);
  font-weight: var(--font-weight-body, 400);
  letter-spacing: 0.16px;
  color: var(--color-ink, #161616);
  border-radius: 0; /* Carbon: rounded.none */
  transition: background-color 110ms ease; /* Carbon 过渡时间 */
}

/* Hover 状态 */
.w-md-editor-toolbar button:hover {
  background-color: var(--color-surface-1, #f4f4f4);
}

/* Active/Pressed 状态 */
.w-md-editor-toolbar button:active {
  background-color: var(--color-surface-2, #e0e0e0);
}

/* Focus 状态 — Carbon 签名式 2px 蓝色描边 */
.w-md-editor-toolbar button:focus-visible {
  outline: 2px solid var(--color-primary, #0f62fe);
  outline-offset: -2px;
}

/* 触摸设备最小 48px 目标 */
@media (pointer: coarse) {
  .w-md-editor-toolbar button {
    min-width: 48px;
    min-height: 48px;
  }
}
```

### 9.2 工具栏标题按钮中文本地化（可选）

```css
/* 通过 CSS content 属性替换英文文本为中文 */
.w-md-editor-toolbar button[data-heading="4"] .wmd-button-icon::after {
  content: '标题4';
}
```

---

## 十、评审总结

`title4.tsx`（patched 版本）作为 Markdown 编辑器工具栏按钮的命令定义，从 UI 专家视角审视，暴露了以下核心问题：

1. **最严重的 UI 缺陷**: 内联样式硬编码 fontSize（UI-P1-01）——无法被 DESIGN.md 的 CSS 变量/Carbon token 系统覆盖，将按钮排除在主题化之外
2. **最影响视觉一致性的问题**: 纯文本 div 与 SVG 图标风格割裂（UI-P1-02）——工具栏中一半按钮是矢量图标，一半是文字，视觉节奏被打破
3. **最影响移动端的问题**: 触摸目标未达 48px 最小规范（UI-P1-03）——移动端用户操作困难
4. **最影响项目合规的问题**: 完全绕过 antd 组件体系——使用原生 `<div>` + 内联样式，违反 CLAUDE.md 铁律

**积极方面**: patched 版本已通过 `role="img"` + `aria-hidden="true"` 修复了屏幕阅读器无障碍问题；`??` 防御性默认值替代了不安全的 `!` 非空断言；`aria-label` 和 `title` 属性提供了基本的交互提示。

**综合评分 4.3/10** — 功能可用但 UI 品质不足。作为第三方库的内部实现，这些问题需要通过本项目的全局 CSS 封装层来补偿。建议优先实施 9.1 节的 CSS 补偿方案（工作量小、收益高），将编辑器工具栏的视觉风格拉齐到 DESIGN.md 规范。

---

## 十一、修复记录（2026-05-25）

基于本评审报告，已完成以下修复：

### patch 文件修复（`patches/@uiw__react-md-editor@4.1.0.patch`）

| 评审编号 | 问题 | 修复内容 |
|---|---|---|
| UI-P1-01 | 内联样式硬编码 fontSize | 移除 `style={{ fontSize: 14, textAlign: 'left' }}`，改为 `className="wmd-button-icon" data-heading="4"`，样式由 CSS 类驱动 |
| UI-P2-02 | aria-label/title 硬编码英文 | 改为 `'插入四级标题 (Ctrl + 4)'`；icon 文本改为 `标题4` |
| UI-P3-01 | textAlign:'left' 不合适 | 随内联样式一并移除，改为 CSS `text-align: center` |

### 项目 CSS 补偿修复（`pages/styles/global.css`）

| 评审编号 | 问题 | 修复内容 |
|---|---|---|
| UI-P1-03 | 触摸目标未达 48px | `@media (pointer: coarse)` 下设置 `min-width/min-height: 48px` |
| UI-P3-02 | 缺少 hover/active/focus 视觉状态 | 添加 `:hover`(surface-1)、`:active`(surface-2)、`:focus-visible`(2px primary outline) 状态样式 |
| — | 工具栏按钮 DESIGN.md 合规 | 添加 font-family/font-weight/letter-spacing/color/border-radius 全量 token 样式 |
| — | 标题按钮图标 token 驱动 | `.wmd-button-icon[data-heading="4"]` 使用 `var(--font-size-body-sm, 14px)` |

### 未修复项（原因说明）

| 评审编号 | 原因 |
|---|---|
| UI-P1-02 | 图标风格统一（SVG vs 文本 div）属于系统性问题，需修改 title1-6 全部文件，超出单文件修复范围 |
| UI-P2-01 | antd Tooltip 替代原生 title 需修改编辑器封装组件，涉及面较广 |
| UI-P2-03 | fontSize 递减序列规范化需同步修改 title1-6 全部文件 |
| UI-P2-04 | 快捷键冲突需在编辑器事件处理层拦截，非命令定义层面可控 |
| UI-P3-03 | H5/H6 视觉区分度依赖 fontSize 全局重设计 |

---

*软件UI专家评审完成 — 2026-05-25*
*修复实施完成 — 2026-05-25*
