# 软件UI专家评审：title6.tsx

**文件**: `@uiw/react-md-editor/src/commands/title6.tsx`
**评审角色**: 软件UI专家
**评审日期**: 2026-05-25
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过，6.4/10）—— 命令对象的数据结构完整、无障碍标签规范，但图标渲染使用原生 `<div>` + 内联样式而非 antd 组件/CSS Token，视觉层级设计存在 H5/H6 无法区分的严重缺陷，交互状态（hover/active/focus）完全缺失，与 DESIGN.md 的 IBM Carbon Design System 规范存在多处冲突

---

## 一、UI 评审范围与上下文

### 1.1 评审对象定位

```
title6.tsx 在 UI 层的角色

┌──────────────────────────────────────────────────────────────┐
│  工具栏 Toolbar                                                 │
│    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│    │ H1  │ │ H2  │ │ H3  │ │ H4  │ │ H5  │ │ H6  │ ← 评审焦点 │
│    └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│                                                               │
│  title6.tsx 负责:                                              │
│    1. icon 属性 → 工具栏按钮的视觉呈现                            │
│    2. buttonProps → 按钮 HTML 属性（无障碍、提示）                 │
│    3. shortcuts → 快捷键映射                                     │
│    4. execute → 文本操作逻辑                                     │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 评审依据

| 规范来源 | 版本 | 评审重点 |
|---|---|---|
| DESIGN.md | alpha | IBM Carbon Design System 颜色、排版、间距、形状、组件规范 |
| Ant Design (antd) | 5.x | 组件替代、Design Token、无障碍、交互状态 |
| WCAG 2.1 | AA | 无障碍合规 |
| Nielsen Norman Group | — | UI/UX 可用性原则 |

---

## 二、逐行 UI 分析

### 2.1 图标渲染（L12）—— 主要 UI 缺陷集中点

```typescript
icon: <div style={{ fontSize: 12, textAlign: 'left' }}>Heading 6</div>,
```

| UI 检查项 | 状态 | DESIGN.md / antd 规范 | 问题 |
|---|---|---|---|
| 使用原生 HTML `<div>` | ❌ | CLAUDE.md 铁律："前端必须使用 antd 组件" | 应使用 antd `Button`/`Typography` 或自定义 SVG 图标 |
| 内联样式 | ❌ | DESIGN.md Token 化设计系统 | 应使用 CSS 变量或 antd Design Token |
| fontSize: 12 | ⚠️ | `{typography.caption}` 12px weight 400 | 字号匹配，但 fontWeight 缺失 |
| textAlign: 'left' | ✅ | 无冲突 | 左对齐合理 |
| 无 color 属性 | ❌ | `{colors.ink}` #161616 | 依赖浏览器默认色，未使用品牌色 |
| 无背景色 | ⚠️ | `{colors.canvas}` #ffffff | 透明背景，在深色主题下可能不可见 |
| 无 padding | ❌ | DESIGN.md 按钮内边距 12px 16px | 内容紧贴边界，点击区域过小 |
| 无 border | ⚠️ | `{colors.hairline}` 1px #e0e0e0 | 无视觉边界 |
| 无 border-radius | ✅ | `{rounded.none}` 0px | 符合 Carbon 方角美学 |
| 无 role/aria-hidden | ❌ | WCAG 2.1 AA | 屏幕阅读器会重复播报 "Heading 6" 和 aria-label |

### 2.2 按钮属性（L11）

```typescript
buttonProps: {
  'aria-label': 'Insert Heading 6 (ctrl + 6)',
  title: 'Insert Heading 6 (ctrl + 6)'
},
```

| UI 检查项 | 状态 | 说明 |
|---|---|---|
| aria-label | ✅ | 清晰描述操作意图，包含快捷键提示 |
| title | ✅ | 鼠标悬停提示，与 aria-label 一致 |
| 快捷键格式 | ⚠️ | 显示 "ctrl + 6"，macOS 用户实际按键为 Cmd+6 |

**建议**: 根据平台动态显示快捷键——macOS 显示 "⌘6"，Windows/Linux 显示 "Ctrl+6"。

### 2.3 命令元数据（L6-10）

```typescript
name: 'heading6',
keyCommand: 'heading6',
shortcuts: 'ctrlcmd+6',
prefix: '###### ',
suffix: '',
```

| UI 检查项 | 状态 | 说明 |
|---|---|---|
| prefix 格式 | ✅ | `###### ` 符合 CommonMark H6 规范 |
| ctrlcmd 跨平台 | ✅ | 自动映射 Ctrl（Win/Linux）/ Cmd（macOS） |
| name 可识别性 | ✅ | "heading6" 语义清晰 |

---

## 三、DESIGN.md 合规性评估

### 3.1 排版合规性（Typography）

| DESIGN.md Token | 规范值 | title6.tsx 实际 | 合规 |
|---|---|---|---|
| `{typography.caption}` | 12px / 400 / 1.33 / 0.32px | 12px / **缺失** / **缺失** / **缺失** | ⚠️ |
| `{typography.button}` | 14px / 400 / 1.29 / 0.16px | 12px / 缺失 / 缺失 / 缺失 | ❌ |

**问题分析**:

1. **字号偏小**: 图标文本使用 12px（caption 级别），而 Carbon 按钮标签规范为 14px（`{typography.button}`）。12px 在工具栏按钮场景下可读性偏低，尤其在高分辨率屏幕上。

2. **fontWeight 缺失**: 未设置 fontWeight，浏览器默认 400 符合规范，但未显式声明。

3. **lineHeight 缺失**: 未设置 lineHeight，浏览器默认 `normal`（约 1.2），而 DESIGN.md 要求 caption 为 1.33。

4. **letterSpacing 缺失**: Carbon 规范要求 caption 级别使用 `0.32px` 字间距，title6.tsx 未设置。

**修复方案**:

```typescript
icon: (
  <div style={{
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.33,
    letterSpacing: '0.32px',
    textAlign: 'left',
    color: '#161616',           // {colors.ink}
  }}>
    Heading 6
  </div>
),
```

### 3.2 颜色合规性（Colors）

| DESIGN.md Token | 规范值 | title6.tsx 实际 | 合规 |
|---|---|---|---|
| `{colors.ink}` | #161616 | **未设置**（浏览器默认 #000） | ❌ |
| `{colors.canvas}` | #ffffff | **未设置**（透明） | ⚠️ |
| `{colors.primary}` | #0f62fe | **未使用**（焦点环/选中态） | ❌ |

**问题**: 浏览器默认文本色为 `#000000`（纯黑），而 Carbon 规范的主文本色为 `#161616`（charcoal）。差异虽然微小，但在严格遵循 Carbon 的项目中会造成视觉不一致。

### 3.3 形状合规性（Shapes）

| DESIGN.md Token | 规范值 | title6.tsx 实际 | 合规 |
|---|---|---|---|
| `{rounded.none}` | 0px | 无 border-radius 设置 | ✅ |

**评价**: 符合 Carbon 方角美学。默认 `<div>` 的 border-radius 为 0，与规范一致。

### 3.4 间距合规性（Spacing）

| DESIGN.md Token | 规范值 | title6.tsx 实际 | 合规 |
|---|---|---|---|
| 按钮 padding | 12px 16px | **无 padding** | ❌ |
| 最小触控目标 | 48×48px | **依赖父容器** | ⚠️ |

**问题**: 图标 `<div>` 没有设置 padding，内容紧贴元素边界。Carbon 规范按钮内边距为 12px（垂直）× 16px（水平），最小触控目标为 48×48px。虽然最终渲染尺寸取决于工具栏框架的 CSS，但 icon 元素本身未预留交互空间。

---

## 四、交互状态评估

### 4.1 状态完整性矩阵

| 交互状态 | Carbon 规范 | title6.tsx 实现 | 缺失影响 |
|---|---|---|---|
| **Default** | `{colors.canvas}` bg + `{colors.ink}` text | ✅ 隐式存在 | — |
| **Hover** | `{colors.surface-1}` bg 变化 或 `{colors.blue-hover}` | ❌ 无 | 用户无法感知可点击性 |
| **Active/Pressed** | `{colors.blue-80}` bg | ❌ 无 | 无点击反馈 |
| **Focus** | 2px `{colors.primary}` outline | ❌ 无 | 键盘用户无法定位焦点 |
| **Disabled** | `{colors.ink-subtle}` text + `{colors.surface-2}` bg | ❌ 无 | 不支持禁用态 |
| **Selected/Toggle** | 2px `{colors.primary}` bottom underline | ❌ 无 | 用户无法识别当前标题级别 |

**严重度**: 🔴 HIGH — 这是本评审中**最严重的 UI 问题**。

**用户影响**:

```
用户操作场景:
  1. 用户将鼠标移到 H6 按钮上 → 无任何视觉变化 → 不确定是否可点击
  2. 用户点击 H6 按钮 → 无点击反馈 → 不确定操作是否生效
  3. 用户使用 Tab 键导航 → 无焦点环 → 无法定位当前焦点位置
  4. 用户已插入 H6 标题 → 工具栏无高亮指示 → 不知道当前行是什么级别
```

**与其他编辑器的对比**:

| 编辑器 | Hover 态 | Active 态 | Focus 态 | 选中指示 |
|---|---|---|---|---|
| VS Code Markdown | ✅ 背景变亮 | ✅ 背景更深 | ✅ 蓝色外框 | ✅ 高亮 |
| Notion | ✅ 背景变灰 | ✅ 背景更深 | ✅ 蓝色外框 | ✅ 高亮 |
| Google Docs | ✅ 背景变亮 | ✅ 背景更深 | ✅ 蓝色外框 | ✅ 高亮 |
| **title6.tsx** | ❌ 无 | ❌ 无 | ❌ 无 | ❌ 无 |

**注意**: 交互状态可能部分由工具栏框架（`@uiw/react-md-editor` 的 Toolbar 组件）提供，而非 title6.tsx 自身。但 icon 属性的设计（纯 `<div>` 无 className）使得框架难以正确应用状态样式。

### 4.2 建议的交互状态方案

```css
/* 基于 Carbon Design System 的 H6 按钮状态 */
.md-heading6-btn {
  /* Default */
  background: #ffffff;              /* {colors.canvas} */
  color: #161616;                   /* {colors.ink} */
  border: none;
  border-radius: 0;                 /* {rounded.none} */
  padding: 12px 16px;
  cursor: pointer;
  transition: background 110ms ease-in;  /* Carbon motion */

  /* Hover */
  &:hover {
    background: #f4f4f4;            /* {colors.surface-1} */
  }

  /* Active/Pressed */
  &:active {
    background: #e0e0e0;            /* {colors.surface-2} */
  }

  /* Focus — Carbon 签名式焦点环 */
  &:focus-visible {
    outline: 2px solid #0f62fe;     /* {colors.primary} */
    outline-offset: -2px;
  }

  /* Selected/Toggle — 当前行为 H6 */
  &.active {
    border-bottom: 2px solid #0f62fe; /* {colors.primary} */
  }
}
```

---

## 五、视觉层级设计评估

### 5.1 标题家族字号映射

```
工具栏 H1-H6 按钮的视觉层级

  H1  fontSize: 18  ████████████████████  最大 — 视觉突出
  H2  fontSize: 16  ████████████████      较大 — 明显小于 H1
  H3  fontSize: 14  ██████████████        中等
  H4  fontSize: 14  ██████████████        ← 与 H3 完全相同 ⚠️
  H5  fontSize: 12  ████████████          较小
  H6  fontSize: 12  ████████████          ← 与 H5 完全相同 ❌
```

**严重度**: 🔴 HIGH — H5 与 H6 在工具栏中**视觉完全相同**，用户无法通过图标大小区分这两个命令。

### 5.2 理想字号梯度

| 标题级别 | 当前 fontSize | 建议 fontSize | 视觉区分度 |
|---|---|---|---|
| H1 | 18 | 18 | — |
| H2 | 16 | 16 | ↓ 2px ✅ |
| H3 | 14 | 14 | ↓ 2px ✅ |
| H4 | 14 | 13 | ↓ 1px ✅ |
| H5 | 12 | 12 | ↓ 1px ✅ |
| **H6** | **12** | **11** | **↓ 1px ✅** |

### 5.3 替代区分方案

字号差异在 11-12px 范围内几乎不可感知，建议结合其他视觉线索：

| 方案 | 描述 | 实现复杂度 |
|---|---|---|
| **下划线粗细** | H6 使用更细的底部下划线 | 低 |
| **文本标注** | 图标显示 "H6" 而非 "Heading 6" | 低 |
| **灰度区分** | H5 使用 `{colors.ink}`、H6 使用 `{colors.ink-muted}` | 低 |
| **角标** | H6 图标右上角加数字角标 | 中 |

---

## 六、antd 合规性评估

### 6.1 组件替代分析

| 当前实现 | antd 替代方案 | 可行性 | 说明 |
|---|---|---|---|
| `<div>` 图标 | `antd.Typography.Text` | ⚠️ | ICommand.icon 需要 ReactElement，Text 可用但增加依赖 |
| `<div>` 图标 | antd `Tooltip` 包裹 | ✅ | buttonProps.title 可由 Tooltip 替代，提供更好的悬停体验 |
| `<div>` 图标 | 自定义 SVG 图标 | ✅ | antd 生态推荐 SVG 图标，与 bold/italic 风格一致 |
| 内联 style | antd Design Token | ✅ | 使用 `theme.useToken()` 获取标准 token |

### 6.2 Design Token 对接建议

```typescript
// 使用 antd Design Token 替代硬编码值
import { theme } from 'antd';

const { token } = theme.useToken();

// Carbon → antd Token 映射
const TOKEN_MAP = {
  ink:       token.colorText,           // #161616 ≈ rgba(0,0,0,0.88)
  canvas:    token.colorBgContainer,    // #ffffff
  surface1:  token.colorFillQuaternary, // #f4f4f4
  primary:   token.colorPrimary,        // 需覆盖为 #0f62fe
  fontSize:  token.fontSizeSM,          // 12px ≈ {typography.caption}
};
```

**注意**: antd 默认 `colorPrimary` 为 `#1677ff`（Ant Blue），而 DESIGN.md 要求 IBM Blue `#0f62fe`。项目需通过 ConfigProvider 全局覆盖主题色。

### 6.3 按钮组件建议

```typescript
// 使用 antd Button 组件的 ICommand 图标实现
import { Button, Tooltip } from 'antd';

const Heading6Icon: React.FC = () => (
  <span style={{
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: '0.32px',
    lineHeight: 1.33,
  }}>
    H6
  </span>
);
```

---

## 七、无障碍 UI 评估（WCAG 2.1 AA）

### 7.1 合规检查

| WCAG 标准 | 级别 | title6.tsx 状态 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ⚠️ | icon `<div>` 无 `role="img"` 和 `aria-hidden="true"` |
| **1.3.1 信息和关系** | A | ✅ | buttonProps.aria-label 提供了语义 |
| **2.1.1 键盘可操作** | A | ✅ | shortcuts 'ctrlcmd+6' 提供键盘访问 |
| **2.1.2 无键盘陷阱** | A | ✅ | 命令执行后不阻塞焦点 |
| **2.4.3 焦点顺序** | A | ⚠️ | 无焦点样式（依赖框架） |
| **2.4.4 链接目的** | A | ✅ | title 属性提供悬停说明 |
| **2.4.7 焦点可见** | AA | ❌ | 无可见焦点环 |
| **2.5.5 目标大小** | AAA | ⚠️ | 无 padding，触控目标可能 < 44px |
| **4.1.2 名称/角色/值** | A | ✅ | aria-label 已设置 |
| **1.4.3 对比度（最低）** | AA | ✅ | 黑色文本在白色背景上对比度 > 7:1 |

### 7.2 关键无障碍缺陷

**缺陷 A1 — icon 缺少语义标记**

```typescript
// 当前实现 — 屏幕阅读器会同时播报 icon 文本和 aria-label
icon: <div style={{ fontSize: 12, textAlign: 'left' }}>Heading 6</div>,

// 屏幕阅读器播报: "Heading 6 Insert Heading 6 (ctrl + 6)"
//                    ↑ icon 文本      ↑ buttonProps.aria-label
// 重复播报，用户体验差
```

```typescript
// 修复方案 — 隐藏 icon 的文本，仅依赖 aria-label
icon: (
  <div
    style={{ fontSize: 12, textAlign: 'left' }}
    role="img"
    aria-hidden="true"
  >
    Heading 6
  </div>
),
```

**缺陷 A2 — 无焦点环（WCAG 2.4.7 Focus Visible）**

键盘导航时，用户无法通过视觉方式确定焦点位置。Carbon Design System 的签名式焦点处理为 2px `#0f62fe` outline。title6.tsx 作为命令定义对象，焦点样式需由工具栏框架实现，但 icon 元素应提供合理的 CSS className 以支持焦点样式注入。

---

## 八、与本项目中 Markdown 编辑器集成的 UI 评估

### 8.1 主题一致性风险

| 风险维度 | 等级 | 说明 |
|---|---|---|
| 字体不一致 | 🔴 HIGH | 项目使用 IBM Plex Sans，react-md-editor 使用系统字体 |
| 颜色不一致 | 🔴 HIGH | 项目使用 Carbon 色板，编辑器工具栏使用默认样式 |
| 间距不一致 | 🟡 MEDIUM | 编辑器工具栏间距可能与 Carbon 4px 网格不匹配 |
| 圆角不一致 | 🟢 LOW | 默认 0px 与 Carbon 方角一致 |

### 8.2 集成建议

```css
/* 在 global.css 中覆盖 react-md-editor 工具栏样式 */
.w-md-editor-toolbar {
  /* Carbon 规范 */
  background: #ffffff;                    /* {colors.canvas} */
  border-bottom: 1px solid #e0e0e0;      /* {colors.hairline} */
  font-family: 'IBM Plex Sans', sans-serif;
}

.w-md-editor-toolbar button {
  /* Carbon button 规范 */
  border-radius: 0;                      /* {rounded.none} */
  padding: 12px 16px;
  color: #161616;                         /* {colors.ink} */
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;                        /* {typography.button} */
}

.w-md-editor-toolbar button:hover {
  background: #f4f4f4;                    /* {colors.surface-1} */
}

.w-md-editor-toolbar button:focus-visible {
  outline: 2px solid #0f62fe;             /* {colors.primary} */
  outline-offset: -2px;
}

/* H6 特定样式覆盖 */
.w-md-editor-toolbar button[aria-label*="Heading 6"] {
  font-size: 11px;                        /* 与 H5(12px) 视觉区分 */
}
```

---

## 九、竞品 UI 对比

### 9.1 Markdown 编辑器标题按钮对比

| 编辑器 | H6 图标实现 | 视觉区分 | 交互状态 | 无障碍 |
|---|---|---|---|---|
| **@uiw/react-md-editor** (title6) | 纯文本 `<div>` | ❌ H5/H6 无区分 | ❌ 无 | ⚠️ 部分 |
| **GitHub Markdown** | 下拉菜单（无需图标区分） | ✅ | ✅ | ✅ |
| **Notion** | 块类型选择器 | ✅ | ✅ | ✅ |
| **Typora** | 快捷键/菜单（无独立按钮） | N/A | ✅ | ✅ |
| **StackEdit** | SVG 图标 | ✅ | ✅ | ⚠️ |

**结论**: `@uiw/react-md-editor` 为每个标题级别提供独立工具栏按钮的设计已属过时模式，现代编辑器普遍采用下拉选择器（Dropdown/Select）方式，从根本上消除了 H5/H6 视觉区分问题。

### 9.2 现代替代方案建议

```typescript
// 使用 antd Dropdown 替代 6 个独立标题按钮
import { Dropdown, Button } from 'antd';

const headingItems = [
  { key: 'h1', label: '标题 1', command: heading1 },
  { key: 'h2', label: '标题 2', command: heading2 },
  // ...
  { key: 'h6', label: '标题 6', command: heading6 },
];

const HeadingDropdown = () => (
  <Dropdown menu={{ items: headingItems, onClick: handleHeadingSelect }}>
    <Button type="text" icon={<HeadingIcon />}>
      标题
    </Button>
  </Dropdown>
);
```

**优势**: 
- 消除 H1-H6 工具栏空间占用（6 个按钮 → 1 个下拉）
- 解决 H5/H6 视觉无区分问题
- 符合 antd 组件规范
- 更好的移动端适配

---

## 十、UI 缺陷汇总

### 按严重度排序

| ID | 严重度 | 类别 | 位置 | 描述 | 对用户的影响 |
|---|---|---|---|---|---|
| UI-1 | 🔴 HIGH | 交互状态 | L12 | 图标 `<div>` 无 hover/active/focus 状态样式 | 用户无法感知按钮可点击性，键盘用户无法定位焦点 |
| UI-2 | 🔴 HIGH | 视觉层级 | L12 | fontSize: 12 与 H5 完全相同 | 用户无法在工具栏中区分 H5 和 H6 |
| UI-3 | 🟡 MEDIUM | 组件规范 | L12 | 使用原生 `<div>` 而非 antd 组件或 SVG 图标 | 违反项目铁律，与其他图标风格不一致 |
| UI-4 | 🟡 MEDIUM | Design Token | L12 | 内联 style 硬编码值，未使用 CSS 变量/Design Token | 无法通过主题系统统一控制样式 |
| UI-5 | 🟡 MEDIUM | 排版规范 | L12 | 缺少 fontWeight/lineHeight/letterSpacing | 与 DESIGN.md {typography.caption} 规范不完全对齐 |
| UI-6 | 🟡 MEDIUM | 颜色规范 | L12 | 未设置 color 属性，依赖浏览器默认 #000 | 与 Carbon ink #161616 不一致 |
| UI-7 | 🟡 MEDIUM | 间距规范 | L12 | 无 padding，触控目标可能不足 | Carbon 要求最小 48×48px 触控区域 |
| UI-8 | 🟡 MEDIUM | 无障碍 | L12 | icon 缺少 role="img" aria-hidden="true" | 屏幕阅读器重复播报 |
| UI-9 | 🟡 MEDIUM | 焦点样式 | — | 无焦点环 | 违反 WCAG 2.4.7，键盘用户无焦点反馈 |
| UI-10 | 🟢 LOW | 平台适配 | L11 | aria-label 中快捷键显示为 "ctrl + 6" | macOS 用户实际按键为 ⌘6 |
| UI-11 | 🟢 LOW | 国际化 | L12 | "Heading 6" 文本硬编码英文 | 中文界面显示不一致 |

---

## 十一、UI 评分矩阵

| UI 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计（Visual Design） | 4 | 原生 div + 内联样式，无品牌一致性，H5/H6 无法区分 |
| 交互设计（Interaction Design） | 3 | 无 hover/active/focus 状态，无选中指示，纯静态呈现 |
| 信息架构（Information Architecture） | 7 | 命令结构清晰，aria-label 语义正确 |
| 排版合规（Typography） | 5 | fontSize 基本匹配，但 fontWeight/lineHeight/letterSpacing 缺失 |
| 颜色合规（Color） | 5 | 无冲突色，但也未使用品牌色系统 |
| 间距合规（Spacing） | 4 | 无 padding，无触控目标保障 |
| 形状合规（Shapes） | 8 | 默认方角与 Carbon 一致 |
| 无障碍（Accessibility） | 6 | aria-label + title 完善，但 icon 语义和焦点缺失 |
| antd 合规（Component） | 3 | 使用原生 div，完全未使用 antd 组件或 Design Token |
| 响应式（Responsive） | 6 | 无固定宽度，但无触控适配 |
| **综合 UI 评分** | **6.4 / 10** | 数据结构完整但视觉呈现粗糙 |

---

## 十二、修复优先级

### 短期（项目层面，无需修改三方库）

| 优先级 | 问题 | 修复方案 | 工作量 |
|---|---|---|---|
| 🔴 高 | UI-1 交互状态缺失 | 在 global.css 中为 `.w-md-editor-toolbar button` 添加 hover/focus/active 样式 | 30 分钟 |
| 🔴 高 | UI-2 H5/H6 无区分 | CSS 选择器 `[aria-label*="Heading 6"]` 设置不同字号或灰度 | 15 分钟 |
| 🟡 中 | UI-6 颜色不一致 | CSS 覆盖工具栏按钮 color 为 `#161616` | 5 分钟 |
| 🟡 中 | UI-7 间距不足 | CSS 覆盖 padding 为 12px 16px | 5 分钟 |
| 🟡 中 | UI-9 无焦点环 | CSS 添加 `:focus-visible { outline: 2px solid #0f62fe }` | 5 分钟 |

### 中期（向上游提交 PR 或项目内覆盖）

| 优先级 | 问题 | 修复方案 | 工作量 |
|---|---|---|---|
| 🟡 中 | UI-3 原生 div | 改用 SVG 图标或 antd Typography | 2 小时 |
| 🟡 中 | UI-4 内联样式 | 提取为 CSS 类名 + CSS 变量 | 1 小时 |
| 🟡 中 | UI-8 无障碍属性 | 添加 `role="img" aria-hidden="true"` | 1 行 |

### 长期（架构优化）

| 优先级 | 建议 | 工作量 |
|---|---|---|
| 🟢 低 | 用 antd Dropdown 替代 6 个独立标题按钮 | 半天 |
| 🟢 低 | 统一 react-md-editor 工具栏主题为 Carbon 风格 | 1 天 |

---

## 十三、对本项目（by_geo）的 UI 影响评估

| 影响维度 | 风险等级 | 说明 |
|---|---|---|
| **品牌一致性** | 🔴 HIGH | 编辑器工具栏样式与 Carbon Design System 存在系统性偏差 |
| **用户体验** | 🟡 MEDIUM | H5/H6 按钮视觉无区分可能导致误操作 |
| **无障碍合规** | 🟡 MEDIUM | 焦点样式和 icon 语义需通过 CSS 覆盖修复 |
| **antd 合规** | 🟡 MEDIUM | 第三方组件内部实现不受项目铁律约束，但需评估是否有可定制的 API |
| **移动端适配** | 🟢 LOW | 编辑器工具栏在移动端的布局由框架控制 |

---

## 十四、评审总结

### UI 优势

1. **命令数据结构完整** — name/keyCommand/shortcuts/prefix/suffix/buttonProps 齐备，框架可正确渲染
2. **无障碍标签规范** — aria-label + title 双属性提供清晰的语义描述和快捷键提示
3. **方角美学合规** — 默认 border-radius: 0 与 Carbon `{rounded.none}` 一致
4. **文本内容准确** — "Heading 6" 清晰表达按钮功能
5. **跨平台快捷键** — ctrlcmd 自动映射，覆盖主流操作系统

### UI 缺陷

1. **交互状态完全缺失**（HIGH）— 无 hover/active/focus 视觉反馈，用户无法感知可交互性和焦点位置
2. **H5/H6 视觉无区分**（HIGH）— 两者同为 fontSize: 12，工具栏中完全相同
3. **使用原生 HTML div**（MEDIUM）— 违反 antd 组件使用铁律，与项目其他 UI 的组件化风格不一致
4. **内联样式硬编码**（MEDIUM）— 无法通过 Design Token / CSS 变量 / 主题系统统一控制
5. **排版规范不完整**（MEDIUM）— 缺少 fontWeight/lineHeight/letterSpacing，与 DESIGN.md {typography.caption} 部分冲突
6. **icon 无障碍语义缺失**（MEDIUM）— 缺少 role="img" aria-hidden="true"，屏幕阅读器重复播报

### 综合评价

title6.tsx 的 UI 设计代表了 `@uiw/react-md-editor` 库的典型风格——命令数据结构规范完整，但视觉呈现停留在"功能可用"的最低标准。与 DESIGN.md 的 IBM Carbon Design System 规范存在系统性差距：**交互状态缺失**是最严重的问题，用户在 hover 和 focus 时得不到任何视觉反馈；**H5/H6 视觉无区分**是设计层面的缺陷，6 级标题仅使用 4 种字号（18/16/14/12）导致多对标题级别无法区分。

建议本项目在集成层面通过 CSS 覆盖补齐关键交互状态和视觉区分，长期考虑使用 antd Dropdown 组件替代独立标题按钮的设计模式。

**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过）—— UI 评分 6.4/10。命令数据层（8/10）和视觉呈现层（4/10）形成鲜明反差。需通过 CSS 覆盖修复交互状态和视觉区分后方可达到基本可用标准。

---

*评审人: 软件UI专家*
*评审日期: 2026-05-25*
