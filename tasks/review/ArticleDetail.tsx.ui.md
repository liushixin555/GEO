# ArticleDetail.tsx UI 专家评审

**文件**: `pages/article/ArticleDetail.tsx`
**评审维度**: DESIGN.md 合规性 + antd 规范 + UI/UX 最佳实践
**评审日期**: 2026-05-26
**评分**: 6.0/10 CONDITIONAL APPROVE

---

## 总评

ArticleDetail.tsx 在页面结构上遵循了 `.page-container` + `.form-actions` 的既定模式，antd 组件使用基本合规。但存在多项 DESIGN.md 合规偏差和 UX 缺陷：大面积 inline style 违反设计系统原则、Collapse 组件未经圆角覆盖、加载态/空态缺乏 Carbon 设计规范、按钮语义不清晰、以及页面级 y 轴滚动条问题未根治。

---

## BLOCKING 问题（必须修复）

### B-01. Collapse 组件未覆盖 border-radius → 违反 Carbon flat-square 美学

**位置**: 第 208-211 行

```tsx
<Collapse
  defaultActiveKey={isNew ? ['settings', 'content'] : ['content']}
  items={collapseItems}
  style={{ marginBottom: 16 }}
/>
```

**问题**: antd Collapse 默认 `border-radius: 8px`（antd v5 默认圆角），而 DESIGN.md 规定所有容器使用 `{rounded.none}` 0px。全局 CSS 已覆盖 `.ant-alert`, `.ant-menu`, `.ant-tooltip` 等组件的圆角为 0，但遗漏了 `.ant-collapse`。

**DESIGN.md 违反项**:
- `{rounded.none}` — "Default — every button, card, input, container"
- "Don't round corners on buttons, cards, or inputs. Even 4px rounded corners break the Carbon look."

**修复**: 在 `global.css` 中添加 `.ant-collapse, .ant-collapse > .ant-collapse-item, .ant-collapse-content { border-radius: 0 !important; }`

**严重性**: BLOCKING — 视觉上直接破坏 Carbon 品牌一致性

---

### B-02. 大量 inline style 未使用设计令牌 → 无法保证一致性

**位置**: 第 135 行, 第 199-201 行, 第 205 行

**问题**: 组件内存在大量硬编码的 inline style 值：

| 位置 | 硬编码值 | 应使用令牌 |
|---|---|---|
| 第 135 行 `minHeight: 400` | 400px | `var(--spacing-xxl)` × 比例或 CSS 类 |
| 第 199 行 `gap: 12` | 12px | `var(--spacing-sm)` |
| 第 199 行 `marginBottom: 16` | 16px | `var(--spacing-md)` |
| 第 201 行 `fontWeight: 400` | 400 | `{typography.card-title}` fontWeight |
| 第 201 行 `fontSize: 24` | 24px | `{typography.card-title}` fontSize |
| 第 211 行 `marginBottom: 16` | 16px | `var(--spacing-md)` |

**DESIGN.md 违反项**: DESIGN.md 定义了完整的 spacing/typography 令牌体系，inline style 硬编码绕过了设计系统，导致：
1. 无法通过令牌统一调整
2. 与 CSS 变量系统脱节
3. 代码审查时无法通过 grep 验证合规性

**修复**: 将 inline style 提取为 CSS 类，使用 CSS 变量

**严重性**: BLOCKING — 系统性地绕过设计令牌

---

### B-03. 页面级 `overflow-y: auto` 违反铁律第 8 条

**位置**: `.page-container` CSS（global.css 第 218 行）

```css
.page-container {
  overflow-y: auto;
}
```

**问题**: CLAUDE.md 铁律第 8 条明确规定："页面内严禁出现 y 轴滚动条"。ArticleDetail 使用 `.page-container` 类，该类自带 `overflow-y: auto`。当文章内容较长（settings + content 双面板展开时），必然产生 y 轴滚动条。

虽然这是全局 CSS 的问题而非本文件特有，但 ArticleDetail 作为内容密集型页面（Collapse 双面板 + 底部操作栏），是受影响最严重的页面之一。

**修复建议**: 在 ArticleDetail 中通过 Collapse 折叠和内容分页控制内容量，或与团队讨论是否需要修改 `.page-container` 的 `overflow-y` 策略

**严重性**: BLOCKING — 违反项目铁律

---

## HIGH 问题（强烈建议修复）

### H-01. 加载态 Spin 组件未遵循 Carbon 设计规范

**位置**: 第 134-136 行

```tsx
<div className="page-container" style={{
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', minHeight: 400
}}>
  <Spin size="large" tip="正在加载文章..." />
</div>
```

**问题**:
1. `minHeight: 400` 硬编码，应使用设计令牌
2. 全部使用 inline style 而非 CSS 类
3. Carbon Design 的加载态模式是：骨架屏（Skeleton）或居中 Spin + IBM Blue 主色调
4. Spin 外层包裹了一个与正常页面布局完全不同的 `.page-container`，破坏了页面结构一致性
5. antd Spin 的 `tip` 属性在 `size="large"` 下的排版可能不符合 `{typography.body-sm}` 规范

**DESIGN.md 参考**: Carbon 使用 Skeleton 作为首选加载态，Spin 作为简单替代

**修复**: 使用 antd `<Skeleton active paragraph={{ rows: 6 }} />` 替代 Spin，或至少将 inline style 提取为 CSS 类

---

### H-02. 空态展示过于简陋

**位置**: 第 138-140 行

```tsx
if (!isNew && !detail.article) {
  return <div className="page-container"><Typography.Text>文章不存在</Typography.Text></div>;
}
```

**问题**:
1. 空态仅显示纯文字"文章不存在"，无图标、无操作引导
2. 不符合 antd Empty 组件规范
3. 不符合 Carbon Design 的空态模式（应包含图标 + 描述 + 操作按钮）
4. `Typography.Text` 无样式变体，默认字体大小和颜色可能不符合 `{typography.body}` / `{colors.ink-muted}` 规范

**修复**: 使用 antd `<Empty description="文章不存在">` 配合返回按钮

---

### H-03. 标题栏 Typography.Title 内联样式覆盖了 Carbon 排版令牌

**位置**: 第 201 行

```tsx
<Typography.Title level={4} style={{
  margin: 0, flex: 1, minWidth: 0,
  fontWeight: 400, fontSize: 24,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
}}>
```

**问题**:
1. `fontWeight: 400` + `fontSize: 24` 对应 DESIGN.md 的 `{typography.card-title}` 令牌，但通过 inline style 硬编码
2. antd `Typography.Title level={4}` 默认 `fontWeight: 600`（bold），强制覆盖为 400 意味着选择错误的 Typography 层级
3. `overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'` 应通过 CSS 类实现，不应通过 inline style
4. 缺少 `letterSpacing` 设置——`{typography.card-title}` 的 letterSpacing 为 0，但 antd Typography 的默认 letter-spacing 可能不同

**DESIGN.md 参考**: `{typography.card-title}` — fontFamily: IBM Plex Sans, fontSize: 24px, fontWeight: 400, lineHeight: 1.33, letterSpacing: 0

**修复**: 提取为 CSS 类 `.article-detail-title`，使用 CSS 变量；或使用 `Typography.Text` 替代 `Typography.Title`（因为 Title level 4 的语义是 h4，但这里的 fontWeight 被覆盖为 400）

---

### H-04. 按钮文案语义不精确 — "提交给AI" vs "提交"

**位置**: 第 221-225 行

```tsx
{(isNew || detail.article?.status === 'draft') && writeMode !== 'manual' && (
  <Button type="primary" loading={detail.saving} onClick={() => submitForm(handleSave)}>提交给AI</Button>
)}
{(isNew || detail.article?.status === 'draft') && writeMode === 'manual' && (
  <Button type="primary" loading={detail.saving} onClick={() => submitForm(handleSave)}>提交</Button>
)}
```

**问题**:
1. 两个按钮触发同一个 `submitForm(handleSave)` 回调，但文案不同——"提交给AI" vs "提交"
2. "提交" 语义模糊——用户不确定提交后会发生什么（保存？发布？送审？）
3. Carbon Design 按钮文案应清晰描述操作结果（"保存草稿" / "提交AI生成" / "创建文章"）
4. 已创建文章的 draft 状态仍显示"提交给AI"，但此时可能只是保存设置修改

**修复**: 使用更具描述性的文案："保存并生成"（AI 模式）、"保存草稿"（手动模式已创建文章）、"创建文章"（新建）

---

### H-05. 返回按钮无 aria-label 和 hover 反馈

**位置**: 第 200 行

```tsx
<Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
```

**问题**:
1. 无文字说明，纯图标按钮缺少 `aria-label`，不符合 WCAG 2.1 AA 无障碍标准
2. `type="text"` 按钮的 hover 状态在 antd v5 中是浅灰背景，与 Carbon 的 `button-ghost` 规范（无背景直到 hover，hover 时蓝色文字）不完全匹配
3. 按 DESIGN.md `button-ghost` 规范：`text: {colors.primary}`，但 antd `type="text"` 默认文字颜色是 `{colors.ink}`，不是 IBM Blue

**修复**: 添加 `aria-label="返回文章列表"`；验证 antd 主题 token 中 `colorText` 是否已配置为 IBM Blue

---

### H-06. status Tag 颜色使用 antd 预设而非 Carbon 语义色

**位置**: 第 37 行, 第 204-206 行, types.ts 第 78-84 行

```tsx
const statusCfg = detail.article
  ? (STATUS_CONFIG[detail.article.status] || { label: detail.article.status, color: 'default' })
  : null;
// ...
<Tag color={statusCfg.color}>{statusCfg.label}</Tag>
```

```ts
// types.ts
draft: { label: '草稿', color: 'default' },
generating: { label: '生成中', color: 'processing' },
pending_review: { label: '待审核', color: 'warning' },
approved: { label: '已通过', color: 'success' },
```

**问题**:
1. antd Tag 的预设颜色名（`'default'`, `'processing'`, `'warning'`, `'success'`, `'error'`）与 Carbon 语义色不对齐：
   - antd `processing` = 蓝色 → 但 Carbon 的 info 色 = `{colors.primary}` IBM Blue，非 antd 默认蓝
   - antd `warning` = 橙色 → 但 Carbon `{colors.semantic-warning}` = `#f1c21b` 黄色
   - antd `success` = 绿色 → 接近但非精确匹配 Carbon `{colors.semantic-success}` = `#24a148`
2. antd 预设 Tag 有默认圆角，违反 `{rounded.none}`

**修复**: 使用自定义颜色值而非预设名：`color: '#f1c21b'`（warning）、`color: '#24a148'`（success）等；同时在 global.css 覆盖 `.ant-tag` 的 border-radius 为 0

---

### H-07. `marginBottom: 16` 使用数字而非 CSS 变量

**位置**: 第 211 行

```tsx
style={{ marginBottom: 16 }}
```

**问题**: DESIGN.md 定义了完整的 spacing 令牌系统。`16px` 对应 `{spacing.md}`，但通过 inline style 硬编码绕过了令牌系统。同文件中其他位置也使用了数字间距值（gap: 12 等），导致间距一致性无法通过令牌保证。

**修复**: 提取为 CSS 类使用 `margin-bottom: var(--spacing-md)`

---

## MEDIUM 问题（建议修复）

### M-01. Popconfirm 确认对话框文案可优化

**位置**: 第 216-217 行

```tsx
<Popconfirm title="确认删除此文章？" description="删除后不可恢复"
  onConfirm={handleDelete} okText="确认" cancelText="取消">
```

**问题**:
1. antd Popconfirm 默认有圆角和阴影，需要覆盖以符合 Carbon
2. "确认" / "取消" 按钮文案过于通用，Carbon 建议使用具体动作词："删除" / "取消"
3. 全局 CSS 未覆盖 Popconfirm 的 border-radius

---

### M-02. useEffect 依赖数组中的 `detail.autoSave` 引用不稳定

**位置**: 第 61-69 行

```tsx
useEffect(() => {
  const timer = setInterval(async () => {
    const result = await detail.autoSave(imageList);
    // ...
  }, 5 * 60 * 1000);
  return () => clearInterval(timer);
}, [isNew, id, projectId, imageList, detail.autoSave, navigate]);
```

**问题**: `detail.autoSave` 如果未用 `useCallback` 包装，每次渲染都会产生新引用，导致 interval 每 5 秒（非 5 分钟）就重建一次。这是功能 bug，但也表现为 UI 层面的性能抖动——interval 频繁重建可能导致短暂卡顿。此问题在架构评审中已有记录，此处不再提升严重性。

---

### M-03. 新建文章时 Collapse 双面板默认展开可能导致内容溢出

**位置**: 第 209 行

```tsx
defaultActiveKey={isNew ? ['settings', 'content'] : ['content']}
```

**问题**: 新建文章时 settings + content 双面板同时展开，在有限视口高度下可能超出 `.page-container` 区域，触发 y 轴滚动条（违反铁律第 8 条）。

**修复**: 新建文章时仅展开 settings 面板，content 面板在用户填写设置后手动展开；或在 content 面板内容区设置 `max-height` + 内部滚动

---

### M-04. 缺少页面级 breadcrumbs

**位置**: 整个文件

**问题**: ArticleDetail 无面包屑导航。页面仅有一个返回按钮 `<ArrowLeftOutlined />`。Carbon Design 和 antd Pro 的标准模式是：面包屑 + 页面标题。面包屑提供上下文：`文章管理 > 文章详情` 或 `文章管理 > 新建文章`。

虽然 `.page-breadcrumb` CSS 类已在 global.css 中定义，但本页面未使用。

---

### M-05. `marginBottom: 16` 写法不一致

**位置**: 多处

**问题**: 组件内有些地方用 `style={{ marginBottom: 16 }}`，有些用 `style={{ marginBottom: 12 }}`（子组件 ArticleReviewActions），spacing 值不一致且不使用令牌，违反 DESIGN.md spacing 体系。

---

### M-06. 条件渲染的按钮区域缺少过渡动画

**位置**: 第 213-227 行

```tsx
{isSettingsEditable && (
  <div className="form-actions">
    {!isNew && detail.article?.status === 'draft' && permissions.canDelete && (
      <Popconfirm ...><Button danger loading={detail.deleting}>删除文章</Button></Popconfirm>
    )}
    {(isNew || detail.article?.status === 'draft') && writeMode !== 'manual' && (
      <Button type="primary" ...>提交给AI</Button>
    )}
    {(isNew || detail.article?.status === 'draft') && writeMode === 'manual' && (
      <Button type="primary" ...>提交</Button>
    )}
  </div>
)}
```

**问题**: 按钮区域的显示/隐藏通过 React 条件渲染直接切换，无过渡动画。当状态变化（如文章状态从 draft → generating）时，按钮区域突然消失，用户体验不连贯。antd 的 CSSMotion 或简单的 CSS transition 可改善。

---

## LOW 问题（可选优化）

### L-01. `Typography.Title level={4}` 选择不合理

使用 h4 语义但覆盖 fontWeight 为 400。如果设计意图是 `{typography.card-title}`（24px, weight 400），应直接使用 `Typography.Text` + CSS 类，而非 Title 组件 + 样式覆盖。

### L-02. 删除按钮 `detail.deleting` 状态缺少视觉区分

删除按钮 `loading` 态和 `danger` 样式同时存在，但无 disabled 态处理（当 `detail.deleting` 时按钮应同时 `disabled`）。

### L-03. 页面标题的 `overflow: hidden` 在极小视口下可能完全隐藏标题文字

新建文章时标题固定为"新建文章"不会超长，但编辑已有文章时标题可能很长。`text-overflow: ellipsis` 是正确方案，但缺少 `title` 属性供鼠标悬停查看完整标题。

---

## DESIGN.md 合规检查清单

| 检查项 | 状态 | 备注 |
|---|---|---|
| 圆角 `{rounded.none}` 0px | ❌ | Collapse / Tag 未覆盖 |
| 颜色使用 IBM Blue `{colors.primary}` | ⚠️ | Tag 预设色与 Carbon 不对齐 |
| 排版令牌（size/weight/spacing） | ❌ | 大量 inline style 硬编码 |
| IBM Plex Sans 字体 | ✅ | 全局已配置 |
| 间距使用 `{spacing.*}` 令牌 | ❌ | inline style 硬编码 12/16/400 等 |
| 无阴影（hairline + surface 替代） | ✅ | 无 box-shadow 使用 |
| 按钮 `{typography.button}` | ✅ | antd Button 全局已配置 |
| 表单输入 `{rounded.none}` | ✅ | 全局已覆盖 |
| 骨架屏/加载态规范 | ❌ | 使用 Spin 非 Skeleton |
| 空态规范 | ❌ | 纯文字无 Empty 组件 |
| 无障碍 (WCAG) | ❌ | 图标按钮缺 aria-label |
| y 轴滚动条禁止 | ❌ | `.page-container` overflow-y: auto |

---

## 评分明细

| 维度 | 分数 | 权重 | 加权分 |
|---|---|---|---|
| DESIGN.md 合规性 | 4.5/10 | 30% | 1.35 |
| antd 组件使用规范 | 7.0/10 | 20% | 1.40 |
| UX 交互设计 | 6.5/10 | 25% | 1.63 |
| 无障碍 / A11y | 4.0/10 | 10% | 0.40 |
| 代码可维护性（inline style 问题） | 5.5/10 | 15% | 0.83 |
| **总分** | | | **6.0/10** |

---

## 修复优先级建议

| 优先级 | 编号 | 修复内容 | 预估工时 |
|---|---|---|---|
| P0 | B-01 | global.css 添加 `.ant-collapse` border-radius: 0 覆盖 | 10min |
| P0 | B-02 | 提取 inline style 为 CSS 类，使用设计令牌 | 30min |
| P1 | H-01 | 加载态改用 Skeleton 或提取为 CSS 类 | 20min |
| P1 | H-02 | 空态改用 antd Empty 组件 | 10min |
| P1 | H-03 | 标题栏提取为 CSS 类 + 正确 Typography 层级 | 15min |
| P1 | H-04 | 按钮文案精确化 | 15min |
| P1 | H-05 | 返回按钮添加 aria-label | 5min |
| P1 | H-06 | Tag 颜色对齐 Carbon 语义色 + 覆盖 border-radius | 15min |
| P2 | M-01~M-06 | 各项中等优化 | 45min |

**总修复工时估算**: ~2.5h
