# 2026-06-30 EvidenceCard V1 前端最小页

## 变更范围

- 新增 `pages/knowledge/EvidenceCardList.tsx`：证据卡片列表、搜索、筛选、新增入口、编辑和删除操作。
- 新增 `pages/knowledge/EvidenceCardDetail.tsx`：证据卡片新增、编辑和详情展示表单。
- 新增 `pages/knowledge/hooks/useEvidenceCards.ts`：封装 EvidenceCard CRUD、列表分页响应兼容和关键词拆分。
- 更新 `pages/router/routes.tsx`：新增证据卡片路由，并放在 `/knowledge/:baseId` 之前避免路由误匹配。
- 更新知识库入口和知识库详情页：增加证据卡片入口。
- 更新文章设置表单：增加“预计注入证据”预览，只作为轻量提示，不作为最终生成依据。
- 更新文章详情页：增加“实际注入证据”展示区，并在后端接口缺失时提示需要补充接口。

## 接口约定

- `GET /api/v1/evidence-cards`
- `GET /api/v1/evidence-cards/:id`
- `POST /api/v1/evidence-cards`
- `PUT /api/v1/evidence-cards/:id`
- `DELETE /api/v1/evidence-cards/:id`
- `GET /api/v1/projects/:projectId/articles/:articleId/evidence-cards`（文章实际注入证据查询，当前前端已预留）

## 验证

- `pnpm build:page`：通过。
- `pnpm lint`：通过。
- 未执行 `pnpm test`。
