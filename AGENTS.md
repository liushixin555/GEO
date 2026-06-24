# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Frontend Design Principles (MANDATORY)

1. **All page styling must follow DESIGN.md** — IBM Carbon Design System specification is the authoritative reference for colors, typography, spacing, shapes, and components.
2. **Must use Ant Design (antd) components** for building frontend UI — do not use raw HTML elements where antd provides an equivalent component (Button, Input, Form, Card, Menu, Layout, Table, Modal, etc.).

## Commands

```bash
# Development (run both backend + frontend)
npm run dev

# Backend only
npm run dev:api

# Frontend only
npm run dev:page

# Build
npm run build            # both
npm run build:api        # backend only (tsc)
npm run build:page       # frontend only (vite)

# Tests
npm test                 # all tests
npm run test:api         # backend tests only
npm run test:page        # frontend tests only
npx jest --config jest.config.ts --no-cache --testPathPattern="tests/apis/auth"  # single test file

# Swagger API doc generation
npm run swagger:gen      # regenerate apis/swagger-spec.json via AST analysis

# Database
npm run db:migrate       # run Prisma migration
npm run db:migrate:create  # create migration without applying
npm run db:push          # push schema to DB without migration
npm run db:seed          # seed database (resets sysadmin password)
npm run db:studio        # Prisma Studio GUI

# Lint
npm run lint
```

## Architecture

Monorepo with two TypeScript projects sharing the root `package.json`:

**Backend** (`apis/`) — Express + Prisma + PostgreSQL
- `server.ts` → `app.ts`: Express setup with middleware chain: helmet → cors → anti-crawl → rate-limit → auth → routes
- Layered pattern: `controller/` → `service/` (interface) → `service/impl/` (Prisma implementation)
- `middleware/`: JWT auth + role-based auth, anti-crawl (User-Agent check), rate limiting
- `config/`: Reads from `.env` and `config/default.json` / `config/production.json`
- Uses `tsconfig.api.json`, compiles to `dist/apis/`

**Frontend** (`pages/`) — React 18 + Ant Design + Vite
- `main.tsx` → `App.tsx`: React Router v6, auth guard in `components/Layout.tsx`
- Role-based sidebar in `components/Sidebar.tsx`
- Single CSS file `styles/global.css` implementing DESIGN.md via CSS variables
- Uses `tsconfig.page.json`, built by Vite
- Font: IBM Plex Sans loaded via `@fontsource/ibm-plex-sans` (bundled locally, not Google Fonts CDN); code blocks use IBM Plex Mono via `@fontsource/ibm-plex-mono`

**Database** (`prisma/`)
- Schema: `prisma/schema.prisma` — Company, User models; Role enum (sysadmin/admin/view)
- Seed: `prisma/seed.ts` — creates default sysadmin user (username: `sysadmin`, password: `sysadmin123`)

**Separate TypeScript configs**: `tsconfig.api.json` (CommonJS, Node target) vs `tsconfig.page.json` (ESNext, React JSX). Jest uses inline tsconfig overrides.

## Key Conventions

- **TDD**: write tests first, then code; 仅执行 `pnpm build` 和 `pnpm lint` 验证，禁止执行 `pnpm test`（太耗时）
- **Three roles**: sysadmin (full access + 系统管理), admin (company operations), view (仅在被授权后查看每日检测报告，无其他任何权限)
- **禁止使用GEO字眼**: 项目中禁止使用GEO字眼，薄云GEO应称为薄云商机倍增服务，GEO文章应称为文章管理，GEO成绩应称为发布管理
- **All API routes** (except `POST /api/auth/login`) require JWT auth + anti-crawl + rate-limit headers
- **Backend tests**: set env vars directly (`process.env.JWT_SECRET='test-secret'`) instead of jest.mock; add `.set('User-Agent', 'test-agent/1.0')` to supertest calls
- **JWT expires in 2 hours**; token + user stored in localStorage on frontend
- **Token blacklist**: logout 时 token 加入内存黑名单（`apis/utils/token-blacklist.util.ts`），auth middleware 拦截已撤销 token；单实例部署有效，多实例需改 Redis
- **Structured logging**: 认证模块使用 `apis/utils/logger.util.ts` 输出 JSON 格式日志（auth.login/logout/verify/selection 事件）
- **Config-driven**: port, DB URL, JWT secret/expiry, Swagger toggle, rate-limit params all via `.env` or `config/`
- **Memory**: 每次任务结束后，将价值信息（架构变更、新增功能、技术决策、踩坑经验）持久化保存到本项目 `.Codex/` 目录下的对应文件（rules.md / architecture.md / frontend.md），禁止保存到用户目录 `~/.Codex/projects/`
- **progress.md 防膨胀**: 每次变更记录保存到 `.Codex/progress_tasks/` 目录下的独立文件（如 `2026-05-24-bugfix-429.md`），`progress.md` 只做索引（模块状态表 + 变更索引表），禁止在 `progress.md` 中直接追加详细变更内容
- **Git commit 必须使用中文**: 所有 commit 消息的描述部分必须使用中文，格式：`<类型>: <中文描述>`，例如 `feat: 添加知识库模块`，禁止使用英文
- **Git**: 每次任务结束后，执行 `git add` + `git commit` + `git push`，将所有变更提交并推送到远程仓库

## 铁律（每次任务前后必须遵守）

### 开发铁律（编码时必须遵守）
1. **前端必须使用 Ant Design (antd) 组件** — 禁止使用原生 HTML 元素替代 antd 提供的组件（Button、Input、Form、Card、Menu、Layout、Table、Modal 等）
2. **前端必须遵守 DESIGN.md** — 所有页面样式必须遵循 DESIGN.md 定义的 IBM Carbon Design System 规范（颜色、字体、间距、形状、组件）
3. **时间必须格式化为中国时区** — 所有页面显示时间必须使用 `pages/utils/date.ts` 中的 `formatDate` / `formatDateTime`（强制 Asia/Shanghai UTC+8），禁止使用 `new Date().getFullYear()` 等本地时区方法
4. **严格测试** — 执行 `pnpm build` 和 `pnpm lint`，确保编译和 lint 通过。**禁止执行 `pnpm test`**（太耗时，仅在用户明确要求时才运行）
5. **view 角色权限铁律** — view 角色只有被授权后查看每日检测报告的权限（每日检测功能待开发），除此之外没有任何权限。路由守卫、侧边栏菜单、API 权限校验中必须严格拦截 view 角色
6. **禁止修改或测试 `.agents/` 目录** — `.agents/skills/` 下的所有文档（README、SKILL、manifest、模板、主题等）禁止任何形式的修改、删除或测试，该目录为只读参考资源
7. **页面布局高度自适应铁律** — 所有页面容器（`.main-content` → `#main-content` → `.page-container`）必须形成完整的 flex 高度链，每一层都必须设置 `flex: 1; min-height: 0; height: 100%`，严禁只改 `overflow: hidden` 而不设高度导致容器塌缩。修改布局样式前必须先在浏览器实测确认效果，禁止凭推测提交
8. **页面内严禁出现 y 轴滚动条** — 页面内容必须在视口内完全展示，严禁出现页面级或组件级 y 轴滚动条。如内容超出，应通过分页、折叠等手段控制数据量，不得用 `overflow-y: auto/scroll` 或 antd Table 的 `scroll={{ y }}` 产生滚动条
9. **技能上传同名规则铁律** — 技能上传时，如果存在未删除的同名技能则报错"已存在同名技能"，上传失败；如果数据库有已删除的同名技能，则上传成功，用新上传的技能数据刷新数据库记录（description、skillDir、createdBy）并将 deletedAt 设为 null
10. **文章发布解耦铁律** — 文章（Article）和发布（PublishingSchedule）完全解耦。文章只管内容生命周期：`draft → manual_writing/generating → pending_review → approved`，`approved` 是最终态（可发布）。发布状态（`publishing/published/publish_failed`）由 PublishingSchedule 独立管理，严禁在 article.schema/article.entity 的 API 层出现发布状态。`scheduled_publish_at`/`schedule_type`/`platforms` 属于 PublishingSchedule，不属于 Article

### 任务结束铁律（每次任务结束后必须执行）
1. **更新任务描述** — 参考 `tasks/dev001.登录功能.md` 格式，更新本次任务对应的 tasks/ 文档（功能说明、业务规则、验收标准等）
2. **更新 `tasks/fix.Bug修复汇总.md`** — 如果本次涉及 Bug 修复，仅追加索引条目（编号、标题、关联文件），详细修复内容记录到 `tasks/progress_tasks/` 下的独立文件，禁止在汇总文件中直接写详细内容
3. **更新 `tasks/db.数据模型变更汇总.md`** — 如果本次涉及数据库 schema 变更，追加记录
4. **执行 `git add` + `git commit` + `git push`** — 将所有变更提交并推送到远程仓库，commit 消息使用中文
5. **更新记忆** — 每次任务结束后，将价值信息持久化保存到本项目 `.Codex/` 目录下的对应文件以及本项目的AGENTS.md文件，禁止保存到用户目录 `~/.Codex/projects/`

## 2026-06-24 文章生成 Skill 链路补充

- 文章 `skills` 字段以前端技能 ID 数组为准，后端必须解析 ID 并通过 `skills.skillDir` 加载 `skills/<skillDir>/SKILL.md`。
- 当前项目默认以“薄云咨询”为生文品牌主线，关键词只决定主题，skill 决定结构，薄云咨询决定核心推荐对象。
- 技能上传包可能出现同名目录嵌套，例如 `skills/geo-content-generator-v8/geo-content-generator-v8/SKILL.md`；文章生成链路解析 `skillDir` 时必须兜底识别内层 `SKILL.md`，否则即使文章关联了技能 ID，Agent 也可能读不到实际技能规则。
- 文章生成结果入库前必须过滤 Agent 的过程性说明，禁止保存类似 `Now I have... Let me write...`、`下面是文章正文` 这类非正文内容。
- 文章生成中的图片只能来自文章设置中已选的知识库图片；未选择图片时不得默认使用项目全部图片，保存前需要过滤未授权 Markdown 图片链接。
- 文章生成的 Markdown 表格修复应采用保存前后处理，不要通过新增强硬表格提示词解决，避免模型转向输出合规检查报告。
