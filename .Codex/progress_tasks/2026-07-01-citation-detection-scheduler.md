# 2026-07-01 发布后自动引用检测调度

- 发布链接写入 `published_article_links` 后，由 `citation-detection.scheduler.ts` 每 30 分钟异步扫描，不阻塞发布流程。
- 调度器每轮最多处理 5 条发布链接；每条限制为 2 个问题、2 个模型。
- `AiCitationDetectionRun.targetArticleLinkId` / `target_article_link_id` 用作链接级检测标记，调度器排除 24 小时内已有 run 的同一 `articleLink`。
- `skipped` 平台表示缺少模型配置或 API Key，不计为系统失败；单条链接异常会被捕获并继续处理下一条。
