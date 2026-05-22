# 任务总表

> 本文件记录项目所有开发任务的状态，按模块分类。
> 最后更新：2026-05-17

---

## 一、基础设施

| ID | 任务 | 涉及文件 | 状态 | 完成日期 |
|----|------|----------|------|----------|
| INF-001 | 项目初始化 — TypeScript monorepo，Express + React + Vite + Prisma | `package.json`, `tsconfig.*.json`, `vite.config.ts` | ✅ 已完成 | - |
| INF-002 | 数据库设计 — Company, User 模型；Role 枚举(sysadmin/admin/view) | `prisma/schema.prisma`, `prisma/seed.ts` | ✅ 已完成 | - |
| INF-003 | Express 中间件链 — helmet → cors → antiCrawl → rateLimit → auth → role | `apis/app.ts`, `apis/middleware/` | ✅ 已完成 | - |
| INF-004 | JWT 认证 — 登录/验证/登出，2小时过期 | `apis/middleware/auth.middleware.ts` | ✅ 已完成 | - |
| INF-005 | 反爬虫中间件 — User-Agent ≥ 10字符，200+请求/分钟封禁 | `apis/middleware/anti-crawl.middleware.ts` | ✅ 已完成 | - |
| INF-006 | 限流中间件 — 超限返回 429 | `apis/middleware/rate-limit.middleware.ts` | ✅ 已完成 | - |
| INF-007 | Swagger 集成 — OpenAPI 3.0 文档 | `apis/app.ts`, `apis/controller/*.ts` | ✅ 已完成 | - |
| INF-008 | Vite SPA fallback — 刷新时正确返回 index.html | `vite.config.ts` | ✅ 已完成 | - |
| INF-009 | 全局样式 — IBM Carbon Design System，CSS 变量，单一 global.css | `pages/styles/global.css` | ✅ 已完成 | - |
| INF-010 | antd 主题配置 — colorPrimary #0f62fe, borderRadius 0, IBM Plex Sans | `pages/main.tsx` ConfigProvider | ✅ 已完成 | 05-16 |
| INF-011 | 字体 — IBM Plex Sans 本地打包 @fontsource | `package.json` | ✅ 已完成 | - |
| INF-012 | 测试框架 — Jest + Supertest + React Testing Library | `jest.config.ts` | ✅ 已完成 | - |

---

## 二、后端 API 开发

| ID | 任务 | 涉及文件 | 状态 | 完成日期 |
|----|------|----------|------|----------|
| API-001 | 认证 API — POST /api/auth/login（公开） | `apis/controller/auth.controller.ts`, `apis/service/impl/auth.service.impl.ts` | ✅ 已完成 | - |
| API-002 | 认证 API — GET /api/auth/verify, POST /api/auth/logout | `apis/controller/auth.controller.ts` | ✅ 已完成 | - |
| API-003 | 公司 CRUD — GET/POST/PUT /api/companies（sysadmin-only） | `apis/controller/company.controller.ts`, `apis/service/` | ✅ 已完成 | - |
| API-004 | 用户 CRUD — GET/POST/PUT/DELETE /api/users（sysadmin-only） | `apis/controller/user.controller.ts`, `apis/service/` | ✅ 已完成 | - |
| API-005 | 用户密码加密 — bcrypt | `apis/service/impl/user.service.impl.ts` | ✅ 已完成 | - |
| API-006 | User 模型新增 status 布尔字段 | `prisma/schema.prisma` | ✅ 已完成 | - |
| API-007 | 技能 CRUD — GET/POST/PUT/DELETE /api/skills（sysadmin+admin） | `apis/controller/skills.controller.ts`, `apis/service/` | ✅ 已完成 | - |
| API-008 | 项目 CRUD — GET/POST/PUT/DELETE /api/projects（sysadmin+admin） | `apis/controller/project.controller.ts`, `apis/service/` | ✅ 已完成 | 05-17 |
| API-009 | 项目多运营者/查看者 — project_operators/project_viewers 多对多关联 | `prisma/schema.prisma`, `apis/service/impl/project.service.impl.ts` | ✅ 已完成 | 05-17 |
| API-010 | 公司多运营者支持 — admin_user_id → operator_ids 数组 | `apis/entity/`, `apis/service/`, `apis/controller/company.controller.ts` | ✅ 已完成 | 05-17 |
| API-011 | 公司多查看者支持 — view_user_id → viewer_ids 数组 | `apis/entity/`, `apis/service/`, `apis/controller/company.controller.ts` | ✅ 已完成 | 05-17 |
| API-012 | 公司信息改为关联用户ID — 不再管理用户密码 | `apis/service/impl/company.service.impl.ts` | ✅ 已完成 | 05-17 |
| API-013 | 公司用户隔离 — admin 公司级数据过滤 | `apis/controller/user.controller.ts` | ✅ 已完成 | - |
| API-014 | 项目公司隔离 — admin 只能操作本公司项目，禁止转移 | `apis/controller/project.controller.ts` | ✅ 已完成 | 05-17 |
| API-015 | 运营者/查看者归属验证 — 创建/更新时检查用户属于指定公司 | `apis/service/impl/project.service.impl.ts` | ✅ 已完成 | 05-17 |
| API-016 | sysadmin 用户保护 — 禁止修改角色或删除 | `apis/service/impl/user.service.impl.ts` | ✅ 已完成 | - |
| API-017 | 认证 API — PUT /api/auth/selection，保存公司/项目选择 | `apis/controller/auth.controller.ts` | ✅ 已完成 | 05-17 |
| API-018 | 认证 API — GET /api/auth/companies，获取有权限的公司列表 | `apis/controller/auth.controller.ts` | ✅ 已完成 | 05-17 |
| API-019 | 认证 API — GET /api/auth/projects，获取有权限的项目列表 | `apis/controller/auth.controller.ts` | ✅ 已完成 | 05-17 |
| API-020 | 认证 API — GET /api/auth/context，获取当前上下文 | `apis/controller/auth.controller.ts` | ✅ 已完成 | 05-17 |
| API-021 | 登录选择逻辑 — 返回 selected_company/selected_project，LoginSelectionError | `apis/service/impl/auth.service.impl.ts` | ✅ 已完成 | 05-17 |
| API-022 | LLM 模型 CRUD — GET/POST/PUT/DELETE /api/llm-models（sysadmin-only） | `apis/controller/llm-model.controller.ts` | ✅ 已完成 | - |
| API-023 | 系统配置 — GET/PUT /api/system-configs（sysadmin-only） | `apis/controller/system-config.controller.ts` | ✅ 已完成 | - |

---

## 三、权限系统

| ID | 任务 | 涉及文件 | 状态 | 完成日期 |
|----|------|----------|------|----------|
| PERM-001 | 分级权限基础 — 三角色 sysadmin/admin/view + roleMiddleware 工厂 | `apis/middleware/auth.middleware.ts` | ✅ 已完成 | - |
| PERM-002 | 权限规范文档 — permissions.md 铁律级别 | `.claude/permissions.md` | ✅ 已完成 | 05-17 |
| PERM-003 | 全 API 权限审计 — 逐层检查路由/Controller/Sidebar 是否符合规范 | `apis/app.ts`, `apis/controller/`, `pages/components/Sidebar.tsx` | ✅ 已完成 | 05-17 |
| PERM-004 | User 路由权限修复 — admin 不再能访问用户管理，roleMiddleware('sysadmin') | `apis/app.ts:78-83`, `apis/controller/user.controller.ts` | ✅ 已完成 | 05-17 |
| PERM-005 | Skills 基于创建者权限 — Prisma 新增 created_by，admin 只能改删自己的 | `prisma/schema.prisma`, `apis/controller/skills.controller.ts` | ✅ 已完成 | 05-17 |
| PERM-006 | 公司 API 路由隔离 — /api/companies 仅限公司管理页面 | `apis/app.ts` | ✅ 已完成 | 05-17 |
| PERM-007 | 新增 GET /api/auth/companies/:id — 供项目表单获取公司用户 | `apis/controller/auth.controller.ts`, `apis/service/auth.service.ts` | ✅ 已完成 | 05-17 |

---

## 四、前端页面开发

| ID | 任务 | 涉及文件 | 状态 | 完成日期 |
|----|------|----------|------|----------|
| FE-001 | 登录页 — 表单 + 跳转逻辑 + redirect_after_login | `pages/login/index.tsx` | ✅ 已完成 | - |
| FE-002 | 鉴权守卫 — Layout.tsx 检查 token，失败跳登录页 | `pages/components/Layout.tsx` | ✅ 已完成 | - |
| FE-003 | 侧边栏 — 角色菜单过滤 + 折叠/展开 + 图标 | `pages/components/Sidebar.tsx` | ✅ 已完成 | 05-16 |
| FE-004 | 前端组件库迁移 — element-react → antd | `package.json`, 全部 TSX | ✅ 已完成 | 05-16 |
| FE-005 | 布局迁移 — 自定义 CSS → antd Layout/Sider/Content | `pages/components/Layout.tsx` | ✅ 已完成 | - |
| FE-006 | 布局撑满修复 — 右侧内容区撑满视口高度 | `pages/styles/global.css` | ✅ 已完成 | - |
| FE-007 | Table → Card 布局迁移 — 用户/技能页面 | `pages/user/index.tsx`, `pages/skills/index.tsx` | ✅ 已完成 | 05-16 |
| FE-008 | 用户管理页面 — 卡片列表 + 表单对话框 | `pages/user/index.tsx`, `pages/user/UserForm.tsx` | ✅ 已完成 | - |
| FE-009 | 技能管理页面 — 卡片列表 + 表单对话框 | `pages/skills/index.tsx` | ✅ 已完成 | - |
| FE-010 | 公司管理页面 — 卡片列表 + CompanyForm | `pages/company/index.tsx`, `pages/company/CompanyForm.tsx` | ✅ 已完成 | 05-16 |
| FE-011 | 项目管理页面 — 卡片列表 + ProjectForm | `pages/project/index.tsx`, `pages/project/ProjectForm.tsx` | ✅ 已完成 | 05-17 |
| FE-012 | 项目表单联动 — 选择公司后加载运营者/查看者 | `pages/project/ProjectForm.tsx` | ✅ 已完成 | 05-17 |
| FE-013 | 公司/项目切换器 — Modal + 持久化选择 | `pages/components/CompanyProjectSwitcher.tsx` | ✅ 已完成 | 05-17 |
| FE-014 | AppContext — React Context 管理当前公司/项目 | `pages/context/AppContext.tsx` | ✅ 已完成 | 05-17 |
| FE-015 | 消除所有 inline style — 66 处提取到 global.css | 全部 TSX, `pages/styles/global.css` | ✅ 已完成 | 05-16 |
| FE-016 | 侧边栏 footer 重构 — 显示公司名+项目名 | `pages/components/Sidebar.tsx` | ✅ 已完成 | 05-16 |
| FE-017 | 用户卡片布局重构 — 两行紧凑 + EditOutlined 图标 | `pages/user/index.tsx` | ✅ 已完成 | 05-16 |
| FE-018 | 技能管理样式重构 — 同用户管理 | `pages/skills/index.tsx` | ✅ 已完成 | 05-16 |
| FE-019 | 公司管理样式重构 — EditOutlined + 等高卡片 | `pages/company/index.tsx` | ✅ 已完成 | 05-16 |
| FE-020 | 添加按钮改为卡片 — 虚线边框 + PlusOutlined | `pages/user/index.tsx`, `pages/skills/index.tsx` | ✅ 已完成 | 05-16 |

---

## 五、数据模型变更

| ID | 任务 | 涉及文件 | 状态 | 完成日期 |
|----|------|----------|------|----------|
| DB-001 | User.company_id 改为可选 — 用户不再绑定单一公司 | `prisma/schema.prisma` | ✅ 已完成 | 05-16 |
| DB-002 | User 新增 selected_company_id / selected_project_id | `prisma/schema.prisma` | ✅ 已完成 | 05-17 |
| DB-003 | Skills.company_id 改为可选 — 技能不再绑定公司 | `prisma/schema.prisma` | ✅ 已完成 | 05-16 |
| DB-004 | Skills 新增 created_by — 追踪技能创建者 | `prisma/schema.prisma` | ✅ 已完成 | 05-17 |
| DB-005 | Project 模型 — short_name, full_name, description, company_id, status | `prisma/schema.prisma` | ✅ 已完成 | 05-17 |
| DB-006 | project_operators / project_viewers 多对多关联表 | `prisma/schema.prisma` | ✅ 已完成 | 05-17 |

---

## 六、Bug 修复

| ID | 任务 | 涉及文件 | 状态 | 完成日期 |
|----|------|----------|------|----------|
| BUG-001 | Switch 圆角修复 — 从全局 border-radius:0 中排除 | `pages/styles/global.css` | ✅ 已完成 | 05-16 |
| BUG-002 | toolbar 控件高度不一致 — 统一 controlHeight 为 40px | `pages/main.tsx` ConfigProvider | ✅ 已完成 | 05-16 |
| BUG-003 | antd 废弃 API — Space direction→orientation, Modal destroyOnClose→destroyOnHidden | `pages/components/Sidebar.tsx`, 表单组件 | ✅ 已完成 | 05-16 |
| BUG-004 | CompanyForm useForm 警告 — 始终渲染 Form（loading 时 display:none） | `pages/company/CompanyForm.tsx` | ✅ 已完成 | 05-17 |
| BUG-005 | User 路由权限违规 — admin 不应访问用户管理 | `apis/app.ts`, `apis/controller/user.controller.ts` | ✅ 已完成 | 05-17 |
| BUG-006 | ProjectForm 调用 sysadmin-only API — 改用 /api/auth/companies/:id | `pages/project/ProjectForm.tsx` | ✅ 已完成 | 05-17 |

---

## 七、待开发任务

> 以下为根据 permissions.md 路由表和前端菜单推断的待开发页面。

| ID | 任务 | 路由 | 涉及 API | 状态 |
|----|------|------|----------|------|
| TODO-001 | AI知识库页面 | `/knowledge` | 待定 | ⏳ 待开发 |
| TODO-002 | GEO文章页面 | `/article` | 待定 | ⏳ 待开发 |
| TODO-003 | GEO成绩页面（默认页） | `/publish` | 待定 | ⏳ 待开发 |
| TODO-004 | 常用工具页面 | `/tools` | 待定 | ⏳ 待开发 |
| TODO-005 | 系统管理页面 | `/sysadmin` | /api/llm-models, /api/system-configs | ⏳ 待开发 |
