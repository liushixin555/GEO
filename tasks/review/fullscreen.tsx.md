# 软件 UI 专家评审：fullscreen.tsx

**文件**: `@uiw/react-md-editor/src/commands/fullscreen.tsx`
**评审角色**: 软件 UI 专家（交互设计 · 无障碍访问 · 视觉一致性 · DESIGN.md 合规 · antd 规范 · UX 规范）
**评审日期**: 2026-05-25
**代码行数**: 31 行（1 个导出命令对象）
**功能概述**: Markdown 编辑器工具栏的全屏切换命令定义——定义图标、快捷键、ARIA 属性及执行逻辑
**评审结论**: ⚠️ CONDITIONAL APPROVE — 功能可用但存在多处 UI/UX 规范缺陷，包括无障碍状态缺失、快捷键冲突、图标规范偏差、execute 逻辑缺陷

**问题统计**: CRITICAL × 1 / HIGH × 3 / MEDIUM × 3 / LOW × 2

---

## 一、UI/UX 定位与上下文

### 1.1 命令在编辑器中的角色

`fullscreen` 是 `@uiw/react-md-editor` 工具栏命令系统中的一个 `ICommand` 对象，注册到编辑器的命令栏（toolbar）中。用户通过点击工具栏按钮或使用快捷键 `Ctrl/Cmd + 0` 触发全屏切换。

```
┌──────────────────────────────────────────────────────────────┐
│               Markdown 编辑器                                 │
│                                                              │
│  ┌─ Toolbar ──────────────────────────────────────────────┐  │
│  │ [bold] [italic] [link] [quote] [code] ... [fullscreen] │  │
│  │                                         ↑              │  │
│  │                                    本次评审目标         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌─ Editing Area ────────────────────────────────────────┐  │
│  │  textarea                                              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌─ Preview Area ────────────────────────────────────────┐  │
│  │  rendered markdown                                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 ICommand 接口契约

```typescript
interface ICommand {
  name: string;           // 命令名称
  keyCommand: string;     // 键命令标识
  shortcuts?: string;     // 快捷键绑定
  value?: string;         // 命令值
  buttonProps?: object;   // 按钮属性（aria-label, title 等）
  icon?: React.ReactNode; // 工具栏图标
  execute?: Function;     // 执行逻辑
}
```

### 1.3 UI 特征分析

| 特征 | 选择 | UI/UX 规范期望 |
|------|------|----------------|
| 图标尺寸 | 12×12px | Carbon Design: 16/20/24/32px 标准尺寸 |
| 图标视口 | viewBox="0 0 520 520" | Carbon: viewBox="0 0 16 16" 或 "0 0 32 32" |
| 快捷键 | `ctrlcmd+0` | 浏览器保留快捷键（重置缩放） |
| 无障碍 | aria-label + title | 缺少 `aria-pressed`、`role` 状态 |
| 状态指示 | 无（图标不变） | 应区分全屏/退出全屏 |
| 执行逻辑 | 条件执行 | 点击按钮时 shortcuts 为 undefined，逻辑不触发 |

---

## 二、问题清单

### U1 — 🔴 CRITICAL: execute 函数在按钮点击时不触发全屏切换

**严重级别**: 🔴 CRITICAL（核心功能缺陷）
**位置**: 第 19-30 行

```typescript
execute: (
  state: TextState,
  api: TextAreaTextApi,
  dispatch?: React.Dispatch<ContextStore>,
  executeCommandState?: ExecuteCommandState,
  shortcuts?: string[],
) => {
  api.textArea.focus();
  if (shortcuts && dispatch && executeCommandState) {
    // ↑ shortcuts 在按钮点击时为 undefined，条件不满足
    dispatch({ fullscreen: !executeCommandState.fullscreen });
  }
},
```

**问题**: `shortcuts` 参数仅在快捷键触发时传入，工具栏按钮点击时该参数为 `undefined`。这意味着 `if (shortcuts && dispatch && executeCommandState)` 条件在按钮点击场景下**永远为 false**，全屏切换**只能通过快捷键触发**，工具栏按钮点击无效果。

**UX 影响**: 用户点击全屏按钮后无任何响应——这是最严重的交互缺陷。用户预期点击按钮等同于使用快捷键，但实际行为不一致。

**修复建议**:

```typescript
execute: (
  state: TextState,
  api: TextAreaTextApi,
  dispatch?: React.Dispatch<ContextStore>,
  executeCommandState?: ExecuteCommandState,
  shortcuts?: string[],
) => {
  api.textArea.focus();
  if (dispatch && executeCommandState) {
    dispatch({ fullscreen: !executeCommandState.fullscreen });
  }
},
```

移除 `shortcuts` 的条件判断，使按钮点击和快捷键都能触发全屏切换。`shortcuts` 参数不应作为是否执行逻辑的判断条件，它仅用于区分触发来源。

---

### U2 — 🟠 HIGH: 无障碍状态缺失——缺少 `aria-pressed` 和 `role` 属性

**严重级别**: 🟠 HIGH
**位置**: 第 10 行 `buttonProps`

```typescript
buttonProps: {
  'aria-label': 'Toggle fullscreen (ctrl + 0)',
  title: 'Toggle fullscreen (ctrl+ 0)'
},
```

**问题**: 全屏切换是一个**双态按钮**（toggle button），根据 WAI-ARIA 规范，应使用 `aria-pressed` 属性指示当前状态：

| 规范 | 要求 | 当前状态 |
|------|------|----------|
| WAI-ARIA Authoring Practices | 切换按钮必须使用 `aria-pressed="true/false"` | ❌ 缺失 |
| WCAG 2.1 SC 4.1.2 (Name, Role, Value) | 所有 UI 组件的角色和状态必须可编程确定 | ❌ 状态不可确定 |
| antd Button `aria-pressed` | antd 的 Button 组件支持 `aria-pressed` prop | ❌ 未使用 |

**影响**:
- 屏幕阅读器用户无法得知当前是否处于全屏状态
- 辅助技术无法正确播报按钮的状态变化
- 违反 WCAG 2.1 AA 级别的合规要求

**修复建议**:

```typescript
// buttonProps 应动态设置（需要组件层面的支持）
// 静态定义中至少声明 role
buttonProps: {
  'aria-label': '切换全屏模式',
  'aria-pressed': false,  // 需要组件渲染时动态更新
  title: '切换全屏模式 (Ctrl+0)',
  role: 'switch',
},
```

> **注意**: 由于 `ICommand` 的 `buttonProps` 是静态定义，动态的 `aria-pressed` 需要在渲染组件层面根据 `executeCommandState.fullscreen` 状态动态注入，这不是命令对象本身能解决的。这暴露了 `ICommand` 接口设计的局限性——缺少 `buttonProps` 的动态渲染能力。

---

### U3 — 🟠 HIGH: 快捷键 `ctrlcmd+0` 与浏览器保留快捷键冲突

**严重级别**: 🟠 HIGH
**位置**: 第 8 行

```typescript
shortcuts: 'ctrlcmd+0',
```

**问题**: `Ctrl+0`（Windows/Linux）和 `Cmd+0`（macOS）是**浏览器保留快捷键**，用于重置页面缩放到 100%。

| 浏览器 | Ctrl+0 / Cmd+0 行为 | 编辑器期望行为 |
|--------|---------------------|----------------|
| Chrome | 重置缩放到 100% | 切换全屏 |
| Firefox | 重置缩放到 100% | 切换全屏 |
| Safari | 重置缩放到 100% | 切换全屏 |
| Edge | 重置缩放到 100% | 切换全屏 |

**UX 影响**:
- 用户按 Ctrl+0 期望重置缩放，但触发了全屏切换（如果编辑器拦截了事件）
- 或者编辑器无法拦截此快捷键，用户无法通过快捷键触发全屏
- 无论哪种情况，用户体验都与预期不符

**修复建议**: 更换为不与浏览器冲突的快捷键：

```typescript
// 方案 1: 使用 F11（系统全屏的通用快捷键暗示）
shortcuts: 'ctrlcmd+shift+f',

// 方案 2: 使用 Ctrl+Shift+Enter（全屏暗示）
shortcuts: 'ctrlcmd+shift+enter',

// 方案 3: 使用 F5 之外的功能键
// 注：F11 已被浏览器用于原生全屏
```

推荐 `ctrlcmd+shift+f`（F = Fullscreen），符合直觉且不与浏览器快捷键冲突。

---

### U4 — 🟠 HIGH: 图标不符合 Carbon Design System 和 DESIGN.md 规范

**严重级别**: 🟠 HIGH
**位置**: 第 11-18 行

```typescript
icon: (
  <svg width="12" height="12" viewBox="0 0 520 520">
    <path
      fill="currentColor"
      d="M118 171.133334L118 342.200271C118..."
    />
  </svg>
),
```

**与 DESIGN.md / Carbon Design System 的偏差**:

| 规范项 | Carbon Design 要求 | 当前实现 | 偏差 |
|--------|-------------------|----------|------|
| 图标尺寸 | 16/20/24/32px 标准尺寸 | 12×12px | ❌ 过小 |
| 视口比例 | viewBox="0 0 16 16" 或 "0 0 32 32" | viewBox="0 0 520 520" | ❌ 非标准 |
| 路径精度 | 整数坐标，简洁路径 | 浮点坐标（171.133334） | ❌ 过度精确 |
| 图标风格 | 线性图标（stroke），2px 线宽 | 填充图标（fill） | ❌ 风格不一致 |
| 色彩 | `currentColor` | `currentColor` | ✅ 正确 |
| 内边距 | 16px 图标应含 1px 内边距 | 无内边距处理 | ⚠️ 缺失 |

**Carbon Design System 图标规范参考**:

```
Carbon 图标规格:
├── 尺寸: 16×16, 20×20, 24×24, 32×32
├── 视口: 与尺寸一致
├── 线宽: 1px (16px), 1.5px (20px), 2px (24px+)
├── 风格: 线性 (outline) 或 填充 (filled)
├── 内边距: 1px (16px), 1.5px (20px), 2px (24px+)
└── 颜色: currentColor 或语义色
```

**修复建议**: 使用 Carbon Design System 的标准全屏图标，或使用 antd 的 `FullscreenOutlined` / `FullscreenExitOutlined` 图标组件：

```typescript
import { FullscreenOutlined } from '@ant-design/icons';

// 方案 1: 使用 antd 图标（与项目技术栈一致）
icon: <FullscreenOutlined />,

// 方案 2: 使用 Carbon 风格的 SVG
icon: (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1 1h5v1H2v4H1V1zm9 0h5v5h-1V2h-4V1zM1 10h1v4h4v1H1v-5zm13 4h-4v1h5v-5h-1v4z" />
  </svg>
),
```

---

### U5 — 🟡 MEDIUM: ARIA 标注文本不一致且格式混乱

**严重级别**: 🟡 MEDIUM
**位置**: 第 10 行

```typescript
buttonProps: {
  'aria-label': 'Toggle fullscreen (ctrl + 0)',  // "ctrl + 0" — 加号前后都有空格
  title: 'Toggle fullscreen (ctrl+ 0)'           // "ctrl+ 0" — 加号后有空格，前面没有
},
```

**问题清单**:

| 问题 | 详情 |
|------|------|
| 空格不一致 | aria-label 中 `ctrl + 0`（加号两边有空格），title 中 `ctrl+ 0`（仅加号后面有空格） |
| 语言混用 | UI 文本使用英文，本项目用户群体为中文用户（根据 CLAUDE.md 要求） |
| 标签与 title 重复 | 两者内容几乎相同但又不完全相同，增加维护负担 |
| 大小写 | `ctrl` 应为 `Ctrl` 或保持一致的 `Ctrl/Cmd` 表述 |

**修复建议**:

```typescript
buttonProps: {
  'aria-label': '切换全屏模式',
  title: '切换全屏模式 (Ctrl+0)',
},
```

> 根据本项目 CLAUDE.md 铁律，前端 UI 文本应使用中文。虽然此文件来自第三方库，但在项目自定义封装层应覆盖默认的英文标签。

---

### U6 — 🟡 MEDIUM: 全屏状态切换时图标无变化——缺少状态视觉反馈

**严重级别**: 🟡 MEDIUM
**位置**: 整个命令对象

**问题**: `ICommand` 的 `icon` 属性是静态的 ReactNode，无论全屏状态如何，图标始终显示同一个 SVG。用户无法从视觉上区分"进入全屏"和"退出全屏"两个操作。

**UX 期望**:

```
正常模式:                          全屏模式:
┌──────────┐                      ┌──────────┐
│ [⛶ 全屏] │  ← 点击进入全屏     │ [⛶ 退出] │  ← 图标应变化
└──────────┘                      └──────────┘
  图标: 展开/放大                    图标: 缩小/还原
```

**Carbon Design 和 antd 的实践**:
- antd 提供 `FullscreenOutlined` 和 `FullscreenExitOutlined` 两个图标
- Carbon 提供了 `maximize` 和 `minimize` 两个图标变体
- 切换按钮的视觉状态变化是基本的 UX 要求

**修复建议**: 由于 `ICommand` 接口不支持动态图标，建议在编辑器组件层面根据全屏状态切换图标：

```typescript
// 在使用方的组件中
const fullscreenIcon = isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />;
```

> **架构限制**: `ICommand` 接口的 `icon` 字段是静态的，不支持根据运行时状态动态切换。这是库设计的局限性，需要在消费方层面补偿。

---

### U7 — 🟡 MEDIUM: execute 函数中 `api.textArea.focus()` 无条件执行

**严重级别**: 🟡 MEDIUM
**位置**: 第 26 行

```typescript
execute: (
  state: TextState,
  api: TextAreaTextApi,
  dispatch?: React.Dispatch<ContextStore>,
  executeCommandState?: ExecuteCommandState,
  shortcuts?: string[],
) => {
  api.textArea.focus();  // ← 无条件聚焦，在条件判断之前
  if (shortcuts && dispatch && executeCommandState) {
    dispatch({ fullscreen: !executeCommandState.fullscreen });
  }
},
```

**问题**: `api.textArea.focus()` 在条件判断之前执行。结合 U1 的分析（条件在按钮点击时为 false），结果是：
- **按钮点击**: 仅聚焦 textarea，不切换全屏 → 用户困惑（点击了按钮但只是聚焦了输入框）
- **快捷键触发**: 聚焦 textarea + 切换全屏 → 行为正确

**UX 影响**: 用户点击全屏按钮后，页面滚动到编辑区域（因为 focus），但全屏没有切换。这个"只聚焦不切换"的行为对用户来说是不可理解的——按钮看起来"坏了"。

**修复建议**: 将 `focus()` 移到条件判断之后：

```typescript
execute: (state, api, dispatch, executeCommandState) => {
  if (dispatch && executeCommandState) {
    dispatch({ fullscreen: !executeCommandState.fullscreen });
    api.textArea.focus();
  }
},
```

---

### U8 — 🟢 LOW: dispatch 调用可能意外覆盖 ContextStore 的其他状态

**严重级别**: 🟢 LOW
**位置**: 第 28 行

```typescript
dispatch({ fullscreen: !executeCommandState.fullscreen });
```

**问题**: `dispatch` 的类型是 `React.Dispatch<ContextStore>`，这意味着传入的对象会**替换**整个状态而非合并。如果 `ContextStore` 包含除 `fullscreen` 外的其他属性，这些属性会被丢失。

```typescript
// 假设 ContextStore 定义如下:
interface ContextStore {
  fullscreen?: boolean;
  preview?: string;
  // ... 其他状态
}

// 当前 dispatch 会将其他状态全部清除
dispatch({ fullscreen: true });  // preview 等其他属性丢失
```

> **不确定性**: 此问题取决于 `ContextStore` 的实际定义和 React context 的 reducer 实现。如果 reducer 使用了合并策略（`{ ...state, ...action }`），则不存在此问题。

---

### U9 — 🟢 LOW: SVG path 数据过度复杂——一个全屏图标不需要 700+ 字符的路径

**严重级别**: 🟢 LOW
**位置**: 第 14-16 行

**问题**: 当前的 SVG path 数据约 700+ 字符，包含大量浮点坐标，描述的似乎是一个带有圆角矩形和四个方向箭头的复合图标。对于一个简单的全屏切换图标，这个路径过于复杂：

- 图标渲染开销增大（虽然是静态 SVG，影响可忽略）
- 难以维护和理解
- 与 Carbon Design 的简洁图标风格不符

**对比**: Carbon Design 的 `maximize` 图标路径仅约 100 字符：

```
M1 1h5v1H2v4H1V1zm9 0h5v5h-1V2h-4V1zM1 10h1v4h4v1H1v-5zm13 4h-4v1h5v-5h-1v4z
```

---

## 三、UI/UX 评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| **功能正确性** | 3 | 按钮点击不触发全屏（U1），核心功能断裂 |
| **无障碍（A11Y）** | 4 | 有 aria-label 和 title，但缺少 aria-pressed 状态指示 |
| **视觉规范合规** | 3 | 图标不符合 Carbon Design 尺寸/风格规范（U4） |
| **交互一致性** | 3 | 快捷键冲突（U3）、按钮与快捷键行为不一致（U1） |
| **状态反馈** | 2 | 无全屏/退出全屏的视觉区分（U6） |
| **文本规范** | 4 | 标签不一致、非中文（U5） |
| **代码质量** | 5 | 结构清晰但逻辑有缺陷（U7、U8） |
| **综合 UI 评分** | **3.4 / 10** | |

---

## 四、DESIGN.md 合规性检查

| DESIGN.md 规范 | fullscreen.tsx 现状 | 合规 |
|----------------|-------------------|------|
| IBM Plex Sans 字体 | SVG 图标不涉及字体 | N/A |
| 圆角 0px（flat-square） | SVG 图标不涉及容器圆角 | N/A |
| IBM Blue (#0f62fe) 作为唯一强调色 | 使用 `currentColor`，继承文本色 | ✅ |
| 无阴影（hairline 分隔） | 不涉及 | N/A |
| 4px 基础网格间距 | 12×12 图标不符合 4px 网格 | ❌ |
| 48px 最小触摸目标 | 工具栏按钮尺寸由外部容器决定 | ⚠️ |
| 语义色彩（success/warning/error/info） | 不涉及语义色彩 | N/A |
| letter-spacing: 0.16px | 不涉及文本排版 | N/A |

**合规总结**: 图标使用 `currentColor` 是正确做法（可跟随主题色变化），但 12px 的图标尺寸违反了 DESIGN.md 基于 4px 网格的间距系统（12 不是 16 的因数，也不是标准图标尺寸）。

---

## 五、antd 规范合规性检查

| antd 规范 | fullscreen.tsx 现状 | 合规 |
|-----------|-------------------|------|
| 使用 antd Button 组件 | 未使用（第三方库自带按钮渲染） | N/A |
| antd 图标体系（@ant-design/icons） | 使用原生 SVG | ❌ |
| antd Tooltip 替代 title | 使用原生 title 属性 | ❌ |
| antd 中文国际化 | 文本为英文 | ❌ |
| antd 主题 token 集成 | 使用 currentColor 继承 | ⚠️ 部分 |

**antd 合规建议**: 在项目封装层，应将此命令的图标替换为 antd 图标，并使用 antd 的 Tooltip 组件替代原生 title：

```typescript
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

// 封装全屏命令，使用 antd 图标
const fullscreenCommand = {
  ...fullscreen,
  icon: <FullscreenOutlined style={{ fontSize: 16 }} />,
  buttonProps: {
    'aria-label': '切换全屏模式',
  },
};
```

---

## 六、对本项目（by_geo）的影响评估

### 6.1 当前使用方式

本项目在文章编辑/知识库编辑等场景中使用 `@uiw/react-md-editor`，全屏命令是编辑器工具栏的默认命令之一。

### 6.2 风险评估

| 风险 | 触发条件 | 可能性 | 影响 | 状态 |
|------|----------|--------|------|------|
| 全屏按钮点击无响应 | 用户点击工具栏全屏按钮 | **高** — 日常操作 | 用户困惑，认为功能损坏 | 🔴 已确认 |
| Ctrl+0 快捷键冲突 | 用户按 Ctrl+0 意图重置缩放 | **中** | 缩放未重置或全屏意外触发 | 🟠 潜在 |
| 图标过小难以辨认 | 在高 DPI 屏幕或远距离查看 | **中** | 辨识困难 | 🟡 视觉 |
| 屏幕阅读器无法识别全屏状态 | 视障用户使用辅助技术 | **低**（取决于用户群） | 无障碍合规风险 | 🟡 无障碍 |

### 6.3 建议

1. **短期**: 在项目封装层覆盖 `buttonProps` 为中文标签，考虑替换图标为 antd 图标
2. **中期**: 向 `@uiw/react-md-editor` 提交 issue/PR 修复 execute 函数的按钮点击问题
3. **长期**: 评估是否需要自定义全屏命令实现，彻底解决图标状态切换和快捷键冲突问题

---

## 七、改进后的参考代码

```typescript
import React from 'react';
import { type ICommand, TextState, type TextAreaTextApi } from './';
import { type ContextStore, type ExecuteCommandState } from '../Context';

export const fullscreen: ICommand = {
  name: 'fullscreen',
  keyCommand: 'fullscreen',
  shortcuts: 'ctrlcmd+shift+f',  // 修复: 避免与浏览器 Ctrl+0 冲突
  value: 'fullscreen',
  buttonProps: {
    'aria-label': '切换全屏模式',
    'title': '切换全屏模式 (Ctrl+Shift+F)',
  },
  icon: (
    // 修复: 使用 16×16 标准尺寸，简洁路径
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 1h5v1H2v4H1V1zm9 0h5v5h-1V2h-4V1zM1 10h1v4h4v1H1v-5zm13 4h-4v1h5v-5h-1v4z" />
    </svg>
  ),
  execute: (
    state: TextState,
    api: TextAreaTextApi,
    dispatch?: React.Dispatch<ContextStore>,
    executeCommandState?: ExecuteCommandState,
    shortcuts?: string[],
  ) => {
    // 修复: 移除 shortcuts 条件，使按钮点击也能触发全屏
    if (dispatch && executeCommandState) {
      dispatch({ fullscreen: !executeCommandState.fullscreen });
      api.textArea.focus();
    }
  },
};
```

---

## 八、总结

### 核心发现

`fullscreen.tsx` 是一个 31 行的命令定义对象，结构清晰，但存在多处 UI/UX 规范缺陷。最严重的问题是 **execute 函数的逻辑缺陷导致按钮点击无法触发全屏切换**（U1），这是一个用户可直接感知的功能缺陷。其次，**缺少 `aria-pressed` 无障碍状态**（U2）和**快捷键与浏览器冲突**（U3）是影响用户体验和合规性的重要问题。

图标不符合 Carbon Design System 的规范（U4），但在实际使用中由于 `currentColor` 的使用，视觉上不会造成严重冲突——主要问题是尺寸过小和路径过度复杂。

### 行动建议优先级

| 优先级 | 编号 | 建议 | 影响范围 |
|--------|------|------|----------|
| 🔴 P0 | U1 | 修复 execute 函数，移除 shortcuts 条件判断 | 核心功能可用性 |
| 🟠 P1 | U2 | 添加 `aria-pressed` 状态指示 | 无障碍合规 |
| 🟠 P1 | U3 | 更换快捷键为 `ctrlcmd+shift+f` | 快捷键冲突 |
| 🟠 P1 | U4 | 使用标准尺寸图标或 antd 图标 | 视觉规范 |
| 🟡 P2 | U5 | 统一 ARIA 标注文本，使用中文 | 文本规范 |
| 🟡 P2 | U6 | 根据全屏状态切换图标 | 状态反馈 |
| 🟡 P2 | U7 | 将 focus() 移到条件判断之后 | 交互逻辑 |
| 🟢 P3 | U8 | 评估 dispatch 是否会覆盖其他状态 | 数据安全 |
| 🟢 P3 | U9 | 简化 SVG path 数据 | 代码可维护性 |
