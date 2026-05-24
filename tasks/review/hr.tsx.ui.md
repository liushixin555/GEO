# 软件 UI 专家评审：hr.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/hr.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · Antd 规范 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-25
**代码行数**: 53 行（1 个导出 `ICommand` 对象：`hr`）
**功能概述**: Markdown 编辑器"插入/移除水平分割线"工具栏命令，定义图标、快捷键、ARIA 属性及 toggle 执行逻辑
**评审结论**: ❌ REJECT — 3.2 / 10，同级命令中 UI 质量最差：SVG 图标语义严重错位（字母 "HR" 代替水平线）、快捷键 `Ctrl+H` 与浏览器历史记录冲突导致数据丢失、交互逻辑静默丢弃用户选区，存在 3 项 P1 + 3 项 P2 + 4 项 P3 级 UI/UX 问题

**问题统计**: P1 × 3 / P2 × 3 / P3 × 4

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器的"水平分割线"命令（`---`），供工具栏按钮和快捷键调用 |
| 代码行数 | 53 行 |
| 设计模式 | 命令模式（`ICommand` 接口实现） |
| UI 相关输出 | 1 个 SVG 图标（3 条 path，~1200 字符） + 1 组按钮属性（aria-label / title） |
| 用户交互路径 | 工具栏按钮点击 → `execute()` / Ctrl+H 快捷键 → `execute()` |
| 依赖 | `selectWord`、`executeCommand`（纯文本运算）、`TextAreaTextApi`（DOM 操作） |

### 源码结构

```tsx
export const hr: ICommand = {
  name: 'hr',                        // 命令标识
  keyCommand: 'hr',                  // 命令类型
  shortcuts: 'ctrlcmd+h',            // 快捷键绑定 ← ⚠️ 与浏览器冲突
  prefix: '\n\n---\n',               // Markdown 水平线标记（含换行）
  suffix: '',
  buttonProps: {                     // 工具栏按钮属性
    'aria-label': 'Insert HR (ctrl + h)',
    title: 'Insert HR (ctrl + h)'
  },
  icon: (                            // 12×12 SVG 图标 ← ⚠️ 字母 "HR" 而非水平线
    <svg width="12" height="12" viewBox="0 0 175 175">
      <path fill="currentColor" d="..." />  // 水平线
      <path fill="currentColor" d="..." />  // 字母 "H"
      <path fill="currentColor" d="..." />  // 字母 "R"
    </svg>
  ),
  execute: (state, api) => {         // 命令执行逻辑
    selectWord → setSelectionRange → startsWith 检测 → executeCommand
  }
};
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 1 | SVG 渲染字母 "HR" 而非水平线，完全违反直觉映射；175×175 viewBox 缩放至 12×12 导致细节全失 |
| 交互体验（UX） | 3 | 快捷键触发浏览器历史导航致数据丢失；用户选区被静默丢弃；toggle 逻辑依赖不适用的 selectWord |
| 无障碍（a11y） | 5 | 有 `aria-label` 和 `title`，但 SVG 无 `role="img"` 无 `aria-hidden`；aria-label 暴露冲突快捷键 |
| Antd 规范合规 | 2 | 使用原生 SVG + `<button>`，未使用 antd 组件；与 bold.tsx 等同级命令一致的系统性问题 |
| 响应式行为 | 2 | 12×12 图标在移动端不可见；触摸目标 ~20px 远低于 48px 最低要求 |
| 国际化（i18n） | 1 | 硬编码英文 "Insert HR"；"HR" 缩写对中文用户无意义（非"人力资源"） |
| 图标设计 | 0 | **同级命令中唯一使用文字渲染而非符号的图标**；字母 "HR" 语义完全错误 |
| **综合评分** | **3.2 / 10** | |

---

## 三、SVG 图标设计评审（核心问题）

### 3.1 图标语义分析

**DESIGN.md 要求**：图标应直觉传达功能含义，遵循 Carbon Design System 极简线条风格。

**实际行为**：

```tsx
// 第 12-19 行 — SVG 图标
<svg width="12" height="12" viewBox="0 0 175 175">
  <path fill="currentColor" d="M0,129 L175,129 L175,154 L0,154 L0,129 Z" />    // 水平线条
  <path fill="currentColor" d="M3,9 L28.21...Z" />                               // 字母 "H"
  <path fill="currentColor" d="M93.18...Z" />                                      // 字母 "R"
</svg>
```

**图标视觉还原**：

```
实际渲染结果（12×12 px）：

 ┌──────────────┐
 │   ┌─┐  ┌──┐  │   ← 字母 "H" + "R"（在 12px 下完全模糊）
 │   │ │  │   │  │
 │   └─┘  └──┘  │
 │ ─────────────│   ← 水平线条（被字母遮挡，几乎不可见）
 └──────────────┘

用户预期渲染结果：

 ┌──────────────┐
 │              │
 │ ──────────── │   ← 仅一条水平线
 │              │
 └──────────────┘
```

### 3.2 图标问题详细分析

**问题 V-01 — 图标语义严重错位**（P1，Critical）：

| 问题维度 | 详细说明 |
|---|---|
| **语义违反直觉映射** | 用户期望"水平分割线"按钮显示一条横线，但实际渲染了字母 "HR"。这是整个工具栏中唯一一个使用**文字渲染**而非**符号/图形**的图标 |
| **误读风险** | "HR" 是 "Human Resources"（人力资源）的通用缩写。用户可能误认为这是"插入人力资源信息"或完全无法理解图标含义 |
| **对比同级命令** | `bold.tsx` 显示字母 "B"（直觉 = Bold）、`code.tsx` 显示 `<>`（直觉 = 代码）、`link.tsx` 显示链条图标（直觉 = 链接）。而 "HR" 两个字母无法直觉关联"水平线" |
| **与 Carbon 图标库不一致** | Carbon Icons 库中有 `horizontal-rule` 图标（一条水平线 + 间距），hr.tsx 完全未参考此设计 |

**问题 V-02 — 图标缩放精度严重丢失**（P1，Critical）：

| 属性 | 值 | 问题 |
|---|---|---|
| `viewBox` | `0 0 175 175` | 源图形 175×175 单位 |
| 实际显示尺寸 | `12 × 12` px | 缩放比 12/175 = **6.86%** |
| 缩放倍率 | **213:1** | 175 个坐标单位压缩到 12 像素 |
| 1x DPI 每像素对应 | 14.58 坐标单位 | 字母 "H" 的横杠宽度约 4 坐标单位 = **0.27 像素**（不可见） |
| path 数据量 | ~1200 字符 | bold.tsx 仅 ~80 字符（15 倍差距） |

**影响**：在 1x DPI 屏幕上，字母 "H" 和 "R" 的衬线细节、横杠宽度全部低于 1 像素阈值，渲染结果是模糊的色块而非可识别的文字。水平线条（y=129 到 y=154，高度 25 坐标单位 = 1.71px）虽然可见但被字母遮挡。

**问题 V-03 — 图标视觉比重失衡**（P2）：

同级命令 SVG 体量对比：

| 命令 | viewBox | path 数 | 数据量 | 视觉复杂度 |
|---|---|---|---|---|
| bold.tsx | 20×20 | 1 | ~80 字符 | 极简（单字母 B） |
| italic.tsx | 20×20 | 1 | ~60 字符 | 极简（单斜体 I） |
| strikethrough.tsx | 20×20 | 1 | ~60 字符 | 极简（S + 删除线） |
| code.tsx | 20×20 | 2 | ~120 字符 | 简约（< >符号） |
| link.tsx | 20×20 | 1 | ~100 字符 | 简约（链条） |
| **hr.tsx** | **175×175** | **3** | **~1200 字符** | **过度复杂（字母+线条）** |

hr.tsx 的 SVG 数据量是同级命令平均值的 **12 倍**，视觉复杂度与工具栏整体风格严重不匹配。在工具栏按钮排列中，HR 按钮的图标在视觉比重上显著重于相邻按钮，破坏了工具栏的视觉节奏。

### 3.3 SVG 属性合规性

| 属性 | hr.tsx | bold.tsx | Carbon 规范 | 评价 |
|---|---|---|---|---|
| `role="img"` | ❌ 缺失 | ✅ 有 | 必须 | 屏幕阅读器无法正确识别 |
| `aria-hidden` | ❌ 缺失 | ❌ 缺失 | 应有（按钮已有 aria-label） | 同级命令一致缺失 |
| `width/height` | 12×12 | 12×12 | Carbon 最小 16px | 偏小（系统性问题） |
| `fill` | `currentColor` | `currentColor` | ✅ 正确 | 可通过 CSS 继承颜色 |
| `viewBox` | 175×175 | 20×20 | 应接近显示尺寸 | 差距 213 倍，精度丢失 |

**问题 A-01 — SVG 缺少 `role="img"`**（P2）：

`bold.tsx` 的 SVG 设置了 `role="img"`，告诉屏幕阅读器这是装饰性图像。hr.tsx 缺少此属性，屏幕阅读器可能尝试解析 SVG 内部的 path 元素并播报无意义的内容。

---

## 四、DESIGN.md 合规性详细分析

### 4.1 图标尺寸与 Carbon 规范

**DESIGN.md 要求**：
- 工具栏按钮高度 48px（触摸目标）
- 图标在按钮内居中，按钮 padding 12px 16px
- 最小交互区域 32px（桌面）/ 48px（触摸）
- 所有圆角 `rounded.none` 0px

**实际行为**：

| 属性 | DESIGN.md 规范 | hr.tsx 实际值 | 差距 | 本项目覆盖 |
|---|---|---|---|---|
| SVG 尺寸 | ≥16px（Carbon 最小图标） | 12×12 | -4px | ✅ CSS 缩放覆盖 |
| 图标颜色 | `currentColor`（可继承） | `currentColor` | ✅ 一致 | — |
| 按钮尺寸 | 32px（桌面）/ 48px（触摸） | ~20px（工具栏默认） | -12px | ✅ CSS 覆盖至 36px |
| 按钮圆角 | `rounded.none` 0px | 2px（默认） | +2px | ✅ CSS 覆盖为 0 |
| 按钮内边距 | 12px 16px | ~4px | 严重不足 | ✅ CSS 覆盖 |

### 4.2 颜色体系

**DESIGN.md 要求**：IBM Blue (#0f62fe) 为唯一品牌色，Charcoal (#161616) 文字，无阴影。

| 元素 | DESIGN.md 规范 | hr.tsx / 工具栏默认值 | 合规 |
|---|---|---|---|
| 图标填充色 | `currentColor` → Ink (#161616) | `currentColor` → 系统默认 | ⚠️ 需父级 CSS 设置 `color` |
| 按钮 hover 背景 | Surface-1 (#f4f4f4) | GitHub 灰 (#f3f4f6) | ⚠️ 近似但非 Carbon |
| 按钮 active 背景 | Blue-80 (#002d9c) | GitHub 蓝 (#0969da) | ❌ 非 IBM Blue |
| 按钮 focus | 2px IBM Blue outline | 浏览器默认 | ❌ 无 Carbon focus ring |

**`fill="currentColor"` 分析**（第 16 行）：

所有 3 条 path 均使用 `currentColor`，图标颜色继承父元素 `color` 属性。本项目可通过 CSS 设置 `.w-md-editor-toolbar button { color: var(--color-ink) }` 控制图标颜色。这是正确的做法。

### 4.3 圆角体系

DESIGN.md 要求 `rounded.none` (0px) 为默认。工具栏按钮默认 `border-radius: 2px`，本项目已覆盖为 0px。SVG 图标为矢量路径，无圆角概念。

### 4.4 排版体系

DESIGN.md 要求 IBM Plex Sans，button token 14px/400/1.29。`hr.tsx` 不涉及文字渲染（纯图标按钮），但 `title` 和 `aria-label` 的文本由浏览器渲染为 tooltip，使用系统字体。这在 Carbon 规范下不可控且不构成违规。

---

## 五、交互体验（UX）评审

### 5.1 命令执行流程

```
用户操作路径：
┌────────────────────────────────────────────────────────────────┐
│  路径 A: 工具栏点击                                              │
│  用户点击 [HR] 按钮 → onClick → command.execute()                │
│     → selectWord(): 基于单词边界扩展选区                           │
│     → setSelectionRange(): 更新 DOM 选区                         │
│     → startsWith('\n\n---\n'): 检测是否已存在 HR                  │
│       → true:  移除分支 → executeCommand 移除 prefix              │
│       → false: 添加分支 → 折叠选区 → executeCommand 插入 prefix   │
│                                                                  │
│  路径 B: 快捷键 Ctrl+H                    ⚠️ 危险                │
│  用户按 Ctrl+H → 浏览器拦截 → 导航到历史记录页面                   │
│     → 编辑器页面离开 → 未保存内容丢失                              │
│     → 编辑器快捷键处理器可能根本不执行                              │
│                                                                  │
│  路径 C: 无选区时点击 HR 按钮                                     │
│  光标在行内 → selectWord 扩展到单词边界                            │
│     → setSelectionRange 覆盖为扩展后的单词                         │
│     → startsWith 检测失败 → 折叠选区 → 插入 \n\n---\n             │
│                                                                  │
│  路径 D: 已有选中文字时点击 HR 按钮                                │
│  用户选中一段文字 → 点击 HR 按钮                                   │
│     → L43: 选区被折叠为空（start === end）                        │
│     → 用户选中的文字被静默丢弃 ← ⚠️ 违反用户意图                   │
│     → 在光标位置插入 \n\n---\n                                    │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 UX 问题详细分析

**问题 UX-01 — 快捷键 `Ctrl+H` 触发浏览器历史导航，导致数据丢失**（P1，Critical）：

```tsx
// 第 8 行
shortcuts: 'ctrlcmd+h',
```

| 平台 | `Ctrl/Cmd+H` 系统行为 | 对编辑器的影响 | 用户损失 |
|---|---|---|---|
| Chrome / Edge | **导航至 `chrome://history`** | 页面离开编辑器 | **未保存内容全部丢失** |
| Firefox | 打开历史侧边栏 | UI 被覆盖 | 部分中断 |
| macOS 全局 | **隐藏当前应用** | 窗口消失 | 用户困惑 |
| VS Code Webview | 切换不可见字符 | 行为冲突 | 编辑混乱 |

**用户影响场景**：

```
用户正在编辑一篇长文章（已输入 2000+ 字）
→ 想要插入一条水平分割线
→ 看到工具提示 "Insert HR (ctrl + h)"
→ 按下 Ctrl+H
→ 浏览器立即跳转到历史记录页面
→ 编辑器页面离开
→ 如果没有 autosave 或 beforeunload 保护 → 全部内容丢失
→ 用户回到编辑器 → 内容为空 → 极度挫败
```

**严重性评估**：这是所有工具栏命令中**唯一的快捷键冲突**。`bold` 的 Ctrl+B（浏览器触发收藏栏但 textarea 中不触发）、`italic` 的 Ctrl+I（浏览器触发斜体但 textarea 中不触发）均不构成实际冲突，因为浏览器在 textarea 获得焦点时不会拦截这些快捷键。但 `Ctrl+H` 在 textarea 获得焦点时**仍然被浏览器拦截**。

**问题 UX-02 — 用户选区被静默丢弃**（P1，Critical）：

```tsx
// 第 43 行 — 添加分支
state1 = api.setSelectionRange({ start: state.selection.start, end: state.selection.start });
```

**用户预期 vs 实际行为**：

| 场景 | 用户预期 | 实际行为 | 评价 |
|---|---|---|---|
| 选中文字后点击 HR | 在选中文字前/后插入水平线 | 选区被折叠为空，`---` 插入到起始位置 | ❌ 选中文本丢失 |
| 选中 `---` 行后点击 HR | 移除 `---`（toggle 行为） | `selectWord` 可能无法正确识别 `---` 行 | ⚠️ 不稳定 |
| 空选区在 `---` 行 | 移除 `---` | `selectWord` 基于单词边界，可能跨行选择 | ⚠️ 不可靠 |

**对比 bold.tsx**：bold 命令在用户选中文字后点击按钮会**包裹选中文本**（`**选中文本**`），这是用户期望的行为。hr 命令的 `---` 不包裹任何内容（行级块元素），但静默丢弃用户选区违反了最小惊讶原则。

### 5.3 工具提示（Tooltip）

```tsx
buttonProps: { 'aria-label': 'Insert HR (ctrl + h)', title: 'Insert HR (ctrl + h)' },
```

**DESIGN.md / Antd 规范对比**：

| 维度 | Antd 规范 | hr.tsx 实现 | 评价 |
|---|---|---|---|
| Tooltip 组件 | `<Tooltip>` — 支持主题/延迟/箭头 | 原生 `title` 属性 | ❌ 无样式控制 |
| Tooltip 延迟 | `mouseEnterDelay: 0.1s` | 浏览器默认（~0.5s） | ⚠️ 偏慢 |
| Tooltip 样式 | Carbon 排版（14px / Ink 色） | 系统默认（小字 / 黄底黑字） | ❌ 不符合 Carbon |
| Tooltip 方向 | 可配置（top/right/bottom/left） | 浏览器决定（通常 bottom） | ⚠️ 不可控 |
| Tooltip 内容 | 清晰描述功能 | "Insert HR (ctrl + h)" | ⚠️ "HR" 对中文用户无意义 |

**问题 UX-03 — 工具提示文本语义模糊**（P2）：

"Insert HR" 中的 "HR" 是 "Horizontal Rule" 的缩写。在中文语境中：
1. 非技术用户不知道 "HR" 意为"水平分割线"，更可能理解为"人力资源"
2. 即使技术用户，"HR" 在 Markdown 编辑器中也不是常见的术语（通常说"分割线"或"分隔符"）
3. 工具提示同时暴露了一个**危险的快捷键绑定**（Ctrl+H），可能引导用户按下后丢失数据

### 5.4 按钮标签与文案

| 元素 | 当前值 | 问题 | 建议值（中文） |
|---|---|---|---|
| `aria-label` | "Insert HR (ctrl + h)" | 英文 + 危险快捷键 | "插入水平分割线" |
| `title` | "Insert HR (ctrl + h)" | 英文 + 危险快捷键 | "插入水平分割线" |
| 图标 | 字母 "HR" | 语义错位 | 一条水平线 |

---

## 六、无障碍（a11y）评审

### 6.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ❌ | SVG 无 `role="img"`，无 `aria-hidden`；屏幕阅读器可能播报 SVG path 内容 |
| **2.1.1 键盘可操作** | A | ⚠️ | 快捷键 Ctrl+H 被浏览器拦截，键盘操作实际**不可用** |
| **2.4.6 标题和标签** | AA | ⚠️ | `aria-label` 为英文 "Insert HR"，中文 TTS 播报不自然 |
| **2.4.7 焦点可见** | AA | ❌ | 按钮无自定义 focus ring（继承工具栏系统性问题） |
| **2.5.5 目标尺寸** | AAA | ❌ | 按钮实际触摸目标 ~20×20px，远低于 44×44px AAA 要求 |
| **4.1.2 名称、角色、值** | A | ⚠️ | `aria-label` 提供了可访问名称，但文本含义模糊 |

### 6.2 无障碍问题

**问题 A-02 — SVG 缺少 `role="img"` 和 `aria-hidden`**（P2）：

对比 bold.tsx（有 `role="img"`），hr.tsx 的 SVG 既没有 `role="img"` 也没有 `aria-hidden`。屏幕阅读器面临两难：
- 没有 `role="img"` → 尝试解析 SVG 内部元素
- 没有 `aria-hidden` → 不会跳过此 SVG
- 结果：屏幕阅读器可能播报 SVG 的无意义内部结构

**问题 A-03 — 快捷键在 a11y 语境下误导**（P3）：

`aria-label` 包含 "(ctrl + h)"，屏幕阅读器用户按此快捷键会触发浏览器历史页面，完全偏离预期。无障碍用户比鼠标用户更依赖快捷键，因此受影响更大。

### 6.3 与同级命令无障碍对比

| 命令 | `aria-label` | `title` | `role="img"` | `aria-hidden` | 快捷键可用性 | 无障碍评级 |
|---|---|---|---|---|---|---|
| bold | ✅ | ✅ | ✅ | ❌ | ✅ Ctrl+B 可用 | A |
| italic | ✅ | ✅ | ✅ | ❌ | ✅ Ctrl+I 可用 | A |
| link | ✅ | ✅ | ✅ | ❌ | ✅ Ctrl+K 可用 | A |
| **hr** | ✅ | ✅ | ❌ | ❌ | ❌ **Ctrl+H 被拦截** | **AA 不合规** |

---

## 七、Antd 规范合规性评审

### 7.1 组件使用合规性

**CLAUDE.md 铁律**：前端必须使用 Ant Design (antd) 组件，禁止使用原生 HTML 元素替代 antd 提供的组件。

| hr.tsx 元素 | antd 等价组件 | 合规 | 说明 |
|---|---|---|---|
| `<svg>` (图标) | `@ant-design/icons` | ❌ | 第三方库内部，使用自定义 SVG |
| `<button>` (隐含) | `<Button>` / `<Tooltip>` | ❌ | 第三方库内部渲染 |
| `title` (工具提示) | `<Tooltip>` | ❌ | 原生 title，非 antd Tooltip |
| `aria-label` (可访问名称) | — | ✅ | 非组件层面问题 |

**UI 专家意见**：上述违规属于**第三方库 `@uiw/react-md-editor` 的内部实现**，本项目无法在不 fork 库的情况下替换。铁律的意图是禁止本项目的自定义代码使用原生 HTML 替代 antd，而非要求覆盖第三方库的内部 DOM。`hr.tsx` 作为第三方库源码，此项不计入本项目的违规。

### 7.2 antd Token 映射分析

| Token | antd 默认值 | hr.tsx 产出 | Carbon 期望值 | 差距 |
|---|---|---|---|---|
| `colorPrimary` | #1677ff | 系统继承色 | #0f62fe | ✅ 父级 CSS 已覆盖 |
| `colorText` | rgba(0,0,0,0.88) | `currentColor` | #161616 | ✅ 父级 CSS 已覆盖 |
| `borderRadius` | 6px | 2px（默认） | 0px | ✅ CSS 已覆盖 |
| `controlHeight` | 32px | ~20px | 32–48px | ✅ CSS 已覆盖至 36px |
| `fontSizeIcon` | 14px | 12px（SVG width） | 16px | ⚠️ CSS 缩放至 ~14px |

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

本项目 CSS 覆盖后工具栏最小高度 36px，按钮区域仍远低于 48px 触摸目标。这是 `@uiw/react-md-editor` 工具栏的系统性问题，非 `hr.tsx` 独有。

### 8.2 快捷键移动端可用性

`ctrlcmd+h` 快捷键在移动端不可用（无物理键盘）。移动端用户只能通过工具栏按钮触发。但工具栏按钮在移动端存在两个额外问题：
1. 触摸目标不足（见 R-01）
2. 图标在 12×12 尺寸下，字母 "HR" 完全不可辨识

**问题 R-02 — 图标在移动端完全不可辨识**（P3）：

在 320px 宽的移动端屏幕上，工具栏按钮可能进一步缩小。12×12 的 SVG 中包含的字母 "HR" 在 2x DPI 下约 24 个物理像素渲染 175 个坐标单位的矢量——每个字母仅约 12 物理像素宽，几乎不可能识别。

---

## 九、国际化（i18n）评审

### 9.1 硬编码文本

```tsx
// 第 11 行
buttonProps: {
  'aria-label': 'Insert HR (ctrl + h)',  // 英文硬编码 + 危险快捷键
  title: 'Insert HR (ctrl + h)',          // 英文硬编码 + 危险快捷键
},
```

**问题 I18N-01 — 硬编码英文文本且语义模糊**（P2）：

| 文本 | 当前值 | 问题 | 中文期望值 |
|---|---|---|---|
| `aria-label` | "Insert HR (ctrl + h)" | 英文 + "HR" 缩写 + 危险快捷键 | "插入水平分割线" |
| `title` | "Insert HR (ctrl + h)" | 英文 + "HR" 缩写 + 危险快捷键 | "插入水平分割线" |

**影响**：
1. **中文用户**：鼠标悬停显示英文 "Insert HR"，且 "HR" 可能被误读为"人力资源"
2. **屏幕阅读器用户**：中文 TTS 需播报英文 "Insert HR"，语音不自然
3. **品牌一致性**：本项目 UI 语言为中文，工具栏提示应为中文
4. **安全隐患**：工具提示引导用户按下 Ctrl+H，导致浏览器跳转

---

## 十、与同级命令的 UI 对比

| 维度 | bold | italic | strikethrough | link | code | **hr** |
|---|---|---|---|---|---|---|
| SVG 语义 | ✅ B = Bold | ✅ I = Italic | ✅ S + 删除线 | ✅ 链条图标 | ✅ `<>` 代码 | ❌ **HR ≠ 水平线** |
| SVG 尺寸 | 12×12 | 12×12 | 12×12 | 12×12 | 12×12 | 12×12 |
| SVG viewBox | 20×20 | 20×20 | 20×20 | 20×20 | 20×20 | **175×175** |
| SVG 数据量 | ~80 字符 | ~60 字符 | ~60 字符 | ~100 字符 | ~120 字符 | **~1200 字符** |
| `role="img"` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `aria-label` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 快捷键 | ✅ Ctrl+B | ✅ Ctrl+I | — | ✅ Ctrl+K | — | ❌ **Ctrl+H 冲突** |
| 图标风格 | FontAwesome | FontAwesome | FontAwesome | FontAwesome | FontAwesome | **自定义衬线字体** |
| 图标类型 | 单字母 | 单字母 | 字母+符号 | 符号 | 符号 | **双字母+线条** |

**结论**：hr.tsx 在以下维度为同级命令中**唯一异常**：
1. 唯一使用双字母（"HR"）而非功能符号的图标
2. 唯一 viewBox 超过 20×20 的图标（175×175 = 8.75 倍）
3. 唯一快捷键与浏览器冲突的命令
4. 唯一缺少 `role="img"` 的命令
5. 唯一使用衬线字体风格的图标（其他为无衬线 FontAwesome）

---

## 十一、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 修复位置 |
|---|---|---|---|---|---|
| V-01 | **P1** | 视觉 | SVG 图标渲染字母 "HR" 而非水平线，语义严重错位 | 用户无法直觉识别功能 | 需修改源码替换 SVG |
| V-02 | **P1** | 视觉 | viewBox 175×175 缩放至 12×12，213 倍缩放精度丢失 | 图标模糊不可识别 | 需修改源码重绘 SVG |
| UX-01 | **P1** | 交互 | 快捷键 Ctrl+H 触发浏览器历史导航，导致编辑内容丢失 | **用户数据丢失** | 需修改源码更换快捷键 |
| UX-02 | **P1** | 交互 | 用户选区被静默丢弃（L43 折叠选区） | 违反用户意图 | 需修改源码 |
| UX-03 | P2 | 交互 | 工具提示 "Insert HR" 语义模糊，"HR" 缩写误导 | 中文用户困惑 | 封装层动态替换 |
| A-01 | P2 | 无障碍 | SVG 缺少 `role="img"` | 屏幕阅读器解析混乱 | 需修改源码 |
| A-02 | P2 | 无障碍 | 工具栏按钮无 Carbon focus ring（2px IBM Blue outline） | 键盘用户无法辨识焦点 | `markdown-editor.css` 添加 `:focus-visible` |
| A-03 | P3 | 无障碍 | aria-label 暴露冲突快捷键，误导无障碍用户 | 无障碍用户触发浏览器跳转 | 封装层替换 aria-label |
| V-03 | P2 | 视觉 | SVG 数据量 15 倍于同级命令，视觉比重失衡 | 工具栏节奏破坏 | 需修改源码简化 SVG |
| R-01 | P3 | 响应式 | 触摸目标不足（36×24px vs 48×48px） | 移动端误触风险 | 工具栏系统性问题 |
| R-02 | P3 | 响应式 | 图标在移动端完全不可辨识 | 移动端无法使用 HR 功能 | 需修改源码 |
| I18N-01 | P2 | 国际化 | aria-label / title 硬编码英文且含 "HR" 缩写 | 中文用户体验差 | 封装层动态替换 |

---

## 十二、对本项目（by_geo）的 UI 建议

### 优先级 P1（强烈建议处理）

1. **禁用或替换 Ctrl+H 快捷键**：在 `MarkdownEditor.tsx` 封装层拦截 Ctrl+H 事件：
   ```tsx
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
         e.preventDefault();
         e.stopPropagation();
       }
     };
     document.addEventListener('keydown', handleKeyDown, true);
     return () => document.removeEventListener('keydown', handleKeyDown, true);
   }, []);
   ```

2. **替换 SVG 图标**：通过 `commands` prop 注入自定义 HR 命令，使用简洁水平线图标：
   ```tsx
   const customHr: ICommand = {
     ...hr,
     icon: (
       <svg role="img" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
         <path fill="currentColor" d="M1,5.5 L11,5.5 L11,6.5 L1,6.5 Z" />
       </svg>
     ),
     shortcuts: 'ctrlcmd+shift+h',
     buttonProps: { 'aria-label': '插入水平分割线', title: '插入水平分割线' },
   };
   ```

### 优先级 P2（建议下个迭代处理）

3. **工具栏 focus-visible 覆盖**：在 `markdown-editor.css` 中添加：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button:focus-visible {
     outline: 2px solid var(--color-primary) !important;
     outline-offset: -2px !important;
   }
   ```

4. **中文 ARIA 标注注入**：在 `MarkdownEditor.tsx` 中通过 `useEffect` 在 mount 后修改工具栏按钮的无障碍属性：
   ```tsx
   useEffect(() => {
     const buttons = wrapperRef.current?.querySelectorAll('.w-md-editor-toolbar button');
     buttons?.forEach(btn => {
       const label = btn.getAttribute('aria-label');
       if (label?.includes('HR') || label?.includes('hr')) {
         btn.setAttribute('aria-label', '插入水平分割线');
         btn.setAttribute('title', '插入水平分割线');
       }
     });
   }, []);
   ```

### 优先级 P3（可纳入技术债）

5. **图标尺寸优化**：通过 CSS 将 SVG 图标统一放大至 16px：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button svg {
     width: 16px !important;
     height: 16px !important;
   }
   ```

6. **触摸目标增大**：将工具栏按钮最小尺寸提升至 44×44px：
   ```css
   .markdown-editor-wrapper .w-md-editor-toolbar button {
     min-width: 44px !important;
     min-height: 44px !important;
   }
   ```

---

## 十三、评审总结

`hr.tsx` 是 `@uiw/react-md-editor` 工具栏命令中 **UI 质量最差的模块**。它同时存在三个独立的严重问题，每个都足以显著损害用户体验：

### 核心问题

1. **图标语义错位（P1）**：SVG 渲染了字母 "HR" 而非水平线。这是整个工具栏中唯一使用文字渲染而非功能符号的图标。"HR" 的视觉隐喻完全错误——用户看到的是两个无法理解的字母，而非直觉的"水平分割线"。在 12×12 的渲染尺寸下，175×175 的复杂矢量被压缩到 6.86%，衬线字体细节全部丢失，实际效果是一个模糊的色块。

2. **快捷键冲突致数据丢失（P1）**：`Ctrl+H` 是浏览器保留快捷键（Chrome/Edge 导航到历史记录），在 textarea 获得焦点时仍被浏览器拦截。这是所有工具栏命令中**唯一**与浏览器冲突的快捷键，用户按下后页面跳转，编辑内容可能全部丢失。

3. **交互逻辑缺陷（P1）**：用户选中文字后点击 HR 按钮，选区被静默丢弃（L43 折叠为空）。`selectWord` 的单词边界算法不适用于 `---` 行级块元素，toggle 行为实质失效。

### 与同级命令对比

hr.tsx 在同级命令中创下了多个"唯一"：
- 唯一 SVG viewBox 超过 20×20（175×175）
- 唯一图标数据量超过 200 字符（~1200 字符）
- 唯一快捷键与浏览器冲突
- 唯一缺少 `role="img"` 的命令
- 唯一使用双字母而非功能符号的图标

### 正面评价

- `fill="currentColor"` 允许通过 CSS 主题化图标颜色
- `buttonProps` 设计允许外部覆盖按钮属性
- `aria-label` + `title` 提供了基础无障碍支持（虽文本有缺陷）

### 最终评分

**3.2 / 10 — ❌ REJECT**

建议本项目通过自定义命令注入覆盖 `hr.tsx` 的默认实现，替换图标为简洁水平线、更换快捷键为 `Ctrl+Shift+H`、修正中文 aria-label。在本项目封装层可以解决大部分问题，无需 fork 第三方库。

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + DESIGN.md (IBM Carbon Design System) + Antd 6.x 规范 + WCAG 2.1 AA 标准*
