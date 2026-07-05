# 2026-06-30 EvidenceCard V1.1 Extraction Preview

## 目标

建立 V1.1 文档、版本方案、任务记录和验收清单，让后续开发人员可以接手“证据候选抽取 -> 人工预览 -> draft 保存 -> verified 审核 -> 文章重生成验证”的版本工作。

## 本次完成

- 新增 `version-plans/V1.1-Evidence-Extraction-Preview.md`，明确 V1.1 版本定位、接口语义、来源优先级、抽取质量规则、人工材料准备和验收标准。
- 更新 `tasks/dev015.AI知识库.md`，补充 EvidenceCard V1.1 抽取预览章节。
- 更新 `.Codex/rules.md`、`.Codex/architecture.md`、`.Codex/frontend.md`，记录 V1.1 关键规则和交接边界。
- 更新 `AGENTS.md`，补充 V1.1 抽取预览铁律。
- 整合统一抽取接口 `POST /api/v1/evidence-cards/extract`，支持 `manual` / `portrait` / `image` 来源。
- 补齐 `save=true + candidates` 保存语义，允许前端把人工编辑、删除、勾选后的候选提交给后端保存为 `draft`。
- 后端保存前会二次清洗候选，过滤空标题、空正文、重复候选、过短低价值内容和空泛营销表达。
- 前端新增页保留“手动录入 / 从文本抽取”双模式，抽取候选可预览、编辑、删除、勾选并保存草稿。

## 关键规则

- V1.1 统一接口为 `POST /api/v1/evidence-cards/extract`。
- `save=false` 只做候选预览，不写入数据库。
- `save=true` 只能保存为 `draft`，抽取结果不能直接变为 `verified`。
- `manual-text` 优先级最高；portrait/image 次优先。
- 正式文章生成仍只应检索人工审核后的 `verified` EvidenceCard。
- 不抽取空泛营销表达，不编造客户、数据、资质、荣誉或案例。
- 文档正文解析、联网搜索、external evidence 自动采集、ContentMission、EntityGraph 后置。

## 第一批验收

- 准备 30 条原始材料。
- 通过抽取预览和人工筛选，形成至少 20 条 `verified` EvidenceCard。
- 选择 3-5 篇文章重生成。
- 对比 debug、证据注入、正文事实支撑和推荐理由质量。

## 验证记录

- `manual + save=false` 已完成接口烟测：返回候选，不写入 EvidenceCard。
- `manual + save=true` 已完成接口烟测：保存为 `draft` EvidenceCard。
- 缺少 manual text 已完成接口烟测：返回 400。
- 烟测过程中产生的临时草稿证据已通过删除接口软删除。
- 未执行 `pnpm test`。
- 未执行推送。
- 未修改 `.agents/`。

## 待真实材料验收

- 真实材料尚未准备好，因此 V1.1 暂不做文章质量结论。
- 后续需要按材料准备指南整理约 30 条原始材料，抽取并人工审核出约 20 条 `verified` EvidenceCard。
- 再选择 3-5 篇文章重生成，对比 `evidencePromptPreview`、`evidenceStats`、`ArticleEvidenceCard.evidenceSnapshot` 和正文质量。

## 风险与冲突

- 现有文档已明确 V1.0.5 正式 retrieval 默认只检索 `verified`，V1.1 与该规则一致。
- 现有 V1 文档将文档正文抽取后置，V1.1 仍不做文档解析，只做 manual-text / portrait / image 候选抽取，因此不冲突。

## 2026-06-30 V1.1.1 后端 LLM 抽取增强

- 自动抽取路径已从纯 deterministic 升级为“LLM 优先 + deterministic fallback”：`EvidenceCardServiceImpl.extractEvidenceCards()` 在未收到人工编辑候选时调用 `extractCandidatesWithLlmFallback()`。
- LLM 调用位置：`apis/utils/evidence-extraction.util.ts` 的 `extractEvidenceCandidates()`，使用 `llmModel` 表第一条启用模型和 `AgentLoopUtil.run()`。
- fallback 触发条件：没有启用模型、LLM 调用异常、输出无法解析、合法候选为空、候选被防御性过滤后为空。
- parser 防御：剥离 ```json fence，非 JSON 返回 `LLM_OUTPUT_NOT_JSON`，非法枚举丢弃候选，数组字段规范化，分数钳制到 0-1，模型返回 `verified` 强制降为 `draft`。
- `save=false` 只返回候选和 warnings，不写库；`save=true` 保存前仍走 service 清洗并强制 draft。
- 验证：`npm.cmd run build:api` 通过；`npm.cmd run lint` 通过；轻量 parser 烟测确认 fenced JSON、非法枚举、非 JSON 均可防御处理。

## 2026-06-30 V1.1.1 后端 LLM 抽取增强

- 自动抽取路径已从纯 deterministic 升级为“LLM 优先 + deterministic fallback”：`EvidenceCardServiceImpl.extractEvidenceCards()` 在未收到人工编辑候选时调用 `extractCandidatesWithLlmFallback()`。
- LLM 调用位置：`apis/utils/evidence-extraction.util.ts` 的 `extractEvidenceCandidates()`，使用 `llmModel` 表第一条启用模型和 `AgentLoopUtil.run()`。
- fallback 触发条件：没有启用模型、LLM 调用异常、输出无法解析、合法候选为空、候选被防御性过滤后为空。
- parser 防御：剥离 ```json fence，非 JSON 返回 `LLM_OUTPUT_NOT_JSON`，非法枚举丢弃候选，数组字段规范化，分数钳制到 0-1，模型返回 `verified` 强制降为 `draft`。
- `save=false` 只返回候选和 warnings，不写库；`save=true` 保存前仍走 service 清洗并强制 draft。
- 验证：`npm.cmd run build:api` 通过；`npm.cmd run lint` 通过；轻量 parser 烟测确认 fenced JSON、非法枚举、非 JSON 均可防御处理。
