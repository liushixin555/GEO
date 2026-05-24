# nohighlight.tsx — 软件 UI 专家评审报告

> **评审文件**: `node_modules/@uiw/react-markdown-preview/src/nohighlight.tsx`
> **评审维度**: DESIGN.md (IBM Carbon Design System)、antd 组件规范、UI/UX 最佳实践
> **评审日期**: 2026-05-24
> **评审结论**: ⚠️ **不合规** — 存在 5 项严重问题、3 项中等问题、2 项建议改进

---

## 一、文件概览

`nohighlight.tsx` 是 `@uiw/react-markdown-preview` 库的无语法高亮版本入口组件，核心职责：

1. 组装 rehype 插件链（`reservedMeta` → `retrieveMeta` → `defaultRehypePlugins` → `rehypeRewrite` → `rehypeAttrs` → 用户自定义插件）
2. 通过 `React.forwardRef` 暴露 `MarkdownPreviewRef`
3. 将组装好的插件链透传给 `<MarkdownPreview>` 渲染 Markdown 内容

**代码行数**: 23 行 | **组件类型**: `React.forwardRef` 包装组件 | **依赖层级**: 三方库 node_modules

---

## 二、严重问题（5 项）

### S-1. 字体体系与 DESIGN.md 完全冲突

| 维度 | DESIGN.md 规范 | 当前实现 |
|---|---|---|
| 字体族 | `IBM Plex Sans`（通过 `@fontsource/ibm-plex-sans` 本地加载） | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif` |
| 代码字体 | DESIGN.md 明确 "No mono on marketing surfaces" | `ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono` |
| letter-spacing | body 必须 `0.16px` | 无 tracking 设置 |
| 显示字重 | 42px+ 必须 weight 300 | 无 display 层级区分 |

**影响**: Markdown 预览区域的字体与页面其余部分形成明显视觉断层，用户一眼可感知"这是嵌入的外部组件"而非系统原生部分。

**修复建议**: 在项目的 `global.css` 中通过 `.wmde-markdown` CSS 选择器强制覆盖字体：
```css
.wmde-markdown {
  font-family: var(--font-family) !important;
  letter-spacing: 0.16px;
}
.wmde-markdown code,
.wmde-markdown pre {
  font-family: 'IBM Plex Mono', ui-monospace, monospace !important;
}
```

### S-2. 色彩变量体系与 Carbon Design System 不兼容

当前实现使用 GitHub 风格的 CSS 变量：
- `--color-fg-default` → Carbon 应为 `--color-ink` (#161616)
- `--color-fg-muted` → Carbon 应为 `--color-ink-muted` (#525252)
- `--color-canvas-default` → Carbon 应为 `--color-canvas` (#ffffff)
- `--color-border-default` → Carbon 应为 `--color-hairline` (#e0e0e0)

**影响**: 文本色、背景色、边框色均不符合 Carbon 规范，特别是在暗色主题切换时会出现色彩不一致。

**修复建议**: 在 `global.css` 中将 GitHub 变量映射为 Carbon 变量：
```css
.wmde-markdown {
  --color-fg-default: var(--color-ink);
  --color-fg-muted: var(--color-ink-muted);
  --color-fg-subtle: var(--color-ink-subtle);
  --color-canvas-default: var(--color-canvas);
  --color-canvas-subtle: var(--color-surface-1);
  --color-border-default: var(--color-hairline);
  --color-border-muted: var(--color-hairline);
}
```

### S-3. 圆角策略违反 Carbon "flat-square" 美学

DESIGN.md 明确规定：

> **Don't round corners on buttons, cards, or inputs. Even 4px rounded corners break the Carbon look.**

当前 Markdown 预览组件的内部元素（代码块、表格、引用块、警告框）可能带有默认圆角（GitHub 风格通常使用 `6px` 或 `border-radius: 6px`），与 Carbon 的 `0px` flat-square 规范直接冲突。

**影响**: 代码块、表格、按钮等元素的圆角与项目其余部分的方正风格形成视觉不一致。

**修复建议**:
```css
.wmde-markdown pre,
.wmde-markdown code,
.wmde-markdown table,
.wmde-markdown blockquote,
.wmde-markdown .markdown-alert {
  border-radius: 0 !important;
}
```

### S-4. 复制按钮未使用 antd Button 组件

当前实现使用自定义的 SVG 图标按钮（`.copied` class + `octicon-copy` / `octicon-check`），违反 CLAUDE.md 铁律：

> **前端必须使用 Ant Design (antd) 组件** — 禁止使用原生 HTML 元素替代 antd 提供的组件（Button 等）

**影响**: 复制按钮的 hover/active/focus 状态与项目其他 antd Button 的交互反馈不一致，包括：
- 缺少 antd Button 的 `--color-primary` 主题色
- 缺少 focus ring（Carbon 规范的 2px `--color-primary` outline）
- 无 keyboard navigation 支持（antd Button 内置）

**修复建议**: 在 `rehypeRewrite` 回调中替换默认复制按钮为 antd `Button`，或在 CSS 层面将 `.copied` 样式对齐至 antd Button 的外观。

### S-5. 暗色主题管理方式与项目不统一

`nohighlight.tsx` 通过 `wrapperElement` 的 `data-color-mode` 属性管理暗色主题，使用 `prefers-color-scheme` 媒体查询。这与项目的主题管理方式不一致：

- 项目通过 CSS 变量（`--color-inverse-canvas` 等）定义暗色值
- 项目全局使用 IBM Carbon 的 surface 层级系统
- Markdown 预览组件会引入独立的暗色变量体系

**影响**: 当项目未来引入暗色模式时，Markdown 区域需要独立维护一套暗色变量映射，增加维护成本和视觉不一致风险。

**修复建议**: 统一使用项目的 CSS 变量体系，将 `.wmde-markdown` 的暗色变量映射到项目的 `--color-inverse-*` 变量。

---

## 三、中等问题（3 项）

### M-1. 间距体系不符合 Carbon 4px 网格

| 元素 | Carbon 规范 | 当前实现 |
|---|---|---|
| 段落间距 | `spacing.md` (16px) 的倍数 | GitHub 风格的 `1em` ≈ 16px（近似但不精确） |
| 代码块内边距 | `spacing.md` (16px) | `16px`（偶合） |
| 标题上方间距 | `spacing.lg` (24px) | `24px`（偶合） |
| 列表项间距 | `spacing.xs` (8px) | `0.25em` ≈ 4px（偏小） |

列表项间距偏小可能导致中文内容（字数较多、行高较大）显得拥挤。

**修复建议**: 在 CSS 覆盖中对齐 Carbon spacing token：
```css
.wmde-markdown ul li,
.wmde-markdown ol li {
  margin-bottom: var(--spacing-xs); /* 8px */
}
```

### M-2. 链接样式不符合 Carbon 规范

| 维度 | Carbon 规范 | 当前实现 |
|---|---|---|
| 链接色 | `--color-primary` (#0f62fe) | GitHub 蓝 `#0969da` |
| hover 色 | `--color-blue-60` (#0043ce) | `#0550ae` |
| 下划线 | Carbon 通常不使用下划线 | GitHub 风格默认有下划线 |
| focus ring | 2px `--color-primary` outline | 无明确 focus ring |

**修复建议**:
```css
.wmde-markdown a {
  color: var(--color-primary);
  text-decoration: none;
}
.wmde-markdown a:hover {
  color: var(--color-blue-60);
  text-decoration: underline;
}
.wmde-markdown a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### M-3. 表格样式缺少 Carbon 数据表格特征

Carbon 数据表格规范要求：
- 表头使用 `--color-surface-1` (#f4f4f4) 背景 + `body-emphasis` (weight 600) 字重
- 行间使用 hairline 分隔（`--color-hairline` 1px border）
- hover 行使用 `--color-surface-1` 高亮

当前 Markdown 表格使用 GitHub 风格样式，表头背景、分隔线、hover 效果均不符合 Carbon 规范。

**修复建议**: 在 CSS 中覆盖表格样式：
```css
.wmde-markdown table thead th {
  background-color: var(--color-surface-1);
  font-weight: 600;
  border-bottom: 2px solid var(--color-ink);
}
.wmde-markdown table tbody tr:hover {
  background-color: var(--color-surface-1);
}
```

---

## 四、建议改进（2 项）

### B-1. 缺少 `aria-label` 和无障碍支持

当前代码中 `rehypeRewrite` 生成的锚点链接和复制按钮缺少 ARIA 标签：
- 锚点链接缺少 `aria-label="Link to this heading"`
- 复制按钮缺少 `aria-label="Copy code"` / `aria-label="Code copied"`
- 代码块缺少 `role="region"` 和 `aria-label`

**建议**: 在使用组件时通过 `rehypeRewrite` 回调补充 ARIA 属性。

### B-2. 代码块滚动条样式未定制

代码块使用默认的 GitHub 风格滚动条，与项目整体的滚动条样式（如有定制）不一致。

**建议**: 添加自定义滚动条样式以匹配 Carbon 的极简美学：
```css
.wmde-markdown pre::-webkit-scrollbar {
  height: 6px;
  background: var(--color-surface-1);
}
.wmde-markdown pre::-webkit-scrollbar-thumb {
  background: var(--color-ink-subtle);
  border-radius: 0;
}
```

---

## 五、合规性汇总

| 评审维度 | 合规状态 | 说明 |
|---|---|---|
| DESIGN.md 字体规范 | ❌ 不合规 | 未使用 IBM Plex Sans |
| DESIGN.md 色彩规范 | ❌ 不合规 | 使用 GitHub 色彩变量而非 Carbon 变量 |
| DESIGN.md 圆角规范 | ❌ 不合规 | 内部元素可能存在圆角 |
| antd 组件铁律 | ❌ 不合规 | 复制按钮未使用 antd Button |
| DESIGN.md 间距规范 | ⚠️ 部分合规 | 大部分偶合但不精确 |
| DESIGN.md 链接规范 | ⚠️ 不合规 | 链接色与 Carbon 不一致 |
| DESIGN.md 表格规范 | ⚠️ 不合规 | 表格样式为 GitHub 风格 |
| 响应式设计 | ✅ 合规 | 组件内部支持响应式 |
| 国际化 (中文排版) | ⚠️ 待验证 | 需确认中文字符在列表、表格中的行高表现 |

---

## 六、修复优先级建议

| 优先级 | 编号 | 修复方式 | 预估工时 |
|---|---|---|---|
| P0 | S-1 | CSS 覆盖字体族 | 0.5h |
| P0 | S-2 | CSS 变量映射 | 0.5h |
| P0 | S-3 | CSS 强制 border-radius: 0 | 0.5h |
| P1 | S-4 | 替换复制按钮为 antd Button | 2h |
| P1 | S-5 | 统一暗色主题变量 | 1h |
| P1 | M-2 | CSS 覆盖链接样式 | 0.5h |
| P1 | M-3 | CSS 覆盖表格样式 | 0.5h |
| P2 | M-1 | CSS 覆盖间距 | 0.5h |
| P2 | B-1 | 补充 ARIA 标签 | 1h |
| P2 | B-2 | 自定义滚动条 | 0.5h |

**总预估工时**: 约 7 小时

> **注意**: 由于此文件位于 `node_modules` 中，所有修复应通过项目 `global.css` 的 CSS 覆盖或自定义 `rehypeRewrite` 回调实现，**禁止直接修改 node_modules 中的文件**。

---

## 七、结论

`nohighlight.tsx` 作为第三方库的包装组件，其内部渲染逻辑完全遵循 GitHub Markdown 风格而非 IBM Carbon Design System。这在项目中嵌入使用时，会形成一个"视觉孤岛"——用户在阅读 Markdown 内容时会明显感知到风格切换。

核心修复策略是通过 **CSS 变量映射 + 选择器覆盖** 在 `global.css` 中统一 Markdown 预览区域的视觉表现，使其对齐 Carbon Design 规范。对于交互元素（如复制按钮），需要通过 `rehypeRewrite` 回调在运行时替换为 antd 组件。
