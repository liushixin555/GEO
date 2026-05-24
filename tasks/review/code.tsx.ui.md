# 软件 UI 专家评审：@uiw/react-md-editor code.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/code.tsx`
**评审角色**: 软件 UI 专家（用户界面设计 · 交互体验 · 设计系统合规 · 可访问性 · 工具栏 UX · 键盘交互）
**评审日期**: 2026-05-24
**代码行数**: 97 行（2 个导出 `ICommand` 对象：`codeBlock` + `code`）
**功能概述**: Markdown 编辑器工具栏「代码」命令——`code` 插入行内代码（`` ` ``），`codeBlock` 插入代码块（` ``` `），多行选中文本自动降级为代码块
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 核心交互功能可用，但在工具栏图标设计、无障碍支持、键盘快捷键规范、Carbon Design System 合规方面存在多项缺陷）

**问题统计**: HIGH × 0 / MEDIUM × 5 / LOW × 4 / INFO × 2

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | Markdown 编辑器工具栏代码命令（行内代码 + 代码块） |
| 代码行数 | 97 行 |
| 导出对象 | 2 个 ICommand（`code`、`codeBlock`） |
| SVG 图标 | 2 个（代码块图标 13×13 + 代码图标 14×14） |
| 键盘快捷键 | `ctrlcmd+j`（行内代码）、`ctrlcmd+shift+j`（代码块） |
| buttonProps | 2 组（含 aria-label 和 title） |
| 交互模式 | Toggle（包裹/解包裹） + 多行自动降级 |

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 工具栏图标设计（Toolbar Icon Design） | 4 | 图标尺寸过小，视觉权重不足，与 antd Icon 风格不一致 |
| 交互逻辑（Interaction Logic） | 7 | Toggle 包裹/解包裹 + 多行降级逻辑合理，上下文感知换行处理完善 |
| 可访问性（Accessibility） | 5 | 提供 aria-label 但缺少键盘交互状态反馈和 ARIA live region |
| 键盘快捷键规范（Keyboard Shortcuts） | 4 | `ctrl+j` 是浏览器级快捷键冲突，命名模式不符合 Carbon 规范 |
| DESIGN.md 合规（Carbon DS Alignment） | 3 | 工具栏按钮样式完全由外部 CSS 控制，按钮自身无 Design Token 支持 |
| antd 集成（antd Integration） | 3 | 不使用 antd Button/Tooltip 组件，buttonProps 暴露底层 HTML 属性 |
| 用户体验（User Experience） | 6 | 核心功能可用，但缺少操作反馈（toast/status）、语言选择、代码模板 |
| 国际化（i18n） | 1 | aria-label 和 title 硬编码英文，无 locale 支持 |
| **综合评分** | **4.1 / 10** | |

---

## 三、工具栏按钮 UI 评审

### 3.1 代码块按钮（codeBlock）

#### 图标设计

```tsx
// 第 11-17 行
icon: (
  <svg width="13" height="13" role="img" viewBox="0 0 156 156">
    <path
      fill="currentColor"
      d="M110.85 120.575..."
    />
  </svg>
),
```

**UI 问题分析**:

| 属性 | code.tsx 值 | Carbon/antd 规范 | 合规性 |
|---|---|---|---|
| 图标尺寸 | 13×13 px | Carbon: 16×16（toolbar），antd: 16-20px | ❌ 过小 |
| viewBox | 0 0 156 156 | — | ✅ 合理 |
| fill | `currentColor` | Carbon/antd 均使用 currentColor | ✅ 合规 |
| role | `"img"` | — | ✅ 合规 |
| 图标风格 | 自定义矩形线条（花括号风格） | Carbon 使用 IBM Design Language 图标集 | ❌ 风格冲突 |

**DESIGN.md 视角**:

Carbon Design System 的工具栏图标使用 **16×16 px** 的 IBM Icons 图标集（Plex 图标库），线条粗细 1.5px，基于 24×24 的设计网格缩放。`code.tsx` 的 SVG 图标使用 13×13 尺寸且基于 156×156 viewBox 的非标准网格，视觉上比周围工具栏按钮小约 20%，破坏了工具栏的视觉一致性。

**对项目的影响**: 在本项目的编辑器工具栏中，代码按钮的图标明显小于加粗（bold）、斜体（italic）等按钮，用户可能误认为该按钮不可用或视觉层级较低。

#### buttonProps 分析

```tsx
// 第 10 行
buttonProps: {
  'aria-label': 'Insert Code Block (ctrl + shift + j)',
  title: 'Insert Code Block (ctrl + shift +j)'
},
```

**UI 问题分析**:

1. **aria-label 和 title 内容不一致**: `aria-label` 写的是 `ctrl + shift + j`（`+` 前后有空格），`title` 写的是 `ctrl + shift +j`（`j` 前缺少空格）。这种不一致在 codeBlock 和 code 两个命令中都存在
2. **快捷键提示使用 `ctrl` 而非平台感知**: 无论用户在 macOS 还是 Windows 上，提示始终显示 `ctrl`，而实际快捷键绑定是 `ctrlcmd`（macOS 上应为 `⌘`）。Carbon 和 antd 的 Tooltip 均做平台感知显示
3. **括号风格不一致**: 使用 `(ctrl + shift + j)` 而非 Carbon 的 `⌘⇧J` 或 antd 的 `Ctrl+Shift+J` 标准格式

---

### 3.2 行内代码按钮（code）

```tsx
// 第 64-76 行
export const code: ICommand = {
  name: 'code',
  keyCommand: 'code',
  shortcuts: 'ctrlcmd+j',
  prefix: '`',
  buttonProps: { 'aria-label': 'Insert code (ctrl + j)', title: 'Insert code (ctrl + j)' },
  icon: (
    <svg width="14" height="14" role="img" viewBox="0 0 640 512">
      <path
        fill="currentColor"
        d="M278.9 511.5l-61-17.7..."
      />
    </svg>
  ),
```

**图标问题**:

`code` 命令使用 Font Awesome 风格的 `</>` 尖括号图标（viewBox 640×512），而 `codeBlock` 使用自定义矩形线条图标。同一工具栏中两种代码相关按钮的图标风格完全不同：

| 属性 | code（行内代码） | codeBlock（代码块） | 一致性 |
|---|---|---|---|
| SVG 尺寸 | 14×14 | 13×13 | ❌ 不一致 |
| viewBox | 640×512 | 156×156 | ❌ 完全不同 |
| 图标风格 | Font Awesome `</>` | 自定义花括号 `{ }` | ❌ 风格冲突 |
| 视觉密度 | 高（多曲线） | 低（简单矩形） | ❌ 不平衡 |

**对项目的影响**: 用户在同一工具栏中看到两个代码按钮，图标风格和尺寸完全不同，难以直觉区分"行内代码"和"代码块"的用途差异。

---

## 四、交互逻辑 UX 评审

### 4.1 codeBlock.execute — 两阶段 Toggle 交互

```tsx
// 第 19-61 行
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  // Phase 1: 扩展选区，检测是否已在代码块内
  const newSelectionRange = selectWord({
    text: state.text,
    selection: state.selection,
    prefix: '```\n',
    suffix: '\n```',
  });
  const state1 = api.setSelectionRange(newSelectionRange);

  // Phase 2: 根据检测结果确定包裹方向
  let prefix = '\n```\n';
  let suffix = '\n```\n';

  if (/* 已在代码块内 */) {
    // 解包裹
    prefix = '```\n';
    suffix = '\n```';
  } else {
    // 包裹 — 上下文换行感知
    if (/* 行首 */) prefix = '```\n';
    if (/* 行尾 */) suffix = '\n```';
  }
  // ...
},
```

**UX 评价**:

| 维度 | 评分 | 说明 |
|---|---|---|
| Toggle 可逆性 | ✅ 优秀 | 点击包裹，再点击解包裹，用户可以自由切换 |
| 多行处理 | ✅ 良好 | 选中多行文本自动添加代码块包裹 |
| 上下文感知 | ✅ 优秀 | 智能检测行首/行尾，避免产生多余空行 |
| 操作反馈 | ❌ 缺失 | 无视觉反馈（toast、状态栏提示），用户不确定操作是否成功 |
| 撤销支持 | ⚠️ 一般 | 依赖浏览器原生 textarea undo，非编辑器级 undo 管理 |

**问题 UX-01 — 缺少操作视觉反馈**:

用户点击代码按钮或使用快捷键后，textarea 的内容被修改，但没有任何视觉反馈（如按钮短暂高亮、状态提示"已插入代码块"、textarea 轻微闪烁）。在 Carbon Design System 中，工具栏操作应通过 **inline notification** 或 **toast** 提供操作确认。

**问题 UX-02 — 解包裹后的光标位置不直觉**:

解包裹时（移除代码块标记），光标位置由 `executeCommand` 中的 `selection.start - prefix.length` 计算。如果代码块内容为空，解包裹后光标会定位到代码块原本结束的位置，而非内容起始位置，可能导致用户困惑。

### 4.2 code.execute — 多行自动降级

```tsx
// 第 78-96 行
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  if (state.selectedText.indexOf('\n') === -1) {
    // 单行 → 行内代码
    // ...
  } else {
    // 多行 → 降级为代码块
    codeBlock.execute!(state, api);
  }
},
```

**UX 评价**:

| 维度 | 评分 | 说明 |
|---|---|---|
| 智能降级 | ✅ 合理 | 多行文本自动转为代码块，符合 Markdown 语义 |
| 可预测性 | ⚠️ 一般 | 用户可能期望 `code` 按钮始终插入行内代码，降级行为可能出乎意料 |
| 发现性 | ❌ 缺失 | 无 UI 提示告诉用户"已自动切换为代码块模式" |

**问题 UX-03 — 降级行为无 UI 提示**:

当用户选中多行文本并点击行内代码按钮时，编辑器静默插入代码块包裹。没有视觉提示说明发生了降级，用户可能困惑"为什么点击行内代码按钮却产生了代码块"。

**建议**: 在工具栏按钮的 Tooltip 中提示降级行为，如"Insert code (multiline → code block, ⌘J)"，或在降级发生时显示短暂的 inline notification。

### 4.3 上下文换行感知

```tsx
// 第 42-56 行
if (
  (state1.selection.start >= 1 &&
    state.text.slice(state1.selection.start - 1, state1.selection.start) === '\n') ||
  state1.selection.start === 0
) {
  prefix = '```\n';
}
if (
  (state1.selection.end <= state.text.length - 1 &&
    state.text.slice(state1.selection.end, state1.selection.end + 1) === '\n') ||
  state1.selection.end === state.text.length
) {
  suffix = '\n```';
}
```

**UX 评价**: ✅ 优秀

这段逻辑确保了代码块标记的干净插入：
- 如果光标在行首，不添加前导换行
- 如果光标在行尾，不添加尾部换行
- 避免在已有换行符的位置插入多余换行

这是良好的 UX 细节处理，确保了 Markdown 源码的排版整洁。

---

## 五、键盘快捷键 UI 评审

### 5.1 快捷键绑定

| 命令 | 快捷键 | 用途 |
|---|---|---|
| `code` | `ctrlcmd+j` | 插入行内代码 |
| `codeBlock` | `ctrlcmd+shift+j` | 插入代码块 |

**问题 KB-01 — `Ctrl+J` 与浏览器级快捷键冲突（P1 中等）**:

在 Chrome/Firefox 浏览器中，`Ctrl+J` 是**打开下载历史**的浏览器级快捷键。当用户在编辑器中按 `Ctrl+J` 时：
- 浏览器可能同时打开下载历史面板和插入行内代码
- 或者浏览器捕获事件，代码命令完全不执行
- 这取决于事件冒泡顺序和 `preventDefault` 的调用时机

**Carbon Design System 视角**: Carbon 的键盘交互指南（Keyboard Interactions）明确建议"避免使用浏览器保留快捷键"。Carbon 的 CodeSnippet 组件不绑定任何键盘快捷键。

**建议**: 将行内代码快捷键改为 `Ctrl+K`（如 VS Code 的 `Ctrl+K` chord 模式）或其他非浏览器保留键。

**问题 KB-02 — 快捷键提示非平台感知**:

```tsx
buttonProps: { 'aria-label': 'Insert Code Block (ctrl + shift + j)', ... }
```

快捷键提示固定显示 `ctrl`，但 `ctrlcmd` 在 macOS 上映射为 `⌘`（Command 键）。对比：
- VS Code: 根据平台动态显示 `Ctrl+J` 或 `⌘J`
- antd Tooltip: 使用 `modifierKey` 工具函数动态渲染
- Carbon: 在文档中分别列出 Windows/macOS 快捷键

**问题 KB-03 — 快捷键提示格式不一致**:

| 属性 | 格式 |
|---|---|
| `aria-label` | `(ctrl + shift + j)` — 使用小写，空格分隔 |
| `title` | `(ctrl + shift +j)` — `j` 前缺少空格 |
| Carbon 标准 | `Ctrl+Shift+J` — 首字母大写，`+` 无空格 |
| antd 标准 | `Ctrl + Shift + J` — 首字母大写，空格分隔 |

---

## 六、可访问性（a11y）评审

### 6.1 WCAG 2.1 合规检查

| 准则 | 级别 | 合规 | 说明 |
|---|---|---|---|
| **1.1.1 非文本内容** | A | ⚠️ | SVG 有 `role="img"` 但无 `<title>` 子元素 |
| **2.1.1 键盘可操作** | A | ✅ | 快捷键绑定确保键盘可用 |
| **2.1.2 无键盘陷阱** | A | ✅ | 操作后焦点保留在 textarea |
| **2.4.6 标题与标签** | AA | ⚠️ | `aria-label` 存在但为英文 |
| **2.4.7 焦点可见** | AA | ❌ | 按钮焦点样式由外部 CSS 控制，`buttonProps` 未设置焦点相关属性 |
| **3.2.2 输入时** | A | ⚠️ | Toggle 行为（包裹/解包裹）改变了上下文，但无 ARIA 状态通知 |
| **4.1.2 名称、角色、值** | A | ⚠️ | SVG 缺少 `<title>`，屏幕阅读器无法描述图标内容 |

### 6.2 核心可访问性问题

**问题 A-01 — SVG 图标缺少 `<title>` 子元素（P2 中等）**:

```tsx
<svg width="13" height="13" role="img" viewBox="0 0 156 156">
  {/* 缺少 <title>Code Block</title> */}
  <path fill="currentColor" d="..." />
</svg>
```

虽然 `buttonProps` 提供了 `aria-label`（按钮级别），但 SVG 自身没有 `<title>` 子元素。在以下场景中会有问题：
- 屏幕阅读器可能先读取 SVG 的 `role="img"` 然后无内容可报
- 如果 SVG 被单独使用（非按钮内），无障碍名称完全缺失

**Carbon Design System 视角**: Carbon 的图标组件（`@carbon/icons-react`）要求每个 SVG 必须包含 `<title>` 元素以提供无障碍描述。

**建议修复**:

```tsx
icon: (
  <svg width="16" height="16" role="img" viewBox="0 0 156 156" aria-hidden="true">
    <title>Code Block</title>
    <path fill="currentColor" d="..." />
  </svg>
),
```

> 注：当 SVG 作为按钮图标时，应设置 `aria-hidden="true"` 避免与按钮的 `aria-label` 重复播报。

**问题 A-02 — 操作无 ARIA 状态反馈（P2 中等）**:

用户点击代码按钮后，textarea 内容被修改，但没有任何 ARIA 状态变更通知。屏幕阅读器用户无法知道：
- 代码块是否被成功插入
- 选中文本是否被包裹/解包裹
- 行内代码是否因多行降级为代码块

**建议**: 在 `buttonProps` 中或通过编辑器 Context 添加 `aria-live="polite"` 的状态区域。

**问题 A-03 — `aria-label` 硬编码英文（P1 中等）**:

```tsx
buttonProps: { 'aria-label': 'Insert Code Block (ctrl + shift + j)', ... }
```

`aria-label` 和 `title` 硬编码为英文，不支持国际化。对比：
- antd 组件通过 `ConfigProvider.locale` 支持多语言
- Carbon 组件通过 `ids` 和 `translateWithId` 支持多语言
- 本项目要求使用中文 UI（`CLAUDE.md` 规定 commit 使用中文）

---

## 七、DESIGN.md 合规性分析

### 7.1 工具栏按钮样式

`code.tsx` 通过 `buttonProps` 暴露 HTML `<button>` 属性，但按钮的实际渲染和样式完全由 `@uiw/react-md-editor` 的 Toolbar 组件和 CSS 控制。`code.tsx` 自身无法控制以下 DESIGN.md 属性：

| DESIGN.md 属性 | code.tsx 控制能力 | 说明 |
|---|---|---|
| `rounded.none`（0px 圆角） | ❌ 无 | 由 Toolbar CSS 控制 |
| `colors.primary`（按钮色） | ❌ 无 | 由 Toolbar CSS 控制 |
| `typography.button`（14px/400） | ❌ 无 | 由 Toolbar CSS 控制 |
| 48px 触摸目标 | ❌ 无 | 由 Toolbar CSS 控制 |
| focus ring（2px blue outline） | ❌ 无 | 由 Toolbar CSS 控制 |

**对本项目的影响**: 本项目需要在 `global.css` 中覆盖 `@uiw/react-md-editor` 的工具栏按钮样式，将其对齐到 Carbon Design System。`buttonProps` 提供了 `className` 和 `style` 的逃生舱口，但本项目未使用。

### 7.2 SVG 图标与 Carbon Icons 的差异

```css
/* code.tsx SVG vs Carbon Icons 对比 */
┌────────────────────────┬──────────────────────┬──────────────────────┐
│ 属性                    │ code.tsx SVG         │ Carbon Icons         │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ 设计网格                │ 156×156 / 640×512    │ 24×24 (标准)         │
│ 线条粗细                │ 非标准               │ 1.5px                │
│ 尺寸                    │ 13×13 / 14×14        │ 16×16 / 20×20        │
│ 填充方式                │ fill="currentColor"  │ fill="currentColor"  │ ✅ 一致
│ 图标集归属              │ 自定义 / Font Awesome│ IBM Design Language  │
│ 视觉风格                │ 不统一               │ 严格统一的线条风格   │
└────────────────────────┴──────────────────────┴──────────────────────┘
```

**对本项目的影响**: 编辑器工具栏中的代码图标与项目中其他使用 Carbon/antd 图标的 UI 元素（如侧边栏、按钮）风格不一致。本项目可以选择通过 CSS 隐藏原始图标并使用 antd Icon 组件替代。

### 7.3 代码块包裹输出格式

`code.tsx` 生成的代码块使用标准 Markdown 围栏语法：

```markdown
```
code here
```
```

**DESIGN.md 对齐分析**:

代码块的**渲染效果**由 `@uiw/react-markdown-preview` 处理（已在其他评审文件中分析），与 `code.tsx` 无关。`code.tsx` 只负责在 textarea 中插入 Markdown 源码标记，这部分与 DESIGN.md 不直接冲突。

但需要注意：`code.tsx` 生成的代码块不包含语言标识符（` ```tsx `），这意味着所有代码块默认无语法高亮。从 UX 角度：

| 维度 | 评分 | 说明 |
|---|---|---|
| 默认无语言标识 | ⚠️ 一般 | 用户需要手动添加语言标识才能获得语法高亮 |
| 语言选择 UI | ❌ 缺失 | 无下拉菜单选择代码语言 |
| 代码模板 | ❌ 缺失 | 无预设代码模板（如 React 组件模板） |

---

## 八、与 antd 集成评审

### 8.1 工具栏按钮合规性

**CLAUDE.md 铁律**: 前端必须使用 Ant Design (antd) 组件。

**合规分析**:

| code.tsx 输出 | antd 等价组件 | 合规 | 说明 |
|---|---|---|---|
| `<button>` (工具栏) | `<Button>` / `<Tooltip>` | ❌ | 第三方库内部实现，不受控 |
| `<svg>` (图标) | `<Icon>` / `@ant-design/icons` | ❌ | 第三方库内部实现，不受控 |
| aria-label 硬编码 | antd ConfigProvider locale | ❌ | 第三方库无 i18n 支持 |

**UI 专家意见**: 工具栏按钮是 `@uiw/react-md-editor` 的内部实现，本项目无法控制其 DOM 结构。铁律的意图是禁止本项目的自定义代码使用原生 HTML，而非要求覆盖第三方库的内部实现。但建议本项目在封装层通过 CSS 样式覆盖，使工具栏按钮的视觉风格尽量接近 antd Button。

### 8.2 antd Design Token 对齐

`code.tsx` 的 `buttonProps` 不接受任何 antd Design Token：

| Token 维度 | antd Token | code.tsx buttonProps | 对齐方式 |
|---|---|---|---|
| 按钮文字色 | `colorText` | 无 | CSS 覆盖 |
| 按钮背景色 | `colorBgContainer` | 无 | CSS 覆盖 |
| hover 色 | `colorPrimaryHover` | 无 | CSS 覆盖 |
| 圆角 | `borderRadius` = 6px | 无 | CSS 覆盖为 0px |
| 字体 | `fontFamily` | 无 | CSS 覆盖 |

### 8.3 可能的 antd 增强封装

```tsx
// 概念示例：用 antd 组件替换工具栏按钮
import { Button, Tooltip } from 'antd';
import { CodeOutlined, CodeSandboxOutlined } from '@ant-design/icons';

// 自定义 code 命令，使用 antd 图标
const customCode: ICommand = {
  ...code,
  icon: <CodeOutlined />,
  buttonProps: {
    'aria-label': '插入行内代码',
    title: '插入行内代码 (Ctrl+J)',
  },
};
```

---

## 九、响应式与触摸体验评审

### 9.1 触摸目标尺寸

| 交互元素 | 预估尺寸 | DESIGN.md 要求 | 合规 |
|---|---|---|---|
| 工具栏代码按钮 | ~24×24 px | 48×48 px | ❌ |
| 快捷键 `Ctrl+J` | 不适用 | — | ✅ 桌面端可用 |

**问题 R-01 — 工具栏按钮触摸目标过小**:

`@uiw/react-md-editor` 的工具栏按钮默认约 24×24 px，不满足 DESIGN.md 要求的 48px 最小触摸目标。在移动端使用编辑器时，代码按钮可能难以准确点击。

**建议**: 在封装层通过 CSS 将工具栏按钮的 `min-width` / `min-height` 设为 48px，并增加 `padding`。

### 9.2 移动端快捷键

移动端无物理键盘，`ctrlcmd+j` 快捷键完全不可用。代码插入功能完全依赖工具栏按钮点击。如果工具栏在小屏幕上被隐藏或折叠（如切换到预览模式），用户将无法插入代码。

---

## 十、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 影响 | 建议 |
|---|---|---|---|---|---|
| UI-P1-01 | P2 中等 | 图标 | SVG 图标 13×13 / 14×14 尺寸过小，与 Carbon 16px 规范不符 | 工具栏视觉不一致 | CSS 缩放或替换为 antd Icon |
| UI-P1-02 | P2 中等 | 图标 | code 与 codeBlock 图标风格完全不同（Font Awesome vs 自定义） | 用户难以区分按钮用途 | 统一图标风格 |
| UI-P1-03 | P2 中等 | 快捷键 | `Ctrl+J` 与浏览器下载历史快捷键冲突 | 操作可能不执行 | 改用非浏览器保留键 |
| UI-P1-04 | P2 中等 | 国际化 | aria-label/title 硬编码英文 | 无法适配中文 UI | 封装层覆盖 buttonProps |
| UI-P1-05 | P2 中等 | 国际化 | 快捷键提示非平台感知（macOS 应显示 `⌘`） | macOS 用户困惑 | 封装层动态生成提示 |
| UI-P2-01 | P3 轻微 | UX | 操作无视觉反馈（无 toast/status） | 用户不确定操作是否成功 | 添加 inline notification |
| UI-P2-02 | P3 轻微 | UX | 多行降级为代码块时无 UI 提示 | 用户困惑操作结果 | Tooltip 说明降级行为 |
| UI-P2-03 | P3 轻微 | a11y | SVG 缺少 `<title>` 子元素 | 屏幕阅读器无法描述图标 | 添加 `<title>` |
| UI-P2-04 | P3 轻微 | a11y | 操作无 ARIA live 状态反馈 | 屏幕阅读器无操作确认 | 添加 `aria-live` 区域 |
| UI-P2-05 | P3 轻微 | 响应式 | 工具栏按钮触摸目标 < 48px | 移动端难以点击 | CSS 扩大触摸区域 |
| UI-P2-06 | P3 轻微 | UX | 代码块默认无语言标识，无语言选择 UI | 无语法高亮 | 添加语言下拉选择 |
| UI-P3-01 | P4 信息 | 一致性 | aria-label 和 title 中快捷键格式不一致（空格差异） | 视觉不专业 | 统一格式 |
| UI-P3-02 | P4 信息 | Token | buttonProps 不支持 antd Design Token | 无法跟随全局主题 | CSS 变量覆盖 |

---

## 十一、对本项目的集成建议

### 优先级 P2（建议处理）

1. **替换工具栏代码图标**: 通过自定义 ICommand 对象或 CSS 覆盖，将 SVG 图标替换为 antd `CodeOutlined` / `CodeSandboxOutlined`，统一图标风格
2. **覆盖 buttonProps 为中文**: 在封装层创建自定义 code 命令，将 `aria-label` 和 `title` 改为中文（如"插入代码块"）
3. **快捷键冲突检测**: 在编辑器封装层监听 `Ctrl+J`，如果浏览器拦截则降级为按钮点击提示

### 优先级 P3（可纳入技术债）

4. **工具栏按钮 CSS 覆盖**: 将工具栏按钮的 `min-height` 设为 48px，`border-radius` 设为 0px，对齐 Carbon Design System
5. **添加语言选择 UI**: 创建自定义代码块命令，插入代码块时弹出 antd `Select` 选择语言
6. **SVG aria-hidden**: 在 CSS 中为工具栏 SVG 添加 `aria-hidden: true`，避免与按钮 `aria-label` 重复播报

### 概念示例：自定义中文 code 命令

```tsx
import { code as originalCode, codeBlock as originalCodeBlock } from '@uiw/react-md-editor/commands';
import { CodeOutlined, CodeSandboxOutlined } from '@ant-design/icons';

export const codeCN: ICommand = {
  ...originalCode,
  icon: <CodeOutlined />,
  buttonProps: {
    'aria-label': '插入行内代码',
    title: '插入行内代码 (Ctrl+J)',
  },
};

export const codeBlockCN: ICommand = {
  ...originalCodeBlock,
  icon: <CodeSandboxOutlined />,
  buttonProps: {
    'aria-label': '插入代码块',
    title: '插入代码块 (Ctrl+Shift+J)',
  },
};
```

---

## 十二、评审总结

`code.tsx` 作为 `@uiw/react-md-editor` 的代码命令实现，从 UI 专家视角审视，存在以下核心问题：

1. **最影响视觉一致性的问题**: 图标设计（UI-P1-01/02）——两个代码按钮的图标尺寸不一致（13×13 vs 14×14）、风格不统一（Font Awesome vs 自定义），与 Carbon Design System 的 16px IBM Icons 规范存在显著差距
2. **最影响用户体验的问题**: 缺少操作反馈（UI-P2-01/02）——代码插入/移除操作无视觉确认，多行降级行为无提示，用户可能不确定操作是否成功
3. **最影响可访问性的问题**: 国际化缺失（UI-P1-04）——aria-label 和 title 硬编码英文，SVG 缺少 `<title>`，操作无 ARIA 状态反馈
4. **最影响兼容性的问题**: 键盘快捷键 `Ctrl+J` 与浏览器冲突（UI-P1-03）——在 Chrome/Firefox 中可能同时打开下载历史面板

**正面评价**:
- Toggle 包裹/解包裹交互设计合理，提供可逆操作
- 多行自动降级策略符合 Markdown 语义
- 上下文换行感知逻辑完善，确保源码排版整洁
- `buttonProps` 提供了 aria-label 和 title 的基础无障碍支持
- `fill="currentColor"` 遵循了图标最佳实践，支持主题色跟随

**综合评分 4.1/10** — 代码命令的核心交互逻辑设计良好，但在工具栏视觉呈现、无障碍支持、国际化、Carbon Design System 合规方面存在明显不足。由于这是第三方库的内部实现，建议本项目通过封装层覆盖 buttonProps（中文提示 + antd 图标）和 CSS 覆盖（按钮样式对齐 Carbon）来弥补这些差距。

---

*软件UI专家评审完成 — 2026-05-24*
