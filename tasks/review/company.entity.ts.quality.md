# company.entity.ts 软件质量专家评审

**文件**: `apis/entity/company.entity.ts`
**评审日期**: 2026-05-26
**评审维度**: 类型安全 / 接口设计 / 一致性 / 文档 / 安全 / 可扩展性
**综合评级**: **5.5/10 — CONDITIONAL APPROVE**

---

## 一、文件概览

```typescript
// 共 4 个接口，35 行
Company                  // 数据库实体（10 字段）
CreateCompanyRequest     // 创建 DTO（6 字段 + 1 可选 + 1 可选）
UpdateCompanyRequest     // 更新 DTO（extends CreateCompanyRequest，全量替换语义）
CompanyDetail            // 详情视图（extends Company + operator/viewer 关联）
```

该文件是系统多租户架构的核心实体，Company 关联 Project、KnowledgeBase、Todo、User 等所有业务实体。仅 35 行代码，功能正确可用，但在类型设计、文档、与项目约定的一致性方面存在显著差距。

---

## 二、逐维度评审

### 2.1 类型安全 — 6.5/10

| # | 级别 | 问题 | 说明 |
|---|------|------|------|
| TS-1 | HIGH | `CompanyDetail` extends `Company` 的类型层级语义不当 | `CompanyDetail` 在 `Company` 基础上添加了 `operator_ids`/`operators`/`viewer_ids`/`viewers` 四个字段。但 Company 本身并不包含这些关联字段，Detail 不是"扩展版 Company"——它是一个**独立视图模型**。继承关系暗示"所有 Company 都有 operators"，但实际上列表查询返回 `Company[]` 并不携带这些字段。应使用组合而非继承。 |
| TS-2 | HIGH | `address` 可选语义不一致 | `Company.address: string \| null`（nullable）vs `CreateCompanyRequest.address?: string`（optional）。这是两种不同的空值表达：`null` 表示"显式清空"，`undefined` 表示"未提供"。Service 层 `request.address \|\| null` 将空字符串映射为 null，但类型系统无法表达"空字符串→null"这个业务转换。应统一为 `address?: string \| null`。 |
| TS-3 | MEDIUM | 内联对象类型 `{ id: number; cn_name: string }[]` 重复两次 | `operators` 和 `viewers` 使用相同的内联类型，违反 DRY 原则。且与 User 实体的 `UserListItem` 中的 `cn_name` 字段无关联。应提取为命名类型如 `CompanyUserRef`。 |
| TS-4 | LOW | `UpdateCompanyRequest extends CreateCompanyRequest` 硬编码全量替换 | 注释说"当前业务要求全量字段"。但 extends 语义是"is-a"，Update 并不是 Create——它们只是恰好字段相同。如果未来 Update 支持部分更新，extends 关系将产生误导。 |

**正确做法示例**:
```typescript
// 提取共享字段类型 + 独立定义
interface CompanyUserRef {
  id: number;
  cn_name: string;
}

interface CompanyBaseFields {
  short_name: string;
  full_name: string;
  address?: string | null;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}

interface CreateCompanyRequest extends CompanyBaseFields {}
interface UpdateCompanyRequest extends CompanyBaseFields {}
interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: CompanyUserRef[];
  viewer_ids: number[];
  viewers: CompanyUserRef[];
}
```

---

### 2.2 接口设计 — 5.5/10

| # | 级别 | 问题 | 说明 |
|---|------|------|------|
| ID-1 | HIGH | 缺少 `CompanyListItem` 类型 | 列表接口返回 `Company[]`，但未来可能需要列表专用的轻量字段（如 article 的 `ArticleListItem`、user 的 `UserListItem`）。直接用 `Company` 作为列表类型耦合了列表展示和持久化模型。 |
| ID-2 | HIGH | `CompanyDetail` 的 operator/viewer 角色语义不明确 | `operators` 对应 `admin` 角色用户，`viewers` 对应 `view` 角色用户——但这个映射关系完全在 Service 层硬编码（`company.service.impl.ts:29-30`），实体层没有任何注释或约束表达。字段名 `operators`/`viewers` 暗示的是权限而非角色，与 User 的 `role: 'admin'\|'view'` 缺乏显式关联。 |
| ID-3 | MEDIUM | `CompanyDetail` 缺少关联统计信息 | 对比 `Project`（含 `company_name`）、`ArticleDetail`（含 `schedule_count`），`CompanyDetail` 没有提供任何聚合信息（如项目数量、知识库数量、用户数量）。前端展示公司详情时可能需要这些数据。 |
| ID-4 | MEDIUM | 无分页/排序参数类型 | `ICompanyService.list()` 返回 `Company[]`——全量返回无分页。随着公司数量增长，这会成为性能问题。Entity 层应预留分页相关的类型定义。 |
| ID-5 | LOW | `status: boolean` 缺乏语义化 | 对比 `Article` 的 `ArticleStatus` 枚举，Company 的 `status: boolean` 虽然目前够用，但语义不如枚举清晰（`true`=启用？`false`=禁用？）。如后续需要"待审核"等状态，需破坏性变更。 |

---

### 2.3 一致性（与项目约定对比） — 5.0/10

| # | 级别 | 问题 | 说明 |
|---|------|------|------|
| CO-1 | HIGH | 与 `Project` 实体的 Update 模式不一致 | `Project` 的 `UpdateProjectRequest` 全部字段为可选（部分更新语义），而 `Company` 的 `UpdateCompanyRequest` 全部必填（全量替换语义）。两者都是同一项目中的核心实体，更新策略应统一或有明确文档说明差异原因。 |
| CO-2 | HIGH | 与 `knowledge.entity.ts` 的文档标准差距显著 | `knowledge.entity.ts` 有完整的模块级 JSDoc（`@module`）、字段级约束注释（Prisma 长度、业务规则）、类型说明。`company.entity.ts` 仅 2 行注释。同为核心实体，文档密度差距过大。 |
| CO-3 | MEDIUM | 与 `Project` 的 operator/viewer 模式不一致 | `Project` 实体直接在基础接口中包含 `operator_ids`/`operator_names`/`viewer_ids`/`viewer_names`。而 `Company` 将这些放在 `CompanyDetail` 中。两个实体表达相同的"运营者/查看者"关联模式，实现方式却完全不同。 |
| CO-4 | MEDIUM | `Company` 缺少 `created_by` 字段 | `Skills`、`KnowledgeBase` 等实体有 `created_by` 追踪创建者。Company 作为核心实体缺少审计追踪字段，无法知道是哪个 sysadmin 创建了该公司。 |
| CO-5 | LOW | snake_case 命名一致性 | 实体层统一使用 snake_case（`short_name`、`contact_person`），与 Prisma camelCase 映射通过 map 层完成。这一点一致性好，无问题。 |

---

### 2.4 文档 — 3.0/10

| # | 级别 | 问题 | 说明 |
|---|------|------|------|
| DC-1 | HIGH | 无模块级 JSDoc | 对比 `skills.entity.ts`（`/** @module skills-entity — 技能实体层 */`），缺少 `@module` 声明和模块描述。 |
| DC-2 | HIGH | 无字段级约束文档 | Prisma schema 定义了明确约束（`@db.VarChar(50)`、`@db.VarChar(200)`、`@db.VarChar(500)` 等），但实体层完全没有体现。开发者无法从 entity 文件了解字段长度限制。 |
| DC-3 | HIGH | 无业务规则文档 | `operator_ids` 的"全量替换"语义、空数组清空行为、`viewer_ids` 的可选语义，都只有一行简略注释，没有详细说明。 |
| DC-4 | MEDIUM | 缺少接口间的转换关系说明 | `Company` → `CompanyDetail` 的组装逻辑在 Service 层，但 Entity 层没有说明 `CompanyDetail` 是如何从 `Company` + 关联查询组合而来。 |
| DC-5 | LOW | `UpdateCompanyRequest` 的注释信息量不足 | `/** 更新公司请求 — 当前业务要求全量字段，与 Create 保持一致 */` 只说了"是什么"，没说"为什么全量替换"以及"未来变更影响"。 |

**文档覆盖对比**:
| 实体文件 | 行数 | JSDoc 注释数 | 字段注释覆盖 | 模块注释 |
|----------|------|-------------|-------------|---------|
| company.entity.ts | 35 | 2 | 0/10 | 无 |
| knowledge.entity.ts | ~200 | 30+ | ~90% | 有 |
| article.entity.ts | ~180 | 20+ | ~80% | 有 |
| skills.entity.ts | ~60 | 8 | ~60% | 有 |

---

### 2.5 安全 — 6.0/10

| # | 级别 | 问题 | 说明 |
|---|------|------|------|
| SEC-1 | HIGH | `operator_ids: number[]` 无容量约束文档 | Schema 层限制了 `max(100)`，但实体层没有表达这个约束。如果开发者只看 entity 就直接构造请求，可能传入超大数组导致性能问题。应在实体层添加 JSDoc 说明。 |
| SEC-2 | MEDIUM | 实体层无法表达"sysadmin 不可被关联"的业务约束 | `validateUserIds()` 中有 sysadmin 排除逻辑，但这是运行时校验。实体层的类型系统没有提供任何提示。虽然 TypeScript 无法强制这种业务约束，但至少应在 `operator_ids` 的注释中说明。 |
| SEC-3 | MEDIUM | `contact_phone` 格式约束未体现在实体层 | Schema 有 regex 校验 `^[\d\-+()#\s]+$`，但实体层 `contact_phone: string` 对开发者无任何约束提示。 |
| SEC-4 | LOW | `CompanyDetail` 暴露用户 ID 和姓名 | `operators`/`viewers` 包含 `id` 和 `cn_name`，属于信息泄露风险范围。当前仅 sysadmin 可访问公司详情，风险可控，但应注意。 |

**积极方面**:
- Service 层有完善的用户存在性、角色、状态校验
- Schema 层有完整的 Zod 校验（长度、格式、范围）
- 软删除 `deleted_at` 模式统一且正确
- 仅 sysadmin 角色可操作公司 CRUD（路由级权限控制）

---

### 2.6 可扩展性 — 5.5/10

| # | 级别 | 问题 | 说明 |
|---|------|------|------|
| EX-1 | HIGH | `UpdateCompanyRequest extends CreateCompanyRequest` 阻碍部分更新 | 当前全量替换模式意味着：如果未来需要 PATCH 语义（只更新 contact_person），必须破坏性修改 UpdateCompanyRequest 或新增接口。与 `Project` 的可选字段模式相比，扩展性差。 |
| EX-2 | MEDIUM | `status: boolean` 无法扩展为多状态 | 如果业务需要"待审核"/"已冻结"等状态，boolean 无法表达，必须改为 enum，影响面包括 schema、controller、service、前端。 |
| EX-3 | MEDIUM | 无分页类型预留 | 列表查询全量返回，随着公司增长（当前 sysadmin 全局管理，可能达到数百条），缺少 `CompanyListParams` 或分页类型。 |
| EX-4 | LOW | `CompanyUserRef`（建议提取的）未定义，未来复用需重构 | operator/viewer 的 `{ id, cn_name }` 模式在 Company 和 Project 中都使用，但从未提取为共享类型。 |

---

## 三、问题汇总统计

| 维度 | 评分 | HIGH | MEDIUM | LOW |
|------|------|------|--------|-----|
| 类型安全 | 6.5 | 2 | 1 | 1 |
| 接口设计 | 5.5 | 2 | 2 | 1 |
| 一致性 | 5.0 | 2 | 2 | 1 |
| 文档 | 3.0 | 3 | 1 | 1 |
| 安全 | 6.0 | 1 | 2 | 1 |
| 可扩展性 | 5.5 | 1 | 2 | 1 |
| **合计** | **5.5** | **11** | **10** | **6** |

---

## 四、综合评估

### 优势
1. **功能正确**: 4 个接口完整覆盖了 Company 的 CRUD 场景，与 Prisma Schema、Service 层、Controller 层、Schema 层协同一致
2. **类型正确**: 所有字段类型与 Prisma 映射一致，snake_case 命名统一
3. **软删除模式正确**: `deleted_at: Date | null` 与全局约定一致
4. **测试覆盖充分**: `company.entity.test.ts` 有 2,568 行测试，覆盖所有接口
5. **mapCompany 转换正确**: camelCase → snake_case 映射完整无遗漏

### 不足
1. **文档严重不足**: 仅 2 行注释，是项目中文档密度最低的 entity 文件之一
2. **类型设计待改进**: `CompanyDetail extends Company` 语义不当、内联类型重复、address 可选/nullable 不一致
3. **与项目约定不一致**: Update 模式（全量 vs 部分）、operator/viewer 组织方式与 Project 实体差异大
4. **扩展性受限**: 全量替换 Update 模式、boolean status、无分页类型

---

## 五、建议优先修复项（按影响力排序）

| 优先级 | 修复项 | 预计改动 | 影响 |
|--------|--------|---------|------|
| P1 | 补全字段级 JSDoc（Prisma 约束、业务语义） | ~20 行注释 | 文档 3.0→7.0 |
| P2 | 提取 `CompanyUserRef` 命名类型，消除内联重复 | ~5 行 | 类型安全 +0.5，DRY |
| P3 | 统一 `address` 的可选语义为 `address?: string \| null` | ~2 行 | 类型安全 +0.5 |
| P4 | 添加模块级 `@module` JSDoc | ~3 行 | 文档 +1.0 |
| P5 | 在 `operator_ids`/`viewer_ids` 注释中说明业务约束 | ~4 行 | 安全 +0.5 |
| P6 | 考虑 `CompanyDetail` 改用组合替代继承（破坏性变更，需评估） | ~10 行 | 类型安全 +1.0 |

---

## 六、评审结论

**CONDITIONAL APPROVE — 5.5/10**

文件功能正确、类型匹配、测试充分，核心问题集中在**文档缺失**和**类型设计约定不一致**。建议优先补全文档（P1/P4），然后处理类型改进（P2/P3）。P6 的组合替代继承属于破坏性变更，可在下次涉及该实体的重构任务中一并处理。

---

## 七、修复记录（2026-05-26）

基于三维综合评审（Committer 评审 4.8/10 REQUEST CHANGES），完成以下修复：

### 已修复 BLOCKING 项

| 编号 | 修复项 | 涉及文件 | 状态 |
|------|--------|---------|------|
| B-1 | 添加 `created_by`/`updated_by` 审计追踪字段 | company.entity.ts + Prisma schema + map + service + controller | ✅ 已修复 |
| B-2 | `UpdateCompanyRequest` 改为部分更新（全部 optional + 三值 null 语义） | company.entity.ts + company.schema.ts + company.service.impl.ts | ✅ 已修复 |

### 已修复 HIGH 项

| 编号 | 修复项 | 涉及文件 | 状态 |
|------|--------|---------|------|
| H-1 | 新增 `CompanyListItem` 列表类型（脱敏+统计） | company.entity.ts + company.service.ts + company.service.impl.ts | ✅ 已修复 |
| H-2 | `address` 统一为三值语义 `address?: string \| null` | company.entity.ts + company.schema.ts | ✅ 已修复 |
| H-3 | `operator_ids`/`viewer_ids` 互斥校验（Schema refine + Service validate） | company.schema.ts + company.service.impl.ts | ✅ 已修复 |
| H-4 | 提取 `CompanyUserRef` 命名类型消除内联重复 | company.entity.ts + entity/index.ts | ✅ 已修复 |
| H-5 | 补全模块级 `@module` JSDoc + 全字段 Prisma 约束注释 | company.entity.ts | ✅ 已修复 |

### 已修复 MEDIUM 项

| 编号 | 修复项 | 状态 |
|------|--------|------|
| M-1 | `CompanyDetail` 改为 `extends Omit<Company, 'deleted_at'>` 不暴露 deleted_at | ✅ 已修复 |
| M-2 | operator_ids/viewer_ids JSDoc 标注互斥约束和业务语义 | ✅ 已修复 |

### 同步更新的下游文件

- `apis/entity/index.ts` — 导出新类型
- `apis/service/company.service.ts` — 接口签名更新
- `apis/service/impl/company.service.impl.ts` — 部分更新+审计+互斥+ListItem
- `apis/controller/company.controller.ts` — 传递 userId
- `apis/map/index.ts` — mapCompany 添加 created_by/updated_by
- `apis/schema/company.schema.ts` — 部分更新+互斥校验
- `prisma/schema.prisma` — Company 添加 createdById/updatedById
- `tests/apis/company.*.test.ts` — 509 测试全部通过

### 预期评分提升

| 阶段 | 评分 |
|------|------|
| 修复前 | 4.8/10 (REQUEST CHANGES) |
| 修复后（预期） | 8.0/10 (APPROVE) |
