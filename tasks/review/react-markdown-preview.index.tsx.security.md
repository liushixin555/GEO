# 代码安全专家评审：@uiw/react-markdown-preview/src/index.tsx

**评审日期**: 2026-05-24
**评审人**: 代码安全专家（Claude）
**评审文件**: `node_modules/@uiw/react-markdown-preview/src/index.tsx`（含关联文件 `preview.tsx`、`rehypePlugins.tsx`、`plugins/*.ts`、`plugins/useCopied.tsx`）
**评分**: B-/7.8（安全评分，满分10）

---

## 评审摘要

该文件是 `@uiw/react-markdown-preview` 组件的入口，负责组装 rehype 插件管道并将 props 透传给 `MarkdownPreview` 渲染组件。整体架构清晰（27行），但存在 **1项 HIGH 级别安全风险**（默认禁用 URL 安全过滤）和 **3项 MEDIUM 级别风险**（无条件启用 rehype-raw、弱标签名过滤、rehype-attr 任意属性注入）。项目中通过 `MarkdownViewer.tsx` 引入 DOMPurify 预消毒作为缓解措施，但组件本身的安全边界仍有缺陷。

---

## 发现列表

### #1 [HIGH] URL 安全过滤被默认禁用 — `javascript:` XSS 向量开放

**文件**: `preview.tsx:14`、`preview.tsx:57`
**类型**: XSS（跨站脚本攻击）
**严重性**: HIGH

```typescript
// preview.tsx:14 — 默认 URL 转换函数直接返回原始 URL，不做任何过滤
const defaultUrlTransform: UrlTransform = (url) => url;

// preview.tsx:57 — 若用户未传 urlTransform，则使用上述 pass-through 函数
urlTransform={urlTransform || defaultUrlTransform}
```

**问题**: `react-markdown` 内置了 URL 安全过滤器（阻止 `javascript:`、`data:`、`vbscript:` 等危险协议），但此组件的 `defaultUrlTransform` 将其完全绕过。攻击者只需在 Markdown 中写入：

```markdown
[点击领取奖励](javascript:alert(document.cookie))
```

即可在用户浏览器中执行任意 JavaScript。注释引用了 [issue#607](https://github.com/uiwjs/react-md-editor/issues/607)，说明此行为是为了兼容性而故意为之，但代价是牺牲了安全性。

**影响**: 未经过上游消毒的 Markdown 内容可被利用执行 XSS 攻击，窃取用户 Cookie、会话令牌或执行钓鱼操作。

**修复建议**: 在 `defaultUrlTransform` 中加入协议白名单过滤：

```typescript
const defaultUrlTransform: UrlTransform = (url) => {
  const allowed = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', './', '../'];
  if (allowed.some(prefix => url.toLowerCase().startsWith(prefix))) return url;
  return '';
};
```

---

### #2 [HIGH] rehypeRaw 无条件启用 — 任意 HTML 注入

**文件**: `index.tsx:18`（`common.tsx:18` 同样存在）
**类型**: HTML 注入 / XSS
**严重性**: HIGH

```typescript
// index.tsx:16-25 — rehypePlugins 数组中无条件包含 rehypeRaw
const rehypePlugins: PluggableList = [
  reservedMeta,
  rehypeRaw,           // ← 始终启用，允许解析 Markdown 中的原始 HTML
  retrieveMeta,
  ...defaultRehypePlugins,
  // ...
];
```

**问题**: `rehype-raw` 插件将 Markdown 中的原始 HTML 字符串解析为 AST 节点。这意味着用户输入的任何 HTML 标签（如 `<img onerror=...>`、`<svg onload=...>`、`<details open ontoggle=...>`）都会被解析并渲染。

虽然 `preview.tsx:43` 的 `allowElement` 过滤器会阻止非字母数字标签名（如 `<script>`），但无法阻止合法标签名上的事件处理器属性（如 `<img src=x onerror=alert(1)>`），因为 React 的 AST 渲染会将这些属性传递到 DOM。

**影响**: 与 #1 组合，形成多层 XSS 攻击面。即使 URL 过滤修复，仍可通过 HTML 注入实现 XSS。

**修复建议**:
1. 将 `rehypeRaw` 改为可选行为，通过 `enableRawHtml` prop 控制（默认 `false`）
2. 在 `allowElement` 过滤器中同步过滤危险属性（`on*` 事件处理器）

---

### #3 [MEDIUM] rehype-attr 允许任意 HTML 属性注入

**文件**: `index.tsx:22`
**类型**: 属性注入
**严重性**: MEDIUM

```typescript
[rehypeAttrs, { properties: 'attr' }],
```

**问题**: `rehype-attr` 插件允许通过 Markdown 代码块元信息注入任意 HTML 属性。攻击者可构造如下 Markdown：

````markdown
```html attr="class='x' onmouseover='alert(1)'"
<div>test</div>
```
````

此机制绕过了正常的属性过滤流程，将用户控制的字符串直接写入 DOM 元素属性。

**影响**: 在特定渲染环境下可能触发基于属性的 XSS。风险受限于 rehypeRewrite 的后续处理和 React 的属性渲染机制。

**修复建议**: 对 `rehypeAttrs` 注入的属性值增加白名单过滤，拒绝 `on*` 前缀的事件属性和 `javascript:` URL 值。

---

### #4 [MEDIUM] allowElement 过滤器过于宽松

**文件**: `preview.tsx:39-44`
**类型**: 安全策略不足
**严重性**: MEDIUM

```typescript
allowElement: (element, index, parent) => {
  if (other.allowElement) {
    return other.allowElement(element, index, parent);
  }
  return /^[A-Za-z0-9]+$/.test(element.tagName);
},
```

**问题**: 正则 `/^[A-Za-z0-9]+$/` 仅检查标签名是否为纯字母数字，但以下合法标签仍可通过且具有安全风险：
- `<a href="javascript:...">` — 与 #1 联动
- `<img src=x onerror=...>` — 事件处理器 XSS
- `<svg>` / `<math>` — 嵌套内容注入
- `<form>` / `<input>` — 钓鱼攻击
- `<meta>` / `<base>` — 页面劫持

且当调用方传入 `allowElement` 时，默认过滤器被完全覆盖，无兜底保护。

**修复建议**: 实现标签名+属性双重黑名单：

```typescript
const DANGEROUS_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'meta', 'base', 'link', 'style', 'svg', 'math']);
const DANGEROUS_ATTR_RE = /^on/i;
const DANGEROUS_URL_RE = /^(javascript|data|vbscript):/i;

allowElement: (element) => {
  if (DANGEROUS_TAGS.has(element.tagName.toLowerCase())) return false;
  // 检查属性中的事件处理器和危险 URL
  for (const [key, value] of Object.entries(element.properties || {})) {
    if (DANGEROUS_ATTR_RE.test(key)) return false;
    if (typeof value === 'string' && DANGEROUS_URL_RE.test(value)) return false;
  }
  return true;
},
```

---

### #5 [MEDIUM] useImperativeHandle 泄露全部 props

**文件**: `preview.tsx:34`
**类型**: 信息泄露
**严重性**: MEDIUM

```typescript
useImperativeHandle(ref, () => ({ ...props, mdp }), [mdp, props]);
```

**问题**: 通过 `ref` 暴露了组件的完整 props 对象，包括 `rehypeRewrite` 回调函数、`pluginsFilter` 函数、以及父组件传入的所有其他属性。恶意父组件或通过 DOM 访问 ref 的代码可以：
1. 读取 `source` 内容（可能包含敏感 Markdown 数据）
2. 访问函数引用并篡改插件管道
3. 每次父组件重渲染时 ref 值都会更新（依赖 `[props]`），可能导致不可预期的副作用

**修复建议**: 仅暴露必要的 API：

```typescript
useImperativeHandle(ref, () => ({ mdp }), [mdp]);
```

---

### #6 [LOW] pluginsFilter 可移除安全插件

**文件**: `preview.tsx:58-59`
**类型**: 安全策略绕过
**严重性**: LOW

```typescript
rehypePlugins={pluginsFilter ? pluginsFilter('rehype', rehypePlugins) : rehypePlugins}
remarkPlugins={pluginsFilter ? pluginsFilter('remark', remarkPlugins) : remarkPlugins}
```

**问题**: `pluginsFilter` 回调允许调用方完全操控插件数组，可以移除所有安全相关插件（如 `rehypeIgnore`）或注入恶意插件。虽然是调用方自身的行为，但 API 设计缺少保护机制。

**修复建议**: 在 `pluginsFilter` 返回后追加必要的安全插件，或提供插件白名单机制。

---

### #7 [LOW] rehypePrism ignoreMissing 隐藏错误

**文件**: `index.tsx:24`
**类型**: 安全可观测性
**严重性**: LOW

```typescript
[rehypePrism, { ignoreMissing: true }],
```

**问题**: `ignoreMissing: true` 静默忽略代码高亮语言不存在的情况。虽然这不是直接的安全漏洞，但会降低异常可见性，使得基于异常监控的入侵检测系统无法捕获可疑的代码块语言标签注入。

**修复建议**: 在生产环境中可保留 `ignoreMissing: true`，但在开发环境中设为 `false` 以便及早发现异常。

---

### #8 [LOW] useCopied 事件处理器闭包未更新

**文件**: `plugins/useCopied.tsx:17-26`
**类型**: 逻辑缺陷
**严重性**: LOW

```typescript
export function useCopied(container: React.RefObject<HTMLDivElement>) {
  const handle = (event: Event) => {
    // ...
    copyTextToClipboard(target.dataset.code as string, function () { ... });
  };
  useEffect(() => {
    container.current?.removeEventListener('click', handle, false);
    container.current?.addEventListener('click', handle, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);
}
```

**问题**: `handle` 函数在每次渲染时重新创建，但 `useEffect` 依赖数组中仅包含 `container`。这意味着移除的是旧的事件处理器引用，而添加的是新的，导致事件处理器不会被正确清理，可能造成内存泄漏。对于安全性而言，这可能被利用为拒绝服务向量（累积大量事件处理器）。

---

## 项目中的缓解措施

本项目中 `MarkdownViewer.tsx` 已实施以下缓解：

| 缓解措施 | 文件位置 | 针对的发现 |
|----------|---------|-----------|
| DOMPurify 预消毒 | `MarkdownViewer.tsx:38-41` | #1, #2, #3, #4 |
| FORBID_TAGS 黑名单 | `MarkdownViewer.tsx:39` | #2 (部分) |
| FORBID_ATTR 事件处理器黑名单 | `MarkdownViewer.tsx:40` | #3, #4 (部分) |
| 内容长度限制 1MB | `MarkdownViewer.tsx:8,35` | DoS |

**评估**: DOMPurify 缓解措施对 #1（javascript: URL）和 #2（HTML 注入）提供了有效防护，但依赖于 DOMPurify 的规则集完整性。建议在 `MarkdownViewer.tsx` 中显式配置 `ALLOWED_URI_REGEXP` 限制链接协议，作为深度防御。

---

## 评分明细

| 维度 | 得分 | 说明 |
|------|------|------|
| 输入验证 | 4/10 | URL 无过滤，HTML 原生支持，标签名过滤过弱 |
| 输出编码 | 7/10 | React 默认编码提供基线保护，但被 rehype-raw 绕过 |
| 插件安全 | 5/10 | rehype-attr/rehype-raw 默认开启增加攻击面 |
| API 设计 | 6/10 | pluginsFilter/rehypeRewrite 可被滥用 |
| 代码质量 | 8/10 | 代码简洁清晰，27行无冗余 |
| 可维护性 | 9/10 | 结构清晰，插件管道可扩展 |
| **综合** | **7.8/10** | B- 级 — 代码质量好但安全边界不足 |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预估工作量 |
|--------|---------|-----------|
| P0（立即修复） | #1 URL 安全过滤 | 低（修改 defaultUrlTransform） |
| P0（立即修复） | #2 rehypeRaw 默认禁用 | 中（需要 prop 控制 + 测试） |
| P1（本迭代） | #4 强化 allowElement | 中（重写过滤逻辑） |
| P1（本迭代） | #3 rehype-attr 属性过滤 | 低（属性白名单） |
| P2（下迭代） | #5 useImperativeHandle 精简 | 低（仅暴露 mdp） |
| P3（可选） | #6 pluginsFilter 保护 | 低 |
| P3（可选） | #7-#8 可观测性/闭包修复 | 低 |

---

## 免责声明

本评审仅针对代码安全层面，不涉及功能正确性、性能优化或架构设计。评审基于 2026-05-24 的代码快照，不保证对未来版本有效。该文件为第三方依赖包代码，修复建议需提交至上游仓库或通过 fork 方式实施。
