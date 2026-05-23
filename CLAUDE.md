# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Font: IBM Plex Sans loaded via `@fontsource/ibm-plex-sans` (bundled locally, not Google Fonts CDN)

**Database** (`prisma/`)
- Schema: `prisma/schema.prisma` — Company, User models; Role enum (sysadmin/admin/view)
- Seed: `prisma/seed.ts` — creates default sysadmin user (username: `sysadmin`, password: `sysadmin123`)

**Separate TypeScript configs**: `tsconfig.api.json` (CommonJS, Node target) vs `tsconfig.page.json` (ESNext, React JSX). Jest uses inline tsconfig overrides.

## Key Conventions

- **TDD**: write tests first, then code; run tests after every change
- **Three roles**: sysadmin (full access + 系统管理), admin (company operations), view (发布管理 only)
- **禁止使用GEO字眼**: 项目中禁止使用GEO字眼，薄云GEO应称为薄云商机倍增服务，GEO文章应称为文章管理，GEO成绩应称为发布管理
- **All API routes** (except `POST /api/auth/login`) require JWT auth + anti-crawl + rate-limit headers
- **Backend tests**: set env vars directly (`process.env.JWT_SECRET='test-secret'`) instead of jest.mock; add `.set('User-Agent', 'test-agent/1.0')` to supertest calls
- **JWT expires in 2 hours**; token + user stored in localStorage on frontend
- **Config-driven**: port, DB URL, JWT secret/expiry, Swagger toggle, rate-limit params all via `.env` or `config/`
- **Memory**: 每次任务结束后，将价值信息（架构变更、新增功能、技术决策、踩坑经验）持久化保存到本项目 `.claude/` 目录下的对应文件（rules.md / architecture.md / frontend.md / progress.md），禁止保存到用户目录 `~/.claude/projects/`
- **Git commit 必须使用中文**: 所有 commit 消息的描述部分必须使用中文，格式：`<类型>: <中文描述>`，例如 `feat: 添加知识库模块`，禁止使用英文
- **Git**: 每次任务结束后，执行 `git add` + `git commit` + `git push`，将所有变更提交并推送到远程仓库

## 铁律（每次任务前后必须遵守）

### 开发铁律（编码时必须遵守）
1. **前端必须使用 Ant Design (antd) 组件** — 禁止使用原生 HTML 元素替代 antd 提供的组件（Button、Input、Form、Card、Menu、Layout、Table、Modal 等）
2. **前端必须遵守 DESIGN.md** — 所有页面样式必须遵循 DESIGN.md 定义的 IBM Carbon Design System 规范（颜色、字体、间距、形状、组件）
3. **时间必须格式化为中国时区** — 所有页面显示时间必须使用 `pages/utils/date.ts` 中的 `formatDate` / `formatDateTime`（强制 Asia/Shanghai UTC+8），禁止使用 `new Date().getFullYear()` 等本地时区方法
4. **严格测试** — 执行 `pnpm build` 和 `pnpm lint`，补全测试用例，进行测试，输出测试结果，并分析测试覆盖率

### 任务结束铁律（每次任务结束后必须执行）
1. **更新任务描述** — 参考 `tasks/dev001.登录功能.md` 格式，更新本次任务对应的 tasks/ 文档（功能说明、业务规则、验收标准等）
2. **更新 `tasks/fix.Bug修复汇总.md`** — 如果本次涉及 Bug 修复，追加记录
3. **更新 `tasks/db.数据模型变更汇总.md`** — 如果本次涉及数据库 schema 变更，追加记录
4. **执行 `git add` + `git commit` + `git push`** — 将所有变更提交并推送到远程仓库，commit 消息使用中文
5. **更新记忆** — 每次任务结束后，将价值信息持久化保存到本项目 `.claude/` 目录下的对应文件，禁止保存到用户目录 `~/.claude/projects/`
