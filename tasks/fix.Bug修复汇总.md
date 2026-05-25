# fix. Bug 修复汇总

> 状态：✅ 全部已完成

---

| 编号 | 标题 | 修复要点 | 关键文件 |
|------|------|----------|----------|
| fix001 | Switch 圆角修复 | `*:not(.ant-switch) { border-radius: 0 }` | `global.css` |
| fix002 | toolbar 控件高度不一致 | 统一 controlHeight 为 40px | `main.tsx` ConfigProvider |
| fix003 | antd 废弃 API 警告 | Space direction/orientation, Modal destroyOnClose | `Sidebar.tsx`, Modal 组件 |
| fix004 | CompanyForm useForm 警告 | 始终渲染 Form，loading 时 display:none | `CompanyForm.tsx` |
| fix005 | User 路由权限违规 | roleMiddleware 改为 sysadmin-only | `app.ts`, `user.controller.ts` |
| fix006 | ProjectForm 调用 sysadmin-only API | 新增 `/api/auth/companies/:id` 接口 | `auth.controller.ts`, `ProjectForm.tsx` |
| fix007 | 用户管理工具栏列宽溢出 | 调整栅格列宽总和=24，按钮靠右 | `pages/user/index.tsx` |
| fix008 | 知识库关键词/画像卡片字体过大 | Typography.Title 替换为 span+inline style | `KnowledgeBaseDetail.tsx` |
| fix009 | 时间格式化未使用中国时区 | 创建 `pages/utils/date.ts` 共享工具，替换所有本地时区方法 | `date.ts`, 各页面 |
| fix010 | 知识清单更新时间列宽不足 | 列宽 120px→160px | `knowledge/index.tsx` |
| fix011 | 文章存草稿正文未保存 | content 改为 contentRef.current | `ArticleDetail.tsx` |
| fix012 | 创建文章 content 字段未保存 | CreateArticleRequest 添加 content，create 方法保存 content+版本快照 | `article.entity.ts`, `article.service.impl.ts` |
| fix013 | auth.controller 安全加固（评审） | IDOR 越权修复、输入验证、err:unknown、verify 冗余 token 移除 | `auth.controller.ts`, `auth.service.ts` |
| fix014 | App.tsx 死路由+无 Error Boundary（评审） | 删除死路由、新建 ErrorBoundary、移除冗余 import | `App.tsx`, `ErrorBoundary.tsx` |
| fix015 | CORS 拒绝导致登录 500 | .env 添加 CORS_ORIGINS，CORS 拒绝改为静默 | `.env`, `app.ts` |
| fix016 | config/index.ts 评审修复 | readonly 对齐、默认值集中管理、safeParseInt 拒绝浮点、JWT Secret 强度校验、连接池环境变量化 | `apis/config/index.ts` |
| fix017 | article.controller 评审修复 | Zod schema 验证、状态转换统一、类型化异常替代 Error、scheduled_publish_at 未来时间校验 | `article.controller.ts`, `article.schema.ts` |
| fix018 | App.tsx 安全评审修复 | verify 返回用户数据防前端提权、重定向路径校验、logout 清理 redirect、CSP meta 标签 | `auth.controller.ts`, `AuthContext.tsx`, `login/index.tsx`, `index.html` |
| fix019 | App.tsx UI 评审修复 | Alert title→message、Space orientation→direction、skip-to-content、ARIA 标签、移动端触摸目标 | `login/index.tsx`, `Sidebar.tsx`, `Layout.tsx`, `AuthGuard.tsx`, `routes.tsx`, `global.css` |
| fix020 | ArticleDetail 安全评审修复（D+→安全） | MDEditor preview=edit 防 XSS、apiClient 替代 raw axios、getSafeUser 校验、getApiErrorMessage 脱敏 | `ArticleContentEditor.tsx`, `utils/auth.ts`, `utils/error.ts`, 12 个页面文件 |
| fix021 | Controller 测试修复+SSRF IPv6+Zod 冲突 | IPv6 正则修复、移除冗余 schema.parse()、40+ 测试用例修复 | `llm-model.controller.ts`, `user.controller.ts` |
| fix022 | ArticleDetail UI 评审修复（4.2→合规） | 方形规范、CSS 变量、4px 网格、beforeunload 未保存提示、自动保存状态指示、键盘/ARIA 支持、响应式 | `ArticleDetail.tsx`, 各 Article 子组件, `global.css` |
| fix023 | MarkdownEditor 封装层评审修复 | 事件监听器 cleanup、help 命令 Tabnabbing 防护、ARIA 标注、焦点样式、拖拽条、全屏样式 | `MarkdownEditor.tsx`, `markdown-editor.css` |
| fix024 | knowledge-base AppError 统一异常体系 | 所有 throw new Error→AppError 子类，catch 块 instanceof 匹配 | `knowledge-base.service.impl.ts`, `knowledge-base.controller.ts` |
| fix025 | CompanyForm 用户下拉无数据 | pageSize:999→100 | `CompanyForm.tsx` |
| fix026 | ProjectForm 创建 400 错误 | description: null→undefined，schema 加 nullable() | `ProjectForm.tsx`, `project.schema.ts` |
| fix027 | Docker 构建 prisma generate 失败 | `prisma generate --generator=client` 跳过 openapi | `Dockerfile` |
| fix028 | article.controller 审计日志+ROLES 常量 | 删除审计日志、handleServerError 500 日志、ROLES 常量替换魔法字符串、search trim | `article.controller.ts`, `article.service.impl.ts`, `article.schema.ts` |
| fix029 | bold.tsx 评审封装层修复 | 英文 ARIA 覆盖为中文、SVG aria-hidden、图标 12→16px、移动端触摸 44px | `MarkdownEditor.tsx`, `markdown-editor.css` |
| fix030 | fullscreen 命令评审修复 | execute 按钮失效修复、快捷键→Ctrl+Shift+F、antd 图标、中文 ARIA | `MarkdownEditor.tsx` → 详见 `tasks/fix.fullscreen命令评审修复.md` |
| fix031 | group.tsx 评审封装层修复 | 图标替换、ARIA+role=menu、触摸 48px、Carbon 下拉菜单样式 | `MarkdownEditor.tsx`, `markdown-editor.css` → 详见 `tasks/fix.group命令评审修复.md` |
| fix032 | help.tsx 评审封装层修复 | noopener+noreferrer、弹窗拦截降级、中文 ARIA、antd 图标、F1 快捷键 | `MarkdownEditor.tsx` |
| fix033 | hr 命令评审修复 | 快捷键→Ctrl+Shift+H、SVG 替换、行级 toggle、错误边界、Ctrl+H 拦截 | `MarkdownEditor.tsx` |
| fix034 | issue.tsx 评审封装层修复 | # 语义碰撞防护、prefix 空值守卫、错误边界、SVG 16px、中文 ARIA | `MarkdownEditor.tsx` |
| fix035 | skills.controller ReDoS 修复 | js-yaml 替代正则解析 YAML frontmatter | `apis/utils/skill-md.util.ts` |
| fix036 | strikeThrough.tsx 评审修复 | prefix!→防御性守卫、try-catch、中文 ARIA、SVG aria-hidden | `node_modules` 源码 → 详见 `tasks/fix.strikeThrough命令评审修复.md` |
| fix037 | title2.tsx 评审修复 | 移除死代码 prefixMap、role="img" 矛盾修复、14 个测试 | `MarkdownEditor.tsx` → 详见 `tasks/fix.title2命令评审修复.md` |
| fix038 | Markdown textarea 不渲染 | 移除 cloneNode+replaceChild cleanup，StrictMode 下会销毁 DOM 子树 | `MarkdownEditor.tsx` |
| fix039 | Markdown 横向滚动条+高度不自适应 | overflow-x 移至移动端媒体查询、scrollHeight 动态高度 | `MarkdownEditor.tsx`, `markdown-editor.css` |
| fix040 | upload.controller 安全修复 | 静态文件安全头+强制下载、图片尺寸验证 8000×8000 上限 | `app.ts`, `image-validator.ts`, `upload.controller.ts` |
| fix041 | title3.tsx 安全修复 | prefix!→`?? '### '`、suffix→`?? ''` | `patches/@uiw+react-md-editor+4.1.0.patch` |
| fix042 | title.tsx 评审修复 | 循环依赖消除、废弃注释统一、suffix 默认值→''、patch-package v8 迁移 | `patches/@uiw+react-md-editor+4.1.0.patch` |
| fix043 | 发布中状态文章禁止删除 | 后端 delete 拦截 publishing，前端 canDelete 增加 publishing 判断 | `article.service.impl.ts`, `pages/article/index.tsx` |
