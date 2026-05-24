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


## 本次变更（2026-05-24 前端架构重构）
- [x] **INF-014: 前端架构重构** — 认证分离 + 路由守卫 + 代码分割
  - 基于 `tasks/review/App.tsx.md` 软件架构专家评审修复（P0×3 + P1×4 + P2×3）
  - **ARCH-01**: 创建 `pages/context/AuthContext.tsx`（认证状态管理）+ `pages/components/AuthGuard.tsx`（认证门控）
  - **ARCH-03/05/06**: 创建 `pages/router/routes.tsx`（集中式路由配置 + React.lazy 懒加载 + roles 角色守卫）
  - **ARCH-02**: Layout.tsx 重构为纯布局组件（72行，从 205 行缩减 65%）
  - **ARCH-07**: Sidebar 使用 `useAuth()` 获取 logout，消除 onLogout prop drilling
  - **ARCH-09**: LoginPage 调用 verify API 验证 token 有效性（修复 /login→/publish→/login 闪烁）
  - **ARCH-09**: AuthContext 监听 storage 事件实现跨标签页登出同步
  - **ARCH-10**: 主题配置抽取为 `pages/theme/carbon.ts`
  - App.tsx 新架构：ErrorBoundary → AuthProvider → Routes（/login 公开，/* → AuthGuard → Layout）
  - main.tsx 从 71 行缩至 21 行（主题配置外移）
  - 前端构建通过，代码分割生效（20+ 独立 chunk）
  - 任务文档：`tasks/refactor.frontend-architecture.md`


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


## 本次变更（2026-05-24 knowledge-base.controller.ts TDD 测试补全）
- [x] **knowledge-base.controller.ts 测试用例补全** — 从 88 个增加到 93 个测试用例（+5）
  - 新增 Controller !user 防御性分支直接函数测试 5 个：直接导入 controller 函数，构造无 user 的 mock req/res，覆盖 auth 中间件不可达的防御性分支
  - 覆盖率从 91.93%/93.97%/100%/100% 提升到 **100%/100%/100%/100%**
  - TDD 报告：tasks/tdd/knowledge-base.controller.test.md


## 本次变更（2026-05-24 Props.tsx 评审修复）
- [x] **创建 MarkdownViewer 封装组件** — 隔离第三方库 `@uiw/react-markdown-preview` 安全风险
  - 基于 5 份评审报告（架构5.0、质量5.3、安全MEDIUM、UI 4.1、Committer有条件通过）
  - 新增 `pages/components/MarkdownViewer.tsx`：source 截断≤1MB、禁止暴露 rehypeRewrite/pluginsFilter、a11y 属性、加载/错误/空状态
  - 新增 `pages/styles/markdown-viewer.css`：`.markdown-viewer` 类名 + CSS 变量引用 Carbon Token
  - 更新 `pages/article/ArticleDetail.tsx`：预览模式从 `MDEditor.Markdown` 替换为 `MarkdownViewer`
  - 新增 `tests/pages/components/MarkdownViewer.test.tsx`：13 个测试场景全部通过
  - 供应链确认：react-markdown 10.1.0（≥9.0），默认启用 HTML 过滤
  - 评审报告 tasks/review/Props.tsx.*.md


## 本次变更（2026-05-24 company.controller.ts TDD 测试补全）
- [x] **company.controller.ts 测试用例补全** — 从 95 个增加到 124 个测试用例（+29）
  - 修复 7 个失败测试：validate 中间件消息前缀（5个）、PUT 路由 validate 优先于 ID 校验（1个）、RATE_LIMIT_MAX 不足（1个）
  - 新增 Controller 单元测试 18 个：createCompany safeParse 分支（9个）、updateCompany safeParse 分支（5个）、isNotFoundError 辅助函数（3个）
  - 新增 Schema 边界验证 8 个：short_name/full_name/address/contact_phone/operator_ids/viewer_ids 长度和格式
  - 新增 ToggleStatus 深度测试 2 个：软删除公司返回 404、完整响应数据验证
  - 新增 getCompany 深度测试 2 个：软删除公司返回 404、超大 ID
  - 覆盖率从 91.54%/87.5%/75%/94.2% 提升到 **100%/100%/100%/100%**
  - TDD 报告：tasks/tdd/company.controller.test.md


## 本次变更（2026-05-24 index.tsx 评审修复）
- [x] **MarkdownViewer 评审修复（index.tsx 第二轮）**
  - 基于 5 份评审报告（质量 7.5、架构 5.4、安全 B-/7.8、UI 2.9、Committer 4.5）综合修复
  - P0: 导入路径从 `@uiw/react-markdown-preview` 切换为 `@uiw/react-markdown-preview/common`（减少 ~150KB gzip）
  - P0: 新增 `safeUrlTransform` 过滤 javascript:/data:/vbscript: 危险 URL 协议（安全评审 #1 HIGH）
  - P0: DOMPurify 添加 `ALLOWED_URI_REGEXP` URI 协议白名单（深度防御）
  - 新增 9 个安全测试用例（safeUrlTransform 单元测试 + prop 传递验证），全部 25 个测试通过
  - 涉及文件：MarkdownViewer.tsx、MarkdownViewer.test.tsx
  - 任务文档：tasks/fix.MarkdownViewer评审修复.md（第二轮修复记录）

