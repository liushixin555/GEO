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
- **Git**: 每次任务结束后，执行 `git add` + `git commit` + `git push`，将所有变更提交并推送到远程仓库
