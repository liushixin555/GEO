# 2026-07-01 文章详情 portrait 兼容解析修复

## 背景

EvidenceCard 自测生成的文章 54、55、56 存在历史脏数据：`portrait` 字段是普通字符串，且部分中文已被 PowerShell 转码污染为 `????`。文章详情页原来无条件执行 `JSON.parse(data.portrait)`，遇到普通字符串会抛异常，导致整页显示“加载文章失败”。

## 根因

- 后端文章详情接口可正常返回 54、55、56，三篇均为 `projectId=3`、`pending_review`，正文存在。
- 前端 `pages/article/hooks/useArticleDetail.ts` 对 `portrait` 的解析过于严格，只接受 JSON 字符串数组。
- 历史生成文章或自测脚本可能写入 plain text portrait，导致前端渲染前崩溃。

## 修复

- 新增 `parsePortrait()`：
  - JSON 数组：规范为 `string[]`。
  - JSON 字符串：转为单项数组。
  - 普通字符串：作为单项数组保留。
  - 空值：返回 `undefined`。
- 文章详情表单设置画像时改用 `parsePortrait(data.portrait)`。
- 顺手修复 `pages/citation-diagnosis/index.tsx` 导出文件名中 `formatDate(new Date())` 的类型问题，改为 `formatDate(new Date().toISOString())`。

## 验证

- `npm.cmd run lint`：通过。
- `npx.cmd tsc -p tsconfig.page.json --noEmit`：通过。
- `GET /api/v1/projects/3/articles/54`：返回 `pending_review`。
- `GET /api/v1/projects/3/articles/55`：返回 `pending_review`。
- `GET /api/v1/projects/3/articles/56`：返回 `pending_review`。
