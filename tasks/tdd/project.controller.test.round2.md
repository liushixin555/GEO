# project.controller.test.round2.md — TDD 第三轮补全执行报告

## 测试文件
`tests/apis/project.controller.test.ts`

## 被测文件
- `apis/controller/project.controller.ts`
- `apis/service/impl/project.service.impl.ts`
- `apis/routes/project.routes.ts`
- `apis/schema/project.schema.ts`

## 测试结果
- **测试数量**: 120 个（从 94 增至 120，新增 26 个）
- **通过**: 120 个
- **失败**: 0 个
- **执行时间**: ~145s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| project.controller.ts | **100%** | **100%** | **100%** | **100%** |
| project.service.impl.ts | **100%** | **100%** | **100%** | **100%** |
| project.routes.ts | **100%** | **100%** | **100%** | **100%** |
| project.schema.ts | **100%** | **100%** | **100%** | **100%** |

## 本次新增 26 个测试用例

### Controller line 116: sysadmin companyId nullish 分支 (2 个)
1. sysadmin 无 companyId 时传递 undefined
2. sysadmin companyId 为 null 时传递 undefined

### Service line 97: operator_ids undefined 分支 (2 个)
3. operator_ids 未提供时 `||` 回退为空数组
4. viewer_ids 未提供时 `||` 回退为空数组

### Service line 130: full_name update 分支 (1 个)
5. PUT /api/projects/:id 更新 full_name 字段成功

### Description 边界场景 (2 个)
6. description 为空字符串时转为 null
7. description 为 undefined 时转为 null

### updateProject 空 viewer_ids (1 个)
8. 空 viewer_ids 数组跳过 findMany 查询

### updateProject 直接调用 (2 个)
9. 仅更新 full_name 字段（直接控制器）
10. 仅更新 description 字段（直接控制器）

### List 组合过滤 (2 个)
11. admin 角色同时应用 operator 过滤和 company_id 过滤
12. admin 角色同时应用 operator 过滤和 status 过滤

### admin company_id 忽略 (2 个)
13. admin 直接调用时忽略 body 中的 company_id，使用 JWT 中的值
14. admin 通过路由创建时不提供 company_id

### ID 边界测试 (4 个)
15. GET /api/projects/-1 负数 id 通过验证
16. GET /api/projects/1.5 小数 id 被截断为整数
17. GET /api/projects/@#$ 特殊字符 id 返回 400
18. DELETE /api/projects/0 零值 id 通过验证返回 404

### handleServiceError AppError 子类覆盖 (3 个)
19. NotFoundError → 404
20. ForbiddenError → 403（admin 删除非运营项目）
21. BusinessError → 400（变更 company_id）

### 分页边界 (2 个)
22. page=0 默认为 page=1
23. pageSize=0 默认为 pageSize=10

### updateProject 直接调用覆盖 (3 个)
24. 同时更新 short_name + full_name + 相同 company_id
25. 仅更新 status 字段
26. 仅更新 description 字段

## 覆盖率变化

| 指标 | Round 2 | Round 3 (本次) |
|------|---------|----------------|
| 测试数量 | 94 | **120** |
| controller Stmts | 100% | **100%** |
| controller Branch | 97.95% | **100%** |
| controller Funcs | 100% | **100%** |
| controller Lines | 100% | **100%** |
| service Stmts | 98.9% | **100%** |
| service Branch | 95.65% | **100%** |
| service Funcs | 100% | **100%** |
| service Lines | 100% | **100%** |

## 覆盖率缺口修复说明

### 1. Controller line 116: `req.user.companyId ?? undefined`
- **问题**: sysadmin 用户的 JWT token 中 companyId 可能为 null/undefined
- **修复**: 新增 2 个测试直接调用 controller，传入无 companyId 的 sysadmin 用户

### 2. Service line 97: `(request.operator_ids || [])`
- **问题**: 路由 schema 验证会将 undefined 转为默认值，controller 层 operator_ids 始终为数组
- **修复**: 直接调用 controller 绕过 schema 验证，传入无 operator_ids 的 body

### 3. Service line 130: `if (request.full_name !== undefined)`
- **问题**: 所有 update 测试只更新 short_name/description/status/operator_ids/viewer_ids，从未更新 full_name
- **修复**: 新增路由级 PUT 测试和直接控制器测试，验证 full_name 更新
