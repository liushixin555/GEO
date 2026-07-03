# 2026-07-03 软盟发布链接迟到同步修复

## 问题
- 多篇文章实际已发布，但台账仍显示“待补发布链接”，或保留 `https://i.ruan.net/manuscripts/` 后台稿件链接。
- 本地库排查发现 7 个软盟订单均已从处理中状态离开，旧同步任务只扫描 `rm_status = 0`，导致后续最终公开 URL 迟到返回时不再轮询。

## 修复
- `PublishingOrderSyncServiceImpl.syncAllPendingOrders()` 改为扫描处理中订单，以及近 7 天内尚无公开发布链接的订单。
- 订单同步不再要求 `order.status === 1` 才提取 URL；只要响应体里出现非 `ruan.net` 的公开 URL 就写入 `published_article_links`。
- 每次订单同步都会软删除同文章/同计划下的软盟内部稿件链接，避免后台链接继续出现在台账。
- 已手动执行一次订单同步：7 个订单同步成功，6 条真实公开 URL 已写入，剩余 1 条红商网订单仍未返回 URL，将继续轮询。

## 验证
- `tests/apis/publishing-order-sync.service.test.ts` 新增覆盖迟到 URL、状态 4 提取公开 URL、内部稿件链接清理。
