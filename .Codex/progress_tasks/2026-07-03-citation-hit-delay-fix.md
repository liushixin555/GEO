# 2026-07-03 引用检测命中为 0 与延迟检测修复

- 命中为 0 的主因是活跃发布链接中有 7 条 `https://i.ruan.net/manuscripts/`，这是软盟后台稿件地址，不是最终公开文章 URL。
- 自动引用检测改为只扫描真实公开发布链接，并要求链接写入/更新满 24 小时后才检测，避免平台尚未发布或 AI 检索尚未收录时提前打空。
- 历史 `published_article_links.normalized_url` 若带 `http(s)://` 会导致和 AI 来源 normalized URL 不一致；本次新增迁移并本地修正文章 58 的 normalized URL。
- 千问/元宝 HTTP 400 排查方向：请求体先收敛为标准 OpenAI chat completions 字段，错误记录保留 provider 返回的摘要。
- 用户明确要求：以后没有明确要求推送时，只提交本地 commit，不执行 `git push`。
