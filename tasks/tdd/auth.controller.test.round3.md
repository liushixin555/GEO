# TDD 执行报告：Auth Controller 第三轮补全

## 执行时间
2026-05-25（第三轮补全）

## 测试结果
- 测试套件：1 passed
- 测试用例：158 passed, 0 failed（新增 32 个用例）
- 覆盖率：Stmts 100%, Branch 100%, Funcs 100%, Lines 100%

## 覆盖率变化
| 指标 | 第二轮 | 第三轮 |
|------|--------|--------|
| Stmts | 100% | 100% |
| Branch | 100% | 100% |
| Funcs | 100% | 100% |
| Lines | 100% | 100% |

## 新增测试用例（32个）

### Logout 直接单元测试（4个）
- logout should return success when authHeader is undefined (no token to revoke)
- logout should return success when authHeader does not start with Bearer
- logout should revoke token when valid Bearer header present (direct call)
- logout should return success when req.user is undefined (no userId in log)

### getCompanyDetail 直接单元测试（6个）
- getCompanyDetail should return 403 when admin has null companyId
- getCompanyDetail should return 200 when admin queries own company with matching companyId
- getCompanyDetail should return 403 when admin queries different company
- getCompanyDetail should return 200 when sysadmin queries any company (direct)
- getCompanyDetail should return 400 when id is negative via direct call
- getCompanyDetail should return 400 when id is zero via direct call

### getContext 直接单元测试（5个）
- getContext should return 400 when company_id is negative string (direct)
- getContext should return 400 when company_id is zero string (direct)
- getContext should return 400 when company_id is NaN string (direct)
- getContext should return companies only when company_id is empty string
- getContext should return companies and projects with valid company_id (direct)

### getAccessibleProjects 直接单元测试（4个）
- getAccessibleProjects should return 400 when company_id is negative (direct)
- getAccessibleProjects should return 400 when company_id is zero (direct)
- getAccessibleProjects should return 400 when company_id is NaN (direct)
- getAccessibleProjects should return projects with valid company_id (direct)

### getAccessibleCompanies 直接单元测试（2个）
- getAccessibleCompanies should return companies for sysadmin (direct)
- getAccessibleCompanies should return 500 when service throws (direct)

### Login 直接单元测试（8个）
- login should return 400 when both username and password are missing (direct)
- login should return 400 when username is empty string (direct)
- login should return 400 when password is empty string (direct)
- login should return 400 when both username and password are empty (direct)
- login should return 401 when user not found (direct)
- login should return 401 for wrong password (direct)
- login should return 200 on success (direct)
- login should return 401 on non-Error thrown (direct)

### saveSelection 直接单元测试（3个）
- saveSelection should return 403 on PermissionDeniedError (direct)
- saveSelection should return 500 on generic error (direct)
- saveSelection should handle float company_id (parseInt truncation)

## 测试策略说明

第三轮采用**直接调用控制器函数**的方式，针对 8 个导出函数（login、logout、verify、saveSelection、getAccessibleCompanies、getAccessibleProjects、getContext、getCompanyDetail）进行全覆盖的边界验证：

1. **logout 直接测试**：验证无 Bearer header / 非 Bearer header / req.user 为 undefined 时控制器仍返回成功
2. **getCompanyDetail 直接测试**：覆盖 admin companyId=null 边界条件（line 175 `user.companyId == null` 子分支）
3. **getContext / getAccessibleProjects 直接测试**：覆盖负数 / 零 / NaN 的 company_id 验证
4. **login 直接测试**：补全空值 / 空字符串 / 认证失败 / 成功等完整路径
5. **saveSelection 直接测试**：覆盖 PermissionDeniedError / 通用错误 / parseFloat 截断

## 测试用例总览（完整 158 个）

| 函数 | HTTP 集成测试 | 直接单元测试 | 合计 |
|------|--------------|-------------|------|
| login | 23 | 12 | 35 |
| logout | 6 | 4 | 10 |
| verify | 7 | 2 | 9 |
| saveSelection | 14 | 15 | 29 |
| getAccessibleCompanies | 9 | 2 | 11 |
| getAccessibleProjects | 10 | 4 | 14 |
| getContext | 7 | 5 | 12 |
| getCompanyDetail | 13 | 6 | 19 |
| Additional edge cases | 19 | 0 | 19 |
| **合计** | **108** | **50** | **158** |
