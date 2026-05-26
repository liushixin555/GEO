# company.entity.ts — 代码安全专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 输入校验完备性 | 6.0/10 | MEDIUM |
| 敏感数据保护 | 4.0/10 | HIGH |
| 授权模型表达 | 5.5/10 | MEDIUM |
| 不可变字段保护 | 6.5/10 | LOW |
| 审计追踪能力 | 2.5/10 | CRITICAL |
| 类型安全边界 | 5.0/10 | MEDIUM |
| **综合** | **5.0/10** | **CONDITIONAL APPROVE** |

**结论：CONDITIONAL APPROVE** — 存在 1 项 CRITICAL 级安全缺陷（零审计追踪，无法追溯操作者），3 项 HIGH 级问题（PII 无脱敏、operator/viewer 互斥缺失、deleted_at 泄露），4 项 MEDIUM 级问题。运行时安全由 Zod schema + Service `validateUserIds()` 提供较强保护，但 Entity 层作为"安全契约的第一入口"，缺乏约束文档、PII 标注和审计字段，属于"碰巧安全"而非"设计安全"。

---

## 安全防线分析

Entity 层在安全架构中的定位——类型定义是安全契约的**第一入口**，下游消费方（Schema/Service/Controller）依赖 Entity 理解数据边界。当前安全防线分布：

| 防线层 | 负责文件 | 状态 |
|--------|---------|------|
| **Entity 类型约束** | company.entity.ts | 缺失约束文档，类型边界模糊 |
| **Zod 运行时校验** | company.schema.ts | 完整（长度、格式、范围全覆盖） |
| **Service 业务校验** | company.service.impl.ts | 完整（validateUserIds 检查存在性、角色、状态） |
| **Controller 输入解析** | company.controller.ts | 正确（safeParse + 类型断言） |
| **路由鉴权** | company.routes.ts | 正确（仅 sysadmin 可访问） |
| **数据库约束** | schema.prisma | 完整（VarChar 长度、nullable） |

**关键问题**：安全防线集中在 Schema→Service→DB 三层，Entity 层几乎未参与安全契约。如果新增消费方（如批量导入、消息队列消费）绕过 Zod 直接使用 Entity 类型，将没有任何类型级安全保障。

---

## CRITICAL-1 — 零审计追踪，无法追溯操作者

**位置**：Company 全实体（L1-34）

Company entity 和 Prisma schema 均缺少 `created_by` / `updated_by` 字段：

```typescript
// 当前 — 无操作者追踪
export interface Company {
  id: number;
  short_name: string;
  // ...
  created_at: Date;    // 仅时间戳，无操作者
  updated_at: Date;    // 仅时间戳，无操作者
  deleted_at: Date | null;
}
```

**Prisma schema 同样缺失**：

```prisma
model Company {
  createdAt DateTime @default(now())   // 无 createdById
  updatedAt DateTime @default(now()) @updatedAt  // 无 updatedById
}
```

**安全影响**：

1. **无法追溯谁创建/修改了公司** — 多 sysadmin 环境下，任何 sysadmin 可创建/修改公司数据而无迹可查
2. **与项目其他实体不一致** — Article 有 `created_by`（L67），Skills 有 `createdBy`，KnowledgeBase 有 `created_by`，Company 是唯一缺少审计字段的业务核心实体
3. **合规风险** — 企业信息（公司名、联系人、电话）的变更缺乏审计链，不符合数据治理基线要求
4. **无法实现"操作日志"功能** — 未来若需"谁在何时将联系人从 A 改为 B"的需求，需回溯数据库 binlog，成本极高

**跨实体对比**：

| 实体 | created_by | updated_by | 审计能力 |
|------|-----------|-----------|---------|
| **Company** | **无** | **无** | **零审计** |
| Article | number \| null | — | 创建追踪 |
| Skills | number | — | 创建追踪 |
| KnowledgeBase | number \| null | — | 创建追踪 |
| Todo | number | — | 创建追踪 |

**修复建议**：

```typescript
export interface Company {
  id: number;
  // ...
  /** 创建者用户 ID（sysadmin），与 Article.created_by 一致 */
  created_by: number | null;
  /** 更新者用户 ID（sysadmin），用于审计追踪 */
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
```

---

## HIGH-1 — PII 字段（contact_phone, contact_person）在列表 API 无脱敏

**位置**：L6-7, Company 基础实体用于 list 响应

```typescript
export interface Company {
  // ...
  contact_person: string;   // PII — 真实姓名
  contact_phone: string;    // PII — 电话号码
}
```

`ICompanyService.list()` 返回 `Company[]`，直接暴露全部字段给前端：

```typescript
// company.service.impl.ts:8-15
async list(): Promise<Company[]> {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
  });
  return companies.map(mapCompany);  // ← 返回含 PII 的完整 Company
}
```

**安全影响**：

1. **过度暴露** — 列表页只需 short_name + full_name + status，却返回了联系电话和联系人
2. **浏览器端缓存** — PII 存在于前端内存/网络请求中，增加 XSS 的影响面
3. **违反最小权限原则** — 即使当前仅 sysadmin 可访问，也应按"字段级最小暴露"原则设计
4. **无法回退** — 前端一旦依赖这些字段，后续脱敏将成为破坏性变更

**项目先例**：`UserListItem` 隐藏了 `password_hash`，实现了实体/列表类型分离。

**修复建议**：

```typescript
/** 公司列表项（不含 PII） */
export interface CompanyListItem extends Omit<Company, 'contact_person' | 'contact_phone' | 'address' | 'deleted_at'> {
  // 预留聚合字段
  user_count?: number;
  project_count?: number;
}
```

---

## HIGH-2 — operator_ids / viewer_ids 缺少互斥校验，可导致权限混淆

**位置**：L20-23（CreateCompanyRequest）, L29-34（CompanyDetail）

```typescript
export interface CreateCompanyRequest {
  // ...
  operator_ids: number[];   // 运营者
  viewer_ids?: number[];    // 查看者 — 可与 operator_ids 重叠
}
```

**攻击场景**：

1. 攻击者（sysadmin）发送 `operator_ids: [1, 2], viewer_ids: [2, 3]` — 用户 2 同时出现在两个列表
2. Service 层 `validateUserIds()` 分别校验存在性、角色、状态，但**不检查两个数组的交集**
3. 在 `company.service.impl.ts:58-68` 中，用户 2 先被设为 operator（companyId=id），再被设为 viewer（companyId=id，幂等），看似无害
4. 但 `CompanyDetail` 的 `operators` 和 `viewers` 都会包含用户 2，前端显示为"同时是运营者和查看者"，违反业务语义
5. 如果未来引入基于 operator/viewer 的细粒度权限，重叠的 ID 将成为权限判断的歧义源

**修复建议**：

Entity 层添加互斥约束文档：

```typescript
export interface CreateCompanyRequest {
  // ...
  /** 运营者用户 ID 列表（全量替换）。与 viewer_ids 互斥，同一用户不可同时出现 */
  operator_ids: number[];
  /** 查看者用户 ID 列表（可选，全量替换）。与 operator_ids 互斥 */
  viewer_ids?: number[];
}
```

Schema 层添加交叉校验：

```typescript
export const createCompanySchema = z.object({
  // ...
}).refine(data => {
  const opSet = new Set(data.operator_ids);
  return !(data.viewer_ids?.some(id => opSet.has(id)));
}, { message: '同一用户不能同时出现在运营者和查看者列表中' });
```

---

## HIGH-3 — CompanyDetail 泄露 deleted_at 软删除元数据

**位置**：L29

```typescript
export interface CompanyDetail extends Company {  // ← 继承了 deleted_at: Date | null
  operator_ids: number[];
  operators: { id: number; cn_name: string }[];
  viewer_ids: number[];
  viewers: { id: number; cn_name: string }[];
}
```

`CompanyDetail extends Company` 继承了 `deleted_at` 字段，前端可获取：

1. 公司是否曾被软删除又恢复（`deleted_at !== null`）
2. 软删除的时间戳（`deleted_at` 值）
3. 通过时间戳推测系统管理行为模式

**安全影响**：虽然 Service 层已过滤 `deletedAt !== null`（company.service.impl.ts:20），但 `CompanyDetail` 作为 API 响应类型，在类型层面包含了不应暴露的字段。

**修复建议**：

```typescript
export interface CompanyDetail extends Omit<Company, 'deleted_at'> {
  operator_ids: number[];
  // ...
}
```

---

## MEDIUM-1 — address 类型不一致：Entity (string | null) vs DTO (string | undefined)，null 安全语义断裂

**位置**：L5 vs L17

```typescript
// Entity — 正确反映 Prisma String?
address: string | null;       // L5 — 数据库可能是 null

// CreateCompanyRequest — 缺少 null 清除能力
address?: string;             // L17 — 只能"提供"或"不提供"，无法"显式清除"
```

Service 层通过 `request.address || null`（company.service.impl.ts:52）硬编码转换，将空字符串 `""` 错误转为 `null`。Entity 层的类型定义没有表达这个语义，导致：

1. 调用者不知道 `""` 会被转为 `null`
2. 如果未来 address 需要支持空字符串作为合法值，类型系统无法阻止这种破坏
3. 与 `skills.entity.ts` 的三值语义（`description?: string | null`）不一致

**安全影响**：中等——类型语义断裂可能在 Update 时导致意外数据丢失（用户提交空字符串本意是"保留原值"，实际变成"清除地址"）。

---

## MEDIUM-2 — { id: number; cn_name: string } 内联类型无安全契约

**位置**：L31, L33

```typescript
operators: { id: number; cn_name: string }[];  // L31
viewers: { id: number; cn_name: string }[];    // L33
```

两个问题：

1. **无共享类型定义** — 相同结构重复定义，如果一处添加字段（如 `role`），另一处容易遗漏
2. **cn_name 未经 sanitize** — Entity 类型没有文档标注 cn_name 是否可信。虽然 cn_name 来自数据库（Prisma 查询），理论上已被转义，但 Entity 类型未表达这一安全属性

**修复建议**：提取命名类型并添加安全文档：

```typescript
/** 用户引用（ID + 姓名），数据来自 Prisma 查询，已转义 */
export interface UserRef {
  id: number;
  cn_name: string;
}
```

---

## MEDIUM-3 — UpdateCompanyRequest extends CreateCompanyRequest 的脆弱耦合

**位置**：L27

```typescript
/** 更新公司请求 — 当前业务要求全量字段，与 Create 保持一致 */
export interface UpdateCompanyRequest extends CreateCompanyRequest {}
```

**安全风险**：

1. 如果 `CreateCompanyRequest` 新增必填字段（如 `tax_id: string`），`UpdateCompanyRequest` 自动继承，Update API 立即要求新字段——可能被利用来强制客户端升级
2. `extends` 意味着"Update 是一种特殊的 Create"，语义错误。如果未来 Create 需要特殊字段（如验证码 `captcha`），Update 会错误地继承它
3. 与所有其他实体的 Update 模式不一致（Project/Skills/KnowledgeBase/User 的 Update 均为 optional 字段）

**架构评审已标注为 CRITICAL-1**（全量替换模式），此处从安全角度补充：脆弱耦合可能导致未来安全功能（如 CAPTCHA、操作确认码）意外泄露到 Update 路径。

---

## MEDIUM-4 — Company 实体缺少短名唯一性约束文档

**位置**：L2

```typescript
short_name: string;  // 无唯一性说明
```

Prisma schema 中 `shortName` **没有 `@unique` 约束**：

```prisma
shortName String @map("short_name") @db.VarChar(50)  // 无 @unique
```

Service 层也没有唯一性检查。这意味着：

1. 可以创建两个 `short_name` 完全相同的公司
2. 前端下拉框、用户选择公司时可能混淆
3. `LoginResponse.selected_company` 使用 `{ id, short_name }` 标识公司，同名公司会导致前端显示歧义

**Entity 层应有但缺少的约束文档**：

```typescript
/** 公司简称，最长 50 字符（Prisma @db.VarChar(50)）。业务上应唯一但数据库未强制 */
short_name: string;
```

---

## LOW-1 — 无 branded/opaque type 保护 ID，不同实体 ID 可混淆

**位置**：L2, L20-23

```typescript
id: number;              // Company.id 与 User.id 同类型
operator_ids: number[];  // 是 User.id 数组，但类型签名无法区分
```

TypeScript 的 `number` 无法区分 `CompanyId` 和 `UserId`。虽然这在 TypeScript 生态中不常见，但在安全敏感场景下，branded type 可防止参数传反：

```typescript
// 防御性设计（建议）
type CompanyId = number & { readonly __brand: 'CompanyId' };
type UserId = number & { readonly __brand: 'UserId' };
```

**判定**：当前项目规模（4 个核心实体）下风险较低，标记为 LOW。

---

## LOW-2 — 无 runtime type guard 导出

Entity 层仅导出 TypeScript 接口（编译期擦除），未提供运行时类型守卫。如果新增消费方绕过 Zod schema 直接使用 Entity 类型，无法在运行时验证数据形态。

**判定**：当前 Zod schema 覆盖完整，风险较低。

---

## LOW-3 — status: boolean 禁用公司的安全影响未文档化

**位置**：L8

```typescript
status: boolean;  // true=启用, false=禁用
```

当公司被禁用（status=false）时：

1. 关联的 admin/view 用户是否还能登录？
2. 关联的项目是否还可见？
3. 用户列表中是否还显示该公司？

Entity 层无文档说明这些级联安全行为。虽然这是 Service 层的职责，但 Entity 作为契约入口应至少标注 status 的业务语义。

---

## 安全评分矩阵

| 发现 | 严重级别 | CVSS 参考 | 修复优先级 | 修复成本 |
|------|---------|-----------|-----------|---------|
| C-1 零审计追踪 | CRITICAL | AU-2 | P0 | 需 Prisma migration + Service 改造 |
| H-1 PII 列表暴露 | HIGH | AC-3 (最小权限) | P1 | 新增 CompanyListItem + list 返回类型调整 |
| H-2 operator/viewer 互斥缺失 | HIGH | AC-4 (信息流) | P1 | Entity 文档 + Schema refine |
| H-3 deleted_at 泄露 | HIGH | SI-11 (错误处理) | P2 | CompanyDetail 改用 Omit |
| M-1 address 类型不一致 | MEDIUM | SI-10 (信息存储) | P2 | address?: string \| null |
| M-2 内联类型无安全契约 | MEDIUM | SA-3 (系统开发) | P3 | 提取 UserRef |
| M-3 extends 脆弱耦合 | MEDIUM | SA-4 (安全工程) | P3 | 独立定义 Update DTO |
| M-4 short_name 无唯一约束 | MEDIUM | SI-10 | P3 | 添加文档 + 评估 Prisma @unique |
| L-1 无 branded ID | LOW | — | P4 | 视项目规模决定 |
| L-2 无 type guard | LOW | — | P4 | 可选 |
| L-3 status 级联未文档 | LOW | — | P4 | JSDoc 补充 |

---

## 与关联评审的安全维度对比

| 评审 | 安全相关评分 | 核心安全问题 |
|------|------------|-------------|
| [质量评审](company.entity.ts.quality.md) | 安全 6.0/10 | "实体层无约束文档，但 Schema/Service 层覆盖完整" |
| [架构评审](company.entity.ts.architecture.md) | — | Update 全量替换 + 虚拟字段语义 + 类型复用 |
| **本次安全评审** | **5.0/10** | **零审计 + PII 暴露 + operator/viewer 互斥 + deleted_at 泄露** |

质量评审给安全 6.0 分的判断基于"Schema/Service 层覆盖完整"——这是正确的运行时评估。本次安全评审聚焦 Entity 层自身的设计安全性，评分更低（5.0）反映了 Entity 层作为安全契约入口的系统性缺失。

---

## 修复路线图

### 第一阶段（P0-P1，安全基线）

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| C-1 | 零审计追踪 | Prisma 添加 createdById/updatedById + Entity 字段 | 3h（含 migration + Service 改造） |
| H-1 | PII 列表暴露 | 新增 CompanyListItem，list() 返回脱敏类型 | 1h |
| H-2 | operator/viewer 互斥 | Schema 添加 refine + Entity JSDoc | 30min |
| H-3 | deleted_at 泄露 | CompanyDetail extends Omit<Company, 'deleted_at'> | 10min |

### 第二阶段（P2-P3，安全加固）

| # | 问题 | 修复方案 |
|---|------|---------|
| M-1 | address 类型不一致 | address?: string \| null（三值语义） |
| M-2 | 内联类型无契约 | 提取 UserRef + 安全文档 |
| M-3 | extends 脆弱耦合 | 独立定义 UpdateCompanyRequest |
| M-4 | short_name 唯一性 | 评估 Prisma @unique + Service 唯一校验 |

### 修复后预期评分

- 完成第一阶段：**7.0/10**（消除 CRITICAL + HIGH，审计+PII+互斥+泄露全部修复）
- 完成全部修复：**8.0/10**（类型安全边界完善，安全契约完整）

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | apis/entity/company.entity.ts |
| 行数 | 35 |
| 接口数量 | 4（Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail） |
| 评审类型 | 代码安全专家评审 |
| 评审日期 | 2026-05-26 |
| 评审结论 | CONDITIONAL APPROVE 5.0/10 |
| 关联文件 | apis/schema/company.schema.ts, apis/service/impl/company.service.impl.ts, apis/controller/company.controller.ts, apis/routes/company.routes.ts, apis/map/index.ts:6-19, prisma/schema.prisma:17-35 |
| 关联评审 | [质量评审](company.entity.ts.quality.md) 5.5/10 · [架构评审](company.entity.ts.architecture.md) 5.3/10 |
