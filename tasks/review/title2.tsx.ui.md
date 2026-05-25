# 软件 UI 专家评审：title2.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/title2.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · Antd 规范 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-25
**代码行数**: 23 行（1 个导出命令 `heading2` + 1 个废弃别名 `title2`）
**功能概述**: Markdown 编辑器二级标题命令定义，定义 `heading2` 命令对象（快捷键 `Ctrl/Cmd+2`，前缀 `## `），icon 使用纯文本 `<div>` 而非 SVG 图标，委托 `headingExecute` 共享执行逻辑
**评审结论**: ⚠️ CONDITIONAL APPROVE — 功能完整且无障碍属性齐全，但 icon 实现方式与 Carbon/Antd 设计系统存在系统性偏差（纯文本 div 替代 SVG 图标），存在 2 项 P2 + 4 项 P3 问题

**问题统计**: P1 × 0 / P2 × 2 / P3 × 4

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器的二级标题命令（`## 文本`），供工具栏标题分组下拉菜单和快捷键调用 |
| 代码行数 | 23 行 |
| 设计模式 | 命令模式（`ICommand` 接口实现） |
| UI 相关输出 | 1 个纯文本 div 图标 + 1 组按钮属性（aria-label / title） |
| 用户交互路径 | 工具栏标题分组下拉 → 选择 "Heading 2" / Ctrl+2 快捷键 → `execute()` |
| 依赖 | `headingExecute`（共享执行逻辑）、`selectLine`、`executeCommand`（纯文本运算） |

### 源码结构

```tsx
export const heading2: ICommand = {
  name: 'heading2',                    // 命令标识
  keyCommand: 'heading2',              // 命令类型
  shortcuts: 'ctrlcmd+2',              // 快捷键绑定
  prefix: '## ',                       // Markdown 二级标题标记
  suffix: '',                          // 标题无后缀
  buttonProps: {                        // 工具栏按钮属性
    'aria-label': 'Insert Heading 2 (ctrl + 2)',
    title: 'Insert Heading 2 (ctrl + 2)'
  },
  icon: (                              // 纯文本 div 图标
    <div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>
  ),
  execute: (state, api) => {           // 命令执行逻辑
    headingExecute({ state, api, prefix: state.command.prefix!, suffix: state.command.suffix });
  }
};

// 废弃别名
export const title2: ICommand = heading2;
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 2 | 纯文本 div 图标而非 SVG，内联样式硬编码 fontSize:16，无颜色/圆角/间距 Carbon 适配 |
| 交互体验（UX） | 7 | 快捷键 + 工具栏分组双入口，toggle 逻辑完整，标题层级切换体验合理 |
| 无障碍（a11y） | 7 | 有 `aria-label`、`title`，但 icon div 缺少 `role` 属性，无 `aria-hidden` |
| Antd 规范合规 | 2 | 使用原生 div + 内联样式，未使用 antd 图标组件或设计 token |
| 响应式行为 | 4 | 图标为纯文本 "Heading 2"，在窄屏下文本可能溢出或压缩 |
| 国际化（i18n） | 2 | 硬编码英文文本（aria-label / title / icon 文本），无 i18n 支持 |
| 图标设计 | 3 | 纯文本 div 替代图标，与同库其他命令的 SVG 风格不一致，与 Carbon 图标体系完全不兼容 |
| **综合评分** | **3.9 / 10** | |

---

## 三、DESIGN.md 合规性详细分析

### 3.1 图标实现方式与 Carbon 规范

**DESIGN.md 要求**：
- 图标尺寸 ≥16px（Carbon 最小图标尺寸）
- 图标使用线条描边风格（Carbon Icon Library）
- 图标颜色继承 `currentColor`
- 工具栏按钮高度 48px（触摸目标），按钮 padding 12px 16px

**实际行为**：

```tsx
// 第 12 行 — 纯文本 div 作为图标
<div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>
```

| 属性 | DESIGN.md 规范 | title2.tsx 实际值 | 差距 | 本项目覆盖 |
|---|---|---|---|---|
| 图标类型 | SVG 矢量图标（Carbon Icons） | 纯文本 `<div>` | 根本性偏差 | ❌ 无法 CSS 覆盖 |
| 图标尺寸 | 16–20px | fontSize: 16（文本高度约 16px） | ✅ 数值接近 | — |
| 图标颜色 | `currentColor`（可继承主题色） | 继承 `color`（但文本渲染 vs SVG 路径渲染） | ⚠️ 机制不同 | 部分可控 |
| 图标对齐 | 按钮内居中 | `textAlign: 'left'` — 左对齐 | ❌ 非居中 | ❌ 内联样式优先级高 |
| 按钮尺寸 | 32px（桌面）/ 48px（触摸） | ~20px（工具栏默认） | -12px | ✅ CSS 覆盖至 36px |
| 按钮圆角 | `rounded.none` 0px | 2px（默认） | +2px | ✅ CSS 覆盖为 0 |

**问题 V-01 — 纯文本 div 替代 SVG 图标，与 Carbon 图标体系根本性不兼容**（P2）：

这是 title2.tsx 与 bold.tsx/italic.tsx 等命令最显著的 UI 差异。`bold`、`italic`、`strikethrough`、`link` 等命令使用 FontAwesome SVG 图标（12×12 矢量路径），而标题命令（heading1-6）使用纯文本 `<div>` 作为图标。

纯文本 div 图标的缺陷：

| 维度 | SVG 图标（bold 等） | 纯文本 div（heading） | 影响 |
|---|---|---|---|
| 渲染质量 | 矢量缩放无损 | 字体渲染，小尺寸模糊 | 低分辨率屏幕下文本图标更模糊 |
| 主题化能力 | `fill="currentColor"` 完全可控 | CSS `color` 可控，但字体不可改 | Carbon 字体 IBM Plex Sans 与图标字体不一致 |
| 对齐一致性 | viewBox 精确控制 | `textAlign: left` 左对齐，与其他图标居中不一致 | 工具栏视觉不均衡 |
| 尺寸可控性 | width/height 精确 | fontSize 控制文本高度，实际渲染尺寸不精确 | 难以精确匹配 Carbon 16px 图标规范 |
| 国际化 | 无文本内容，无需翻译 | "Heading 2" 英文硬编码 | 中文界面显示英文图标 |

### 3.2 颜色体系

**DESIGN.md 要求**：IBM Blue (#0f62fe) 为唯一品牌色，Charcoal (#161616) 文字，无阴影。

| 元素 | DESIGN.md 规范 | title2.tsx / 工具栏默认值 | 合规 |
|---|---|---|---|
| 图标/文本颜色 | `currentColor` → Ink (#161616) | 继承父级 `color` | ✅ 可通过 CSS 控制 |
| 按钮 hover 背景 | Surface-1 (#f4f4f4) | GitHub 灰 (#f3f4f6) | ⚠️ 近似但非 Carbon |
| 按钮 active 背景 | Blue-80 (#002d9c) | GitHub 蓝 (#0969da) | ❌ 非 IBM Blue |
| 按钮 focus | 2px IBM Blue outline | 浏览器默认 | ❌ 无 Carbon focus ring |

**颜色继承分析**：

纯文本 div 作为图标时，文本颜色通过 CSS `color` 属性继承。这与 SVG 的 `fill="currentColor"` 机制不同——SVG 使用 `fill` 属性着色路径，而文本使用 `color` 属性着色字形。两者在主题化层面均可通过父级 CSS 控制，但语义上存在差异：

- SVG `fill="currentColor"` → 修改 `.w-md-editor-toolbar button { color: #161616 }` → 图标路径颜色变化
- 文本 `div` → 修改 `.w-md-editor-toolbar button { color: #161616 }` → 文本颜色变化

两者均可在本项目 `markdown-editor.css` 中通过同一 CSS 规则控制。

### 3.3 圆角体系

**DESIGN.md 要求**：`rounded.none` (0px) 为默认。

**实际行为**：标题命令在下拉菜单中展示，下拉菜单项默认可能有轻微圆角。纯文本 div 本身无圆角概念。本项目已在 CSS 中覆盖工具栏按钮圆角为 0px。

### 3.4 排版体系

**DESIGN.md 要求**：IBM Plex Sans，button token 14px/400/1.29。

**实际行为**：

| 元素 | DESIGN.md 规范 | title2.tsx 实现 | 合规 |
|---|---|---|---|
| icon 文本字体 | IBM Plex Sans 14px/400 | 系统默认字体 / 继承字体 | ⚠️ 取决于父级 CSS |
| icon 文本字号 | —（图标不应用文本 token） | `fontSize: 16` | — |
| tooltip 文本 | IBM Plex Sans 14px/400 | 浏览器系统字体 | ❌ 原生 title 不可控 |
| aria-label 语言 | 与 UI 语言一致 | 英文 "Insert Heading 2" | ❌ 中文项目应使用中文 |

---

## 四、交互体验（UX）评审

### 4.1 命令执行流程

```
用户操作路径：
┌──────────────────────────────────────────────────────────┐
│  路径 A: 工具栏标题分组                                    │
│  用户点击 [H] 分组按钮 → 下拉菜单展开                      │
│     → 显示 heading1~6 选项                                │
│     → 用户选择 "Heading 2"                                │
│     → command.execute() → headingExecute()                │
│        → selectLine(): 选中光标所在整行                    │
│        → executeCommand(): 添加/移除 "## " 前缀            │
│                                                            │
│  路径 B: 快捷键 Ctrl+2                                   │
│  用户按 Ctrl+2 → keydown handler → command.execute()      │
│     → 同上                                                │
│                                                            │
│  路径 C: 已有 H2 前缀的文本                                │
│  光标在 "## Hello" 行 → 触发 H2 命令                      │
│     → executeCommand 检测已有 "## " 前缀 → 移除（toggle）  │
│                                                            │
│  路径 D: 已有 H3 前缀的文本（边界情况）                     │
│  光标在 "### Hello" 行 → 触发 H2 命令                     │
│     → "### Hello".startsWith("## ") = true                │
│     → 移除前 3 个字符 → "# Hello"（降级为 H1）⚠️           │
└──────────────────────────────────────────────────────────┘
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| Toggle 行为 | ✅ 优秀 | 添加/移除 H2 双向切换，符合用户心智模型 |
| 分组下拉设计 | ✅ 良好 | 6 级标题收纳在分组下拉中，不占用工具栏空间 |
| 操作可发现性 | ⚠️ 一般 | 分组下拉需要用户知道点击 H 按钮展开菜单 |
| 操作反馈 | ⚠️ 一般 | 无视觉反馈（如短暂的按钮高亮），标题级别变化无动画 |
| 边界情况处理 | ⚠️ 有缺陷 | H3 → H2 时实际降级为 H1（路径 D），用户预期不符 |

**问题 UX-01 — H3+ 行文本触发 H2 toggle off 导致错误降级**（P3）：

`### Hello` 以 `## ` 开头，`startsWith('## ')` 为 `true`，触发 toggle off 移除前缀后变为 `# Hello`（一级标题）。用户预期将三级标题"变为"二级标题，但实际结果是一级标题。这是 `executeCommand` 的 suffix 为空字符串时 `startsWith` 检测不精确的系统性问题，影响所有标题命令。

### 4.2 快捷键设计

```tsx
shortcuts: 'ctrlcmd+2',
```

| 维度 | 评价 |
|---|---|
| 按键选择 | ✅ Ctrl+2 符合 Markdown 编辑器惯例（Typora、VS Code 都使用 Ctrl+1~6） |
| 跨平台 | ✅ `ctrlcmd` 自动映射为 macOS ⌘2 / Windows/Linux Ctrl+2 |
| 冲突风险 | ⚠️ Ctrl+2 在某些应用中用于切换到第二个标签页（Firefox），但 textarea 中通常不冲突 |
| 提示文案 | ⚠️ `title` 显示 "ctrl + 2"，macOS 用户看到应为 ⌘2 |
| 与同级快捷键连续性 | ✅ Ctrl+1~6 连续映射到 H1~H6，学习成本低 |

**问题 UX-02 — 快捷键提示未区分平台**（P3）：

`title: 'Insert Heading 2 (ctrl + 2)'` 硬编码 "ctrl"，macOS 用户实际使用 ⌘2。与 bold.tsx 的 UX-01 问题一致。

### 4.3 工具提示（Tooltip）

```tsx
buttonProps: {
  'aria-label': 'Insert Heading 2 (ctrl + 2)',
  title: 'Insert Heading 2 (ctrl + 2)'
},
```

**DESIGN.md / Antd 规范对比**：

| 维度 | Antd 规范 | title2.tsx 实现 | 评价 |
|---|---|---|---|
| Tooltip 组件 | `<Tooltip>` — 支持主题/延迟/箭头 | 原生 `title` 属性 | ❌ 无样式控制 |
| Tooltip 延迟 | `mouseEnterDelay: 0.1s` | 浏览器默认（~0.5s） | ⚠️ 偏慢 |
| Tooltip 样式 | Carbon 排版（14px / Ink 色） | 系统默认（小字 / 黄底黑字） | ❌ 不符合 Carbon |
| 提示内容 | 描述功能 + 快捷键 | "Insert Heading 2 (ctrl + 2)" | ✅ 信息完整 |

**问题 UX-03 — 原生 title 替代 antd Tooltip**（P2）：

与 bold.tsx 的 UX-02 问题一致。原生 `title` 的浏览器工具提示与 Carbon/Antd 设计系统完全不符。但由于标题命令在下拉菜单中展示，用户悬停概率低于工具栏直接按钮，影响相对较小。

### 4.4 标题分组交互分析

标题命令通过 `group()` 聚合为一个下拉按钮（见 `index.ts` L95）：

```tsx
group([title1, title2, title3, title4, title5, title6], {
  name: 'title',
  groupName: 'title',
  buttonProps: { 'aria-label': 'Insert title', title: 'Insert title' },
}),
```

**分组交互评价**：

| 维度 | 评价 |
|---|---|
| 信息密度 | ✅ 6 级标题收纳在一个按钮中，节省工具栏空间 |
| 可发现性 | ⚠️ 新用户可能不知道点击 H 按钮可展开标题菜单 |
| 操作效率 | ⚠️ 需两次点击（展开菜单 → 选择级别），不如快捷键高效 |
| 菜单项图标 | ❌ 各级标题使用纯文本 "Heading 1"~"Heading 6"，无视觉区分度 |

---

## 五、无障碍（a11y）评审

### 5.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ⚠️ | icon 为纯文本 div，无 `role` 属性，屏幕阅读器可能将 "Heading 2" 读作按钮文本 |
| **2.1.1 键盘可操作** | A | ✅ | Ctrl+2 快捷键 + Tab 到按钮后 Enter 触发 |
| **2.4.6 标题和标签** | AA | ⚠️ | `aria-label` 为英文，中文用户场景下不够友好 |
| **2.4.7 焦点可见** | AA | ❌ | 按钮无自定义 focus ring（继承工具栏问题） |
| **2.5.5 目标尺寸** | AAA | ❌ | 下拉菜单项触摸目标偏小，远低于 44×44px |
| **4.1.2 名称、角色、值** | A | ✅ | `aria-label` 提供了可访问名称 |

### 5.2 无障碍对比（与 bold.tsx 等 SVG 图标命令）

| 命令 | 图标类型 | `aria-label` | `title` | icon `role` | icon `aria-hidden` | 无障碍评级 |
|---|---|---|---|---|---|---|
| bold | SVG | ✅ | ✅ | ✅ `role="img"` | ❌ 缺失 | A |
| italic | SVG | ✅ | ✅ | ✅ `role="img"` | ❌ 缺失 | A |
| **heading2** | **纯文本 div** | ✅ | ✅ | **❌ 无 role** | **❌ 缺失** | **A-** |
| heading1 | 纯文本 div | ✅ | ✅ | ❌ 无 role | ❌ 缺失 | A- |

**问题 A-01 — icon div 缺少 `role` 和 `aria-hidden` 属性**（P2）：

```tsx
icon: <div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>,
```

与 bold.tsx 的 SVG 图标相比，heading2 的 icon div 存在两个无障碍缺陷：

1. **缺少 `aria-hidden="true"`**：按钮已有 `aria-label="Insert Heading 2 (ctrl + 2)"` 提供语义，内部文本 "Heading 2" 应对屏幕阅读器隐藏，否则可能被重复播报（"Insert Heading 2" + "Heading 2"）
2. **缺少 `role="img"` 或 `role="presentation"`**：纯文本作为视觉装饰用途时，应明确标记角色

**对比分析**：

| 场景 | 有 `aria-hidden="true"` | 无 `aria-hidden="true"` |
|---|---|---|
| 屏幕阅读器播报 | "Insert Heading 2 (ctrl + 2)"（一次） | "Insert Heading 2 (ctrl + 2), Heading 2"（可能两次） |
| 按钮可访问名称 | 来自 `aria-label` | 来自 `aria-label`（覆盖内部文本） |
| 实际影响 | — | 主流屏幕阅读器中 `aria-label` 通常覆盖内部内容，但部分辅助技术可能同时播报 |

**修复建议**：

```tsx
icon: <div style={{ fontSize: 16, textAlign: 'left' }} role="img" aria-hidden="true">Heading 2</div>,
```

### 5.3 标题分组下拉无障碍

标题命令在下拉菜单中展示时的无障碍考量：

| 检查项 | 状态 | 说明 |
|---|---|---|
| 菜单触发按钮 | ✅ | 分组按钮有 `aria-label="Insert title"` |
| 菜单项可访问性 | ⚠️ | 下拉菜单是否使用 `role="menu"` + `role="menuitem"` 取决于 `group()` 组件实现 |
| 键盘导航 | ⚠️ | 下拉菜单中的标题级别选择是否支持上下方向键导航 |
| 选中状态反馈 | ❌ | 当前行的标题级别未在下拉菜单中标记为选中状态 |

---

## 六、Antd 规范合规性评审

### 6.1 组件使用合规性

**CLAUDE.md 铁律**：前端必须使用 Ant Design (antd) 组件，禁止使用原生 HTML 元素替代 antd 提供的组件。

| title2.tsx 元素 | antd 等价组件 | 合规 | 说明 |
|---|---|---|---|
| `<div>` (图标) | `@ant-design/icons` | ❌ | 第三方库内部，使用纯文本 div |
| `<button>` (隐含) | `<Button>` / `<Tooltip>` | ❌ | 第三方库内部渲染 |
| `title` (工具提示) | `<Tooltip>` | ❌ | 原生 title，非 antd Tooltip |
| `aria-label` | — | ✅ | 非组件层面问题 |

**UI 专家意见**：与 bold.tsx 评审结论一致——上述违规属于第三方库 `@uiw/react-md-editor` 的内部实现，本项目无法在不 fork 库的情况下替换。铁律的意图是禁止本项目的自定义代码使用原生 HTML 替代 antd，而非要求覆盖第三方库的内部 DOM。

### 6.2 antd Token 映射分析

| Token | antd 默认值 | title2.tsx 产出 | Carbon 期望值 | 差距 |
|---|---|---|---|---|
| `colorPrimary` | #1677ff | 系统继承色 | #0f62fe | ✅ 父级 CSS 已覆盖 |
| `colorText` | rgba(0,0,0,0.88) | 继承 `color` | #161616 | ✅ 父级 CSS 已覆盖 |
| `borderRadius` | 6px | 2px（默认） | 0px | ✅ CSS 已覆盖 |
| `controlHeight` | 32px | ~20px | 32–48px | ✅ CSS 已覆盖至 36px |
| `fontSizeIcon` | 14px | fontSize: 16（文本） | 16px | ✅ 数值一致但实现方式不同 |

### 6.3 与 antd Typography 标题的视觉映射

Antd 的 `<Typography.Title>` 组件提供 H1-H5 的标题渲染，其视觉层级如下：

| 级别 | antd 默认字号 | Carbon DESIGN.md 对应 token | title2.tsx icon fontSize |
|---|---|---|---|
| H1 | 38px | display-md 42px/300 | 18（title1） |
| **H2** | **30px** | **headline 32px/400** | **16** |
| H3 | 24px | card-title 24px/400 | 14（title3） |
| H4 | 20px | subhead 20px/400 | 12（title4） |
| H5 | 16px | body-lg 18px/400 | 10（title5） |

title2.tsx 的 icon `fontSize: 16` 作为菜单项文本的字号，本身不是实际标题渲染的字号。实际标题渲染在 Markdown 预览区，由 `react-markdown-preview` 组件控制。

---

## 七、图标设计评审

### 7.1 图标实现方式对比

```tsx
// title2.tsx — 纯文本 div
<div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>

// bold.tsx — SVG 图标
<svg role="img" width="12" height="12" viewBox="0 0 384 512">
  <path fill="currentColor" d="M304.793..." />
</svg>
```

**实现方式对比**：

| 维度 | SVG 图标（bold/italic 等） | 纯文本 div（heading） | 评价 |
|---|---|---|---|
| 视觉一致性 | 与 Carbon/Antd 图标风格接近 | 与图标体系完全不兼容 | ❌ 根本性偏差 |
| 尺寸精确性 | viewBox 精确控制 | fontSize 控制文本行高，实际渲染不确定 | ⚠️ |
| 颜色可控性 | `fill="currentColor"` | CSS `color` 继承 | ✅ 均可主题化 |
| 缩放质量 | 矢量无损 | 字体渲染，缩放后可能模糊 | ⚠️ |
| 文本内容 | 无文本，无 i18n 问题 | "Heading 2" 英文硬编码 | ❌ |
| 可读性 | 依赖图标设计质量 | 文本直接可读，无歧义 | ✅ |
| 与设计系统集成 | 可替换为 Carbon 图标 | 无法替换为图标组件 | ❌ |

**问题 V-02 — 纯文本图标与工具栏 SVG 图标风格不统一**（P3）：

在工具栏的标题分组下拉菜单中，6 个标题选项使用纯文本 "Heading 1"~"Heading 6"，而工具栏的其他按钮（bold/italic/link 等）使用 SVG 图标。当用户点击标题分组按钮展开下拉时，从图标世界切换到文本世界，视觉体验不连贯。

### 7.2 标题命令图标的字号梯度

| 命令 | fontSize | 文本内容 | 视觉效果 |
|---|---|---|---|
| heading1 | 18 | "Heading 1" | 最大，暗示一级标题 |
| **heading2** | **16** | **"Heading 2"** | **次大，暗示二级标题** |
| heading3 | 14 | "Heading 3" | 中等 |
| heading4 | 12 | "Heading 4" | 较小 |
| heading5 | 10 | "Heading 5" | 很小 |
| heading6 | 10 | "Heading 6" | 最小（与 5 相同） |

**评价**：字号递减的设计意图合理——通过字号梯度直观传达标题层级关系。但 `fontSize: 10` 的 heading5/heading6 在高分辨率屏幕下可能模糊不清。这是**纯文本图标独有的问题**，SVG 图标不存在字号模糊。

---

## 八、响应式行为评审

### 8.1 触摸目标

| 设备 | 菜单项实际尺寸 | DESIGN.md 要求 | 合规 |
|---|---|---|---|
| 桌面 | ~24×20px（默认） | 32×32px | ❌ |
| 触摸 | ~24×20px | 48×48px | ❌ |
| 触摸（本项目覆盖后） | ~36×24px | 48×48px | ❌ |

**问题 R-01 — 下拉菜单项触摸目标不足**（P3）：

标题命令在下拉菜单中展示时，菜单项的触摸区域更小（因为需要容纳 6 个选项）。本项目 CSS 覆盖后工具栏按钮有所改善，但下拉菜单项未单独处理。

### 8.2 纯文本图标在窄屏下的表现

| 场景 | 表现 |
|---|---|
| 桌面（>1056px） | "Heading 2" 完整显示，字号 16px 可读 |
| 平板（672-1056px） | 文本可能被压缩，但下拉菜单通常有足够宽度 |
| 手机（<672px） | 工具栏可能横向滚动，下拉菜单项文本可能换行或截断 |

### 8.3 快捷键移动端可用性

`ctrlcmd+2` 快捷键在移动端不可用（无物理键盘）。移动端用户只能通过工具栏标题分组下拉触发，操作路径为：点击分组按钮 → 等待菜单展开 → 选择 "Heading 2"，共 2 次点击。

---

## 九、国际化（i18n）评审

### 9.1 硬编码文本

```tsx
// 第 10-12 行 — 三处硬编码英文
buttonProps: {
  'aria-label': 'Insert Heading 2 (ctrl + 2)',   // ① 英文无障碍文本
  title: 'Insert Heading 2 (ctrl + 2)'           // ② 英文工具提示
},
icon: <div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>,  // ③ 英文图标文本
```

**问题 I18N-01 — 硬编码英文文本**（P2）：

| 文本 | 当前值 | 中文期望值 |
|---|---|---|
| `aria-label` | "Insert Heading 2 (ctrl + 2)" | "插入二级标题 (Ctrl+2)" |
| `title` | "Insert Heading 2 (ctrl + 2)" | "插入二级标题 (Ctrl+2)" |
| icon 文本 | "Heading 2" | "标题 2" 或使用图标 |

**影响评估**：

| 受影响用户 | 场景 | 影响 |
|---|---|---|
| 中文用户 | 鼠标悬停提示 | 看到英文 "Insert Heading 2"，可理解但不专业 |
| 屏幕阅读器用户 | 语音播报 | 中文 TTS 播报 "Insert Heading 2"，语音不自然 |
| 下拉菜单用户 | 选择标题级别 | 菜单显示 "Heading 2" 英文文本，中文环境下违和 |

**与 bold.tsx 的对比**：bold.tsx 的 icon 是 SVG（无文本），i18n 问题仅限于 `aria-label` 和 `title` 两处。而 title2.tsx 的 icon 包含可见文本 "Heading 2"，i18n 问题更严重——用户直接在下拉菜单中看到英文文本。

---

## 十、与同级命令的 UI 对比

| 维度 | bold (SVG) | italic (SVG) | **heading2 (文本 div)** | heading1 (文本 div) |
|---|---|---|---|---|
| 图标类型 | SVG 12×12 | SVG 12×12 | **纯文本 div** | 纯文本 div |
| `aria-label` | ✅ | ✅ | ✅ | ✅ |
| `title` | ✅ | ✅ | ✅ | ✅ |
| icon `role` | ✅ `role="img"` | ✅ `role="img"` | **❌ 无** | ❌ 无 |
| `aria-hidden` | ❌ | ❌ | ❌ | ❌ |
| 图标颜色 | `currentColor` | `currentColor` | CSS `color` 继承 | CSS `color` 继承 |
| 可 i18n 化 | ✅ 无文本 | ✅ 无文本 | **❌ 硬编码英文** | ❌ 硬编码英文 |
| 快捷键 | Ctrl+B | Ctrl+I | Ctrl+2 | Ctrl+1 |
| 交互方式 | 工具栏直接点击 | 工具栏直接点击 | **下拉菜单选择** | 下拉菜单选择 |
| 与 Carbon 一致性 | ⚠️ 风格不同 | ⚠️ 风格不同 | **❌ 根本不同** | ❌ 根本不同 |

**结论**：title2.tsx 与 title1/3-6.tsx 完全同构，与 bold/italic 等命令在图标实现上存在根本性差异。纯文本 div 图标的 i18n 问题比 SVG 图标更严重。

---

## 十一、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 修复位置 |
|---|---|---|---|---|---|
| V-01 | P2 | 视觉 | 纯文本 div 替代 SVG 图标，与 Carbon 图标体系根本性不兼容 | 工具栏视觉风格不统一 | 需修改源码或封装层替换 |
| A-01 | P2 | 无障碍 | icon div 缺少 `role="img"` 和 `aria-hidden="true"` | 屏幕阅读器可能重复播报 | 需修改源码 |
| UX-01 | P3 | 交互 | H3+ 行触发 H2 toggle off 导致错误降级（如 ### Hello → # Hello） | 用户预期不符 | headingExecute 共享逻辑 |
| UX-02 | P3 | 交互 | 快捷键提示 "ctrl" 未区分平台，macOS 应显示 ⌘ | macOS 用户困惑 | 需修改源码或封装层动态替换 |
| UX-03 | P2 | 交互 | 原生 `title` 替代 antd `<Tooltip>`，样式与 Carbon 不符 | 视觉风格割裂 | 封装层 CSS 部分缓解 |
| I18N-01 | P2 | 国际化 | aria-label / title / icon 文本全部硬编码英文 | 中文用户体验差 | 封装层动态替换 |
| V-02 | P3 | 视觉 | 纯文本图标与工具栏 SVG 图标风格不统一 | 下拉菜单视觉不连贯 | 需修改源码 |
| R-01 | P3 | 响应式 | 下拉菜单项触摸目标不足 | 移动端误触风险 | 工具栏系统性问题 |

---

## 十二、对本项目（by_geo）的 UI 建议

### 优先级 P2（建议下个迭代处理）

1. **工具栏 focus-visible 覆盖**：在 `markdown-editor.css` 中添加：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button:focus-visible {
     outline: 2px solid var(--color-primary) !important;
     outline-offset: -2px !important;
   }
   ```

2. **中文 ARIA 标注注入**：在 `MarkdownEditor.tsx` 中通过 `useEffect` 在 mount 后修改下拉菜单项的无障碍属性：
   ```tsx
   useEffect(() => {
     const menuItems = wrapperRef.current?.querySelectorAll('.w-md-editor-toolbar li button');
     menuItems?.forEach(btn => {
       const label = btn.getAttribute('aria-label');
       if (label?.includes('Heading 2')) {
         btn.setAttribute('aria-label', '插入二级标题 (Ctrl+2)');
         btn.setAttribute('title', '插入二级标题 (Ctrl+2)');
       }
     });
   }, []);
   ```

3. **评估标题图标替换可行性**：考虑在封装层通过自定义命令替换默认 heading2 命令，将纯文本图标替换为 Carbon 风格的 SVG 图标：
   ```tsx
   import { Heading } from '@carbon/icons-react';
   const customHeading2 = {
     ...heading2,
     icon: <Heading size={16} />,
     buttonProps: {
       'aria-label': '插入二级标题 (Ctrl+2)',
       title: '插入二级标题 (Ctrl+2)',
     },
   };
   ```

### 优先级 P3（可纳入技术债）

4. **下拉菜单项触摸目标增大**：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar li button {
     min-height: 36px !important;
     padding: 8px 16px !important;
   }
   ```

5. **icon 文本中文化**：如果无法替换为 SVG 图标，至少将 "Heading 2" 改为 "标题 2"（需在封装层通过自定义命令或 DOM 操作实现）

---

## 十三、评审总结

`title2.tsx` 作为 `@uiw/react-md-editor` 的标题命令定义模块，核心功能（二级标题添加/移除 toggle）实现完整、快捷键映射合理、无障碍属性齐全（`aria-label` + `title`）。

**与 bold.tsx 的核心差异**：title2.tsx 使用纯文本 `<div>` 作为图标（而非 SVG），这使得它在以下维度比 bold.tsx（4.3/10）更差：

1. **与 Carbon 图标体系完全不兼容** — 纯文本 div 不是图标，无法应用 Carbon 图标的线条描边风格
2. **i18n 问题更严重** — "Heading 2" 作为可见文本直接展示给用户，比 SVG 图标的 `aria-label` 影响面更广
3. **无障碍更差** — 纯文本 div 缺少 `role` 属性，且文本内容可能被屏幕阅读器重复播报

**正面评价**：
- `buttonProps` 设计允许外部覆盖按钮属性
- `textAlign: 'left'` 在下拉菜单中对齐合理（列表项左对齐）
- `shortcuts: 'ctrlcmd+2'` 跨平台快捷键映射正确
- 字号梯度设计（18→16→14→12→10→10）直观传达标题层级

**主要风险**：
- 纯文本图标与 Carbon/Antd 设计系统根本性不兼容（P2）
- 硬编码英文文本在中文项目中构成用户体验缺陷（P2）
- icon div 缺少无障碍属性（P2）
- 所有问题均为 `@uiw/react-md-editor` 的系统性问题（影响 title1-6.tsx 全部文件），需在封装层解决

**综合评分 3.9/10** — 比 bold.tsx (4.3/10) 低 0.4 分。主要扣分原因是纯文本 div 图标比 SVG 图标在设计系统兼容性和国际化方面更差。核心功能层面合格，但在 UI 一致性和设计系统合规性方面存在系统性差距。

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + DESIGN.md (IBM Carbon Design System) + Antd 6.x 规范 + WCAG 2.1 AA 标准*
