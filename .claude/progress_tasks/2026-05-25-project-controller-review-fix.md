# 2026-05-25 project.controller.ts 评审修复

## 变更摘要

根据架构评审（8.0分）和 Committer 二轮评审（通过），修复 Zod Schema 与 DB 约束不一致、controller 冗余校验、`listProjects` catch 不一致、ID 参数边界检查等问题。

## 修改文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `apis/schema/project.schema.ts` | 修复 | short_name max 100→50，description max 2000→500，与 DB VarChar 约束对齐 |
| `apis/controller/project.controller.ts` | 精简 | 177行→161行（-9%） |
| `tests/apis/project.controller.test.ts` | 更新 | 117用例全部通过 |

## 详细变更

### apis/schema/project.schema.ts
- createProjectSchema: short_name max(100)→max(50), description max(2000)→max(500)
- updateProjectSchema: 同上

### apis/controller/project.controller.ts
1. **H-1**: 移除与 Zod 重复的字符串长度校验（short_name/full_name/description）
2. **M-3**: `hasCompanyId` 简化为 `effectiveCompanyId`，admin 使用 `req.user.companyId`，sysadmin 使用 `req.body.company_id`；直接传递给 service
3. **L-2**: `listProjects` catch 统一使用 `handleServiceError`
4. **NEW-3**: getProject/updateProject/deleteProject 添加 `id <= 0` 检查

### tests/apis/project.controller.test.ts
- 更新 Zod 消息断言（`toBe`→`toContain`，适配 validate 中间件格式）
- 移除 3 个不再适用的直接调用 controller 字符串长度测试
- 更新 id=-1 测试：200→400
- 更新 id=0 测试：404→400

## 测试结果

- TypeScript 编译：通过
- ESLint：通过
- 测试：117 passed, 0 failed
