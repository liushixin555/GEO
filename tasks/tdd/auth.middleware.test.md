# TDD 执行报告：auth.middleware.ts

**日期**: 2026-05-23
**文件**: `apis/middleware/auth.middleware.ts`
**测试文件**: `tests/apis/middleware/auth.middleware.test.ts`

## 源码分析

`auth.middleware.ts` 导出两个函数：

1. **`authMiddleware(req, res, next)`** — JWT 认证中间件
   - 检查 `authorization` header 是否存在且以 `Bearer ` 开头
   - 使用 `jwt.verify()` 验证 token
   - 成功时将 decoded payload 赋值给 `req.user`
   - 失败时返回 401（未登录 / 登录已过期）

2. **`roleMiddleware(...allowedRoles)`** — 角色权限中间件工厂
   - 检查 `req.user` 是否存在
   - 检查用户角色是否在允许列表中
   - 不匹配时返回 401（未登录）或 403（无权限）

## 测试用例设计（22 个测试）

### authMiddleware（12 个测试）

| # | 场景 | 预期结果 |
|---|------|---------|
| 1 | authorization header 缺失 | 401 未登录 |
| 2 | authorization header 为空字符串 | 401 未登录 |
| 3 | header 以 Basic 开头 | 401 未登录 |
| 4 | header 是 Bearer 无空格 | 401 未登录 |
| 5 | header 是 Token xxx 格式 | 401 未登录 |
| 6 | token 完全无效 | 401 登录已过期 |
| 7 | token 已过期 | 401 登录已过期 |
| 8 | token 用错误密钥签名 | 401 登录已过期 |
| 9 | Bearer 后跟空 token | 401 登录已过期 |
| 10 | 有效 token + 完整 payload | next() + req.user 设置正确 |
| 11 | companyId 为 null 的 payload | next() + req.user.companyId=null |
| 12 | 不包含 companyId 的 payload | next() + req.user 正确 |

### roleMiddleware（10 个测试）

| # | 场景 | 预期结果 |
|---|------|---------|
| 13 | req.user 未设置 | 401 未登录 |
| 14 | req.user 为 undefined | 401 未登录 |
| 15 | 角色不在允许列表 | 403 无权限 |
| 16 | view 角色只允许 admin | 403 无权限 |
| 17 | 允许列表为空 | 403 无权限 |
| 18 | 角色匹配单个允许角色 | next() |
| 19 | 角色匹配多个允许角色之一 | next() |
| 20 | sysadmin 角色匹配 | next() |
| 21 | view 角色匹配 | next() |
| 22 | AuthPayload 集成验证 | 全字段正确 |

## 测试结果

```
PASS api tests/apis/middleware/auth.middleware.test.ts
  authMiddleware
    无 authorization header
      ✓ 应该返回 401 当 authorization header 缺失时
      ✓ 应该返回 401 当 authorization header 为空字符串时
    authorization header 格式错误
      ✓ 应该返回 401 当 header 以 Basic 开头
      ✓ 应该返回 401 当 header 是 Bearer 但没有空格分隔
      ✓ 应该返回 401 当 header 是 Token xxx 格式
    无效 token
      ✓ 应该返回 401 当 token 完全无效时
      ✓ 应该返回 401 当 token 已过期时
      ✓ 应该返回 401 当 token 用错误密钥签名时
      ✓ 应该返回 401 当 Bearer 后跟空 token 时
    有效 token
      ✓ 应该调用 next() 并设置 req.user 当 token 有效时
      ✓ 应该正确解析包含 companyId 为 null 的 payload
      ✓ 应该正确解析不包含 companyId 的 payload
  roleMiddleware
    req.user 不存在
      ✓ 应该返回 401 当 req.user 未设置时
      ✓ 应该返回 401 当 req.user 为 undefined 时
    角色不匹配
      ✓ 应该返回 403 当用户角色不在允许列表中
      ✓ 应该返回 403 当用户角色为 view 但只允许 admin
      ✓ 应该返回 403 当允许列表为空时（任何角色都不匹配）
    角色匹配
      ✓ 应该调用 next() 当用户角色匹配单个允许角色
      ✓ 应该调用 next() 当用户角色匹配多个允许角色之一
      ✓ 应该调用 next() 当用户角色为 sysadmin 且允许 sysadmin
      ✓ 应该调用 next() 当用户角色为 view 且允许 view
    AuthPayload 集成验证
      ✓ 应该正确携带 userId, username, role, companyId 字段

Test Suites: 1 passed, 1 total
Tests:       22 passed, 22 total
```

## 覆盖率

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
 auth.middleware.ts |     100 |      100 |     100 |     100 |
--------------------|---------|----------|---------|---------|-------------------
```

**覆盖率: 100%** — Statements、Branches、Functions、Lines 全部 100%。

## 覆盖分支分析

- `!authHeader` → ✓ 空/缺失 header 测试
- `!authHeader.startsWith('Bearer ')` → ✓ Basic/Bearer/Token 格式测试
- `catch` (jwt.verify 失败) → ✓ 无效/过期/错误密钥/空 token 测试
- `!req.user` → ✓ user 未设置/undefined 测试
- `!allowedRoles.includes(req.user.role)` → ✓ 角色不匹配/空列表测试
