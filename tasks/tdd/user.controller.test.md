# user.controller.test.ts TDD 执行报告

## 基本信息
- **测试文件**: tests/apis/user.controller.test.ts
- **源文件**: apis/controller/user.controller.ts
- **执行日期**: 2026-05-23
- **测试数量**: 36 个测试
- **测试结果**: 36 passed, 0 failed

## 测试覆盖率

| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|-----------|
| Statements | 100% | - |
| Branch | 84.37% | - |
| Functions | 100% | - |
| Lines | 100% | - |

## 测试用例清单

### GET /api/users (8个)
1. should return 401 without token
2. should return 403 for view role
3. should return 403 for admin role
4. should return users list for sysadmin
5. should support search parameter
6. should support role filter
7. should support status filter
8. should support pagination parameters
9. should return 500 on database error

### GET /api/users/:id (4个)
1. should return 400 for invalid id
2. should return user detail for sysadmin
3. should return 404 for non-existent user
4. should return 500 on database error

### POST /api/users (6个)
1. should return 400 when required fields are missing
2. should return 400 when password is missing
3. should return 400 when role is missing
4. should create user successfully
5. should return 409 for duplicate username
6. should return 500 on database error during create

### PUT /api/users/:id (7个)
1. should return 400 for invalid id
2. should update user successfully
3. should reject role change for sysadmin user
4. should allow updating cn_name for sysadmin user
5. should return 404 for non-existent user
6. should update password successfully
7. should update status successfully

### Admin permission denied (sysadmin-only) (5个)
1. should return 403 for admin on list users
2. should return 403 for admin on get user
3. should return 403 for admin on create user
4. should return 403 for admin on update user
5. should return 403 for admin on delete user

### DELETE /api/users/:id (5个)
1. should return 400 for invalid id
2. should return 404 for non-existent user
3. should delete user successfully
4. should reject deleting sysadmin user
5. should return 500 on database error

## 修复的问题
1. **DELETE 测试修复**: 原测试 mock 了 `delete` 方法但 service 使用软删除（`update` + `deletedAt`）。修正为 mock `update`
2. **新增 getUser 测试**: 补充 GET /api/users/:id 的完整测试
3. **新增更多验证场景**: 添加 password 缺失、role 缺失、status 更新、password 更新等边界用例
4. **新增 admin role 403 测试**: admin 角色也不能访问用户管理（sysadmin-only）
