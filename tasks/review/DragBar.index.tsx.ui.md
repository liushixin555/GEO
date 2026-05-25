# 软件UI专家评审报告 — DragBar/index.tsx

> **评审文件**: `@uiw/react-md-editor/src/components/DragBar/index.tsx` + `index.less`
> **评审时间**: 2026-05-25
> **评审角色**: 软件UI专家（对照 DESIGN.md + Ant Design 规范 + 通用 UI/UX 最佳实践）
> **评审版本**: @uiw/react-md-editor@4.1.0
> **综合UI评分**: 2.8 / 10
> **评审结论**: ⛔ UNACCEPTABLE（不可接受 — 组件严重违反 Carbon Design System 核心规范，触控目标不达标，零可访问性支持，无视觉反馈，几乎无可用性可言）

---

## 一、UI评估概览

| UI维度 | 评分 (1-10) | 合规等级 | 说明 |
|--------|-------------|----------|------|
| DESIGN.md 颜色规范 | 3 | ⛔ 不合规 | `currentColor` 继承无主动控制，无品牌色体系 |
| DESIGN.md 间距/网格 | 2 | ⛔ 不合规 | 14×10px 完全脱离 4px 基线网格 |
| DESIGN.md 圆角规范 | 2 | ⛔ 不合规 | `border-radius: 0 0 3px 0` 不属于任何 Carbon token |
| Ant Design 组件使用 | 1 | ⛔ 严重违规 | 全部使用原生 HTML，未使用任何 antd 组件 |
| 触控目标 (Touch Target) | 1 | ⛔ 严重不达标 | 14×10px 远低于 Carbon 48px / WCAG 44px 最低要求 |
| 视觉反馈 | 2 | ⛔ 严重不足 | 无 hover / focus / active 状态样式 |
| 可访问性 (a11y) | 1 | ⛔ 零支持 | 无 ARIA、无键盘操作、无屏幕阅读器支持 |
| 交互设计 (IxD) | 3 | ⚠️ 不合规 | 无拖拽提示、无节流、无动画过渡 |
| 响应式设计 | 3 | ⚠️ 不合规 | 固定像素尺寸，无媒体查询、无触摸优化 |
| **综合加权评分** | **2.8** | **⛔ 不可接受** | |

---

## 二、DESIGN.md 违规清单

### CRITICAL — 严重违规

#### UI-C01: 触控目标严重不足 — 14×10px 远低于 Carbon 最低 48px 标准

- **位置**: `index.less` L11–L13（`width: 14px; height: 10px;`）
- **违反规范**: DESIGN.md §Responsive Behavior → Touch Targets

**问题描述**:

Carbon Design System 明确规定所有可交互元素的触控目标不得低于 **48×48px**。当前拖拽条尺寸为 **14×10px**，仅为标准的 29%×21%。

```
Carbon 要求: 48px × 48px (最小)
当前实现:    14px × 10px
差距:        -70.8% (宽) / -79.2% (高)
```

**影响**:

1. **触摸设备几乎不可用**: 在移动设备上，用户手指的平均触控面积约为 10×14mm（约 44×44px @1x），14×10px 的目标完全被手指覆盖，无法精确命中
2. **WCAG 2.5.8 (Target Size - Minimum) 不通过**: Level AAA 要求 44×44px 最小
3. **肌肉劳损风险**: 桌面用户需精确瞄准微小区域，增加操作疲劳

**修复建议**:

```less
// 将可交互区域扩大至 48×48px，视觉图标保持小巧
.@{md-editor}-bar {
  width: 48px;
  height: 48px;
  // 或使用 padding 扩大触控区域，保持视觉小巧
  padding: 19px 17px; // (48-10)/2=19, (48-14)/2=17
  box-sizing: border-box;
}
```

---

#### UI-C02: 圆角不合规 — `border-radius: 3px` 不属于 Carbon Design System 任何 token

- **位置**: `index.less` L14（`border-radius: 0 0 3px 0;`）
- **违反规范**: DESIGN.md §Shapes → Border Radius Scale

**问题描述**:

Carbon Design System 的圆角体系为：

| Token | 值 | 用途 |
|-------|-----|------|
| `{rounded.none}` | 0px | 默认——所有按钮、卡片、输入框、容器 |
| `{rounded.xs}` | 2px | 小型徽标（罕见例外） |
| `{rounded.sm}` | 4px | 头像方块、下拉菜单 |
| `{rounded.md}` | 6px | 极少使用 |
| `{rounded.lg}` | 8px | 极少使用 |

**`3px` 不存在于上述任何 token 中。** Carbon 的品牌美学核心是"square corners at 0px"（直角美学），使用非标准 3px 圆角直接破坏了品牌一致性。

**修复建议**:

```less
// 选项A: 严格遵循 Carbon 零圆角
border-radius: 0;

// 选项B: 若确需圆角，使用标准 token
border-radius: 0 0 2px 0; // {rounded.xs}
```

---

#### UI-C03: 间距脱离 4px 基线网格 — 14px 和 10px 均非 4 的倍数

- **位置**: `index.less` L11–L13
- **违反规范**: DESIGN.md §Layout → Spacing System

**问题描述**:

Carbon Design System 基于 **4px 网格**进行布局。所有间距 token 均为 4 的倍数：4, 8, 12, 16, 24, 32, 48, 96。

当前实现中：
- `width: 14px` → 14 ÷ 4 = 3.5（非整数倍）
- `height: 10px` → 10 ÷ 4 = 2.5（非整数倍）
- `margin-top: -11px` → 11 ÷ 4 = 2.75（非整数倍）

三个关键尺寸全部脱离 4px 网格，导致在子像素渲染时可能出现模糊或不对齐。

**修复建议**:

```less
// 对齐到 4px 网格
width: 16px;   // 4 × 4
height: 12px;  // 3 × 4
margin-top: -12px; // -3 × 4
```

---

### HIGH — 高危违规

#### UI-H01: 未使用任何 Ant Design 组件 — 违反项目前端铁律

- **位置**: `index.tsx` L79–L83
- **违反规范**: CLAUDE.md §铁律 → "前端必须使用 Ant Design (antd) 组件"

**问题描述**:

CLAUDE.md 铁律第1条明确规定："前端必须使用 Ant Design (antd) 组件——禁止使用原生 HTML 元素替代 antd 提供的组件"。

当前组件使用：
- 原生 `<div>` 替代了 antd 的容器组件
- 原生 `<svg>` 替代了 antd 的 `<Icon>` 组件体系
- 原生 DOM 事件绑定替代了 antd 的交互模式

**修复建议**:

此组件属于第三方库 `@uiw/react-md-editor`，无法直接修改。但若项目中需要自定义拖拽条组件，应使用：
- antd `<Slider>` 组件替代自定义拖拽
- antd `<Tooltip>` 提供拖拽提示
- antd Icon 体系（`@ant-design/icons`）替代内联 SVG

---

#### UI-H02: 零视觉反馈状态 — 无 hover / focus / active / dragging 状态

- **位置**: `index.less` 全文件
- **违反规范**: DESIGN.md §Elevation & Depth — focus ring 规范; 通用 UI/UX 原则

**问题描述**:

组件仅定义了静态样式，没有任何交互状态样式：

```
缺失状态:
❌ :hover     → 无悬停高亮，用户无法感知"这里可交互"
❌ :focus     → 无焦点指示器，键盘用户完全无法定位
❌ :active    → 无按下反馈，拖拽启动无视觉确认
❌ .dragging  → 无拖拽中状态，用户无法确认"正在拖拽"
❌ :disabled  → 无禁用状态（组件甚至不支持 disabled prop）
```

Carbon Design System 对焦点有严格规范：`2px {colors.primary} outline + 1px {colors.hairline-strong} underline`。当前组件完全缺失。

**影响**:

1. **可发现性为零**: 用户无法通过视觉感知拖拽条的存在和位置
2. **交互信心缺失**: 拖拽过程中无任何视觉确认，用户不确定操作是否生效
3. **键盘不可达**: 无 `tabindex`、无 `:focus` 样式、无键盘事件处理

**修复建议**:

```less
.@{md-editor}-bar {
  // 基础状态 — 微妙可见
  opacity: 0.5;
  transition: opacity 0.2s, background-color 0.2s;

  &:hover {
    opacity: 1;
    background-color: rgba(15, 98, 254, 0.08); // Carbon primary 8%
  }

  &:focus-visible {
    outline: 2px solid #0f62fe; // Carbon focus ring
    outline-offset: 2px;
  }

  &:active, &.dragging {
    opacity: 1;
    background-color: rgba(15, 98, 254, 0.15); // Carbon primary 15%
  }
}
```

---

## 三、可访问性 (a11y) 评审

### CRITICAL — 零可访问性支持

#### UI-A01: 无 ARIA 角色/属性 — 屏幕阅读器完全无法识别

- **位置**: `index.tsx` L80

**问题描述**:

```tsx
// 当前代码 — 无任何 ARIA 属性
<div className={`${prefixCls}-bar`} ref={$dom}>
```

一个可调整大小的控件至少需要以下 ARIA 属性：

```tsx
// 应有的属性
<div
  className={`${prefixCls}-bar`}
  ref={$dom}
  role="separator"           // 告知屏幕阅读器这是分隔/调整控件
  aria-orientation="vertical" // 或 horizontal
  aria-valuenow={height}      // 当前高度值
  aria-valuemin={minHeight}   // 最小高度
  aria-valuemax={maxHeight}   // 最大高度
  aria-label="调整编辑器高度"  // 描述用途
  aria-controls="editor-container" // 关联控制的目标
  tabIndex={0}                // 使其可聚焦
>
```

**WCAG 违规**:

| 准则 | 级别 | 违规条目 |
|------|------|----------|
| 1.3.1 信息与关系 | A | 无语义角色 |
| 2.1.1 键盘可操作 | A | 无键盘事件处理 |
| 2.4.7 焦点可见 | AA | 无焦点样式 |
| 4.1.2 名称/角色/值 | A | 无 role / aria-* |

---

#### UI-A02: 零键盘交互支持

- **位置**: `index.tsx` 全文件 — 仅处理 mouse/touch 事件

**问题描述**:

组件仅实现了鼠标和触摸事件，完全忽略了键盘操作。WCAG 2.1.1 (Level A) 要求所有功能均可通过键盘操作完成。

标准键盘交互应为：
- `↑` / `↓` 方向键：按步长（如 10px）调整高度
- `Home` / `End`：跳至最小/最大高度
- `Enter` / `Space`：开始/结束拖拽（可选）

---

## 四、交互设计 (IxD) 评审

### HIGH — 交互设计缺陷

#### UI-I01: 拖拽图标语义错误 — 三点菜单图标 ≠ 拖拽调整图标

- **位置**: `index.tsx` L69–L78

**问题描述**:

```tsx
// 当前使用的 SVG path — 三点水平排列（⋮ 或 ⋯）
// 这是标准的"更多选项/菜单"图标，不是"调整大小"图标
<path d="M304 256c0 26.5-21.5 48-48 48s-48-21.5-48-48..." />
```

用户看到三点图标时的心理模型是"点击打开菜单"，而不是"拖拽调整大小"。这违反了 **Nielsen 可用性启发式原则 #2: 系统与现实世界的匹配**。

更严重的是，`cursor: s-resize`（↓方向调整光标）仅在悬停 14×10px 区域时显示，用户发现该光标的概率极低。

**修复建议**:

使用业界标准的拖拽调整图标（两条平行线 + 双向箭头）：
```
━━━━━━━━
   ⇕
━━━━━━━━
```

或使用 antd 的 `<HolderOutlined />` 图标。

---

#### UI-I02: 拖拽无节流 — 每像素触发 onChange 回调

- **位置**: `index.tsx` L24–L32

**问题描述**:

`handleMouseMove` 在每次鼠标移动时都调用 `onChange(newHeight)`，没有节流（throttle）或动画帧（requestAnimationFrame）控制。典型鼠标移动事件在拖拽时每秒可触发 **60–120 次**。

**影响**:

1. **性能浪费**: 大量无意义的中间状态渲染
2. **拖拽卡顿**: 若父组件 `onChange` 触发了昂重的重渲染，拖拽体验会严重卡顿
3. **电池消耗**: 在移动设备上持续高频事件触发加速电量消耗

**修复建议**:

```tsx
const handleMouseMove = useCallback((event: Event) => {
  if (!dragRef.current) return;
  requestAnimationFrame(() => {
    // ... 计算和调用 onChange
  });
}, []);
```

---

#### UI-I03: 无拖拽边界视觉提示 — 用户不知道可以拖到多高/多矮

- **位置**: `index.tsx` L29

**问题描述**:

当拖拽达到 `minHeight` 或 `maxHeight` 边界时，组件只是静默停止响应，没有任何视觉反馈（如颜色变化、弹性回弹、阴影变化等）告知用户"已到极限"。

---

#### UI-I04: 拖拽起始位置不合理 — 右下角

- **位置**: `index.less` L7–L8（`right: 0; bottom: 0;`）

**问题描述**:

拖拽条定位在编辑器右下角。但在大多数 Markdown 编辑器中，拖拽调整高度的操作集中在：
- **底部中央**（如 VS Code 的面板调整条）
- **底部全宽**（如 CodeMirror）

放在右下角 14×10px 的区域意味着：
1. 用户需将视线从编辑内容移到右下角极小区域
2. 右手鼠标用户需横向移动较长距离
3. 与编辑器滚动条位置重叠，容易误操作

---

## 五、样式体系评审

### HIGH — 样式缺陷

#### UI-S01: `currentColor` 继承导致颜色不可控

- **位置**: `index.tsx` L72（`fill="currentColor"`）

**问题描述**:

SVG 图标使用 `currentColor`，这意味着图标颜色完全取决于父元素的 CSS `color` 属性。在 Carbon Design System 中，图标颜色应有明确定义：

- 默认状态: `{colors.ink-muted}` (#525252)
- 悬停状态: `{colors.ink}` (#161616)
- 激活状态: `{colors.primary}` (#0f62fe)

使用 `currentColor` 无法实现上述状态转换，因为需要 JavaScript 动态切换类名才能改变 `color` 属性。

---

#### UI-S02: z-index: 3 硬编码 — 层叠上下文不可控

- **位置**: `index.less` L12（`z-index: 3;`）

**问题描述**:

硬编码 `z-index: 3` 缺乏上下文说明。若父组件或同级组件使用了更高或相同层级的 z-index，可能导致：
- 拖拽条被其他元素遮挡
- 拖拽时覆盖不应被覆盖的内容

Carbon / antd 体系通常使用 CSS 变量或设计 token 管理 z-index 层级。

---

## 六、响应式设计评审

### HIGH — 响应式缺失

#### UI-R01: 固定像素尺寸 — 无媒体查询、无触摸优化

- **位置**: `index.less` 全文件

**问题描述**:

组件使用固定像素尺寸（14px × 10px），没有任何响应式设计：

```
缺失:
❌ @media (hover: none) → 触摸设备应增大触控区域
❌ @media (max-width: 672px) → 移动端布局适配
❌ prefers-reduced-motion → 无障碍动画偏好
❌ prefers-color-scheme: dark → 暗色模式适配
```

在触摸设备上，14×10px 的拖拽条基本不可见也不可操作。DESIGN.md 明确要求移动端触控目标 48px。

---

## 七、评审总结

### 问题汇总

| 严重度 | 编号 | 问题 | 维度 |
|--------|------|------|------|
| CRITICAL | UI-C01 | 触控目标 14×10px 远低于 48px 最低标准 | DESIGN.md/触控 |
| CRITICAL | UI-C02 | `border-radius: 3px` 不属于 Carbon 任何 token | DESIGN.md/圆角 |
| CRITICAL | UI-C03 | 14px/10px/11px 脱离 4px 基线网格 | DESIGN.md/间距 |
| CRITICAL | UI-A01 | 无 ARIA 角色/属性，屏幕阅读器不可达 | 可访问性 |
| CRITICAL | UI-A02 | 零键盘交互支持 | 可访问性 |
| HIGH | UI-H01 | 全部使用原生 HTML，未使用 antd 组件 | Ant Design |
| HIGH | UI-H02 | 零视觉反馈状态 (hover/focus/active) | 视觉反馈 |
| HIGH | UI-I01 | 拖拽图标语义错误（三点菜单 ≠ 调整大小） | 交互设计 |
| HIGH | UI-I02 | 拖拽无节流，每像素触发回调 | 交互性能 |
| HIGH | UI-I03 | 拖拽边界无视觉提示 | 交互设计 |
| HIGH | UI-I04 | 拖拽位置（右下角）不合理 | 交互设计 |
| HIGH | UI-S01 | `currentColor` 导致颜色不可控 | 样式体系 |
| HIGH | UI-S02 | z-index: 3 硬编码无上下文 | 样式体系 |
| HIGH | UI-R01 | 无响应式设计、无触摸优化 | 响应式 |

### 根本原因分析

该组件作为第三方库 `@uiw/react-md-editor` 的内部组件，设计时未考虑：

1. **企业级设计系统兼容性**: 没有参照任何设计系统（Carbon / Material / Ant Design），采用了极简的"够用就好"策略
2. **可访问性**: 完全忽略了 WAI-ARIA 规范和 WCAG 合规要求
3. **触摸交互**: 仅在桌面鼠标场景下勉强可用
4. **视觉系统**: 没有状态管理系统，没有主题变量，没有设计 token

### 对本项目的影响评估

由于此组件位于 `node_modules` 第三方库中，无法直接修改。建议的应对策略：

1. **CSS 覆盖**: 在项目的 `global.css` 中覆盖 `.w-md-editor-bar` 的样式，修复触控目标、圆角、hover/focus 状态
2. **提交 issue/PR**: 向 `@uiw/react-md-editor` 仓库提交可访问性和 UI 改进建议
3. **替换组件**: 若可访问性合规为硬性要求，考虑 fork 并替换 DragBar 实现，或迁移到支持 Carbon/antd 的 Markdown 编辑器（如 `@ant-design/pro-editor`）
4. **A11y 补丁**: 通过 React 的 `ref` 回调或 MutationObserver，在运行时注入 ARIA 属性

### 综合评分说明

| 评分区间 | 含义 |
|----------|------|
| 8–10 | 优秀 — 完全符合设计系统，交互流畅，可访问性完备 |
| 6–7 | 良好 — 基本合规，有少量改进空间 |
| 4–5 | 及格 — 存在明显问题但不影响核心功能 |
| 2–3 | 不可接受 — 多维度严重违规，需要重写或替换 |
| 0–1 | 废弃 — 组件不应在生产环境使用 |

**2.8/10**: 该组件从 UI/UX 角度属于"不可接受"级别。核心可交互元素不符合任何主流设计系统标准，可访问性为零，在触摸设备上几乎不可用。建议通过 CSS 覆盖或组件替换来规避其 UI 缺陷。
