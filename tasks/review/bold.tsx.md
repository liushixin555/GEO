# 代码安全专家评审：bold.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/bold.tsx`
**评审角色**: 代码安全专家（OWASP Top 10 · 输入验证 · 类型安全 · 注入防护 · 攻击面分析）
**评审日期**: 2026-05-24
**代码行数**: 33 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"加粗"命令实现，通过 `**` 前后缀包裹/解包裹选中文本
**评审结论**: ✅ APPROVE — 无可直接利用的安全漏洞，攻击面极小，但存在 2 项类型安全风险和 2 项防御性编程缺陷

**问题统计**: HIGH × 0 / MEDIUM × 2 / LOW × 2 / INFO × 2

---

## 一、安全上下文分析

### 1.1 攻击面地图

```
┌──────────────────────────────────────────────────────────────────────┐
│                     bold.tsx 安全边界                                 │
│                                                                      │
│  外部输入（不可信）:                                                   │
│  ┌─────────────────────────────────┐                                 │
│  │ state.text (textarea 全文)       │ ──→ selectWord()               │
│  │ state.selection (选区范围)       │      ├── 用户通过键盘/鼠标控制    │
│  │ state.command (当前命令对象)     │      └── 数值范围可被异常调用篡改  │
│  └─────────────────────────────────┘                                 │
│                   │                                                  │
│                   ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    execute(state, api)                        │    │
│  │                                                               │    │
│  │  阶段 1: selectWord() ←── text + selection + prefix          │    │
│  │    └── 计算 newSelectionRange (纯数值运算)                     │    │
│  │                                                               │    │
│  │  阶段 2: api.setSelectionRange() ←── 操作 DOM textarea       │    │
│  │    └── textarea.selectionStart/End = newRange                 │    │
│  │        └── 安全：仅操作 DOM 选区属性，无 HTML 注入风险          │    │
│  │                                                               │    │
│  │  阶段 3: executeCommand() ←── 文本包裹/解包裹                  │    │
│  │    └── api.replaceSelection(`${prefix}${text}${suffix}`)      │    │
│  │        └── 写入 textarea.value（纯文本，不经过 HTML 解析）      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  信任边界:                                                           │
│  ├── T1: state.text → selectWord() → 字符串切片（纯运算，安全）       │
│  ├── T2: 数值结果 → textarea DOM 属性（同源上下文，安全）             │
│  ├── T3: textarea.value 赋值（纯文本操作，无 XSS 风险）              │
│  └── T4: SVG icon（硬编码静态 path，无动态内容注入点）               │
│                                                                      │
│  关键安全特性:                                                        │
│  ✓ 全部操作在 textarea.value 上进行（纯文本域，非 contentEditable）  │
│  ✓ 不涉及 innerHTML / dangerouslySetInnerHTML                       │
│  ✓ 不发起网络请求                                                     │
│  ✓ 不访问 localStorage / cookie / sessionStorage                    │
│  ✓ 不使用 eval() / new Function() / document.write()                │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流安全追踪

```
输入: state.text (textarea 完整文本内容，用户可控)
  │
  ├── [T1] selectWord({ text, selection, prefix })
  │   ├── text.slice() 字符串切片 — 纯数值运算，无副作用
  │   ├── getSurroundingWord() — 正向/反向遍历字符，无 ReDoS 风险
  │   └── 返回 { start, end } 数值对 — 用于后续 DOM 操作
  │       └── ✅ 安全：纯计算，无 DOM 写入
  │
  ├── [T2] api.setSelectionRange({ start, end })
  │   └── textarea.selectionStart = start
  │       textarea.selectionEnd = end
  │       └── ✅ 安全：仅修改选区，不修改文本内容
  │
  └── [T3] executeCommand({ api, selectedText, selection, prefix })
      ├── 若已包裹: api.replaceSelection(text.slice(prefix, -suffix))
      │   └── textarea.value 被赋值 — 纯文本操作
      └── 若未包裹: api.replaceSelection(`${prefix}${text}${suffix}`)
          └── textarea.value 被赋值 — 纯文本操作
              └── ✅ 安全：textarea.value 不解析 HTML
```

### 1.3 依赖安全审计

| 依赖 | 来源 | 安全状态 |
|------|------|----------|
| `selectWord()` | `utils/markdownUtils.ts` | 纯字符串运算，无正则，安全 |
| `executeCommand()` | `utils/markdownUtils.ts` | 纯文本拼接写入 textarea，安全 |
| `TextAreaTextApi` | `commands/index.ts` | 直接操作 `HTMLTextAreaElement` DOM 属性，同源安全 |
| `ICommand` / `ExecuteState` | `commands/index.ts` | 纯类型定义，无运行时影响 |
| `React` | 项目依赖 | JSX 编译，无运行时安全问题 |
| `SVG path` | FontAwesome Solid (CC BY 4.0) | 硬编码静态数据，无注入风险 |

---

## 二、安全问题详细分析

### S1 — 🟡 MEDIUM: 非空断言绕过类型契约，运行时 `undefined` 传播风险

**位置**: 第 22 行、第 28 行、第 30 行
**OWASP 分类**: N/A（类型安全层面）
**CWE**: CWE-628 — Function Call with Incorrectly Specified Arguments

```typescript
// 第 22 行
prefix: state.command.prefix!,
// 第 28 行
selectedText: state1.selectedText,
selection: state.selection,
prefix: state.command.prefix!,
```

**问题分析**:

`ICommandBase` 接口中 `prefix` 声明为 `prefix?: string`（可选）。`bold.tsx` 自身硬编码了 `prefix: '**'`，运行时确实非空。但 `execute` 函数签名为 `(state: ExecuteState, api: TextAreaTextApi)`，其中 `state.command` 的类型是 `ICommand`（泛型接口），而非特指 `bold` 对象。

这意味着：
1. **类型欺骗风险**: 如果框架内部通过动态分发调用 `execute`，且 `state.command` 被意外替换为一个没有 `prefix` 的命令对象，`prefix!` 将把 `undefined` 传入 `selectWord()` 和 `executeCommand()`
2. **undefined 传播路径**:
   - `selectWord({ prefix: undefined })` → `prefix.length` → `TypeError: Cannot read properties of undefined (reading 'length')`
   - `executeCommand({ prefix: undefined })` → `` `${undefined}${text}${undefined}` `` → 文本被包裹为 `"undefined...undefined"`
3. **不可利用性**: 此场景需要框架内部逻辑错误才能触发，外部攻击者无法控制 `state.command` 的绑定

**影响范围**: 运行时异常导致编辑器功能中断（DoS），但无数据泄露或代码执行风险。

**修复建议**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const prefix = state.command.prefix;
  if (!prefix) return;  // 防御性检查
  const newSelectionRange = selectWord({
    text: state.text,
    selection: state.selection,
    prefix,
  });
  // ...
},
```

---

### S2 — 🟡 MEDIUM: `executeCommand` 中字符串拼接的 `undefined` 污染风险

**位置**: 第 26-31 行（间接风险，来自 `markdownUtils.ts` 的 `executeCommand` 实现）
**OWASP 分类**: N/A
**CWE**: CWE-20 — Improper Input Validation

```typescript
// bold.tsx 调用
executeCommand({
  api,
  selectedText: state1.selectedText,
  selection: state.selection,
  prefix: state.command.prefix!,
});
```

追踪到 `markdownUtils.ts` 中 `executeCommand` 的实现：

```typescript
// markdownUtils.ts
export function executeCommand({ api, selectedText, selection, prefix, suffix = prefix }) {
  if (
    selectedText.length >= prefix.length + suffix.length &&
    selectedText.startsWith(prefix) &&
    selectedText.endsWith(suffix)
  ) {
    api.replaceSelection(selectedText.slice(prefix.length, suffix.length ? -suffix.length : undefined));
    api.setSelectionRange({ start: selection.start - prefix.length, end: selection.end - prefix.length });
  } else {
    api.replaceSelection(`${prefix}${selectedText}${suffix}`);
    api.setSelectionRange({ start: selection.start + prefix.length, end: selection.end + prefix.length });
  }
}
```

**问题分析**:

当 `prefix` 为 `undefined` 时（由 S1 传播而来）：
1. `suffix = prefix` → `suffix` 也为 `undefined`
2. `prefix.length` → `TypeError`（分支 1）
3. `` `${undefined}${selectedText}${undefined}` `` → 输出 `"undefinedhelloundefined"`（分支 2）
4. `selection.start + prefix.length` → `NaN` → `textarea.selectionStart = NaN` → 被浏览器解析为 `0`

此风险与 S1 联动，但根源在 `bold.tsx` 的非空断言。

---

### S3 — 🟢 LOW: SVG 图标硬编码无内容安全策略(CSP)兼容性风险

**位置**: 第 11-18 行
**CWE**: CWE-1021 — Improper Restriction of Rendered UI Layers

```tsx
icon: (
  <svg role="img" width="12" height="12" viewBox="0 0 384 512">
    <path fill="currentColor" d="M304.793..." />
  </svg>
),
```

**问题分析**:

1. **内联 SVG 是 CSP 安全的** — 内联 SVG 不受 `img-src` 限制，也不会触发外部资源加载。与 `<img src="...">` 或 `<iframe>` 相比，这是最安全的图标方案之一。
2. **`fill="currentColor"` 是安全的** — 不引入外部 URL，不执行脚本。
3. **微小风险**: SVG 内联在 DOM 中，如果页面存在其他 XSS 漏洞，攻击者理论上可以修改 SVG path 的 `d` 属性（纯视觉影响，无安全影响）。

**结论**: 当前实现已经是安全最优解，无需修改。

---

### S4 — 🟢 LOW: `selectWord` 和 `executeCommand` 对 `selection` 越界无防护

**位置**: 第 20-31 行（间接风险，来自 `markdownUtils.ts`）
**CWE**: CWE-129 — Improper Validation of Array Indexing

```typescript
// selectWord 内部
if (result.start >= prefix.length && result.end <= text.length - suffix.length) {
  const selectedTextContext = text.slice(result.start - prefix.length, result.end + suffix.length);
}
```

**问题分析**:

如果 `state.selection` 被篡改为超出 `state.text.length` 的值：
1. `text.slice(negativeIndex, exceedIndex)` → JavaScript 的 `slice` 对越界参数有容错处理，返回空字符串或截断结果
2. `api.setSelectionRange({ start: NaN, end: NaN })` → 浏览器会 clamp 到 `[0, text.length]`
3. 不会导致内存越界或缓冲区溢出（JavaScript 字符串不可变）

**结论**: JavaScript 语言的字符串/DOM API 自带越界保护，实际风险极低。但属于防御性编程缺失。

---

### S5 — ℹ️ INFO: FontAwesome 图标数据许可合规性

**位置**: 第 15 行

SVG path 数据与 FontAwesome Solid `fa-bold` 图标一致。FontAwesome Solid 采用 SIL OFL 1.1 许可（字体）+ CC BY 4.0 许可（图标）。`@uiw/react-md-editor` 声明 MIT 许可。

**影响**: 属于包级别的合规审计范畴，非运行时安全问题。在企业级项目中使用需确认许可证兼容性。

---

### S6 — ℹ️ INFO: `buttonProps` 中 `title` 属性的信息泄露风险

**位置**: 第 10 行

```typescript
buttonProps: { 'aria-label': 'Add bold text (ctrl + b)', title: 'Add bold text (ctrl + b)' },
```

`title` 属性会在鼠标悬停时显示工具提示。字符串中包含快捷键信息 `ctrl + b`，不构成安全风险，但需注意：
1. 硬编码英文文本，未国际化 — 非安全问题
2. `aria-label` 用于屏幕阅读器 — 无障碍属性，安全

---

## 三、安全检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| XSS（跨站脚本） | ✅ 通过 | 全部操作在 textarea.value 上进行（纯文本），不涉及 innerHTML |
| 注入攻击 | ✅ 通过 | 无 eval/new Function/动态代码执行 |
| Prototype Pollution | ✅ 通过 | 不操作 __proto__/constructor/prototype |
| DOM Clobbering | ✅ 通过 | 不通过 id/name 创建全局变量 |
| ReDoS（正则拒绝服务） | ✅ 通过 | selectWord/getSurroundingWord 使用字符遍历，非正则匹配 |
| 供应链安全 | ⚠️ 提示 | FontAwesome SVG 数据的许可证兼容性待确认 |
| 类型安全 | ⚠️ 风险 | prefix 非空断言绕过类型检查，可能传播 undefined |
| 输入验证 | ⚠️ 缺陷 | selection 越界无显式校验（依赖 JS 引擎容错） |
| 敏感数据泄露 | ✅ 通过 | 不访问 cookie/localStorage/sessionStorage |
| CSRF | ✅ 通过 | 不发起网络请求 |
| 权限提升 | ✅ 通过 | 不涉及认证/授权逻辑 |
| Content Security Policy | ✅ 通过 | 内联 SVG + 无外部资源加载 |

---

## 四、与同类命令的安全对比

`bold.tsx` 的结构与 `italic`、`strikethrough`、`code` 等 inline 命令完全一致：

| 命令 | prefix | 非空断言 | 安全差异 |
|------|--------|----------|----------|
| `bold` | `**` | ✅ `prefix!` ×2 | — |
| `italic` | `*` | ✅ `prefix!` ×2 | 相同 |
| `strikethrough` | `~~` | ✅ `prefix!` ×2 | 相同 |
| `code` | `` ` `` | ✅ `prefix!` ×2 | 相同 |

**结论**: S1/S2 是**系统性问题**，影响所有 inline 命令，非 `bold.tsx` 独有。

---

## 五、安全修复建议（按优先级排序）

| 优先级 | 建议 | 工作量 | 影响范围 |
|--------|------|--------|----------|
| 1 | 在 `execute` 入口增加 `prefix` 防御性检查 | 小 | 本文件 |
| 2 | 在 `markdownUtils.ts` 的 `selectWord`/`executeCommand` 中增加 `prefix` 参数校验 | 小 | 所有 inline 命令 |
| 3 | 将 `ICommandBase.prefix` 从 `prefix?: string` 改为 `prefix: string`（收紧类型） | 中 | 所有命令模块 |

---

## 六、评审总结

`bold.tsx` 的安全态势良好。其核心安全优势在于：**所有文本操作均在 `<textarea>` 的 `.value` 属性上进行**，这是浏览器原生的纯文本容器，天然免疫 HTML 注入和 XSS 攻击。SVG 图标为静态硬编码，无动态内容注入点。不涉及网络请求、敏感数据访问或代码执行。

仅有的安全关注点集中在**类型安全层面**（`prefix!` 非空断言）和**防御性编程缺失**（无输入校验），但这些在当前上下文中不可被外部攻击者利用，仅可能导致编辑器功能异常（DoS 级别）。

| 维度 | 评分（1-10） | 说明 |
|------|-------------|------|
| XSS 防护 | 10 | textarea 纯文本操作，天然安全 |
| 注入防护 | 10 | 无动态代码执行 |
| 类型安全 | 6 | `prefix!` 绕过类型契约 |
| 输入验证 | 5 | 无显式边界校验 |
| 依赖安全 | 9 | 核心依赖均为纯运算函数 |
| 供应链合规 | 7 | FontAwesome 许可证待确认 |
| **综合安全评分** | **8.0** | **无高危漏洞，攻击面极小，类型安全有改善空间** |

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts / Context.tsx）*
