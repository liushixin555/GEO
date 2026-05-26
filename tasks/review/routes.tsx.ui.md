# routes.tsx UI 评审报告

**文件**: `pages/router/routes.tsx`
**评审维度**: UI/UX 专家评审
**评审依据**: DESIGN.md (IBM Carbon Design System) + Ant Design 规范 + WCAG 2.1 AA
**评审日期**: 2026-05-26

---

## 综合评分: 5.0/10 — CONDITIONAL APPROVE

routes.tsx 作为全局路由入口，基础 lazy loading + Suspense 结构完整，但存在多处 Carbon Design 偏离、antd 组件误用和 UX 缺陷。修复后预期可达 7.5/10。

---

## C — CRITICAL (阻断)

### C-1: 403/404 Result 页面无操作出口，用户陷入死胡同

**位置**: `routes.tsx:83` / `routes.tsx:87`

```tsx
<Result status="403" title="无权限" subTitle="您没有访问此页面的权限" />
<Result status="404" title="页面不存在" subTitle="请检查访问的地址是否正确" />
```

**问题**: antd `Result` 组件支持 `extra` prop 放置操作按钮（如"返回首页""返回上一页"），当前两个错误页面均无任何出口。用户一旦进入 403/404，无法导航回有效页面，除非使用浏览器后退按钮——这违反 Carbon Design "每个错误状态必须提供明确的恢复路径"原则。

**DESIGN.md 违反**: "Surfaces carried by 1px hairlines and surface change" — 错误状态应提供完整交互闭环。

**修复方案**:
```tsx
<Result
  status="403"
  title="无权限"
  subTitle="您没有访问此页面的权限"
  extra={<Button type="primary" onClick={() => navigate('/')}>返回首页</Button>}
/>
```

**严重度**: CRITICAL — 用户无法自行恢复，形成 UX 死胡同。

---

## H — HIGH

### H-1: PlaceholderPage 死代码仍占据组件定义

**位置**: `routes.tsx:31-40`

```tsx
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="page-container">
    <Typography.Title level={4} style={{ fontWeight: 400, marginBottom: 24 }}>{title}</Typography.Title>
    <Result status="info" title="功能建设中" subTitle="该功能正在开发中，敬请期待" />
  </div>
);
```

**问题**:
1. `PlaceholderPage` 在路由表中从未被引用，属于死代码（已被各实际页面替代）
2. 使用 inline `style={{ fontWeight: 400, marginBottom: 24 }}` 覆盖 antd Typography token——违反 DESIGN.md "通过 CSS 变量驱动样式"原则，且 `marginBottom: 24` 硬编码数值绕过了 CSS 变量系统 `--spacing-lg`
3. `Typography.Title level={4}` 在 Carbon Design 中 heading-04 应为 20px/400 weight，但 antd 默认 level 4 的 font-weight 是 600，inline style `fontWeight: 400` 是对 antd 主题的 hack，应通过 ConfigProvider token 统一配置

**修复方案**: 删除 `PlaceholderPage` 组件（死代码），或如果保留则移除 inline style，改用 CSS class。

---

### H-2: PageLoading 仅有 Spin 无文案无骨架屏，加载态信息不足

**位置**: `routes.tsx:42-46`

```tsx
const PageLoading: React.FC = () => (
  <div className="full-page-loading">
    <Spin size="large" />
  </div>
);
```

**问题**:
1. 仅显示裸 Spin 组件，无加载提示文案。Carbon Design 要求加载状态提供"正在进行中"的文字说明
2. 作为 lazy loading fallback，首次加载时用户看到的是空白页面上一个孤独的 spinner——信息密度为零
3. antd `Spin` 支持 `tip` prop 和 `indicator` 自定义，但均未使用
4. 无 Skeleton 骨架屏作为渐进式加载体验（Carbon Design 推荐 Skeleton > Spinner）

**修复方案**:
```tsx
const PageLoading: React.FC = () => (
  <div className="full-page-loading">
    <Spin size="large" tip="页面加载中...">
      <div className="loading-content" />
    </Spin>
  </div>
);
```

---

### H-3: 无根路径 `/` 重定向，用户访问根路径得到 404

**位置**: `routes.tsx:52-73` (路由表)

**问题**: 路由表中没有 `{ path: '/', ... }` 或根路径重定向规则。用户访问 `https://host/` 时直接命中 `<Route path="*">` 返回 404 页面。对于 SPA 应用，根路径应重定向到用户的默认首页（如 `/todo` 或 `/publish`）。

**DESIGN.md 违反**: Carbon "每个用户状态都有明确的默认着陆点"。

**修复方案**:
```tsx
<Routes>
  <Route path="/" element={<Navigate to="/todo" replace />} />
  {routes.map((route) => (...))}
  <Route path="*" element={<Result ... />} />
</Routes>
```

---

### H-4: 403/404 文案未使用 Carbon 语气指南

**位置**: `routes.tsx:83` / `routes.tsx:87`

**问题**:
1. `title="无权限"` — Carbon 语气指南要求"clear and concise, use active voice, be helpful"。建议改为"无法访问此页面"
2. `subTitle="您没有访问此页面的权限"` — 可行，但缺乏后续行动指引
3. `title="页面不存在"` — 建议改为"找不到此页面"
4. `subTitle="请检查访问的地址是否正确"` — 可行，但应同时提供搜索或返回操作

这不是翻译问题，而是 Carbon Design 语气规范要求错误信息应"描述发生了什么 + 用户可以做什么"。

---

## M — MEDIUM

### M-1: inline style 违反 CSS Token 驱动原则

**位置**: `routes.tsx:33`

```tsx
style={{ fontWeight: 400, marginBottom: 24 }}
```

**问题**: `marginBottom: 24` 硬编码数值应使用 DESIGN.md CSS 变量 `var(--spacing-lg)`。`fontWeight: 400` 应通过 antd ConfigProvider `theme.token` 统一配置，而非逐组件 inline hack。

---

### M-2: `Result` 组件未配置 `icon` 自定义，使用 antd 默认插画风格

**位置**: `routes.tsx:83-87`

**问题**: antd `Result` 的默认图标是 antd 自有风格的 SVG 插画，与 Carbon Design 的"flat geometry, IBM Blue only chromatic accent"视觉语言不一致。Carbon Design 错误页面应使用 IBM Blue 色调的简洁图标或 Carbon Icons。

**修复方案**: 通过 `icon={<WarningOutlined style={{ color: 'var(--color-ink-subtle)', fontSize: 72 }} />}` 替换默认插画。

---

### M-3: 路由无页面 title/meta 信息，浏览器标签页始终显示应用名

**位置**: `routes.tsx:52-73` (RouteDef interface)

**问题**: `RouteDef` 接口仅定义 `path/roles/element`，缺少 `title` 或 `meta` 字段。用户切换路由后浏览器 tab title 不变，无法区分不同页面。这是基础 UX 可用性问题。

```typescript
interface RouteDef {
  path: string;
  roles: string[];
  element: React.ReactNode;
  title?: string;  // 缺失
}
```

---

### M-4: Suspense fallback 无 `aria-busy` 或 `role="status"` 无障碍属性

**位置**: `routes.tsx:42-46` / `routes.tsx:76`

**问题**: `PageLoading` 容器缺少 `role="status"` 和 `aria-live="polite"` 属性。屏幕阅读器用户无法感知页面正在加载。WCAG 2.1 AA 要求动态内容变化需提供无障碍通知。

```tsx
<div className="full-page-loading" role="status" aria-live="polite">
  <Spin size="large" tip="页面加载中..." />
</div>
```

---

### M-5: 权限拒绝无视觉过渡/动画，硬切换体验生硬

**位置**: `routes.tsx:82-84`

```tsx
element={
  route.roles.includes(role) ? route.element : <Result status="403" ... />
}
```

**问题**: 无权限时直接渲染 403 Result，无任何过渡动画或延迟提示。用户可能从正常页面突然看到 403，缺乏视觉连续性。Carbon Design 推荐 UI 状态变化使用 150ms ease 过渡（`--transition-fast`）。

---

## L — LOW

### L-1: `Typography.Title level={4}` 嵌入在未使用的死代码中

**位置**: `routes.tsx:33`

若保留 `PlaceholderPage`，应使用 `heading-04` Carbon token。但既然是死代码，优先删除。

---

### L-2: 路由表 `key={route.path}` 在动态路由下可能重复

**位置**: `routes.tsx:80`

`path` 中包含参数（如 `/knowledge/:baseId`），React key 使用原始 path 字符串不会有碰撞问题（同一 path 只出现一次），但如果未来添加同路径不同参数路由，key 会冲突。当前不构成问题，但建议添加 `index` 辅助。

---

### L-3: `Navigate` 组件已 import 但未在路由表中使用

**位置**: `routes.tsx:2`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
```

`Navigate` 被导入但路由表中没有任何重定向使用它。如果 H-3 修复添加根路径重定向，此 import 即被激活；否则为死 import。

---

## 评分明细

| 维度 | 评分 | 说明 |
|------|------|------|
| Carbon Design 合规 | 4.0/10 | inline style 偏离 token 系统；antd Result 默认风格非 Carbon |
| antd 组件使用 | 6.0/10 | Result 缺 extra prop；Spin 缺 tip；整体结构合理 |
| 可访问性 (WCAG) | 4.5/10 | 加载态无 aria 属性；错误页面无键盘可操作出口 |
| UX 交互闭环 | 4.0/10 | 403/404 死胡同；无根路径重定向；加载态信息不足 |
| 信息架构 | 7.0/10 | lazy loading + Suspense 结构清晰；路由表可维护 |
| **综合** | **5.0/10** | **CONDITIONAL APPROVE** |

---

## 修复优先级

| 优先级 | 编号 | 修复项 | 预估工时 |
|--------|------|--------|----------|
| P0 | C-1 | 403/404 Result 添加 extra 操作按钮 | 0.5h |
| P0 | H-3 | 添加根路径 `/` 重定向 | 0.2h |
| P1 | H-1 | 删除 PlaceholderPage 死代码 | 0.1h |
| P1 | H-2 | PageLoading 添加 tip 文案 + aria 属性 | 0.3h |
| P1 | H-4 | 优化 403/404 文案符合 Carbon 语气 | 0.2h |
| P2 | M-1 | inline style 迁移至 CSS class | 0.2h |
| P2 | M-3 | RouteDef 添加 title 字段 + document.title 更新 | 0.5h |
| P2 | M-4 | 加载态添加 aria 无障碍属性 | 0.1h |
| P3 | M-2 | Result icon 自定义 | 0.3h |
| P3 | M-5 | 权限拒绝添加过渡动画 | 0.3h |

**总预估**: ~2.7h（P0+P1 ~1.3h）

---

## 修复后预期评分: 7.5/10

修复 C-1 + H-1~H-4 后：
- 403/404 有操作出口 → UX 闭环完整
- 根路径有重定向 → 默认着陆点明确
- 加载态有文案 → 信息密度提升
- 死代码清除 → 代码清洁度提升
- 综合可达 7.5/10

如进一步修复全部 M 级问题，可达 8.0/10。
