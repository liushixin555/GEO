# publishing-schedule.controller.test.ts — TDD 执行报告

## 源文件
- `apis/controller/publishing-schedule.controller.ts`

## 测试文件
- `tests/apis/publishing-schedule.controller.test.ts`

## 测试概要

| 指标 | 数值 |
|------|------|
| 测试总数 | 30 |
| 通过 | 30 |
| 失败 | 0 |
| 行覆盖率 | 100% |
| 分支覆盖率 | 100% |
| 函数覆盖率 | 100% |

## 测试用例清单

### GET /api/publishing-schedule (listPublishingSchedule) — 14 个测试

1. `should return 401 without token` — 未携带 token 返回 401
2. `should return paginated list for sysadmin` — sysadmin 角色分页查询成功
3. `should return paginated list for admin` — admin 角色分页查询成功
4. `should return paginated list for view role` — view 角色分页查询成功
5. `should use default page=1 and pageSize=10 when not provided` — 默认分页参数
6. `should pass search parameter to service` — 传递 search 参数
7. `should pass status parameter to service` — 传递 status 参数
8. `should pass projectId parameter to service` — 传递 projectId 参数
9. `should pass all query parameters together` — 同时传递所有查询参数
10. `should pass userId and role for admin user` — admin 传递 userId 和 role
11. `should pass userId and role for view user` — view 传递 userId 和 role
12. `should return empty list when no results` — 空结果返回空列表
13. `should return 500 when service throws error with message` — 服务异常返回 500 + 错误消息
14. `should return 500 with default message when service error has no message` — 服务异常无消息时返回默认消息

### PUT /api/publishing-schedule/:id (updatePublishingSchedule) — 16 个测试

15. `should return 401 without token` — 未携带 token 返回 401
16. `should return 403 for view role` — view 角色无权限返回 403
17. `should return 400 when id is not a number` — 非数字 ID 返回 400
18. `should return 400 when scheduled_publish_at is not a string (number)` — 数字类型参数返回 400
19. `should return 400 when scheduled_publish_at is not a string (boolean)` — 布尔类型参数返回 400
20. `should return 400 when scheduled_publish_at is not a string (object)` — 对象类型参数返回 400
21. `should update successfully with a valid date string` — 有效日期字符串更新成功
22. `should update successfully for admin role` — admin 角色更新成功
23. `should update successfully when scheduled_publish_at is null` — null 值更新成功（清除计划时间）
24. `should update successfully when scheduled_publish_at is undefined (not sent)` — 未传参数更新成功
25. `should update successfully when body is empty` — 空 body 更新成功
26. `should return 404 when article does not exist` — 文章不存在返回 404
27. `should return 400 when article status is not editable` — 不可编辑状态返回 400
28. `should return 500 when service throws generic error with message` — 服务异常返回 500 + 错误消息
29. `should return 500 with default message when service error has no message` — 服务异常无消息时返回默认消息
30. `should handle id=0 as invalid` — id=0 边界情况

## 覆盖的代码路径

### listPublishingSchedule
- 正常分页查询路径
- 默认参数处理（page/pageSize 默认值）
- 所有查询参数传递（search, status, projectId）
- userId/role 传递给 service
- 错误处理：有消息/无消息

### updatePublishingSchedule
- ID 验证（NaN 检测）
- scheduled_publish_at 类型验证（非 string/null/undefined）
- 正常更新路径（string, null, undefined 三种值）
- 权限控制（sysadmin/admin 可访问，view 被拒）
- 错误处理：404 文章不存在、400 不可编辑状态、500 通用错误
