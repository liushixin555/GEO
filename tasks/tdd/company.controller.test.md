# TDD 执行报告：company.controller.test.ts

## 测试目标

`apis/controller/company.controller.ts` — 公司管理控制器
`apis/service/impl/company.service.impl.ts` — 公司管理服务实现
`apis/entity/company.entity.ts` — 公司实体定义（Company, CompanyDetail, CreateCompanyRequest, UpdateCompanyRequest）

## 测试概况

- **测试文件**: `tests/apis/company.controller.test.ts`
- **测试数量**: 80 个（原 54 个，新增 26 个边界场景测试）
- **测试结果**: 全部通过 ✅
- **执行时间**: ~9.9s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| company.controller.ts | 100% | 100% | 100% | 100% |
| company.service.impl.ts | 100% | 100% | 100% | 100% |

## 测试用例分布

### GET /api/companies（listCompanies）— 8 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝（admin）
- 403 非 sysadmin 角色拒绝（view）
- 200 成功获取公司列表
- 200 多公司列表返回（验证 Company 实体全字段映射：id, short_name, full_name, address, contact_person, contact_phone, status, created_at, updated_at）
- 200 空列表返回
- 500 服务异常（有错误消息）
- 500 服务异常（无错误消息，使用默认消息）

### GET /api/companies/:id（getCompany）— 13 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 400 无效的公司ID（非数字）
- 400 ID = 0（服务返回 404）
- 200 成功获取公司详情（含运营者和查看者）
- 200 公司详情无运营者和查看者
- 200 CompanyDetail 仅含 operators（多个管理员）
- 200 CompanyDetail 仅含 viewers
- 200 CompanyDetail 含多个 operators 和 viewers（验证 CompanyDetail 实体全字段：operator_ids, operators, viewer_ids, viewers）
- 404 公司不存在
- 500 通用服务错误 / 默认错误消息

### POST /api/companies（createCompany）— 19 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝（admin / view）
- 400 缺少 short_name / full_name / contact_person / contact_phone
- 400 空字符串 short_name / full_name / contact_person / contact_phone
- 400 所有必填字段缺失
- 400 operator_ids 不是数组 / 空数组 / 缺失
- 201 创建公司成功
- 201 带 viewer_ids 创建公司成功（多个 viewer_ids，验证 user.update 调用次数）
- 201 不含可选字段（无 address、无 viewer_ids）
- 201 viewer_ids 为空数组（不触发 viewer 关联）
- 500 服务异常（有错误消息 / 无错误消息）

### PUT /api/companies/:id（updateCompany）— 19 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝（admin / view）
- 400 无效的公司ID（非数字）
- 400 缺少 short_name / full_name / contact_person / contact_phone
- 400 空字符串 short_name / full_name / contact_person / contact_phone
- 400 operator_ids 不是数组 / 空数组 / 缺失
- 200 更新公司成功
- 200 带 viewer_ids 更新公司成功
- 200 viewer_ids 为空数组（验证 updateMany 调用次数）
- 200 多个 operator_ids 和 viewer_ids（验证 user.update 调用次数 = 2+3=5）
- 404 公司不存在
- 500 通用服务错误 / 默认错误消息

### PUT /api/companies/:id/status（toggleCompanyStatus）— 15 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝（admin / view）
- 400 无效的公司ID（非数字）
- 400 status 不是布尔值（字符串、缺失、数字、null、object、array）
- 200 启用公司（status: true）
- 200 禁用公司（status: false）
- 404 公司不存在
- 500 通用服务错误 / 默认错误消息

## Entity 字段覆盖验证

### Company 实体
- ✅ id (number)
- ✅ short_name (string)
- ✅ full_name (string)
- ✅ address (string | null)
- ✅ contact_person (string)
- ✅ contact_phone (string)
- ✅ status (boolean)
- ✅ created_at (Date)
- ✅ updated_at (Date)

### CompanyDetail 实体（继承 Company）
- ✅ operator_ids: number[]
- ✅ operators: { id, cn_name, username }[]
- ✅ viewer_ids: number[]
- ✅ viewers: { id, cn_name, username }[]

### CreateCompanyRequest / UpdateCompanyRequest
- ✅ short_name, full_name, contact_person, contact_phone（必填验证）
- ✅ address（可选，null/有值）
- ✅ operator_ids（必填，数组非空验证）
- ✅ viewer_ids（可选，有值/空数组/缺失）

## 测试策略

- 使用 supertest 进行 HTTP 层集成测试
- 通过 `jest.mock` mock Prisma 数据库层
- 使用 JWT token 模拟不同角色（sysadmin/admin/view）
- 覆盖所有成功路径、参数校验、权限控制、错误处理分支
- 验证 entity 字段映射（Prisma camelCase → API snake_case）
- 验证 transaction 中 user.update 调用次数（确保 operator/viewer 正确关联）

## 执行日期

2026-05-23（更新：新增 26 个边界场景测试）
