# apis/entity/knowledge-base.entity.ts — 代码安全专家评审

**评审日期**: 2026-05-26
**评审角色**: 代码安全专家（认证授权 · 输入验证 · 注入攻击 · 信息泄露 · 权限提升 · 数据边界）
**文件路径**: `apis/entity/knowledge-base.entity.ts`
**代码行数**: 36 行（3 个 exported interface）
**关联文件**: `apis/schema/knowledge-base.schema.ts`, `apis/controller/knowledge-base.controller.ts`, `apis/service/knowledge-base.service.ts`, `apis/service/impl/knowledge-base.service.impl.ts`, `prisma/schema.prisma:90-93, 203-228`

---

## 一、评审范围

`knowledge-base.entity.ts` 定义了知识库模块的三个核心 TypeScript 接口：`KnowledgeBase`（读模型）、`CreateKnowledgeBaseRequest`（创建输入）、`UpdateKnowledgeBaseRequest`（更新输入）。

作为类型定义层，本文件不直接包含运行时代码，但它是**安全契约的第一道防线** — 类型设计的缺陷会迫使安全校验下沉到 controller/service 运行时层，增加遗漏风险。本次评审以类型安全视角审查以下安全维度：

| 维度 | 关注点 |
|------|--------|
| 权限提升 | scope 变更是否可被类型系统阻止 |
| 数据边界 | scope/company_id/project_id 关联约束 |
| 信息泄露 | 实体是否暴露不该暴露的字段 |
| 输入验证 | 类型是否为下游提供充分约束 |
| 数据完整性 | 软删除/审计字段是否完整 |
| 消费者安全 | controller/service 层因类型缺陷被迫补的运行时检查 |

---

## 二、安全问题清单

### CRITICAL 级别

#### C-1: scope/company_id/project_id 无类型级关联约束 — 判别联合缺失

**位置**: 第 21-27 行 (`CreateKnowledgeBaseRequest`), 第 29-36 行 (`UpdateKnowledgeBaseRequest`)

**问题描述**: `scope`、`company_id`、`project_id` 三个字段在类型层面完全独立，TypeScript 编译器无法拦截以下非法组合：

```typescript
// 以下全部通过编译，但业务含义非法
{ scope: 'platform', company_id: 1, project_id: 2 }  // 平台级不应关联公司/项目
{ scope: 'company' }                                    // 公司级缺少必填 company_id
{ scope: 'project', company_id: 999 }                   // 项目级关联了无权公司
```

**安全影响链**:

1. **越权数据关联**: `scope: 'platform'` 配合 `company_id: 1` 会创建一个名义上是"平台级"但实际关联了特定公司的知识库。service impl (knowledge-base.service.impl.ts:168-169) 虽在 create 路径用 `scope === 'platform' ? null : ...` 清除关联，但 **update 路径未做同等清除**
2. **scope 变更提权**: `UpdateKnowledgeBaseRequest` 允许 `scope` 从 `'project'` 改为 `'platform'`。service impl (knowledge-base.service.impl.ts:220-237) 的级联清理依赖运行时 if-else，若 `request.scope === 'platform'` 分支未正确清除 `companyId`/`projectId`，项目级知识库将获得平台级可见性
3. **admin 跨公司绑定**: admin 角色可尝试 `{ scope: 'company', company_id: <其他公司ID> }`，虽然 service impl 有所有权校验 (knowledge-base.service.impl.ts:150-165)，但类型层面未表达"admin 只能绑定自己所属公司"的约束

**攻击场景**:
```
1. admin 用户 PUT /api/knowledge-bases/5 { scope: 'platform', company_id: 3 }
2. 若 service impl 的 scope 变更分支遗漏了 companyId 清除
3. 该知识库在 list() 中以 scope='platform' 出现在所有用户面前
4. 但 company_id 残留导致 Prisma 关联查询泄露其他公司的知识库数据
```

**修复建议**: 使用判别联合（discriminated union），将运行时约束提升为编译期约束：

```typescript
export type KnowledgeScope = 'platform' | 'company' | 'project';

type CreateKnowledgeBaseRequest =
  | { name: string; description?: string; scope: 'platform' }
  | { name: string; description?: string; scope: 'company'; company_id: number }
  | { name: string; description?: string; scope: 'project'; project_id: number; company_id?: number };
```

**修复复杂度**: 中 — 需同步修改 controller 和 service 层的类型签名

---

#### C-2: deleted_at 字段遗漏 — 软删除记录状态不可表达

**位置**: 第 1-19 行 (`KnowledgeBase`)

**问题描述**: Prisma schema (schema.prisma:223) 定义了 `deletedAt DateTime? @map("deleted_at")`，service impl 的 `delete()` 方法 (knowledge-base.service.impl.ts:261) 执行软删除 `prisma.knowledgeBase.update({ data: { deletedAt: new Date() } })`。但 `KnowledgeBase` 接口缺少 `deleted_at: Date | null` 字段。

**安全影响**:

1. **软删除记录泄露**: `getById()` (knowledge-base.service.impl.ts:108) 使用 `findFirst({ where: { id } })` — 注意：**未过滤 `deletedAt: null`**。已软删除的知识库可能通过 GET 请求返回给前端，而前端因为接口中无 `deleted_at` 字段，无法识别该记录已被删除
2. **mapKnowledgeBase 丢弃删除状态**: 映射函数 (knowledge-base.service.impl.ts:20-40) 不映射 `deletedAt`，返回的 `KnowledgeBase` 对象完全丢失了软删除信息
3. **恢复误删无类型支持**: 未来若需实现"恢复已删除"功能，类型签名无法表达操作目标

**对比**: `Company` 实体 (company.entity.ts:11) 正确包含 `deleted_at: Date | null`。

**修复建议**:

```typescript
export interface KnowledgeBase {
  // ... 现有字段
  deleted_at: Date | null;
}
```

同时修复 `getById` 查询添加 `deletedAt: null` 过滤，以及 `mapKnowledgeBase` 映射此字段。

---

### HIGH 级别

#### H-1: UpdateKnowledgeBaseRequest 允许 scope 变更 — 权限提升通道

**位置**: 第 29-36 行

**问题描述**: `UpdateKnowledgeBaseRequest` 中 `scope?: 'platform' | 'company' | 'project'` 允许在更新时变更知识库的作用域。从安全角度看，scope 是知识库的最高安全属性，决定数据的可见范围。

**攻击路径分析**:

| 变更 | 安全风险 | 现有防护 |
|------|---------|---------|
| project → company | 数据可见范围从项目扩大到公司 | service impl 级联清除 projectId，但**未校验操作者是否属于目标公司** |
| company → platform | 数据可见范围从公司扩大到全平台 | service impl 清除 companyId，但**sysadmin 以外的创建者不应有此权限** |
| project → platform | 跨两级扩大可见范围 | 同上 |

service impl (knowledge-base.service.impl.ts:192-194) 仅校验"只能修改自己创建的"，**未单独校验 scope 变更权限**。admin 用户创建的 project 级知识库，可被同一 admin 修改为 platform 级，绕过项目边界限制。

**修复建议**: 在 `UpdateKnowledgeBaseRequest` 中移除 `scope` 字段，scope 变更应通过独立的管理员 API 端点处理，或在 service impl 中对 scope 变更增加 `role === 'sysadmin'` 校验。

---

#### H-2: scope 联合类型三次重复定义 — 类型漂移导致授权不一致

**位置**: 第 5 行、第 24 行、第 32 行

**问题描述**: `'platform' | 'company' | 'project'` 在 3 个接口中逐字重复。Prisma 定义了 `KnowledgeScope` 枚举 (schema.prisma:90-93)，Zod schema (knowledge-base.schema.ts:13) 也独立定义了 `z.enum([...])`。三处定义需人工同步。

**安全影响**: 若新增 scope 值（如 `'department'`）时只修改了 Prisma 和 Entity 但遗漏了 Zod schema，或反之：
- Prisma 接受新值但 TypeScript 不认识 → 数据写入成功但读取时类型不安全
- Zod 接受新值但 Entity 不包含 → controller 层验证通过但 service 层类型断言失败
- Entity 接受新值但 Zod 不包含 → API 拒绝合法请求

**修复建议**: 提取 `type KnowledgeScope = 'platform' | 'company' | 'project'`，三处引用同一类型。Zod schema 使用 `z.enum<KnowledgeScope[]>([...])`。

---

#### H-3: mapKnowledgeBase 接收 any — 类型安全在映射层断裂

**位置**: knowledge-base.service.impl.ts:20

**问题描述**:

```typescript
function mapKnowledgeBase(item: any): KnowledgeBase { ... }
```

`any` 参数绕过了 TypeScript 全部类型检查。这意味着：
1. Prisma 查询返回的字段变更（如安全修复重命名 `apiKey`）不会产生编译错误
2. 意外的新字段可能被透传而不自知
3. 实体接口增加安全字段时（如 `deleted_at`），映射函数不会提示遗漏

**根因**: C-1 导致的 `KnowledgeBase` 接口结构与 Prisma include 返回的复合类型不匹配。

**修复建议**: 使用 Prisma 生成的 Payload 类型：

```typescript
type KnowledgeBaseWithRelations = Prisma.KnowledgeBaseGetPayload<{
  include: typeof BASE_INCLUDE;
}>;
function mapKnowledgeBase(item: KnowledgeBaseWithRelations): KnowledgeBaseDetail { ... }
```

---

#### H-4: UpdateKnowledgeBaseRequest 允许修改 company_id/project_id — 跨边界重绑定

**位置**: 第 33-34 行

**问题描述**: `company_id?: number` 和 `project_id?: number` 允许在更新时重新绑定知识库到不同的公司或项目。

**安全影响**:

1. admin 用户可将自己的知识库从 project A 重新绑定到 project B（即使不属于 B），service impl 的所有权校验 (knowledge-base.service.impl.ts:197-212) 仅校验"新的 company_id/project_id 是否属于当前用户"，**未校验"原知识库的数据是否应随绑定迁移"**
2. 重绑定后，project A 的用户失去对该知识库的访问，project B 的用户获得访问 — 但知识库内容可能包含 project A 的敏感数据

**修复建议**: company_id/project_id 变更应视为高敏感操作，建议：
- 类型层面：从 `UpdateKnowledgeBaseRequest` 中移除这两个字段
- 创建独立的"知识库转移"API，要求 sysadmin 权限 + 二次确认

---

### MEDIUM 级别

#### M-1: nullability 语义不一致 — "未提供"与"显式置空"无法区分

**位置**: 第 23 行 (`description?: string`), 第 26 行 (`company_id?: number`)

**问题描述**: Entity 使用 `string | null` 表示数据库 NULL，Request 使用 `?` (optional) 表示可省略。但 `description?: string` 无法表达"显式清除描述"这一操作意图。

service impl (knowledge-base.service.impl.ts:174) 使用 `request.description || null`：
```typescript
description: request.description || null,
```

**安全影响**: 空字符串 `""` 会被 falsy 检查错误地转为 `null`。若未来 description 用于存储富文本或 URL，空字符串与 null 的语义差异可能成为 XSS 或 SSRF 的攻击面。

**修复建议**:
```typescript
description?: string | null;  // undefined = 不修改, null = 清除, string = 新值
```

---

#### M-2: 聚合计数字段与原始字段未区分 — 消费者无法验证数据来源

**位置**: 第 13-16 行

**问题描述**: `keyword_count`, `portrait_count`, `image_count`, `document_count` 是由 `_count` 聚合注入的计算字段，非数据库原始值。但接口定义将它们与原始字段并列，消费者（前端、测试）无法区分。

**安全影响**: 若未来某个 API 端点返回的 `KnowledgeBase` 对象未经 `_count` 查询（如从缓存获取），count 字段将不存在（`undefined`），但类型签名声称它们始终为 `number`，TypeScript 不会对此发出警告。

**修复建议**: 拆分为 `KnowledgeBase`（原始字段）+ `KnowledgeBaseDetail extends KnowledgeBase`（含聚合字段）。

---

#### M-3: IKnowledgeBaseService 使用原始 string 而非 KnowledgeScope

**位置**: knowledge-base.service.ts:4

**问题描述**: `list()` 的 `scope?: string` 参数绕过了实体层定义的类型约束，controller 层可传入任意 string 值传递给 Prisma 查询。

**安全影响**: 虽然当前 controller 做了白名单过滤 (`VALID_SCOPES.includes`)，但 service 接口作为安全契约层应使用强类型，避免未来新消费者绕过 controller 直接调用 service 时传入非法值。

---

#### M-4: name/description 无类型级长度约束标记

**位置**: 第 2 行 (`name: string`), 第 3 行 (`description: string | null`)

**问题描述**: 类型签名中 `name: string` 无任何长度约束提示。Prisma 定义 `name @db.VarChar(200)`, `description @db.VarChar(500)`，但 Entity 和 Zod 的限制不一致（Zod `name.max(200)`, `description.max(2000)` — 注意 description 在 Prisma 是 500 但 Zod 允许 2000）。

**安全影响**:

1. **Zod 与 Prisma 长度不一致**: `description.max(2000)` (Zod) vs `@db.VarChar(500)` (Prisma) — 2000 字符的描述将通过 Zod 验证但触发 Prisma/PostgreSQL 截断或报错。这是一个**数据完整性漏洞**
2. 超长 name/description 可能被用于存储型攻击（如超长字符串导致日志溢出或前端渲染问题）

**修复建议**: 统一 Zod schema 与 Prisma 的长度限制，`description` 应为 `max(500)` 而非 `max(2000)`。

---

#### M-5: CreateKnowledgeBaseRequest 未约束 admin 不可创建 platform 级知识库

**位置**: 第 21-27 行

**问题描述**: `CreateKnowledgeBaseRequest` 的 `scope` 字段对所有消费者一视同仁。类型层面无法表达"admin 只能创建 company/project 级，sysadmin 才能创建 platform 级"的权限约束。

**安全影响**: 虽然 service impl 层和 controller 层通过 role 参数做了运行时校验，但类型定义未提供任何编译期保护。若新增 API 端点忘记传 role 参数，admin 将能创建 platform 级知识库。

---

### LOW 级别

#### L-1: 零文档注释 — 安全语义隐含

36 行代码中无任何 JSDoc。`scope` 各值的权限含义、`status` 的启用/禁用对访问控制的影响、count 字段的只读属性，新开发者无法从类型定义获取安全上下文。

#### L-2: 手写接口与 Zod schema 双重维护

项目同时维护手写 TypeScript 接口和 Zod schema。两者字段定义需人工同步，漂移风险已被 M-4 证实（description 长度 500 vs 2000）。建议使用 `z.infer<typeof schema>` 推导 Request 类型。

#### L-3: UpdateKnowledgeBaseRequest 允许空对象

所有字段均为 optional，类型层面允许传入 `{}`，导致 service 层可能执行无意义的 UPDATE 语句。空 UPDATE 虽不直接构成安全风险，但增加了不必要的数据库负载和审计日志噪音。

---

## 三、已有安全措施（正面评价）

| 安全机制 | 位置 | 评价 |
|----------|------|------|
| controller 层 Zod 验证 | knowledge-base.schema.ts | name/description 长度、scope 枚举、正整数校验 |
| controller 显式构建 updateRequest | knowledge-base.controller.ts:127-134 | 防止 mass assignment，逐字段提取 |
| service impl 所有权校验 | knowledge-base.service.impl.ts:150-165 | admin 绑定 company/project 前验证归属 |
| service impl 创建者校验 | knowledge-base.service.impl.ts:192-194 | 非管理员只能修改/删除自己创建的 |
| service impl admin 可见性过滤 | knowledge-base.service.impl.ts:64-90 | admin 只能看到 platform + 本公司 + 本项目的知识库 |
| service impl getById 访问控制 | knowledge-base.service.impl.ts:115-133 | 按 scope 类型验证用户访问权限 |
| route 层 roleMiddleware | knowledge.routes.ts:27 | 仅 sysadmin/admin 可访问知识库路由 |

---

## 四、安全度量

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 权限提升防护 | 4/10 | scope 变更和跨边界重绑定缺乏类型级约束 |
| 数据边界隔离 | 5/10 | scope/company_id/project_id 关联约束依赖运行时校验 |
| 输入验证 | 6/10 | Zod 覆盖基本验证，但 description 长度与 Prisma 不一致 |
| 信息泄露防护 | 7/10 | entity 层未暴露敏感字段，但 deleted_at 遗漏导致删除状态不可见 |
| 数据完整性 | 5/10 | deleted_at 遗漏 + description 长度不一致 + any 映射 |
| 类型安全 | 3/10 | any 映射 + 无判别联合 + scope 三次重复 |
| 消费者保护 | 5/10 | controller 层防护充分但依赖运行时，类型层未提供编译期保障 |

**综合安全评分: 5.0/10**

---

## 五、修复优先级路线图

### 立即修复（P0 — 安全阻断）

| # | 问题 | 风险 | 工作量 |
|---|------|------|--------|
| C-1 | 判别联合缺失 | scope/company_id/project_id 非法组合可绕过运行时校验 | 中 |
| C-2 | deleted_at 遗漏 + getById 未过滤软删除 | 软删除记录泄露 | 低 |
| M-4 | description Zod 2000 vs Prisma 500 | 数据截断/报错 | 低 |

### 短期修复（P1 — 安全加固）

| # | 问题 | 风险 | 工作量 |
|---|------|------|--------|
| H-1 | Update 允许 scope 变更 | 权限提升 | 低 |
| H-2 | scope 三次重复 | 类型漂移导致授权不一致 | 低 |
| H-3 | mapKnowledgeBase any | 映射层类型安全断裂 | 中 |
| H-4 | Update 允许 company_id/project_id 变更 | 跨边界重绑定 | 低 |

### 中期改进（P2 — 安全增强）

| # | 问题 | 风险 | 工作量 |
|---|------|------|--------|
| M-1 | nullability 不一致 | 空字符串 vs null 语义混淆 | 低 |
| M-2 | 聚合字段未分离 | 未查询 count 时类型声称有值 | 中 |
| M-3 | service scope: string | 绕过实体层类型约束 | 低 |
| M-5 | Create 未约束 admin 不可创建 platform | 角色约束依赖运行时 | 低 |

---

## 六、评审结论

**判定: REQUEST CHANGES — 存在 2 个 CRITICAL + 4 个 HIGH + 5 个 MEDIUM 安全问题**

`knowledge-base.entity.ts` 作为知识库模块的类型契约层，核心安全缺陷集中在：

1. **最严重**: scope/company_id/project_id 无判别联合约束（C-1），导致授权边界完全依赖 service 层运行时校验。update 路径的 scope 变更分支有 30+ 行 if-else 逻辑（knowledge-base.service.impl.ts:220-241），任何分支遗漏都是权限提升漏洞

2. **系统性**: 类型安全在映射层完全断裂（H-3 `any`），Prisma 返回类型变更不会产生编译错误，安全字段的增删改无法在映射层得到保障

3. **数据完整性**: deleted_at 遗漏（C-2）+ description 长度 Zod/Prisma 不一致（M-4），前者导致软删除记录可能泄露，后者导致数据截断

**正面评价**: controller 层和 service impl 层的安全措施相当完善 — 显式构建 updateRequest 防 mass assignment、所有权校验、可见性过滤、创建者权限检查。问题集中在 entity 层未将这些运行时保障提升为编译期类型约束，增加了未来维护中安全回归的风险。

**建议**: 优先修复 C-1（判别联合）+ C-2（deleted_at + getById 过滤）+ M-4（description 长度统一），预估 1 天。修复后安全评分可达 **7.5/10**。

---

*代码安全专家评审完成 — 2026-05-26*
