# 2026-07-05 引用诊断台账详情 id 字段歧义修复

## 背景

访问 `/api/v1/citation-diagnosis/ledger/:articleId/details` 时，Prisma raw query 返回 PostgreSQL `42702`，错误为 `字段关联 "id" 是不明确的`。受影响样例包括文章 66、62、67。

## 根因

`getLedgerDetails()` 中的 `targetRuns` 查询新增了 `LEFT JOIN published_article_links target_link`，但 SELECT 仍使用未加表别名的 `id`、`created_at` 等字段。JOIN 后 `run` 和 `target_link` 均存在 `id`，导致 PostgreSQL 无法判断字段来源。

## 修复

- 将 `targetRuns` 查询 SELECT 字段统一改为 `run.id`、`run.project_id`、`run.created_at` 等显式表别名。
- 保留 `target_link` 仅用于过滤已删除或软盟内部链接，不参与返回字段。

## 验证

- service 级调用 `getLedgerDetails(66/62/67, { role: 'sysadmin' })` 均成功返回。
- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`
