# 技术架构

## 技术栈
- TypeScript 全栈
- **后端**: Express + PostgreSQL + JWT + Swagger/OpenAPI 3.0
- **前端**: React 18 + Ant Design (antd) + @ant-design/icons + Vite
- **样式**: IBM Carbon Design System（见 DESIGN.md）
- **测试**: Jest + Supertest（接口）+ React Testing Library（页面）

## 目录结构
```
apis/        后端: controller / service / service-impl / map / utils / entity / middleware
pages/       前端: public / components / api-docs / login + 功能页
config/      JSON 配置 (default.json / production.json)
sql/create/  建表脚本 | sql/updates/  迁移脚本
tests/apis/  + tests/pages/  测试文件
```

## 关键文件
- `apis/app.ts` — Express 入口（helmet, cors, 限流, 反爬虫, swagger, 路由）
- `apis/server.ts` — 启动 HTTP 服务器
- `apis/controller/auth.controller.ts` — 认证端点：登录、登出、验证、保存选择、获取公司/项目、获取上下文、获取公司用户
- `apis/controller/company.controller.ts` — 公司 CRUD（仅 sysadmin，仅公司管理页面使用）
- `apis/controller/project.controller.ts` — 项目 CRUD（sysadmin + admin，admin 按运营者身份鉴权）
- `apis/controller/skills.controller.ts` — 技能 CRUD（sysadmin + admin，admin 只能改删自己创建的）
- `apis/controller/user.controller.ts` — 用户 CRUD（仅 sysadmin）
- `apis/controller/article.controller.ts` — 文章 CRUD + 审核 + 正文编辑 + 版本历史（sysadmin + admin）
- `apis/controller/upload.controller.ts` — 图片上传（multer，sysadmin + admin）
- `apis/controller/knowledge.controller.ts` — 知识库 CRUD（关键词/画像/图片，各5个端点，sysadmin + admin）
- `apis/service/impl/` — 业务实现（Prisma）
- `apis/middleware/validate.ts` — Zod 参数验证中间件（支持 body/query/params 三种来源）
- `apis/schema/auth.schema.ts` — 认证相关 Zod 验证 schema（loginSchema、saveSelectionSchema）
- `pages/App.tsx` — React 路由定义（ErrorBoundary + AuthProvider + Routes）
- `pages/components/Layout.tsx` — 纯布局组件（Sider + Content）
- `pages/components/AuthGuard.tsx` — 认证门控（检查登录状态）
- `pages/components/ErrorBoundary.tsx` — React 错误边界（防白屏）
- `pages/components/Sidebar.tsx` — 角色侧边栏 + CompanyProjectSwitcher
- `pages/components/CompanyProjectSwitcher.tsx` — 公司/项目切换 Modal
- `pages/context/AuthContext.tsx` — 认证状态管理（用户、登录/登出、跨标签页同步）
- `pages/context/AppContext.tsx` — AppContext（companyId/projectId + localStorage 持久化）
- `pages/router/routes.tsx` — 集中式路由配置（React.lazy 懒加载 + 角色守卫）
- `pages/theme/carbon.ts` — IBM Carbon Design System antd 主题配置
- `pages/login/index.tsx` — 登录页
- `pages/styles/global.css` — 全局样式（CSS 变量来自 DESIGN.md）

## 认证流程
1. `POST /api/auth/login` → JWT 令牌 + 用户信息 → 存 localStorage
2. 受保护请求携带 `Authorization: Bearer <令牌>`
3. authMiddleware 验证 JWT，设置 req.user（companyId 现为可选）
4. roleMiddleware 检查角色权限
5. 令牌 2 小时过期（可配置）
6. `POST /api/auth/logout` → 服务端登出
7. **前端分层架构**: main.tsx(ErrorBoundary+ConfigProvider) → App.tsx(AuthProvider+Routes) → AuthGuard(认证门控) → Layout(纯布局+AppContextProvider) → PageRouter(路由配置+角色守卫)
8. AuthContext 管理认证状态全局，跨标签页同步通过 storage 事件
9. 已登录时登录页调用 verify API 验证 token 有效性后跳转 `/publish`（避免竞态闪烁）
10. **登录返回选中公司和项目**：LoginResponse.user 包含 `selected_company` + `selected_project`（而非 companies 数组）
11. **登录选择逻辑**：根据角色确定可访问公司/项目 → 检查已保存选择是否有效 → 无效则自动选第一个 → 持久化到 User 记录
12. **权限边界**：无公司→403(LoginSelectionError)、view无项目→403、admin无项目→selected_project=null（跳转/project）
13. **切换公司/项目**：`CompanyProjectSwitcher` Modal → `PUT /api/auth/selection` 持久化 → `AppContext` 更新前端状态
14. **路由级角色守卫**: PageRouter 根据 route.roles 数组检查用户角色，无权限重定向到 /publish

## 路由表
| 路径 | 名称 | 允许角色 |
|------|------|----------|
| `/knowledge` | AI知识库 | sysadmin, admin |
| `/article` | 文章管理列表 | sysadmin, admin |
| `/article/:id` | 文章详情/编辑/新建 | sysadmin, admin |
| `/publish` | 发布管理（默认页） | sysadmin, admin, view |
| `/tools` | 常用工具 | sysadmin, admin |
| `/project` | 项目管理 | sysadmin, admin |
| `/skills` | 技能管理 | sysadmin, admin |
| `/users` | 用户管理 | sysadmin, admin |
| `/sysadmin` | 系统管理 | sysadmin |

## API 响应格式
- 成功：`{ code: 0, message: "...", data: {...} }`
- 失败：`{ code: 4xx/5xx, message: "..." }`

## 数据库
- `companies`: id, short_name, full_name, address, contact_person, contact_phone
- `users`: id, username, password_hash, cn_name, role, status(布尔), company_id(可选), selected_company_id(可选), selected_project_id(可选)
- `skills`: id, name, category, description, status(布尔), company_id(可选), created_by(可选，追踪创建者)
- 角色枚举: sysadmin / admin / view
- 默认用户：sysadmin / sysadmin123（company_id=1）
- 必须维护建表 SQL（`sql/create/`）和更新 SQL（`sql/updates/`）
- **用户不再强制绑定单一公司**：company_id 改为可选字段（Int?），用户可操作多家公司，具体权限由公司关联设置
- **公司关联用户改为 ID 方式（2026-05-17）**：公司创建/更新不再管理用户密码，通过 operator_ids / viewer_ids 关联已有用户
  - `CreateCompanyRequest` / `UpdateCompanyRequest` 字段：operator_ids（必填，非空数组）、viewer_ids（选填，数组）
  - `CompanyDetail` 返回 operator_ids + operators 详情数组 + viewer_ids + viewers 详情数组
  - 更新逻辑：先解绑旧用户（companyId 置 null），再关联新用户（设置 companyId）
  - 创建逻辑：创建公司后，遍历设置被关联用户的 companyId
- **公司多运营者支持（2026-05-17）**：admin_user_id 改为 operator_ids（数组），支持多个运营者
  - `CreateCompanyRequest` / `UpdateCompanyRequest`：operator_ids: number[]（非空数组）
  - `CompanyDetail` 返回 operator_ids 数组和 operators 详情数组
  - 前端 CompanyForm 运营者改为 Select mode="multiple"
- **公司多查看者支持（2026-05-17）**：view_user_id 改为 viewer_ids（数组），支持多个查看者
  - `CompanyDetail` 返回 viewer_ids 和 viewers 详情数组
  - 前端 CompanyForm 查看者改为 Select mode="multiple"
- **项目管理（2026-05-17）**：新增 Project 模型
  - `projects` 表：id, short_name, full_name, description, company_id, status
  - 多对多关联表：`project_operators`（project_id, user_id）、`project_viewers`（project_id, user_id）
  - 项目运营者从公司运营者中选择，项目查看者从公司查看者中选择
  - API: GET/POST/PUT/DELETE /api/projects，sysadmin + admin 可访问
  - 创建/更新时验证运营者/查看者属于指定公司
  - **项目所属公司不可更改**：一旦创建，company_id 不可修改（controller 层拦截）
  - **admin 按运营者身份鉴权**：admin 只能操作自己被指定为运营者的项目（operator_ids.includes(userId)），而非基于公司
  - admin 创建项目时仍强制 company_id = 自己的公司
- **技能不再绑定单一公司**：company_id 改为可选字段（Int?），与用户一致
- **文章管理（2026-05-17）**：新增 Article 模型
  - `articles` 表：id, project_id, title, keywords(Json), portrait(Text), images(Json), platforms(Json), skills(Json, 技能ID), llm_model_id(Int?, FK→llm_models, ON DELETE SET NULL), content(Text?), version(Float, 默认1.0), status(ArticleStatus枚举), created_by
  - `article_versions` 表：id, article_id, version(Float), content(Text), created_by, created_at
  - 7个状态：draft → manual_writing / generating → generate_failed / pending_review → publishing → publish_failed / published
  - API: GET/POST/PUT/DELETE `/api/projects/:projectId/articles` + PUT `.../review` + PUT `.../submit-review`
  - 正文专用 API: PUT `.../content`（仅 draft/manual_writing/generate_failed/publish_failed 可编辑）、GET `.../versions`（版本历史）
  - 提交审核 API: PUT `.../submit-review`（仅 manual_writing → pending_review）
  - 正文版本管理：每次保存自动递增版本号（1.0 → 2.0），历史存入 article_versions
  - admin 需为项目运营者，编辑/删除限创建者或 sysadmin
  - 前端：独立路由页面 `/article/:id`（非Modal），Tab 切换「文章设置」和「正文」
  - 非编辑状态时字段 disabled 只读
  - **设置编辑权限**：仅 draft 状态可编辑设置（`SETTINGS_EDITABLE_STATUSES`）
  - **正文编辑权限**：draft / manual_writing / generate_failed / publish_failed 可编辑正文（`CONTENT_EDITABLE_STATUSES`）
  - **pending_review 状态不可编辑正文**：审核状态下正文只读
  - Prisma JSON 字段设空须用 `Prisma.JsonNull` 而非 `null`（TypeScript 类型兼容）
  - 文件上传：`POST /api/upload`（multer），图片存 `uploads/` 目录，静态服务 `/uploads/`
  - 前端插图：三模式切换（上传/URL/知识库），上传后自动添加到列表并显示缩略图
- **技能基于创建者权限（2026-05-17）**：新增 `created_by` 字段（Int?），admin 只能修改/删除自己创建的技能
- **用户管理仅 sysadmin（2026-05-17）**：User API 从 sysadmin+admin 改为仅 sysadmin，admin 全部 403
- **公司 API 路由隔离（2026-05-17）**：`/api/companies` 仅限公司管理页面（sysadmin-only），其他页面通过 `/api/auth/companies/:id` 获取公司用户
- **关键词扩展词（2026-05-18）**：关键词与扩展词分离存储，严禁将扩展词保存为关键词
  - `knowledge_keywords` 表：存储用户输入的主关键词（project_id, keyword, created_by）
  - `keyword_expanded_words` 表：存储智能扩词结果（keyword_id FK, word, selected 布尔）
  - 级联删除：删除关键词时自动删除其所有扩展词（`onDelete: Cascade`）
  - 保存逻辑：`syncExpandedWords` 先 DELETE 全部再 INSERT 全部（全量替换策略）
  - 读取逻辑：`getById` 先查主关键词，再 `$queryRaw` 查 `keyword_expanded_words` 并挂载到 `expanded_words` 字段
  - API 请求体：`{ keyword: string, expanded_words?: [{word, selected}] }`
  - API 响应体：`{ ...主键词字段, expanded_words: [{id, keyword_id, word, selected}] }`

## 配置项（均可通过 .env 或 config/ 配置）
- 服务端口
- 数据库连接信息
- JWT 密钥和过期时间
- Swagger 在线文档开关（开发环境允许、生产环境不允许）
- 限流熔断策略参数
- 文章生成 cron 表达式（`CRON_ARTICLE_INTERVAL`，默认 `*/5 * * * *`）和开关（`CRON_ARTICLE_ENABLED`，默认 `true`）

## 文章生成调度器（2026-05-18）
- **模块**: `apis/scheduler/article-generation.scheduler.ts`
- **依赖**: `node-cron`
- **逻辑**: 每5分钟扫描 `status='generating'` 的最旧文章，调用 LLM 生成内容
- **流程**: 获取文章 → 查知识库图片 → 构造 prompt → LLM 生成 → 事务保存内容+版本+状态改 `pending_review`
- **失败处理**: 状态改 `generate_failed`
- **防重叠**: `isRunning` 守卫（LLM 调用可能超5分钟）
- **集成**: `server.ts` 的 `app.listen` 回调中启动，`SIGINT`/`SIGTERM` 中停止
- **LLM服务**: `ILlmService.generateArticle(params)` 使用 system+user 双消息，temperature 0.7

## 第三方库评审记录
- **@uiw/react-markdown-preview（common.tsx）** — 软件质量评审 B 级（2026-05-24）
  - 核心问题：rehypeRaw 无条件开启 HTML 注入攻击面、每次渲染重建 rehype 插件数组（无 useMemo）
  - 本项目通过 MarkdownViewer 封装组件 + 服务端消毒 + 1MB 长度限制缓解风险
  - 详见 `tasks/review/common.tsx.quality.md`
