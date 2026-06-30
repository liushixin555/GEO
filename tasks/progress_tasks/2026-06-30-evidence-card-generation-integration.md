# 2026-06-30 EvidenceCard V1 文章生成接入

## 任务范围

- 负责 EvidenceCard V1 的文章生成接入：生成前检索证据、注入 prompt、写 debug、写 ArticleEvidenceCard injected 关系。
- 不修改 `.agents/`，不做联网搜索，不做向量库，不做 ContentMission，不判断模型实际用了哪条证据。

## 实现记录

- 新增 `apis/utils/evidence-retrieval.util.ts`，`retrieveEvidenceForArticle()` 输入 `projectId`、`companyId`、`title`、`keywords`、`limit`，输出 compact cards、query snapshot 和 warnings。
- 检索采用规则打分：同项目 +30、同公司 +15、标题 token 命中标题 +20、标题 token 命中正文 +8、关键词命中标题 +18、关键词命中 keywords +15、关键词命中正文 +8、`confidenceScore * 10`、`freshnessScore * 8`。
- `llm.service.impl.ts` 在构造 prompt 前实时 retrieval，并把“可使用证据”区块注入 userPrompt；systemPrompt 增加证据使用边界。
- `ArticleGenerationDebug` 写入 `retrievedEvidenceCards`、`evidenceRetrievalQuery`、`evidenceWarnings`，只保存 compact snapshot。
- `article-generation.scheduler.ts` 查询 project 时带出 `companyId`，调用 `generateArticle()` 时传 `projectId` / `companyId`。
- 生成成功后，scheduler 成功事务中 upsert `ArticleEvidenceCard`，仅写 `usageType = injected`，通过 `[articleId, evidenceCardId]` 避免重复关系。

## 验证

- `npm.cmd run build:api`：通过。
- `npm.cmd run lint`：通过。
- 未执行 `pnpm test`，符合本次约束。
