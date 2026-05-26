# App.tsx UI 评审报告

**文件**: `pages/App.tsx`
**评审日期**: 2026-05-26
**评审维度**: Carbon Design System 合规 / Ant Design 使用 / 无障碍访问 / 响应式 / 性能
**评审范围**: App.tsx + 直接依赖组件（ErrorBoundary、AuthGuard、Layout、main.tsx、index.html）

---

## 综合评分: 6.5/10 — CONDITIONAL APPROVE

App.tsx 作为根组件结构清晰、职责单一，Provider 嵌套顺序正确。主要问题集中在无障碍访问（a11y）和页面标题管理上。

---

## 评审项详情

### UI-01 页面标题(document.title)未随路由动态更新 — MEDIUM

**现状**: `index.html` 硬编码 `<title>薄云商机倍增服务</title>`，路由切换到不同页面时 document.title 不变。仅 `swagger/index.tsx` 中手动设置了标题。

**问题**: 违反 WCAG 2.1 SC 2.4.2（Page Titled），浏览器标签页和屏幕阅读器无法区分当前页面。

**修复方案**: 在 App.tsx 中添加全局路由标题管理 hook，根据路由 path 映射标题。

**影响文件**: `pages/App.tsx`, `pages/router/routes.tsx`

---

### UI-02 ErrorBoundary Result 组件缺少无障碍 role — MEDIUM

**现状**: `ErrorBoundary.tsx:31` 的 `<Result>` 未添加 `role="alert"` 属性。

**问题**: 屏幕阅读器无法自动播报错误边界触发的错误状态。WCAG 2.1 SC 4.1.3（Status Messages）。

**修复方案**: 为 Result 添加 `role="alert"` 和 `aria-live="assertive"`。

**影响文件**: `pages/components/ErrorBoundary.tsx`

---

### UI-03 AuthGuard loading 状态缺少 aria-busy — LOW

**现状**: `AuthGuard.tsx:14` 的 loading 容器 `<div className="full-page-loading">` 缺少 `aria-busy="true"` 和 `role="status"`。

**问题**: 辅助技术无法感知页面正在加载。

**修复方案**: 添加 `aria-busy="true"` 和 `role="status"` 属性。

**影响文件**: `pages/components/AuthGuard.tsx`

---

### UI-04 Layout skip-to-content 焦点样式缺少可见焦点环 — LOW

**现状**: `Layout.tsx:66` 的 skip-to-content 链接在 CSS 中有 `:focus` 样式（`global.css:162`），但 `left: -9999px` → `position: fixed` 的切换依赖 `:focus` 伪类，在某些浏览器中 Tab 键可能不触发 `:focus`（需 `:focus-visible`）。

**问题**: 键盘用户可能无法看到跳转链接。

**修复方案**: 使用 `:focus-visible` 替代 `:focus`，确保键盘焦点可见。

**影响文件**: `pages/styles/global.css`

---

### UI-05 ErrorBoundary handleReset 清空整个 localStorage — HIGH

**现状**: `ErrorBoundary.tsx:24` 的 `handleReset` 执行 `localStorage.clear()`，清除所有 localStorage 数据。

**问题**: 可能清除其他应用或同源页面的数据。应仅清除本项目相关 key。

**修复方案**: 使用精确的 key 删除代替 `localStorage.clear()`。

**影响文件**: `pages/components/ErrorBoundary.tsx`

---

### UI-06 Layout 移动端 overlay 缺少键盘关闭支持 — LOW

**现状**: `Layout.tsx:63` 的 mobile overlay 仅支持 `onClick` 关闭，不支持 Escape 键。

**问题**: 键盘用户无法通过 Escape 关闭侧边栏 overlay。

**修复方案**: 添加 Escape 键监听。

**影响文件**: `pages/components/Layout.tsx`

---

## 修复优先级

| 编号 | 优先级 | 状态 | 说明 |
|------|--------|------|------|
| UI-05 | HIGH | ✅ 已修复 | ErrorBoundary localStorage 精确 key 删除替代 clear() |
| UI-01 | MEDIUM | ✅ 已修复 | App.tsx usePageTitle hook 动态管理 document.title |
| UI-02 | MEDIUM | ✅ 已修复 | ErrorBoundary Result 添加 role="alert" + aria-live="assertive" |
| UI-03 | LOW | ✅ 已修复 | AuthGuard loading 添加 aria-busy="true" + role="status" |
| UI-04 | LOW | ✅ 已修复 | skip-to-content :focus 替换为 :focus-visible |
| UI-06 | LOW | ✅ 已修复 | Layout 移动端添加 Escape 键监听关闭 overlay |

---

## 已通过的评审项

- ✅ Provider 嵌套顺序正确：ErrorBoundary → AuthProvider → AppContextProvider → Routes
- ✅ 使用 Ant Design 组件（Result、Button、Spin、Typography）
- ✅ Carbon Design 主题通过 ConfigProvider 全局注入
- ✅ IBM Plex Sans 字体通过 @fontsource 本地加载
- ✅ CSP 策略在 index.html 中配置
- ✅ lang="zh-CN" 在 index.html 中设置
- ✅ React.StrictMode 在 main.tsx 中启用
- ✅ 路由懒加载 + Suspense fallback 在 routes.tsx 中配置
- ✅ JWT 认证守卫在 AuthGuard 中正确实现
- ✅ 跨 Tab 同步通过 StorageEvent 在 AuthContext 中实现
