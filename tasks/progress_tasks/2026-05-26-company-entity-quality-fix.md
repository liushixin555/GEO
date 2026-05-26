# company.entity.ts 质量评审修复

**日期**: 2026-05-26
**评审文件**: `tasks/review/company.entity.ts.quality.md` (5.5/10) + committer (4.8/10 REQUEST CHANGES)
**修复后预期**: 8.0/10

## 修复内容

### B-1 审计追踪 (BLOCKING)
- Prisma schema: Company 新增 `createdById`/`updatedById` + User 新增反向关联
- Entity: Company 接口新增 `created_by: number | null` / `updated_by: number | null`
- Map: mapCompany 添加审计字段映射
- Service: create 注入 `createdById: userId`，update 注入 `updatedById: userId`
- Controller: create/update 传递 `req.user!.userId`

### B-2 部分更新 (BLOCKING)
- UpdateCompanyRequest: 所有字段改为 optional（`short_name?: string` 等）
- `address?: string | null` 三值语义（undefined=不修改, string=新值, null=清除）
- Service update(): 条件更新（仅更新提供的字段）
- Schema updateCompanySchema: 所有字段 optional

### H-1 CompanyListItem
- 新增 CompanyListItem 类型（sysadmin 专用，含完整信息 + user_count/project_count）
- Service list(): 返回 CompanyListItem[]，含关联统计

### H-2 address 三值语义
- CreateCompanyRequest.address: `address?: string | null`
- UpdateCompanyRequest.address: `address?: string | null`
- Schema address: `.optional().or(z.null())`

### H-3 operator/viewer 互斥校验
- Schema: createCompanySchema/updateCompanySchema 添加 `.refine()` 交叉校验
- Service: validateUserIds() 添加交集检查

### H-4 CompanyUserRef
- 提取 `CompanyUserRef` 命名类型（`{ id: number; cn_name: string }`）
- CompanyDetail.operators/viewers 使用 CompanyUserRef[]

### H-5 文档补全
- 模块级 `@module` JSDoc
- 全字段 Prisma 约束注释（VarChar 长度、格式）
- operator_ids/viewer_ids 业务约束说明

### M-1 CompanyDetail 脱敏
- `CompanyDetail extends Omit<Company, 'deleted_at'>` 不暴露 deleted_at

## 变更文件清单

| 文件 | 变更类型 |
|------|---------|
| `apis/entity/company.entity.ts` | 重写（35行→105行） |
| `apis/entity/index.ts` | 新增导出 |
| `apis/schema/company.schema.ts` | 部分更新+互斥校验 |
| `apis/service/company.service.ts` | 签名更新 |
| `apis/service/impl/company.service.impl.ts` | 重写 |
| `apis/controller/company.controller.ts` | 传递 userId |
| `apis/map/index.ts` | mapCompany 添加字段 |
| `prisma/schema.prisma` | Company+User 新增字段 |
| `tests/apis/company.entity.test.ts` | 通过 |
| `tests/apis/company.schema.test.ts` | 7处修复 |
| `tests/apis/company.service.test.ts` | 10处修复 |
| `tests/apis/company.controller.test.ts` | 9处修复 |

## 验证结果

- `pnpm build:api` ✅
- `pnpm lint` ✅
- Company 测试 509/509 ✅
