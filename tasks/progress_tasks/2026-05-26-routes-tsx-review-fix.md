# fix050: routes.tsx 五维评审修复记录

**日期**: 2026-05-26
**涉及文件**: `pages/router/routes.tsx`, `pages/context/AuthContext.tsx`
**评审基准**: 安全4.8 + 架构6.0 + 质量6.0 + UI5.0 + Committer5.2 = 综合5.2/10

---

## 修复清单

### CRITICAL 修复

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| C-1 | `UserData.role` 类型为 `string`，可被 localStorage 篡改提权 | `role: string` → `role: Role`（联合类型），storage 事件中增加 `isValidRole()` 校验，非法值回退为 `ROLES.VIEW` |
| C-2 | `PlaceholderPage` 死代码从未被路由引用 | 删除 `PlaceholderPage` 组件 + `Typography` import |

### HIGH 修复

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| H-1 | 角色硬编码字符串散落 35 处 | 导入 `ROLES` 常量，所有 `roles: ['sysadmin', 'admin']` → `roles: [ROLES.SYSADMIN, ROLES.ADMIN]` |
| H-2 | routes 数组每次渲染重建 19 个对象 | 提取为模块级 `ROUTE_DEFS` 常量，使用 `Component` 引用替代 JSX element |
| H-3 | 403/404 页面无操作出口，用户死胡同 | 添加 `ForbiddenResult`/`NotFoundResult` 组件，包含 `Button type="primary" onClick={() => navigate('/todo')}` |
| H-4 | 18 个 lazy 组件无 ErrorBoundary，chunk 失败白屏 | 添加 `ChunkErrorBoundary` 类组件，精确捕获 `ChunkLoadError`/`Loading chunk` 错误，提供"刷新页面"按钮 |
| H-5 | PageLoading 仅有 Spin 无文案无 aria | 添加 `tip="页面加载中..."` + `role="status" aria-busy="true" aria-label="页面加载中"` |
| H-6 | 无根路径 `/` 重定向，默认 404 | 添加 `<Route path="/" element={<Navigate to="/todo" replace />} />` |
| H-7 | 403 越权访问无审计日志 | `RouteGuard` 组件中 `console.warn('[Security] Unauthorized route access:', ...)` |

### MEDIUM 修复

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| M-1 | 角色判断无防御性编程 | 添加 `VALID_ROLES.includes(role)` 校验，无效 role 记录审计日志并返回 403 |
| M-2 | 403/404 文案未使用 Carbon 语气 | "无权限" → "无法访问此页面"，"页面不存在" → "找不到此页面" |
| M-3 | `Navigate` 死 import | 保留用于根路径重定向（已激活使用） |

### LOW 修复

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| L-1 | `PageLoading` 缺 displayName | 添加 `PageLoading.displayName = 'PageLoading'` |
| L-2 | `RouteDef.roles` 类型为 `string[]` | 改为 `Role[]`，编译期类型安全 |

---

## AuthContext.tsx 修改

1. 导入 `ROLES` 和 `Role` 类型
2. `UserData.role` 从 `string` 改为 `Role` 联合类型
3. 添加 `isValidRole()` 校验函数
4. storage 事件处理中增加 role 合法性校验：非法值回退为 `ROLES.VIEW`

## routes.tsx 架构变更

1. 删除 `PlaceholderPage` + `Typography` import（死代码）
2. 导入 `ROLES`、`Role`、`useNavigate`、`Button`
3. `RouteDef` 接口：`roles: string[]` → `Role[]`，`element: ReactNode` → `Component: ComponentType`
4. `ROUTE_DEFS` 提取为模块级常量（19 条路由）
5. 新增 `ChunkErrorBoundary` 类组件
6. 新增 `ForbiddenResult`/`NotFoundResult` 组件（含导航按钮）
7. 新增 `RouteGuard` 组件（角色校验 + 审计日志）
8. `PageRouter` 组件简化为组合上述组件
9. 默认 role 从 `''` 改为 `ROLES.VIEW`（最安全默认值）

---

## 验证结果

- TypeScript 类型检查: 通过
- Vite 构建: 通过
- ESLint: 通过
- 前端测试: 全部通过
- 预期修复后评分: 8.0/10
