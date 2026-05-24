# TDD 执行报告：auth.middleware.ts

**日期**: 2026-05-24（更新）
**文件**: `apis/middleware/auth.middleware.ts`
**测试文件**: `tests/apis/middleware/auth.middleware.test.ts`

## 源码分析

`auth.middleware.ts` 导出两个函数：

1. **`authMiddleware(req, res, next)`** — JWT 认证中间件
   - 检查 `authorization` header 是否存在且以 `Bearer ` 开头
   - 使用 `isTokenRevoked()` 检查 token 是否在黑名单中
   - 使用 `jwt.verify()` 验证 token
   - 成功时将 decoded payload 赋值给 `req.user`
   - 失败时返回 401（未登录 / 登录已过期）

2. **`roleMiddleware(...allowedRoles)`** — 角色权限中间件工厂
   - 检查 `req.user` 是否存在（truthy）
   - 检查用户角色是否在允许列表中
   - 不匹配时返回 401（未登录）或 403（无权限）

## 测试用例设计（62 个测试）

### authMiddleware — 无 authorization header（2 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 1 | authorization header 缺失 | 401 未登录 |
| 2 | authorization header 为空字符串 | 401 未登录 |

### authMiddleware — 格式错误（3 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 3 | header 以 Basic 开头 | 401 未登录 |
| 4 | header 是 Bearer 无空格 | 401 未登录 |
| 5 | header 是 Token xxx 格式 | 401 未登录 |

### authMiddleware — 无效 token（4 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 6 | token 完全无效 | 401 登录已过期 |
| 7 | token 已过期 | 401 登录已过期 |
| 8 | token 用错误密钥签名 | 401 登录已过期 |
| 9 | Bearer 后跟空 token | 401 登录已过期 |

### authMiddleware — 有效 token（3 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 10 | 有效 token + 完整 payload | next() + req.user 正确 |
| 11 | companyId 为 null | next() + companyId=null |
| 12 | 不包含 companyId | next() + req.user 正确 |

### roleMiddleware — req.user 不存在（2 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 13 | req.user 未设置 | 401 未登录 |
| 14 | req.user 为 undefined | 401 未登录 |

### roleMiddleware — 角色不匹配（3 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 15 | 角色不在允许列表 | 403 无权限 |
| 16 | view 角色只允许 admin | 403 无权限 |
| 17 | 允许列表为空 | 403 无权限 |

### roleMiddleware — 角色匹配（4 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 18 | 匹配单个允许角色 | next() |
| 19 | 匹配多个允许角色之一 | next() |
| 20 | sysadmin 匹配 | next() |
| 21 | view 匹配 | next() |

### AuthPayload 集成验证（1 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 22 | 全字段验证 | userId/username/role/companyId 全正确 |

### authMiddleware 安全边界（9 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 23 | "bearer" 小写开头 | 401 未登录 |
| 24 | "BEARER" 大写开头 | 401 未登录 |
| 25 | 被篡改的 token | 401 登录已过期 |
| 26 | companyId 为 0 | next() + companyId=0 |
| 27 | 包含额外字段 | next() + 字段保留 |
| 28 | Authorization 只有空格 | 401 未登录 |
| 29 | undefined authorization | 401 未登录 |
| 30 | 已撤销（黑名单）token | 401 登录已过期 |
| 31 | 未撤销的有效 token | next() |

### roleMiddleware 工厂函数特性（3 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 32 | 返回 function 类型 | typeof === 'function' |
| 33 | 独立中间件实例 | 不同角色列表互不影响 |
| 34 | 角色字符串引用匹配 | next() |

### 完整认证+鉴权流程（3 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 35 | 有效 token + 角色匹配 | 通过 |
| 36 | 有效 token + 角色不匹配 | 403 |
| 37 | 无效 token → roleMiddleware | 401 |

### authMiddleware 黑名单交互（3 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 38 | 多个不同 revoked token 全部拒绝 | 401 × 2 |
| 39 | revoked 拒绝 + valid 通过 | 分别正确处理 |
| 40 | 同一 token 多次请求保持 revoked | 401 × 2 |

### authMiddleware Bearer 前缀精确边界（4 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 41 | "BearerX token" | 401 未登录 |
| 42 | "Bearer\t" tab 替代空格 | 401 未登录 |
| 43 | " Bearer token" 前导空格 | 401 未登录 |
| 44 | 正常 "Bearer " + token | next() |

### authMiddleware 特殊 payload（4 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 45 | 中文 username | next() + 正确解码 |
| 46 | emoji username | next() + 正确解码 |
| 47 | MAX_SAFE_INTEGER userId | next() + 正确解码 |
| 48 | 负数 companyId | next() + companyId=-1 |

### roleMiddleware 边界值（6 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 49 | req.user 显式 null | 401 未登录 |
| 50 | 空 role 字符串 | 403 无权限 |
| 51 | 重复 allowedRoles | next() |
| 52 | 不含用户角色 | 403 |
| 53 | 三角色列表 sysadmin 通过 | next() |
| 54 | 三角色列表 view 通过 | next() |

### authMiddleware 错误响应格式一致性（2 个）

| # | 场景 | 预期结果 |
|---|------|---------|
| 55 | 所有 401 包含 code+message | 格式正确 |
| 56 | 未登录消息 vs 过期消息区分 | message 不同 |

### 完整角色组合矩阵（6 个，it.each）

| # | 场景 | 预期结果 |
|---|------|---------|
| 57 | sysadmin only | sysadmin 通过 |
| 58 | admin only | admin 通过 |
| 59 | view only | view 通过 |
| 60 | sysadmin+admin | 两者通过 |
| 61 | admin+view | 两者通过 |
| 62 | 三角色全包含 | 全部通过 |

## 测试结果

```
PASS api tests/apis/middleware/auth.middleware.test.ts (6.484 s)
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
    authMiddleware 安全边界
      ✓ 应该拒绝 "bearer"（小写）开头的 header
      ✓ 应该拒绝 "BEARER"（大写）开头的 header
      ✓ 应该拒绝被篡改的 token（payload 被修改）
      ✓ 应该正确解析 companyId 为 0 的 payload
      ✓ 应该正确解析包含额外字段的 token payload
      ✓ 应该拒绝 Authorization header 只有空格的情况
      ✓ 应该拒绝 undefined authorization header
      ✓ 应该拒绝已被撤销（黑名单）的 token
      ✓ 应该接受未被撤销的有效 token
    roleMiddleware 工厂函数特性
      ✓ 应该返回一个函数
      ✓ 每次调用应该返回独立的中间件实例
      ✓ 应该正确处理角色完全相同但不同对象引用的匹配
    完整认证+鉴权流程
      ✓ 有效 token + 角色匹配 → 通过
      ✓ 有效 token + 角色不匹配 → 403
      ✓ 无效 token → 后续 roleMiddleware 也会 401（未设置 user）
    authMiddleware 黑名单交互
      ✓ 应该拒绝多个已被撤销的不同 token
      ✓ 应该允许未撤销的 token 同时拒绝已撤销的 token
      ✓ 同一个 token 多次请求应保持被撤销状态
    authMiddleware Bearer 前缀精确边界
      ✓ 应该拒绝 "BearerX token"（Bearer 后紧跟非空格字符）
      ✓ 应该拒绝 "Bearer\t"（tab 而非空格）开头的 header
      ✓ 应该拒绝 " Bearer token"（前导空格）的 header
      ✓ 应该接受 "Bearer " 后跟正常 token
    authMiddleware 特殊 payload
      ✓ 应该正确解析包含中文字符的 username
      ✓ 应该正确解析包含 emoji 的 username
      ✓ 应该正确解析大 userId 值
      ✓ 应该正确解析包含负数 companyId 的 payload
    roleMiddleware 边界值
      ✓ 应该返回 401 当 req.user 显式设为 null
      ✓ 应该返回 403 当用户 role 为空字符串
      ✓ 应该正确匹配包含重复角色的 allowedRoles
      ✓ 应该返回 403 当 allowedRoles 包含其他角色但不含用户角色
      ✓ 应该正确处理包含所有三种角色的 allowedRoles（sysadmin 通过）
      ✓ 应该正确处理包含所有三种角色的 allowedRoles（view 通过）
    authMiddleware 错误响应格式一致性
      ✓ 所有 401 响应应该包含 code 和 message 字段
      ✓ 未登录消息（无 Bearer）和过期消息（有 Bearer 但无效）应该不同
    完整角色组合矩阵
      ✓ allowedRoles=["sysadmin"] → pass=["sysadmin"] fail=["admin", "view"]
      ✓ allowedRoles=["admin"] → pass=["admin"] fail=["sysadmin", "view"]
      ✓ allowedRoles=["view"] → pass=["view"] fail=["sysadmin", "admin"]
      ✓ allowedRoles=["sysadmin", "admin"] → pass=["sysadmin", "admin"] fail=["view"]
      ✓ allowedRoles=["admin", "view"] → pass=["admin", "view"] fail=["sysadmin"]
      ✓ allowedRoles=["sysadmin", "admin", "view"] → pass=["sysadmin", "admin", "view"] fail=[]

Test Suites: 1 passed, 1 total
Tests:       62 passed, 62 total
```

## 覆盖率

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |     100 |      100 |     100 |     100 |
 auth.middleware.ts |     100 |      100 |     100 |     100 |
--------------------|---------|----------|---------|---------|-------------------
```

**覆盖率: 100%** — Statements、Branches、Functions、Lines 全部 100%。

## 覆盖分支分析

- `!authHeader` → ✓ 空/缺失/undefined/空格/前导空格 header 测试
- `!authHeader.startsWith('Bearer ')` → ✓ Basic/Bearer/Token/小写/大写/BearerX/tab 格式测试
- `isTokenRevoked(token)` → ✓ 已撤销/未撤销/多 token 撤销/重复请求测试
- `catch` (jwt.verify 失败) → ✓ 无效/过期/错误密钥/空token/篡改token 测试
- `!req.user` → ✓ user 未设置/undefined/null/认证失败后 测试
- `!allowedRoles.includes(req.user.role)` → ✓ 角色不匹配/空列表/空字符串角色/全角色组合矩阵 测试

## 本次更新新增用例（37 → 62，新增 25 个）

1. **黑名单交互深入**：多 token 撤销、revoked+valid 混合、重复请求保持状态
2. **Bearer 前缀精确边界**：BearerX、tab 替代空格、前导空格、正常格式确认
3. **特殊 payload**：中文 username、emoji username、MAX_SAFE_INTEGER userId、负数 companyId
4. **roleMiddleware 边界值**：null user、空 role、重复 allowedRoles、三角色组合
5. **错误响应格式一致性**：code+message 字段存在性验证、未登录 vs 过期消息区分
6. **完整角色组合矩阵**：6 种 allowedRoles 组合 × 3 种角色的穷举验证
