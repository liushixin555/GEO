# routes.tsx Committer 评审报告

**文件**: `pages/router/routes.tsx` (93行)
**评审人**: Code Committer
**日期**: 2026-05-26
**评审类型**: Committer 审核（综合安全/架构/质量/UI维度，决定是否可合入）

---

## 综合裁决

| 维度 | 评分 | 状态 |
|------|------|------|
| 安全 | 4.8/10 | CONDITIONAL APPROVE |
| 架构 | 6.0/10 | CONDITIONAL APPROVE |
| 质量 | 5.5/10 | CONDITIONAL APPROVE |
| UI | 5.0/10 | CONDITIONAL APPROVE |
| **Committer 综合** | **5.2/10** | **CONDITIONAL APPROVE** |

**裁决**: CONDITIONAL APPROVE — 存在 2 项 CRITICAL 阻断 + 4 项 HIGH，修复后预期可达 **8.0/10**

---

## CRITICAL 阻断项（必须修复，否则 REJECT）

### C-1: role 来源为 `string`，可被 localStorage 篡改

**位置**: `routes.tsx:50`
```tsx
const role = user?.role ?? '';
```

**问题**: `UserData.role` 定义为 `string`（`AuthContext.tsx:8`），实际值来自 localStorage 中反序列化的 JSON。攻击者可在 DevTools 中执行 `localStorage.setItem('user', JSON.stringify({...role: 'sysadmin'}))`，跨标签页触发 `storage` 事件（`AuthContext.tsx:79-81`）后立即提权为 sysadmin。

路由守卫 `route.roles.includes(role)` 对此毫无防御——`includes('sysadmin')` 直接通过。

**影响**: 任何已登录用户可通过篡改 localStorage 获取 sysadmin 全部权限（用户管理、公司管理、系统管理、API 文档）。

**修复方案**:
1. `UserData.role` 类型改为 `Role`（引入 `apis/constants/roles.ts` 的 Role 联合类型）
2. `AuthContext` 的 `storage` 事件处理中增加 role 合法性校验，仅接受 `'sysadmin' | 'admin' | 'view'`
3. 每次 verify 响应后用服务端返回的 role 覆盖 localStorage 中的值（当前已做，但 storage 事件未校验）

### C-2: PlaceholderPage 死代码从未被任何路由引用

**位置**: `routes.tsx:31-40`

**问题**: `PlaceholderPage` 组件定义后，在 `routes` 数组中无任何条目使用它。这是纯粹的死代码——增加 bundle 体积，误导维护者以为存在未完成的路由。

**修复**: 删除 `PlaceholderPage` 组件定义。如后续需要占位页面，在添加路由条目时再定义。

---

## HIGH 级问题（强烈建议修复）

### H-1: role 硬编码字符串散落路由定义中

**位置**: `routes.tsx:53-72`
```tsx
{ path: '/todo', roles: ['sysadmin', 'admin'], ... }
{ path: '/users', roles: ['sysadmin'], ... }
```

**问题**: `apis/constants/roles.ts` 已定义 `ROLES` 常量和 `Role` 类型，但 `routes.tsx` 未使用。20 个路由条目中硬编码了 35 处角色字符串。与 `Sidebar.tsx`（已使用 `ROLES` 常量）风格不一致。拼写错误无编译期保护。

**修复**: 导入 `ROLES` 常量，所有 `roles: ['sysadmin', 'admin']` 改为 `roles: [ROLES.SYSADMIN, ROLES.ADMIN]`。

### H-2: routes 数组每次渲染重建

**位置**: `routes.tsx:52-73`

**问题**: `routes` 数组定义在 `PageRouter` 组件函数体内，每次渲染都重新创建 20 个对象的数组和 20 个 JSX 元素。虽然性能影响有限，但违反 React 最佳实践。

**修复**: 将 `routes` 数组提取为模块级常量（`roles` 校验在 `element` 渲染时通过闭包或额外组件处理）。

### H-3: 403/404 页面为操作出口死胡同

**位置**: `routes.tsx:83, 87`
```tsx
<Result status="403" title="无权限" subTitle="您没有访问此页面的权限" />
<Result status="404" title="页面不存在" subTitle="请检查访问的地址是否正确" />
```

**问题**: 用户看到 403/404 后没有任何可操作出口——无返回按钮、无首页链接。只能通过侧边栏导航离开，但如果是深层链接直接访问则陷入死胡同。

**修复**: 添加 `extra={<Button type="primary" onClick={() => navigate('/')}>返回首页</Button>}` 或等效可操作按钮。

### H-4: lazy 组件无错误边界

**位置**: `routes.tsx:6-23, 76`

**问题**: 18 个 `lazy()` 导入的组件，仅用 `<Suspense fallback={<PageLoading />}>` 包裹。如果任何 chunk 加载失败（网络断开、部署更新导致 hash 变化），会抛出 Uncaught Error 导致白屏。全局 `ErrorBoundary`（`App.tsx:47`）会捕获，但这是最后的兜底，用户丢失路由上下文。

**修复**: 在 `Suspense` 内或每个 `<Route>` 外包裹 `ErrorBoundary`，捕获 chunk 加载失败并提供重试按钮。

---

## MEDIUM 级问题

### M-1: PageLoading 缺少无障碍属性

**位置**: `routes.tsx:42-46`
```tsx
const PageLoading: React.FC = () => (
  <div className="full-page-loading">
    <Spin size="large" />
  </div>
);
```

**问题**: 对比 `AuthGuard.tsx:14` 的 loading 状态（有 `role="status"`, `aria-busy`, `aria-label`），`PageLoading` 缺少所有无障碍属性。屏幕阅读器无法感知加载状态。

**修复**: 添加 `role="status" aria-busy="true" aria-label="页面加载中"`。

### M-2: Result 组件文案未使用 Carbon Design 语气

**位置**: `routes.tsx:83, 87`

**问题**: `"无权限"` 和 `"页面不存在"` 是直白的功能性文案，不符合 DESIGN.md 要求的 IBM Carbon Design System 语气规范。Carbon 推荐积极的、解决问题的语气。

### M-3: 缺少根路径 `/` 重定向

**位置**: `routes.tsx:77-88`

**问题**: 路由表中无根路径 `/` 的处理。用户访问 `/` 时会命中 `path="*"` 的 404 页面。应由 `Sidebar.tsx` 或路由默认重定向到用户有权访问的第一个页面。

---

## LOW 级问题

### L-1: `RouteDef` 接口 `roles` 类型为 `string[]`

**位置**: `routes.tsx:27`
```tsx
roles: string[];
```

应改为 `Role[]` 以获得编译期类型安全。

### L-2: `PlaceholderPage` 使用 inline style

**位置**: `routes.tsx:33`
```tsx
style={{ fontWeight: 400, marginBottom: 24 }}
```

违反 DESIGN.md 关于使用 CSS 变量/Token 的要求。（如 C-2 修复后删除 PlaceholderPage 则自动消除）

### L-3: `React` 导入在 React 17+ JSX Transform 下非必需

**位置**: `routes.tsx:1`

Vite 默认使用 `react-jsx` transform，`import React` 非必需（但保留也无害，属于风格统一问题）。

---

## 与前序评审的交叉验证

| 前序评审 | 关键发现 | Committer 判定 |
|----------|----------|----------------|
| 安全评审 4.8/10 | C1 role 可篡改 | **维持 CRITICAL** — 前端 role 校验只是展示层，无法替代后端校验，但防止 localStorage 篡改提权仍必要 |
| 安全评审 4.8/10 | C2 跨标签同步提权 | **合并到 C-1** — 根因相同：storage 事件未校验 role 合法性 |
| 架构评审 6.0/10 | PlaceholderPage 死代码 | **升级为 CRITICAL** — 死代码在路由文件中尤其危险，误导维护者 |
| 架构评审 6.0/10 | routes 每次重建 | **维持 HIGH** |
| UI 评审 5.0/10 | 403/404 无操作出口 | **维持 HIGH** — 影响用户体验 |

---

## 修复清单

| 编号 | 级别 | 工作量 | 描述 |
|------|------|--------|------|
| C-1 | CRITICAL | 1h | UserData.role 类型收紧 + storage 事件校验 |
| C-2 | CRITICAL | 5min | 删除 PlaceholderPage |
| H-1 | HIGH | 20min | 导入 ROLES 常量替换硬编码字符串 |
| H-2 | HIGH | 15min | routes 数组提取为模块级 |
| H-3 | HIGH | 15min | 403/404 添加操作按钮 |
| H-4 | HIGH | 20min | lazy 组件添加 ErrorBoundary |
| M-1 | MEDIUM | 5min | PageLoading 添加无障碍属性 |
| M-2 | MEDIUM | 5min | Result 文案优化 |
| M-3 | MEDIUM | 10min | 添加根路径重定向 |

**预估总工时**: ~2.5h
**修复后预期评分**: 8.0/10

---

## 最终裁决

**CONDITIONAL APPROVE** — 2 项 CRITICAL + 4 项 HIGH 必须在本 PR 中修复后方可合入。MEDIUM 级问题建议一并修复。修复后预期评分 8.0/10，代码可安全合入主分支。
