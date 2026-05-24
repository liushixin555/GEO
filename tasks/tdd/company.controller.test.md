# TDD 执行报告：Company Controller

## 执行时间
2026-05-24（初始），2026-05-25（验证）

## 测试结果
- 测试套件：1 passed
- 测试用例：123 passed, 0 failed
- 覆盖率：Stmts 100%, Branch 100%, Funcs 100%, Lines 100%

## 变更记录

### 2026-05-24 补全测试（113 → 123 用例）
- 新增 10 个测试用例，覆盖 createCompany/updateCompany 的 BusinessError 分支（行56、行79）
- 新增 updateCompany/toggleCompanyStatus 的负数 ID 和零 ID 边界测试
- 覆盖率从 97.05% Stmts / 90.47% Branch 提升至 100% / 100%

## 修复的Bug
无（本次全部通过）

## 测试用例分类

### 正向测试（Happy Path）
- GET /api/companies: sysadmin 获取公司列表（含完整实体字段映射 snake_case）
- GET /api/companies: 返回多条公司记录，验证字段完整性
- GET /api/companies/:id: sysadmin 获取公司详情（含 operators/viewers/operators_ids/viewer_ids）
- GET /api/companies/:id: 仅有 operators 无 viewers
- GET /api/companies/:id: 仅有 viewers 无 operators
- GET /api/companies/:id: 多个 operators + 多个 viewers
- POST /api/companies: 创建公司成功（含事务处理 company create + user updateMany）
- POST /api/companies: 创建公司含 viewer_ids 成功
- POST /api/companies: 无可选字段（无 address, 无 viewer_ids）创建成功
- PUT /api/companies/:id: 更新公司成功（含事务 findUnique + update + user updateMany）
- PUT /api/companies/:id: 更新含 viewer_ids 成功
- PUT /api/companies/:id/status: 启用公司成功（"公司已启用"）
- PUT /api/companies/:id/status: 禁用公司成功（"公司已禁用"）

### 边界条件测试
- GET /api/companies: 空公司列表
- GET /api/companies/:id: ID 非数字返回 400（"无效的公司ID"）
- GET /api/companies/:id: ID 不存在返回 404（"公司不存在"）
- GET /api/companies/:id: ID 为负数返回 404
- GET /api/companies/:id: ID 为 0 返回 404
- GET /api/companies/:id: 浮点数 ID（1.9）被 parseInt 截断为 1（200）
- GET /api/companies/:id: 前导零 ID（007）解析为 7（200）
- GET /api/companies/:id: 软删除公司返回 404
- GET /api/companies/:id: 超大 ID（999999999）返回 404
- POST /api/companies: 所有必填字段缺失返回 400
- POST /api/companies: short_name/full_name/contact_person/contact_phone 为空字符串返回 400
- POST /api/companies: operator_ids 不是数组/空数组/缺失返回 400
- PUT /api/companies/:id: 同上验证规则
- PUT /api/companies/:id/status: status 非 boolean（string/number/null/object/array）返回 400
- PUT /api/companies/:id/status: 软删除公司返回 404
- 创建公司含多个 viewer_ids 验证 updateMany 调用次数
- 创建公司含多个 operator_ids 验证 updateMany 调用次数
- 创建公司含中文字符所有字段
- 创建公司含特殊字符（XSS/SQL 注入尝试）
- 创建公司含超长字段值（short_name 50 字符、full_name 200 字符）
- 更新公司含空 viewer_ids 数组
- 更新公司含多个 viewer_ids
- Schema 边界：short_name 50 字符通过/51 字符拒绝
- Schema 边界：full_name 200 字符通过/201 字符拒绝
- Schema 边界：address 500 字符通过/501 字符拒绝
- Schema 边界：contact_phone 字母格式拒绝/特殊字符格式通过
- Schema 边界：operator_ids 100 个通过/101 个拒绝
- Schema 边界：viewer_ids 100 个通过/101 个拒绝

### 安全测试
- 过期 JWT token 返回 401（"登录已过期，请重新登录"）
- 畸形 JWT token 返回 401
- Bearer 后无 token 返回 401
- 错误密钥 JWT 返回 401
- toggleCompanyStatus 含过期 token 返回 401
- validate 中间件在 controller ID 检查之前运行
- toggleStatus 中 ID 验证在 status 验证之前

### 权限测试
- GET /api/companies: admin/view 角色返回 403（"无权限访问"）
- GET /api/companies/:id: admin/view 角色返回 403
- POST /api/companies: admin/view 角色返回 403
- PUT /api/companies/:id: admin/view 角色返回 403
- PUT /api/companies/:id/status: admin/view 角色返回 403
- 仅 sysadmin 角色可访问所有公司 CRUD 操作

### Controller 单元测试（safeParse branches）
- createCompany: short_name 超过 50 字符限制
- createCompany: full_name 超过 200 字符限制
- createCompany: contact_phone 格式无效
- createCompany: operator_ids 含非整数/负数/零
- createCompany: contact_person 超过 100 字符
- updateCompany: 同上验证分支
- updateCompany: viewer_ids 超过 100 个
- updateCompany: 多个验证错误同时存在
- isNotFoundError helper: 正确识别/排除错误消息
- isNotFoundError helper: 处理 non-Error 值

### BusinessError 分支覆盖（2026-05-24 新增）
- createCompany: service 抛出 BusinessError（用户不存在）返回 400
- createCompany: service 抛出 BusinessError（系统管理员不可被关联）返回 400
- createCompany: service 抛出 BusinessError（用户已禁用）返回 400
- updateCompany: service 抛出 BusinessError（用户不存在）返回 400
- updateCompany: service 抛出 BusinessError（系统管理员不可被关联）返回 400
- updateCompany: service 抛出 BusinessError（用户已禁用）返回 400
- updateCompany: 负数 ID 返回 400（"无效的公司ID"）
- updateCompany: ID = 0 返回 400（"无效的公司ID"）
- toggleCompanyStatus: 负数 ID 返回 400（"无效的公司ID"）
- toggleCompanyStatus: ID = 0 返回 400（"无效的公司ID"）
