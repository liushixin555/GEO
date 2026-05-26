# 开发规范

## 铁律（不可违反）
1. **所有页面样式必须遵循 DESIGN.md** — 以 IBM Carbon Design System 为权威参考（颜色、字体、间距、圆角、组件规范）
2. **必须使用 Ant Design (antd) 组件** — Button、Input、Form、Card、Menu、Layout、Table、Modal、Select、Switch、Tag、Popconfirm、Typography、Space 等，凡 antd 有的组件必须使用，禁止用原生 HTML 元素替代
3. **禁止在 TSX 文件中写 inline style (`style={{}}`)** — 所有 CSS 样式必须写入 `pages/styles/global.css`，用 className 引用
4. **Git commit 消息必须使用中文** — 格式：`<类型>: <中文描述>`，例如 `feat: 添加知识库模块`，禁止使用英文 commit 消息
5. **页面布局高度自适应铁律** — 所有页面容器（`.main-content` → `#main-content` → `.page-container`）必须形成完整的 flex 高度链，每一层都必须设置 `flex: 1; min-height: 0; height: 100%`。严禁只改 `overflow: hidden` 而不设高度导致容器塌缩。修改布局样式前必须先在浏览器实测确认效果，禁止凭推测提交
6. **页面内严禁出现 y 轴滚动条** — 页面内容必须在视口内完全展示，严禁出现页面级或组件级 y 轴滚动条。如内容超出，应通过分页、折叠等手段控制数据量，不得用 `overflow-y: auto/scroll` 或 antd Table 的 `scroll={{ y }}` 产生滚动条
7. **技能上传同名规则铁律** — 上传时存在未删除的同名技能则报错失败；存在已删除的同名技能则用新数据刷新记录并将 deletedAt 设为 null；Prisma schema 有 `@@unique([name])` 约束，软删除记录不能直接 create，必须 update 复用
8. **文章发布解耦铁律** — 文章（Article）和发布（PublishingSchedule）完全解耦。文章只管内容生命周期：`draft → manual_writing/generating → pending_review → approved`，`approved` 是最终态（可发布）。发布状态（`publishing/published/publish_failed`）由 PublishingSchedule 独立管理，严禁在 article.schema/article.entity 的 API 层出现发布状态。`scheduled_publish_at`/`schedule_type`/`platforms` 属于 PublishingSchedule，不属于 Article

## 记忆规范
- **所有 `.claude/` 下的文件必须用中文编写** — 包括 MEMORY.md、rules.md、architecture.md、frontend.md、progress.md 等，禁止使用英文内容
- **所有记忆必须保存到本项目的 `.claude/` 目录下** — 禁止保存到用户目录 `~/.claude/projects/` 下

## 权限铁律（不可违反）
- **新增任何 API 必须遵守权限规范** — 详见 [permissions.md](./permissions.md)
- **三个角色的权限边界必须严格维护**：sysadmin（全量）、admin（被授权的项目）、view（只读发布管理）
- **admin 跨公司操作必须返回 403** — Controller 层强制注入 companyId
- **sysadmin 用户不可被修改角色或删除** — Service 层硬保护
- **所有受保护 API 必须三层校验**：authMiddleware → roleMiddleware → 数据隔离
- **前端菜单必须按角色过滤** — Sidebar 的 menuItems 必须设置正确的 roles 数组
- **新增 API/页面必须完成权限检查清单** — 见 permissions.md 第七章
- **`/api/companies` 仅限公司管理页面** — 其他页面需要公司数据必须走 `/api/auth/companies` 或 `/api/auth/companies/:id`
- **User API 仅 sysadmin** — admin/view 全部 403，不需要 controller 层公司隔离
- **Skills 基于 created_by 权限** — admin 只能修改/删除自己创建的技能，sysadmin 不受限制
- **项目所属公司不可更改** — 一旦创建，company_id 不可修改，controller 层统一拦截（任何角色）
- **项目 admin 按运营者身份鉴权** — admin 只能操作 operator_ids 包含自己 userId 的项目，而非基于公司匹配
- **项目编辑表单禁用公司选择** — 前端 ProjectForm 编辑模式下 Select disabled

## 通用规范
- **每次任务结束后必须执行 `git add` + `git commit` + `git push`**，将所有变更提交并推送到远程仓库
- 每次提交代码前必须执行 `pnpm build` 和 `pnpm lint`，确保编译和规范检查通过后再提交
- **前端 message.error 必须使用 getApiErrorMessage** — 所有 `message.error()` 调用必须使用 `getApiErrorMessage(err, fallback)`，禁止使用 `err.message`（会显示 "Request failed with status code xxx"）或硬编码字符串
- TDD：先写测试，再写代码；**禁止执行 `pnpm test`**（太耗时，仅在用户明确要求时才运行），验证用 `pnpm build` + `pnpm lint`
- 每个 API 都必须严格测试（仅在用户要求时运行）
- 每个页面都必须严格测试（仅在用户要求时运行）
- 每次文件修改后 git commit + push
- 每次任务结束后，将价值信息持久化保存到本项目 `.claude/` 目录下的对应文件，禁止保存到用户目录 `~/.claude/projects/`
- 所有页面必须响应式（移动端窄屏 + PC）
- 三个角色：sysadmin（全量+系统管理）、admin（公司运营）、view（仅发布管理）
- 所有 API（除 `POST /api/auth/login`）要求：JWT 鉴权 + 反爬虫 + 限流
- 限流熔断策略在配置文件中配置
- 重复使用的代码必须封装为 components
- **Swagger API 文档由 swagger-autogen-ast 自动生成** — 新增/修改路由后运行 `npm run swagger:gen` 重新生成 `apis/swagger-spec.json`，禁止手动编辑该文件
- **Docker 构建时 prisma generate 只生成 client** — 使用 `prisma generate --generator=client`，跳过 openapi generator（devDependency，生产环境不需要）
- **禁止操作 `.agents/skills/web-video-presentation`** — 该目录已删除，禁止任何形式的创建、修改、恢复或测试
