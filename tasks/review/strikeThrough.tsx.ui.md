# 软件UI专家评审：strikeThrough.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/strikeThrough.tsx`
**评审角色**: 软件UI专家（设计系统合规 · 可访问性 · 交互设计 · 国际化 · 视觉规范 · 响应式 · antd 规范）
**评审日期**: 2026-05-25
**代码行数**: 36 行（1 个导出 `ICommand` 对象：`strikethrough`）
**功能概述**: Markdown 编辑器工具栏"删除线"命令，通过 `~~` 包裹/解包裹选中文本，提供按钮图标 + `Ctrl+Shift+X` 快捷键触发
**评审结论**: ⚠️ CONDITIONAL APPROVE — 6.5/10，核心功能完整但存在多项可访问性和设计系统合规问题；2 项 HIGH 级（触控目标不足 + 中文可访问性缺失）、3 项 MEDIUM 级、3 项 LOW 级、2 项 INFO 级改进建议

**问题统计**: HIGH × 2 / MEDIUM × 3 / LOW × 3 / INFO × 2

---

## 一、UI/UX 总览

### 1.1 设计系统合规矩阵

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  strikeThrough.tsx — DESIGN.md 合规矩阵                    │
│                                                                          │
│  DESIGN.md / Carbon 规范             当前实现              合规状态        │
│  ─────────────────────────────────────────────────────────────────────    │
│  圆角: 0px（flat-square）            按钮由框架渲染          ✅ N/A         │
│  字体: IBM Plex Sans                 继承框架默认            ✅ N/A         │
│  主色: IBM Blue #0f62fe              currentColor 继承       ✅ 合规        │
│  触控目标: ≥48px                     icon 12×12px            ❌ 不合规      │
│  spacing: 4px 基数                   按钮由框架渲染          ✅ N/A         │
│  按钮: rounded none                  按钮由框架渲染          ✅ N/A         │
│  可访问性: ARIA 属性                  aria-label ✅ title ✅   ⚠️ 部分合规   │
│  国际化: 中文支持                     全英文硬编码             ❌ 不合规      │
│  键盘交互: 快捷键                     ctrl+shift+x ✅         ✅ 合规        │
│  反馈: 操作状态提示                   无视觉反馈               ⚠️ 缺失       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 UI/UX 维度评估

| UI/UX 维度 | 评分 (1-10) | 说明 |
|------------|-------------|------|
| **可访问性 (a11y)** | 5.0 | 有 aria-label/title 但英文硬编码，SVG 缺 aria-hidden |
| **设计系统合规** | 6.0 | currentColor 正确，但触控目标不足，无设计 token 关联 |
| **交互设计** | 7.5 | 快捷键合理无冲突，执行流程线性直觉 |
| **国际化 (i18n)** | 3.0 | 所有用户可见文本均为英文硬编码，零 i18n 支持 |
| **视觉一致性** | 7.0 | 与 bold/italic/code 同簇命令结构一致 |
| **响应式/触控** | 4.0 | 图标 12px 过小，触控目标依赖框架但无显式保障 |
| **错误/状态反馈** | 5.0 | 无操作反馈（成功/失败），无禁用态支持 |
| **综合评分** | **6.5** | **⚠️ CONDITIONAL APPROVE** |

---

## 二、UI/UX 问题详细分析

### U1 — 🔴 HIGH: SVG 图标尺寸 12×12px 不满足 Carbon 触控目标规范

**位置**: 第 15 行
**类型**: 可访问性 · 触控交互 · DESIGN.md 合规
**WCAG**: 2.5.8 Target Size (Minimum) / Carbon Design System 触控规范

```tsx
<svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
```

**问题分析**:

DESIGN.md 明确规定：

> **Touch Targets**: Carbon spec: 48px minimum tap target. Buttons and inputs hold 48px on touch viewports.

当前 SVG 图标物理尺寸为 12×12px，远远低于 Carbon Design System 的 48px 最小触控目标要求。虽然实际按钮尺寸由框架工具栏渲染决定，但图标尺寸过小会导致：

| 问题 | 影响 |
|------|------|
| 触控精度差 | 12px 图标在触控设备上难以精确点击 |
| 视觉不协调 | 与其他工具栏图标相比可能偏小或偏大（取决于框架渲染） |
| 可访问性不达标 | WCAG 2.2 要求最小触控目标 24px（AA），Carbon 内部规范 48px |
| 高 DPI 模糊 | viewBox 512×512 映射到 12×12px，在 Retina 屏上清晰度不足 |

**与同类命令对比**:

```
bold.tsx      → width="12" height="12"  ← 同样 12px（系统性问题）
italic.tsx    → width="12" height="12"  ← 同样 12px
code.tsx      → width="12" height="12"  ← 同样 12px
strikethrough → width="12" height="12"  ← 本文件
```

**修复建议**:

```tsx
// 方案 1：增大图标尺寸（推荐 20px，Carbon 图标规范）
<svg width="20" height="20" viewBox="0 0 512 512" ...>

// 方案 2：保持 viewBox 映射但通过 CSS 控制显示尺寸
<svg viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }} ...>

// 方案 3：框架层面通过 buttonProps 添加 padding 保障触控区域
buttonProps: {
  style: { minWidth: '48px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  ...
}
```

**优先级**: P1 — 直接影响触控用户体验和可访问性合规

---

### U2 — 🔴 HIGH: aria-label 和 title 英文硬编码，中文用户可访问性缺失

**位置**: 第 9-12 行
**类型**: 国际化 · 可访问性
**WCAG**: 4.1.2 Name, Role, Value / Carbon i18n 规范

```tsx
buttonProps: {
  'aria-label': 'Add strikethrough text (ctrl + shift + x)',
  title: 'Add strikethrough text (ctrl + shift + x)',
},
```

**问题分析**:

本项目目标用户为中文用户（参见 CLAUDE.md 规范），所有 UI 文本应支持中文。当前实现：

1. **`aria-label` 为英文**: 屏幕阅读器将朗读 "Add strikethrough text (ctrl + shift + x)"，中文视障用户无法理解
2. **`title` 为英文**: 鼠标悬停提示为英文，不符合中文用户预期
3. **零 i18n 架构**: 无国际化参数接口，命令对象创建时直接硬编码文本

**DESIGN.md 关联**:

虽然 DESIGN.md 未直接规定语言要求，但 CLAUDE.md 铁律要求"所有页面显示必须使用中国时区格式化"，隐含了中文本地化要求。Antd 组件库默认支持中文 locale，工具栏按钮应与之匹配。

**与同类命令对比**:

```
所有 inline 命令（bold/italic/code/strikethrough）均为英文硬编码
→ 系统性 i18n 缺失，非 strikethrough.tsx 独有
```

**修复建议**:

```tsx
// 方案 1：参数化标签（推荐）
interface CommandLabels {
  'aria-label': string;
  title: string;
}

export const createStrikethroughCommand = (labels?: Partial<CommandLabels>): ICommand => ({
  // ...
  buttonProps: {
    'aria-label': labels?.['aria-label'] ?? '添加删除线文本 (Ctrl+Shift+X)',
    title: labels?.title ?? '添加删除线文本 (Ctrl+Shift+X)',
  },
  // ...
});

// 方案 2：直接使用中文（最小改动）
buttonProps: {
  'aria-label': '添加删除线 (Ctrl+Shift+X)',
  title: '添加删除线 (Ctrl+Shift+X)',
},
```

**优先级**: P1 — 影响中文用户的基本可访问性和可发现性

---

### U3 — 🟡 MEDIUM: 快捷键表示法不一致

**位置**: 第 8 行 vs 第 10-11 行
**类型**: 视觉一致性 · 用户体验
**参考**: Human Interface Guidelines / Carbon keyboard shortcuts

```tsx
shortcuts: 'ctrl+shift+x',                              // 无空格
'aria-label': 'Add strikethrough text (ctrl + shift + x)',  // 有空格
```

**问题分析**:

同一快捷键在两个字段中使用不同的表示法：

| 字段 | 表示法 | 格式 |
|------|--------|------|
| `shortcuts` | `ctrl+shift+x` | 紧凑格式，修饰键间无空格 |
| `aria-label` | `ctrl + shift + x` | 宽松格式，修饰键间有空格 |

这种不一致会导致：
1. **用户认知混淆**: 屏幕阅读器朗读时与快捷键提示面板显示的格式不同
2. **工具提示不统一**: 按钮悬停提示与快捷键帮助页显示格式不同
3. **不符合 Carbon 规范**: Carbon 使用 `Ctrl+Shift+X`（首字母大写、无空格）

**Carbon 快捷键规范参考**:

```
Carbon Design System 键盘快捷键格式:
✅ Ctrl+Shift+X  — 首字母大写，无空格
❌ ctrl+shift+x  — 全小写
❌ ctrl + shift + x — 有空格
```

**修复建议**:

```tsx
shortcuts: 'ctrl+shift+x',
buttonProps: {
  'aria-label': '添加删除线 (Ctrl+Shift+X)',  // 统一格式：首字母大写、无空格
  title: '添加删除线 (Ctrl+Shift+X)',
},
```

---

### U4 — 🟡 MEDIUM: SVG 缺少 `aria-hidden="true"`，导致屏幕阅读器重复播报

**位置**: 第 15 行
**类型**: 可访问性 · WCAG 1.3.1 Info and Relationships
**WCAG**: 1.3.1 / 4.1.2

```tsx
<svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
```

**问题分析**:

SVG 设置了 `role="img"`，但没有提供 `aria-label` 或 `aria-hidden`。当按钮已通过 `buttonProps['aria-label']` 提供了可访问名称时，内部 SVG 不应再被屏幕阅读器识别。

当前行为：
- 屏幕阅读器读取按钮: "Add strikethrough text (ctrl + shift + x)" ✅
- 屏幕阅读器可能尝试读取 SVG: "image"（无标签，回退到通用描述）❌
- 结果: 用户可能听到两次播报或无意义附加信息

**修复建议**:

```tsx
// 方案 1（推荐）: 装饰性图标隐藏
<svg aria-hidden="true" data-name="strikethrough" width="12" height="12" viewBox="0 0 512 512">
  {/* 移除 role="img"，因为按钮已有 aria-label */}

// 方案 2: 保留语义但添加标签
<svg role="img" aria-label="删除线" width="12" height="12" viewBox="0 0 512 512">
```

**Carbon 实践**: Carbon Design System 的图标组件默认使用 `aria-hidden="true"` 当图标嵌套在有可访问名称的父元素内时。

---

### U5 — 🟡 MEDIUM: 命令执行无视觉反馈，用户无法确认操作结果

**位置**: 第 22-35 行（execute 函数）
**类型**: 交互设计 · 用户反馈 · UX 可用性

```tsx
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const newSelectionRange = selectWord({...});
  const state1 = api.setSelectionRange(newSelectionRange);
  executeCommand({...});
  // ← 无任何视觉反馈
},
```

**问题分析**:

执行 `strikethrough` 命令后，用户仅能通过查看编辑区域文本变化来确认操作是否成功。缺少以下标准 UI 反馈机制：

| 缺失反馈 | Carbon/antd 规范 | 影响 |
|----------|-----------------|------|
| 按钮点击态（:active）| 框架层面处理 | ⚠️ 不在本文件范围 |
| 工具提示状态变化 | 无 | 低影响——文本变化本身即反馈 |
| 操作失败提示 | antd message.error() | 中影响——失败时用户无感知 |
| 快捷键触发确认 | 可选 toast | 低影响——有即时文本变化 |

**评价**:

对于文本格式化命令，**选区文本立即被 `~~` 包裹/解包裹是最直接的视觉反馈**，这本身已构成有效的操作确认。但 `execute` 函数中无 try-catch（参见安全评审 S3），异常静默丢失时用户完全无感知。

**修复建议**:

```tsx
execute: (state: ExecuteState, api: TextAreaTextApi): void => {
  try {
    const prefix = state.command.prefix;
    if (!prefix) return;
    const newSelectionRange = selectWord({...});
    const state1 = api.setSelectionRange(newSelectionRange);
    executeCommand({...});
  } catch {
    // 可选: 集成 antd message 提示用户操作失败
    // message.warning('操作失败，请重试');
  }
},
```

---

### U6 — 🟢 LOW: SVG `data-name` 属性无 UI 功能价值，增加 DOM 噪声

**位置**: 第 15 行
**类型**: DOM 清洁度 · 信息暴露

```tsx
<svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
```

**分析**: `data-name="strikethrough"` 不影响视觉渲染，也不被框架使用。它暴露了组件内部标识（参见安全评审 S5），增加 DOM 体积。建议移除。

---

### U7 — 🟢 LOW: `buttonProps` 缺少 `className` 或 `style` 挂载点，无法自定义视觉样式

**位置**: 第 9-12 行
**类型**: 可定制性 · DESIGN.md 集成

```tsx
buttonProps: {
  'aria-label': 'Add strikethrough text (ctrl + shift + x)',
  title: 'Add strikethrough text (ctrl + shift + x)',
  // ← 无 className / style 属性
},
```

**分析**: `buttonProps` 不包含任何样式挂钩点。如果需要将工具栏按钮样式与 DESIGN.md 的 Carbon 设计规范对齐（如 `rounded: 0px`、`padding: 12px 16px`），需要框架层面支持或在此处添加样式属性。

**DESIGN.md 关联**:

```yaml
button-ghost:                         # 工具栏按钮最接近的 Carbon 规范
  backgroundColor: "{colors.canvas}"  # 白色背景
  textColor: "{colors.primary}"       # IBM Blue 文字
  typography: "{typography.button}"   # 14px/400
  rounded: "{rounded.none}"           # 0px 圆角
  padding: 12px 16px                  # Carbon 按钮间距
```

**修复建议**:

```tsx
buttonProps: {
  'aria-label': '添加删除线 (Ctrl+Shift+X)',
  title: '添加删除线 (Ctrl+Shift+X)',
  className: 'md-editor-toolbar-btn',   // 留给框架/主题挂载样式
},
```

---

### U8 — 🟢 LOW: SVG `viewBox="0 0 512 512"` 映射到 12×12px 导致精度损失

**位置**: 第 15 行
**类型**: 视觉质量 · 渲染精度

```tsx
<svg data-name="strikethrough" width="12" height="12" viewBox="0 0 512 512">
```

**分析**:

viewBox 512×512 映射到 12×12px 意味着每个 SVG 单位 ≈ 0.023px。路径数据中大量坐标的精度在这种映射下会丢失，导致：

1. 非标准 DPI 屏幕上可能出现像素对齐问题
2. 图标缩放时细节丢失（横线粗细不均匀）
3. 高 DPI 屏幕需要更大的渲染尺寸

**Carbon 图标规范**: Carbon 图标系统使用 16×16 或 20×20 的 viewBox 和显示尺寸，保持 1:1 或简单的整数比映射。

**建议**: 将 viewBox 改为 `0 0 20 20`（需要重新绘制路径）或直接增大 `width`/`height` 到 20px。

---

### U9 — ℹ️ INFO: `fill="currentColor"` 使用正确，符合主题适配最佳实践

**位置**: 第 18 行

```tsx
<path fill="currentColor" d="M496 288H16c-8.837..." />
```

**分析**: `fill="currentColor"` 使图标颜色继承父元素的 CSS `color` 属性，这是 SVG 图标的最佳实践：

- ✅ 支持 DESIGN.md 主题色切换（canvas 场景继承 `ink` #161616，inverse 场景继承 `inverse-ink` #ffffff）
- ✅ 支持按钮 hover/active/focus 状态颜色变化
- ✅ 支持暗色模式（如果未来实现）
- ✅ 与 Carbon Design System 图标规范一致

**无需修改**。

---

### U10 — ℹ️ INFO: 快捷键 `Ctrl+Shift+X` 选择合理，无浏览器/系统冲突

**位置**: 第 8 行

```tsx
shortcuts: 'ctrl+shift+x',
```

**快捷键冲突分析**:

| 平台 | `Ctrl+Shift+X` 绑定 | 冲突 |
|------|---------------------|------|
| Chrome | 无默认绑定 | ✅ |
| Firefox | 无默认绑定 | ✅ |
| Edge | 无默认绑定 | ✅ |
| Safari | 无默认绑定 | ✅ |
| VS Code | 打开扩展面板 | ⚠️ 嵌入 Webview 时冲突 |
| macOS | 系统无默认绑定 | ✅ |

**与删除线语义的对齐**:

Markdown 删除线 `~~text~~` 的快捷键使用 `Ctrl+Shift+X` 是一个合理的选择——`X` 暗示"划掉/删除"，`Ctrl+Shift` 组合避免了与常用操作的冲突。这与 `Ctrl+B`（粗体）、`Ctrl+I`（斜体）形成一致的 `Ctrl+字母` 体系。

**无需修改**。

---

## 三、DESIGN.md 合规检查清单

| DESIGN.md 规范项 | 当前状态 | 说明 |
|-----------------|---------|------|
| 圆角 0px (flat-square) | ✅ N/A | 按钮由框架渲染，无内联圆角定义 |
| IBM Blue #0f62fe 唯一强调色 | ✅ 合规 | currentColor 继承，无硬编码色彩 |
| IBM Plex Sans 字体 | ✅ N/A | 无文本渲染，图标继承框架字体 |
| letter-spacing: 0.16px (body) | ✅ N/A | 无 body 文本 |
| 1px hairline 边框 | ✅ N/A | 无边框定义 |
| 4px 基数间距 | ⚠️ 未确认 | 按钮间距由框架控制，需验证框架是否遵循 4px 基数 |
| 48px 最小触控目标 | ❌ 不合规 | 图标 12px，触控区域依赖框架无显式保障 |
| surface 层级区分 | ✅ N/A | 工具栏按钮无背景层级需求 |
| focus ring 2px primary | ⚠️ 未确认 | 按钮焦点样式由框架处理，需验证 |
| 无圆角按钮 | ✅ N/A | 由框架控制 |
| 无渐变/投影 | ✅ 合规 | 纯平面设计 |

---

## 四、antd 规范合规检查

| antd 规范项 | 当前状态 | 说明 |
|------------|---------|------|
| 使用 antd Button 组件 | ❌ 不适用 | 这是库内部命令定义，非直接使用 antd |
| antd locale 国际化 | ❌ 缺失 | aria-label/title 未集成 antd ConfigProvider locale |
| antd Tooltip 规范 | ⚠️ 部分 | title 属性提供原生 tooltip，未使用 antd Tooltip 组件 |
| antd 图标规范 | ⚠️ 不一致 | 使用原始 SVG 而非 @ant-design/icons |
| antd 主题 token | ❌ 未集成 | 无 Design Token 关联（colorPrimary、borderRadius 等） |
| antd 可访问性 | ⚠️ 部分 | 有 aria-label 但语言不匹配 |

**antd 集成评价**: `strikethrough.tsx` 是 `@uiw/react-md-editor` 库的内部命令定义，不直接使用 antd 组件。但在本项目中集成时，应确保：

1. 工具栏按钮的视觉样式与 antd `Button` 的 ghost 变体对齐
2. 快捷键提示使用中文
3. 错误反馈使用 antd `message` 组件

---

## 五、交互设计评估

### 5.1 操作流程

```
用户操作流程图:
┌─────────────────────────────────────────────────────────────────┐
│ 触发方式 1: 点击工具栏按钮                                         │
│                                                                 │
│  用户点击 [S] 按钮 → command.execute(state, api)                  │
│      ↓                                                          │
│  selectWord → 扩展选区到单词边界                                   │
│      ↓                                                          │
│  executeCommand → 包裹/解包裹文本                                  │
│      ↓                                                          │
│  textarea 内容更新: ~~选中文本~~  或  移除 ~~                       │
│      ↓                                                          │
│  [✓] 用户可见文本变化（即时反馈）                                   │
│                                                                 │
│ 触发方式 2: Ctrl+Shift+X 快捷键                                   │
│                                                                 │
│  用户按下 Ctrl+Shift+X → 框架捕获快捷键 → command.execute()         │
│      ↓                                                          │
│  同上流程                                                        │
└─────────────────────────────────────────────────────────────────┘

用户体验评价:
✅ 双触发路径（按钮+快捷键）覆盖鼠标和键盘用户
✅ 即时文本变化是最直接的操作确认
⚠️ 无操作失败反馈（异常静默丢失）
⚠️ 无撤销提示（需依赖 Ctrl+Z 浏览器原生撤销）
```

### 5.2 选区行为分析

| 初始状态 | 用户操作 | 预期结果 | 评价 |
|----------|---------|---------|------|
| 无选区（光标在单词内）| 点击按钮/快捷键 | 选区扩展到整个单词 → `~~word~~` | ✅ 符合预期 |
| 有选区 | 点击按钮/快捷键 | 选中文本被 `~~` 包裹 | ✅ 符合预期 |
| 已包裹 `~~text~~` | 点击按钮/快捷键 | 移除 `~~` 解包裹 | ✅ 符合预期 |
| 空选区（光标在空行）| 点击按钮/快捷键 | 插入 `~~~~` 或光标处标记 | ⚠️ 行为取决于 `selectWord` 实现 |
| 跨段落选区 | 点击按钮/快捷键 | 整段文本包裹删除线 | ✅ 符合预期（GFM 允许） |

---

## 六、竞品对比分析

| 特性 | strikeThrough.tsx | VS Code | Notion | Typora |
|------|-------------------|---------|--------|--------|
| 快捷键 | Ctrl+Shift+X | Ctrl+Shift+X | 无默认 | Ctrl+Shift+X |
| 图标 | 自定义 SVG | Codicon | 内联图标 | 内联图标 |
| 切换行为 | 包裹/解包裹 | 包裹/解包裹 | 包裹/解包裹 | 包裹/解包裹 |
| 多语言 | ❌ 英文 | ✅ 多语言 | ✅ 多语言 | ✅ 多语言 |
| 触控支持 | ❌ 12px | ✅ 20px | ✅ 原生 | ✅ 原生 |

**结论**: 功能对齐主流编辑器，但可访问性和国际化显著落后。

---

## 七、修复建议（按优先级排序）

| 优先级 | 建议 | 工作量 | 影响维度 |
|--------|------|--------|---------|
| **P1** | aria-label/title 改为中文或参数化支持 i18n | 小 | 可访问性 + 国际化 |
| **P1** | SVG 添加 `aria-hidden="true"` | 极小 | 可访问性 |
| **P2** | SVG 尺寸增至 20px 或通过 CSS 控制 | 极小 | 触控 + 视觉 |
| **P2** | 统一快捷键表示法为 `Ctrl+Shift+X` 格式 | 极小 | 一致性 |
| **P3** | buttonProps 添加 className/style 挂载点 | 极小 | 可定制性 |
| **P3** | execute 函数添加 try-catch + 失败反馈 | 小 | 用户体验 |
| **P4** | 移除 `data-name` 属性 | 极小 | DOM 清洁 |
| **P4** | 评估 viewBox 精度优化 | 小 | 视觉质量 |

---

## 八、评审总结

`strikeThrough.tsx` 作为 Markdown 编辑器的删除线命令实现，**核心交互功能完整**——双触发路径（按钮+快捷键）、即时的文本变化反馈、包裹/解包裹的切换行为均符合用户预期。`fill="currentColor"` 的图标着色策略和 `Ctrl+Shift+X` 快捷键选择也是良好的设计实践。

主要 UI/UX 问题集中在**可访问性和国际化**两个维度：

1. **触控目标**：12×12px 的图标尺寸远低于 Carbon 48px 最小触控目标规范（U1），在平板和触屏设备上体验较差
2. **中文可访问性**：aria-label 和 title 均为英文硬编码（U2），在中文用户环境下屏幕阅读器和鼠标悬停提示无法正确传达信息
3. **SVG 可访问性**：缺少 `aria-hidden="true"`（U4），可能导致屏幕阅读器重复播报
4. **快捷键格式不一致**：`ctrl+shift+x` 与 `ctrl + shift + x` 两种格式混用（U3），不符合 Carbon 快捷键规范

以上问题均为**低成本修复**（单行改动级别），且属于 inline 命令簇的**系统性问题**（bold/italic/code 同样存在），建议在库级别统一修复。

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 可访问性 | 5.0 | 有 aria-label 但语言不匹配，SVG 缺 aria-hidden |
| 设计系统合规 | 6.0 | currentColor 正确，触控目标不足 |
| 交互设计 | 7.5 | 双触发路径 + 即时反馈，缺少失败提示 |
| 国际化 | 3.0 | 零 i18n 支持，全英文硬编码 |
| 视觉一致性 | 7.0 | 与同簇命令一致，快捷键格式不统一 |
| 响应式/触控 | 4.0 | 图标过小，触控目标无保障 |
| 错误/状态反馈 | 5.0 | 正常操作有即时反馈，异常无反馈 |
| **综合** | **6.5** | **⚠️ CONDITIONAL APPROVE — 修复 U1+U2+U4 后可达 8.0** |

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 · DESIGN.md (IBM Carbon Design System) · antd 5.x 设计规范 · WCAG 2.2 · Carbon Design System Guidelines*
