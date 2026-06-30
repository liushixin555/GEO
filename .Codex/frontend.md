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
