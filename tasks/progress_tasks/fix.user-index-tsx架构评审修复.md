# 用户管理模块架构评审修复

## 评审文件
- 评审文档: `tasks/review/index.tsx.architecture.md`
- 目标文件: `pages/user/index.tsx`, `pages/user/UserForm.tsx`

## 修复内容

### A1 — 认证数据源统一 (已在之前修复)
- `getSafeUser()` → `useAuth()`，消除双数据源问题

### A2 — 数据层 Hook 抽取
- 新增 `pages/user/hooks/useUserList.ts` — 封装数据获取、筛选、分页、加载状态
- 新增 `pages/user/hooks/useUserActions.ts` — 封装状态切换操作逻辑
- `index.tsx` 职责从 10 项减少至 4 项（表单状态、视图切换、渲染、列定义）

### A3 — 类型统一 (已在之前修复)
- `pages/types/user.ts` 已存在，两文件均从此导入 `UserItem`

### A4 — 双视图条件渲染
- 使用 `window.matchMedia('(min-width: 1280px)')` + 条件渲染替代 CSS display 控制
- 消除双视图同时存在于 DOM 的问题（2x DOM 节点、2x React diff、2x 事件监听器）

### A5 — 配置提取到共享常量
- 新增 `pages/constants/roles.ts` — `ROLE_LABELS`, `ROLE_COLORS`, `ROLE_OPTIONS`
- `index.tsx` 和 `UserForm.tsx` 均使用共享常量，消除硬编码

### A6 — useEffect 数据流简化
- 移除 `useCallback` 包装器，`useEffect` 直接依赖 `[page, pageSize, search, filterRole, filterStatus]`
- 消除间接依赖链，数据流更直观

## 关联文件
- `pages/user/index.tsx` — 主页面组件（重构）
- `pages/user/UserForm.tsx` — 表单组件（使用共享常量）
- `pages/user/hooks/useUserList.ts` — 新增
- `pages/user/hooks/useUserActions.ts` — 新增
- `pages/constants/roles.ts` — 新增

## 验证
- `tsc --noEmit` 通过
- `eslint` 通过
- `build:page` 构建成功
