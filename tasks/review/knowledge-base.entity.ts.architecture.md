# apis/entity/knowledge-base.entity.ts — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 类型设计 | 4.0/10 | HIGH |
| 接口隔离 | 3.5/10 | CRITICAL |
| Prisma 对齐 | 4.0/10 | HIGH |
| 约束表达 | 3.0/10 | CRITICAL |
| 项目一致性 | 5.5/10 | MEDIUM |
| 可演进性 | 4.5/10 | HIGH |
| **综合** | **4.1/10** | **HIGH** |

**结论：REQUEST CHANGES** — 存在 2 项 CRITICAL 架构缺陷，3 项 HIGH 级别问题，阻断合并。

---

## CRITICAL-1 — KnowledgeBase 接口职责混淆：实体字段 / 关联解析 / 聚合计数 三者混合

`KnowledgeBase` 接口（第 1-19 行）混合了三种截然不同的数据来源：

| 类别 | 字段 | 来源 |
|------|------|------|
| 实体字段 | id, name, description, scope, status, created_at, updated_at | Prisma 单表 |
| 关联解析 | company_name, project_name, creator_name | Prisma JOIN 解析 |
| 聚合计数 | keyword_count, portrait_count, image_count, document_count | Prisma _count 聚合 |

**违反原则**：单一职责原则（SRP）。一个接口承载了三种数据获取策略，导致：

1. **消费者无法选择性消费**：前端只需要 `name + scope` 列表时，仍被迫接收 `_count` 聚合结果，触发不必要的 SQL COUNT 查询
2. **service impl 层被迫使用 `any`**：`mapKnowledgeBase(item: any)` （knowledge-base.service.impl.ts:20）因为 Prisma 返回类型（含 `_count`、关联对象）与 `KnowledgeBase` 接口结构完全不匹配
3. **创建/更新返回值的 count 字段语义错误**：新建的知识库 `keyword_count = 0` 并非数据库真实状态，而是映射函数的默认值（`?? 0`），掩藏了"尚未查询"与"查询为 0"的区别

**项目先例**：`company.entity.ts` 正确地分离了基础实体和详情扩展：

```typescript
// company.entity.ts — 正确模式
export interface Company { /* 基础字段 */ }
export interface CompanyDetail extends Company { operator_ids; operators; viewer_ids; viewers; }
```

**修复建议**：三层层级结构

```typescript
export interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  scope: KnowledgeScope;
  company_id: number | null;
  project_id: number | null;
  status: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface KnowledgeBaseDetail extends KnowledgeBase {
  company_name: string | null;
  project_name: string | null;
  creator_name: string | null;
  keyword_count: number;
  portrait_count: number;
  image_count: number;
  document_count: number;
}
```

---

## CRITICAL-2 — scope/company_id/project_id 缺乏类型级关联约束，判别联合缺失

`CreateKnowledgeBaseRequest`（第 21-27 行）将 `scope`、`company_id`、`project_id` 定义为独立字段：

```typescript
scope: 'platform' | 'company' | 'project';
company_id?: number;   // scope='platform' 时必须为空
project_id?: number;   // scope='company' 时必须为空
```

**问题**：TypeScript 类型系统无法捕获以下非法组合：

- `{ scope: 'platform', company_id: 1 }` — 平台级不应关联公司
- `{ scope: 'company' }` — 公司级缺少必填的 `company_id`
- `{ scope: 'project' }` — 项目级缺少必填的 `project_id`

service impl 层（knowledge-base.service.impl.ts:142-147）被迫在运行时手动校验：

```typescript
if (request.scope === 'company' && !request.company_id) {
  throw new BusinessError('公司公共知识库必须选择公司');
}
```

**修复建议**：判别联合（discriminated union）

```typescript
type CreateKnowledgeBaseRequest =
  | { name: string; description?: string; scope: 'platform' }
  | { name: string; description?: string; scope: 'company'; company_id: number }
  | { name: string; description?: string; scope: 'project'; project_id: number; company_id?: number };
```

这将把运行时校验提升为编译期类型检查，消除 `BusinessError` 分支。

---

## HIGH-1 — scope 联合类型三次重复定义，未提取 type alias

`'platform' | 'company' | 'project'` 在第 5、24、32 行逐字重复。Prisma 已定义 `KnowledgeScope` 枚举，但 TypeScript 层面未对应。

**项目先例**：`article.entity.ts` 正确提取了 `type ArticleStatus = 'draft' | ...`，然后在 `Article`、`CreateArticleRequest`、`UpdateArticleRequest` 三处引用。

**影响**：新增 scope 值（如 `'department'`）需同步修改 3 处 + Zod schema 1 处 + service impl N 处。TypeScript 无法在编译期检测遗漏。

**修复复杂度**：低 — 提取 `type KnowledgeScope` 即可。

---

## HIGH-2 — Prisma schema 有 deleted_at 软删除字段，实体遗漏

Prisma `KnowledgeBase` 模型（schema.prisma:223）定义了 `deletedAt DateTime? @map("deleted_at")`，但 `KnowledgeBase` 接口缺少对应字段。

**项目先例**：`Company` 实体（company.entity.ts:11）正确包含 `deleted_at: Date | null`。

**影响链**：

1. service impl 的 `delete()` 方法（knowledge-base.service.impl.ts:261）执行 `prisma.knowledgeBase.update({ data: { deletedAt: new Date() } })`，但 `mapKnowledgeBase()` 映射函数不映射此字段
2. `list()` 查询使用 `findFirst({ where: { id, deletedAt: null } })` 过滤软删除记录，但返回类型 `KnowledgeBase` 中无 `deleted_at`，消费者无法区分"活跃记录"和"软删除记录"
3. 未来若需实现"恢复已删除"功能，类型签名无法支持

---

## HIGH-3 — mapKnowledgeBase 接收 any 参数，类型安全在映射层断裂

`knowledge-base.service.impl.ts:20` 定义了：

```typescript
function mapKnowledgeBase(item: any): KnowledgeBase { ... }
```

`any` 参数绕过了 TypeScript 的全部类型检查，意味着：

1. Prisma 返回类型变更（如字段重命名 `companyId → companyRef`）时，映射函数不会产生编译错误
2. 聚合计数字段 `_count.keywords` 拼写错误不会被发现
3. 实体接口增加字段时，映射函数不会提示遗漏

**根因**：CRITICAL-1 导致 Prisma include 返回的复合类型与扁平 `KnowledgeBase` 接口结构不匹配，无法用 Prisma 生成的类型直接标注。

**修复建议**：修复 CRITICAL-1 后，使用 Prisma 生成的类型：

```typescript
type KnowledgeBaseWithRelations = Prisma.KnowledgeBaseGetPayload<{ include: typeof BASE_INCLUDE }>;
function mapKnowledgeBase(item: KnowledgeBaseWithRelations): KnowledgeBaseDetail { ... }
```

---

## MEDIUM-1 — nullability 语义在 Entity 与 Create/Update 间不一致

| 字段 | Entity | CreateRequest | 语义差异 |
|------|--------|---------------|----------|
| `description` | `string \| null` | `string`（optional `?`） | DB 可 NULL，Create 无法显式传 null |
| `company_id` | `number \| null` | `number`（optional `?`） | 同上 |

`article.entity.ts` 使用 `images?: string[] | null` 同时表达"可省略"和"可显式置空"，语义更清晰。

**影响**：service impl 中 `request.description || null`（knowledge-base.service.impl.ts:174）用 falsy 检查代替 null 检查，空字符串 `""` 会被错误地转为 `null`。

---

## MEDIUM-2 — IKnowledgeBaseService 使用原始 string 而非 KnowledgeScope

`knowledge-base.service.ts:4`：

```typescript
list(page, pageSize, search?, scope?: string, ...): Promise<...>;
```

`scope` 参数类型为 `string`，而非 `'platform' | 'company' | 'project'` 或提取的 `KnowledgeScope`。service 接口是架构的契约层，此处丢失了实体层定义的类型约束。

**影响**：controller 层可以传入任意 string 值（如 `scope='invalid'`），service impl 直接传递给 Prisma 查询（`where.scope = scope`），仅依赖 Prisma 运行时报错而非 TypeScript 编译期检查。

---

## MEDIUM-3 — 命名策略：snake_case 与 Prisma camelCase 双命名映射

实体字段 `company_id`、`project_id`、`created_by`（snake_case）与 Prisma 模型字段 `companyId`、`projectId`、`createdBy`（camelCase）不一致。

**现状**：这是项目整体设计决策 — API 输出使用 snake_case 以匹配数据库列名。所有实体文件一致遵循，`mapKnowledgeBase` 中逐字段手动映射。

**判定**：不作为本文件扣分项，但该映射模式导致每个 service impl 都需要一个 `mapXxx` 函数（目前已累积 10+ 个），属于项目级架构债务。建议长期引入统一映射层（如 `class-transformer` 或 Prisma `@map` 扩展）。

---

## MEDIUM-4 — UpdateKnowledgeBaseRequest 允许 scope 变更但类型未体现副作用

`UpdateKnowledgeBaseRequest`（第 29-36 行）允许修改 `scope`，但类型层面无法体现 scope 变更引发的级联副作用：

- `scope: 'company' → 'platform'`：应清除 `company_id`
- `scope: 'project' → 'company'`：应清除 `project_id`

service impl（knowledge-base.service.impl.ts:220-241）用 30 行 if-else 处理这些级联逻辑，但因为 Request 类型未区分"变更 scope"和"变更其他字段"两种操作模式，所有逻辑必须在运行时分发。

**对比**：这本质上是 CRITICAL-2 在 update 场景的延伸。如果 Create 使用判别联合，Update 也应考虑类似的联合类型或 Builder 模式。

---

## LOW-1 — 零文档注释，scope 值含义隐含

36 行代码中无任何 JSDoc。`scope` 的三个值 `'platform' | 'company' | 'project'` 的业务含义、`status` 的启用/禁用语义、四个 count 字段的数据来源，新开发者无法从类型定义直接理解。

**对比**：`article.entity.ts` 为关键字段添加了 `/** 文章类型，推荐值：榜单排名/... */` 等注释。

---

## LOW-2 — 手写 TypeScript 接口与 Zod Schema 双重维护

项目同时维护手写接口（knowledge-base.entity.ts）和 Zod schema（knowledge-base.schema.ts）。两者字段定义需人工保持同步：

- Zod schema 的 `name.max(200)` 约束在 TypeScript 接口中不可见
- Zod schema 的 `description.nullable()` 与 TypeScript 的 `description?: string` 语义微妙不同
- 新增字段时需同时修改两处

**建议**：使用 `z.infer<typeof createKnowledgeBaseSchema>` 从 Zod schema 推导 Request 类型。

---

## 架构改进路线图

### 第一阶段（阻断级，必须修复）

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| C-1 | 三职责混合 | 拆分 KnowledgeBase / KnowledgeBaseDetail | 2h |
| C-2 | 判别联合缺失 | CreateRequest 改为 discriminated union | 1h |
| H-1 | scope 三次重复 | 提取 KnowledgeScope type alias | 15min |
| H-2 | deleted_at 遗漏 | 接口添加 `deleted_at: Date \| null` | 5min |
| H-3 | any 映射 | 使用 Prisma 生成的 Payload 类型 | 1h |

### 第二阶段（质量提升）

| # | 问题 | 修复方案 |
|---|------|---------|
| M-1 | nullability 不一致 | Request 中使用 `field?: string \| null` |
| M-2 | service 接口 scope: string | 改为 `scope?: KnowledgeScope` |
| M-4 | Update scope 级联 | 评估 update 场景判别联合 |

### 第三阶段（长期优化）

| # | 问题 | 修复方案 |
|---|------|---------|
| L-2 | 双重定义 | Zod schema 推导 Request 类型 |
| L-1 | 零文档 | 为 scope/status/count 添加 JSDoc |

---

## 修复后预期评分

修复 C-1 + C-2 + H-1 + H-2 + H-3 后预期综合评分：**7.5/10**

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | apis/entity/knowledge-base.entity.ts |
| 行数 | 36 |
| 评审类型 | 软件架构专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | apis/schema/knowledge-base.schema.ts, apis/service/knowledge-base.service.ts, apis/service/impl/knowledge-base.service.impl.ts, prisma/schema.prisma:203-228 |
| 关联评审 | [质量评审](knowledge-base.entity.ts.quality.md) 4.2/10 |
