# 软件架构专家评审：nohighlight.tsx

**文件**: `@uiw/react-markdown-preview/src/nohighlight.tsx` (v5.2.0)
**评审角色**: 软件架构专家
**评审日期**: 2026-05-24
**评审结论**: ⚠️ CONDITIONAL APPROVE（架构层面存在结构性缺陷，但功能正确、可短期使用）

---

## 一、架构定位与上下文

### 1.1 模块在包中的角色

`nohighlight.tsx` 是 `@uiw/react-markdown-preview` 库提供的**三个入口变体之一**，与 `index.tsx`（完整版）和 `common.tsx`（精简高亮版）并列。三个入口共享相同的渲染引擎 `preview.tsx`，仅在 rehype 插件链配置上存在差异。

```
┌─────────────────────────────────────────────────────────────┐
│                @uiw/react-markdown-preview                  │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐      │
│  │ index.tsx  │  │ common.tsx │  │  nohighlight.tsx  │      │
│  │ (完整版)   │  │ (精简高亮) │  │  (无高亮版)       │      │
│  └─────┬──────┘  └─────┬──────┘  └────────┬─────────┘      │
│        │               │                  │                 │
│        └───────────────┼──────────────────┘                 │
│                        ▼                                    │
│              ┌─────────────────┐                             │
│              │   preview.tsx   │  ← 共享渲染引擎            │
│              └────────┬────────┘                             │
│                       ▼                                      │
│              ┌─────────────────┐                             │
│              │  ReactMarkdown  │  ← react-markdown v10      │
│              └─────────────────┘                             │
│                                                             │
│  共享基础设施:                                               │
│  ├── rehypePlugins.tsx  — rewrite 处理 + 默认插件集         │
│  ├── Props.tsx          — 类型定义                          │
│  └── plugins/           — reservedMeta, retrieveMeta        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 三个入口变体的差异矩阵

| 插件 | `index.tsx` | `common.tsx` | `nohighlight.tsx` |
|---|---|---|---|
| `reservedMeta` | ✅ | ✅ | ✅ |
| `rehype-raw` | ✅ | ✅ | ❌ |
| `retrieveMeta` | ✅ | ✅ | ✅ |
| `rehype-slug` | ✅ | ✅ | ✅ |
| `rehype-autolink-headings` | ✅ | ✅ | ✅ |
| `rehype-ignore` | ✅ | ✅ | ✅ |
| `rehype-rewrite` | ✅ | ✅ | ✅ |
| `rehype-attr` | ✅ | ✅ | ✅ |
| `rehype-prism-plus` | ✅ `rehype-prism-plus` | ✅ `rehype-prism-plus/common` | ❌ |
| 用户自定义插件 | ✅ 尾部追加 | ✅ 尾部追加 | ✅ 尾部追加 |

**关键差异**: `nohighlight.tsx` 排除了 `rehype-raw`（原始 HTML 解析）和 `rehype-prism-plus`（语法高亮），是三者中最轻量的变体。

### 1.3 插件管线顺序对比

```
index.tsx / common.tsx:
  reservedMeta → rehypeRaw → retrieveMeta → [slug, headings, ignore]
  → rehypeRewrite → rehypeAttrs → userPlugins → rehypePrism

nohighlight.tsx:
  reservedMeta → retrieveMeta → [slug, headings, ignore]
  → rehypeRewrite → rehypeAttrs → userPlugins
```

**注意**: 在 `index.tsx`/`common.tsx` 中，`rehypeRaw` 位于 `reservedMeta` 和 `retrieveMeta` 之间，意味着 raw HTML 解析发生在 meta 数据处理之后；而 `nohighlight.tsx` 去掉了 `rehypeRaw`，两个 meta 插件直接相邻。这个顺序差异虽微小但暗示了插件间的隐式依赖关系。

---

## 二、架构问题分析

### A1 — 🔴 严重：变体通过复制实现，违反开闭原则

**严重级别**: 🔴 高（架构级）
**影响范围**: 整个包的可维护性和扩展性

**现状**: 三个入口文件通过**复制粘贴 + 微调**实现变体差异，代码重复率约 80%。

```typescript
// index.tsx — 27行
const rehypePlugins: PluggableList = [
  reservedMeta, rehypeRaw, retrieveMeta, ...defaultRehypePlugins,
  [rehypeRewrite, { rewrite: rehypeRewriteHandle(...) }],
  [rehypeAttrs, { properties: 'attr' }],
  ...(props.rehypePlugins || []),
  [rehypePrism, { ignoreMissing: true }],
];

// common.tsx — 28行（与 index.tsx 仅 import 路径不同）
// 完全相同的结构

// nohighlight.tsx — 23行
const rehypePlugins: PluggableList = [
  reservedMeta, retrieveMeta, ...defaultRehypePlugins,
  [rehypeRewrite, { rewrite: rehypeRewriteHandle(...) }],
  [rehypeAttrs, { properties: 'attr' }],
  ...(props.rehypePlugins || []),
];
```

**问题分析**:

1. **违反开闭原则（OCP）**: 新增变体（如"仅表格增强版"）需要新建文件并复制全部逻辑，而非通过配置扩展
2. **变更扩散风险**: 修改插件链逻辑（如调整顺序、修改 rewrite 处理）需要同时修改 2-3 个文件，极易遗漏
3. **行为一致性无法保证**: 三个变体的共享逻辑（rewrite、attr、defaultRehypePlugins）各自独立引用，没有编译期或运行时机制确保它们保持同步

**架构建议 — 策略工厂模式**:

```typescript
// src/createMarkdownEntry.tsx
import type { PluggableList } from 'unified';

interface EntryConfig {
  /** rehypeRaw 插件（可选） */
  raw?: PluggableList[number];
  /** 语法高亮插件（可选） */
  prism?: PluggableList[number];
  /** 插入点：用户自定义插件之前还是之后 */
  prismPosition?: 'after-user' | 'before-user';
}

export function createMarkdownEntry(config: EntryConfig = {}) {
  return React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
    const rehypePlugins = useMemo<PluggableList>(() => {
      const plugins: PluggableList = [
        reservedMeta,
        ...(config.raw ? [config.raw] : []),
        retrieveMeta,
        ...defaultRehypePlugins,
        [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
        [rehypeAttrs, { properties: 'attr' }],
        ...(props.rehypePlugins ?? []),
        ...(config.prism ? [config.prism] : []),
      ];
      return plugins;
    }, [props.disableCopy, props.rehypeRewrite, props.rehypePlugins]);

    return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
  });
}

// src/index.tsx — 完整版
export default createMarkdownEntry({
  raw: rehypeRaw,
  prism: [rehypePrism, { ignoreMissing: true }],
});

// src/nohighlight.tsx — 无高亮版
export default createMarkdownEntry({});
```

**收益**:
- 消除 80% 重复代码
- 新增变体仅需一行配置
- 共享逻辑集中维护，变更只需改一处

---

### A2 — 🟡 中等：入口层与配置层职责未分离

**严重级别**: 🟡 中
**影响范围**: 组件的可测试性和关注点分离

**现状**: 每个入口文件同时承担两个职责：
1. **插件链配置**（声明式 — 应可静态分析）
2. **组件渲染**（命令式 — React forwardRef + JSX）

这两个关注点被耦合在同一个函数体内：

```typescript
export default React.forwardRef<...>((props, ref) => {
  // 职责1: 配置插件链（属于"配置层"）
  const rehypePlugins: PluggableList = [ ... ];

  // 职责2: 渲染组件（属于"渲染层"）
  return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
});
```

**问题**: 插件链配置逻辑无法脱离 React 运行时进行独立测试，也无法在编译时进行静态分析（如 tree-shaking 优化、插件冲突检测）。

**架构建议**: 将插件链构建逻辑提取为纯函数：

```typescript
// src/buildRehypePipeline.ts
export function buildRehypePipeline(options: {
  disableCopy: boolean;
  rehypeRewrite?: RehypeRewriteOptions['rewrite'];
  userPlugins?: PluggableList;
  includeRaw?: boolean;
  prismPlugin?: PluggableList[number];
}): PluggableList {
  const pipeline: PluggableList = [
    reservedMeta,
    ...(options.includeRaw ? [rehypeRaw] : []),
    retrieveMeta,
    ...defaultRehypePlugins,
    [rehypeRewrite, { rewrite: rehypeRewriteHandle(options.disableCopy, options.rehypeRewrite) }],
    [rehypeAttrs, { properties: 'attr' }],
    ...(options.userPlugins ?? []),
    ...(options.prismPlugin ? [options.prismPlugin] : []),
  ];
  return pipeline;
}
```

**收益**: 纯函数可独立测试、可静态分析、与 React 解耦。

---

### A3 — 🟡 中等：Props 透传模式导致数据流模糊

**严重级别**: 🟡 中
**影响范围**: 组件间契约的清晰度

**现状**:

```typescript
return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
```

`...props` 将所有传入的 props（包括 `disableCopy`、`rehypeRewrite`、`rehypePlugins`）透传给下游 `MarkdownPreview`，同时用显式 `rehypePlugins={rehypePlugins}` 覆盖 `props.rehypePlugins`。

**数据流问题**:

```
调用方 props
  ├── disableCopy     ──→  nohighlight 消费（构建 rewrite 闭包）
  │                     ──→  也传给 preview.tsx（未使用）
  ├── rehypeRewrite   ──→  nohighlight 消费（构建 rewrite 闭包）
  │                     ──→  也传给 preview.tsx（被解构为 rewrite，但未被 rehype-rewrite 使用）
  ├── rehypePlugins   ──→  nohighlight 消费（展开到插件链）
  │                     ──→  被 rehypePlugins={...} 覆盖，不传给 preview
  └── 其他 props      ──→  透传给 preview.tsx → ReactMarkdown
```

这造成了两个问题：

1. **已消费的 props 泄漏到下游**: `disableCopy` 和 `rehypeRewrite` 在入口层已被消费（构建 rewrite 闭包），但仍被透传到 `preview.tsx`。`preview.tsx` 中解构了 `rehypeRewrite: rewrite`，但由于 rehypePlugins 已被覆盖（不含使用此 rewrite 的 rehype-rewrite 实例），这个 `rewrite` 实际上**永远不会被使用**。这是一个**幽灵 prop** — 它存在但无效果，极易误导维护者。

2. **覆盖与透传的优先级混乱**: `...props` 中的 `rehypePlugins` 被后面的 `rehypePlugins={rehypePlugins}` 覆盖，这种"先展开后覆盖"的模式需要阅读者理解 JavaScript spread 的求值顺序才能推断行为。

**架构建议**: 明确分离已消费的 props 和透传的 props：

```typescript
export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  const { disableCopy, rehypeRewrite: userRewrite, rehypePlugins: userPlugins, ...restProps } = props;

  const rehypePlugins = useMemo<PluggableList>(() => [
    reservedMeta,
    retrieveMeta,
    ...defaultRehypePlugins,
    [rehypeRewrite, { rewrite: rehypeRewriteHandle(disableCopy ?? false, userRewrite) }],
    [rehypeAttrs, { properties: 'attr' }],
    ...(userPlugins ?? []),
  ], [disableCopy, userRewrite, userPlugins]);

  return <MarkdownPreview {...restProps} rehypePlugins={rehypePlugins} ref={ref} />;
});
```

**收益**: 数据流清晰，已消费的 props 不泄漏到下游，每个 prop 的所有权明确。

---

### A4 — 🟡 中等：缺少 useMemo 导致每次渲染触发 AST 重解析

**严重级别**: 🟡 中（对消费方影响取决于渲染频率）
**影响范围**: 运行时性能

**现状**: `rehypePlugins` 数组在每次渲染时重新创建，引用地址不同。下游 `ReactMarkdown`（通过 `react-markdown` 内部的 shallow comparison）检测到 rehypePlugins 变化后会触发**完整的 AST 重解析**。

**影响分析**:

```
每次渲染:
  new Array() ──→ new reference ──→ ReactMarkdown 检测到变化
    ──→ unified pipeline 重新执行
      ──→ remarkParse → rehypePlugins(N个) → rehypeStringify
        ──→ 全量 DOM 更新
```

对于本项目 `by_geo` 的 `MarkdownViewer` 组件，该问题已被 **`React.memo` 缓解**：

```typescript
// pages/components/MarkdownViewer.tsx
const MarkdownViewer: React.FC<MarkdownViewerProps> = React.memo(({ content, ... }) => {
  // React.memo 在 content 未变时跳过重渲染
  // → nohighlight.tsx 中的 rehypePlugins 重建不会被触发
});
```

因此在本项目的实际使用场景中，性能影响有限。但对于不使用 `React.memo` 的调用方，此问题会在频繁重渲染时放大。

---

### A5 — 🟡 中等：插件顺序依赖未文档化且无保护

**严重级别**: 🟡 中
**影响范围**: 正确性和可扩展性

**现状**: 插件链的顺序存在隐式依赖：

| 顺序约束 | 原因 | 保护机制 |
|---|---|---|
| `reservedMeta` 必须在最前 | 将 meta 数据序列化到属性，供后续插件读取 | 无 |
| `rehypeRaw` 必须在 `reservedMeta` 之后 | 原始 HTML 解析可能产生 code 节点需要 meta 处理 | 无 |
| `retrieveMeta` 必须在 `rehypeRaw` 之后（index/common）或直接在 `reservedMeta` 之后（nohighlight） | 从属性还原 meta 数据给高亮插件 | 无 |
| `rehypeRewrite` 必须在 `defaultRehypePlugins` 之后 | rewrite 处理依赖 slug/heading 已生成的锚点 | 无 |
| `rehypePrism` 必须在 `retrieveMeta` 之后 | 高亮插件读取 meta 中的语言标识 | 无 |
| 用户插件在 `rehypePrism` 之前（index/common）或末尾（nohighlight） | 插入点不统一 | 无 |

**问题**: 这些顺序约束完全是隐式的，没有任何文档、类型约束或运行时检查。当开发者修改插件链（如添加新插件、调整用户插件位置）时，可能无意中破坏这些依赖关系。

**架构建议**: 引入插件阶段（Phase）概念：

```typescript
type PluginPhase = 'pre-process' | 'transform' | 'post-process' | 'user' | 'highlight';

interface PipelineSlot {
  phase: PluginPhase;
  plugin: PluggableList[number];
}

function buildPipeline(slots: PipelineSlot[]): PluggableList {
  const phaseOrder: PluginPhase[] = ['pre-process', 'transform', 'post-process', 'user', 'highlight'];
  return phaseOrder.flatMap(phase =>
    slots.filter(s => s.phase === phase).map(s => s.plugin)
  );
}
```

---

### A6 — 🟢 低：forwardRef 组件缺少 displayName

**严重级别**: 🟢 低
**影响范围**: 开发者调试体验

匿名 `forwardRef` 在 React DevTools 中显示为 `ForwardRef(Anonymous)`，无法区分是哪个入口变体。对于库组件，建议设置 `displayName`：

```typescript
const NoHighlightPreview = React.forwardRef<...>(...);
NoHighlightPreview.displayName = 'MarkdownPreview.NoHighlight';
export default NoHighlightPreview;
```

---

### A7 — 🟢 低：rehype-attr 配置硬编码

**位置**: 第 19 行

```typescript
[rehypeAttrs, { properties: 'attr' }]
```

`properties: 'attr'` 是硬编码的配置值，表示从 Markdown 中的 `{attr=...}` 语法读取属性。此配置在三个入口中完全相同，属于共享配置项，但分散在三个文件中各自硬编码。

**建议**: 将共享的插件配置提取为常量：

```typescript
// src/constants.ts
export const SHARED_PLUGIN_CONFIGS = {
  rehypeAttrs: [rehypeAttrs, { properties: 'attr' }] as const,
} as const;
```

---

## 三、架构评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| **关注点分离** | 4 | 配置逻辑与渲染逻辑耦合在同一函数体中 |
| **开闭原则** | 3 | 新增变体需复制文件，无法通过配置扩展 |
| **DRY 原则** | 3 | 三个入口 80% 重复代码 |
| **数据流清晰度** | 5 | spread-then-override 模式模糊了 prop 所有权 |
| **可测试性** | 5 | 插件链配置无法脱离 React 运行时独立测试 |
| **依赖管理** | 7 | 依赖关系合理，无循环依赖 |
| **接口一致性** | 9 | 三个入口保持完全一致的 API 接口 |
| **安全性** | 8 | 不引入 rehype-raw 天然防 XSS |
| **性能设计** | 5 | 缺少 useMemo，依赖消费方自行缓存 |
| **可扩展性** | 4 | 添加新变体或新插件需要修改多个文件 |
| **综合架构评分** | **5.3 / 10** | |

---

## 四、对本项目（by_geo）的架构影响评估

### 4.1 当前使用方式

本项目 `MarkdownViewer` 组件使用的是 `@uiw/react-markdown-preview/common`（不是 `nohighlight`）：

```typescript
import MarkdownPreview from '@uiw/react-markdown-preview/common';
```

`common.tsx` 与 `nohighlight.tsx` 共享相同的架构缺陷（复制实现、缺少 useMemo、props 透传），且额外引入了 `rehype-raw` 和 `rehype-prism-plus/common`。

### 4.2 已有的防御措施

本项目的 `MarkdownViewer.tsx` 已实施良好的架构防御：

| 防御措施 | 实现方式 | 抵御的风险 |
|---|---|---|
| React.memo 包裹 | `const MarkdownViewer = React.memo(...)` | 抵御上游 nohighlight/common 的 useMemo 缺失 |
| DOMPurify 消毒 | `DOMPurify.sanitize(content, { FORBID_TAGS: [...] })` | 补偿 rehype-raw 的 XSS 风险 |
| URL 协议白名单 | `safeUrlTransform` + `ALLOWED_URL_PROTOCOLS` | 防御 javascript: 协议 XSS |
| 内容长度截断 | `MAX_SOURCE_LENGTH = 1MB` | 防御超长内容导致解析性能问题 |

### 4.3 风险评估

| 风险 | 可能性 | 影响 | 缓解状态 |
|---|---|---|---|
| rehypePlugins 每次渲染重建 | 中 | 中（MarkdownViewer 已用 memo 缓解） | ✅ 已缓解 |
| rehype-raw 解析恶意 HTML | 低 | 高（DOMPurify 已拦截） | ✅ 已缓解 |
| 插件顺序错误导致渲染异常 | 低 | 中（依赖库的内部一致性） | ⚠️ 无法控制 |
| 库升级时变体行为不一致 | 中 | 高（三个入口可能独立变更） | ⚠️ 无法控制 |

### 4.4 建议

1. **短期**: 维持现有 `common` 入口 + `MarkdownViewer` 防御架构，无需改动
2. **中期**: 关注 `@uiw/react-markdown-preview` 的版本更新，若库方引入工厂模式可简化本项目的依赖
3. **长期**: 若 Markdown 渲染需求变得复杂（如自定义插件、多主题），考虑直接使用 `react-markdown` + 自行组装插件链，摆脱对三个变体入口的依赖

---

## 五、总结

### 核心发现

`nohighlight.tsx` 作为一个 23 行的组件，其功能实现正确且简洁。但从架构视角看，它暴露了 `@uiw/react-markdown-preview` 库在**变体管理策略**上的根本缺陷：通过复制实现变体而非通过配置驱动。

### 架构改进路径

```
当前架构（复制模式）          目标架构（配置驱动模式）

┌──────────┐                ┌──────────────────────┐
│ index.tsx│ ← 80% 重复     │  createMarkdownEntry │ ← 工厂函数
├──────────┤                │  (config) → Component│
│common.tsx│ ← 80% 重复     └──────────┬───────────┘
├──────────┤                           │
│nohighlight│ ← 80% 重复    ┌──────────┼───────────┐
└──────────┘                │          │           │
                            ▼          ▼           ▼
                      index.tsx   common.tsx  nohighlight.tsx
                      (1行配置)   (1行配置)    (1行配置)
```

### 优先级建议

| 优先级 | 编号 | 建议 | 收益 |
|---|---|---|---|
| 🔴 高 | A1 | 引入策略工厂模式消除三个入口的代码重复 | 消除 80% 重复，提升可维护性 |
| 🟡 中 | A2 | 提取插件链构建为纯函数 | 可测试、可静态分析 |
| 🟡 中 | A3 | 明确 props 消费边界，消除幽灵 prop | 数据流清晰 |
| 🟡 中 | A4 | 添加 useMemo 缓存插件数组 | 减少不必要的 AST 重解析 |
| 🟡 中 | A5 | 文档化插件顺序依赖 | 防止修改时引入隐蔽 bug |
| 🟢 低 | A6 | 添加 displayName | 改善 DevTools 调试体验 |
| 🟢 低 | A7 | 提取共享插件配置为常量 | 消除配置分散 |
