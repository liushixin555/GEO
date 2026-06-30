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

## 2026-06-30 EvidenceCard V1.0.5

- EvidenceCard V1.0.5 在 V1 与 V1.1 自动抽取之间补齐证据治理层：`status`、`sourceQuality`、`articleTypes`、`verifiedAt`、`verifiedBy`。
- 文章生成 retrieval 默认只查 `verified` EvidenceCard；`includeDraft` 仅作为后台预览扩展参数，正式生成不启用。
- `retrieveEvidenceForArticle()` 的 compact snapshot 增加 `status`、`sourceQuality`、`articleTypes`、`capturedAt`，并在 scoring 中加入 sourceQuality 与 articleTypes 权重。
- `ArticleEvidenceCard.evidenceSnapshot` 保存生成当次注入的 compact snapshot；文章详情优先展示 snapshot，用于追溯“当时注入的是哪一版证据”。
- `ArticleGenerationDebug.evidencePromptPreview` 保存当次 Evidence Prompt 区块，`evidenceStats` 保存 retrievedCount、injectedCount、evidencePromptLength、evidenceWarnings。
- EvidenceCard 注入统计不落主表字段，列表/详情通过 `ArticleEvidenceCard.groupBy` 聚合 injectedCount 和 lastInjectedAt。

## 2026-06-30 EvidenceCard V1.1 抽取预览

- V1.1 规划统一通过 `POST /api/v1/evidence-cards/extract` 做候选抽取，避免为 manual-text、portrait、image 分散设计多个入口。
- `save=false` 是纯预览路径，不写库；`save=true` 是保存路径，但只能落 `draft` EvidenceCard。
- 抽取链路与正式文章生成链路解耦：抽取候选不写 ArticleEvidenceCard，不修改 ArticleGenerationDebug，也不代表证据已可进入 prompt。
- source priority 固定为 manual-text 最高，portrait/image 次之；后续文档解析、联网搜索和 external evidence 另起版本。
- 正式 retrieval 继续沿用 V1.0.5 规则，只默认检索 `verified` EvidenceCard。
- 第一批验收要闭环到文章生成质量：30 条原始材料形成 20 条 verified 后，重生成 3-5 篇文章并检查 evidenceSnapshot 与 debug。
- V1.1 交接方案以 `version-plans/V1.1-Evidence-Extraction-Preview.md` 为准，任务记录见 `tasks/progress_tasks/2026-06-30-evidence-extraction-v11.md`。

## 2026-06-30 EvidenceCard V1.1 抽取候选

- `apis/utils/evidence-extraction.util.ts` 提供 EvidenceCard 自动抽取候选工具，导出 `buildEvidenceExtractionPrompt()`、`parseEvidenceExtractionOutput()`、`extractEvidenceCandidates()`。
- V1.1 抽取只输出 candidate，不直接写入 EvidenceCard 数据库；后续接口层需要显式审核/保存。
- 抽取函数复用当前启用的 LLM 模型配置，prompt 强制模型只输出 `{ "cards": [...] }` JSON，最多 8 条；解析层仍按不可信输出处理。
- 候选默认并强制为 `status = draft`，即使模型返回 `verified` 也会降为 draft 并记录 warning。
- 解析层支持 ```json 代码块剥离，非 JSON、顶层结构非法、字段缺失或枚举非法时返回 warnings 并丢弃对应候选。
- 过滤层会丢弃空标题/空正文、过短且无具体事实、重复 title/content、明显空泛营销表达的候选。
## 2026-06-30 EvidenceCard portrait/image 抽取权限

- EvidenceCard V1.1 portrait/image 抽取复用 `POST /api/v1/evidence-cards/extract`，controller 必须把当前 `userId/role` 传入 service。
- portrait/image sourceId 读取源材料时，service 必须按 KnowledgeBase scope 校验访问权限：sysadmin 全量；company scope 需同公司；project scope 需项目 operator；view 不允许。
- image 抽取必须把 `KnowledgeImage.imageUrl` 写入 EvidenceCard `sourceUrl`，避免后续证据审核丢失图片来源追溯。
