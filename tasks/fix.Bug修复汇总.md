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
