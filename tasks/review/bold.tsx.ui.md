# 软件 UI 专家评审：bold.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/bold.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · Antd 规范 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-24
**代码行数**: 33 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"加粗"工具栏命令，定义图标、快捷键、ARIA 属性及文本包裹逻辑
**评审结论**: ⚠️ CONDITIONAL APPROVE — 功能完整且无障碍基础优于同级命令，但存在 5 项 UI/UX 问题（2 项 P2 + 3 项 P3），需在封装层修复

**问题统计**: P1 × 0 / P2 × 2 / P3 × 3

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器的"加粗"命令（`**文本**`），供工具栏按钮和快捷键调用 |
| 代码行数 | 33 行 |
| 设计模式 | 命令模式（`ICommand` 接口实现） |
| UI 相关输出 | 1 个 SVG 图标 + 1 组按钮属性（aria-label / title） |
| 用户交互路径 | 工具栏按钮点击 → `execute()` / Ctrl+B 快捷键 → `execute()` |
| 依赖 | `selectWord`、`executeCommand`（纯文本运算）、`TextAreaTextApi`（DOM 操作） |

### 源码结构

```tsx
export const bold: ICommand = {
  name: 'bold',                    // 命令标识
  keyCommand: 'bold',              // 命令类型
  shortcuts: 'ctrlcmd+b',          // 快捷键绑定
  prefix: '**',                    // Markdown 加粗标记
  buttonProps: {                    // 工具栏按钮属性
    'aria-label': 'Add bold text (ctrl + b)',
    title: 'Add bold text (ctrl + b)'
  },
  icon: (                           // 12×12 SVG 图标（FontAwesome bold）
    <svg role="img" width="12" height="12" viewBox="0 0 384 512">
      <path fill="currentColor" d="M304.793..." />
    </svg>
  ),
  execute: (state, api) => {        // 命令执行逻辑
    selectWord → setSelectionRange → executeCommand
  }
};
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 3 | SVG 图标硬编码尺寸（12×12）偏小，无颜色/圆角/间距 Carbon 适配 |
| 交互体验（UX） | 7 | 快捷键 + 工具栏双入口，选中文本自动包裹逻辑完整 |
| 无障碍（a11y） | 8 | 有 `aria-label`、`title`、`role="img"`，优于同级命令（italic/strikethrough 等） |
| Antd 规范合规 | 2 | 使用原生 SVG + `<button>`，未使用 antd `<Button>` 或 `<Tooltip>` |
| 响应式行为 | 3 | 图标 12×12 在移动端触摸目标不足，无响应式适配 |
| 国际化（i18n） | 2 | 硬编码英文文本（aria-label / title），无 i18n 支持 |
| 图标设计 | 5 | FontAwesome 经典图标可识别，但与 antd/Carbon 图标风格不一致 |
| **综合评分** | **4.3 / 10** | |

---

## 三、DESIGN.md 合规性详细分析

### 3.1 图标尺寸与 Carbon 规范

**DESIGN.md 要求**：
- 工具栏按钮高度 48px（触摸目标）
- 图标在按钮内居中，按钮 padding 12px 16px
- 最小交互区域 32px（桌面）/ 48px（触摸）

**实际行为**：

```tsx
// 第 12 行 — SVG 硬编码 12×12
<svg role="img" width="12" height="12" viewBox="0 0 384 512">
```

| 属性 | DESIGN.md 规范 | bold.tsx 实际值 | 差距 | 本项目覆盖 |
|---|---|---|---|---|
| SVG 尺寸 | ≥16px（Carbon 最小图标） | 12×12 | -4px | ✅ CSS 缩放覆盖 |
| 图标颜色 | `currentColor`（可继承） | `currentColor` | ✅ 一致 | — |
| 按钮尺寸 | 32px（桌面）/ 48px（触摸） | ~20px（工具栏默认） | -12px | ✅ CSS 覆盖至 36px |
| 按钮圆角 | `rounded.none` 0px | 2px（默认） | +2px | ✅ CSS 覆盖为 0 |
| 按钮内边距 | 12px 16px | ~4px | 严重不足 | ✅ CSS 覆盖 |

**问题 V-01 — 图标尺寸偏小**（P3）：

12×12 的图标在 32px 按钮中仅占 37.5% 面积，视觉比重不足。Carbon 图标规范建议 16×16 或 20×20。本项目 CSS 通过 `transform: scale(1.2)` 放大了图标，但更好的做法是在 SVG 上设置 `width="16" height="16"`。

### 3.2 颜色体系

**DESIGN.md 要求**：IBM Blue (#0f62fe) 为唯一品牌色，Charcoal (#161616) 文字，无阴影。

**实际行为**：

| 元素 | DESIGN.md 规范 | bold.tsx / 工具栏默认值 | 合规 |
|---|---|---|---|
| 图标填充色 | `currentColor` → Ink (#161616) | `currentColor` → 系统默认 | ⚠️ 需父级 CSS 设置 `color` |
| 按钮 hover 背景 | Surface-1 (#f4f4f4) | GitHub 灰 (#f3f4f6) | ⚠️ 近似但非 Carbon |
| 按钮 active 背景 | Blue-80 (#002d9c) | GitHub 蓝 (#0969da) | ❌ 非 IBM Blue |
| 按钮 focus | 2px IBM Blue outline | 浏览器默认 | ❌ 无 Carbon focus ring |

**`fill="currentColor"` 分析**（第 14 行）：

使用 `currentColor` 是正确的做法——图标颜色继承父元素 `color` 属性。这意味着本项目可以通过 CSS 设置 `.w-md-editor-toolbar button { color: var(--color-ink) }` 来控制图标颜色。本项目已在 `markdown-editor.css` 中实现此覆盖。

### 3.3 圆角体系

**DESIGN.md 要求**：`rounded.none` (0px) 为默认。

**实际行为**：工具栏按钮默认 `border-radius: 2px`。本项目已覆盖为 0px。SVG 图标本身无圆角概念（矢量路径），不涉及此问题。

### 3.4 排版体系

**DESIGN.md 要求**：IBM Plex Sans，button token 14px/400/1.29。

**实际行为**：`bold.tsx` 不涉及文字渲染（纯图标按钮），但 `title` 和 `aria-label` 的文本由浏览器渲染为 tooltip，使用系统字体。这在 Carbon 规范下不可控且不构成违规。

---

## 四、交互体验（UX）评审

### 4.1 命令执行流程

```
用户操作路径：
┌──────────────────────────────────────────────────────┐
│  路径 A: 工具栏点击                                    │
│  用户点击 [B] 按钮 → onClick → command.execute()      │
│     → selectWord(): 扩展选区到完整单词边界             │
│     → setSelectionRange(): 更新 DOM 选区               │
│     → executeCommand(): 包裹/解包裹 ** 前后缀          │
│                                                        │
│  路径 B: 快捷键 Ctrl+B                                │
│  用户按 Ctrl+B → keydown handler → command.execute()  │
│     → 同上                                             │
│                                                        │
│  路径 C: 无选区时按 Ctrl+B                             │
│  光标在单词中间 → selectWord 自动扩展到单词边界         │
│     → 包裹整个单词                                     │
│                                                        │
│  路径 D: 已加粗文本上按 Ctrl/B                         │
│  选区已包含 ** 前后缀 → executeCommand 解包裹          │
│     → 移除 ** 前后缀（toggle 行为）                    │
└──────────────────────────────────────────────────────┘
```

**UX 评价**：

| 维度 | 评分 | 说明 |
|---|---|---|
| Toggle 行为 | ✅ 优秀 | 加粗/取消加粗双向切换，符合用户心智模型 |
| 智能选词 | ✅ 良好 | `selectWord` 自动扩展到单词边界，用户无需精确选中 |
| 操作可发现性 | ✅ 良好 | `title` 属性显示快捷键提示（"ctrl + b"） |
| 操作反馈 | ⚠️ 一般 | 无视觉反馈（如短暂的按钮高亮或文本变化动画） |

### 4.2 快捷键设计

```tsx
shortcuts: 'ctrlcmd+b',
```

**分析**：

| 维度 | 评价 |
|---|---|
| 按键选择 | ✅ Ctrl+B 是业界标准（Word/Google Docs/GitHub 全部使用） |
| 跨平台 | ✅ `ctrlcmd` 自动映射为 macOS ⌘B / Windows/Linux Ctrl+B |
| 冲突风险 | ✅ 无浏览器默认 Ctrl+B 行为冲突（浏览器 Ctrl+B 是收藏栏，但 textarea 中不触发） |
| 提示文案 | ⚠️ `title` 显示 "ctrl + b"，macOS 用户看到应为 ⌘B |

**问题 UX-01 — 快捷键提示未区分平台**（P3）：

`title: 'Add bold text (ctrl + b)'` 硬编码 "ctrl"，macOS 用户实际使用 ⌘B。业界最佳实践是根据 `navigator.platform` 动态显示对应修饰键符号。

### 4.3 工具提示（Tooltip）

```tsx
buttonProps: { 'aria-label': 'Add bold text (ctrl + b)', title: 'Add bold text (ctrl + b)' },
```

**DESIGN.md / Antd 规范对比**：

| 维度 | Antd 规范 | bold.tsx 实现 | 评价 |
|---|---|---|---|
| Tooltip 组件 | `<Tooltip>` — 支持主题/延迟/箭头 | 原生 `title` 属性 | ❌ 无样式控制 |
| Tooltip 延迟 | `mouseEnterDelay: 0.1s` | 浏览器默认（~0.5s） | ⚠️ 偏慢 |
| Tooltip 样式 | Carbon 排版（14px / Ink 色） | 系统默认（小字 / 黄底黑字） | ❌ 不符合 Carbon |
| Tooltip 方向 | 可配置（top/right/bottom/left） | 浏览器决定（通常 bottom） | ⚠️ 不可控 |
| Tooltip 动画 | antd 内置渐显 | 无动画 | ⚠️ 生硬 |

**问题 UX-02 — 原生 title 替代 antd Tooltip**（P2）：

原生 `title` 属性产生的工具提示与 Carbon/Antd 设计系统完全不符：
1. 黄色背景 + 小字号 + 系统字体 = 视觉上与 Carbon 排版割裂
2. 延迟不可控（浏览器默认 0.5s vs Carbon 建议即时）
3. 无法应用 IBM Plex Sans 字体

但由于这是第三方库内部实现，本项目无法在不修改源码的情况下替换为 `<Tooltip>`。建议在封装层通过 CSS 覆盖浏览器 tooltip 样式（极有限），或通过 rehypeRewrite 替换按钮属性。

---

## 五、无障碍（a11y）评审

### 5.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ✅ | SVG 有 `role="img"`，按钮有 `aria-label` |
| **2.1.1 键盘可操作** | A | ✅ | Ctrl+B 快捷键 + Tab 到按钮后 Enter 触发 |
| **2.4.6 标题和标签** | AA | ⚠️ | `aria-label` 为英文，中文用户场景下不够友好 |
| **2.4.7 焦点可见** | AA | ❌ | 按钮无自定义 focus ring（继承工具栏问题） |
| **2.5.5 目标尺寸** | AAA | ❌ | 按钮实际触摸目标 ~20×20px，远低于 44×44px AAA 要求 |
| **4.1.2 名称、角色、值** | A | ✅ | `aria-label` 提供了可访问名称 |

### 5.2 无障碍优势（对比同级命令）

`bold.tsx` 在 `buttonProps` 中提供了 `aria-label` 和 `title`，这在 `@uiw/react-md-editor` 的命令中属于最佳实践。对比其他命令：

| 命令 | `aria-label` | `title` | `role` on SVG | 无障碍评级 |
|---|---|---|---|---|
| **bold** | ✅ "Add bold text (ctrl + b)" | ✅ | ✅ `role="img"` | A |
| italic | ✅ | ✅ | ✅ `role="img"` | A |
| strikethrough | ✅ | ✅ | ✅ `role="img"` | A |
| link | ✅ | ✅ | ✅ `role="img"` | A |

**注**：所有内置命令均提供了 `aria-label`，这是库的优点。但 `bold.tsx` 的 SVG 额外设置了 `role="img"`，这是正确的无障碍实践——告诉屏幕阅读器该 SVG 是装饰性图像，`aria-label` 在按钮层面提供语义。

### 5.3 无障碍问题

**问题 A-01 — 焦点环缺失**（P2）：

工具栏按钮的 focus 样式完全依赖浏览器默认（通常是 1px 蓝色 outline）。Carbon 签名式焦点处理要求 2px IBM Blue outline + 1px Charcoal underline。本项目 `markdown-editor.css` 中缺少 `button:focus-visible` 规则。

**修复建议**：
```css
.markdown-editor-wrapper .w-md-editor-toolbar button:focus-visible {
  outline: 2px solid var(--color-primary) !important;
  outline-offset: -2px !important;
}
```

---

## 六、Antd 规范合规性评审

### 6.1 组件使用合规性

**CLAUDE.md 铁律**：前端必须使用 Ant Design (antd) 组件，禁止使用原生 HTML 元素替代 antd 提供的组件。

| bold.tsx 元素 | antd 等价组件 | 合规 | 说明 |
|---|---|---|---|
| `<svg>` (图标) | `@ant-design/icons` | ❌ | 第三方库内部，使用 FontAwesome SVG |
| `<button>` (隐含) | `<Button>` / `<Tooltip>` | ❌ | 第三方库内部渲染 |
| `title` (工具提示) | `<Tooltip>` | ❌ | 原生 title，非 antd Tooltip |
| `aria-label` (可访问名称) | — | ✅ | 非组件层面问题 |

**UI 专家意见**：上述违规属于**第三方库 `@uiw/react-md-editor` 的内部实现**，本项目无法在不 fork 库的情况下替换。铁律的意图是禁止本项目的自定义代码使用原生 HTML 替代 antd，而非要求覆盖第三方库的内部 DOM。`bold.tsx` 作为第三方库源码，此项不计入本项目的违规。

### 6.2 antd Token 映射分析

| Token | antd 默认值 | bold.tsx 产出 | Carbon 期望值 | 差距 |
|---|---|---|---|---|
| `colorPrimary` | #1677ff | 系统继承色 | #0f62fe | ✅ 父级 CSS 已覆盖 |
| `colorText` | rgba(0,0,0,0.88) | `currentColor` | #161616 | ✅ 父级 CSS 已覆盖 |
| `borderRadius` | 6px | 2px（默认） | 0px | ✅ CSS 已覆盖 |
| `controlHeight` | 32px | ~20px | 32–48px | ✅ CSS 已覆盖至 36px |
| `fontSizeIcon` | 14px | 12px（SVG width） | 16px | ⚠️ CSS 缩放至 ~14px |

---

## 七、SVG 图标设计评审

### 7.1 图标来源与风格

```tsx
// 第 11-18 行 — FontAwesome Solid "bold" 图标
<svg role="img" width="12" height="12" viewBox="0 0 384 512">
  <path
    fill="currentColor"
    d="M304.793 243.891c33.639-18.537 53.657-54.16 53.657-95.693..." // FontAwesome bold
  />
</svg>
```

**风格对比**：

| 维度 | FontAwesome (bold.tsx) | Ant Design Icons | Carbon Icons |
|---|---|---|---|
| 风格 | Solid（实心） | Outlined（线框）/ Filled | Outline（线框） |
| 粗细 | 重（实心填充） | 中（1.5px 描边） | 轻（1px 描边） |
| 比例 | 传统排版风格 | 几何简化 | 极简线条 |
| 识别度 | ✅ 高（经典 B 字形） | ✅ 高 | ✅ 高 |
| 与 Carbon 一致性 | ❌ 实心风格偏重 | ⚠️ 较接近 | ✅ 完美匹配 |

**问题 V-02 — 图标风格与 Carbon/Antd 不一致**（P3）：

FontAwesome Solid 实心风格与 Carbon Design System 的极简线条图标风格存在视觉冲突。Carbon 图标库中也有 bold 图标（`text-bold`），但使用的是 1px 描边风格。在工具栏中，Bold 按钮的实心 B 字形与相邻的斜体/删除线按钮在视觉比重上可能不均衡。

**影响**：视觉风格不一致，但不影响功能识别。本项目无法在不修改源码的情况下替换图标（SVG 在 JS 对象中硬编码）。

### 7.2 SVG 属性分析

| 属性 | 值 | 评价 |
|---|---|---|
| `role="img"` | ✅ | 正确——告诉屏幕阅读器这是图像 |
| `width="12" height="12"` | ⚠️ | 偏小，Carbon 建议最小 16px |
| `viewBox="0 0 384 512"` | ✅ | 正确——宽高比约 3:4，与 FontAwesome 原始比例一致 |
| `fill="currentColor"` | ✅ | 最佳实践——颜色继承父元素，可主题化 |
| `aria-hidden` | ❌ 缺失 | 建议添加 `aria-hidden="true"`——`aria-label` 已在按钮层面提供语义，SVG 本身应隐藏 |

**问题 A-02 — SVG 缺少 `aria-hidden="true"`**（P3）：

当按钮已有 `aria-label` 时，内部 SVG 应设置 `aria-hidden="true"` 以防止屏幕阅读器重复播报。当前实现中，`role="img"` 但无 `aria-label`（SVG 层面），屏幕阅读器可能尝试描述 SVG 内容但找不到文本。虽然在按钮层面的 `aria-label` 通常覆盖内部内容，但添加 `aria-hidden` 是更严谨的做法。

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

本项目 CSS 覆盖后工具栏最小高度 36px，按钮区域仍远低于 48px 触摸目标。这是 `@uiw/react-md-editor` 工具栏的系统性问题，非 `bold.tsx` 独有。在移动端，所有工具栏按钮都存在误触风险。

### 8.2 快捷键移动端可用性

`ctrlcmd+b` 快捷键在移动端不可用（无物理键盘）。移动端用户只能通过工具栏按钮触发加粗。但工具栏按钮在移动端触摸目标不足（见 R-01），且工具栏可能溢出屏幕。

---

## 九、国际化（i18n）评审

### 9.1 硬编码文本

```tsx
// 第 10 行
buttonProps: {
  'aria-label': 'Add bold text (ctrl + b)',  // 英文硬编码
  title: 'Add bold text (ctrl + b)',          // 英文硬编码
},
```

**问题 I18N-01 — 硬编码英文文本**（P2）：

| 文本 | 当前值 | 中文期望值 |
|---|---|---|
| `aria-label` | "Add bold text (ctrl + b)" | "添加加粗文本 (Ctrl+B)" |
| `title` | "Add bold text (ctrl + b)" | "添加加粗文本 (Ctrl+B)" |

**影响**：
1. **中文用户**：鼠标悬停显示英文提示，降低可发现性
2. **屏幕阅读器用户**：中文 TTS 需播报英文 "Add bold text"，语音不自然
3. **品牌一致性**：本项目 UI 语言为中文，工具栏提示应为中文

**修复路径**：本项目可通过 `MarkdownEditor.tsx` 封装层注入自定义命令替换默认 `bold` 命令，或通过 `useEffect` 在 mount 后修改按钮的 `aria-label` 和 `title` 属性。

---

## 十、与同级命令的 UI 对比

| 维度 | bold | italic | strikethrough | link | code |
|---|---|---|---|---|---|
| SVG 尺寸 | 12×12 | 12×12 | 12×12 | 12×12 | 12×12 |
| `aria-label` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `role="img"` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `fill="currentColor"` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `aria-hidden` | ❌ | ❌ | ❌ | ❌ | ❌ |
| 快捷键 | Ctrl+B | Ctrl+I | — | Ctrl+K | — |
| `prefix` | `**` | `*` | `~~` | `[` | `` ` `` |

**结论**：`bold.tsx` 与同级命令的结构完全一致，所有 UI 问题均为**系统性问题**，影响全部工具栏命令。

---

## 十一、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 修复位置 |
|---|---|---|---|---|---|
| UX-01 | P3 | 交互 | 快捷键提示 "ctrl" 未区分平台，macOS 应显示 ⌘ | macOS 用户困惑 | 需修改源码或封装层动态替换 |
| UX-02 | P2 | 交互 | 原生 `title` 替代 antd `<Tooltip>`，样式与 Carbon 不符 | 视觉风格割裂 | 封装层 CSS 部分缓解 |
| A-01 | P2 | 无障碍 | 工具栏按钮无 Carbon focus ring（2px IBM Blue outline） | 键盘用户无法辨识焦点 | `markdown-editor.css` 添加 `:focus-visible` |
| A-02 | P3 | 无障碍 | SVG 缺少 `aria-hidden="true"` | 屏幕阅读器可能重复播报 | 需修改源码 |
| V-01 | P3 | 视觉 | 图标 12×12 偏小，Carbon 建议最小 16px | 图标视觉比重不足 | 本项目 CSS 已缩放 |
| V-02 | P3 | 视觉 | FontAwesome 实心风格与 Carbon 线条风格不一致 | 工具栏视觉风格不统一 | 需修改源码替换图标 |
| R-01 | P3 | 响应式 | 触摸目标不足（36×24px vs 48×48px） | 移动端误触风险 | 工具栏系统性问题 |
| I18N-01 | P2 | 国际化 | aria-label / title 硬编码英文 | 中文用户体验差 | 封装层动态替换 |

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

2. **中文 ARIA 标注注入**：在 `MarkdownEditor.tsx` 中通过 `useEffect` 在 mount 后修改工具栏按钮的无障碍属性：
   ```tsx
   useEffect(() => {
     const buttons = wrapperRef.current?.querySelectorAll('.w-md-editor-toolbar button');
     buttons?.forEach(btn => {
       const label = btn.getAttribute('aria-label');
       if (label?.includes('bold')) {
         btn.setAttribute('aria-label', '添加加粗文本 (Ctrl+B)');
         btn.setAttribute('title', '添加加粗文本 (Ctrl+B)');
       }
     });
   }, []);
   ```

### 优先级 P3（可纳入技术债）

3. **图标尺寸优化**：通过 CSS 将 SVG 图标统一放大至 16px：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button svg {
     width: 16px !important;
     height: 16px !important;
   }
   ```

4. **触摸目标增大**：将工具栏按钮最小尺寸提升至 44×44px（满足 WCAG AAA 目标尺寸要求）：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button {
     min-width: 44px !important;
     min-height: 44px !important;
   }
   ```

5. **Tooltip 升级**：评估是否可在封装层用 antd `<Tooltip>` 包裹工具栏按钮，替代原生 `title`

---

## 十三、评审总结

`bold.tsx` 作为 `@uiw/react-md-editor` 的一个命令定义模块，其核心功能（文本加粗/解加粗）实现完整、交互逻辑清晰、无障碍基础优于行业平均水平（提供了 `aria-label` + `role="img"`）。

**核心矛盾**：该文件的设计目标是服务于 GitHub 风格的 Markdown 编辑器，而非 IBM Carbon Design System。在视觉设计层面（图标风格/尺寸、按钮样式、工具提示）与本项目的 Carbon + Antd 设计规范存在系统性不匹配。

**正面评价**：
- `fill="currentColor"` 是图标主题化的最佳实践，本项目 CSS 可通过 `color` 属性完全控制图标颜色
- `aria-label` + `role="img"` 的组合提供了基础的无障碍支持
- `ctrlcmd+b` 跨平台快捷键映射是正确的实现
- `buttonProps` 设计允许外部覆盖按钮属性

**主要风险**：
- 硬编码英文文本在中文项目中构成用户体验缺陷（P2）
- 工具栏按钮缺少 Carbon 焦点环，影响键盘用户（P2）
- FontAwesome 实心图标与 Carbon 线条风格存在视觉不一致（P3）
- 所有问题均为 `@uiw/react-md-editor` 的系统性问题，需在封装层解决

**综合评分 4.3/10** — 文件本身在功能和无障碍基础层面合格，但在设计系统合规性（Carbon/Antd）、国际化、响应式方面存在系统性差距。本项目 `MarkdownEditor.tsx` + `markdown-editor.css` 的封装层已有效覆盖了大部分视觉冲突，建议重点修复中文 ARIA 标注和焦点环问题。

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + DESIGN.md (IBM Carbon Design System) + Antd 6.x 规范 + WCAG 2.1 AA 标准*
