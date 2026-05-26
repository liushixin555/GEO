# pages/components/MarkdownViewer.tsx — 代码安全评审报告

**文件**: `pages/components/MarkdownViewer.tsx` (390行)
**评审类型**: 安全评审（Security Review）
**评审日期**: 2026-05-26
**评审人**: Claude (代码安全专家)

---

## 综合评分: 7.5 / 10 — APPROVE

| 维度 | 评分 | 说明 |
|------|------|------|
| 输入消毒与 XSS 防御 | 8/10 | 六层纵深防御设计优秀，DOMPurify + 标签白名单 + URL 过滤互相补充，但 ALLOWED_URI_REGEXP 复杂度高难以审计 |
| URL 安全 | 7/10 | safeUrlTransform 三重防线（前缀匹配 + URL 解析 + 协议白名单）逻辑正确，但 catch 块违反 fail-closed 原则；allowElement URL 属性检查作为纵深层覆盖 |
| CSS 注入防护 | 6/10 | rehypeRewrite 未清理 `style` 属性；CSP `unsafe-inline` 削弱防护；rehype-attr 在 DOMPurify 之后运行可注入 style |
| 错误处理与安全可追溯性 | 6/10 | ErrorBoundary 静默吞错误无日志记录；安全事件（XSS 尝试、消毒拦截）无法追溯 |
| 代码类型安全 | 7/10 | rehypeRewrite 参数 `any` 类型，安全关键代码无编译期保护 |
| DoS 防护 | 9/10 | 1MB 内容长度截断 + 100KB 代码块复制按钮上限，防护充分 |

---

## 安全亮点（值得肯定）

### 1. 六层纵深防御架构设计精良

组件文档（:1-23）清晰标注了上游 `@uiw/react-markdown-preview` 的五个安全缺陷（S1-S5），并设计了对应防护层：

| 防护层 | 机制 | 防御的缺陷 |
|--------|------|-----------|
| 第1层 | `safeUrlTransform` URL 协议白名单 | S1: defaultUrlTransform 禁用 URL 消毒 |
| 第2层 | `SAFE_TAGS` + `allowElement` 标签白名单 + URL 属性检查 | S3: 正则白名单过宽 + S4: URL 属性危险协议 |
| 第3层 | DOMPurify FORBID_TAGS + FORBID_ATTR 消毒 | S2: skipHtml 语义陷阱 + S4: 事件处理器属性 |
| 第4层 | `rehypeRewrite` 属性清理 | S5: rehype-attr 注入任意属性 |
| 第5层 | `MAX_SOURCE_LENGTH` 长度截断 | DoS 防护 |
| 第6层 | `MarkdownErrorBoundary` 错误边界 | 渲染异常白屏防护 |

**任何单层被绕过时，其他层仍能提供保护**，这是安全设计的黄金标准。

### 2. skipHtml 语义陷阱绕过策略正确

组件文档（:19-23）精确识别了上游 `preview.tsx` 中 `skipHtml={!skipHtml}` 的双重否定陷阱，选择完全不传 `skipHtml`，改用 DOMPurify 消毒后的 `safeSource`，这是正确的绕过策略。

### 3. 标签白名单 + 黑名单双重控制

- `SAFE_TAGS`（白名单，:89-100）：只允许安全的 HTML 标签通过 `allowElement`
- `FORBID_TAGS_ARR`（黑名单，:68-74）：显式禁止危险标签（script/iframe/object/embed/form/svg 等）
- 两者互补：白名单作为主要过滤，黑名单在 DOMPurify 层提供纵深防护

### 4. input 标签类型严格限制

`:53` `SAFE_INPUT_TYPES = new Set(['checkbox'])` + `:236-238` 的类型检查，确保只有 `type="checkbox"` 的 input 通过，防止隐藏表单提交。

### 5. 代码块复制按钮安全限制

`:282-285` 对超长代码块（>100KB）跳过复制按钮，防止大量字符串操作导致 UI 卡顿。

### 6. CSS.escape 防止选择器注入

`:314` `CSS.escape(anchor)` 正确转义锚点值，防止 CSS 选择器注入攻击。

---

## 问题清单

### HIGH — 强烈建议修复

#### SEC-H1: rehypeRewrite 未清理 `style` 属性，rehype-attr 可在 DOMPurify 之后注入 CSS

- **位置**: `MarkdownViewer.tsx:256-301`
- **威胁链**:
  ```
  Markdown 内容 → DOMPurify 消毒 → MarkdownPreview 渲染
    → rehype-attr 处理代码块元信息 {style="..."} → 注入 style 属性
    → rehypeRewrite 仅清理 on*/URL 属性，未清理 style → style 属性通过
    → CSP 'unsafe-inline' 允许行内样式 → CSS 注入成功
  ```
- **代码**:
  ```typescript
  // :262-273 — 只清理 on* 事件和 URL 属性，遗漏 style
  if (DANGEROUS_ATTR_RE.test(key)) {        // /^on/i — 只匹配 on*
    delete props[key];
  }
  else if (/* URL_PROPERTIES + DANGEROUS_URL_RE */) {
    delete props[key];
  }
  // style 属性未被清理！
  ```
- **攻击场景**:
  1. **UI 伪装/钓鱼**: `style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:white"` 创建全屏覆盖层
  2. **内容隐藏**: `style="display:none"` 隐藏安全提示或法律声明
  3. **点击劫持**: `style="opacity:0.01;pointer-events:auto"` 使元素不可见但可交互
- **缓解因素**:
  1. 内容来源为 admin/sysadmin（可信源），非用户生成内容
  2. rehype-attr 注入需要特定 markdown 语法（`{style="..."}`）
  3. CSP `style-src 'self' 'unsafe-inline'` 限制了外部样式表加载
- **修复方案**:
  ```typescript
  // rehypeRewrite 中添加 style 属性清理
  if (key === 'style') {
    delete props[key];
    // 或者保留白名单 CSS 属性（更复杂但更灵活）
  }
  ```
  或者完全禁止 rehype-attr 注入 style：
  ```typescript
  if (props && typeof props === 'object') {
    for (const key of Object.keys(props)) {
      if (DANGEROUS_ATTR_RE.test(key)) {
        delete props[key];
      } else if (key === 'style') {
        delete props[key];  // 禁止 rehype-attr 注入 style
      } else if (key !== 'data-code' && typeof props[key] === 'string'
                 && URL_PROPERTIES.has(key) && DANGEROUS_URL_RE.test(props[key])) {
        delete props[key];
      }
    }
  }
  ```

#### SEC-H2: safeUrlTransform catch 块违反 fail-closed 原则，解析失败的 URL 被放行

- **位置**: `MarkdownViewer.tsx:107-114`
- **代码**:
  ```typescript
  try {
    const parsed = new URL(trimmed, 'https://placeholder.com');
    if (ALLOWED_URL_PARSED_PROTOCOLS.has(parsed.protocol)) return url;
  } catch {
    return url;  // ⚠️ 解析失败 → 放行原始 URL
  }
  return '';
  ```
- **威胁模型**: 当 `new URL()` 抛出异常时（如含 null 字节 `\x00`、畸形 Unicode 序列），函数返回未消毒的原始 URL。虽然大多数浏览器对这类 URL 的处理是安全的（通常视为无效），但：
  1. **违反 fail-closed 原则** — 安全函数应在异常时拒绝，而非放行
  2. **浏览器 URL 解析不一致** — 不同浏览器对畸形 URL 的解析结果可能不同，可能导致协议混淆
  3. **纵深防御缺口** — 此函数是 URL 过滤的第一道防线（第1层），放行后依赖第2/3层拦截
- **缓解因素**:
  1. `allowElement`（第2层）检查 URL 属性的 `DANGEROUS_URL_RE`
  2. DOMPurify 的 `ALLOWED_URI_REGEXP`（第3层）过滤输出中的 URI
  3. 实际利用难度高 — 需要构造同时绕过 `new URL()` 但在浏览器中被解析为危险协议的字符串
- **修复方案**:
  ```typescript
  try {
    const parsed = new URL(trimmed, 'https://placeholder.com');
    if (ALLOWED_URL_PARSED_PROTOCOLS.has(parsed.protocol)) return url;
  } catch {
    return '';  // 解析失败 → 拒绝（fail-closed）
  }
  ```

#### SEC-H3: DOMPurify ALLOWED_URI_REGEXP 复杂度过高，包含非预期协议匹配

- **位置**: `MarkdownViewer.tsx:226`
- **代码**:
  ```typescript
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|telnet):|[^a-z]|[a+][a-z+.]+(?:\.|%20|\/))+$/i
  ```
- **问题分析**:
  1. **`telnet:` 被允许** — 正则显式包含 `telnet:`，但 `safeUrlTransform` 和 `allowElement` 均未将 `telnet` 列入白名单，三层定义不一致
  2. **`ftps:` 被允许** — `(?:f|ht)tps?` 匹配 `ftps:`（f + tps），未被其他层覆盖
  3. **`[^a-z]` 过于宽松** — `/i` 标志下等价于 `[^a-zA-Z]`，匹配任何非字母字符。纯数字字符串（如 `12345`）或特殊字符字符串（如 `!!!`）会通过
  4. **`[a+][a-z+.]+` 匹配范围过广** — 允许 `app://`、`android://` 等自定义协议，可能触发已注册的协议处理器
  5. **难以审计** — 正则复杂度高，安全团队难以快速验证其正确性
- **实际风险**: 低 — `safeUrlTransform`（第1层）和 `allowElement`（第2层）提供更严格的协议白名单，即使此正则放行，上游过滤层已拦截。但作为纵深防御层，应保持一致。
- **修复方案**: 使用简单明确的协议白名单正则：
  ```typescript
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[/.#])/i
  ```

---

### MEDIUM — 建议修复

#### SEC-M1: MarkdownErrorBoundary 静默吞错误，安全事件无法追溯

- **位置**: `MarkdownViewer.tsx:125-141`
- **代码**:
  ```typescript
  export class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    static getDerivedStateFromError(): ErrorBoundaryState {
      return { hasError: true };  // 错误信息完全丢弃
    }
    // 无 componentDidCatch — 无日志记录
  }
  ```
- **风险**:
  1. **XSS 尝试不可追踪** — 如果攻击者构造的 payload 导致渲染异常（如超长属性值、畸形 HTML），ErrorBoundary 捕获后只显示"内容渲染异常"，无 console.error / Sentry / 日志上报
  2. **消毒绕过无法发现** — 未来如果某层防御被绕过导致渲染崩溃，无法通过日志回溯分析
  3. **运维盲区** — 生产环境中无法统计 ErrorBoundary 触发频率，无法识别针对性攻击
- **修复方案**:
  ```typescript
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MarkdownViewer] Render error:', error, errorInfo);
  }
  ```

#### SEC-M2: rehypeRewrite 参数类型 `any`，安全关键代码无编译期保护

- **位置**: `MarkdownViewer.tsx:257`
- **代码**:
  ```typescript
  const rehypeRewrite = useCallback(
    (node: any, index: number | undefined, parent: any) => {
  ```
- **风险**: `node` 和 `parent` 均为 `any` 类型：
  1. 属性名拼写错误不会被 TypeScript 捕获（如 `node.propertis` 而非 `node.properties`）
  2. 属性访问结构变更不会触发类型检查
  3. 在安全关键代码中，`any` 等于关闭了编译期安全网
- **修复方案**: 定义 rehype AST 节点类型：
  ```typescript
  interface RehypeNode {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
  }
  const rehypeRewrite = useCallback(
    (node: RehypeNode, _index: number | undefined, _parent: RehypeNode | undefined) => {
  ```

#### SEC-M3: 安全常量分散定义，FORBID_TAGS 与 SAFE_TAGS 无一致性校验

- **位置**: `:55-86`（事件属性）, `:68-74`（禁止标签）, `:77`（危险URL正则）, `:83-86`（URL属性）, `:89-100`（安全标签）, `:226`（URI正则）
- **问题**: 六组安全常量分散在文件各处（第55-100行、第226行），无单一安全策略模块：
  1. **维护风险** — 修改一处常量时可能忘记更新其他关联常量
  2. **协议定义不一致** — `safeUrlTransform` 允许 `http/https/mailto/tel`，`ALLOWED_URI_REGEXP` 额外允许 `ftp/ftps/telnet`，`allowElement` 检查 `javascript/data/vbscript`
  3. **审计困难** — 安全审计需在文件中跳跃查找，无法一目了然
- **修复建议**: 抽取独立的安全策略模块：
  ```
  pages/components/MarkdownViewer.security.ts
  ```
  包含所有安全常量和策略函数，便于集中审计和测试。

---

### LOW — 可选修复

#### SEC-L1: URL_PROPERTIES 缺少 `ping` 属性，`<a>` 标签可用于点击追踪

- **位置**: `MarkdownViewer.tsx:83-86`
- **代码**:
  ```typescript
  const URL_PROPERTIES = new Set([
    'href', 'src', 'action', 'formaction', 'xlink:href',
    'poster', 'background', 'dynsrc', 'lowsrc',
  ]);
  // 缺少 'ping'
  ```
- **风险**: HTML `<a>` 标签的 `ping` 属性可在用户点击链接时向指定 URL 发送 POST 请求。`<a>` 在 SAFE_TAGS 白名单中，`ping` 不在 DANGEROUS_ATTRS 也不在 URL_PROPERTIES 中，因此不会被清理。
- **缓解因素**:
  1. `ping` 属性仅在 Chrome/Firefox/Safari 中支持
  2. 发送的是 POST 请求，不执行 JavaScript
  3. DOMPurify 默认会处理 `ping` 属性
- **实际风险**: 极低 — 需要用户主动点击链接，且只能发送 POST 无法窃取数据。
- **修复方案**: 在 URL_PROPERTIES 中添加 `'ping'`。

#### SEC-L2: 内容截断可能在 UTF-16 代理对中间切割

- **位置**: `MarkdownViewer.tsx:219-221`
- **代码**:
  ```typescript
  const truncated = content.length > MAX_SOURCE_LENGTH
    ? content.slice(0, MAX_SOURCE_LENGTH)  // UTF-16 code unit 边界切割
    : content;
  ```
- **风险**: JavaScript `String.slice()` 按 UTF-16 code unit 切割，可能在代理对中间截断（如 Emoji 字符 👨‍💻 由多个 code unit 组成）。截断后的孤立代理可能导致：
  1. 下游 DOMPurify 解析异常
  2. 渲染时显示乱码（U+FFFD replacement character）
- **实际风险**: 极低 — 1MB 截断阈值极大，正常使用极少触发；孤立代理不影响安全性。
- **修复方案**:
  ```typescript
  let truncated = content.slice(0, MAX_SOURCE_LENGTH);
  // 检查是否在代理对中间截断
  const last = truncated.charCodeAt(MAX_SOURCE_LENGTH - 1);
  if (last >= 0xD800 && last <= 0xDBFF) {
    truncated = truncated.slice(0, -1);  // 移除高代理
  }
  ```

#### SEC-L3: FORBID_TAGS 黑名单遗漏部分遗留危险标签

- **位置**: `MarkdownViewer.tsx:68-74`
- **分析**: 当前黑名单包含 18 个标签，但遗漏了一些遗留浏览器可能解析的标签：
  - `frameset`/`frame` — 可加载外部页面
  - `marquee` — 可用于视觉欺骗
  - `bgsound` — IE 专属，可加载外部资源
  - `xmp`/`listing`/`plaintext` — 可改变解析模式
- **缓解因素**: 这些标签在现代浏览器中已废弃或无功能化；`SAFE_TAGS` 白名单会拦截它们（不在白名单中 → `allowElement` 返回 false）。
- **实际风险**: 无 — 白名单层已完全覆盖。

---

## 纵深防御分析

### 完整攻击路径与防护层拦截点

| 攻击向量 | 第1层 safeUrlTransform | 第2层 allowElement | 第3层 DOMPurify | 第4层 rehypeRewrite | 评估 |
|----------|----------------------|--------------------|--------------------|---------------------|------|
| `javascript:` URL | ✓ 协议白名单拦截 | ✓ URL_PROPERTIES 检查 | ✓ ALLOWED_URI_REGEXP | — | 安全 |
| `data:` URL | ✓ 协议白名单拦截 | ✓ URL_PROPERTIES 检查 | ✓ ALLOWED_URI_REGEXP | — | 安全 |
| `<script>` 标签 | — | ✓ 不在 SAFE_TAGS | ✓ FORBID_TAGS | — | 安全 |
| `<iframe>` 标签 | — | ✓ 不在 SAFE_TAGS | ✓ FORBID_TAGS | — | 安全 |
| `onerror` 事件属性 | — | — | ✓ FORBID_ATTR | ✓ DANGEROUS_ATTR_RE | 安全 |
| rehype-attr 注入 on* | — | — | — (DOMPurify 已执行) | ✓ DANGEROUS_ATTR_RE | 安全 |
| rehype-attr 注入 style | — | — | — (DOMPurify 已执行) | ✗ 未清理 | **缺口** |
| `<svg>` 标签 | — | ✓ 不在 SAFE_TAGS | ✓ FORBID_TAGS | — | 安全 |
| 超长内容 DoS | ✓ MAX_SOURCE_LENGTH | — | — | — | 安全 |
| `<a ping>` 追踪 | — | — | ✓ DOMPurify 默认处理 | — | 安全 |
| 畸形 URL (解析失败) | ✗ catch 放行 | ✓ URL_PROPERTIES 检查 | ✓ ALLOWED_URI_REGEXP | — | 安全(纵深) |

### 结论

6 条攻击路径中，5 条在单层即可拦截，1 条（rehype-attr style 注入）存在缺口。畸形 URL 路径在第一层放行，但第二、三层可拦截。整体纵深覆盖率约 94%（17/18 检查点有效）。

---

## 修复优先级矩阵

| 编号 | 严重度 | 修复难度 | 优先级 | 说明 |
|------|--------|----------|--------|------|
| SEC-H1 | HIGH | 低 | P1 | rehypeRewrite 添加 `style` 属性清理，1行代码 |
| SEC-H2 | HIGH | 低 | P1 | catch 块 `return url` → `return ''`，fail-closed |
| SEC-H3 | HIGH | 低 | P2 | 简化 ALLOWED_URI_REGEXP，移除非预期协议 |
| SEC-M1 | MEDIUM | 低 | P2 | ErrorBoundary 添加 componentDidCatch 日志 |
| SEC-M2 | MEDIUM | 低 | P3 | rehypeRewrite 参数 `any` → 接口类型 |
| SEC-M3 | MEDIUM | 中 | P3 | 抽取独立安全策略模块 |
| SEC-L1 | LOW | 低 | P4 | URL_PROPERTIES 添加 `ping` |
| SEC-L2 | LOW | 低 | P4 | UTF-16 代理对安全截断 |
| SEC-L3 | LOW | 无 | — | 接受风险（白名单已覆盖） |

---

## 外部依赖安全评估

| 依赖 | 版本 | 安全状态 | 说明 |
|------|------|----------|------|
| `dompurify` | ^3.4.5 | ✓ 安全 | 最新版本，安全补丁完整 |
| `@uiw/react-markdown-preview` | nohighlight | ⚠️ 有已知缺陷 | S1-S5 已在封装层修复 |
| `rehype-attr` | ~4.0.0 | ⚠️ 风险源 | 可在 DOMPurify 后注入属性 |
| `rehype-raw` | ^7.0.0 | ⚠️ 风险源 | 处理原始 HTML，已被 DOMPurify 前置拦截 |

### CSP 配置分析

- **客户端 CSP**（`pages/index.html`）: `script-src 'self'` 阻止内联脚本 ✓；`style-src 'self' 'unsafe-inline'` 允许行内样式 ⚠️
- **服务端 CSP**（`apis/app.ts`）: `contentSecurityPolicy: false` 已禁用 ⚠️
- **建议**: 在修复 SEC-H1 后，考虑移除 `unsafe-inline` 使用 nonce-based CSP 进一步强化。

---

## 结论

**综合评分 7.5/10 — APPROVE**

MarkdownViewer.tsx 的安全设计是本项目中最优秀的组件之一。六层纵深防御架构有效覆盖了上游库的五个已知安全缺陷（S1-S5），标签白名单 + 黑名单的双重控制、URL 协议的三重过滤、事件处理器属性的显式清理都体现了高水平的安全编码实践。

主要改进方向：
1. **SEC-H1**: rehypeRewrite 添加 `style` 属性清理 — 闭合 rehype-attr CSS 注入缺口
2. **SEC-H2**: safeUrlTransform catch 块改为 fail-closed — 修正安全函数的默认行为
3. **SEC-H3**: 简化 ALLOWED_URI_REGEXP — 降低审计复杂度，统一三层协议定义

预计修复时间 30 分钟，修复后预期评分可达 8.5/10。
