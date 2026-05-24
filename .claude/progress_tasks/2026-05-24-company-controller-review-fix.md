# company.controller.ts 评审修复

> 日期: 2026-05-24
> 评审来源: tasks/review/company.controller.ts.quality.md (B-) + security (LOW) + committer (APPROVE)

## 修复内容

### P2 修复项（Merge 后一周内完成 — 已全部完成）

1. **Service 层异常体系对齐** (H-3 / SEC-M-02)
   - `company.service.impl.ts`: `throw new Error('公司不存在')` → `throw new NotFoundError('公司')`
   - `company.service.impl.ts`: 用户校验错误 → `throw new BusinessError(...)`
   - `company.controller.ts`: `isNotFoundError()` 字符串匹配 → `err instanceof NotFoundError` / `err instanceof BusinessError`

2. **toggleCompanyStatus 补 Zod schema** (H-2 / SEC-M-01)
   - 新增 `toggleCompanyStatusSchema` in `company.schema.ts`
   - 路由层增加 `validate(toggleCompanyStatusSchema)` 中间件
   - 移除 Controller 内手动 `typeof` 检查

3. **catch 块添加日志** (H-4)
   - 所有 5 个 catch 块添加 `console.error('[CompanyController] xxx failed:', err)`

### P2 改进项（已完成）

4. **移除 Controller 层 safeParse 死代码** (H-1 / SEC-L-01)
   - `createCompany`/`updateCompany` 移除 `safeParse`，直接使用 `req.body`

5. **消息常量补全** (M-3)
   - 新增 `MSG_ENABLED = '公司已启用'`、`MSG_DISABLED = '公司已禁用'`

### P3 修复项（已完成）

6. **parseInt 边界检查** (SEC-L-02)
   - `isNaN(id)` → `isNaN(id) || id <= 0`，拦截负数和零

## 变更文件

| 文件 | 变更 |
|------|------|
| `apis/service/impl/company.service.impl.ts` | import NotFoundError/BusinessError，替换 6 处 throw new Error() |
| `apis/schema/company.schema.ts` | 新增 toggleCompanyStatusSchema |
| `apis/routes/company.routes.ts` | import + validate(toggleCompanyStatusSchema) |
| `apis/controller/company.controller.ts` | 重构：移除 safeParse/isNotFoundError，改用 instanceof，添加日志，ID 边界检查 |
| `tests/apis/company.controller.test.ts` | 适配新异常体系/schema 验证/ID 边界检查 |

## 测试结果

- 113 个测试全部通过（含 company 相关全部套件）
- 367 个 company+auth 测试全部通过
