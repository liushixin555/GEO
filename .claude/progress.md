# 已完成功能 & 测试模式

## 已完成功能
- [x] **dev001**: 登录功能 — 登录/验证/登出 API + 前端登录页
- [x] **dev002**: sysadmin 功能 — 公司 CRUD（API + 前端卡片列表 + 新增/编辑表单）
- [x] 登录跳转 — 未登录时保存当前路径，登录后跳回原页面
- [x] SPA 路由刷新修复 — Vite spa-fallback 插件
- [x] 布局撑满修复 — 右侧内容区撑满视口高度
- [x] **dev003**: 技能(Skills)管理 — Skills CRUD API + 前端列表页+表单对话框
- [x] **dev004**: 用户管理 — User CRUD API（密码 bcrypt 加密）+ 前端列表页+表单对话框
- [x] User 模型新增 `status` 布尔字段（默认 true）
- [x] 分级权限：sysadmin 管所有公司，admin 只管自己公司
- [x] Layout 从自定义 CSS 布局迁移到 antd（AntLayout, Sider, Content, Spin）
- [x] 前端组件库从 element-react 切换到 antd（Ant Design）
- [x] 修复 antd Space `direction` 废弃警告，改用 `orientation`

## 本次变更（2026-05-16）
- [x] **Table → Card 布局迁移** — 用户管理和技能管理页面从 antd Table 替换为 Card 卡片网格
  - 使用 Row + Col + Card + Pagination + Spin 组合替代 Table
  - 新增 `.item-card-*` 系列 CSS 类（title/subtitle/desc/meta/status/actions/pagination）
  - 移除 main.tsx 中 Table 主题配置和 global.css 中 Table 样式覆盖
  - 所有页面禁止使用表格，见 `.claude/feedback_no-tables.md`
- [x] **新增公司管理页面** — `pages/company/` 复制自 `pages/sysadmin/`
  - `index.tsx`: 公司卡片列表，路由 `/company`
  - `CompanyForm.tsx`: 公司表单（新建/编辑），路由 `/company/add`、`/company/edit/:id`
  - 侧边栏新增"公司管理"菜单项，sysadmin 角色
- [x] **侧边栏菜单 abbr → icon** — 折叠态从单字缩写改为 Ant Design 图标
  - 知识库(Book)、文章管理(FileText)、发布管理(Trophy)、工具(Tool)、项目(Project)、技能(Thunderbolt)、用户(Team)、公司(Bank)、系统(Setting)
  - `MenuItemDef` 接口 `abbr: string` → `icon: ReactNode`，antd `inlineCollapsed` 自动只显示 icon
  - `element-react` 从未实际使用，所有 UI 是原生 HTML + 自定义 CSS
  - 安装 `antd@6.4.1` + `@ant-design/icons@6.2.3`，卸载 `element-react`
- [x] **侧边栏 footer 重构** — 公司切换按钮改为显示公司名+项目名
  - 移除 companies/currentCompanyId/onSwitchCompany 相关 props 和状态
  - 新增 projectName prop（暂传空字符串，项目名占位"未选择项目"）
  - CSS 类名 sidebar-footer-company → sidebar-footer-info
  - ConfigProvider 主题：`colorPrimary: #0f62fe`、`borderRadius: 0`、IBM Plex Sans 字体
  - 删除自定义 `DataTable.tsx`，改用 antd `Table`
  - 自定义弹窗改用 antd `Modal`，自定义 CSS 组件全部替换
- [x] **侧边栏折叠展开功能**
  - PC 端：64px 缩略模式（缩写菜单 + 图标按钮）
  - 移动端：完全隐藏 + 浮动展开按钮 + 半透明遮罩
  - 按钮逻辑收敛在 Sidebar.tsx 单文件
  - 按钮样式全部用 CSS 类名（`.sidebar-toggle-btn`, `.sidebar-mobile-unfold`）
- [x] **消除所有 inline style** — 10 个 TSX 文件 66 处 `style={{}}` 全部提取到 `global.css`
  - 新增 ~30 个语义化 CSS 类名
  - 更新 CLAUDE.md 前端组件库说明
  - 删除 `vite-env.d.ts` 中 element-react 类型声明

## 本次变更（2026-05-16 下午）
- [x] **用户管理"添加用户"按钮改为卡片** — 与公司管理"添加公司"卡片样式一致
  - 从 toolbar 按钮改为 Row 末尾的虚线边框卡片（PlusOutlined + 文字）
- [x] **用户管理移除所属公司字段** — 用户不再绑定单一公司，可操作多家公司
  - Prisma schema: `company_id` 改为可选（`Int?`），关系改为可选（`Company?`）
  - 后端: 移除用户创建时的 company_id 必填校验和公司过滤
  - 前端: 移除用户卡片中的公司名显示和表单中的公司选择
  - 认证: 所有角色登录均返回全部公司列表
- [x] **用户卡片布局重构**
  - 移除删除按钮，编辑改为右上角 EditOutlined 图标
  - 两行布局：第一行姓名+编辑图标，第二行 @username + 角色 Tag + Switch 均匀分布
  - 添加用户卡片与用户卡片等高等宽（height: 100%）
  - Switch 使用 checkedChildren/unCheckedChildren 显示"启用/禁用"
- [x] **修复 Switch 圆角** — 从全局 border-radius: 0 规则中排除 `.ant-switch`，恢复椭圆胶囊样式
- [x] **修复 toolbar 控件高度不一致** — 根因是 ConfigProvider 中 Button.controlHeight(48) ≠ Input/Select(40)，Input.Search 的搜索按钮继承 Button 高度。统一为 40px
- [x] **技能管理页面样式重构** — 同用户管理：Row+Col 响应式 toolbar、EditOutlined 图标、Switch 胶囊、添加卡片
- [x] **技能管理移除所属公司字段** — Prisma/后端/前端/测试全链路，company_id 改为可选
- [x] **公司管理页面样式重构** — EditOutlined 右上角编辑、item-card 统一布局、等高卡片
- [x] **修复 antd 废弃 API** — Modal `destroyOnClose` → `destroyOnHidden`

## 本次变更（2026-05-17）
- [x] **项目管理 CRUD** — 完整后端 API + 前端卡片列表 + Modal 表单
  - 新增 `prisma/schema.prisma` Project 模型（short_name, full_name, description, company_id, status）
  - 多对多关联：project_operators（运营者）、project_viewers（查看者）
  - 新增 `apis/controller/project.controller.ts` — CRUD + 分页 + 搜索 + 按公司/状态筛选
  - 新增 `apis/service/project.service.ts` + `impl/project.service.impl.ts`
  - 新增 `apis/entity/project.entity.ts` + `mapProject()` 映射函数
  - 新增 `pages/project/index.tsx` — 卡片列表页（搜索+公司筛选+状态筛选+分页）
  - 新增 `pages/project/ProjectForm.tsx` — Modal 表单（公司联动运营者+查看者下拉）
  - 路由注册：`/api/projects`（sysadmin + admin）、`/project` 前端路由
  - 运营者/查看者归属验证：创建/更新时检查用户属于指定公司
  - 公司变更时自动清除 operator_ids 和 viewer_ids
- [x] **公司多运营者支持** — admin_user_id 改为 operator_ids（数组）
  - 后端 entity/service/controller 全链路重构
  - 前端 CompanyForm 运营者改为 Select mode="multiple"
- [x] **公司多查看者支持** — view_user_id 改为 viewer_ids（数组）
  - 后端 entity/service/controller 全链路重构
  - 前端 CompanyForm 查看者改为 Select mode="multiple"
- [x] **项目多运营者/多查看者** — 单个 operator_id 改为 operator_ids + viewer_ids
  - 新增 project_operators 和 project_viewers 多对多关联表
  - 项目查看者只能从公司查看者中选择（前端联动）
  - 测试更新：所有 92 个后端测试通过
- [x] **公司信息改为关联用户ID** — 不再管理用户密码，只通过 admin_user_id / view_user_id 关联
  - Entity: `CreateCompanyRequest`/`UpdateCompanyRequest` 去掉 username/password，改为 `admin_user_id`（必填）+ `view_user_id`（选填）
  - Service: create 通过设置用户 companyId 关联；update 先解绑旧用户再关联新用户；移除 bcrypt 依赖
  - Controller: 验证字段从 admin_username 改为 admin_user_id
  - 前端: Select 组件 value 改为用户 ID，payload 发送 admin_user_id 和 view_user_id
  - Swagger 注释同步更新
- [x] **修复 CompanyForm useForm 警告** — 始终渲染 Form（loading 时 display:none），避免 setFieldsValue 时 Form 未挂载

## 本次变更（2026-05-17 下午）
- [x] **全 API 权限校验审计与修复**
  - 审计所有 API 路由、Controller 业务逻辑、前端 Sidebar 菜单是否符合 permissions.md 规范
  - **修复 User 路由权限违规**：`roleMiddleware('sysadmin', 'admin')` → `roleMiddleware('sysadmin')`，admin 不再能访问用户管理
  - 移除 user.controller.ts 中 admin 公司隔离逻辑（不再需要）
  - admin 访问 User API 全部返回 403（5 个测试覆盖）
- [x] **Skills 控制器基于创建者的权限校验**
  - Prisma schema 新增 `createdBy` 字段（`created_by`）追踪技能创建者
  - sysadmin 可增删改查所有技能
  - admin 可查看所有技能、创建技能，但只能修改/删除自己创建的技能
  - 创建时自动设置 `created_by = req.user.userId`
  - 新增 17 个测试覆盖所有权限场景
- [x] **新增 GET /api/auth/companies/:id 接口**
  - 供项目表单获取公司下的运营者/查看者
  - sysadmin 可查任何公司，admin/view 只能查自己的公司
  - ProjectForm.tsx 从 `/api/companies/:id` 改为 `/api/auth/companies/:id`
  - `/api/companies` 系列仅限公司管理页面使用（sysadmin-only）
  - 新增 5 个测试覆盖权限
- [x] **公司/项目切换器** — 侧边栏底部切换按钮 + Modal 选择公司/项目
  - 后端新增 `GET /api/auth/context` API，按角色返回可访问的公司和项目
  - 后端新增 `PUT /api/auth/selection` API，持久化用户选择到数据库
  - 后端新增 `GET /api/auth/companies` + `GET /api/auth/projects` 独立 API
  - Prisma schema 新增 `selected_company_id` / `selected_project_id` 字段到 User 模型
  - 前端新增 `pages/context/AppContext.tsx` — React Context 管理当前公司/项目
  - 前端新增 `pages/components/CompanyProjectSwitcher.tsx` — 切换按钮 + Modal
  - Layout 用 `AppContextProvider` 包裹，登录时初始化上下文
  - Sidebar footer 替换内联 Select 为 CompanyProjectSwitcher 组件
  - 新增测试 `tests/apis/auth.context.test.ts`（6 个测试用例）
  - CSS 新增 `.switcher-info` / `.switcher-row` / `.switcher-btn` 样式
- [x] **登录时加载选中公司和项目** — 登录 API 返回 selected_company/selected_project
  - LoginResponse.user 替换 `companies` 数组为 `selected_company` + `selected_project`
  - 登录逻辑：根据角色确定可访问公司/项目，自动选择或恢复上次选择
  - 权限边界：无公司→403，view无项目→403，admin无项目→成功（跳转创建页）
  - LoginSelectionError 类用于区分权限错误和认证错误
  - AuthService 新增 saveSelection/getAccessibleCompanies/getAccessibleProjects 方法
  - 前端登录页处理 403 错误提示和无项目跳转
  - 新增 18 个 auth.service 测试用例，总计 110 个后端测试全部通过

## 本次变更（2026-05-17 晚间）
- [x] **文章管理 (dev014)** — 完整 CRUD + 7状态生命周期 + 权限隔离
  - 新增 `ArticleStatus` 枚举：draft / generating / generate_failed / pending_review / publishing / publish_failed / published
  - 新增 `Article` 模型（Prisma），关联 Project（级联删除）和 User（创建者）
  - 字段：title(必填), keywords(Json/字符串数组), portrait(Text), images(Json), platforms(Json), status, created_by
  - 后端四层架构：entity → service → controller → routes（6个API端点）
  - 权限规则：admin 需项目运营者身份 + 编辑/删除限创建者或 sysadmin
  - 状态限制：仅 draft/generate_failed/publish_failed 可编辑，仅 draft 可删除
  - 审核接口：`PUT /api/projects/:projectId/articles/:id/review`，pending_review → publishing/draft
  - 前端：卡片列表页（标题搜索 + 状态7选筛选）+ Modal 表单（关键词/画像/插图/平台 tags 输入）
  - 测试：32 个用例全部通过，覆盖认证/角色/项目权限/创建者限制/状态守卫/审核流转
  - 画像字段：Segmented 切换「手动输入」/「从知识库选择」，输入模式 TextArea autoSize
  - 插图字段：Segmented 三模式（上传图片/输入URL/从知识库选择），上传自动添加到列表
  - 新增 `POST /api/upload` 上传端点（multer），`/uploads/` 静态文件服务
  - 上传测试：6 个用例全部通过（401/403/400/成功sysadmin/成功admin/拒绝非图片）
  - 文章页面从Modal改为独立路由：列表页 `/article`，详情/编辑/新建页 `/article/:id`
  - Tab标签页切换：「文章设置」和「正文」（有正文时显示）
  - 新增 content + version 字段，ArticleVersion 版本历史表
  - 正文版本管理：每次保存自动递增版本号（1.0 → 2.0 → …）
  - 待审核状态创建者仍可编辑正文（PUT /api/.../content 端点）
  - 非编辑状态时表单字段只读（disabled）
- [x] **任务文档重写** — dev001~dev013 全部重写为纯产品功能描述
  - 移除所有代码片段和技术实现描述
  - 每个 dev 文档包含：功能说明、业务规则、验收标准
  - 拆分 dev012 为独立的 LLM 模型管理(dev012)和系统配置(dev013)文档
  - 删除旧的 `dev012.LLM模型与系统配置.md`，替换为 `dev012.LLM模型管理.md`
- [x] **任务文档命名规范** — 所有文档统一格式 `devNNN.功能名称.md`
- [x] **项目管理权限修复** — 修复 dev005 文档审计发现的 3 个代码问题
  - 禁止编辑时切换所属公司（后端返回 400，前端 Select 禁用）
  - admin 权限从公司级改为运营者级（operator_ids.includes(userId)）
  - admin list 按 `operators: { some: { userId } }` 过滤而非 companyId 强制覆盖
  - 移除 service update 中的公司转移逻辑
  - 133 个 API 测试全部通过

## 本次变更（2026-05-17 dev015）
- [x] **AI知识库 (dev015)** — 关键词/画像/图片三 Tab 页，与项目关联
  - 新增 3 个 Prisma 模型：`KnowledgeKeyword`（关键词）、`KnowledgePortrait`（画像）、`KnowledgeImage`（图片），均关联 Project（级联删除）和 User（创建者）
  - 后端 15 个 API 端点：`/api/projects/:projectId/knowledge/{keywords,portraits,images}` CRUD
  - 权限规则：sysadmin + admin（admin 需为项目运营者），修改/删除限创建者或 sysadmin
  - 后端四层架构：entity → service → controller → routes
  - 新增 `apis/entity/knowledge.entity.ts`（3 实体 + 6 DTO 接口）
  - 新增 `apis/service/knowledge.service.ts`（3 个 Service 接口）
  - 新增 `apis/service/impl/knowledge.service.impl.ts`（3 个 Prisma 实现）
  - 新增 `apis/controller/knowledge.controller.ts`（15 个端点处理函数）
  - 新增 `apis/map/index.ts` 的 mapKeyword/mapPortrait/mapKnowledgeImage 映射函数
  - 前端 4 个页面：`pages/knowledge/`（Tab 主页 + KeywordDetail + PortraitDetail + ImageDetail）
  - 路由：`/knowledge`（主页）、`/knowledge/keyword/:id`、`/knowledge/portrait/:id`、`/knowledge/image/:id`
  - 21 个测试用例全部通过
  - CSS 新增 `.knowledge-image-card` / `.knowledge-image-thumb` / `.knowledge-image-actions` 样式

## 本次变更（2026-05-18）
- [x] **文章表单集成AI知识库** — 关键词/画像/图片默认从知识库选择
  - `ArticleDetail.tsx` 新增 `kbKeywords`/`kbPortraits`/`kbImages` 状态，组件挂载时从知识库 API 并行加载
  - 关键词：`Select mode="tags"` 下拉选项来自知识库，同时保留手动输入能力
  - 画像：默认模式改为「从知识库选择」（原为「手动输入」），value 使用画像内容（content），支持搜索过滤
  - 图片：默认模式改为「从知识库选择」（原为「上传图片」），缩略图网格展示，勾选状态直接渲染在图片上（半透明蒙层 + 白色勾号），点击切换选中/取消
  - 已删除下方重复的已选图片预览行，所有状态只在原图缩略图上体现

## 本次变更（2026-05-17 深夜4）
- [x] **发布平台同步功能** — 软盟账号区增加「同步发布平台」按钮
  - 新增 `PublishingPlatform` Prisma 模型（rm_resource_id, name, taxonomy, price, remark, include_rate, publish_rate）
  - 后端新增 `POST /api/publishing-platforms/sync`：读取软盟账号配置 → getRmToken → getAllRmResources → 全量替换表数据
  - 后端新增 `GET /api/publishing-platforms`：返回所有发布平台（按 taxonomy + name 排序）
  - 四层架构完整：entity → service → controller → routes
  - 前端系统设置软盟账号区增加「同步发布平台」按钮（loading 状态）
  - 前端文章设置页发布平台从自由输入（mode="tags"）改为数据库选择（mode="multiple"）
  - 文章页加载时并行获取发布平台列表，支持搜索和清除
- [x] **放宽文章删除限制** — 除已发布(published)状态外均可删除
  - 后端：`existing.status !== 'draft'` → `existing.status === 'published'`，错误提示更新
  - 前端：`canDelete()` 同步修改，删除按钮在所有非 published 状态可见
  - 新增 5 个测试覆盖 generating/generate_failed/pending_review/publishing/publish_failed 的删除
  - 原有 published 拒绝删除测试更新错误消息断言
  - 37 个文章测试全部通过

## 本次变更（2026-05-17 深夜3）
- [x] **文章设置页增加技能选择与大模型选择**
  - Prisma schema: Article 新增 `skills Json?`（技能ID）和 `llmModelId Int?`（大模型ID，FK → llm_models，ON DELETE SET NULL）
  - LlmModel 新增 `articles Article[]` 反向关联
  - Entity/Map/Service 全链路更新：Article 接口、Create/UpdateArticleRequest、mapArticle、create/update 处理新字段
  - 新增 `GET /api/llm-models/enabled` 端点：只返回启用模型，只暴露 id/provider/model_name，不暴露 api_key/base_url
  - 新增 `ILlmModelService.listEnabled()` + `LlmModelServiceImpl` 实现
  - 路由注册在 `/api/llm-models/:id` 之前，避免被 `:id` 参数路由拦截
  - 前端 ArticleDetail 并行调用技能列表和启用大模型列表，新建文章默认选中第一个大模型
  - 技能和大模型均为单选（Select，非 mode="multiple"）
  - 关键词、大模型、发布平台为必填字段（Form.Item rules required）
- [x] **上传按钮与 Segmented 分行显示**
  - antd Upload 组件默认 inline-block，与 Segmented 挤在同一行
  - 修复：用 `<div style={{ display: 'block', width: '100%' }}>` 包裹 Upload
- [x] **知识库图片选择改为 Select 下拉框**
  - 从纯文字 div 改为 `<Select>` 组件（当前 disabled，数据待接入）

## 本次变更（2026-05-17 深夜2）
- [x] **文章设置页按钮拆分** — 单个保存按钮拆为「存草稿」+「提交」两个按钮
  - 「存草稿」：默认按钮，创建/更新文章，status=draft
  - 「提交」：主按钮（蓝色），创建/更新文章后 status=generating，进入AI生成中状态
  - 后端 `CreateArticleRequest` 新增可选 `status` 字段（'draft' | 'generating'）
  - 后端 service `create` 方法使用 `request.status || 'draft'` 而非硬编码 'draft'
  - 后端 controller 校验 status 仅允许 'draft' 和 'generating'
  - 后端 update controller 支持 `status=generating` 提交 AI 生成
  - 新建和编辑已有文章时均有两个按钮
- [x] **修复 article.version 为 undefined 时 toFixed 报错** — 用 `(article.version ?? 1.0).toFixed(1)` 防御
- [x] **所有页面 H1 标题改为 Breadcrumb + 居中对齐**
  - 11 个页面文件替换 `Typography.Title level={1}` / `<h1>` 为 `<Breadcrumb>` 组件
  - 登录页、CompanyForm 移除 Typography 导入（仅用于 H1，替换为 Breadcrumb）
  - 其他页面保留 Typography（仍用于卡片标题 level={3}、Typography.Text 等）
  - CSS 新增 `.page-breadcrumb` 类（`display: flex; justify-content: center; padding-bottom: 24px`）
  - CompanyForm 使用两级面包屑：公司管理 > 添加/修改公司
- [x] **恢复侧边栏「技能管理」菜单项**
  - 在 commit `374bdb5` 中被意外删除（登录选择功能提交时遗漏）
  - 恢复为：`{ label: '技能管理', path: '/skills', roles: ['sysadmin', 'admin'], icon: <ThunderboltOutlined /> }`
  - 位于「项目管理」和「用户管理」之间
- [x] **修复页面内容少时出现纵向滚动条**
  - `.app-layout-root`: `min-height: 100vh` → `height: 100vh; overflow: hidden`
  - `.main-content`: 新增 `overflow-y: auto; overflow-x: hidden`
  - `.page-breadcrumb`: `margin-bottom` → `padding-bottom`（避免外边距溢出）
- [x] **修复横向滚动条**
  - 根因：`overflow-y: auto` 隐式将 `overflow-x` 设为 `auto`，`.page-container` 的 1px border 触发横向滚动条
  - 修复：`.main-content` 显式设置 `overflow-x: hidden`

## 踩坑经验
- `npm run dev:api` 使用 `ts-node`（非 ts-node-dev），**改完代码不会自动重载，需手动重启**
- **Prisma JSON 字段不能直接赋 null**：`keywords: request.keywords || null` 会报 TS2322，必须用 `Prisma.JsonNull`
- **Windows Prisma generate EPERM**：删除 `.prisma/client/query_engine-windows.dll.node` 后重新 generate 即可
- bcrypt.hash(undefined, number) 会抛 "Illegal arguments: undefined, number"，不会返回 null
- **Prisma 多对多关联需要命名关系**：如果 User 与中间表（如 ProjectOperator）有多个 relation field，必须在双方都加 `@relation("关系名")`，否则 schema 验证失败
  - 错误：User 有 `operatedProjects ProjectOperator[]`，ProjectOperator 有 `user User @relation("ProjectOperator")`，名字不匹配
  - 正确：双方都用 `@relation("UserProjectOperator")`
- **Prisma migrate dev 在非交互终端会失败**：CI/CD 或某些 bash 环境下无法确认数据丢失提示
  - 解决：`npx prisma db push --accept-data-loss` 推送 schema，然后手动写 migration.sql + `npx prisma migrate resolve --applied <name>` 标记已应用
- **Windows 上 prisma generate 的 EPERM 错误**：`query_engine-windows.dll.node` 被占用时无法重命名
  - 原因：开发服务器正在运行，锁定了 dll 文件
  - 解决：停止开发服务器后再 generate，或重启终端
- **Prisma 删除关联表数据时用 deleteMany 先删旧记录再 create 新记录**：避免唯一约束冲突
  - 项目更新运营者/查看者：先 `deleteMany({ where: { projectId: id } })`，再在 update 的 data 中用 `{ create: [...] }` 重建
- **权限审计方法**：逐层检查（app.ts 路由层 roleMiddleware → controller 业务隔离 → 前端 Sidebar roles），与 permissions.md 逐行比对
- **前后端 API 路由隔离原则**：`/api/companies` 仅限公司管理页面（sysadmin-only），其他页面需要公司数据必须走 `/api/auth/companies`
- **新增字段后记得更新三处**：Prisma schema + entity 接口 + map 映射函数
- **`overflow-y: auto` 会隐式将 `overflow-x` 也设为 `auto`**：必须显式设 `overflow-x: hidden`，否则 `.page-container` 的 1px border 会触发横向滚动条
- **`min-height: 100vh` 会导致内容少时出现纵向滚动条**：改为 `height: 100vh; overflow: hidden`，内容区用 `overflow-y: auto` 独立滚动
- **外边距 vs 内边距**：`.page-breadcrumb` 用 `margin-bottom` 会导致溢出，改用 `padding-bottom` 避免此问题
- **修改 import 时要确认旧导入无其他引用**：如 login/index.tsx 的 Typography 只用于 H1 标题，可以安全替换为 Breadcrumb；但 company/index.tsx 的 Typography 还用于卡片标题，必须保留
- **multer fileFilter 错误不会自动变成 400**：cb(new Error(...)) 会通过 next() 传播为 500
  - 解决：封装 uploadMiddleware，在回调中捕获 err 并返回对应 status code
- **文章编辑和正文编辑权限分离**：设置字段仅 EDITABLE_STATUSES 可改，正文额外允许 pending_review 状态
- **antd Upload 组件默认 inline-block**：与上方的 Segmented 切换栏会挤在同一行，必须用 `<div style={{ display: 'block', width: '100%' }}>` 包裹 Upload
- **新增 GET 端点必须放在参数路由之前**：如 `/api/llm-models/enabled` 必须在 `/api/llm-models/:id` 之前注册，否则 `enabled` 被当作 `:id` 参数匹配
  - 两个独立 API 端点：`PUT .../articles/:id`（设置）和 `PUT .../articles/:id/content`（正文）
- **node-cron 类型导入**：`import cron from 'node-cron'` 会导致 TS2503，必须用 `import * as cron from 'node-cron'`，`ScheduledTask` 从命名导出获取
- **调度器测试 mock 顺序**：必须先 mock `node-cron`、`db.util`、`axios`，再 import 被测模块（jest.mock 提升）
- **Prisma $transaction 传数组**：`prisma.$transaction([query1, query2])` 返回 Promise.all 结果数组，确保原子性
- **ts-node 不热重载导致「功能不生效」**：改完代码后如果用户反馈还是旧行为，先 curl 直接测 API（区分前后端），再确认后端是否重启
- **调试前端问题时先测 API**：`curl -s http://localhost:8080/api/health` 确认后端活着 → `curl` 登录拿 token → 直接调目标 API 看响应 → 如果 API 正确则问题在前端，如果 API 不正确则后端在运行旧代码
- **关键词扩展词（keyword_expanded_words）已验证完整流程**：创建关键词+扩展词 → 读取返回 expanded_words → 更新同步扩展词 → 级联删除，API 和前端均已确认正常
- **antd message/notification/modal 静态方法无法消费主题上下文**：v5+ 必须通过 `<App>` 组件 + `App.useApp()` hook 获取实例，禁止 `import { message } from 'antd'` 后直接调用静态方法
- **文章列表页也需要更新 STATUS_CONFIG**：ArticleDetail 和 article/index.tsx 各有独立的 STATUS_CONFIG，新增状态时两处都要加
- **设置编辑与正文编辑权限分离**：`SETTINGS_EDITABLE_STATUSES`（仅 draft）和 `CONTENT_EDITABLE_STATUSES`（draft/manual_writing/generate_failed/publish_failed）分别控制
- **Docker 内无法执行 prisma migrate**：容器内没有 migrations 目录，需在宿主机用 psql 直连数据库执行 ALTER TYPE

## 本次变更（2026-05-18 antd message 上下文修复）
- [x] **修复 antd message 静态方法无法消费主题上下文的警告** — `Static function can not consume context like dynamic theme. Please use 'App' component instead.`
  - `main.tsx`：在 `<ConfigProvider>` 内部、`<BrowserRouter>` 外层新增 antd `<App>` 组件包裹（别名 `<AntApp>`）
  - 8 个组件文件：`import { message }` 改为 `import { App }`，组件内部新增 `const { message } = App.useApp()`
  - 涉及文件：KeywordDetail、PortraitDetail、ImageDetail、knowledge/index、sysadmin/index、article/index、ArticleDetail、CompanyProjectSwitcher
  - **规则**：antd v5+ 中禁止使用 `message.success()` 等静态方法，必须通过 `App.useApp()` hook 获取 message 实例

## 本次变更（2026-05-18 文章生成调度器）
- [x] **文章异步生成调度器** — node-cron 定时任务，每5分钟处理 `generating` 状态文章
  - 安装 `node-cron` + `@types/node-cron`
  - 扩展 `ILlmService` 接口：新增 `ArticleGenerationParams` + `generateArticle()` 方法
  - `LlmServiceImpl.generateArticle()`：system+user 双消息，temperature 0.7，自动插入知识库图片
  - 新建 `apis/scheduler/article-generation.scheduler.ts`：start/stop/processNext
  - 配置扩展：`AppConfig.cron`（articleGenerationInterval + articleGenerationEnabled），支持 `CRON_ARTICLE_INTERVAL` / `CRON_ARTICLE_ENABLED` 环境变量
  - 集成到 `server.ts`：启动时 startCron，SIGINT/SIGTERM 时 stopCron
  - 核心逻辑：findFirst generating 文章 → 查知识库图片 → LLM 生成 → $transaction 保存版本+内容+状态
  - 防重叠守卫：`isRunning` 布尔值防止 LLM 调用超 5 分钟时任务叠加
  - 失败处理：状态改 `generate_failed`，日志记录错误详情
  - 6 个测试全部通过：cron 启停、无文章跳过、生成成功、无 LLM 模型失败、API 错误失败

## 本次变更（2026-05-20 文章状态与权限优化）
- [x] **新增 manual_writing（手工编写中）状态** — 与 AI 生成中（generating）处于同等阶段
  - Prisma ArticleStatus 枚举新增 `manual_writing`
  - 数据库通过 `ALTER TYPE "ArticleStatus" ADD VALUE 'manual_writing'` 添加
  - 前端 STATUS_CONFIG（ArticleDetail + article/index.tsx）两处均更新：`manual_writing: { label: '手工编写中', color: 'processing' }`
- [x] **手工编写按钮设置 manual_writing 状态** — 点击"手工编写"时 status='manual_writing'，不再是 draft
  - 创建文章时 status 允许 'draft' / 'manual_writing' / 'generating'
  - 创建后自动跳转正文编辑页（state: openContentEdit）
- [x] **手工编写中正文区双按钮** — "保存正文" + "提交审核"（Popconfirm 确认）
  - 新增后端 `PUT /api/projects/:projectId/articles/:id/submit-review` 接口
  - 仅 manual_writing 状态可提交审核，转入 pending_review
- [x] **设置编辑权限收紧** — 仅 draft 状态显示底部4个操作按钮，其他状态设置页只读
  - 后端 `SETTINGS_EDITABLE_STATUSES = ['draft']`
  - 前端 `canEditSettings()` 仅 draft 返回 true
- [x] **正文编辑权限** — draft/manual_writing/generate_failed/publish_failed 可编辑
  - 后端 `CONTENT_EDITABLE_STATUSES` 替代旧的 `EDITABLE_STATUSES`
  - pending_review 状态不可编辑正文（前后端同步）
- [x] **插图浏览优化** — 非编辑模式只显示已选中的图片，不显示知识库全部图片
  - 编辑模式：保留知识库选择网格 + 底部已选图片列表（每张有删除按钮）

## 测试模式
- 后端测试：直接设环境变量（`process.env.JWT_SECRET='test-secret'`），不用 jest.mock
- Supertest 请求：加 `.set('User-Agent', 'test-agent/1.0')` 绕过反爬虫
- 新测试 mock 模式：mock `getPrisma()` 返回模拟的 Prisma 客户端方法（findMany, count, create 等）
- 前端测试：ts-jest 需要内联 `tsconfig: { jsx: 'react-jsx' }`
- 单文件测试：`npx jest --config jest.config.ts --no-cache --testPathPattern="tests/apis/auth"`
- 全量测试：`npx jest --config jest.config.ts --no-cache`


## 本次变更（2026-05-24 todo.controller 评审修复）
- [x] 安全修复：IDOR 越权（SEC-C-01）
- [x] 架构修复：Controller 直接操作 Prisma（C-1）
- [x] 自定义异常体系 apis/errors.ts
- [x] 输入验证 apis/schema/todo.schema.ts（Zod）
- [x] 错误处理统一 handleError
- [x] 164 个测试全部通过
- [x] 安装 zod@4.4.3

## 本次变更（2026-05-24 upload.controller 评审）
- [x] 软件质量专家评审 upload.controller.ts
- [x] 发现 HIGH×3（SVG XSS、MIME 伪造、错误泄露）、MEDIUM×4、LOW×3
- [x] 评审报告 tasks/review/upload.controller.md
