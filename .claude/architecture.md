# 技术架构

## 技术栈
- TypeScript 全栈
- **后端**: Express + PostgreSQL + JWT + Swagger/OpenAPI 3.0 (swagger-autogen-ast 自动生成)
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
- `apis/app.ts` — Express 入口（helmet, cors白名单拒绝返回403, 限流, 反爬虫, swagger, 路由）
- `apis/scripts/generate-swagger.ts` — Swagger spec 生成脚本（swagger-autogen-ast + 后处理增强标签/安全/描述）
- `apis/swagger-spec.json` — 自动生成的 OpenAPI 3.0 spec（66 路由，npm run swagger:gen 重新生成）
- `apis/server.ts` — 启动 HTTP 服务器
- `apis/controller/auth.controller.ts` — 认证端点：登录、登出、验证、保存选择、获取公司/项目、获取上下文、获取公司用户
- `apis/controller/company.controller.ts` — 公司 CRUD（仅 sysadmin，仅公司管理页面使用）
- `apis/controller/project.controller.ts` — 项目 CRUD（sysadmin + admin，admin 按运营者身份鉴权）
- `apis/controller/skills.controller.ts` — 技能 CRUD + zip 上传（sysadmin + admin，admin 只能改删自己创建的；文件操作委托 SkillsFileService，架构评审 R2 通过 7.8/10；上传流程：先查活跃重复→再查软删除→解压→创建/复用记录）
- `apis/controller/user.controller.ts` — 用户 CRUD（仅 sysadmin），使用 `createUserService()` 工厂模式 + Options 模式（UserListOptions）
- `apis/controller/article.controller.ts` — 文章 CRUD + 审核 + 正文编辑 + 版本历史（sysadmin + admin）
- `apis/controller/publishing-schedule.controller.ts` — 发布计划列表 + 更新计划 + 驳回发布（sysadmin + admin，通过 createArticleService() 调用）
- `apis/controller/publishing-platform.controller.ts` — 发布平台列表（search=名称+备注，taxonomy=分类筛选，排序） + 分类去重列表（/taxonomies）
- `apis/controller/upload.controller.ts` — 图片上传（multer，sysadmin + admin）
- `apis/controller/knowledge.controller.ts` — 知识库 CRUD（关键词/画像/图片/文档，32个端点，`getServices()`延迟初始化+`handleControllerError`统一异常+`parseId`安全解析+`checkOwnership`所有权检查，架构评审7.9/10）
- `apis/controller/llm-model.controller.ts` — LLM 模型 CRUD（仅 sysadmin），使用 `createLlmModelService()` 工厂模式 + `AppError` 统一异常处理 + SSRF 防护
- `apis/controller/audit-log.controller.ts` — 审计日志查询（仅 sysadmin），listAuditLogs + getAuditLogEvents
- `apis/service/impl/` — 业务实现（Prisma）
- `apis/service/index.ts` — 服务工厂函数（createUserService 等），Controller 通过工厂获取服务实例
- `apis/utils/ip.util.ts` — 真实客户端 IP 提取（`getClientIp`：X-Forwarded-For → X-Real-IP → req.ip → socket.remoteAddress）
- `apis/middleware/validate.ts` — Zod 参数验证中间件（支持 body/query/params 三种来源）
- `apis/schema/auth.schema.ts` — 认证相关 Zod 验证 schema（loginSchema、saveSelectionSchema）
- `apis/schema/knowledge.schema.ts` — 知识库相关 Zod 验证 schema（13个schema覆盖全部POST/PUT端点）
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
- `.agents/skills/web-video-presentation/templates/src/hooks/useAudioPlayer.ts` — 音频播放 hook（useAudioPlayer + estimateMs，PlaybackMode 类型导出）

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
| `/audit-log` | 日志管理 | sysadmin |

## API 响应格式
- 成功：`{ code: 0, message: "...", data: {...} }`
- 失败：`{ code: 4xx/5xx, message: "..." }`

## 数据库
- `companies`: id, short_name, full_name, address, contact_person, contact_phone
- `users`: id, username, password_hash, cn_name, role, status(布尔), company_id(可选), selected_company_id(可选), selected_project_id(可选)
- `skills`: id, name, category, description, status(布尔), company_id(可选), created_by(可选，追踪创建者)
- `audit_logs`: id, level(枚举), event, user_id, ip, method, url, status, duration, metadata(Json), created_at（不可变，无 updatedAt/deletedAt）
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
  - `articles` 表：id, project_id, title, keywords(Json), portrait(Text), images(Json), skills(Json, 技能ID), llm_model_id(Int?, FK→llm_models, ON DELETE SET NULL), content(Text?), version(Float, 默认1.0), status(ArticleStatus枚举), created_by
  - `article_versions` 表：id, article_id, version(Float), content(Text), created_by, created_at
  - 6个状态：draft → manual_writing / generating → generate_failed / pending_review → approved
  - API: GET/POST/PUT/DELETE `/api/projects/:projectId/articles` + PUT `.../review` + PUT `.../submit-review`
  - 正文专用 API: PUT `.../content`（仅 draft/manual_writing/generate_failed 可编辑）、GET `.../versions`（版本历史）
  - 提交审核 API: PUT `.../submit-review`（仅 manual_writing → pending_review）
  - 正文版本管理：每次保存自动递增版本号（1.0 → 2.0），历史存入 article_versions
  - admin 需为项目运营者，编辑/删除限创建者或 sysadmin
  - **文章发布解耦改造（2026-05-26）**：Article 不再包含发布相关字段（platforms/scheduleType/scheduledPublishAt），发布功能独立为 PublishingSchedule 模型
    - **文章内容生命周期**：`draft → manual_writing/generating → pending_review → approved`，`approved` 是最终态（可发布）
    - **发布状态由 PublishingSchedule 独立管理**：`pending → publishing → published/publish_failed`，严禁在 article schema/entity API 层出现发布状态
    - Prisma `ArticleStatus` 枚举仍有 9 个值（数据库兼容），但 API 层（schema/entity DTO）仅暴露 6 个内容状态
    - `ContentArticleStatus` 替代 `UpdatableArticleStatus`，类型为 6 个内容状态
    - `articleStatusSchema` 仅 6 个值（draft/manual_writing/generating/generate_failed/pending_review/approved）
    - `articleTypeSchema` = z.enum 8 个中文类型（榜单排名/方法论讲解/案例分析/行业洞察/对比测评/客户证言/FAQ问答/实操指南）
    - `write_mode` = z.enum(['manual', 'ai'])
    - `UpdateArticleRequest` 不再包含 `scheduled_publish_at`（由 PublishingSchedule 管理）
    - 新增 `PublishingSchedule` 模型：article_id(FK), platforms(Json), scheduleType(Enum), scheduledPublishAt(DateTime?), status(Enum: pending/publishing/published/publish_failed), createdBy
    - `service/index.ts` barrel 导出 19 个工厂函数（含 createPublishingScheduleService）
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
- **资源使用计数与删除保护（2026-05-26）**：关键词/画像/图片被文章引用后禁止删除
  - Entity 层：`KnowledgeKeyword`/`KnowledgePortrait`/`KnowledgeImage` 增加 `article_count?: number`
  - Service 层：3 个 count 函数（`countKeywordUsage`/`countPortraitUsage`/`countImageUsage`）
  - 匹配逻辑：关键词→`keywords LIKE '%text%'`，画像→`portrait = content OR = title`，图片→`images::jsonb @> to_jsonb(url)`（raw SQL）
  - `list()`/`listByProject()` 填充 `article_count`，`delete()` 前 >0 抛 ConflictError(409)
  - 前端：表格+卡片显示"使用文章数"列，`article_count > 0` 时禁用删除按钮
- **知识库资源硬删除（2026-06-13）**：文档/画像/图片/关键词删除从软删除改为硬删除
  - `prisma.update({ data: { deletedAt } })` → `prisma.delete()`，数据库直接删除记录
  - 文档删除不存在时静默处理（`.catch(() => {})`），不报 404
- **MinedKeyword 新增 source_type 字段（2026-06-13）**：关键词挖掘记录来源类型
  - 字段：`sourceType String @default("all") @map("source_type") @db.VarChar(20)`
  - 取值：`all`/`document`/`portrait`/`image`
  - 前端挖掘来源 Radio.Group 仅作为挖掘参数，不筛选列表

## 审计日志系统（2026-05-27）
- **写入工具**: `apis/utils/audit-log-writer.util.ts` — writeAuditLog / writeApiAccessLog，即发即弃（fire-and-forget），.catch() 静默处理失败
- **日志入口**: `apis/utils/logger.util.ts` 每个日志方法（info/warn/error/debug）追加 DB 写入；`apis/app.ts` api_access 中间件追加 DB 写入
- **查询服务**: `apis/service/audit-log.service.ts`（IAuditLogService）+ `impl/audit-log.service.impl.ts`，支持 level/event/日期/搜索 筛选
- **路由**: `GET /api/v1/audit-logs` + `GET /api/v1/audit-logs/events`，仅 sysadmin
- **前端页面**: `pages/audit-log/` — 表格 + 筛选（级别/事件/日期范围/搜索）+ 分页 + 详情展开行
- **设计原则**: 审计日志不可变（无 updatedAt/deletedAt），metadata(Json) 存放额外字段

## 配置架构（apis/config/index.ts）
- **综合评级**: B+（架构评审 8.2/10）— 零业务耦合 + Fail-Fast 启动校验 + 双重不可变保护
- **消费拓扑**: 13 个模块直接依赖（app.ts、server.ts、auth.middleware.ts、rate-limit.middleware.ts 等）
- **设计模式**: Singleton（require 缓存）+ Value Object（deepFreeze）+ Factory Method + Strategy（NODE_ENV）
- **已知架构问题**: 数据库配置双轨（config.database 定义了 6 个字段但 Prisma 使用 DATABASE_URL 独立连接）、模块级副作用不可延迟（import 即执行）
- 配置项（均可通过 .env 或 config/ 配置）：
  - 服务端口
  - 数据库连接信息（注意：Prisma 实际使用 DATABASE_URL，config.database 仅用于诊断日志）
  - JWT 密钥（生产环境强制设置，开发环境 crypto.randomBytes 自动生成）和过期时间
  - Swagger 在线文档开关（开发环境允许、生产环境不允许）
  - 限流熔断策略参数
  - 文章生成 cron 表达式（`CRON_ARTICLE_INTERVAL`，默认 `*/5 * * * *`）和开关（`CRON_ARTICLE_ENABLED`，默认 `true`）
  - 连接池参数（`DB_POOL_MIN`/`DB_POOL_MAX`，默认 2/10）
  - 上传目录（`UPLOAD_DIR`）
- **安全评审**: B+/8.4（2026-05-24 安全专家评审）— 1项HIGH硬编码默认密码(CWE-798) + 4项MEDIUM + 4项LOW，6项安全亮点（deepFreeze/生产强制/safeParseInt/JWT强度警告/CORS白名单/readonly接口）
- **评审报告**: tasks/review/config-index.md（安全）、config-index.security.md（安全专家 B+/8.4）、config-index.quality.md（质量 A-）、config-index.architecture.md（架构 B+）、config-index.committer.md（Committer APPROVE）

## 文章生成调度器（2026-05-18）
- **模块**: `apis/scheduler/article-generation.scheduler.ts`
- **依赖**: `node-cron`
- **逻辑**: 每5分钟扫描 `status='generating'` 的最旧文章，调用 LLM 生成内容
- **失败处理**: 状态改 `generate_failed`
- **防重叠**: `isRunning` 守卫（LLM 调用可能超5分钟）
- **集成**: `server.ts` 的 `app.listen` 回调中启动，`SIGINT`/`SIGTERM` 中停止
- **LLM服务**: `ILlmService.generateArticle(params)` 现通过 AgentLoopUtil 调用 deepagents agent loop

## Agent Loop 工具类（2026-05-28）
- **模块**: `apis/utils/llm.utils/agent-loop.util.ts`
- **用途**: ReAct 风格 Agent Loop，替代直接 axios 调用大模型
- **依赖**: deepagents(^1.10.2) + @langchain/openai(^1.4.7) + langchain(^1.4.2) + @langchain/core(^1.1.48)
- **API**: `AgentLoopUtil.run({ baseUrl, apiKey, modelName, prompt, systemPrompt?, skills?, skillsBaseDir?, temperature? })`
- **返回**: `{ content, iterations, toolCalls }`
- **内置工具**: deepagents 默认 middleware 提供（filesystem/todoList/summarization/subAgent）
- **技能加载**: 有 skills 时自动创建 FilesystemBackend 从磁盘读取 SKILL.md
- **集成**: `LlmServiceImpl.generateArticle()` 已改用此工具类
- **流程**: 获取文章 → 查知识库图片 → 构造 prompt → LLM 生成 → 事务保存内容+版本+状态改 `pending_review`
- **失败处理**: 状态改 `generate_failed`
- **防重叠**: `isRunning` 守卫（LLM 调用可能超5分钟）
- **集成**: `server.ts` 的 `app.listen` 回调中启动，`SIGINT`/`SIGTERM` 中停止
- **LLM服务**: `ILlmService.generateArticle(params)` 使用 system+user 双消息，temperature 0.7

## 文章详情页重构（2026-05-24）
- **重构前**: 943 行 God Component，17 个 useState，11 处直接 axios 调用，6 个 useEffect
- **重构后**: 主文件 ~180 行容器组件 + 5 个子组件 + 6 个自定义 hooks
- **新增文件**:
  - `pages/lib/apiClient.ts` — 统一 axios 实例（token 注入 + CORS 403/网络错误拦截→强制退出登录 + 401 拦截 + 错误转换）
  - `pages/article/types.ts` — 共享类型定义（ArticleData、Platform、ArticleFormValues 等）
  - `pages/article/hooks/useArticleDetail.ts` — 文章数据 CRUD + 自动保存（含竞态防护 savingRef）
  - `pages/article/hooks/useArticlePermissions.ts` — 权限计算（canEditSettings/Content/Review/Delete）
  - `pages/article/hooks/usePlatformSelector.ts` — 平台选择器状态（9 个 state 聚合为 1 个 reducer-like）
  - `pages/article/hooks/useKnowledgeBase.ts` — 知识库 + 技能 + LLM 模型选项加载
  - `pages/article/hooks/useArticleActions.ts` — 审核/重新生成/提交审核
  - `pages/article/hooks/useDocumentImport.ts` — 文档导入（md/docx 解析 + DOMPurify 消毒）
  - `pages/article/components/ArticleSettingsForm.tsx` — 设置表单
  - `pages/article/components/ArticleContentEditor.tsx` — 正文编辑/预览
  - `pages/article/components/ArticleImageManager.tsx` — 图片管理（上传/URL/知识库三模式）
  - `pages/article/components/PlatformSelectModal.tsx` — 发布平台选择弹窗
  - `pages/article/components/ArticleReviewActions.tsx` — 审核操作栏
- **架构评审**: D+ → 重构后架构符合 SOLID 原则，每个文件 < 200 行，职责单一，可独立测试

## controller/index.ts barrel file（已删除 2026-05-24）
- **Committer 评审**: REJECT 2.0/10 — 65% 函数遗漏（65/100）、53% 模块完全遗漏（8/15）、运行时零引用（死代码）
- **处置**: 采纳 Committer 推荐方案 B，删除 `apis/controller/index.ts` 及其测试 `tests/apis/controller/index.test.ts`
- **依据**: 项目 15 个路由文件均使用直接导入（`import * as ctrl from '../controller/xxx.controller'`），barrel file 零引用、无存在价值
- **详见**: `tasks/review/controller-index.committer.md`

## 第三方库管理
- **patch-package 已移除（2026-05-26）**：删除了 patches/ 目录和 patch-package 依赖，安全防护由 MarkdownViewer/MarkdownEditor 封装层完全覆盖
- **pnpm 配置**：使用 `shamefully-hoist=true`（.npmrc）解决 Prisma Client 类型解析问题，postinstall 自动创建 `.prisma` 符号链接

## 第三方库评审记录
- **@uiw/react-markdown-preview（index.tsx）** — 架构评审 5.4/10（2026-05-24）
  - 核心架构缺陷：每次渲染重建 10 插件管线（无 useMemo）、与 preview.tsx 安全策略分裂、OCP 违反（用户插件位置固定）、与 common.tsx 代码克隆
  - SOLID：SRP⚠️、OCP❌、LSP✅、ISP✅、DIP❌
  - Bundle 影响：index.tsx 使用全量 rehype-prism-plus（+150KB gzip），建议改用 common.tsx 入口
  - 详见 `tasks/review/react-markdown-preview.index.tsx.architecture.md`
- **@uiw/react-markdown-preview（common.tsx）** — 软件质量评审 B 级（2026-05-24）
  - 核心问题：rehypeRaw 无条件开启 HTML 注入攻击面、每次渲染重建 rehype 插件数组（无 useMemo）
  - 本项目通过 MarkdownViewer 封装组件 + DOMPurify 消毒 + React.memo + 1MB 长度限制缓解风险
  - 详见 `tasks/review/common.tsx.quality.md`
- **@uiw/react-markdown-preview（rehypePlugins.tsx）** — UI 专家评审 2.5/10（2026-05-24）
  - 核心UI缺陷：GitHub Octicon 图标与 Carbon Design System 冲突、复制按钮为 div 非 antd Button、零可访问性支持（无 role/tabindex/aria-label）、触控目标 16x16 远低于 48px 标准
  - 本项目通过 MarkdownViewer 封装层 + markdown-viewer.css 50+ 行 !important 覆盖缓解，但仍未覆盖：可访问性、图标替换、键盘支持
  - 详见 `tasks/review/rehypePlugins.tsx.ui.md`
- **@uiw/react-md-editor（Context.tsx）** — Committer 评审 ⚠️有条件通过 3.4/10（2026-05-24）
  - 核心缺陷：索引签名 `[key: string]: any` 瓦解类型系统、Reducer 无 Action 区分、DOM 引用混入 Context state、dispatch 混入 state
  - 综合五份评审：架构 3.0/10、质量 3.6/10、安全 Critical×2、UI 2.8/10
  - Committer 裁定：有条件通过，4 项强制要求 MC-1~MC-4（封装组件+安全防护+样式对齐+类型加固）
  - 详见 `tasks/review/Context.tsx.committer.md`
- **@uiw/react-md-editor（issue.tsx）** — Committer 审核 APPROVE（2026-05-25）
  - 命令未被默认工具栏注册（死代码），零实际影响
  - 核心问题：# 前缀与 H1 标题语义碰撞、prefix! 非空断言、无错误边界、SVG 无障碍缺陷
  - 封装层防御性覆盖：行首上下文检测 + prefix 空值守卫 + try-catch + 16px SVG + 中文 ARIA
  - 不建议注册使用（# 语义碰撞不可根治）
  - 详见 `tasks/review/issue.tsx.committer.md`
	- **@uiw/react-md-editor（italic.tsx）** — 软件质量评审 7.2/10 APPROVE（2026-05-25）
	  - 33 行简洁命令模块，功能正确，依赖纯函数工具
	  - 7 项问题：MEDIUM×3（prefix! 非空断言类型安全、SVG 缺 title/aria-hidden 可访问性、selection 语义混淆）+ LOW×2 + INFO×3
	  - 与 bold.tsx 代码完全相同（仅 prefix 不同），存在可提取的公共逻辑
	  - 详见 `tasks/review/italic.tsx.md`
	- **@uiw/react-md-editor（title5.tsx）** — 软件架构专家评审 7.8/10 APPROVE（2026-05-25）
	  - 命令模式实现正确，依赖拓扑健康（从 headingUtils 独立模块导入，无循环依赖）
	  - 比同族 title1.tsx 三项改进：消除循环依赖、空值合替代非空断言、补全无障碍属性（role="img"+aria-hidden）
	  - 仅 2 个 Minor 问题：内联样式（建议改 CSS 类/变量）、title1-6 可提取为工厂模式（Info）
	  - 建议作为 title1-6 家族的参考实现
	  - 详见 `tasks/review/title5.tsx.architecture.md`
		- **@uiw/react-md-editor（title5.tsx）** — 代码安全专家评审 9.0/10 A- 级 APPROVE（2026-05-25）
		  - 攻击面极小（纯客户端 textarea 文本操作，无网络/存储/DOM 注入），无 CRITICAL/HIGH 风险
		  - 1 个 MEDIUM：上游 InsertTextAtPosition.ts 使用已废弃 document.execCommand（间接影响）
		  - 3 个 LOW：内联样式覆盖向量、类型导入语义模糊（建议改 import type）、IE 兼容死代码
		  - 执行链路安全属性全部通过（输入/输出/注入/XSS/CSRF/权限/并发/原型污染）
		  - 详见 `tasks/review/title5.tsx.security.md`
