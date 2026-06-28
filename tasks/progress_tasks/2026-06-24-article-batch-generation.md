# 批量生文功能

## 背景

原文章管理只能一次创建一篇 AI 生成文章。运营后续需要一次提交多篇文章生成，且每篇文章可以使用相同或不同关键词、不同文章类型。

## 修改范围

- `apis/schema/article.schema.ts`
  - 新增 `batchCreateArticlesSchema`，限制每次提交 1-20 篇文章。
- `apis/service/article.service.ts`
  - 新增 `batchCreate()` 服务接口定义。
- `apis/service/impl/article.service.impl.ts`
  - 新增 `batchCreate()` 实现，复用现有单篇 `create()` 逻辑。
- `apis/controller/article.controller.ts`
  - 新增 `batchCreateArticles` 控制器。
- `apis/routes/article.routes.ts`
  - 新增 `POST /api/v1/projects/:projectId/articles/batch`。
  - 路由放在 `/:id` 详情路由之前，避免路径冲突。
- `pages/article/components/ArticleBatchGenerateModal.tsx`
  - 新增批量生文弹窗。
  - 支持添加、复制、删除单篇配置行。
  - 每篇文章可单独设置标题、文章类型、关键词、画像、技能、大模型。
- `pages/article/index.tsx`
  - 在文章列表工具栏新增“批量生文”入口。
  - 提交成功后刷新文章列表。

## 技术决策

本次不新增数据库表、不新增文章状态、不修改调度器。

批量生文只是在后端一次创建多条 `status=generating` 的普通文章记录。现有文章生成调度器已经会扫描所有 `generating` 文章并逐篇处理，因此无需引入批任务模型。

## 当前行为

1. 用户在文章列表点击“批量生文”。
2. 弹窗中每一行配置一篇文章。
3. 提交后后端批量创建多条文章记录。
4. 每条文章状态为 `generating`。
5. 原有调度器逐篇生成正文。
6. 生成成功后沿用现有流程进入 `pending_review`。

## 影响边界

- 不影响单篇“添加文章”流程。
- 不影响审核流程。
- 不影响发布管理。
- 不影响文章状态机。
- 不影响数据库 schema。

## 约束

- 单次最多提交 20 篇文章。
- 批量接口复用单篇创建逻辑，因此每篇文章的字段校验与单篇创建保持一致。
- 当前批量弹窗不支持插图配置，插图仍可在单篇详情中维护；这是为了控制本次改动范围。

## 验证

已执行：

```bash
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.api.json
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.page.json
```

结果均通过。
