# 2026-06-30 EvidenceCard V1.1 portrait/image 抽取入口

## 目标

让画像详情页、图片详情页以及对应列表操作可以触发 EvidenceCard 抽取，并直接 `save=true` 保存为 `draft`，供人工审核后再进入文章生成检索。

## 完成内容

- `POST /api/v1/evidence-cards/extract` 接收当前用户 `userId/role`，portrait/image sourceId 抽取时按知识库 scope 校验访问权限。
- portrait 抽取读取 `KnowledgePortrait.title/content`，写入 `sourceType=portrait`、`sourceId=画像ID`、`sourceQuality=portrait`。
- image 抽取读取 `KnowledgeImage.title/description/imageUrl`，写入 `sourceType=image`、`sourceId=图片ID`、`sourceUrl=imageUrl`、`sourceQuality=image`，候选 `evidenceType` 优先为 `image_description`。
- `pages/knowledge/hooks/useEvidenceCards.ts` 增加 portrait/image 抽取参数和 `extractEvidenceCardsResult`，保留 manual-text 预览使用的旧返回方式。
- `pages/knowledge/KnowledgeBaseDetail.tsx` 在画像列表/卡片和图片列表/卡片操作区增加“抽取证据”按钮。
- `pages/knowledge/PortraitDetail.tsx` 和 `pages/knowledge/ImageDetail.tsx` 在详情页标题区增加“抽取证据”按钮。
- 抽取成功后提示“已生成 draft 证据，请审核后再用于文章生成”，并跳转 `/knowledge/evidence-cards?status=draft`。
- `pages/knowledge/EvidenceCardList.tsx` 支持从 URL 初始化 `status=draft` 筛选，并在列表/卡片中展示 `sourceId`、`sourceUrl`。

## 边界

- 不做 manual-text 主流程改造。
- 不做文档解析。
- 不做联网搜索。
- 不做向量库。
- 不改文章生成 retrieval。
- 抽取结果只能保存为 `draft`。

## 验收点

- 从画像生成 draft EvidenceCard。
- 从图片描述生成 draft EvidenceCard。
- EvidenceCard 列表可看到 `sourceType/sourceId/sourceUrl`。
- 审核为 `verified` 后沿用既有文章生成检索链路。
