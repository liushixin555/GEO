# 前端记忆

## 2026-06-30 EvidenceCard V1

- EvidenceCard 前端必须继续遵守 Ant Design 与 DESIGN.md，不使用原生 HTML 替代 antd 已有组件。
- EvidenceCard 管理页最小能力包括列表、关键词搜索、evidenceType/sourceType 筛选、新增、编辑、删除和可信度/新鲜度展示。
- 文章生成页可以展示“预计注入证据”，但该区域只是预览，不作为最终文章生成依据。
- 文章详情页展示的是 ArticleEvidenceCard 记录的实际注入证据，用于回答“本文生成时实际用了哪些知识库证据”。
- 前端显示时间仍必须使用 `pages/utils/date.ts` 的 `formatDate` / `formatDateTime`，保持 Asia/Shanghai。
- V1 不在前端实现文档正文抽取、联网搜索、ContentMission、EntityGraph 等后置能力入口。

## 2026-06-30 EvidenceCard 前端最小页落地

- 证据卡片前端路由使用 `/knowledge/evidence-cards` 和 `/knowledge/evidence-cards/:id`，必须放在 `/knowledge/:baseId` 动态路由之前。
- 文章设置页“预计注入证据”通过 `GET /api/v1/evidence-cards` 按 title/keywords 做轻量预览，必须保留“最终以后端生成时检索为准”的提示。
- 文章详情页“实际注入证据”优先消费文章详情中的 `evidenceCards`，否则按约定请求 `GET /api/v1/projects/:projectId/articles/:articleId/evidence-cards`；接口未实现时显示后端支持提示。
- 当前后端删除接口若仍为批量删除 `DELETE /api/v1/evidence-cards` + `{ ids }`，前端可在 `DELETE /api/v1/evidence-cards/:id` 失败后做兼容回退。

## 2026-06-30 EvidenceCard V1.0.5 前端治理展示

- EvidenceCard 列表页需要展示并筛选 `status`、`sourceQuality`、`articleTypes`，同时展示查询时聚合的 `injectedCount` 和 `lastInjectedAt`。
- EvidenceCard 详情页需要支持编辑 `status`、`sourceQuality`、`articleTypes`，并展示 `verifiedAt`、`verifiedBy`、注入次数和最近注入时间。
- 文章设置页的预计注入证据预览默认只查询 `status=verified` 的 EvidenceCard，但仍不能作为最终生成依据。
- 文章详情页展示实际注入证据时，优先使用 `ArticleEvidenceCard.evidenceSnapshot`，再回退到当前 EvidenceCard 关联详情。
- 文章详情页 debug 区需要展示 Evidence Prompt Preview、retrievedCount、injectedCount、evidencePromptLength 和 evidenceWarnings；预览内容应默认折叠或截断，避免页面高度失控。

## 2026-06-30 EvidenceCard V1.1 前端抽取预览

- V1.1 前端若实现抽取入口，应使用 Ant Design 表单、表格、标签、抽屉/弹窗等组件，并继续遵守 DESIGN.md。
- 抽取入口调用 `POST /api/v1/evidence-cards/extract`，必须清晰区分 `save=false` 预览和 `save=true` 保存 draft。
- 候选预览页必须让人工看到 title、content、evidenceType、sourceType、sourceQuality、keywords、articleTypes、warnings 和 extractionReason。
- UI 不得提供“抽取后直接 verified”的快捷路径；审核仍应回到 EvidenceCard 管理流程。
- manual-text 输入应作为首要入口；portrait/image 可作为次级来源选择，不应暗示其可信度等同人工整理材料。
- 第一批验收前端重点是能辅助人工从 30 条原始材料筛出 20 条 verified，而不是扩大自动来源范围。
## 2026-06-30 EvidenceCard portrait/image 抽取入口

- 画像和图片材料可在 `KnowledgeBaseDetail` 列表/卡片操作区，以及 `PortraitDetail` / `ImageDetail` 标题区触发“抽取证据”。
- 第一版前端直接调用 `POST /api/v1/evidence-cards/extract` 且 `save=true`，成功后提示“已生成 draft 证据，请审核后再用于文章生成”，并跳转 `/knowledge/evidence-cards?status=draft`。
- `EvidenceCardList` 需要支持 URL 初始化 `status=draft`，并展示 `sourceType/sourceId/sourceUrl` 方便人工审核来源。
