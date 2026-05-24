# 安全评审：@uiw/react-markdown-preview Props.tsx

**文件**: `@uiw/react-markdown-preview/src/Props.tsx`
**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP / CWE / 前端安全标准视角）
**代码行数**: 30 行（纯类型定义文件）
**安全评级**: ⚠️ MEDIUM（中风险 — 类型定义层面存在多处安全隐忧，需配合实现层验证）

---

## 1. 安全总体评级：⚠️ MEDIUM

Props.tsx 是 `@uiw/react-markdown-preview` 组件库的**纯类型定义文件**，本身不包含可执行逻辑。但类型定义是组件安全契约的根基——它决定了外部调用者能传入什么参数、组件承诺处理什么输入。本文件在安全契约设计上存在多个不足：缺少输入约束的类型标注、暴露了危险重写能力、继承了不安全的上游类型而未加以限制。

| 安全域 | 评分 | 状态 |
|--------|------|------|
| 输入验证类型约束 | 3/10 | `source` 无长度/格式限制，`className` 无白名单 |
| 插件安全管控 | 2/10 | `pluginsFilter` 可移除安全插件，无拦截能力 |
| HTML 重写安全 | 2/10 | `rehypeRewrite` 无约束，可注入/篡改任意 HTML 节点 |
| 上游类型继承安全 | 4/10 | 继承 `react-markdown` Options 未过滤危险属性 |
| Ref 接口安全 | 5/10 | `MarkdownPreviewRef` 暴露全部 Props，可能被滥用 |
| 弃用属性安全 | 6/10 | `warpperElement` 已标记弃用但仍在类型中可用 |
| 文档安全提示 | 1/10 | 零安全相关 JSDoc 注释 |

---

## 2. 安全漏洞详情

### SEC-MD-01: `source` 属性缺少长度与内容约束 — 潜在 DoS / XSS 载体

**严重度**: 🔴 HIGH
**位置**: 第 8 行
**CWE**: CWE-20 (Improper Input Validation), CWE-400 (Uncontrolled Resource Consumption)
**OWASP**: A03:2021 — Injection

```typescript
source?: string;
```

**问题分析**:

`source` 是 Markdown 渲染的原始输入，类型为裸 `string`，没有任何约束。实际安全影响取决于下游实现层如何处理该字符串，但类型定义作为安全契约的第一道防线，完全没有提供任何防御性约束：

| 风险场景 | 攻击路径 | 影响 |
|----------|---------|------|
| 超长字符串 DoS | 传入数十 MB 的 `source` | Markdown 解析器（remark）CPU/内存耗尽，页面冻结 |
| XSS via HTML | Markdown 内嵌 `<script>`、`<img onerror>` 等 | 若渲染层未启用 HTML 过滤，导致脚本执行 |
| XSS via Markdown 语法 | 恶意链接 `[click](javascript:alert(1))` | 若 rehype 插件未过滤 `javascript:` 协议 |
| ReDoS | Markdown 解析器对特定模式的正则回溯 | 页面冻结或崩溃 |

**类型层面的改进建议**:

虽然 TypeScript 类型系统无法运行时验证字符串内容，但可以通过 Branded Type 或 Template Literal Type 传递安全意图：

```typescript
// 方案 A：通过 JSDoc 明确安全责任
/**
 * Markdown 源文本。组件内部会进行 HTML 标签过滤，
 * 但调用方仍需对来源不可信的输入进行服务端消毒。
 * 建议长度上限: 1MB (1048576 字符)。
 */
source?: string;

// 方案 B：通过类型别名传递意图（推荐）
type SanitizedMarkdown = string & { __brand: 'SanitizedMarkdown' };
source?: SanitizedMarkdown;
```

**上游调用方（本项目）的防护建议**:

在本项目使用该组件时，应在传入 `source` 前进行：
1. 长度截断（如最大 1MB）
2. HTML 标签白名单过滤（使用 DOMPurify 或类似库）
3. `javascript:` / `data:` URI 协议过滤

---

### SEC-MD-02: `rehypeRewrite` 提供无约束的 HTML AST 重写能力 — 可绕过安全过滤

**严重度**: 🔴 HIGH
**位置**: 第 24 行
**CWE**: CWE-94 (Code Injection), CWE-749 (Exposed Dangerous Method or Function)
**OWASP**: A08:2021 — Software and Data Integrity Failures

```typescript
rehypeRewrite?: RehypeRewriteOptions['rewrite'];
```

**问题分析**:

`rehypeRewrite` 直接暴露了 `rehype-rewrite` 的 `rewrite` 回调，该回调接收完整的 HAST（HTML Abstract Syntax Tree）节点，可以：

1. **移除安全过滤**: 将经过 `rehype-sanitize` 处理后的安全节点重新改写为危险内容
2. **注入恶意属性**: 为任意节点添加 `onclick`、`onerror` 等事件处理器
3. **篡改链接**: 修改 `href` 为 `javascript:` URI
4. **插入新节点**: 在 AST 中插入全新的 `<script>` 或 `<iframe>` 元素

```typescript
// 恶意使用示例：绕过 sanitize 注入脚本
rehypeRewrite={(node) => {
  if (node.type === 'element' && node.tagName === 'a') {
    node.properties!.onclick = "alert(document.cookie)";
  }
}}
```

**修复建议**:

类型定义层面无法阻止这种用法，但可以在文档中明确警告：

```typescript
/**
 * ⚠️ 安全警告：此回调运行在 rehypesanitize 之后，
 * 可以覆盖安全过滤结果。仅在完全信任输入源时使用。
 * 请勿用于渲染用户提交的 Markdown 内容。
 */
rehypeRewrite?: RehypeRewriteOptions['rewrite'];
```

**上游调用方防护**: 在本项目使用时，如果 `source` 来自用户输入，**禁止同时传入 `rehypeRewrite`**。

---

### SEC-MD-03: `pluginsFilter` 可移除安全插件 — 破坏安全链

**严重度**: 🟠 MEDIUM
**位置**: 第 11 行
**CWE**: CWE-276 (Incorrect Default Permissions)
**OWASP**: A05:2021 — Security Misconfiguration

```typescript
pluginsFilter?: (type: 'rehype' | 'remark', plugin: PluggableList) => PluggableList;
```

**问题分析**:

`pluginsFilter` 允许调用方过滤/修改 remark 和 rehype 插件列表。如果组件内部使用了 `rehype-sanitize` 等安全插件，外部调用者可以通过此回调将其移除：

```typescript
// 恶意使用：移除所有 rehype 插件（包括 sanitize）
pluginsFilter={(type, plugins) => {
  if (type === 'rehype') return []; // 清空安全插件
  return plugins;
}}
```

这打破了组件的安全假设——组件可能在文档中声明"默认启用 HTML 过滤"，但调用者可以绕过。

**修复建议**:

类型定义应区分"可过滤插件"和"核心安全插件"：

```typescript
// 建议：将安全插件排除在过滤范围之外
pluginsFilter?: (
  type: 'rehype' | 'remark',
  plugin: PluggableList,
  // 新增：安全插件列表（不可过滤）
  _securityPlugins?: PluggableList
) => PluggableList;
```

---

### SEC-MD-04: 继承 `react-markdown` Options 未过滤危险属性

**严重度**: 🟠 MEDIUM
**位置**: 第 5 行
**CWE**: CWE-1357 (Reliance on Uncontrolled External Component)
**OWASP**: A06:2021 — Vulnerable and Outdated Components

```typescript
export interface MarkdownPreviewProps extends Omit<Options, 'children'> {
```

**问题分析**:

`Options` 来自 `react-markdown`，包含以下危险属性（通过继承全部暴露给调用方）：

| 继承属性 | 危险性 | 说明 |
|----------|--------|------|
| `rehypePlugins` | 🔴 HIGH | 可注入任意 rehype 插件，绕过 sanitize |
| `remarkPlugins` | 🟠 MEDIUM | 可注入任意 remark 插件，修改解析行为 |
| `allowedElements` | 🟡 MEDIUM | 可限制渲染元素白名单，但不含恶意元素 |
| `disallowedElements` | 🟡 MEDIUM | 可禁用特定元素过滤 |
| `allowElement` | 🔴 HIGH | 细粒度控制允许哪些元素，可允许 `<script>` |
| `urlTransform` | 🟠 MEDIUM | 可修改 URL 转换逻辑，可能绕过协议过滤 |

其中 `allowElement` 尤其危险——它允许逐元素判断是否渲染，调用者可以显式允许 `<script>`、`<iframe>`、`<object>` 等危险元素。

**修复建议**:

对于 `@uiw/react-markdown-preview` 这样的封装库，应在类型层面对上游 Options 做更精细的 Omit：

```typescript
// 建议：隐藏可直接绕过安全的属性
export interface MarkdownPreviewProps extends Omit<
  Options,
  'children' | 'allowElement'  // 移除危险的 allowElement
> {
```

同时将 `rehypePlugins` 和 `remarkPlugins` 的用途限制在文档中说明。

---

### SEC-MD-05: `wrapperElement` 接受任意 HTML 属性 — 潜在事件注入

**严重度**: 🟡 LOW-MEDIUM
**位置**: 第 12-14 行
**CWE**: CWE-79 (Cross-site Scripting)
**OWASP**: A03:2021 — Injection

```typescript
wrapperElement?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  'data-color-mode'?: 'light' | 'dark';
};
```

**问题分析**:

`React.HTMLAttributes<HTMLDivElement>` 包含所有标准 HTML 事件处理器属性（`onClick`、`onMouseOver`、`onError` 等），以及 `dangerouslySetInnerHTML`。虽然 React 对事件处理器有虚拟 DOM 层的保护，但：

1. `dangerouslySetInnerHTML` 属性存在意味着理论上可以传入 `__html` 内容（取决于实现层是否透传该属性到 DOM）
2. 任意 `style` 属性可用于 CSS 注入（如 `expression()`、`url()` 等 CSS 攻击向量，现代浏览器已基本消除）
3. `className` 可被注入恶意类名，配合 CSS 实现点击劫持

**修复建议**:

收窄类型，只允许实际需要的属性：

```typescript
wrapperElement?: {
  className?: string;
  style?: React.CSSProperties;
  'data-color-mode'?: 'light' | 'dark';
  id?: string;
  role?: string;
  // 仅暴露安全属性，排除事件处理器和 dangerouslySetInnerHTML
};
```

---

### SEC-MD-06: `MarkdownPreviewRef` 暴露全部 Props — 可能被滥用为安全绕过通道

**严重度**: 🟡 LOW-MEDIUM
**位置**: 第 27-29 行
**CWE**: CWE-733 (Operator Precedence Logic Error), CWE-285 (Improper Authorization)

```typescript
export interface MarkdownPreviewRef extends MarkdownPreviewProps {
  mdp: React.RefObject<HTMLDivElement>;
}
```

**问题分析**:

Ref 接口继承了全部 Props 属性，这意味着通过 `ref.current` 可以：

1. **读取敏感 Props**: 访问 `source`、`pluginsFilter` 等内部状态
2. **访问 DOM 节点**: `mdp` 是对内部 div 的直接引用，可进行任意 DOM 操作
3. **绕过 React 数据流**: 如果实现层将 ref 属性映射为可写，则可绕过 Props 单向数据流

更关键的是 `mdp: React.RefObject<HTMLDivElement>` 直接暴露了内部 DOM 元素引用，这允许：
- `ref.current.mdp.current.innerHTML = '<script>...'`（直接 DOM 操作绕过 React 的 XSS 防护）
- 读取 `innerText`、`textContent`（信息泄露）
- 修改 `style`、`className`（UI 篡改）

**修复建议**:

```typescript
// 建议：Ref 接口只暴露安全的命令式方法
export interface MarkdownPreviewRef {
  // 获取渲染后的 HTML 内容（只读）
  getHTML: () => string;
  // 获取 Markdown 源文本（只读）
  getSource: () => string;
  // 滚动到指定位置
  scrollTo: (options?: ScrollToOptions) => void;
}
```

---

### SEC-MD-07: 弃用的 `warpperElement` 仍可用于传入危险属性

**严重度**: 🟡 LOW
**位置**: 第 17-21 行
**CWE**: CWE-477 (Use of Obsolete Function)

```typescript
/**
 * Please use wrapperElement, Will be removed in v5 release.
 * @deprecated
 */
warpperElement?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  'data-color-mode'?: 'light' | 'dark';
};
```

**问题分析**:

虽然 `warpperElement` 已标记 `@deprecated`，但它：
1. **仍然是有效的类型**，不会被 TypeScript 编译器拒绝
2. 与 `wrapperElement` 类型完全相同，具有同样的安全风险（SEC-MD-05）
3. 如果实现层优先检查 `warpperElement` 再 fallback 到 `wrapperElement`，恶意调用者可以使用弃用属性绕过可能的未来安全检查

**安全影响有限但维护成本高**: 需要在安全审计中同时检查两个属性的用法。

---

### SEC-MD-08: `onScroll` / `onMouseOver` 事件回调无消毒 — 潜在信息泄露

**严重度**: 🟢 INFO
**位置**: 第 22-23 行
**CWE**: CWE-200 (Information Exposure)

```typescript
onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
onMouseOver?: (e: React.MouseEvent<HTMLDivElement>) => void;
```

**问题分析**:

这两个事件回调将原生 DOM 事件对象直接传递给调用方。事件对象包含：
- `e.target` — 暴露内部 DOM 结构
- `e.clientX` / `e.clientY` — 用户坐标信息
- `e.view` — window 对象引用（可访问 `localStorage`、`document.cookie` 等）

在正常使用场景下这不是问题，但如果组件被用于渲染不可信内容（如用户提交的 Markdown），恶意内容可能通过这些事件的 target 泄露组件内部结构。

**修复建议**: 可考虑提供包装后的事件对象，只暴露安全的坐标信息，隐藏内部 DOM 引用。但在组件库场景下，这种做法可能过度设计。

---

## 3. 供应链安全评估

### 上游依赖风险

| 依赖 | 版本范围 | 已知漏洞 | 风险等级 |
|------|---------|---------|---------|
| `react-markdown` | 未锁定 | 如果版本 < 9.0，存在默认允许 HTML 的问题 | 🟠 MEDIUM |
| `rehype-rewrite` | 未锁定 | 无已知漏洞，但提供 AST 重写能力本身是风险 | 🟡 LOW |
| `unified` | 未锁定 | 核心生态，维护良好 | 🟢 LOW |

**关键供应链风险**: `react-markdown` 在 v9 之前默认允许 HTML 渲染。如果本组件使用的 `react-markdown` 版本低于 v9 且未显式配置 `rehype-sanitize`，则 `source` 中的任何 HTML 标签都会被直接渲染到 DOM，造成 XSS。

### 下游调用风险

在本项目中使用此组件时，如果传入用户可控的 `source`，必须确保：
1. `react-markdown` 版本 >= 9 或配置了 `rehype-sanitize`
2. 不传入 `rehypeRewrite`、`pluginsFilter`
3. 对 `source` 进行长度限制和内容消毒

---

## 4. 安全改进建议汇总

| 优先级 | 编号 | 改进措施 | 难度 | 影响范围 |
|--------|------|---------|------|---------|
| P0 | SEC-MD-01 | 在本项目中为 `source` 添加长度限制 + HTML 消毒 | 低 | 下游调用 |
| P0 | SEC-MD-02 | 禁止在渲染用户内容时使用 `rehypeRewrite` | 低 | 下游调用 |
| P1 | SEC-MD-04 | 确认 `react-markdown` 版本，确保启用 HTML 过滤 | 低 | 供应链 |
| P1 | SEC-MD-03 | 确认 `pluginsFilter` 未移除安全插件 | 中 | 组件配置 |
| P2 | SEC-MD-05 | 收窄 `wrapperElement` 类型 | 中 | 类型定义 |
| P2 | SEC-MD-06 | 收窄 `MarkdownPreviewRef` 类型 | 中 | 类型定义 |
| P3 | SEC-MD-07 | 计划在 v5 移除 `warpperElement` | 低 | 弃用清理 |
| P3 | SEC-MD-08 | 考虑包装事件对象 | 高 | API 设计 |

---

## 5. 本项目调用安全检查清单

对于本项目中使用 `@uiw/react-markdown-preview` 的代码，需逐一确认：

- [ ] `source` 是否来自用户输入？若是，是否经过消毒？
- [ ] `source` 长度是否有上限？
- [ ] 是否传入了 `rehypeRewrite`？若传入，是否在安全上下文中使用？
- [ ] 是否传入了 `pluginsFilter`？是否可能移除 `rehype-sanitize`？
- [ ] 是否传入了 `rehypePlugins` 或 `remarkPlugins`？是否包含安全插件？
- [ ] 是否使用了 `allowElement` 或 `allowedElements` 来控制渲染白名单？
- [ ] `wrapperElement` 是否传入了 `dangerouslySetInnerHTML`？
- [ ] `ref` 的使用是否仅限于安全的只读操作？

---

## 6. 结论

Props.tsx 作为一个 30 行的纯类型定义文件，本身不包含可利用的安全漏洞。但作为组件库的安全入口，其类型设计存在以下系统性问题：

1. **信任边界不清**: 类型未区分"可信内容"和"不可信内容"的使用场景，两种场景共用同一套无约束的 Props
2. **危险能力暴露**: `rehypeRewrite`、`pluginsFilter`、继承的 `allowElement` 等属性提供了绕过安全过滤的通道
3. **缺少安全文档**: 没有任何 JSDoc 注释提示安全风险或推荐安全用法
4. **Ref 接口过宽**: 暴露了直接 DOM 操作能力，可以绕过 React 的 XSS 防护层

**最终评级**: ⚠️ **MEDIUM** — 类型定义层面的安全契约不完善，需在本项目的调用层添加额外的安全防护措施。
