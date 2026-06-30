# 架构记忆

## 2026-06-30 EvidenceCard 文章生成接入

- 文章生成后端链路已接入 EvidenceCard retrieval：`llm.service.impl.ts` 在构造 prompt 前调用 `retrieveEvidenceForArticle()`，不依赖前端预览结果。
- `retrieveEvidenceForArticle()` 位于 `apis/utils/evidence-retrieval.util.ts`，输入 `projectId`、`companyId`、`title`、`keywords`、`limit`，输出 compact evidence card snapshot、query snapshot 和 warnings。
- prompt 注入使用 userPrompt 的“可使用证据”区块；systemPrompt 约束不得编造证据中没有的薄云客户、数据、资质、荣誉或案例，正文不得暴露 EvidenceCard / 证据编号 / 系统检索等内部词。
- `ArticleGenerationDebug` 持久化 `retrievedEvidenceCards`、`evidenceRetrievalQuery`、`evidenceWarnings`；debug 只保存 compact snapshot，不保存超长全文。
- 生成成功后，`article-generation.scheduler.ts` 在成功事务中 upsert `ArticleEvidenceCard`，V1 仅写 `usageType = injected`，通过 `[articleId, evidenceCardId]` 唯一约束避免重复。

## 2026-06-30 EvidenceCard 后端 CRUD

- `/api/v1/evidence-cards` 是 EvidenceCard V1 的手动管理接口，当前只覆盖后端 CRUD，不接入文章生成链路和前端页面。
- EvidenceCard 路由必须只允许 `sysadmin` / `admin`，`view` 没有访问权限。
- EvidenceCard 删除使用 `deletedAt` 软删除；列表和详情必须过滤 `deletedAt: null`。
- `EvidenceCard.keywords` 即使数据库使用 Json，也必须在 service 层用 `normalizeEvidenceCardKeywords()` 规范为 `string[]` 后写入，禁止对象、纯字符串或混合数组原样入库。
- 本地 Prisma schema 若只有 EvidenceCard 枚举和反向关系而没有模型本体，`pnpm build:api` 会在 Prisma generate 阶段失败；需要同时存在 `EvidenceCard` 与 `ArticleEvidenceCard` 模型。

## 2026-06-30 EvidenceCard V1

- EvidenceCard V1 是知识库证据化第一版，用于把知识库材料结构化为文章生成链路可检索、可注入、可追踪的证据卡片。
- 后端生成文章时必须根据 title、keywords、companyId、projectId 实时检索 EvidenceCard；前端预览结果不能作为最终生成依据。
- ArticleEvidenceCard 是文章和证据卡片的实际注入关系表，V1 第一阶段只写 `usageType = injected`。
- ArticleEvidenceCard 必须设置 `[articleId, evidenceCardId]` 唯一约束，避免重复注入记录。
- EvidenceCard.keywords 入库前必须在 service 层规范为 `string[]`，禁止字符串、对象或混合数组直接入库。
- ArticleGenerationDebug 需要记录检索条件、实际注入证据快照和证据不足等 warning，方便排查生成链路。
- 文档正文抽取、联网搜索、ContentMission、EntityGraph 均后置，不混入 V1 架构闭环。
