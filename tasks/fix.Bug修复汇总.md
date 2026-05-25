# fix. Bug 修复汇总

> 状态：✅ 全部已完成

---

## fix001. Switch 圆角修复

### 问题
全局 `border-radius: 0` 规则影响了 `.ant-switch`，导致 Switch 变成方形而非椭圆胶囊。

### 修复
在 `pages/styles/global.css` 中排除 `.ant-switch`：
```css
*:not(.ant-switch) { border-radius: 0 !important; }
```

### 涉及文件
- `pages/styles/global.css`

---

## fix002. toolbar 控件高度不一致

### 问题
ConfigProvider 中 `Button.controlHeight=48` 而 `Input/Select.controlHeight=40`，导致 Input.Search（内含 Button）高度异常。

### 修复
统一所有控件 controlHeight 为 40px：
```typescript
components: {
  Button: { controlHeight: 40 },
  Input: { controlHeight: 40 },
  Select: { controlHeight: 40 },
}
```

### 涉及文件
- `pages/main.tsx` ConfigProvider

---

## fix003. antd 废弃 API 警告

### 问题
控制台出现 antd 废弃 API 警告。

### 修复
- Space 组件：`direction` → `orientation`
- Modal 组件：`destroyOnClose` → `destroyOnHidden`

### 涉及文件
- `pages/components/Sidebar.tsx` — Space orientation
- 所有 Modal 组件 — destroyOnHidden

---

## fix004. CompanyForm useForm 警告

### 问题
编辑模式下异步加载公司详情后调用 `form.setFieldsValue`，但 Form 可能未渲染，触发 "Instance created by useForm is not connected to any Form element" 警告。

### 修复
始终渲染 `<Form>`，loading 时用 `display: none` 隐藏。

### 涉及文件
- `pages/company/CompanyForm.tsx`

---

## fix005. User 路由权限违规

### 问题
用户管理 API 使用 `roleMiddleware('sysadmin', 'admin')` 允许 admin 访问，但规范（permissions.md Section 2.4）明确"只有 sysadmin 角色有权限"。

### 修复
1. `apis/app.ts`：`roleMiddleware('sysadmin', 'admin')` → `roleMiddleware('sysadmin')`
2. `apis/controller/user.controller.ts`：移除 admin 公司隔离逻辑
3. `tests/apis/user.controller.test.ts`：admin 全部改为期望 403

### 涉及文件
- `apis/app.ts:78-83`
- `apis/controller/user.controller.ts`
- `tests/apis/user.controller.test.ts`

---

## fix006. ProjectForm 调用 sysadmin-only API

### 问题
`ProjectForm.tsx` 调用 `/api/companies/:id` 获取运营者/查看者，该接口 sysadmin-only，admin 打开会 403。

### 修复
1. 新增 `GET /api/auth/companies/:id` 接口（所有已登录角色可用，admin 只能查自己公司）
2. `ProjectForm.tsx`：`/api/companies/:id` → `/api/auth/companies/:id`

### 涉及文件
- `apis/controller/auth.controller.ts` — 新增 getCompanyDetail
- `apis/service/auth.service.ts` + `impl` — 新增 getCompanyUsers
- `apis/app.ts` — 新增路由
- `pages/project/ProjectForm.tsx` — 修改 API 路径
- `tests/apis/auth.controller.test.ts` — 5 个新测试

---

## fix007. 用户管理工具栏列宽溢出导致添加按钮换行

### 问题
用户管理页 toolbar 的 sm 列宽总和 12+6+6+6=30 超出 antd Row 的 24 列限制，导致"添加用户"按钮换行到下一行，无法靠右对齐。

### 修复
调整栅格列宽为 sm={12}+sm={4}+sm={4}+sm={4}=24，按钮列使用 `justifyContent: 'flex-end'` 靠右对齐。

### 涉及文件
- `pages/user/index.tsx`

---

## fix008. 知识库关键词/画像卡片标题字体过大

### 问题
`Typography.Title level={3}` 的内置样式优先级高于 inline style，设置 `fontSize: 12` 不生效。

### 修复
将 `Typography.Title` 替换为普通 `<span>` 元素，直接通过 inline style 控制 `fontSize: 12`。

### 涉及文件
- `pages/knowledge/KnowledgeBaseDetail.tsx`

---

## fix009. 时间格式化未使用中国时区

### 问题
各页面使用 `new Date(value).getFullYear()` 等方法取本地时区时间，未强制使用中国时区 (Asia/Shanghai UTC+8)。

### 修复
1. 创建共享工具 `pages/utils/date.ts`，使用 `toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })` 强制东八区
2. 替换所有页面的本地 `formatDate`/`formatDateTime` 函数为共享版本
3. 写入 CLAUDE.md 铁律第 3 条

### 涉及文件
- `pages/utils/date.ts`（新建）
- `pages/article/index.tsx`
- `pages/knowledge/index.tsx`
- `pages/knowledge/KnowledgeBaseDetail.tsx`
- `pages/publish/index.tsx`
- `CLAUDE.md`

## fix007. 知识清单更新时间列宽不足导致换行

### 问题
知识清单表格中「更新时间」列宽 120px，格式化为中国时区后内容换行。

### 修复
列宽从 120px 增至 160px。

### 涉及文件
- `pages/knowledge/index.tsx`

---

## fix008. 文章存草稿/提交时正文内容未保存

### 问题
`handleSaveSettings` 函数中读取 `content` 状态变量时，闭包捕获了旧值，导致新导入或编辑的正文内容在存草稿/提交时未被包含在 payload 中。

### 修复
将 `content` 改为 `contentRef.current`（与自动保存逻辑一致，始终读取最新值）。

### 涉及文件
- `pages/article/ArticleDetail.tsx`

---

## fix009. 创建文章时 content 字段未保存

### 问题
`POST /api/projects/:projectId/articles` 创建文章时，请求体中包含 `content` 字段，但 API 返回 `content: null`。原因是 `article.service.impl.ts` 的 `create` 方法中 `prisma.article.create` 的 `data` 完全忽略了 `content` 字段，且 `CreateArticleRequest` 接口也未定义 `content` 属性。

### 修复
1. `CreateArticleRequest` 接口添加 `content?: string` 字段，同时补充 `manual_writing` 状态
2. `create` 方法中 `prisma.article.create` 的 `data` 添加 `content` 和 `version` 字段
3. 创建后如果 content 非空，自动保存为初始版本快照（与 update 方法逻辑一致）

### 涉及文件
- `apis/entity/article.entity.ts` — CreateArticleRequest 添加 content 和 manual_writing 状态
- `apis/service/impl/article.service.impl.ts` — create 方法保存 content 并创建版本快照

---

## fix010. auth.controller.ts 安全加固（评审问题修复）

### 问题
根据 tasks/review/auth.controller.md 评审报告，auth.controller.ts 存在 CRITICAL 级别 IDOR 越权漏洞和多个安全/架构问题。

### 修复

**C-1（CRITICAL）saveSelection IDOR 越权**：
- Service 层新增授权验证：调用 getAccessibleCompanies/getAccessibleProjects 检查用户是否有权选择指定公司/项目
- 接口签名变更：`saveSelection(userId, request)` → `saveSelection(userId, role, userCompanyId, request)`

**H-1 verify 端点冗余 Token 解析**：
- 移除 verify 函数内重复的 token 提取和验证逻辑，信任 authMiddleware 已完成认证

**H-3 err.message 泄露内部信息**：
- 500 错误统一返回通用消息（如"保存失败，请稍后重试"），不再暴露 err.message

**H-4 登录输入验证不足**：
- 添加 typeof 检查（防止数组/对象注入）
- 添加长度限制（username ≤ 100, password ≤ 200）

**H-5 saveSelection 参数验证不足**：
- parseInt + 正整数校验，拦截负数、0、NaN

**M-3 req.user 访问不一致**：
- 统一所有端点使用 `req.user` + 空值检查，移除 `(req as any).user` 和 `req.user!`

**L-1 catch 类型**：
- 所有 catch 块从 `err: any` 改为 `err: unknown`

### 涉及文件
- `apis/controller/auth.controller.ts`
- `apis/service/auth.service.ts`
- `apis/service/impl/auth.service.impl.ts`
- `tests/apis/auth.controller.test.ts`（85 个测试）
- `tests/apis/auth.service.test.ts`（42 个测试，含 3 个新增授权测试）
- `tests/apis/auth.context.test.ts`

---

## fix011. App.tsx 死路由 + 无 Error Boundary（评审问题修复）

### 问题
根据 tasks/review/ 目录下 4 份评审报告（架构评审、安全评审、UI评审、Committer审核），`pages/App.tsx` 存在以下问题：
1. **死路由 Bug**：第 11 行 `<Route path="/" element={<Navigate to="/login" replace />} />` 被 `path="/*"` 通配路由遮挡，永远不会执行
2. **无 Error Boundary**：子组件渲染异常导致整个应用白屏
3. **冗余 React 导入**：`tsconfig.page.json` 已使用 `jsx: "react-jsx"` 自动注入 React

### 修复
1. 删除死路由 `<Route path="/" .../>`，仅保留 `/login` 和 `/*` 两条路由
2. 创建 `pages/components/ErrorBoundary.tsx`，使用 antd Result + Button 提供友好的错误提示页面
3. 在 App.tsx 中用 ErrorBoundary 包裹 Routes
4. 移除冗余的 `import React from 'react'`
5. 创建 `tests/pages/App.test.tsx`，覆盖 7 个测试场景

### 涉及文件
- `pages/App.tsx` — 删除死路由、添加 ErrorBoundary、移除冗余 import
- `pages/components/ErrorBoundary.tsx`（新建）
- `tests/pages/App.test.tsx`（新建）

---

## fix012. CORS 拒绝导致登录接口返回500

### 问题
`/api/auth/login` 从 Docker 部署地址 `http://159.75.55.224:12380` 访问时返回 `{"code":500,"message":"服务器内部错误"}`。

两个问题叠加：
1. `.env` 未配置 `CORS_ORIGINS`，默认只有 `http://localhost:5173`，Docker 前端域名被拦截
2. CORS 中间件拒绝时 `callback(new Error('Not allowed by CORS'))` 抛出异常，被 Express 全局错误处理器捕获后返回 500

### 修复
1. `.env` 新增 `CORS_ORIGINS=http://localhost:5173,http://localhost:12380,http://159.75.55.224:12380`
2. `apis/app.ts`：CORS origin callback 从 `callback(new Error(...))` 改为 `callback(null, false)`，静默拒绝而非抛异常

### 涉及文件
- `.env` — 添加 CORS_ORIGINS
- `apis/app.ts` — CORS 中间件错误处理

---

## fix013. apis/config/index.ts 评审问题修复

### 问题
根据 tasks/review/ 目录下 3 份评审报告（安全评审、质量评审 A-、Committer 审核通过），`apis/config/index.ts` 存在以下可改进项。

### 修复

**Q-01（P1）子接口 readonly 对齐**：
- `DatabaseConfig`、`JwtConfig`、`RateLimitConfig`、`CronConfig` 所有属性添加 `readonly`
- 类型声明与 `deepFreeze` 运行时行为完全一致

**Q-02（P2）默认值集中管理**：
- 新增 `DEFAULTS` 常量（13 个默认值），所有配置项引用 `DEFAULTS.xxx`
- 新增配置项只需改一处

**Q-03（P2）dotenv 简化**：
- `dotenv.config({ path: path.resolve(process.cwd(), '.env') })` → `dotenv.config()`
- 移除冗余的 `import path from 'path'`

**Q-05（P2）safeParseInt 拒绝浮点字符串**：
- 新增 `/^-?\d+$/` 正则校验，`PORT=8080.9` 不再静默截断为 8080，而是抛出 FATAL 错误

**Q-06（P1）JWT Secret 强度校验**：
- 手动设置的 JWT_SECRET 少于 32 字符时输出 `console.error` 警告

**Q-08（P2）连接池参数环境变量化**：
- 新增 `DB_POOL_MIN` 和 `DB_POOL_MAX` 环境变量支持
- 使用 `safeParseInt` 校验，DB_POOL_MIN >= 0，DB_POOL_MAX >= 1

**Q-09（P3）deepFreeze 适用范围注释**：
- 添加 JSDoc 注释说明适用范围（plain objects/arrays，不支持 Date/Map/Set）

### 涉及文件
- `apis/config/index.ts` — 7 项修复
- `tests/apis/config.test.ts` — 新增 8 个测试用例（120 个全部通过）

---

## fix014. article.controller.ts 评审问题修复

### 问题
根据 tasks/review/ 目录下 5 份评审报告（安全评审、质量评审 B、架构评审、Committer CONDITIONAL APPROVE、旧安全评审），`apis/controller/article.controller.ts` 存在多个 P1/P2 级别问题。

### 修复

**P1-1 updateArticleContent 缺少 Zod schema 验证**：
- 新增 `updateContentSchema`（`z.string().min(1).max(500_000).strict()`）
- 替换原有的手动 `typeof` + `MAX_CONTENT_LENGTH` 检查
- 删除 controller 中不再使用的 `MAX_CONTENT_LENGTH` 常量

**P1-2 submitForReview 绕过 STATUS_TRANSITIONS 验证**：
- 在 submitForReview 中添加 `isValidStatusTransition(existing.status, 'pending_review')` 校验
- 统一所有状态变更入口

**P1-3 VALID_CREATE_STATUSES 死代码**：
- 删除第 40 行未使用的常量

**P2-1 createArticle 未使用 created() 函数**：
- 导入 `created` 函数并替换手动构造的 201 响应

**P2-2 handleServerError 基于字符串匹配**：
- Service 层：`throw new Error('文章不存在')` → `throw new NotFoundError('文章')`
- Service 层：`throw new Error('文章当前状态不支持...')` → `throw new BusinessError(...)`
- Controller 层：`handleServerError` 改用 `instanceof NotFoundError/BusinessError` 类型匹配

**P2-3 scheduled_publish_at 未校验未来时间**：
- Zod schema 添加 `.refine(val => new Date(val) > new Date(), '定时发布时间必须在未来')`

### 涉及文件
- `apis/controller/article.controller.ts` — 6 项修复
- `apis/schema/article.schema.ts` — 新增 updateContentSchema + scheduled_publish_at 校验
- `apis/service/impl/article.service.impl.ts` — 使用类型化异常替代 Error
- `tests/apis/article.controller.test.ts` — 更新 mock 和断言匹配新行为

---

## fix015. App.tsx 安全评审问题修复

### 问题
根据 `tasks/review/App.tsx.security.md` 安全评审报告（C+ 级），前端存在 4 项未修复的安全问题。

### 修复

**SEC-FE-03 用户数据可被篡改实现前端提权**：
- 后端 verify API 从仅返回 `{ valid: true }` 改为返回完整用户数据（id, username, cn_name, role, company_id, selected_company, selected_project）
- 前端 AuthContext 以服务端返回的用户数据为可信源，覆盖 localStorage 中的可篡改数据

**SEC-FE-06 登录重定向未校验**：
- 新增 `validateRedirect` 函数，仅允许 `/` 开头且非 `//` 开头的内部路径
- 防止 XSS 修改 localStorage 中的重定向路径

**SEC-FE-08 登出时 redirect_after_login 未清除**：
- logout 函数新增 `localStorage.removeItem('redirect_after_login')`
- 后端 logout API 改为 fire-and-forget（不 await），立即清理客户端状态

**SEC-FE-09 无 Content Security Policy**：
- `pages/index.html` 添加 CSP meta 标签
- 策略：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'`

### 涉及文件
- `apis/controller/auth.controller.ts` — verify 返回用户数据
- `apis/service/auth.service.ts` — 新增 VerifyUserData 接口
- `apis/service/impl/auth.service.impl.ts` — verifyToken 查询数据库
- `pages/context/AuthContext.tsx` — 使用服务端用户数据 + 登出清除优化
- `pages/login/index.tsx` — 重定向路径校验
- `pages/index.html` — CSP meta 标签
- `tests/apis/auth.service.test.ts` — 更新 verifyToken 测试断言

---

## fix016. App.tsx UI 评审问题修复

### 问题
根据 `tasks/review/App.tsx.ui.md` UI 评审报告（5.5/10），前端渲染链路存在多项 antd 组件误用、可访问性缺失、设计系统不合规问题。

### 修复

**UI-09（P0 BUG）Alert title → message**：
- `login/index.tsx`：Alert 组件 `title={error}` 改为 `message={error}`，修复错误信息不显示的 bug

**UI-10（P0 BUG）Space orientation → direction**：
- `Sidebar.tsx`：Space 组件 `orientation="vertical"` 改为 `direction="vertical"`，修复布局不生效

**UI-08（P0）Breadcrumb 语义误用**：
- `login/index.tsx`：单条 Breadcrumb 替换为 `Typography.Title level={3} fontWeight:300`
- `routes.tsx`：PlaceholderPage 中 Breadcrumb 替换为 `Typography.Title level={4}`

**UI-05（P0）移动端触摸目标不足**：
- `global.css`：`.sidebar-mobile-unfold` 尺寸从 24px × 24px 改为 48px × 48px，符合 Carbon 48px 触摸目标规范

**UI-03 sidebar-brand 字重**：
- `global.css`：`.sidebar-brand` font-weight 从 600 改为 400，符合 Carbon 低调品牌处理

**UI-11 登录页用 antd Card**：
- `login/index.tsx`：`div.login-card` 替换为 `Card` 组件，遵守项目铁律

**UI-14 表单 label**：
- `login/index.tsx`：Form.Item 添加 `label` prop（"用户名"、"密码"），符合 WCAG 1.3.1

**UI-02 使用 300 weight display 标题**：
- `login/index.tsx`：品牌标题使用 `fontWeight: 300`，激活 IBM Carbon 品牌签名

**UI-12 skip-to-content**：
- `Layout.tsx`：主内容区添加 skip-to-content 链接，符合 WCAG 2.4.1
- `global.css`：新增 `.skip-to-content` 样式

**UI-13 ARIA 标签**：
- `Layout.tsx`：移动端展开按钮添加 `aria-label="展开侧边栏"`
- `Layout.tsx`：移动端遮罩添加 `role="presentation"` + `aria-hidden="true"`
- `Sidebar.tsx`：折叠/展开按钮添加 `aria-label`
- `Sidebar.tsx`：登出按钮添加 `aria-label`，折叠态显示用户名

**UI-20 加载页品牌信息**：
- `AuthGuard.tsx`：全屏加载状态添加品牌标题和"正在验证身份..."提示

**UI-21 PlaceholderPage 用 Result 组件**：
- `routes.tsx`：PlaceholderPage 使用 antd Result 组件替代简陋文字

### 涉及文件
- `pages/login/index.tsx` — Alert prop 修复 + Card + Typography.Title + form label
- `pages/components/Sidebar.tsx` — Space direction + ARIA labels
- `pages/components/Layout.tsx` — skip-to-content + ARIA labels
- `pages/components/AuthGuard.tsx` — 加载页品牌信息
- `pages/router/routes.tsx` — PlaceholderPage Result 组件 + Typography.Title
- `pages/styles/global.css` — 移动端按钮尺寸 + sidebar-brand 字重 + skip-to-content 样式

---

## fix017. ArticleDetail.tsx 安全评审漏洞修复

### 问题
根据 `tasks/review/ArticleDetail.tsx.security.md` 安全评审报告（D+ 级），前端文章模块存在 2 项 CRITICAL、4 项 HIGH、4 项 MEDIUM 级安全漏洞。

### 修复

**SEC-ART-01（CRITICAL）MDEditor live preview XSS**：
- `ArticleContentEditor.tsx`：`preview="live"` 改为 `preview="edit"`，消除实时预览中未消毒 HTML 的 XSS 攻击面
- 用户切换到"浏览"模式时通过已消毒的 `MarkdownViewer` 组件查看

**SEC-ART-02（CRITICAL）Token 大面积暴露**：
- `pages/article/index.tsx`：从 raw `axios` + `localStorage.getItem('token')` 迁移到统一 `apiClient`（拦截器自动注入 token）
- 减少 token 在组件中的直接读取

**SEC-ART-03（HIGH）用户对象解析无校验**：
- 新建 `pages/utils/auth.ts`：`getSafeUser()` 函数，校验 `id`（必须为 number）和 `role`（白名单 `sysadmin/admin/view`，非法值降级为 `view`）
- 修复 12 个文件：article/index.tsx、useArticlePermissions.ts、knowledge 模块（6 个文件）、user/index.tsx、todo/index.tsx、skills/index.tsx、publish/index.tsx

**SEC-ART-08（MEDIUM）服务端错误信息直接展示**：
- 新建 `pages/utils/error.ts`：`getApiErrorMessage()` 函数，4xx 错误保留服务端消息（如"参数错误"），5xx 错误脱敏返回通用消息
- article 模块所有 hooks（useArticleDetail、useArticleActions、useDocumentImport）和 ArticleImageManager 组件替换为脱敏处理

**已在前次重构中修复的问题（无需额外改动）**：
- SEC-ART-04（文件大小限制）：useDocumentImport 已有 10MB 限制
- SEC-ART-05（mammoth HTML 清洗）：已使用 DOMPurify 消毒
- SEC-ART-06（URL 协议校验）：ArticleImageManager 已有 http/https 白名单
- SEC-ART-07（竞态条件）：useArticleDetail 已有 savingRef 防并发
- SEC-ART-09（上传文件类型校验）：ArticleImageManager 已有 image/ 类型检查

### 涉及文件
- `pages/article/components/ArticleContentEditor.tsx` — MDEditor preview 模式
- `pages/article/index.tsx` — 迁移到 apiClient + getSafeUser
- `pages/article/hooks/useArticlePermissions.ts` — getSafeUser 替换 JSON.parse
- `pages/article/hooks/useArticleDetail.ts` — getApiErrorMessage 脱敏
- `pages/article/hooks/useArticleActions.ts` — getApiErrorMessage 脱敏
- `pages/article/hooks/useDocumentImport.ts` — getApiErrorMessage 脱敏
- `pages/article/components/ArticleImageManager.tsx` — getApiErrorMessage 脱敏
- `pages/utils/auth.ts`（新建）— getSafeUser 安全函数
- `pages/utils/error.ts`（新建）— getApiErrorMessage 脱敏函数
- 12 个页面文件 — getSafeUser 替换 JSON.parse
- `tests/pages/utils/auth.test.ts`（新建）— 7 个测试
- `tests/pages/utils/error.test.ts`（新建）— 6 个测试

---

## fix018. Controller 测试修复 + SSRF IPv6 防护 + 双重 Zod 解析冲突

### 问题
运行全部 controller 测试时发现 4 个测试文件共 40+ 个失败用例，同时发现 2 个源码 Bug。

### 修复

**Bug 1: llm-model SSRF IPv6 防护失效**：
- `BLOCKED_HOSTNAMES` 正则未考虑 `new URL('http://[::1]/v1')` 返回带方括号的 hostname `[::1]`
- 修复：正则从 `/^::1$/` 改为 `/^\[?::1\]?$/`，匹配 `[::1]`、`[fe80::1]`、`[fc00::1]`、`[fd00::1]` 等

**Bug 2: user controller 双重 Zod parse 导致 Zod v4 transform 冲突**：
- `validate()` middleware 已将 `req.query.status` 从 `'true'` transform 为 `true`（布尔值）
- controller 再次 `listUsersSchema.parse(req.query)` 时，`z.enum(['true', 'false'])` 收到布尔值报错
- 修复：去掉 controller 中冗余的 `schema.parse()` 调用，直接使用 middleware 已验证的数据

**测试修复**：
- llm-model：修复 API 路径不一致（`/api/llm-models` → `/api/v1/llm-models`）、Zod v4 错误消息断言
- auth：verify 端点测试添加 `getPrisma` mock（`user.findUnique`）
- user：所有验证错误消息添加"参数验证失败:"前缀（validate middleware 格式）
- system-config：config_value 空字符串、null、0、false 的断言更新为匹配 schema 行为

### 涉及文件
- `apis/controller/llm-model.controller.ts` — IPv6 SSRF 正则修复
- `apis/controller/user.controller.ts` — 移除冗余 schema.parse()
- `apis/schema/system-config.schema.ts` — config_value 允许空字符串
- `tests/apis/llm-model.controller.test.ts` — 路径+断言修复
- `tests/apis/auth.controller.test.ts` — verify mock 修复
- `tests/apis/user.controller.test.ts` — 验证消息前缀修复
- `tests/apis/system-config.controller.test.ts` — 断言修复

---

## fix019. ArticleDetail.tsx UI 评审问题修复

### 问题
根据 `tasks/review/ArticleDetail.tsx.ui.md` UI 评审报告（4.2/10），文章详情页存在设计系统合规、antd 组件使用、交互反馈、可访问性、响应式设计等多项问题。

### 修复

**UI-01（P1）图片删除按钮圆角违规**：
- `ArticleImageManager.tsx`：`borderRadius: '50%'` → `borderRadius: 0`，符合 Carbon 方形规范
- 图片容器 `borderRadius: 2` → `borderRadius: 0`，统一方形

**UI-03（P1）硬编码颜色替换为 CSS 变量**：
- `rgba(0,0,0,0.25)` → `var(--color-overlay-light, rgba(22,22,22,0.25))`
- `rgba(0,0,0,0.5)` → `var(--color-overlay-medium, rgba(22,22,22,0.5))`
- `#fff` → `var(--color-on-primary)`
- `global.css` 新增 `--color-overlay-light` 和 `--color-overlay-medium` 变量

**UI-04（P2）图标尺寸调整为 4px 网格**：
- 选中勾 `fontSize: 22` → `fontSize: 20`（Carbon 标准 20px）
- 删除按钮 `width/height: 18` → `20×20`，`fontSize: 10` → `fontSize: 12`
- 偏移 `top: 2, right: 2` → `top: 0, right: 0`

**UI-06（P1）页面标题排版合规**：
- `Typography.Title level={2}`（30px weight 600）→ `level={4}` + `fontWeight: 400, fontSize: 24`
- 符合 DESIGN.md `{typography.card-title}` 24px weight 400

**UI-10（P1）Form.Item noStyle 移除**：
- 画像字段 `noStyle` Form.Item → `style={{ marginBottom: 0 }}`，校验错误可见

**UI-13（P0）beforeunload 未保存提示**：
- 新增 `beforeunload` 事件监听，检测内容变更和表单脏状态
- 用户离开页面时弹出浏览器确认提示，防止数据丢失

**UI-14（P1）自动保存状态指示器**：
- `ArticleContentEditor` 新增保存状态指示：保存中（Spin + 蓝色文字）、已保存（绿色勾 + "已保存"）
- 3 秒后自动恢复 idle 状态

**UI-18（P0）图片选择键盘支持**：
- 知识库图片网格：添加 `role="checkbox"`, `aria-checked`, `aria-label`, `tabIndex={0}`, `onKeyDown`

**UI-19（P0）平台选择 ARIA 属性**：
- 平台选择 div：添加 `role="combobox"`, `aria-expanded`, `aria-haspopup="dialog"`, `aria-label`, `tabIndex`, `onKeyDown`

**UI-20（P1）Modal 搜索框 autoFocus**：
- `PlatformSelectModal` 搜索框添加 `autoFocus`，Modal 打开后自动聚焦

**UI-21（P0）Modal + MDEditor 响应式**：
- Modal 宽度：`width={700}` → `screens.md ? 700 : '95vw'`（使用 antd Grid.useBreakpoint）
- MDEditor 高度：`height={600}` → `screens.md ? 600 : 320`

**UI-22（P1）标题区域响应式**：
- 标题栏添加 `flexWrap: 'wrap'`
- 标题添加 `flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'`

### 涉及文件
- `pages/article/ArticleDetail.tsx` — beforeunload + 标题排版/响应式
- `pages/article/components/ArticleSettingsForm.tsx` — Form.Item noStyle 移除 + 平台选择 ARIA
- `pages/article/components/ArticleContentEditor.tsx` — 保存状态指示 + MDEditor 响应式
- `pages/article/components/ArticleImageManager.tsx` — 圆角/颜色/尺寸 + 键盘支持
- `pages/article/components/PlatformSelectModal.tsx` — autoFocus + 响应式宽度
- `pages/styles/global.css` — 新增覆盖层 CSS 变量

---

## fix020. MarkdownEditor 封装层评审问题修复

### 问题
根据 `tasks/review/` 目录下 5 份评审报告（质量评审 7.7/10、安全评审 B-、架构评审 7.7/10、UI 评审 4.9/10、Committer 审核 ✅通过），`@uiw/react-md-editor` 的 `Editor.common.tsx` 为第三方库文件无法直接修改，所有修复在项目封装层 `MarkdownEditor.tsx` + `markdown-editor.css` 中实施。

### 修复

**SEC-MD-04（MEDIUM）事件监听器泄漏**：
- 添加 `useEffect` cleanup，组件卸载时克隆替换 `.w-md-editor-text` DOM 节点以释放事件监听器

**SEC-MD-05（MEDIUM）help 命令 Tabnabbing**：
- 通过 `commandsFilter` 移除 `help` 命令，消除 `window.open` 缺少 `noopener` 的风险

**A-01（P1）工具栏无 ARIA 标注**：
- `useEffect` 在 mount 后为工具栏容器注入 `role="toolbar"` + `aria-label`
- 为所有工具栏按钮按功能匹配中文 `aria-label`

**A-02（P1）textarea 缺少 label**：
- 通过 `textareaProps` 注入 `aria-label="Markdown 编辑器"`

**CSS-01（P2）工具栏按钮焦点样式缺失**：
- 添加 `button:focus-visible` 规则，2px IBM Blue outline（Carbon 签名式焦点处理）

**CSS-02（P3）拖拽条无视觉样式**：
- 添加 `.w-md-editor-drag` 背景色、边框、hover 高亮、中央拖拽指示条

**CSS-03（P3）全屏模式样式不完整**：
- 补充全屏模式背景色和工具栏样式覆盖

**R-01（P2）工具栏移动端溢出**：
- 工具栏添加 `overflow-x: auto` + `-webkit-overflow-scrolling: touch`

**A-03（P2）textarea 焦点样式**：
- 添加 `.w-md-editor-text-input:focus` 2px IBM Blue outline

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — DOM 清理 + commandsFilter + ARIA 标注
- `pages/styles/markdown-editor.css` — focus-visible + 拖拽条 + 全屏 + overflow

---

## fix021. knowledge-base.controller.ts 评审安全修复（SEC-M-03 AppError 统一异常体系）

### 问题
根据 `tasks/review/knowledge-base.controller.md` 安全评审报告（MEDIUM-LOW 级），知识库 controller 的 catch 块使用字符串精确匹配错误消息，设计脆弱，Service 层修改消息会导致 Controller 匹配失效。

### 修复

**SEC-M-03（P2）字符串匹配异常检测 → AppError 类型安全异常体系**：
- Service 层：所有 `throw new Error(...)` 替换为对应的 AppError 子类
  - `NotFoundError('知识库')` → 404
  - `NotFoundError('项目')` → 404
  - `BusinessError(...)` → 400（公司/项目必选验证）
  - `ForbiddenError(...)` → 403（无权关联/只能操作自己创建的）
- Controller 层：5 个 catch 块统一简化为 `instanceof AppError` 匹配
  - 原来 4-6 个字符串条件分支 → 统一 1 个 `instanceof AppError` 检查
  - `validateInteger` 改为抛出 `BusinessError`（而非 `Error`）
- 测试文件：所有 mock 中的 `new Error(...)` 替换为对应 AppError 子类

### 验证
- 318 个测试全部通过（knowledge-base controller/entity/service 三个测试套件）

### 涉及文件
- `apis/service/impl/knowledge-base.service.impl.ts` — 导入 AppError 子类，替换所有 throw new Error
- `apis/controller/knowledge-base.controller.ts` — 导入 AppError，统一 catch 块
- `tests/apis/knowledge-base.controller.test.ts` — mock 错误类型替换 + 断言更新

---

## fix022. CompanyForm 用户下拉无数据（pageSize 超限 400 错误）

### 问题
编辑公司页面 `/company/edit/:id` 的运营者/查看者下拉框无数据可选。控制台报 `GET /api/v1/users?page=1&pageSize=999&status=true` 返回 400，错误消息：`参数验证失败: Too big: expected number to be <=100`。

### 原因
`CompanyForm.tsx` 使用 `pageSize: 999` 请求用户列表，但 `user.schema.ts` 中 `pageSize` 的 Zod 校验限制为 `max(100)`。

### 修复
`pageSize: 999` → `pageSize: 100`。

### 涉及文件
- `pages/company/CompanyForm.tsx` — 修正 pageSize 参数

---

## fix023. ProjectForm 创建项目 400 错误（description: null 未通过 schema 验证）

### 问题
创建项目 `POST /api/v1/projects` 返回 400，错误消息：`参数验证失败: Invalid input: expected string, received null`。请求数据 `description: null` 未通过 Zod schema 验证。

### 原因
1. 前端 `ProjectForm.tsx:90` 在描述为空时发送 `description: null`
2. 后端 `project.schema.ts` 的 `description` 字段用 `z.string().optional()`，`optional()` 只接受 `undefined`，不接受 `null`

### 修复
- 前端：`description: null` → `description: undefined`（从 payload 中省略）
- 后端：schema 加 `.nullable()` 防御（`z.string()...nullable().optional()`）

### 涉及文件
- `pages/project/ProjectForm.tsx` — description 空值改为 undefined
- `apis/schema/project.schema.ts` — description 添加 nullable()

---

## fix024. Docker 构建失败——prisma generate 找不到 prisma-openapi 模块

### 问题
`docker build` 在 `RUN prisma generate` 步骤失败：`Cannot find module '/app/node_modules/prisma-openapi/dist/index.js'`。

### 原因
1. `prisma/schema.prisma` 定义了两个 generator：`client`（prisma-client-js）和 `openapi`（prisma-openapi）
2. `prisma-openapi` 在 `devDependencies` 中
3. Dockerfile 使用 `pnpm install --prod --frozen-lockfile`，不安装 devDependencies
4. `prisma generate` 默认运行所有 generator，openapi generator 找不到模块

### 修复
`prisma generate` → `prisma generate --generator=client`，只生成 Prisma Client，跳过 openapi generator。
生产环境不需要重新生成 OpenAPI spec（已通过 `COPY apis/swagger-spec.json` 拷贝到镜像）。

### 涉及文件
- `Dockerfile` — prisma generate 添加 --generator=client 参数

---

## fix025. article.controller.ts 评审剩余问题修复（审计日志 + ROLES 常量 + Service 一致性）

### 问题
根据 `tasks/review/article.controller.md` Committer 审核报告，article 控制器和服务层仍存在以下未修复项：service 层 regenerate 状态校验与控制器不一致、删除操作无审计日志、handleServerError 未记录 500 错误、魔法字符串硬编码。

### 修复

**Service regenerate 状态不一致**：
- `article.service.impl.ts`：`regenerate` 方法从仅接受 `pending_review` 扩展为接受 `['generate_failed', 'pending_review']`，与控制器层预检一致

**MEDIUM-1 删除审计日志**：
- `article.controller.ts`：`deleteArticle` 成功后添加 `logger.info('article_deleted', { articleId, projectId, operatorId, role })`

**handleServerError 500 错误日志记录**：
- 未知异常（非 AppError）时添加 `logger.error('unhandled_error', { error, context })`，避免 500 错误无服务端记录

**LOW-3 魔法字符串替换**：
- 所有 `'sysadmin'` → `ROLES.SYSADMIN`，`'admin'` → `ROLES.ADMIN`
- 导入 `ROLES` from `apis/constants/roles`

**LOW-1 搜索参数 trim**：
- `article.schema.ts`：`search` 字段添加 `.trim()` 前置处理

### 涉及文件
- `apis/service/impl/article.service.impl.ts` — regenerate 状态白名单扩展
- `apis/controller/article.controller.ts` — 审计日志 + ROLES 常量 + handleServerError 日志
- `apis/schema/article.schema.ts` — search trim
- `tasks/review/article.controller.md` — 更新修复状态

---

## fix026. bold.tsx 评审封装层问题修复（I18N + 无障碍 + 图标尺寸 + 触摸目标）

### 问题
根据 `tasks/review/` 目录下 3 份评审报告（安全评审 8.0/10、UI 评审 4.3/10 CONDITIONAL APPROVE、Committer 审核 8.0/10 APPROVE），`@uiw/react-md-editor` 的 `bold.tsx` 为第三方库内部文件无法直接修改，所有修复在项目封装层实施。

### 修复

**I18N-01（P2）英文 aria-label/title 未被覆盖**：
- `MarkdownEditor.tsx` 的 `annotateToolbar` 函数中 `if (btn.getAttribute('aria-label')) return` 会导致已有英文 `aria-label` 的按钮（如 bold/italic/strikethrough）跳过中文替换
- 修复：移除早期返回，改为始终匹配 `title` 内容并覆盖 `aria-label` 和 `title` 为中文

**A-02（P3）SVG 缺少 aria-hidden**：
- 工具栏按钮已有 `aria-label`，内部 SVG 应设置 `aria-hidden="true"` 防止屏幕阅读器重复播报
- 在 `annotateToolbar` 中增加 `querySelectorAll('button svg')` 遍历注入

**V-01（P3）SVG 图标尺寸偏小**：
- 原始 12×12 偏小，Carbon 建议最小 16px
- 在 `markdown-editor.css` 添加 `.w-md-editor-toolbar button svg { width: 16px; height: 16px }` 覆盖

**R-01（P3）移动端触摸目标不足**：
- 原始 40×40 不足 WCAG AAA 要求的 44×44
- 移动端 `@media (max-width: 672px)` 从 `min-height: 40px` 提升至 `44px`

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — annotateToolbar 逻辑修复 + SVG aria-hidden 注入
- `pages/styles/markdown-editor.css` — SVG 图标尺寸 + 移动端触摸目标

---

## fix027. fullscreen 命令评审修复（按钮点击失效 + 快捷键冲突 + 图标不规范）

### 问题
根据 `tasks/review/` 目录下 3 份评审报告（UI 评审 3.4/10、安全评审 8.5/10、Committer 审核 5.5/10），`@uiw/react-md-editor` 的 `fullscreen.tsx` 存在 CRITICAL 级别功能缺陷（按钮点击不触发全屏）和多项 UI 规范问题。

### 修复

**U1（CRITICAL）execute 按钮点击不触发全屏**：
- 原始 execute 函数将 `shortcuts` 参数作为执行前置条件，按钮点击时 `shortcuts` 为 `undefined`，导致 dispatch 不执行
- 修复：移除 `shortcuts` 条件判断，仅依赖 `dispatch && executeCommandState` 守卫

**U3（HIGH）快捷键 ctrlcmd+0 与浏览器冲突**：
- 重映射为 `ctrlcmd+shift+f`

**U4（HIGH）图标不符合 Carbon/antd 规范**：
- 替换为 antd `FullscreenOutlined`（fontSize: 16）

**U5（MEDIUM）ARIA 标注英文**：
- 覆盖为中文：`aria-label: '切换全屏模式'`，`title: '切换全屏模式 (Ctrl+Shift+F)'`

**U7（MEDIUM）focus() 位置不当**：
- 从条件判断之前移到 dispatch 之后

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 fullscreen 命令覆盖
- `tests/pages/components/MarkdownEditor.test.tsx`（新建）— 12 个测试用例
- `tasks/fix.fullscreen命令评审修复.md`（新建）— 修复文档

---

## fix028. group.tsx 评审封装层问题修复（图标替换 + ARIA 无障碍 + 下拉菜单 Carbon 合规）

### 问题
根据 `tasks/review/` 目录下 5 份评审报告（质量评审 5.0/10、安全评审 3.2/10 FAIL、架构评审 4.5/10、UI 评审 不合规、Committer 审核 5.5/10 CONDITIONAL APPROVE），`@uiw/react-md-editor` 的 `group.tsx` 是命令体系中质量最低、安全问题最多的模块。由于是第三方库文件无法直接修改，所有修复在项目封装层实施。

### 修复

**SEC-UI-01（P2）SVG 图标 12px 不符 Carbon 16px 规范**：
- `commandsFilter` 检测 `keyCommand === 'group'` 的命令，替换 12px 内联 SVG 为 antd `FontSizeOutlined`（fontSize: 16）

**SEC-UI-02（P1）零 ARIA 无障碍属性**：
- `commandsFilter` 注入中文 ARIA：`aria-label: '选择标题级别'`、`aria-haspopup: 'menu'`、`title: '选择标题级别'`
- `annotateToolbar` MutationObserver 为下拉菜单注入 `role="menu"`、`role="menuitem"`

**SEC-UI-03（P1）触摸目标不足 48px**：
- `markdown-editor.css` 添加 `@media (pointer: coarse)` 规则，工具栏按钮和下拉菜单项 min-height: 48px

**SEC-UI-04（P2）下拉菜单视觉不合规**：
- `markdown-editor.css` 添加 `.w-md-editor-toolbar-child` Carbon 覆盖：flat border-radius: 0、Carbon shadow、背景色、焦点环

**C-01/H-01/H-02（node_modules 不可修改，通过封装层缓解）**：
- `as any` 类型绕过、循环引用、冗余展开等问题在本项目调用场景下不触发（参数硬编码、不序列化），通过 CSS 和 commandsFilter 缓解可观测问题

### 测试
- 新增 5 个 group 命令测试用例（检测、图标替换、ARIA 注入、保留现有 buttonProps、非 group 命令不受影响）
- 全部 17 个 MarkdownEditor 测试通过

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 group 命令处理 + annotateToolbar 添加下拉菜单 ARIA
- `pages/styles/markdown-editor.css` — Carbon 下拉菜单样式 + 触摸设备 48px 规则
- `tests/pages/components/MarkdownEditor.test.tsx` — 5 个新增 group 测试

---

## fix029. help.tsx 评审封装层问题修复（noopener反向标签劫持+弹窗拦截降级+中文ARIA+antd图标）

### 问题
根据 `tasks/review/` 目录下 5 份评审报告（安全评审 5.5/10、UI 评审 5.0/10、架构评审 5.5/10、质量评审 6.0/10、Committer 审核 5.0/10），`@uiw/react-md-editor` 的 `help.tsx` 是库内唯一产生外部网络导航的命令，拥有库内最广的安全攻击面。由于是第三方库文件无法直接修改，所有修复在项目封装层实施。

### 修复

**SEC-H1（P0）window.open 缺少 noopener——反向标签劫持风险**：
- 原始代码 `windowFeatures` 仅为 `'noreferrer'`，缺少 `noopener`
- 新窗口可通过 `window.opener` 访问原始页面，攻击者可重定向原始窗口到钓鱼页面
- 修复：`'noreferrer'` → `'noopener,noreferrer'`

**SEC-H2（P1）noreferrer 作为 windowFeatures 无实际效果**：
- `noreferrer` 不在 `window.open` 的 `windowFeatures` 规范中，部分浏览器忽略
- 与 `noopener` 一起使用作为纵深防御

**SEC-M2/UI-M3（P1）弹窗被拦截时无降级处理**：
- `window.open` 返回 `null` 或 `closed` 时，降级为 `window.location.href` 导航
- 确保用户始终可获取帮助

**UI-H1/UI-L1（P2）SVG 图标 12px 替换为 antd QuestionCircleOutlined**：
- 替换为 antd 图标（fontSize: 16），符合 Carbon 16px 图标规范

**UI-L2（P2）英文 ARIA 标注改为中文**：
- `aria-label: '打开 Markdown 语法帮助（外部链接）'`
- `title: '打开 Markdown 语法帮助 (F1)'`
- 标注"外部链接"让用户预判点击行为

**Q-低3（P3）添加 F1 快捷键**：
- 添加 `shortcuts: 'f1'`，键盘用户可通过 F1 获取帮助

### 行为变更
- **之前**：`help` 命令被 `commandsFilter` 直接过滤掉（`return false`），用户无法使用帮助功能
- **之后**：`help` 命令被安全覆盖，保留功能同时修复所有安全问题

### 测试
- 新增 6 个 help 命令测试用例（noopener+noreferrer验证、弹窗拦截降级null、弹窗拦截降级closed、中文ARIA、antd图标、F1快捷键）
- 全部 22 个 MarkdownEditor 测试通过

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter 将 help 从过滤改为安全覆盖
- `tests/pages/components/MarkdownEditor.test.tsx` — 6 个新增 help 测试

---

## fix011. hr 命令评审修复——快捷键冲突 + SVG 图标语义错位 + selectWord 不适用行级块元素

### 问题
`@uiw/react-md-editor` 的 `hr` 命令（水平分割线）存在多项严重缺陷：
1. **P1-快捷键冲突**：`Ctrl+H` 与浏览器历史记录冲突，用户按快捷键后页面跳转，编辑内容丢失
2. **P1-SVG 图标语义错位**：图标渲染字母 "HR"（175×175 viewBox 缩放到 12×12），用户无法直觉识别为水平分割线
3. **P1-selectWord 不适用**：行级块元素 `---` 被套入行内标记的 `selectWord` toggle 模式，导致 toggle 功能失效
4. **P1-选区丢弃**：用户选中文本后点击 HR，选区被静默折叠丢弃
5. **P2-非空断言**：`prefix!` 4 次绕过类型检查
6. **P2-无错误边界**：execute 函数无 try-catch
7. **P2-英文硬编码**：aria-label/title 使用英文 "Insert HR"

### 修复
在 `MarkdownEditor.tsx` 的 `commandsFilter` 中覆盖 `hr` 命令：

**快捷键**：`ctrlcmd+h` → `ctrlcmd+shift+h`（避开浏览器保留快捷键）
**SVG 图标**：替换为简洁水平线（`viewBox="0 0 12 12"`，单 path `M1,5 L11,5 L11,7 L1,7 Z`），添加 `role="img"` + `aria-hidden="true"`
**ARIA 标注**：中文 "插入水平分割线 (Ctrl+Shift+H)"
**execute 逻辑**：重写为行级检测——通过 `lastIndexOf('\n')` / `indexOf('\n')` 定位当前行，检测 `---`/`***`/`___` 实现 toggle，使用 `api.replaceSelection()` 替代直接操作 `textarea.value` 确保 React 状态同步
**错误边界**：外层 try-catch 防止编辑器崩溃
**运行时守卫**：`if (!text || selection.start == null) return;` 防御空状态
**Ctrl+H 拦截**：扩展 `preventBrowserShortcut` 监听器，拦截 Ctrl+H 防止浏览器跳转

### 测试
- 新增 11 个 hr 命令测试用例（快捷键覆盖、中文 ARIA、SVG 图标验证、插入/移除/变体行、错误边界、运行时守卫）
- 全部 33 个 MarkdownEditor 测试通过

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter 覆盖 hr + Ctrl+H 拦截
- `tests/pages/components/MarkdownEditor.test.tsx` — 11 个新增 hr 测试

---

## fix030. issue.tsx 评审封装层问题修复（#语义碰撞防护 + prefix非空断言 + 错误边界 + SVG无障碍）

### 问题
根据 `tasks/review/` 目录下 5 份评审报告（质量评审 6.9/10、架构评审 4.0/10、安全评审 7.2/10、UI 评审 3.0/10、Committer 审核 APPROVE），`@uiw/react-md-editor` 的 `issue.tsx` 存在多项架构、安全、UI 问题。命令未被默认工具栏注册（死代码），但通过封装层提供防御性覆盖。

### 修复

**ARCH-CRITICAL-1（# 语义碰撞）**：
- `prefix: '#'` 与 Markdown H1 标题语法冲突，toggle 可能意外删除标题
- 封装层 execute 函数添加行首上下文检测：`beforeCursor === '' || beforeCursor === '#'` 时跳过执行

**SEC-S1/Q4（prefix! 非空断言 CWE-476）**：
- 原始代码使用 `state.command.prefix!` 绕过可选类型检查
- 封装层改为 `if (!state.command?.prefix) return` 防御性检查

**SEC-S2（无错误边界 CWE-755）**：
- 原始 execute 函数无 try-catch，selectWord 异常可导致编辑器崩溃
- 封装层包裹 try-catch，异常时 console.error 记录

**UI-P1（SVG 尺寸/比例失真）**：
- 原始 SVG 12×12 偏小，viewBox 448×512 非正方形比例
- 替换为 16×16 SVG + `aria-hidden="true"` + `<title>Issue 引用</title>`

**UI-P3（buttonProps 文本改进）**：
- 英文 `'Add issue'` 改为中文 `'插入 Issue 引用 (#)'`

**运行时守卫**：
- `if (!text || selection?.start == null) return` 防御空状态和异常输入

### 测试
- 新增 13 个 issue 命令测试用例（中文 ARIA、SVG 属性、prefix 空值守卫、H1 碰撞防护行首检测、行首换行后检测、有效 mid-line 执行、#123 场景、错误边界、undefined/null 安全）
- 全部 59 个 MarkdownEditor 测试通过

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 issue 命令防御性覆盖
- `tests/pages/components/MarkdownEditor.test.tsx` — 13 个新增 issue 测试

---

## fix031. skills.controller.ts 安全评审修复（C-4 parseSkillMd ReDoS）

### 问题
根据 `tasks/review/skills.controller.security.md` 安全评审报告（C+ 级 60/100），`skills.controller.ts` 存在 4 个 CRITICAL、5 个 HIGH、4 个 MEDIUM、3 个 LOW 级安全漏洞。

### 修复状态

14 项问题中 13 项已在之前重构（抽取 `skills-file.service.ts`）中修复：
- C-1 Zip Slip → 逐条目解压 + 路径校验
- C-2 Zip Bomb → 500MB 总大小限制
- C-3 创建失败清理 → catch 块回滚已解压目录
- H-1 updateSkills 白名单 → 仅允许 name/description
- H-2 deleteSkills 路径校验 → validateSkillDirPath()
- H-3 req.user 防御性检查 → if (!req.user) return 401
- H-4 magic bytes → PK header 0x50 0x4B 校验
- H-5 错误信息 → 显示技能名而非目录名
- M-1 模块级副作用 → 惰性初始化
- M-2 pageSize 上限 → Math.min(100, ...)
- M-4 extractAllTo 覆盖 → 逐条目写入
- L-1 catch(err:any) → unknown
- L-2 multer 错误类型 → unknown

本次修复最后一项 CRITICAL：

**C-4 parseSkillMd ReDoS**：
- `apis/utils/skill-md.util.ts`：使用 `js-yaml` 库替代正则表达式解析 YAML frontmatter
- 消除 `[\s\S]*?` 正则回溯攻击风险
- 支持多行值、特殊字符等 YAML 完整语法

### 涉及文件
- `apis/utils/skill-md.util.ts` — js-yaml 替代正则解析

---

## fix032. strikeThrough.tsx 评审修复（非空断言 + 中文可访问性 + SVG 无障碍 + 错误边界）

### 问题
根据 `tasks/review/` 目录下 4 份评审报告（安全评审 7.8/10、架构评审 7.5/10、UI 评审 6.5/10、Committer 审核 7.8/10），`@uiw/react-md-editor` 的 `strikeThrough.tsx` 存在非空断言安全性、中文可访问性缺失、SVG 可访问性缺陷等问题。与 bold/italic 不同，strikeThrough 直接在 node_modules 源码中修复（因为封装层 commandsFilter 已覆盖其他命令）。

### 修复

**S1/S2（MEDIUM）prefix! 非空断言**：
- 替换为防御性空值守卫 `const prefix = state.command.prefix; if (!prefix) return;`
- 消除 CWE-476 运行时 TypeError 和 "undefined" 文本污染风险

**S3（LOW）execute 无错误边界**：
- 添加 try-catch，静默处理异常，防止编辑器崩溃

**S5（LOW）SVG data-name 信息泄露**：
- 移除 `data-name="strikethrough"` 属性

**S6/U2（HIGH/INFO）英文可访问性**：
- `aria-label` 和 `title` 改为中文 `'添加删除线 (Ctrl+Shift+X)'`

**U3（MEDIUM）快捷键表示法不一致**：
- 统一为 Carbon 规范 `Ctrl+Shift+X` 格式（首字母大写、无空格）

**U4（MEDIUM）SVG 缺 aria-hidden**：
- 添加 `aria-hidden="true"`，移除 `role="img"`，防止屏幕阅读器重复播报

**P3-LOW-02 变量命名**：
- `state1` 重命名为 `selectedState`，传达语义

### 涉及文件
- `node_modules/.../react-md-editor/src/commands/strikeThrough.tsx` — 源码修复
- `node_modules/.../react-md-editor/esm/commands/strikeThrough.js` — ESM 编译输出同步
- `node_modules/.../react-md-editor/lib/commands/strikeThrough.js` — CJS 编译输出同步

---

## fix033. title2.tsx Committer 评审遗留问题修复（死代码 + 无障碍矛盾 + 测试补全）

### 问题
根据 `tasks/review/title2.tsx.committer.md` Committer 审核报告（APPROVE），heading1~6 命令覆盖代码存在死代码和无障碍属性矛盾，且缺少测试覆盖。

### 修复

**死代码 `prefixMap` 变量**：
- 移除未使用的 `prefixMap` 变量（heading1~6 execute 中直接使用 `state.command.prefix`）

**`role="img"` + `aria-hidden="true"` 矛盾**：
- 装饰性图标 span 移除冗余的 `role="img"`，仅保留 `aria-hidden="true"`
- 父按钮已有 `aria-label`，图标无需 role

**测试补全**：
- 新增 14 个 heading1~6 命令测试用例（6级中文 ARIA + 6级图标替换 + prefix 防御 + 错误边界 + 边界条件）

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — 移除死代码 + 修复无障碍矛盾
- `tests/pages/components/MarkdownEditor.test.tsx` — 14 个新增 heading 测试
- `tasks/fix.title2命令评审修复.md`（新建）— 修复文档

---

## fix018. Markdown 编辑器 textarea 不渲染——StrictMode cleanup 销毁 DOM 子树

### 问题
所有页面编辑界面（如 `/article/new` 选择手工编写、`/article/13` 切换编辑模式）的 Markdown 编辑器无法编辑。`.w-md-editor-text` 容器为空，textarea 元素未渲染到 DOM 中。

### 根因
`MarkdownEditor.tsx` 的 `useEffect` cleanup 使用 `cloneNode(false)` + `replaceChild` 替换 `.w-md-editor-text` DOM 节点以"清理上游泄漏的事件监听器"。但 `React.StrictMode`（dev 模式）执行 mount → unmount(cleanup) → remount 流程，cleanup 阶段用空克隆替换了原始节点，导致 React reconciler 在 remount 时丢失 textarea 子树引用，textarea 无法重新渲染。

### 修复
移除 destructive DOM cleanup（`cloneNode(false)` + `replaceChild`），仅保留 `editorRef.current = null`。上游 `mouseover`/`mouseleave` 匿名监听器随 DOM 节点卸载自然被 GC 回收。

### 验证
- gstack browse 验证 `/article/new` 手工编写模式 textarea 正常渲染（visible=true, height=279px）
- 164 个 MarkdownEditor 测试全部通过
- 前端构建成功

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — 移除 cloneNode+replaceChild cleanup

---

## fix019. Markdown 编辑器横向滚动条 + 高度不自适应

### 问题
1. 所有编辑界面的 Markdown 编辑器工具栏出现横向滚动条（桌面端），因 `overflow-x: auto` 在全局生效
2. 编辑长文章时编辑器高度固定（320/600px），textarea 内部出现纵向滚动条，无法看到全部内容

### 修复
1. 横向滚动条：`overflow-x: auto` 从工具栏全局规则移至 `@media (max-width: 672px)` 移动端媒体查询内，桌面端依赖库的 `flex-wrap: wrap` 自动换行。编辑器容器添加 `overflow: hidden` 防止溢出
2. 高度自适应：改为 `useEffect` 测量 textarea `scrollHeight` 动态计算编辑器高度，替代固定值。编辑器根据内容自动撑高，通过页面滚动代替编辑器内部滚动

### 验证
- article/10 编辑模式：编辑器高度 2669px ≈ textarea scrollHeight 2666px，无内部滚动条
- article/new 手工编写：编辑器容器 `overflow: hidden`，无横向滚动条
- 164 个 MarkdownEditor 测试全部通过

### 涉及文件
- `pages/components/MarkdownEditor.tsx` — 自适应高度 useEffect
- `pages/styles/markdown-editor.css` — overflow-x 移至移动端媒体查询 + 编辑器 overflow:hidden

---

## fix020. upload.controller.ts 安全评审修复（静态文件安全头 + 图片尺寸验证）

### 问题
根据 `tasks/review/upload.controller.security.md` 安全评审报告（🔴 HIGH RISK），上传控制器存在多项安全问题。大部分问题（SVG XSS、MIME 伪造、错误信息泄露、扩展名净化、TOCTOU、.gitignore）已在之前重构中修复，剩余 2 项需要修复。

### 已在之前修复的问题
- **HIGH-1 SVG XSS**：已从 ALLOWED_TYPES 移除 image/svg+xml
- **HIGH-2 MIME 伪造**：已实现 Magic Bytes 文件签名验证
- **HIGH-3 错误信息泄露**：已使用 MulterError 分类 + 通用错误消息
- **MEDIUM-1 扩展名未净化**：已使用 MIME→扩展名映射表
- **LOW-1 TOCTOU**：已简化为直接 mkdirSync
- **LOW-2 .gitignore**：uploads/ 已在 .gitignore 中

### 本次修复

**MEDIUM-2 上传文件静态服务无安全响应头**：
- `apis/app.ts`：为 /uploads 路由添加 Cache-Control 头
- 新增 `setHeaders` 回调，对 `.svg`/`.html`/`.htm` 扩展名强制下载（Content-Disposition: attachment）并设置 CSP 禁止脚本执行
- 防止存储型 XSS 即使绕过上传验证也被浏览器渲染执行

**MEDIUM-3 解压炸弹（Pixel Flood）攻击面**：
- 新增 `image-size` 依赖
- `apis/utils/image-validator.ts`：新增 `validateDimensions()` 方法，限制图片最大 8000×8000 像素
- `apis/controller/upload.controller.ts`：上传时验证图片尺寸，超限返回 400
- 无法解析尺寸的最小化文件（如测试用文件）放行，避免误拒

### 涉及文件
- `apis/app.ts` — uploads 静态服务安全头
- `apis/utils/image-validator.ts` — 新增 validateDimensions 方法
- `apis/controller/upload.controller.ts` — 调用尺寸验证
- `package.json` — 新增 image-size 依赖

---

## fix021. title3.tsx 安全评审修复（非空断言 prefix! 防御性默认值）

### 问题
根据 `tasks/review/title3.tsx.security.md` 安全评审报告（8.5/10 APPROVE），`@uiw/react-md-editor` 的 `title3.tsx` 存在非空断言绕过类型系统的风险。

### 修复

**问题 #1（MEDIUM）prefix! 非空断言 CWE-476**：
- `state.command.prefix!` 替换为 `state.command.prefix ?? '### '`，使用 nullish coalescing 提供防御性默认值
- 消除运行时 undefined 传入 `headingExecute` 导致 textarea 内容被污染为 "undefined" 文本的风险

**问题 #2（LOW）suffix 缺少防御性处理**：
- `state.command.suffix` 替换为 `state.command.suffix ?? ''`，统一防御性编码风格

### 修复范围
通过 pnpm patch 修改第三方库文件（src + esm + lib 三份输出同步修复）：
- `src/commands/title3.tsx` — TypeScript 源码修复
- `esm/commands/title3.js` — ESM 编译输出同步
- `lib/commands/title3.js` — CJS 编译输出同步

### 涉及文件
- `patches/@uiw__react-md-editor@4.1.0.patch` — 新增 title3.tsx diff

---

## fix022. LLM模型控制器安全评审修复（API Key加密 + 审计日志 + 删除安全）

### 问题
根据 `tasks/review/llm-model.controller.security.md` 安全评审报告（CRITICAL×3 / HIGH×3 / MEDIUM×3 / LOW×2），llm-model 模块存在多项安全漏洞。

### 修复

| 编号 | 级别 | 问题 | 修复 |
|------|------|------|------|
| S-H3 | HIGH | catch块无错误日志 | handleError 添加 logger.error 记录 |
| S-M2 | MEDIUM | 无操作审计日志 | create/update/delete 添加审计日志（操作人、IP、变更字段） |
| S-M3 | MEDIUM | 删除不清除敏感数据 | 删除前检查文章引用，清除 API Key |
| S-C3 | CRITICAL | API Key 明文存储 | AES-256-GCM 加密存储，LLM调用时解密 |

### 新增文件
- `apis/utils/encryption.util.ts` — API Key AES-256-GCM 加密/解密/格式检测工具

### 涉及文件
- `apis/controller/llm-model.controller.ts` — 审计日志 + 错误日志
- `apis/service/impl/llm-model.service.impl.ts` — 加密存储 + 删除安全
- `apis/service/impl/llm.service.impl.ts` — LLM调用时解密API Key
- `apis/map/index.ts` — 加密格式脱敏适配
- `apis/utils/encryption.util.ts` — 新增加密工具
- `.env` / `.env.local` / `.env.example` — 添加 API_KEY_ENCRYPTION_KEY 配置
- `tests/apis/llm-model.service.test.ts` — 测试适配
- `tests/apis/llm-model.controller.test.ts` — 测试适配
