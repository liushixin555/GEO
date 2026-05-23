# TDD 执行报告：auth.controller.test.ts

## 测试文件
`tests/apis/auth.controller.test.ts`

## 被测文件
`apis/controller/auth.controller.ts`

## 测试概要

| 指标 | 值 |
|------|-----|
| 测试用例总数 | 72 |
| 通过 | 72 |
| 失败 | 0 |
| 跳过 | 0 |
| 执行时间 | ~6.9s |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | 95.94% |
| 分支覆盖率 (Branches) | 93.1% |
| 函数覆盖率 (Functions) | 100% |
| 行覆盖率 (Lines) | 95.83% |

## 未覆盖行

- **第 85-86 行**: `verify` 函数中 token 缺失时的 `fail(res, 401, '未提供token')` — 因为 `authMiddleware` 在请求到达 controller 之前已拦截无 token 请求，此分支不可达
- **第 92 行**: `verify` 函数中 token 无效时的 `fail(res, 401, 'token无效或已过期')` — 因为 `authMiddleware` 已拦截无效 token，此分支不可达

> 注：以上未覆盖代码为架构设计导致的理论不可达代码（authMiddleware 与 controller 重复校验），非测试遗漏。

## 测试用例分布

### POST /api/auth/login（18个测试）
- 参数验证（5个）：用户名/密码缺失、空字符串
- 认证失败（2个）：用户不存在、密码错误
- 权限错误（2个）：无可访问公司（LoginSelectionError）、view角色无可访问项目
- 成功登录（3个）：sysadmin、admin、view 三种角色
- 降级处理（2个）：选中公司不可用时降级、选中项目不可用时降级
- 边界情况（2个）：sysadmin无项目时 selected_project 为 null
- 异常处理（2个）：服务抛出带消息错误、无消息错误
- 公开路由验证（1个）：确认 login 不需要 authMiddleware

### POST /api/auth/logout（4个测试）
- 无 token 返回 401
- sysadmin/admin/view 三种角色成功登出

### GET /api/auth/verify（8个测试）
- middleware 层拦截（5个）：无 header、无 Bearer 前缀、空 token、过期 token、错误 secret
- 成功验证（3个）：sysadmin/admin/view 三种角色

### PUT /api/auth/selection（7个测试）
- 无 token 返回 401
- 参数验证（2个）：company_id 缺失、空 body
- 成功保存（2个）：仅 company_id、company_id + project_id
- 异常处理（2个）：服务抛出带消息错误、无消息错误

### GET /api/auth/companies（8个测试）
- 无 token 返回 401
- sysadmin 返回所有公司
- admin 返回自己公司
- view 返回自己公司
- 无公司返回空数组
- 公司已禁用返回空数组
- 异常处理（2个）

### GET /api/auth/projects（10个测试）
- 无 token 返回 401
- 参数验证（2个）：company_id 缺失、NaN
- sysadmin 返回项目
- admin 返回运营项目
- view 返回查看项目
- 公司禁用时返回空
- 异常处理（2个）

### GET /api/auth/context（7个测试）
- 无 token 返回 401
- 无 company_id 返回空项目列表
- 有 company_id 返回公司+项目
- admin/view 角色测试
- 异常处理（2个）

### GET /api/auth/companies/:id（10个测试）
- 无 token 返回 401
- 参数验证（2个）：非数字 ID、NaN
- sysadmin 查询任意公司
- admin 查询自己公司
- 空用户列表
- admin/view 查询其他公司返回 403
- sysadmin 可查询任何公司
- 异常处理（2个）

## Mock 策略

- 使用 `jest.mock` mock `db.util` 模块（getPrisma、closePrisma）
- 通过 `mockPrisma()` 辅助函数统一创建 prisma mock 对象
- `bcrypt.compare` 使用 `jest.spyOn` 进行 mock
- JWT token 使用真实签名（secret='test-secret'），保证 middleware 验证通过

## 执行日期
2026-05-23
