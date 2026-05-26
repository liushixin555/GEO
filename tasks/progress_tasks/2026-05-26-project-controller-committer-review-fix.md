# project.controller.ts Committer 评审修复记录

**日期**: 2026-05-26
**文件**: `apis/controller/project.controller.ts` + `apis/schema/project.schema.ts` + `apis/routes/project.routes.ts` + `apis/middleware/rate-limit.middleware.ts` + `apis/middleware/index.ts` + `tests/apis/project.controller.test.ts`
**评审文件**: `tasks/review/project.controller.ts.committer.md`

## 修复状态

全部 7 项问题已修复/确认（H×2, M×2 已修复 + M×1 已有防护, L×1 已修复 + L×1 保持现状）

## 修复详情

### HIGH 修复 (2项)
- **H-1**: `effectiveCompanyId` fallback 安全 — admin 无 companyId 时返回 403 而非 fallback 到 body.company_id，阻止 admin 指定任意公司
- **H-2**: `updateProject` status 权限控制 — admin 不能修改项目 status，只有 sysadmin 可以

### MEDIUM 修复 (2项 + 1项已有防护)
- **M-1**: `getProject` admin 权限检查 — Service 层已有防护，无需修改
- **M-2**: 移除冗余 `Number()` 转换 — Zod 已验证，直接使用
- **M-3**: `destructiveActionLimiter` 别名替代 `articleActionLimiter`

### LOW 修复 (1项 + 1项保持)
- **L-1**: 共享错误处理工具 — 保持现状（当前实现更优）
- **L-2**: Zod schema `description` 空字符串 `.transform(v => v || null)`

## 测试结果

- project 测试: 630 passed（原 625 + 新增 5）
- build: ✅ 通过
- lint: ✅ 通过
