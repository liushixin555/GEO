# apis/entity/knowledge-base.entity.ts — 软件质量评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 完整性 | 5.5/10 | MEDIUM |
| 一致性 | 4.0/10 | HIGH |
| 结构性 | 5.0/10 | MEDIUM |
| 可维护性 | 4.5/10 | HIGH |
| 文档性 | 2.0/10 | LOW |
| **综合** | **4.2/10** | **HIGH** |

---

## 1. HIGH — scope 联合类型三次重复定义，无 type alias

`'platform' | 'company' | 'project'` 在 3 个接口中逐字重复（第 5、24、32 行），项目内 Prisma 定义了 `KnowledgeScope` 枚举，但 TypeScript 层面未提取类型别名。

**对比**：`article.entity.ts` 定义了 `type ArticleStatus = 'draft' | ...` 然后在多处引用，是本项目的正确范例。

**影响**：新增 scope 值时需同步修改 3 处，遗漏即产生编译期不可检测的不一致。

**修复建议**：

```typescript
export type KnowledgeScope = 'platform' | 'company' | 'project';

export interface KnowledgeBase {
  // ...
  scope: KnowledgeScope;
  // ...
}
```

---

## 2. HIGH — Prisma schema 有 `deletedAt` 软删除字段，实体遗漏

Prisma `KnowledgeBase` 模型定义了 `deletedAt DateTime? @map("deleted_at")`（schema.prisma:223），但 `KnowledgeBase` 接口缺少 `deleted_at: Date | null` 字段。

**对比**：`Company` 实体正确包含 `deleted_at: Date | null`（company.entity.ts:11）。

**影响**：service 层实现软删除查询时，返回的 Prisma 对象中 `deleted_at` 字段无法映射到 TypeScript 类型，需 `as any` 或手动转换，破坏类型安全。

**修复建议**：在 `KnowledgeBase` 接口中添加 `deleted_at: Date | null;`。

---

## 3. MEDIUM — nullability 语义在 Entity 与 Create/Update 间不一致

| 字段 | Entity | CreateRequest | UpdateRequest |
|------|--------|---------------|---------------|
| `description` | `string \| null` | `string`（optional `?`） | `string`（optional `?`） |
| `company_id` | `number \| null` | `number`（optional `?`） | `number`（optional `?`） |

Entity 使用 `| null` 表示数据库中的 NULL 值，而 Request 接口使用 `?`（undefined）省略字段。语义正确但混用两套空值表达，在 service 层需要 `request.description ?? null` 转换，增加认知负担。

**对比**：`article.entity.ts` 的 CreateRequest 中 `images?: string[] | null` 同时使用 `?` 和 `| null`，更清晰地表达"可省略、也可显式传 null"。

**修复建议**：在 Create/Update 中对可能需要置空的字段使用 `field?: string | null`，明确区分"未提供"与"显式置空"。

---

## 4. MEDIUM — 聚合计数字段存入实体接口，无同步保障

`keyword_count`、`portrait_count`、`image_count`、`document_count`（第 13-16 行）是 Prisma schema 中不存在的聚合字段，由 service 层 SQL 聚合或计数注入。

**问题**：
- 接口无法区分"原始字段"和"计算字段"，消费者无法判断哪些字段可写
- `CreateKnowledgeBaseRequest` 和 `UpdateKnowledgeBaseRequest` 正确排除了这些字段，但缺乏明确的类型层面约束

**修复建议**：考虑定义 `KnowledgeBaseDetail extends KnowledgeBase` 将聚合计数放入扩展接口，或添加 JSDoc 注释标注只读属性。

---

## 5. MEDIUM — scope/company_id/project_id 缺乏关联约束表达

`CreateKnowledgeBaseRequest` 中 `scope`、`company_id`、`project_id` 三者均为独立可选/必填字段，类型层面无法表达业务约束：

- `scope: 'company'` 时，`company_id` 应为必填
- `scope: 'project'` 时，`project_id` 应为必填，`company_id` 从项目继承
- `scope: 'platform'` 时，`company_id` 和 `project_id` 应为空

当前 Zod schema（knowledge-base.schema.ts）也未对此做交叉验证，constraint 只能在 service impl 运行时检查。

**修复建议**：使用 TypeScript 判别联合（discriminated union）：

```typescript
type CreateKnowledgeBaseRequest =
  | { scope: 'platform' }
  | { scope: 'company'; company_id: number }
  | { scope: 'project'; project_id: number };
```

---

## 6. MEDIUM — 命名风格 snake_case 与项目其他实体一致但与 Prisma camelCase 不同

实体字段使用 `company_id`、`project_id`、`created_by`（snake_case），Prisma 模型使用 `companyId`、`projectId`、`createdBy`（camelCase）。service impl 层必须手动映射。

**现状**：这是项目整体设计决策（DB 列名 → 接口 snake_case → API JSON 输出 snake_case），所有实体文件一致采用。此问题属于项目级一致性，不作为本文件扣分项，但记录以供评估。

---

## 7. LOW — 零文档注释

36 行代码中无任何 JSDoc 注释。

**对比**：`article.entity.ts` 为关键字段添加了 `/** 文章类型，推荐值：... */`、`/** 文章正文（纯文本，禁止 HTML） */` 等业务语义注释；`company.entity.ts` 添加了 `/** 运营者用户 ID 列表（全量替换，传入空数组将清空所有运营者） */`。

**影响**：`scope` 的三个值含义、`status` 的启用/禁用语义、count 字段的来源，新开发者无法从接口定义直接理解。

**修复建议**：至少为 `scope`、`status`、四个 count 字段添加业务含义注释。

---

## 8. LOW — UpdateKnowledgeBaseRequest 允许空对象

`UpdateKnowledgeBaseRequest` 所有字段均为 optional，类型层面允许传入 `{}` 空对象，导致 service 层可能执行无意义的 UPDATE 语句。

**对比**：`Company` 实体的 `UpdateCompanyRequest extends CreateCompanyRequest` 要求全量字段；`Article` 的 `UpdateArticleRequest` 同样全 optional。

**修复建议**：Zod schema 层增加 `.refine(obj => Object.keys(obj).length > 0, '更新请求不能为空')` 或在类型层面使用至少一个必填字段的映射类型。

---

## 9. LOW — 未从 Zod schema 推导类型

项目同时维护手写 TypeScript 接口（knowledge-base.entity.ts）和 Zod schema（knowledge-base.schema.ts），两处定义需人工保持同步。

**修复建议**：使用 `z.infer<typeof createKnowledgeBaseSchema>` 从 Zod schema 推导 Request 类型，减少双重定义漂移风险。

---

## 问题汇总

| # | 严重度 | 类别 | 问题 | 修复复杂度 |
|---|--------|------|------|-----------|
| 1 | HIGH | 可维护性 | scope 联合类型三次重复，无 type alias | 低 |
| 2 | HIGH | 完整性 | Prisma deleted_at 字段遗漏 | 低 |
| 3 | MEDIUM | 一致性 | nullability 语义 Entity vs Request 不一致 | 低 |
| 4 | MEDIUM | 结构性 | 聚合计数字段与原始字段未区分 | 中 |
| 5 | MEDIUM | 完整性 | scope/company_id/project_id 缺乏关联约束 | 中 |
| 6 | MEDIUM | 一致性 | snake_case vs camelCase 双命名（项目级） | 高 |
| 7 | LOW | 文档性 | 零 JSDoc 注释 | 低 |
| 8 | LOW | 完整性 | Update 允许空对象 | 低 |
| 9 | LOW | 可维护性 | 手写类型与 Zod schema 双重定义 | 中 |

---

## 修复优先级建议

**必须修复**（阻断级）：#1 scope type alias、#2 deleted_at 遗漏

**建议修复**（提升质量）：#3 nullability 语义统一、#5 判别联合约束、#7 文档注释

**可选优化**（长期改善）：#4 聚合字段分离、#8 空对象防护、#9 Zod 类型推导

---

## 修复后预期评分

修复 #1 ~ #5 后预期综合评分：**7.0/10**
