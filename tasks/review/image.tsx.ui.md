# 软件UI专家评审：@uiw/react-md-editor image.tsx

**文件**: `@uiw/react-md-editor/src/commands/image.tsx`
**评审角色**: 软件UI专家（用户界面设计 · 交互体验 · 设计系统合规 · 可访问性 · 工具栏命令设计 · 图标设计）
**评审日期**: 2026-05-25
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 图片插入命令基本可用，但快捷键严重违反行业惯例、图标不满足无障碍和触摸目标要求、URL检测逻辑粗放导致误判、交互流程缺乏用户引导、与 antd/Carbon 设计系统完全脱节）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | Markdown 编辑器工具栏"插入图片"命令定义 |
| 代码行数 | 58 行 |
| 导出接口 | 1 个（`image: ICommand`） |
| 图标类型 | 内联 SVG（Material Design 风格），13×13px |
| 快捷键 | `ctrlcmd+k`（Ctrl+K / Cmd+K） |
| 交互模式 | 纯文本操作：选中URL自动包裹 `![](url)`，未选中插入占位符 |
| 用户反馈 | 无 |
| URL验证 | `includes('http')` / `includes('www')` 粗放字符串匹配 |
| 可访问性 | 仅有 `aria-label`，无 SVG `aria-hidden`、无键盘焦点管理 |

**完整源码**:

```tsx
import React from 'react';
import { type ICommand, type ExecuteState, TextAreaTextApi } from './';
import { selectWord, executeCommand } from '../utils/markdownUtils';

export const image: ICommand = {
  name: 'image',
  keyCommand: 'image',
  shortcuts: 'ctrlcmd+k',
  prefix: '![image](',
  suffix: ')',
  buttonProps: { 'aria-label': 'Add image (ctrl + k)', title: 'Add image (ctrl + k)' },
  icon: (
    <svg width="13" height="13" viewBox="0 0 20 20">
      <path
        fill="currentColor"
        d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
      />
    </svg>
  ),
  execute: (state: ExecuteState, api: TextAreaTextApi) => {
    let newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: state.command.prefix!,
      suffix: state.command.suffix,
    });
    let state1 = api.setSelectionRange(newSelectionRange);
    if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
      executeCommand({
        api,
        selectedText: state1.selectedText,
        selection: state.selection,
        prefix: state.command.prefix!,
        suffix: state.command.suffix,
      });
    } else {
      newSelectionRange = selectWord({ text: state.text, selection: state.selection, prefix: '![', suffix: ']()' });
      state1 = api.setSelectionRange(newSelectionRange);
      if (state1.selectedText.length === 0) {
        executeCommand({
          api,
          selectedText: state1.selectedText,
          selection: state.selection,
          prefix: '![image',
          suffix: '](url)',
        });
      } else {
        executeCommand({
          api,
          selectedText: state1.selectedText,
          selection: state.selection,
          prefix: '![',
          suffix: ']()',
        });
      }
    }
  },
};
```

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 快捷键设计（Keyboard Shortcut Design） | 1 | Ctrl+K 是行业标准的"插入链接"快捷键，用于图片违反用户认知 |
| 图标设计（Icon Design） | 3 | 13×13px 过小，无 aria-hidden，不符合 Carbon 图标规范 |
| 交互流程设计（Interaction Flow Design） | 3 | 三路分支逻辑粗放，URL检测误判风险高，无用户引导 |
| 可访问性（Accessibility / a11y） | 3 | aria-label 存在但 SVG 缺少无障碍属性，无触摸目标保障 |
| DESIGN.md 视觉规范对齐 | 2 | 图标风格、按钮样式、颜色体系完全不符合 Carbon Design System |
| antd 集成度（Ant Design Integration） | 1 | 不使用 antd Button/Tooltip/Modal 组件，无设计系统 Token 对接 |
| 错误处理与用户反馈（Error Handling & Feedback） | 2 | 无操作反馈、无 URL 验证、无占位符引导、non-null 断言可崩溃 |
| 代码 UI 可维护性（Code UI Maintainability） | 3 | 魔法字符串散布、let 重赋值、prefix! 非空断言 |
| **综合评分** | **2.3 / 10** | |

---

## 三、UI 层面问题清单

### P1 — 严重问题（严重影响用户体验与行业规范合规）

#### UI-P1-01：快捷键 Ctrl+K 严重违反行业惯例 — 用户认知模型冲突

**位置**: 第 8 行

```typescript
shortcuts: 'ctrlcmd+k',
```

**UI 问题分析**:

这是本文件最严重的 UI/UX 设计缺陷。`Ctrl+K`（macOS `Cmd+K`）在全球主流编辑器中是 **"插入链接"** 的行业标准快捷键：

| 应用 | Ctrl+K 功能 |
|---|---|
| Microsoft Word | 插入超链接 |
| Google Docs | 插入链接 |
| Notion | 插入链接 |
| Typora | 插入链接 |
| VS Code | 打开文件（类链接导航） |
| GitHub Markdown | 插入链接 |
| Confluence | 插入链接 |
| Slack | 插入链接 |
| Gmail | 插入链接 |
| WordPress | 插入链接 |

**在本库中的冲突**: `@uiw/react-md-editor` 的 `link.tsx` 命令**也使用** `ctrlcmd+k` 快捷键。这意味着图片和链接命令绑定了**同一个快捷键**，导致：

1. 快捷键冲突 — 最后注册的命令会覆盖前者，用户按 Ctrl+K 的行为不可预测
2. 用户按 Ctrl+K 期望插入链接，却可能插入图片 — 违反 Nielsen 的"系统应匹配真实世界"可用性原则
3. 无法通过快捷键区分"我要插入图片"和"我要插入链接" — 功能模糊

**Carbon Design System 视角**: Carbon 的交互规范明确要求快捷键必须符合平台惯例。Ctrl+K 用于图片是 Carbon 规范的严重违反。

**建议修复**:

```typescript
// 图片插入使用行业更常见的快捷键
shortcuts: 'ctrlcmd+shift+k',  // 或 ctrlcmd+alt+i（参考 Notion 的 /image 命令思路）
```

---

#### UI-P1-02：SVG 图标缺少无障碍属性 — 屏幕阅读器播报垃圾内容

**位置**: 第 12-19 行

```tsx
icon: (
  <svg width="13" height="13" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
    />
  </svg>
),
```

**UI 问题分析**:

1. **缺少 `aria-hidden="true"`**: SVG 作为装饰性图标，如果没有 `aria-hidden="true"`，屏幕阅读器会尝试播报 SVG 内容（通常是一串无意义的路径数据或空内容）
2. **缺少 `focusable="false"`**: 在 IE/旧版 Edge 中，SVG 默认可获得焦点，导致 Tab 键导航时焦点停在图标上
3. **缺少 `role="img"`**: 如果 SVG 需要被辅助技术识别（非纯装饰场景），应指定 role
4. **`buttonProps` 已有 `aria-label`**: 外层按钮有 `aria-label="Add image (ctrl + k)"`，所以 SVG 应标记为装饰性（`aria-hidden`），否则辅助技术会重复播报

**WCAG 2.1 违规**:
- 1.1.1 Non-text Content：装饰性图像应有 `alt=""` 或 `aria-hidden="true"`
- 4.1.2 Name, Role, Value：SVG 缺少适当的 role 标注

**建议修复**:

```tsx
icon: (
  <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
    />
  </svg>
),
```

---

#### UI-P1-03：SVG 图标尺寸 13×13px 严重不足 — 触摸目标不达标

**位置**: 第 13 行

```tsx
<svg width="13" height="13" viewBox="0 0 20 20">
```

**UI 问题分析**:

1. **WCAG 2.5.5 Target Size（AAA级）**: 触摸目标最小应为 44×44px
2. **Carbon Design System**: 工具栏按钮的图标区域为 16×16px 或 20×20px，按钮整体最小 32×32px
3. **antd Button**: 最小高度 32px（`size="small"`），默认 36px（`size="middle"`），图标 14-16px
4. **13×13px 图标在 32px 按钮中过于微小** — 视觉重心偏移，用户难以辨认图标内容
5. **高 DPI 屏幕下 13px 图标模糊** — 在 2x/3x Retina 显示器上，13px 的 SVG 渲染为 26/39 物理像素，但 viewBox 为 20×20 意味着内容被缩放到 13px 容器内，细节丢失

**Carbon Design System 视角**: Carbon 的图标系统定义了 16px、20px、24px、32px 四种标准尺寸。13px 不在任何标准尺寸列表中。

**建议修复**:

```tsx
// 使用 Carbon 标准图标尺寸
<svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  {/* 使用 Carbon 的 Image 图标 path */}
</svg>
```

---

#### UI-P1-04：URL 检测逻辑 `includes('http')` 过于粗放 — 误判和漏判并存

**位置**: 第 28 行

```typescript
if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
```

**UI 问题分析**:

**误判场景**（应走"无URL"分支但走了"有URL"分支）:

| 用户选中文本 | `includes('http')` | 判定 | 实际 | 结果 |
|---|---|---|---|---|
| `See the http spec` | `true` | URL | 不是URL | ❌ 误判 |
| `Use https protocol` | `true`（含 `http` 子串） | URL | 不是URL | ❌ 误判 |
| `The httpd server` | `true` | URL | 不是URL | ❌ 误判 |
| `Visit www-stylesheet` | `true`（含 `www`） | URL | 不是URL | ❌ 误判 |
| `HTTP/2 is faster` | `true`（大小写不敏感？不，`includes` 是大小写敏感的，但 `HTTP` 不含 `http`） | — | — | — |

**漏判场景**（应走"有URL"分支但走了"无URL"分支）:

| 用户选中文本 | `includes('http')` / `includes('www')` | 判定 | 实际 | 结果 |
|---|---|---|---|---|
| `//example.com/image.png` | `false` | 非URL | 是URL | ❌ 漏判 |
| `ftp://images.example.com/a.png` | `false` | 非URL | 是URL | ❌ 漏判 |
| `/static/images/photo.jpg` | `false` | 非URL | 是相对URL | ❌ 漏判 |
| `data:image/png;base64,...` | `false` | 非URL | 是Data URI | ❌ 漏判 |
| `HTTP://EXAMPLE.COM/IMG.PNG` | `false`（大小写敏感） | 非URL | 是URL | ❌ 漏判 |

**用户体验影响**:
1. 误判：用户选择含 `http` 文字的段落，整个段落被当作 URL 包裹在 `![image](...)` 中，破坏文档结构
2. 漏判：用户选择合法的图片 URL（相对路径、Data URI），走占位符分支，用户需手动替换 `(url)` — 操作路径变长

**建议修复**:

```typescript
// 使用正则表达式进行基本的 URL 检测
const URL_PATTERN = /^(https?:\/\/|\/\/|www\.)/i;
const isUrlLike = URL_PATTERN.test(state1.selectedText.trim());
```

---

### P2 — 中等问题（影响设计系统合规与交互质量）

#### UI-P2-01：`prefix!` 非空断言 — 运行时 TypeError 崩溃风险

**位置**: 第 24 行、第 31 行

```typescript
prefix: state.command.prefix!,  // TypeScript non-null assertion
```

**UI 问题分析**:

1. `ICommand` 接口中 `prefix` 类型可能是 `string | undefined`
2. `!` 非空断言仅在编译时消除类型错误，运行时 `prefix` 为 `undefined` 时，`selectWord` 函数将收到 `undefined` 作为 `prefix`
3. 如果 `selectWord` 内部使用 `prefix.length` 或字符串拼接，将抛出 `TypeError: Cannot read properties of undefined`
4. **用户影响**: 工具栏点击图片按钮 → 编辑器无响应或崩溃 → 无任何错误反馈

**Carbon Design System 视角**: Carbon 组件在 prop 缺失时提供合理的默认值，不会因 prop 为空而崩溃。

**建议修复**:

```typescript
prefix: state.command.prefix ?? '![image](',
suffix: state.command.suffix ?? ')',
```

---

#### UI-P2-02：无操作反馈 — 用户无法确认图片命令是否执行成功

**位置**: `execute` 函数整体

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  // ... 三路分支执行
  // 无任何反馈
},
```

**UI 问题分析**:

1. **执行成功无反馈**: 命令执行后，光标可能跳转到不同位置，用户不知道发生了什么
2. **分支行为不一致**:
   - URL分支：选中的URL被包裹为 `![image](url)`
   - 无选中分支：插入 `![image](url)` 占位符
   - 有选中分支：选中文本被包裹为 `![text]()`
3. 用户不知道应该先选中URL还是先选中alt文本 — 交互流程不直观

**Carbon Design System 视角**: Carbon 的交互规范要求每个操作都有明确的反馈。即使是工具栏按钮操作，也应通过视觉变化（如按钮状态切换、光标位置提示）让用户确认操作已执行。

**antd 集成建议**: 使用 antd `message.info()` 提供操作反馈：

```typescript
import { message } from 'antd';

// 插入后
message.info('已插入图片语法，请替换 URL 地址');
```

---

#### UI-P2-03：占位符 `(url)` 无视觉引导 — 用户可能忽略

**位置**: 第 44-47 行

```typescript
executeCommand({
  api,
  selectedText: state1.selectedText,
  selection: state.selection,
  prefix: '![image',
  suffix: '](url)',
});
```

**UI 问题分析**:

1. 插入 `![image](url)` 后，光标位置在 `url` 文本的末尾而非内部
2. `url` 是纯文本占位符，没有视觉区分（如灰色斜体、下划线提示）
3. 用户可能不知道需要替换 `url` 为实际图片地址，直接发布导致图片显示为损坏图标
4. 没有自动选中 `url` 占位符文本，用户需手动选择再替换

**更好的交互设计**:

```typescript
// 插入后自动选中 "url" 占位符，引导用户替换
executeCommand({
  api,
  selectedText: state1.selectedText,
  selection: state.selection,
  prefix: '![image',
  suffix: '](url)',
});
// 插入后，选中 "url" 文本
api.setSelectionRange({ start: cursorAfterPrefix, end: cursorBeforeSuffix });
```

---

#### UI-P2-04：SVG 图标风格不符合 Carbon Design System 图标规范

**位置**: 第 12-19 行

```tsx
<svg width="13" height="13" viewBox="0 0 20 20">
  <path
    fill="currentColor"
    d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
  />
</svg>
```

**UI 问题分析**:

此图标是 Material Design 风格的填充图标（filled icon），与 Carbon Design System 的图标规范有以下冲突：

| 属性 | Carbon 图标规范 | 当前实现 | 合规 |
|---|---|---|---|
| 风格 | 线性轮廓（outline） | 填充（filled） | ❌ |
| 网格 | 24×24 或 16×16 | 20×20 | ❌ |
| 描边宽度 | 1px | 0px（填充路径） | ❌ |
| 尺寸标准 | 16/20/24/32px | 13px | ❌ |
| 圆角 | 0px（直角） | 路径含圆角 | ❌ |
| 颜色继承 | `fill="currentColor"` | `fill="currentColor"` | ✅ |

**Carbon 的 Image 图标**: Carbon 的 `@carbon/icons-react` 提供的 `Image` 图标是 24×24 的线性轮廓图标，风格与此填充图标完全不同。

**建议修复**:

```tsx
// 使用 Carbon 风格的图标（简化示例）
import { Image } from '@carbon/icons-react';

// 或自定义与 Carbon 风格一致的 SVG
icon: <Image size={16} aria-hidden="true" />,
```

---

#### UI-P2-05：`buttonProps` 使用 HTML `title` 属性替代 Tooltip — 不符合 antd 规范

**位置**: 第 11 行

```typescript
buttonProps: { 'aria-label': 'Add image (ctrl + k)', title: 'Add image (ctrl + k)' },
```

**UI 问题分析**:

1. **HTML `title` 属性的缺陷**:
   - 延迟显示（通常 1-2 秒后出现）— 用户反馈不及时
   - 无法自定义样式 — 与 Carbon Design System 的视觉规范不符
   - 无法控制位置 — 可能遮挡其他 UI 元素
   - 在触摸设备上不可用 — 移动端用户看不到提示
   - 在键盘导航时不会显示

2. **antd `Tooltip` 的优势**:
   - 即时显示（可通过 `mouseEnterDelay` 控制）
   - 自定义样式（可通过 `overlayStyle` / `overlayClassName` 对齐 Carbon）
   - 控制位置（`placement` 属性）
   - 触摸设备友好
   - 支持 `arrow` 和 `color` 主题 Token

**建议修复**: 在本项目的封装层使用 antd `Tooltip`:

```tsx
import { Tooltip } from 'antd';

<Tooltip title="插入图片 (Ctrl+Shift+K)" placement="bottom">
  <Button icon={<ImageIcon />} onClick={handleImageInsert} />
</Tooltip>
```

---

### P3 — 轻微问题（UI 品质与交互细节）

#### UI-P3-01：三路分支中 `let` 变量重赋值 — 降低代码可读性

**位置**: 第 21-56 行

```typescript
let newSelectionRange = selectWord({...});
let state1 = api.setSelectionRange(newSelectionRange);
// ... 条件分支
newSelectionRange = selectWord({...});  // 重赋值
state1 = api.setSelectionRange(newSelectionRange);  // 重赋值
```

**UI 问题分析**:

1. `newSelectionRange` 和 `state1` 在 `if/else` 分支中被重赋值，增加了理解成本
2. 读者需要追踪变量在两个分支中的不同状态
3. 更清晰的做法是使用 `const` 和不同的变量名

**建议修复**:

```typescript
const initialRange = selectWord({...});
const initialState = api.setSelectionRange(initialRange);
if (initialState.selectedText.includes('http') || initialState.selectedText.includes('www')) {
  // URL 分支
} else {
  const altRange = selectWord({...});
  const altState = api.setSelectionRange(altRange);
  // alt 分支
}
```

---

#### UI-P3-02：魔法字符串散布 — `"http"`, `"www"`, `"![image"`, `"]"` 等

**位置**: 第 28、37、44、52 行

```typescript
state1.selectedText.includes('http')      // 魔法字符串
state1.selectedText.includes('www')       // 魔法字符串
prefix: '![image',                        // 魔法字符串
suffix: '](url)',                         // 魔法字符串
prefix: '!['                              // 魔法字符串
```

**UI 问题分析**:

1. Markdown 图片语法 `![alt](url)` 的各部分分散在代码中，无法集中管理
2. 如果未来需要支持不同的 Markdown 方言（如 `{{< img src="..." >}}`），需要修改多处
3. `"url"` 占位符硬编码为英文，不支持国际化

**建议修复**:

```typescript
const IMAGE_PREFIX = '![';
const IMAGE_SUFFIX = ']';
const DEFAULT_ALT = 'image';
const DEFAULT_URL = 'url';
const URL_INDICATORS = ['http://', 'https://', '//', 'www.'];
```

---

#### UI-P3-03：无图片上传集成入口 — 用户体验割裂

**位置**: `execute` 函数整体

**UI 问题分析**:

1. 当前实现仅支持 URL 方式插入图片 — 用户必须先上传图片到外部服务获取 URL
2. 本项目已有文件上传功能（`dev018.文件上传.md`），但图片命令无法调用
3. 现代编辑器（Notion、飞书、语雀）都支持直接粘贴/拖拽上传图片
4. 对于企业用户，先上传再获取URL的操作路径过长

**对本项目的影响**: 本项目的文章编辑场景中，用户插入图片需要：
   - 步骤1：打开文件上传页面上传图片
   - 步骤2：复制图片 URL
   - 步骤3：在编辑器中点击图片按钮
   - 步骤4：粘贴 URL

   理想的交互流程应为：
   - 步骤1：点击图片按钮或直接粘贴
   - 步骤2：选择上传或输入 URL（弹窗/抽屉选择）
   - 步骤3：图片自动插入

**建议**: 在本项目的编辑器封装层，覆盖默认的 `image` 命令，集成 antd `Modal` 弹窗提供"上传图片/输入URL"双模式。

---

#### UI-P3-04：`aria-label` 文案使用英文且快捷键格式不一致

**位置**: 第 11 行

```typescript
buttonProps: { 'aria-label': 'Add image (ctrl + k)', title: 'Add image (ctrl + k)' },
```

**UI 问题分析**:

1. **英文文案**: 对于本项目的中文用户群体，`"Add image"` 不如 `"插入图片"` 直观
2. **快捷键格式**: `(ctrl + k)` 使用了空格，而 Carbon 和 antd 的快捷键显示通常为 `(Ctrl+K)` 或 `(⌘K)`
3. **快捷键平台适配**: `ctrl + k` 在 macOS 上应为 `⌘K`，在 Windows 上应为 `Ctrl+K`，但此处硬编码
4. **缺少快捷键提示的视觉样式**: 与其他工具栏按钮的 tooltip 格式应统一

**建议修复**:

```typescript
buttonProps: {
  'aria-label': `插入图片 (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+K)`,
  title: `插入图片 (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+K)`,
},
```

---

## 四、DESIGN.md 合规性映射分析

| DESIGN.md 规范 | image.tsx 当前实现 | 合规 | 说明 |
|---|---|---|---|
| `colors.primary` #0f62fe（主色调） | ⚠️ `fill="currentColor"` | 🟡 | 图标颜色依赖父元素，工具栏按钮可能使用默认色 |
| `rounded.none` 0px（按钮圆角） | ❌ 未指定 | 🔴 | 工具栏按钮的圆角由外部 CSS 控制，但库默认可能非0px |
| `typography.button` 14px/400 | ❌ 无文本 | — | 图标按钮无文字排版 |
| IBM Plex Sans 字体 | ❌ 不涉及 | — | SVG 图标不使用字体 |
| `spacing` 4px 基准网格 | ❌ 13px 图标 | 🔴 | 13px 不在 4px 网格系统中（12/16/20 才是标准值） |
| 按钮无阴影 | ⚠️ 取决于外部CSS | 🟡 | 无阴影控制 |
| 触摸目标 ≥ 32px（Carbon）/ ≥ 44px（WCAG） | ❌ 13px 图标 | 🔴 | 远小于最低标准 |
| `button-ghost` 透明底+蓝色文字 | ❌ 取决于外部CSS | 🟡 | 工具栏按钮样式未定义 |

**综合评估**: image.tsx 的 UI 元素（图标、按钮样式）几乎不与 Carbon Design System 对齐。图标尺寸（13px）不在 Carbon 的标准尺寸列表中，SVG 风格（填充而非轮廓）与 Carbon 图标规范对立。按钮的视觉表现完全依赖外部 CSS，命令定义本身没有提供任何设计系统 Token 的接口。

---

## 五、与 antd 集成兼容性分析

| antd 交互模式 | image.tsx 兼容性 | 说明 |
|---|---|---|
| `Button` 组件 | ❌ 不使用 | 工具栏按钮由 MDEditor 内部渲染 |
| `Tooltip` 提示 | ❌ 不使用 | 使用 HTML `title` 属性 |
| `Modal` 弹窗 | ❌ 不使用 | 插入图片无弹窗交互 |
| `Upload` 上传组件 | ❌ 不使用 | 不支持图片上传 |
| `Input` 输入框 | ❌ 不使用 | 无 URL 输入界面 |
| `message` 反馈 | ❌ 不使用 | 插入操作无反馈 |
| `ConfigProvider` 主题 | ❌ 不兼容 | 命令定义不接受外部 Token |
| 国际化 (i18n) | ❌ 不支持 | `aria-label`、占位符均为英文硬编码 |

---

## 六、交互流程分析

### 当前交互流程（三路分支）

```
用户点击"图片"按钮 或 按 Ctrl+K
    │
    ▼
┌───────────────────────────────────────────────┐
│ 1. selectWord(prefix: "![image](", suffix: ")")│
│    → 根据光标位置选择"词语"范围                    │
└───────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ 选中文本包含 "http" 或 "www"? │
└─────────────────────────────┘
    │ 是                          │ 否
    ▼                             ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│ 包裹为 ![image](url)  │  │ 重新 selectWord               │
│ 光标在末尾            │  │ (prefix: "![", suffix: "]()") │
└──────────────────────┘  └──────────────────────────────┘
                                │
                                ▼
                          ┌───────────────────┐
                          │ 选中文本为空?       │
                          └───────────────────┘
                            │ 是              │ 否
                            ▼                 ▼
                    ┌───────────────┐  ┌──────────────────┐
                    │ 插入           │  │ 包裹为            │
                    │ ![image](url)  │  │ ![选中文本]()      │
                    └───────────────┘  └──────────────────┘
```

**交互流程问题**:

1. **步骤1的 `selectWord` 使用 `![image](` 作为 prefix** — 这意味着它在查找"被 `![image](` 和 `)` 包围的词语"。但用户在点击按钮之前不太可能已经在文本中写了 `![image](` 前缀，所以第一次 `selectWord` 的结果几乎总是"未找到匹配"。
2. **步骤1的结果仅用于 URL 检测** — `state1.selectedText` 实际上是光标位置的"当前词"，然后检测它是否像 URL
3. **两次 `selectWord` 调用的 prefix 不同** — 第一次用 `![image](`，第二次用 `![`，这增加了理解成本
4. **无用户引导** — 新用户不知道应该先选中 URL 还是直接点击按钮

---

## 七、改进建议汇总

| 优先级 | 编号 | 建议 | 工作量 | UI 收益 |
|---|---|---|---|---|
| P1 | UI-P1-01 | 将快捷键改为 `ctrlcmd+shift+k` 或其他非冲突组合 | 小 | 消除用户认知冲突 |
| P1 | UI-P1-02 | SVG 添加 `aria-hidden="true"` 和 `focusable="false"` | 小 | WCAG 1.1.1 合规 |
| P1 | UI-P1-03 | 图标尺寸改为 16×16px 或 20×20px | 小 | Carbon 尺寸标准对齐 |
| P1 | UI-P1-04 | URL 检测改为正则表达式 `^(https?:\/\/\|\/\/\|www\.)/i` | 小 | 减少误判/漏判 |
| P2 | UI-P2-01 | `prefix!` 改为 `prefix ?? '![image]('` 提供默认值 | 小 | 消除运行时崩溃 |
| P2 | UI-P2-02 | 添加操作反馈（antd message 或视觉提示） | 中 | 操作可确认性 |
| P2 | UI-P2-03 | 插入后自动选中占位符 `url` 文本 | 小 | 引导用户替换 |
| P2 | UI-P2-04 | 替换为 Carbon 风格的线性轮廓图标 | 中 | 设计系统视觉一致性 |
| P2 | UI-P2-05 | `buttonProps` 的 `title` 改为 antd `Tooltip` | 中 | antd 交互一致性 |
| P3 | UI-P3-01 | 使用 `const` 代替 `let` 重赋值 | 小 | 代码可读性 |
| P3 | UI-P3-02 | 提取魔法字符串为常量 | 小 | 可维护性 |
| P3 | UI-P3-03 | 集成图片上传功能（弹窗双模式） | 大 | 完整图片插入体验 |
| P3 | UI-P3-04 | `aria-label` 和占位符支持中文、快捷键格式统一 | 小 | 本地化 |

---

## 八、对本项目的集成建议

由于 `image.tsx` 是第三方库（`@uiw/react-md-editor`）的内部命令，我们无法直接修改。建议本项目采取以下策略：

### 8.1 覆盖默认 image 命令 — 自定义快捷键 + antd Modal

```tsx
import MDEditor from '@uiw/react-md-editor';
import { Modal, Input, Upload, Tabs, message } from 'antd';
import { UploadOutlined, LinkOutlined } from '@ant-design/icons';
import type { ICommand } from '@uiw/react-md-editor';

const customImageCommand: ICommand = {
  name: 'image',
  keyCommand: 'image',
  shortcuts: 'ctrlcmd+shift+k', // 修复快捷键冲突
  buttonProps: {
    'aria-label': '插入图片',
    title: '插入图片 (Ctrl+Shift+K)',
  },
  icon: (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M28 4H4a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 22H4V6h24Z"
      />
    </svg>
  ),
  execute: (state, api) => {
    // 弹窗让用户选择 URL 输入或文件上传
    showImageDialog(state, api);
  },
};

function showImageDialog(state: any, api: any) {
  let imageUrl = '';
  let altText = '';

  Modal.confirm({
    title: '插入图片',
    icon: null,
    content: (
      <Tabs
        items={[
          {
            key: 'url',
            label: '图片链接',
            icon: <LinkOutlined />,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input
                  placeholder="输入图片 URL"
                  onChange={(e) => { imageUrl = e.target.value; }}
                />
                <Input
                  placeholder="图片描述 (alt 文本)"
                  onChange={(e) => { altText = e.target.value; }}
                />
              </div>
            ),
          },
          {
            key: 'upload',
            label: '上传图片',
            icon: <UploadOutlined />,
            children: (
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={async (options) => {
                  // 调用本项目的上传 API
                  const url = await uploadImage(options.file);
                  imageUrl = url;
                  message.success('图片上传成功');
                }}
              >
                <button style={{ border: '1px dashed #d9d9d9', padding: '20px', width: '100%' }}>
                  点击或拖拽上传图片
                </button>
              </Upload>
            ),
          },
        ]}
      />
    ),
    okText: '插入',
    cancelText: '取消',
    onOk: () => {
      if (!imageUrl) {
        message.warning('请输入图片地址或上传图片');
        return Promise.reject();
      }
      const md = `![${altText || 'image'}](${imageUrl})`;
      // 使用 api 插入 Markdown
      api.replaceSelection(md);
      message.success('图片已插入');
    },
  });
}
```

### 8.2 CSS 覆盖 — 对齐 Carbon Design System 工具栏样式

```css
/* global.css — MDEditor 工具栏图片按钮对齐 Carbon */

/* 工具栏按钮基础样式 */
.w-md-editor-toolbar button {
  border-radius: 0; /* Carbon: rounded.none */
  min-width: 32px;  /* Carbon 最小触摸目标 */
  min-height: 32px;
  color: var(--color-ink-muted, #525252);
}

.w-md-editor-toolbar button:hover {
  background-color: var(--color-surface-1, #f4f4f4);
  color: var(--color-primary, #0f62fe);
}

.w-md-editor-toolbar button[aria-label*="image"] svg {
  width: 16px;
  height: 16px;
}
```

---

## 九、评审总结

`image.tsx` 作为 `@uiw/react-md-editor` 的图片插入命令，从 UI 专家视角审视，暴露了以下核心问题：

1. **最严重的 UI 缺陷**: 快捷键 Ctrl+K 与行业标准"插入链接"冲突（UI-P1-01）— 违反 Nielsen 可用性原则"系统应匹配真实世界"，且与同库的 `link.tsx` 命令绑定相同快捷键导致不可预测行为

2. **最影响可访问性的问题**: SVG 图标缺少 `aria-hidden` 和 `focusable` 属性（UI-P1-02）+ 图标仅 13×13px 远低于触摸目标标准（UI-P1-03）— 违反 WCAG 1.1.1 和 2.5.5

3. **最影响用户信任的问题**: URL 检测 `includes('http')` 过于粗放（UI-P1-04）— 误判（含 "http" 的普通文字被当作 URL）和漏判（相对路径、Data URI 无法识别）并存，导致交互结果与用户预期不符

4. **最影响项目集成的问题**: 完全不使用 antd 组件（UI-P2-05）+ 无图片上传集成（UI-P3-03）— 与项目的 antd 技术栈和已有的文件上传功能完全脱节

**综合评分 2.3/10** — 图片命令实现了最基本的文本包裹功能，但从 UI/UX 角度审视，在快捷键设计（行业惯例违反）、图标规范（Carbon 不合规）、交互流程（三路分支粗放）、可访问性（SVG 无障碍缺失）、设计系统集成（完全脱节）等维度均存在显著缺陷。建议在本项目的编辑器封装层完全覆盖默认的 `image` 命令，使用 antd Modal 提供"URL 输入/图片上传"双模式交互，配合 Carbon 风格图标和正确的快捷键绑定。

---

*软件UI专家评审完成 — 2026-05-25*
