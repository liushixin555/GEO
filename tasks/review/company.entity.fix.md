# apis/entity/company.entity.ts — 软件开发专家评审修复报告

**修复日期**: 2026-05-24
**修复角色**: 软件开发专家
**文件路径**: `apis/entity/company.entity.ts` 及关联文件
**基于评审**: 软件架构专家（company.entity.md）、代码安全专家（company.entity.security.md）、Committer 审核专家（company.entity.committer.md）

---

## 一、修复总览

基于三份评审报告（架构专家评分 4.0/10、安全专家评分 2.5/10、Committer 通过），修复了以下问题：

| 评审来源 | 问题编号 | 严重级别 | 修复状态 |
|----------|---------|---------|---------|
| SEC-H3 / ARCH-M1 | Entity 缺少 `deleted_at` 字段 | HIGH | ✅ 已修复 |
| SEC-C1 | 缺少 Zod Schema，运行时验证空白 | CRITICAL | ✅ 已修复 |
| SEC-C2 | `operator_ids` 无边界校验 | CRITICAL | ✅ 已修复 |
| SEC-H1 | 字符串字段无长度约束 | HIGH | ✅ 已修复 |
| SEC-H2 | `contact_phone` 无格式验证 | HIGH | ✅ 已修复 |
| ARCH-C1 | Service 层循环 N+1 更新 | CRITICAL | ✅ 已修复 |
| ARCH-H2 | Map 层 `any` 输入类型 | HIGH | ✅ 已修复 |
| ARCH-M1 | `getById` 不排除软删除 | MEDIUM | ✅ 已修复 |
| ARCH-M3 | `operator_ids` 操作语义不明确 | MEDIUM | ✅ 已修复 |

---

## 二、修改文件清单

### 1. `apis/entity/company.entity.ts`
- 补全 `deleted_at: Date | null` 字段（与 Prisma Schema 对齐）
- 为 `operator_ids`/`viewer_ids` 添加 JSDoc 说明全量替换语义

### 2. `apis/map/index.ts`
- `mapCompany` 输入类型从 `any` 改为 `PrismaCompany`（引入 `@prisma/client` 类型）
- 补全 `deleted_at: prismaCompany.deletedAt` 映射

### 3. `apis/schema/company.schema.ts`（新建）
- 创建 Zod Schema，定义 `createCompanySchema` 和 `updateCompanySchema`
- 字符串长度约束：short_name(50)、full_name(200)、address(500)、contact_person(100)、contact_phone(20)
- 电话格式验证：正则 `/^[\d\-+()#\s]+$/`
- ID 约束：`z.number().int().positive()`
- 数组长度限制：operator_ids max(100)、viewer_ids max(100)

### 4. `apis/controller/company.controller.ts`
- 移除 `validateCompanyBody` 和 `buildCompanyRequest` 手动验证函数
- 使用 `createCompanySchema.safeParse` 和 `updateCompanySchema.safeParse` 替代
- Zod 验证错误消息使用中文自定义消息

### 5. `apis/service/impl/company.service.impl.ts`
- `list()`: 添加 `where: { deletedAt: null }` 软删除过滤
- `getById()`: 检查 `company.deletedAt`，已删除返回 404
- `create()`: 添加 `validateUserIds` 校验 → `updateMany` 批量操作
- `update()`: 添加 `findUnique` 存在性/软删除检查 → 解绑旧用户（单次 `updateMany`） → `validateUserIds` → 批量绑定
- `toggleStatus()`: 检查 `existing.deletedAt`
- 新增 `validateUserIds` 私有方法：校验用户存在性、非 sysadmin 角色、启用状态

### 6. 测试文件更新
- `tests/apis/company.entity.test.ts`: 所有 Company/CompanyDetail 对象添加 `deleted_at: null`
- `tests/apis/company.controller.test.ts`: Mock 数据添加 `deletedAt: null`，create/update mock 改用 `updateMany` + `findMany`
- `tests/apis/company.service.test.ts`: 同步更新 mock 适配新 Service 实现

---

## 三、修复后验证

- **构建**: `pnpm build` 通过
- **测试**: 173 个 company 相关测试全部通过（3 个测试套件）
  - `company.entity.test.ts` ✅
  - `company.controller.test.ts` ✅
  - `company.service.test.ts` ✅

---

*软件开发专家修复完成 — 2026-05-24*
