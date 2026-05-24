# 前端约定

## 侧边栏菜单（按角色排列，从上到下，带 icon）
**sysadmin**：AI知识库(Book)、文章管理(FileText)、发布管理(Trophy)、常用工具(Tool)、项目管理(Project)、技能管理(Thunderbolt)、用户管理(Team)、公司管理(Home)、系统管理(Setting)
**admin**：AI知识库(Book)、文章管理(FileText)、发布管理(Trophy)、常用工具(Tool)、项目管理(Project)、技能管理(Thunderbolt)
**view**：发布管理(Trophy)

## 侧边栏 footer 信息区
- 展开态：用户名+登出 | `CompanyProjectSwitcher` 组件（公司名+切换按钮 / 项目名）
- 折叠态：仅登出按钮
- Sidebar 不再直接管理公司/项目选择，委托给 `CompanyProjectSwitcher`
- `CompanyProjectSwitcher` 点击切换按钮打开 Modal，使用 `/api/auth/context` 获取选项列表
- 确认切换时调用 `PUT /api/auth/selection` 持久化到服务端 + `AppContext.setContext` 更新前端状态

## AppContext（公司/项目上下文）
- `pages/context/AppContext.tsx` — React Context，提供 companyId/projectId/companyName/projectName/setContext
- 登录后 Layout 从 LoginResponse 的 selected_company/selected_project 初始化 localStorage
- AppContextProvider 包裹整个 Layout，所有子组件可通过 `useAppContext()` 获取当前选择
- 选择数据同时存储在 localStorage（`selected_company`/`selected_project` 键）和 User 表（`selected_company_id`/`selected_project_id` 字段）

## 布局规则
- 使用 antd 的 Layout（AntLayout, Sider, Content）替代自定义 CSS 布局
- Sider 宽度 240px，折叠宽度 64px，白色背景
- 左右布局：左侧 Sidebar 组件放在 antd Sider 内，右侧 Content 区域
- 加载状态使用 antd `<Spin />` 组件
- 内容必须撑满整个视口高度，不能出现底部灰色空隙
- 高度继承链：`html(100%) → body(100%, margin:0) → #root(100%) → AntLayout(height:100vh,overflow:hidden) → Content(flex:1,overflow-y:auto,overflow-x:hidden)`
- 内部页面容器加 `flex: 1` 撑满
- 移动端响应式：antd Sider `position: fixed`

## SPA 路由
- Vite 的 `root` 设为 `pages/`，页面路由（如 `/login`）会与 `pages/login/` 目录冲突，导致刷新时返回 .tsx 源码
- 已在 `vite.config.ts` 添加 `spa-fallback` 插件，在静态文件服务前拦截导航请求（`Accept: text/html`）重写为 `/index.html`

## 组件规范
- 必须使用 antd（Ant Design）组件构建 UI，禁止用原生 HTML 替代（Button, Input, Form, Card, Menu, Layout, Modal, Select, Switch, Tag, Popconfirm, Typography, Space, Pagination, Spin 等）
- **禁止使用 antd Table 组件**，数据列表统一使用 Row + Col + Card 网格布局（见 `.claude/feedback_no-tables.md`）
- **禁止使用 antd 静态方法**（`message.success()`、`notification.open()` 等），必须通过 `App.useApp()` hook 获取实例：`const { message } = App.useApp()`
  - `main.tsx` 已用 antd `<App>` 组件（别名 `<AntApp>`）包裹在 `<ConfigProvider>` 内、`<BrowserRouter>` 外
- antd Space 组件使用 `direction`（非 `orientation`），已修复 UI-10 评审问题
- antd Modal 组件用 `destroyOnHidden` 替代已废弃的 `destroyOnClose`
- 字体：IBM Plex Sans，通过 `@fontsource/ibm-plex-sans` 本地打包，不使用 Google Fonts CDN
- 单一 CSS 文件：`pages/styles/global.css`，通过 CSS 变量 + antd 覆盖实现 DESIGN.md 规范
- **MarkdownViewer 封装组件**：`pages/components/MarkdownViewer.tsx`，封装 `@uiw/react-markdown-preview`
  - 安全管控：source 截断 ≤1MB、不暴露 rehypeRewrite/pluginsFilter/warpperElement
  - a11y：`role="region"` + `aria-label="Markdown 内容预览"`
  - 支持加载/错误/空状态（使用 antd Spin/Empty/Typography）
  - 专用 CSS：`pages/styles/markdown-viewer.css`，使用 `.markdown-viewer` 类名 + CSS 变量引用 Carbon Token
  - global.css 中 `.article-content-preview` 样式保留兼容，新代码应使用 MarkdownViewer 组件
- antd 主题通过 `main.tsx` 的 `ConfigProvider` 配置，全局覆盖 border-radius: 0 等 Carbon 风格
- **Switch 组件不参与全局 border-radius: 0 覆盖**，保持 antd 默认椭圆胶囊样式
- **Switch 使用 checkedChildren/unCheckedChildren** 显示"启用"/"禁用"文字，增强可读性
- **antd 主题 controlHeight 必须统一**：Button/Input/Select 的 controlHeight 必须设为相同值，否则 Input.Search（内含 Button）和 Select 高度不一致
- **公司管理页面使用独立的 `company-card-*` CSS 类**，不使用 `item-card-*`，整卡可点击跳转编辑页

## 卡片设计规范
- **添加按钮卡片**：虚线边框 + PlusOutlined 图标 + 文字，纵向居中排列，与内容卡片等高等宽
  - CSS 类：`.company-add-card`（flex-direction: column, height: 100%）
  - 图标大小 32px，min-height: 100px
- **用户卡片**：两行紧凑布局
  - 第一行：用户姓名（Title）+ 右上角 EditOutlined 编辑图标（`.item-card-header`）
  - 第二行：@username + 角色 Tag + Switch 胶囊，`justify-content: space-between` 平均分配
  - 无删除按钮，编辑通过右上角图标触发
- **公司卡片**：标题（短名）+ 副标题（全名）+ 地址 + 联系人信息

## antd Form 注意事项
- **不要在 Form 未渲染时调用 `form.setFieldsValue`**：会触发 "Instance created by useForm is not connected to any Form element" 警告
  - 错误做法：`fetching` 时 return 提前不渲染 `<Form>`，但异步回调里调用 `form.setFieldsValue`
  - 正确做法：始终渲染 `<Form>`，loading 时用 `display: none` 隐藏或用 `<Spin>` 覆盖

## 表单联动模式
- **项目表单（ProjectForm）**：选择公司后联动加载运营者和查看者列表
  - 选择公司 → `fetchCompanyUsers(companyId)` → 从 `/api/auth/companies/:id` 获取 `operators` 和 `viewers`（注意：不走 `/api/companies/:id`，该接口 sysadmin-only）
  - 运营者下拉：`Select mode="multiple"`，options 来自公司运营者列表
  - 查看者下拉：`Select mode="multiple"`，options 来自公司查看者列表
  - 切换公司时清空运营者和查看者选择（`form.setFieldsValue({ operator_ids: [], viewer_ids: [] })`）
- **公司表单（CompanyForm）**：运营者和查看者各自独立多选
  - 运营者：从所有 `role='admin'` 用户中选择（`Select mode="multiple"`）
  - 查看者：从所有 `role='view'` 用户中选择（`Select mode="multiple"`）

## 文章页面模式
- **文章列表页** `/article`：卡片网格 + 搜索 + 状态筛选 + 分页
  - 点击卡片 → `navigate('/article/${id}')` 进入详情/编辑页
  - 点击「添加文章」→ `navigate('/article/new')`
  - 删除仅限非已发布状态+创建者/sysadmin，通过 Popconfirm 确认
- **文章详情/编辑页** `/article/:id`：独立路由页面（非Modal）
  - 顶部：返回箭头 + 标题 + 状态 Tag
  - Tabs 标签页切换：「文章设置」和「正文」（有正文时才显示正文Tab）
  - 文章设置 Tab：表单字段，非编辑状态时 disabled
  - **四个操作按钮（仅 draft 状态显示）**：「取消」「存草稿」「手工编写」「提交给AI」
  - 正文 Tab：MDEditor 编辑 + 版本号显示 + 保存按钮
  - **手工编写中(manual_writing)状态正文区**：「保存正文」+「提交审核」两个按钮
  - **可编辑性判断**：
    - `canEditSettings()`: status === 'draft' && (sysadmin || created_by === userId)
    - `canEditContent()`: EDITABLE_STATUSES.includes(status) && (sysadmin || created_by === userId)
    - EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed']
  - **pending_review 状态不可编辑**：审核状态时正文和设置均为只读
- **可编辑性判断**：
  - `canEditSettings()`: EDITABLE_STATUSES.includes(status) && (sysadmin || created_by === userId)
  - `canEditContent()`: [...EDITABLE_STATUSES, 'pending_review'].includes(status) && (sysadmin || created_by === userId)

## CSS 规范（不可违反）
- **禁止在 TSX 文件中使用 inline style（`style={{}}`）**，所有样式必须写入 `pages/styles/global.css`
- 唯一例外：antd 组件需要传 style prop 才能生效的个别属性（如 Sider 的 width/collapsedWidth 等数值 props）
- CSS 类名使用语义化命名：`.page-container`, `.page-title`, `.sidebar-header`, `.form-actions` 等
- CSS 变量定义在 `:root` 中，类名中通过 `var(--color-*)` 引用

## UI评审发现的系统性问题（ArticleDetail.tsx.ui.md）
- **antd Alert `title` prop 错误**: antd Alert 使用 `message` 而非 `title`（L526, L797），导致错误信息不显示。同样问题存在于 login/index.tsx，是系统性问题。**已在重构中修复**
- **Table `sortOrder: null` 类型错误**: 应为 `undefined`，TypeScript 严格模式下会报错。**已修复**
- **40+ 处内联样式**: ArticleDetail.tsx 严重违反 CSS 规范，需逐步迁移到 global.css
- **CSS 变量命名不一致**: `--text-secondary`/`--interactive`/`--border-subtle` 与 DESIGN.md 的 `--color-ink-muted`/`--color-primary`/`--color-hairline` 不一致
- **beforeunload 未保存提示**: ✅ 已添加，检测内容变更和表单脏状态
- **响应式设计**: ✅ Modal 宽度和 MDEditor 高度已使用 antd Grid.useBreakpoint 适配
- **可访问性**: ✅ 图片选择和平台选择已添加 ARIA 属性和键盘支持
- **保存状态指示器**: ✅ 自动保存时显示"保存中"/"已保存"状态
- **新增 CSS 变量**: `--color-overlay-light`（rgba(22,22,22,0.25)）、`--color-overlay-medium`（rgba(22,22,22,0.5)）

## 页面标题规范
- **所有页面标题统一使用 antd `<Breadcrumb>` 组件**，不再使用 `Typography.Title level={1}` 或 `<h1>`
- Breadcrumb 外层用 `<div className="page-breadcrumb">` 包裹，CSS 实现居中对齐
- 面包屑结构：
  - 列表页：单级 `[当前页面名]`
  - 表单页（添加/编辑）：两级 `[父页面名, 操作名]`（如 公司管理 > 添加公司）
- 登录页标题也使用 Breadcrumb（`[薄云商机倍增服务]`），不使用 Typography.Title
- ⚠️ UI评审(App.tsx.ui.md UI-08)指出：Breadcrumb 语义误用为页面标题，不符合可访问性标准(WCAG)，建议未来改为 Typography.Title + PageHeader 组件

## 布局防溢出规范（重要）
- `.app-layout-root` 使用 `height: 100vh; overflow: hidden`（不用 `min-height`）
- `.main-content` 使用 `overflow-y: auto; overflow-x: hidden`（内容区独立滚动）
- `.page-breadcrumb` 用 `padding-bottom` 而非 `margin-bottom`（避免外边距导致溢出）
- **踩坑：`overflow-y: auto` 会隐式将 `overflow-x` 也设为 `auto`**，导致 1px border 触发横向滚动条，必须显式设 `overflow-x: hidden`

## 侧边栏折叠展开
- Layout 管理 `collapsed` 和 `isMobile` 状态，通过 props 传给 Sider 和 Sidebar
- 菜单项定义使用 `icon: ReactNode`，antd `inlineCollapsed` 模式自动只显示 icon
- **PC 端**：Sider collapsedWidth=64，显示 icon + 折叠按钮 + 底部图标操作
- **移动端(<=672px)**：Sider collapsedWidth=0 完全隐藏，左上角浮动展开按钮
- 折叠/展开按钮逻辑全部收敛在 `Sidebar.tsx`，Layout 不定义按钮
- 移动端展开时显示半透明遮罩，点击遮罩或菜单项自动收起
- 移动端默认折叠，窗口 resize 到移动端宽度自动收起

## App.tsx 路由结构
- **分层架构**: ErrorBoundary → AuthProvider → Routes → AuthGuard → Layout → PageRouter
- **ErrorBoundary 包裹整个 Routes**，防止子组件渲染异常导致白屏
- **AuthProvider** 管理 `user`/`loading`/`login`/`logout`，跨标签页同步 storage 事件
- **AuthGuard** 检查 user 是否存在，未认证重定向到 /login（保存 redirect_after_login）
- 路由表仅两条：`/login` → LoginPage，`/*` → AuthGuard → Layout
- **PageRouter** (`pages/router/routes.tsx`) 集中管理 20+ 路由，每条含 `roles` 角色守卫
- 所有页面组件使用 React.lazy 按需加载（代码分割），Suspense fallback 显示 Spin
- 无角色权限的路由访问会被重定向到 `/publish`
- `import React` 已移除（tsconfig.page.json 使用 `jsx: "react-jsx"` 自动注入）
- ErrorBoundary 使用 antd Result + Button 提供友好错误页面，点击"返回登录"清除 localStorage 并跳转
- **主题配置**抽取到 `pages/theme/carbon.ts`，main.tsx 引用 `carbonTheme`
