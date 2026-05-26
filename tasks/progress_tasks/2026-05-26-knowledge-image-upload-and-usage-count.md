# 知识库图片上传修复 + 知识清单/详情显示文章使用次数

## 日期
2026-05-26

## Bug修复：图片上传后创建记录400错误

### 问题
前端通过 `POST /upload` 上传图片文件，返回相对路径 `/uploads/xxx.png`，然后调用 `POST /knowledge-bases/:baseId/images` 创建图片记录时，传入 `image_url: "/uploads/xxx.png"`，后端 Zod 校验要求 `image_url` 必须是 `http://` 或 `https://` 开头，导致 400 错误。

### 修复
- **文件**: `apis/schema/knowledge.schema.ts`
- **改动**: `imageUrl` 的 refine 正则从 `/^https?:\/\/.+/` 改为 `/^(https?:\/\/|\/)[^\s]+/`，同时接受绝对 URL 和 `/uploads/...` 相对路径

## 功能增强：知识清单/详情列表显示被文章使用次数

### 后端
- **文件**: `apis/controller/knowledge.controller.ts` — `listInventory` 函数
- **改动**: 为每类资产（关键词、画像、图片）批量查询被多少篇文章使用，返回 `articleCount` 字段
  - 关键词：`articles.keywords` LIKE 包含该关键词
  - 画像：`articles.portrait` 匹配标题或内容
  - 图片：`articles.images` JSON 数组包含该 URL（使用 PostgreSQL `@>` 操作符）
  - 文档：`articleCount` 固定为 0（文档不直接被文章引用）

### 前端
- **文件**: `pages/knowledge/index.tsx` — 知识清单卡片和表格新增"被使用次数"列
- **文件**: `pages/knowledge/KnowledgeBaseDetail.tsx` — 知识库详情页关键词/画像/图片卡片视图新增"X篇文章使用"显示
