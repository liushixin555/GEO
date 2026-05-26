# fix. Bug 修复汇总

> 状态：✅ 全部已完成
> 详细修复内容见 `tasks/progress_tasks/` 目录下对应文件

---

| 编号 | 标题 | 涉及文件 |
|------|------|----------|
| fix001 | Switch 圆角修复 | `pages/styles/global.css` |
| fix002 | toolbar 控件高度不一致 | `pages/main.tsx` ConfigProvider |
| fix003 | antd 废弃 API 警告 | `pages/components/Sidebar.tsx`, 所有 Modal 组件 |
| fix004 | CompanyForm useForm 警告 | `pages/company/CompanyForm.tsx` |
| fix005 | User 路由权限违规 | `apis/app.ts`, `apis/controller/user.controller.ts`, `tests/apis/user.controller.test.ts` |
| fix006 | ProjectForm 调用 sysadmin-only API | `apis/controller/auth.controller.ts`, `apis/service/auth.service.ts`, `apis/app.ts`, `pages/project/ProjectForm.tsx` |
| fix007 | 用户管理工具栏列宽溢出 | `pages/user/index.tsx` |
| fix008 | 知识库关键词/画像卡片标题字体过大 | `pages/knowledge/KnowledgeBaseDetail.tsx` |
| fix009 | 时间格式化未使用中国时区 | `pages/utils/date.ts`, 多个页面文件, `CLAUDE.md` |
| fix010 | auth.controller.ts 安全加固 | `apis/controller/auth.controller.ts`, `apis/service/auth.service.ts`, `apis/service/impl/auth.service.impl.ts` |
| fix011 | App.tsx 死路由+无 Error Boundary | `pages/App.tsx`, `pages/components/ErrorBoundary.tsx` |
| fix012 | CORS 拒绝导致登录接口返回500 | `.env`, `apis/app.ts` |
| fix013 | apis/config/index.ts 评审问题修复 | `apis/config/index.ts`, `tests/apis/config.test.ts` |
| fix014 | article.controller.ts 评审问题修复 | `apis/controller/article.controller.ts`, `apis/schema/article.schema.ts`, `apis/service/impl/article.service.impl.ts` |
| fix015 | App.tsx 安全评审问题修复 | `apis/controller/auth.controller.ts`, `pages/context/AuthContext.tsx`, `pages/login/index.tsx`, `pages/index.html` |
| fix016 | App.tsx UI 评审问题修复 | `pages/login/index.tsx`, `pages/components/Sidebar.tsx`, `pages/components/Layout.tsx`, `pages/styles/global.css` |
| fix017 | ArticleDetail.tsx 安全评审漏洞修复 | `pages/article/` 多个组件, `pages/utils/auth.ts`, `pages/utils/error.ts` |
| fix018 | Controller 测试修复+SSRF IPv6 防护+双重 Zod 解析冲突 | `apis/controller/llm-model.controller.ts`, `apis/controller/user.controller.ts`, 多个测试文件 |
| fix019 | ArticleDetail.tsx UI 评审问题修复 | `pages/article/` 多个组件, `pages/styles/global.css` |
| fix020 | MarkdownEditor 封装层评审问题修复 | `pages/components/MarkdownEditor.tsx`, `pages/styles/markdown-editor.css` |
| fix021 | knowledge-base.controller.ts 评审安全修复 | `apis/service/impl/knowledge-base.service.impl.ts`, `apis/controller/knowledge-base.controller.ts` |
| fix022 | CompanyForm 用户下拉无数据（pageSize 超限） | `pages/company/CompanyForm.tsx` |
| fix023 | ProjectForm 创建项目 400 错误 | `pages/project/ProjectForm.tsx`, `apis/schema/project.schema.ts` |
| fix024 | Docker 构建失败——prisma generate 找不到模块 | `Dockerfile` |
| fix025 | article.controller.ts 评审剩余问题修复 | `apis/service/impl/article.service.impl.ts`, `apis/controller/article.controller.ts`, `apis/schema/article.schema.ts` |
| fix026 | bold.tsx 评审封装层问题修复 | `pages/components/MarkdownEditor.tsx`, `pages/styles/markdown-editor.css` |
| fix027 | fullscreen 命令评审修复 | `pages/components/MarkdownEditor.tsx`, `tests/pages/components/MarkdownEditor.test.tsx` |
| fix028 | group.tsx 评审封装层问题修复 | `pages/components/MarkdownEditor.tsx`, `pages/styles/markdown-editor.css` |
| fix029 | help.tsx 评审封装层问题修复 | `pages/components/MarkdownEditor.tsx`, `tests/pages/components/MarkdownEditor.test.tsx` |
| fix030 | issue.tsx 评审封装层问题修复 | `pages/components/MarkdownEditor.tsx`, `tests/pages/components/MarkdownEditor.test.tsx` |
| fix031 | skills.controller.ts 安全评审修复（ReDoS） | `apis/utils/skill-md.util.ts` |
| fix032 | strikeThrough.tsx 评审修复 | `node_modules/.../react-md-editor/` 三份输出 |
| fix033 | title2.tsx Committer 评审遗留问题修复 | `pages/components/MarkdownEditor.tsx`, `tests/pages/components/MarkdownEditor.test.tsx` |
| fix034 | Markdown 编辑器 textarea 不渲染 | `pages/components/MarkdownEditor.tsx` |
| fix035 | Markdown 编辑器横向滚动条+高度不自适应 | `pages/components/MarkdownEditor.tsx`, `pages/styles/markdown-editor.css` |
| fix036 | upload.controller.ts 安全评审修复 | `apis/app.ts`, `apis/utils/image-validator.ts`, `apis/controller/upload.controller.ts` |
| fix037 | title3.tsx 安全评审修复 | `patches/@uiw__react-md-editor@4.1.0.patch` |
| fix038 | LLM模型控制器安全评审修复（API Key 加密） | `apis/controller/llm-model.controller.ts`, `apis/service/impl/llm-model.service.impl.ts`, `apis/utils/encryption.util.ts` |
| fix039 | project.controller.ts Committer 评审 P2/P3 验证 | `tests/apis/project.controller.test.ts` |
| fix040 | 发布管理驳回按钮优化 | `pages/publish/index.tsx`, `apis/controller/article.controller.ts` |
| fix041 | 发布中状态文章禁止删除 | `apis/controller/article.controller.ts`, `pages/article/ArticleDetail.tsx` |
| fix042 | 全局统一错误处理 | 所有页面文件 |
| fix043 | 驳回退回待审核 | `apis/controller/article.controller.ts`, `pages/publish/index.tsx` |
| fix044 | 技能接口错误信息优化+硬删除 | `apis/controller/skills.controller.ts`, `apis/service/impl/skills.service.impl.ts` |
| fix045 | app.ts 评审验证+ESLint/Jest 修复 | `apis/utils/pagination.util.ts`, `jest.config.ts`, `tests/apis/__mocks__/scalar.ts` |
| fix046 | help.tsx UI评审源文件修复（图标尺寸+noopener+弹窗拦截） | `node_modules/.../react-md-editor/` 三份输出（src/esm/lib） |
| fix047 | swagger/index.tsx 评审验证确认（8项问题全部已修复） | `tasks/review/index.tsx.md` |
| fix048 | Sidebar.tsx 多维评审修复（view越权+路径匹配+触控目标+AuthContext信任链） | `pages/components/Sidebar.tsx`, `pages/router/routes.tsx`, `pages/context/AuthContext.tsx`, `pages/styles/global.css` |
| fix049 | upload controller 专家评审修复（fd泄漏+内存优化+sanitize+safeCleanup） | `apis/utils/image-validator.ts`, `apis/controller/upload.controller.ts`, `apis/controller/upload-document.controller.ts` |
| fix050 | routes.tsx 五维评审修复（role类型安全+死代码+ChunkErrorBoundary+ROLES常量+403/404操作出口+根路径重定向+aria属性+审计日志） | `pages/router/routes.tsx`, `pages/context/AuthContext.tsx` |
| fix051 | 文章发布解耦重构（ArticleStatus新增approved+PublishingSchedule独立模型+前端发布计划页面+knowledge entity deleted_at修复） | `apis/entity/`, `apis/service/`, `apis/controller/`, `apis/map/`, `pages/article/`, `pages/publish/` |
