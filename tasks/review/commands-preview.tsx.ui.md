# 软件 UI 专家评审：@uiw/react-md-editor commands/preview.tsx

**文件路径**: `@uiw/react-md-editor/src/commands/preview.tsx`
**评审角色**: 软件 UI 专家（DESIGN.md · antd 规范 · UI/UX 最佳实践 · 可访问性 · 交互设计 · 视觉一致性）
**评审日期**: 2026-05-25
**评审版本**: @uiw/react-md-editor@4.1.0
**评审结论**: ⚠️ CONDITIONAL APPROVE 3.2分 — 功能可用但 UI 体系全面偏离 DESIGN.md（IBM Carbon Design System）和 antd 规范，SVG 图标语义模糊且缺少无障碍标注，按钮标签未国际化，交互行为存在双路径不一致

**问题统计**: P1 × 2 / P2 × 3 / P3 × 4

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 定义 Markdown 编辑器的三个模式切换命令：预览（preview）、编辑（edit）、实时（live） |
| 代码行数 | 93 行（含 import、空行） |
| 组件模式 | 命令对象（ICommand 接口实现）× 3 |
| antd 集成 | ❌ 零集成 — 不使用任何 antd 组件或设计令牌 |
| Carbon 令牌 | ❌ 零使用 — SVG 使用硬编码尺寸，无 CSS 变量 |
| 可访问性 | ⚠️ 部分 — buttonProps 含 aria-label/title，但 SVG 缺 role/aria-hidden |
| i18n | ❌ 无 — 所有标签文本英文硬编码 |
| 触控适配 | ❌ 无 — SVG 仅 12×12px，远低于 48px 触控目标 |

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| DESIGN.md 视觉规范对齐（Visual Compliance） | 2 | SVG 使用硬编码 12×12px（Carbon 最小触控 48px）、无 IBM Plex Sans、无 Carbon 色彩令牌 |
| antd 组件集成度（Ant Design Integration） | 1 | 零 antd 集成，不使用 Button/Tooltip/Radio.Group 等标准模式切换组件 |
| 可访问性（Accessibility / a11y） | 4 | buttonProps 有 aria-label，但 SVG 缺 role/aria-hidden，图标语义依赖视觉辨识 |
| 交互反馈设计（Interaction Feedback） | 3 | execute 函数按钮点击路径为空操作，仅快捷键路径有 dispatch 反馈 |
| 图标设计（Icon Design） | 3 | 三个图标为方括号变体（左宽/左窄+右窄/左窄+右宽），视觉区分度低 |
| 响应式与适配（Responsive Design） | 2 | 固定 12×12px SVG，无响应式尺寸适配 |
| i18n / 本地化 | 1 | 所有 aria-label/title 英文硬编码，无国际化接口 |
| **综合评分** | **3.2 / 10** | |

---

## 三、P1 级严重问题（2 项）

### UI-P1-01: 🔴 模式切换 UI 与 antd 标准模式严重偏离 — 应使用 Radio.Group / Segmented

**位置**: 全文件（三个命令对象定义）

**现状**: 编辑器的三种模式（preview / edit / live）通过三个独立的 `ICommand` 对象实现，各自有独立的图标、快捷键和 `execute` 函数。工具栏将其渲染为独立按钮。

**antd 标准模式**: 在 antd 体系中，互斥的模式切换应使用以下组件之一：

| antd 组件 | 适用场景 | 与当前实现的对比 |
|---|---|---|
| `Radio.Group` + `Radio.Button` | 互斥选项，选中态明确高亮 | 当前实现无选中态视觉反馈 |
| `Segmented` | 分段控制器，紧凑互斥选择 | 当前三个独立按钮无分组视觉 |
| `Tabs` | 内容区域切换 + 标签导航 | 当前无标签式导航 |

**DESIGN.md 规范**: Carbon Design System 的 `product-tab` / `product-tab-selected` 组件规范：

```
当前状态：
┌──────────┐  ┌──────────┐  ┌──────────┐
│  [  ] Edit│  │  [[] Live│  │  [[] Prev│
└──────────┘  └──────────┘  └──────────┘
    独立按钮      独立按钮      独立按钮
    无选中态      无选中态      无选中态
    无分组        无分组        无分组

Carbon 规范（product-tab）：
┌──────────┬──────────┬──────────┐
│  Edit    │  Live    │  Preview │  ← 选中项：2px #0f62fe 底部下划线
├──────────┼──────────┼──────────┤
│  body-emphasis     │  body-sm  │  ← 选中项：weight 600 / 未选：weight 400
└──────────┴──────────┴──────────┘
    ← 16-20px 内边距 · 0px 圆角 · 1px hairline 分隔 →
```

**DESIGN.md 违规清单**:

| 规范项 | DESIGN.md 要求 | 当前实现 | 合规 |
|---|---|---|---|
| 圆角 | `{rounded.none}` 0px | 取决于工具栏 CSS（通常有圆角） | ❌ |
| 字体 | IBM Plex Sans 14px/400 | 系统默认字体 | ❌ |
| 选中态 | `{colors.primary}` 底部 2px 下划线 | 无选中态视觉反馈 | ❌ |
| 文本色 | `{colors.ink}` #161616 / `{colors.ink-muted}` #525252 | 无明确区分 | ❌ |
| 间距 | 16-20px 内边距（product-tab） | 取决于工具栏 | ⚠️ |
| 触控目标 | 48px 最小高度 | SVG 12×12px，按钮高度取决于工具栏 | ⚠️ |

**影响**: 用户无法直观辨识当前处于哪种模式，三个按钮视觉上无选中/未选中的区分。

**修复建议**: 在项目封装层使用 antd `Segmented` 或 `Radio.Group` 替代默认工具栏按钮：

```tsx
import { Segmented } from 'antd';

const MarkdownEditorWrapper = () => {
  const [mode, setMode] = useState<'edit' | 'live' | 'preview'>('edit');

  return (
    <div>
      <Segmented
        value={mode}
        onChange={(val) => setMode(val as 'edit' | 'live' | 'preview')}
        options={[
          { label: '编辑', value: 'edit' },
          { label: '实时', value: 'live' },
          { label: '预览', value: 'preview' },
        ]}
        style={{ marginBottom: 12, borderRadius: 0 }}
      />
      <MDEditor preview={mode} />
    </div>
  );
};
```

---

### UI-P1-02: 🔴 图标视觉区分度极低 — 三个方括号变体难以辨识

**位置**: 第 12-21、44-50、74-79 行（三处 SVG）

**现状**: 三个模式的图标均为方括号变体，仅通过左右括号的宽度比例区分：

```
图标视觉对比：

codePreview（预览模式）:
┌─ ──────────────┐    左右两个等宽方括号
│                 │
└─ ──────────────┘    含义：全屏预览（左右都宽）

codeEdit（编辑模式）:
┌──────┐  ┌──────┐    左宽右窄
│      │  │      │
└──────┘  └──────┘    含义：仅编辑（左编辑区 + 右细边）

codeLive（实时模式）:
┌─────┐  ┌────────┐   左窄右宽
│     │  │        │
└─────┘  └────────┘   含义：实时预览（左编辑 + 右宽预览）
```

**UI 问题分析**:

1. **12×12px 尺寸下区分度极低**: 三个图标在工具栏中以 12px 显示时，方括号宽度差异仅约 2-3px，用户几乎无法区分

2. **图标语义不直觉**: 方括号宽度比例 → 编辑/预览/实时的映射关系不直觉。用户更期望看到：
   - 编辑模式：铅笔/光标图标
   - 预览模式：眼睛/文档图标
   - 实时模式：分屏图标

3. **色盲/弱视用户无法区分**: 仅靠形状微小差异区分三个状态，不符合 WCAG 1.4.1（不依赖颜色传达信息 — 此处为不依赖微小形状差异）

**与 antd 图标体系对比**:

```
antd 标准图标选择：
┌───────────┬──────────────────────────────┬───────────────────┐
│ 模式      │ antd 推荐图标                │ 语义              │
├───────────┼──────────────────────────────┼───────────────────┤
│ Edit      │ <EditOutlined />             │ 铅笔 → 编辑      │
│ Live      │ <SplitCellsOutlined />       │ 分屏 → 实时      │
│ Preview   │ <EyeOutlined />              │ 眼睛 → 预览      │
└───────────┴──────────────────────────────┴───────────────────┘
```

**与 Carbon Design System 图标规范对比**:

| 规范项 | Carbon 要求 | 当前实现 | 合规 |
|---|---|---|---|
| 图标尺寸 | 16px / 20px / 24px 标准尺寸 | 12×12px（非标） | ❌ |
| 图标风格 | 24×24 viewBox，1.5px stroke | polygon fill（实心风格） | ⚠️ 填充风格可接受但非标 |
| 触控目标 | 48px × 48px 最小 | 12×12px | ❌ |

**修复建议**: 在项目封装层替换为 antd 图标：

```tsx
import { EditOutlined, SplitCellsOutlined, EyeOutlined } from '@ant-design/icons';

// 覆盖默认图标
const customCommands = [
  {
    ...codeEdit,
    icon: <EditOutlined style={{ fontSize: 14 }} />,
  },
  {
    ...codeLive,
    icon: <SplitCellsOutlined style={{ fontSize: 14 }} />,
  },
  {
    ...codePreview,
    icon: <EyeOutlined style={{ fontSize: 14 }} />,
  },
];
```

---

## 四、P2 级中等问题（3 项）

### UI-P2-01: 🟡 SVG 图标缺少无障碍属性 — 屏幕阅读器体验差

**位置**: 第 12-21、44-50、74-79 行（三处 SVG）

```typescript
icon: (
  <svg width="12" height="12" viewBox="0 0 520 520">
    {/* ← 缺少 role="img" aria-hidden="true" */}
    <polygon fill="currentColor" points="..." />
  </svg>
),
```

**a11y 缺陷清单**:

| 缺失属性 | WCAG 要求 | 当前影响 |
|---|---|---|
| `role="img"` | 1.1.1 非文本内容 | 屏幕阅读器可能播报 SVG 内部坐标数据 |
| `aria-hidden="true"` | 1.1.1 / 4.1.2 | 与 buttonProps 的 aria-label 重复播报 |
| `<title>` | 1.1.1 | SVG 无文本替代内容 |

**重复播报问题**: `buttonProps` 提供了 `aria-label: 'Preview code (ctrl + 9)'`，但 SVG 内部无 `aria-hidden="true"`，屏幕阅读器可能先播报 aria-label，再尝试解析 SVG 内容，造成双重播报。

**WCAG 2.1 合规评估**:

```
┌─────────────────────────────────────┬────────────────┬────────────────┐
│ WCAG 标准                           │ 当前状态       │ 合规判定       │
├─────────────────────────────────────┼────────────────┼────────────────┤
│ 1.1.1 非文本内容（A 级）            │ ⚠️ 部分满足   │ buttonProps    │
│                                     │                │ 有 aria-label，│
│                                     │                │ 但 SVG 未标记  │
│ 4.1.2 名称、角色、值（A 级）        │ ⚠️ 部分满足   │ SVG 缺 role    │
│ 2.4.4 链接目的（上下文）（A 级）    │ ✅ 满足       │ title 属性存在 │
│ 2.1.1 键盘可操作（A 级）            │ ✅ 满足       │ 有快捷键绑定   │
└─────────────────────────────────────┴────────────────┴────────────────┘
```

**修复建议**:

```typescript
<svg width="12" height="12" viewBox="0 0 520 520" role="img" aria-hidden="true">
  <polygon fill="currentColor" points="..." />
</svg>
```

---

### UI-P2-02: 🟡 按钮标签未国际化 — 英文硬编码，无 i18n 接口

**位置**: 第 10、42、71 行

```typescript
buttonProps: { 'aria-label': 'Preview code (ctrl + 9)', title: 'Preview code (ctrl + 9)' },
buttonProps: { 'aria-label': 'Edit code (ctrl + 7)', title: 'Edit code (ctrl + 7)' },
buttonProps: { 'aria-label': 'Live code (ctrl + 8)', title: 'Live code (ctrl + 8)' },
```

**问题分析**:

1. **所有文本硬编码为英文**: 项目要求中文界面（CLAUDE.md 中所有界面文本使用中文），但编辑器工具栏显示英文标签
2. **无国际化接口**: ICommand 接口不提供 i18n 回调或 context 注入机制
3. **"code" 语义误导**: 按钮标签为 "Preview code" / "Edit code" / "Live code"，但实际功能是"编辑器模式切换"而非"代码操作"
4. **title 与 aria-label 重复**: 两个属性内容完全相同，title 仅在鼠标悬停时显示，aria-label 为屏幕阅读器播报

**与本项目中文化要求的冲突**:

```
项目要求（CLAUDE.md）：
  "所有页面显示必须使用中文"

当前工具栏显示效果：
  ┌────────────────────────────────────────────────────────────┐
  │  [B] [I] [S] [Link] [Image] | [Edit code] [Live code]    │
  │                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^│
  │                               英文标签，与项目中文界面冲突│
  └────────────────────────────────────────────────────────────┘
```

**修复建议**: 在项目封装层覆盖 buttonProps：

```tsx
import { codeEdit, codeLive, codePreview } from '@uiw/react-md-editor/commands-preview';

const localizedCommands = [
  { ...codeEdit, buttonProps: { 'aria-label': '编辑模式 (Ctrl + 7)', title: '编辑模式 (Ctrl + 7)' } },
  { ...codeLive, buttonProps: { 'aria-label': '实时模式 (Ctrl + 8)', title: '实时模式 (Ctrl + 8)' } },
  { ...codePreview, buttonProps: { 'aria-label': '预览模式 (Ctrl + 9)', title: '预览模式 (Ctrl + 9)' } },
];
```

---

### UI-P2-03: 🟡 交互行为双路径不一致 — 按钮/快捷键产生不同的用户体验

**位置**: 第 29-34、58-63、87-92 行（三处 execute 函数）

```typescript
execute: (state, api, dispatch?, executeCommandState?, shortcuts?) => {
  api.textArea.focus();
  if (shortcuts && dispatch && executeCommandState) {
    dispatch({ preview: 'preview' });
  }
},
```

**交互路径分析**:

```
用户交互路径对比：

路径 A — 工具栏按钮点击：
┌─────────────────────────────────────────────────────┐
│ 用户点击"Preview"按钮                                │
│   → execute() 被调用                                 │
│   → shortcuts = undefined                           │
│   → if 条件为 false                                  │
│   → 仅执行 api.textArea.focus()                     │
│   → 模式切换由工具栏外部逻辑处理                     │
│                                                      │
│ 用户感知：点击按钮 → 模式切换成功                    │
│ 实际 execute：空操作（仅 focus）                     │
└─────────────────────────────────────────────────────┘

路径 B — 键盘快捷键（Ctrl+9）：
┌─────────────────────────────────────────────────────┐
│ 用户按下 Ctrl+9                                      │
│   → execute() 被调用                                 │
│   → shortcuts = ['ctrlcmd+9']                       │
│   → if 条件为 true                                   │
│   → 执行 api.textArea.focus() + dispatch            │
│   → 模式切换由此函数直接 dispatch                   │
│                                                      │
│ 用户感知：按下快捷键 → 模式切换成功                  │
│ 实际 execute：focus + dispatch                       │
└─────────────────────────────────────────────────────┘
```

**UI 一致性问题**:

1. **用户感知一致但实现路径分裂**: 用户看到"点击按钮"和"按快捷键"都能切换模式，但代码执行路径完全不同
2. **focus 行为不一致**: 快捷键路径先 focus 再 dispatch，按钮路径可能不执行 focus（取决于外部逻辑是否也 focus）
3. **未来修改风险**: 如果需要在模式切换时添加额外 UI 反馈（如过渡动画、toast 通知），必须同时修改两个路径

**修复建议**: 统一两条路径的执行逻辑，在封装层拦截 execute：

```typescript
// 封装层：确保所有模式切换都走同一路径
const createModeCommand = (mode: PreviewMode, base: ICommand): ICommand => ({
  ...base,
  execute: (state, api, dispatch) => {
    api.textArea?.focus();
    dispatch?.({ preview: mode });
  },
});
```

---

## 五、P3 级轻微问题（4 项）

### UI-P3-01: 🟢 SVG 尺寸 12×12px 不符合 Carbon 图标规范

**位置**: 第 12、44、74 行

```typescript
<svg width="12" height="12" viewBox="0 0 520 520">
```

**DESIGN.md 分析**: Carbon Design System 定义了标准图标尺寸体系：

| 尺寸 | 用途 | 与当前对比 |
|---|---|---|
| 16px | 紧凑工具栏/行内图标 | 当前 12px 偏小 |
| 20px | 标准工具栏图标 | 推荐 |
| 24px | 导航/大工具栏 | 偏大 |

12px 不在 Carbon 标准图标尺寸体系中，且在工具栏中视觉权重过低，与相邻按钮（加粗 B、斜体 I 等通常为 14-16px）相比显得过小。

---

### UI-P3-02: 🟢 图标仅使用 `fill="currentColor"` 无视觉权重区分

**位置**: 第 14、18、45、48、75、78 行

三个图标全部使用 `fill="currentColor"`（跟随文本色），无论当前处于何种模式，图标颜色始终一致。缺少选中态的视觉权重区分。

**Carbon 规范对比**:

```
Carbon 标签选中态：
  默认态：{colors.ink-muted} (#525252) weight 400
  选中态：{colors.ink} (#161616) weight 600 + {colors.primary} (#0f62fe) 2px 底部下划线

当前实现：
  默认态：currentColor (通常 #161616)
  选中态：currentColor (相同) — 无区分
```

---

### UI-P3-03: 🟢 快捷键 Ctrl+7/8/9 与浏览器/系统快捷键冲突

**位置**: 第 9、41、71 行

```
ctrlcmd+7 → Edit    （Firefox: 切换标签页 / 部分输入法: 切换候选词）
ctrlcmd+8 → Live    （部分浏览器: 切换标签页）
ctrlcmd+9 → Preview （Chrome/Edge: 切换到最后一个标签页 / Firefox: 切换标签页）
```

`Ctrl+9` 在主流浏览器中默认行为为"跳转到最后一个标签页"。如果编辑器组件获得焦点前浏览器未拦截，此快捷键可能同时触发标签页切换和编辑器模式切换。

---

### UI-P3-04: 🟢 导出名 `code` 前缀与 UI 标签 "code" 语义不一致

**位置**: 第 5、37、66 行

```typescript
export const codePreview: ICommand = { ... };   // code 前缀
export const codeEdit: ICommand = { ... };       // code 前缀
export const codeLive: ICommand = { ... };       // code 前缀
```

`code` 前缀暗示"代码块相关功能"，但实际功能是"编辑器视图模式切换"。在 UI 层面，用户看到的是"模式切换按钮"而非"代码操作按钮"。导出名与 UI 功能的语义断裂增加了维护者的认知负担。

---

## 六、DESIGN.md 合规性检查清单

| 检查项 | DESIGN.md 要求 | 当前状态 | 合规 |
|---|---|---|---|
| 字体族 | IBM Plex Sans | 系统默认 | ❌ |
| 圆角 | `{rounded.none}` 0px | 取决于工具栏 CSS | ⚠️ |
| 主色 | #0f62fe IBM Blue | currentColor（无选中态） | ❌ |
| 文本色 | #161616 ink / #525252 ink-muted | 无区分 | ❌ |
| 触控目标 | 48px × 48px 最小 | SVG 12×12px | ❌ |
| 图标尺寸 | 16/20/24px 标准体系 | 12×12px（非标） | ❌ |
| antd 组件 | 必须使用 | 零 antd 集成 | ❌ |
| 选中态 | 2px 底部下划线 + weight 600 | 无选中态视觉 | ❌ |
| 间距基数 | 4px 网格 | 取决于工具栏 | ⚠️ |
| 标签文本 | 中文界面 | 英文硬编码 | ❌ |
| 无障碍 | WCAG 2.1 AA | 部分（aria-label 有，SVG 缺属性） | ⚠️ |

---

## 七、与其他评审的交叉引用

| 评审文件 | 评分 | 核心结论 | UI 评审关联 |
|---|---|---|---|
| `commands-preview.tsx.md`（架构评审 3.4/10） | 3.4/10 | 95% 代码重复、execute 双路径死代码 | UI 层面：图标重复、交互双路径导致体验不一致 |
| `commands-preview.tsx.security.md`（安全评审 7.6/10） | 7.6/10 | 低安全风险，4 项改进建议 | SVG 无障碍缺失同时影响安全合规和 UI 合规 |

---

## 八、封装层修复建议汇总

> **注**: 此文件为第三方库 `@uiw/react-md-editor` 内部代码，不可直接修改。以下修复建议针对本项目的封装层。

| 优先级 | 编号 | 封装层修复方案 | 工作量 |
|---|---|---|---|
| P1 | UI-P1-01 | 使用 antd `Segmented` 组件替代默认工具栏模式切换按钮，传入 `preview` prop 控制 MDEditor 模式 | 中 |
| P1 | UI-P1-02 | 使用 antd `@ant-design/icons`（EditOutlined / SplitCellsOutlined / EyeOutlined）替换默认 SVG 图标 | 小 |
| P2 | UI-P2-01 | SVG 封装时添加 `role="img"` + `aria-hidden="true"`（若保留默认图标） | 小 |
| P2 | UI-P2-02 | 覆盖 buttonProps 为中文标签 | 小 |
| P2 | UI-P2-03 | 封装层拦截 execute，统一按钮/快捷键执行路径 | 中 |
| P3 | UI-P3-01 | 图标尺寸调整为 16px 或 20px（通过 CSS 覆盖） | 小 |
| P3 | UI-P3-02 | 选中态添加 Carbon 风格视觉区分（底部下划线 + weight 变化） | 中 |
| P3 | UI-P3-03 | 评估是否需要更换快捷键绑定 | 小 |
| P3 | UI-P3-04 | 导入时重命名为 `previewMode` / `editMode` / `liveMode` | 小 |

---

## 九、评审总结

`commands/preview.tsx` 作为 `@uiw/react-md-editor` 的模式切换命令定义，功能上可用——三种模式通过工具栏按钮或快捷键切换。但从 UI/UX 专家视角评审，此文件存在以下系统性问题：

1. **与 DESIGN.md 全面偏离（UI-P1-01）**: 不使用 antd 组件、不遵循 Carbon Design System 的标签/按钮规范、无选中态视觉反馈。模式切换应使用 antd `Segmented` 或 `Radio.Group` 实现，而非独立按钮。

2. **图标视觉区分度极低（UI-P1-02）**: 三个 12×12px 的方括号变体图标在工具栏中几乎无法区分，且不符合 Carbon 图标尺寸标准（应为 16/20/24px）。应替换为 antd 标准图标。

3. **交互行为双路径不一致（UI-P2-03）**: 按钮点击和快捷键走不同的执行路径，用户感知一致但实现分裂，增加维护风险。

**综合评分 3.2/10** — 功能可用但不合规。核心扣分项：零 antd 集成（-2 分）、零 DESIGN.md 对齐（-2 分）、图标辨识度低（-1.5 分）、无 i18n（-1 分）。通过封装层使用 antd `Segmented` + antd 图标可提升至 7+ 分。

---

*评审人: 软件 UI 专家 (Claude)*
*评审方法: DESIGN.md 合规审查 + antd 组件规范比对 + WCAG 2.1 无障碍检查 + 交互路径追踪 + 图标语义分析 + Carbon Design System 对齐评估*
