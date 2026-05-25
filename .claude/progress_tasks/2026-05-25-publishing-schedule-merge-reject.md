# 发布管理优化：合并服务 + 驳回按钮 + 图标化

> 日期：2026-05-25

## 变更摘要

1. **合并 service 层**：删除独立的 `PublishingScheduleServiceImpl`，将 `listPublishingSchedule`、`updateSchedule`、`rejectPublish` 三个方法合并到 `ArticleServiceImpl`
2. **新增驳回接口**：`PUT /api/publishing-schedule/:id/reject`，sysadmin/admin（非创建者）可驳回 publishing 状态文章
3. **状态机扩展**：`publishing` 状态新增 `manual_writing` 和 `draft` 转换
4. **前端图标化**：编辑计划按钮改为 `EditOutlined` 图标，新增 `RollbackOutlined` 驳回图标（带 Popconfirm 确认）
5. **已删除文章过滤**：发布计划列表和更新接口添加 `deletedAt: null` 过滤条件

## 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apis/service/article.service.ts` | 修改 | 添加 listPublishingSchedule/updateSchedule/rejectPublish 接口方法 |
| `apis/service/impl/article.service.impl.ts` | 修改 | 实现三个方法 + 状态机更新 + deletedAt 过滤 |
| `apis/controller/publishing-schedule.controller.ts` | 重写 | 改用 createArticleService() + 新增 rejectPublishingSchedule |
| `apis/routes/publishing-schedule.routes.ts` | 修改 | 新增 PUT /:id/reject 路由 |
| `apis/schema/publishing-schedule.schema.ts` | 修改 | 新增 rejectPublishingScheduleSchema |
| `apis/service/publishing-schedule.service.ts` | 删除 | 合并到 article.service.ts |
| `apis/service/impl/publishing-schedule.service.impl.ts` | 删除 | 合并到 article.service.impl.ts |
| `pages/publish/index.tsx` | 修改 | 图标化 + 驳回按钮 + rejectingId 状态 |
| `tests/apis/publishing-schedule.service.test.ts` | 修改 | 改用 ArticleServiceImpl + 方法名更新 + deletedAt 断言 |
| `tests/apis/publishing-schedule.controller.test.ts` | 修改 | mock 改为 ArticleServiceImpl + 新增 21 个 reject 测试 |

## 测试结果

- publishing-schedule.service.test.ts: 113 passed
- publishing-schedule.controller.test.ts: 137 passed
- publishing-schedule.entity.test.ts: 53 passed
- 总计 303 测试全通过

## 关键技术决策

1. 驳回目标状态根据 writeMode 决定：manual→manual_writing, AI→draft
2. 驳回权限与审核一致：创建者不能驳回自己的文章（职责分离）
3. Controller 通过 `createArticleService()` 工厂获取服务，统一入口
