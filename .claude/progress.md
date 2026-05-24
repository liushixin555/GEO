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

## 本次变更（2026-05-24 App.tsx 评审）
- [x] 软件质量专家评审 pages/App.tsx
- [x] 综合评分 6.5/10（及格，存在架构设计缺陷）
- [x] 发现 HIGH×1（缺少 Error Boundary）、MEDIUM×5（根路径重定向逻辑、认证守卫耦合、路由常量管理、Layout 过度膨胀、无单元测试）、LOW×3
- [x] Committer 审核通过，建议 P0 项在当前迭代修复
- [x] 评审报告 tasks/review/App.tsx.md

## 本次变更（2026-05-24 App.tsx 架构评审）
- [x] 软件架构专家评审 pages/App.tsx
- [x] 综合评分 6.0/10（及格，架构分层不清晰）
- [x] 10 项架构发现：HIGH×3（认证耦合、Error Boundary、角色守卫）、MEDIUM×4（AppContext 位置、路由集中化、代码分割、竞态条件）、LOW×3
- [x] 提出目标架构蓝图：AuthProvider → AuthGuard → LayoutShell 三层分层
- [x] 评审报告 tasks/review/App.tsx.md（覆盖原质量评审）

## 本次变更（2026-05-24 App.tsx 安全评审）
- [x] 代码安全专家评审 pages/App.tsx
- [x] 综合安全评级 C+（前端安全基础薄弱）
- [x] 12 项安全发现：HIGH×3（路由无RBAC、localStorage存储token、用户数据可篡改）、MEDIUM×4（Error Boundary缺失、JSON.parse无保护、重定向未校验、Verify API过度调用）、LOW×5
- [x] 修复优先级路线图：P0×3、P1×5、P2×4
- [x] 评审报告 tasks/review/App.tsx.security.md

## 本次变更（2026-05-24 App.tsx UI专家评审）
- [x] 软件UI专家评审 pages/App.tsx
- [x] 综合评分 5.5/10（基本可用，UI/UX 存在系统性缺陷）
- [x] 27 项 UI 发现：HIGH×4（Breadcrumb语义误用、Alert prop错误、Token过期闪烁、skip-to-content缺失）、MEDIUM×10、LOW×7
- [x] DESIGN.md 合规性审计：色彩8/10、字体7/10、间距6/10、组件6/10
- [x] 修复优先级路线图：P0×6、P1×8、P2×7
- [x] 评审报告 tasks/review/App.tsx.ui.md

## 本次变更（2026-05-24 App.tsx Committer审核）
- [x] Committer审核专家评审 pages/App.tsx
- [x] 综合判定：不通过（REJECT）— 存在死路由Bug + 零测试 + 无Error Boundary
- [x] 发现关键问题：第11行 `path="/"` 的 Navigate 是死路由（被第10行 `path="/*"` 吞没）、无 App.test.tsx 测试文件、无 Error Boundary 包裹
- [x] 阻塞合并项：修复死路由、添加 ErrorBoundary、创建路由测试
- [x] 评审报告 tasks/review/App.tsx.committer.md

## 本次变更（2026-05-24 apis/app.ts 软件质量专家评审）
- [x] 软件质量专家评审 apis/app.ts（239 行）
- [x] 综合评分 B（结构基本合理，存在可维护性和扩展性瓶颈）
- [x] 10 项质量发现：HIGH×3（96条路由平铺、中间件重复90+次、注释与代码不匹配）、MEDIUM×5（无API版本化、无请求验证层、无请求日志、错误不分类、路由分组不一致）、LOW×2（Swagger无条件生成、角色字符串硬编码）
- [x] 正面评价：安全基础9/10、中间件链顺序正确、配置层设计精良
- [x] 提出目标架构：路由拆分为 Router 模块，app.ts 缩减至 <60 行
- [x] 评审报告 tasks/review/app.quality.md

## 本次变更（2026-05-24 App.tsx 评审问题修复）
- [x] **fix011: App.tsx 死路由 + 无 Error Boundary**
  - 删除第 11 行死路由 `<Route path="/" element={<Navigate to="/login" />} />`（被 `path="/*"` 吞没，永不执行）
  - 创建 `pages/components/ErrorBoundary.tsx`（antd Result + Button 友好错误页）
  - App.tsx 用 ErrorBoundary 包裹 Routes，防止子组件异常导致白屏
  - 移除冗余 `import React from 'react'`（tsconfig 已用 react-jsx 自动注入）
  - 创建 `tests/pages/App.test.tsx`，覆盖 7 个测试场景（路由匹配 4 个 + ErrorBoundary 3 个）
  - 安装缺失依赖 `@uiw/react-md-editor`、`mammoth`
  - Vite 构建通过、App 测试全部通过

## 本次变更（2026-05-24 apis/app.ts 代码安全专家评审）
- [x] **代码安全专家评审 apis/app.ts（第二轮）**
  - 综合安全评级 B（第一轮 C → 修复后 B+ → 本轮重新评估 B）
  - 验证第一轮 12 项修复：10/12 已修复（83%），2 项为架构决策延后
  - 新发现 10 项安全问题：HIGH×1（上传文件公开访问，延续项）、MEDIUM×5（CORS !origin 绕过、CORS 错误处理、Swagger Spec 无条件生成、错误日志缺少上下文、缺少安全审计日志）、LOW×4
  - 新引入安全域评价：可观测性（3/10）、弹性（5/10）
  - 修复优先级：P0×3（安全审计能力）、P1×3（攻击面缩减）、P2×3（安全加固）
  - 评审报告 tasks/review/app.ts.md（同名新文件，不覆盖第一轮 app.md）
  - 127 个 app 测试全部通过

## 本次变更（2026-05-24 pages/api-docs/index.tsx 软件质量专家评审）
- [x] **软件质量专家评审 pages/api-docs/index.tsx（24 行）**
  - 综合评分 3.0/10（不及格，死路由 + 安全缺陷 + 功能设计错误）
  - 8 项质量发现：CRITICAL×1（死路由，未被 Layout/Sidebar 注册）、HIGH×2（target="_blank" 缺少 rel、自引用链接路由冲突）、MEDIUM×2（页面内容过于单薄、无测试覆盖）、LOW×3（冗余 React import、Breadcrumb 居中偏差、硬编码 URL）
  - 核心问题：此页面为死代码，用户无法通过任何导航到达；按钮 href 与后端 Swagger UI 路由冲突
  - 建议替代方案：侧边栏外链 / 增强页面内容 / 删除死代码
  - 评审报告 tasks/review/index.tsx.md

## 本次变更（2026-05-24 apis/app.ts TDD 测试补全）
- [x] **apis/app.ts 测试用例补全** — 从 127 个增加到 156 个测试用例
  - 新增 Auth Companies Detail 路由 401 测试（1个）
  - 新增 CORS Preflight OPTIONS 预检请求测试（4个）
  - 新增 Token 格式边界测试：空Bearer、无前缀、Basic auth、错误签名、部分payload（5个）
  - 新增正向角色检查测试：admin/sysadmin 通过角色检查（8个）
  - 新增速率限制 headers 和请求测试（2个）
  - 新增 Login 路由边界测试：空值、空body、有效凭证（3个）
  - 新增 404 HTTP 方法测试（4个）
  - 新增静态文件边界和 Swagger 启用场景测试（2个）
  - 覆盖率：Stmts 98%, Branch 71.42%, Funcs 83.33%, Lines 98.65%
  - 发现：authMiddleware 仅验证 JWT 签名，不校验 payload 字段完整性
  - 发现：health check 路由在 rate limit 中间件之前，不受速率限制

## 本次变更（2026-05-24 pages/api-docs/index.tsx 软件架构专家评审）
- [x] **软件架构专家评审 pages/api-docs/index.tsx（24 行）**
  - 综合评分 2.0/10（架构层面不可用，死代码 + 路由冲突 + 前后端架构断裂）
  - 7 项架构发现：CRITICAL×1（组件游离于路由体系外）、HIGH×2（前后端路径冲突、缺少 Layout 集成）、MEDIUM×2（架构必要性存疑、无环境感知）、LOW×1（代码分割缺失）
  - 核心问题：组件是 React 组件树中的孤立节点（未被 Layout 导入/注册），`/api-docs` 路径被前后端同时声索形成控制权争夺，开发/生产环境行为不一致
  - 提出三个替代方案：A. 删除文件 + Sidebar 外链（推荐）/ B. 保留跳板页需完整集成 / C. 升级为 API 文档首页
  - 评审报告 tasks/review/index.tsx.architecture.md

## 本次变更（2026-05-24 apis/config/index.ts TDD 测试补全）
- [x] **apis/config/index.ts 测试用例补全** — 从 82 个增加到 114 个测试用例
  - 新增 safeParseInt 边界值（9个）：PORT/DB_PORT 最小最大值、浮点字符串截断、负数、无上限
  - 新增 console 警告输出（4个）：DB_PASSWORD/JWT_SECRET 未设置时验证 console.error
  - 新增 deepFreeze 深层不可变（4个）：server.port/cron/swagger 等属性冻结验证
  - 新增 parseCorsOrigins 额外边界（6个）：无协议、双斜杠、纯空格、http/https、多 entry
  - 新增配置重载一致性（2个）：auto-generated secret 随机性、显式值一致性
  - 新增 CRON_ARTICLE_ENABLED 边界（3个）：非标准值和空字符串行为
  - 新增生产环境额外校验（4个）：空字符串密码/密钥、development/test 环境
  - 覆盖率：Stmts 100%, Branch 97.29%, Funcs 100%, Lines 100%
  - TDD 报告：tasks/tdd/config.test.md

## 本次变更（2026-05-24 apis/app.ts Committer审核专家评审）
- [x] **Committer审核专家评审 apis/app.ts（239 行）**
  - 综合判定：通过（APPROVE）— 安全基础优秀 + 测试覆盖充分 + 功能完整
  - 测试文件：1319 行，156 个测试用例全部通过（比预估 120 个更充分）
  - API 契约正确性：96/96 路由与 Controller 导出函数 100% 匹配
  - 中间件链正确性：trust proxy → helmet → CORS → body → static → anti-crawl → rate-limit → auth → RBAC，全部到位
  - 交叉审核五份已有评审（质量/安全×2/架构），所有问题均不构成合并阻塞
  - 建议合并前修正 L187 注释错误（Knowledge Item → Todo），其余为技术债务
  - 评审报告 tasks/review/app.ts.committer.md

## 本次变更（2026-05-24 pages/api-docs/index.tsx 代码安全专家评审）
- [x] **代码安全专家评审 pages/api-docs/index.tsx（24 行）**
  - 综合安全评级 ⚠️ MEDIUM（组件自身安全，但链接目标存在认证缺陷，且为死代码）
  - 5 项安全发现：MEDIUM×4（死代码/攻击面扩大、target="_blank"缺少rel、前后端路径冲突、Swagger端点无认证）、LOW×1（组件无RBAC）
  - 正面评价：纯静态组件安全性9/10、无XSS/注入风险、React JSX自动转义
  - 核心问题：组件未注册路由为死代码；Swagger `/api-docs` 端点无认证保护，任何可访问开发服务器的人可获取完整API攻击面地图
  - 修复优先级：P0×2（删除死代码或完整实现 + Swagger端点添加认证）、P1×2、P2×1
  - 评审报告 tasks/review/index.tsx.security.md

## 本次变更（2026-05-24 apis/app.ts 评审问题修复）
- [x] **修复 4 项评审问题**（安全第二轮 SEC-2.04/SEC-2.05/SEC-2.06 + 质量 Q-03）
  - Q-03: L187 注释错误 "Knowledge Item" → "Todo"（H-1）
  - Q-06/SEC-2.04: Swagger Spec 条件化生成，`swaggerJSDoc()` 移入 `if` 块内，避免生产环境无谓 I/O
  - SEC-2.05: 错误日志增加请求上下文（method/url/ip/userId/role）
  - SEC-2.06: 新增请求级安全审计日志中间件（4xx/5xx 日志）
  - TypeScript 编译通过、156 个测试全部通过

## 本次变更（2026-05-24 pages/api-docs/index.tsx UI专家评审）
- [x] **软件UI专家评审 pages/api-docs/index.tsx（24 行）**
  - 综合评分 4/10（功能可用，但UI/UX存在多项缺陷）
  - 13 项 UI 发现：🔴严重×2（page-container padding仅6px、路由冲突循环跳转）、🟡中等×8（Typography.Paragraph语义误用、面包屑标题层级不足、间距不符合Carbon规范、缺少结构化容器、无Swagger降级处理、信息密度极低、无h1标题）、🟢低×3（图标颜色、document.title缺失、响应式处理）
  - DESIGN.md 合规性审计：色彩6/10、字体4/10、圆角8/10、间距3/10
  - antd 组件使用：Typography.Paragraph 语义误用、单项 Breadcrumb 无导航意义、缺少 Card/Space/Typography.Title
  - 可访问性：无 h1 标题、无 aria-label、无 document.title、target="_blank" 缺少 rel
  - 提供完整重构方案代码示例
  - 评审报告 tasks/review/api-docs.index.tsx.ui.md

## 本次变更（2026-05-24 apis/config/index.ts 软件质量专家评审）
- [x] **软件质量专家评审 apis/config/index.ts（147 行）**
  - 综合评级 A-（高质量配置模块，少量可改进点）
  - 10 项质量发现：MEDIUM×4（子接口readonly缺失、默认值分散、JWT强度未校验、模块副作用不可延迟）、LOW×6（dotenv路径、IIFE认知复杂度、safeParseInt浮点截断、cron未校验、连接池硬编码、deepFreeze边缘情况）
  - 正面评价：safeParseInt 三重防护、deepFreeze 不可变保护、parseCorsOrigins 独立校验、JWT 随机生成、114 个测试用例
  - 建议优先修复 Q-01（子接口 readonly 对齐）和 Q-06（JWT 强度校验），共 8 分钟
  - 评审报告 tasks/review/config-index.quality.md

## 本次变更（2026-05-24 pages/api-docs/index.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 pages/api-docs/index.tsx（24 行）**
  - 综合判定：❌ 拒绝合并（REJECT）— 死代码 + 路由冲突 + 零测试 + 安全漏洞
  - 3 项致命问题（Blocker）：BLK-01 死代码（组件未注册路由/菜单/被引用）、BLK-02 路由冲突（前端路径与后端 Swagger 端点重叠）、BLK-03 无测试覆盖
  - 1 项高危问题（High）：target="_blank" 缺少 rel="noopener noreferrer"（Tabnabbing）
  - 4 项中等问题：Typography.Paragraph 语义误用、单项 Breadcrumb 无导航价值、缺少可访问性属性、硬编码路径
  - 3 项低等问题：页面信息密度过低、未使用 React.memo、图标颜色未显式控制
  - 推荐处理：删除死代码文件（后端已自带 Swagger UI），或在 Sidebar 添加外链菜单项
  - 评审报告 tasks/review/api-docs.index.tsx.committer.md

## 本次变更（2026-05-24 apis/config/index.ts Committer审核专家评审）
- [x] **Committer审核专家评审 apis/config/index.ts（147 行）**
  - 综合判定：通过（APPROVE）— 安全基础优秀 + 测试覆盖充分 + 配置管理规范
  - 测试文件：808 行，约 116 个测试用例，覆盖率 >95%
  - API 契约正确性：15 个接口属性类型与实际值 100% 匹配，6 个下游消费者完全兼容
  - 安全评审修复验证：commit 60c96fd 的 6 项修复全部正确到位
  - 交叉审核两份已有评审（安全评审 + 质量评审 A-），所有问题均不阻塞合并
  - 建议合并后 P1 修复：Q-01 子接口 readonly 对齐（5min）、Q-06 JWT 强度校验（3min）
  - 评审报告 tasks/review/config-index.committer.md

## 本次变更（2026-05-24 article.controller.ts TDD 测试补全）
- [x] **article.controller.ts 测试用例补全** — 从 181 个增加到 213 个测试用例（+32）
  - 新增 Zod 验证边界测试 17 个：title/keywords/article_type/portrait/images/platforms/content 长度限制、llm_model_id 类型限制、Zod strict extra 字段拒绝、scheduled_publish_at 格式校验、invalid status 枚举
  - 新增 sysadmin 自审绕过 SoD 检查测试 2 个：sysadmin 可审核/拒绝自己的文章
  - 新增 handleServerError 错误映射测试 7 个：服务层抛出特定错误→对应HTTP状态码
  - 新增 content 类型验证 3 个：null/boolean/array→400
  - 新增字段白名单验证 1 个：schedule_type 通过 Zod 但被 pickAllowedFields 剥离
  - 新增 admin projectService 异常 1 个
  - 新增 delete 状态覆盖 2 个：generate_failed/draft sysadmin 删除
  - 修复 anti-crawl 中间件 IP 封禁问题：mock antiCrawlMiddleware 避免 200+ 请求后 403
  - 修复 mock 缺少 articleVersion 模型问题
  - 覆盖率：controller 92.85%/86.44%/100%/100%，service 95.55%/93.5%/100%/100%
  - TDD 报告：tasks/tdd/article.controller.test.md

## 本次变更（2026-05-24 ArticleDetail.tsx 软件质量专家评审）
- [x] **软件质量专家评审 pages/article/ArticleDetail.tsx（889 行）**
  - 综合评级 C+（功能完整，但组件体量严重超标，职责耦合度高）
  - 14 项质量发现：CRITICAL×2（889行单组件违反SRP、mammoth HTML转换XSS风险）、HIGH×3（localStorage解析无容错、Token重复获取11处、useEffect依赖项缺失）、MEDIUM×5（知识库API无缓存、JSX嵌套过深、错误处理不一致、表单校验分散、类型安全不足）、LOW×4（CSS变量引用不规范、缺少loading提示、Collapse forceRender、未使用date工具）
  - 安全问题汇总：CRITICAL×1（XSS）、HIGH×1（localStorage）、MEDIUM×2（Token存储/CSRF）、LOW×1（URL校验）
  - 正面评价：业务流程完整9/10、权限控制到位、自动保存机制合理、文档导入功能良好
  - 建议拆分方案：主组件+6个子组件+3个自定义hooks
  - 评审报告 tasks/review/ArticleDetail.tsx.md

## 本次变更（2026-05-24 ArticleDetail.tsx 软件架构专家评审）
- [x] **软件架构专家评审 pages/article/ArticleDetail.tsx（889 行）**
  - 综合评级 D+（功能完整但架构严重不合理，God Component 反模式）
  - 13 项架构发现：CRITICAL×3（889行God Component、无API层抽象、17个useState无聚合策略）、HIGH×4（useEffect生命周期管理缺陷、权限架构内嵌、自动保存竞态风险、类型架构薄弱）、MEDIUM×4（Collapse forceRender、location.state滥用、错误处理无层次化设计、组件通信架构缺失）、LOW×2（魔法字符串散布、新建/编辑模式混合）
  - 量化分析：文件行数超标4.4×、useState超标3.4×、异步函数超标6×、JSX嵌套超标1.7×
  - 提出目标架构：主文件~100行 + 5个子组件 + 6个自定义hooks + API层封装
  - 重构路线图：Phase 1安全修复(1天) → Phase 2组件拆分(2-3天) → Phase 3 Hook提取(1-2天) → Phase 4类型架构(1天) → Phase 5性能优化(1天)
  - 评审报告 tasks/review/ArticleDetail.tsx.architecture.md

## 本次变更（2026-05-24 apis/config/index.ts 评审问题修复）
- [x] **fix013: apis/config/index.ts 评审问题修复** — 7 项质量改进，120 个测试通过
  - Q-01: 子接口（DatabaseConfig/JwtConfig/RateLimitConfig/CronConfig）所有属性添加 `readonly`
  - Q-02: 新增 `DEFAULTS` 常量集中管理 13 个默认值
  - Q-03: `dotenv.config()` 简化，移除冗余 path import
  - Q-05: `safeParseInt` 新增浮点字符串拒绝（`/^-?\d+$/` 正则校验）
  - Q-06: JWT Secret 长度 < 32 字符时 console.error 警告
  - Q-08: 连接池参数新增 `DB_POOL_MIN`/`DB_POOL_MAX` 环境变量
  - Q-09: deepFreeze 添加适用范围 JSDoc 注释
  - 测试从 116 个增加到 120 个（+4：JWT强度×2、连接池覆盖×2、浮点拒绝×1、pool.min=0×1，修改浮点截断→拒绝×1）

## 本次变更（2026-05-24 controller/index.ts TDD 测试补全）
- [x] **apis/controller/index.ts barrel 文件 TDD 测试** — 140 个测试用例，100% 覆盖率
  - 新增 `tests/apis/controller/index.test.ts`（~300行）
  - 导出数量验证（33个命名导出）、存在性与类型验证（33个函数）、无意外导出验证
  - 按模块分组验证（7个源模块）、导出唯一性验证、函数引用唯一性验证
  - 源模块关联验证（7个模块的函数引用一致性）
  - 封装完整性验证（10个未导出函数不泄漏）
  - 函数参数数量验证（33个函数均接受2参数）、异步函数验证（33个）
  - 重导入一致性验证（Node.js 模块缓存）
  - 模块结构汇总验证
  - TDD 报告：tasks/tdd/controller.index.test.md

## 本次变更（2026-05-24 article.controller.ts 软件质量专家评审）
- [x] **软件质量专家评审 apis/controller/article.controller.ts（553 行）**
  - 综合评级 B（良好，有改进空间）
  - 17 项质量发现：CRITICAL×2（TOCTOU竞态条件、STATUS_TRANSITIONS死代码）、HIGH×5（~22%代码重复、字符串匹配错误处理、createArticle未用created()、updateArticleContent缺Zod、scheduled_publish_at未校验未来时间）、MEDIUM×6（无依赖注入、skills字段unknown、类型信息丢失、getAuthUser价值有限、regenerate无频率限制、delete缺关联清理指引）、LOW×4（魔法数字、无日志、try-catch控制流、VALID_CREATE_STATUSES死代码）
  - 正面评价：安全意识强（白名单三重防护）、权限分层清晰、防御性编程
  - 修复优先级：P0×2（竞态条件+死代码清理）、P1×5、P2×6、P3×4
  - 评审报告 tasks/review/article.controller.ts.quality.md

## 本次变更（2026-05-24 knowledge-base.controller.ts TDD 测试补全）
- [x] **knowledge-base.controller.ts 测试用例补全** — 从 88 个增加到 93 个测试用例（+5）
  - 新增 Controller !user 防御性分支直接函数测试 5 个：直接导入 controller 函数，构造无 user 的 mock req/res，覆盖 auth 中间件不可达的防御性分支
  - 覆盖率从 91.93%/93.97%/100%/100% 提升到 **100%/100%/100%/100%**
  - TDD 报告：tasks/tdd/knowledge-base.controller.test.md

## 本次变更（2026-05-24 article.controller.ts 代码安全专家评审）
- [x] **代码安全专家评审 apis/controller/article.controller.ts（553 行，已修复版）**
  - 综合安全评级 B+（良好，前轮 CRITICAL-1/2、HIGH-1~4、MEDIUM-3/4 已全部修复）
  - 已修复安全措施评估：8/8 项修复有效（白名单过滤、状态机、Zod schema、职责分离、错误处理、内容限制、创建者检查、防御性认证）
  - 新发现 11 项安全问题：HIGH×2（TOCTOU 竞态条件、updateArticleContent 无 Zod 验证+存储型XSS风险）、MEDIUM×5（字符串匹配错误处理、skills字段z.unknown()、版本列表无分页、状态验证逻辑分散、generating分支补丁式修复）、LOW×4（死代码、Service单例、权限检查重复、时序侧信道）
  - 安全评分提升：输入验证 3→7、认证授权 5→8、数据泄露 4→8
  - 评审结论：✅ 通过（附建议），核心安全问题已修复，剩余为改进项
  - 评审报告 tasks/review/article.controller.ts.md

## 本次变更（2026-05-24 ArticleDetail.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 pages/article/ArticleDetail.tsx（889 行）**
  - 综合判定：❌ 拒绝合并（REJECT）— 5项致命问题 + 4项高危问题
  - 致命问题 BLK-01~05：零测试覆盖、缺少删除功能（规格要求）、待审核状态正文不可编辑（EDITABLE_STATUSES 缺 pending_review）、generate_failed/publish_failed 状态无法重新提交（handleRegenerate 死代码）、Alert title prop 错误（应为 message）
  - 高危问题 HIG-01~04：JSON.parse 无防护（白屏风险）、存储型 XSS（Markdown 无消毒）、自动保存定时器竞态、13+ 处重复 localStorage 读取
  - 中等问题 MED-01~05：Collapse 替代 Tabs（规格偏差）、无版本历史浏览、any 类型滥用、操作按钮条件过严、未保存提示缺失
  - 规格符合度：14/20 通过（70%），3 项功能缺失/Bug
  - 交叉审核四份已有评审（质量C+/安全D+/UI 4.2/架构D+），诊断均认同
  - 评审报告 tasks/review/ArticleDetail.tsx.committer.md

## 本次变更（2026-05-24 article.controller.ts 评审问题修复）
- [x] **fix014: article.controller.ts 评审问题修复** — 6 项修复，213 个测试通过
  - P1-1: updateArticleContent 补全 Zod schema（updateContentSchema: z.string().min(1).max(500_000).strict()）
  - P1-2: submitForReview 添加 isValidStatusTransition 统一状态转换校验
  - P1-3: 删除 VALID_CREATE_STATUSES 死代码常量
  - P2-1: createArticle 使用 created() 函数统一 201 响应格式
  - P2-2: handleServerError 改用类型化异常（NotFoundError/BusinessError），service 层同步替换
  - P2-3: scheduled_publish_at 添加未来时间校验（Zod refine）
  - 涉及文件：article.controller.ts、article.schema.ts、article.service.impl.ts、article.controller.test.ts

## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 软件质量专家评审）
- [x] **软件质量专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合评分 5.3/10（类型定义功能正确但工程质量不足）
  - P1×3：warpperElement 拼写错误永久化到公共 API、MarkdownPreviewRef 暴露全部 Props 违反 React 最佳实践、wrapperElement 类型重复（20% DRY 违反率）
  - P2×4：文件扩展名 .tsx 无 JSX 内容应改为 .ts、隐式 React 全局命名空间引用、source 属性缺乏语义约束、pluginsFilter 参数名与类型不匹配
  - P3×3：属性缺乏 JSDoc 文档、data-color-mode 不支持 auto 模式、onMouseOver 冒泡事件选择未说明
  - 正面评价：类型继承正确（Omit<Options, 'children'>）、事件类型携带泛型参数、弃用标记完备
  - 评审报告 tasks/review/Props.tsx.quality.md

## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 软件架构专家评审）
- [x] **软件架构专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合评分 5.0/10（核心类型设计合理，Ref 接口架构和依赖耦合存在明显缺陷）
  - P1×3：Ref 接口继承全部 Props 违反 ISP/OCP 原则、WrapperElement 类型泄漏 React 实现细节（DetailedHTMLProps）、类型重复 20% DRY 违反率
  - P2×4：隐式 React 全局依赖违反 DIP、source 属性命名与 react-markdown 语义断裂、pluginsFilter 扩展点粒度不足、Props 与 Ref 混合在同一文件职责边界不清
  - P3×3：warpperElement 弃用策略缺乏运行时过渡架构、data-color-mode 缺少 auto 模式、disableCopy 否定式命名
  - SOLID 评估：SRP⚠️、OCP❌、LSP✅、ISP❌、DIP⚠️
  - 评审报告 tasks/review/Props.tsx.architecture.md

## 本次变更（2026-05-24 apis/app.ts TDD 测试第三次补全）
- [x] **apis/app.ts 测试用例第三次补全** — 从 156 个增加到 184 个测试用例（+28）
  - 新增审计日志中间件测试 10 个：console.warn 4xx/5xx 记录、200 不记录、userId/anonymous 区分、timing/method/URL/IP 格式验证
  - 新增 Login Body 类型验证测试 4 个：非字符串用户名/密码、超长用户名/密码
  - 新增 Auth Verify 正向测试 2 个：sysadmin/admin token 返回 200 + valid:true
  - 新增 CORS 边界测试 2 个：无 origin 请求通过、Content-Type 头验证
  - 新增全局错误处理器深度测试 2 个：结构化日志、统一 500 响应格式
  - 新增健康检查隔离测试 3 个：无 UA/无认证/响应时间 <100ms
  - 新增 Auth 路由方法覆盖 3 个：admin pass auth、selection/companies 401
  - 新增中间件执行顺序测试 2 个：health check 绕过 anti-crawl、login 经 anti-crawl 拦截
  - 覆盖率：Stmts 88.73%, Branch 61.53%, Funcs 87.5%, Lines 90%
  - TDD 报告：tasks/tdd/app.test.md（第三次更新）

## 本次变更（2026-05-24 apis/app.ts 软件质量专家第三轮复审）
- [x] **软件质量专家评审 apis/app.ts（259 行，修复后复审）**
  - 综合评级 B+（从 B 提升，修复质量扎实，可维护性瓶颈依旧）
  - 验证五项修复落地质量：Q-03注释修正✅、Q-06/SEC-2.04 Swagger条件化✅、SEC-2.05错误上下文✅、SEC-2.06审计日志✅
  - 剩余质量问题 7 项：HIGH×1（96条路由平铺）、MEDIUM×3（中间件重复90+、无API版本化、无请求验证层）、LOW×3（角色硬编码、路由分组不一致、日志格式不统一）
  - 新发现 RQ-07：审计日志（空格分隔）与错误日志（JSON.stringify）格式不一致
  - 修复优先级：P0×2（路由拆分+Router级中间件）、P1×3（zod验证+API版本化+日志格式统一）、P2×2（角色常量化+路由分组）
  - 评审报告 tasks/review/app.ts.md

## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 代码安全专家评审）
- [x] **代码安全专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合安全评级 ⚠️ MEDIUM（类型定义层面存在多处安全隐忧，需配合实现层验证）
  - 8 项安全发现：HIGH×2（source无长度/内容约束DoS/XSS风险、rehypeRewrite无约束HTML AST重写可绕过安全过滤）、MEDIUM×2（pluginsFilter可移除安全插件、继承react-markdown Options未过滤危险属性如allowElement）、LOW-MEDIUM×2（wrapperElement接受任意HTML属性潜在事件注入、MarkdownPreviewRef暴露全部Props+DOM引用）、LOW×1（warpperElement弃用仍可传入危险属性）、INFO×1（事件回调无消毒）
  - 供应链评估：react-markdown < v9 默认允许HTML渲染风险、rehype-rewrite AST重写能力本身是风险
  - 提供本项目调用安全检查清单（8项）和上游调用防护建议
  - 评审报告 tasks/review/Props.tsx.security.md

## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 软件UI专家评审）
- [x] **软件UI专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合评分 4.1/10（组件API基本可用，设计系统对齐/可访问性/开发者体验存在多项缺陷）
  - 12 项 UI 发现：P1×3（data-color-mode 缺失 auto 模式、无可访问性 a11y Props、warpperElement 拼写错误弃用属性仍在 API）、P2×4（wrapperElement 类型过于复杂、disableCopy 否定式命名、source 属性语义模糊、缺少加载/错误/空状态 Props）、P3×4（pluginsFilter 缺少功能级开关、缺少子区域样式控制、Ref 暴露全部 Props、事件处理不完整）
  - DESIGN.md 合规性映射分析：需 50+ 条 CSS 覆盖规则才能对齐 Carbon Design System
  - antd 集成兼容性分析：ConfigProvider 主题/Design Token/i18n/Form 集成均不兼容
  - 提供本项目的集成建议（封装组件 + CSS 覆盖清单）
  - 评审报告 tasks/review/Props.tsx.ui.md

## 本次变更（2026-05-24 apis/app.ts 软件架构专家重构后复审）
- [x] **软件架构专家评审 apis/app.ts（148 行，路由模块化后复审）**
  - 综合评级 B+（从第一轮 B- 提升，核心架构瓶颈已消除）
  - 验证第一轮 CRITICAL×2 + HIGH×3 修复情况：C-1 路由模块化✅、C-2 中间件重复消除✅、H-1 注释修正✅、M-1 Swagger条件化✅、M-3 错误分类处理✅、SEC-2.05 错误上下文✅、SEC-2.06 审计日志✅
  - 剩余架构问题 7 项：P2×4（无API版本化、CORS拒绝无日志、静态文件绕过安全中间件、Swagger require类型安全）、P3×4（路由挂载前缀不一致、日志格式不统一、畸形JSON无处理、请求体大小硬编码）
  - 文件从 239 行减至 148 行（-38%），Controller 导入从 16 个降为 0 个
  - SOLID 评估改善：SRP ❌→✅、OCP ❌→⚠️、ISP ⚠️→✅
  - 评审报告 tasks/review/app.ts.architecture.md

## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合判定：⚠️ 有条件通过（CONDITIONAL APPROVE）— 依赖可保留，但必须创建封装组件隔离风险
  - 四份已有评审综合裁定：架构5.0/10🟡不阻塞、质量5.3/10🟡不阻塞、安全⚠️MEDIUM🔴需调用层防护、UI 4.1/10🟡需封装+CSS覆盖
  - 6项阻塞项（封装层完成前不可生产使用）：创建MarkdownViewer封装组件、source长度截断≤1MB、禁止暴露rehypeRewrite/pluginsFilter、确认react-markdown≥9.0、CSS覆盖对齐Carbon Design System、a11y属性
  - 4项建议改进：封装组件加载/错误/空状态、主题自动同步、单元测试、版本锁定
  - 安全重点：SEC-MD-01 source无约束(HIGH)和SEC-MD-02 rehypeRewrite无约束(HIGH)必须在调用层防护
  - 评审报告 tasks/review/Props.tsx.committer.md

## 本次变更（2026-05-24 apis/app.ts 代码安全专家重构后复审）
- [x] **代码安全专家评审 apis/app.ts（148 行，路由模块化后安全复审）**
  - 综合安全评级 A-（从原始 C 级提升，历史 6 项 CRITICAL/HIGH/MEDIUM 漏洞全部修复）
  - 验证历史漏洞修复：SEC-01 CORS 开放✅、SEC-02 JWT 硬编码✅、SEC-03 缺安全头✅、SEC-04 无错误处理✅、SEC-05 无请求体限制✅、SEC-06 Swagger 暴露✅
  - 新发现 8 项安全事项：MEDIUM×3（CORS !origin 允许无 Origin 请求、Health Check 绕过安全中间件、静态文件路径依赖 process.cwd()）、LOW×5（JSON 10MB 偏高、trust proxy 固定值、缺 CSP、无请求超时、日志格式不一致）
  - 防御层完整性评估：CSRF/XSS/SQL注入/暴力破解/DDoS/CORS滥用/信息泄露/请求体DoS/路径遍历/JWT伪造 全部有对应防御
  - 安全改进路线图：P0×2（静态文件路径+请求超时）、P1×4（JSON body 限制+Health 限流+trust proxy 配置化+日志格式统一）、P2×1（Swagger CSP）
  - 评审报告 tasks/review/app.ts.security.md
