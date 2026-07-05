# 2026-07-01 发布后自动引用检测调度

## 范围

- 新增后端自动检测调度器 `apis/scheduler/citation-detection.scheduler.ts`。
- 发布流程仍只负责写入 `published_article_links`，检测由定时任务异步扫描，不阻塞发布同步。
- 本次不做前端页面，不拆分文章生成 prompt，不运行 seed，不运行 `pnpm test`。

## 触发规则

- 默认 cron 为 `*/30 * * * *`，可通过 `CRON_CITATION_DETECTION_INTERVAL` 覆盖。
- 可通过 `CRON_CITATION_DETECTION_ENABLED=false` 禁用。
- 每轮最多扫描 5 条待检测发布链接。
- 每条发布链接最多执行 2 个问题、2 个模型，当前调度器使用 `DeepSeek` 与 `Kimi`。

## 防重复规则

- `ai_citation_detection_runs` 新增 `target_article_link_id`。
- 自动检测保存 run 时写入当前 `published_article_links.id`。
- 调度器扫描时排除 24 小时内已有 run 的同一 `articleLink`。

## 失败处理

- 单条链接独立 try/catch，失败不会影响其他链接。
- 平台缺少配置或 API Key 时由采集工具返回 `skipped` 并保存 run，不计为系统失败。
- 调度器日志只输出 link id、统计值和错误摘要，不打印 API Key。

## 关联文件

- `apis/scheduler/citation-detection.scheduler.ts`
- `apis/server.ts`
- `apis/config/index.ts`
- `apis/service/citation-diagnosis.service.ts`
- `apis/service/impl/citation-diagnosis.service.impl.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260701001000_add_citation_run_article_link/migration.sql`
