# INF-014: 前端架构重构 — 认证分离 + 路由守卫 + 代码分割

> 基于软件架构专家评审 `tasks/review/App.tsx.md` 的修复
> 完成日期：2026-05-24

---

## 功能说明

将前端架构从"扁平化"重构为分层架构，抽取认证逻辑为独立 AuthContext，添加路由级角色守卫，实现 React.lazy 代码分割。

## 评审问题与修复清单

### P0: 必须修复

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| ARCH-01 | 认证守卫与布局组件耦合 | 创建 AuthContext + AuthGuard，Layout 仅负责布局 | ✅ |
| ARCH-04 | 无 Error Boundary | 已有 ErrorBoundary.tsx，包裹在 App.tsx | ✅（已存在） |
| ARCH-06 | 路由级别无角色权限控制 | 集中式路由配置含 roles 字段 | ✅ |

### P1: 建议修复

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| ARCH-02 | AppContext 位置不当 | 保持在 Layout 内（在 AuthGuard 保护下挂载） | ✅ |
| ARCH-03 | 两级路由分散定义 | 创建 `pages/router/routes.tsx` 集中管理 | ✅ |
| ARCH-05 | 无代码分割 | 所有页面组件使用 React.lazy + Suspense | ✅ |
| ARCH-09 | 认证状态竞态条件 | LoginPage 调用 verify API 验证 token 有效性；AuthContext 监听 storage 事件跨标签页同步 | ✅ |

### P2: 可选优化

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| ARCH-07 | 认证状态 prop drilling | Sidebar 使用 useAuth() 获取 logout，消除 onLogout prop | ✅ |
| ARCH-10 | 主题配置硬编码在 main.tsx | 抽取为 `pages/theme/carbon.ts` | ✅ |

## 新增文件

```
pages/
├── context/
│   └── AuthContext.tsx          # 认证状态管理（用户、登录、登出、跨标签页同步）
├── components/
│   └── AuthGuard.tsx            # 认证门控组件
├── router/
│   └── routes.tsx               # 集中式路由配置（懒加载 + 角色守卫）
└── theme/
    └── carbon.ts                # IBM Carbon Design System 主题配置
```

## 修改文件

- `pages/App.tsx` — 从 17 行缩至 18 行，集成 AuthProvider + AuthGuard 分层架构
- `pages/main.tsx` — 从 71 行缩至 21 行，主题配置抽取到 carbon.ts
- `pages/components/Layout.tsx` — 从 205 行缩至 72 行，纯布局职责
- `pages/components/Sidebar.tsx` — 移除 onLogout prop，使用 useAuth() 获取 logout
- `pages/login/index.tsx` — 修复竞态条件，verify API 验证 token 有效性后跳转

## 架构改进

### 分层架构（重构前 vs 重构后）

```
重构前（扁平化）:
  main.tsx → App.tsx → Layout.tsx（认证+状态+布局+路由混在一起）

重构后（分层）:
  main.tsx (入口层: ErrorBoundary + ConfigProvider + Router)
    → App.tsx (路由层: AuthProvider + Routes)
      → AuthGuard (安全层: 认证检查)
        → Layout (表现层: 纯布局)
          → PageRouter (路由层: 配置驱动 + 角色守卫 + 懒加载)
```

### 代码分割效果

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| 页面组件加载方式 | 全部同步 import | React.lazy 按需加载 |
| 路由配置位置 | Layout.tsx 内联 | routes.tsx 集中管理 |
| 路由级权限控制 | 无 | roles 字段 + 运行时检查 |
| 认证逻辑位置 | Layout.tsx（与布局耦合） | AuthContext.tsx（独立） |
| 主题配置位置 | main.tsx（硬编码 49 行） | theme/carbon.ts（独立模块） |
| 跨标签页状态同步 | 无 | storage 事件监听 |
| 登录竞态条件 | 有（token 存在即跳转） | verify API 验证后跳转 |

## 验收标准

- [x] `pnpm build:page` 通过
- [x] 代码分割生效（各页面独立 chunk）
- [x] 角色守卫：非 sysadmin 用户访问 /sysadmin 被重定向到 /publish
- [x] 认证状态独立于 Layout 组件
- [x] Sidebar 通过 useAuth() 获取登出函数
- [x] LoginPage 调用 verify API 验证 token
- [x] 跨标签页登出同步
