# 项目进度

> 本文件只记录当前状态摘要和变更索引。
> 详细变更记录保存在 `progress_tasks/` 目录下的独立文件中。
> 历史归档见 `progress_tasks/archive-history.md`。

## 已完成模块

| 模块 | 状态 | 说明 |
|------|------|------|
| 登录认证 | ✅ | JWT 登录/验证/登出 + 角色路由守卫 |
| 公司管理 | ✅ | CRUD（仅 sysadmin）+ 多运营者/查看者 |
| 用户管理 | ✅ | CRUD（仅 sysadmin）+ bcrypt 加密 |
| 项目管理 | ✅ | CRUD + 运营者/查看者多对多 |
| 技能管理 | ✅ | CRUD + created_by 权限控制 |
| 文章管理 | ✅ | CRUD + AI生成 + 正文编辑 + 版本历史 + 审核 |
| 知识库 | ✅ | 关键词/画像/图片 + 扩展词 |
| 发布管理 | ✅ | 发布平台 + 发布调度 |
| LLM 模型 | ✅ | CRUD（仅 sysadmin） |
| 系统配置 | ✅ | 配置管理（仅 sysadmin） |
| 文件上传 | ✅ | multer 图片上传 |
| 每日检测 | 🚧 | 待开发（view 角色唯一功能） |

## 当前阶段
- 核心功能开发完成，进入优化和 Bug 修复阶段
- Docker 部署（Nginx + Node.js）

## 变更索引

| 日期 | 文件 | 摘要 |
|------|------|------|
| 2026-05-16~05-24 | `progress_tasks/archive-history.md` | 历史归档（开发+评审+重构） |
| 2026-05-24 | `progress_tasks/2026-05-24-bugfix-429-login.md` | Docker 429 限流 + 登录死循环 + Swagger 部署 |
| 2026-05-24 | `tasks/review/nohighlight.tsx.security.md` | nohighlight.tsx 代码安全专家评审——B+ 8.5分 |
| 2026-05-24 | `tasks/review/nohighlight.tsx.ui.md` | nohighlight.tsx UI 专家评审——5项严重问题 |
| 2026-05-24 | `tasks/review/ArticleDetail.tsx.security.md` | ArticleDetail 安全评审 D+ 级 → 修复 XSS/Token/用户校验/错误脱敏 |
| 2026-05-24 | `tasks/review/nohighlight.tsx.committer.md` | nohighlight.tsx Committer 专家评审——有条件通过，需补充 CSS 覆盖 |
| 2026-05-24 | `tasks/review/article.controller.ts.committer.md` | article.controller.ts 安全/质量/架构/Committer 多轮评审修复 |
| 2026-05-24 | `progress_tasks/2026-05-24-controller-tdd.md` | Controller TDD 测试修复——7套件650用例全通过，修复SSRF IPv6+Zod双重解析 |
| 2026-05-24 | `progress_tasks/2026-05-24-tdd-hook-chapter.md` | hook-chapter 组件 TDD 测试——42 项用例、100% 覆盖率 |
| 2026-05-24 | `tasks/review/knowledge.controller.ts.committer.md` | knowledge.controller.ts Committer 评审——4项阻塞（越权+OOM+非事务+批量无上限），REQUEST CHANGES |
| 2026-05-24 | `tasks/review/ArticleDetail.tsx.ui.md` | ArticleDetail UI 评审修复——圆角/颜色/键盘/ARIA/响应式/保存状态 12 项 |
| 2026-05-24 | `tasks/review/auth.controller.ts.architecture.md` | auth.controller.ts 架构评审——✅通过，已修复5项旧问题，剩余3项HIGH建议修复 |
| 2026-05-24 | `tasks/review/auth.controller.ts.security.md` | auth.controller.ts 安全评审——B级，H×3（暴力破解/Token吊销/验证冗余）M×4 L×3 |
| 2026-05-24 | `progress_tasks/2026-05-24-nohighlight-review-fix.md` | nohighlight.tsx 评审修复——CSS Carbon覆盖 + /nohighlight入口 + ErrorBoundary + DOMPurify增强 |
| 2026-05-24 | `progress_tasks/2026-05-24-kb-controller-tdd.md` | knowledge-base controller TDD 补全——修复10个Zod兼容测试+新增10个直接函数测试，103用例100%覆盖 |
| 2026-05-24 | `tasks/review/useCopied.tsx.security.md` | useCopied.tsx 代码安全专家评审——⚠️有条件通过，H×1 废弃API依赖 + M×4 + L×3，综合3.7分 |
| 2026-05-24 | `tasks/review/useCopied.tsx.ui.md` | useCopied.tsx UI专家评审——2.7分，P1×3（无可访问性反馈/虚假成功/硬编码时长）+ P2×4 + P3×4 |
| 2026-05-24 | `tasks/review/useCopied.tsx.committer.md` | useCopied.tsx Committer 专家评审——有条件通过，需补充 CSS 样式覆盖和可访问性改进 |
| 2026-05-24 | `tasks/review/company.controller.ts.quality.md` | company.controller.ts 质量评审——B-级，H×4（死代码/缺schema/脆弱错误/静默吞错）M×3 L×2 |
| 2026-05-24 | `progress_tasks/2026-05-24-usecopied-review-fix.md` | useCopied.tsx 评审修复——useCallback/closest/success检查/MAX_COPY_LENGTH/CSS Carbon覆盖，27项测试 |
| 2026-05-24 | `tasks/review/company.controller.md` | company.controller.ts 架构专家评审（第二轮）——通过，114行重构版，已修复全部HIGH级问题，剩余2项MAJOR项目级债务 |
| 2026-05-24 | `tasks/review/preview.tsx.md` | @uiw/react-markdown-preview preview.tsx 质量评审——4.7分，P1×3（URL消毒禁用/skipHtml反转/标签白名单过宽）+ P2×3 + P3×5 |
| 2026-05-24 | `tasks/review/company.controller.ts.md` | company.controller.ts 代码安全专家评审（第二轮）——✅LOW 低风险，6/7项已修复，剩余4项P2-P3 |
| 2026-05-24 | `tasks/review/company.controller.ts.committer.md` | company.controller.ts Committer 审核专家评审——通过（APPROVE），前次P1全修复，剩余P2×3+P3×4 |
| 2026-05-24 | `tasks/review/preview.tsx.security.md` | @uiw/react-markdown-preview preview.tsx 代码安全专家评审——REJECT（P0×3：URL消毒禁用XSS/skipHtml语义反转/标签白名单过宽），综合2.5分 |
| 2026-05-24 | `progress_tasks/2026-05-24-llm-model-controller-tdd.md` | llm-model.controller TDD 补全——+33 用例（190 总），覆盖 Stmts 98.44% Branch 95.91% Lines 100% |
| 2026-05-24 | `tasks/review/preview.tsx.ui.md` | @uiw/react-markdown-preview preview.tsx UI 专家评审——REJECT 2.1分，P0×6（CSS冲突/零antd集成/skipHtml反转/零a11y/拼写错误合并/URL消毒）+ P1×4 |
| 2026-05-24 | `tasks/review/preview.tsx.committer.md` | @uiw/react-markdown-preview preview.tsx Committer 审核专家评审——有条件通过，DOMPurify 单点防护需加固为纵深防御 |
| 2026-05-24 | `progress_tasks/2026-05-24-company-controller-review-fix.md` | company.controller.ts 评审修复——异常体系对齐+toggleStatus schema+移除死代码+日志+边界检查 |
| 2026-05-24 | `tasks/tdd/video-presentation-useAudioPlayer.test.md` | useAudioPlayer hook TDD——63 项用例、100% 全维度覆盖率 |
| 2026-05-24 | `tasks/review/Props.tsx.ui.md` | Props.tsx UI 评审修复——a11y可配置/Empty组件/forwardRef命令式API/事件处理props，+12测试（48总） |
| 2026-05-24 | `progress_tasks/2026-05-24-fix-company-project-switcher.md` | 修复登录后右下角公司/项目选择不显示——login()补充写入selected_company/selected_project到localStorage |
| 2026-05-24 | `tasks/tdd/video-presentation-useStepper.test.md` | useStepper hook TDD——68 项用例、98.91% Stmts/97.05% Branch/100% Lines + 修复空 chapters 崩溃 |
| 2026-05-24 | `progress_tasks/2026-05-24-project-controller-tdd.md` | project.controller.ts TDD 补全——修复 schema+9个失败测试+1个新增用例，65用例 Stmts/Branch/Lines 100% |
| 2026-05-24 | `tasks/review/rehypePlugins.tsx.md` | @uiw/react-markdown-preview rehypePlugins.tsx 质量评审——CONDITIONAL ACCEPT 5.8分，P0×3（正则误判/类型断言不安全/XSS攻击面）+ P1×3 |
| 2026-05-24 | `tasks/review/rehypePlugins.tsx.architecture.md` | @uiw/react-markdown-preview rehypePlugins.tsx 架构评审——CONDITIONAL APPROVE 5.0分，P1×3（隐式契约耦合/SRP三重职责/OCP缺失）+ P2×3 |
| 2026-05-24 | `tasks/tdd/publishing-platform.controller.test.md` | publishing-platform.controller TDD 补全——+12 用例（52 总），Stmts/Branch/Funcs/Lines 100% |
| 2026-05-24 | `tasks/review/index.ts.security.md` | controller/index.ts 代码安全专家评审——REJECT 3.5分（53%模块脱离管控+上传安全+死代码100%） |
| 2026-05-24 | `tasks/review/controller-index.committer.md` | controller/index.ts Committer 审核专家评审——REJECT 2.0分（65%函数遗漏+零引用死代码+推荐删除） |
| 2026-05-24 | `tasks/review/rehypePlugins.tsx.security.md` | @uiw/react-markdown-preview rehypePlugins.tsx 代码安全专家评审——REJECT 3.5分（data-code XSS+属性注入+DoS+URL消毒禁用） |
| 2026-05-24 | `tasks/review/rehypePlugins.tsx.ui.md` | @uiw/react-markdown-preview rehypePlugins.tsx UI 专家评审——REJECT 2.5分（GitHub Octicon冲突Carbon设计系统/复制按钮div非antd Button/零可访问性/触控目标16x16） |
| 2026-05-24 | `progress_tasks/2026-05-24-controller-index-barrel-delete.md` | controller/index.ts barrel file 删除——采纳 Committer 方案 B，消除死代码（零引用+65%遗漏） |
| 2026-05-24 | `tasks/review/rehypePlugins.tsx.committer.md` | @uiw/react-markdown-preview rehypePlugins.tsx Committer 评审——有条件通过 5.5/10（nohighlight安全面收窄+DOMPurify缓解+隐式契约版本锁定） |
| 2026-05-24 | `tasks/tdd/publishing-schedule.controller.test.md` | publishing-schedule.controller TDD 补全——修复12失败用例+21单元测试（65总），Stmts/Branch/Funcs/Lines 100% |
| 2026-05-24 | `tasks/review/knowledge-base.controller.md` | knowledge-base.controller.ts 代码安全专家评审——✅MEDIUM-LOW 8.0/10（6项已修复+SEC-M-02 schema遗漏status+SEC-M-01归属校验） |
| 2026-05-24 | `tasks/tdd/skills.controller.test.md` | skills.controller.ts TDD 补全——+24 用例（98 总），Stmts/Branch/Funcs/Lines 100%（防御性分支：non-Error multer+!req.user） |
| 2026-05-24 | `progress_tasks/2026-05-24-rehypePlugins-review-fix.md` | rehypePlugins.tsx 评审修复——patch-package补丁(正则Set+类型守卫+XSS编码+try-catch) + MarkdownViewer React.memo/a11y/代码块长度限制 |
| 2026-05-24 | `tasks/review/knowledge-base.controller.ts.committer.md` | knowledge-base.controller.ts Committer 审核专家评审——APPROVE 批准合并（三层纵深防御+103测试通过+旧版P1全修复+Zod schema遗漏status建议补全） |
| 2026-05-24 | `tasks/review/Context.tsx.quality.md` | @uiw/react-md-editor Context.tsx 软件质量专家评审——CONDITIONAL APPROVE 3.6/10（P0索引签名any+P1 dispatch混入state+DOM引用存Context+Reducer无Action区分） |

## 已知问题
- `apis/service/impl/auth.service.impl.ts` Prisma 类型错误（待 schema 同步）
- `apis/service/impl/todo.service.impl.ts` 编译错误（待修复）
- `apis/service/impl/user.service.impl.ts` deletedAt 字段不存在（待 schema 同步）

| 2026-05-24 | progress_tasks/2026-05-24-index-tsx-ui-review-fix.md | index.tsx UI评审修复——CSS border/font-family/token颜色 + 测试 + jest-dom类型 |
| 2026-05-24 | progress_tasks/2026-05-24-app-committer-review-fix.md | App.tsx Committer评审修复——重写测试覆盖认证/未认证/认证失败/ErrorBoundary，11用例全通过 |
| 2026-05-24 | progress_tasks/2026-05-24-project-controller-review-fix.md | project.controller.ts 评审修复——C-1/C-2 view拦截 + M-1 err:unknown + M-5 search限制 + L-3 长度验证，76测试全通过 |
| 2026-05-24 | tasks/tdd/upload.controller.test.md | upload.controller.ts TDD 补全——+10 用例（39总），Stmts 96.55% Branch 84.21% Funcs 100% Lines 96.42% |
| 2026-05-24 | tasks/review/Context.tsx.architecture.md | @uiw/react-md-editor Context.tsx 架构专家评审——3.0/10（P0×3：索引签名any/Reducer无Action/DOM混入Context + P1×2 + P2×2） |
| 2026-05-24 | tasks/review/Context.tsx.security.md | @uiw/react-md-editor Context.tsx 代码安全专家评审——1.6/10（P0×2：索引签名破坏类型安全+Reducer无Action区分，P1×2：DOM引用暴露+dispatch混入state，P2×1：默认值不完整） |
| 2026-05-24 | tasks/tdd/company.entity.test.md | company.entity.ts TDD 补全——77 用例全通过（+43新增），覆盖 4 接口全部字段/边界值/跨接口集成 |
| 2026-05-24 | tasks/review/Context.tsx.ui.md | @uiw/react-md-editor Context.tsx UI 专家评审——REJECT 2.8/10（S×5：索引签名any/Reducer无Action/DOM引用混入Context/dispatch混入state/零主题支持 + M×3 + B×2） |
| 2026-05-24 | tasks/review/Context.tsx.committer.md | @uiw/react-md-editor Context.tsx Committer 审核专家评审——⚠️有条件通过 3.4/10（MC-1~MC-4强制要求：封装组件+安全防护+样式对齐+类型加固） |
| 2026-05-24 | progress_tasks/2026-05-24-context-review-fix.md | Context.tsx 评审修复——MC-1~MC-4全部完成：MarkdownEditor封装组件+DOMPurify安全防护+Carbon CSS样式对齐+严格类型接口 |
| 2026-05-24 | tasks/tdd/publishing-schedule.entity.test.md | publishing-schedule.entity TDD——53用例全新测试，覆盖3接口全部字段/可空/边界值/跨接口集成 |
| 2026-05-24 | tasks/tdd/entity-all-tests.md | entity 全量测试汇总——12套件1361用例全通过，覆盖率100%（+publishing-schedule+PermissionDeniedError+article修复） |
| 2026-05-24 | tasks/review/Editor.common.tsx.md | @uiw/react-md-editor Editor.common.tsx 软件质量专家评审——✅通过 7.7/10（工厂+DI优秀，上游useMemo副作用+事件泄漏） |
| 2026-05-24 | tasks/tdd/knowledge-base.entity.test.md | knowledge-base.entity TDD 补全——137用例全通过（+63新增：JSON序列化/Object操作/集合操作/Scope约束/连续更新/高级边界） |
| 2026-05-24 | tasks/review/Editor.common.tsx.security.md | @uiw/react-md-editor Editor.common.tsx 代码安全专家评审——🟡 B-（6项隐患：H×3 XSS/类型安全/API暴露 + M×2 事件泄漏/Tabnabbing + L×1，封装层已部分缓解） |
| 2026-05-24 | tasks/tdd/knowledge.entity.test.md | knowledge.entity TDD 补全——248用例全通过（+96新增：JSON序列化/Object.freeze/集合操作/类型收窄/Scope约束/连续更新/高级边界/结构相等/解构/Object迭代） |
| 2026-05-24 | tasks/review/Editor.common.tsx.ui.md | @uiw/react-md-editor Editor.common.tsx UI 专家评审——⚠️有条件通过 4.9/10（GitHub风格与Carbon全面冲突，封装层覆盖~95%，P1×2无障碍缺失，P2×6工具栏/响应式/focus） |
| 2026-05-24 | tasks/review/Editor.common.tsx.committer.md | @uiw/react-md-editor Editor.common.tsx Committer 审核专家评审——✅通过 7.7/10（common变体选型正确，上游工厂缺陷封装层隔离，REQ-1 DOM清理+REQ-2服务端sanitize） |
| 2026-05-24 | progress_tasks/2026-05-24-editor-common-review.md | Editor.common.tsx 评审修复——DOM清理(SEC-MD-04)+help命令移除(SEC-MD-05)+ARIA无障碍(A-01/A-02)+CSS覆盖(CSS-01/02/03/R-01/A-03) |
| 2026-05-24 | tasks/review/Editor.factory.tsx.quality.md | @uiw/react-md-editor Editor.factory.tsx 软件质量专家评审——❌需改进 3.3/10（P0×2：10处useMemo副作用+事件监听器泄漏，P1×4：滚动除零/状态不可变性/initScroll锁定/冗余dispatch） |
| 2026-05-24 | tasks/review/Editor.factory.tsx.md | @uiw/react-md-editor Editor.factory.tsx 架构专家评审——❌CRITICAL 3.1/10（6+职责巨型组件/13字段单一Reducer/派生状态反模式/Context过度暴露/滚动耦合不可复用） |
| 2026-05-24 | tasks/review/Editor.factory.tsx.security.md | @uiw/react-md-editor Editor.factory.tsx 代码安全专家评审——C+/5.8分（H×3：索引签名原型污染+ref泄露完整状态+useMemo副作用；M×4：突变/泄漏/dispatch暴露/状态泄露；L×3） |
| 2026-05-24 | tasks/review/Editor.factory.tsx.ui.md | @uiw/react-md-editor Editor.factory.tsx UI 专家评审——REJECT 2.4/10（C×6 useMemo副作用/零ARIA/事件泄漏/巨型组件/ref泄露/滚动同步缺陷；H×5 正则渲染/弹窗粗暴/初始化性能/闭包重建/onHeightChange循环；M×4） |
| 2026-05-24 | tasks/review/Editor.factory.tsx.committer.md | @uiw/react-md-editor Editor.factory.tsx Committer 审核专家评审——⚠️有条件通过 3.8/10（REQ-1~6强制要求：ref安全隔离/DOM清理/服务端sanitize/ErrorBoundary/CSS覆盖验证/ARIA补充） |
| 2026-05-24 | tasks/review/Editor.nohighlight.tsx.quality.md | @uiw/react-md-editor Editor.nohighlight.tsx 软件质量专家评审——✅通过 8.5/10（工厂+DI优秀组装模块，传导发现useMemo副作用/事件泄漏/滚动除零） |
| 2026-05-24 | tasks/tdd/todo.entity.test.md | todo.entity TDD 补全——150用例全通过（+124新增：JSON序列化/Object.freeze/结构相等/深拷贝/解构/集合操作/连续更新/日期操作/Set-Map/属性描述符/函数参数） |
| 2026-05-24 | tasks/review/Editor.nohighlight.tsx.architecture.md | @uiw/react-md-editor Editor.nohighlight.tsx 架构专家评审——✅通过 8.8/10（工厂+策略注入教科书级OCP，7行零逻辑冗余，上游传导6项风险ARCH-1~6） |
| 2026-05-24 | tasks/review/Editor.nohighlight.tsx.security.md | @uiw/react-md-editor Editor.nohighlight.tsx 代码安全专家评审——B-/7.0分（nohighlight变体安全基线显著优于标准版，H×3传导+M×4传导+L×2传导，项目MarkdownEditor.tsx多层缓解） |
| 2026-05-24 | tasks/review/Editor.nohighlight.tsx.ui.md | @uiw/react-md-editor Editor.nohighlight.tsx UI 专家评审——⚠️有条件通过 4.6/10（nohighlight变体代码高亮缺失但bundle/安全/无障碍更优，本项目以文本内容为主建议采用） |
| 2026-05-24 | tasks/review/Editor.nohighlight.tsx.committer.md | @uiw/react-md-editor Editor.nohighlight.tsx Committer 审核专家评审——✅通过（APPROVE），nohighlight变体三变体最优，建议从标准版迁移 |
| 2026-05-24 | progress_tasks/2026-05-24-editor-nohighlight-migration.md | Editor.nohighlight.tsx 评审修复——标准版→nohighlight变体迁移（-90KB bundle/消除rehype-raw+Prism.js/零API变更） |
| 2026-05-24 | tasks/review/Editor.tsx.md | @uiw/react-md-editor Editor.tsx 软件质量专家评审——⚠️CONDITIONAL APPROVE 7.4/10（rehype-raw XSS攻击面+Prism.js 90KB膨胀+与nohighlight同构重复） |
| 2026-05-24 | tasks/tdd/auth.middleware.test.md | auth.middleware.ts TDD 补全——62用例全通过，100%覆盖率（+25新增：黑名单交互/Bearer前缀边界/Unicode payload/角色矩阵/null user） |
| 2026-05-24 | tasks/review/llm-model.controller.md | llm-model.controller.ts 架构评审修复——H-3 NotFoundError替代字符串匹配 + C-1 工厂模式createLlmModelService + M-4 Pick类型统一，493测试100%覆盖 |
| 2026-05-24 | tasks/review/Editor.tsx.security.md | @uiw/react-md-editor Editor.tsx 代码安全专家评审——⚠️APPROVE WITH CONCERNS 5.5/10（入口层安全，工厂层传播H×3+M×5+L×2，nohighlight变体隔离XSS） |
| 2026-05-24 | tasks/tdd/middleware.index.test.md | middleware/index.ts TDD 补全——63用例100%覆盖率（barrel重导出+validate全量+articleActionLimiter+修复anti-crawl flaky+rate-limit同步） |
| 2026-05-24 | tasks/review/Editor.tsx.ui.md | @uiw/react-md-editor Editor.tsx UI 专家评审——⚠️APPROVE WITH CONCERNS 6.5/10（原生UI与Carbon系统性偏差，项目封装层高质量适配，遗留移动端触控+!important+交互反馈） |
| 2026-05-24 | tasks/tdd/rate-limit.middleware.test.md | rate-limit.middleware.ts TDD 补全——61用例100%覆盖率（+26新增：skip回调7种method+path+articleActionLimiter全量+NODE_ENV分支+双限流器独立性） |
| 2026-05-24 | tasks/review/Editor.tsx.committer.md | @uiw/react-md-editor Editor.tsx Committer 审核专家评审——✅通过（APPROVE），标准版入口本项目未使用，nohighlight变体选择正确 |
| 2026-05-24 | tasks/tdd/system-config.controller.test.md | system-config.controller.ts TDD——37用例全通过，Stmts/Branch/Funcs/Lines 100%（含防御性分支直接调用覆盖） |
| 2026-05-24 | tasks/tdd/article-generation.scheduler.test.md | article-generation.scheduler.ts TDD 补全——62用例100%覆盖率（+23新增：skills边界/keywords默认值/标题提取/版本号/事务完整性/错误路径/并发防护/多项目） |
| 2026-05-24 | progress_tasks/2026-05-24-upload-controller-architecture-fix.md | upload.controller.ts 架构评审修复——H-1 DRY共享工厂+H-2 Config-driven+H-3 延迟初始化+M-2 安全头，75测试全通过 |
| 2026-05-24 | progress_tasks/2026-05-24-articledetail-committer-test-fix.md | ArticleDetail.tsx Committer 评审测试修复——antd mock 稳定单例+14组件测试(66/67通过)+无限重渲染/ESM/路径修复 |
| 2026-05-24 | tasks/tdd/article.schema.test.md | article.schema.ts TDD——157用例100%覆盖率（6个Zod schema全量验证：枚举/边界值/strict/refine/coerce/类型安全） |
| 2026-05-24 | progress_tasks/2026-05-24-docker-prisma-generate-fix.md | Docker构建修复——prisma generate --generator=client 跳过 openapi devDependency |
| 2026-05-24 | tasks/tdd/company.schema.test.md | company.schema.ts TDD——118用例100%覆盖率（3个Zod schema全量验证：字符串min/max/trim/regex电话/数组ID/布尔status/类型安全） |
| 2026-05-24 | progress_tasks/2026-05-24-editor-tsx-review-fix.md | Editor.tsx 评审修复——ESLint no-restricted-imports 防误用 + 禁止标准入口注释 + CSS-02拖拽条/CSS-03按钮pressed/CSS-05 Firefox滚动条/UX-02过渡动画/R-01移动端响应式/A-04 aria-live |
| 2026-05-24 | tasks/review/bold.tsx.md | bold.tsx 软件架构专家评审——3.3分，P1非空断言绕过类型契约/P2 UI与逻辑混合/P3两阶段无事务保障/P4变量命名/P5可测试性 |
| 2026-05-24 | tasks/tdd/todo.schema.test.md | todo.schema.ts TDD——203用例100%覆盖率（6个Zod schema全量验证：coerce/enum/nullable/optional/default/boundary/类型安全） |
| 2026-05-24 | tasks/tdd/user.schema.test.md | user.schema.ts TDD——150用例100%覆盖率（3个Zod schema全量验证：coerce/enum/transform/strict/边界/类型安全/中文错误消息） |
| 2026-05-24 | tasks/review/bold.tsx.ui.md | bold.tsx UI 专家评审——⚠️有条件通过 4.3/10（P2×2 英文硬编码+原生title非antd Tooltip/Carbon focus ring缺失，P3×3 图标偏小/风格不一致/触摸目标不足） |
| 2026-05-24 | progress_tasks/2026-05-24-bold-tsx-review-fix.md | bold.tsx 评审封装层修复——I18N-01中文aria-label覆盖+A-02 SVG aria-hidden+V-01图标16px+R-01触摸目标44px |
| 2026-05-24 | tasks/tdd/article.service.test.md | article.service TDD 第2轮补全——105用例100%覆盖率（+56新增：JsonNull边界/状态枚举全遍历/接口合规性/多级标题提取/版本号Math.floor） |
| 2026-05-24 | tasks/review/code.tsx.md | code.tsx 软件架构专家评审——7.4分APPROVE（4项MEDIUM同级耦合/职责过重/接口矛盾/两阶段文档+3项LOW序列化/可配置性/契约） |
| 2026-05-24 | progress_tasks/2026-05-24-company-entity-review-fix.md | company.entity.ts 评审修复验证——8项全部已修复确认+移除未使用eslint-disable+362测试全通过 |
| 2026-05-24 | tasks/review/code.tsx.security.md | code.tsx 代码安全专家评审——7.8分APPROVE（MEDIUM×3 非空断言+过期状态+LOW×3 输入校验/Unicode/快捷键） |
| 2026-05-24 | tasks/review/code.tsx.ui.md | code.tsx UI 专家评审——⚠️有条件通过 4.1/10（P2×5 图标13px不合规/风格不统一/Ctrl+J浏览器冲突/英文硬编码/非平台感知 + P3×4 无操作反馈/无ARIA/触摸不足/无语言选择） |
| 2026-05-24 | tasks/tdd/auth.service.test.round2.md | auth.service TDD 第2轮补全——68用例100%覆盖率（+12新增：getLatestUserState全量/verifyToken用户删除/login companyId undefined/null/falsy companyId/接口合规性） |
| 2026-05-24 | tasks/review/code.tsx.committer.md | code.tsx Committer 审核专家评审——⚠️有条件通过 7.2/10（Ctrl+J浏览器冲突需封装层缓解+L58过期状态+图标不一致+英文硬编码） |
| 2026-05-24 | tasks/tdd/company.service.test.round2.md | company.service TDD 第2轮补全——68用例100%覆盖率（+25新增：validateUserIds全量/软删除路径/接口合规性/校验优先级/角色过滤） |
| 2026-05-24 | progress_tasks/2026-05-24-code-tsx-review-fix.md | code.tsx 评审封装层修复——Ctrl+J→Ctrl+E快捷键重映射+非空断言防护+中文ARIA标注+TOOLBAR_LABELS匹配顺序修复 |
| 2026-05-25 | tasks/tdd/auth.service.test.round3.md | auth.service TDD 第3轮补全——78用例100%覆盖率（+10新增：selectedProject降级/sysadmin无项目持久化/project_id=0边界/verifyToken全字段/getAccessibleCompanies companyId=0/sysadmin忽略companyId参数） |
| 2026-05-25 | tasks/review/fullscreen.tsx.md | fullscreen.tsx 软件 UI 专家评审——⚠️CONDITIONAL APPROVE 3.4/10（CRITICAL×1按钮点击不触发+HIGH×3无aria-pressed/快捷键冲突/图标不规范+MEDIUM×3+LOW×2） |
| 2026-05-25 | tasks/tdd/company.service.test.round3.md | company.service TDD 第3轮——85用例100%覆盖率（+17新增：update公司不存在null/操作顺序验证/validateUserIds查询参数/副作用验证/update路径viewer校验） |
| 2026-05-25 | progress_tasks/2026-05-25-fullscreen-review-fix.md | fullscreen.tsx 评审修复——commandsFilter覆盖（P0按钮点击失效+P1快捷键冲突+P2中文ARIA+P2 antd图标），12测试全通过 |
| 2026-05-25 | tasks/tdd/knowledge-base.service.test.md | knowledge-base.service TDD 第2轮补全——84用例100%覆盖率（+16新增：create/update admin所有权校验SEC-M-01全覆盖） |

| 2026-05-25 | progress_tasks/2026-05-25-props-ui-review-verify.md | Props.tsx UI评审验证——所有P1/P2项已在MarkdownViewer+CSS中实现确认，79测试全通过，build/lint通过 |
| 2026-05-25 | tasks/review/group.tsx.committer.md | group.tsx Committer审核专家评审——5.5/10 CONDITIONAL APPROVE（as any类型绕过C-01+循环引用C-02+冗余展开C-03+options覆盖歧义C-04，需封装层P1 ARIA注入+P2图标替换） |
| 2026-05-25 | progress_tasks/2026-05-25-group-tsx-review-fix.md | group.tsx 评审封装层修复——P1 ARIA注入+P2 antd FontSizeOutlined图标替换+下拉菜单Carbon CSS覆盖+触摸设备48px+17测试全通过 |
| 2026-05-25 | tasks/review/help.tsx.architecture.md | help.tsx 软件架构专家评审——5.5/10 CONDITIONAL APPROVE（H×2 window.open全局耦合+零可配置性，M×3 单例无隔离+execute语义缺失+导入耦合） |
| 2026-05-25 | tasks/tdd/llm.service.test.md | llm.service.impl TDD 第2轮——97用例100%覆盖率（+37新增：prompt内容验证/编号前缀边界值/错误链路全分支/response undefined/不同模型配置/图片description边界值） |
| 2026-05-25 | tasks/review/help.tsx.security.md | help.tsx 代码安全专家评审——5.5/10 CONDITIONAL APPROVE（H×2 window.open缺noopener+noreferrer无效+M×1 URL硬编码+M×2 弹窗拦截无反馈） |
| 2026-05-25 | tasks/tdd/project.service.test.md | project.service.impl TDD 第2轮——103用例100%覆盖率（+31新增：错误类型验证statusCode/ Admin边界值userId=0/安全性数据完整性/mapProject边界值） |
| 2026-05-25 | progress_tasks/2026-05-25-articledetail-security-fix.md | ArticleDetail.tsx 安全评审修复确认（D+→A）+ 全局24页面文件 Token 迁移至 apiClient |
| 2026-05-25 | progress_tasks/2026-05-25-help-tsx-review-fix.md | help.tsx 评审封装层修复——P0 noopener反向标签劫持+P1弹窗拦截降级+P2中文ARIA+antd图标+P3 F1快捷键，22测试全通过 |
| 2026-05-25 | tasks/tdd/publishing-schedule.service.test.round2.md | publishing-schedule.service TDD 第2轮——70用例100%覆盖率（+23新增：字段映射null/有值8个+错误类型statusCode消息3个+操作符边界3个+权限边界4个+综合映射5个） |
| 2026-05-25 | tasks/review/hr.tsx.security.md | hr.tsx 代码安全专家评审——6.5/10 APPROVE（H×2 prefix非空断言4次CWE-476+Ctrl+H冲突浏览器历史致数据丢失，M×3 selectWord语义不匹配+选区状态不一致+选区丢弃，L×3 SVG膨胀+aria-label泄露+无错误边界） |
| 2026-05-25 | tasks/tdd/skills.service.test.round2.md | skills.service.impl TDD 第2轮——102用例100%覆盖率（+18新增：错误类型验证NotFoundError/ConflictError+statusCode+数据一致性+字符串边界+数值边界） |
| 2026-05-25 | tasks/review/hr.tsx.ui.md | hr.tsx UI 专家评审——REJECT 3.2/10（P1×3 SVG字母HR语义错位+Ctrl+H冲突浏览器历史+选区丢弃；P2×3 tooltip语义+无role=img+focus缺失；P3×4 触摸+移动端+i18n+aria） |
| 2026-05-25 | tasks/tdd/system-config.service.test.md | system-config.service.impl TDD 第2轮——53用例100%覆盖率（+30新增：错误类型验证+数据一致性+字符串边界纯空格/Unicode/SQL注入+数值边界id=0/极大值+事务深度重复key/P2002+实例独立性+接口一致性） |
| 2026-05-25 | tasks/review/hr.tsx.committer.md | hr.tsx Committer 审核专家评审——⚠️有条件通过 5.0/10（P1×2 Ctrl+H快捷键冲突+SVG图标语义错位需封装层修复，C-01 selectWord不适用行级块元素+17项已知问题均可封装层解决） |
| 2026-05-25 | progress_tasks/2026-05-25-common-tsx-quality-fix.md | common.tsx 质量评审修复——Q-01/Q-05 useMemo性能优化 + Q-04注释 + Q-08插件顺序注释，nohighlight+common双文件patch |
| 2026-05-25 | progress_tasks/2026-05-25-service-index-tdd.md | service/index.ts barrel 文件 TDD——72用例100%覆盖率（13类测试：导出数量/存在性/实例化/工厂函数/源模块关联/重导入/唯一性/方法存在性/异步验证/参数数量） |
| 2026-05-25 | tasks/review/image.tsx.committer.md | image.tsx Committer 审核专家评审——⚠️有条件通过 5.0/10（P1×4 Ctrl+K严重违反行业"插入链接"惯例与link.tsx冲突+SVG缺aria-hidden无障碍不合规+图标13px远低于Carbon标准16/20px+URL检测includes误判漏判并存，安全评审3.5/10 CRITICAL XSS注入，封装层必须创建customImage覆盖） |
| 2026-05-25 | tasks/tdd/knowledge-base.service.test.round2.md | knowledge-base.service TDD 第3轮补全——128用例100%覆盖率（+44新增：接口契约7+错误类型statusCode 8+字段映射3+list边界6+getById边界3+create边界4+update边界6+delete边界3+getAccessibleBaseIds边界3+deletedAt过滤器验证） |
| 2026-05-25 | progress_tasks/2026-05-25-image-tsx-review-fix.md | image.tsx 评审封装层修复——P1×4快捷键Ctrl+Shift+K+URL正则白名单消除XSS+SVG aria-hidden+16px图标+P2×4非空断言防御+alt转义+选区边界+try-catch+中文ARIA，16项新增测试全通过 |
| 2026-05-25 | tasks/review/issue.tsx.committer.md | issue.tsx Committer审核专家评审——无条件通过（命令未注册到默认工具栏，零实际影响，不建议注册使用因#语义碰撞不可根治） |
| 2026-05-25 | progress_tasks/2026-05-25-publishing-schedule-controller-fix-verify.md | publishing-schedule.controller.ts 评审修复验证——12项修复全部确认已应用，213测试全通过 |
| 2026-05-25 | tasks/review/list.tsx.ui.md | list.tsx UI专家评审——⚠️CONDITIONAL APPROVE 3.9/10（P1×2 checkedList回调忽略参数+prefix!非空断言，P2×3 Ctrl+Shift+C冲突+unorderedList缺role="img"+英文硬编码，P3×3 图标偏小+风格不一致+触摸不足） |
| 2026-05-25 | progress_tasks/2026-05-25-skills-controller-security-fix.md | skills.controller.ts 安全评审修复——C-4 parseSkillMd ReDoS修复（js-yaml替代正则），其余13项已修复，419测试全通过 |
| 2026-05-25 | progress_tasks/2026-05-25-italic-tsx-review-fix.md | italic.tsx 评审封装层修复——SEC-M1 prefix!非空断言+SEC-M2输入边界+QUAL-L2错误处理，覆盖italic/bold/strikethrough三命令，+22测试（81总） |
| 2026-05-25 | tasks/review/link.tsx.ui.md | link.tsx UI专家评审——⚠️CONDITIONAL APPROVE 2.5/10（P1×4 Ctrl+L非标准+data-name="italic"复制错误+空链接文本WCAG违规+12px图标；P2×6 URL检测粗放+非空断言+双占位符+aria-hidden缺失+图标不合规+原生title；P3×4 let重赋值+魔法字符串+英文文案+selectWord语义混淆） |
| 2026-05-25 | tasks/tdd/rmapi-index.tdd.md | rmapi.utils/index.ts barrel文件TDD——25用例100%覆盖率（函数导出验证+re-export同一性+类型导出+无副作用+路径解析+完整性检查），修复resource.util Windows路径分隔符 |
| 2026-05-25 | tasks/review/commands-preview.tsx.committer.md | @uiw/react-md-editor commands/preview.tsx Committer审核专家评审——CONDITIONAL APPROVE 3.2分（P1×2 零antd集成+图标辨识度低，P2×3 SVG无障碍+标签未国际化+交互双路径，P3×4 图标尺寸非标+无选中态+快捷键冲突+命名语义误导） |
| 2026-05-25 | tasks/review/quote.tsx.architecture.md | quote.tsx 软件架构专家评审——✅APPROVE WITH COMMENTS 6.5分（H×1 块级命令管道与list.tsx 90%重复无共享抽象 + M×3 ICommand无分类维度/纯计算与副作用混合/prefix!非空断言 + L×2 SVG同层部署/变量命名 + INFO×2 架构最简洁块级命令/hr对比） |
| 2026-05-25 | tasks/review/quote.tsx.ui.md | quote.tsx 软件 UI 专家评审——⚠️合格（图标12px偏小/Ctrl+Q macOS冲突/英文硬编码缺i18n/第三方库CSS继承兼容，DESIGN.md合规需CSS覆盖+图标替换+中文ARIA） |
| 2026-05-25 | tasks/review/quote.tsx.committer.md | quote.tsx Committer 审核专家评审——⚠️有条件通过 7.0/10（P1 macOS Cmd+Q退出应用冲突需封装层覆盖快捷键，块级命令架构优于hr.tsx正确使用insertBeforeEachLine，10项独立问题9项非阻塞） |
| 2026-05-25 | progress_tasks/2026-05-25-nohighlight-patch-review-fix.md | nohighlight.tsx patch层评审修复第二轮——P2-02 displayName + P2-03 ||→?? 一致性，6文件patch更新 |
| 2026-05-25 | progress_tasks/2026-05-25-quote-tsx-review-fix.md | quote.tsx 评审封装层修复——P1-1 Cmd+Q→Ctrl+Shift+Q快捷键+S1 prefix!非空断言防御+Q-6 try-catch错误边界+P2-1中文ARIA，12项新增测试（112总）全通过 |
| 2026-05-25 | tasks/tdd/knowledge.controller.test.round2.md | knowledge.controller TDD 第3轮补全——259用例（+3），Stmts 99.23% Branch 98.97% Funcs 100% Lines 99.81%（覆盖batchCreateKeywords>500限制+mineKeywords无效source_type+checkProjectOperator非运营者） |
| 2026-05-25 | tasks/review/strikeThrough.tsx.md | @uiw/react-md-editor strikeThrough.tsx 软件质量专家评审——⚠️APPROVE WITH COMMENTS 7.5/10（M×2 prefix!非空断言+SVG内联定义，L×2 data-name非标准+缺返回类型，INFO×1 快捷键跨平台） |
| 2026-05-25 | tasks/review/strikeThrough.tsx.architecture.md | @uiw/react-md-editor strikeThrough.tsx 软件架构专家评审——✅APPROVE WITH COMMENTS 7.5分（H×1 inline命令95%同构bold/italic/code无工厂抽象 + M×2 ICommand无分类维度/prefix!非空断言系统性问题 + L×2 SVG同层部署/变量命名 + INFO×2 架构最简洁inline实例/3步线性数据流最清晰） |
| 2026-05-25 | tasks/tdd/llm-model.controller.test.round3.md | llm-model.controller TDD 第3轮补全——264用例（+43），Stmts 99.21% Branch 97.43% Funcs 100% Lines 100%（覆盖null字段/AppError处理/SSRF直接调用/多字段更新/parseId边界/软删除验证） |
| 2026-05-25 | tasks/tdd/app.test.md | app.ts TDD 第六次验证——261用例全通过，100%四维覆盖率确认无回归 |
| 2026-05-25 | progress_tasks/2026-05-25-common-tsx-architecture-fix.md | common.tsx 架构评审修复——A-03 PipelineConfig OCP接口+A-05 export type显式导出+A-07管线顺序注释，9文件patch更新，251组件测试全通过 |
<<<<<<< HEAD
| 2026-05-25 | tasks/review/project.controller.ts.md | project.controller.ts 软件架构专家评审——8.0/10（旧版5.7→新版8.0，旧版CRITICAL×2+HIGH×4全修复，H-1 Zod schema长度不一致+M×3+L×3） |
| 2026-05-25 | tasks/review/title2.tsx.architecture.md | title2.tsx 软件架构专家评审——7.9/10 APPROVE（经典Command Pattern，A-02 ICommand胖接口+A-03 headingExecute具体依赖+A-01模板化DRY权衡） |
| 2026-05-25 | tasks/tdd/system-config.test.round3.md | system-config 模块 TDD 第3轮补全——347用例全通过，4文件100%覆盖率（+23新增：maskSensitiveValue边界/Token安全/Controller直接调用/PUT body边界） |
| 2026-05-25 | tasks/review/title2.tsx.ui.md | title2.tsx 软件 UI 专家评审——⚠️有条件通过 3.9/10（P2×2 纯文本div替代SVG与Carbon不兼容+icon缺aria-hidden，P3×4 toggle降级/快捷键未区分平台/图标风格不统一/触摸不足） |
| 2026-05-25 | tasks/review/title2.tsx.committer.md | title2.tsx Committer 审核专家评审——✅通过（APPROVE），pnpm patch 全面修复循环依赖/废弃注释/默认值等6项问题，生产就绪 |
| 2026-05-25 | tasks/tdd/todo.controller.test.round4.md | todo 模块 TDD 第4轮——649用例全通过（+22新增：分页边界/创建边界/转交边界/更新边界/驳回边界/响应结构验证），4核心文件100%覆盖率 |
| 2026-05-25 | progress_tasks/2026-05-25-project-controller-review-fix.md | project.controller.ts 二轮评审修复——Zod schema对齐DB约束(50/500)+controller精简177→161行+id>0检查+handleServiceError统一，117测试全通过 |
| 2026-05-25 | tasks/review/title3.tsx.quality.md | title3.tsx 软件质量专家评审——⚠️有条件通过 7.2/10（循环依赖已消除+废弃策略规范，H×1 prefix!非空断言+M×3 图标风格/fontSize非等差/快捷键冲突+L×3） |
| 2026-05-25 | tasks/review/title3.tsx.architecture.md | title3.tsx 软件架构专家评审——✅APPROVE 7.7/10（依赖拓扑健康无循环依赖+废弃策略规范+ICommand契约完整，A1 prefix!非空断言+A2 内联样式图标+A3 fontSize非等差） |
| 2026-05-25 | tasks/review/publishing-platform.controller.security.md | publishing-platform.controller.ts 代码安全专家评审（v2）——HIGH×2（凭证明文链路H-1+sync无并发控制H-2）+MEDIUM×5+LOW×3，v1全部10项已修复 |
| 2026-05-25 | tasks/review/publishing-platform.controller.committer.md | publishing-platform.controller.ts Committer 审核专家评审（v2）——APPROVE 通过，v1全部8项问题已修复，83测试用例覆盖率>98%，代码质量为项目标杆 |
| 2026-05-25 | progress_tasks/2026-05-25-context-tsx-architecture-fix.md | Context.tsx 架构评审修复——P0-1移除[key:string]:any+P2-2 ExecuteCommandState显式定义+reducer返回类型简化，patch-package补丁，129测试全通过 |
| 2026-05-25 | progress_tasks/2026-05-25-title3-tsx-review-fix.md | title3.tsx 评审封装层修复——Ctrl+1-6快捷键拦截+IBM Plex Sans字体声明+H5/H6最小12px+role="img"无障碍属性 |
