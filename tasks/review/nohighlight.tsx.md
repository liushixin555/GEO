# 软件质量专家评审：nohighlight.tsx

**文件**: `@uiw/react-markdown-preview/src/nohighlight.tsx`
**评审角色**: 软件质量专家
**评审日期**: 2026-05-24
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过）

---

## 一、文件概览

```typescript
// 23行，React forwardRef 组件
// 作用：@uiw/react-markdown-preview 库的"无高亮"入口
// 组装 rehype 插件链（不含语法高亮）→ 委托 MarkdownPreview 渲染
```

该文件是库的"轻量级"入口变体，与 `index.tsx` 的"完整版"对应。核心差异在于**不引入 `rehype-prism-plus` 语法高亮插件**，适用于不需要代码高亮的场景，可显著减小 bundle size。

### 架构关系

```
nohighlight.tsx (无高亮入口，组装插件链)
  ├── plugins/reservedMeta.ts    — 将 code 节点的 meta 数据复制到 data-meta 属性
  ├── plugins/retrieveMeta.ts    — 从 dataMeta 属性还原 meta 数据
  ├── rehypePlugins.tsx          — slug/autolink-headings/ignore + copy 按钮 + rewrite
  ├── rehype-rewrite             — 自定义节点重写
  ├── rehype-attr                — 支持 Markdown 中的属性语法
  ├── props.rehypePlugins        — 用户自定义插件（展开注入）
  └── preview.tsx (渲染层)
       └── ReactMarkdown (react-markdown)
```

### 与 index.tsx 的差异对比

| 特性 | `index.tsx` | `nohighlight.tsx` |
|---|---|---|
| rehype-prism-plus（语法高亮） | ✅ | ❌ |
| rehype-raw（原始 HTML） | ✅ | ❌ |
| reservedMeta / retrieveMeta | ✅ | ✅ |
| defaultRehypePlugins | ✅ | ✅ |
| copy 按钮（disableCopy） | ✅ | ✅ |
| rehype-attr | ✅ | ✅ |
| 用户自定义 rehypePlugins | ✅ | ✅ |
| **bundle 体积影响** | 较大 | 较小 |

---

## 二、质量评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 性能 | 4 | rehypePlugins 每次渲染重建，无 useMemo 缓存 |
| 代码正确性 | 8 | 插件链组装逻辑正确，props 透传合理 |
| 可维护性 | 7 | 代码简洁清晰，但与 index.tsx 存在结构重复 |
| 类型安全 | 7 | 使用 forwardRef 泛型，但缺少 displayName |
| 安全性 | 6 | 无 rehype-raw 意味着天然防 XSS，但用户自定义插件仍为攻击面 |
| API 设计 | 8 | 与 index.tsx 保持一致的接口，降级使用透明 |
| DRY 原则 | 4 | 与 index.tsx 高度重复，仅差两个插件 |
| **综合评分** | **6.3 / 10** | |

---

## 三、问题清单

### P1 — 严重问题（影响性能或正确性）

#### P1-01：rehypePlugins 数组每次渲染都重新创建（性能）

**严重级别**: 🔴 高
**位置**: 第 14-21 行

```typescript
// ❌ 当前代码 — 每次 render 都创建新数组和新对象
const rehypePlugins: PluggableList = [
  reservedMeta,
  retrieveMeta,
  ...defaultRehypePlugins,
  [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
  [rehypeAttrs, { properties: 'attr' }],
  ...(props.rehypePlugins || []),
];
```

**问题**: `rehypePlugins` 数组在每次渲染时重新创建，引用地址不同。下游 `ReactMarkdown` 通过引用比较检测 props 变化，数组引用改变会触发**整个 Markdown AST 的重新解析和重新渲染**。对于长文档，性能损失显著。

`rehypeRewriteHandle()` 在每次渲染时被调用，生成新的 `rewrite` 闭包函数，进一步加剧问题——即使 `disableCopy` 和 `rehypeRewrite` 未变化，闭包引用也不同。

**修复建议**:

```typescript
import { useMemo } from 'react';

export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  const rehypePlugins = useMemo<PluggableList>(() => [
    reservedMeta,
    retrieveMeta,
    ...defaultRehypePlugins,
    [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
    [rehypeAttrs, { properties: 'attr' }],
    ...(props.rehypePlugins || []),
  ], [props.disableCopy, props.rehypeRewrite, props.rehypePlugins]);

  return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
});
```

**注意**: `props.rehypePlugins` 作为依赖项时，若调用方每次渲染传入新数组引用，`useMemo` 会失效。这是 React hooks 的固有局限，但至少在 `rehypePlugins` 引用稳定的场景下能避免不必要的重渲染。

---

### P2 — 中等问题（影响可维护性或健壮性）

#### P2-01：与 index.tsx 高度重复，违反 DRY 原则

**严重级别**: 🟡 中
**位置**: 整个文件

**问题**: `nohighlight.tsx` 与 `index.tsx` 的代码结构几乎完全相同，唯一差异是 `index.tsx` 额外引入了 `rehype-prism-plus` 和 `rehype-raw`。两个文件共约 50 行代码中，约 80% 完全重复。

当需要修改插件链逻辑（如添加新插件、调整顺序、修改 rehypeRewriteHandle 调用方式）时，必须同时修改两个文件，极易遗漏导致行为不一致。

**修复建议**: 提取公共工厂函数：

```typescript
// createMarkdownPreview.ts
export function createMarkdownPlugins(options: {
  disableCopy?: boolean;
  rehypeRewrite?: RehypeRewriteOptions['rewrite'];
  userPlugins?: PluggableList;
  extraPlugins?: PluggableList;
}): PluggableList {
  return [
    reservedMeta,
    retrieveMeta,
    ...defaultRehypePlugins,
    [rehypeRewrite, { rewrite: rehypeRewriteHandle(options.disableCopy ?? false, options.rehypeRewrite) }],
    [rehypeAttrs, { properties: 'attr' }],
    ...(options.userPlugins || []),
    ...(options.extraPlugins || []),
  ];
}
```

---

#### P2-02：forwardRef 组件缺少 displayName

**严重级别**: 🟡 中
**位置**: 第 13 行

```typescript
// ❌ 缺少 displayName
export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
```

**问题**: 匿名 `forwardRef` 组件在 React DevTools 中显示为 `ForwardRef`，无法区分是哪个组件。对于库组件，开发者调试时难以定位。

**修复建议**:

```typescript
const NoHighlightMarkdown = React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  // ...
});
NoHighlightMarkdown.displayName = 'NoHighlightMarkdown';
export default NoHighlightMarkdown;
```

---

#### P2-03：`props.rehypePlugins || []` 应使用 `??` 运算符

**严重级别**: 🟡 低（风格一致性）
**位置**: 第 20 行

```typescript
// ⚠️ 使用 || 运算符
...(props.rehypePlugins || []),
```

**问题**: 虽然 `||` 和 `??` 在此场景下行为等价（空数组 `[]` 是 truthy），但文件中第 18 行已使用 `??` 运算符（`props.disableCopy ?? false`），同一文件中应保持一致。使用 `??` 的语义也更精确——"仅在 null/undefined 时回退"。

**修复建议**:

```typescript
...(props.rehypePlugins ?? []),
```

---

#### P2-04：spread props 透传了已消费的 props

**严重级别**: 🟡 低
**位置**: 第 22 行

```typescript
return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
```

**问题**: `...props` 展开将所有 props 传给 `MarkdownPreview`，包括 `disableCopy` 和 `rehypeRewrite`——这两个 prop 已被 `rehypeRewriteHandle` 消费。如果 `MarkdownPreview` 内部也处理这些 props（例如在 `preview.tsx` 的 `rehypeRewriteHandle` 中再次使用），可能导致**重复处理**。

实际上 `preview.tsx` 不再调用 `rehypeRewriteHandle`（因为 `rehypePlugins` 已被覆盖），所以当前不会产生 bug。但这种"透传已消费的 props"的模式不够清晰，增加理解成本。

**建议**: 考虑在传给 `MarkdownPreview` 时解构排除已消费的 props：

```typescript
const { disableCopy, rehypeRewrite: userRewrite, rehypePlugins: userPlugins, ...rest } = props;
// 仅传 rest 给 MarkdownPreview
```

但此改动需评估 `preview.tsx` 是否确实不需要这些 props，改动风险需权衡。

---

### P3 — 建议改进（不影响当前功能）

#### P3-01：缺少组件级文档和导出说明

**问题**: 该文件无任何 JSDoc 注释或说明文档。作为库的公开 API 入口之一，使用者无法通过代码了解该变体与主入口的区别、适用场景、以及性能优势。

**建议**: 添加文件级注释：

```typescript
/**
 * Markdown preview without syntax highlighting.
 * Use this entry point when code highlighting is not needed
 * to reduce bundle size by ~150KB (excludes rehype-prism-plus).
 */
```

---

#### P3-02：插件链缺少错误边界保护

**问题**: rehype 插件链中的任一插件抛出异常（如用户通过 `props.rehypePlugins` 传入的插件），将导致整个组件崩溃，无降级渲染策略。

**建议**: 在 `MarkdownPreview` 外层或 `preview.tsx` 中添加 `ErrorBoundary`，在插件异常时降级为纯文本渲染。

---

#### P3-03：`rehypeRewriteHandle` 调用方式存在隐式依赖

**位置**: 第 18 行

```typescript
[rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }]
```

**问题**: `rehypeRewriteHandle` 返回的函数被直接内联传递给 `[rehypeRewrite, { rewrite: ... }]` 元组。`rehype-rewrite` 插件的 `rewrite` 选项期望一个 `(node, index, parent)` 签名的函数，但 `rehypeRewriteHandle` 的返回值类型未在此处验证，依赖运行时正确性。

虽然 TypeScript 在 `rehypePlugins.tsx` 中已约束了返回类型，但此处作为组装点缺少显式类型断言，增加了重构时的风险。

---

## 四、安全性评审

### ✅ 优势：不引入 rehype-raw 天然降低 XSS 风险

与 `index.tsx` 相比，`nohighlight.tsx` **未引入 `rehype-raw`**，意味着 Markdown 内容中的原始 HTML 标签**不会被解析执行**。这从根本上消除了通过 Markdown 注入恶意 HTML/JavaScript 的攻击面。

### ⚠️ 风险点：用户自定义 rehypePlugins 为潜在攻击面

```typescript
...(props.rehypePlugins || []),
```

`props.rehypePlugins` 允许调用方注入任意 rehype 插件。如果插件来源不可信（如从服务端动态加载），可能引入安全风险。但此为库的设计决策，不属于该文件本身的问题。

---

## 五、与本项目（by_geo）的关联分析

本项目 `by_geo` 的 `MarkdownViewer` 组件已切换为使用 `@uiw/react-markdown-preview/nohighlight` 入口（见 commit `8225cb0`），目的是减少约 150KB 的 bundle 体积。该评审发现的性能问题（P1-01）**直接影响本项目的渲染性能**：

- 当 Markdown 内容较长（如知识库文档、文章详情）时，每次组件重渲染都会触发完整的 AST 重解析
- 建议在本项目层面通过 `React.memo` 包裹 `MarkdownViewer` 或控制重渲染频率来缓解

---

## 六、评审总结

### 优势

1. **代码简洁** — 仅 23 行，职责单一清晰
2. **安全优势** — 不引入 rehype-raw，天然防御 Markdown XSS
3. **接口透明** — 与 index.tsx 保持完全一致的 API，降级使用无需改代码
4. **bundle 优化** — 去除 rehype-prism-plus 显著减小产物体积

### 需关注

1. **性能缺陷** — rehypePlugins 每次渲染重建（P1-01），是本文件最严重的问题
2. **DRY 违反** — 与 index.tsx 高度重复，维护时易遗漏（P2-01）
3. **调试体验差** — 缺少 displayName，DevTools 中不可辨识（P2-02）

### 行动建议优先级

| 优先级 | 问题编号 | 建议 | 影响范围 |
|---|---|---|---|
| 🔴 高 | P1-01 | 添加 `useMemo` 缓存插件数组 | 渲染性能 |
| 🟡 中 | P2-01 | 提取公共插件工厂函数 | 长期维护 |
| 🟡 中 | P2-02 | 添加 `displayName` | 调试体验 |
| 🟢 低 | P2-03 | `||` → `??` 保持风格一致 | 代码规范 |
| 🟢 低 | P2-04 | 排除已消费的 props 透传 | 代码清晰度 |
