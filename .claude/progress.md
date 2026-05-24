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

## 已知问题
- `apis/service/impl/auth.service.impl.ts` Prisma 类型错误（待 schema 同步）
- `apis/service/impl/todo.service.impl.ts` 编译错误（待修复）
- `apis/service/impl/user.service.impl.ts` deletedAt 字段不存在（待 schema 同步）
