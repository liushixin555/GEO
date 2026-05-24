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
| 2026-05-24 | `tasks/tdd/skills.controller.test.md` | skills.controller.ts TDD 补全——+22 用例（96 总），Stmts 94.5% Branch 86.11% Funcs 100% Lines 96.34% |
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
