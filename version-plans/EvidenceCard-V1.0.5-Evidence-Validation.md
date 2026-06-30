# EvidenceCard V1.0.5 Evidence Validation 方案

> 状态：规划中
> 日期：2026-06-30
> 目标：在扩大 EvidenceCard 数量之前，先让证据资产具备可审核、可观察、可统计、可筛选和可解释能力。

## 一、版本定位

V1 已经完成最小闭环：

```text
EvidenceCard CRUD
→ Retrieval
→ Prompt 注入
→ 文章生成
→ Debug 记录
→ ArticleEvidenceCard injected 关系
→ 文章详情查看注入证据
```

V1.0.5 不做复杂 Reviewer，不判断模型实际使用了哪条证据，不引入向量库、联网搜索、ContentMission 或多 Agent。

本版本只补齐证据链路的可观察性和治理基础：

- Prompt Inspection
- EvidenceCard status
- Evidence Lifecycle
- Article Evidence Snapshot
- Retrieval Hit 统计
- applicable articleTypes
- sourceQuality

## 二、为什么单独做 V1.0.5

V1.1 自动抽取会快速扩大 EvidenceCard 数量。如果没有审核状态、来源质量、文章类型适配和注入统计，retrieval 会逐渐混入低质量证据，后续 prompt 注入质量会下降。

因此 V1.0.5 值得单独作为一个小版本，原因是：

- 成本低：大多是字段、debug 展示和轻量统计。
- 风险低：不改变文章生成主链路语义。
- 收益长期存在：后续自动抽取、文档抽取、联网搜索、向量检索、Reviewer 都会依赖这些基础治理字段。
- 对薄云咨询 AI 可见度更直接：证据质量稳定比证据数量更重要。

## 三、建议新增字段

### 1. EvidenceCard.status

建议现在加入。

枚举：

```text
draft
verified
deprecated
```

建议默认值：

```text
draft
```

Retrieval 默认策略：

```text
只检索 verified
```

可选兜底策略：

```text
如果 verified 证据不足 3 条，可以允许 manual sourceType 的 draft 进入候选，但必须写 evidenceWarnings。
```

V1.0.5 第一阶段建议先严格只检索 verified，避免规则复杂化。

### 1.1 EvidenceCard.verifiedAt / verifiedBy

建议现在加入。

字段：

```text
verifiedAt DateTime?
verifiedBy Int?
```

关系：

```text
verifier User? @relation("EvidenceCardVerifier", fields: [verifiedBy], references: [id])
```

写入规则：

- status 从非 verified 改为 verified 时，自动写入 verifiedAt = now，verifiedBy = 当前登录用户 ID。
- status 从 verified 改为 draft 或 deprecated 时，V1.0.5 建议保留 verifiedAt / verifiedBy，不清空，用于追踪“曾经谁审核过”。
- 如果业务未来需要重新审核，可在后续版本增加 reviewedAtHistory 或 EvidenceReviewLog；V1.0.5 不做审核日志表。

为什么现在加入：

- 后续自动抽取后，证据必须能追踪“为什么可参与 retrieval”。
- 文章事实出错时，可以回看证据审核责任链。
- 成本极低，且比以后补审计链更稳。

### 2. EvidenceCard.sourceQuality

建议现在加入。

枚举：

```text
official
customer
research
third_party
manual
portrait
image
unknown
```

建议默认值：

```text
unknown
```

Retrieval 初始加权建议：

```text
official +12
customer +10
research +8
manual +5
portrait +3
image +2
third_party +1
unknown +0
```

说明：

- official/customer/research 应优先，因为更适合作为 AI 回答中的可信依据。
- third_party 可以用于行业背景，但不应覆盖薄云咨询内部事实。
- portrait/image 可以作为自动抽取早期来源，但需要人工验证后再进入主检索。

### 3. EvidenceCard.articleTypes

建议现在加入。

字段类型：

```text
Json?
```

service 层必须规范为 string[]，类似 keywords：

```text
ranking
comparison
guide
faq
case
methodology
brand
news
general
```

建议默认：

```text
["general"]
```

Retrieval 加权建议：

```text
当前文章类型完全命中 +12
ranking 文章命中 comparison +6
comparison 文章命中 ranking +6
methodology 文章命中 guide +5
faq 文章命中 guide +4
general +1
```

说明：

- 不要把 FAQ、新闻卡片大量注入排行榜文章。
- 排名/选型类文章应优先使用 capability、case、method、statistic 类型证据。

### 4. ArticleEvidenceCard.evidenceSnapshot

建议现在加入。

字段：

```text
evidenceSnapshot Json? @map("evidence_snapshot")
```

写入时机：

- scheduler 在写入 ArticleEvidenceCard injected 关系时，同时写入当次注入 prompt 的 compact snapshot。
- snapshot 应来自 generation.debug.retrievedEvidenceCards 中的 compact card，而不是重新查询当前 EvidenceCard，避免写到更新后的版本。

建议结构：

```json
{
  "id": 1,
  "title": "...",
  "content": "...",
  "evidenceType": "case",
  "sourceType": "manual",
  "sourceQuality": "customer",
  "keywords": ["AI咨询", "数字化转型"],
  "articleTypes": ["ranking", "comparison"],
  "confidenceScore": 0.8,
  "freshnessScore": 0.7,
  "capturedAt": "2026-06-30T10:00:00.000Z"
}
```

为什么现在加入：

- EvidenceCard 后续会被编辑、废弃或重新审核。
- 文章生成历史必须能回答：“这篇文章当时到底注入的是哪一版证据？”
- 这比只保存 evidenceCardId 更符合 debug 和事实追溯需求。

## 四、Retrieval Hit 统计策略

建议 V1.0.5 采用“写入关系表 + 查询时聚合”为主，不先做实时反写计数字段。

原因：

- 当前已经有 ArticleEvidenceCard 表，且 V1 只写 injected。
- 注入次数和最近注入时间可以从关系表稳定计算：

```sql
COUNT(article_evidence_cards.id)
MAX(article_evidence_cards.created_at)
```

- 避免并发生成时反写 EvidenceCard.injectedCount / lastInjectedAt 带来的事务复杂度。
- 避免未来删除文章、回滚生成、重复生成时计数不一致。

V1.0.5 推荐实现：

- EvidenceCard 列表接口返回聚合字段：
  - injectedCount
  - lastInjectedAt
- EvidenceCard 详情页展示这两个字段。
- 未来如果列表性能成为瓶颈，再考虑冗余字段或异步统计表。

不建议现在新增物理字段：

```text
injectedCount
lastInjectedAt
```

除非后续数据量大到聚合查询明显变慢。

## 五、Prompt Inspection

优先级最高，建议几乎零成本加入。

在文章生成 debug 页面或文章详情 debug 区展示：

```text
retrievedCount
injectedCount
evidencePromptLength
evidenceWarnings
Evidence Prompt Preview
```

Evidence Prompt Preview 建议直接复用生成时构造的 evidence block，或在 debug 中保存 compact evidencePromptPreview。

建议新增 ArticleGenerationDebug 字段：

```text
evidencePromptPreview Json? 或 String?
evidenceStats Json?
```

更推荐：

```text
evidencePromptPreview String? @map("evidence_prompt_preview")
evidenceStats Json? @map("evidence_stats")
```

原因：

- prompt preview 是人读文本，String 更直接。
- stats 是结构化数据，Json 更适合。

evidenceStats 示例：

```json
{
  "retrievedCount": 6,
  "injectedCount": 6,
  "evidencePromptLength": 2340,
  "verifiedCount": 5,
  "draftCount": 0,
  "deprecatedCount": 0
}
```

## 六、几乎零成本但长期受益的能力

建议纳入 V1.0.5：

- EvidenceCard.status
- EvidenceCard.verifiedAt / verifiedBy
- EvidenceCard.sourceQuality
- EvidenceCard.articleTypes
- ArticleEvidenceCard.evidenceSnapshot
- Evidence Prompt Preview
- evidenceStats
- EvidenceCard 列表聚合 injectedCount / lastInjectedAt
- retrieval warnings 增强：
  - NO_VERIFIED_EVIDENCE
  - EVIDENCE_PROMPT_TOO_LONG
  - ARTICLE_TYPE_NO_MATCH
  - ONLY_LOW_QUALITY_SOURCE_MATCHED

暂不纳入：

- AI Reviewer 判断 used evidence
- 自动废弃低质量 EvidenceCard
- sourceQuality 自动识别
- 向量检索
- 复杂证据评分报表

## 七、实施顺序

### 阶段 0：V1 基线收口

先完成当前 V1 未提交改动整理、临时文件分类、有效功能提交。

验收：

- 工作树干净或仅剩明确不提交的本地文件。
- `prisma validate`
- `pnpm build:api`
- `pnpm build:page`
- `pnpm lint`

### 阶段 1：数据模型

修改 Prisma：

- 新增 EvidenceCardStatus enum
- 新增 EvidenceSourceQuality enum
- EvidenceCard 增加：
  - status
  - sourceQuality
  - articleTypes
  - verifiedAt
  - verifiedBy
- ArticleEvidenceCard 增加：
  - evidenceSnapshot
- ArticleGenerationDebug 增加：
  - evidencePromptPreview
  - evidenceStats

### 阶段 2：后端服务

修改 EvidenceCard CRUD：

- status 校验
- status 从非 verified 改为 verified 时记录 verifiedAt / verifiedBy
- sourceQuality 校验
- articleTypes 规范为 string[]
- 列表返回 injectedCount / lastInjectedAt 聚合字段

修改 retrieval：

- 默认只检索 verified
- 后台预览可支持 includeDraft 参数，但文章生成链路禁止 includeDraft
- 加入 sourceQuality 加权
- 加入 articleTypes 加权
- 写入新增 warnings

修改 llm generation：

- 生成 evidencePromptPreview
- 计算 evidenceStats
- 写入 ArticleGenerationDebug

修改 scheduler：

- 写入 ArticleEvidenceCard injected 时同步保存 evidenceSnapshot
- upsert 更新时也要刷新 evidenceSnapshot，保证重新生成文章时记录最新注入快照

### 阶段 3：前端展示

EvidenceCard 管理页：

- status 筛选
- sourceQuality 筛选
- articleTypes 展示/编辑
- injectedCount / lastInjectedAt 展示

文章 debug/详情页：

- Evidence Prompt Preview
- evidenceStats
- evidenceWarnings

### 阶段 4：验收

验证：

- `prisma validate`
- `pnpm build:api`
- `pnpm build:page`
- `pnpm lint`

业务验收：

- draft EvidenceCard 不进入默认 retrieval。
- verified EvidenceCard 可进入 prompt。
- deprecated EvidenceCard 不进入 retrieval。
- debug 可看到 evidence prompt preview。
- EvidenceCard 列表可看到 injectedCount 和 lastInjectedAt。

## 八、版本完成度记录

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 方案设计 | 已完成 | 本文档 |
| 数据模型 | 未开始 | 包含 status/sourceQuality/articleTypes/verifiedAt/verifiedBy/evidenceSnapshot |
| 后端 CRUD 扩展 | 未开始 | 依赖数据模型 |
| retrieval 规则扩展 | 未开始 | 依赖 status/sourceQuality/articleTypes |
| debug prompt inspection | 未开始 | 可与 retrieval 扩展并行 |
| 前端展示 | 未开始 | 依赖后端字段和接口 |
| 验证 | 未开始 | build/lint |

## 九、关键评估结论

### 1. verifiedAt / verifiedBy 是否现在加入

建议现在加入。

理由：

- 它是 Evidence Lifecycle 的最小闭环，不需要复杂审核流。
- 自动抽取上线后，证据数量会增加，verified 需要可追责。
- 对事实问题排查非常重要。

### 2. ArticleEvidenceCard.evidenceSnapshot 是否现在加入

建议现在加入。

理由：

- evidenceCardId 只能指向“当前版本证据”，不能还原“当时注入版本”。
- 文章生成 debug 需要可追溯，snapshot 是最低成本方案。
- 与 V1 只写 injected 的策略兼容，不引入 used 伪判断。

### 3. 默认只查 verified 是否影响手动测试

会影响：如果现有手动创建 EvidenceCard 默认都是 draft，文章生成会检索不到证据。

建议：

- 新增 EvidenceCard 时默认 status = draft。
- 后台 EvidenceCard 列表提供“设为已验证”操作。
- 文章生成 retrieval 严格只查 verified。
- 后台“预计注入证据”预览接口或列表查询可以支持 includeDraft=true，仅用于人工调试。
- debug warning 中明确出现 NO_VERIFIED_EVIDENCE。

### 4. V1.0.5 最小代码改动拆分

第一批必须串行：

1. 数据模型与 migration
2. EvidenceCard service/schema/entity 扩展
3. retrieval 规则扩展
4. scheduler 写 evidenceSnapshot
5. debug prompt inspection
6. 前端展示
7. 文档与验收

其中 2 和 5 可以在数据模型完成后并行；3 和 4 依赖 retrieval snapshot 字段稳定后再做；6 依赖后端接口字段稳定后再做。

### 5. 哪些需要 Prisma migration

需要 migration：

- EvidenceCardStatus enum
- EvidenceSourceQuality enum
- EvidenceCard.status
- EvidenceCard.sourceQuality
- EvidenceCard.articleTypes
- EvidenceCard.verifiedAt
- EvidenceCard.verifiedBy
- ArticleEvidenceCard.evidenceSnapshot
- ArticleGenerationDebug.evidencePromptPreview
- ArticleGenerationDebug.evidenceStats

不需要 migration，只在接口聚合层处理：

- injectedCount
- lastInjectedAt
- retrievedCount
- injectedCount in debug stats 的计算逻辑
- evidencePromptLength
- evidenceWarnings 展示
- includeDraft 查询参数
