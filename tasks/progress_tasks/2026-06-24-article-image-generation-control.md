# 2026-06-24 文章生成图片可控性修复

## 问题

文章 #11 未在文章设置中选择图片，但生成正文中出现了外部 Unsplash 图片链接。原因包括：

- 调度器原来会把项目知识库下全部图片传给文章生成，而不是只传文章设置里选中的图片。
- 生成提示词要求“自然插入图片”，没有明确禁止模型在无图片资源时编造外部图片链接。
- 生成结果保存前没有过滤未授权的 Markdown 图片。

## 修复

- `apis/scheduler/article-generation.scheduler.ts`：只读取 `article.images` 中用户已选的图片 URL，并限定在当前项目知识库图片范围内。
- `apis/service/impl/llm.service.impl.ts`：无可用图片时明确禁止输出图片；有可用图片时只能使用列表内图片。
- `cleanGeneratedArticleContent` 保存前过滤未出现在允许列表中的 Markdown 图片链接。

## 验证

- `node scripts/with-local-env.cjs npx tsc -p tsconfig.api.json --noEmit` 通过。
- `npm.cmd run lint` 通过。
