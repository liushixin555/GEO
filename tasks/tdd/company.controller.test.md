# TDD 执行报告：company.controller.test.ts

## 测试目标

`apis/controller/company.controller.ts` — 公司管理控制器

## 测试概况

- **测试文件**: `tests/apis/company.controller.test.ts`
- **测试数量**: 54 个
- **测试结果**: 全部通过 ✅
- **执行时间**: ~6.8s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branch | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例分布

### GET /api/companies（listCompanies）— 6 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 200 成功获取公司列表
- 500 服务异常（有错误消息）
- 500 服务异常（无错误消息，使用默认消息）
- 200 空列表返回

### GET /api/companies/:id（getCompany）— 7 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 400 无效的公司ID（非数字）
- 200 成功获取公司详情（含运营者和查看者）
- 200 公司详情无运营者和查看者
- 404 公司不存在
- 500 通用服务错误 / 默认错误消息

### POST /api/companies（createCompany）— 11 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 400 缺少 short_name
- 400 缺少 full_name
- 400 缺少 contact_person
- 400 缺少 contact_phone
- 400 所有必填字段缺失
- 400 operator_ids 不是数组
- 400 operator_ids 为空数组
- 400 operator_ids 缺失
- 201 创建公司成功
- 201 带 viewer_ids 创建公司成功
- 500 服务异常（有错误消息）
- 500 服务异常（无错误消息）

### PUT /api/companies/:id（updateCompany）— 13 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 400 无效的公司ID（非数字）
- 400 缺少 short_name / full_name / contact_person / contact_phone
- 400 operator_ids 不是数组 / 空数组 / 缺失
- 200 更新公司成功
- 200 带 viewer_ids 更新公司成功
- 404 公司不存在
- 500 通用服务错误 / 默认错误消息

### PUT /api/companies/:id/status（toggleCompanyStatus）— 11 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 400 无效的公司ID（非数字）
- 400 status 不是布尔值（字符串、缺失、数字）
- 200 启用公司（status: true）
- 200 禁用公司（status: false）
- 404 公司不存在
- 500 通用服务错误 / 默认错误消息

## 测试策略

- 使用 supertest 进行 HTTP 层集成测试
- 通过 `jest.mock` mock Prisma 数据库层
- 使用 JWT token 模拟不同角色（sysadmin/admin）
- 覆盖所有成功路径、参数校验、权限控制、错误处理分支

## 执行日期

2026-05-23
