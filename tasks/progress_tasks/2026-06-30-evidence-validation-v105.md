# 2026-06-30 EvidenceCard V1.0.5 Evidence Validation

## 目标

在 V1 证据闭环基础上，补齐证据治理的最小能力：可审核、可观察、可统计、可筛选、可追溯。

## 已完成

- EvidenceCard 增加 `status`、`sourceQuality`、`articleTypes`、`verifiedAt`、`verifiedBy`。
- ArticleEvidenceCard 增加 `evidenceSnapshot`，生成成功写入 injected 关系时保存当次 compact snapshot。
- ArticleGenerationDebug 增加 `evidencePromptPreview`、`evidenceStats`。
- EvidenceCard CRUD 支持新字段，`articleTypes` 入库规范为字符串数组，默认 `["general"]`。
- 当 EvidenceCard status 从非 `verified` 改为 `verified` 时，记录 `verifiedAt` 和 `verifiedBy`。
- EvidenceCard 列表/详情通过 `ArticleEvidenceCard` 查询时聚合 `injectedCount`、`lastInjectedAt`，不反写主表。
- Retrieval 默认只检索 `verified` EvidenceCard；`includeDraft` 仅保留为后台预览扩展参数，不用于正式文章生成。
- Retrieval scoring 增加 `sourceQuality` 与 `articleTypes` 权重。
- 文章生成 debug 保存 Evidence Prompt Preview、retrievedCount、injectedCount、evidencePromptLength、evidenceWarnings。
- 文章详情展示实际注入证据时优先展示 `evidenceSnapshot`，并展示 debug 统计与 Evidence Prompt Preview。
- 文章生成页的预计注入证据预览只查询 `verified` EvidenceCard，但最终仍以后端生成时实时 retrieval 为准。

## 暂不做

- 不做 Reviewer 阶段的 used 判断。
- 不做联网搜索、向量库、ContentMission、EntityGraph、平台贡献评分。
- 不做 injectedCount / lastInjectedAt 物理字段反写。
- 不做复杂审核流或审核日志表。

## 验证记录

- `npx.cmd prisma validate`：通过。
- `pnpm build:api`：通过。
- `pnpm build:page`：通过。
- `pnpm build`：通过。
- `pnpm lint`：通过。

## 注意事项

- 当前 `dev2` 本地领先远端，按用户要求本次不推送。
- 工作区存在其他会话遗留的未提交/未跟踪文件，本次只应提交 EvidenceCard V1.0.5 相关文件。
