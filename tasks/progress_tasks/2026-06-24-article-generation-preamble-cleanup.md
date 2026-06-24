# 2026-06-24 文章生成过程说明混入正文清理

## 问题

文章生成时，Agent 在读取技能和材料后可能把过程性说明一起输出到正文开头，例如：

`Now I have a comprehensive understanding of all the rules and materials. Let me write the article.`

这类内容不是文章正文，不应展示给用户，也不应保存为文章版本。

## 修复

- 在 `apis/service/impl/llm.service.impl.ts` 中新增 `cleanGeneratedArticleContent`。
- 保存生成文章前清理常见英文/中文过程性前缀。
- 强化文章生成提示词，要求第一行必须是文章标题或正文，不得输出读取技能、理解规则、准备写作等说明。

## 验证

- `node scripts/with-local-env.cjs npx tsc -p tsconfig.api.json --noEmit` 通过。
- `npm.cmd run lint` 通过。
