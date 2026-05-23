# user.controller.test.ts TDD 执行报告

## 基本信息
- **测试文件**: tests/apis/user.controller.test.ts
- **源文件**: apis/controller/user.controller.ts
- **执行日期**: 2026-05-23
- **测试数量**: 44 个测试
- **测试结果**: 44 passed, 0 failed

## 测试覆盖率

| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|-----------|
| Statements | 100% | - |
| Branch | 100% | - |
| Functions | 100% | - |
| Lines | 100% | - |

## 测试用例清单

### GET /api/users (11个)
1. should return 401 without token
2. should return 403 for view role
3. should return 403 for admin role
4. should return users list for sysadmin
5. should support search parameter
6. should support role filter
7. should support status filter
8. should support pagination parameters
9. should return 500 on database error
10. should return 500 with fallback message when error has no message
11. should support status=false filter

### GET /api/users/:id (5个)
1. should return 400 for invalid id
2. should return user detail for sysadmin
3. should return 404 for non-existent user
4. should return 500 on database error
5. should return 500 with fallback message when error has no message

### POST /api/users (9个)
1. should return 400 when required fields are missing
2. should return 400 when password is missing
3. should return 400 when role is missing
4. should return 400 when cn_name is missing
5. should return 400 with correct message when required fields missing
6. should create user successfully
7. should return 409 for duplicate username
8. should return 500 on database error during create
9. should return 500 with fallback message when create error has no message

### PUT /api/users/:id (8个)
1. should return 400 for invalid id
2. should update user successfully
3. should reject role change for sysadmin user
4. should allow updating cn_name for sysadmin user
5. should return 404 for non-existent user
6. should update password successfully
7. should update status successfully
8. should return 500 with fallback message when update error has no message

### Admin permission denied (sysadmin-only) (5个)
1. should return 403 for admin on list users
2. should return 403 for admin on get user
3. should return 403 for admin on create user
4. should return 403 for admin on update user
5. should return 403 for admin on delete user

### DELETE /api/users/:id (6个)
1. should return 400 for invalid id
2. should return 404 for non-existent user
3. should delete user successfully
4. should reject deleting sysadmin user
5. should return 500 on database error
6. should return 500 with fallback message when delete error has no message

## 本次新增测试（8个）

本次从 36 个测试补全至 44 个，新增 8 个测试用例，覆盖率从 84.37% Branch 提升至 100%：

1. **listUsers fallback message** — 错误无消息时返回 '获取用户列表失败'
2. **listUsers status=false** — 验证 status=false 过滤参数正确传递
3. **getUser fallback message** — 错误无消息时返回 '获取用户详情失败'
4. **createUser cn_name missing** — 验证 cn_name 缺失返回 400
5. **createUser 400 message** — 验证必填字段缺失的错误消息内容
6. **createUser fallback message** — 错误无消息时返回 '创建用户失败'
7. **updateUser fallback message** — 错误无消息时返回 '更新用户失败'
8. **deleteUser fallback message** — 错误无消息时返回 '删除用户失败'

## 未覆盖分支分析（补全前）

| 行号 | 未覆盖分支 | 原因 | 补全方式 |
|------|-----------|------|----------|
| 18 | `err.message \|\| '获取用户列表失败'` fallback | 测试总是使用有消息的 Error | 新增空消息 Error 测试 |
| 33 | `err.message \|\| '获取用户详情失败'` fallback | 同上 | 同上 |
| 52 | `err.message \|\| '创建用户失败'` fallback | 同上 | 同上 |
| 68 | `err.message \|\| '更新用户失败'` fallback | 同上 | 同上 |
| 84 | `err.message \|\| '删除用户失败'` fallback | 同上 | 同上 |
