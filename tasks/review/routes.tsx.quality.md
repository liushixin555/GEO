# routes.tsx 质量评审报告

**文件**: `pages/router/routes.tsx`
**评审维度**: 软件质量（Quality）
**评审日期**: 2026-05-26
**评审基线**: dev 分支 HEAD

---

## 综合评分: 6.0/10 CONDITIONAL APPROVE

路由职责单一、lazy loading 规范、antd 组件使用正确，但存在死代码、类型安全缺失、每次渲染重建路由数组、缺少 lazy 错误边界等质量问题。

---

## 问题清单

### BLOCKING (B)

#### B-1: PlaceholderPage 死代码从未使用
- **位置**: L31-40
- **问题**: `PlaceholderPage` 组件已定义但路由表中没有任何条目引用它，是完全的死代码。同时 `Typography` import (L3) 仅为此组件引入。
- **影响**: 增加 bundle 体积，维护者误以为有占位页面在使用。
- **修复**: 删除 `PlaceholderPage` 组件定义，移除 `Typography` import。

#### B-2: Navigate import 死代码
- **位置**: L2
- **问题**: `import { Routes, Route, Navigate } from 'react-router-dom'` 中 `Navigate` 未在任何地方使用。AuthGuard.tsx 中使用了 `Navigate`，但 routes.tsx 自身不需要。
- **影响**: 违反 lint 规则，误导读者以为存在重定向逻辑。
- **修复**: 从 import 中移除 `Navigate`。

### HIGH (H)

#### H-1: routes 数组在每次渲染时重建
- **位置**: L52-73
- **问题**: `routes` 数组定义在 `PageRouter` 组件体内，每次渲染都会重新创建 19 个对象 + 19 个 JSX element。虽然 element 本身是 lazy 组件不会重新触发 import，但数组重建是不必要的开销。
- **影响**: 每次 render 分配 19 个对象 + 19 个 React element 对象的内存开销，GC 压力累积。
- **修复**: 将静态路由定义提取到组件外部（常量或独立文件），仅将角色判断保留在渲染逻辑中。推荐模式：
  ```tsx
  const ROUTE_DEFS = [
    { path: '/todo', roles: ['sysadmin', 'admin'], Component: TodoPage },
    // ...
  ];
  // 组件内只做 roles.includes(role) 判断
  ```

#### H-2: RouteDef.roles 类型为 string[] 缺乏类型安全
- **位置**: L27
- **问题**: `roles: string[]` 允许任意字符串，与 `apis/constants/roles.ts` 中定义的 `Role` 类型脱节。Sidebar.tsx 已正确定义了 `type Role = typeof ROLES[keyof typeof ROLES]`，但路由层未复用。
- **影响**: 拼写错误（如 `'sysadmim'`）不会在编译期被捕获；与 Sidebar 的角色定义可能漂移。
- **修复**: 从 `apis/constants/roles.ts` 导入 `Role` 类型，或在前端定义 `SafeUserRole` 类型并应用到 `RouteDef.roles: Role[]`。

#### H-3: 缺少 lazy loading 的错误边界
- **位置**: L76-89
- **问题**: `Suspense` 只处理 loading 态，不处理 chunk 加载失败（网络断开、部署后 hash 变化）。App.tsx 的 `ErrorBoundary` 包裹在最外层，但 lazy 加载失败时的错误信息不够精确，且重置逻辑（清 localStorage 跳登录页）过于激进——chunk 加载失败不需要清除认证状态。
- **影响**: 部署后用户可能看到"页面出现异常"而非"加载失败，请刷新"。
- **修复**: 在 Suspense 同级添加 ChunkErrorBoundary，捕获 `ChunkLoadError` / `Loading chunk` 错误后提供"刷新页面"操作而非"返回登录"。

### MEDIUM (M)

#### M-1: 角色判断逻辑 route.roles.includes(role) 无防御
- **位置**: L83
- **问题**: `role` 来自 `user?.role ?? ''`，如果后端返回了非标准角色值（如 `undefined`、`null`、拼写错误），`includes('')` 永远返回 false，用户看到 403 页面但无法区分"角色未识别"和"确实无权限"。
- **修复**: 使用 `pages/utils/auth.ts` 中的 `getSafeUser()` 获取安全角色（无效值回退为 `view`），或在判断前验证 role 是否在合法集合中。

#### M-2: 403 Result 页面无返回/重定向操作
- **位置**: L83
- **问题**: 当用户无权限时只展示 `Result status="403"`，没有"返回首页"或"返回上一页"按钮，用户只能通过侧边栏导航离开。
- **修复**: 添加 `extra={<Button onClick={() => navigate('/')}>返回首页</Button>}`。

#### M-3: 路由路径字符串散落无常量管理
- **位置**: L53-73
- **问题**: 19 条路由的 path 全部硬编码为字符串字面量，与 Sidebar.tsx 的 menuItems、App.tsx 的 PAGE_TITLES 存在三处重复定义。修改一个路径需要同时改三个文件。
- **影响**: 路径漂移风险，维护成本高。
- **修复**: 提取路径常量到 `pages/constants/routes.ts`，三个文件共用：
  ```ts
  export const ROUTES = {
    TODO: '/todo',
    KNOWLEDGE: '/knowledge',
    // ...
  } as const;
  ```

#### M-4: 无默认路由/根路径重定向
- **位置**: L87
- **问题**: 访问 `/` 时匹配到 `*` 通配符显示 404，但 Layout.tsx 已包裹在 AuthGuard 内，用户已登录却看到"页面不存在"。
- **修复**: 添加 `{ path: '/', roles: ['sysadmin', 'admin'], element: <Navigate to="/todo" replace /> }` 或在 Layout 中处理初始重定向。

### LOW (L)

#### L-1: Spin 组件缺少 aria 属性
- **位置**: L44
- **问题**: `<Spin size="large" />` 没有设置 `role="status"` 和 `aria-label`，屏幕阅读器无法识别加载状态。AuthGuard.tsx 中的 Spin 已正确设置了这些属性。
- **修复**: `<Spin size="large" />` → `<Spin size="large" role="status" aria-label="页面加载中" />`。或为 `PageLoading` 组件添加外层 `role="status"`（当前 `div.full-page-loading` 无 ARIA 属性）。

#### L-2: PageLoading 和 PlaceholderPage 组件缺少 displayName
- **位置**: L31-46
- **问题**: React DevTools 中显示为匿名组件，调试时不够友好。
- **修复**: 添加 `PageLoading.displayName = 'PageLoading';`，删除 PlaceholderPage 前无需处理。

#### L-3: Route key 使用 path 可能导致嵌套路由冲突
- **位置**: L80
- **问题**: `key={route.path}` 在当前扁平路由中无问题，但如果未来添加嵌套路由（如 `/company/add` 和 `/company/edit/:id` 共享前缀），key 值仍然唯一，但可读性差。
- **影响**: 当前无实际影响，属于预防性建议。

#### L-4: RouteDef 接口未导出
- **位置**: L25-29
- **问题**: 如果其他模块需要消费路由定义（如侧边栏生成、面包屑），当前无法导入 RouteDef 类型。
- **影响**: 当前无消费者，暂无影响。

---

## 正面评价

1. **lazy loading 规范** — 所有页面级组件统一使用 `React.lazy` + `Suspense` 懒加载，减少首屏 bundle 体积。
2. **角色守卫集中化** — 所有路由的角色要求在一个数组内声明，比分散在各组件内更容易审计。
3. **antd 组件正确使用** — 403/404 使用 antd `Result` 组件，loading 使用 antd `Spin`，符合项目铁律。
4. **view 角色零暴露** — view 角色不在任何路由的 roles 数组中，间接实现了"view 无权访问任何页面"的约束，符合 CLAUDE.md 规定。
5. **fallback 页面完整** — 403（无权限）和 404（页面不存在）都有用户友好的中文提示。

---

## 路由与侧边栏一致性审计

| 路径 | routes.tsx | Sidebar.tsx | App.tsx PAGE_TITLES | 一致性 |
|------|-----------|-------------|---------------------|--------|
| `/todo` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 待办事项 | ✅ |
| `/knowledge` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 知识库 | ✅ |
| `/article` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 文章管理 | ✅ |
| `/publish` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 发布管理 | ✅ |
| `/project` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 项目 | ✅ |
| `/skills` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 技能管理 | ✅ |
| `/users` | ✅ sysadmin | ✅ sysadmin | ✅ 用户管理 | ✅ |
| `/company` | ✅ sysadmin | ✅ sysadmin | ✅ 企业管理 | ✅ |
| `/sysadmin` | ✅ sysadmin | ✅ sysadmin | ✅ 系统设置 | ✅ |
| `/swagger` | ✅ sysadmin | ✅ sysadmin | ✅ API 文档 | ✅ |

路由权限与侧边栏菜单完全一致，无漂移。

---

## 修复优先级与预估工时

| 优先级 | 编号 | 问题 | 预估工时 |
|--------|------|------|----------|
| BLOCKING | B-1 | PlaceholderPage 死代码 | 5 min |
| BLOCKING | B-2 | Navigate import 死代码 | 1 min |
| HIGH | H-1 | routes 数组每次渲染重建 | 15 min |
| HIGH | H-2 | roles 类型缺乏类型安全 | 10 min |
| HIGH | H-3 | 缺少 lazy 错误边界 | 20 min |
| MEDIUM | M-1 | 角色判断无防御 | 10 min |
| MEDIUM | M-2 | 403 无返回操作 | 5 min |
| MEDIUM | M-3 | 路径字符串无常量管理 | 30 min |
| MEDIUM | M-4 | 无根路径重定向 | 10 min |
| LOW | L-1 | Spin 缺少 aria | 3 min |
| LOW | L-2 | 缺少 displayName | 3 min |

**总预估**: ~2h（含测试验证）

---

## 修复后预期评分: 8.5/10

修复 B 级死代码 + H 级类型安全/性能/错误边界后，路由模块可达到高质量标准。M 级路径常量管理为锦上添花。
