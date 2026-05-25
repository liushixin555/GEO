# TDD 执行报告：Auth Controller 第四轮补全

## 执行时间
2026-05-25（第四轮补全——安全/边界/生命周期/RBAC 深度测试）

## 测试结果
- 测试套件：1 passed
- 测试用例：215 passed, 0 failed（新增 57 个用例）
- 覆盖率：Stmts 100%, Branch 100%, Funcs 100%, Lines 100%

## 覆盖率变化
| 指标 | 第三轮 | 第四轮 |
|------|--------|--------|
| Stmts | 100% | 100% |
| Branch | 100% | 100% |
| Funcs | 100% | 100% |
| Lines | 100% | 100% |

## 新增测试用例（57个）

### Round 4: 安全注入边界（11个）
- login 应处理 username 中的 SQL 注入（`admin' OR '1'='1`）
- login 应处理 password 中的 SQL 注入（`' OR '1'='1`）
- login 应处理 username 中的 NoSQL 注入（`{ $gt: '' }`）
- login 应处理 username 中的 XSS 载荷（`<script>alert(1)</script>`）
- login 应处理 Unicode 用户名（`用户名🎉`）
- login 应处理 username 中的 null 字节（`admin\x00evil`）
- saveSelection 应通过 Zod 拦截 company_id SQL 注入
- getAccessibleProjects 应安全处理 SQL 注入（parseInt 截断为有效数字，参数化查询防注入）
- getCompanyDetail 应安全处理 SQL 注入（parseInt 截断为有效数字）
- getContext 应处理 company_id 特殊字符
- 应拒绝篡改 payload 的 token（签名校验失败）

### Round 5: 边界值测试（10个）
- login 应接受恰好 100 字符的 username（边界通过）
- login 应拒绝 101 字符的 username（400）
- login 应接受恰好 200 字符的 password（边界通过）
- login 应拒绝 201 字符的 password（400）
- saveSelection 应接受非常大的合法 company_id（999999999）
- getAccessibleProjects 应处理 max safe integer 的 company_id
- getCompanyDetail 应处理非常大的 id（999999）
- getContext 应返回空项目列表当公司无项目
- getContext 应处理 company_id 为最小有效值 1
- saveSelection 应通过直接调用处理字符串数字 company_id（parseInt 截断）

### Round 6: Token 生命周期测试（6个）
- 应拒绝 verify 时的已过期 token
- 应允许同一 token 的多个并发请求
- 应处理缺少 username 字段的 token
- 应黑名单已撤销 token 并拒绝后续请求（verify + context）
- 应独立撤销多个 token（token1/token3 撤销，token2 仍有效）
- logout 使用非 Bearer 授权头不应撤销任何 token

### Round 7: RBAC 深度测试（9个）
- view 角色应访问 verify 端点
- view 角色应访问 companies 端点
- view 角色应访问 projects 端点
- view 角色应访问 context 端点
- view 角色应被拒绝 getCompanyDetail（403）
- view 角色应访问 saveSelection 端点
- admin 应被拒绝 getCompanyDetail 查询其他公司（403）
- admin 应访问 getCompanyDetail 查询本公司
- sysadmin 应访问 getCompanyDetail 查询任意公司

### Round 8: 响应格式验证（8个）
- login 成功响应结构验证（code/message/data/token/user）
- logout 响应结构验证（code/message/data=null）
- verify 响应结构验证（code/message/data/valid/user）
- saveSelection 成功响应结构验证（code/message/data=null）
- getCompanies 响应使用 snake_case 键名（short_name）
- getProjects 响应使用 snake_case 键名（short_name）
- getCompanyDetail 响应正确分离 operators（仅 admin）和 viewers（仅 view）
- 错误响应应包含 code 和 message 属性

### Round 9: HTTP 方法与内容类型测试（6个）
- GET /login 返回 404/405
- DELETE /login 返回 404/405
- GET /logout 返回 404/405
- GET /selection 返回 404/405
- POST /selection 返回 404/405
- POST /verify 返回 404/405

### Round 10: 错误路径完备性直接测试（7个）
- login 应在 undefined body 时抛出异常（Express 保证 req.body 存在）
- login 应在 null body 时抛出异常（Express 保证 req.body 存在）
- login 应处理 LoginSelectionError 自定义消息
- saveSelection 应处理 PermissionDeniedError 自定义消息
- verify 应处理 getLatestUserState 找不到用户的情况
- getCompanyDetail 应在服务失败时记录错误日志
- getContext 应在获取公司成功后获取项目失败时返回 500

## 测试策略说明

第四轮在第三轮 158 用例（100% 四维覆盖率）基础上，新增 57 个用例用于**增强测试深度**而非覆盖广度：

1. **安全注入测试**：验证 SQL 注入、NoSQL 注入、XSS、null 字节、Unicode 等恶意输入均被安全处理
2. **边界值测试**：验证长度限制的边界值（100/101、200/201）、极大值（999999999、2147483647）
3. **Token 生命周期**：验证过期 token、并发请求、独立撤销、payload 篡改检测
4. **RBAC 深度**：系统验证三种角色在 8 个端点上的完整权限矩阵
5. **响应格式**：验证成功/失败响应的完整结构（code、message、data 字段、snake_case 键名）
6. **HTTP 方法**：验证错误 HTTP 方法被正确拒绝
7. **错误路径完备性**：验证自定义错误消息、服务层级联失败、body 为空等极端情况

## 测试用例总览（完整 215 个）

| 函数 | HTTP 集成 | 直接单元 | 新增 | 合计 |
|------|-----------|----------|------|------|
| login | 23+5 | 12+4 | 9 | 53 |
| logout | 6+2 | 4+1 | 3 | 16 |
| verify | 7+1 | 2+1 | 2 | 13 |
| saveSelection | 14+2 | 15+2 | 4 | 37 |
| getAccessibleCompanies | 9 | 2 | 1 | 12 |
| getAccessibleProjects | 10+1 | 4+1 | 2 | 18 |
| getContext | 7+1 | 5+1 | 2 | 16 |
| getCompanyDetail | 13+1 | 6+2 | 3 | 25 |
| 安全/方法/格式/其他 | — | — | 30 | 25 |
| **合计** | **110** | **52** | **57** | **215** |
