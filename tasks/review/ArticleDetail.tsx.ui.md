# 软件UI专家评审：pages/article/ArticleDetail.tsx

**评审日期**: 2026-05-24
**评审角色**: 软件UI专家（用户界面设计、交互体验、设计系统合规、可访问性、响应式设计、视觉一致性视角）
**评审范围**: 文章详情页组件 `pages/article/ArticleDetail.tsx`（889 行）及 UI 依赖链：MDEditor、Ant Design 组件、CSS 变量
**关联文件**: `DESIGN.md`, `pages/styles/global.css`, `pages/main.tsx`, `@uiw/react-md-editor`

---

## 1. 总体评级：4.2/10（功能可用，UI/UX 存在系统性缺陷，DESIGN.md 合规度低）

`ArticleDetail.tsx` 是项目中最复杂的页面之一，承担了文章创建/编辑/AI生成/审核/发布全生命周期管理。功能覆盖全面，但从 UI 专家视角审视，该页面在设计系统合规、antd 组件语义、交互反馈、可访问性、响应式设计等维度存在大量问题。40+ 处内联样式绕过了 DESIGN.md 的 CSS 变量体系，antd Alert 的 `title` prop 错误导致错误信息可能不显示，表单缺乏未保存提示，编辑器区域缺少响应式适配。

| 评价维度 | 评分 | 状态 |
|----------|------|------|
| 设计系统合规（Design System Compliance） | 3/10 | 大量内联样式、CSS 变量混用、圆角/间距违反 Carbon 规范 |
| antd 组件使用（Ant Design Usage） | 4/10 | Alert prop 错误、组件选型不当、Form.Item noStyle 滥用 |
| 交互反馈（Interaction Feedback） | 4/10 | 缺少未保存提示、自动保存无指示器、无操作确认反馈 |
| 可访问性（Accessibility / a11y） | 2/10 | 无 ARIA 标签、无键盘导航支持、无 skip-to-content |
| 响应式设计（Responsive Design） | 2/10 | 固定宽度/高度、无断点适配、移动端不可用 |
| 视觉一致性（Visual Consistency） | 3/10 | CSS 变量命名不统一、颜色硬编码、间距不一致 |
| 用户流程体验（User Flow Experience） | 5/10 | 基本流程完整，但缺少引导、状态转换生硬 |
| 表单设计（Form Design） | 5/10 | 基本表单结构合理，但缺少分组、进度指示、智能默认值 |

---

## 2. DESIGN.md 合规性逐项审计

### 2.1 圆角系统合规 — 评分 3/10

**DESIGN.md 规范**: Carbon Design System 要求所有按钮、卡片、输入框、容器使用 `{rounded.none}` 0px 圆角。`{rounded.xs}` 2px 仅用于小徽章。

| 位置 | 代码 | DESIGN.md 期望 | 合规 |
|------|------|---------------|------|
| L588 | `borderRadius: 2` (图片容器) | 0px（feature-card 类容器） | ⚠️ 可接受 |
| L629 | `borderRadius: 2` (知识库图片) | 0px | ⚠️ 可接受 |
| L668 | `borderRadius: 2` (已选图片) | 0px | ⚠️ 可接受 |
| L677 | `borderRadius: '50%'` (删除按钮) | 0px（Carbon 无圆形按钮） | ❌ |
| L691 | `borderRadius: 2` (平台选择区) | 0px（text-input 规范） | ⚠️ 可接受 |
| L672 | `borderRadius: '50%'` (删除图标) | 0px | ❌ |

**UI-01**: 图片删除按钮使用 `borderRadius: '50%'`（L672-674）创建圆形按钮，违反 Carbon 的方形按钮规范。DESIGN.md 明确规定"Don't use pill-shaped buttons"和"every CTA, card, input, container uses square corners (0px)"。

```tsx
// L672-674 — 圆形删除按钮违反 Carbon 规范
style={{
  top: 2, right: 2, width: 18, height: 18,
  background: 'rgba(0,0,0,0.5)',
  borderRadius: '50%',  // ❌ Carbon 规范: 0px
}}
```

**修复方案**: 使用 `borderRadius: 0` 或 antd `Button type="text"` + `DeleteOutlined` 图标，并确保符合 Carbon 的 button-danger 规范。

---

### 2.2 色彩系统合规 — 评分 4/10

**DESIGN.md 规范**: 所有颜色必须使用 CSS 变量体系，禁止硬编码颜色值。IBM Blue (#0f62fe) 仅用于主 CTA、链接、焦点状态。

| 位置 | 代码 | DESIGN.md 期望 | 合规 |
|------|------|---------------|------|
| L508, L584, L609, L695 | `color: 'var(--text-secondary)'` | `var(--color-ink-muted)` 或统一命名 | ❌ 命名不一致 |
| L629, L668 | `border: '2px solid var(--interactive)'` | `var(--color-primary)` | ❌ 未定义的变量 |
| L565, L629, L656, L691 | `var(--border-subtle)` | `var(--color-hairline)` | ❌ 未定义的变量 |
| L639 | `background: 'rgba(0,0,0,0.25)'` | CSS 变量 | ❌ 硬编码 |
| L674 | `background: 'rgba(0,0,0,0.5)'` | CSS 变量 | ❌ 硬编码 |
| L643 | `color: '#fff'` | `var(--color-on-primary)` | ❌ 硬编码 |
| L675 | `color: '#fff'` | `var(--color-on-primary)` | ❌ 硬编码 |

**UI-02**: CSS 变量命名体系混乱。`--text-secondary`、`--interactive`、`--border-subtle` 与 DESIGN.md 定义的 `--color-ink-muted`、`--color-primary`、`--color-hairline` 不一致，可能导致在某些主题或模式下颜色值不匹配。

**UI-03**: 5 处硬编码颜色值（`rgba(0,0,0,0.25)`, `rgba(0,0,0,0.5)`, `#fff`），违反 DESIGN.md 的语义化颜色规范。Carbon 的覆盖层使用 `{colors.inverse-canvas}` + 透明度，不应直接硬编码 rgba 值。

**修复方案**:

```css
/* global.css 中定义语义化覆盖层变量 */
--color-overlay-light: rgba(22, 22, 22, 0.25);
--color-overlay-medium: rgba(22, 22, 22, 0.5);
```

```tsx
// 使用 CSS 变量替代硬编码
background: 'var(--color-overlay-light)'
color: 'var(--color-on-primary)'
```

---

### 2.3 间距系统合规 — 评分 5/10

**DESIGN.md 规范**: 基于 4px 网格的间距系统。所有间距必须是 4 的倍数。

| 位置 | 代码 | DESIGN.md 期望 | 合规 |
|------|------|---------------|------|
| L691 | `padding: '4px 11px'` | `padding: 4px 12px`（4px 网格） | ❌ 11px 不在 4px 网格 |
| L674 | `width: 18, height: 18` | 16px 或 20px（4px 网格） | ❌ 18px 不在 4px 网格 |
| L672 | `top: 2, right: 2` | 4px（最小网格单位） | ❌ 2px 不在 4px 网格 |
| L643 | `fontSize: 22` | 无对应 token | ❌ 不属于任何排版层级 |
| L675 | `fontSize: 10` | 12px (`{typography.caption}`) | ❌ 10px 不属于任何排版层级 |

**UI-04**: 图片删除图标尺寸 18x18px（L674）和偏移 2px（L672）均不在 4px 网格上。DESIGN.md 的基础单位是 4px，所有间距和尺寸应遵循 `{spacing.xxs}` 4px 的倍数。

**UI-05**: `fontSize: 22`（L643 CheckOutlined）和 `fontSize: 10`（L675 DeleteOutlined）不属于 DESIGN.md 的任何排版层级。Carbon 的图标尺寸有标准值：16px、20px、24px、32px。

**修复方案**: 将图标尺寸调整为 16px 或 20px，删除按钮调整为 16x16 或 20x20。

---

### 2.4 排版系统合规 — 评分 4/10

**DESIGN.md 规范**: IBM Plex Sans，display 级使用 weight 300，body 使用 weight 400 + `letter-spacing: 0.16px`。

| 位置 | 代码 | DESIGN.md 期望 | 合规 |
|------|------|---------------|------|
| L854 | `Typography.Title level={2}` | `{typography.card-title}` 24px weight 400 | ❌ level={2} = 30px，不匹配任何 token |
| L773 | `fontSize: 13` | `{typography.caption}` 12px 或 `{typography.body-sm}` 14px | ❌ 13px 不属于任何层级 |
| L828 | `fontSize` 未指定（继承） | 应明确指定 `{typography.body-sm}` | ⚠️ |

**UI-06**: 页面标题使用 `Typography.Title level={2}`（L854），在 antd 默认主题下渲染为 30px font-weight 600。DESIGN.md 的 `{typography.card-title}` 是 24px weight 400，`{typography.headline}` 是 32px weight 400。30px 600 weight 不属于任何 DESIGN.md 排版层级。

**修复方案**:

```tsx
// 使用 level={4} (antd 默认 16px) + 自定义样式匹配 DESIGN.md card-title
<Typography.Title level={4} style={{ fontWeight: 400, fontSize: 24 }}>
  {isNew ? '新建文章' : article?.title || '文章详情'}
</Typography.Title>
```

---

### 2.5 内联样式滥用 — 评分 2/10

**DESIGN.md 规范**: 组件样式应通过 CSS 类和 CSS 变量实现，保持设计一致性。

**UI-07**: 全文件 40+ 处内联样式直接绕过了 DESIGN.md 的 CSS 变量体系，是最严重的合规性问题。

内联样式统计：

| 类别 | 数量 | 典型位置 |
|------|------|---------|
| `display: flex` | 12+ | L586, L596, L613, L666, L676, L691, L804, L852 |
| 固定宽高 | 15+ | L588, L629, L643, L668, L672-674 |
| `marginBottom` | 8+ | L527, L563, L772, L797, L864 |
| `textAlign: 'center'` | 3 | L608, L655, L828 |
| 颜色值 | 8+ | L508, L584, L609, L639, L643, L675, L695, L828 |
| `padding` | 5+ | L608, L655, L691 |

**问题分析**:

1. **无法全局调整**: 内联样式优先级最高，无法通过 CSS 变量或主题切换覆盖
2. **无法响应式**: 内联样式无法使用 `@media` 查询适配不同屏幕
3. **重复代码**: `display: 'flex', flexWrap: 'wrap', gap: 8` 在图片区域出现 3 次（L586, L613, L666）
4. **设计漂移**: 开发者无法通过查看 CSS 文件理解页面的视觉规范

**修复方案**: 将重复的内联样式提取为 CSS 类：

```css
/* global.css */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs); /* 8px */
}
.image-tile {
  position: relative;
  width: 80px;
  height: 80px;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  border-radius: 0;
}
.image-tile-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## 3. antd 组件使用评审

### UI-08: Alert 组件 `title` prop 错误 — 应为 `message` (CRITICAL)

**严重度**: 🔴 CRITICAL
**位置**: L526, L797-813

```tsx
// L526 — 错误 Alert 使用 title 而非 message
{error && <Alert type="error" title={error} className="form-alert" showIcon closable onClose={() => setError('')} />}

// L797-813 — 同样的 prop 错误
<Alert
  type="warning"
  title="该文章待审核"    // ❌ antd Alert 没有 title prop
  showIcon
  style={{ marginBottom: 12 }}
  action={...}
/>
```

**问题分析**:

1. antd Alert 组件的标准 props 是 `message`（标题）和 `description`（描述），**没有 `title` prop**
2. `title` 会被 React 当作未知 DOM 属性传递给底层 div，可能被浏览器忽略
3. **实际效果**: 错误信息"该文章待审核"和表单错误信息可能根本不显示，用户看不到关键提示
4. 这个 bug 同时存在于 `App.tsx` 的评审中（UI-09），说明是系统性问题

**修复方案**:

```tsx
// L526
{error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />}

// L797
<Alert
  type="warning"
  message="该文章待审核"
  showIcon
  style={{ marginBottom: 12 }}
  action={...}
/>
```

---

### UI-09: Table 的 sortOrder 类型错误 — `null` 应为 `undefined`

**严重度**: 🟠 HIGH
**位置**: L737-740

```tsx
// L737-740 — sortOrder 使用 null
{
  title: '平台名称', dataIndex: 'name', width: 200, sorter: true,
  sortOrder: platformSortBy === 'name' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : null,
}
```

**问题分析**:

1. antd Table column 的 `sortOrder` 类型为 `'ascend' | 'descend' | undefined`
2. 传入 `null` 不是合法值，TypeScript 严格模式下会报错
3. `null` 可能导致 antd 内部排序状态管理异常，表现为排序指示器不正确或排序不生效

**修复方案**: 将 `null` 改为 `undefined` 或直接省略：

```tsx
sortOrder: platformSortBy === 'name' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : undefined,
```

---

### UI-10: Form.Item `noStyle` 滥用导致可访问性问题

**严重度**: 🟠 MEDIUM
**位置**: L571, L575

```tsx
// L571, L575 — 画像字段的 Form.Item 使用 noStyle
{portraitMode === 'select' ? (
  <Form.Item name="portrait" noStyle>
    <Select ... />
  </Form.Item>
) : (
  <Form.Item name="portrait" noStyle>
    <Input.TextArea ... />
  </Form.Item>
)}
```

**问题分析**:

1. `noStyle` 移除了 Form.Item 的 label、错误提示、必填标记等装饰
2. 外层 `<Form.Item label="画像">`（L561）没有 `name` 属性，因此不会执行校验
3. 内层 `noStyle` 的 Form.Item 的校验错误不会显示，因为错误提示样式被移除
4. 用户无法通过视觉反馈知道画像字段校验失败

**修复方案**: 使用单个 Form.Item 切换输入组件，或确保错误提示可见：

```tsx
<Form.Item name="portrait" label="画像">
  {portraitMode === 'select' ? (
    <Select ... />
  ) : (
    <Input.TextArea ... />
  )}
</Form.Item>
```

---

### UI-11: Collapse + forceRender 导致不必要的 DOM 挂载

**严重度**: 🟡 MEDIUM
**位置**: L836-846

```tsx
const collapseItems = [
  { key: 'settings', label: '文章设置', children: settingsTab, forceRender: true },
  { key: 'content', label: '文章正文', children: contentTab, forceRender: true },
];
```

**问题分析**:

1. `forceRender: true` 导致 MDEditor（~300KB JS bundle）即使面板折叠也完整挂载
2. 图片列表、平台选择 Modal 等重型 DOM 在不可见时仍然存在于页面中
3. 对于编辑文章场景，settings 面板默认折叠但仍然渲染全部表单项
4. 增加 FCP（First Contentful Paint）和 TTI（Time to Interactive）时间

**修复方案**: 移除 `forceRender`，或使用 antd Collapse 的 `destroyInactivePanel` 属性：

```tsx
<Collapse
  defaultActiveKey={defaultActiveKeys}
  items={collapseItems}
  destroyInactivePanel
/>
```

---

### UI-12: 版本号显示使用 `.toFixed(1)` — 语义不正确

**严重度**: 🟡 LOW
**位置**: L773

```tsx
<span style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>版本 {(article.version ?? 1.0).toFixed(1)}</span>
```

**问题分析**:

1. 版本号是整数（1, 2, 3...），`.toFixed(1)` 强制显示一位小数（"1.0", "2.0"），语义不正确
2. `fontSize: 13` 不属于 DESIGN.md 的任何排版层级
3. 版本号显示应使用 `{typography.caption}` 12px

**修复方案**:

```tsx
<Typography.Text type="secondary" style={{ fontSize: 12 }}>
  版本 {article.version ?? 1}
</Typography.Text>
```

---

## 4. 交互反馈评审

### UI-13: 缺少未保存更改提示 — 用户可能丢失编辑内容

**严重度**: 🔴 CRITICAL
**位置**: 全局（无 beforeunload 或路由守卫）

**问题分析**:

1. 用户在编辑文章内容时，直接点击浏览器后退或关闭标签页，所有未保存的更改将丢失
2. React Router 的 `navigate('/article')` 导航也不会触发确认提示
3. 编辑器中有未保存内容时，自动保存间隔 5 分钟，用户在 5 分钟内离开将丢失数据
4. 这是内容编辑类页面的**基本 UX 要求**

**修复方案**:

```tsx
// 添加 beforeunload 提示
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (contentRef.current !== (article?.content || '')) {
      e.preventDefault();
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [article?.content]);
```

---

### UI-14: 自动保存无视觉指示器 — 用户不知道保存状态

**严重度**: 🟠 HIGH
**位置**: L93-133

**问题分析**:

1. 自动保存每 5 分钟执行一次，但用户完全无感知
2. 保存成功时 `message.success('正文已自动保存')` — 一个短暂的 toast 通知
3. 保存失败时静默吞掉错误（L128 `catch {}`）——用户以为已保存，实际未保存
4. 用户无法判断"上次保存时间"或"当前内容是否已保存"

**Carbon 设计建议**: 在编辑器工具栏添加保存状态指示器：

```
[ 已保存 ] 或 [ 上次保存: 14:32 ] 或 [ 保存中... ]
```

**修复方案**:

```tsx
const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

// 在自动保存成功时
setAutoSaveStatus('saved');
setLastSavedAt(new Date());
// 3秒后恢复 idle
setTimeout(() => setAutoSaveStatus('idle'), 3000);

// 在编辑器区域显示状态
{autoSaveStatus === 'saving' && <Spin size="small" />}
{autoSaveStatus === 'saved' && <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />}
```

---

### UI-15: 加载状态缺乏品牌信息和上下文提示

**严重度**: 🟠 MEDIUM
**位置**: L516-518

```tsx
if (loading) {
  return <div className="page-container"><Spin /></div>;
}
```

**问题分析**:

1. 全屏 Spin 无文字提示，用户无法区分"加载中"和"页面卡死"
2. 无加载进度或上下文信息（"正在加载文章..."）
3. Spin 使用默认尺寸，在白色背景上视觉冲击力弱
4. 不符合 Carbon 的加载状态设计规范

**修复方案**:

```tsx
if (loading) {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Spin size="large" tip="正在加载文章..." />
    </div>
  );
}
```

---

### UI-16: 内容为空时的提示文案不友好

**严重度**: 🟡 MEDIUM
**位置**: L827-829

```tsx
<div style={{ padding: 48, textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
  正文内容生成中，请稍侯...
</div>
```

**问题分析**:

1. "正文内容生成中，请稍侯..." 只适用于 AI 生成模式，对手工编写模式不存在
2. 手工编写模式下如果内容为空，应显示"暂无内容，点击编辑开始编写"
3. padding 48px 直接硬编码，不使用 CSS 变量 `{spacing.xxl}`
4. 应使用 antd `Empty` 组件提供标准空状态

**修复方案**:

```tsx
{content ? (
  <MDEditor.Markdown source={content} />
) : (
  <Empty
    description={article?.write_mode === 'ai' ? 'AI 正在生成文章内容...' : '暂无内容'}
    image={Empty.PRESENTED_IMAGE_SIMPLE}
  />
)}
```

---

### UI-17: 表单提交按钮位置不合理 — 长表单底部按钮不可见

**严重度**: 🟡 MEDIUM
**位置**: L866-884

```tsx
{isSettingsEditable && (
  <div className="form-actions">
    <Button loading={saving} onClick={...}>存草稿</Button>
    <Button type="primary" loading={saving} onClick={...}>提交给AI</Button>
  </div>
)}
```

**问题分析**:

1. 表单包含 8+ 个 Form.Item（编写方式、标题、类型、关键词、画像、插图、技能、大模型、发布平台），在屏幕上可能超过一屏
2. 提交按钮在表单最底部，用户需要滚动到底部才能操作
3. 对于 AI 模式，部分字段隐藏，按钮位置会随字段显示/隐藏跳动
4. Carbon 设计建议：长表单的操作栏应固定在底部（sticky footer）或在页面顶部提供操作入口

**修复方案**: 使用 `position: sticky` 固定操作栏：

```css
.form-actions {
  position: sticky;
  bottom: 0;
  background: var(--color-canvas);
  padding: var(--spacing-md) 0;
  border-top: 1px solid var(--color-hairline);
  z-index: 10;
}
```

---

## 5. 可访问性（a11y）评审

### UI-18: 图片选择区域缺少键盘操作支持

**严重度**: 🔴 HIGH
**位置**: L617-646（知识库图片网格）

```tsx
<div key={img.id}
  onClick={() => {
    if (!isSettingsEditable) return;
    if (selected) {
      setImageList(imageList.filter((u) => u !== img.image_url));
    } else {
      setImageList([...imageList, img.image_url]);
    }
  }}
  style={{ /* ... */ }}
  title={img.title}
>
```

**问题分析**:

1. 使用 `div` + `onClick` 实现图片选择，但 `div` 不是交互元素，无法通过 Tab 键聚焦
2. 缺少 `role="checkbox"`、`aria-checked`、`aria-label` 等 ARIA 属性
3. 缺少 `tabIndex={0}` 使其可键盘聚焦
4. 缺少 `onKeyDown` 处理 Enter/Space 键触发选择
5. WCAG 2.1 (2.1.1 Keyboard) 要求所有功能可通过键盘操作

**修复方案**:

```tsx
<div
  key={img.id}
  role="checkbox"
  aria-checked={selected}
  aria-label={`选择图片: ${img.title}`}
  tabIndex={isSettingsEditable ? 0 : -1}
  onClick={handleToggle}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }}
  style={{ /* ... */ }}
>
```

---

### UI-19: 平台选择区域使用 div 模拟输入框 — 可访问性缺失

**严重度**: 🟠 HIGH
**位置**: L690-707

```tsx
<div style={{ display: 'flex', /* ... */ border: '1px solid var(--border-subtle)', /* ... */ }}
  onClick={() => { if (isSettingsEditable) openPlatformModal(); }}>
  {(() => {
    const platforms: string[] = form.getFieldValue('platforms') || [];
    if (platforms.length === 0) {
      return <span style={{ color: 'var(--text-secondary)' }}>点击选择发布平台</span>;
    }
    return platforms.map((name) => (
      <Tag key={name} closable={isSettingsEditable} onClose={...}>{name}</Tag>
    ));
  })()}
</div>
```

**问题分析**:

1. 使用 `div` + `onClick` 模拟 Select 输入框，但：
   - 无 `role="combobox"` 或 `role="button"`
   - 无 `aria-expanded` 指示 Modal 是否打开
   - 无 `aria-haspopup="dialog"` 表示将打开对话框
   - 无 `tabIndex` 使其可键盘聚焦
   - 无 `onKeyDown` 处理键盘触发
2. 应使用 antd `Select` 组件的 `mode="multiple"` + 自定义弹窗，或 `Input` + `onFocus` 打开 Modal

**修复方案**:

```tsx
// 方案 A: 使用 antd Select + 自定义 dropdownRender
<Select
  mode="multiple"
  open={false}
  onDropdownVisibleChange={() => openPlatformModal()}
  value={form.getFieldValue('platforms') || []}
  placeholder="点击选择发布平台"
  disabled={!isSettingsEditable}
/>

// 方案 B: 添加 ARIA 属性到现有 div
<div
  role="combobox"
  aria-expanded={platformModalOpen}
  aria-haspopup="dialog"
  aria-label="选择发布平台"
  tabIndex={isSettingsEditable ? 0 : -1}
  onClick={() => { if (isSettingsEditable) openPlatformModal(); }}
  onKeyDown={(e) => { if (e.key === 'Enter') openPlatformModal(); }}
>
```

---

### UI-20: Modal 内的搜索和表格缺少焦点管理

**严重度**: 🟡 MEDIUM
**位置**: L708-765（平台选择 Modal）

**问题分析**:

1. Modal 打开时焦点未自动移入 Modal 内部（缺少 `autoFocus`）
2. Modal 关闭时焦点未返回触发元素
3. 表格的行选择无键盘快捷键支持
4. 搜索框在 Modal 打开后应自动获取焦点

**修复方案**: 为搜索框添加 `autoFocus`：

```tsx
<Input.Search
  placeholder="搜索平台名称或分类"
  autoFocus  // ← Modal 打开后自动聚焦
  // ...
/>
```

---

## 6. 响应式设计评审

### UI-21: 固定尺寸导致移动端完全不可用 — 无响应式适配

**严重度**: 🔴 CRITICAL
**位置**: 全文件

**问题分析**:

`ArticleDetail.tsx` 中有 15+ 处固定像素尺寸，完全没有响应式设计：

| 位置 | 固定值 | 影响 |
|------|--------|------|
| L588, L629, L668 | `width: 80, height: 80` | 图片网格在小屏幕溢出 |
| L819 | `height={600}` | MDEditor 600px 高度在移动端占满屏幕 |
| L655 | `width: '100%'` | 上传区域宽度 OK，但无断点调整 |
| L710 | `width={700}` | Modal 700px 在移动端超出屏幕 |
| L759 | `scroll={{ y: 400 }}` | 表格 400px 固定高度在移动端不合适 |

**具体问题**:

1. **图片网格**: 80px × 80px 的图片 + 8px gap，5 张图片需要 `5 × 80 + 4 × 8 = 432px`。在 320px 移动端必然溢出。
2. **MDEditor**: 600px 固定高度在移动端体验极差，应降至 300-400px。
3. **Modal**: 700px 宽度在 375px iPhone 上溢出，应使用 `width="90vw"` 或 `style={{ maxWidth: 700 }}`。
4. **表格**: 在移动端 10 列数据表格完全不可读，应使用卡片列表替代。
5. **表单**: 无断点调整表单布局（始终垂直排列），在宽屏空间利用率低。

**修复方案**:

```tsx
// Modal 响应式宽度
<Modal
  width={typeof window !== 'undefined' && window.innerWidth < 768 ? '95vw' : 700}
  // 或使用 antd Grid 的 useBreakpoint
>

// MDEditor 响应式高度
<MDEditor height={window.innerWidth < 768 ? 300 : 600} />

// 图片网格响应式
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: 8,
}}>
```

---

### UI-22: 页面标题区域无响应式处理

**严重度**: 🟡 MEDIUM
**位置**: L851-860

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
  <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
  <Typography.Title level={2} style={{ margin: 0 }}>
    {isNew ? '新建文章' : article?.title || '文章详情'}
  </Typography.Title>
  {article && statusCfg && (
    <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
  )}
</div>
```

**问题分析**:

1. `Typography.Title level={2}` 在 30px 字号下，长标题会溢出
2. flex 布局不会自动换行，长标题 + 状态 Tag 在小屏幕上挤压
3. 应添加 `flexWrap: 'wrap'` 或在小屏幕下截断标题

**修复方案**:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
  <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
  <Typography.Title level={4} style={{ margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {isNew ? '新建文章' : article?.title || '文章详情'}
  </Typography.Title>
  {article && statusCfg && (
    <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
  )}
</div>
```

---

## 7. 视觉一致性评审

### UI-23: 页面标题模式与 App.tsx 评审结论不一致

**严重度**: 🟠 MEDIUM
**位置**: L851-860

**问题分析**:

1. `App.tsx.ui.md` 评审（UI-08）指出 Breadcrumb 不应作为页面标题
2. `ArticleDetail.tsx` 使用 `Typography.Title level={2}` 作为页面标题
3. 其他页面可能使用不同的标题模式
4. 无统一的 `PageHeader` 组件确保全站一致性

**建议**: 创建统一的 PageHeader 组件（与 `App.tsx.ui.md` UI-23 一致）。

---

### UI-24: 图片管理三种模式的切换体验不一致

**严重度**: 🟡 MEDIUM
**位置**: L596-680

**问题分析**:

1. 知识库图片模式（kb）：网格展示，点击选择/取消
2. 上传模式（upload）：虚线框上传区域
3. URL 模式（url）：搜索输入框
4. 三种模式切换时内容区域大小变化明显，布局跳动
5. 已选图片列表在三种模式底部始终显示，但与模式切换区域之间无视觉分隔
6. Segmented 切换组件放在图片上方（L597-601），但 Carbon 的 tab 设计应有底部边框指示

**修复方案**: 使用 antd Tabs 替代 Segmented 进行模式切换，保持切换区域大小一致：

```tsx
<Tabs
  activeKey={imageMode}
  onChange={(key) => setImageMode(key)}
  items={[
    { key: 'kb', label: '从知识库选择', children: <KbImageGrid /> },
    { key: 'upload', label: '上传图片', children: <UploadArea /> },
    { key: 'url', label: '输入URL', children: <UrlInput /> },
  ]}
/>
```

---

### UI-25: 审核操作栏视觉权重不足

**严重度**: 🟡 LOW
**位置**: L797-814

```tsx
<Alert
  type="warning"
  title="该文章待审核"
  showIcon
  style={{ marginBottom: 12 }}
  action={
    <div style={{ display: 'flex', gap: 8 }}>
      <Popconfirm ...>
        <Button size="small" type="primary">审核通过</Button>
      </Popconfirm>
      <Popconfirm ...>
        <Button size="small" danger>审核不通过</Button>
      </Popconfirm>
    </div>
  }
/>
```

**问题分析**:

1. 审核是高风险操作（通过 → 发布、不通过 → 退回草稿），但操作按钮放在 Alert 的 `action` 区域
2. `Button size="small"` 在 Alert 内部视觉权重过低，审核人可能忽略
3. 审核操作应更突出：使用独立区域、正常尺寸按钮、更明确的操作指引
4. Alert 的 `title` prop 实际上不会显示（见 UI-08），用户根本看不到"该文章待审核"的提示

---

## 8. 用户流程体验评审

### UI-26: 新建文章流程缺少步骤引导

**严重度**: 🟠 HIGH
**位置**: L524-767（整个设置表单）

**问题分析**:

1. 新建文章需要填写：编写方式 → 标题(手工模式) → 文章类型 → 关键词 → 画像(AI模式) → 插图(AI模式) → 技能(AI模式) → 大模型(AI模式) → 发布平台
2. 表单字段根据 `writeMode` 动态显示/隐藏，用户可能困惑于"接下来该填什么"
3. 缺少步骤指示器（Steps 组件）引导用户完成必填字段
4. 提交按钮在表单底部，用户可能不知道表单有多长

**修复方案**: 使用 antd Steps 或 Progress 组件指示必填字段完成度：

```tsx
const requiredFields = ['write_mode', 'article_type', 'keywords', 'platforms'];
const completedCount = requiredFields.filter(f => form.getFieldValue(f)).length;
<Progress percent={Math.round(completedCount / requiredFields.length * 100)} size="small" />
```

---

### UI-27: AI 生成状态无实时反馈 — 用户不知道生成进度

**严重度**: 🟠 MEDIUM
**位置**: L827-829

```tsx
<div style={{ padding: 48, textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
  正文内容生成中，请稍侯...
</div>
```

**问题分析**:

1. AI 生成文章可能需要 30 秒到数分钟，用户看到的只有静态文字"请稍侯..."
2. 无进度指示（进度条、百分比、动态动画）
3. 无预计时间提示
4. 无"取消生成"选项
5. 用户无法区分"正在生成"和"生成失败但未更新状态"

**修复方案**: 使用 antd `Spin` + 动态提示，或实现轮询机制：

```tsx
const [generatingTime, setGeneratingTime] = useState(0);
// 使用 setInterval 更新时间显示
<div style={{ padding: 48, textAlign: 'center' }}>
  <Spin size="large" />
  <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
    AI 正在生成文章内容...（已等待 {generatingTime}s）
  </Typography.Text>
</div>
```

---

### UI-28: 手工编写模式切换后缺少内容区引导

**严重度**: 🟡 LOW
**位置**: L340-343, L877-882

**问题分析**:

1. 手工模式下点击"提交"后，通过 `navigate` + `state: { openContentEdit: true }` 跳转到内容编辑区
2. `location.state` 在浏览器刷新后丢失（见架构评审 M-2），用户刷新后无法恢复编辑模式
3. 滚动到内容区使用 `scrollIntoView`，但无动画或视觉高亮引导用户注意
4. 应在内容区域添加"开始编写"的醒目引导

---

## 9. DESIGN.md Do's and Don'ts 合规清单

| 规则 | 合规 | 备注 |
|------|------|------|
| ✅ Use `{rounded.none}` 0px | ❌ | 2 处 `borderRadius: '50%'`（L672, L677） |
| ✅ Pair Plex Sans weight 300 for display | ❌ | 页面标题 weight 600（antd 默认），从未使用 300 |
| ✅ Reserve IBM Blue for primary CTAs | ⚠️ | `var(--interactive)` 含义不明，可能是 IBM Blue |
| ✅ Apply `letter-spacing: 0.16px` to body | ⚠️ | 依赖全局 CSS 设置，内联样式可能覆盖 |
| ❌ Don't round corners | ❌ | 圆形删除按钮违反 |
| ❌ Don't bold display headlines | ❌ | Typography.Title level={2} 默认 weight 600 |
| ❌ Don't add atmospheric depth | ✅ | 无阴影或渐变 |
| ❌ Don't introduce a second brand color | ✅ | |
| ❌ Don't use pill-shaped buttons | ✅ | 无药丸按钮，但有圆形按钮 |

---

## 10. 修复优先级路线图

### P0: 必须修复（影响功能正确性和关键 UX）

| 编号 | UI 问题 | 工作量 | 用户体验收益 |
|------|--------|--------|-------------|
| UI-08 | Alert `title` → `message` prop 修复 | 0.1h | 错误/警告信息正确显示 |
| UI-13 | 添加未保存更改提示（beforeunload） | 0.5h | 防止数据丢失 |
| UI-21 | Modal 响应式宽度 + MDEditor 响应式高度 | 1h | 移动端基本可用 |
| UI-18 | 图片选择添加键盘支持 | 1h | WCAG 2.1.1 键盘可操作 |
| UI-19 | 平台选择添加 ARIA 属性 | 0.5h | WCAG 可访问性 |

### P1: 建议修复（提升设计系统合规和用户体验）

| 编号 | UI 问题 | 工作量 | 用户体验收益 |
|------|--------|--------|-------------|
| UI-01 | 图片删除按钮改方形 | 0.1h | Carbon 圆角合规 |
| UI-02 | 统一 CSS 变量命名 | 2h | 色彩体系一致性 |
| UI-03 | 消除硬编码颜色 | 1h | 主题适配能力 |
| UI-06 | 页面标题使用正确排版层级 | 0.5h | 排版合规 |
| UI-07 | 内联样式提取为 CSS 类 | 3h | 设计系统一致性 |
| UI-09 | Table sortOrder 类型修复 | 0.1h | 排序功能正确 |
| UI-10 | 移除 Form.Item noStyle | 0.5h | 校验错误可见 |
| UI-11 | 移除 Collapse forceRender | 0.1h | 首屏性能提升 |
| UI-14 | 自动保存状态指示器 | 1h | 保存状态可见 |
| UI-15 | 加载状态添加文字提示 | 0.5h | 加载反馈友好 |
| UI-26 | 新建文章步骤引导 | 2h | 降低用户认知负担 |

### P2: 可选优化（长期 UX 改进）

| 编号 | UI 问题 | 工作量 | 用户体验收益 |
|------|--------|--------|-------------|
| UI-04 | 间距调整为 4px 网格 | 1h | Carbon 间距合规 |
| UI-05 | 图标尺寸标准化 | 0.5h | 视觉一致性 |
| UI-16 | 空状态使用 antd Empty | 0.5h | 空状态友好 |
| UI-17 | 表单按钮固定底部 | 1h | 长表单操作便利 |
| UI-22 | 标题区域响应式 | 0.5h | 移动端标题适配 |
| UI-24 | 图片模式使用 Tabs | 1h | 模式切换流畅 |
| UI-25 | 审核操作栏视觉增强 | 0.5h | 审核操作醒目 |
| UI-27 | AI 生成进度反馈 | 2h | 等待体验改善 |

---

## 11. 与已有评审的关系

### 11.1 与 `ArticleDetail.tsx.md`（软件质量评审）的关系

| 本评审编号 | 质量评审编号 | 关系 |
|-----------|-------------|------|
| UI-08 | Q-02 (XSS) | 质量评审关注安全，本评审关注 Alert 不显示的 UI bug |
| UI-11 | Q-13 (forceRender) | 相同问题的不同视角：质量关注性能，UI 关注用户体验 |
| UI-15 | Q-12 (loading) | 相同问题：质量关注 Spin 无文字，UI 关注品牌信息和上下文 |
| UI-07 | — | 新增：质量评审未系统性审查内联样式问题 |

### 11.2 与 `ArticleDetail.tsx.architecture.md`（架构评审）的关系

| 本评审编号 | 架构评审编号 | 关系 |
|-----------|-------------|------|
| UI-21 | — | 新增：架构评审未涉及响应式设计 |
| UI-18, UI-19 | — | 新增：架构评审未涉及可访问性 |
| UI-07 | C-1 (God Component) | 架构评审关注拆分，UI 评审关注样式管理 |

### 11.3 与 `ArticleDetail.tsx.security.md`（安全评审）的关系

| 本评审编号 | 安全评审编号 | 关系 |
|-----------|-------------|------|
| UI-19 | SEC-ART-03 (user tampering) | 安全关注角色篡改，UI 关注可访问性属性缺失 |
| UI-14 | — | 新增：安全评审未涉及自动保存的用户反馈 |

---

## 12. 结论

`ArticleDetail.tsx` 的 UI 实现存在**三个层面**的系统性问题：

1. **设计系统合规层面**: 40+ 处内联样式绕过 CSS 变量体系，5 处硬编码颜色值，2 处 `borderRadius: '50%'` 违反 Carbon 方形规范，页面标题使用不匹配的排版层级。CSS 变量命名混乱（`--text-secondary` vs `--color-ink-muted`），导致设计规范无法统一执行。

2. **组件使用层面**: antd Alert 的 `title` prop 错误（L526, L797）导致错误/警告信息不显示，这是功能性 bug 而非风格问题。Table 的 `sortOrder: null` 类型错误可能导致排序异常。Form.Item `noStyle` 滥用导致校验错误不可见。

3. **用户流程层面**: 缺少未保存更改提示（UI-13）可能导致用户数据丢失，自动保存无视觉指示器（UI-14），AI 生成无进度反馈（UI-27），新建文章无步骤引导（UI-26）。响应式设计几乎为零（UI-21），移动端完全不可用。

**综合评分 4.2/10** — 功能可用但 UI/UX 质量远低于 Carbon Design System 标准。建议立即修复 P0 的 5 项问题（特别是 UI-08 Alert prop 修复和 UI-13 未保存提示），然后在下一迭代完成 P1 的 CSS 变量统一和内联样式清理。

---

## 13. 修复状态追踪

**修复轮次**: 2026-05-24（第二轮 UI 修复）
**基于代码**: 重构后的组件化版本（原始 889 行 → ArticleDetail.tsx 218 行 + 7 个子模块）

### 13.1 已修复项（代码重构时已一并解决）

| 编号 | 问题 | 修复方式 | 状态 |
|------|------|---------|------|
| UI-01 | 图片删除按钮 `borderRadius: '50%'` | 改为 `borderRadius: 0` (ArticleImageManager.tsx) | ✅ |
| UI-02 | CSS 变量命名不一致 | 统一为 `--color-hairline`/`--color-primary`/`--color-ink-subtle` | ✅ |
| UI-03 | 硬编码颜色值 | 改用 `var(--color-overlay-light)`/`var(--color-on-primary)` | ✅ |
| UI-06 | 页面标题排版层级错误 | 改为 `level={4}` + `fontWeight: 400, fontSize: 24` | ✅ |
| UI-08 | Alert `title` → `message` prop | 已修正为 `message={error}` (ArticleSettingsForm.tsx) | ✅ |
| UI-09 | Table `sortOrder: null` | 改为 `undefined` (PlatformSelectModal.tsx) | ✅ |
| UI-10 | Form.Item `noStyle` | 改为 `style={{ marginBottom: 0 }}` (ArticleSettingsForm.tsx) | ✅ |
| UI-11 | Collapse `forceRender` | 已移除 (ArticleDetail.tsx) | ✅ |
| UI-12 | 版本号 `.toFixed(1)` | 改为 `article.version ?? 1` (ArticleContentEditor.tsx) | ✅ |
| UI-13 | 缺少未保存提示 | 添加 `beforeunload` 处理器 (ArticleDetail.tsx) | ✅ |
| UI-14 | 自动保存无指示器 | 添加保存状态显示 (ArticleContentEditor.tsx) | ✅ |
| UI-15 | 加载状态无文字 | 添加 `tip="正在加载文章..."` (ArticleDetail.tsx) | ✅ |
| UI-16 | 空内容提示不友好 | 使用 MarkdownViewer + 自定义 emptyText | ✅ |
| UI-18 | 图片选择无键盘支持 | 添加 `role="checkbox"` + `aria-checked` + `tabIndex` + `onKeyDown` | ✅ |
| UI-19 | 平台选择无 ARIA | 添加 `role="combobox"` + `aria-expanded` + `aria-haspopup` | ✅ |
| UI-20 | Modal 搜索无 autoFocus | 添加 `autoFocus` (PlatformSelectModal.tsx) | ✅ |
| UI-21 | 无响应式适配 | Modal 响应式宽度 + MDEditor 响应式高度 (Grid.useBreakpoint) | ✅ |
| UI-22 | 标题区域无响应式 | 添加 `flexWrap: 'wrap'` + 文本截断处理 | ✅ |

### 13.2 本轮修复项（2026-05-24）

| 编号 | 问题 | 修复方式 | 状态 |
|------|------|---------|------|
| UI-08/25 | 审核操作栏使用 antd 内部 className 伪装 Alert | 替换为正确 antd `Alert` 组件 + `message` prop + 移除 `size="small"` | ✅ |
| UI-04 | 平台选择区 `padding: '4px 11px'` 不在 4px 网格 | 改为 `'4px 12px'` + `borderRadius: 0` | ✅ |
| UI-14 | 自动保存失败静默吞掉 | `console.warn` → `message.error('自动保存失败，请手动保存')` | ✅ |
| UI-17 | 表单按钮位置不合理 | 添加 `position: sticky; bottom: 0` 到 `.form-actions` | ✅ |

### 13.3 待修复项（P2 长期优化）

| 编号 | 问题 | 优先级 | 状态 |
|------|------|--------|------|
| UI-07 | 内联样式提取为 CSS 类 | P1 | ⏳ 待处理 |
| UI-26 | 新建文章步骤引导 | P1 | ⏳ 待处理 |
| UI-24 | 图片模式使用 Tabs 替代 Segmented | P2 | ⏳ 待处理 |
| UI-27 | AI 生成进度反馈 | P2 | ⏳ 待处理 |
| UI-28 | 手工编写模式内容区引导 | P2 | ⏳ 待处理 |

---

*软件UI专家评审完成 — 2026-05-24*
*第二轮 UI 修复完成 — 2026-05-24*
