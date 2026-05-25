# article.entity.ts 安全评审类型修复

**日期**: 2026-05-25
**文件**: `apis/entity/article.entity.ts`, `tests/apis/article.entity.test.ts`
**评审来源**: `tasks/review/article.entity.md`

## 变更内容

1. `UpdateArticleRequest.skills`: `unknown` → `number[] | null`（对齐 Zod Schema 和 CreateArticleRequest）
2. `CreateArticleRequest.skills`: `number[]` → `number[] | null`（对齐 Zod `.nullable()`）
3. 测试用例更新：`skills: 2` → `skills: [2]`，新增 `skills: null` 测试

## 验证

- pnpm build ✅
- pnpm lint ✅
- article 测试 731 passed ✅
