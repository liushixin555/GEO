# 软件UI专家评审：pages/App.tsx

**评审日期**: 2026-05-24
**评审角色**: 软件UI专家（用户界面设计、交互体验、设计系统合规、可访问性、响应式设计、视觉一致性视角）
**评审范围**: 前端路由入口文件 `pages/App.tsx`（16行）及 UI 依赖链：`main.tsx` → `App.tsx` → `Layout.tsx` → `Sidebar.tsx` → `login/index.tsx` → `global.css`
**关联文件**: `DESIGN.md`, `pages/main.tsx`, `pages/components/Layout.tsx`, `pages/components/Sidebar.tsx`, `pages/login/index.tsx`, `pages/styles/global.css`

---

## 1. 总体评级：5.5/10（基本可用，UI/UX 存在系统性缺陷）

`App.tsx` 本身仅 16 行路由定义，代码层面简洁。但从 UI 专家视角审视其引发的整条渲染链路（路由 → 布局 → 侧边栏 → 内容区），暴露了设计系统合规、组件语义使用、可访问性、交互反馈等多个维度的系统性不足。应用具备基本的功能性和视觉基调，但距离 Carbon Design System 的专业水准尚有明显差距。

| 评价维度 | 评分 | 状态 |
|----------|------|------|
| 设计系统合规（Design System Compliance） | 7/10 | 色彩/字体/圆角基本合规，间距和组件细节有偏差 |
| antd 组件使用（Ant Design Usage） | 5/10 | 多处组件语义误用、prop 错误、缺失关键属性 |
| 导航与路由体验（Navigation & Routing UX） | 5/10 | 无路由过渡动画、死路由、无 404 反馈 |
| 可访问性（Accessibility / a11y） | 3/10 | 无 skip-to-content、无 ARIA、触摸目标不足 |
| 响应式设计（Responsive Design） | 6/10 | 移动端基本可用，缺少平板断点、间距问题 |
| 视觉一致性（Visual Consistency） | 6/10 | 页面标题模式不统一、加载状态不一致 |
| 用户流程体验（User Flow Experience） | 5/10 | 登录闪烁、无空状态设计、无操作反馈 |
| 布局架构（Layout Architecture） | 6/10 | 侧边栏+内容区结构合理，但缺少页面过渡和反馈层 |

---

## 2. DESIGN.md 合规性逐项审计

### 2.1 色彩系统合规 — 评分 8/10

| DESIGN.md 规范 | 实际实现 | 合规 |
|---------------|---------|------|
| `colors.primary` #0f62fe | `main.tsx:17` colorPrimary + `global.css:8` --color-primary | ✅ |
| `colors.canvas` #ffffff | `main.tsx:21` colorBgContainer + `global.css:13` --color-canvas | ✅ |
| `colors.surface-1` #f4f4f4 | `main.tsx:22` colorBgLayout + `global.css:14` --color-surface-1 | ✅ |
| `colors.ink` #161616 | `main.tsx:24` colorText + `global.css:23` --color-ink | ✅ |
| `colors.ink-muted` #525252 | `main.tsx:25` colorTextSecondary + `global.css:24` --color-ink-muted | ✅ |
| `colors.hairline` #e0e0e0 | `main.tsx:23` colorBorder + `global.css:16` --color-hairline | ✅ |
| `colors.semantic-error` #da1e28 | `main.tsx:27` colorError | ✅ |
| `colors.semantic-success` #24a148 | `main.tsx:28` colorSuccess | ✅ |
| `colors.semantic-warning` #f1c21b | `main.tsx:29` colorWarning | ✅ |

**问题**:

UI-01: `colorTextQuaternary` 使用 #8c8c8c（ink-subtle），但 antd 的 Quaternary 层级通常用于 placeholder 等最弱文本，与 DESIGN.md 中 ink-subtle 的用途（helper text, captions）语义不完全匹配。建议明确 antd token 层级与 Carbon 色彩的映射关系。

---

### 2.2 字体排版合规 — 评分 7/10

| DESIGN.md 规范 | 实际实现 | 合规 |
|---------------|---------|------|
| IBM Plex Sans 主字体 | `main.tsx:19` fontFamily + `global.css:29` --font-family | ✅ |
| font-weight 300 (display) | `main.tsx:6` import 300.css | ✅ |
| font-weight 400 (body) | `main.tsx:7` import 400.css | ✅ |
| font-weight 600 (emphasis) | `main.tsx:8` import 600.css | ✅ |
| letter-spacing: 0.16px (body) | `global.css:67` body + `global.css:110` .ant-typography | ✅ |
| border-radius: 0 (所有组件) | `main.tsx:18` borderRadius: 0 + 全局覆盖 | ✅ |

**问题**:

UI-02: **display 级别 weight-300 未在页面中使用**。DESIGN.md 明确强调"Light-weight display is the brand voice"，300 weight 是 IBM 的品牌签名。当前所有页面标题使用 Typography.Text strong（weight 600）或 400，从未使用 300 weight 的 display 效果。这使应用失去了 Carbon 的视觉辨识度。

UI-03: **sidebar-brand 字重 600 与 Carbon 精神冲突**。`global.css:221` `.sidebar-brand { font-weight: 600 }`，而 Carbon 的 top-nav 使用 body-sm 14px weight 400 的低调处理。侧边栏品牌文字在 16px 尺寸上使用 600 weight 显得过重。

---

### 2.3 间距系统合规 — 评分 6/10

| DESIGN.md 规范 | 实际实现 | 合规 |
|---------------|---------|------|
| 基本单位 4px | CSS 变量定义正确 | ✅ |
| feature-card padding: 24px | antd Card body 默认 padding 24px | ✅ |
| button padding: 12px 16px | `main.tsx:35` paddingInline: 16, controlHeight: 40 (≈ 12px vertical) | ✅ |

**严重问题**:

UI-04: **page-container padding 仅 6px，严重违反 4px 网格系统**。

```css
/* global.css:159 */
.page-container {
  padding: 6px;   /* ❌ 6px 不是 4px 网格的合法值（4px grid: 0,4,8,12,16,20,24...） */
}
```

DESIGN.md 严格基于 4px 网格："Carbon uses precise alignment to a 4-pixel grid as its whitespace system"。6px 是一个不属于该系统的值。应使用 8px（xs）或 12px（sm）。这导致页面内容与边框之间的间距在视觉上显得局促且不专业。

UI-05: **sidebar-mobile-unfold 触摸目标 24x24px，远低于 Carbon 规范的 48px**。

```css
/* global.css:285-289 */
.sidebar-mobile-unfold {
  width: 24px;   /* ❌ Carbon spec: 48px minimum tap target */
  height: 24px;
}
```

DESIGN.md 明确规定："Carbon spec: 48px minimum tap target. Buttons and inputs hold 48px on touch viewports." 24x24px 的触摸目标在移动设备上极难精确点击。

---

### 2.4 组件规范合规 — 评分 6/10

| DESIGN.md 组件 | antd 配置 | 合规 |
|---------------|----------|------|
| button-primary (蓝底白字，0圆角) | Button borderRadius:0, controlHeight:40 | ✅ |
| text-input (surface-1底色，0圆角) | Input borderRadius:0, colorBgContainer:'#f4f4f4' | ✅ |
| feature-card (白底，0圆角，1px hairline) | Card borderRadius:0 + 全局覆盖 | ✅ |
| Menu (0圆角，3px left accent) | Menu borderRadius:0, activeBarBorderWidth:3 | ✅ |

**问题**:

UI-06: **antd Button controlHeight 40px vs DESIGN.md button padding 12px+16px**。DESIGN.md 指定按钮垂直 padding 12px，在 14px font-size + 1.29 line-height 下，按钮高度应为 14*1.29 + 24 ≈ 42px，接近 40px。可接受但存在细微偏差。

UI-07: **全局 CSS 大量使用 `!important`**。`global.css:106` 的 Ant Design 覆盖区集中了 16 个 `!important` 声明。虽然 ConfigProvider 已设置了 borderRadius:0，全局覆盖仍然存在，表明主题配置可能未完全生效或存在优先级竞争。

---

## 3. antd 组件使用评审

### UI-08: Breadcrumb 组件语义误用 — 页面标题应使用 Typography.Title

**严重度**: 🔴 HIGH
**位置**: `login/index.tsx:46`, `Layout.tsx:33-35`

```tsx
// login/index.tsx:46 — 面包屑用作页面标题
<div className="page-breadcrumb"><Breadcrumb items={[{ title: '薄云商机倍增服务' }]} /></div>

// Layout.tsx:33-35 — PlaceholderPage 同样误用
<div className="page-breadcrumb">
  <Breadcrumb items={[{ title }]} />
</div>
```

**问题分析**:
1. **语义错误**: Breadcrumb（面包屑）用于表达页面层级路径（如 "首页 > 文章管理 > 编辑"），不是页面标题。只有一项的面包屑不是面包屑，而是伪装的标题。
2. **可访问性问题**: 屏幕阅读器会将面包屑识别为导航路径，而非页面标题，影响语义理解。
3. **视觉不正确**: CSS 强制面包屑为 20px font-size（`global.css:172`），这不属于 DESIGN.md 的任何排版层级——20px 对应 `{typography.subhead}` 但 weight 应为 400，而面包屑的默认样式与此不一致。
4. **Carbon 规范**: 页面标题应使用 `{typography.card-title}` 24px weight 400 或 `{typography.headline}` 32px weight 400。

**修复方案**:

```tsx
// 使用 antd Typography.Title 替代 Breadcrumb
<Typography.Title level={4} style={{ marginBottom: 24, fontWeight: 400 }}>
  薄云商机倍增服务
</Typography.Title>
```

---

### UI-09: Alert 组件 prop 错误 — message 属性缺失

**严重度**: 🟠 HIGH
**位置**: `login/index.tsx:47`

```tsx
// login/index.tsx:47 — title 不是 Alert 的标准 prop
{error && <Alert type="error" title={error} className="form-alert" showIcon />}
```

**问题分析**:
- antd Alert 组件的标准 props 是 `message`（标题）和 `description`（描述），没有 `title` prop
- `title` 会被 React 当作未知 DOM 属性传递给底层 div，可能被浏览器忽略
- 实际上错误信息可能根本不会显示，或者以非预期的方式显示
- 正确用法：`<Alert type="error" message={error} />`

**修复方案**:

```tsx
{error && <Alert type="error" message={error} className="form-alert" showIcon closable />}
```

---

### UI-10: Space 组件 prop 名称错误 — orientation 应为 direction

**严重度**: 🟠 MEDIUM
**位置**: `Sidebar.tsx:107`

```tsx
// Sidebar.tsx:107 — antd Space 使用 direction，不是 orientation
<Space orientation="vertical" size={4} className="sidebar-footer-full-width">
```

**问题分析**:
- antd Space 组件的 prop 是 `direction`（"vertical" | "horizontal"），不是 `orientation`
- `orientation` 是 React ARIA 的属性，不是 antd 的 API
- 这可能导致 Space 组件的垂直布局不生效，子元素水平排列而非垂直排列

**修复方案**:

```tsx
<Space direction="vertical" size={4} className="sidebar-footer-full-width">
```

---

### UI-11: 登录页面未使用 antd Card 组件包裹

**严重度**: 🟡 MEDIUM
**位置**: `login/index.tsx:44-59`

```tsx
// login/index.tsx:44-59 — 使用 div + CSS 模拟卡片
<div className="login-card">
  {/* ... */}
</div>
```

**问题分析**:
- CLAUDE.md 铁律明确要求"前端必须使用 Ant Design (antd) 组件"
- `.login-card` 通过 CSS 手动实现了卡片效果（border, background, padding），而非使用 antd Card
- 使用 `div` 替代 antd `Card` 违反了项目规范
- 同时缺少 antd `Row`/`Col` 的居中布局，使用手动 flexbox

**修复方案**:

```tsx
<div className="login-page">
  <Card className="login-card" bordered>
    <Typography.Title level={3} style={{ fontWeight: 400, textAlign: 'center', marginBottom: 24 }}>
      薄云商机倍增服务
    </Typography.Title>
    {error && <Alert type="error" message={error} className="form-alert" showIcon />}
    <Form onFinish={handleSubmit} layout="vertical">
      {/* ... */}
    </Form>
  </Card>
</div>
```

---

## 4. 可访问性（a11y）评审

### UI-12: 无 skip-to-content 跳转链接

**严重度**: 🔴 HIGH
**位置**: `Layout.tsx:138-199`

**问题分析**:
- WCAG 2.1 Level A 标准（2.4.1 Bypass Blocks）要求提供跳过重复导航的方式
- 当前布局中，侧边栏（含 10 个菜单项）在每次页面导航时都会被屏幕阅读器读取
- 键盘用户需要按 10+ 次 Tab 才能到达主内容区
- Carbon Design System 的 top-nav 规范明确包含 skip-to-content

**修复方案**:

```tsx
// Layout.tsx — Content 顶部添加 skip-to-content
<Content className="main-content">
  <a href="#main-content" className="skip-to-content">跳到主要内容</a>
  <div id="main-content">
    <Routes>{/* ... */}</Routes>
  </div>
</Content>

/* global.css */
.skip-to-content {
  position: absolute;
  left: -9999px;
  &:focus {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 1000;
    padding: 8px 16px;
    background: var(--color-primary);
    color: var(--color-on-primary);
  }
}
```

---

### UI-13: 交互元素缺少 ARIA 标签

**严重度**: 🟠 MEDIUM
**位置**: 多处

| 组件 | 位置 | 缺失的 ARIA | 影响 |
|------|------|------------|------|
| sidebar-toggle-btn | `Sidebar.tsx:87-93` | `aria-label="折叠/展开侧边栏"` | 屏幕阅读器无法理解按钮用途 |
| sidebar-mobile-unfold | `Layout.tsx:141-147` | `aria-label="展开侧边栏"` | 同上 |
| mobile-overlay | `Layout.tsx:170-172` | `role="presentation"` + `aria-hidden="true"` | 装饰性元素干扰屏幕阅读器 |
| 登出按钮 | `Sidebar.tsx:114` | Tooltip 部分补偿，但 `aria-label` 更可靠 | Tooltip 不总是可被屏幕阅读器读取 |

---

### UI-14: 表单缺少关联 label

**严重度**: 🟡 MEDIUM
**位置**: `login/index.tsx:48-54`

```tsx
// login/index.tsx:48-54 — Form.Item 有 name 但 Input 通过 prefix 图标暗示用途
<Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
  <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" size="large" />
</Form.Item>
```

**问题分析**:
- antd Form.Item 不设置 `label` prop 时，不会生成 `<label>` 元素
- 虽然有 `placeholder`，但 placeholder 在聚焦后消失，且不是所有屏幕阅读器都能可靠读取
- WCAG 2.1 (1.3.1 Info and Relationships) 要求表单控件有关联的标签
- Carbon 的 text-input 规范明确包含 label 文本

**修复方案**:

```tsx
<Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
  <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" size="large" />
</Form.Item>
```

---

## 5. 响应式设计评审

### UI-15: 缺少平板断点（768px–1279px）的适配策略

**严重度**: 🟡 MEDIUM
**位置**: `global.css` + `Layout.tsx`

**问题分析**:
- 当前响应式策略是二元式的：672px 以下移动端，1280px 以上桌面端
- DESIGN.md 定义了 4 个断点：320px (Mobile), 672px (Tablet), 1056px (Desktop), 1312px (Desktop-XL)
- 实际断点使用：
  - `global.css:605` — `@media (max-width: 672px)` — 仅移动端适配
  - `global.css:524,889,919,955,995,1058,1098,1157,1214,1256` — `@media (min-width: 1280px)` — 表格/卡片切换
- **缺失的 672px–1279px 区间**（平板和小屏笔记本）：
  - 卡片视图在 672px+ 就显示，但表格视图需要 1280px
  - 在 672px–1279px 区间，页面布局可能显得空旷（卡片单列但页面很宽）
  - 侧边栏在这个区间使用桌面模式（240px 宽），挤压内容区

**影响**: 在 iPad 横屏（1024px）和小笔记本上体验欠佳。

---

### UI-16: 登录页在移动端全宽显示缺少安全边距

**严重度**: 🟡 LOW
**位置**: `global.css:613-617`

```css
/* global.css:613-617 */
@media (max-width: 672px) {
  .login-card {
    max-width: 100%;
    margin: var(--spacing-md);  /* 16px — 足够 */
  }
}
```

**分析**: margin 16px 在移动端是合理的。但登录卡片在极小屏幕（320px）上宽度为 320 - 32 = 288px，内部 padding 48px（左右各 24px），可用内容宽度仅 240px，表单输入框可能过窄。建议在小屏幕下减小 padding。

---

### UI-17: 移动端侧边栏展开时缺少焦点捕获（focus trap）

**严重度**: 🟠 MEDIUM
**位置**: `Layout.tsx:149-168`

**问题分析**:
- 移动端侧边栏展开时，覆盖层（`.mobile-overlay`）拦截了内容区的点击
- 但键盘焦点仍可 Tab 到侧边栏后面的内容区元素
- WCAG 2.1 (2.4.3 Focus Order) 要求：当模态/覆盖层打开时，焦点应被限制在可见的交互元素中
- 应在侧边栏展开时实现 focus trap，关闭时恢复焦点

---

## 6. 用户流程体验评审

### UI-18: 无路由过渡动画 — 页面切换生硬

**严重度**: 🟠 MEDIUM
**位置**: `App.tsx:8-12`, `Layout.tsx:175-196`

**问题分析**:
- 路由切换时，内容区直接替换，无任何过渡效果
- 用户感知：点击菜单 → 内容"闪烁" → 新内容出现
- Carbon Design System 使用微妙的 opacity + translate 过渡来提供视觉连续性
- 缺少过渡动画会使用户对"是否成功切换"产生疑惑，尤其在网络较慢时

**修复方案**:

```css
/* global.css — 路由过渡 */
.main-content {
  transition: opacity 150ms ease;
}
.route-entering {
  opacity: 0;
  transform: translateY(4px);
}
.route-entered {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease, transform 200ms ease;
}
```

或使用 `react-transition-group` 配合 React Router 实现路由级动画。

---

### UI-19: Token 过期导致页面闪烁 — 用户体验断裂

**严重度**: 🔴 HIGH
**位置**: `login/index.tsx:12-16` ↔ `Layout.tsx:69-104`

**问题分析**:
- 当 JWT token 已过期但 localStorage 仍有值时：
  1. 用户访问 `/login` → 检测到 token → 跳转 `/publish`
  2. Layout 调用 verify → 401 → 清除 token → 跳转回 `/login`
  3. 用户看到：白屏 → /publish 加载中 → 白屏 → /login 页面
- 整个闪烁过程约 1-3 秒，体验极差
- 应在登录页直接验证 token 有效性，无效则清除后停留在登录页

**修复方案**: 在 `login/index.tsx` 的 useEffect 中调用 verify API 验证 token 有效性，而非仅检查存在性。

---

### UI-20: 加载状态缺少品牌信息和进度提示

**严重度**: 🟡 MEDIUM
**位置**: `Layout.tsx:127-131`

```tsx
// Layout.tsx:127-131 — 仅一个灰色背景 + Spin
<div className="full-page-loading">
  <Spin size="large" />
</div>
```

**问题分析**:
- 全屏加载状态（token 验证期间）仅有 antd Spin 组件在灰色背景上
- 无品牌标识（logo、产品名称）
- 无加载文案（"正在验证身份..."）
- 无进度指示（不确定性等待增加用户焦虑）
- 首次访问时用户看到的是毫无信息的灰色旋转器，无法确认是否进入了正确的系统

**修复方案**:

```tsx
<div className="full-page-loading">
  <div className="loading-brand">
    <Typography.Title level={3} style={{ fontWeight: 300 }}>薄云商机倍增服务</Typography.Title>
    <Spin size="large" />
    <Typography.Text type="secondary">正在验证身份...</Typography.Text>
  </div>
</div>
```

---

### UI-21: PlaceholderPage 设计过于简陋

**严重度**: 🟡 LOW
**位置**: `Layout.tsx:30-37`

```tsx
// Layout.tsx:30-37 — 占位页面仅有标题和"页面开发中..."文字
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="page-container">
    <div className="page-breadcrumb">
      <Breadcrumb items={[{ title }]} />
    </div>
    <p className="page-subtitle">页面开发中...</p>
  </div>
);
```

**问题分析**:
- 使用 Breadcrumb 误用为标题（同 UI-08）
- "页面开发中..." 文案过于技术化，面向最终用户不友好
- 无空状态插图或图标引导
- 应使用 antd `Result` 组件的 404/建设中状态，提供更专业的空状态体验

---

### UI-22: 无自定义 404 页面 — 未匹配路由直接跳转

**严重度**: 🟡 LOW
**位置**: `Layout.tsx:195`

```tsx
<Route path="*" element={<Navigate to="/publish" replace />} />
```

**问题分析**:
- 用户访问不存在的路径（如 `/dashboard`）时，被静默跳转到 `/publish`
- 用户不会知道自己输入了错误的 URL
- 更好的做法是展示 404 页面，使用 antd `Result status="404"`

---

## 7. 视觉一致性评审

### UI-23: 页面标题模式不统一

**严重度**: 🟠 MEDIUM

**问题分析**:
- 登录页使用 Breadcrumb 单项作为标题
- PlaceholderPage 也使用 Breadcrumb 单项
- 各业务页面（publish, article, knowledge 等）的页面标题实现方式各异
- 无统一的 `PageHeader` 组件确保标题层级、字体、间距一致

**修复方案**: 创建统一的 PageHeader 组件：

```tsx
// pages/components/PageHeader.tsx
const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="page-header">
    <Typography.Title level={4} style={{ fontWeight: 400, margin: 0 }}>{title}</Typography.Title>
    {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
  </div>
);
```

---

### UI-24: 侧边栏折叠/展开缺少过渡动画

**严重度**: 🟡 LOW
**位置**: `Layout.tsx:149-158`, `global.css`

**问题分析**:
- antd Sider 默认有 0.2s 的 CSS transition，但 `trigger={null}` 后需要手动触发
- 折叠时内容从展开直接跳变为折叠状态，品牌文字、菜单文字突然消失
- 更流畅的做法是添加 opacity + width 的过渡效果

---

### UI-25: 移动端 overlay 颜色过于透明

**严重度**: 🟢 LOW
**位置**: `global.css:154`

```css
/* global.css:154 */
.mobile-overlay {
  background-color: rgba(22, 22, 22, 0.3);  /* 30% 不透明度 */
}
```

**分析**: 30% 的遮罩过于轻微，可能不足以传达"内容区不可交互"的信息。Carbon 通常使用 50%+ 的遮罩。但考虑这是企业应用的偏好，标记为 LOW。

---

## 8. 交互设计评审

### UI-26: 登录页缺少"记住我"和"忘记密码"功能入口

**严重度**: 🟡 LOW
**位置**: `login/index.tsx:48-57`

**问题分析**:
- 登录表单只有用户名和密码两个字段，无任何辅助功能
- 企业应用通常需要"记住我"选项（延长 token 有效期）
- 用户忘记密码时无自助服务入口
- 虽然这是功能层面的缺失，但直接影响用户首次接触系统时的印象

---

### UI-27: 登出按钮在折叠侧边栏时不显示用户名

**严重度**: 🟡 LOW
**位置**: `Sidebar.tsx:121-125`

```tsx
// Sidebar.tsx:121-125 — 折叠状态下只有登出按钮
<div className="sidebar-footer-collapsed">
  <Tooltip title="登出">
    <Button type="text" size="small" icon={<LogoutOutlined />} onClick={onLogout} />
  </Tooltip>
</div>
```

**问题分析**:
- 折叠时不显示用户名，用户无法确认当前登录身份
- 建议将用户名放在 Tooltip 中，或在折叠图标上添加用户首字母的 Avatar

---

## 9. DESIGN.md Do's and Don'ts 合规清单

| 规则 | 合规 | 备注 |
|------|------|------|
| ✅ Use `{rounded.none}` 0px on every CTA, card, input | ✅ | ConfigProvider + CSS override |
| ✅ Pair Plex Sans weight 300 for display with 400 for body | ❌ | 300 weight 已导入但未使用（UI-02） |
| ✅ Reserve IBM Blue for primary CTAs, links, focused-input | ✅ | 未发现滥用 |
| ✅ Apply `letter-spacing: 0.16px` to body sizes | ✅ | body + .ant-typography |
| ✅ Use surface change and 1px hairlines for card hierarchy | ✅ | 无 drop shadow |
| ✅ Stick to sentence case for eyebrows | ✅ | 无 all-caps |
| ❌ Don't round corners on buttons, cards, or inputs | ✅ | 全局覆盖 |
| ❌ Don't bold display headlines | ⚠️ | sidebar-brand 600 weight 偏重（UI-03） |
| ❌ Don't add atmospheric depth | ✅ | 仅 mobile overlay 有透明度 |
| ❌ Don't introduce a second brand color | ✅ | |
| ❌ Don't use pill-shaped buttons | ✅ | |

---

## 10. 修复优先级路线图

### P0: 必须修复（影响用户体验和设计系统合规）

| 编号 | UI 问题 | 工作量 | 用户体验收益 |
|------|--------|--------|-------------|
| UI-08 | Breadcrumb 误用为页面标题，改用 Typography.Title | 2h | 语义正确 + 可访问性 |
| UI-09 | Alert message prop 修复 | 0.1h | 错误信息正确显示 |
| UI-10 | Space direction prop 修复 | 0.1h | 侧边栏底部布局正确 |
| UI-19 | Token 过期闪烁修复 | 1h | 登录体验流畅 |
| UI-04 | page-container padding 改为 8px 或 12px | 0.1h | 4px 网格合规 |
| UI-05 | 移动端展开按钮改为 48px 触摸目标 | 0.5h | 移动端可用性 |

### P1: 建议修复（提升设计系统合规和用户体验）

| 编号 | UI 问题 | 工作量 | 用户体验收益 |
|------|--------|--------|-------------|
| UI-02 | 使用 300 weight display 标题 | 2h | Carbon 品牌签名 |
| UI-11 | 登录页使用 antd Card | 0.5h | 项目规范合规 |
| UI-12 | 添加 skip-to-content | 1h | WCAG 2.4.1 合规 |
| UI-13 | 添加 ARIA 标签 | 1h | 可访问性提升 |
| UI-14 | 表单添加 label | 0.5h | WCAG 1.3.1 合规 |
| UI-18 | 路由过渡动画 | 2h | 视觉流畅性 |
| UI-20 | 加载页添加品牌信息 | 0.5h | 品牌认知 |
| UI-23 | 统一 PageHeader 组件 | 1h | 视觉一致性 |

### P2: 可选优化（长期 UX 改进）

| 编号 | UI 问题 | 工作量 | 用户体验收益 |
|------|--------|--------|-------------|
| UI-15 | 平板断点适配 | 3h | 中等屏幕体验 |
| UI-17 | 移动端侧边栏 focus trap | 1h | WCAG 2.4.3 合规 |
| UI-21 | PlaceholderPage 使用 Result 组件 | 0.5h | 专业空状态 |
| UI-22 | 自定义 404 页面 | 0.5h | 友好的错误反馈 |
| UI-24 | 侧边栏折叠过渡动画 | 1h | 视觉流畅性 |
| UI-26 | 登录辅助功能 | 2h | 功能完善 |
| UI-27 | 折叠态用户名提示 | 0.5h | 身份确认 |

---

## 11. 与已有评审的关系

### 11.1 与 `App.tsx.md`（软件架构评审）的关系

| 本评审编号 | 架构评审编号 | 关系 |
|-----------|-------------|------|
| UI-19 | ARCH-09 | 相同问题的 UX 视角：架构关注竞态，UI 关注闪烁体验 |
| UI-20 | — | 新增：架构评审未关注加载状态的视觉呈现 |
| UI-08 | — | 新增：纯 UI/语义层面的问题 |

### 11.2 与 `App.tsx.security.md`（安全评审）的关系

| 本评审编号 | 安全评审编号 | 关系 |
|-----------|-------------|------|
| UI-19 | SEC-FE-10 | 相同问题的不同视角：安全关注信息泄露，UI 关注体验断裂 |
| UI-13 | — | 新增：安全评审未涉及可访问性 |

---

## 12. 结论

`pages/App.tsx` 的 16 行代码在设计系统合规方面做了正确的基础选择（Carbon 色彩、IBM Plex Sans、0 圆角），`main.tsx` 中的 ConfigProvider 主题配置与 DESIGN.md 基本吻合。但沿渲染链路深入审查后发现：

1. **最紧迫的 UI 问题**: antd 组件 prop 错误（Alert 的 title → message, Space 的 orientation → direction）导致功能异常
2. **最影响设计系统合规的问题**: Breadcrumb 语义误用（UI-08）和 page-container 6px padding（UI-04）违反了 Carbon 的组件语义和 4px 网格
3. **最影响用户体验的问题**: Token 过期闪烁（UI-19）和无路由过渡动画（UI-18）使交互感觉生硬
4. **最深远的架构问题**: 无 skip-to-content、无 ARIA 标签、触摸目标不足（UI-05/12/13/14）构成可访问性合规风险

**综合评分 5.5/10** — 视觉基调正确，但 UI 细节、组件语义、可访问性、交互反馈均有待提升。建议立即修复 P0 的 6 项问题，并在本迭代内完成 P1 的统一 PageHeader 和路由过渡。

---

*软件UI专家评审完成 — 2026-05-24*
