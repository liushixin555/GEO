# 2026-07-03 发布后引用检测闭环

## 背景

文章 58 已在外部平台真实发布，但系统台账仍显示“待补发布链接”。排查发现本地只有 `publishing_schedules`，没有对应 `publishing_platform_orders` 和 `published_article_links`，引用检测调度器没有扫描目标；同时引用诊断后续迁移尚未应用，数据库缺少 `target_article_id` / `target_article_link_id`。

## 变更

- 应用引用诊断迁移，补齐 detection run 的文章与发布链接追踪字段，以及 citation record 的 source 上下文字段。
- 新增 `published_article_links(article_id, normalized_url)` 活跃链接唯一索引，软删除记录不参与唯一约束。
- 发布链接创建与软盟订单同步写链接统一改为 upsert，避免同一文章同一 URL 重复入库。
- `runAutomaticCitationDetectionSchema` 支持 `article_link_ids`，可按具体发布链接手动复检。
- 发布执行链路中，软盟下单成功但未返回订单 ID 时直接失败，不能静默进入已发布。
- 手动把发布计划更新为 `published` 前，要求已存在软盟订单或发布链接。
- 发布计划创建时校验平台名必须存在于 `publishing_platforms`。
- 回填文章 58 的真实发布链接：`https://www.cnblogs.com/123456hhcm/p/21046837`。

## 验证记录

- 文章 58 已有 `published_article_links.id = 2`。
- 自动检测已写入 `ai_citation_detection_runs.target_article_id = 58` 与 `target_article_link_id = 2`。
- 台账详情可返回文章 58 的发布链接与检测 run。
- DeepSeek 当前返回 `HTTP 404`，Kimi 当前为 `skipped`（缺模型配置或 API Key）；因此暂无 citation records 与命中标记。
