# apis/entity/company.entity.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（类型安全、设计模式、代码规范、可维护性、安全防御纵深）
**文件路径**: `apis/entity/company.entity.ts`
**代码行数**: 39 行
**关联文件**: `apis/controller/company.controller.ts`, `apis/service/impl/company.service.impl.ts`, `prisma/schema.prisma`
**严重级别**: CRITICAL(1) / HIGH(3) / MEDIUM(4) / LOW(2)

---

## 一、评审总览

`company.entity.ts` 是公司模块的类型契约层，定义了 4 个接口（`Company`、`CreateCompanyRequest`、`UpdateCompanyRequest`、`CompanyDetail`）。文件结构清晰，字段命名统一使用 snake_case 与 API 契约保持一致，接口设计基本遵循了项目的分层模式。

但从软件质量视角审视，该文件存在**类型约束不足、缺少 Zod Schema、设计冗余、类型不一致**等问题。核心质量问题集中在：**缺少运行时验证机制、Create/Update 请求接口完全重复、CompanyDetail 内联对象类型未提取、Entity 与 Prisma Schema 之间存在字段映射缺失**。

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| 类型安全 | 4/10 | `as number[]` 强制断言绕过类型检查，ID 数组无正整数约束 |
| 设计模式 | 5/10 | Create/Update 接口完全重复，违反 DRY 原则 |
| 数据完整性 | 5/10 | `address` 字段 `undefined` vs `null` 语义不一致，缺少 Prisma `deleted_at` 字段 |
| 安全防御 | 4/10 | 无 Zod Schema，Controller 层使用不安全的 `as` 类型断言 |
| 可维护性 | 6/10 | 结构清晰但内联类型过多，变更时需同步修改多处 |
| 规范一致性 | 5/10 | 与同项目 User/Todo 模块相比缺少 Zod Schema，`contact_phone` 无格式约束 |

---

## 二、质量问题清单

### CRITICAL-1: 缺少 Zod Schema 验证，Controller 层使用不安全的 `as` 类型断言

**位置**: 整个文件 + `apis/schema/` 目录缺失 `company.schema.ts`

**问题**: 同项目中 `user.schema.ts` 和 `todo.schema.ts` 均使用 Zod 定义了严格的输入校验 schema，但公司模块**完全没有 Zod Schema**。Controller 层的 `buildCompanyRequest()` 函数使用 `as` 类型断言：

```typescript
// company.controller.ts 第 30-40 行
function buildCompanyRequest(body: Record<string, unknown>): CreateCompanyRequest {
  return {
    short_name: body.short_name as string,           // ← 不安全断言
    full_name: body.full_name as string,             // ← 不安全断言
    contact_person: body.contact_person as string,   // ← 不安全断言
    contact_phone: body.contact_phone as string,     // ← 不安全断言
    operator_ids: body.operator_ids as number[],     // ← 不安全断言，可注入任意类型
    viewer_ids: body.viewer_ids as number[] | undefined, // ← 不安全断言
  };
}
```

`as` 断言**不提供任何运行时保护**。攻击者可以构造以下请求：

```bash
# operator_ids 传入字符串数组，绕过类型检查
curl -X POST /api/companies \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"short_name":"test","full_name":"test","contact_person":"a","contact_phone":"1","operator_ids":["abc","def"]}'
```

Controller 的 `validateCompanyBody()` 仅检查 `Array.isArray(operator_ids)` 和 `operator_ids.length === 0`，**不检查数组元素类型**。字符串 `"abc"` 会通过验证，直到 Prisma 层的 `where: { id: operatorId }` 才会因类型不匹配报错。

**建议**: 创建 `apis/schema/company.schema.ts`，使用 Zod 定义完整的输入校验：

```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
  short_name: z.string().min(1).max(50),
  full_name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  contact_person: z.string().min(1).max(100),
  contact_phone: z.string().min(1).max(20),
  operator_ids: z.array(z.number().int().positive()).min(1),
  viewer_ids: z.array(z.number().int().positive()).optional(),
}).strict();

export const updateCompanySchema = createCompanySchema;

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
```

---

### HIGH-1: CreateCompanyRequest 与 UpdateCompanyRequest 完全重复，违反 DRY 原则

**位置**: 第 13-21 行（CreateCompanyRequest）与 第 23-31 行（UpdateCompanyRequest）

```typescript
// CreateCompanyRequest — 8 个字段
export interface CreateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}

// UpdateCompanyRequest — 完全相同的 8 个字段
export interface UpdateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}
```

两个接口**字段名、类型、可选性完全一致**。Controller 层也使用同一个 `buildCompanyRequest()` 函数构建两种请求对象，`validateCompanyBody()` 也复用于 Create 和 Update。这明确表明两个接口在业务逻辑上没有差异。

**风险**: 未来修改字段时容易遗漏其中一个接口，导致 Create 和 Update 行为不一致。

**建议**: 使用类型别名消除重复：

```typescript
export interface CompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}

export type CreateCompanyRequest = CompanyRequest;
export type UpdateCompanyRequest = CompanyRequest;
```

如果未来 Create 和 Update 需要分化（如 Update 允许部分字段可选），只需修改对应的类型别名即可。

---

### HIGH-2: CompanyDetail 内联对象类型未提取，可维护性差

**位置**: 第 33-38 行

```typescript
export interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: { id: number; cn_name: string; username: string }[];  // ← 内联对象
  viewer_ids: number[];
  viewers: { id: number; cn_name: string; username: string }[];    // ← 内联对象
}
```

`operators` 和 `viewers` 使用了完全相同的内联对象结构 `{ id: number; cn_name: string; username: string }`。

**问题**:
1. **重复定义**: 相同结构出现了 2 次，违反 DRY 原则
2. **与 Service 层不同步风险**: Service 层手动构建 `{ id: u.id, cn_name: u.cnName, username: u.username }`，如果需要新增字段（如 `role`），需同时修改 Entity 类型 + Service 实现
3. **不可复用**: 其他模块如果也需要展示"用户简要信息"（如 Project 详情），必须重新定义相同的内联结构

**建议**: 提取为命名的共享类型：

```typescript
/** 用户简要信息（用于关联展示） */
export interface UserSummary {
  id: number;
  cn_name: string;
  username: string;
}

export interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: UserSummary[];
  viewer_ids: number[];
  viewers: UserSummary[];
}
```

---

### HIGH-3: `operator_ids` 和 `viewer_ids` 类型为 `number[]` 但无正整数约束

**位置**: 第 19 行、第 29 行

```typescript
operator_ids: number[];
viewer_ids?: number[];
```

**问题**: TypeScript 的 `number` 类型允许负数、零、浮点数和 `NaN`。作为用户 ID 数组（Prisma `Int` 外键），这些值在 Entity 层无法被拦截：

```typescript
// 以下值都能通过 TypeScript 类型检查
const request: CreateCompanyRequest = {
  operator_ids: [-1, 0, 3.14, NaN],  // ← 全部合法！
  // ...
};
```

Service 层将这些 ID 直接传入 Prisma 的 `where: { id: operatorId }`，负数和零会查不到用户（静默失败），浮点数和 `NaN` 会导致 Prisma 运行时错误。

**建议**: 在 Zod Schema 中使用 `z.number().int().positive()` 约束，同时在 Entity 类型中添加 JSDoc：

```typescript
/** 用户 ID 列表（正整数） */
operator_ids: number[];
```

---

### MEDIUM-1: `address` 字段在 Entity 与 Request 中 `undefined` vs `null` 语义不一致

**位置**: 第 5 行（Entity）vs 第 16 行（CreateCompanyRequest）

```typescript
// Company Entity
address: string | null;       // ← null 表示无地址

// CreateCompanyRequest
address?: string;              // ← undefined 表示未传值

// Service 实现 (company.service.impl.ts 第 44 行)
address: request.address || null,  // ← 空字符串也被转为 null
```

**问题**: 三层语义不一致：
1. **Entity**: `string | null` — 数据库中地址要么有值，要么为 null
2. **Request**: `string | undefined` — 请求中可能不传此字段
3. **Service**: `request.address || null` — 空字符串 `""` 也被转为 `null`，这可能是无意行为

如果业务要求地址为空字符串是合法值，当前 Service 的 `|| null` 会错误地将其转为 null。

**建议**: 使用空值合并运算符替代逻辑或，明确语义：

```typescript
// Service 层
address: request.address ?? null,  // 仅当 undefined/null 时回退，保留空字符串
```

同时考虑在 Request 接口中统一使用 `string | null | undefined` 或添加 JSDoc 说明可选字段的含义。

---

### MEDIUM-2: Company Entity 缺少 Prisma `deleted_at` 软删除字段

**位置**: 第 1-11 行（Company 接口）

```typescript
export interface Company {
  id: number;
  short_name: string;
  // ... 其他字段
  updated_at: Date;
  // ← 缺少 deleted_at
}
```

Prisma Schema 定义了 `deletedAt DateTime? @map("deleted_at")`（第 26 行），表明 Company 使用了软删除模式。但 Entity 类型完全未暴露此字段。

**问题**:
1. **Service 层无法判断公司是否已软删除**: `getById()` 查询 `findUnique` 时不会自动排除已软删除的记录（除非有全局 scope）
2. **API 响应可能暴露已删除的公司**: 如果 `deleted_at` 有值，前端无法从 Entity 类型判断公司状态
3. **类型不完整**: Entity 是 Prisma 记录到 API 响应的映射契约，缺少字段意味着映射不完整

**建议**: 在 Company 接口中添加 `deleted_at` 字段，或明确说明为何不暴露：

```typescript
export interface Company {
  // ... 现有字段
  /** 软删除时间（null 表示未删除） */
  deleted_at: Date | null;
}
```

---

### MEDIUM-3: `contact_phone` 字段无格式约束，可接受任意字符串

**位置**: 第 7 行、第 18 行、第 27 行

```typescript
contact_phone: string;  // ← 任意字符串均可
```

**问题**: 联系电话是结构化数据，当前允许传入任意字符串（如 `"abc"`、`"<script>alert(1)</script>"`）。Controller 层的 `validateCompanyBody()` 仅检查 `!contact_phone`（空值检查），不验证格式。

**风险**:
1. **数据质量**: 数据库中可能存储无效的电话号码
2. **XSS 风险**: 虽然当前前端使用 Ant Design 组件渲染（默认安全），但电话号码中的 HTML 标签是不合理的数据
3. **国际号码支持**: Prisma `VarChar(20)` 可能不足以支持国际号码格式（如 `+86-138-0000-0000` = 16 字符，OK；但部分国家号码可能更长）

**建议**: 在 Zod Schema 中添加手机号格式校验：

```typescript
contact_phone: z.string().min(1).max(20).regex(
  /^[\d\-+().\s]+$/,
  '联系电话格式不正确'
),
```

---

### MEDIUM-4: CompanyDetail 中 `operator_ids` 与 `operators` / `viewer_ids` 与 `viewers` 数据冗余

**位置**: 第 33-38 行

```typescript
export interface CompanyDetail extends Company {
  operator_ids: number[];     // ← ID 列表
  operators: { id: number; cn_name: string; username: string }[];  // ← 完整信息（含 id）
  viewer_ids: number[];       // ← ID 列表
  viewers: { id: number; cn_name: string; username: string }[];    // ← 完整信息（含 id）
}
```

**问题**: `operator_ids` 中的每个 ID 都在 `operators` 数组中的对应对象的 `id` 字段中重复出现。前端可以从 `operators.map(o => o.id)` 获得 `operator_ids`，反之亦然。

**风险**:
1. **数据一致性**: 如果 service 层实现有 bug 导致 `operator_ids` 和 `operators` 的 ID 不一致，前端可能出现行为异常
2. **响应体积膨胀**: 每个公司详情响应中，ID 数组是完全多余的
3. **维护成本**: Service 层需要同时维护两份相关联的数据

**建议**: 评估前端是否实际使用 `operator_ids` / `viewer_ids`。如果前端仅使用 `operators` / `viewers`，可以考虑移除 ID 数组。如果确实需要（如提交表单），至少应在文档中说明两者的关联关系。

---

### LOW-1: `Company` 接口缺少 JSDoc 文档注释

**位置**: 第 1-11 行

```typescript
export interface Company {
  id: number;
  short_name: string;
  // ...
}
```

**问题**: 同项目的 `article.entity.ts` 已为关键字段添加了 JSDoc 注释（如 `/** 文章正文（纯文本，禁止 HTML） */`），但 `company.entity.ts` 没有任何注释。

**建议**: 为非自描述字段添加 JSDoc：

```typescript
export interface Company {
  id: number;
  /** 公司名称简称（最多 50 字符） */
  short_name: string;
  /** 公司名称全称（最多 200 字符） */
  full_name: string;
  /** 公司地址（最多 500 字符，可选） */
  address: string | null;
  /** 联系人姓名 */
  contact_person: string;
  /** 联系电话（最多 20 字符） */
  contact_phone: string;
  /** 公司状态（true=启用, false=禁用） */
  status: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

### LOW-2: Entity 字段命名使用 snake_case 与 TypeScript 惯例不一致

**位置**: 全文件

```typescript
export interface Company {
  short_name: string;    // ← snake_case
  full_name: string;     // ← snake_case
  contact_person: string; // ← snake_case
  // ...
}
```

**问题**: TypeScript 惯例推荐接口属性使用 `camelCase`（如 `shortName`、`fullName`）。但本项目使用 `snake_case` 是为了与 API 请求/响应的 JSON 字段名保持一致，这在 Controller → Entity → Service 的映射链中减少了转换成本。

**说明**: 这不是 bug，而是项目的**有意设计决策**。`mapCompany()` 函数负责 Prisma `camelCase` → Entity `snake_case` 的转换。此条目仅作为评审记录，**不要求修改**。

---

## 三、与同项目其他模块的质量对比

| 质量特性 | User 模块 | Todo 模块 | Article 模块 | Company 模块 |
|----------|-----------|-----------|-------------|-------------|
| Zod Schema | ✅ `user.schema.ts` | ✅ `todo.schema.ts` | ❌ 缺失 | ❌ **缺失** |
| 字段 JSDoc | ❌ 无 | ❌ 无 | ✅ 关键字段有 | ❌ 无 |
| 类型安全（枚举/字面量） | ✅ `UserRole` 类型 | — | ✅ `ArticleStatus` | ⚠️ 仅 `boolean` status |
| Create/Update 分化 | ✅ 有差异 | ✅ 有差异 | ✅ 有差异 | ❌ **完全相同** |
| 内联对象提取 | ✅ `UserListItem` | — | — | ❌ 内联 `{ id, cn_name, username }` |
| Prisma 字段对齐 | ✅ | ✅ | ⚠️ skills 不匹配 | ⚠️ 缺少 `deleted_at` |

Company 模块在 Zod Schema 和 Create/Update 差异化方面与 User/Todo 模块存在差距。

---

## 四、改进优先级

### P0 — 立即修复（影响数据安全和类型安全）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| 创建 `company.schema.ts` Zod Schema | 中 | CRITICAL-1: 运行时验证空白 |
| Controller 使用 Zod `parse()` 替代 `as` 断言 | 小 | CRITICAL-1: 不安全类型断言 |
| `operator_ids`/`viewer_ids` 添加正整数约束 | 小 | HIGH-3: ID 数组类型约束 |

### P1 — 短期修复（1 周内）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| 合并 `CreateCompanyRequest`/`UpdateCompanyRequest` | 小 | HIGH-1: DRY 违反 |
| 提取 `UserSummary` 共享类型 | 小 | HIGH-2: 内联对象重复 |
| Company 接口添加 `deleted_at` 字段 | 小 | MEDIUM-2: Prisma 字段对齐 |
| 添加 JSDoc 文档注释 | 小 | LOW-1: 文档缺失 |

### P2 — 中期改进

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| `contact_phone` 添加格式校验 | 小 | MEDIUM-3: 数据质量 |
| `address` 统一 `null`/`undefined` 语义 | 小 | MEDIUM-1: 类型不一致 |
| 评估 `operator_ids`/`viewer_ids` 冗余 | 中 | MEDIUM-4: 数据冗余 |

---

## 五、综合评分与总结

**综合质量评分: 5.0/10**

`company.entity.ts` 的**基本结构合理**，字段命名与 API 契约一致，接口分层清晰。但作为类型契约层，其在以下方面存在不足：

1. **最严重问题**: 缺少 Zod Schema，导致 Controller 层使用不安全的 `as` 类型断言，这是与同项目其他模块（User、Todo）的最大差距
2. **设计冗余**: Create/Update 接口完全重复，`operators`/`viewers` 内联对象未提取
3. **类型完整性**: 缺少 `deleted_at` 字段、ID 数组无正整数约束、`address` 语义不一致

从防御纵深角度，当前安全验证完全依赖 Controller 层的 `validateCompanyBody()`（仅做非空和数组类型检查），缺少值类型、格式、长度的运行时校验。Prisma 的 `VarChar` 约束提供了最终防线，但错误处理不够优雅（返回 500 而非 400）。

**建议**: 优先实施 P0 措施（创建 Zod Schema + 替换 `as` 断言），预计工作量 2-3 小时，可将质量评分提升至 7/10 以上。

---

## 六、Committer 裁决

**审核结论**: ✅ **通过（附条件）** — Entity 文件结构合理可保留，但 CRITICAL-1 和 HIGH-1 应在下次提交前修复。

### 裁定严重级别汇总

| 编号 | 原始级别 | 说明 |
|------|---------|------|
| CRITICAL-1 | CRITICAL | 缺少 Zod Schema + 不安全 `as` 断言，运行时类型安全空白 |
| HIGH-1 | HIGH | Create/Update 接口完全重复，违反 DRY |
| HIGH-2 | HIGH | 内联对象类型未提取，可维护性差 |
| HIGH-3 | HIGH | ID 数组无正整数约束 |
| MEDIUM-1 | MEDIUM | `address` undefined/null 语义不一致 |
| MEDIUM-2 | MEDIUM | 缺少 Prisma `deleted_at` 字段 |
| MEDIUM-3 | MEDIUM | `contact_phone` 无格式约束 |
| MEDIUM-4 | MEDIUM | operator_ids/operators 数据冗余 |
| LOW-1 | LOW | 缺少 JSDoc 文档注释 |
| LOW-2 | LOW | snake_case 命名（有意设计，不要求修改） |

### 行动计划

1. **本次迭代**: 创建 `company.schema.ts` Zod Schema + 合并 Create/Update 接口 — 预计 1-2 小时
2. **下次迭代**: 提取 `UserSummary` 共享类型 + 添加 JSDoc + 补全 `deleted_at` — 预计 1 小时
3. **后续迭代**: 电话格式校验、address 语义统一、评估数据冗余

**审核人**: 软件质量专家
**审核时间**: 2026-05-24
