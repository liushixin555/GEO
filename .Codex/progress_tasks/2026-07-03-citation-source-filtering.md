# 2026-07-03 引用检测来源过滤与命中加固

- 引用检测来源抽取只保留可作为引用依据的公开网页 URL。
- `ruan.net` / `*.ruan.net` 属于软盟后台或稿件系统链接，不得作为引用来源，不得参与命中。
- 图片 CDN 和静态资源 URL 不得入库为 citation source，当前已过滤 `byteimg.com` 及常见静态资源扩展名。
- 命中仍只按标准化 URL 匹配 `published_article_links`，不得因模型文本提及标题、品牌名或摘要而计为命中。
