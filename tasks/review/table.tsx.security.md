# 代码安全专家评审：table.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/table.tsx`
**评审角色**: 代码安全专家（输入验证 · 注入防护 · XSS · 信息泄露 · DoS · 边界安全 · 依赖安全）
**评审日期**: 2026-05-25
**代码行数**: 52 行（1 个导出 `ICommand` 对象：`table`）
**功能概述**: Markdown 编辑器"插入表格"命令实现，通过多行 `prefix` 模板插入标准 Markdown 表格，或在已选中模板时移除表格
**评审结论**: ✅ APPROVE — 8.0/10，无 HIGH 级安全漏洞，攻击面极小；存在 1 项 MEDIUM 级和 4 项 LOW 级安全改进建议

**问题统计**: HIGH × 0 / MEDIUM × 1 / LOW × 4 / INFO × 2

---

## 一、安全总览

### 1.1 攻击面分析

```
┌─────────────────────────────────────────────────────────────────────┐
│                     table.tsx 攻击面地图                             │
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
│  │  selectWord()      ← 选区扩展（纯函数）       │  单词级算法      │
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
| **XSS 防护** | 9.5 | 纯 textarea 操作，无 HTML 渲染；SVG 图标静态安全 |
| **注入防护** | 9.5 | 无 eval/innerHTML，文本包裹是纯字符串操作 |
| **输入验证** | 7.0 | prefix 非空断言跳过空值检查；选区范围未验证 |
| **DoS 防护** | 7.5 | 非空断言可能触发运行时异常导致编辑器无响应 |
| **信息泄露** | 10.0 | 无 console.log/网络请求/持久化，零信息泄露面 |
| **依赖安全** | 9.0 | 零外部运行时依赖，导入为库内部纯函数 |
| **边界安全** | 7.0 | 多行 prefix 与单词级选区算法语义错位；无显式边界检查 |

**综合评分**: **8.0 / 10** — ✅ APPROVE

---

## 二、源码安全逐行审计

### 2.1 导入与静态定义（L1-L19） — 安全 ✅

```tsx
import React from 'react';
import { ICommand, ExecuteState, TextAreaTextApi } from './';
import { selectWord, executeCommand } from '../utils/markdownUtils';
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 导入来源 | ✅ 安全 | 均为库内部模块，无外部网络依赖 |
| `prefix` 静态值 | ✅ 安全 | L8 为硬编码多行 Markdown 表格模板字符串，无动态拼接 |
| `suffix` 空字符串 | ✅ 安全 | L9 `suffix: ''`，无注入载体 |
| SVG 图标 | ✅ 安全 | L12-18 硬编码 Font Awesome 路径，`fill="currentColor"` 无动态属性 |
| `buttonProps` | ✅ 安全 | L10 静态 `aria-label` 和 `title`，无用户输入 |

**SVG 注入风险评估**:
- SVG 的 `d` 属性为静态字面量（L15），来源为 Font Awesome 6.4.2（注释标注 L16）
- 无 `<script>`、`onload`、`href="javascript:"` 等危险属性
- `fill="currentColor"` 引用 CSS 继承色值，非外部可控
- **结论**: 无 SVG 注入风险

### 2.2 execute 函数（L20-L51） — 存在改进项

#### 2.2.1 数据流安全分析

```
state.text (用户输入)
    │
    ├─► selectWord() ─► TextRange {start, end}
    │       │
    │       └─ 内部调用 getSurroundingWord(text, position)
    │           ├─ text 校验: if (!text) throw Error  ✅ 有基本校验
    │           └─ position 校验: 无                    ⚠️ 未验证范围
    │
    ├─► api.setSelectionRange(range) ─► TextState
    │       │
    │       └─ 直接操作 textarea.selectionStart/End   ✅ DOM API 安全
    │
    ├─► state1.selectedText.startsWith(prefix) ─► boolean
    │       │
    │       └─ 纯字符串比较                            ✅ 无副作用
    │
    └─► executeCommand({api, selectedText, selection, prefix, suffix})
            │
            ├─ Remove 分支: api.replaceSelection(slice) + setSelectionRange
            └─ Add 分支:    api.replaceSelection(wrap) + setSelectionRange
                              └─ 全部为 textarea 文本操作           ✅ 安全
```

#### 2.2.2 Toggle 移除分支安全分析（L28-39）

```tsx
// L28-31
if (
  state1.selectedText.length >= state.command.prefix!.length + state.command.suffix!.length &&
  state1.selectedText.startsWith(state.command.prefix!)
) {
  // Remove
  executeCommand({ api, selectedText: state1.selectedText, selection: state.selection, prefix: state.command.prefix!, suffix: state.command.suffix });
}
```

| 安全检查点 | 结果 | 说明 |
|------------|------|------|
| 长度校验 | ✅ | `length >= prefix.length + suffix.length` 防止空匹配 |
| 前缀匹配 | ✅ | `startsWith` 精确前缀匹配，非正则，无 ReDoS |
| 移除操作 | ✅ | `executeCommand` 通过 `slice` 移除前缀，纯字符串操作 |

**安全性评估**: 移除分支是安全的。虽然 `suffix` 为空字符串导致 `endsWith('')` 恒为 `true`，但 `executeCommand` 内部已有完整的长度和前缀双重校验（markdownUtils.ts L142-146），不会误删非表格内容。

#### 2.2.3 添加分支安全分析（L40-50）

```tsx
// L42-49
state1 = api.setSelectionRange({ start: state.selection.start, end: state.selection.start });
executeCommand({ api, selectedText: state1.selectedText, selection: state.selection, prefix: state.command.prefix!, suffix: state.command.suffix });
```

| 安全检查点 | 结果 | 说明 |
|------------|------|------|
| 选区折叠 | ✅ | 将选区折叠到起始位置，`selectedText` 为空字符串 |
| 模板插入 | ✅ | `prefix + '' + ''` = 纯静态表格模板，无用户内容混入 |
| 插入后选区 | ✅ | `setSelectionRange` 调整光标到模板内部，纯 DOM 操作 |

---

## 三、依赖安全审计

### 3.1 `selectWord()` — markdownUtils.ts

```typescript
// markdownUtils.ts L8-30
export function selectWord({ text, selection, prefix, suffix = prefix }): TextRange {
  let result = selection;
  if (text && text.length && selection.start === selection.end) {
    result = getSurroundingWord(text, selection.start);
  }
  // ...
}
```

| 检查项 | 结果 | 风险等级 | 说明 |
|--------|------|----------|------|
| `text` 空值保护 | ✅ 有 | — | `if (text && text.length)` 双重检查 |
| `selection` 范围验证 | ⚠️ 无 | LOW | `selection.start/end` 未验证是否在 `[0, text.length]` 内 |
| `position` 边界 | ⚠️ 无 | LOW | `getSurroundingWord` 的 `position` 参数无边界校验 |

**安全影响**: 越界 `position` 不会导致崩溃（for 循环条件自然收敛），但返回 `{start: 0, end: text.length}` 可能导致全选，影响用户体验但不构成安全威胁。

### 3.2 `executeCommand()` — markdownUtils.ts

```typescript
// markdownUtils.ts L129-153
export function executeCommand({ api, selectedText, selection, prefix, suffix = prefix }) {
  if (selectedText.length >= prefix.length + suffix.length &&
      selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
    api.replaceSelection(selectedText.slice(prefix.length, suffix.length ? -suffix.length : undefined));
    api.setSelectionRange({ start: selection.start - prefix.length, end: selection.end - prefix.length });
  } else {
    api.replaceSelection(`${prefix}${selectedText}${suffix}`);
    api.setSelectionRange({ start: selection.start + prefix.length, end: selection.end + prefix.length });
  }
}
```

| 检查项 | 结果 | 风险等级 | 说明 |
|--------|------|----------|------|
| 前后缀校验 | ✅ 完整 | — | 长度 + startsWith + endsWith 三重校验 |
| 切片操作 | ✅ 安全 | — | `slice` 参数为正整数，无负索引溢出风险 |
| suffix 为空 | ✅ 安全 | — | `suffix.length ? -suffix.length : undefined` 正确处理空字符串 |

### 3.3 `TextAreaTextApi` — index.ts

```typescript
// index.ts L129-156
class TextAreaTextApi {
  setSelectionRange(selection: TextRange): TextState {
    this.textArea.focus();
    this.textArea.selectionStart = selection.start;
    this.textArea.selectionEnd = selection.end;
    return getStateFromTextArea(this.textArea);
  }
}
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| DOM 操作安全性 | ✅ | 仅操作 textarea 的 selectionStart/End，无 innerHTML |
| focus() 调用 | ✅ | 标准 DOM API，不触发导航或弹窗 |
| 返回值 | ✅ | 从 textarea 读取状态，无副作用 |

---

## 四、安全问题详细清单

### 🔶 MEDIUM-1: 非空断言掩盖潜在的运行时 TypeError

**位置**: L25, L29, L37, L47（共 4 处 `state.command.prefix!`）
**CWE**: CWE-665 (Improper Initialization) / CWE-476 (NULL Pointer Dereference)
**风险**: 如果 `command.prefix` 为 `undefined`（例如被错误覆盖或序列化丢失），非空断言 `!` 跳过 TypeScript 编译检查，运行时在 `selectWord` 内部 `text.slice(result.start - prefix.length, ...)` 会得到 `NaN` 索引，导致 `slice` 返回空字符串。后续 `startsWith(undefined)` 抛出 `TypeError`。

**攻击场景**:
- 低概率，需攻击者能修改框架内部的 command 对象引用
- 若触发，仅导致当前编辑器命令失败，不影响其他组件
- 不构成可利用的安全漏洞，但影响可用性

**修复建议**:
```tsx
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const prefix = state.command.prefix ?? '';
  if (!prefix) return; // 防御性退出
  // ... 后续使用 prefix 变量代替 state.command.prefix!
}
```

**当前风险评估**: MEDIUM（理论风险）/ 实际影响 LOW（静态对象引用不会被外部修改）

---

### 🟢 LOW-1: selectWord 单词级算法与块级模板语义错位

**位置**: L21-26
**CWE**: CWE-20 (Improper Input Validation)
**风险**: `selectWord` 内部调用 `getSurroundingWord`，该函数以空格和换行符为单词分隔符。对于 table 的多行 prefix（含 `\n`），算法会在第一个换行处截断，导致返回的 `TextRange` 仅覆盖模板第一行，而非完整的多行表格模板。

**安全影响**: 此语义错位不构成安全威胁。影响范围为：
1. Toggle 移除检测失败 → 不会误删（安全的默认行为）
2. 添加分支（L42）绕过 `selectWord` → 不受此影响

**风险评级**: LOW（功能缺陷，非安全漏洞）

---

### 🟢 LOW-2: 选区范围未做显式边界校验

**位置**: L21-26（`state.selection` 传入 `selectWord`）
**CWE**: CWE-129 (Improper Validation of Array Index)
**风险**: `state.selection.start` 和 `state.selection.end` 未校验是否在 `[0, state.text.length]` 范围内。如果框架分发层传入异常选区值（如负数或超出文本长度），可能导致 `getSurroundingWord` 返回全选范围 `{start: 0, end: text.length}`。

**攻击场景**: 需要框架内部 Bug 或恶意 DOM 操作才能触发，攻击者无法直接控制选区值。

**修复建议**: 在 `execute` 入口添加边界检查：
```tsx
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const text = state.text;
  const sel = state.selection;
  if (sel.start < 0 || sel.end > text.length || sel.start > sel.end) return;
  // ...
}
```

---

### 🟢 LOW-3: 超长文本场景下无 DoS 防护

**位置**: L20-51（整个 `execute` 函数）
**CWE**: CWE-400 (Uncontrolled Resource Consumption)
**风险**: `state.text` 可能是极长的 textarea 内容（如 >10MB 文本）。`selectWord` → `getSurroundingWord` 的双向遍历最坏情况为 O(n)，对超长文本可能造成短暂的 UI 线程阻塞。

**攻击场景**: 用户在编辑器中粘贴超大文本后点击表格按钮。实际影响为短暂卡顿，无持久性损害。

**修复建议**: 添加文本长度阈值检查：
```tsx
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  if (state.text.length > 1_000_000) return; // 防止超长文本阻塞
  // ...
}
```

---

### 🟢 LOW-4: SVG 图标缺少无障碍标题元素

**位置**: L12-18
**WCAG**: 1.1.1 Non-text Content (Level A)
**风险**: SVG 有 `role="img"` 和父级 `aria-label`（通过 `buttonProps`），但 SVG 本身缺少 `<title>` 子元素。部分屏幕阅读器可能无法正确播报图标含义。

**修复建议**:
```tsx
icon: (
  <svg role="img" width="12" height="12" viewBox="0 0 512 512" aria-labelledby="table-icon-title">
    <title id="table-icon-title">Insert table</title>
    <path fill="currentColor" d="M64 256V160..." />
  </svg>
),
```

---

## 五、安全维度深度分析

### 5.1 XSS 防护 — 9.5/10 ✅

**攻击路径分析**:

| 潜在 XSS 载体 | 是否存在 | 说明 |
|---------------|----------|------|
| `dangerouslySetInnerHTML` | ❌ 不存在 | 全文未使用 |
| `innerHTML` 赋值 | ❌ 不存在 | 仅操作 textarea.value |
| SVG 动态属性 | ❌ 不存在 | SVG 为静态 JSX 字面量 |
| `href="javascript:"` | ❌ 不存在 | 无链接元素 |
| 事件处理器注入 | ❌ 不存在 | `buttonProps` 为静态对象 |
| URL 跳转 | ❌ 不存在 | 无 `window.location` 操作 |

**结论**: XSS 攻击面为零。所有文本操作均在 `<textarea>` 内完成，textarea 的 value 赋值不会执行 HTML。

### 5.2 注入防护 — 9.5/10 ✅

| 潜在注入类型 | 是否存在 | 说明 |
|-------------|----------|------|
| 代码注入 (`eval/Function`) | ❌ 不存在 | 无动态代码执行 |
| HTML 注入 | ❌ 不存在 | 仅文本操作 |
| 模板注入 | ❌ 不存在 | 无模板引擎使用 |
| 命令注入 | ❌ 不存在 | 无 Shell/API 调用 |
| ReDoS | ❌ 不存在 | 无正则表达式使用 |

**唯一扣分项**: 非空断言可能导致的运行时异常（详见 MEDIUM-1）。

### 5.3 输入验证 — 7.0/10 ⚠️

**已验证的输入**:
- ✅ `selectWord` 对 `text` 做空值检查（`if (text && text.length)`）
- ✅ `executeCommand` 对 `selectedText` 做长度 + 前后缀校验

**未验证的输入**:
- ⚠️ `state.selection.start/end` 范围校验
- ⚠️ `state.command.prefix/suffix` 空值校验（依赖 `!` 断言）
- ⚠️ `state.text` 长度阈值

### 5.4 信息泄露 — 10.0/10 ✅

| 泄露途径 | 是否存在 |
|---------|----------|
| `console.log` | ❌ |
| 网络请求 | ❌ |
| `localStorage/sessionStorage` | ❌ |
| `document.cookie` | ❌ |
| `postMessage` | ❌ |
| 错误堆栈暴露 | ❌（非空断言异常会被调用方捕获） |

### 5.5 供应链安全 — 9.0/10 ✅

**依赖关系**:
```
table.tsx
  ├── React           ← 核心框架依赖，安全
  ├── selectWord()    ← 库内部纯函数
  └── executeCommand() ← 库内部纯函数
```

- 零外部运行时依赖
- SVG 路径数据来源明确（Font Awesome 6.4.2，注释标注）
- 无动态 `import()` 或 `require()`

---

## 六、与同级命令的安全对比

| 命令 | prefix 长度 | suffix | 多行 | 安全评分 | 特殊风险 |
|------|------------|--------|------|---------|---------|
| `bold` | 2 (`**`) | `**` | ❌ | 8.5 | 低 |
| `italic` | 1 (`*`) | `*` | ❌ | 8.5 | 低 |
| `code` | 1 (`` ` ``) | `` ` `` | ❌ | 8.2 | 低 |
| `hr` | 多行 | — | ✅ | 8.0 | selectWord 语义错位 |
| **`table`** | **多行（99 字符）** | **空** | **✅** | **8.0** | **selectWord 语义错位 + suffix 为空** |
| `link` | 1 (`[`) | `](url)` | ❌ | 7.5 | URL 注入风险 |

**table.tsx 特有的安全关注点**:
1. **最长的 prefix**（99 字符，5 行）：增大了 `startsWith` 匹配失败的概率，使 toggle 移除分支在实际场景中几乎不可达（准死代码）
2. **空 suffix**：`executeCommand` 的 `endsWith('')` 恒为 `true`，导致 suffix 检查形同虚设，但 `startsWith` 校验仍然有效

---

## 七、修复优先级与建议

| 优先级 | 问题编号 | 修复工作量 | 建议措施 |
|--------|---------|-----------|---------|
| P2 | MEDIUM-1 | 低 | 将 `state.command.prefix!` 替换为带空值守卫的局部变量 |
| P3 | LOW-2 | 低 | 在 `execute` 入口添加选区边界校验 |
| P3 | LOW-3 | 低 | 添加文本长度阈值检查 |
| P4 | LOW-1 | 中 | 考虑为块级命令使用独立的 `selectBlock` 函数替代 `selectWord` |
| P4 | LOW-4 | 低 | 为 SVG 添加 `<title>` 子元素 |

---

## 八、评审结论

### 8.1 最终评分: 8.0 / 10 — ✅ APPROVE

**评分理由**:

`table.tsx` 的安全基本面优秀：纯文本操作、零 HTML 渲染、零外部网络调用、零动态代码执行。XSS 和注入攻击面为零，信息泄露面为零。所有文本操作均在 `<textarea>` DOM 元素内完成，天然隔离了 HTML 执行上下文。

主要扣分项来自防御性编程不足：
1. 4 处非空断言 `!` 跳过了对可选属性的空值守卫（MEDIUM-1）
2. 选区范围和文本长度缺乏显式校验（LOW-2、LOW-3）
3. 块级模板与单词级选区算法的语义错位（LOW-1）

**无 HIGH 级安全漏洞。所有识别的问题均为防御性编程改进建议，不构成可利用的安全攻击路径。**

### 8.2 第三方库使用建议

此文件属于 `@uiw/react-md-editor@4.1.0` 第三方依赖，不建议直接修改源码。建议：
1. 在应用层通过自定义命令覆盖默认 table 命令（`commands` prop）
2. 关注库版本更新，跟踪已知安全问题
3. 定期执行 `npm audit` 检查依赖安全性

---

*评审完成时间: 2026-05-25*
*评审工具: 人工代码审计（静态分析）*
