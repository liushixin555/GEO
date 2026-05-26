# MarkdownViewer.tsx — 软件UI专家评审

**文件**: `pages/components/MarkdownViewer.tsx` (389行) + `pages/styles/markdown-viewer.css` (646行)
**评审日期**: 2026-05-26
**评审类型**: UI/UX 评审（User Interface & User Experience Review）
**评审基线**: DESIGN.md (IBM Carbon Design System) + Ant Design (antd) 5.x + WCAG 2.1 AA

---

## 综合评分：7.0/10 — CONDITIONAL APPROVE

0 项 CRITICAL，3 项 HIGH，5 项 MEDIUM，3 项 LOW。CSS 样式层对 Carbon Design System 的遵从度较高——border-radius: 0 全局覆盖、IBM Plex 字体族、CSS 变量 Token 映射、Carbon 色板语法高亮、响应式断点对齐 Carbon（1056px / 672px）、48px 触控目标、2px primary 色聚焦环——暗色模式完整实现 Carbon Gray-100 变量。主要扣分点：(1) 基础字号 15px / 行高 1.8 偏离 DESIGN.md body token 16px / 1.50；(2) 标题 font-weight 600 偏离 Carbon display weight 300 品牌签名；(3) Loading/Empty/Error 三态未使用 antd Skeleton/Result 组件，视觉规范不符。

---

## 一、评审维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| DESIGN.md / Carbon 合规性 | 7.5/10 | 圆角/色板/间距/响应式/触控目标优秀；字号/字重/行高偏离 Token |
| Ant Design 组件使用 | 5.5/10 | Spin/Typography/Empty 三态组件用法最简化，未使用 Skeleton/Result |
| 色彩与对比度 | 8.0/10 | CSS 变量映射 Carbon Token 完整；暗色模式链接 hover 对比度不足 |
| 排版与字体 | 6.5/10 | 字体族正确（IBM Plex Sans/Mono）；基础字号 15px / 行高 1.8 / 标题字重 600 三项偏离 |
| 布局与间距 | 8.0/10 | 4px 网格对齐；padding 使用 spacing token；响应式递减合理 |
| 形状与圆角 | 9.5/10 | 全局 border-radius: 0 严格遵从 Carbon flat-square 美学 |
| 交互反馈 | 7.5/10 | 复制按钮三态视觉完整；锚点 hover 渐显；Loading 缺 Skeleton 骨架 |
| 可访问性 (a11y) | 8.0/10 | ARIA 属性完备；键盘支持；焦点管理；Loading/Empty 缺无障碍标注 |
| 响应式设计 | 8.5/10 | 双断点对齐 Carbon；字号/间距递减；移动端代码块渐变遮罩 |
| 暗色模式 | 8.0/10 | Carbon Gray-100 变量覆盖完整；个别 hover 对比度不足 |

---

## 二、Carbon Design System 合规性逐项检查

### 2.1 通过项 (PASS)

| 检查项 | CSS 规则 | DESIGN.md Token | 状态 |
|--------|----------|-----------------|------|
| 圆角 border-radius: 0 | 全局覆盖 `.wmde-markdown`、`pre`、`table`、`blockquote`、`.copied`、`.markdown-alert` | `{rounded.none}` 0px | PASS |
| 字体族 IBM Plex Sans | `font-family: var(--font-family)` | IBM Plex Sans | PASS |
| 代码字体 IBM Plex Mono | `font-family: 'IBM Plex Mono', 'IBM Plex Sans', monospace` | IBM Plex Mono | PASS |
| letter-spacing: 0.16px | `letter-spacing: 0.16px` | Carbon precision detail | PASS |
| 主色 #0f62fe | `var(--color-primary)` 用于链接/blockquote 边框/聚焦环 | `{colors.primary}` | PASS |
| 色板 surface-1 #f4f4f4 | `var(--color-surface-1)` 用于 blockquote 背景/表头 | `{colors.surface-1}` | PASS |
| ink #161616 文字色 | `var(--color-ink)` 用于正文/标题 | `{colors.ink}` | PASS |
| ink-muted #525252 | `var(--color-ink-muted)` 用于 blockquote 文字 | `{colors.ink-muted}` | PASS |
| 聚焦环 2px primary | `outline: 2px solid var(--color-primary); outline-offset: 2px` | Carbon focus ring | PASS |
| 触控目标 48px | `.copied { min-width: 48px; min-height: 48px }` `.anchor { padding: 16px; margin: -16px }` | Carbon 48px min | PASS |
| 响应式断点 | `@media (max-width: 1056px)` + `@media (max-width: 672px)` | Carbon Tablet/Desktop | PASS |
| 暗色模式 Gray-100 | `[data-color-mode="dark"]` 全量覆盖 | Carbon Gray-100 theme | PASS |
| 代码块背景 #161616 | `var(--color-inverse-canvas)` | `{colors.inverse-canvas}` | PASS |
| 滚动边距 scroll-margin-top: 56px | 标题锚点跳转不被 48px 导航栏遮挡 | top-nav height 48px + 8px | PASS |

### 2.2 偏离项 (DEVIATION)

| 检查项 | CSS 实际值 | DESIGN.md Token | 偏离程度 | 编号 |
|--------|-----------|-----------------|----------|------|
| 基础字号 | 15px | body 16px | -1px | H-01 |
| 行高 | 1.8 | body 1.50 | +0.30 | H-01 |
| 标题字重 | 600 | display weight 300 / headline 400 | 严重偏离 | H-02 |
| Loading 状态 | `<Spin />` 居中 | Carbon Skeleton 模式 | 缺失 | H-03 |

---

## 三、问题清单

### HIGH (3 项)

#### H-01: 基础排版参数偏离 DESIGN.md body Token

**位置**: `markdown-viewer.css:28-30`

```css
font-size: 15px !important;   /* DESIGN.md body = 16px */
line-height: 1.8 !important;  /* DESIGN.md body = 1.50 */
```

**偏离分析**:
- 字号 15px vs DESIGN.md `{typography.body}` 16px — 偏小 1px，长文本阅读体验稍差
- 行高 1.8 vs DESIGN.md body 1.50 — 偏大 0.30，段落间距过于松散，与 Carbon "content is dense by design" 的设计哲学矛盾
- 两者叠加导致每屏可读内容量减少约 20%，信息密度低于 Carbon 规范

**修复方案**:
```css
font-size: 16px !important;
line-height: 1.50 !important;
```

---

#### H-02: 标题 font-weight 600 偏离 Carbon display weight 300 品牌签名

**位置**: `markdown-viewer.css:61`

```css
font-weight: 600 !important;
```

**偏离分析**:
- DESIGN.md 明确说明："**Light-weight display is the brand voice.** Plex Sans at weight 300 for 76px headlines reads as quietly authoritative — switching to 700 would make it look like every other enterprise site."
- 所有 h1-h6 统一使用 weight 600，完全偏离 Carbon 的轻量级标题品牌特征
- 在 display 尺寸（h1=1.75em≈26px）上使用 600 weight，视觉上显得过于粗重
- 正确做法：display 级标题(h1-h2)使用 weight 300，headline 级(h3-h4)使用 weight 400

**修复方案**:
```css
/* h1-h2: display level — weight 300 (Carbon 品牌签名) */
.markdown-viewer .wmde-markdown h1,
.markdown-viewer .wmde-markdown h2 { font-weight: 300 !important; }

/* h3-h6: headline level — weight 400 */
.markdown-viewer .wmde-markdown h3,
.markdown-viewer .wmde-markdown h4,
.markdown-viewer .wmde-markdown h5,
.markdown-viewer .wmde-markdown h6 { font-weight: 400 !important; }
```

---

#### H-03: Loading/Empty/Error 三态缺少 antd 组件规范使用

**位置**: `MarkdownViewer.tsx:340-355`

```tsx
// Loading — 裸 Spin 居中，无 Skeleton 骨架预览
if (loading) {
  return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <Spin />
    </div>
  );
}

// Error — 纯文本，无图标/容器/重试操作
if (error) {
  return <Typography.Text type="danger">{error}</Typography.Text>;
}

// Empty — antd Empty 默认插图，无 Carbon 风格定制
if (!content) {
  return <Empty description={emptyText} />;
}
```

**问题分析**:
- **Loading**: `<Spin />` 没有提供内容布局预览，用户无法预期加载后的页面结构。Carbon/antd 规范使用 `<Skeleton>` 提供布局占位。inline style `padding: 48` 也应使用 antd `Space` 或 `Flex`
- **Error**: 裸 `<Typography.Text type="danger">` 没有视觉容器、没有图标、没有重试操作。应使用 antd `<Result status="error">` 或至少 `<Alert type="error">`
- **Empty**: `<Empty>` 使用 antd 默认空状态插图，与 Carbon flat-square 美学不一致。应通过 `image` prop 自定义或使用 `Empty.PRESENTED_IMAGE_SIMPLE`
- **CLAUDE.md 铁律**: "前端必须使用 Ant Design (antd) 组件" — 三态处理未充分利用 antd 的 Result/Skeleton/Alert 组件

**修复方案**:
```tsx
// Loading — Skeleton 骨架
if (loading) {
  return <Skeleton active paragraph={{ rows: 8 }} />;
}

// Error — Alert 组件
if (error) {
  return <Alert type="error" message={error} showIcon />;
}

// Empty — 简约插图
if (!content) {
  return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
}
```

---

### MEDIUM (5 项)

#### M-01: CSS `!important` 泛滥（646 行 CSS 中约 95% 使用 `!important`）

**位置**: `markdown-viewer.css` 全文件

**分析**:
- 几乎每条 CSS 声明都使用 `!important`，这是对 `@uiw/react-markdown-preview` 内联样式的防御性覆盖
- 虽然有实际原因（第三方组件优先级高），但导致：(1) 无法通过任何更低优先级方式自定义样式；(2) 未来升级第三方组件时无法判断哪些覆盖仍然需要；(3) 维护困难

**建议**: 考虑使用 CSS Layer（`@layer`）或更高优先级选择器替代部分 `!important`，或至少在注释中标注哪些 `!important` 是必要的防御性覆盖。

---

#### M-02: 暗色模式链接 hover 颜色对比度不足

**位置**: `markdown-viewer.css:574-577`

```css
.markdown-viewer .wmde-markdown[data-color-mode="dark"] a:hover {
  color: var(--color-primary) !important;  /* #0f62fe on #161616 */
}
```

**分析**:
- `#0f62fe`（IBM Blue）在 `#161616`（inverse-canvas）背景上对比度约 3.6:1，低于 WCAG AA 标准 4.5:1
- 暗色模式下非 hover 状态已正确使用 `#78a9ff`（对比度约 6.8:1），但 hover 反而降至不合规的蓝色
- 应与链接默认色保持一致使用 `#78a9ff`，或使用更亮的 `#a6c8ff`

**修复方案**:
```css
.markdown-viewer .wmde-markdown[data-color-mode="dark"] a:hover {
  color: #a6c8ff !important;  /* Carbon blue-20, 对比度 > 7:1 */
}
```

---

#### M-03: Loading 状态缺少 ARIA 标注

**位置**: `MarkdownViewer.tsx:340-346`

```tsx
<div style={{ textAlign: 'center', padding: 48 }}>
  <Spin />   {/* 无 aria-label, 无 role="status" */}
</div>
```

**分析**:
- `<Spin />` 未提供 `aria-label`，屏幕阅读器用户无法获知内容正在加载
- 容器 `<div>` 未标记 `role="status"` 和 `aria-live="polite"`，不符合 WCAG 4.1.3 Status Messages
- 主内容区已正确使用 `aria-live="polite"`，但 Loading 状态未延续此模式

**修复方案**:
```tsx
<div role="status" aria-live="polite" aria-label="内容加载中" style={{ textAlign: 'center', padding: 48 }}>
  <Spin tip="加载中..." />
</div>
```

---

#### M-04: 代码块滚动条仅覆盖 WebKit 内核

**位置**: `markdown-viewer.css:191-201`

```css
.markdown-viewer .wmde-markdown pre::-webkit-scrollbar { ... }
.markdown-viewer .wmde-markdown pre::-webkit-scrollbar-thumb { ... }
```

**分析**:
- `::-webkit-scrollbar` 仅在 Chromium/Safari 生效，Firefox 使用标准 scrollbar 样式
- Firefox 用户看到默认灰色宽滚动条，与 Carbon 极简风格不符
- 应补充 `scrollbar-width: thin; scrollbar-color:` 标准属性

**修复方案**:
```css
.markdown-viewer .wmde-markdown pre {
  scrollbar-width: thin;
  scrollbar-color: var(--color-inverse-ink-muted) var(--color-inverse-surface-1);
}
```

---

#### M-05: 复制按钮 SVG 图标使用 data URI 嵌入，维护性差

**位置**: `markdown-viewer.css:323, 342, 351, 493-505`

**分析**:
- 5 处 SVG 图标通过 `content: url("data:image/svg+xml,...")` 内联，单行 CSS 长达 300+ 字符
- 暗色模式需要重复定义白色 SVG 变体，导致图标逻辑冗余
- 修改图标颜色需要手动编辑 URL-encoded SVG，无法利用 CSS 变量
- 应考虑使用 `mask-image` + `background-color: currentColor` 模式实现 CSS 变量可控的图标

**建议**: 将 SVG 抽取为独立 CSS 类或使用 Carbon Icons 的 React 组件版本替代。

---

### LOW (3 项)

#### L-01: 表格 `display: block` 破坏原生表格布局语义

**位置**: `markdown-viewer.css:117`

```css
display: block !important;
overflow-x: auto !important;
```

**分析**:
- `display: block` 使 `<table>` 失去原生表格布局特性，部分屏幕阅读器可能无法正确识别表格结构
- 仅为实现水平滚动，更优方案是使用外层 `<div>` 包裹 `overflow-x: auto`，保持 `<table>` 的 `display: table`

**建议**: 在 `rehypeRewrite` 中为 `<table>` 外层包裹一个 `<div style="overflow-x: auto">` 容器，移除 table 的 `display: block`。

---

#### L-02: 缺少打印样式 (`@media print`)

**分析**:
- Markdown 内容是高概率被打印的文档类型（文章、技术文档）
- 当前无 `@media print` 规则，打印时可能出现：深色代码块背景浪费墨水、复制按钮不应出现在打印中、暗色模式变量干扰
- Carbon 文档推荐打印时使用 canvas 白色背景 + ink 黑色文字

**建议**:
```css
@media print {
  .markdown-viewer .wmde-markdown pre { background: transparent !important; color: var(--color-ink) !important; }
  .markdown-viewer .wmde-markdown .copied { display: none !important; }
  .markdown-viewer .wmde-markdown a::after { content: ' (' attr(href) ')'; }
}
```

---

#### L-03: 亮度计算未处理短 hex (#fff) 和 alpha 通道

**位置**: `MarkdownViewer.tsx:207-211`

```tsx
const hex = bg.replace('#', '');
const r = parseInt(hex.substring(0, 2), 16);
```

**分析**:
- 当前代码假设 hex 为 6 位格式（#rrggbb），若 antd token 返回 3 位简写（#fff）或 8 位带 alpha（#ffffffcc），解析结果不正确
- `colorBgBase` 在 antd 5.x 中通常返回 6 位格式，风险较低，但缺少防御处理

---

## 四、优秀实践（值得肯定）

### 4.1 Carbon flat-square 美学全面覆盖

所有组件——卡片边框、表格、代码块、blockquote、复制按钮、markdown-alert——均使用 `border-radius: 0`。这与 Carbon "every CTA, every card, every input, every container uses square corners (0px) with thin 1px borders" 的设计理念完全一致。

### 4.2 CSS 变量 Token 映射体系完整

```css
--color-fg-default: var(--color-ink);
--color-fg-muted: var(--color-ink-muted);
--color-canvas-default: var(--color-canvas);
--color-border-default: var(--color-hairline);
```

GitHub Markdown → Carbon Token 的变量映射建立了一套完整的翻译层，使第三方组件样式与项目设计系统保持一致。

### 4.3 暗色模式 Carbon Gray-100 完整实现

暗色模式覆盖了 8 个 CSS 类别（文字、标题、blockquote、代码、表格、链接、hr、滚动条），使用 Carbon Gray-100 色板（#161616 / #262626 / #525252 / #78a9ff），而非简单的 invert/filter。

### 4.4 48px 触控目标严格遵从

复制按钮和锚点链接均设置 48px 最小触控区域，符合 Carbon "48px minimum tap target" 规范和 WCAG 2.5.5 Target Size。

### 4.5 移动端代码块渐变遮罩提示

```css
/* R-01: 移动端代码块滚动渐变遮罩提示 */
background-image: linear-gradient(to right, transparent 85%, var(--color-inverse-canvas, #161616));
```

这是一个优秀的 UX 细节——在代码块右侧渐变淡出，暗示内容可横向滚动，避免用户认为内容被截断。

### 4.6 锚点图标 Carbon Link 替换

隐藏 GitHub Octicon 图标，替换为 Carbon Link 图标（SVG inline），保持品牌一致性。

---

## 五、DESIGN.md 合规性总览

| Carbon 原则 | 合规状态 | 备注 |
|-------------|---------|------|
| `{rounded.none}` 0px 圆角 | COMPLIANT | 全局覆盖 |
| IBM Plex Sans 字体族 | COMPLIANT | CSS 变量引用 |
| IBM Plex Mono 代码字体 | COMPLIANT | pre 标签专用 |
| `{colors.primary}` #0f62fe 单一强调色 | COMPLIANT | 链接/边框/聚焦环 |
| surface-1 / canvas 双表面节奏 | COMPLIANT | blockquote/表头 |
| 1px hairline 卡片边框 | COMPLIANT | 表格/代码块边框 |
| letter-spacing: 0.16px body | COMPLIANT | 正文精确字距 |
| weight 300 display 标题 | DEVIATED | 实际使用 600 |
| body 16px / 1.50 行高 | DEVIATED | 实际 15px / 1.8 |
| 48px 触控目标 | COMPLIANT | 按钮和锚点 |
| 2px primary 色聚焦环 | COMPLIANT | focus-visible |
| Carbon Gray-100 暗色模式 | COMPLIANT | 完整覆盖 |
| 无 drop shadow | COMPLIANT | 全局 box-shadow: none |
| sentence case 标签 | COMPLIANT | 无 all-caps |
| 4px 网格间距对齐 | COMPLIANT | padding 使用 spacing token |

**合规率**: 13/15 = 87%

---

## 六、修复优先级建议

| 优先级 | 编号 | 预期收益 |
|--------|------|----------|
| P0 | H-01 | 字号/行高回归 DESIGN.md Token，提升信息密度和阅读效率 |
| P0 | H-02 | 标题字重回归 Carbon weight 300/400，恢复品牌视觉签名 |
| P1 | H-03 | 三态使用 antd Skeleton/Alert/Result 组件，提升状态感知和视觉规范 |
| P1 | M-02 | 修复暗色模式链接 hover 对比度至 WCAG AA |
| P1 | M-03 | Loading 状态 ARIA 标注，屏幕阅读器可感知 |
| P2 | M-04 | Firefox 代码块滚动条样式 |
| P2 | M-01 | 逐步减少 `!important` 使用 |
| P3 | M-05 | SVG data URI 重构为可维护方案 |
| P3 | L-01~L-03 | 打印样式/表格语义/亮度边界 |

---

## 七、修复后预期评分

修复 H-01 + H-02 + H-03 后预期评分：**8.5/10 APPROVE**

主要提升点：
- 排版回归 Carbon Token → Typography 维度 6.5 → 9.0
- 三态组件规范使用 → Ant Design 维度 5.5 → 8.5
- 交互反馈维度 7.5 → 8.5
