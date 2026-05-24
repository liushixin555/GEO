# help.tsx — 软件 UI 专家评审

> **文件**: `@uiw/react-md-editor/src/commands/help.tsx`
> **评审人**: 软件 UI 专家
> **日期**: 2026-05-25
> **评分**: **5.0 / 10** — CONDITIONAL APPROVE

---

## 评审摘要

help.tsx 定义了 Markdown 编辑器工具栏中的"帮助"按钮命令，使用 SVG 问号图标 + `window.open` 打开外部 Markdown 语法参考页面。代码结构简洁，命令模式（ICommand）接口遵循规范。但在 **触摸目标尺寸、点击反馈、安全性、可配置性** 方面存在多项 UI/UX 缺陷，不完全符合 DESIGN.md（Carbon Design System）和 antd 组件规范。

---

## 发现问题

### H-1：SVG 图标尺寸 12×12px 严重违反 Carbon 触摸目标规范

**严重性**: High | **行号**: 9

```tsx
<svg viewBox="0 0 16 16" width="12px" height="12px">
```

DESIGN.md 明确规定：Carbon spec 要求 **48px 最小触摸目标（minimum tap target）**，按钮和输入框在触摸视口必须保持 48px 高度。当前 12×12px 的图标远低于此标准：

- 12px 仅为规范的 **25%**，在移动设备上几乎无法准确点击
- 无外部 padding 包裹来补偿触摸区域（依赖父容器的 buttonProps）
- 使用固定 `px` 而非相对单位（`rem`/`em`），无法随用户字体偏好缩放
- Carbon 的按钮规范 padding 为 `12px 16px`，隐含图标区域应 ≥ 20px

**建议**: 图标至少使用 `width="16" height="16"` 或 `1em`，父按钮容器确保 48×48px 触摸热区。

---

### H-2：`window.open` 缺少 `noopener`，存在反向标签劫持风险

**严重性**: High | **行号**: 17

```tsx
window.open('https://www.markdownguide.org/basic-syntax/', '_blank', 'noreferrer');
```

`window.open` 的第三个参数是 `windowFeatures` 字符串。当前仅写了 `'noreferrer'`，但 **缺少 `noopener`**：

- 打开的新窗口可通过 `window.opener` 访问原始页面，攻击者可利用 `opener.location` 进行反向标签劫持（reverse tabnapping）
- `noreferrer` 仅控制 HTTP Referer 头，不等同于 `noopener`（切断 opener 引用）
- 正确写法应为 `'noopener,noreferrer'`

**建议**: 修改为 `window.open(url, '_blank', 'noopener,noreferrer')`。

---

### M-1：按钮点击后无任何视觉/交互反馈

**严重性**: Medium | **行号**: 16-18

```tsx
execute: () => {
  window.open('https://www.markdownguide.org/basic-syntax/', '_blank', 'noreferrer');
},
```

点击帮助按钮后：

- 无 loading 状态指示（按钮无短暂视觉变化）
- 无 tooltip / Toast 通知告知用户"已在新标签页打开帮助文档"
- 若弹出窗口被浏览器拦截，用户得不到任何失败提示
- antd 的 `message.success()` 或 `notification.open()` 是标准的反馈机制，此处完全缺失

**DESIGN.md 关联**: Carbon Design System 的交互规范要求所有用户操作必须有明确的反馈响应。

**建议**: 添加 `message.info('已在新标签页打开帮助文档')` 或检测 `window.open` 返回值为 null 时提示用户。

---

### M-2：外部 URL 硬编码，零可配置性

**严重性**: Medium | **行号**: 17

```tsx
window.open('https://www.markdownguide.org/basic-syntax/', '_blank', 'noreferrer');
```

- URL `https://www.markdownguide.org/basic-syntax/` 直接硬编码在 `execute` 函数中
- 无法通过 props、context 或配置文件覆盖目标地址
- 如果目标站点 URL 变更或需要指向内部文档，必须修改源码
- ICommand 接口定义的 `execute` 签名不支持参数传递目标 URL

**建议**: 通过 ICommand 扩展或 React Context 支持自定义帮助 URL，或至少将 URL 提取为模块级常量。

---

### M-3：弹窗被拦截时无降级处理

**严重性**: Medium | **行号**: 16-18

```tsx
execute: () => {
  window.open(...);
},
```

- 现代浏览器默认拦截非用户直接触发（或异步回调中）的 `window.open`
- 代码未检查 `window.open` 返回值（返回 `null` 表示被拦截）
- 用户点击后无反应，无法区分"已打开但未注意"和"被拦截了"

**建议**:

```tsx
execute: () => {
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    // 降级方案：使用 antd notification 提示用户
    notification.warning({ message: '弹窗被浏览器拦截，请允许弹出窗口或手动访问帮助页面' });
  }
};
```

---

### M-4：无外部链接视觉标识

**severity**: Medium | **行号**: 8-15

当前帮助按钮仅显示一个 `?` 问号图标，用户无法预判点击行为：

- 不知道点击后会打开外部网站（而非弹出一个帮助面板/抽屉）
- 不知道会在新标签页打开（而非当前页面跳转）
- Carbon Design System 的链接规范要求外部链接应有视觉区分标识
- antd 的 `Typography.Link` 提供了 `target="_blank"` 时自动显示外部链接图标的能力

**建议**: 在 icon 中叠加一个小的"外部链接"标识，或在 hover tooltip 中注明"在新标签页打开外部帮助文档"。

---

### L-1：SVG 使用固定像素尺寸，不支持主题缩放

**严重性**: Low | **行号**: 9

```tsx
width="12px" height="12px"
```

- Carbon 的图标系统使用 `em` 相对单位以支持缩放
- 固定 `px` 在高 DPI 屏幕或用户放大浏览器时可能模糊
- 建议使用 `width="1em" height="1em"` 或 CSS `currentColor` 配合 `font-size` 控制

---

### L-2：`buttonProps` 的 `title` 与 `aria-label` 文案相同但不含操作结果描述

**严重性**: Low | **行号**: 7

```tsx
buttonProps: { 'aria-label': 'Open help', title: 'Open help' },
```

- `title` 和 `aria-label` 内容一致是正确的（避免信息不一致）
- 但文案 `"Open help"` 未告知用户将打开外部网站
- 更好的文案：`'Open Markdown syntax guide (external link)'`

---

## 评审维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| **DESIGN.md 合规性** | 3/10 | 图标尺寸、触摸目标、交互反馈均不符合 Carbon 规范 |
| **antd 组件规范** | 2/10 | 完全未使用 antd 组件（Button/Tooltip/Notification），纯原生实现 |
| **可访问性 (a11y)** | 6/10 | 有 aria-label 和 title，但触摸目标过小、缺少键盘快捷键 |
| **交互体验 (UX)** | 4/10 | 无点击反馈、无弹窗拦截处理、无外部链接标识 |
| **安全性** | 5/10 | 缺少 noopener，存在反向标签劫持风险 |
| **可维护性** | 6/10 | 代码简洁、接口清晰，但 URL 硬编码影响可配置性 |

---

## 问题汇总

| 编号 | 严重性 | 问题描述 | 行号 |
|------|--------|----------|------|
| H-1 | High | SVG 图标 12×12px 远低于 Carbon 48px 最小触摸目标 | 9 |
| H-2 | High | window.open 缺少 noopener，反向标签劫持风险 | 17 |
| M-1 | Medium | 按钮点击后无任何视觉/交互反馈 | 16-18 |
| M-2 | Medium | 外部 URL 硬编码，零可配置性 | 17 |
| M-3 | Medium | 弹窗被浏览器拦截时无降级处理 | 16-18 |
| M-4 | Medium | 无外部链接视觉标识，用户无法预判点击行为 | 8-15 |
| L-1 | Low | SVG 固定像素尺寸，不支持主题缩放 | 9 |
| L-2 | Low | aria-label/title 文案未说明打开外部链接 | 7 |

---

## 综合评分：5.0 / 10 — CONDITIONAL APPROVE

**必须修复（阻断发布）**:
- H-1: 增大图标/触摸热区至 ≥ 48px 或确保父容器满足要求
- H-2: 添加 `noopener` 到 window.open 的 windowFeatures

**建议修复（下一迭代）**:
- M-1 ~ M-4: 添加点击反馈、URL 可配置、弹窗拦截降级、外部链接标识

**可选优化**:
- L-1 ~ L-2: 相对单位、更完善的 aria 文案
