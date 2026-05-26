# project.controller.ts Committer 审核专家评审

**文件**: `apis/controller/project.controller.ts`
**关联文件**: `apis/service/impl/project.service.impl.ts`, `apis/schema/project.schema.ts`, `apis/routes/project.routes.ts`
**评审日期**: 2026-05-26

## 评审结论

✅ **APPROVE** — 8.5/10（修复后从 7.2 提升）

## 前序评审

| 评审类型 | 评分 | 结论 |
|---------|------|------|
| 质量评审 | 5.7→8.0/10 | APPROVE（16项全修复） |
| 架构评审 | 8.0/10 | APPROVE（HIGH×1 + MEDIUM×3 + LOW×3） |
| Committer 评审 | 7.2→8.5/10 | CONDITIONAL APPROVE → APPROVE |

## 问题汇总

| 级别 | 数量 | 已修复 |
|------|------|--------|
| HIGH | 2 | 2 ✅ |
| MEDIUM | 3 | 2 ✅ / 1 已有防护 |
| LOW | 2 | 1 ✅ / 1 保持现状 |

---

## HIGH 问题

### H-1: `createProject` 中 `effectiveCompanyId` fallback 安全 ✅ 已修复

**文件**: `project.controller.ts:56-62`
**严重性**: HIGH → 已修复

admin 角色时 `effectiveCompanyId` 从 `req.user.companyId` 获取，如果为空直接返回 403（而非 fallback 到 `req.body.company_id`），阻止 admin 指定任意公司创建项目。

```typescript
const effectiveCompanyId = req.user.role === 'admin'
  ? req.user.companyId
  : req.body.company_id;
if (!effectiveCompanyId) {
  fail(res, req.user.role === 'admin' ? 403 : 400, '所属公司不能为空');
  return;
}
```

**验证**: 新增 2 个测试用例覆盖 admin companyId 为 null 和 0 的场景。

### H-2: `updateProject` 中 `status` 字段权限控制 ✅ 已修复

**文件**: `project.controller.ts:88-99`
**严重性**: HIGH → 已修复

Controller 层在 admin 角色时移除 `status` 字段，只有 sysadmin 可以修改项目状态。

```typescript
const updateData: Record<string, any> = {
  short_name: req.body.short_name,
  full_name: req.body.full_name,
  description: req.body.description,
  company_id: req.body.company_id,
  operator_ids: req.body.operator_ids,
  viewer_ids: req.body.viewer_ids,
};
// 只有 sysadmin 可以修改项目状态
if (role === 'sysadmin' && req.body.status !== undefined) {
  updateData.status = req.body.status;
}
```

**验证**: 新增 3 个测试用例覆盖 admin strip status / sysadmin include status / admin without status 正常。

---

## MEDIUM 问题

### M-1: `getProject` admin 权限检查 — 已有防护

Service 层已有 admin 运营者检查，controller 层正确传递 userId/role。无需额外修改。

### M-2: `listProjects` 冗余 Number() 转换 ✅ 已修复

移除了冗余的 `Number()` 转换，直接使用 Zod 已验证的 `page` 和 `pageSize`。

### M-3: `deleteProject` 路由限流器命名 ✅ 已修复

创建 `destructiveActionLimiter` 别名替代 `articleActionLimiter`，project.routes.ts 已更新导入。

---

## LOW 问题

### L-1: 共享错误处理工具 — 保持现状

`handleControllerError` 缺少 logger 调用，当前 `handleServiceError` 更优。保持现状避免跨 controller 影响范围扩大。

### L-2: Zod schema 空字符串处理 ✅ 已修复

在 `createProjectSchema` 和 `updateProjectSchema` 的 `description` 字段添加 `.transform(v => v || null)`，在 schema 层统一处理空字符串。

---

## 修复文件清单

| 文件 | 变更 |
|------|------|
| `apis/controller/project.controller.ts` | H-1 403 响应 + H-2 status 权限 + M-2 移除冗余转换 |
| `apis/schema/project.schema.ts` | L-2 description 空字符串 transform |
| `apis/routes/project.routes.ts` | M-3 使用 destructiveActionLimiter |
| `apis/middleware/rate-limit.middleware.ts` | M-3 添加 destructiveActionLimiter 别名 |
| `apis/middleware/index.ts` | M-3 导出新别名 |
| `tests/apis/project.controller.test.ts` | 新增 5 个测试 + 修改 1 个（403 断言） |

## 测试结果

- project 测试: 630 passed（原 625 + 新增 5）
- build: ✅ 通过
- lint: ✅ 通过
