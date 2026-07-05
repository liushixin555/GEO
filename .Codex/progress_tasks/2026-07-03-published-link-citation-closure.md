# 2026-07-03 发布后引用检测闭环

- 发布后引用检测统一以 `published_article_links` 为入口；没有发布链接的文章不触发自动检测。
- `ai_citation_detection_runs.targetArticleId` 和 `targetArticleLinkId` 已作为台账追踪与 24 小时去重依据。
- `published_article_links` 增加活跃唯一索引 `(article_id, normalized_url) WHERE deleted_at IS NULL`，人工补录和软盟同步均使用 upsert。
- 文章 58 已回填真实链接并触发检测；链路可追踪到 run，但 DeepSeek 当前 HTTP 404，Kimi 缺配置，所以暂无引用来源记录和命中标记。
