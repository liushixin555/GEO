# 软件 UI 专家评审：@uiw/react-md-editor Editor.common.tsx

**文件路径**: `@uiw/react-md-editor/src/Editor.common.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · 组件 API 用户体验 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-24
**评审版本**: @uiw/react-md-editor@4.1.0
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 本文件无 UI 逻辑，风险完全来自上游工厂和 TextArea 的原生视觉风格，本项目封装层 `MarkdownEditor.tsx` + `markdown-editor.css` 已有效覆盖核心冲突）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 库的 "common" 变体入口，组装 MarkdownPreview + TextArea 并委托工厂创建编辑器 |
| 代码行数 | 7 行 |
| 设计模式 | 工厂 + 依赖注入 |
| UI 相关依赖 | `@uiw/react-markdown-preview/common`（预览）、`./components/TextArea/index.common`（编辑区）、`./Editor.factory`（工厂，含 287 行 UI 渲染逻辑） |
| CSS 依赖 | `Editor.factory` → `index.less`（GitHub 风格主题，~150 行）、`Toolbar/index.less`、`DragBar/index.less`、`TextArea/index.less` |
| 导出 | 1 个默认组件 + 1 个类型重导出 |

### 源码

```tsx
import MarkdownPreview from '@uiw/react-markdown-preview/common';
import TextArea from './components/TextArea/index.common';
import { createMDEditor } from './Editor.factory';

export type { RefMDEditor } from './Editor.factory';

export default createMDEditor({ MarkdownPreview, TextArea });
```

**UI 专家注**：本文件 7 行代码无任何 UI 渲染逻辑。本评审的重点在于它所**间接产生**的 UI 输出——通过 `Editor.factory`（287 行）和各子组件渲染的编辑器界面。

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 2 | 原生 GitHub 风格与 Carbon 设计系统全面冲突（颜色/字体/圆角/阴影） |
| 交互体验（UX） | 6 | 编辑/预览/实时模式完整，滚动同步可用，但工具栏交互粗糙 |
| 无障碍（a11y） | 3 | 工具栏按钮无 ARIA、textarea 缺少 label、无焦点管理 |
| 组件 API 用户体验 | 7 | Props 设计直观（height/preview/onChange），但缺少主题定制支持 |
| 响应式行为 | 4 | 无内置响应式，固定高度/宽度，工具栏在移动端溢出 |
| 暗色/亮色模式 | 5 | 支持 `data-color-mode` 切换，但编辑区 CSS 变量覆盖不完整 |
| 代码编辑体验 | 7 | 双层渲染（overlay + textarea）、快捷键命令系统、语法高亮预览 |
| **综合评分** | **4.9 / 10** | |

---

## 三、DESIGN.md 合规性分析

### 3.1 颜色体系冲突

**DESIGN.md 要求**：IBM Blue (#0f62fe) 为唯一品牌色，Charcoal (#161616) 文字，白 (#ffffff) 画布 + 浅灰 (#f4f4f4) 表面。

**实际行为**：`index.less` 使用 GitHub 风格 CSS 变量，色板与 Carbon 完全无关。

```
冲突矩阵（编辑器部分）：
┌──────────────────┬─────────────────────────┬──────────────────────────┬────────┬────────────┐
│ 设计元素          │ DESIGN.md 规范          │ index.less 默认值        │ 冲突度 │ 本项目覆盖  │
├──────────────────┼─────────────────────────┼──────────────────────────┼────────┼────────────┤
│ 编辑器容器背景    │ #ffffff (Canvas)        │ --color-canvas-default   │ 中     │ ✅ 已覆盖  │
│ 工具栏背景        │ #f4f4f4 (Surface-1)     │ --color-canvas-subtle    │ 中     │ ✅ 已覆盖  │
│ 文字颜色          │ #161616 (Ink)           │ --color-fg-default       │ 中     │ ✅ 已覆盖  │
│ 边框颜色          │ #e0e0e0 (Hairline)      │ --color-border-default   │ 中     │ ✅ 已覆盖  │
│ 工具栏按钮激活    │ #0f62fe (Primary)       │ --color-accent-fg        │ 高     │ ✅ 已覆盖  │
│ 编辑区文字        │ #161616 (Ink)           │ 系统字体栈默认色         │ 中     │ ✅ 已覆盖  │
│ 阴影              │ 无阴影（Carbon flat）    │ 复杂多层 box-shadow      │ 高     │ ✅ 已覆盖  │
└──────────────────┴─────────────────────────┴──────────────────────────┴────────┴────────────┘
```

**对本项目的影响**：本项目 `markdown-editor.css`（214 行）通过 `!important` 全量覆盖了编辑器的视觉属性，覆盖率约 95%。剩余 5% 的冲突点在后续章节详述。

### 3.2 排版体系冲突

**DESIGN.md 要求**：IBM Plex Sans（正文）/ IBM Plex Mono（代码），body 16px/400/1.50，letter-spacing 0.16px。

**实际行为**：`index.less` 使用 `'Helvetica Neue', Helvetica, Arial, sans-serif`，`TextArea/index.less` 设置 14px/18px 行高。

| 排版属性 | DESIGN.md 规范 | 编辑器默认值 | 本项目覆盖状态 |
|---|---|---|---|
| 编辑区字体 | IBM Plex Mono | Helvetica Neue | ✅ 已覆盖为 `IBM Plex Mono` |
| 编辑区大小 | 14px（代码场景） | 14px | ✅ 天然匹配 |
| 编辑区行高 | 1.60（本项目覆盖值） | 18px (≈1.29) | ✅ 已覆盖为 1.6 |
| letter-spacing | 0.16px | 0 | ✅ 已覆盖为 0.16px |
| 预览区字体 | IBM Plex Sans | 系统字体栈 | ✅ 已覆盖为 `var(--font-family)` |
| 预览区大小 | 16px | 14px | ✅ 已覆盖为 15px |

**UI 专家意见**：本项目将预览区字号设为 15px（非 DESIGN.md 的 16px），属于合理的编辑器场景微调——在分栏模式下 16px 会显得过于拥挤。编辑区使用 IBM Plex Mono 完全符合 Carbon 的代码场景规范。

### 3.3 圆角体系冲突

**DESIGN.md 要求**：`rounded.none` (0px) 为默认，所有按钮、卡片、输入框、容器使用直角。

**实际行为**：编辑器默认 `border-radius: 3px`，工具栏按钮 `border-radius: 2px`，预览区 `border-radius: 0 0 5px 0`。

| 元素 | DESIGN.md | 编辑器默认值 | 本项目覆盖状态 |
|---|---|---|---|
| 容器 | 0px | 3px | ✅ 已覆盖为 0 |
| 工具栏 | 0px | 继承 3px | ✅ 已覆盖为 0 |
| 工具栏按钮 | 0px | 2px | ✅ 已覆盖为 0 |
| 编辑区 | 0px | 继承 | ✅ 已覆盖为 0 |
| 预览区 | 0px | 0 0 5px 0 | ✅ 已覆盖为 0 |
| 代码块 | 0px | 6px | ✅ 已覆盖为 0 |
| 行内代码 | 0px | 6px | ✅ 已覆盖为 2px |
| 图片 | 0px | 无圆角 | ⚠️ 覆盖为 2px |

**UI 专家意见**：行内代码和图片圆角 2px（非 0px）是可接受的微调——在编辑器场景中保留极小圆角有助于视觉元素区分，不破坏 Carbon flat 美学整体印象。

### 3.4 间距体系

**DESIGN.md 要求**：4px 基准网格，输入框 padding 11px 16px，卡片 24px。

**实际行为**：编辑器间距基于 GitHub 节奏，非 4px 网格。

```
间距对比（编辑器元素）：
┌──────────────────┬────────────────────┬─────────────────────────┐
│ 元素              │ 编辑器默认值        │ 本项目覆盖              │
├──────────────────┼────────────────────┼─────────────────────────┤
│ 工具栏 padding    │ ~8px 12px          │ 4px 8px（偏紧）        │
│ 编辑区 padding    │ 10px               │ 12px 16px（符合 4px）  │
│ 预览区 padding    │ 10px 20px          │ 12px 16px（符合 4px）  │
│ 工具栏按钮间距    │ 1px margin         │ 未覆盖（偏密）         │
│ 工具栏最小高度    │ ~32px              │ 36px（符合 4px）       │
│ 引用块 padding    │ 16px               │ 8px 16px               │
│ 表格单元格 padding│ 6px 13px           │ 8px 12px（符合 4px）   │
└──────────────────┴────────────────────┴─────────────────────────┘
```

### 3.5 阴影与深度

**DESIGN.md 要求**：无阴影，深度仅通过表面色变化（canvas → surface-1）和 1px hairline 传达。

**实际行为**：`index.less` 第 12-13 行定义了复杂的多层 box-shadow：

```less
// index.less:12-13
box-shadow: 0 0 0 0 rgba(0, 0, 0, 0), 0 0 0 0 rgba(0, 0, 0, 0),
            0 0 0 0 rgba(0, 0, 0, 0), 0 0 0 1px rgba(0, 0, 0, 0.08);
```

本项目已通过 `box-shadow: none !important` 覆盖，符合 Carbon flat 美学。

---

## 四、交互体验（UX）评审

### 4.1 编辑模式切换

```tsx
// Editor.factory.tsx — preview 状态控制
state.preview → 'live' | 'edit' | 'preview'
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 模式完整性 | ✅ 良好 | 三种模式（编辑/预览/实时）覆盖所有场景 |
| 切换流畅度 | ✅ 良好 | 状态切换无闪烁，React 状态驱动渲染 |
| 模式指示 | ⚠️ 一般 | 工具栏按钮 active 状态需 CSS 覆盖才能符合 Carbon 风格 |
| 快捷键支持 | ✅ 良好 | 内置命令系统支持 Ctrl+B/I/K 等常用快捷键 |

### 4.2 拖拽调整高度

```tsx
// Editor.factory.tsx:255-263 — 拖拽条
{visibleDragbar && (
  <DragBar height={state.height} onChange={(h) => dispatch({ height: h })} />
)}
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 可发现性 | ❌ 差 | 拖拽条仅 10px 高，cursor: s-resize 无视觉提示 |
| 拖拽反馈 | ⚠️ 一般 | 无拖拽中的视觉反馈（无高亮/阴影变化） |
| 高度限制 | ✅ 良好 | min 100px / max 1200px 限制合理 |
| 触控支持 | ❌ 缺失 | 仅支持鼠标拖拽，触屏无法调整高度 |

**问题 E-01 — 拖拽条可发现性差**：

DragBar 组件渲染为 14px 宽、10px 高的透明区域，无任何视觉元素。用户难以发现编辑器高度可调。Carbon Design System 要求交互元素有明确的视觉提示。

### 4.3 工具栏

```
工具栏结构：
┌──────────────────────────────────────────────────────┐
│ [B] [I] [S] [链接] [图片] [引用] [代码] │ [H1-H6] │ [列表] │ [模式] │
│  20px高度 · 14px行高 · 1px间距                       │
└──────────────────────────────────────────────────────┘
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 功能覆盖 | ✅ 良好 | 涵盖常见 Markdown 格式化操作 |
| 按钮尺寸 | ⚠️ 偏小 | 20px 高度 × 不定宽度，Carbon 要求最小 32px |
| 图标风格 | ⚠️ 不一致 | 使用 SVG 图标，与 antd Icon 风格不统一 |
| 分组逻辑 | ✅ 清晰 | divider 分隔功能分组 |
| Hover 反馈 | ⚠️ 一般 | 默认 hover 背景色与 Carbon 规范不符，需覆盖 |
| 移动端适配 | ❌ 差 | 工具栏在窄屏幕下水平溢出，无换行/折叠机制 |

**问题 E-02 — 工具栏按钮触摸目标不足**：

按钮高度 20px × 宽度不定，远低于 DESIGN.md 要求的 48px 最小触摸目标。本项目覆盖后工具栏最小高度提升至 36px，按钮区域仍不足 48px。

### 4.4 滚动同步

```tsx
// Editor.factory.tsx:166-191 — 双向滚动同步
const handleScroll = (type: number) => {
  const textareaDom = textareaRef.current;
  const previewDom = previewRef.current;
  const scale = (textareaDom.scrollHeight - textareaDom.offsetHeight) /
                (previewDom.scrollHeight - previewDom.offsetHeight);
  previewDom.scrollTop = textareaDom.scrollTop * scale;
};
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 同步精度 | ✅ 良好 | 基于比例映射，一般情况下同步准确 |
| 边界处理 | ⚠️ 一般 | scale 为 0 或 Infinity 时产生 NaN，滚动位置异常 |
| 性能 | ✅ 良好 | 直接 DOM 操作，无 React 重渲染开销 |

### 4.5 textarea 编辑体验

```tsx
// Textarea.tsx — 双层渲染
<textarea className="w-md-editor-text-input" />
<pre><code className="w-md-editor-text-pre" /></pre>
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 输入响应 | ✅ 良好 | textarea 覆盖透明层，输入无延迟 |
| 语法高亮 | ✅ 良好 | code overlay 层提供实时语法着色 |
| Tab 支持 | ✅ 良好 | 内置 tabSize 控制，默认 2 空格 |
| 自动补全 | ❌ 无 | 无 Markdown 自动补全/提示功能 |
| 搜索替换 | ❌ 无 | 无内置搜索替换功能 |
| 行号显示 | ❌ 无 | 无行号 gutter |

---

## 五、无障碍（a11y）评审

### 5.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ❌ | 工具栏图标按钮仅有 SVG，无 `aria-label` |
| **1.3.1 信息与关系** | A | ⚠️ | textarea 缺少 `<label>` 关联 |
| **1.4.3 对比度（最低）** | AA | ⚠️ | 工具栏按钮灰色文字在浅灰背景上对比度接近 3:1 边界 |
| **2.1.1 键盘可操作** | A | ⚠️ | textarea 可键盘操作，但工具栏按钮 Tab 导航顺序不明确 |
| **2.4.7 焦点可见** | AA | ❌ | 无自定义 focus ring，使用浏览器默认 |
| **4.1.2 名称、角色、值** | A | ❌ | 工具栏按钮无 `aria-label`，无 `role="toolbar"` |

### 5.2 核心无障碍问题

**问题 A-01 — 工具栏无 ARIA 标注（严重）**：

```tsx
// Toolbar 组件中，按钮直接使用 SVG 图标，无文本替代
<button type="button" onClick={...}>
  <svg>...</svg>
</button>
```

工具栏所有按钮缺少 `aria-label`。屏幕阅读器用户无法理解"粗体""斜体""链接"等操作。整个工具栏也缺少 `role="toolbar"` 和 `aria-label`。

**问题 A-02 — textarea 缺少 label 关联（严重）**：

```tsx
// Textarea.tsx
<textarea className="w-md-editor-text-input" autoComplete="off" ... />
```

textarea 没有 `id` / `aria-label` / `aria-labelledby`，屏幕阅读器无法标识输入区域。

**问题 A-03 — 焦点样式缺失（中等）**：

编辑器的 textarea 和工具栏按钮没有自定义 focus 样式。DESIGN.md 要求 focus 状态使用 2px IBM Blue outline + 1px Charcoal underline（Carbon 签名式焦点处理）。本项目 CSS 中未覆盖 focus ring。

---

## 六、组件 API 设计评审（从消费者视角）

### 6.1 Props 设计

| Prop | 类型 | 默认值 | UX 评价 |
|---|---|---|---|
| `value` | `string` | — | ✅ 受控模式，符合 React 惯例 |
| `onChange` | `(value: string) => void` | — | ✅ 标准回调，antd Form.Item 兼容 |
| `height` | `number` | 200 | ✅ 灵活，本项目默认覆盖为 400 |
| `preview` | `'live' \| 'edit' \| 'preview'` | 'live' | ✅ 三模式完整 |
| `visibleDragbar` | `boolean` | true | ✅ 可隐藏拖拽条 |
| `tabSize` | `number` | 2 | ✅ 合理默认 |
| `textareaProps` | `object` | — | ⚠️ 透传给 textarea，可设置 placeholder/readOnly |
| `previewOptions` | `object` | — | ⚠️ 透传给 MarkdownPreview，结构不透明 |
| `toolbarBottom` | `boolean` | false | ⚠️ 工具栏位置可配置，但无自定义工具栏 API |
| `enableScroll` | `boolean` | true | ✅ 可禁用滚动同步 |

### 6.2 消费者体验问题

**问题 API-01 — 无主题定制一等支持**：

组件没有 `theme` / `className` prop（容器级别）允许消费者直接传入设计系统 token。消费者必须在外层包一个 `<div>` 并通过后代选择器覆盖样式。本项目 `MarkdownEditor.tsx` 正是采用此方案：

```tsx
// 本项目的做法 — 外层包裹 + CSS 覆盖
<div data-color-mode="light" className="markdown-editor-wrapper">
  <MDEditor ... />
</div>
```

这是有效的权宜之计，但不是理想 API。

**问题 API-02 — 工具栏不可扩展**：

没有 `toolbar` / `renderToolbar` prop 允许自定义工具栏内容。如果需要添加项目特有的操作按钮（如"插入图片"按钮对接项目上传 API），消费者无法在不修改 CSS 的情况下实现。

**问题 API-03 — `previewOptions` 类型不透明**：

`previewOptions` 直接透传给 `MarkdownPreview`，但类型定义嵌套在 `MarkdownPreviewProps` 中，消费者需要查阅两个库的文档才能理解完整 API。

### 6.3 本项目 MarkdownEditor 封装质量

```tsx
// MarkdownEditor.tsx — 本项目封装
<MarkdownEditor
  value={value}
  onChange={handleChange}
  height={height}
  preview={preview}
  ...
  previewOptions={{
    urlTransform: safeUrlTransform,
    allowElement: (element) => SAFE_TAGS.has(element.tagName.toLowerCase()),
  }}
/>
```

**封装评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| 安全防护 | ✅ 优秀 | DOMPurify 消毒、安全 URL 转换、标签白名单 |
| 内容限制 | ✅ 良好 | 2MB 内容上限，防止 DoS |
| 性能隔离 | ✅ 良好 | `React.memo` 包裹，防止不必要的重渲染 |
| Props 设计 | ✅ 良好 | 精简接口，隐藏了上游复杂性 |
| 主题控制 | ✅ 良好 | `data-color-mode="light"` 显式锁定亮色 |
| 无障碍 | ⚠️ 一般 | 未添加 `aria-label` 到容器，未覆盖工具栏 ARIA |
| 错误边界 | ❌ 缺失 | 未包裹 ErrorBoundary，上游崩溃会影响父组件 |

---

## 七、CSS 层面的 UI 问题

### 7.1 `!important` 覆盖策略

`markdown-editor.css`（214 行）共使用 **约 50 条 `!important` 规则**覆盖 `index.less` + `TextArea/index.less` + `Toolbar/index.less` 的默认样式。

```
覆盖策略分析：
┌──────────────────────────────────────────────────────┐
│  @uiw/react-md-editor                                │
│  ├── index.less (GitHub 主题，~150 行)               │
│  ├── Toolbar/index.less (~80 行)                     │
│  ├── TextArea/index.less (~40 行)                    │
│  ├── DragBar/index.less (~20 行)                     │
│  └── Preview → markdown.less (~900 行)               │
│       │                                               │
│       ▼  被全量覆盖                                    │
│  本项目                                               │
│  └── markdown-editor.css (Carbon 主题，214 行)       │
│      └── ~50 条 !important 规则                      │
│                                                       │
│  覆盖率：~95%                                         │
│  风险：CSS 选择器优先级战                              │
│  维护成本：每次库升级需验证覆盖是否仍有效              │
└──────────────────────────────────────────────────────┘
```

### 7.2 未覆盖的 UI 缺陷

**问题 CSS-01 — 工具栏按钮 focus 样式缺失**：

```css
/* markdown-editor.css 中仅有 hover 和 active 状态覆盖 */
.w-md-editor-toolbar button:hover { ... }
.w-md-editor-toolbar button.active { ... }
/* 缺少 button:focus 和 button:focus-visible */
```

Carbon 签名式焦点处理（2px IBM Blue outline）未应用到工具栏按钮。键盘用户无法辨识当前焦点位置。

**问题 CSS-02 — 拖拽条无视觉样式覆盖**：

`DragBar/index.less` 的样式未被 `markdown-editor.css` 覆盖。默认拖拽条为 10px 高的透明区域，cursor: s-resize。无 hover 提示，无分隔线。

**问题 CSS-03 — 全屏模式样式不完整**：

```css
/* 当前仅有 z-index 覆盖 */
.markdown-editor-wrapper .w-md-editor-fullscreen {
  z-index: 1000 !important;
}
```

全屏模式下背景色、工具栏样式可能回退到 GitHub 默认值。

---

## 八、响应式行为评审

### 8.1 编辑器响应式能力

`Editor.factory` 不包含任何响应式逻辑。编辑器使用固定高度（默认 200px，本项目覆盖为 400px）和 100% 宽度。

**问题 R-01 — 工具栏移动端溢出**：

工具栏使用 `display: flex; flex-wrap: nowrap`，按钮不换行。在移动端（<672px），工具栏按钮水平溢出容器，部分操作不可见。

**问题 R-02 — 分栏模式在平板/移动端失效**：

`live` 模式下编辑区和预览区各占 50% 宽度（flex: 1）。在平板（672-1056px）和移动端（<672px）上，50/50 分栏导致编辑区和预览区都过于狭窄，无法有效使用。

**问题 R-03 — 拖拽条在移动端不可操作**：

DragBar 仅响应鼠标事件，触屏设备无法调整编辑器高度。

### 8.2 移动端触摸目标

| 交互元素 | 触摸目标尺寸 | DESIGN.md 要求 | 合规 |
|---|---|---|---|
| 工具栏按钮 | ~20px × 20px | 48px × 48px | ❌ |
| 拖拽条 | ~14px × 10px | 48px × 48px | ❌ |
| 编辑区 textarea | 全宽 × 全高 | 48px × 48px | ✅ |
| 预览区链接 | 行高 × 文字宽 | 48px × 48px | ❌ |

---

## 九、暗色/亮色模式评审

### 9.1 模式切换机制

编辑器通过 `data-color-mode` 属性控制主题色板切换。`index.less` 定义了 `[data-color-mode="light"]` 和 `[data-color-mode="dark"]` 两套 CSS 变量。

```
主题切换路径：
consumer → data-color-mode="light"
    → index.less 中 [data-color-mode="light"] 选择器生效
    → 但编辑区 textarea 的颜色由 JavaScript 内联样式控制
```

**问题 DM-01 — 编辑区内联样式绕过 CSS 变量**：

`Editor.factory` 在某些元素上使用内联 style 设置颜色（如 `color: 'var(--color-fg-default)'`），而非通过 CSS class。内联样式的优先级高于外部 CSS，可能导致 `!important` 覆盖在某些场景下失效。

### 9.2 本项目的主题策略

本项目强制使用亮色主题（`data-color-mode="light"`），且通过 `markdown-editor.css` 将所有颜色指向 Carbon CSS 变量。这是正确的策略——DESIGN.md 明确规定系统使用亮色主题。

---

## 十、与 Ant Design 的集成评审

### 10.1 组件选择合规性

**CLAUDE.md 铁律**：前端必须使用 Ant Design (antd) 组件，禁止使用原生 HTML 元素替代 antd 提供的组件。

**合规分析**：

| 编辑器内部元素 | antd 等价组件 | 合规 | 说明 |
|---|---|---|---|
| `<button>` (工具栏) | `<Button>` | ❌ | 第三方库内部，不受控 |
| `<textarea>` (编辑区) | `<Input.TextArea>` | ❌ | 第三方库内部，不受控 |
| `<div>` 容器 | `<Card>` / `<div>` | ✅ | 容器 div 无违规 |
| `<svg>` 图标 | `<Icon>` | ❌ | 第三方库内部，不受控 |
| `<button>` (拖拽条) | — | ✅ | 无 antd 等价拖拽组件 |

**UI 专家意见**：上述违规属于**第三方库内部实现**，本项目无法控制。`MarkdownEditor.tsx` 通过封装层隔离是正确的做法。铁律的意图是禁止本项目的**自定义代码**使用原生 HTML，而非要求覆盖第三方库的内部 DOM 结构。

### 10.2 antd Token 一致性

| Token 维度 | antd Token | 编辑器默认 | 本项目覆盖 |
|---|---|---|---|
| 字体 | `fontFamily` | Helvetica Neue | ✅ → `IBM Plex Mono` / `var(--font-family)` |
| 文字色 | `colorText` | #24292f | ✅ → `var(--color-ink)` |
| 链接色 | `colorLink` | #0969da | ✅ → `var(--color-primary)` |
| 边框色 | `colorBorder` | #d8dee4 | ✅ → `var(--color-hairline)` |
| 圆角 | `borderRadius` | 3px | ✅ → 0 |
| 背景色 | `colorBgContainer` | #f6f8fa | ✅ → `var(--color-canvas)` |
| 悬浮色 | `colorBgTextHover` | #f3f4f6 | ✅ → `var(--color-surface-2)` |
| 激活色 | `colorPrimary` | #0969da | ✅ → `var(--color-primary)` |

本项目通过 CSS 变量间接实现了与 antd Token 的基本一致性。但这是手动同步——如果 antd Token 变更，编辑器区域不会自动跟随。

---

## 十一、与 MarkdownPreview (common.tsx) 的协同问题

### 11.1 预览区样式双重覆盖

`Editor.common.tsx` 组装了 `MarkdownPreview/common`，其 CSS 为 `markdown.less`（~900 行 GitHub 风格）。

本项目的覆盖策略分布在两个文件中：
- `markdown-editor.css`：覆盖编辑器内嵌预览区（`.w-md-editor-preview .wmde-markdown`）
- `markdown-viewer.css`：覆盖独立预览组件（`.markdown-viewer .wmde-markdown`）

两套 CSS 存在大量重复规则（h1-h6、p、code、pre、table、blockquote 等），维护时需同步更新。

### 11.2 颜色值不一致

| 元素 | markdown-editor.css | markdown-viewer.css | 差异 |
|---|---|---|---|
| 行内代码色 | `var(--color-blue-80)` | `var(--color-blue-80)` | ✅ 一致 |
| 代码块背景 | `var(--color-inverse-canvas)` | `var(--color-inverse-canvas)` | ✅ 一致 |
| 链接色 | `var(--color-primary)` | `var(--color-primary)` | ✅ 一致 |
| 标题粗细 | 600 | 600 | ✅ 一致 |
| 引用块左边框 | `var(--color-primary)` 3px | `var(--color-primary)` 3px | ✅ 一致 |

**UI 专家注**：当前两套 CSS 的颜色值一致，但结构和选择器不同。建议统一维护入口。

---

## 十二、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 建议 |
|---|---|---|---|---|---|
| E-01 | P3 | 交互 | 拖拽条无视觉提示，可发现性差 | 用户不知道可调整高度 | 添加 hover 高亮或分隔线 |
| E-02 | P2 | 交互 | 工具栏按钮触摸目标不足（20px） | 移动端操作困难 | 增大按钮区域或折叠工具栏 |
| A-01 | P1 | 无障碍 | 工具栏按钮缺少 `aria-label` | 屏幕阅读器无法识别 | 封装层注入 aria-label |
| A-02 | P1 | 无障碍 | textarea 缺少 label 关联 | 屏幕阅读器无法标识输入区 | 通过 `textareaProps` 注入 `aria-label` |
| A-03 | P2 | 无障碍 | 焦点样式缺失 | 键盘用户无法辨识焦点 | CSS 添加 `focus-visible` 覆盖 |
| API-01 | P3 | DX | 无主题定制一等支持 | 需外层包裹 + CSS 覆盖 | 可接受（第三方库限制） |
| API-02 | P3 | DX | 工具栏不可扩展 | 无法添加项目特有按钮 | 监控上游版本 |
| CSS-01 | P2 | 视觉 | 工具栏按钮 focus 样式缺失 | 键盘导航无视觉反馈 | 添加 focus-visible 规则 |
| CSS-02 | P3 | 视觉 | 拖拽条无样式覆盖 | 与 Carbon 美学不匹配 | 添加 hover 高亮 |
| CSS-03 | P3 | 视觉 | 全屏模式样式不完整 | 全屏下可能回退默认样式 | 补充全屏模式覆盖 |
| R-01 | P2 | 响应式 | 工具栏移动端溢出 | 移动端操作不可用 | 添加 `overflow-x: auto` |
| R-02 | P2 | 响应式 | 分栏模式窄屏失效 | 平板/移动端编辑体验差 | 窄屏下自动切换为 'edit' 模式 |
| R-03 | P3 | 响应式 | 拖拽条不支持触控 | 触屏无法调整高度 | 可接受（使用固定高度） |
| DM-01 | P3 | 主题 | 编辑区内联样式绕过 CSS 变量 | 部分覆盖可能失效 | 测试验证 |

---

## 十三、对本项目（by_geo）的 UI 建议

### 优先级 P1（建议立即处理）

1. **注入 textarea ARIA 标注**：在 `MarkdownEditor.tsx` 中通过 `textareaProps={{ 'aria-label': 'Markdown 编辑器' }}` 为 textarea 添加无障碍标注
2. **注入工具栏 ARIA**：通过 `useEffect` 在 mount 后为工具栏容器添加 `role="toolbar"` + `aria-label`，为按钮添加 `aria-label`（或通过 rehypeRewrite 修改）

### 优先级 P2（建议下个迭代处理）

3. **工具栏 focus-visible 覆盖**：在 `markdown-editor.css` 中添加：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button:focus-visible {
     outline: 2px solid var(--color-primary) !important;
     outline-offset: -2px !important;
   }
   ```
4. **工具栏移动端横向滚动**：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar {
     overflow-x: auto !important;
   }
   ```
5. **响应式模式切换**：在 `MarkdownEditor.tsx` 中添加 `useEffect` 监听窗口宽度，当 <672px 时自动将 `preview` 切换为 `'edit'`

### 优先级 P3（可纳入技术债）

6. **拖拽条视觉增强**：添加 hover 状态的分割线效果
7. **全屏模式样式补全**：补充全屏模式下的背景色、工具栏样式覆盖
8. **合并重复 CSS**：考虑将 `markdown-editor.css` 和 `markdown-viewer.css` 的共享规则提取为 `markdown-common.css`

---

## 十四、评审总结

`Editor.common.tsx` 本身（7 行代码）不包含任何 UI 渲染逻辑，是一个纯粹的工厂组装模块。UI 评审的实质是对其间接产生的编辑器界面进行评估。

**核心矛盾**：`@uiw/react-md-editor` 的设计目标是提供 GitHub 风格的 Markdown 编辑器体验，而本项目要求 IBM Carbon Design System 风格。两者在设计语言的所有维度（色彩、字体、圆角、阴影、间距）都存在根本性冲突。库本身不提供主题定制的一等支持，迫使本项目采用 `!important` 全量覆盖策略。

**正面评价**：
- 本项目 `MarkdownEditor.tsx` 的封装质量高：安全防护（DOMPurify + 标签白名单 + URL 转换 + 2MB 上限）、性能隔离（React.memo）、Props 精简
- `markdown-editor.css`（214 行）的覆盖基本完整（~95%），成功将 GitHub 风格转化为 Carbon 风格
- `data-color-mode="light"` 的显式设置确保了主题一致性
- 编辑区使用 IBM Plex Mono 完全符合 Carbon 的代码场景规范

**主要风险**：
- 约 50 条 `!important` 规则构成的 CSS 优先级战在未来库升级时可能导致样式回归
- 工具栏和编辑区的无障碍支持严重不足（缺少 ARIA、label、focus ring），影响屏幕阅读器和键盘用户
- 响应式行为完全缺失，移动端编辑体验差
- 两套重复的 Markdown 样式覆盖（编辑器预览 + 独立预览）增加维护负担

**综合评分 4.9/10** — 库的 UI 输出与 Carbon Design System 存在根本性不匹配，但本项目通过高质量的封装层和 214 行 CSS 覆盖有效弥补了大部分差距。建议重点修复无障碍问题（P1），其余为可接受的技术债。
