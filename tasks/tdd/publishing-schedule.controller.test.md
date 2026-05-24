# publishing-schedule.controller.test.ts — TDD 执行报告

## 源文件
- `apis/controller/publishing-schedule.controller.ts`

## 测试文件
- `tests/apis/publishing-schedule.controller.test.ts`

## 测试概要

| 指标 | 数值 |
|------|------|
| 测试总数 | 86 |
| 通过 | 86 |
| 失败 | 0 |
| 语句覆盖率 | 100% |
| 分支覆盖率 | 100% |
| 函数覆盖率 | 100% |
| 行覆盖率 | 100% |

## 变更记录

### 第三轮补全（2026-05-24）

**新增 21 个用例（65→86）：**

GET 边界场景（8 个集成测试）：
- status=published/publish_failed 两种合法状态值传递
- pageSize 精确边界（100上限、1下限）
- 负数 page 回退默认值
- search 空字符串传递
- NaN-like 字符串（"undefined"/"null"）page/pageSize 回退默认值

PUT 边界场景（13 个单元测试）：
- AppError 子类直接调用覆盖（ForbiddenError/403、BusinessError/400、NotFoundError/404）
- 仅传 schedule_type（无 scheduled_publish_at）路径
- scheduled_publish_at 为 object/array 时 controller 层拦截
- ISO date-only 格式（'2025-06-01'）验证
- admin 用户传递 schedule_type 路径
- schedule_type=undefined 时 `?? null` 转换
- schedule_type 为 number/boolean/object/空字符串类型拒绝

### 第二轮补全（2026-05-24）

**修复问题：**
- 修复 12 个因 schema 验证中间件拦截导致的失败用例
  - `scheduled_publish_at` 类型验证（number/boolean/object/array）→ 更新期望消息为 schema 验证格式
  - `scheduled_publish_at: null` → 更新为 schema 验证拦截（400）
  - 空 body → 更新为 schema 验证拦截（400）
  - 无效日期格式 → 更新为 schema 验证拦截
  - 无效 schedule_type → 更新为 schema 验证拦截
  - `schedule_type: null` 请求体修复（发送有效 scheduled_publish_at）
- 新增 21 个单元测试覆盖死代码路径（绕过 schema 验证直接调用 controller 函数）

**关键发现：**
- Controller 中的 schedule_type 验证（L53-56）、scheduled_publish_at 类型检查（L60-63）、日期格式检查（L64-67）为防御性代码，被 schema 验证中间件提前拦截，通过 HTTP 无法到达
- 通过直接调用 controller 函数（bypass schema）实现 100% 行/分支覆盖
- 覆盖非 Error 类型抛出（L84）的 catch 分支

## 测试用例清单

### GET /api/publishing-schedule (listPublishingSchedule) — 14 个集成测试

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

### PUT /api/publishing-schedule/:id (updatePublishingSchedule) — 24 个集成测试

15. `should return 401 without token` — 未携带 token 返回 401
16. `should return 403 for view role` — view 角色无权限返回 403
17. `should return 400 when id is not a number` — 非数字 ID 返回 400
18. `should return 400 when scheduled_publish_at is a number (schema validation)` — schema 拦截数字类型
19. `should return 400 when scheduled_publish_at is a boolean (schema validation)` — schema 拦截布尔类型
20. `should return 400 when scheduled_publish_at is an object (schema validation)` — schema 拦截对象类型
21. `should update successfully with a valid date string` — 有效日期字符串更新成功
22. `should update successfully for admin role` — admin 角色更新成功
23. `should return 400 when scheduled_publish_at is null (schema validation)` — schema 拦截 null
24. `should return 400 when body is empty (schema validation)` — schema 拦截空 body
25. `should return 404 when article does not exist` — 文章不存在返回 404
26. `should return 400 when article status is not editable` — 不可编辑状态返回 400
27. `should return 500 with fixed message for generic service errors` — 服务异常返回 500
28. `should return 500 with default message when service error has no message` — 服务异常无消息时返回默认消息
29. `should handle id=0 as valid integer` — id=0 边界情况
30. `should handle negative id` — 负数 id 处理
31. `should handle float id by truncating to integer` — 浮点 id 截断
32. `should return 400 when scheduled_publish_at is an array (schema validation)` — schema 拦截数组
33. `should return 400 when scheduled_publish_at is empty string (schema validation)` — schema 拦截空字符串
34. `should return 400 when schedule_type is invalid (schema validation)` — schema 拦截无效排期类型
35. `should update successfully with schedule_type=asap` — schedule_type=asap 更新成功
36. `should update successfully with schedule_type=scheduled` — schedule_type=scheduled 更新成功
37. `should update successfully with schedule_type=after` — schedule_type=after 更新成功
38. `should update with schedule_type=null` — schedule_type=null 更新成功

### GET 边界情况 — 15 个集成测试

39. `should use default page when page is non-numeric` — 非数字 page 回退默认值
40. `should use default pageSize when pageSize is non-numeric` — 非数字 pageSize 回退默认值
41. `should use page=1 when page is 0` — page=0 时回退默认值
42. `should clamp negative pageSize to 1` — 负数 pageSize 钳制为 1
43. `should pass projectId as undefined when projectId is empty string` — 空 projectId 为 undefined
44. `should return multiple items correctly` — 多条数据返回正确
45. `should handle large page number` — 大页码处理
46. `should handle special characters in search` — 特殊字符搜索
47. `should handle projectId with value 0` — projectId=0 处理
48. `should return correct pagination metadata for page 2` — 第 2 页分页元数据正确
49. `should return 403 when admin has no access to the article` — admin 无权限返回 403
50. `should return 400 when scheduled_publish_at is invalid date string (schema validation)` — schema 拦截无效日期
51. `should filter out invalid status parameter` — 无效 status 过滤为 undefined
52. `should filter out non-numeric projectId` — 非数字 projectId 过滤为 undefined
53. `should clamp pageSize to max 100` — pageSize 上限 100

### updatePublishingSchedule 单元测试（绕过 schema） — 12 个测试

54. `should return 400 when schedule_type is invalid (controller validation)` — 覆盖 L54-55
55. `should return 400 when scheduled_publish_at is a number (controller validation)` — 覆盖 L61-62
56. `should return 400 when scheduled_publish_at is a boolean (controller validation)` — 覆盖 L61-62
57. `should return 400 when scheduled_publish_at is invalid date string (controller validation)` — 覆盖 L65-66
58. `should return 200 when scheduled_publish_at is null (controller allows null)` — 控制器允许 null
59. `should return 200 when scheduled_publish_at is undefined (controller allows missing)` — 控制器允许缺失
60. `should return 200 when scheduled_publish_at is empty string (controller allows empty)` — 控制器允许空字符串
61. `should return 500 when non-Error value is thrown` — 覆盖 L84 非 Error 抛出
62. `should return 401 when req.user is missing` — 直接调用验证 401
63. `should return 400 when id is NaN` — 直接调用验证 400

### listPublishingSchedule 单元测试（绕过 schema） — 2 个测试

64. `should return 500 when non-Error value is thrown` — 非 Error 抛出返回 500
65. `should return 401 when req.user is missing` — 直接调用验证 401

### GET 补充边界场景 — 8 个集成测试

66. `should pass status=published correctly` — status=published 传递
67. `should pass status=publish_failed correctly` — status=publish_failed 传递
68. `should accept pageSize=100 as exact max boundary` — pageSize=100 上限边界
69. `should accept pageSize=1 as exact min boundary` — pageSize=1 下限边界
70. `should use page=1 when page is negative` — 负数 page 回退默认值
71. `should pass search as empty string when search= is provided` — 空字符串搜索
72. `should handle NaN-like page value like "undefined"` — NaN-like page 回退
73. `should handle NaN-like pageSize value like "null"` — NaN-like pageSize 回退

### PUT 补充边界场景 — 13 个单元测试

74. `should return 403 for ForbiddenError via unit test` — ForbiddenError 直接调用
75. `should return 400 for BusinessError via unit test` — BusinessError 直接调用
76. `should return 404 for NotFoundError via unit test` — NotFoundError 直接调用
77. `should update with only schedule_type (no scheduled_publish_at) via unit test` — 仅传 schedule_type
78. `should return 400 when scheduled_publish_at is object via unit test` — object 类型拦截
79. `should return 400 when scheduled_publish_at is array via unit test` — array 类型拦截
80. `should allow valid ISO date-only format via unit test` — ISO date-only 格式
81. `should pass schedule_type correctly for admin user via unit test` — admin 传 schedule_type
82. `should handle schedule_type=undefined (not in body) via unit test` — schedule_type 缺失时 `?? null`
83. `should reject schedule_type=number via unit test` — number 类型 schedule_type 拒绝
84. `should reject schedule_type=boolean via unit test` — boolean 类型 schedule_type 拒绝
85. `should reject schedule_type=object via unit test` — object 类型 schedule_type 拒绝
86. `should reject schedule_type=empty string via unit test` — 空字符串 schedule_type 拒绝

## 覆盖的代码路径

### listPublishingSchedule
- 正常分页查询路径
- 默认参数处理（page/pageSize 默认值、边界钳制）
- 所有查询参数传递（search, status, projectId）
- userId/role 传递给 service
- 错误处理：有消息 Error、无消息 Error、非 Error 抛出

### updatePublishingSchedule
- 认证检查（401 未授权）
- ID 验证（NaN 检测）
- ID 边界值（0、负数、浮点数）
- schedule_type 验证（schema 层 + controller 层双重覆盖）
- scheduled_publish_at 类型验证（schema 层 + controller 层双重覆盖）
- scheduled_publish_at 日期格式验证（schema 层 + controller 层双重覆盖）
- 正常更新路径（string, null, undefined, 空字符串四种值）
- schedule_type 三个合法值（asap, scheduled, after）+ null
- 权限控制（sysadmin/admin 可访问，view 被拒）
- 错误处理：404 文章不存在、400 不可编辑状态、403 无权限、500 通用错误、非 Error 抛出

## 测试策略

- **集成测试**：使用 supertest 通过完整 HTTP 链路（middleware → route → controller → service mock），覆盖 schema 验证 + controller + 权限控制
- **单元测试**：直接调用 controller 函数（`updatePublishingSchedule`/`listPublishingSchedule`），使用 mock req/res 对象绕过 schema 验证中间件，覆盖被 schema 拦截的防御性代码路径
- **Mock 策略**：Mock `PublishingScheduleServiceImpl`，控制 service 层返回值和异常
- **认证测试**：覆盖无 token（401）、view 角色（403）、admin/sysadmin 正常访问
- **参数验证**：覆盖所有参数类型边界和默认值（集成测试验证 schema 层，单元测试验证 controller 层）
- **错误分支**：覆盖所有已知错误消息的异常处理路径，包括非 Error 类型抛出

## Service 测试同步修复

同步修复 `publishing-schedule.service.test.ts` 中因 `updateSchedule` 方法签名变更导致的 TypeScript 编译错误：
- 所有 `updateSchedule(id, scheduledPublishAt)` 调用补全第 3 个参数 `scheduleType: null`
- 所有 `updateSchedule(id, scheduledPublishAt, userId, role)` 调用调整为 `updateSchedule(id, scheduledPublishAt, scheduleType, userId, role)`
- 更新 mock 期望值包含 `scheduleType: null` 字段
- 更新 list 映射期望值包含 `schedule_type: null` 字段
