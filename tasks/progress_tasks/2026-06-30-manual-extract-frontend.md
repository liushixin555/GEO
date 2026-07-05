# 2026-06-30 EvidenceCard V1.1 manual-text 抽取预览前端

## 目标

在 EvidenceCard 新增页提供 manual-text 抽取预览能力，让用户可以粘贴文本、预览候选、人工编辑筛选，并保存为 draft 证据卡片。

## 本次完成

- 扩展 `pages/knowledge/hooks/useEvidenceCards.ts`，新增 `extractEvidenceCards` 调用 `POST /api/v1/evidence-cards/extract`。
- 更新 `pages/knowledge/EvidenceCardDetail.tsx`，在新增页加入“手动录入 / 从文本抽取”Tabs。
- 抽取入口使用 `{ sourceType: "manual", text, save: false }` 做预览，不入库。
- 候选卡片支持勾选、删除、编辑 title/content/evidenceType/sourceQuality/articleTypes/keywords/confidenceScore/freshnessScore。
- 保存草稿优先调用 extract `save=true` 并携带编辑后的 candidates，失败时兼容逐条 `POST /api/v1/evidence-cards` 创建 draft。
- 补充 `.Codex/frontend.md` 和 `tasks/dev015.AI知识库.md` 记录前端边界。

## 边界

- 不做后端 service。
- 不做画像/图片详情抽取按钮。
- 不执行 `pnpm test`。
- 不新增组件级 y 轴滚动条，候选列表用分页控制展示量。

## 验证

- 通过：`npm.cmd run build:page`
- 通过：`npm.cmd run lint`
