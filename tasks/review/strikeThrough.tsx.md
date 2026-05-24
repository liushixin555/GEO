# 代码安全专家评审：strikeThrough.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/strikeThrough.tsx`
**评审角色**: 代码安全专家（输入验证 · 注入防护 · XSS · 信息泄露 · DoS · 边界安全 · 依赖安全）
**评审日期**: 2026-05-25
**代码行数**: 36 行（1 个导出 `ICommand` 对象：`strikethrough`）
**功能概述**: Markdown 编辑器"删除线"命令实现，通过 `~~` 前后缀包裹/解包裹选中文本
**评审结论**: ✅ APPROVE — 7.8/10，无 HIGH 级安全漏洞，攻击面极小；存在 2 项 MEDIUM 级和 3 项 LOW 级安全改进建议

**问题统计**: HIGH × 0 / MEDIUM × 2 / LOW × 3 / INFO × 2

---

## 一、安全总览

### 1.1 攻击面分析

```
┌─────────────────────────────────────────────────────────────────────┐
│                  strikeThrough.tsx 攻击面地图                         │
│                                                                     │
│  外部输入:                                                           │
│  ┌──────────────────────────────────────────────┐                  │
│  │  state.text        ← textarea 内容（用户输入）│  信任边界        │
│  │  state.selection   ← 选区范围（用户交互）     │                  │
│  │  state.command     ← 命令对象（框架分发）     │                  │
│  └──────────────────────────────────────────────┘                  │
│          │                                                          │
│          ▼                                                          │
│  ┌──────────────────────────────────────────────┐                  │
│  │  selectWord()      ← 选区扩展（纯函数）       │  无外部调用      │
│  │  executeCommand()  ← 文本替换（DOM 操作）     │  仅操作 textarea │
│  │  api.setSelectionRange() ← DOM API 封装       │                  │
│  └──────────────────────────────────────────────┘                  │
│          │                                                          │
│          ▼                                                          │
│  输出: textarea.value 更新（纯文本，无 HTML 渲染）                   │
│                                                                     │
│  不存在的攻击面:                                                     │
│  ✗ 无网络请求   ✗ 无 eval/Function   ✗ 无 innerHTML               │
│  ✗ 无 localStorage  ✗ 无 正则表达式   ✗ 无 第三方依赖调用          │
│  ✗ 无 document.cookie  ✗ 无 postMessage                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 安全维度评估

| 安全维度 | 评分 (1-10) | 说明 |
|----------|-------------|------|
| **XSS 防护** | 9.0 | 纯 textarea 操作，无 HTML 渲染；SVG 图标静态安全 |
| **注入防护** | 9.0 | 无 eval/innerHTML，文本包裹是纯字符串操作 |
| **输入验证** | 7.0 | 信任 selectWord 返回值，prefix 非空断言跳过检查 |
| **DoS 防护** | 7.5 | 非空断言可能触发运行时异常导致编辑器无响应 |
| **信息泄露** | 9.5 | 无 console.log/网络请求/持久化，零信息泄露面 |
| **依赖安全** | 9.0 | 零外部运行时依赖，所有导入为库内部纯函数 |
| **边界安全** | 7.5 | 字符串切片无显式边界检查，选区范围未验证 |

**综合评分**: **7.8 / 10** — ✅ APPROVE

---

## 二、安全发现详情

### S1 — 🟡 MEDIUM: `state.command.prefix!` 非空断言缺乏防御性检查（第一处）

**位置**: 第 27 行
**类型**: 运行时类型安全 / NULL Dereference
**CWE**: CWE-476 (NULL Pointer Dereference) — TypeScript 模拟

```typescript
// 第 27 行
const newSelectionRange = selectWord({
  text: state.text,
  selection: state.selection,
  prefix: state.command.prefix!,   // ← 非空断言
});
```

**问题分析**:

`ICommand` 接口中 `prefix` 声明为 `prefix?: string`（可选属性）。虽然本命令在第 13 行硬编码了 `prefix: '~~'`，但 `execute` 函数的 `state.command` 参数类型为 `ICommand`，类型系统无法保证运行时分发时 `state.command` 指向 `strikethrough` 对象自身。

**攻击场景**:

```typescript
// 框架错误分发：将 fullscreen 命令的 state 传给 strikethrough 的 execute
const mismatchedState = {
  text: "sensitive content",
  selection: { start: 0, end: 17 },
  selectedText: "sensitive content",
  command: { name: "fullscreen", keyCommand: "fullscreen" }  // ← 无 prefix
};

strikethrough.execute(mismatchedState, api);
// → state.command.prefix! = undefined
// → selectWord({ prefix: undefined }) → prefix.length 抛出 TypeError
// → 或成功进入 executeCommand → textarea 被 "undefined" 污染
```

**安全影响**:
- **完整性**: textarea 内容可能被 `"undefined"` 字面量包裹，造成数据污染
- **可用性**: `selectWord` 内部访问 `undefined.length` 抛出 TypeError，导致编辑器无响应
- **可利用性**: 低 — 需框架内部分发逻辑异常，不可从外部直接触发

**修复建议**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const prefix = state.command.prefix;
  if (!prefix) return;  // 防御性检查 + 类型收窄
  const newSelectionRange = selectWord({
    text: state.text,
    selection: state.selection,
    prefix,
  });
  // ...
},
```

---

### S2 — 🟡 MEDIUM: `state.command.prefix!` 非空断言缺乏防御性检查（第二处）

**位置**: 第 34 行
**类型**: 运行时类型安全 / 数据完整性
**CWE**: CWE-476 (NULL Pointer Dereference)

```typescript
// 第 34 行
executeCommand({
  api,
  selectedText: state1.selectedText,
  selection: state.selection,
  prefix: state.command.prefix!,   // ← 重复非空断言
});
```

**问题分析**:

与 S1 相同的根因，但在 `executeCommand` 调用处。即使 `selectWord` 调用未崩溃（如 `selectWord` 内部对 `undefined` 有容错），`executeCommand` 仍会将 `undefined` 作为 prefix 传入，导致：

```typescript
// executeCommand 内部逻辑（推测）：
// 未包裹: api.replaceSelection(`${undefined}${text}${undefined}`)
// → textarea 显示 "undefined原始文本undefined"

// 已包裹解包裹: text.slice(undefined.length)
// → TypeError: Cannot read properties of undefined (reading 'length')
```

**安全影响**:
- **数据完整性**: textarea 内容被 "undefined" 字面量污染
- **同 S1 修复方案可同时解决此问题**

---

### S3 — 🟢 LOW: `execute` 函数无错误边界保护

**位置**: 第 22-35 行（整个 execute 函数体）
**类型**: 异常处理 / 可用性
**CWE**: CWE-755 (Improper Handling of Exceptional Conditions)

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const newSelectionRange = selectWord({...});     // 可能抛异常
  const state1 = api.setSelectionRange({...});     // 可能抛异常
  executeCommand({...});                           // 可能抛异常
  // 无 try-catch 保护
},
```

**问题分析**:

`execute` 内部三个连续调用均无 try-catch 保护。如果任意一步抛出异常（如 `selectWord` 对异常 selection 的越界访问、`api.setSelectionRange` 操作已卸载的 DOM 节点），异常将冒泡到框架层。若框架层也缺乏错误边界，可能导致：

1. 编辑器 UI 崩溃，用户丢失未保存内容
2. React 错误边界未捕获，整个组件树卸载
3. 异常堆栈暴露内部实现细节（开发模式下）

**安全影响**:
- **可用性**: 异常未捕获导致编辑器不可用
- **信息泄露**: 开发模式下错误堆栈可能暴露代码结构（生产环境影响极小）

**修复建议**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi): void => {
  try {
    const prefix = state.command.prefix;
    if (!prefix) return;
    const newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix,
    });
    const state1 = api.setSelectionRange(newSelectionRange);
    executeCommand({
      api,
      selectedText: state1.selectedText,
      selection: state.selection,
      prefix,
    });
  } catch {
    // 静默失败 — 命令执行失败不应崩溃编辑器
  }
},
```

---

### S4 — 🟢 LOW: `state.selection` 选区范围缺少边界验证

**位置**: 第 24-27 行
**类型**: 输入验证
**CWE**: CWE-129 (Improper Validation of Array Index)

```typescript
const newSelectionRange = selectWord({
  text: state.text,
  selection: state.selection,    // ← start/end 未验证
  prefix: state.command.prefix!,
});
```

**问题分析**:

`state.selection` 包含 `start` 和 `end` 数值，代表 textarea 中的字符偏移。以下异常值未被验证：

| 异常值 | 风险 |
|--------|------|
| `start < 0` | 字符串切片越界 → 可能返回意外结果 |
| `end > text.length` | 同上 |
| `start > end` | 反向选区 → 行为取决于 `selectWord` 实现 |
| `NaN / Infinity` | 字符串操作结果不可预测 |
| 非整数 (`1.5`) | 字符串偏移应为整数 |

**攻击场景**:

```typescript
// 恶意构造的 selection
const maliciousState = {
  text: "hello",
  selection: { start: -1000, end: 99999 },  // 远超文本范围
  command: strikethrough,
};
strikethrough.execute(maliciousState, api);
// → selectWord 内部 slice(-1000, 99999) → JavaScript 容错返回全文
// → 非安全漏洞，但行为不可预测
```

**安全影响**:
- **低风险**: JavaScript 字符串操作对越界索引有天然容错（不会越界读取内存）
- **行为不可预测**: 异常选区可能导致不符合预期的文本操作

**修复建议**:

```typescript
// 在 execute 入口处做边界钳制
const clampSelection = (text: string, sel: {start: number; end: number}) => ({
  start: Math.max(0, Math.min(sel.start, text.length)),
  end: Math.max(0, Math.min(sel.end, text.length)),
});
```

---

### S5 — 🟢 LOW: SVG `data-name` 属性泄露组件内部标识

**位置**: 第 15 行
**类型**: 信息泄露（极低风险）
**CWE**: CWE-200 (Exposure of Sensitive Information)

```tsx
<svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
```

**问题分析**:

`data-name="strikethrough"` 属性暴露了组件的内部命令名称。在 DOM 中可通过 `document.querySelectorAll('[data-name="strikethrough"]')` 枚举到。虽然此信息本身不敏感（按钮的 aria-label 和 title 已公开了相同信息），但属于不必要的信息暴露。

实际风险极低——攻击者可通过多种方式识别 UI 组件（CSS 类名、ARIA 属性、事件监听器等），`data-name` 不构成额外的攻击向量。

**建议**: 可安全移除，减少 DOM 信息暴露面。

---

### S6 — ℹ️ INFO: `aria-label` 和 `title` 使用英文

**位置**: 第 10-11 行
**类型**: 国际化安全 / 可访问性

```typescript
buttonProps: {
  'aria-label': 'Add strikethrough text (ctrl + shift + x)',
  title: 'Add strikethrough text (ctrl + shift + x)',
},
```

**分析**: 属性内容为英文硬编码字符串。在中文环境下（本项目目标用户），屏幕阅读器将朗读英文提示。不属于安全漏洞，但影响中文用户的可访问性体验。

---

### S7 — ℹ️ INFO: 快捷键 `ctrl+shift+x` 无浏览器级冲突

**位置**: 第 8 行

```typescript
shortcuts: 'ctrl+shift+x',
```

**分析**: `Ctrl+Shift+X` 在主流浏览器（Chrome/Firefox/Edge/Safari）中无默认绑定，不会与浏览器快捷键冲突。VS Code 中 `Ctrl+Shift+X` 打开扩展面板——如果编辑器嵌入 VS Code Webview，会产生快捷键抢占。不影响安全，属于功能兼容性考量。

---

## 三、安全数据流追踪

```
输入: state.text (textarea 全文，用户可控)
  │
  ├── [T1] selectWord({ text, selection, prefix })
  │   ├── text.slice() — 纯数值切片运算
  │   ├── 前向/后向字符遍历 — 无 ReDoS 风险（非正则）
  │   └── 返回 { start, end } 数值对
  │       └── ✅ 安全：纯计算，无 DOM 写入，无副作用
  │
  ├── [T2] api.setSelectionRange({ start, end })
  │   └── textarea.selectionStart/End = value
  │       └── ✅ 安全：仅修改选区属性，不修改文本内容
  │
  └── [T3] executeCommand({ api, selectedText, selection, prefix })
      ├── 未包裹: api.replaceSelection(`~~${text}~~`)
      │   └── textarea.value 被赋值 — 纯文本操作
      └── 已包裹: api.replaceSelection(text.slice(2, -2))
          └── textarea.value 被赋值 — 纯文本操作

  信任边界安全评估:
  ├── T1 → ✅ 纯函数计算，无外部可观察副作用
  ├── T2 → ✅ 同源 DOM 操作，无跨域风险
  └── T3 → ✅ textarea.value 赋值不触发 HTML 解析

  不存在的攻击向量:
  ✗ 无 innerHTML / dangerouslySetInnerHTML → 无 XSS
  ✗ 无 eval / new Function / document.write → 无代码注入
  ✗ 无 fetch / XMLHttpRequest → 无网络泄露
  ✗ 无 localStorage / cookie → 无持久化泄露
  ✗ 无正则表达式 → 无 ReDoS
  ✗ 无动态 import → 无供应链加载风险
```

---

## 四、SVG 图标安全分析

```tsx
<svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
  <path fill="currentColor" d="M496 288H16c-8.837..." />
</svg>
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 动态内容注入 | ✅ 安全 | path `d` 属性为硬编码字符串，无动态插值 |
| `<script>` 标签 | ✅ 不存在 | SVG 内无脚本元素 |
| `onload`/事件属性 | ✅ 不存在 | SVG 内无内联事件处理器 |
| `href`/`xlink:href` | ✅ 不存在 | 无外部资源引用（防止 SSRF） |
| `<use>` 外部引用 | ✅ 不存在 | 无跨域 SVG 引用 |
| CSS 注入 | ✅ 安全 | `fill="currentColor"` 继承父级颜色，无攻击面 |

**结论**: SVG 图标完全静态，无安全风险。

---

## 五、依赖安全评估

| 依赖 | 类型 | 安全风险 | 说明 |
|------|------|----------|------|
| `React` | JSX Runtime | ✅ 无 | 仅用于 `createElement`，无运行时 API 调用 |
| `ICommand` | 类型导入 | ✅ 无 | 仅 TypeScript 类型，编译后擦除 |
| `ExecuteState` | 类型导入 | ✅ 无 | 同上 |
| `TextAreaTextApi` | 类型导入 | ✅ 无 | 同上 |
| `selectWord()` | 内部工具 | ✅ 低 | 纯函数，无副作用，无外部调用 |
| `executeCommand()` | 内部工具 | ✅ 低 | 纯文本操作，仅通过 api 操作 textarea |

**零外部运行时依赖** — 所有工具函数均为库内部模块，不引入第三方包。

---

## 六、安全检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| XSS 防护 | ✅ 通过 | 纯 textarea 操作，不涉及 HTML 渲染 |
| 代码注入 | ✅ 通过 | 无 eval/Function/document.write |
| innerHTML 使用 | ✅ 通过 | 未使用 innerHTML 或 dangerouslySetInnerHTML |
| 网络请求 | ✅ 通过 | 无 fetch/XHR/WebSocket |
| 本地存储 | ✅ 通过 | 无 localStorage/cookie/sessionStorage |
| 输入验证 | ⚠️ 风险 | prefix 非空断言、selection 无边界检查 |
| 类型安全 | ⚠️ 风险 | 2 处 `!` 非空断言绕过类型契约 |
| 错误处理 | ⚠️ 缺陷 | execute 内部无 try-catch |
| 正则安全 | ✅ 通过 | 不使用正则表达式 |
| SVG 安全 | ✅ 通过 | 完全静态图标，无动态内容 |
| 依赖安全 | ✅ 通过 | 零外部运行时依赖 |
| 信息泄露 | ✅ 通过 | 无 console.log/网络请求/错误堆栈暴露 |

---

## 七、安全修复建议（按优先级排序）

| 优先级 | 建议 | 工作量 | CWE | 风险降低 |
|--------|------|--------|-----|----------|
| **P1** | 在 `execute` 入口增加 `prefix` 空值守卫 + 类型收窄 | 小 | CWE-476 | 消除 undefined 注入 + 运行时崩溃 |
| **P2** | 为 `execute` 函数添加 try-catch 错误边界 | 小 | CWE-755 | 防止编辑器崩溃 |
| **P3** | 添加 `selection` 范围边界钳制 | 中 | CWE-129 | 防止异常选区导致不可预测行为 |
| **P4** | 移除 `data-name` 属性减少 DOM 信息暴露 | 极小 | CWE-200 | 减少信息泄露面 |
| **P5** | 在 `ICommandBase` 层面将 `prefix` 改为必需属性 | 中 | CWE-476 | 根治非空断言问题（影响所有命令） |

---

## 八、评审总结

`strikeThrough.tsx` 是一个攻击面极小的 Markdown 格式化命令实现。核心安全优势在于**所有文本操作均在 textarea.value 上进行（纯文本域），不经过 HTML 解析引擎**，从根本上消除了 XSS 风险。SVG 图标完全静态硬编码，不存在注入向量。零外部运行时依赖，供应链攻击面为零。

唯一实质性的安全关注点是**两处 `state.command.prefix!` 非空断言**（CWE-476），在框架分发异常时可导致 textarea 内容被 `"undefined"` 字面量污染或触发 TypeError 使编辑器无响应。建议在 `execute` 入口增加防御性空值守卫并辅以 try-catch 错误边界，即可将安全评分提升至 9.0+。

| 维度 | 评分（1-10） | 说明 |
|------|-------------|------|
| XSS 防护 | 9.0 | textarea 纯文本操作，SVG 静态安全 |
| 注入防护 | 9.0 | 无 eval/innerHTML，纯字符串操作 |
| 输入验证 | 7.0 | prefix 非空断言、selection 无边界验证 |
| DoS 防护 | 7.5 | 非空断言可能触发运行时崩溃 |
| 信息泄露 | 9.5 | 零泄露面 |
| 依赖安全 | 9.0 | 零外部运行时依赖 |
| 边界安全 | 7.5 | 选区范围无显式验证 |
| **综合安全评分** | **7.8** | **攻击面极小，prefix 防御性检查为主要改进点** |

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts / bold.tsx / italic.tsx / code.tsx）*

---

## 修复记录（2026-05-25）

基于安全/架构/UI/Committer 四份评审报告，已修复以下问题：

| 编号 | 来源 | 级别 | 问题 | 修复方式 |
|------|------|------|------|---------|
| S1/S2 | 安全评审 | MEDIUM | `prefix!` 非空断言 | 改为 `const prefix = state.command.prefix; if (!prefix) return;` 防御性检查 + 类型收窄 |
| S3 | 安全评审 | LOW | execute 无 try-catch | 添加 try-catch 错误边界，静默处理异常 |
| S5 | 安全评审 | LOW | SVG `data-name` 信息泄露 | 移除 `data-name` 属性 |
| S6 | 安全评审 | INFO | aria-label/title 英文硬编码 | 改为中文 `'添加删除线 (Ctrl+Shift+X)'` |
| U2 | UI评审 | HIGH | 英文可访问性 | 同 S6 |
| U3 | UI评审 | MEDIUM | 快捷键表示法不一致 | 统一为 `Ctrl+Shift+X` 格式（首字母大写、无空格） |
| U4 | UI评审 | MEDIUM | SVG 缺 aria-hidden | 添加 `aria-hidden="true"`，移除 `role="img"` |
| P3-LOW-02 | 架构评审 | LOW | `state1` 命名不语义化 | 重命名为 `selectedState` |

**同步修复文件**: `src/commands/strikeThrough.tsx` + `esm/commands/strikeThrough.js` + `lib/commands/strikeThrough.js`
