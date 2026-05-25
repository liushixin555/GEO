# publishing-schedule.controller.ts TDD 第三轮补全

**日期**: 2026-05-25
**文件**: `apis/controller/publishing-schedule.controller.ts`
**测试文件**: `tests/apis/publishing-schedule.controller.test.ts`

## 概述

在第二轮 83 个用例基础上补全至 **123 个用例**，实现 **100% 四维覆盖率**。

## 覆盖率结果

| 维度 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## 本轮新增测试（40 个）

### 1. listPublishingSchedule AppError catch 分支覆盖（6 个）
- NotFoundError → 404
- BusinessError → 400
- ForbiddenError → 403
- plain AppError → 自定义 statusCode
- generic Error → 500
- non-Error throw → 500

### 2. updatePublishingSchedule AppError 类型覆盖（3 个）
- ConflictError → 409
- plain AppError → 自定义 statusCode
- generic Error → 500 (unit test)

### 3. 安全注入测试（7 个）
- SQL 注入 search 参数
- XSS search 参数
- SQL 注入 id 参数 (parseInt 截断)
- prototype pollution body
- 超长 search 字符串
- 超大 page 数值
- 超大 pageSize (clamp 100)

### 4. 响应结构验证（5 个）
- 分页列表完整结构（无 message 字段）
- 列表项全部字段校验
- 更新成功结构
- 400 错误结构
- 500 错误结构

### 5. 角色矩阵测试（6 个）
- sysadmin 列表
- admin 列表
- view 列表
- sysadmin 更新
- admin 更新
- view 更新（403）

### 6. 边界值补充测试（9 个）
- 三角色 × status=publishing
- projectId 浮点值（parseInt 截断）
- 负数 projectId
- 重复 query 参数
- 超长 scheduled_publish_at
- schedule_type=0 (falsy 非 null/undefined)
- schedule_type=false (falsy 非 null/undefined)
- 全部有效 status 值遍历
- 大小写敏感 status (Publishing 无效)

### 7. 日志多样性测试（4 个）
- list 失败 generic Error → console.error 调用
- list 失败 AppError → 不调用 console.error
- update 失败 generic Error → console.error 调用
- update 失败 AppError → 不调用 console.error

## 关键修复

1. **Line 37 覆盖**：原第二轮测试未覆盖 `listPublishingSchedule` 中 AppError catch 分支。通过直接调用 controller 函数并模拟 service 抛出 AppError 及其子类覆盖。
2. **paginate 响应结构**：`paginate()` 不返回 `message` 字段，修正响应结构断言。

## 测试维度统计

| 维度 | 用例数 |
|------|--------|
| 认证授权 (401/403) | 8 |
| 参数验证 | 25 |
| AppError 类型覆盖 | 9 |
| 安全注入 | 7 |
| 响应结构 | 5 |
| 角色矩阵 | 6 |
| 边界值 | 30 |
| 日志多样性 | 4 |
| 成功路径 | 29 |
| **总计** | **123** |
