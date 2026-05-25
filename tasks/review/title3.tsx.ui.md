# 软件UI专家评审：title3.tsx

**文件**: `@uiw/react-md-editor/src/commands/title3.tsx`
**评审角色**: 软件UI专家（用户界面设计 · 交互体验 · 设计系统合规 · 可访问性 · 视觉一致性 · 开发者体验）
**评审日期**: 2026-05-25
**代码行数**: 23 行（1 个主命令对象 `heading3` + 1 个废弃别名 `title3`）
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 命令定义功能正确、无障碍属性基本完整，但图标与 Carbon Design System 严重脱节、视觉层级逻辑混乱、内联样式硬编码破坏主题化能力、快捷键与浏览器冲突）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | Markdown 编辑器三级标题（H3）工具栏命令定义 |
| UI 职责 | 渲染工具栏按钮图标、注册快捷键、执行标题切换操作 |
| 导出 | `heading3`（推荐）+ `title3`（`@deprecated` 废弃别名） |
| 图标类型 | 纯文本 `<div>` 内联样式（非 SVG / antd 图标） |
| 无障碍 | `aria-label` + `title` 属性存在，但图标元素缺少语义标注 |
| Carbon 合规 | ❌ 不合规 — 内联样式、无 Token 对齐、圆角/字号/字重均偏离 |
| antd 合规 | ❌ 不合规 — 使用原生 `<div>` 而非 antd 组件 |

**完整源码**:

```tsx
import React from 'react';
import { headingExecute } from './headingUtils';
import { ICommand, ExecuteState, TextAreaTextApi } from './';

export const heading3: ICommand = {
  name: 'heading3',
  keyCommand: 'heading3',
  shortcuts: 'ctrlcmd+3',
  prefix: '### ',
  suffix: '',
  buttonProps: { 'aria-label': 'Insert Heading 3 (ctrl + 3)', title: 'Insert Heading 3 (ctrl + 3)' },
  icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    headingExecute({ state, api, prefix: state.command.prefix!, suffix: state.command.suffix });
  },
};

/**
 * @deprecated Since v4.0.0. Use `heading3` instead.
 * Scheduled for removal in v5.0.0.
 * @see heading3
 */
export const title3: ICommand = heading3;
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计（Visual Design） | 3 | 纯文本 div 图标无层次感，与 Carbon Design System 的 IBM Plex Sans 字重/字号规范完全脱节 |
| 设计系统合规（Design System Alignment） | 2 | 无 Token 使用、无 Carbon 字体规范、无 antd 组件替代、内联样式硬编码 |
| 交互体验（Interaction Design） | 5 | 快捷键注册正确但与浏览器冲突，execute 逻辑委托良好 |
| 可访问性（Accessibility） | 5 | buttonProps 有 aria-label 但图标 div 无 role/aria-hidden，英文标签不适配中文场景 |
| 视觉一致性（Visual Consistency） | 3 | 与同库 bold/italic/link 等 SVG 图标风格割裂，fontSize 序列非等差 |
| 响应式适配（Responsive Design） | 4 | 固定 15px 字号在缩放/高 DPI 下可能模糊，无响应式策略 |
| 主题化支持（Theming） | 1 | 内联样式完全锁定视觉，无 CSS 变量/Token 出口 |
| 国际化（i18n） | 2 | "Heading 3" 硬编码英文，无法 i18n 替换 |
| **综合评分** | **3.1 / 10** | 命令定义功能性可用，但 UI 层面与 Carbon Design System + antd 体系严重脱节 |

---

## 三、Carbon Design System 合规检查

### 与 DESIGN.md 规范的逐项对比

| Carbon 规范 | title3.tsx 实际 | 合规 | 差距分析 |
|---|---|---|---|
| **字体**: IBM Plex Sans | 未指定（继承浏览器默认） | ❌ | 图标文本应显式使用 IBM Plex Sans，当前继承系统 serif/sans-serif 回退链 |
| **字号**: Token 体系 `{typography.body-sm}` 14px | `fontSize: 15` 硬编码 | ❌ | 15px 不在 Carbon 字号 Token 体系中（12/14/16/18/20/24/32/42/60/76） |
| **字重**: body 400 / emphasis 600 / display 300 | 未指定（默认 400） | ⚠️ | 400 是默认值，但标题图标应使用 500 或 600 以增强辨识度 |
| **颜色**: `{colors.ink}` #161616 | 未指定（继承） | ⚠️ | 正常模式下可接受，但暗色模式下文本不会自动反色 |
| **圆角**: `{rounded.none}` 0px | div 默认 0px | ✅ | 无圆角，符合 Carbon 扁平几何 |
| **间距**: 4px 基数网格 | 无间距设置 | — | 工具栏按钮间距由外部容器控制 |
| **无阴影**: `{elevation.0}` | 无阴影 | ✅ | 符合 Carbon 无阴影原则 |
| **主题 Token**: CSS 变量系统 | 无任何 Token 引用 | ❌ | 完全硬编码，无法被主题系统覆盖 |

### Carbon 字号 Token 体系对照

```
Carbon Token 体系（DESIGN.md）:
  caption     12px  ← 最小 UI 文本
  body-sm     14px  ← 图标/按钮辅助文本
  body        16px  ← 默认正文
  body-lg     18px  ← 强调正文
  subhead     20px  ← 副标题
  card-title  24px  ← 卡片标题
  headline    32px  ← 页面标题
  display-md  42px  ← 展示标题（weight 300）
  display-lg  60px  ← 大展示标题
  display-xl  76px  ← 最大展示标题

title3.tsx 使用:
  fontSize: 15  ← ❌ 不在 Token 体系中
```

---

## 四、UI 层面问题清单

### P1 — 严重问题（破坏设计系统一致性与用户体验）

#### UI-P1-01：图标使用纯文本 `<div>` — 与 Carbon Design System 视觉语言完全冲突

**位置**: 第 12 行

```tsx
icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
```

**问题分析**:

1. **视觉重量不足** — 15px 纯文本 "Heading 3" 在工具栏中视觉重量极低，与 bold（粗体 SVG）、italic（斜体 SVG）、link（链接 SVG）等矢量图标形成严重的视觉割裂。用户在快速扫描工具栏时，纯文本标签的辨识度远低于 SVG 图标。

2. **与 Carbon 组件规范冲突** — Carbon Design System 的工具栏按钮图标应使用 16px 或 20px SVG 矢量图标（参考 `@carbon/icons-react`），而非纯文本 div。`fontSize: 15` 不在 Carbon 字号 Token 体系中。

3. **高 DPI 模糊风险** — 纯文本在 1.5x/2x DPI 缩放场景下可能产生亚像素渲染模糊，而 SVG 矢量图标在任何分辨率下均保持清晰。

4. **本项目已覆盖此问题** — `MarkdownEditor.tsx` 的 `commandsFilter` 已将 heading 命令的图标覆盖为 `<span style={{ fontSize: 20 - levelNum * 2, fontWeight: 500 }}>H{level}</span>`，说明上游的纯文本图标**已被项目识别为不可接受并进行了修复**。

**项目覆盖方案（MarkdownEditor.tsx 第 326-336 行）**:

```tsx
if (command.name?.startsWith('heading') && /^heading[1-6]$/.test(command.name)) {
  const level = command.name.replace('heading', '');
  const levelNum = Number(level);
  return {
    ...command,
    icon: <span style={{ fontSize: 20 - levelNum * 2, fontWeight: 500 }}>H{level}</span>,
    // ...
  };
}
```

**覆盖方案评分**:

| 检查项 | 状态 | 说明 |
|---|---|---|
| 视觉辨识度提升 | ✅ | "H3" 简写比 "Heading 3" 更简洁，字重 500 增强辨识 |
| 等差字号序列 | ✅ | `20 - level * 2` 生成 18/16/14/12/10/8 的等差序列 |
| Carbon 字号合规 | ⚠️ | 14px/16px/18px 在 Token 体系中，但 10px/8px 过小 |
| 仍为内联样式 | ❌ | 未使用 CSS 变量/Token，主题化受限 |
| antd 组件替代 | ❌ | 仍为原生 `<span>`，未使用 antd Typography 组件 |

---

#### UI-P1-02：`fontSize: 15` 不在 Carbon 字号 Token 体系中 — 破坏 4px 基数网格

**位置**: 第 12 行

```tsx
icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
```

**问题分析**:

Carbon Design System 基于 **4px 基数网格**（`{spacing.xxs}` 4px），所有尺寸 Token 均为 4 的倍数或其合理倍率：12/14/16/18/20/24/32/42/60/76。`fontSize: 15` 违反 4px 网格约束，在精确对齐的 Carbon 布局中会导致子像素偏移。

**heading1-4 的字号序列对比**:

| 文件 | fontSize | 与 4px 网格对齐 | Carbon Token 最近匹配 |
|---|---|---|---|
| title1.tsx | 18 | ✅（18 = 4×4.5，在 Token 中） | `{typography.body-lg}` |
| title2.tsx | 16 | ✅ | `{typography.body}` |
| **title3.tsx** | **15** | **❌** | **无匹配（14 或 16）** |
| title4.tsx | 14 | ✅ | `{typography.body-sm}` |

**建议修复**: 使用 `{typography.body-sm}` 14px 或 `{typography.body}` 16px，保持 Token 体系内的一致性。

---

#### UI-P1-03：内联样式完全锁定视觉 — 无法被主题系统覆盖

**位置**: 第 12 行

```tsx
icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
```

**问题分析**:

1. **CSS `!important` 无法覆盖** — React 内联样式的优先级高于 CSS 类选择器，外部主题系统无法通过 CSS 变量或 class 覆盖 `fontSize: 15`。只有 `commandsFilter`（运行时替换）能修改图标。

2. **暗色模式失效** — 当编辑器切换暗色模式时，`<div>` 的文本颜色不会自动反色（未使用 `currentColor` 或主题变量）。在暗色背景上，"Heading 3" 可能保持黑色文本，导致**对比度不足**（WCAG 2.1 SC 1.4.3 要求至少 4.5:1）。

3. **品牌定制阻断** — 如果项目需要将工具栏图标替换为 IBM Plex Sans 特定字重（如 display 的 weight 300），内联样式中的隐式 font-weight 400 会被浏览器默认值锁定。

**与 antd 主题系统的冲突**:

antd 5.x 通过 ConfigProvider + Design Token 管理全局主题。所有 antd 组件的字号/颜色/间距均可通过 Token 覆盖。但 `heading3` 的图标是原生 `<div>`，完全脱离 antd 主题管线。这意味着：
- antd ConfigProvider 的 `theme.token.fontSize` 无法影响此图标
- antd 暗色算法（`theme.darkAlgorithm`）无法自动适配此图标

---

### P2 — 中等问题（影响交互体验与可访问性）

#### UI-P2-01：图标 `<div>` 缺少无障碍语义标注 — 屏幕阅读器重复播报

**位置**: 第 12 行

```tsx
icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
```

**问题分析**:

`buttonProps` 已提供 `aria-label: 'Insert Heading 3 (ctrl + 3)'`，这是正确的。但图标 `<div>` 本身：
- 缺少 `role="img"` 或 `aria-hidden="true"`
- 屏幕阅读器在播报按钮时，会先读 `aria-label`，再读 `<div>` 内的文本 "Heading 3"——**重复播报**

**WCAG 2.1 违规分析**:

| WCAG 标准 | 级别 | 违规 | 说明 |
|---|---|---|---|
| SC 1.1.1 非文本内容 | A | ❌ | 图标 div 未提供 `role="img"` 替代文本 |
| SC 4.1.2 名称/角色/值 | A | ⚠️ | 按钮有 aria-label，但内部 div 与之竞争 |
| SC 2.4.4 链接目的 | AAA | ✅ | aria-label 明确描述功能 |

**修复方案**:

```tsx
// 方案 A: 标记为装饰性图像（推荐——aria-label 已提供足够信息）
icon: <div style={{ fontSize: 15, textAlign: 'left' }} role="img" aria-hidden="true">Heading 3</div>,

// 方案 B: 使用 SVG 矢量图标（系统性修复）
icon: (
  <svg viewBox="0 0 24 16" width="24" height="16" role="img" aria-hidden="true">
    <text x="0" y="12" fontSize="14" fontWeight="500" fill="currentColor">H3</text>
  </svg>
),
```

---

#### UI-P2-02：快捷键 `Ctrl+3` 与浏览器标签页切换冲突 — 用户可能意外离开编辑器

**位置**: 第 8 行

```tsx
shortcuts: 'ctrlcmd+3',
```

**冲突分析**:

| 浏览器 | Ctrl+3 (Windows) / Cmd+3 (macOS) 默认行为 |
|---|---|
| Chrome | 切换到第 3 个标签页 |
| Firefox | 切换到第 3 个标签页 |
| Safari | 切换到第 3 个标签页 |
| Edge | 切换到第 3 个标签页 |

**用户体验影响**:

1. 用户在编辑 Markdown 时按下 `Ctrl+3` 期望插入 H3 标题
2. 浏览器响应 `Ctrl+3` 切换到第 3 个标签页
3. 编辑器可能同时执行标题插入（如果 `preventDefault` 被调用），但用户已被切换到其他标签页
4. **用户丢失编辑上下文**，需要手动切回编辑器标签页

**注意**: 本项目的 `MarkdownEditor.tsx` 未拦截 `Ctrl+3`（仅拦截了 `Ctrl+J`、`Ctrl+L`、`Ctrl+H`、`Ctrl+Q`），因此此冲突在本项目中也**未得到缓解**。

**建议**: 在 `MarkdownEditor.tsx` 的键盘事件拦截器中添加 `Ctrl+1` ~ `Ctrl+6` 的拦截，或重映射标题快捷键为 `Ctrl+Shift+1` ~ `Ctrl+Shift+6`。

---

#### UI-P2-03：英文硬编码 `"Heading 3"` — 中文环境下可读性差

**位置**: 第 12 行、第 11 行

```tsx
// 图标文本
icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
// 无障碍标签
buttonProps: { 'aria-label': 'Insert Heading 3 (ctrl + 3)', title: 'Insert Heading 3 (ctrl + 3)' },
```

**问题分析**:

1. **图标文本** `"Heading 3"` — 在中文界面的 Markdown 编辑器工具栏中，英文标签与其他本地化按钮的视觉语言不一致
2. **ARIA 标签** — `"Insert Heading 3 (ctrl + 3)"` 为英文，屏幕阅读器会朗读英文而非中文
3. **title 属性** — 鼠标悬停提示为英文，中文用户可能不理解

**本项目覆盖情况（MarkdownEditor.tsx 第 336-339 行）**:

```tsx
buttonProps: {
  'aria-label': `${level}级标题 (Ctrl+${level})`,
  title: `${level}级标题 (Ctrl+${level})`,
},
```

项目已将 ARIA 标签和 title 覆盖为中文 `"3级标题 (Ctrl+3)"`，**部分缓解了此问题**。但图标文本 `"Heading 3"` 仍被替换为 `"H3"`，比原始的 `"Heading 3"` 更好但仍为英文字母。

**Carbon Design System 的 i18n 规范**: Carbon 组件支持通过 `packages/i18n` 包进行多语言替换，heading 命令的文本应通过 i18n 系统而非硬编码。

---

### P3 — 低等问题（改善建议）

#### UI-P3-01：`textAlign: 'left'` 在按钮容器中冗余

**位置**: 第 12 行

```tsx
icon: <div style={{ fontSize: 15, textAlign: 'left' }}>Heading 3</div>,
```

**分析**: 工具栏按钮通常是固定宽度的正方形或矩形容器，图标居中对齐是标准做法。`textAlign: 'left'` 使 "Heading 3" 文本在按钮内左对齐，与同行的 bold/italic 等居中 SVG 图标**视觉不一致**。

在标题下拉菜单（group 子菜单）中，左对齐是合理的（列表项文本），但在工具栏按钮的直接展示中，左对齐会导致文本偏向一侧。

---

#### UI-P3-02：标题级联字号序列逻辑不一致 — H2/H3 区分度不足

**位置**: 第 12 行（对比同族文件）

| 文件 | fontSize | 视觉大小 | 与前级差距 |
|---|---|---|---|
| title1.tsx | 18 | H1 最大 | — |
| title2.tsx | 16 | H2 次之 | -2px |
| **title3.tsx** | **15** | **H3** | **-1px** |
| title4.tsx | 14 | H4 | -1px |

**等差序列**: `18, 16, 15, 14` — H1→H2 差 2px，H2→H3 差 1px，H3→H4 差 1px。

**用户感知**: 16px 和 15px 的视觉差异约为 6.25%，人类视觉系统的最小可觉差（JND）约为 5-10%。这意味着 **H2 和 H3 在下拉菜单中的视觉区分度可能不足**，用户需要更仔细地辨认。

**项目覆盖方案已修复**: `MarkdownEditor.tsx` 使用 `20 - levelNum * 2`，生成 `18, 16, 14, 12, 10, 8` 的严格等差序列（每级 -2px），此问题**在项目中已被覆盖解决**。

---

#### UI-P3-03：废弃别名 `title3` 仍在活跃使用 — 语义矛盾

**位置**: 第 23 行 + 上游 `index.ts`

```tsx
export const title3: ICommand = heading3;  // 标记 @deprecated
```

上游 `getCommands()` 仍通过 `title1-6` 引用这些命令（非 `heading1-6`），意味着：
- 工具栏实际使用的是"废弃"导出
- 如果 v5.0.0 真的移除 `title3`，`getCommands()` 将直接崩溃

这不直接影响 UI，但暗示**废弃策略与实际使用不一致**，可能在库升级时引发 UI 功能回归。

---

## 五、与本项目 MarkdownEditor.tsx 的交互分析

### 项目覆盖层如何修正上游 UI 缺陷

本项目的 `MarkdownEditor.tsx` 通过 `commandsFilter` 回调对 heading 命令进行了**全面的 UI 覆盖**：

| 上游缺陷 | 项目覆盖方案 | 效果 |
|---|---|---|
| 纯文本 div 图标 | `<span>H{level}</span>` 简写 | ✅ 视觉更简洁 |
| fontSize: 15 非 Token | `20 - levelNum * 2` 等差序列 | ✅ 序列一致 |
| 英文 aria-label | `"${level}级标题 (Ctrl+${level})"` | ✅ 中文本地化 |
| 英文 title | 同上 | ✅ 中文本地化 |
| prefix! 非空断言 | 防御性检查 `if (!state.command?.prefix) return` | ✅ 运行时安全 |
| 无错误边界 | try-catch 包裹 execute | ✅ 崩溃防护 |
| 无选区验证 | selection 范围校验 | ✅ 边界安全 |

### 覆盖层仍未解决的问题

| 问题 | 状态 | 说明 |
|---|---|---|
| 内联样式（非 CSS Token） | ❌ | `fontSize: 20 - levelNum * 2` 仍为内联，无法被主题系统覆盖 |
| 暗色模式适配 | ❌ | `currentColor` 可能在暗色模式下正常工作，但未经测试验证 |
| 快捷键冲突 | ❌ | `Ctrl+3` 未被 `preventBrowserShortcut` 拦截 |
| 非 antd 组件 | ❌ | 图标仍为原生 `<span>`，未使用 antd Typography.Text |
| 非标准字号 | ⚠️ | `20 - 3*2 = 14px` 在 Token 体系中，但 H5(10px) 和 H6(8px) 过小 |

---

## 六、antd 合规检查

### antd 组件替代分析

| 上游实现 | antd 替代方案 | 可行性 | 说明 |
|---|---|---|---|
| `<div>` 图标 | `Typography.Text` | ✅ | 可用 `<Typography.Text style={{ fontSize, fontWeight: 500 }}>H3</Typography.Text>` |
| `buttonProps` | antd `Button` | ❌ | 命令系统不使用 antd Button，按钮由 MDEditor 内部渲染 |
| `title` 属性 | antd `Tooltip` | ❌ | 同上，无法在命令定义中注入 Tooltip |

**核心限制**: `@uiw/react-md-editor` 的命令系统（`ICommand` 接口）使用原生 JSX 作为 `icon`，由库内部渲染为 `<button>` 元素。antd 组件无法直接替换这些内部元素——只能通过 `commandsFilter` 在运行时替换 `icon` 属性。

**可行的 antd 对齐方案**:

```tsx
// 在 commandsFilter 中使用 antd 图标
import { FontSizeOutlined } from '@ant-design/icons';

// 标题命令组（group）使用 antd 图标
if (command.keyCommand === 'group') {
  return {
    ...command,
    icon: <FontSizeOutlined style={{ fontSize: 16 }} />,
  };
}

// heading 命令使用带 antd 风格的 span
if (command.name?.startsWith('heading')) {
  return {
    ...command,
    icon: (
      <span style={{
        fontSize: 20 - levelNum * 2,
        fontWeight: 500,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>
        H{level}
      </span>
    ),
  };
}
```

本项目 `MarkdownEditor.tsx` 已部分实施此方案（第 326-336 行），但**未添加 `fontFamily` 声明**以对齐 Carbon 的 IBM Plex Sans 规范。

---

## 七、修复优先级与建议

### 对本项目的即时建议（MarkdownEditor.tsx 层面）

| 优先级 | 问题 | 修复方案 | 影响 |
|---|---|---|---|
| 🔴 P1 | 快捷键 Ctrl+1-6 未拦截 | 在 `preventBrowserShortcut` 中添加 `1-6` 数字键拦截 | 防止标签页切换 |
| 🟡 P2 | 图标内联样式无 Carbon 字体 | 添加 `fontFamily: "'IBM Plex Sans', sans-serif"` | Carbon 字体合规 |
| 🟡 P2 | H5/H6 图标字号过小（10/8px） | 设定最小 12px 下限：`Math.max(12, 20 - level * 2)` | 可读性 |
| 🟢 P3 | 图标 span 缺少 `role="img"` + `aria-hidden` | 添加无障碍属性 | WCAG 合规 |

### 对上游库的理想修复（title3.tsx 层面）

| 优先级 | 问题 | 修复方案 | 影响 |
|---|---|---|---|
| 🔴 P1 | 纯文本 div 图标 | 替换为 SVG 或使用 `currentColor` + CSS class | 视觉一致性 |
| 🔴 P1 | 内联样式硬编码 | 改用 CSS Module + CSS 变量 | 主题化 |
| 🔴 P1 | fontSize 不在 Token 中 | 改为 14px（`body-sm`）或 16px（`body`） | Carbon 合规 |
| 🟡 P2 | 缺少 aria-hidden | 添加 `role="img" aria-hidden="true"` | WCAG |
| 🟡 P2 | 英文硬编码 | 通过 i18n 系统注入文本 | 国际化 |
| 🟢 P3 | textAlign: 'left' 冗余 | 移除或改为 'center' | 视觉对齐 |

---

## 八、评审总结

### UI 优势

1. **无障碍基础存在** — `buttonProps` 提供了 `aria-label` 和 `title`，虽然不完美但已满足 WCAG A 级别的基本要求
2. **废弃策略规范** — `title3` → `heading3` 的迁移路径清晰，含版本号和 `@see` 引用
3. **逻辑委托良好** — `execute` 委托给 `headingExecute` 工具函数，关注点分离合理
4. **项目覆盖层全面** — `MarkdownEditor.tsx` 的 `commandsFilter` 已覆盖大部分上游 UI 缺陷

### UI 缺陷

1. **图标与 Carbon Design System 严重脱节** — 纯文本 div、非 Token 字号、无主题支持（P1）
2. **内联样式完全锁定视觉** — 无法被 CSS 变量/主题系统/暗色模式覆盖（P1）
3. **图标风格与同库其他命令割裂** — 纯文本 vs SVG，视觉一致性差（P1）
4. **快捷键与浏览器冲突** — Ctrl+3 会触发标签页切换，项目未拦截（P2）
5. **缺少图标语义标注** — div 无 role/aria-hidden，屏幕阅读器重复播报（P2）
6. **英文硬编码** — 图标文本和 ARIA 标签均为英文，中文场景不适配（P2）

### 最终建议

title3.tsx 的 UI 实现评分 **3.1/10**，属于典型的"功能可用但设计系统脱节"的第三方库代码。**对本项目的实际影响已被 `MarkdownEditor.tsx` 的覆盖层大幅缓解**，但仍有 3 个问题未被覆盖：快捷键冲突（Ctrl+3 未拦截）、Carbon 字体缺失（未声明 IBM Plex Sans）、H5/H6 图标过小。

建议在 `MarkdownEditor.tsx` 的 `preventBrowserShortcut` 中添加 `Ctrl+1-6` 拦截，并在 heading 图标的内联样式中显式声明 `fontFamily: "'IBM Plex Sans', sans-serif"` 和最小字号 12px 下限。

---

*评审人: 软件UI专家*
*评审日期: 2026-05-25*
