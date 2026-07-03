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

## 2026-06-30 EvidenceCard V1.1.1 LLM 抽取接入

- `EvidenceCardServiceImpl.extractEvidenceCards()` 的自动抽取分支已接入 `extractCandidatesWithLlmFallback()`；收到前端提交的 `save=true + candidates` 时仍直接清洗提交候选，不再重复调用 LLM。
- `extractCandidatesWithLlmFallback()` 调用 `apis/utils/evidence-extraction.util.ts` 的 `extractEvidenceCandidates()`，该工具复用 `llmModel` 表启用模型、`decryptApiKey()` 和 `AgentLoopUtil.run()`。
- LLM 结果先经过工具 parser，再经过 EvidenceCard service 的 `cleanCandidates()` 二次过滤；最终保存仍走 `toCreateData()`，确保 keywords/articleTypes 规范化和 status draft 约束不被绕过。
- deterministic fallback 仍保留在 service 内的 `extractCandidatesFromText()`，用于模型不可用、调用失败或无有效候选的场景。

## 2026-06-30 EvidenceCard V1.1.1 抽取质量架构

- V1.1.1 不改变正式文章生成链路；抽取链路只产生 candidate / draft，正式 retrieval 仍沿用 V1.0.5 默认只检索 `verified` 的规则。
- LLM 抽取层只能作为候选生成器，输出必须经过解析、防御、规范化、过滤和状态降级；任何 LLM 返回的 `verified` 都不能进入数据库成为审核结果。
- deterministic fallback 是抽取服务的必备兜底，LLM 不可用或输出不可解析时仍要返回可预览候选或明确 warning，不能让预览链路整体失败。
- `save=false` 必须是无副作用路径，不写 EvidenceCard、ArticleEvidenceCard、ArticleGenerationDebug；`save=true` 才进入保存路径，且只能落 `draft`。
- portrait/image sourceId 抽取只能读取已有文本字段，portrait 使用 `title/content`，image 使用 `title/description/imageUrl`；image 的 `imageUrl` 必须进入 `sourceUrl` 用于审核追溯。
- 第一批真实材料验收仍是质量闭环的一部分：30 条原始材料形成 20 条 verified 后，再重生成 3-5 篇文章检查 evidenceSnapshot、debug 和正文事实支撑。
## 2026-07-01 EvidenceCard 自测闭环观察

- EvidenceCard 自审核生成文章时，`ArticleGenerationDebug.evidencePromptPreview`、`evidenceStats`、`ArticleEvidenceCard.evidenceSnapshot` 已能支撑端到端验收。
- Windows PowerShell 管道脚本中直接书写中文字符串可能被转码成问号；涉及文章标题、关键词、证据筛选脚本时，应优先从 UTF-8 文件或数据库读取中文，或使用 Unicode escape。
- 观察到 `article-generation.scheduler.ts` 存在待排查异常：部分文章已写入正文、debug 和 ArticleEvidenceCard 后，调度器仍可能打印 `Connection error` 并把状态标为 `generate_failed`。后续修复时应检查多模型 fallback、异常传播和成功事务后的错误处理边界。

## 2026-07-01 文章生成状态稳定性

- `article-generation.scheduler.ts` 的单篇文章外层 catch 在写入 `generate_failed` 前会回读文章状态、版本、最新 ArticleVersion 和带版本的 ArticleGenerationDebug。
- 如果检测到生成事务已提交，调度器跳过失败状态覆盖，避免连接异常或提交确认异常把已完成文章从 `pending_review` 误改为 `generate_failed`。
- `llm.service.impl.ts` 在生成 debug warnings 中追加基础风险词扫描，结果以 `RISK_TERMS_FOUND` 写入，仅用于人工审核提示，不参与 EvidenceCard 检索和质量失败判定。
## 2026-07-01 引用诊断编码与题库读取

- 引用诊断后端的题库读取、默认问题、自动复检 prompt、平台名称和错误信息均要求保存为 UTF-8 中文；乱码会直接影响 LLM 检测输入和用户可见错误。
- `citation-question-bank.util.ts` 固定读取 `geo-monitorv12/GEO/题库/供应商题库A.md`、`供应商题库B.md`，读取失败时才回退默认检测问题。
- `citation-collector.util.ts` 的平台枚举使用 `DeepSeek`、`豆包`、`元宝`、`千问`、`Kimi`，系统 LLM 配置别名和本机兜底配置都围绕这些平台名解析。

## 2026-07-01 引用诊断来源解析

- `citation-collector.util.ts` 的 `extractSources` 先解析结构化来源对象，再用深度 URL 扫描兜底；支持常见字段 `url/link/href/source_url/citation_url/reference_url/page_url`。
- 结构化来源会向下游传递 `raw_source`、`citation_snippet`、`answer_snippet`、`source_index`；`citation-diagnosis.service.impl.ts` 写入 `ai_citation_records` 对应字段，供详情和后续会话存库追溯。
- run-auto 保存 skipped/error run，但不会为无 URL 的标题或片段创建命中记录；命中仍只由 `normalizeCitationUrl()` 后的 URL 与 `published_article_links.normalized_url` 匹配。
## 2026-07-01 发布后自动引用检测闭环

- `apis/scheduler/citation-detection.scheduler.ts` 负责发布后自动引用检测，默认 `*/30 * * * *` 触发，可用 `CRON_CITATION_DETECTION_INTERVAL` 覆盖、`CRON_CITATION_DETECTION_ENABLED=false` 禁用。
- 调度器扫描 `published_article_links`，每轮最多 5 条；每条通过 `CitationDiagnosisService.runAutomaticDetection()` 限制为 2 个问题、2 个模型，检测结果继续写入 `ai_citation_detection_runs`、`ai_citation_records` 和 `article_model_citation_marks`。
- `AiCitationDetectionRun.targetArticleLinkId` / `target_article_link_id` 是自动检测的链接级去重标记；调度器排除 24 小时内已有 run 的同一 articleLink，避免只按 articleId 导致多发布链接误判。
- 发布订单同步仍只负责提取并写入 published link；引用检测异步执行，单条 link 失败不影响同批次其他 link，平台 `skipped` 不算系统失败。

## 2026-07-03 发布后引用检测闭环收口

- 后续所有引用检测以 `published_article_links` 为入口；发布计划没有链接时台账只能显示待补发布链接，调度器不会检测。
- `published_article_links` 使用活跃唯一索引 `(article_id, normalized_url) WHERE deleted_at IS NULL`，人工补录和软盟订单同步都应使用 upsert。
- 发布执行链路必须产出可追踪锚点：软盟下单成功但未返回订单 ID 时应失败；手动把计划标记为 `published` 前必须已有软盟订单或发布链接。
- 发布计划中保存的平台名必须能映射到 `publishing_platforms.name`；平台未同步时应先同步/补齐平台资源，不能静默进入发布成功。

## 2026-07-03 引用检测模型调用

- `apis/utils/citation-collector.util.ts` 现在通过 `loadEnabledCitationModels()` 读取 `llm_models` 中全部启用、未删除且配置完整的模型，默认检测不再依赖固定平台枚举。
- 引用检测 run / record 的模型名使用 `${provider}:${modelName}`，允许 Deepseek / Deepseek2 等同厂商多模型同时参与并独立追踪。
- `normalizeChatCompletionsUrl()` 负责把 OpenAI 兼容 baseUrl 规范为完整 `/chat/completions`，避免 DeepSeek 根地址或供应商 `/v1` 地址直接请求失败。
- `citation-detection.scheduler.ts` 每条发布链接仍限制 2 个固定题库问题，但模型范围为全部启用模型；Kimi/Moonshot 只有系统模型配置补齐并启用后才会自动加入。

## 2026-07-01 V1.2 引用检测与 Prompt Builder 架构

- 引用检测 V1.2 的主闭环是 `published_article_links` -> `AiCitationDetectionRun` -> `AiCitationRecord` -> `ArticleModelCitationMark` -> `/citation-diagnosis` 台账展示。
- `AiCitationDetectionRun.targetArticleId` 支持按文章聚合台账详情，`targetArticleLinkId` 支持发布链接级自动检测去重；二者职责不同，不能互相替代。
- `AiCitationRecord` 的 `rawSource`、`citationSnippet`、`answerSnippet`、`sourceIndex` 是 source 级追溯字段，前端详情和后续排查应优先使用这些快照，而不是重新解析旧回答。
- `apis/utils/article-prompt-builder.util.ts` 从 `llm.service.impl.ts` 拆出 prompt 组装层；EvidenceCard retrieval 仍在 LLM 服务生成流程中先执行，builder 接收已检索结果并生成 evidence prompt 区块。
- Prompt builder 的 skill 规则函数是后续扩展点：ranking 已有实质规则，comparison / guide / faq / brand / case 当前保留函数边界，后续按已选 skill 或文章类型补齐。
## 2026-07-02 引用诊断问题题库

- `apis/utils/citation-question-bank.util.ts` 现在是固定题库模块，直接返回 30 条真实用户咨询问题；`buildArticleCitationQuestions()` 不再消费文章标题和关键词生成动态问题。
- `/api/v1/citation-diagnosis/run-auto` 和发布后自动检测仍通过 `question_count` 控制每次实际检测问题数量，默认定时任务继续每条链接取 2 个问题。
- 固定题库包含“GEO服务商推荐”作为用户检索意图样本，该文本只进入检测 prompt，不作为产品命名或页面文案规则。
