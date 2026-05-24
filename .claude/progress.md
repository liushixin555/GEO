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
| 2026-05-16 | `progress_tasks/archive-2026-05-16.md` | 登录、公司管理、技能管理 |
| 2026-05-17 | `progress_tasks/archive-2026-05-17.md` | 用户管理、项目管理、多运营者、踩坑经验 |
| 2026-05-18 | `progress_tasks/archive-2026-05-18.md` | 文章管理、调度器、状态权限优化 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-app-tsx.md` | App.tsx 评审 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-apis-app.md` | apis/app.ts 评审+TDD |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-config.md` | config/index.ts 评审 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-article-ctrl.md` | article.controller.ts 评审 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-articledetail.md` | ArticleDetail.tsx 评审 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-markdown-preview.md` | markdown-preview 评审 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-api-docs-page.md` | api-docs 页面评审 |
| 2026-05-24 | `progress_tasks/archive-2026-05-24-other.md` | todo/upload/knowledge-base 等 |
| 2026-05-24 | `progress_tasks/2026-05-24-bugfix-429-login.md` | Docker 429 限流 + 登录死循环 + Swagger 部署 |

## 已知问题
- `apis/service/impl/auth.service.impl.ts` Prisma 类型错误（待 schema 同步）
- `apis/service/impl/todo.service.impl.ts` 编译错误（待修复）
- `apis/service/impl/user.service.impl.ts` deletedAt 字段不存在（待 schema 同步）
