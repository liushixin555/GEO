# routes.tsx 架构评审报告

**文件**: `pages/router/routes.tsx`
**评审维度**: 软件架构（Architecture）
**评审日期**: 2026-05-26
**评审基线**: dev 分支 HEAD

---

## 综合评分: 6.0/10 CONDITIONAL APPROVE

路由模块职责单一、lazy loading 规范、角色守卫集中化，但存在死代码(B-1/B-2)、routes 数组每次渲染重建(H-1)、roles 类型缺安全(H-2)、缺少 lazy 错误边界(H-3)、路径字符串三处重复(M-3)、无根路径重定向(M-4) 等架构问题。修复后预期 8.5/10。

---

## 架构层次分析

### 路由架构层次

```
App.tsx (Root Routes)
  ├── /login → LoginPage
  └── /* → AuthGuard
        └── Layout (Sidebar + Content)
              └── PageRouter (routes.tsx)
                    ├── Suspense + lazy loading
                    ├── Role Guard (route.roles.includes)
                    ├── 403 Result
                    └── 404 Result
```

### 架构优点

1. **认证/授权分层清晰** — App.tsx 管认证（AuthGuard），routes.tsx 管授权（角色守卫），职责不混淆
2. **lazy loading 全覆盖** — 19 个页面组件全部使用 `React.lazy` 懒加载，首屏 bundle 体积优化到位
3. **角色守卫声明式** — 路由权限以数据驱动方式声明，比各页面内 `if (!hasRole)` 判断更易审计维护
4. **view 角色零暴露** — view 角色不在任何路由的 roles 数组中，架构层面保证 view 无法访问任何功能页面
5. **antd 组件正确使用** — 403/404 使用 antd Result，loading 使用 antd Spin，符合项目铁律

---

## 问题清单

### BLOCKING (B)

#### B-1: PlaceholderPage 死代码从未使用
- **位置**: L31-40
- **问题**: `PlaceholderPage` 组件已定义但路由表中无任何条目引用它，是完全的死代码。`Typography` import (L3) 仅为此组件引入。
- **架构影响**: 违反 YAGNI 原则，增加 bundle 体积，误导维护者以为存在占位页面路由。
- **修复**: 删除 `PlaceholderPage` 及 `Typography` import。

#### B-2: Navigate 死 import
- **位置**: L2
- **问题**: `import { Routes, Route, Navigate }` 中 `Navigate` 未在文件任何位置使用。AuthGuard.tsx 使用了 `Navigate`，但 routes.tsx 自身不需要。
- **架构影响**: 违反最小依赖原则，误导读者以为存在重定向逻辑。
- **修复**: 从 import 移除 `Navigate`。

---

### HIGH (H)

#### H-1: routes 数组每次渲染重建
- **位置**: L52-73（组件体内）
- **问题**: `routes` 数组定义在 `PageRouter` 函数体内，每次渲染都会重新创建 19 个 `RouteDef` 对象 + 19 个 JSX element。虽然 lazy 组件不会重新触发 `import()`，但对象分配和 GC 压力是可避免的开销。
- **架构影响**:
  - 违反「静态数据提取到模块级」的性能最佳实践
  - 19 个 `{ path, roles, element }` 对象 × N 次渲染 = 不必要的内存分配
  - React 在 reconciliation 时对 element 做浅比较，每次都是新引用
- **修复**: 将静态路由定义提取到组件外部，仅将角色判断保留在渲染逻辑中：
  ```tsx
  // 模块级静态定义
  const ROUTE_DEFS = [
    { path: '/todo', roles: ['sysadmin', 'admin'], Component: TodoPage },
    // ...
  ] as const;

  // 组件内只做权限判断
  const PageRouter: React.FC = () => {
    const { user } = useAuth();
    const role = user?.role ?? '';
    return (
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {ROUTE_DEFS.map(({ path, roles, Component }) => (
            <Route key={path} path={path} element={
              roles.includes(role) ? <Component /> : <Result status="403" ... />
            } />
          ))}
          <Route path="*" element={<Result status="404" ... />} />
        </Routes>
      </Suspense>
    );
  };
  ```

#### H-2: RouteDef.roles 类型为 `string[]` 缺乏类型安全
- **位置**: L25-29
- **问题**: `RouteDef` 接口的 `roles` 字段为 `string[]`，允许任意字符串通过编译。与 Sidebar.tsx 的 `type Role = typeof ROLES[keyof typeof ROLES]`、`apis/constants/roles.ts` 的 `ROLE_LABELS` 定义脱节。
- **架构影响**:
  - 拼写错误（如 `'sysadmim'`）不会在编译期被捕获
  - 三处角色定义（routes.tsx `string[]`、Sidebar.tsx `Role`、roles.ts `ROLE_LABELS`）无类型关联
  - 新增角色时无法通过编译器驱动更新所有路由
- **修复**: 从 `apis/constants/roles.ts` 导入角色类型，或在前端建立统一的 `Role` 类型：
  ```tsx
  import { ROLE_LABELS } from '../../apis/constants/roles';
  type Role = keyof typeof ROLE_LABELS;

  interface RouteDef {
    path: string;
    roles: Role[];
    element: React.ReactNode;
  }
  ```

#### H-3: 缺少 lazy loading 错误边界
- **位置**: L76-89
- **问题**: `Suspense` 只处理 loading 态，不处理 chunk 加载失败（网络断开、部署后 hash 变化导致 404）。App.tsx 的 `ErrorBoundary` 包裹在最外层，但 lazy 加载失败时的错误处理过于激进——清 localStorage 跳登录页，而 chunk 加载失败不需要清除认证状态。
- **架构影响**:
  - 部署后用户可能被强制登出（ErrorBoundary 误判为认证问题）
  - 缺少 chunk 加载失败的精确恢复策略（"刷新页面"而非"重新登录"）
  - 错误边界粒度过粗，无法区分 chunk 错误和业务逻辑错误
- **修复**: 在 Suspense 同级添加 `ChunkErrorBoundary`，精确捕获 `ChunkLoadError` / `Loading chunk` 错误：
  ```tsx
  class ChunkErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };
    static getDerivedStateFromError(error: Error) {
      return { hasError: /Loading chunk|ChunkLoadError/.test(error.message) };
    }
    render() {
      if (this.state.hasError) {
        return <Result status="error" title="页面加载失败"
          extra={<Button onClick={() => window.location.reload()}>刷新页面</Button>} />;
      }
      return this.props.children;
    }
  }
  ```

---

### MEDIUM (M)

#### M-1: 角色判断无防御性编程
- **位置**: L49-50, L83
- **问题**: `role` 来自 `user?.role ?? ''`，如果后端返回了非标准角色值，`includes('')` 永远返回 false，用户看到 403 但无法区分"角色未识别"和"确实无权限"。
- **架构影响**: 缺少信任边界验证——前端默认信任后端返回的 role 值，无兜底逻辑。
- **修复**: 在角色判断前验证 role 是否在合法集合中，无效值回退为 `view`（最安全默认值）。

#### M-2: 403 Result 页面无导航操作
- **位置**: L83
- **问题**: 无权限时只展示 `Result status="403"`，没有"返回首页"按钮，用户只能通过侧边栏离开。
- **架构影响**: 用户体验断裂——被拒后无明确退出路径。
- **修复**: 添加 `extra={<Button onClick={() => navigate('/todo')}>返回首页</Button>}`。

#### M-3: 路由路径字符串三处重复定义
- **位置**: L53-73（routes.tsx）、Sidebar.tsx `menuItems`、App.tsx `PAGE_TITLES`
- **问题**: 19 条路由路径在三个文件中以字符串字面量分别定义，修改一个路径需要同步改三个文件。
- **架构影响**:
  - 违反 DRY 原则（Don't Repeat Yourself）
  - 路径漂移风险——routes.tsx 和 Sidebar.tsx 的路径不一致时，用户看到菜单但路由匹配失败
  - 维护成本随路由数量线性增长
- **修复**: 提取路径常量到 `pages/constants/routes.ts`：
  ```ts
  export const ROUTES = {
    TODO: '/todo',
    KNOWLEDGE: '/knowledge',
    ARTICLE: '/article',
    PUBLISH: '/publish',
    PROJECT: '/project',
    USERS: '/users',
    SKILLS: '/skills',
    COMPANY: '/company',
    COMPANY_ADD: '/company/add',
    COMPANY_EDIT: '/company/edit/:id',
    SYSADMIN: '/sysadmin',
    SWAGGER: '/swagger',
  } as const;
  ```

#### M-4: 无根路径重定向
- **位置**: L87
- **问题**: 访问 `/` 时匹配到 `*` 通配符显示 404。但 Layout.tsx 已包裹在 AuthGuard 内，已登录用户看到"页面不存在"是异常体验。
- **架构影响**: 缺少默认入口路由，新用户登录后需要手动点击侧边栏才能进入功能页。
- **修复**: 添加根路径重定向：`<Route path="/" element={<Navigate to="/todo" replace />} />`。

---

### LOW (L)

#### L-1: Spin 缺少 aria 无障碍属性
- **位置**: L44
- **问题**: `<Spin size="large" />` 无 `role="status"` 和 `aria-label`，屏幕阅读器无法识别加载状态。
- **修复**: 添加 `role="status" aria-label="页面加载中"`。

#### L-2: PageLoading 缺少 displayName
- **位置**: L42-46
- **问题**: React DevTools 中显示为匿名 `<Anonymous>`，调试不友好。
- **修复**: 添加 `PageLoading.displayName = 'PageLoading';`

#### L-3: Route key 使用 path 在嵌套路由场景下可读性差
- **位置**: L80
- **问题**: `key={route.path}` 当前扁平路由无冲突，但 `/company/add` vs `/company/edit/:id` 共享前缀时 key 语义不直观。
- **影响**: 当前无实际影响，预防性建议。

#### L-4: RouteDef 接口未导出
- **位置**: L25-29
- **问题**: 接口未导出，其他模块（如面包屑、权限审计工具）无法复用类型。
- **影响**: 当前无外部消费者。

---

## 路由-侧边栏-标题一致性审计

| 路径 | routes.tsx | Sidebar.tsx | App.tsx PAGE_TITLES | 一致性 |
|------|-----------|-------------|---------------------|--------|
| `/todo` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 待办事项 | ✅ |
| `/knowledge` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 知识库 | ✅ |
| `/knowledge/:baseId` | ✅ | ❌ 无子菜单 | ❌ 无标题 | 子路由 |
| `/article` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 文章管理 | ✅ |
| `/publish` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 发布管理 | ✅ |
| `/project` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 项目 | ✅ |
| `/skills` | ✅ sysadmin,admin | ✅ sysadmin,admin | ✅ 技能管理 | ✅ |
| `/users` | ✅ sysadmin | ✅ sysadmin | ✅ 用户管理 | ✅ |
| `/company` | ✅ sysadmin | ✅ sysadmin | ✅ 企业管理 | ✅ |
| `/sysadmin` | ✅ sysadmin | ✅ sysadmin | ✅ 系统设置 | ✅ |
| `/swagger` | ✅ sysadmin | ✅ sysadmin | ✅ API 文档 | ✅ |

**结论**: 一级路由路径和角色定义三方完全一致，无漂移。子路由（knowledge/detail 系列）仅在 routes.tsx 中定义，Sidebar 和 PAGE_TITLES 无需覆盖。

---

## 架构度量

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 职责单一性 (SRP) | 8/10 | 路由模块仅负责路由匹配和角色守卫，职责清晰 |
| 开闭原则 (OCP) | 5/10 | 新增路由需修改 routes 数组，路径/角色分散在三个文件 |
| DRY 原则 | 4/10 | 路径字符串三处重复、角色字符串两处重复 |
| 类型安全 | 4/10 | roles 为 string[]，与 Role enum 无关联 |
| 性能优化 | 6/10 | lazy loading 优秀，但 routes 数组每次渲染重建 |
| 错误恢复力 | 5/10 | 有 Suspense 但缺 chunk 错误边界，ErrorBoundary 粒度过粗 |
| 可维护性 | 6/10 | 声明式路由易读，但路径硬编码导致修改面广 |

---

## 修复优先级与预估工时

| 优先级 | 编号 | 问题 | 预估工时 |
|--------|------|------|----------|
| BLOCKING | B-1 | PlaceholderPage 死代码 | 5 min |
| BLOCKING | B-2 | Navigate 死 import | 1 min |
| HIGH | H-1 | routes 数组每次渲染重建 | 15 min |
| HIGH | H-2 | roles 类型缺乏类型安全 | 10 min |
| HIGH | H-3 | 缺少 lazy 错误边界 | 20 min |
| MEDIUM | M-1 | 角色判断无防御 | 10 min |
| MEDIUM | M-2 | 403 无返回操作 | 5 min |
| MEDIUM | M-3 | 路径字符串三处重复 | 30 min |
| MEDIUM | M-4 | 无根路径重定向 | 10 min |
| LOW | L-1 | Spin 缺 aria | 3 min |
| LOW | L-2 | 缺 displayName | 3 min |

**总预估**: ~2h（含测试验证）

---

## 修复后预期评分: 8.5/10

修复 B 级死代码 + H 级类型安全/性能/错误边界 + M 级路径常量管理后，路由模块可达高质量架构标准。

---

*软件架构专家评审完成 — 2026-05-26*
