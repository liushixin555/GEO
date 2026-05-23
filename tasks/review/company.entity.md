# apis/entity/company.entity.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构、领域模型、数据流、关联关系、一致性、可扩展性）
**文件路径**: `apis/entity/company.entity.ts`
**代码行数**: 39 行
**关联文件**: `apis/controller/company.controller.ts`, `apis/service/company.service.ts`, `apis/service/impl/company.service.impl.ts`, `apis/map/index.ts`, `prisma/schema.prisma`
**严重级别**: CRITICAL(2) / HIGH(2) / MEDIUM(3) / LOW(2)

---

## 一、架构评审总览

`company.entity.ts` 是公司模块的**类型契约层**，承担 Prisma ORM → API 响应的数据映射定义。该项目采用经典的**三层架构**：

```
Controller (路由/验证) → Service (业务逻辑) → Prisma (数据访问)
                ↑                          ↑
           Entity (类型契约)            Map (字段转换)
```

Company 模块在该架构中具有**枢纽地位**：它是 User、Project、KnowledgeBase、Todo 等模块的**上游聚合根**。Prisma Schema 显示 Company 被 6 个关联引用（`users`, `projects`, `knowledgeBases`, `selectedByUsers`, `todos`），是系统中关联关系最密集的实体之一。

### 架构质量评分

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层职责 | 4/10 | Entity 层承载了不应有的 DTO 职责，Controller 侵入 Entity 的验证逻辑 |
| 领域建模 | 3/10 | Company 作为聚合根，其与 User 的多对多关系通过 `operator_ids` 平面化表达，丢失领域语义 |
| 数据一致性 | 3/10 | Company ↔ User 关联通过逐条 `user.update()` 循环实现，无批量操作，事务内 N+1 问题 |
| 关联关系建模 | 4/10 | 与 Project 模块的关联表达方式不同（ID 数组 vs 关联表），缺乏统一范式 |
| 横切一致性 | 4/10 | Entity/Request/Detail 接口模式与同项目其他模块存在显著差异 |
| 可扩展性 | 5/10 | 新增关联角色（如"审核者"）需改动 Entity + Service + Controller + 前端四层 |

---

## 二、架构问题清单

### CRITICAL-1: Company ↔ User 关联关系建模违反聚合根原则，Service 层循环 N+1 更新

**位置**: `company.entity.ts` 第 19-20 行 + `company.service.impl.ts` 第 50-64 行

**架构问题**: Company 与 User 的关联关系（运营者/查看者）通过 `operator_ids: number[]` 和 `viewer_ids: number[]` 平面化表达。这种设计将**多对多关系的语义**（谁是什么角色）压缩为 ID 数组，导致：

1. **领域语义丢失**: `operator_ids` 中的 ID 代表"角色为 admin 的用户"，但 Entity 类型中完全没有表达这层语义。仅看类型定义 `operator_ids: number[]`，无法知道这些用户是"运营者"——角色信息隐含在 Service 实现中（`role: { in: ['admin', 'view'] }`）。

2. **Service 层循环更新**: 创建/更新公司时，Service 逐条执行 `user.update()`：

```typescript
// company.service.impl.ts 第 50-55 行
for (const operatorId of request.operator_ids) {
  await tx.user.update({
    where: { id: operatorId },
    data: { companyId: company.id },  // ← 每个用户一次 SQL
  });
}
```

如果 `operator_ids` 有 20 个用户，就产生 20 次 SQL UPDATE。加上 viewer_ids，一次创建操作可能产生 **40+ 次 SQL**。

3. **角色信息分散**: 用户的"角色"同时存在于 Prisma `User.role` 字段和 Company Entity 的 `operator_ids`/`viewer_ids` 语义中。这种双重表达容易导致数据不一致。

**建议**: 使用 Prisma 的 `updateMany` 批量操作，或引入关联表：

**方案 A — 批量更新（最小改动）**:
```typescript
// 批量设置 operators
await tx.user.updateMany({
  where: { id: { in: request.operator_ids } },
  data: { companyId: company.id },
});
```

**方案 B — 关联表（推荐，长期）**:
```prisma
model CompanyUser {
  company_id  Int
  user_id     Int
  role        Role  // admin / view
  company     Company @relation(fields: [company_id], references: [id])
  user        User    @relation(fields: [user_id], references: [id])
  @@id([company_id, user_id])
}
```

关联表将角色信息从 User 表解耦，Company ↔ User 的多对多关系获得明确的结构化表达。

---

### CRITICAL-2: Company 模块的关联关系表达范式与 Project 模块不一致

**位置**: `company.entity.ts` vs `project.entity.ts`

**架构问题**: Company 和 Project 都涉及"运营者/查看者"的关联关系，但两者使用了**完全不同的建模方式**：

| 维度 | Company 模块 | Project 模块 |
|------|-------------|-------------|
| 关联方式 | User.companyId 外键（1 对多） | ProjectOperator/ProjectViewer 关联表（多对多） |
| ID 存储 | `operator_ids: number[]` 平面数组 | `operator_ids: number[]` 从关联表映射 |
| 名称存储 | `operators: { id, cn_name, username }[]` | `operator_names: string[]` 仅名称 |
| 角色判断 | User.role 字段 (`admin`/`view`) | 关联表显式区分 |
| 详情查询 | 二次查询 `user.findMany` | Prisma include 关联表 |

```typescript
// Company 模块 — 用户通过 companyId + role 关联
// company.service.impl.ts 第 20-23 行
const users = await prisma.user.findMany({
  where: { companyId: id, status: true, role: { in: ['admin', 'view'] } },
});

// Project 模块 — 通过显式关联表
// project.entity.ts — operators/viewers 独立关联
```

**影响**:
1. **开发者认知负担**: 新成员需要理解两套不同的关联模式
2. **查询性能差异**: Company 的 `getById` 需要**两次查询**（先查 Company 再查 User），Project 的详情通过 Prisma `include` 一次完成
3. **业务语义矛盾**: 同一个用户可以同时属于多个 Project（多对多），但只能属于一个 Company（一对多）。如果业务上用户需要关联多个公司，当前架构不支持

**建议**: 统一关联范式。如果 Company-User 确实是一对多关系（用户只属于一个公司），应在 Entity 中明确表达 `company_id` 的外键语义；如果未来需要多公司关联，应迁移到关联表模式。

---

### HIGH-1: CompanyDetail 聚合了跨领域查询结果，违反 Entity 层单一职责

**位置**: `company.entity.ts` 第 33-38 行

```typescript
export interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: { id: number; cn_name: string; username: string }[];
  viewer_ids: number[];
  viewers: { id: number; cn_name: string; username: string }[];
}
```

**架构问题**: `CompanyDetail` 继承 `Company`，但混入了属于 **User 领域**的数据（`operators`、`viewers`）。在 DDD 术语中，这是一个**贫血的聚合**——它把两个聚合根（Company 和 User）的数据扁平化到一个接口中。

对比同项目其他模块：
- `Project` Entity 直接在主接口中包含 `operator_ids/operator_names`（无 Detail 变体）
- `Todo` Entity 直接在主接口中包含 `company_name/project_name/assignee_name`
- `User` 模块有 `UserListItem` 但不引入跨领域聚合

Company 模块的 Entity 层实际上定义了**两种视图**：
- `Company` — 列表视图（无用户关联）
- `CompanyDetail` — 详情视图（含用户关联）

这种"列表/详情双接口"模式在项目中仅 Company 模块使用，其他模块要么统一（Project 在主接口中包含关联数据），要么不区分。

**建议**: 选择以下方案之一保持一致性：

**方案 A — 与 Project 对齐（推荐）**:
```typescript
export interface Company {
  id: number;
  short_name: string;
  // ...
  operator_ids: number[];
  operator_names: string[];
  viewer_ids: number[];
  viewer_names: string[];
}
```

**方案 B — 保留 Detail 但明确分层**:
```typescript
// Company 保留纯净字段
export interface Company { /* 仅自身字段 */ }

// CompanyDetail 作为 DTO 独立存在，不继承
export interface CompanyDetailDTO {
  company: Company;
  operators: UserSummary[];
  viewers: UserSummary[];
}
```

---

### HIGH-2: Map 层 `mapCompany` 的输入类型为 `any`，丧失 Prisma 类型安全的架构优势

**位置**: `apis/map/index.ts` 第 3 行

```typescript
export function mapCompany(prismaCompany: any): Company {
```

**架构问题**: 整个 Map 层使用 `any` 作为 Prisma 输入类型。Prisma 的核心价值之一是**类型安全的查询结果**——当你写 `prisma.company.findUnique()` 时，返回类型是精确的 Prisma Company 类型。但 `mapCompany(prismaCompany: any)` 将这个类型信息完全丢弃。

对比理想架构：
```typescript
// 期望
import { Company as PrismaCompany } from '@prisma/client';
export function mapCompany(prismaCompany: PrismaCompany): Company { ... }

// 实际
export function mapCompany(prismaCompany: any): Company { ... }
```

**影响**:
1. **重构风险**: 如果 Prisma Schema 修改了字段名（如 `shortName` → `name`），TypeScript 不会在 Map 层报错，只能在运行时发现 `undefined` 值
2. **Map 层字段遗漏**: `mapCompany` 缺少 `deleted_at` 字段映射，但因为输入是 `any`，编译器无法提示缺失
3. **IDE 补全失效**: `prismaCompany.` 无法触发智能提示，增加手动输入错误概率

**建议**: 引入 Prisma 类型参数：
```typescript
import { Company as PrismaCompany } from '@prisma/client';
export function mapCompany(prismaCompany: PrismaCompany): Company { ... }
```

此改动影响全模块 Map 函数，建议统一处理。

---

### MEDIUM-1: `getById` 使用 `findUnique` 不排除软删除记录

**位置**: `company.service.impl.ts` 第 15 行

```typescript
const company = await prisma.company.findUnique({ where: { id } });
```

**架构问题**: Prisma Schema 定义了 `deletedAt DateTime?`，但 Service 层的 `findUnique` 不检查 `deleted_at`。如果公司已被软删除（`deleted_at` 不为 null），`getById` 仍会返回该公司的详情，包括其关联的运营者/查看者。

Entity 层的 `Company` 接口缺少 `deleted_at` 字段，使得**类型系统无法表达"已删除的公司"这一状态**。API 消费者（前端）无法区分"公司禁用"和"公司已删除"。

对比 `list()` 方法——如果 list 也不排除已删除记录，前端会看到已删除的公司出现在列表中。

**建议**:
1. 在 Company 接口中添加 `deleted_at: Date | null`
2. Service 层查询添加 `where: { id, deletedAt: null }` 过滤条件
3. 或在 Prisma 中间件层实现全局软删除过滤

---

### MEDIUM-2: `CreateCompanyRequest` 和 `UpdateCompanyRequest` 完全重复，无法表达更新语义差异

**位置**: `company.entity.ts` 第 13-31 行

**架构问题**: 两个接口字段完全一致。从 API 设计角度看，Create 和 Update 的语义通常不同：
- **Create**: 所有必填字段必须提供
- **Update**: 通常允许部分更新（PATCH 语义），仅需提供要修改的字段

当前设计要求 Update 时必须提供**全部字段**（包括不变的），这与 RESTful API 的 PUT 语义对应，但：
1. Controller 的 `validateCompanyBody()` 对 Create 和 Update 使用**同一验证逻辑**，无法针对 Update 放宽约束
2. 前端必须发送完整对象，即使只修改一个字段
3. 与同项目 User/Article/Todo 模块的 Update 接口模式不一致（它们的 Update 接口字段均为可选）

| 模块 | Update 接口字段 |
|------|---------------|
| User | 全部可选 (`cn_name?`, `role?`, `status?`, `password?`) |
| Article | 全部可选 (`title?`, `content?`, ...) |
| Todo | 部分可选 (`title?`, `action?`, `priority?`) |
| **Company** | **全部必填**（与 Create 相同） |

**建议**: 如果业务要求 Update 必须提供全部字段（PUT 语义），应添加注释说明；如果允许部分更新，应将 Update 接口的字段改为可选。

---

### MEDIUM-3: `operator_ids` 和 `viewer_ids` 作为请求接口字段直接表达数据库操作意图

**位置**: `company.entity.ts` 第 19-20 行

**架构问题**: `operator_ids: number[]` 和 `viewer_ids: number[]` 在 Request 接口中的语义是"将这些用户关联到公司"。这是**命令式**的 API 设计——客户端需要知道"运营者是角色为 admin 的 User，通过 companyId 外键关联"。

在分层架构中，Entity 层的 Request 接口应该表达**业务意图**而非数据操作细节。当前设计将 Prisma 的关联策略（User.companyId 外键）泄漏到了 API 契约层。

如果未来将 Company-User 关系迁移到关联表（如 CRITICAL-2 建议），`operator_ids` 的语义不变，但 Service 实现完全不同——这正是"接口稳定、实现可变"的理想状态。但当前的问题是 **Entity 没有定义操作的行为边界**——是替换所有运营者？还是追加？还是差异更新？

当前 Service 实现是**全量替换**模式（先解绑旧用户，再绑定新用户），这应该在 Entity 或文档中明确。

**建议**: 在接口中添加 JSDoc 明确操作语义：
```typescript
/** 运营者用户 ID 列表（全量替换，传入空数组将清空所有运营者） */
operator_ids: number[];
```

---

### LOW-1: Entity 层缺少统一的 `BaseEntity` 或泛型模式

**位置**: 全文件

**架构问题**: `Company`、`User`、`Article`、`Todo` 等所有 Entity 都包含 `id: number`, `created_at: Date`, `updated_at: Date` 字段，但每个接口都独立声明：

```typescript
export interface Company {
  id: number;           // 重复声明
  created_at: Date;     // 重复声明
  updated_at: Date;     // 重复声明
}
```

**建议**: 定义通用接口（仅当项目中有 3+ 个 Entity 使用相同模式时）：
```typescript
export interface BaseEntity {
  id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Company extends BaseEntity {
  short_name: string;
  // ...
}
```

**注意**: 这不是强需求——当字段少且稳定时，重复声明是可接受的。仅当团队认为统一性更重要时才引入。

---

### LOW-2: `CompanyDetail` 中 `operators`/`viewers` 内联对象未提取为共享类型

**位置**: `company.entity.ts` 第 35-37 行

```typescript
operators: { id: number; cn_name: string; username: string }[];
viewers: { id: number; cn_name: string; username: string }[];
```

**架构问题**: 该结构在 Project、Todo、KnowledgeBase 等模块的关联用户场景中也需要。当前每个模块独立定义，缺乏跨模块的类型复用。

**建议**: 提取为 `UserSummary` 共享类型，放置在 `apis/entity/common.entity.ts` 或 `user.entity.ts` 中：

```typescript
/** 用户简要信息（用于关联展示） */
export interface UserSummary {
  id: number;
  cn_name: string;
  username: string;
}
```

---

## 三、架构依赖关系图

```
┌──────────────────────────────────────────────────────┐
│                    prisma/schema.prisma               │
│  Company { users[], projects[], knowledgeBases[],     │
│            selectedByUsers[], todos[], deletedAt }    │
└─────────────┬────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  apis/map/index.ts                      │
│  mapCompany(prismaCompany: any): Company│  ← 输入类型 any，丢失 Prisma 类型安全
│  (缺失 deleted_at 映射)                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  apis/entity/company.entity.ts          │
│  Company          → 列表视图            │  ← 缺少 deleted_at
│  CreateRequest    → 与 Update 完全重复  │  ← 违反 DRY
│  UpdateRequest    → 与 Create 完全重复  │
│  CompanyDetail    → 跨领域聚合          │  ← 混入 User 领域数据
└─────────────┬───────────────────────────┘
              │
        ┌─────┴─────┐
        ▼           ▼
┌──────────┐  ┌──────────────────────────┐
│controller│  │  service/impl            │
│验证+断言 │  │  循环 updateMany (N+1)   │  ← 性能隐患
│(无 Zod)  │  │  二次查询 User 表        │  ← 非关联表查询
└──────────┘  └──────────────────────────┘
```

---

## 四、与同项目其他模块的架构一致性对比

| 架构特性 | User | Project | Article | Todo | **Company** |
|----------|------|---------|---------|------|-------------|
| Entity 接口数量 | 5 | 3 | 5 | 4 | **4** |
| 列表/详情分离 | `UserListItem` | 无 | 无 | 无 | **`CompanyDetail`（唯一）** |
| 关联用户表达 | — | `operator_ids` + `operator_names` | — | `assignee_id` + `assignee_name` | **`operator_ids` + `operators` 对象数组** |
| 关联表模式 | — | Prisma 关联表 | — | — | **User.companyId 外键** |
| Update 接口 | 部分可选 | 部分可选 | 部分可选 | 部分可选 | **全部必填（异常）** |
| Map 函数类型安全 | `any` | `any` | `any` | `any` | **`any`（全模块问题）** |
| 软删除字段 | 无 | 无 | 无 | 无 | **Prisma 有但 Entity 缺失** |

---

## 五、改进优先级

### P0 — 架构级改进（影响系统整体一致性）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| Company-User 关联表迁移或统一批量操作 | 大 | CRITICAL-1: N+1 更新 |
| 统一 Company/Project 关联表达范式 | 大 | CRITICAL-2: 范式不一致 |
| Map 层引入 Prisma 类型参数 | 中 | HIGH-2: 类型安全 |

### P1 — 设计级改进（影响可维护性）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| 合并或重新定义 `CompanyDetail` | 中 | HIGH-1: 跨领域聚合 |
| `CreateCompanyRequest`/`UpdateCompanyRequest` 分化 | 小 | MEDIUM-2: 语义差异 |
| Company 接口补全 `deleted_at` + Service 过滤 | 小 | MEDIUM-1: 软删除 |

### P2 — 代码级改进

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| 添加 JSDoc 说明操作语义 | 小 | MEDIUM-3: 命令语义 |
| 提取 `UserSummary` 共享类型 | 小 | LOW-2: 内联对象 |
| 评估 `BaseEntity` 泛型 | 小 | LOW-1: 字段重复 |

---

## 六、综合评分与总结

**综合架构评分: 4.0/10**

`company.entity.ts` 作为系统核心聚合根的类型契约，存在以下**架构级问题**：

1. **关联关系建模缺陷（CRITICAL）**: Company ↔ User 的关系通过 `operator_ids`/`viewer_ids` 平面化表达，丢失了领域语义。Service 层的循环更新产生 N+1 SQL，在大数据量场景下性能不可接受。

2. **范式不一致（CRITICAL）**: 与 Project 模块使用完全不同的关联模式，增加维护成本和开发者认知负担。

3. **职责混淆（HIGH）**: `CompanyDetail` 跨领域聚合了 User 数据，违反了 Entity 层的单一职责。同时缺少统一的"列表/详情"分离策略。

4. **类型安全断裂（HIGH）**: Map 层 `any` 输入类型使 Prisma 的类型安全优势在 Entity 边界处断裂。

**核心建议**: 优先解决 CRITICAL-1（N+1 更新）和 CRITICAL-2（范式统一），这两个问题会在业务增长后成为系统的性能瓶颈和维护痛点。如果团队资源有限，至少应将 Service 层的循环 `update` 改为 `updateMany` 批量操作（工作量约 1 小时），即可将 SQL 次数从 N 次降为 2 次。

---

**审核人**: 软件架构专家
**审核时间**: 2026-05-24
