# 开发规范

## 两条铁律（不可违反）
1. **所有页面样式必须遵循 DESIGN.md** — 以 IBM Carbon Design System 为权威参考（颜色、字体、间距、圆角、组件规范）
2. **必须使用 Ant Design (antd) 组件** — Button、Input、Form、Card、Menu、Layout、Table、Modal、Select、Switch、Tag、Popconfirm、Typography、Space 等，凡 antd 有的组件必须使用，禁止用原生 HTML 元素替代
3. **禁止在 TSX 文件中写 inline style (`style={{}}`)** — 所有 CSS 样式必须写入 `pages/styles/global.css`，用 className 引用

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
- TDD：先写测试，再写代码；每次修改后跑单测
- 每个 API 都必须严格测试
- 每个页面都必须严格测试
- 每次文件修改后 git commit + push
- 每次任务结束后，将价值信息持久化保存到本项目 `.claude/` 目录下的对应文件，禁止保存到用户目录 `~/.claude/projects/`
- 所有页面必须响应式（移动端窄屏 + PC）
- 三个角色：sysadmin（全量+系统管理）、admin（公司运营）、view（仅发布管理）
- 所有 API（除 `POST /api/auth/login`）要求：JWT 鉴权 + 反爬虫 + 限流
- 限流熔断策略在配置文件中配置
- 重复使用的代码必须封装为 components
