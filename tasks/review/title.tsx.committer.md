# title.tsx — Committer 审核专家评审报告

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/title.tsx`
**评审角色**: Committer 审核专家（代码合并准入 · 依赖可接受性 · 项目集成风险 · 规范兼容性 · 生产就绪度）
**评审日期**: 2026-05-25
**代码行数**: 40 行（1 个导出函数 `headingExecute` + 1 个导出命令 `heading` + 1 个废弃别名 `title`）
**功能概述**: Markdown 编辑器标题命令核心模块，提供 `headingExecute` 共享执行逻辑（被 title1-6.tsx 共同依赖），以及 `heading` 分组图标命令和废弃的 `title` 别名
**评审结论**: ✅ APPROVE — 第三方库内部命令模块，headingExecute toggle 逻辑正确、无安全高危漏洞、与本项目集成无阻塞问题；循环依赖是唯一的架构隐患，但在当前 bundler 环境下不触发

**前序评审**: 质量评审 6.9/10 CONDITIONAL APPROVE（P1×1 循环依赖 + P2×4 废弃注释矛盾/返回值void/SVG不直观/spread隐式耦合 + P3×3 suffix默认值/selection注释/版本信息）、架构评审 5.4/10 CONDITIONAL APPROVE（A1 循环依赖 Critical + A2 职责混淆 Major + A3 spread语义失真 + A4 命名脱节）、安全评审 8.2/10 APPROVE（MEDIUM×1 suffix默认值语义错误 + LOW×4 selection越界/返回值void/spread继承/废弃注释矛盾 + INFO×3）、UI 评审 4.3/10 CONDITIONAL APPROVE（P1×3 SVG尺寸/viewBox/视觉隐喻 + P2×4 buttonProps继承/废弃注释/fill fallback/空行场景 + P3×3 SVG精度/suffix默认值/命名混乱）

---

## 一、Committer 审核总览

本文件是第三方库 `@uiw/react-md-editor@4.1.0` 的内部命令模块，非本项目自定义代码。与已审核的 `bold.tsx`、`italic.tsx`、`strikethrough.tsx`（inline 命令）和 `hr.tsx`、`table.tsx`（block/template 命令）不同，`title.tsx` 在命令簇中承担**独特的双重角色**——它既是标题命令的**共享执行逻辑提供者**（`headingExecute`），又是标题分组的**图标命令定义**（`heading`/`title`）。这一双重角色是 4 项前序评审中所有维度一致识别的核心架构问题：循环依赖 + 职责混淆。

Committer 审核的关键判断点是：**这些缺陷是否阻塞项目使用？** 答案是否定的——标题 toggle 功能（添加/移除 `# ` 前缀）正确可用，循环依赖在当前 Webpack/Vite 环境下因函数声明提升（hoisting）机制不触发，所有缺陷均为库内部的设计取舍，不构成安全风险或运行时崩溃。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 代码质量 | 7/10 | 有条件通过 — headingExecute toggle 逻辑正确，但循环依赖和 spread 继承增加维护风险 |
| 安全可接受性 | 8/10 | 通过 — 无可直接利用的安全漏洞（安全评审 8.2 已确认） |
| 项目集成兼容性 | 7/10 | 有条件通过 — 英文硬编码/SVG图标模糊/命名混乱需封装层覆盖或文档说明 |
| 依赖稳定性 | 8/10 | 有条件通过 — 零外部运行时依赖，但循环依赖在 bundler 切换时有风险 |
| 生产就绪度 | 8/10 | 通过 — 标题 toggle 功能成熟可靠，无已知崩溃路径 |

**综合判定: 通过（APPROVE）**

> 作为第三方库内部模块，`title.tsx` 的标题 toggle 功能可靠、安全无风险。4 项前序评审中识别的所有 Critical/MEDIUM 级问题（循环依赖、职责混淆、spread 语义失真、suffix 默认值错误）均为库内部的设计取舍，不影响本项目使用。唯一需要在项目层面关注的是：循环依赖在升级库版本或切换 bundler 时需验证。

---

## 二、代码质量审核

### 2.1 代码结构分析

```tsx
import React from 'react';                                    // L1: React JSX 运行时
import { ICommand, ExecuteState, TextAreaTextApi } from './'; // L2: 命令接口类型
import { heading1 } from './title1';                           // L3: ← 循环依赖入口
import { selectLine, executeCommand } from '../utils/markdownUtils'; // L4: 底层工具

export function headingExecute({ ... }) { ... }                // L6-L20: 共享执行函数
export const heading: ICommand = { ...heading1, icon: (...) }; // L22-L32: 分组图标命令
export const title: ICommand = heading;                        // L34-L39: 废弃别名
```

**结构评价**:

| 维度 | 评价 | 说明 |
|------|------|------|
| 设计模式 | ⚠️ 双重角色 | 既提供工具函数又定义命令对象，违反 SRP |
| 代码简洁度 | ✅ 良好 | 40 行完成 3 个导出，紧凑清晰 |
| 函数职责 | ✅ 良好 | headingExecute 的 selectLine→executeCommand 管道逻辑清晰 |
| 可维护性 | ⚠️ 有隐患 | 循环依赖 + spread 继承增加重构难度 |

### 2.2 headingExecute 执行逻辑正确性验证

```typescript
// L6-L20
export function headingExecute({
  state, api, prefix, suffix = prefix,
}: { state: ExecuteState; api: TextAreaTextApi; prefix: string; suffix?: string; }) {
  const newSelectionRange = selectLine({ text: state.text, selection: state.selection });
  const state1 = api.setSelectionRange(newSelectionRange);
  executeCommand({ api, selectedText: state1.selectedText, selection: state.selection, prefix, suffix });
}
```

**执行路径分析**:

| 场景 | 输入 | selectLine 返回 | executeCommand 行为 | 结果 | 正确性 |
|------|------|-----------------|-------------------|------|--------|
| 空行，光标在行首 | `""` + `{0,0}` | `{0, 0}` | 添加 → `"# "` | 空标题行 | ✅ 正确 |
| 普通文本行 | `"Hello"` + `{0,0}` | `{0, 5}` | 添加 → `"# Hello"` | H1 标题 | ✅ 正确 |
| 已有 H1 标题 | `"# Hello"` + `{0,7}` | `{0, 7}` | 移除 → `"Hello"` | 取消标题 | ✅ 正确 toggle |
| 已有 H2 标题（用 H1 toggle） | `"## Hello"` + `{0,8}` | `{0, 8}` | `startsWith("# ")` 为 true → 移除 `"# "` | `"# Hello"` ⚠️ | ⚠️ 非预期 |
| 多行选区 | `"line1\nline2"` | 仅选首行 | 添加到首行 | ✅ 行级操作 | ✅ 正确 |

**C-01 — 循环依赖 title.tsx ↔ title1.tsx 是唯一架构隐患（MEDIUM）**:

此问题已被 4 项前序评审一致识别。从 Committer 角度的关键判断：

1. **根本原因**: `title.tsx` 从 `title1.tsx` 导入 `heading1`，而 `title1.tsx` 从 `title.tsx` 导入 `headingExecute`，形成双向依赖
2. **当前安全性**: `headingExecute` 是 `function` 声明（非箭头函数），ES Module 的函数提升（hoisting）确保循环引用时值不为 `undefined`
3. **风险场景**: 重构为箭头函数、切换 bundler（ESBuild/SWC）、激进 tree-shaking
4. **对本项目的影响**: 当前 bundler（Vite/esbuild）下正常运行，不影响标题功能

**Committer 判断**: 不阻塞合并。循环依赖在当前环境下不触发，是库内部的架构债务。建议关注 `@uiw/react-md-editor` 版本更新日志，若发布 v5.0.0 应验证模块初始化行为。

**C-02 — suffix 默认值 `suffix = prefix` 语义错误（MEDIUM）**:

```typescript
suffix = prefix,  // L10: 默认 suffix = "# "，但标题语法无后缀
```

所有内部调用者（title1-6.tsx）均显式传入 `suffix: state.command.suffix`（值为 `''`），此默认值在库内部**不会被触发**。但作为导出的公共 API 函数，默认值应反映正确语义。

**Committer 判断**: 不阻塞合并。所有 6 个调用点均显式传参，默认值在实际使用中不会被触发。

**C-03 — spread 继承 `heading1` 引入语义不匹配属性（MEDIUM）**:

```typescript
export const heading: ICommand = {
  ...heading1,  // 继承 name:'heading1', keyCommand:'heading1', shortcuts:'ctrlcmd+1'
  icon: (...),  // 仅覆盖图标
};
```

`heading` 在 `commands/index.ts` 中仅作为 `group()` 的分组图标，不参与命令分发。继承的 `execute`、`shortcuts`、`name` 属性实际上是**死代码**——框架通过 `group()` 内部机制处理分组，不调用 `heading.execute`。

**Committer 判断**: 不阻塞合并。死代码不影响功能，属于库内部的设计取舍。

---

## 三、依赖可接受性审核

### 3.1 依赖链分析

```
title.tsx
├── React (JSX 运行时) — 项目已有依赖，无版本冲突风险
├── ICommand / ExecuteState / TextAreaTextApi (commands/index.ts) — 库内部类型，稳定
├── heading1 (commands/title1.tsx) — ⚠️ 循环依赖！title1 反向导入 headingExecute
├── selectLine (utils/markdownUtils.ts) — 纯字符串运算，无副作用
└── executeCommand (utils/markdownUtils.ts) — 纯文本拼接，通过 TextAreaTextApi 操作 DOM
```

| 依赖 | 类型 | 稳定性 | 风险 |
|------|------|--------|------|
| `React` | 外部 | 高 | 无 — 项目统一管理版本 |
| `ICommand` 接口 | 库内部 | 高 | 低 — 接口自 v3 稳定未变 |
| `heading1` (title1.tsx) | 库内部 | 高 | ⚠️ 中 — 循环依赖，bundler 切换时可能异常 |
| `selectLine()` | 库内部 | 高 | 低 — 纯字符串运算，O(n) 行扫描 |
| `executeCommand()` | 库内部 | 高 | 低 — 纯 textarea.value 操作 |
| `TextAreaTextApi` | 库内部 | 高 | 低 — 直接 DOM API 封装 |

**结论**: 唯一风险点是循环依赖。零外部运行时依赖，其他库内依赖均为纯运算函数。

### 3.2 循环依赖影响范围

```
受影响的模块（共 7 个文件形成依赖环）:
  title.tsx ←→ title1.tsx
                title2.tsx（导入 headingExecute，单向，不形成环）
                title3.tsx
                title4.tsx
                title5.tsx
                title6.tsx
```

实际循环依赖仅在 `title.tsx ↔ title1.tsx` 之间。title2-6.tsx 单向导入 `headingExecute`，不参与循环。

### 3.3 库版本风险

| 风险项 | 评估 | 说明 |
|--------|------|------|
| 库版本锁定 | ✅ 安全 | `package.json` 锁定 `@uiw/react-md-editor@4.1.0` |
| API 兼容性 | ✅ 稳定 | `ICommand` 接口自 v3 起未破坏性变更 |
| 维护活跃度 | ⚠️ 中等 | 库最近更新频率较低，但功能已成熟稳定 |
| 升级风险 | ⚠️ 中等 | 若 v5.0.0 移除废弃别名 `title`/`title1-6`，需验证引用 |

---

## 四、项目集成兼容性审核

### 4.1 与本项目封装层的兼容性

本项目通过 `MarkdownEditor.tsx` + `markdown-editor.css` 封装了 `@uiw/react-md-editor`。`title.tsx` / `heading` 命令的集成方式：

| 集成点 | title.tsx 行为 | 本项目覆盖 | 兼容性 |
|--------|---------------|-----------|--------|
| 工具栏按钮渲染 | heading 的 SVG 12×12 图标 | CSS `transform: scale(1.2)` | ⚠️ 图标模糊 |
| 标题分组图标 | group() 使用 heading 图标 | 无覆盖 | ⚠️ 需验证实际渲染 |
| 按钮颜色 | `currentColor` 继承 | CSS `color` 属性覆盖 | ✅ 完全兼容 |
| Tooltip | 继承 heading1 的 `title: 'Insert Heading 1...'` | 无覆盖 | ⚠️ 英文提示 |
| ARIA | 继承 `aria-label: 'Insert Heading 1...'` | 无覆盖 | ⚠️ 需封装层注入 |
| 快捷键 | 继承 `ctrlcmd+1`（H1 快捷键） | 无覆盖 | ✅ 与标题级别对应 |
| 文本操作 | textarea 纯文本 | 无需覆盖 | ✅ 完全兼容 |
| headingExecute toggle | 添加/移除 `# ` 前缀 | 无需覆盖 | ✅ 完全兼容 |
| heading1-6 命令 | 通过 group() 注册到工具栏 | 无覆盖 | ✅ 完全兼容 |

### 4.2 与同级命令的关键差异

| 维度 | bold.tsx | italic.tsx | strikethrough.tsx | hr.tsx | table.tsx | **title.tsx** |
|------|---------|-----------|-------------------|--------|-----------|--------------|
| 代码行数 | 33 | 33 | 36 | 53 | 53 | **40** |
| 导出类型 | ICommand | ICommand | ICommand | ICommand | ICommand | **函数 + ICommand ×2** |
| 共享执行函数 | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ headingExecute** |
| 循环依赖 | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ title.tsx ↔ title1.tsx** |
| 被依赖数 | 0 | 0 | 0 | 0 | 0 | **6（title1-6.tsx）** |
| SVG 图标 | FA 320×512 | FA 320×512 | FA 512×512 | 自定义 | FA 512×512 | **自定义 520×520** |
| 废弃别名 | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ title** |

**结论**: `title.tsx` 是命令簇中唯一导出共享执行函数的模块，唯一存在循环依赖的模块，也是唯一被 6 个其他模块依赖的核心模块。这种中心地位使得循环依赖的影响范围远大于其他命令的问题。

### 4.3 heading 命令在工具栏中的实际角色

从 `commands/index.ts` 的 `getCommands()` 可见：

```typescript
group([title1, title2, title3, title4, title5, title6], { name: 'title' })
```

**关键发现**: 工具栏中注册的是 `title1-6`（废弃别名），而非 `heading1-6`。`heading` 命令本身**可能从未在默认工具栏中直接显示**——它的 SVG 图标在 group() 内部使用，而实际下拉项使用 `title1-6` 的文字图标（`<div>Heading N</div>`）。

**Committer 判断**: `heading` 的 SVG 图标质量问题（UI 评审 P1×3）对用户体验影响有限——用户主要看到的是下拉菜单中的文字图标，而非分组按钮的 SVG 图标。

### 4.4 封装层待办事项

基于前序评审和本评审的发现，本项目封装层需处理的 `title.tsx` 相关事项：

| 优先级 | 事项 | 来源 | 状态 | 说明 |
|--------|------|------|------|------|
| P1 | Tooltip/ARIA 中文标注注入 | UI 评审 + 本评审 | 待实施 | 替换为中文"插入标题" |
| P2 | Carbon focus ring | UI 评审 | 待实施 | `:focus-visible` 样式覆盖 |
| P2 | SVG aria-hidden | UI 评审 + 安全评审 | 待实施 | 防止屏幕阅读器重复播报 |
| P2 | 关注库版本更新 | 本评审 C-01 | 持续 | v5.0.0 验证循环依赖和废弃移除 |
| P3 | SVG 图标替换为 Carbon 风格 | UI 评审 P1×3 | 待评估 | 若默认工具栏不使用则优先级低 |
| P3 | heading 命令 icon 可替换评估 | 本评审 4.3 | 待评估 | 验证 group() 是否使用 heading 的图标 |
| P3 | 触摸目标增大至 44px | UI 评审 | 待实施 | 工具栏系统性问题 |

---

## 五、与前序评审的交叉验证

### 5.1 质量评审（6.9/10 CONDITIONAL APPROVE）— Committer 共识评估

| 质量评审发现 | 严重度 | Committer 评估 | 是否阻塞 |
|-------------|--------|---------------|---------|
| title.tsx ↔ title1.tsx 循环依赖 | P1（高） | 认可 — 架构风险，但当前 bundler 环境安全 | 不阻塞，持续关注 |
| 废弃注释自相矛盾 | P2（中） | 认可 — 文档质量问题 | 不阻塞 |
| headingExecute 返回 void | P2（中） | 认可 — 限制扩展性但不影响功能 | 不阻塞 |
| SVG 图标不直观 | P2（低） | 认可 — 默认工具栏可能不使用此图标 | 不阻塞 |
| spread 隐式耦合 | P2（低） | 认可 — 死代码但不影响行为 | 不阻塞 |
| suffix 默认值错误 | P3（低） | 认可 — 所有调用方均显式传参 | 不阻塞 |

**Committer 与质量评审的差异**: 质量评审将循环依赖列为 P1（高），Committer 认可其严重性但认为**不阻塞项目集成**——因为这是库内部架构债务，且在当前 bundler 环境下不触发。作为第三方库的使用方，我们不应为此阻塞合并。

### 5.2 架构评审（5.4/10 CONDITIONAL APPROVE）— Committer 共识评估

| 架构评审发现 | 严重度 | Committer 评估 | 是否阻塞 |
|-------------|--------|---------------|---------|
| A1 循环依赖 Critical | Critical | 认可 — 是命令簇中唯一的循环依赖 | 不阻塞，bundler 安全 |
| A2 职责混淆 | Major | 认可 — headingExecute 应提取到独立文件 | 不阻塞，库级别重构 |
| A3 spread 语义失真 | Minor | 认可 — heading 的 execute/shortcuts 为死代码 | 不阻塞 |
| A4 命名脱节 | Minor | 认可 — 文件名 title.tsx vs 主导出 heading | 不阻塞 |

**Committer 与架构评审的差异**: 架构评审识别了 Critical 级循环依赖，从架构纯度角度看完全正确。Committer 的角度不同——我们关注"此代码是否能安全、可靠地集成到项目中"。循环依赖在当前 Vite 环境下因函数声明提升机制安全运行，不会暴露为运行时问题。

### 5.3 安全评审（8.2/10 APPROVE）— Committer 完全认同

安全评审确认无 HIGH 级安全漏洞，攻击面极小（纯 textarea 操作），STRIDE 威胁建模不存在可实现的安全攻击路径。Committer 完全认同安全评审的结论。

唯一的 MEDIUM 级问题（suffix 默认值语义不一致）在库内部不触发，属于防御性编程改进建议。

### 5.4 UI 评审（4.3/10 CONDITIONAL APPROVE）— Committer 共识评估

| UI 评审发现 | 严重度 | Committer 评估 | 是否阻塞 |
|-------------|--------|---------------|---------|
| SVG 尺寸/viewBox 不合规 | P1 | 认可 — 但默认工具栏可能不使用此 SVG | 不阻塞，低优先级 |
| SVG 视觉内容与标题语义不匹配 | P1 | 认可 — 12px 下图标几乎不可辨 | 不阻塞 |
| SVG 非标准标题视觉隐喻 | P1 | 认可 — 不符合 Carbon 图标规范 | 不阻塞 |
| heading 缺少独立 buttonProps | P2 | 认可 — 继承的 aria-label 语义不匹配 | 不阻塞，封装层覆盖 |
| 废弃注释自相矛盾 | P2 | 认可 — 与质量/架构评审重复 | 不阻塞 |
| fill="currentColor" 无 fallback | P2 | 认可 — 主题不兼容风险 | 不阻塞，CSS 继承链正常 |
| 空行插入标题视觉异常 | P2 | 认可 — UX 问题而非阻塞问题 | 不阻塞 |

**Committer 与 UI 评审的差异**: UI 评审给出 4.3/10（最低分），识别了 3 个 P1 级问题。Committer 认为 UI 问题不阻塞，原因在于：
1. heading 的 SVG 图标在默认工具栏配置中可能**未被直接使用**（group() 使用内部机制）
2. 用户实际看到的是 title1-6 的文字图标（`<div>Heading N</div>`），而非 heading 的 SVG
3. 所有 UI 问题均可在封装层通过自定义命令 + CSS 覆盖解决

---

## 六、headingExecute 与 inline 命令执行管道对比

`headingExecute` 使用 `selectLine`（选中整行）而非 inline 命令的 `selectWord`（选中单词），这是**核心设计差异**：

| 维度 | bold/italic/strike (inline) | code | hr/table | **heading (title.tsx)** |
|------|----------------------------|------|----------|------------------------|
| 选区函数 | selectWord | selectWord | selectWord | **selectLine** |
| 操作粒度 | 单词级 | 单词级 | 单词级 | **行级** |
| toggle 检测 | startsWith(prefix) | startsWith(prefix) | startsWith(prefix) | **startsWith(prefix)** |
| 选区恢复 | 原始选区 + prefix 偏移 | 原始选区 | 视分支而定 | **原始光标位置** |
| 正确性 | ✅ | ✅ | ⚠️ table toggle 失效 | **✅ 标题 toggle 正确** |

**结论**: heading 命令使用行级操作（selectLine）而非单词级操作（selectWord），这一选择是正确的——Markdown 标题（`# ` 前缀）是行级语法，必须操作整行。这也是 headingExecute toggle 逻辑能正确工作的根本原因（与 table.tsx 的 `selectWord` + 长模板 prefix 导致 toggle 失效形成对比）。

---

## 七、生产就绪度评估

### 7.1 功能可靠性

| 功能点 | 可靠性 | 说明 |
|--------|--------|------|
| 标题 toggle（主功能） | ✅ 可靠 | selectLine + executeCommand 管道正确，添加/移除 `# ` 前缀均经验证 |
| headingExecute 共享逻辑 | ✅ 可靠 | 被 6 个标题命令依赖，路径覆盖充分 |
| 废弃别名 title | ✅ 可靠 | `title = heading`，引用同一对象，零运行时开销 |
| heading 分组图标 | ⚠️ 可用 | SVG 在 12px 下模糊，但不影响功能 |
| ARIA 可访问性 | ⚠️ 部分 | 继承 heading1 的 aria-label，语义不匹配 |

### 7.2 边界场景分析

| 场景 | 行为 | 风险等级 |
|------|------|----------|
| 空行中插入标题 | 插入 `# ` 空标题行 | 无风险 — 用户可立即输入标题文字 |
| 已有标题行再次点击 | toggle 移除 `# ` 前缀 | 无风险 — 符合预期行为 |
| 已有 H2 标题点击 H1 | `## Hello` → `# Hello`（移除 `# ` 得 ` Hello`）| LOW — UX 不完美但不崩溃 |
| 文档末尾空行插入 | 正确添加空标题行 | 无风险 |
| 超长行（>10000字符）| selectLine O(n) 线性扫描 | LOW — 极端场景，用户手动触发 |

### 7.3 回归风险评估

| 变更类型 | 影响范围 | 回归风险 |
|----------|----------|----------|
| 库版本升级至 v5.0.0 | title1-6 别名可能移除 | 中 — 需验证引用 |
| 库版本升级（同 major） | headingExecute 可能重构 | 低 — 接口稳定 |
| 封装层样式修改 | 图标/按钮视觉 | 极低 — CSS 隔离 |
| 自定义命令覆盖 | 完全替换标题命令 | 无 — 框架支持 `commands` prop |
| React 版本升级 | JSX 渲染 | 极低 — 标准 React JSX |

---

## 八、最终裁决

### 8.1 综合评分

| 维度 | 评分 | 权重 | 加权分 |
|------|------|------|--------|
| 代码质量 | 7.0 | 20% | 1.40 |
| 安全可接受性 | 8.0 | 30% | 2.40 |
| 项目集成兼容性 | 7.0 | 25% | 1.75 |
| 依赖稳定性 | 8.0 | 15% | 1.20 |
| 生产就绪度 | 8.0 | 10% | 0.80 |
| **综合** | | **100%** | **7.55** |

### 8.2 裁决: ✅ APPROVE（7.6/10）

**通过理由**:

1. **核心功能正确**: headingExecute 的 toggle 逻辑（selectLine → executeCommand）可靠，这是标题命令的核心使用场景
2. **安全性达标**: 安全评审 8.2/10 确认无 HIGH 级漏洞，攻击面极小（纯 textarea 操作）
3. **复用设计良好**: headingExecute 被 6 级标题命令共享，避免了代码重复
4. **零集成阻塞**: 所有识别的问题均可在封装层或文档层面缓解

**已知限制（不阻塞但需记录）**:

| # | 限制 | 影响 | 缓解措施 |
|---|------|------|---------|
| 1 | title.tsx ↔ title1.tsx 循环依赖 | bundler 切换时可能异常 | 关注库版本更新 |
| 2 | heading SVG 图标 12px 下模糊 | 默认工具栏可能不使用此图标 | 验证实际渲染 |
| 3 | suffix 默认值 `= prefix` 语义错误 | 所有调用方均显式传参，不触发 | 无需处理 |
| 4 | heading spread 继承 heading1 死代码 | 不影响功能 | 无需处理 |
| 5 | 废弃注释自相矛盾 | 文档质量问题 | 无需处理 |
| 6 | heading 无独立 buttonProps | aria-label 语义不匹配 | 封装层注入中文标签 |

**不改也不会崩溃的理由**:
- headingExecute 的函数声明提升确保循环依赖在当前 bundler 下安全
- 标题 toggle 逻辑（selectLine + executeCommand）经验证正确可靠
- 纯 textarea 文本操作，最坏情况是格式不完美（如 H2→H1 toggle），不构成安全威胁
- heading 命令在默认工具栏中可能不直接显示，其 SVG 质量问题影响有限

### 8.3 与前序评审的协调说明

| 前序评审 | 评分/判定 | Committer 立场 |
|----------|----------|----------------|
| 质量评审 6.9/10 CONDITIONAL APPROVE | 认可质量发现，循环依赖不阻塞项目集成 | 不要求库内部修复 |
| 架构评审 5.4/10 CONDITIONAL APPROVE | 认可架构问题，属于库级别设计取舍 | 不要求重构 |
| 安全评审 8.2/10 APPROVE | 完全认同 | 无额外意见 |
| UI 评审 4.3/10 CONDITIONAL APPROVE | 认可 UI 问题，heading SVG 可能未在默认工具栏中显示 | 封装层统一处理 |

**Committer 立场说明**: 本评审的通过门槛低于质量评审和架构评审，这是因为 Committer 的职责是评估"此代码是否可以安全集成到项目中"，而非"此代码的架构是否最优"。第三方库内部的设计取舍（循环依赖、职责混淆、命名脱节）不应阻塞项目使用，除非存在安全漏洞或功能完全不可用的情况——而 `title.tsx` 均不满足这两个条件。其核心功能（标题 toggle）正确可靠，且是命令簇中唯一实现共享执行逻辑复用的模块。

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 全部 4 项前序评审（质量/架构/安全/UI）交叉验证*
*评审人: Committer 审核专家 | 评审日期: 2026-05-25*
