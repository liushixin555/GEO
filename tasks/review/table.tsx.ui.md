# 软件 UI 专家评审：table.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/table.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · Antd 规范 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-25
**代码行数**: 53 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"插入表格"工具栏命令，定义表格图标、按钮属性及 Markdown 表格模板的插入/移除逻辑
**评审结论**: ⚠️ CONDITIONAL APPROVE — 基础功能可用，但存在 6 项 UI/UX 问题（1 项 P1 + 2 项 P2 + 3 项 P3），视觉设计合规性和 Antd 规范合规性均严重不足

**问题统计**: P1 × 1 / P2 × 2 / P3 × 3

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器的"插入表格"命令，供工具栏按钮调用 |
| 代码行数 | 53 行 |
| 设计模式 | 命令模式（`ICommand` 接口实现） |
| UI 相关输出 | 1 个 SVG 图标（Font Awesome table）+ 1 组按钮属性（aria-label / title）+ 1 个 Markdown 表格模板 |
| 用户交互路径 | 工具栏按钮点击 → `execute()` → 插入表格模板 |
| 依赖 | `selectWord`、`executeCommand`（纯文本运算）、`TextAreaTextApi`（DOM 操作） |
| 无快捷键 | 与 bold（Ctrl+B）、italic（Ctrl+I）不同，table 命令未定义快捷键绑定 |

### 源码结构

```tsx
export const table: ICommand = {
  name: 'table',                              // 命令标识
  keyCommand: 'table',                        // 命令类型
  prefix: '\n| Header | Header |\n|---...     // 5 行表格模板（~100字符）
  suffix: '',                                 // 无后缀
  buttonProps: {                               // 工具栏按钮属性
    'aria-label': 'Add table',
    title: 'Add table'
  },
  icon: (                                      // 12×12 SVG 图标（FontAwesome table）
    <svg role="img" width="12" height="12" viewBox="0 0 512 512">
      <path fill="currentColor" d="M64 256V160..." />
    </svg>
  ),
  execute: (state, api) => {                   // 命令执行逻辑
    selectWord → setSelectionRange → executeCommand
  }
};
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 2 | SVG 硬编码 12×12 远低于 Carbon 触摸目标规范，无颜色/间距/圆角适配 |
| 交互体验（UX） | 4 | 无快捷键、无表格尺寸选择器、toggle 逻辑缺陷导致"再次点击"行为异常 |
| 无障碍（a11y） | 6 | 有 `aria-label` + `title` + `role="img"`，但 SVG 缺少 `<title>`，无键盘快捷键 |
| Antd 规范合规 | 1 | 使用原生 SVG + `<button>`，未使用 antd `<Button>` / `<Tooltip>` / `<Dropdown>` |
| 响应式行为 | 2 | 图标 12×12 在移动端触摸目标严重不足，无任何响应式适配机制 |
| 国际化（i18n） | 2 | 硬编码英文文本（aria-label / title / 模板内容），无 i18n 支持 |
| 图标设计 | 4 | FontAwesome table 图标语义清晰可识别，但风格与 antd/Carbon 图标体系不一致 |
| **综合评分** | **3.0 / 10** | |

---

## 三、DESIGN.md 合规性详细分析

### 3.1 图标尺寸与 Carbon 触摸目标规范

**DESIGN.md 要求**：
- 工具栏按钮高度 48px（触摸目标，见 DESIGN.md 响应式章节）
- 按钮内 padding 12px 16px（`button-primary` 组件定义）
- 最小交互区域 48px（触摸设备，Carbon spec: 48px minimum tap target）
- 图标在按钮内居中

**实际行为**：

```tsx
// 第 12 行 — SVG 硬编码 12×12
<svg role="img" width="12" height="12" viewBox="0 0 512 512">
```

**违规分析**：

| 指标 | DESIGN.md 规范 | 实际值 | 偏差 |
|------|---------------|--------|------|
| SVG 尺寸 | 16px-20px（Carbon 工具栏图标规范） | 12×12 px | -25% ~ -40% |
| 触摸目标 | 48×48 px（最小） | 取决于父容器，约 24×24 px | -50% |
| 按钮内边距 | 12px 16px | 未知（由外部工具栏控制） | — |
| 图标可视权重 | 与文本视觉平衡 | 12px 在 14px 按钮文本旁视觉偏弱 | 不平衡 |

**严重度**: P2 — 12px 图标在桌面端勉强可辨，在移动端（特别是高 DPI 屏幕）清晰度不足且触摸目标过小。

**修复建议**: 将 SVG 尺寸提升至 16px 或使用 CSS 类控制尺寸，确保外部容器提供 48×48px 最小触摸区域：
```tsx
<svg role="img" width="16" height="16" viewBox="0 0 512 512" className="wmd-button-svg">
```

### 3.2 颜色系统与 Carbon 色板

**DESIGN.md 要求**：
- 文本颜色使用 `{colors.ink}` (#161616)
- 按钮背景使用 `{colors.canvas}` (#ffffff) 或 `{colors.surface-1}` (#f4f4f4)
- IBM Blue `{colors.primary}` (#0f62fe) 仅用于链接、主 CTA、焦点指示
- 不使用非规范色板中的颜色

**实际行为**：

```tsx
// 第 15 行 — SVG 使用 currentColor
<path fill="currentColor" d="M64 256V160..." />
```

**分析**：
- `currentColor` 是正确的做法——继承父元素文本颜色，理论上可随主题适配
- 但如果父容器未明确设置颜色为 `{colors.ink}` (#161616)，图标可能渲染为浏览器默认的 `#000000` 或其他非规范颜色
- 悬停状态和激活状态的颜色变化完全依赖外部工具栏 CSS，本文件无法控制

**合规状态**: 有条件合规——`currentColor` 机制正确，但需要封装层保证颜色值符合 Carbon 色板。

### 3.3 圆角与几何形态

**DESIGN.md 要求**：
- 所有按钮使用 `{rounded.none}` 0px 圆角
- "Don't round corners on buttons, cards, or inputs. Even 4px rounded corners break the Carbon look."

**实际行为**：
- 本文件仅定义 SVG 图标内容，不控制按钮容器的圆角
- 按钮圆角完全由外部工具栏 CSS 决定

**合规状态**: 无法判定——需要检查外部工具栏样式是否遵循 0px 圆角规范。

### 3.4 字体与排版

**DESIGN.md 要求**：
- 按钮文本使用 `{typography.button}`: IBM Plex Sans, 14px, weight 400, letter-spacing 0.16px
- 表格模板中的占位文本（Header / Cell）应遵循 `{typography.body}` 规范

**实际行为**：
- 按钮仅有图标，无文本标签，排版规范不直接适用
- 表格模板 `| Header | Header |` 是纯文本标记，在 Markdown 渲染后由渲染器控制排版

**合规状态**: 不适用——图标按钮不涉及排版。

---

## 四、交互体验（UX）详细评审

### 4.1 P1: 无表格尺寸选择器——用户体验严重不足

**问题**：点击表格按钮直接插入固定 2 列 × 4 行的表格模板，用户无法在插入前选择表格的行列数。

**与竞品对比**：

| 编辑器 | 表格插入方式 | 用户体验 |
|--------|------------|---------|
| Notion | 网格选择器，鼠标拖选行列数 | 直观、所见即所得 |
| Typora | 弹窗对话框，输入行列数 | 精确控制 |
| GitHub Markdown | 按钮直接插入固定模板 | 与本项目相同 |
| Google Docs | 网格选择器 + 自定义输入 | 最完善 |

**影响**：
- 用户插入 2×4 模板后需要手动增删行列，操作成本高
- 无法通过一次操作生成目标尺寸的表格
- 编辑器目标用户为企业用户，频繁创建表格的场景下体验差距明显

**严重度**: P1 — 交互设计缺陷，直接影响用户效率。

**修复建议**：在封装层实现表格尺寸选择器（antd `Popover` + 网格选择）：
```tsx
// 封装层建议实现
<Popover
  content={<TableSizeSelector maxRows={10} maxCols={8} onSelect={handleInsert} />}
  trigger="click"
>
  <Button icon={<TableOutlined />} />
</Popover>
```

### 4.2 P2: 无键盘快捷键

**问题**：与 bold（Ctrl+B）、italic（Ctrl+I）不同，table 命令未定义 `shortcuts` 属性。

```tsx
// bold.tsx 有快捷键
shortcuts: 'ctrlcmd+b',

// table.tsx — 缺少 shortcuts 属性
{
  name: 'table',
  keyCommand: 'table',
  // 无 shortcuts
}
```

**影响**：
- 用户无法通过键盘快速插入表格，必须使用鼠标点击工具栏
- 对于高频 Markdown 用户（习惯键盘操作），效率明显下降
- 不符合 WCAG 2.1 SC 2.1.1（键盘可操作性）的最佳实践

**严重度**: P2 — 可用性问题，影响键盘用户效率。

**修复建议**：建议绑定 `Ctrl+Shift+T` 或 `Ctrl+Alt+T`：
```tsx
shortcuts: 'ctrlcmd+shift+t',
```

### 4.3 P2: Toggle 行为逻辑缺陷

**问题**：再次点击表格按钮时，本应移除已有表格，但由于前缀匹配逻辑检测编辑后的表格必然失败（详见质量评审报告缺陷 #1），导致再次插入新表格。

**用户体验影响**：

| 用户操作 | 预期行为 | 实际行为 |
|---------|---------|---------|
| 光标在表格内，点击表格按钮 | 移除当前表格 | 在光标处再次插入模板，导致嵌套乱码 |
| 选中已编辑的表格，点击按钮 | 移除选中表格 | 替换选区为新模板，丢失已编辑内容 |

**严重度**: P2 — 交互逻辑缺陷，可能导致内容混乱。

### 4.4 P3: 插入后无光标定位引导

**问题**：表格模板插入后，光标位置未做优化——应该将光标定位到第一个 `Header` 单元格内，引导用户立即开始编辑。

**当前行为**：光标停留在模板末尾（模板后的空行处），用户需要手动移动光标到第一个单元格。

**修复建议**：在 `execute` 函数末尾，将光标定位到第一个 `|` 后的 `Header` 位置：
```tsx
// 插入后光标应定位到第一个 Header 单元格
api.setSelectionRange({
  start: insertionStart + '\n| '.length,
  end: insertionStart + '\n| Header'.length
});
```

---

## 五、Antd 规范合规性评审

### 5.1 组件替代方案

**违规项**：使用原生 SVG 图标和隐式 `<button>` 元素，未使用 antd 组件体系。

| 当前实现 | Antd 推荐替代 | 好处 |
|---------|-------------|------|
| 原生 SVG `<svg>` | `@ant-design/icons` 的 `TableOutlined` | 统一图标风格、自动继承 antd 主题 |
| 隐式 `<button>` | `<Button type="text" icon={...} />` | 统一按钮交互样式、内置焦点/悬停/激活状态 |
| 无工具提示 | `<Tooltip title="插入表格">` | 提供悬停提示，增强可发现性 |
| 无下拉面板 | `<Dropdown overlay={表格配置面板}>` | 支持表格尺寸选择 |

**严重度**: P3 — 作为第三方库源码，无法直接使用 antd 组件；但封装层应使用 antd 组件进行包装。

**封装层建议**：

```tsx
import { Button, Tooltip, Dropdown, Popover } from 'antd';
import { TableOutlined } from '@ant-design/icons';

// 最小改造方案：Tooltip 包裹
<Tooltip title="插入表格">
  <Button
    type="text"
    icon={<TableOutlined />}
    onClick={() => command.execute(state, api)}
    style={{ borderRadius: 0 }} // Carbon 0px 圆角
  />
</Tooltip>

// 推荐方案：Popover 表格尺寸选择器
<Popover content={<TableSizePicker />} trigger="click">
  <Button type="text" icon={<TableOutlined />} />
</Popover>
```

### 5.2 主题与 Token 适配

**DESIGN.md + antd 主题要求**：
- 按钮圆角 `{rounded.none}` → antd ConfigProvider `token.borderRadius: 0`
- 主色 `{colors.primary}` → `token.colorPrimary: '#0f62fe'`
- 文本色 `{colors.ink}` → `token.colorText: '#161616'`

**当前状态**：本文件作为第三方库源码，无法直接适配 antd 主题 Token。需要封装层通过 CSS 变量或 antd ConfigProvider 进行覆盖。

---

## 六、无障碍（a11y）详细评审

### 6.1 WCAG 2.1 合规性逐项检查

| WCAG 标准 | 等级 | 状态 | 说明 |
|-----------|------|------|------|
| SC 1.1.1 非文本内容 | A | ⚠️ 部分合规 | 按钮有 `aria-label`，但 SVG 缺少内部 `<title>` |
| SC 2.1.1 键盘可操作 | A | ❌ 不合规 | 无键盘快捷键，仅能通过鼠标操作 |
| SC 2.4.6 标题和标签 | AA | ✅ 合规 | `aria-label` 提供了描述性标签 |
| SC 2.5.5 目标尺寸 | AAA | ❌ 不合规 | 12×12 SVG 导致按钮区域可能不足 44×44px |
| SC 4.1.2 名称/角色/值 | A | ✅ 合规 | `role="img"` + `aria-label` 组合正确 |

### 6.2 SVG 可访问性改进

**当前代码**：
```tsx
<svg role="img" width="12" height="12" viewBox="0 0 512 512">
  <path fill="currentColor" d="M64 256V160..." />
</svg>
```

**问题**：
1. 缺少 `<title>` 元素——WCAG 2.1 SC 1.1.1 要求 `role="img"` 的元素提供文本替代
2. 缺少 `aria-hidden="true"`——外层按钮已有 `aria-label`，SVG 不应重复播报
3. `width`/`height` 属性硬编码，不利于 CSS 覆盖和响应式

**修复建议**：
```tsx
<svg
  role="img"
  aria-hidden="true"        // 按钮已有 aria-label，SVG 不需重复播报
  width="16"
  height="16"
  viewBox="0 0 512 512"
  focusable="false"         // 防止 IE/Edge 将 SVG 作为焦点目标
>
  <title>Table</title>
  <path fill="currentColor" d="M64 256V160..." />
</svg>
```

---

## 七、响应式行为评审

### 7.1 触摸目标分析

**DESIGN.md 要求**（响应式章节）：
- Carbon spec: 48px minimum tap target
- 按钮和输入在触摸视口保持 48px
- 工具栏链接从 36px 增长到 48px tap height

**当前问题**：

```tsx
// SVG 仅 12×12 px，按钮容器约 24×24 px（取决于工具栏 CSS）
<svg role="img" width="12" height="12" viewBox="0 0 512 512">
```

**各设备上的表现**：

| 设备类型 | SVG 物理尺寸 | 按钮估算尺寸 | 触摸合规 |
|---------|------------|------------|---------|
| 桌面（鼠标） | 12×12 px | ~28×28 px | ✅ 鼠标操作无需 48px |
| 平板（触摸） | 12×12 px | ~28×28 px | ❌ 远低于 48px 最低要求 |
| 手机（触摸） | 12×12 px | ~28×28 px | ❌ 远低于 48px 最低要求 |

**修复建议**：在工具栏 CSS 中强制设置按钮最小尺寸：
```css
.wmde-markdown-toolbar button {
  min-width: 48px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### 7.2 图标清晰度

12×12 px 的 SVG 在高 DPI（2x / 3x）设备上渲染为 24 / 36 物理像素，清晰度可接受。但在低 DPI 设备或缩放 125%+ 时，12px 的图标细节（表格网格线）可能模糊不清。

---

## 八、国际化（i18n）评审

### 8.1 硬编码文本清单

| 文本内容 | 位置 | 用途 | 可配置性 |
|---------|------|------|---------|
| `'Add table'` | `buttonProps.aria-label` | 无障碍标签 | ❌ 硬编码 |
| `'Add table'` | `buttonProps.title` | 悬停提示 | ❌ 硬编码 |
| `Header` | `prefix` 模板 | 表头占位文本 | ❌ 硬编码 |
| `Cell` | `prefix` 模板 | 单元格占位文本 | ❌ 硬编码 |

### 8.2 对中文用户的影响

中文用户插入表格后看到：

```markdown
| Header | Header |
|--------|--------|
| Cell | Cell |
| Cell | Cell |
| Cell | Cell |
```

占位文本为英文 `Header` / `Cell`，不符合中文产品界面规范。理想情况下应显示：

```markdown
| 表头 | 表头 |
|------|------|
| 内容 | 内容 |
| 内容 | 内容 |
| 内容 | 内容 |
```

**严重度**: P3 — 不影响功能，但降低中文用户体验。需在封装层覆盖模板。

---

## 九、图标设计评审

### 9.1 图标语义

Font Awesome 的 table 图标（`fa-table`）采用 4 格网格 + 外框的简洁设计，语义清晰，用户能快速理解为"表格"功能。

### 9.2 图标风格一致性

| 图标来源 | 风格特征 | 与 Carbon/antd 的兼容性 |
|---------|---------|----------------------|
| Font Awesome table | 实心填充，2×2 网格，圆角 0px | ✅ 方形外观兼容 Carbon |
| `@ant-design/icons TableOutlined` | 线条描边，更细腻的网格 | — 推荐替代方案 |
| Carbon `DataTable` icon | 线性风格，4px 网格单元 | — 最佳匹配 |

**建议**: 在封装层替换为 `@ant-design/icons` 的 `TableOutlined`，统一图标风格体系。

### 9.3 Font Awesome 许可证注释

```tsx
//Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com
```

许可证注释嵌入在 JSX 属性（`d` 路径）与闭合标签（`/>`）之间，位置不常规。虽然语法合法，但降低了代码可读性。

**严重度**: INFO — 不影响 UI 表现。

---

## 十、问题汇总

| # | 优先级 | 类别 | 问题描述 | 修复位置 |
|---|--------|------|---------|---------|
| 1 | **P1** | 交互设计 | 无表格尺寸选择器，固定 2×4 模板无法满足多样化需求 | 封装层 |
| 2 | P2 | 交互设计 | 无键盘快捷键，仅支持鼠标操作 | 库源码/封装层 |
| 3 | P2 | 交互逻辑 | Toggle 移除逻辑缺陷，再次点击插入而非移除 | 库源码 |
| 4 | P3 | Carbon 合规 | SVG 12×12 远低于 Carbon 触摸目标 48px 规范 | 库源码 |
| 5 | P3 | 无障碍 | SVG 缺少 `<title>` 和 `aria-hidden`，无键盘快捷键 | 库源码 |
| 6 | P3 | 国际化 | aria-label、title、模板占位文本全部硬编码英文 | 封装层 |
| 7 | INFO | Antd 合规 | 未使用 antd `<Button>` / `<Tooltip>` / `<Dropdown>` | 封装层 |
| 8 | INFO | 图标风格 | Font Awesome 图标与 antd/Carbon 图标体系不一致 | 封装层 |
| 9 | INFO | 代码风格 | Font Awesome 许可证注释嵌入 JSX 属性间隙 | 库源码 |

**问题统计**: P1 × 1 / P2 × 2 / P3 × 3 / INFO × 3

---

## 十一、封装层改进方案

由于本文件是第三方库（`@uiw/react-md-editor`）源码，直接修改不可行。以下为**封装层**的完整改进方案：

### 方案 A：最小改造（低成本）

```tsx
// 使用 antd Tooltip 包裹，替换图标，保持原有行为
import { Button, Tooltip } from 'antd';
import { TableOutlined } from '@ant-design/icons';

const TableButton = ({ editorState, api }) => (
  <Tooltip title="插入表格">
    <Button
      type="text"
      icon={<TableOutlined />}
      onClick={() => tableCommand.execute(editorState, api)}
      style={{ borderRadius: 0, minWidth: 48, minHeight: 48 }}
    />
  </Tooltip>
);
```

### 方案 B：推荐改造（中成本）

```tsx
// 使用 antd Popover 实现表格尺寸选择器
import { Button, Popover } from 'antd';
import { TableOutlined } from '@ant-design/icons';

const TableInsertButton = ({ onInsert }) => {
  const [size, setSize] = useState({ rows: 3, cols: 2 });

  return (
    <Popover
      content={<TableSizePicker onSelect={setSize} />}
      trigger="click"
      placement="bottomLeft"
    >
      <Tooltip title="插入表格">
        <Button
          type="text"
          icon={<TableOutlined />}
          style={{ borderRadius: 0, minWidth: 48, minHeight: 48 }}
        />
      </Tooltip>
    </Popover>
  );
};
```

### 方案 C：覆盖模板文本（针对中文化）

```tsx
// 自定义 table 命令，使用中文占位文本
const zhTableCommand: ICommand = {
  ...table,
  prefix: '\n| 表头 | 表头 |\n|------|------|\n| 内容 | 内容 |\n| 内容 | 内容 |\n\n',
  buttonProps: {
    'aria-label': '插入表格',
    title: '插入表格'
  }
};
```

---

## 十二、与同级命令的横向对比

| 维度 | `bold.tsx` | `italic.tsx` | `hr.tsx` | `table.tsx` |
|------|-----------|-------------|---------|------------|
| SVG 尺寸 | 12×12 | 12×12 | 12×12 | 12×12 |
| 快捷键 | `ctrlcmd+b` ✅ | `ctrlcmd+i` ✅ | `ctrlcmd+h` ✅ | 无 ❌ |
| 图标可识别性 | 高（B 字形） | 高（I 字形） | 高（水平线） | 高（网格） |
| Toggle 正确性 | ✅ 行内标记 | ✅ 行内标记 | ⚠️ 块级元素 | ❌ 块级 + 长模板 |
| 交互复杂度 | 低（包裹选区） | 低（包裹选区） | 中（插入行） | 高（插入块 + 尺寸需求） |
| 用户体验满意度 | 高 | 高 | 中 | **低**（无尺寸选择） |
| Carbon 合规 | 2/10 | 2/10 | 2/10 | 2/10 |
| Antd 合规 | 1/10 | 1/10 | 1/10 | 1/10 |

**结论**：同级命令共享相同的底层问题（SVG 尺寸小、无 antd 集成、无 Carbon 适配），但 `table.tsx` 因其交互复杂度最高（需要行列数配置），用户体验缺陷最为突出。

---

## 十三、评审结论

**评分**：3.0 / 10 — CONDITIONAL APPROVE

**核心问题**：
1. **交互设计严重不足**：固定 2×4 模板无尺寸选择，与现代编辑器体验差距大（P1）
2. **无键盘快捷键**：仅支持鼠标操作，影响键盘用户效率和可访问性（P2）
3. **视觉规范全面不合规**：SVG 12×12、无 Carbon 色板适配、无 antd 组件集成

**通过条件**：
1. 封装层实现表格尺寸选择器（P1）
2. 封装层添加键盘快捷键支持（P2）
3. 封装层使用 antd `Button` + `Tooltip` + `Popover` 组件包装（P2-P3）

**可接受的风险**：
- 第三方库源码无法直接修改，所有改进需在封装层实现
- 12×12 SVG 在桌面端鼠标操作场景下功能可用
- `currentColor` 机制为后续主题适配留有余地

**不改也不会崩溃的理由**：基础插入功能正常工作，大多数用户的首次使用不会遇到问题。但随着使用频率增加，固定模板尺寸和缺乏快捷键将显著降低效率。

---

*评审人：软件 UI 专家 | 评审日期：2026-05-25*
