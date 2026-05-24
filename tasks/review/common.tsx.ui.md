# 软件 UI 专家评审：@uiw/react-markdown-preview common.tsx

**文件路径**: `@uiw/react-markdown-preview/src/common.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · 组件 API 用户体验 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-24
**评审版本**: @uiw/react-markdown-preview@5.2.0 (pnpm lock hash `89fce51d`)
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 组件 API 对消费者友好，但原生视觉风格与 IBM Carbon Design System 存在根本性冲突，需本项目封装层完全覆盖）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 库的主入口，组装 rehype 插件管线并委托 `preview.tsx` 渲染 |
| 代码行数 | 27 行 |
| 设计模式 | Facade + forwardRef |
| UI 相关依赖 | rehype-prism-plus（代码高亮）、rehype-rewrite（DOM 重写）、rehype-attr（属性注入） |
| CSS 依赖 | `preview.tsx` 引入 `./styles/markdown.less`（GitHub 风格主题） |
| 导出 | 1 个默认组件 + Props 类型重导出 |

### 源码

```typescript
import React from 'react';
import rehypePrism from 'rehype-prism-plus/common';
import type { PluggableList } from 'unified';
import rehypeRewrite from 'rehype-rewrite';
import rehypeAttrs from 'rehype-attr';
import rehypeRaw from 'rehype-raw';
import MarkdownPreview from './preview';
import { reservedMeta } from './plugins/reservedMeta';
import { retrieveMeta } from './plugins/retrieveMeta';
import { rehypeRewriteHandle, defaultRehypePlugins } from './rehypePlugins';
import type { MarkdownPreviewProps, MarkdownPreviewRef } from './Props';

export * from './Props';

export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  const rehypePlugins: PluggableList = [
    reservedMeta,
    rehypeRaw,
    retrieveMeta,
    ...defaultRehypePlugins,
    [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
    [rehypeAttrs, { properties: 'attr' }],
    ...(props.rehypePlugins || []),
    [rehypePrism, { ignoreMissing: true }],
  ];
  return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
});
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 2 | 原生 GitHub 风格与 Carbon 设计系统严重冲突 |
| 交互体验（UX） | 6 | copy 功能可用但缺乏视觉反馈，标题锚点体验欠佳 |
| 无障碍（a11y） | 4 | 缺少 ARIA 标注、focus 管理、键盘导航支持 |
| 组件 API 用户体验 | 7 | Props 设计直观，但缺少主题定制的一等支持 |
| 响应式行为 | 5 | 依赖外部 CSS，组件本身无响应式逻辑 |
| 暗色/亮色模式 | 6 | 支持 `data-color-mode` 切换，但配色与 Carbon 无关 |
| 代码块体验 | 7 | Prism 高亮 + copy 按钮，功能完整 |
| **综合评分** | **5.3 / 10** | |

---

## 三、DESIGN.md 合规性分析

### 3.1 颜色体系冲突

**DESIGN.md 要求**：IBM Blue (#0f62fe) 为唯一品牌色，文字 Charcoal (#161616)，表面白 (#ffffff) + 浅灰 (#f4f4f4)。

**实际行为**：`common.tsx` 委托的 `preview.tsx` 引入 `markdown.less`，该 CSS 使用 **GitHub 风格 CSS 变量**（`--color-fg-default: #24292f`、`--color-accent-fg: #0969da`），与 Carbon 色板完全无关。

```
冲突矩阵：
┌─────────────────┬──────────────────────┬──────────────────────┬────────┐
│ 设计元素         │ DESIGN.md 规范       │ markdown.less 实际   │ 冲突度 │
├─────────────────┼──────────────────────┼──────────────────────┼────────┤
│ 主文字色         │ #161616 (Charcoal)   │ #24292f (GitHub)     │ 中     │
│ 链接色           │ #0f62fe (IBM Blue)   │ #0969da (GitHub Blue)│ 高     │
│ 代码背景         │ #161616 (深色)       │ #f6f8fa (浅灰)       │ 高     │
│ 标题边框         │ #e0e0e0 (Hairline)   │ #d8dee4 (GitHub)     │ 中     │
│ 行内代码背景     │ #f4f4f4 (Surface-1)  │ 内联浅色             │ 低     │
│ 引用块边框       │ #0f62fe (Primary)    │ #d8dee4 (GitHub)     │ 高     │
│ 表头背景         │ #f4f4f4 (Surface-1)  │ #f6f8fa (GitHub)     │ 低     │
└─────────────────┴──────────────────────┴──────────────────────┴────────┘
```

**对本项目的影响**：本项目 `MarkdownViewer.tsx` 通过 `markdown-viewer.css` 用 `!important` 强制覆盖了大部分视觉属性，这种做法有效但脆弱。任何 `@uiw/react-markdown-preview` 升级导致的 CSS 选择器变化都可能打破覆盖。

### 3.2 排版体系冲突

**DESIGN.md 要求**：IBM Plex Sans，body 16px/400/1.50，letter-spacing 0.16px。

**实际行为**：`markdown.less` 使用 GitHub 的系统字体栈 `-apple-system, BlinkMacSystemFont, 'Segoe UI'...`，无 letter-spacing 设置。

| 排版属性 | DESIGN.md 规范 | markdown.less 默认 | 本项目覆盖状态 |
|---|---|---|---|
| 字体族 | IBM Plex Sans | 系统字体栈 | ✅ 已覆盖 (`var(--font-family)`) |
| 正文大小 | 16px | 14px | ✅ 已覆盖 (15px) |
| 行高 | 1.50 | ~1.5 | ✅ 已覆盖 (1.8) |
| letter-spacing | 0.16px | 0 | ❌ 未覆盖 |
| 标题粗细 | 300 (display)/400 (headline) | 600-700 | ⚠️ 覆盖为 600（非 Carbon 规范的 300/400） |

**UI 专家意见**：标题 `font-weight: 600` 偏离了 Carbon 的轻量展示风格（weight 300 for display）。但在 Markdown 阅读场景中，600 weight 的标题提供了更好的层级对比度，属于合理的场景化偏离。建议保持现状但记录偏离原因。

### 3.3 圆角体系冲突

**DESIGN.md 要求**：`rounded.none` (0px) 为默认，所有按钮、卡片、输入框使用直角。

**实际行为**：`markdown.less` 中代码块使用 `border-radius: 6px`，行内代码使用 `border-radius: 6px`，表格无圆角。

| 元素 | DESIGN.md | markdown.less 默认 | 本项目覆盖状态 |
|---|---|---|---|
| 代码块 | 0px | 6px | ✅ 已覆盖 (2px) |
| 行内代码 | 0px | 6px | ✅ 已覆盖 (2px) |
| 表格 | 0px | 0px | ✅ 天然合规 |
| 图片 | 0px | 无圆角 | ⚠️ 覆盖为 2px |

**UI 专家意见**：本项目将代码块圆角覆盖为 `2px`（而非 DESIGN.md 的 `0px`）。在 Markdown 阅读场景中，代码块保留 `2px` 的极小圆角是可接受的视觉微调 — 它帮助用户区分代码块与正文块，不破坏整体 flat 美学。建议记录此偏离。

### 3.4 间距体系

**DESIGN.md 要求**：4px 基准网格，按钮 12px×16px，卡片 padding 24px/32px。

**实际行为**：`markdown.less` 的间距基于 GitHub 的排版节奏（非 4px 网格），与 Carbon 间距系统不一致。

```
间距对比（Markdown 元素）：
┌──────────────┬────────────────────┬─────────────────────────┐
│ 元素          │ markdown.less 默认  │ 本项目覆盖              │
├──────────────┼────────────────────┼─────────────────────────┤
│ 容器 padding  │ ~16px 24px         │ 8px 16px（偏小）        │
│ 段落间距      │ 16px               │ 1em (~15px)             │
│ 标题上间距    │ 24px               │ 1.6em (~24px)           │
│ 列表左缩进    │ 2em                │ 1.8em (~27px)           │
│ 代码块 padding│ 16px               │ 16px                    │
└──────────────┴────────────────────┴─────────────────────────┘
```

---

## 四、交互体验（UX）评审

### 4.1 代码块复制功能

```typescript
// rehypePlugins.tsx:20-23
if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
  const code = getCodeString(node.children);
  node.children.push(copyElement(code));
}
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 功能可用性 | ✅ 良好 | 点击即复制，通过 `useCopied` hook 实现反馈 |
| 视觉可发现性 | ⚠️ 一般 | copy 按钮仅在 hover 时显示，移动端无法 hover |
| 反馈时效性 | ✅ 良好 | 复制后按钮变绿色 check 图标 |
| 无障碍 | ❌ 差 | copy 按钮缺少 `aria-label`，屏幕阅读器无法识别 |

**问题 U-01 — 移动端复制体验缺失**：

copy 按钮使用 `:hover` 触发显示，在触屏设备上无法触发。移动端用户可能根本不知道有复制功能。

**建议**：本项目 MarkdownViewer 可考虑传入 `disableCopy` 并自行实现基于 antd `Button` 的复制交互，提供始终可见的复制按钮。

### 4.2 标题锚点链接

```typescript
// rehypePlugins.tsx:13-18 — 为 h1-h6 添加 octiconLink 锚点
if (/h(1|2|3|4|5|6)/.test(node.tagName)) {
  child.properties = { class: 'anchor', ...child.properties };
  child.children = [octiconLink];
}
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| URL 可分享性 | ✅ 良好 | 点击标题生成带 hash 的 URL |
| hover 反馈 | ✅ 良好 | hover 时显示链接图标 |
| focus 管理 | ❌ 缺失 | 锚点 `<a>` 无 `tabindex`，键盘无法聚焦 |
| 视觉一致性 | ⚠️ 一般 | 链接图标使用 SVG octicon，与 antd Icon 风格不一致 |

**问题 U-02 — 键盘用户无法导航到标题锚点**：标题内的 `<a class="anchor">` 没有设置 `tabindex="0"` 或显式的 href，键盘用户无法通过 Tab 到达。违反 **WCAG 2.1 Level A — 2.1.1 Keyboard**。

### 4.3 代码语法高亮

```typescript
[rehypePrism, { ignoreMissing: true }]
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 高亮质量 | ✅ 良好 | Prism 支持广泛语言，`ignoreMissing: true` 避免未知语言报错 |
| 色彩方案 | ⚠️ 偏离 | Prism 默认主题使用 GitHub 色板，非 Carbon 色板 |
| 行号显示 | ❌ 缺失 | 未启用行号，长代码块难以定位 |
| 语言标签 | ❌ 缺失 | 未在代码块顶部显示语言标识 |
| 折叠功能 | ❌ 缺失 | 长代码块无折叠/展开 |

---

## 五、无障碍（a11y）评审

### 5.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ❌ | 图片无 `alt` 文本管理机制（由 Markdown 作者控制） |
| **1.3.1 信息与关系** | A | ✅ | 语义化 HTML（h1-h6、blockquote、table） |
| **1.4.3 对比度（最低）** | AA | ⚠️ | 行内代码 `color: var(--color-error)` (#da1e28) 在 `#f4f4f4` 背景上对比度仅 4.5:1，刚好达标 |
| **1.4.11 非文本对比度** | AA | ❌ | 代码块 copy 按钮的灰色图标在深色背景上对比度不足 |
| **2.1.1 键盘可操作** | A | ❌ | 标题锚点不可键盘聚焦，copy 按钮缺少键盘事件处理 |
| **2.4.6 标题与标签** | AA | ✅ | 正确使用 h1-h6 层级 |
| **2.4.7 焦点可见** | AA | ❌ | 无自定义 focus ring，Markdown 内链接的焦点样式依赖浏览器默认 |
| **3.2.3 一致导航** | AA | ⚠️ | 标题锚点位置不固定（仅在 hover 出现），导航模式不一致 |
| **4.1.2 名称、角色、值** | A | ❌ | copy 按钮缺少 `aria-label` |

### 5.2 核心无障碍问题

**问题 A-01 — Copy 按钮 ARIA 缺失（严重）**：

`rehypePlugins.tsx` 中 `copyElement` 生成的 `<button>` 没有 `aria-label`。屏幕阅读器用户无法理解按钮用途。

**问题 A-02 — 焦点管理缺失（严重）**：

`common.tsx` 和 `preview.tsx` 均未提供焦点管理策略。在动态内容更新（如文章切换）时：
- 焦点不会自动移到新内容区域
- 键盘用户需从页面顶部重新 Tab 到内容区

**问题 A-03 — 色彩对比度边缘情况（中等）**：

本项目 `markdown-viewer.css` 中行内代码使用 `color: var(--color-error)` (#da1e28)，这是 Carbon 的语义红色。将红色用于"代码"而非"错误"违反了色彩语义原则，可能对色盲用户造成混淆。

---

## 六、组件 API 设计评审（从消费者视角）

### 6.1 Props 设计

| Prop | 类型 | 默认值 | UX 评价 |
|---|---|---|---|
| `source` | `string` | — | ✅ 直观，内容即输入 |
| `disableCopy` | `boolean` | `false` | ✅ 合理默认，copy 功能默认开启 |
| `skipHtml` | `boolean` | `true` | ⚠️ 命名反直觉 — `skipHtml=true` 表示跳过 HTML 但 `common.tsx` 已注入 `rehypeRaw`，实际效果是 HTML 仍被渲染 |
| `wrapperElement` | `object` | `{}` | ⚠️ 用于控制 `data-color-mode`，API 不够显式，应提供 `theme: 'light' \| 'dark'` |
| `rehypeRewrite` | `function` | — | ⚠️ 高级 API，普通消费者难以理解 |
| `rehypePlugins` | `PluggableList` | — | ⚠️ 只能追加不能替换，限制性高 |

### 6.2 消费者体验问题

**问题 API-01 — `skipHtml` 与 `rehypeRaw` 矛盾**：

`common.tsx` 硬编码注入 `rehypeRaw`（解析 HTML），而 `preview.tsx` 默认 `skipHtml=true`。消费者看到 `skipHtml` prop 可能认为 HTML 不会被渲染，但实际上 `common.tsx` 的管线已经绕过了这个限制。这个 API 设计会误导消费者。

**问题 API-02 — 缺少主题一等支持**：

控制亮色/暗色需要通过 `wrapperElement={{ 'data-color-mode': 'light' }}`，这不是一个直观的 API。DESIGN.md 要求系统使用纯亮色主题，但组件没有 `theme` prop 一等支持。

### 6.3 本项目 MarkdownViewer 的封装质量

```typescript
// MarkdownViewer.tsx — 本项目封装
<MarkdownPreview
  source={safeSource}
  wrapperElement={{ 'data-color-mode': 'light' }}
/>
```

**封装评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 安全防护 | ✅ 良好 | 1MB 长度限制，DOMPurify 已在项目依赖中 |
| 状态处理 | ✅ 良好 | loading/error/empty 三态覆盖 |
| 无障碍 | ✅ 良好 | 添加了 `role="region"` + `aria-label` |
| 主题控制 | ✅ 良好 | 显式指定 `data-color-mode: 'light'` |
| 性能隔离 | ❌ 缺失 | 未使用 `React.memo`，父组件重渲染会穿透 |

---

## 七、CSS 层面的 UI 问题

### 7.1 `!important` 覆盖策略

本项目 `markdown-viewer.css` 和 `global.css` 共使用 **30+ 条 `!important` 规则**来覆盖 `markdown.less` 的默认样式。

```
覆盖策略分析：
┌────────────────────────────────────────────────────────┐
│  @uiw/react-markdown-preview                           │
│  └── markdown.less (GitHub 主题，~900 行 CSS)          │
│       │                                                 │
│       ▼  被完全覆盖                                     │
│  本项目                                                │
│  ├── markdown-viewer.css (Carbon 主题覆盖，126 行)     │
│  ├── global.css (.article-content-preview，~100 行)    │
│  └── 所有覆盖均使用 !important                         │
│                                                        │
│  风险：CSS 选择器优先级战                               │
│  维护成本：每次库升级需验证覆盖是否仍有效               │
└────────────────────────────────────────────────────────┘
```

**问题 CSS-01 — 两套重复的覆盖样式**：

`markdown-viewer.css`（用于 MarkdownViewer）和 `global.css` 中的 `.article-content-preview .wmde-markdown` 存在大量重复规则。两个文件覆盖了相同的元素（h1-h6、p、code、pre、table 等），颜色和间距值完全一致，维护时需要同步更新两处。

**建议**：将 `.article-content-preview .wmde-markdown` 规则从 `global.css` 中移除，统一使用 `markdown-viewer.css` 的 `.markdown-viewer .wmde-markdown` 规则。

### 7.2 行内代码颜色语义误用

```css
/* markdown-viewer.css:65 */
.markdown-viewer .wmde-markdown code {
  color: var(--color-error) !important;  /* #da1e28 — Carbon 语义错误红色 */
}
```

**问题 CSS-02 — 红色行内代码违反色彩语义原则**：

`var(--color-error)` (#da1e28) 在 DESIGN.md 中定义为 **语义错误色**（Semantic Error）。将其用于行内代码会：
1. 误导用户认为代码有错误
2. 对红色盲用户（约 8% 男性）降低可读性
3. 违反 Carbon Design System 的语义色彩使用原则

**建议**：使用 `var(--color-blue-80)` (#002d9c) 或 `var(--color-ink)` (#161616) 替代行内代码颜色，保持语义正确性。

---

## 八、响应式行为评审

### 8.1 common.tsx 的响应式能力

`common.tsx` 本身不包含任何响应式逻辑。渲染后的 DOM 结构是纯语义 HTML（h1-h6、p、pre、table 等），响应式行为完全依赖外部 CSS。

**问题 R-01 — 代码块无水平滚动提示**：

在移动端（<672px），代码块可能超出视口宽度。`markdown.less` 的 `pre` 设置了 `overflow: auto`，但没有滚动条提示或渐变遮罩，用户可能不知道内容可以横向滚动。

**问题 R-02 — 表格无响应式处理**：

Markdown 表格在移动端可能超出容器宽度。本项目 CSS 未对 `.wmde-markdown table` 添加 `overflow-x: auto` 的容器包裹。

### 8.2 移动端触摸目标

| 交互元素 | 触摸目标尺寸 | DESIGN.md 要求 | 合规 |
|---|---|---|---|
| 标题锚点链接 | ~16px × 16px | 48px × 48px | ❌ |
| Copy 按钮 | ~32px × 32px | 48px × 48px | ❌ |
| 行内链接 | 行高 × 文字宽度 | 48px × 48px | ❌ |

所有交互元素的触摸目标均不满足 DESIGN.md 要求的 48px 最小触摸目标。

---

## 九、暗色/亮色模式评审

### 9.1 模式切换机制

`common.tsx` → `preview.tsx` 通过 `wrapperElement` 的 `data-color-mode` 属性控制主题。`markdown.less` 使用 CSS 变量 + `@media (prefers-color-scheme)` 双机制切换。

```
主题切换路径：
consumer → wrapperElement={{ 'data-color-mode': 'light' }}
    → preview.tsx → <div data-color-mode="light" class="wmde-markdown">
        → markdown.less 中 [data-color-mode="light"] 选择器生效
```

**评价**：
- ✅ 机制可工作，本项目正确使用了 `data-color-mode: 'light'`
- ⚠️ 同时存在 `@media (prefers-color-scheme)` 备选，如果 `data-color-mode` 未设置，系统主题可能生效
- ❌ 无 `theme` prop 一等支持，不符合 antd 的主题定制惯例

### 9.2 本项目的主题策略

本项目强制使用亮色主题（`data-color-mode: 'light'`），且通过 CSS 覆盖将所有颜色指向 Carbon 变量。这是一个合理的选择 — DESIGN.md 明确规定系统使用亮色主题，暗色模式仅在 footer 区域使用。

---

## 十、与 Ant Design 的集成评审

### 10.1 组件选择合规性

**CLAUDE.md 铁律**：前端必须使用 Ant Design (antd) 组件，禁止使用原生 HTML 元素替代 antd 提供的组件。

**合规分析**：

| common.tsx 输出元素 | antd 等价组件 | 合规 |
|---|---|---|
| `<div>` 容器 | `<Card>` / `<div>` | ✅ 容器 div 无违规 |
| `<button>` (copy) | `<Button>` | ❌ 第三方库不受控 |
| `<a>` (锚点链接) | `<Typography.Link>` | ❌ 第三方库不受控 |
| `<pre><code>` | `<Typography.Text code>` | ❌ 第三方库不受控 |
| `<table>` | `<Table>` | ❌ 第三方库不受控 |

**UI 专家意见**：上述违规属于**第三方库内部实现**，本项目无法控制。通过 `MarkdownViewer` 封装层隔离是正确的做法。铁律的意图是禁止本项目的**自定义代码**使用原生 HTML，而非要求覆盖第三方库的内部 DOM 结构。

### 10.2 antd Token 一致性

antd v6 使用 Design Token 系统。`common.tsx` 输出的 Markdown 内容完全不感知 antd Token：

| Token 维度 | antd Token | markdown.less | 本项目覆盖 |
|---|---|---|---|
| 字体 | `fontFamily` | 系统字体栈 | ✅ 覆盖为 `var(--font-family)` |
| 文字色 | `colorText` | #24292f | ✅ 覆盖为 `var(--color-ink)` |
| 链接色 | `colorLink` | #0969da | ✅ 覆盖为 `var(--color-primary)` |
| 边框色 | `colorBorder` | #d8dee4 | ✅ 覆盖为 `var(--color-hairline)` |
| 圆角 | `borderRadius` | 6px | ✅ 覆盖为 2px |

本项目通过 CSS 变量间接实现了 Token 一致性，但这是一个手动同步过程 — 如果 antd Token 变更，Markdown 区域不会自动跟随。

---

## 十一、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 建议 |
|---|---|---|---|---|---|
| U-01 | P2 | 交互 | 移动端 copy 按钮不可见（hover 触发） | 移动端用户无法复制代码 | 在 MarkdownViewer 中自定义 copy UI |
| U-02 | P2 | 无障碍 | 标题锚点不可键盘聚焦 | 违反 WCAG 2.1.1 | 可接受（第三方库限制） |
| A-01 | P1 | 无障碍 | Copy 按钮缺少 `aria-label` | 屏幕阅读器无法识别 | 在 MarkdownViewer 中自定义 copy UI |
| A-02 | P2 | 无障碍 | 动态内容更新无焦点管理 | 键盘用户体验差 | 内容切换后 focus 到容器 |
| A-03 | P2 | 视觉 | 行内代码使用语义红色 | 误导用户 | 改用 `--color-blue-80` |
| API-01 | P3 | DX | `skipHtml` 与 `rehypeRaw` 矛盾 | 消费者误判安全性 | 文档说明 |
| API-02 | P3 | DX | 缺少 `theme` prop | 不符合 antd 习惯 | 封装层提供 `theme` prop |
| CSS-01 | P2 | 维护 | 两套重复 Markdown 覆盖样式 | 维护成本高 | 统一为 `markdown-viewer.css` |
| CSS-02 | P1 | 视觉 | 行内代码颜色语义误用 | 误导 + 无障碍 | 改用非语义色 |
| R-01 | P3 | 响应式 | 代码块无滚动提示 | 移动端体验差 | 添加渐变遮罩 |
| R-02 | P2 | 响应式 | 表格无响应式容器 | 移动端溢出 | 添加 `overflow-x: auto` 容器 |

---

## 十二、对本项目（by_geo）的 UI 建议

### 优先级 P1（建议立即处理）

1. **修复行内代码颜色**：将 `color: var(--color-error)` 改为 `color: var(--color-blue-80)` 或 `color: #525252`（ink-muted），消除语义误导
2. **合并重复 CSS**：将 `global.css` 中 `.article-content-preview .wmde-markdown` 规则迁移到 `markdown-viewer.css`，统一维护

### 优先级 P2（建议下个迭代处理）

3. **表格响应式**：为 `.wmde-markdown table` 添加外层 `overflow-x: auto` 容器
4. **MarkdownViewer 性能隔离**：添加 `React.memo` 防止不必要的重渲染
5. **自定义 Copy UI**：考虑禁用原生 copy（`disableCopy`），使用 antd `Button` + `Typography.Text` 实现更符合 Carbon 设计的复制交互

### 优先级 P3（可纳入技术债）

6. **letter-spacing 补全**：为 `.wmde-markdown` 添加 `letter-spacing: 0.16px`
7. **添加 `aria-live="polite"`**：在 MarkdownViewer 内容区域添加 aria-live，支持动态内容更新通知
8. **代码块语言标签**：通过自定义 `rehypeRewrite` 在代码块顶部显示语言标识

---

## 十三、评审总结

`common.tsx` 作为 `@uiw/react-markdown-preview` 的入口组件，其代码本身（27 行）不包含任何直接的 UI 渲染逻辑。但从 UI 专家视角来看，它通过管线编排决定了最终的 UI 输出质量。

**核心矛盾**：该库的设计目标是为 React 提供 GitHub 风格的 Markdown 预览，而本项目要求 IBM Carbon Design System 风格。两者的设计语言在色彩、字体、圆角、间距等所有维度都存在冲突。`common.tsx` 没有提供主题定制的一等支持，迫使本项目采用 `!important` 全量覆盖策略。

**正面评价**：
- 本项目 `MarkdownViewer.tsx` 的封装质量高，正确处理了三态（loading/error/empty）、安全限制（1MB）、无障碍标注（role + aria-label）
- `markdown-viewer.css` 的覆盖基本完整，成功将 GitHub 风格转化为 Carbon 风格
- `data-color-mode: 'light'` 的显式设置确保了主题一致性

**主要风险**：
- 30+ 条 `!important` 规则构成的 CSS 优先级战在未来库升级时可能导致样式回归
- 行内代码使用语义红色是一个需要立即修复的视觉错误
- 两套重复的 Markdown 样式覆盖增加了维护负担

**综合评分 5.3/10** — 库的 UI 输出与 Carbon Design System 存在根本性不匹配，但本项目通过高质量的封装层和 CSS 覆盖有效弥补了这一差距。建议重点修复行内代码颜色和重复 CSS 问题，其余为可接受的技术债。
