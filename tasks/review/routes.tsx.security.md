# routes.tsx 安全评审报告

**文件**: `pages/router/routes.tsx`
**评审类型**: 代码安全评审
**评审日期**: 2026-05-26
**评审人**: Code Security Expert

---

## 综合评分：4.8/10 — CONDITIONAL APPROVE

> 前端路由是纵深防御的第一层，但当前实现存在多个可被利用的安全缺陷。修复后预期可达 7.5/10。

---

## 评审维度与评分

| 维度 | 评分 | 状态 |
|------|------|------|
| 权限控制 | 4.0/10 | REQUEST CHANGES |
| 数据信任链 | 4.5/10 | REQUEST CHANGES |
| 代码注入防护 | 7.0/10 | CONDITIONAL APPROVE |
| 错误处理安全 | 5.5/10 | CONDITIONAL APPROVE |
| 配置安全 | 6.0/10 | CONDITIONAL APPROVE |

---

## CRITICAL (C) — 阻断级问题

### C-1: role 来源为 `user?.role ?? ''`，空字符串永远不匹配任何角色，且类型为 `string` 无约束

**位置**: `routes.tsx:50`

```typescript
const role = user?.role ?? '';
```

**问题**: `role` 类型为 `string`，无编译期约束。如果 `user` 对象被篡改（localStorage 可写），攻击者可将 `role` 改为 `'sysadmin'` 绕过全部前端路由检查。前端无任何手段验证 role 是否与 JWT token 中的声明一致。

**攻击场景**:
1. 攻击者以 `view` 角色登录
2. 在 DevTools 中修改 `localStorage.user`，将 `"role":"view"` 改为 `"role":"sysadmin"`
3. 前端路由 `route.roles.includes(role)` 通过 → 攻击者看到所有管理页面 UI
4. 虽然 API 调用会被后端拦截，但 UI 泄露信息（菜单结构、字段名、业务逻辑）

**修复建议**:
```typescript
import { ROLES, type Role } from '../../apis/constants/roles';

// 从 JWT payload 解码验证 role，或定期调 /api/v1/auth/verify 刷新
const role: Role = user?.role ?? '';
if (user && !Object.values(ROLES).includes(user.role)) {
  // role 非法，强制登出
}
```

**严重程度**: CRITICAL — 信息泄露 + 纵深防御破损

---

### C-2: AuthContext 跨标签同步信任 `localStorage.user` 的 role 字段，可跨标签提权

**位置**: `AuthContext.tsx:79-83`

```typescript
if (e.key === USER_KEY) {
  if (e.newValue) {
    try { setUser(JSON.parse(e.newValue)); } catch { /* ignore */ }
  }
}
```

**问题**: 跨标签 storage 事件直接 `JSON.parse(e.newValue)` 后 `setUser`，无任何校验。攻击者可在标签页 A 修改 `localStorage.user` 中的 role，标签页 B 自动同步提权。

**与 routes.tsx 的关联**: routes.tsx 的权限判断完全依赖 `useAuth()` 返回的 `user.role`，而该值可被跨标签注入。

**修复建议**:
- 跨标签同步时，不应直接信任 `e.newValue` 中的 role，应调用 `/api/v1/auth/verify` 重新验证
- 或者在同步后立即校验 role 合法性

**严重程度**: CRITICAL — 跨标签提权攻击向量

---

## HIGH (H) — 高优先级问题

### H-1: `RouteDef.roles` 使用 `string[]` 而非 `Role[]`，无编译期类型安全

**位置**: `routes.tsx:25-29`

```typescript
interface RouteDef {
  path: string;
  roles: string[];   // ← 应为 Role[]
  element: React.ReactNode;
}
```

**问题**: `string[]` 允许任意字符串值通过编译，拼写错误（如 `'sysadmim'`）不会报错，导致路由静默拒绝合法用户或静默放行非法角色。

**修复建议**:
```typescript
import type { Role } from '../../apis/constants/roles';

interface RouteDef {
  path: string;
  roles: Role[];
  element: React.ReactNode;
}
```

**严重程度**: HIGH — 类型安全缺失导致静默安全失效

---

### H-2: 所有路由硬编码角色字符串 `['sysadmin', 'admin']`，未使用 `ROLES` 常量

**位置**: `routes.tsx:53-72`

```typescript
{ path: '/todo', roles: ['sysadmin', 'admin'], element: <TodoPage /> },
// ... 共 19 条路由全部硬编码字符串
```

**问题**: 后端使用 `ROLES.SYSADMIN`、`ROLES.ADMIN`、`ROLES.VIEW` 常量，前端 routes.tsx 直接硬编码字符串。两者之间无引用关系，任何角色名称变更（如 `'sysadmin'` → `'super_admin'`）只改后端不改前端（或反之），导致前后端权限模型漂移。

**修复建议**:
```typescript
import { ROLES } from '../../apis/constants/roles';

{ path: '/todo', roles: [ROLES.SYSADMIN, ROLES.ADMIN], element: <TodoPage /> },
```

**严重程度**: HIGH — 前后端权限模型漂移风险

---

### H-3: `view` 角色在路由层完全未处理，违反铁律

**位置**: `routes.tsx:52-73` — 全部 19 条路由

**问题**: CLAUDE.md 铁律明确规定 `view` 角色只有被授权后查看每日检测报告的权限。但 routes.tsx 中：
- 0 条路由包含 `view` 角色
- 0 条路由指向每日检测报告页面
- 后端 `publishing-schedule.routes.ts` 已允许 `ROLES.VIEW` 访问 `GET /` 端点
- 前端路由与后端 API 权限不一致

**影响**: 当 view 用户通过 API 直接调用发布管理接口时，后端会放行（因为后端允许 VIEW），但前端路由层没有对应页面，形成半成品权限模型。

**修复建议**: 新增 `/publish` 路由的 view 角色支持，或在当前阶段明确添加 view 角色的每日检测报告路由：

```typescript
{ path: '/publish', roles: [ROLES.SYSADMIN, ROLES.ADMIN, ROLES.VIEW], element: <PublishingSchedulePage /> },
```

**严重程度**: HIGH — 违反权限铁律 + 前后端权限不一致

---

### H-4: 403 页面仅显示信息，无审计日志

**位置**: `routes.tsx:83`

```typescript
route.roles.includes(role) ? route.element : <Result status="403" title="无权限" subTitle="您没有访问此页面的权限" />
```

**问题**: 用户访问越权路由时，前端仅展示 403 页面，无任何日志记录。如果攻击者在 localStorage 中伪造 role 后访问敏感路由，前端不会留下任何痕迹。

**修复建议**:
```typescript
// 在 403 分支中添加审计日志
if (!route.roles.includes(role)) {
  console.warn('[Security] Unauthorized route access:', { path: route.path, userRole: role, requiredRoles: route.roles });
  return <Result status="403" ... />;
}
```

**严重程度**: HIGH — 安全事件可观测性为零

---

## MEDIUM (M) — 中优先级问题

### M-1: `PlaceholderPage` 组件包含死代码，可能泄露功能规划信息

**位置**: `routes.tsx:31-40`

```typescript
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="page-container">
    <Typography.Title level={4} ...>{title}</Typography.Title>
    <Result status="info" title="功能建设中" subTitle="该功能正在开发中，敬请期待" />
  </div>
);
```

**问题**: `PlaceholderPage` 已定义但从未使用（19 条路由无一条引用它）。死代码增加攻击面，且"功能建设中"文案可能泄露产品规划。

**修复建议**: 删除未使用的 `PlaceholderPage` 组件。需要占位页面时再按需创建。

**严重程度**: MEDIUM — 信息泄露（产品规划）+ 死代码攻击面

---

### M-2: `Navigate` 组件已 import 但未使用

**位置**: `routes.tsx:2`

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
```

**问题**: `Navigate` 未在路由定义中使用。无用 import 增加打包体积，且 `Navigate` 可用于重定向攻击（如果未来开发者误用 `element={<Navigate to={userInput} />}`）。

**修复建议**: 移除未使用的 `Navigate` import。

**严重程度**: MEDIUM — 死 import + 潜在误用风险

---

### M-3: 路径字符串三处定义（routes.tsx + Sidebar.tsx + API 路由），无共享常量

**位置**: `routes.tsx:53-72`

**问题**: `/todo`、`/knowledge`、`/article`、`/publish` 等路径在 routes.tsx、Sidebar.tsx、后端 API 路由中各定义一次，无共享常量。路径变更时三处需同步修改，遗漏即导致路由失效或越权。

**修复建议**: 抽取路径常量到 `pages/constants/routes.ts`：

```typescript
export const ROUTES = {
  TODO: '/todo',
  KNOWLEDGE: '/knowledge',
  ARTICLE: '/article',
  PUBLISH: '/publish',
  // ...
} as const;
```

**严重程度**: MEDIUM — 路径漂移导致安全失效

---

### M-4: 无根路径 `/` 重定向，默认展示 404

**位置**: `routes.tsx:87`

```typescript
<Route path="*" element={<Result status="404" ... />} />
```

**问题**: 用户访问 `/` 时直接命中通配符路由显示 404，无重定向到默认页。这可能让攻击者推断路由结构（哪些路径返回 404 vs 403 vs 加载中）。

**修复建议**: 添加根路径重定向：
```typescript
<Route path="/" element={<Navigate to="/publish" replace />} />
```

**严重程度**: MEDIUM — 信息泄露（路由枚举）

---

### M-5: lazy 加载无 ErrorBoundary，chunk 加载失败时白屏

**位置**: `routes.tsx:76`

```typescript
<Suspense fallback={<PageLoading />}>
```

**问题**: `Suspense` 只处理加载中状态，不处理加载失败。如果攻击者拦截 CDN 或网络层导致 chunk 加载失败（如 DNS 劫持），用户看到白屏而非错误提示。更危险的是，错误边界缺失可能导致 React 整棵树崩溃。

**修复建议**: 在 `Suspense` 外层包裹 ErrorBoundary：
```typescript
<ErrorBoundary fallback={<Result status="error" title="页面加载失败" subTitle="请刷新页面重试" />}>
  <Suspense fallback={<PageLoading />}>
    <Routes>...</Routes>
  </Suspense>
</ErrorBoundary>
```

**严重程度**: MEDIUM — 拒绝服务（白屏）+ React 树崩溃

---

### M-6: routes 数组在每次渲染时重新创建，19 个 RouteDef + 19 个 JSX 元素

**位置**: `routes.tsx:52-73`

**问题**: `routes` 数组定义在组件函数体内，每次 `PageRouter` 渲染都重新创建 19 个对象 + 19 个 JSX 元素。虽然不直接构成安全漏洞，但渲染抖动可能导致 timing attack（通过渲染时间差异推断用户角色）。

**修复建议**: 将 routes 数组移到组件外部，或使用 `useMemo`：
```typescript
const routes: RouteDef[] = useMemo(() => [...], []);
```

**严重程度**: MEDIUM — 渲染抖动 timing attack 向量

---

## LOW (L) — 低优先级问题

### L-1: `PageLoading` 使用 `Spin` 无超时机制

**位置**: `routes.tsx:42-46`

**问题**: 加载状态无超时保护。如果 chunk 加载挂起（网络层攻击），用户无限等待。

**严重程度**: LOW

---

### L-2: `Typography` 仅用于 `PlaceholderPage` 死代码

**位置**: `routes.tsx:3`

**问题**: `Typography` import 仅被死代码 `PlaceholderPage` 使用，删除死代码后应同步移除。

**严重程度**: LOW

---

### L-3: 404/403 页面无返回导航按钮

**位置**: `routes.tsx:83,87`

**问题**: 403/404 的 `Result` 组件无 `extra` 操作按钮。用户只能通过浏览器后退或手动修改 URL，可能增加社会工程攻击面（用户被诱导手动输入路径）。

**严重程度**: LOW

---

## 安全检查清单

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 前端路由权限控制 | ⚠️ 弱 | 仅 client-side string 比较，可篡改 |
| 后端 API 权限校验 | ✅ 强 | JWT + roleMiddleware 双重校验 |
| role 类型安全 | ❌ 无 | `string[]` 而非 `Role[]` |
| role 常量引用 | ❌ 无 | 硬编码字符串，与后端 ROLES 常量无关联 |
| view 角色处理 | ❌ 缺失 | 铁律要求 view 仅看每日报告，但 0 路由 |
| localStorage 信任链 | ❌ 不安全 | 跨标签同步直接信任 role |
| 审计日志 | ❌ 无 | 越权访问无任何记录 |
| 错误边界 | ❌ 缺失 | lazy 加载失败白屏 |
| 路径常量共享 | ❌ 无 | 三处独立定义 |

---

## 修复优先级

| 优先级 | 编号 | 预估工时 |
|--------|------|----------|
| P0 | C-1, C-2 | 2h |
| P1 | H-1, H-2, H-3 | 1.5h |
| P1 | H-4 | 0.5h |
| P2 | M-1~M-6 | 1h |
| P3 | L-1~L-3 | 0.5h |

**总计预估**: 5.5h

---

## 修复后预期评分

| 修复范围 | 预期评分 |
|----------|----------|
| C 级全部修复 | 6.0/10 |
| C + H 级全部修复 | 7.0/10 |
| 全部修复 | 7.5/10 |

---

## 纵深防御评估

当前安全模型依赖链：

```
localStorage.user.role (可篡改)
  → useAuth().user.role (信任 localStorage)
    → route.roles.includes(role) (字符串比较)
      → 渲染页面 UI (信息泄露)
        → API 调用 (后端 JWT 校验 — 真正的安全边界)
```

**关键结论**: 前端路由保护是**纵深防御第一层**，不应替代后端校验，但也不能完全依赖后端。当前实现的第一层防护形同虚设——localStorage 可写 + 跨标签同步无校验 + 类型无约束。建议：
1. 前端 role 应定期与 `/api/v1/auth/verify` 同步验证
2. 跨标签同步不应直接信任 `localStorage` 中的 role 字段
3. 引入 `Role` 类型约束编译期安全
4. 使用 `ROLES` 常量避免前后端漂移
