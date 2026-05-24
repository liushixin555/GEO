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
