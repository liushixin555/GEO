# 软件UI专家评审：@uiw/react-markdown-preview Props.tsx

**文件**: `@uiw/react-markdown-preview/src/Props.tsx`
**评审角色**: 软件UI专家（用户界面设计 · 交互体验 · 设计系统合规 · 可访问性 · 开发者体验 · 组件API设计）
**评审日期**: 2026-05-24
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 组件API基本可用，但在设计系统对齐、主题支持、可访问性、开发者体验方面存在多项缺陷）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | `@uiw/react-markdown-preview` Markdown 预览组件的 Props 类型定义 |
| 代码行数 | 30 行 |
| 导出接口 | 2 个（`MarkdownPreviewProps`、`MarkdownPreviewRef`） |
| UI 相关属性 | `source`、`disableCopy`、`style`、`className`、`wrapperElement`、`onScroll`、`onMouseOver` |
| 主题支持 | `data-color-mode` 仅支持 `'light' | 'dark'`，无 `'auto'` |
| 可访问性属性 | 无专用 a11y props |

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 组件 API 设计（Component API Design） | 5 | Props 命名不一致、缺少关键 UI 控制属性 |
| 设计系统对齐（Design System Alignment） | 3 | 无 Token 支持、主题能力极弱、颜色模式受限 |
| 可访问性支持（Accessibility Support） | 2 | 无 ARIA props、无键盘交互声明、无语义化配置 |
| 开发者体验（Developer Experience） | 5 | 部分属性语义清晰，但类型冗余和弃用属性增加认知负担 |
| 响应式设计支持（Responsive Design） | 4 | 仅有 `style` 逃生舱口，无响应式 Props |
| 主题与暗色模式（Theme & Dark Mode） | 3 | 仅 `'light' | 'dark'` 两态，无自动跟随系统 |
| 交互事件覆盖（Interaction Events） | 5 | 提供 scroll 和 mouseOver，但缺少 click、keyDown 等 |
| 内容安全与渲染控制 | 6 | `rehypeRewrite` 提供了 HTML 重写能力 |
| **综合评分** | **4.1 / 10** | |

---

## 三、UI 层面问题清单

### P1 — 严重问题（影响 UI 合规与可访问性）

#### UI-P1-01：颜色模式缺失 `'auto'` — 无法跟随系统主题

```typescript
// 第 13-14 行
'data-color-mode'?: 'light' | 'dark';
```

**UI 问题分析**:

Carbon Design System 的暗色模式采用 Gray-100 Theme，并支持系统级主题跟随。现代 UI 组件库的基线要求是提供 `'auto'` / `'system'` 选项，使组件自动响应 `prefers-color-scheme` 媒体查询。

**当前限制**:
1. 消费者必须自行监听 `matchMedia('(prefers-color-scheme: dark)')` 并手动切换 `'light' | 'dark'`
2. 在系统主题切换时（如 macOS 自动切换浅色/深色），组件不会自动响应
3. 与 antd 5.x 的 ConfigProvider `theme.algorithm` 自动切换机制不兼容

**对项目的影响**: 本项目 `main.tsx` 通过 antd ConfigProvider 管理全局主题。如果 Markdown 预览组件无法跟随全局主题，需要在每个使用位置手动同步，增加维护负担并可能导致主题不一致的视觉割裂。

**建议修复**:

```typescript
'data-color-mode'?: 'light' | 'dark' | 'auto';
// 'auto' 模式下组件内部监听 prefers-color-scheme 并自动切换
```

---

#### UI-P1-02：无任何可访问性（a11y）Props — 屏幕阅读器无法正确解读

```typescript
export interface MarkdownPreviewProps extends Omit<Options, 'children'> {
  prefixCls?: string;
  className?: string;
  // ... 无 aria-* props
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onMouseOver?: (e: React.MouseEvent<HTMLDivElement>) => void;
  // ... 无 onKeyDown、onFocus、onBlur
}
```

**UI 问题分析**:

Markdown 预览区域是一个富内容容器，对屏幕阅读器用户而言：
1. **缺少 `role` 配置**：渲染后的 HTML 是一堆 `h1-h6`、`p`、`code`、`pre`、`table` 等元素，但没有根容器的 `role="document"` 或 `role="region"` 来提示屏幕阅读器这是一个内容块
2. **缺少 `aria-label` / `aria-labelledby`**：屏幕阅读器用户无法知道这个区域是"文章预览"还是"帮助文档"
3. **代码块复制功能（`disableCopy`）无 ARIA 反馈**：复制按钮缺少 `aria-label="复制代码"` 和复制成功后的 `aria-live="polite"` 通知

**WCAG 2.1 违规**:
- 1.3.1 Info and Relationships（信息与关系）：缺少角色和标签
- 2.4.6 Headings and Labels（标题和标签）：内容块无描述性标签
- 4.1.2 Name, Role, Value（名称、角色、值）：交互元素缺少可访问名称

**建议修复**:

```typescript
export interface MarkdownPreviewProps extends Omit<Options, 'children'> {
  /** 容器的 ARIA 标签 */
  ariaLabel?: string;
  /** 容器的 ARIA 角色，默认 'region' */
  role?: 'region' | 'document' | 'article';
  /** 代码块复制的 ARIA 反馈文案 */
  copyButtonText?: string;
  copySuccessText?: string;
}
```

---

#### UI-P1-03：`warpperElement` 拼写错误的弃用属性仍在公共 API 中 — 用户体验倒退

```typescript
// 第 16-21 行
/**
 * Please use wrapperElement, Will be removed in v5 release.
 * @deprecated
 */
warpperElement?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  'data-color-mode'?: 'light' | 'dark';
};
```

**UI 问题分析**:

这不是纯粹的代码质量问题 — 它直接影响开发者体验（DX）和 IDE 工具链：
1. **IDE 自动补全噪音**：开发者在输入 `wrap` 时，IDE 会同时建议 `wrapperElement`（正确）和 `warpperElement`（弃用），增加选择成本
2. **TypeScript `@deprecated` 划线**：弃用属性在编辑器中显示删除线，但两行上方就有正确属性，视觉上显得不专业
3. **文档和示例的维护负担**：组件文档需要同时解释两个属性的关系，增加新用户的认知负担
4. **属性名仅差两个字母**（`warpper` vs `wrapper`），在 code review 中极易被忽视

**Carbon Design System 视角**: Carbon 的组件 API 从不保留拼写错误的弃用属性。IBM 的 API 设计准则要求通过 major version 干净地移除错误。

**影响**: 在本项目使用此组件时，开发者可能误用 `warpperElement`，导致主题设置不生效且无任何运行时警告。

---

### P2 — 中等问题（影响设计系统集成和开发体验）

#### UI-P2-01：`wrapperElement` 类型过于复杂 — 逃离设计系统约束

```typescript
// 第 12-14 行
wrapperElement?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  'data-color-mode'?: 'light' | 'dark';
};
```

**UI 问题分析**:

`React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>` 是 React 内部的底层泛型类型，暴露了过多的 DOM 细节。从 UI 组件设计的角度：

1. **消费者可以传入任意 HTML 属性**（`onClick`、`tabIndex`、`dangerouslySetInnerHTML`），这破坏了组件的封装边界
2. **无法在设计系统层面约束样式**：消费者可以通过 `style` 属性注入任意 CSS，覆盖 Carbon Design System 的视觉规范
3. **与 antd 的 `wrapperStyle` / `wrapperClassName` 模式不一致**：antd 组件通常提供粒度可控的样式 props（`style`、`className`、`wrapperStyle`），而非暴露整个 HTML 属性集

**对比 antd 的做法**:

```typescript
// antd Card 的做法 — 粒度可控
interface CardProps {
  style?: CSSProperties;
  className?: string;
  bodyStyle?: CSSProperties;    // 细分区域样式
  headStyle?: CSSProperties;
  bordered?: boolean;           // 设计系统级开关
}
```

**对本项目的影响**: 在集成到本项目的 Carbon Design System 时，`wrapperElement` 的宽泛类型意味着无法通过 TypeScript 约束 Markdown 预览区域的设计系统合规性。

---

#### UI-P2-02：`disableCopy` 使用否定式命名 — 认知负担增加

```typescript
// 第 9 行
disableCopy?: boolean;
```

**UI 问题分析**:

否定式布尔属性在 UI 组件中是公认的反模式：
1. **双重否定逻辑**: `disableCopy={false}` 表示"不禁用复制"即"启用复制"，阅读时需要心算取反
2. **默认值不直观**: `disableCopy` 的默认值是 `undefined`（falsy），即默认不禁用（允许复制），但需要思考"undefined 取反是什么"
3. **与 antd 的命名模式不一致**: antd 使用正向命名（`allowClear`、`showSearch`、`bordered`）

**Carbon Design System 视角**: Carbon 的组件 API 一致性准则建议使用正向命名，如 `copyEnabled`、`showCopyButton`。

**建议**: 使用 `enableCopy` 或 `showCopyButton`，默认 `true`。

---

#### UI-P2-03：`source` 属性命名语义模糊 — 不符合 UI 心智模型

```typescript
// 第 8 行
source?: string;
```

**UI 问题分析**:

在 UI 组件的语境中，`source` 可能有多种含义：
- 数据源 URL
- 源代码内容
- 图片/媒体源

对于 Markdown 预览组件，更准确的命名应反映"要渲染的内容"，如：
- `content` — antd Typography 使用类似模式
- `value` — 常见表单控件（Input、TextArea）
- `markdown` — 明确指向 Markdown 格式内容
- `children` — React 的标准内容传递模式（已被 Omit）

**与本项目的交互**: 本项目中 Markdown 编辑器（`@uiw/react-md-editor`）使用 `value` prop 传递内容，但预览组件使用 `source`。编辑器和预览器的属性名不一致，增加了开发时的认知切换成本。

---

#### UI-P2-04：缺少加载状态和错误状态 Props — 内容渲染无反馈

```typescript
export interface MarkdownPreviewProps extends Omit<Options, 'children'> {
  // 无 loading prop
  // 无 error prop
  // 无 fallback/placeholder prop
}
```

**UI 问题分析**:

当 Markdown 内容较大或网络获取异步内容时，组件缺少状态管理的 UI 出口：
1. **无 loading 状态**: 大型 Markdown 文档渲染时可能出现白屏，无骨架屏或加载指示器
2. **无 error 状态**: Markdown 解析失败时，用户看到的是空白或错误堆栈，无友好的错误提示
3. **无 placeholder/fallback**: `source` 为空时，组件渲染空白区域，无空状态设计

**对比 antd 的模式**:
- antd `Spin` 组件提供 `spinning` + `indicator` 控制加载
- antd `Result` 组件提供 `status="error"` 控制错误展示
- antd `Empty` 组件提供标准空状态

**对项目的影响**: 在文章详情页（`ArticleDetail.tsx`）中，如果 Markdown 内容加载失败或为空，需要在外部手动包裹加载/错误/空状态组件，增加了使用成本。

---

#### UI-P2-05：事件处理不完整 — 缺少核心交互事件

```typescript
onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
onMouseOver?: (e: React.MouseEvent<HTMLDivElement>) => void;
// 缺少: onClick、onKeyDown、onFocus、onBlur
```

**UI 问题分析**:

1. **`onMouseOver` 但无 `onMouseOut`**: 仅提供鼠标进入事件而无离开事件，无法实现完整的 hover 效果。且 `onMouseOver` 会冒泡触发（每个子元素都会触发），应使用 `onMouseEnter` / `onMouseLeave`
2. **缺少 `onClick`**: Markdown 预览中的链接点击（`<a>` 标签）是最常见的交互行为，但没有被代理到 Props 层面
3. **缺少键盘事件**: 无 `onKeyDown`，无法在预览区域实现键盘快捷键（如 `Ctrl+F` 搜索）

**Carbon Design System 视角**: Carbon 的交互组件要求提供完整的事件处理接口，尤其是键盘交互（Carbon 遵循 WAI-ARIA Authoring Practices）。

---

#### UI-P2-06：`prefixCls` 暴露内部实现 — 破坏设计系统封装

```typescript
// 第 6 行
prefixCls?: string;
```

**UI 问题分析**:

`prefixCls` 是 antd 的内部样式前缀机制，用于支持 `ConfigProvider.prefixCls` 的全局自定义。但 `@uiw/react-markdown-preview` 不是 antd 组件，暴露 `prefixCls` 有以下问题：

1. **跨设计系统泄漏**: 消费者可能误以为此组件支持 antd 的 ConfigProvider 主题系统，但实际上 `prefixCls` 仅影响 CSS class 前缀
2. **CSS class 前缀修改 ≠ 主题定制**: 修改 `prefixCls` 只会改变 class 名称（如 `.wmde-markdown` → `.custom-markdown`），不会改变任何样式值（颜色、字体、间距）
3. **与本项目的主题机制冲突**: 本项目使用 antd ConfigProvider + CSS 变量实现 Carbon Design System。Markdown 预览组件的样式通过 `global.css` 覆盖，`prefixCls` 的修改会破坏已有的 CSS 选择器

---

### P3 — 轻微问题（UI 品质与开发便利性）

#### UI-P3-01：`pluginsFilter` 缺少过滤粒度 — 无法精确控制 UI 渲染

```typescript
// 第 11 行
pluginsFilter?: (type: 'rehype' | 'remark', plugin: PluggableList) => PluggableList;
```

**UI 问题分析**:

`pluginsFilter` 提供了全局级别的插件过滤能力，但从 UI 控制角度：
1. **只能全量过滤**: 无法单独禁用"代码语法高亮"、"数学公式渲染"、"任务列表"等具体 UI 功能
2. **参数名 `plugin` 与类型 `PluggableList`（列表）不匹配**: 语义混乱，增加理解成本
3. **缺少布尔开关**: Carbon 和 antd 的组件通常为每个视觉功能提供独立的开关（如 `showLineNumbers`、`highlightEnabled`）

**理想的设计**:

```typescript
export interface MarkdownPreviewProps {
  /** 功能级开关 */
  showLineNumbers?: boolean;
  highlightCode?: boolean;
  enableMath?: boolean;
  enableMermaid?: boolean;
  /** 全局插件过滤（高级用法） */
  pluginsFilter?: (phase: 'rehype' | 'remark', plugins: PluggableList) => PluggableList;
}
```

---

#### UI-P3-02：`style` 和 `className` 缺少区域细分 — 无法精确控制子区域样式

```typescript
// 第 7 行、第 10 行
className?: string;
style?: React.CSSProperties;
```

**UI 问题分析**:

仅有根级别的 `className` 和 `style`，无法精确控制 Markdown 渲染的子区域：
- 标题样式（h1-h6）
- 代码块样式
- 表格样式
- 引用块样式

antd 的组件通常提供细分的样式 Props（如 Card 的 `bodyStyle`、`headStyle`、`actionsStyle`）。

**对本项目的影响**: 本项目需要将 Markdown 预览的视觉对齐到 Carbon Design System。仅靠根级 `className` + 全局 CSS 覆盖（`.wmde-markdown h1 { ... }`）实现，无法保证所有子元素的设计系统合规。

---

#### UI-P3-03：`MarkdownPreviewRef` 暴露全部 Props — 命令式 API 设计不当

```typescript
// 第 27-29 行
export interface MarkdownPreviewRef extends MarkdownPreviewProps {
  mdp: React.RefObject<HTMLDivElement>;
}
```

**UI 问题分析**:

从 UI 交互角度，Ref 接口应仅暴露命令式操作：
1. **`mdp`（RefObject<HTMLDivElement>）** 是唯一合理的 Ref 属性 — 允许外部获取 DOM 节点进行滚动控制
2. **继承全部 Props 到 Ref 是 UI 设计反模式**: `ref.current.source = 'xxx'` 不会触发 React 重渲染，消费者误用时导致 UI 状态不一致

**理想的 Ref 设计**:

```typescript
export interface MarkdownPreviewRef {
  /** 获取预览区根 DOM 节点 */
  mdp: React.RefObject<HTMLDivElement>;
  /** 滚动到顶部 */
  scrollToTop(): void;
  /** 滚动到指定锚点 */
  scrollToAnchor(anchor: string): void;
}
```

---

#### UI-P3-04：缺少 `onScroll` 和 `onMouseOver` 的配套属性

```typescript
onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
onMouseOver?: (e: React.MouseEvent<HTMLDivElement>) => void;
```

**UI 问题分析**:
- `onMouseOver` 应改为 `onMouseEnter`（前者冒泡，后者不冒泡）
- 缺少 `onScroll` 的配套：`onScrollToTop`、`onScrollToBottom` 语义化回调
- 在实际 UI 场景中，更常见的需求是"滚动到某个标题"（目录同步），而非监听原始滚动事件

---

## 四、DESIGN.md 合规性映射分析

由于 `Props.tsx` 是第三方组件库的类型定义，不直接涉及 DESIGN.md 的 CSS/布局实现。但通过其 Props 设计，可以评估集成到 Carbon Design System 时的合规难度：

| DESIGN.md 规范 | Props 支持度 | 合规难度 | 说明 |
|---|---|---|---|
| `colors.primary` #0f62fe（链接色） | ❌ 不支持 | 🔴 高 | 需通过 CSS 覆盖 `.wmde-markdown a { color: #0f62fe }` |
| `rounded.none` 0px（圆角） | ❌ 不支持 | 🟡 中 | 需通过 CSS 覆盖所有内部元素的 border-radius |
| IBM Plex Sans 字体 | ❌ 不支持 | 🟡 中 | 需通过 CSS 覆盖 font-family |
| `letter-spacing: 0.16px` | ❌ 不支持 | 🟡 中 | 需通过 CSS 覆盖 |
| 4px 间距网格 | ❌ 不支持 | 🟡 中 | 需通过 CSS 逐一调整 margin/padding |
| 暗色模式（Gray-100 Theme） | ⚠️ 部分 | 🟠 中 | `data-color-mode='dark'` 可切换，但无 auto |
| 代码块主题 | ❌ 不支持 | 🔴 高 | 无 Props 控制代码高亮主题，需全局 CSS |

**综合评估**: 将此组件对齐到 Carbon Design System 需要 **大量 CSS 覆盖工作**（约 50+ 条 CSS 规则），且无 Props 级别的保障。当组件升级时，CSS 选择器可能失效。

---

## 五、与 antd 集成兼容性分析

| antd 模式 | Props 兼容性 | 说明 |
|---|---|---|
| ConfigProvider 主题 | ❌ 不兼容 | `prefixCls` 仅影响 class 前缀，不接入 ConfigProvider |
| Design Token | ❌ 不兼容 | 无法使用 antd 5.x 的 CSS-in-JS Token 系统 |
| 国际化 (i18n) | ❌ 不兼容 | 无 locale props，复制按钮文案硬编码英文（"Copy"） |
| Form 集成 | ⚠️ 受限 | `source` 而非 `value`，需要适配器才能与 `Form.Item` 配合 |
| 空状态 (Empty) | ❌ 不支持 | `source` 为空时无标准空状态 |
| 加载状态 (Spin) | ❌ 不支持 | 无 `loading` prop |
| 错误边界 | ❌ 不支持 | 无 `error` prop |

---

## 六、改进建议汇总

| 优先级 | 编号 | 建议 | 工作量 | UI 收益 |
|---|---|---|---|---|
| P1 | UI-P1-01 | `data-color-mode` 增加 `'auto'` 选项 | 小 | 系统主题跟随 |
| P1 | UI-P1-02 | 添加 `ariaLabel`、`role` 等 a11y props | 小 | WCAG 合规 |
| P1 | UI-P1-03 | v5 前彻底移除 `warpperElement` | 小 | DX 改善 |
| P2 | UI-P2-01 | 简化 `wrapperElement` 类型，提供 `wrapperStyle` + `wrapperClassName` | 中 | 设计系统可控 |
| P2 | UI-P2-02 | `disableCopy` 改为 `enableCopy` 或 `showCopyButton` | 小 | 命名一致性 |
| P2 | UI-P2-03 | `source` 改为 `content` 或 `value` | 小 | 语义清晰 |
| P2 | UI-P2-04 | 添加 `loading`、`error`、`emptyText` props | 中 | 状态管理 |
| P2 | UI-P2-05 | 补充 `onClick`、`onKeyDown`、`onMouseEnter/Leave` | 小 | 交互完整性 |
| P2 | UI-P2-06 | 移除或文档化 `prefixCls` 的局限性 | 小 | 防止误用 |
| P3 | UI-P3-01 | 添加 `showLineNumbers`、`highlightCode` 等功能开关 | 中 | UI 精细控制 |
| P3 | UI-P3-02 | 添加 `bodyClassName`、`codeClassName` 等子区域样式 props | 中 | 设计系统对齐 |
| P3 | UI-P3-03 | Ref 接口仅保留命令式操作 | 中 | API 正确性 |

---

## 七、对本项目的集成建议

鉴于 `Props.tsx` 是第三方库（`@uiw/react-markdown-preview`）的类型定义，我们无法直接修改其源码。但从 UI 集成角度，建议本项目采取以下策略：

### 7.1 创建封装组件 — 隔离设计系统差异

```tsx
// pages/components/MarkdownViewer.tsx
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Typography, Empty, Spin, ConfigProvider } from 'antd';
import './markdown-viewer.css'; // Carbon Design System 覆盖样式

interface MarkdownViewerProps {
  content?: string;
  loading?: boolean;
  error?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, loading, error }) => {
  if (loading) return <Spin />;
  if (error) return <Typography.Text type="danger">{error}</Typography.Text>;
  if (!content) return <Empty description="暂无内容" />;

  return (
    <MarkdownPreview
      source={content}
      wrapperElement={{ 'data-color-mode': 'light' }}
    />
  );
};
```

### 7.2 CSS 覆盖清单（对齐 Carbon Design System）

```css
/* markdown-viewer.css — Carbon Design System 覆盖 */
.wmde-markdown {
  font-family: 'IBM Plex Sans', sans-serif;
  color: var(--color-ink, #161616);
  letter-spacing: 0.16px;
  line-height: 1.50;
}

.wmde-markdown a {
  color: var(--color-primary, #0f62fe);
}

.wmde-markdown h1, .wmde-markdown h2, .wmde-markdown h3 {
  font-weight: 400;
}

.wmde-markdown code {
  border-radius: 0;
}

.wmde-markdown pre {
  border-radius: 0;
  background-color: var(--color-surface-1, #f4f4f4);
}

.wmde-markdown table {
  border-radius: 0;
}

.wmde-markdown blockquote {
  border-left-color: var(--color-primary, #0f62fe);
}
```

---

## 八、评审总结

`Props.tsx` 作为 `@uiw/react-markdown-preview` 组件的公共类型契约，从 UI 专家视角审视，暴露了以下核心问题：

1. **最严重的 UI 缺陷**: 无可访问性支持（UI-P1-02）——组件在 WCAG 2.1 合规性上完全缺失，影响屏幕阅读器用户的基本使用
2. **最影响设计系统集成的问题**: 颜色模式仅支持 `'light' | 'dark'`（UI-P1-01）且无 Design Token 支持，集成到 Carbon Design System 需要大量 CSS 覆盖
3. **最影响开发者体验的问题**: `warpperElement` 拼写错误的弃用属性（UI-P1-03）和 `wrapperElement` 的过度复杂类型（UI-P2-01）增加了集成时的认知负担
4. **最影响功能完整性的问题**: 缺少加载/错误/空状态管理 Props（UI-P2-04），消费者需要在外部手动处理所有非正常状态

**综合评分 4.1/10** — 组件具备基本的 Markdown 渲染功能，但从设计系统对齐、可访问性、开发者体验的角度来看，Props API 设计不够成熟。建议本项目通过创建封装组件来隔离第三方库的设计系统差异，并在 CSS 层面进行 Carbon Design System 的视觉对齐。

---

*软件UI专家评审完成 — 2026-05-24*
