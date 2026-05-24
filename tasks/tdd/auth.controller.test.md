# TDD 执行报告：Auth Controller

## 执行时间
2026-05-24（第二轮补全）

## 测试结果
- 测试套件：1 passed
- 测试用例：124 passed, 0 failed（新增 18 个用例）
- 覆盖率：Stmts 100%, Branch 100%, Funcs 100%, Lines 100%

## 覆盖率变化
| 指标 | 补全前 | 补全后 |
|------|--------|--------|
| Stmts | 89.9% | 100% |
| Branch | 88.09% | 100% |
| Funcs | 100% | 100% |
| Lines | 89.71% | 100% |

## 未覆盖行（补全前）
`17-18, 21-22, 43-44, 49, 65-66, 69-70`

## 新增测试用例（18个）

### verify 防御性检查（2个）
- verify should return 401 when req.user is undefined
- verify should return 401 when getLatestUserState throws

### login Zod 阻断分支 - 类型检查（4个）
- login should return 400 when username is not a string
- login should return 400 when password is not a string
- login should return 400 when username is boolean
- login should return 400 when password is an object

### login Zod 阻断分支 - 长度检查（4个）
- login should return 400 when username exceeds 100 characters
- login should return 400 when password exceeds 200 characters
- login should accept username at exactly 100 characters（边界值）
- login should accept password at exactly 200 characters（边界值）

### saveSelection Zod 阻断分支 - company_id（3个）
- saveSelection should return 400 when company_id parses to NaN
- saveSelection should return 400 when company_id is 0
- saveSelection should return 400 when company_id is negative

### saveSelection Zod 阻断分支 - project_id（3个）
- saveSelection should return 400 when project_id is NaN
- saveSelection should return 400 when project_id is 0
- saveSelection should return 400 when project_id is negative

### saveSelection 正向验证（2个）
- saveSelection should accept project_id as null (bypasses Zod)
- saveSelection should accept project_id as undefined

## 测试策略说明
新增的 18 个用例采用**直接调用控制器函数**的方式，绕过 Zod validate 中间件和 authMiddleware，
覆盖了通过 HTTP 集成测试无法到达的控制器内部防御性分支：
1. **Zod 拦截的验证逻辑**：login 和 saveSelection 的控制器层类型/长度/parseInt 验证被 Zod 中间件提前拦截
2. **中间件保证的防御性检查**：verify 的 `!user` 检查和 `getLatestUserState` 异常处理被 authMiddleware 提前拦截

## 测试用例分类（完整 124 个）

### 正向测试（Happy Path）
- POST /api/auth/login: sysadmin 登录成功（返回 token + 用户信息 + 角色）
- POST /api/auth/login: admin 登录成功（返回公司关联项目）
- POST /api/auth/login: view 角色登录成功（返回 viewer 可访问项目）
- POST /api/auth/login: 登录时 selected_company 不可用时 fallback 到第一个公司
- POST /api/auth/login: 登录时 selected_project 不可用时 fallback 到第一个项目
- POST /api/auth/login: sysadmin 无项目时 selected_project 为 null
- POST /api/auth/logout: 三种角色（sysadmin/admin/view）登出成功
- GET /api/auth/verify: 三种角色 token 验证有效
- PUT /api/auth/selection: 仅保存 company_id 成功
- PUT /api/auth/selection: 保存 company_id + project_id 成功
- PUT /api/auth/selection: project_id 为显式 null 时保存成功
- GET /api/auth/companies: sysadmin 获取所有公司
- GET /api/auth/companies: admin/view 获取自己公司
- GET /api/auth/projects: 三种角色获取项目列表
- GET /api/auth/context: 获取公司+项目上下文
- GET /api/auth/companies/:id: 获取公司详情（含 operators/viewers）

### 边界条件测试
- username 超过 100 字符限制（400）
- password 超过 200 字符限制（400）
- username 为空字符串、纯空格（400）
- password 为空字符串（400）
- company_id 为 0、负数、非数字字符串（400）
- project_id 为 0、负数、null（400/200）
- ID 为浮点数 1.5 时 parseInt 截断为 1（200）
- company_id 为 'abc' 时 projects 返回空数组（200）
- non-Error 类型异常抛出时返回默认消息
- 错误无 message 属性时返回默认消息
- login username 恰好 100 字符（通过长度检查，401 凭证错误）
- login password 恰好 200 字符（通过长度检查，401 凭证错误）

### 安全测试
- POST /api/auth/login: 用户名类型验证（number/array/boolean 均拒绝）
- POST /api/auth/login: 密码类型验证（number/object 均拒绝）
- GET /api/auth/verify: 无 Authorization 头返回 401
- GET /api/auth/verify: 无 Bearer 前缀返回 401
- GET /api/auth/verify: Bearer 后为空 token 返回 401
- GET /api/auth/verify: 过期 token 返回 401（"登录已过期，请重新登录"）
- GET /api/auth/verify: 错误密钥签名的 token 返回 401
- GET /api/auth/verify: getLatestUserState 抛异常返回 401（"登录已过期"）
- 所有受保护端点无 token 时返回 401

### 权限测试
- POST /api/auth/login: 用户不存在返回 401（"用户名或密码错误"）
- POST /api/auth/login: 密码错误返回 401（"用户名或密码错误"）
- POST /api/auth/login: 无可访问公司返回 403（"没有权限访问任何公司"）
- POST /api/auth/login: view 角色无可访问项目返回 403（"没有权限访问任何项目"）
- PUT /api/auth/selection: 不可访问的 company_id 返回 403（"无权选择该公司"）
- PUT /api/auth/selection: 不可访问的 project_id 返回 403（"无权选择该项目"）
- GET /api/auth/companies: admin 公司被禁用时返回空列表
- GET /api/auth/companies/:id: admin/view 查询其他公司返回 403
- GET /api/auth/companies/:id: sysadmin 可查询任意公司

### 直接单元测试（Defensive !user checks + Zod-blocked branches）
- 6 个 !user 防御性检查（含 verify）
- 4 个 login 类型检查（绕过 Zod）
- 4 个 login 长度检查（绕过 Zod）
- 3 个 saveSelection company_id parseInt 验证（绕过 Zod）
- 3 个 saveSelection project_id parseInt 验证（绕过 Zod）
- 2 个 saveSelection 正向验证（null/undefined project_id）
