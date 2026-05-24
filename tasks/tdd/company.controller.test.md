# TDD 执行报告：company.controller.test.ts

## 测试目标

`apis/controller/company.controller.ts` — 公司管理控制器（5 个导出函数 + 1 个内部辅助函数）

## 测试概况

- **测试文件**: `tests/apis/company.controller.test.ts`
- **测试数量**: 124 个（原 95 个 + 新增 29 个）
- **测试结果**: 全部通过 ✅
- **执行时间**: ~11s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| company.controller.ts | **100%** | **100%** | **100%** | **100%** |

### 本次覆盖率提升

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| Statements | 91.54% | 100% |
| Branch | 87.5% | 100% |
| Functions | 75% | 100% |
| Lines | 94.2% | 100% |

**未覆盖行修复**:
- 行 130-131: `createCompany` 内部 safeParse `!parsed.success` 分支（通过单元测试直接调用 controller 函数覆盖）
- 行 203-204: `updateCompany` 内部 safeParse `!parsed.success` 分支（同上）

## 修复的问题

1. **validate 中间件消息前缀**: `validate` 中间件会将错误消息包装为 `参数验证失败: xxx` 格式，原有 5 个测试断言了原始消息格式，已修正
2. **PUT 路由 validate 优先于 controller ID 校验**: `PUT /api/companies/:id` 的 `validate` 中间件在 controller 之前执行，空 body 会先触发参数验证而非 ID 校验
3. **RATE_LIMIT_MAX 不足**: 测试用例从 95 增至 124，将 `RATE_LIMIT_MAX` 从 100 提高到 500 避免 429 误报
4. **电话号码长度超限**: 测试数据 `+86-(138)-0000-0000 #123`（24字符）超过 schema 的 20 字符限制，已缩短

## 测试用例分布

### GET /api/companies（listCompanies）— 8 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝（admin）
- 403 非 sysadmin 角色拒绝（view）
- 200 成功获取公司列表
- 200 多公司列表返回（验证 Company 实体全字段映射）
- 200 空列表返回
- 500 服务异常（有错误消息）
- 500 服务异常（无错误消息）

### GET /api/companies/:id（getCompany）— 13 个用例
- 401 未授权访问
- 403 非 sysadmin 角色拒绝
- 400 无效的公司ID（非数字）
- 400 ID = 0
- 200 成功获取公司详情（含运营者和查看者）
- 200 公司详情无运营者和查看者
- 200 CompanyDetail 仅含 operators / 仅含 viewers / 多个 operators+viewers
- 404 公司不存在 / 负数ID / 软删除公司
- 500 通用服务错误 / 默认错误消息
- 404 超大 ID

### POST /api/companies（createCompany）— 20 个用例
- 401 未授权访问 / 403 非 sysadmin（admin / view）
- 400 各必填字段缺失/空字符串
- 400 operator_ids 不是数组 / 空数组 / 缺失（validate 中间件消息格式）
- 201 创建成功 / 带 viewer_ids / 不含可选字段
- 201 viewer_ids 空数组 / 多 operator_ids
- 500 服务异常

### PUT /api/companies/:id（updateCompany）— 19 个用例
- 401 未授权访问 / 403 非 sysadmin（admin / view）
- 400 无效ID / 各字段缺失/空字符串 / operator_ids 验证
- 200 更新成功 / 带 viewer_ids / 空 viewer_ids / 多 viewer_ids
- 404 公司不存在
- 500 服务异常

### PUT /api/companies/:id/status（toggleCompanyStatus）— 15 个用例
- 401 未授权访问 / 403 非 sysadmin / 过期 token
- 400 无效ID / status 非布尔值（字符串/缺失/数字/null/object/array）
- 200 启用 / 禁用 / 详细响应验证
- 404 公司不存在 / 软删除公司
- 500 服务异常

### Controller 单元测试（safeParse 分支）— 18 个用例（新增）
- createCompany safeParse: 缺少 short_name / 空对象 / short_name 超50字符 / full_name 超200字符 / 电话格式无效 / operator_ids 含小数/负数/零 / contact_person 超100字符
- updateCompany safeParse: 空对象 / short_name 超50字符 / address 超500字符 / viewer_ids 超100个 / 多个验证错误
- isNotFoundError 辅助函数: 正确匹配 / 不匹配 / 非Error值

### Schema 边界验证 — 8 个用例（新增）
- short_name 边界（50字符通过/51字符拒绝）
- full_name 边界（201字符拒绝）
- address 边界（501字符拒绝）
- contact_phone 格式验证（含字母拒绝/含特殊字符通过）
- operator_ids 数量边界（101个拒绝）
- viewer_ids 数量边界（101个拒绝）

### Edge Cases & Security — 17 个用例
- 过期/畸形/错误 secret 的 JWT token
- 浮点 ID / 前导零 ID / 负数 ID
- XSS / SQL 注入风格字段
- 中文字符全字段
- 超长字段值
- ID 校验优先级

## 测试策略

1. **集成测试**（supertest + mockPrisma）：覆盖路由 → middleware → controller → service 全链路
2. **单元测试**（直接调用 controller 函数）：覆盖被 validate middleware 提前拦截的 safeParse 内部分支
3. **权限测试**：sysadmin / admin / view 三角色全覆盖
4. **边界测试**：schema max 长度 +1/-1、正则格式、数组上限
5. **安全测试**：JWT 异常、注入尝试、特殊字符

## 执行日期

2026-05-24（更新：修复 7 个失败测试 + 新增 29 个用例，总计 124 个，覆盖率 100%）
