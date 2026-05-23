# TDD 执行报告：auth.controller.test.ts

## 测试文件
`tests/apis/auth.controller.test.ts`

## 被测文件
`apis/controller/auth.controller.ts`

## 测试概要

| 指标 | 值 |
|------|-----|
| 测试用例总数 | 89 |
| 通过 | 89 |
| 失败 | 0 |
| 跳过 | 0 |
| 执行时间 | ~9.8s |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | 89.58% |
| 分支覆盖率 (Branches) | 86.36% |
| 函数覆盖率 (Functions) | 100% |
| 行覆盖率 (Lines) | 89.36% |

## 未覆盖行

- **第 123-124 行**: `saveSelection` 中 `!user` 防御性检查 — authMiddleware 保证 req.user 已设置，此分支不可达
- **第 163-164 行**: `getAccessibleCompanies` 中 `!user` 防御性检查 — 同上
- **第 192-193 行**: `getAccessibleProjects` 中 `!user` 防御性检查 — 同上
- **第 229-230 行**: `getContext` 中 `!user` 防御性检查 — 同上
- **第 265-266 行**: `getCompanyDetail` 中 `!user` 防御性检查 — 同上

> 注：以上 5 处未覆盖代码均为防御性 null 检查，由于 authMiddleware 在路由层保证 req.user 已赋值，这些分支在集成测试中理论不可达。100% 函数覆盖率已达成。

## 测试用例分布

### POST /api/auth/login（18个测试）
- 参数验证（5个）：用户名/密码缺失、空字符串
- 类型验证（3个）：username/password 非字符串、数组类型
- 长度验证（2个）：用户名超100字符、密码超200字符
- 认证失败（2个）：用户不存在、密码错误
- 权限错误（2个）：无可访问公司（LoginSelectionError）、view角色无可访问项目
- 成功登录（3个）：sysadmin、admin、view 三种角色
- 降级处理（2个）：选中公司不可用时降级、选中项目不可用时降级
- 边界情况（1个）：sysadmin无项目时 selected_project 为 null
- 异常处理（2个）：服务抛出带消息错误、无消息错误
- 公开路由验证（1个）：确认 login 不需要 authMiddleware

### POST /api/auth/logout（4个测试）
- 无 token 返回 401
- sysadmin/admin/view 三种角色成功登出

### GET /api/auth/verify（8个测试）
- middleware 层拦截（5个）：无 header、无 Bearer 前缀、空 token、过期 token、错误 secret
- 成功验证（3个）：sysadmin/admin/view 三种角色

### PUT /api/auth/selection（12个测试）
- 无 token 返回 401
- 参数验证（5个）：company_id 缺失、空 body、负数、零、project_id 负数
- 权限错误（2个）：无权选择公司、无权选择项目
- 成功保存（2个）：仅 company_id、company_id + project_id
- 异常处理（2个）：服务抛出带消息错误、无消息错误

### GET /api/auth/companies（7个测试）
- 无 token 返回 401
- sysadmin 返回所有公司
- admin 返回自己公司
- view 返回自己公司
- 无公司返回空数组
- 公司已禁用返回空数组
- 异常处理（2个，覆盖 error 和 no-message 两个分支）

### GET /api/auth/projects（9个测试）
- 无 token 返回 401
- 参数验证（3个）：company_id 缺失、NaN、负数
- sysadmin 返回项目
- admin 返回运营项目
- view 返回查看项目
- 公司禁用时返回空
- 异常处理（2个）

### GET /api/auth/context（6个测试）
- 无 token 返回 401
- 无 company_id 返回空项目列表
- 有 company_id 返回公司+项目
- admin/view 角色测试
- 异常处理（2个）

### GET /api/auth/companies/:id（13个测试）
- 无 token 返回 401
- 参数验证（4个）：非数字 ID、NaN、负数、零
- sysadmin 查询任意公司
- admin 查询自己公司
- 空用户列表
- admin/view 查询其他公司返回 403
- sysadmin 可查询任何公司
- 异常处理（2个）

### 额外边界测试（4个测试）
- saveSelection: project_id 为零返回 400
- saveSelection: company_id 为非数字字符串返回 400
- getContext: company_id 为无效字符串返回空项目列表
- getCompanyDetail: 浮点 ID 被截断为有效整数

## Mock 策略

- 使用 `jest.mock` mock `db.util` 模块（getPrisma、closePrisma）
- 通过 `mockPrisma()` 辅助函数统一创建 prisma mock 对象
- `bcrypt.compare` 使用 `jest.spyOn` 进行 mock
- JWT token 使用真实签名（secret='test-secret'），保证 middleware 验证通过

## 执行日期
2026-05-24
