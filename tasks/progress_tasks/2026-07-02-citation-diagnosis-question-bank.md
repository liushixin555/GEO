# 2026-07-02 引用诊断固定检测问题题库

## 背景

诊断管理模块的自动检测问题需要改为指定的真实用户咨询问题，避免继续使用文章标题、关键词或外部题库生成的旧问题。

## 变更

- `apis/utils/citation-question-bank.util.ts` 改为内置 30 条固定检测问题。
- `buildArticleCitationQuestions()` 只按 `question_count` 顺序截取固定题库，不再使用文章标题和关键词生成动态问题。
- 停用 `geo-monitorv12/GEO/题库/供应商题库A.md`、`供应商题库B.md` 的题库覆盖逻辑。
- 新增 `tests/apis/citation-question-bank.util.test.ts`，覆盖固定题库顺序、完整 30 条和“GEO服务商推荐”原文保留。

## 验收

- 单文件题库测试需要通过。
- 引用诊断编码防回归测试需要通过。
- 按项目要求执行 `pnpm build` 和 `pnpm lint`，不执行全量 `pnpm test`。
