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
| fix058 | list-reveal-chapter.test.tsx 评审修复——删除（源组件不存在+违反.agents铁律+Mock API断裂，59测试0可执行） | `tests/pages/list-reveal-chapter.test.tsx`（已删除） |
| fix059 | 文章列表+发布计划列表500错误——迁移脚本枚举顺序修复+Prisma schema/Entity同步 | `prisma/migrations/`, `prisma/schema.prisma`, `apis/entity/article.entity.ts` |
| fix060 | 知识库图片上传400错误——imageUrl校验不支持相对路径+知识清单/详情显示被文章使用次数 | `apis/schema/knowledge.schema.ts`, `apis/controller/knowledge.controller.ts`, `pages/knowledge/index.tsx`, `pages/knowledge/KnowledgeBaseDetail.tsx` |
| fix061 | 文章设置表单关键词/画像/图片改为纯知识库选择+创建API 400修复+移除存草稿按钮 | `pages/article/components/ArticleSettingsForm.tsx`, `pages/article/components/ArticleImageManager.tsx`, `apis/schema/article.schema.ts`, `pages/article/types.ts`, `pages/article/hooks/useArticleDetail.ts`, `pages/article/ArticleDetail.tsx` |
| fix062 | CORS跨域拒绝返回403+前端强制退出登录+antd Card bordered废弃警告+MaskReveal残留导出清理 | `apis/app.ts`, `pages/lib/apiClient.ts`, `.env`, `pages/login/index.tsx`, `pages/swagger/index.tsx`, `pages/components/index.ts` |
| fix063 | 系统配置接口400——ruanmeng配置项未加入白名单 | `apis/constants/system-config.ts` |
| fix064 | 日志IP显示::1而非真实客户端IP——getClientIp工具+Vite xfwd转发 | `apis/utils/ip.util.ts`, `apis/app.ts`, `apis/controller/auth.controller.ts`, `apis/middleware/anti-crawl.middleware.ts`, `apis/controller/publishing-platform.controller.ts`, `apis/controller/llm-model.controller.ts`, `vite.config.ts` |
| fix065 | 技能上传已删除同名技能报400——检查顺序调整（先查活跃重复再解压） | `apis/service/skills.service.ts`, `apis/service/impl/skills.service.impl.ts`, `apis/controller/skills.controller.ts` |
| fix066 | 文档上传file_url验证400+挖掘来源筛选无效+知识库资源硬删除+文档删除静默+Dockerfile加速 | `apis/schema/knowledge.schema.ts`, `apis/service/impl/knowledge.service.impl.ts`, `apis/controller/knowledge.controller.ts`, `pages/knowledge/KeywordMine.tsx`, `Dockerfile` |

| fix067 | 文章生成未实际读取已选 skill，导致薄云咨询品牌主线缺失 | `apis/scheduler/article-generation.scheduler.ts`, `apis/service/llm.service.ts`, `apis/service/impl/llm.service.impl.ts` |
| fix068 | 技能目录多嵌套导致文章生成读取不到 SKILL.md | `apis/service/impl/llm.service.impl.ts` |
| fix069 | 文章生成过程性英文说明混入正文 | `apis/service/impl/llm.service.impl.ts` |
| fix070 | 未选择图片时文章生成外部图片链接 | `apis/scheduler/article-generation.scheduler.ts`, `apis/service/impl/llm.service.impl.ts` |
| fix071 | 文章生成 Markdown 表格后处理修复 | `apis/service/impl/llm.service.impl.ts` |
 | fix072 | 知识库文档下载404 - uploadDir路径解析错误 | `apis/config/index.ts`, `dist/apis/config/index.js` |
| fix073 | 知识库画像内容参数校验上限过小 | `apis/schema/knowledge.schema.ts`, `tests/apis/knowledge.schema.test.ts` |
| fix074 | 桌面启动脚本使用旧 dist 后端和旧项目快捷方式 | `启动项目.bat` |
| fix075 | 引用诊断模块中文乱码修复 | `apis/controller/citation-diagnosis.controller.ts`, `apis/service/impl/citation-diagnosis.service.impl.ts`, `apis/scheduler/citation-diagnosis.scheduler.ts`, `apis/utils/citation-collector.util.ts`, `apis/utils/citation-question-bank.util.ts`, `pages/citation-diagnosis/index.tsx` |
| fix076 | 文章已生成后仍被标记失败的状态覆盖修复 | `apis/scheduler/article-generation.scheduler.ts`, `apis/service/impl/llm.service.impl.ts` |
| fix077 | 引用检测模型调用未覆盖全部启用模型且 DeepSeek 根地址 404 | `apis/utils/citation-collector.util.ts`, `apis/service/impl/citation-diagnosis.service.impl.ts`, `apis/scheduler/citation-detection.scheduler.ts`, `tests/apis/citation-collector.util.test.ts` |
| fix077 | 引用诊断来源解析与真实咨询问题优化 | `apis/utils/citation-collector.util.ts`, `apis/service/impl/citation-diagnosis.service.impl.ts`, `apis/schema/citation-diagnosis.schema.ts`, `apis/controller/citation-diagnosis.controller.ts` |
| fix078 | 文章生成 prompt 按 skill 拆分收口 | `apis/utils/article-prompt-builder.util.ts`, `apis/service/impl/llm.service.impl.ts` |
| fix079 | 文章详情历史 plain-text portrait 导致加载失败 | `pages/article/hooks/useArticleDetail.ts`, `pages/citation-diagnosis/index.tsx` |
| fix079 | 文章详情历史 plain-text portrait 导致加载失败 | `pages/article/hooks/useArticleDetail.ts`, `pages/citation-diagnosis/index.tsx` |
| fix080 | VS Code dev 启动未等待数据库导致登录误报密码错误 | `scripts/wait-for-db.cjs`, `package.json`, `tests/scripts/wait-for-db.test.cjs` |
| fix081 | 引用检测命中次数为0——软盟后台链接误入库、历史URL规范不一致、检测过早与模型HTTP 400 | `apis/utils/citation-url.util.ts`, `apis/utils/citation-detection-schedule.util.ts`, `apis/scheduler/citation-detection.scheduler.ts`, `apis/service/impl/citation-diagnosis.service.impl.ts`, `apis/utils/citation-collector.util.ts`, `prisma/migrations/20260703001000_cleanup_internal_published_links/` |
## 2026-07-03 发布后引用检测闭环未触发

- 编号：fix-20260703-citation-closure
- 标题：已发布文章缺少发布链接入库导致引用检测无法触发
- 关联文件：`apis/service/impl/publishing-execution.service.impl.ts`、`apis/service/impl/publishing-order-sync.service.impl.ts`、`apis/service/impl/citation-diagnosis.service.impl.ts`、`apis/schema/citation-diagnosis.schema.ts`
- 详情：`tasks/progress_tasks/2026-07-03-published-link-citation-closure.md`

## 2026-07-03 引用检测命中为 0 与延迟检测

- 编号：fix-20260703-citation-hit-delay
- 标题：引用检测命中次数为 0，原因包括软盟后台链接误入库、历史 URL 规范不一致、检测过早与模型 HTTP 400
- 关联文件：`apis/utils/citation-url.util.ts`、`apis/utils/citation-detection-schedule.util.ts`、`apis/scheduler/citation-detection.scheduler.ts`、`apis/service/impl/citation-diagnosis.service.impl.ts`、`apis/utils/citation-collector.util.ts`、`prisma/migrations/20260703001000_cleanup_internal_published_links/`
- 详情：`tasks/progress_tasks/2026-07-03-citation-hit-delay-fix.md`

## 2026-07-03 引用检测命中为 0 与延迟检测

- 编号：fix-20260703-citation-hit-delay
- 标题：引用检测命中次数为 0，原因包括软盟后台链接误入库、历史 URL 规范不一致、检测过早与模型 HTTP 400
- 关联文件：`apis/utils/citation-url.util.ts`、`apis/utils/citation-detection-schedule.util.ts`、`apis/scheduler/citation-detection.scheduler.ts`、`apis/service/impl/citation-diagnosis.service.impl.ts`、`apis/utils/citation-collector.util.ts`、`prisma/migrations/20260703001000_cleanup_internal_published_links/`
- 详情：`tasks/progress_tasks/2026-07-03-citation-hit-delay-fix.md`

## 2026-07-03 软盟发布链接未及时入库
- 编号：fix-20260703-publishing-link-late-url
- 标题：软盟订单进入非 0 状态后不再轮询，导致已发布文章最终链接迟到时无法入库
- 关联文件：`apis/service/impl/publishing-order-sync.service.impl.ts`、`tests/apis/publishing-order-sync.service.test.ts`
- 详情：`tasks/progress_tasks/2026-07-03-publishing-link-sync-late-url.md`

## 2026-07-03 软盟发布链接未及时入库
- 编号：fix-20260703-publishing-link-late-url
- 标题：软盟订单进入非 0 状态后不再轮询，导致已发布文章最终链接迟到时无法入库
- 关联文件：`apis/service/impl/publishing-order-sync.service.impl.ts`、`tests/apis/publishing-order-sync.service.test.ts`
- 详情：`tasks/progress_tasks/2026-07-03-publishing-link-sync-late-url.md`
