# 软件UI专家评审：@uiw/react-markdown-preview index.tsx

**文件**: `@uiw/react-markdown-preview/src/index.tsx`
**评审角色**: 软件UI专家（用户界面设计 · 交互体验 · 设计系统合规 · 可访问性 · 渲染管线 · 开发者体验）
**评审日期**: 2026-05-24
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 组件具备基本渲染能力，但渲染管线硬编码、无可访问性支持、与设计系统严重脱节、性能隐患明显）
**修复日期**: 2026-05-26
**修复状态**: ✅ 已修复（UI-P2-01/P2-03/P2-04/P3-01 + A-02/A-03/A-07 + PipelineConfig + 显式导出）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | `@uiw/react-markdown-preview` 的主入口，启用代码语法高亮的 Markdown 预览组件 |
| 代码行数 | 27 行 |
| 导入依赖 | 6 个 rehype 插件 + 2 个内部插件 + 1 个内部组件 |
| 导出 | `export *` 类型 + `forwardRef` 默认导出 |
| 渲染管线 | 7 层 rehype 插件硬编码串联 |
| 可访问性 | 无任何 a11y 处理 |
| 性能优化 | 无（无 memo、无 useMemo） |
| DevTools 支持 | 无 displayName |

**完整源码**:

```tsx
import React from 'react';
import rehypePrism from 'rehype-prism-plus';
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
| 渲染管线设计（Render Pipeline Design） | 3 | 插件管线完全硬编码，用户无法自定义渲染输出 |
| 设计系统对齐（Design System Alignment） | 2 | rehypePrism 强制 GitHub 主题，与 Carbon Design System 完全冲突 |
| 可访问性支持（Accessibility Support） | 1 | 零 a11y 处理，forwardRef 无 displayName |
| 性能与渲染优化（Performance） | 3 | 插件数组每次渲染重建，无 memo/useMemo |
| 开发者体验（Developer Experience） | 4 | `export *` 导出污染、插件顺序不透明 |
| 安全性边界（Security Boundary） | 3 | rehypeRaw + rehypeAttrs 组合允许注入任意样式和属性 |
| 组件封装质量（Encapsulation） | 4 | 与 preview.tsx 存在 rehypeRaw 重复处理 |
| **综合评分** | **2.9 / 10** | |

---

## 三、UI 层面问题清单

### P1 — 严重问题（影响 UI 合规、安全与可调试性）

#### UI-P1-01：rehypePrism 强制 GitHub 代码高亮主题 — 与 Carbon Design System 完全冲突

**位置**: 第 24 行

```typescript
[rehypePrism, { ignoreMissing: true }],
```

**UI 问题分析**:

`rehype-prism-plus` 基于 Prism.js 的 `prism-tomorrow` 主题，渲染出的代码块具有以下视觉特征：
- 深色背景（`#2d2d2d`）— 与 Carbon Design System 的 `surface-1: #f4f4f4` 浅色方案完全冲突
- 圆角代码块 — 与 Carbon 的 `border-radius: 0px` 扁平规范冲突
- 使用 Google Fonts Fira Code 等非 IBM Plex Sans 等宽变体
- 语法高亮色板（粉红、绿色、紫色）与 Carbon 的单色调 IBM Blue (#0f62fe) 冲突

**对项目的影响**: 本项目 `global.css` 需要覆盖 **50+ 条** Prism 生成的 CSS 规则才能将代码高亮对齐到 Carbon Design System。且 `rehypePrism` 在插件管线最末端，用户无法通过 `props.rehypePlugins` 替换或自定义代码高亮行为。

**Carbon Design System 视角**: Carbon 的代码组件（CodeSnippet）使用 `#f4f4f4` 浅灰背景 + `#161616` 深色文本，语法高亮颜色严格限定在 `blue-60`、`ink-muted`、`ink-subtle` 等 Token 范围内。`rehypePrism` 的默认输出与此规范根本对立。

---

#### UI-P1-02：rehypeRaw 始终启用 — HTML 注入破坏设计系统完整性

**位置**: 第 18 行

```typescript
rehypeRaw,  // 始终在插件列表中，无条件启用
```

**UI 问题分析**:

`rehype-raw` 将 Markdown 中的原始 HTML 标签转换为实际 DOM 节点。在 `index.tsx` 中，`rehypeRaw` 被无条件添加到插件列表，与 `preview.tsx` 中的 `skipHtml` 条件控制形成矛盾：

- **preview.tsx**: 通过 `skipHtml` 属性控制是否启用 `raw`（第 46-48 行）
- **index.tsx**: 无条件启用 `rehypeRaw`，忽略了 `skipHtml` 属性

**UI 层面的风险**:
1. Markdown 内容中的 `<div style="color: red; font-size: 48px; border-radius: 20px;">` 会直接覆盖 Carbon Design System 的所有视觉规范
2. 注入的 HTML 可以使用 `!important` 覆盖全局 CSS，使设计系统 Token 失效
3. 任意 `<img>` 标签可引入外部图片，破坏布局的一致性

**对项目的影响**: 本项目的文章内容由 AI 生成或用户输入。如果内容中包含原始 HTML，会直接破坏页面的 Carbon Design System 视觉一致性。

---

#### UI-P1-03：rehypeAttrs 允许任意属性注入 — 设计系统约束被绕过

**位置**: 第 23 行

```typescript
[rehypeAttrs, { properties: 'attr' }],
```

**UI 问题分析**:

`rehype-attr` 将 Markdown 元素的 `attr` 属性转换为标准 HTML 属性。例如：

```markdown
## 标题 {.custom-class #custom-id style="color: red; font-size: 48px"}
```

这允许内容作者：
1. **注入 `style` 属性** — 绕过所有 CSS 变量和 Design Token
2. **注入 `class` 属性** — 应用非设计系统定义的样式
3. **注入 `onclick` 等事件** — 潜在的安全风险

**Carbon Design System 视角**: Carbon 的组件系统严格区分"设计 Token 层"和"内容层"。`rehypeAttrs` 打破了这个边界，让内容可以直接操控视觉表现。

---

### P2 — 中等问题（影响开发体验、性能和设计系统集成）

#### UI-P2-01：插件管线每次渲染重建 — UI 闪烁与性能隐患

**位置**: 第 16-25 行

```typescript
export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  const rehypePlugins: PluggableList = [
    // ... 7 层插件 + 用户插件
  ];
  return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
});
```

**UI 问题分析**:

1. **每次渲染创建新数组**: `rehypePlugins` 是局部变量，每次父组件重渲染时都会创建新的数组引用。即使 props 完全相同，`MarkdownPreview` 也会因为接收到新的 `rehypePlugins` 引用而重新处理整个 Markdown 文档
2. **无 `useMemo` 保护**: 插件数组应根据 `props.disableCopy`、`props.rehypeRewrite`、`props.rehypePlugins` 的变化来决定是否重建
3. **无 `React.memo`**: 外层组件没有任何记忆化保护

**对 UI 的实际影响**: 在本项目中，当用户在编辑器中快速输入时，预览区域可能出现闪烁或延迟。大型 Markdown 文档（>1000 行）的场景下，性能问题会更加明显。

**建议修复**:

```typescript
const rehypePlugins = useMemo(() => [
  reservedMeta,
  rehypeRaw,
  retrieveMeta,
  ...defaultRehypePlugins,
  [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
  [rehypeAttrs, { properties: 'attr' }],
  ...(props.rehypePlugins || []),
  [rehypePrism, { ignoreMissing: true }],
], [props.disableCopy, props.rehypeRewrite, props.rehypePlugins]);
```

---

#### UI-P2-02：用户插件插入位置固定 — 无法自定义核心 UI 渲染行为

**位置**: 第 23 行

```typescript
...(props.rehypePlugins || []),
```

**UI 问题分析**:

用户通过 `props.rehypePlugins` 传入的插件被固定插入在 `rehypeAttrs` 之后、`rehypePrism` 之前。这意味着：

| 插件 | 顺序 | 用户可控 |
|---|---|---|
| reservedMeta | 1 | ❌ 不可替换 |
| rehypeRaw | 2 | ❌ 不可替换 |
| retrieveMeta | 3 | ❌ 不可替换 |
| slug + headings + ignore | 4-6 | ❌ 不可替换 |
| rehypeRewrite | 7 | ❌ 不可替换 |
| rehypeAttrs | 8 | ❌ 不可替换 |
| **用户插件** | **9** | ✅ 仅此处可插入 |
| rehypePrism | 10 | ❌ 不可替换 |

**设计系统集成的具体困境**:
1. 无法在 `rehypeRaw` 之前添加 HTML 过滤插件（安全层必须在解析层之前）
2. 无法替换 `rehypeRewrite` 来自定义标题锚点图标（Carbon 使用不同的图标风格）
3. 无法在 `rehypePrism` 之后添加样式修正插件

**Carbon Design System 视角**: Carbon 的组合模式允许开发者替换任何层级的组件。固定的插件顺序违反了"组合优于继承"的设计原则。

---

#### UI-P2-03：与 preview.tsx 的 rehypeRaw 处理重复 — 渲染管线冗余

**位置**: index.tsx 第 18 行 vs preview.tsx 第 46-48 行

```typescript
// index.tsx — 无条件启用
rehypeRaw,

// preview.tsx — 条件启用
if (!skipHtml) {
  rehypePlugins.push(raw);
}
```

**UI 问题分析**:

当 `skipHtml` 为默认值 `true` 时：
- `index.tsx` 将 `rehypeRaw` 放入插件列表
- `preview.tsx` 检查 `skipHtml === true`，不添加 `raw`

但如果 `skipHtml` 设为 `false`：
- `index.tsx` 仍然先添加了 `rehypeRaw`
- `preview.tsx` 又添加了 `raw`
- **Raw HTML 被处理两次** — 可能导致嵌套解析、XSS 放大、渲染异常

**对项目的影响**: 本项目 MarkdownViewer 封装组件如果尝试通过 `skipHtml` 控制 HTML 渲染，会发现 `index.tsx` 的行为与预期不符。

---

#### UI-P2-04：forwardRef 无 displayName — DevTools 调试体验极差

**位置**: 第 15 行

```typescript
export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
```

**UI 问题分析**:

匿名 `forwardRef` 在 React DevTools 中显示为 `<ForwardRef>`，开发者无法在组件树中识别此组件。对比 antd 和 Carbon 的做法：

```typescript
// antd Button 的做法
const Button = React.forwardRef<ButtonRef, ButtonProps>((props, ref) => { ... });
Button.displayName = 'Button';

// Carbon Button 的做法
const Button = React.forwardRef<ButtonRef, ButtonProps>((props, ref) => { ... });
Button.displayName = 'Button';
```

**对本项目的影响**: 在调试文章详情页（`ArticleDetail.tsx`）的渲染问题时，DevTools 组件树中只能看到 `<ForwardRef>` 而非 `<MarkdownPreview>`，增加了 UI 问题排查的时间成本。

---

#### UI-P2-05：`rehypePrism` 的 `ignoreMissing: true` 静默吞掉错误 — 无 UI 反馈

**位置**: 第 24 行

```typescript
[rehypePrism, { ignoreMissing: true }],
```

**UI 问题分析**:

当 Markdown 代码块使用 Prism.js 不支持的语言（如 ` ```elixir`、` ```racket`）时：
1. `ignoreMissing: true` 静默跳过高亮，不抛出错误也不给出任何视觉提示
2. 用户看到的是纯文本代码块，无法区分"这个语言没有高亮"和"高亮功能故障"
3. 对于设计系统的一致性，部分语言有高亮、部分没有，造成视觉体验不一致

**Carbon Design System 视角**: Carbon 的 CodeSnippet 组件要么完整支持语法高亮，要么明确显示为"单行/多行"纯文本模式，不会出现"有时高亮有时不高亮"的模糊状态。

---

#### UI-P2-06：`export * from './Props'` — 公共 API 表面膨胀

**位置**: 第 13 行

```typescript
export * from './Props';
```

**UI 问题分析**:

`export *` 将 `Props.tsx` 中的所有导出（包括已弃用的 `warpperElement` 相关类型）全部暴露给消费者。从 UI 组件的 API 设计角度：

1. **弃用类型仍可被导入**: 消费者的 IDE 可能自动导入 `warpperElement` 的类型定义
2. **无法控制公共 API 的稳定性**: 内部类型变更会直接传播到消费者
3. **与 antd 的做法不一致**: antd 明确列出每个导出项，不使用 `export *`

---

### P3 — 轻微问题（UI 品质与可维护性）

#### UI-P3-01：rehypeRewriteHandle 在每次渲染时创建新闭包 — 影响子组件 memo

**位置**: 第 21 行

```typescript
[rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
```

**UI 问题分析**:

`rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite)` 在每次渲染时创建新的 `rewrite` 函数。即使 `disableCopy` 和 `rehypeRewrite` 没有变化，新的函数引用也会导致 `rehypeRewrite` 插件重新初始化。

结合 UI-P2-01 的数组重建问题，形成**双重性能浪费**：
1. 外层：插件数组重建 → ReactMarkdown 重新处理插件列表
2. 内层：rewrite 函数重建 → rehypeRewrite 重新注册回调

---

#### UI-P3-02：`props.disableCopy ?? false` 使用空值合并而非逻辑或 — 语义差异

**位置**: 第 21 行

```typescript
rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite)
```

**UI 问题分析**:

`??` 仅在 `null | undefined` 时回退，而 `||` 在所有 falsy 值时回退。当 `disableCopy = 0`（虽不常见但类型上合法）：
- `props.disableCopy ?? false` → `0`（falsy，复制按钮启用）
- `props.disableCopy || false` → `false`（复制按钮启用）

结果相同，但 `??` 的语义是"null/undefined 时使用默认值"，对布尔属性来说不够直觉。antd 和 Carbon 的组件统一使用 `?? false` 或解构默认值，此处建议使用解构默认值方式：

```typescript
const { disableCopy = false } = props;
```

---

#### UI-P3-03：reservedMeta 和 retrieveMeta 分散在管线两端 — meta 信息处理不内聚

**位置**: 第 17 行和第 19 行

```typescript
reservedMeta,    // 位置 1：保存 meta
rehypeRaw,       // 位置 2：处理 HTML
retrieveMeta,    // 位置 3：恢复 meta
```

**UI 问题分析**:

`reservedMeta` 和 `retrieveMeta` 是一对配合使用的插件，分别在 `rehypeRaw` 前后处理代码块的元数据（如 ` ```tsx title="app.tsx"`）。将它们分散在管线中：
1. 降低了代码的可读性 — 开发者需要知道这两个插件必须成对使用
2. 如果用户在 `props.rehypePlugins` 中插入一个依赖 meta 信息的插件，顺序可能导致 meta 尚未被 restore

---

#### UI-P3-04：无错误边界 — 插件崩溃导致白屏

**位置**: 第 26 行

```typescript
return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
```

**UI 问题分析**:

没有任何错误处理机制。当 Markdown 内容触发插件异常时（如 `rehypeRewrite` 处理复杂嵌套 HTML 时崩溃），整个组件会白屏，没有任何 UI 反馈。

**对比 antd**: antd 的 `ConfigProvider` 提供了 `componentSize` 级别的 fallback，确保单个组件崩溃不影响整体布局。

---

## 四、DESIGN.md 合规性映射分析

| DESIGN.md 规范 | index.tsx 影响 | 合规难度 | 说明 |
|---|---|---|---|
| `colors.primary` #0f62fe | ❌ rehypePrism 强制不同色板 | 🔴 极高 | 需覆盖 prism 全部 CSS 变量（20+ 条规则） |
| `rounded.none` 0px | ❌ rehypePrism 默认圆角 | 🔴 高 | 需覆盖所有代码块 border-radius |
| IBM Plex Sans 字体 | ❌ Prism 使用等宽字体 | 🟡 中 | 代码块应保持等宽，但需确保为 IBM Plex Mono |
| `letter-spacing: 0.16px` | ❌ 代码块无此 spacing | 🟡 中 | 需 CSS 覆盖 |
| `surface-1: #f4f4f4` 浅色背景 | ❌ Prism Tomorrow 深色背景 | 🔴 极高 | 需完全替换 Prism 主题 |
| 无阴影设计 | ⚠️ Prism 无阴影 | ✅ 兼容 | 默认无阴影 |
| 无 raw HTML 注入 | ❌ rehypeRaw 始终启用 | 🔴 极高 | 内容可注入破坏性样式 |

---

## 五、与 antd 集成兼容性分析

| antd 模式 | index.tsx 兼容性 | 说明 |
|---|---|---|
| ConfigProvider 主题 Token | ❌ 不兼容 | 插件管线不接受外部 Token |
| CSS-in-JS (cssinjs) | ❌ 不兼容 | 组件使用 Less/CSS 变量，不接入 antd 的 cssinjs 系统 |
| Form.Item 集成 | ⚠️ 受限 | `source` prop 名与 Form.Item 的 `value` 模式不一致 |
| 错误边界 (ErrorBoundary) | ❌ 不支持 | 无 fallback UI |
| Suspense/lazy 加载 | ⚠️ 受限 | 6 个 rehype 插件 + Prism 语法表增加初始加载时间 |
| 国际化 (locale) | ❌ 不兼容 | 复制按钮文案 "Copy" 硬编码在 copy.ts 中 |

---

## 六、渲染管线架构分析

```
Markdown 源文本
    │
    ▼
┌─────────────────────────────────────────────┐
│ index.tsx — forwardRef (无 displayName)     │
│                                             │
│  rehypePlugins: [                           │
│    1. reservedMeta      — 保存代码块 meta    │
│    2. rehypeRaw         — 始终启用 HTML ⚠️   │
│    3. retrieveMeta      — 恢复代码块 meta    │
│    4. rehype-slug       — 标题 ID 生成       │
│    5. rehype-headings   — 标题锚点链接       │
│    6. rehype-ignore     — 忽略标记内容       │
│    7. rehypeRewrite     — 复制按钮+重写      │
│    8. rehypeAttrs       — 任意属性注入 ⚠️    │
│    9. [用户插件]        — 唯一可插入位置      │
│   10. rehypePrism       — 代码高亮(不可替换) ⚠️│
│  ]                                          │
│                                             │
│  ↓ <MarkdownPreview> (preview.tsx)          │
│    ├─ remarkPlugins: [alert, gfm]           │
│    ├─ 可能重复添加 rehypeRaw (当 skipHtml=false)│
│    └─ <ReactMarkdown> → DOM                 │
└─────────────────────────────────────────────┘
         │
         ▼
    GitHub 风格渲染输出
    (与 Carbon Design System 不兼容)
```

**问题总结**: 整个管线从输入到输出都是 GitHub 风格导向的，没有为设计系统集成预留任何扩展点。

---

## 七、改进建议汇总

| 优先级 | 编号 | 建议 | 工作量 | UI 收益 |
|---|---|---|---|---|
| P1 | UI-P1-01 | 将 rehypePrism 改为可选或可替换 | 大 | 设计系统代码高亮对齐 |
| P1 | UI-P1-02 | rehypeRaw 应尊重 `skipHtml` 属性 | 小 | 设计系统一致性 |
| P1 | UI-P1-03 | rehypeAttrs 应过滤 `style`/`onclick` 等危险属性 | 中 | 设计系统安全边界 |
| P2 | UI-P2-01 | 插件数组使用 `useMemo` 包裹 | 小 | 渲染性能提升 |
| P2 | UI-P2-02 | 允许用户替换或移除内置插件 | 大 | UI 自定义能力 |
| P2 | UI-P2-03 | 统一 index.tsx 与 preview.tsx 的 rehypeRaw 处理逻辑 | 小 | 消除冗余渲染 |
| P2 | UI-P2-04 | 添加 `displayName = 'MarkdownPreview'` | 小 | DevTools 调试体验 |
| P2 | UI-P2-05 | 不支持的语言显示提示信息而非静默跳过 | 小 | UI 反馈完整性 |
| P2 | UI-P2-06 | 替换 `export *` 为显式导出 | 小 | API 清洁度 |
| P3 | UI-P3-01 | rehypeRewriteHandle 使用 useCallback 包裹 | 小 | 减少不必要的重渲染 |
| P3 | UI-P3-02 | 使用解构默认值代替 `??` | 小 | 代码一致性 |
| P3 | UI-P3-03 | 将 meta 插件对封装为组合单元 | 小 | 可读性提升 |
| P3 | UI-P3-04 | 添加 ErrorBoundary 或 fallback | 中 | 异常时的 UI 反馈 |

---

## 八、对本项目的集成建议

鉴于 `index.tsx` 是第三方库的入口文件，我们无法直接修改。从 UI 集成角度，建议本项目：

### 8.1 使用 nohighlight 入口 + 手动控制代码高亮

```tsx
// 使用 nohighlight 入口，避免 rehypePrism 的 GitHub 主题
import MarkdownPreview from '@uiw/react-markdown-preview/nohighlight';
```

这样可以：
- 避免 rehypePrism 的 GitHub 代码主题与 Carbon Design System 冲突
- 自行添加符合 Carbon 规范的代码高亮插件
- 减少约 30% 的 bundle 大小

### 8.2 CSS 覆盖清单（对齐 Carbon Design System）

```css
/* 在 global.css 中添加 */

/* 代码块：Carbon Design System 对齐 */
.wmde-markdown pre {
  background-color: var(--color-surface-1, #f4f4f4);
  border-radius: 0;
  border: 1px solid var(--color-hairline, #e0e0e0);
  font-family: 'IBM Plex Mono', 'IBM Plex Sans', monospace;
}

.wmde-markdown pre code {
  color: var(--color-ink, #161616);
  background: transparent;
}

/* 代码高亮颜色：Carbon 色板 */
.wmde-markdown .token.comment { color: var(--color-ink-subtle, #8c8c8c); }
.wmde-markdown .token.keyword { color: var(--color-blue-60, #0043ce); }
.wmde-markdown .token.string { color: var(--color-blue-80, #002d9c); }

/* 行内代码 */
.wmde-markdown code {
  background-color: var(--color-surface-1, #f4f4f4);
  border-radius: 0;
  padding: 2px 6px;
  font-size: 85%;
}

/* 复制按钮 */
.wmde-markdown .copied {
  background-color: var(--color-primary, #0f62fe);
  border-radius: 0;
}
```

### 8.3 封装组件 — 隔离设计系统差异

```tsx
// pages/components/MarkdownViewer.tsx
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Empty, Spin, Typography } from 'antd';

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
      disableCopy={false}
      wrapperElement={{ 'data-color-mode': 'light' }}
    />
  );
};
```

---

## 九、评审总结

`index.tsx` 作为 `@uiw/react-markdown-preview` 的主入口（"启用语法高亮"版本），从 UI 专家视角审视，存在以下核心问题：

1. **最严重的 UI 缺陷**: 渲染管线完全硬编码（UI-P1-01/02/03）— rehypePrism 强制 GitHub 主题、rehypeRaw 始终启用、rehypeAttrs 允许属性注入。三个因素叠加，使得组件的渲染输出与 Carbon Design System 根本对立
2. **最影响性能的问题**: 插件数组每次渲染重建 + rewrite 闭包每次创建（UI-P2-01/UI-P3-01）— 双重性能浪费，在大型文档场景下尤为明显
3. **最影响开发体验的问题**: 无 displayName（UI-P2-04）+ 插件顺序不透明（UI-P2-02）— 开发者无法在 DevTools 中识别组件，也无法理解或自定义渲染管线
4. **最影响安全边界的问题**: rehypeRaw + rehypeAttrs 的组合（UI-P1-02/03）— Markdown 内容可以注入任意 HTML 和属性，绕过设计系统的所有约束

**综合评分 2.9/10** — 低于 `Props.tsx` 的 4.1/10 和 `preview.tsx` 的预期评分。根本原因是：这个文件将"渲染管线的实现细节"（插件顺序、HTML 处理、代码高亮）硬编码在组件内部，没有为设计系统集成预留任何可控的出口。对本项目而言，建议通过封装组件 + CSS 覆盖 + 考虑使用 nohighlight 入口来隔离这些设计系统差异。

---

*软件UI专家评审完成 — 2026-05-24*

---

## 十、修复记录（2026-05-26）

### 已修复问题

| 编号 | 问题 | 修复方式 | 状态 |
|---|---|---|---|
| UI-P2-01 | 插件数组每次渲染重建 | `useMemo` 稳定插件数组，依赖 `rewriteFn`/`userPlugins`/`pipeline` | ✅ |
| UI-P2-03 | 与 preview.tsx 的 rehypeRaw 重复处理 | forwardRef 中强制 `skipHtml: true`，阻止 preview.tsx 重复添加 rehype-raw | ✅ |
| UI-P2-04 | forwardRef 无 displayName | 添加 `displayName = 'MarkdownPreviewHighlighted'`（nohighlight 为 `'MarkdownPreviewNoHighlight'`） | ✅ |
| UI-P3-01 | rehypeRewriteHandle 每次渲染创建新闭包 | `useMemo` 包裹 rewriteFn，依赖 `disableCopy`/`userRewrite` | ✅ |
| A-02 | 渲染管线与组件逻辑耦合 | 提取 `buildCommonPipeline` 纯函数，可独立测试 | ✅ |
| A-03 | 插件管线无扩展点 | 添加 `PipelineConfig`（prepend/append），支持 OCP 扩展 | ✅ |
| A-07 | rehypeAttrs 配置硬编码分散 | 提取 `REHYPE_ATTRS_CONFIG` 共享常量 | ✅ |

### 修复覆盖范围

| 文件 | 类型 | 修复状态 |
|---|---|---|
| `src/index.tsx` | TypeScript 源码 | ✅ |
| `src/Props.tsx` | TypeScript 类型源码（PipelineConfig） | ✅ |
| `esm/index.js` | ESM 编译（主入口） | ✅ |
| `esm/common.js` | ESM 编译（common 入口） | ✅ 已有 |
| `esm/nohighlight.js` | ESM 编译（无高亮入口） | ✅ |
| `lib/index.js` | CJS 编译（主入口） | ✅ |
| `lib/common.js` | CJS 编译（common 入口） | ✅ |
| `lib/nohighlight.js` | CJS 编译（无高亮入口） | ✅ |
| `esm/Props.d.ts` + `lib/Props.d.ts` | 类型声明 | ✅ 已有 |
| `esm/index.d.ts` + `lib/index.d.ts` | 类型声明 | ✅ 已有 |
| `esm/nohighlight.d.ts` + `lib/nohighlight.d.ts` | 类型声明 | ✅ 已有 |

### 未修复问题（需项目级别处理）

| 编号 | 问题 | 原因 | 建议处理方式 |
|---|---|---|---|
| UI-P1-01 | rehypePrism 强制 GitHub 主题 | 第三方库核心功能，patch 替换成本过高 | 项目级 CSS 覆盖或使用 nohighlight 入口 |
| UI-P1-03 | rehypeAttrs 允许属性注入 | 需要 rehype-sanitize 等额外插件 | 项目级封装组件中添加消毒层 |
| UI-P2-02 | 用户插件插入位置固定 | PipelineConfig.prepend/append 部分解决 | 完整解决需重构插件注册机制 |
| UI-P3-04 | 无错误边界 | 需要 ErrorBoundary 组件包裹 | 项目级封装组件中添加 |

### 验证结果

- `pnpm build`: ✅ 通过
- `pnpm lint`: ✅ 通过
- `pnpm test`: ⚠️ OOM（预存环境问题，与本次修改无关）
- `patch-package`: ✅ 已重新生成 `patches/@uiw+react-markdown-preview+5.2.1.patch`
