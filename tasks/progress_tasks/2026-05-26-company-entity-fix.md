# 公司管理 Entity 层 Committer 审核修复

**日期**: 2026-05-26
**审核文件**: `tasks/review/company.entity.committer.md`
**修复范围**: `apis/controller/company.controller.ts`

---

## 修复前状态

Committer 审核报告中提出 3 个 P1 级别强烈建议修复项：

| 编号 | 问题 | 修复前状态 |
|------|------|-----------|
| P1-1 | Entity 缺少 `deleted_at` 字段 | **已修复**（Entity 已包含 `deleted_at: Date \| null`，Map 层已同步） |
| P1-2 | 缺少 Zod Schema，运行时验证空白 | **已修复**（`apis/schema/company.schema.ts` 已存在） |
| P1-3 | Service 层 `operator_ids` 无校验 | **已修复**（Service 已有 `validateUserIds` 方法） |

## 本次实际修复

### Controller 集成 Zod Schema 验证

**问题**: `createCompany` 和 `updateCompany` 方法直接将 `req.body` 强制类型转换为 `CreateCompanyRequest` / `UpdateCompanyRequest`，未经过 Zod Schema 运行时验证，存在字段类型、长度、格式等安全风险。

**修复**: 在两个方法中集成 `createCompanySchema.safeParse()` 和 `updateCompanySchema.safeParse()`，验证失败返回 400 + 具体错误消息。

**修改文件**: `apis/controller/company.controller.ts`
- 新增导入: `createCompanySchema`, `updateCompanySchema`
- `createCompany`: 添加 Zod 验证（原 `req.body` → `parsed.data`）
- `updateCompany`: 添加 Zod 验证（原 `req.body` → `parsed.data`）

## 验证结果

- `pnpm build:api` ✅ 通过
- `pnpm lint` ✅ 通过
- 公司相关测试: 509 passed ✅

## P2/P3 改进项（无需本次修复）

| 优先级 | 问题 | 状态 |
|--------|------|------|
| P2 | Service 层 N+1 循环更新 | 已使用 `updateMany` 批量操作 |
| P2 | Map 层 `any` 输入类型 | `mapCompany` 已使用 `PrismaCompany` 类型 |
| P2 | `operator_ids`/`viewer_ids` JSDoc | 已添加 |
