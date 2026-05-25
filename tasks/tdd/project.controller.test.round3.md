# project.controller.ts 第三轮TDD补全报告

**日期**: 2026-05-25
**文件**: `apis/controller/project.controller.ts`
**测试文件**: `tests/apis/project.controller.test.ts`

## 测试结果

| 指标 | 值 |
|------|------|
| 总用例数 | 206 |
| 通过 | 206 |
| 失败 | 0 |
| 语句覆盖率 (Stmts) | 100% |
| 分支覆盖率 (Branch) | 100% |
| 函数覆盖率 (Funcs) | 100% |
| 行覆盖率 (Lines) | 100% |

## 本轮新增测试维度 (89 用例)

### 3-01 getErrorMessage 辅助函数 (5 用例)
- Error 空消息 → 默认消息
- number 类型 thrown → 默认消息
- object 类型 thrown → 默认消息
- null thrown → 默认消息
- undefined thrown → 默认消息

### 3-02 handleServiceError - AppError 子类映射 (10 用例)
- NotFoundError(404) 通过 list 端点
- BusinessError(400) 通过 list 端点
- ForbiddenError(403) 通过 list 端点
- UnauthorizedError(401) 通过 list 端点
- ConflictError(409) 通过 list 端点
- AppError 自定义状态码(422)
- AppError(500) 通过 createProject
- AppError(404) 通过 updateProject
- AppError(403) 通过 deleteProject
- 完整端点 × 错误类型交叉验证

### 3-03 安全注入测试 (5 用例)
- XSS payload in search (`<script>alert(1)</script>`)
- SQL 注入 payload in search (`' OR 1=1 --`)
- 路径遍历 in project id (`../../../etc/passwd`)
- 超长搜索参数 (101 chars → 400)
- Unicode/Emoji 搜索参数

### 3-04 响应结构验证 (6 用例)
- list 响应结构 (code, data.list, data.total, data.page, data.pageSize)
- getProject 响应字段完整性 (13个字段)
- create 响应 (code=0, message, data, status=201)
- update 响应 (code=0, message, data, status=200)
- delete 响应 (code=0, data=null, message)
- error 响应 (code, message)

### 3-05 字段白名单/未知字段过滤 (2 用例)
- createProject 忽略未知字段 (id, isAdmin, __proto__, constructor)
- updateProject 忽略未知字段 (malicious_field, id, deletedAt)

### 3-06 边界值测试 (11 用例)
- MAX_SAFE_INTEGER as page parameter
- 非常大的 company_id (99999999)
- id = MAX_SAFE_INTEGER → 404
- 负数 page parameter (-5 → skip=-60)
- pageSize=1 (最小有效值)
- pageSize=100 (最大有效值)
- id=0 在 PUT/GET/DELETE 中均返回 400
- 浮点数 id (999999.999)
- 负数 id (-1) 在 DELETE/PUT 中返回 400

### 3-07 角色矩阵完整覆盖 (10 用例)
- view 角色在所有 5 个端点均被路由中间件拦截 (403)
- sysadmin 可访问 list
- admin 可访问 list
- view 角色通过直接调用被 controller 层拦截 (403)
- admin 非操作者通过直接调用被 service 层拦截 (403)

### 3-08 status 参数边界 (7 用例)
- status=TRUE (大写) → 400
- status=FALSE (大写) → 400
- status=1 → 400
- status=0 → 400
- status="" → 400
- status=yes → 400
- status 含空格 → 400

### 3-09 updateProject company_id 不可变 (2 用例)
- 不同 company_id → 400
- company_id undefined → 成功更新

### 3-10 deleteProject 角色权限 (2 用例)
- sysadmin 可删除
- admin 是操作者可删除

### 3-11 createProject - sysadmin companyId 假值 (1 用例)
- companyId=0 时仍能创建

### 3-12 连续不同过滤器列表请求 (1 用例)
- 连续两次请求应用不同过滤器

### 3-13 getProject id 解析边界 (3 用例)
- 科学计数法 "1e2" → parseInt=1
- 字母 "abc" → 400
- 空格 id → 400

### 3-14 createProject effectiveCompanyId 逻辑 (2 用例)
- admin 使用 token companyId 而非 body
- sysadmin 使用 body company_id

### 3-15 特殊字符错误消息 (2 用例)
- HTML 特殊字符保留
- 超长错误消息 (5000 chars)

### 3-16 并发请求模拟 (1 用例)
- 5 个并发 list 请求全部成功

### 3-17 createProject 缺失 effectiveCompanyId (3 用例)
- sysadmin 无 body company_id → 400
- sysadmin company_id=0 → 400
- admin companyId undefined → 400

### 3-18 updateProject 所有字段同时更新 (1 用例)
- short_name + full_name + description + status 同时更新

### 3-19 空列表结果 (1 用例)
- total=0, list=[]

### 3-20 分页元数据验证 (1 用例)
- 第 2 页 5 条/页 total=15 验证

### 3-21 无操作者/查看者项目 (1 用例)
- operator_ids=[], viewer_ids=[]

### 3-22~3-25 AppError 端到端验证 (8 用例)
- createProject BusinessError → 400
- updateProject ForbiddenError → 403
- updateProject 非 Error → 500
- deleteProject NotFoundError → 404
- deleteProject 非 Error → 500
- getProject 自定义 AppError(429)
- getProject 非 Error → 500
- viewer_ids 验证通过

### 3-27 admin 非操作者更新 (1 用例)
- admin 非操作者 → 403

### 3-28 搜索边界 100 字符 (1 用例)
- 恰好 100 字符搜索通过

### 3-29 Schema strict 模式 (2 用例)
- 额外字段 "foo" → 400
- 额外字段 "bar" → 400

### 3-30 admin 组合过滤器 (1 用例)
- search + company_id + status + admin operator 过滤器组合

## 历史测试轮次

| 轮次 | 用例数 | 覆盖率 | 重点关注 |
|------|--------|--------|----------|
| Round 1 | 94 | 100% 四维 | 基本 CRUD + 权限 + 错误处理 |
| Round 2 | 23 | 100% 四维 | companyId nullish 分支 + operator_ids undefined + full_name update |
| Round 3 | 89 | 100% 四维 | AppError 映射 + 安全注入 + 响应结构 + 边界值 + 角色矩阵 |
| **总计** | **206** | **100% 四维** | |
