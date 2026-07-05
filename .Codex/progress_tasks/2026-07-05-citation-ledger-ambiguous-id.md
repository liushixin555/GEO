# 2026-07-05 引用诊断台账详情 id 字段歧义修复

- raw SQL 只要引入 JOIN，SELECT / ORDER BY / WHERE 中可能重复的字段必须显式加表别名。
- 本次问题由 `ai_citation_detection_runs run LEFT JOIN published_article_links target_link` 后仍 SELECT `id` 引发，已改为 `run.id` 等显式字段。
- 验证覆盖文章 66、62、67 的 `getLedgerDetails()` service 调用。
