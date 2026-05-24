# 软件 UI 专家评审：list.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/list.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · Antd 规范 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-25
**代码行数**: 107 行（1 个共享函数 `makeList` + 3 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器列表工具栏命令（无序列表、有序列表、任务列表），定义图标、快捷键、ARIA 属性及列表文本插入/移除逻辑
**评审结论**: ⚠️ CONDITIONAL APPROVE 5.0 — 功能完整度优于同级命令（含 toggle 行为），但存在 8 项 UI/UX 问题（2 项 P1 + 3 项 P2 + 3 项 P3），checkedList 回调忽略参数导致任务列表无法正确切换状态是最严重问题

**问题统计**: P1 × 2 / P2 × 3 / P3 × 3

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器的三种列表命令（无序/有序/任务），供工具栏按钮和快捷键调用 |
| 代码行数 | 107 行 |
| 设计模式 | 命令模式（`ICommand` 接口实现）+ 共享逻辑函数 `makeList` |
| UI 相关输出 | 3 个 SVG 图标 + 3 组按钮属性（aria-label / title） |
| 用户交互路径 | 工具栏按钮点击 → `execute()` / 快捷键 → `execute()` → `makeList()` |
| 依赖 | `selectWord`、`getBreaksNeededForEmptyLineBefore/After`、`insertBeforeEachLine`、`TextAreaTextApi` |

### 源码结构

```tsx
// 第 11-46 行：共享列表逻辑
export const makeList = (state, api, insertBefore) => {
  selectWord → getBreaks → insertBeforeEachLine → toggle add/remove
};

// 第 48-68 行：无序列表命令
export const unorderedListCommand: ICommand = {
  name: 'unordered-list', prefix: '- ', shortcuts: 'ctrl+shift+u',
  icon: <svg width="12" height="12" ...>,  // 无 role="img"
  execute: (state, api) => makeList(state, api, '- ')
};

// 第 70-87 行：有序列表命令
export const orderedListCommand: ICommand = {
  name: 'ordered-list', prefix: '1. ', shortcuts: 'ctrl+shift+o',
  icon: <svg data-name="ordered-list" width="12" height="12" role="img" ...>,
  execute: (state, api) => makeList(state, api, (item, index) => `${index + 1}. `)
};

// 第 89-106 行：任务列表命令
export const checkedListCommand: ICommand = {
  name: 'checked-list', prefix: '- [ ] ', shortcuts: 'ctrl+shift+c',
  icon: <svg data-name="checked-list" width="12" height="12" role="img" ...>,
  execute: (state, api) => makeList(state, api, (item, index) => `- [ ] `)  // ⚠️ 忽略参数
};
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 3 | SVG 图标硬编码尺寸（12×12）偏小，无颜色/圆角/间距 Carbon 适配 |
| 交互体验（UX） | 6 | 三种列表覆盖主要用例，toggle 行为完整，但 checkedList 回调参数忽略导致多行场景行为不一致 |
| 无障碍（a11y） | 5 | 有 aria-label/title，但 unorderedList SVG 缺少 role="img"，checkedList 无 aria-hidden |
| Antd 规范合规 | 2 | 使用原生 SVG + `<button>`，未使用 antd `<Button>` 或 `<Tooltip>` |
| 响应式行为 | 3 | 图标 12×12 在移动端触摸目标不足，无响应式适配 |
| 国际化（i18n） | 2 | 硬编码英文文本（aria-label / title），无 i18n 支持 |
| 图标设计 | 6 | 三个列表图标语义清晰可识别，但风格与 Carbon/Antd 不一致 |
| **综合评分** | **3.9 / 10** | |

---

## 三、DESIGN.md 合规性详细分析

### 3.1 图标尺寸与 Carbon 规范

**DESIGN.md 要求**：
- 工具栏按钮高度 48px（触摸目标）
- 图标在按钮内居中，按钮 padding 12px 16px
- 最小交互区域 32px（桌面）/ 48px（触摸）

**实际行为**：

| 属性 | DESIGN.md 规范 | list.tsx 实际值 | 差距 | 本项目覆盖 |
|---|---|---|---|---|
| SVG 尺寸 | ≥16px（Carbon 最小图标） | 12×12（三个图标统一） | -4px | ✅ CSS 缩放覆盖 |
| 图标颜色 | `currentColor`（可继承） | `currentColor`（三个统一） | ✅ 一致 | — |
| 按钮尺寸 | 32px（桌面）/ 48px（触摸） | ~20px（工具栏默认） | -12px | ✅ CSS 覆盖至 36px |
| 按钮圆角 | `rounded.none` 0px | 2px（默认） | +2px | ✅ CSS 覆盖为 0 |
| 按钮内边距 | 12px 16px | ~4px | 严重不足 | ✅ CSS 覆盖 |

**问题 V-01 — 图标尺寸偏小**（P3）：

12×12 的图标在 32px 按钮中仅占 37.5% 面积，视觉比重不足。Carbon 图标规范建议 16×16 或 20×20。本项目 CSS 通过 `transform: scale(1.2)` 放大了图标，但更好的做法是在 SVG 上设置 `width="16" height="16"`。

### 3.2 颜色体系

**DESIGN.md 要求**：IBM Blue (#0f62fe) 为唯一品牌色，Charcoal (#161616) 文字，无阴影。

**实际行为**：

| 元素 | DESIGN.md 规范 | list.tsx / 工具栏默认值 | 合规 |
|---|---|---|---|
| 图标填充色 | `currentColor` → Ink (#161616) | `currentColor` → 系统默认 | ⚠️ 需父级 CSS 设置 `color` |
| 按钮 hover 背景 | Surface-1 (#f4f4f4) | GitHub 灰 (#f3f4f6) | ⚠️ 近似但非 Carbon |
| 按钮 active 背景 | Blue-80 (#002d9c) | GitHub 蓝 (#0969da) | ❌ 非 IBM Blue |
| 按钮 focus | 2px IBM Blue outline | 浏览器默认 | ❌ 无 Carbon focus ring |

三个图标的 `fill="currentColor"` 是正确的主题化做法——本项目可通过 CSS 完全控制图标颜色。

### 3.3 圆角体系

与 `bold.tsx` 相同——工具栏按钮默认 `border-radius: 2px`，本项目已覆盖为 0px。SVG 图标为矢量路径，不涉及圆角。

### 3.4 排版体系

`list.tsx` 不涉及文字渲染（纯图标按钮），但 `title` 和 `aria-label` 的文本由浏览器渲染为 tooltip，使用系统字体。在 Carbon 规范下不可控且不构成违规。

---

## 四、交互体验（UX）评审

### 4.1 命令执行流程

```
用户操作路径：
┌──────────────────────────────────────────────────────┐
│  路径 A: 工具栏点击                                    │
│  用户点击列表按钮 → onClick → command.execute()       │
│     → makeList():                                     │
│       1. selectWord(): 扩展选区到列表项边界            │
│       2. getBreaksNeeded: 计算前后空行数               │
│       3. insertBeforeEachLine: 每行前插入前缀          │
│       4. 根据 insertionLength 判断添加/移除             │
│                                                        │
│  路径 B: 快捷键                                        │
│  Ctrl+Shift+U / Ctrl+Shift+O / Ctrl+Shift+C          │
│     → 同上                                             │
│                                                        │
│  路径 C: 已有列表上再次触发（toggle 行为）              │
│  insertionLength < 0 → 移除前缀                        │
│     → 无序列表：移除 "- " 前缀                          │
│     → 有序列表：移除 "1. " / "2. " 等前缀              │
│     → 任务列表：⚠️ 无法正确 toggle（见问题 UX-01）     │
│                                                        │
│  路径 D: 多行选区                                      │
│  选中多行 → insertBeforeEachLine 每行前添加前缀         │
│     → 无序列表：每行 "- "                              │
│     → 有序列表：每行 "1. " / "2. " / "3. "             │
│     → 任务列表：每行 "- [ ] "（⚠️ 忽略 item 内容）     │
└──────────────────────────────────────────────────────┘
```

### 4.2 核心交互问题

**问题 UX-01 — checkedList 回调忽略参数，多行任务列表无法正确处理已勾选项**（P1）：

```tsx
// 第 104 行 — 回调完全忽略 item 和 index 参数
execute: (state: ExecuteState, api: TextAreaTextApi) => {
    makeList(state, api, (item, index) => `- [ ] `);
},
```

`insertBeforeEachLine` 的回调签名是 `(item: string, index: number) => string`，其中 `item` 是每一行的文本内容。此回调应检测 `item` 是否已经是任务列表项（如 `- [ ] ` 或 `- [x] `），以便在 toggle 时正确移除前缀。

**对比有序列表的正确实现**：
```tsx
// 第 85 行 — 正确使用 index 参数
makeList(state, api, (item, index) => `${index + 1}. `);
```

有序列表至少使用了 `index` 参数来生成递增编号，而任务列表完全忽略了两个参数，导致：
1. **无法区分已勾选和未勾选的任务**：当行内容为 `- [x] 已完成` 时，toggle 操作仍尝试插入 `- [ ] `，而非识别并移除
2. **多行任务列表永远生成未勾选项**：即使原始文本包含 `- [x] `，再次操作后全部变为 `- [ ] `
3. **toggle 行为不一致**：`insertBeforeEachLine` 返回的 `insertionLength` 取决于回调是否正确处理了已有前缀，忽略参数可能导致 `insertionLength` 计算错误

**问题 UX-02 — makeList 中 prefix 非空断言可能运行时崩溃**（P1）：

```tsx
// 第 12 行
const newSelectionRange = selectWord({
  text: state.text,
  selection: state.selection,
  prefix: state.command.prefix!  // ⚠️ 非空断言
});
```

`state.command.prefix` 的类型为 `string | undefined`，此处使用 TypeScript 非空断言运算符 `!`。如果 `ICommand` 接口中 `prefix` 为可选字段，且某个命令未提供 `prefix`，`selectWord` 将收到 `undefined` 作为 `prefix` 参数。

在 `list.tsx` 的三个命令中，`prefix` 均已显式定义（`'- '` / `'1. '` / `'- [ ] '`），所以当前使用安全。但 `makeList` 是公共导出函数，任何外部调用者可能传入 `prefix` 为 `undefined` 的命令对象，导致 `selectWord` 行为不可预测。

### 4.3 快捷键设计

| 命令 | 快捷键 | 评价 |
|---|---|---|
| unorderedListCommand | `ctrl+shift+u` | ✅ U = Unordered，助记性强 |
| orderedListCommand | `ctrl+shift+o` | ✅ O = Ordered，助记性强 |
| checkedListCommand | `ctrl+shift+c` | ⚠️ C = Checked/Checkbox，与常见 Ctrl+Shift+C 复制格式冲突 |

**问题 UX-03 — Ctrl+Shift+C 快捷键冲突**（P2）：

`Ctrl+Shift+C` 在 Chrome 中是"开发者工具元素选取器"的快捷键，在 VS Code 中是"复制路径"，在部分终端中是"复制选区"。虽然 Markdown 编辑器 textarea 中的快捷键优先级通常高于浏览器默认行为，但在某些场景下可能触发意外行为。

### 4.4 工具提示（Tooltip）

```tsx
// 三个命令的 buttonProps
unorderedListCommand: { 'aria-label': 'Add unordered list (ctrl + shift + u)', title: '...' }
orderedListCommand:   { 'aria-label': 'Add ordered list (ctrl + shift + o)', title: '...' }
checkedListCommand:   { 'aria-label': 'Add checked list (ctrl + shift + c)', title: '...' }
```

**DESIGN.md / Antd 规范对比**：

| 维度 | Antd 规范 | list.tsx 实现 | 评价 |
|---|---|---|---|
| Tooltip 组件 | `<Tooltip>` — 支持主题/延迟/箭头 | 原生 `title` 属性 | ❌ 无样式控制 |
| Tooltip 延迟 | `mouseEnterDelay: 0.1s` | 浏览器默认（~0.5s） | ⚠️ 偏慢 |
| Tooltip 样式 | Carbon 排版（14px / Ink 色） | 系统默认（小字 / 黄底黑字） | ❌ 不符合 Carbon |
| 提示文本 | 应反映 toggle 行为 | 固定 "Add ..." | ⚠️ 忽略移除场景 |

**问题 UX-04 — 提示文案仅描述"添加"，未反映 toggle 行为**（P3）：

三个命令的 `aria-label` 和 `title` 均使用 "Add ... list" 固定文案。实际上 `makeList` 支持 toggle（已有列表项时触发会移除前缀）。更准确的提示应为 "Toggle unordered list" 或根据当前选区状态动态显示。

### 4.5 操作反馈

| 维度 | 评分 | 说明 |
|---|---|---|
| Toggle 行为 | ⚠️ 部分 | 无序/有序列表 toggle 正常，任务列表 toggle 有缺陷（见 UX-01） |
| 智能选词 | ✅ 良好 | `selectWord` 自动扩展到列表项边界 |
| 空行处理 | ✅ 优秀 | `getBreaksNeededForEmptyLineBefore/After` 确保列表前后有空行分隔 |
| 多行支持 | ✅ 良好 | `insertBeforeEachLine` 正确处理多行选区 |
| 操作可发现性 | ✅ 良好 | `title` 属性显示快捷键提示 |

---

## 五、无障碍（a11y）评审

### 5.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ⚠️ | ordered/checked 有 `role="img"`，**unordered 缺少 `role="img"`** |
| **2.1.1 键盘可操作** | A | ✅ | 快捷键 + Tab 到按钮后 Enter 触发 |
| **2.4.6 标题和标签** | AA | ⚠️ | `aria-label` 为英文，中文用户场景下不够友好 |
| **2.4.7 焦点可见** | AA | ❌ | 按钮无自定义 focus ring（继承工具栏问题） |
| **2.5.5 目标尺寸** | AAA | ❌ | 按钮实际触摸目标 ~20×20px，远低于 44×44px AAA 要求 |
| **4.1.2 名称、角色、值** | A | ✅ | `aria-label` 提供了可访问名称 |

### 5.2 核心无障碍问题

**问题 A-01 — unorderedListCommand SVG 缺少 `role="img"`**（P2）：

```tsx
// 第 58 行 — unorderedListCommand 的 SVG 无 role 属性
<svg data-name="unordered-list" width="12" height="12" viewBox="0 0 512 512">

// 对比第 77 行 — orderedListCommand 有 role="img"
<svg data-name="ordered-list" width="12" height="12" role="img" viewBox="0 0 512 512">

// 对比第 96 行 — checkedListCommand 有 role="img"
<svg data-name="checked-list" width="12" height="12" role="img" viewBox="0 0 512 512">
```

**影响**：缺少 `role="img"` 时，屏幕阅读器可能尝试将 SVG 内的 `<path>` 元素作为可交互内容播报，而非将其视为装饰性图像。这导致：
1. 辅助技术无法正确理解 SVG 的语义角色
2. 与 `orderedListCommand` 和 `checkedListCommand` 的实现不一致（同文件内行为不统一）
3. 违反 WCAG 1.1.1 非文本内容准则

**问题 A-02 — 三个 SVG 均缺少 `aria-hidden="true"`**（P3）：

与 `bold.tsx` 相同问题——当按钮已有 `aria-label` 时，内部 SVG 应设置 `aria-hidden="true"` 以防止屏幕阅读器重复播报。当前三个命令的 SVG 均未设置此属性。

### 5.3 无障碍对比（同文件三个命令）

| 命令 | `aria-label` | `title` | SVG `role="img"` | SVG `aria-hidden` | 无障碍评级 |
|---|---|---|---|---|---|
| **unorderedListCommand** | ✅ | ✅ | ❌ **缺失** | ❌ | A- |
| **orderedListCommand** | ✅ | ✅ | ✅ | ❌ | A |
| **checkedListCommand** | ✅ | ✅ | ✅ | ❌ | A |

---

## 六、Antd 规范合规性评审

### 6.1 组件使用合规性

**CLAUDE.md 铁律**：前端必须使用 Ant Design (antd) 组件，禁止使用原生 HTML 元素替代 antd 提供的组件。

| list.tsx 元素 | antd 等价组件 | 合规 | 说明 |
|---|---|---|---|
| `<svg>` (图标) | `@ant-design/icons` / `UnorderedListOutlined` / `OrderedListOutlined` / `CheckSquareOutlined` | ❌ | 第三方库内部，使用自定义 SVG |
| `<button>` (隐含) | `<Button>` / `<Tooltip>` | ❌ | 第三方库内部渲染 |
| `title` (工具提示) | `<Tooltip>` | ❌ | 原生 title，非 antd Tooltip |
| `aria-label` (可访问名称) | — | ✅ | 非组件层面问题 |

**UI 专家意见**：与 `bold.tsx` 评审一致——上述违规属于第三方库 `@uiw/react-md-editor` 的内部实现，本项目无法在不 fork 库的情况下替换。铁律的意图是禁止本项目的自定义代码使用原生 HTML 替代 antd，而非要求覆盖第三方库的内部 DOM。

### 6.2 antd 图标对照分析

`list.tsx` 中的三个列表图标在 antd Icons 库中有直接对应：

| list.tsx 图标 | antd 等价图标 | 风格差异 |
|---|---|---|
| unordered-list SVG | `UnorderedListOutlined` / `BarsOutlined` | antd 使用 1.5px 描边，list.tsx 使用实心填充 |
| ordered-list SVG | `OrderedListOutlined` / `NumberOutlined` | antd 更简化（仅数字），list.tsx 保留完整数字字形 |
| checked-list SVG | `CheckSquareOutlined` / `CarryOutOutlined` | antd 使用线框风格，list.tsx 使用实心勾选标记 |

如果本项目能替换图标，antd Icons 能更好地与 Carbon Design System 的极简线条风格协调。

---

## 七、SVG 图标设计评审

### 7.1 图标来源与风格

三个图标均采用 **FontAwesome Solid** 风格（实心填充），与 Carbon Design System 的线条图标风格存在视觉冲突：

| 图标 | viewBox | 像素面积 | 复杂度 | 识别度 |
|---|---|---|---|---|
| unordered-list | 0 0 512 512 | 262,144 | 中（3 圆点 + 3 横线） | ✅ 高 |
| ordered-list | 0 0 512 512 | 262,144 | 高（3 组数字 + 3 横线） | ✅ 高 |
| checked-list | 0 0 512 512 | 262,144 | 高（2 勾选 + 1 圆框 + 3 横线） | ✅ 高 |

**问题 V-02 — 图标风格与 Carbon/Antd 不一致**（P3）：

FontAwesome Solid 实心风格与 Carbon Design System 的极简线条图标风格存在视觉冲突。三个列表图标均为实心填充，视觉比重偏重。在工具栏中，列表按钮的实心图标与相邻的斜体/加粗等按钮在视觉比重上可能不均衡。

**影响**：视觉风格不一致，但不影响功能识别。本项目无法在不修改源码的情况下替换图标。

### 7.2 SVG 属性对比

| 属性 | unorderedList | orderedList | checkedList | 评价 |
|---|---|---|---|---|
| `role="img"` | ❌ 缺失 | ✅ | ✅ | unorderedList 不一致 |
| `data-name` | ✅ "unordered-list" | ✅ "ordered-list" | ✅ "checked-list" | ✅ 语义标识一致 |
| `width`/`height` | 12×12 | 12×12 | 12×12 | ⚠️ 偏小 |
| `viewBox` | 0 0 512 512 | 0 0 512 512 | 0 0 512 512 | ✅ 比例一致 |
| `fill` | currentColor | currentColor | currentColor | ✅ 可主题化 |
| `aria-hidden` | ❌ 缺失 | ❌ 缺失 | ❌ 缺失 | 建议全部添加 |

---

## 八、响应式行为评审

### 8.1 触摸目标

| 设备 | 按钮实际尺寸 | DESIGN.md 要求 | 合规 |
|---|---|---|---|
| 桌面 | ~20×20px（默认） | 32×32px | ❌ |
| 桌面（本项目覆盖后） | ~36×24px | 32×32px | ⚠️ 高度达标，宽度仍不足 |
| 触摸 | ~20×20px | 48×48px | ❌ |
| 触摸（本项目覆盖后） | ~36×24px | 48×48px | ❌ |

**问题 R-01 — 触摸目标不足**（P3）：

本项目 CSS 覆盖后工具栏最小高度 36px，按钮区域仍远低于 48px 触摸目标。这是 `@uiw/react-md-editor` 工具栏的系统性问题，非 `list.tsx` 独有。在移动端，三个列表按钮并排，误触风险更高。

### 8.2 快捷键移动端可用性

三个快捷键（Ctrl+Shift+U/O/C）在移动端均不可用（无物理键盘）。移动端用户只能通过工具栏按钮触发列表功能。列表按钮在移动端触摸目标不足（见 R-01），且工具栏可能溢出屏幕——三个列表按钮占工具栏更多空间。

### 8.3 工具栏溢出风险

三个列表命令在工具栏上各占一个按钮位。`@uiw/react-md-editor` 默认工具栏包含约 15-20 个按钮，在窄屏设备上容易溢出。列表类命令在溢出时可能被截断或折叠，降低可发现性。

---

## 九、国际化（i18n）评审

### 9.1 硬编码文本

```tsx
// 第 54-55 行
buttonProps: {
  'aria-label': 'Add unordered list (ctrl + shift + u)',
  title: 'Add unordered list (ctrl + shift + u)',
},
// 第 75 行
buttonProps: { 'aria-label': 'Add ordered list (ctrl + shift + o)', title: 'Add ordered list (ctrl + shift + o)' },
// 第 94 行
buttonProps: { 'aria-label': 'Add checked list (ctrl + shift + c)', title: 'Add checked list (ctrl + shift + c)' },
```

**问题 I18N-01 — 硬编码英文文本**（P2）：

| 命令 | 当前 aria-label | 中文期望值 |
|---|---|---|
| unorderedListCommand | "Add unordered list (ctrl + shift + u)" | "添加无序列表 (Ctrl+Shift+U)" |
| orderedListCommand | "Add ordered list (ctrl + shift + o)" | "添加有序列表 (Ctrl+Shift+O)" |
| checkedListCommand | "Add checked list (ctrl + shift + c)" | "添加任务列表 (Ctrl+Shift+C)" |

**影响**：
1. **中文用户**：鼠标悬停显示英文提示，降低可发现性
2. **屏幕阅读器用户**：中文 TTS 需播报英文，语音不自然
3. **"checked list" 术语**：中文用户更熟悉"任务列表"/"待办列表"，"checked list" 语义模糊

**修复路径**：本项目可通过 `MarkdownEditor.tsx` 封装层注入自定义命令替换默认列表命令，或通过 `useEffect` 在 mount 后修改按钮属性。

---

## 十、与同级命令的 UI 对比

| 维度 | bold | italic | unorderedList | orderedList | checkedList |
|---|---|---|---|---|---|
| SVG 尺寸 | 12×12 | 12×12 | 12×12 | 12×12 | 12×12 |
| `aria-label` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `role="img"` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `fill="currentColor"` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `aria-hidden` | ❌ | ❌ | ❌ | ❌ | ❌ |
| 快捷键 | Ctrl+B | Ctrl+I | Ctrl+Shift+U | Ctrl+Shift+O | Ctrl+Shift+C |
| Toggle 行为 | ✅ | ✅ | ✅ | ✅ | ⚠️ 有缺陷 |
| 共享逻辑 | 无 | 无 | makeList | makeList | makeList |

**结论**：`list.tsx` 的三个命令通过 `makeList` 共享函数实现了代码复用，这是优于 `bold.tsx`/`italic.tsx` 等独立命令的设计。但 `unorderedListCommand` 的 SVG 缺少 `role="img"` 是文件内部的不一致问题，`checkedListCommand` 的回调参数忽略是功能缺陷。

---

## 十一、makeList 共享逻辑评审

### 11.1 设计模式分析

`makeList` 提取了列表操作的通用逻辑，这是一个好的设计决策：

```
makeList 职责分解：
├── 选区扩展：selectWord（基于 prefix 边界）
├── 空行计算：getBreaksNeededForEmptyLineBefore/After
├── 前缀插入：insertBeforeEachLine（由回调决定前缀内容）
├── Toggle 判断：insertionLength < 0 → 移除 / >= 0 → 添加
└── 选区恢复：setSelectionRange（操作后光标定位）
```

**优点**：
- 三种列表命令复用同一套逻辑，避免代码重复
- 通过回调参数 `insertBefore` 支持不同的前缀策略（固定字符串 / 函数）
- 有序列表通过 `(item, index) => `${index + 1}. `` 实现自动编号

**问题**：
- `checkedListCommand` 未正确使用回调参数（见 UX-01）
- `state.command.prefix!` 非空断言（见 UX-02）
- 无类型约束确保 `makeList` 的调用者正确实现回调

### 11.2 Toggle 行为分析

```tsx
// 第 22-44 行：Toggle 逻辑
if (insertionLength < 0) {
  // Remove — 移除列表前缀
  // 调整选区范围（处理换行符边界）
  api.replaceSelection(`${modifiedText}`);
} else {
  // Add — 添加列表前缀
  api.replaceSelection(`${breaksBefore}${modifiedText}${breaksAfter}`);
}
```

`insertionLength < 0` 由 `insertBeforeEachLine` 返回，表示前缀被移除（即文本已有列表前缀，toggle 触发移除操作）。这个 toggle 机制对无序列表和有序列表工作正常，但对任务列表：

```tsx
// checkedList 的回调永远返回 "- [ ] "，不检查文本是否已有该前缀
(item, index) => `- [ ] `
```

当 `insertBeforeEachLine` 检测到文本已有 `- [ ] ` 前缀时，它应该移除前缀并返回负的 `insertionLength`。但如果回调不检查已有前缀，`insertBeforeEachLine` 可能无法正确判断是否需要移除。

---

## 十二、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 修复位置 |
|---|---|---|---|---|---|
| UX-01 | **P1** | 交互 | checkedList 回调忽略 item/index 参数，多行任务列表无法正确处理已勾选项 | 任务列表 toggle 行为异常 | 需修改源码回调逻辑 |
| UX-02 | **P1** | 交互 | `makeList` 中 `state.command.prefix!` 非空断言，外部调用可能崩溃 | 运行时异常风险 | 改用 `prefix ?? ''` 或添加守卫 |
| UX-03 | P2 | 交互 | Ctrl+Shift+C 快捷键与浏览器/IDE 冲突 | 意外行为 | 需修改源码更换快捷键 |
| A-01 | P2 | 无障碍 | unorderedList SVG 缺少 `role="img"`（与 ordered/checked 不一致） | 屏幕阅读器语义缺失 | 需修改源码添加 role |
| I18N-01 | P2 | 国际化 | 三个命令 aria-label/title 硬编码英文 | 中文用户体验差 | 封装层动态替换 |
| V-01 | P3 | 视觉 | 图标 12×12 偏小，Carbon 建议最小 16px | 图标视觉比重不足 | 本项目 CSS 已缩放 |
| V-02 | P3 | 视觉 | FontAwesome 实心风格与 Carbon 线条风格不一致 | 工具栏视觉风格不统一 | 需修改源码替换图标 |
| A-02 | P3 | 无障碍 | 三个 SVG 均缺少 `aria-hidden="true"` | 屏幕阅读器可能重复播报 | 需修改源码 |
| R-01 | P3 | 响应式 | 触摸目标不足（36×24px vs 48×48px） | 移动端误触风险 | 工具栏系统性问题 |
| UX-04 | P3 | 交互 | 提示文案仅描述"添加"，未反映 toggle 行为 | 用户无法预期移除操作 | 需动态判断显示文案 |

---

## 十三、对本项目（by_geo）的 UI 建议

### 优先级 P1（建议立即处理）

1. **checkedList 命令替换**：在 `MarkdownEditor.tsx` 封装层中自定义 checkedList 命令，修复回调参数忽略问题：
   ```tsx
   const fixedCheckedListCommand: ICommand = {
     ...checkedListCommand,
     execute: (state: ExecuteState, api: TextAreaTextApi) => {
       makeList(state, api, (item, index) => {
         const trimmed = item.replace(/^[-*]\s\[[ x]\]\s/, '');
         return trimmed === item ? `- [ ] ` : '';  // 有前缀则移除，无前缀则添加
       });
     },
   };
   ```
   **注意**：需验证 `insertBeforeEachLine` 对空字符串返回值的 `insertionLength` 计算逻辑。

### 优先级 P2（建议下个迭代处理）

2. **工具栏 focus-visible 覆盖**：在 `markdown-editor.css` 中添加：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button:focus-visible {
     outline: 2px solid var(--color-primary) !important;
     outline-offset: -2px !important;
   }
   ```

3. **中文 ARIA 标注注入**：在 `MarkdownEditor.tsx` 中通过 `useEffect` 在 mount 后修改工具栏按钮的无障碍属性：
   ```tsx
   useEffect(() => {
     const buttons = wrapperRef.current?.querySelectorAll('.w-md-editor-toolbar button');
     buttons?.forEach(btn => {
       const label = btn.getAttribute('aria-label');
       if (label?.includes('unordered')) {
         btn.setAttribute('aria-label', '添加无序列表 (Ctrl+Shift+U)');
         btn.setAttribute('title', '添加无序列表 (Ctrl+Shift+U)');
       } else if (label?.includes('ordered')) {
         btn.setAttribute('aria-label', '添加有序列表 (Ctrl+Shift+O)');
         btn.setAttribute('title', '添加有序列表 (Ctrl+Shift+O)');
       } else if (label?.includes('checked')) {
         btn.setAttribute('aria-label', '添加任务列表 (Ctrl+Shift+C)');
         btn.setAttribute('title', '添加任务列表 (Ctrl+Shift+C)');
       }
     });
   }, []);
   ```

4. **Ctrl+Shift+C 冲突缓解**：在 `MarkdownEditor.tsx` 中捕获 `keydown` 事件，阻止事件冒泡到浏览器：
   ```tsx
   useEffect(() => {
     const editor = wrapperRef.current;
     const handler = (e: KeyboardEvent) => {
       if (e.ctrlKey && e.shiftKey && e.key === 'C') {
         e.stopPropagation();  // 阻止冒泡到浏览器
       }
     };
     editor?.addEventListener('keydown', handler);
     return () => editor?.removeEventListener('keydown', handler);
   }, []);
   ```

### 优先级 P3（可纳入技术债）

5. **图标尺寸优化**：通过 CSS 将 SVG 图标统一放大至 16px
6. **触摸目标增大**：将工具栏按钮最小尺寸提升至 44×44px
7. **Tooltip 升级**：评估是否可在封装层用 antd `<Tooltip>` 包裹工具栏按钮

---

## 十四、评审总结

`list.tsx` 作为 `@uiw/react-md-editor` 的列表命令模块，通过 `makeList` 共享函数实现了无序列表、有序列表、任务列表三种命令的统一管理，代码复用度高于同级命令（`bold.tsx`/`italic.tsx` 等）。空行计算和选区恢复逻辑完整，列表操作的基础交互体验良好。

**核心矛盾**：

1. **功能缺陷**（P1）：`checkedListCommand` 的回调完全忽略 `item` 和 `index` 参数，导致任务列表无法正确处理已勾选项，toggle 行为可能异常。这是文件中最严重的问题——与 `orderedListCommand` 正确使用 `index` 参数形成鲜明对比。
2. **设计系统不匹配**：该文件的设计目标是服务于 GitHub 风格的 Markdown 编辑器，而非 IBM Carbon Design System，在视觉设计层面与本项目的 Carbon + Antd 设计规范存在系统性不匹配。
3. **文件内部不一致**：`unorderedListCommand` 的 SVG 缺少 `role="img"`，而同文件的 `orderedListCommand` 和 `checkedListCommand` 均有此属性，说明作者在不同命令间的实现疏忽。

**正面评价**：
- `makeList` 共享函数的设计优于同级命令的独立实现，减少代码重复
- `getBreaksNeededForEmptyLineBefore/After` 确保列表前后有空行分隔，Markdown 渲染正确性高
- `fill="currentColor"` 是图标主题化的最佳实践
- 三个命令均提供了 `aria-label` + `title`，无障碍基础优于行业平均水平
- 有序列表的 `(item, index) => `${index + 1}. `` 回调正确实现了自动编号

**主要风险**：
- checkedList 回调参数忽略是功能性缺陷（P1），影响任务列表的核心交互
- `prefix!` 非空断言存在运行时崩溃风险（P1）
- Ctrl+Shift+C 快捷键与浏览器/IDE 默认行为冲突（P2）
- unorderedList SVG 无障碍属性缺失（P2）
- 硬编码英文文本在中文项目中构成用户体验缺陷（P2）

**综合评分 3.9/10** — 文件的 `makeList` 共享设计优于同级命令，但 checkedList 回调参数忽略是功能级缺陷，unorderedList 无障碍属性缺失是文件内部不一致问题。本项目 `MarkdownEditor.tsx` + `markdown-editor.css` 的封装层已有效覆盖了视觉冲突，建议优先修复 checkedList 回调和中文 ARIA 标注问题。

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + DESIGN.md (IBM Carbon Design System) + Antd 6.x 规范 + WCAG 2.1 AA 标准*
