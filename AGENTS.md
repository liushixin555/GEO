## 2026-06-30 EvidenceCard V1.1 portrait/image 抽取入口补充

- portrait/image sourceId 抽取复用 `POST /api/v1/evidence-cards/extract`，第一版前端直接 `save=true` 保存 draft，禁止直接生成 verified。
- portrait 抽取读取画像 `title/content`，保存 `sourceType=portrait`、`sourceId=画像ID`、`sourceQuality=portrait`。
- image 抽取读取图片 `title/description/imageUrl`，保存 `sourceType=image`、`sourceId=图片ID`、`sourceUrl=imageUrl`、`sourceQuality=image`，候选 `evidenceType` 优先为 `image_description`。
- 后端读取 portrait/image 源材料前必须按知识库 scope 校验当前用户权限；前端入口仅对 sysadmin/admin 展示。
- 画像/图片详情页和知识库画像/图片列表均可提供“抽取证据”按钮；成功后跳转 `/knowledge/evidence-cards?status=draft` 供人工审核。

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

## 2026-06-25 AI 引用诊断隐藏后台补充

- `/citation-diagnosis` 是隐藏后台路由，不放入侧边栏；入口为长按侧边栏品牌名“薄云商机倍增服务”5 秒。
- 引用诊断第一版复用 `geo-monitorv12` 的题库和多平台采集配置。题库优先读取 `geo-monitorv12/GEO/题库/供应商题库A.md`、`供应商题库B.md`。
- 多平台检测 API Key 优先使用系统 LLM 配置；缺失时允许运行时读取 `geo-monitorv12/GEO/geo_monitor_v8_package 2/config.py` 作为本机兜底，但禁止写入 Git、返回前端或打印完整 Key。
- 引用命中沿用 `article_model_citation_marks` 永久标签规则：某文章被某模型引用过一次后保留该模型标签，后续检测未命中不能删除。
- 软盟订单同步提取到最终发布 URL 时写入 `published_article_links`；软盟未返回 URL 时不阻断同步，隐藏后台展示“待补发布链接”。

## 2026-06-29 知识库画像内容校验补充

- 知识库画像 `content` 后端参数校验上限为 300000 个字符；更新 schema 时必须同步边界测试，禁止回退到 10000 字符旧限制。

## 2026-06-30 EvidenceCard 文章生成接入补充

- 文章生成时必须由后端实时检索 EvidenceCard，并以实际检索结果作为 prompt 注入、ArticleGenerationDebug 和 ArticleEvidenceCard 写入依据；前端预览不作为最终依据。
- EvidenceCard V1 不做联网搜索、不做向量库、不做 ContentMission，不判断模型实际用了哪条证据。
- ArticleEvidenceCard V1 只写 `usageType = injected`；重复生成时用 `[articleId, evidenceCardId]` upsert，禁止重复插入同一文章与同一证据关系。
- ArticleGenerationDebug 的 `retrievedEvidenceCards` 必须保存 compact snapshot，禁止保存超长全文；无证据或证据不足时写 `evidenceWarnings`，但不得阻塞文章生成。

## 2026-06-30 EvidenceCard 后端 CRUD 补充

- `/api/v1/evidence-cards` 只负责 EvidenceCard 手动管理，第一阶段不代表文章生成接入或前端页面已完成。
- EvidenceCard 路由必须使用 `authMiddleware` + `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)`，`view` 无权限。
- EvidenceCard 删除必须使用 `deletedAt` 软删除。
- EvidenceCard.keywords 入库前必须在 service 层规范为 `string[]`：只保留 string、trim、过滤空字符串、去重；禁止对象、纯字符串或混合类型原样进入数据库。
- 如果 Prisma schema 已出现 EvidenceCard 反向关系，必须同时存在 `EvidenceCard` / `ArticleEvidenceCard` 模型，否则 `pnpm build:api` 会在 Prisma generate 阶段失败。

## 2026-06-30 EvidenceCard V1 知识库证据化补充

- EvidenceCard V1 是知识库证据化第一版，目标是让知识库材料进入文章生成链路，形成可检索、可注入、可追踪的证据闭环。
- ArticleEvidenceCard V1 第一阶段只写 `usageType = injected`；`retrieved` / `rejected` 仅保留为后续扩展，不在 V1 实际写入。
- ArticleEvidenceCard 必须使用 `[articleId, evidenceCardId]` 唯一约束，禁止同一文章重复记录同一证据卡片。
- EvidenceCard.keywords 必须在 service 层规范为 `string[]`：只保留字符串、trim、过滤空字符串、去重后再入库。
- 前端“预计注入证据”只作为预览，不作为最终生成依据；最终结果以后端文章生成时实时检索和实际注入记录为准。
- 文档正文抽取、联网搜索、ContentMission、EntityGraph 后置，不进入 EvidenceCard V1 验收范围。

## 2026-06-30 EvidenceCard 前端最小页补充

- EvidenceCard 前端管理入口为 `/knowledge/evidence-cards`，详情/新增/编辑入口为 `/knowledge/evidence-cards/:id`，路由顺序必须早于 `/knowledge/:baseId`。
- 文章设置页的“预计注入证据”只能作为 EvidenceCard 列表轻量预览，不得作为最终文章生成依据。
- 文章详情页展示实际注入证据时，需要后端提供 `GET /api/v1/projects/:projectId/articles/:articleId/evidence-cards` 或在文章详情响应中返回 `evidenceCards`。
- EvidenceCard V1 前端不做 Evidence Graph，不做文档抽取按钮，不接入文章生成后端业务逻辑。

## 2026-06-30 EvidenceCard V1.0.5 证据验证补充

- EvidenceCard V1.0.5 是 V1 基线收口与 V1.1 自动抽取之间的证据治理小版本，目标是先让证据可审核、可观察、可统计、可筛选、可追溯。
- EvidenceCard.status 默认 `draft`；正式文章生成 retrieval 默认只检索 `verified`，自动抽取出的证据必须先审核后才能进入正式 prompt。
- EvidenceCard.sourceQuality 用于检索加权，official/customer/research/manual 等高质量来源优先；third_party/external 只能作为行业背景或第三方语境，不能覆盖薄云相关内部事实。
- EvidenceCard.articleTypes 必须在 service 层规范为 `string[]`，为空时默认 `["general"]`；ranking/comparison/guide/faq/case/methodology/brand/news/general 为第一批约定值。
- status 从非 `verified` 改为 `verified` 时记录 `verifiedAt` / `verifiedBy`；从 verified 改为 draft/deprecated 时保留历史审核痕迹。
- ArticleEvidenceCard 必须保存 `evidenceSnapshot`，用于追溯文章生成时实际注入 prompt 的 compact snapshot；不要只依赖后续可能被编辑的 EvidenceCard 当前值。
- ArticleGenerationDebug 必须保存 `evidencePromptPreview` 和 `evidenceStats`，用于 Prompt Inspection；V1.0.5 仍不判断模型实际 used 哪条证据。
- injectedCount / lastInjectedAt 不反写 EvidenceCard 主表，必须通过 ArticleEvidenceCard 查询时聚合。

## 2026-06-30 EvidenceCard V1.1 manual-text 抽取预览前端补充

- EvidenceCard 新增页 `/knowledge/evidence-cards/new` 可提供“从文本抽取”Tab；编辑已有证据卡片时不展示抽取入口。
- manual-text 抽取前端只调用 `POST /api/v1/evidence-cards/extract`；`save=false` 仅做候选预览，严禁入库。
- 候选保存为草稿时必须强制 `sourceType=manual`、`status=draft`；候选不能直接变成 `verified`。
- 保存草稿优先走 extract `save=true` 并携带人工编辑后的 candidates；若后端未支持，可逐条调用 EvidenceCard create 接口创建 draft。
- V1.1 前端不做后端 service，不做画像/图片详情抽取按钮，不做文档正文解析、联网搜索、ContentMission 或 EntityGraph。

## 2026-06-30 EvidenceCard V1.1 抽取预览补充

- V1.1 目标是抽取候选、人工预览、保存 draft、审核 verified，并通过 3-5 篇文章重生成验证文章生成改善。
- 统一接口为 `POST /api/v1/evidence-cards/extract`；`save=false` 只预览候选，不写库；`save=true` 只能保存为 `draft`。
- `manual-text` 优先级最高；portrait/image 次优先；文档解析、联网搜索和 external evidence 自动采集后置。
- 抽取结果不能直接 `verified`，必须经人工审核后才能进入正式文章生成 retrieval。
- 不抽取空泛营销表达；不得抽取未授权客户名、未证实数据、资质、荣誉、排名或案例。
- V1.1 不做 ContentMission、EntityGraph、向量库、Reviewer used 判断。
- 第一批人工验收按 30 条原始材料 -> 20 条 `verified` EvidenceCard -> 3-5 篇文章重生成执行。
- V1.1 交接方案以 `version-plans/V1.1-Evidence-Extraction-Preview.md` 为准，任务记录见 `tasks/progress_tasks/2026-06-30-evidence-extraction-v11.md`。
- V1.1 交接方案以 `version-plans/V1.1-Evidence-Extraction-Preview.md` 为准，任务记录见 `tasks/progress_tasks/2026-06-30-evidence-extraction-v11.md`。

## 2026-06-30 EvidenceCard V1.1 抽取候选补充

- EvidenceCard 自动抽取候选由 `apis/utils/evidence-extraction.util.ts` 提供，暴露 `extractEvidenceCandidates(input)`；该函数只输出 candidate，不直接入库。
- 抽取 prompt 必须要求模型只输出 `{ "cards": [...] }` JSON，最多 8 条，材料不足返回空数组，不得编造客户、数字、资质、荣誉、案例、合作结果或承诺。
- LLM 输出必须按不可信处理：支持 ```json 包裹剥离，非 JSON 返回 warning，字段缺失或非法候选直接丢弃，`keywords` / `articleTypes` 规范为 `string[]`，分数限制在 0-1。
- 自动抽取不得允许模型生成 `verified`；候选状态必须强制为 `draft`，审核入库由后续人工或接口流程处理。
- 候选过滤必须丢弃空标题/空正文、过短且无具体事实、重复 title/content、明显空泛营销表达；禁止抽取“专业可靠、经验丰富、助力企业发展、提升竞争力、行业领先、优质服务”等空话。

## 2026-06-30 EvidenceCard V1.1.1 后端 LLM 抽取补充

- `POST /api/v1/evidence-cards/extract` 自动抽取路径优先复用系统 LLM 配置调用 `extractEvidenceCandidates()`；LLM 未配置、调用失败、输出异常或无有效候选时回退 deterministic 抽取。
- `save=false` 只返回候选和 warnings，不写库；`save=true` 保存前仍必须经过 service 层清洗、去重和 `status=draft` 强制覆盖。
- 抽取候选应返回 `extractionReason` 和候选级 `warnings`，供前端人工审核时展示；这些字段不代表证据已 verified。
## 2026-07-01 EvidenceCard V1.1 抽取正文长度补充

- EvidenceCard 自动抽取的 `content` 默认应为 2-5 句话、约 80-250 个中文字符，用于保留事实、方法、流程、场景、能力或案例的必要上下文，避免把证据压缩成一句口号。
- LLM 抽取和 deterministic fallback 都不得为了凑长度编造材料中没有的信息；短证据候选可以保留，但应提示人工复核后再审核为 `verified`。
## 2026-07-01 EvidenceCard 自测闭环补充

- EvidenceCard 文章生成验收必须同时检查 `evidencePromptPreview`、`evidenceStats`、ArticleEvidenceCard `evidenceSnapshot` 和正文实际质量，不能只看文章是否有正文。
- Windows PowerShell 管道脚本中不要直接写中文标题、关键词或正则；应从 UTF-8 文件/数据库读取，或使用 Unicode escape，避免中文被转码成问号污染测试数据。
- 观察到文章生成调度器存在待排查异常：个别文章已写入正文、debug、ArticleEvidenceCard 后仍被 `Connection error` 标成 `generate_failed`。后续修改 `article-generation.scheduler.ts` 或 LLM fallback 时必须覆盖该场景。
## 2026-07-01 文章生成状态稳定性补充

- 文章生成调度器捕获单篇异常后，写入 `generate_failed` 前必须回读文章当前状态、版本、最新 ArticleVersion 和带版本的 ArticleGenerationDebug；若生成结果已提交，不得覆盖为失败。
- ArticleGenerationDebug.warnings 可记录基础风险词提示，当前包括 `唯一`、`保证`、`确保`、`承诺`、`绝对`、`最佳`、`第一`、`No.1`、`100%`/`百分之百`、`行业领先`；该 warning 只供人工审核，不阻塞生成。
## 2026-07-01 引用诊断中文编码补充

- 引用诊断模块的后端错误信息、定时任务日志、检测问题、prompt、平台名称、题库路径、前端页面文案和 CSV 导出字段必须保持 UTF-8 中文原文，禁止提交 `寮曠敤`、`璇婃柇`、`鏂囩珷`、`鍙戝竷`、`鎼滅储`、`澶辫触`、`锟`、`�` 等乱码片段。
- 题库路径必须为 `geo-monitorv12/GEO/题库/供应商题库A.md`、`geo-monitorv12/GEO/题库/供应商题库B.md`；路径乱码会导致题库无法读取并退回默认问题。
- 修改引用诊断相关中文文案后必须运行 `tests/apis/citation-diagnosis-encoding.test.js` 或等价扫描，确认关键源码不含常见 mojibake 片段。
- Windows PowerShell 默认输出可能把正确 UTF-8 中文显示成乱码，排查源码编码时优先使用 `rg` 或显式 UTF-8 输出，不要仅凭终端显示判断源码已损坏。

## 2026-07-01 检测台账前端可视化补充

- `/citation-diagnosis` 台账页面向非技术人员时，列表必须直观展示发布链接、引用模型和命中次数；详情必须展示检测问题、AI 回答、引用来源和命中片段。
- 详情抽屉调用 `GET /api/v1/citation-diagnosis/ledger/:articleId/details`；接口不可用或暂无数据时展示“暂无检测详情”，不得阻塞台账列表、搜索、导出和手动复检。
- 台账页继续使用 Ant Design 组件和 `pages/utils/date.ts` 时间格式化；通过分页控制数据量，禁止使用页面级或 Table 纵向滚动条承载超长内容。

## 2026-07-01 引用诊断来源解析补充

- run-auto 检测问题必须模拟真实用户咨询，不得使用“是否被引用”这类检测口吻。
- 自动检测 prompt 不得直接提供我方已发布 URL，不得强迫或诱导模型引用我方链接。
- 引用命中只能按 URL 标准化匹配；没有 URL 的标题、来源名、摘要或模型口头提及不得算作命中。
- 来源解析需兼容嵌套的 sources/citations/references/search_results/Responses annotations 等结构，并保留 raw/snippet/index 供存库追溯。
- 缺少 API Key 或模型配置返回 `skipped`，单模型 API 报错返回 `error`，均不得中断同批次其他模型检测。

## 2026-07-01 发布后自动检测闭环补充

- 发布链接写入 `published_article_links` 后，由 `apis/scheduler/citation-detection.scheduler.ts` 异步扫描并自动检测，不得阻塞发布流程。
- 自动检测默认每 30 分钟触发一次，每轮最多处理 5 条发布链接；每条最多 2 个问题，模型范围为系统 LLM 中全部启用、未删除且配置完整的模型。
- `ai_citation_detection_runs.target_article_link_id` 用于 articleLink 级 24 小时防重复；不能只按 articleId 去重。
- 单条发布链接检测失败不得影响其他链接；平台 `skipped` 表示缺模型配置或 API Key，不算系统失败。
- 自动检测日志不得打印 API Key 或完整敏感配置。

## 2026-07-03 发布后引用检测闭环补充

- 后续所有已发布文章的引用检测入口必须是 `published_article_links`；没有发布链接不得触发检测，只能显示“待补发布链接”。
- `published_article_links` 对活跃记录使用 `article_id + normalized_url` 去重；人工补录和软盟同步都必须 upsert，禁止重复插入同一文章同一链接。
- 发布计划平台名必须能映射到 `publishing_platforms.name`，否则不得创建发布计划并进入后续下单流程。
- 软盟下单成功但未返回订单 ID 时不得将发布计划标为 `published`；手动改为 `published` 前必须已有软盟订单或发布链接。
- 检测 run 必须写 `target_article_id` 和 `target_article_link_id`，台账详情和 24 小时防重复均依赖这两个字段。
- 检测模型默认读取全部启用系统 LLM，入库模型名使用 `${provider}:${modelName}`；OpenAI 兼容 baseUrl 必须先规范为 `/chat/completions`，避免根地址 404。

## 2026-07-01 V1.2 引用检测台账与 Prompt Builder 补充

- 引用检测 V1.2 台账以 `published_article_links`、`ai_citation_detection_runs`、`ai_citation_records`、`article_model_citation_marks` 为主闭环；台账详情必须使用后端保存的检测问题、AI 回答、source 快照、引用片段和命中片段，不得在前端重新推断命中。
- `AiCitationDetectionRun.targetArticleId` 用于文章级详情聚合，`targetArticleLinkId` 用于发布链接级自动检测防重复；两个字段职责不同，后续修改时不能混用。
- 文章生成 prompt 组装归口 `apis/utils/article-prompt-builder.util.ts`；`llm.service.impl.ts` 继续负责模型调用、EvidenceCard retrieval、debug 写入、重写和修复，禁止把 EvidenceCard 检索迁入 prompt builder。
- Prompt builder 必须保留最终 `systemPrompt` / `userPrompt` / `requiredReferenceFiles` / `promptWarnings` / `evidencePromptSection` / `evidenceStats` 的可追溯输出；按 skill 拆分规则时先保持行为一致，再补齐 comparison/guide/faq/brand/case 等专属规则。

## 2026-07-01 一键启动脚本数据库就绪补充

- `启动项目.bat` 必须等待 PostgreSQL ready 后再启动后端源码 dev server，避免数据库启动/恢复中的异常被登录接口统一显示为“用户名或密码错误”。
- 后端启动后应等待 `/api/health` 返回 200 再打开前端，减少用户过早登录导致的假性失败。
- VS Code / package `dev:api` 启动路径也必须先执行数据库就绪检查；数据库不可达时应在后端启动前失败并提示 PostgreSQL 未就绪，不能让前端登录页继续误报账号密码错误。

## 2026-07-01 文章详情历史数据兼容补充

- 文章详情页读取 `Article.portrait` 时必须兼容 JSON 数组、JSON 字符串和普通字符串；历史生成文章可能保存 plain-text portrait，前端不得因 `JSON.parse` 失败导致整页“加载文章失败”。
- 历史自测数据中的中文乱码或 `????` 应作为数据清洗问题单独处理，不能阻塞文章正文查看。
## 2026-07-02 引用诊断固定检测问题补充

- `/citation-diagnosis` 自动检测问题固定为 `apis/utils/citation-question-bank.util.ts` 内置的 30 条真实用户咨询题库，按 `question_count` 顺序截取；文章标题和关键词不得再生成动态问题抢占名额。
- 固定题库不再读取 `geo-monitorv12/GEO/题库/供应商题库A.md` 或 `供应商题库B.md`，避免外部题库覆盖诊断管理指定问题。
- 题库中的“GEO服务商推荐”是用户检索意图样本，按原文保留，仅用于引用诊断检测问题，不代表项目产品命名规则放宽。
