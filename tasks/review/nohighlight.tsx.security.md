# 代码安全专家评审：@uiw/react-markdown-preview/src/nohighlight.tsx

**评审日期**: 2026-05-24
**评审人**: 代码安全专家（Claude）
**评审文件**: `node_modules/@uiw/react-markdown-preview/src/nohighlight.tsx`（含关联文件 `preview.tsx`、`rehypePlugins.tsx`、`plugins/*.ts`、`plugins/useCopied.tsx`）
**评分**: B+/8.5（安全评分，满分 10）

---

## 评审摘要

该文件是 `@uiw/react-markdown-preview` 的"无语法高亮"入口变体，仅 23 行代码，负责组装 rehype 插件管道并委托 `MarkdownPreview` 渲染。与主入口 `index.tsx` 的关键安全差异在于**不引入 `rehype-raw` 和 `rehype-prism-plus`**，从根源上消除了 Markdown 中原始 HTML 注入和语法高亮库的攻击面。整体安全态势优于 `index.tsx`，但仍存在 **1 项 HIGH 级别风险**（继承自 `preview.tsx` 的 URL 安全过滤缺失）和 **2 项 MEDIUM 级别风险**（`rehype-attr` 任意属性注入、`useImperativeHandle` props 泄露）。

---

## 发现列表

### #1 [HIGH] 继承自 preview.tsx — URL 安全过滤被默认禁用

**文件**: `preview.tsx:14`、`preview.tsx:57`（间接影响 `nohighlight.tsx`）
**类型**: XSS（跨站脚本攻击）
**严重性**: HIGH
**来源**: 继承性风险（上游组件）

```typescript
// preview.tsx:14 — 默认 URL 转换函数直接返回原始 URL
const defaultUrlTransform: UrlTransform = (url) => url;

// preview.tsx:57 — 若用户未传 urlTransform，则使用上述 pass-through 函数
urlTransform={urlTransform || defaultUrlTransform}
```

**问题**: `react-markdown` 内置了 URL 安全过滤器（阻止 `javascript:`、`data:`、`vbscript:` 等危险协议），但 `preview.tsx` 的 `defaultUrlTransform` 将其完全绕过。攻击者可构造如下 Markdown：

```markdown
[点击领取奖励](javascript:alert(document.cookie))
```

即可在用户浏览器中执行任意 JavaScript。

**与 `index.tsx` 的差异**: `nohighlight.tsx` 与 `index.tsx` 均通过 `MarkdownPreview` → `preview.tsx` 继承此缺陷，风险等级相同。

**修复建议**: 在 `defaultUrlTransform` 中加入协议白名单过滤：

```typescript
const defaultUrlTransform: UrlTransform = (url) => {
  const allowed = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', './', '../'];
  if (allowed.some(prefix => url.toLowerCase().startsWith(prefix))) return url;
  return '';
};
```

---

### #2 [MEDIUM] rehype-attr 允许任意 HTML 属性注入

**文件**: `nohighlight.tsx:19`
**类型**: 属性注入 / XSS 向量
**严重性**: MEDIUM

```typescript
[rehypeAttrs, { properties: 'attr' }],
```

**问题**: `rehype-attr` 插件允许通过 Markdown 代码块的 `attr` 元信息注入任意 HTML 属性。攻击者可构造如下 Markdown：

````markdown
```html attr="class='x' onmouseover='alert(1)'"
<div>test</div>
```
````

此机制绕过了正常的属性过滤流程，将用户控制的字符串直接写入 DOM 元素属性。

**缓解因素**: `nohighlight.tsx` 不引入 `rehype-raw`，所以代码块中的原始 HTML 不会被解析渲染。但 `rehype-attr` 仍可能影响非代码块元素（如通过其他 rehype 插件处理的节点），且 `rehypeRewriteHandle` 的 `copy` 功能将代码内容存储在 `data-code` 属性中，如果代码内容包含恶意 payload，理论上可通过 DOM 操作触发。

**修复建议**: 对 `rehypeAttrs` 注入的属性值增加白名单过滤，拒绝 `on*` 前缀的事件属性和 `javascript:` URL 值。

---

### #3 [MEDIUM] 继承自 preview.tsx — useImperativeHandle 泄露全部 props

**文件**: `preview.tsx:34`（间接影响 `nohighlight.tsx`）
**类型**: 信息泄露
**严重性**: MEDIUM
**来源**: 继承性风险（上游组件）

```typescript
useImperativeHandle(ref, () => ({ ...props, mdp }), [mdp, props]);
```

**问题**: 通过 `ref` 暴露了组件的完整 props 对象，包括 `rehypeRewrite` 回调函数、`pluginsFilter` 函数、`source`（Markdown 源内容）等。恶意父组件或通过 DOM 访问 ref 的代码可以读取敏感数据或篡改插件管道。

**修复建议**: 仅暴露必要的 API：

```typescript
useImperativeHandle(ref, () => ({ mdp }), [mdp]);
```

---

### #4 [LOW] rehype-rewrite copy 功能的 data-code 属性

**文件**: `rehypePlugins.tsx` → `copy.ts`
**类型**: DOM 数据泄露 / 潜在 XSS 向量
**严重性**: LOW

```typescript
// copy.ts — 将代码内容存储在 data-code 属性中
element.properties['data-code'] = codeContent;
```

**问题**: `rehypeRewriteHandle` 为每个代码块添加复制按钮时，将代码原文存储在 DOM 元素的 `data-code` 属性中。如果代码内容包含特殊字符（如引号、尖括号），在非 React 渲染环境下可能导致属性值注入。在 React 环境下此风险被 React 的属性编码机制缓解。

此外，`data-code` 属性将代码原文暴露在 DOM 中，任何可访问 DOM 的脚本（包括浏览器扩展、第三方脚本）均可读取，存在数据泄露风险。

**修复建议**: 使用 `data-code-index` 索引 + 内部 Map 存储代码内容，避免将完整代码文本暴露在 DOM 属性中。

---

### #5 [LOW] pluginsFilter 可移除安全插件

**文件**: `preview.tsx:58-59`（间接影响 `nohighlight.tsx`）
**类型**: 安全策略绕过
**严重性**: LOW

```typescript
rehypePlugins={pluginsFilter ? pluginsFilter('rehype', rehypePlugins) : rehypePlugins}
```

**问题**: `pluginsFilter` 回调允许调用方完全操控插件数组，可以移除所有安全相关插件（如 `rehypeIgnore`）或注入恶意插件。虽然是调用方自身的行为，但 API 设计缺少保护机制。

**修复建议**: 在 `pluginsFilter` 返回后追加必要的安全插件，或提供插件白名单机制。

---

### #6 [LOW] 用户自定义 rehypePlugins 为潜在攻击面

**文件**: `nohighlight.tsx:20`
**类型**: 供应链 / 插件安全
**严重性**: LOW

```typescript
...(props.rehypePlugins || []),
```

**问题**: `props.rehypePlugins` 允许调用方注入任意 rehype 插件。如果插件来源不可信（如从服务端动态加载），可能引入安全风险。但此为库的设计决策（"escape hatch"），不属于该文件本身的安全缺陷。

**注意**: 此处使用 `||` 运算符而非 `??`，语义不够精确（虽然在本场景下行为等价）。建议改为 `??`。

---

## 与 index.tsx 的安全差异对比

| 安全维度 | `index.tsx` | `nohighlight.tsx` | 差异说明 |
|---------|------------|-------------------|---------|
| **rehype-raw（HTML 注入）** | ❌ 无条件启用 | ✅ 未引入 | `nohighlight` 天然防御 HTML 注入 XSS |
| **rehype-prism-plus（语法高亮）** | ❌ 引入（ignoreMissing） | ✅ 未引入 | 减少第三方依赖攻击面 |
| **URL 安全过滤** | ❌ 默认禁用 | ❌ 默认禁用 | 相同 — 继承自 `preview.tsx` |
| **rehype-attr 属性注入** | ⚠️ 存在 | ⚠️ 存在 | 相同 |
| **useImperativeHandle 泄露** | ⚠️ 存在 | ⚠️ 存在 | 相同 — 继承自 `preview.tsx` |
| **copy data-code** | ⚠️ 存在 | ⚠️ 存在 | 相同 |
| **bundle 攻击面** | 较大 | 较小 | 无 prism 依赖 = 更小攻击面 |
| **综合安全等级** | B- (7.8) | **B+ (8.5)** | `nohighlight` 安全性显著优于主入口 |

---

## 项目中的缓解措施

本项目 `by_geo` 中 `MarkdownViewer.tsx` 已实施以下缓解：

| 缓解措施 | 文件位置 | 针对的发现 |
|----------|---------|-----------|
| DOMPurify 预消毒 | `MarkdownViewer.tsx` | #1, #2, #4 |
| FORBID_TAGS 黑名单 | `MarkdownViewer.tsx` | HTML 注入 |
| FORBID_ATTR 事件处理器黑名单 | `MarkdownViewer.tsx` | #2, #4 |
| 内容长度限制 1MB | `MarkdownViewer.tsx` | DoS |
| 使用 `/nohighlight` 入口 | `MarkdownViewer.tsx` | 避免引入 rehype-raw |

**评估**: 本项目选择 `nohighlight` 入口是正确的安全决策。DOMPurify 缓解措施对 #1（javascript: URL）和 #2（属性注入）提供了有效防护。建议在 `MarkdownViewer.tsx` 中显式配置 `ALLOWED_URI_REGEXP` 限制链接协议，作为深度防御。

---

## 评分明细

| 维度 | 得分 | 说明 |
|------|------|------|
| 输入验证 | 6/10 | URL 无过滤（继承），但无 rehype-raw 故 HTML 注入面较小 |
| 输出编码 | 8/10 | React 默认编码保护，无 rehype-raw 绕过风险 |
| 插件安全 | 7/10 | 无 rehype-prism-plus 依赖，但 rehype-attr 仍有风险 |
| API 设计 | 8/10 | 插件链简洁，攻击面小于 index.tsx |
| 代码质量 | 9/10 | 23 行代码，结构清晰无冗余 |
| 攻击面 | 8/10 | 相比 index.tsx 显著减小（无 rehype-raw、无 prism） |
| **综合** | **8.5/10** | B+ 级 — 安全性优于主入口，但仍需关注上游继承风险 |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预估工作量 | 备注 |
|--------|---------|-----------|------|
| P0（立即修复） | #1 URL 安全过滤 | 低 | 修改 `preview.tsx` 的 `defaultUrlTransform`，需上游修复 |
| P1（本迭代） | #2 rehype-attr 属性过滤 | 低 | 属性白名单过滤 |
| P1（本迭代） | #3 useImperativeHandle 精简 | 低 | 仅暴露 `mdp` |
| P2（下迭代） | #4 copy data-code 重构 | 中 | 改用索引 + 内部 Map |
| P3（可选） | #5 pluginsFilter 保护 | 低 | |
| P3（可选） | #6 文档化 rehypePlugins 风险 | 低 | |

**注意**: 以上修复建议均为第三方依赖包代码，需提交至上游 `@uiw/react-markdown-preview` 仓库或通过 fork 方式实施。在本项目层面，建议通过 `MarkdownViewer.tsx` 中的 DOMPurify 消毒和 `urlTransform` prop 覆盖来缓解。

---

## 免责声明

本评审仅针对代码安全层面，不涉及功能正确性、性能优化或架构设计。评审基于 2026-05-24 的代码快照，不保证对未来版本有效。该文件为第三方依赖包代码，修复建议需提交至上游仓库或通过 fork 方式实施。
