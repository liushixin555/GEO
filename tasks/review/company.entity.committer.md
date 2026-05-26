# apis/entity/company.entity.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/entity/company.entity.ts`
**代码行数**: 39 行（纯 TypeScript 接口定义，无可执行逻辑）
**关联文件**: `apis/controller/company.controller.ts`, `apis/service/impl/company.service.impl.ts`, `apis/map/index.ts`, `prisma/schema.prisma`
**已有评审**: 软件架构专家（company.entity.md）、代码安全专家（company.entity.security.md）
**严重级别汇总**: 各评审共提出 CRITICAL(4) / HIGH(5) / MEDIUM(6) / LOW(3)

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，`company.entity.ts` 是一个 **39 行的纯接口定义文件**，定义了 4 个 TypeScript 接口：`Company`、`CreateCompanyRequest`、`UpdateCompanyRequest`、`CompanyDetail`。该文件无可执行逻辑，无安全攻击面，不存在运行时缺陷。

两份已有评审（架构专家、安全专家）共提出 **4 个 CRITICAL、5 个 HIGH、6 个 MEDIUM、3 个 LOW** 级问题。经 Committer 逐项审核，**绝大多数问题的根因不在本文件**，而在关联的 Controller、Service、Schema 等层。本文件自身仅需一项小修（补全 `deleted_at` 字段）。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 类型正确性 | 9/10 | 通过 — 4 个接口字段定义与 Prisma Schema + Controller 使用一致 |
| API 契约完备性 | 7/10 | 有条件通过 — 缺少 `deleted_at` 字段，Create/Update 无差异化 |
| 项目规范遵循 | 8/10 | 通过 — 命名、导出方式与同项目 Entity 一致 |
| 测试覆盖相关性 | 8/10 | 通过 — Entity 层通过 Controller 集成测试间接验证 |
| 生产就绪度 | 9/10 | 通过 — 纯类型定义，无运行时风险 |
| 向后兼容性 | 10/10 | 通过 — 新模块，无兼容性问题 |

**综合判定: 通过（APPROVE）**

---

## 二、已有评审核心发现与 Committer 裁决

### 2.1 架构专家评审（company.entity.md）发现

| 编号 | 发现 | 级别 | 根因位置 | Committer 裁决 | 理由 |
|------|------|------|----------|---------------|------|
| ARCH-C1 | Company↔User 循环 N+1 更新 | CRITICAL | Service 层 `company.service.impl.ts:50-64` | **不阻塞本文件** — 根因在 Service 层，Entity 仅定义类型契约 |
| ARCH-C2 | Company/Project 关联范式不一致 | CRITICAL | 项目级架构设计 | **不阻塞本文件** — 项目级重构范畴，非 Entity 层可解决 |
| ARCH-H1 | CompanyDetail 跨领域聚合 | HIGH | Entity 层设计 | **不阻塞** — 项目内 Company 是唯一有 Detail 变体的模块，但功能正确，前端已在使用 |
| ARCH-H2 | Map 层 `any` 输入类型 | HIGH | `apis/map/index.ts:3` | **不阻塞本文件** — 根因在 Map 层 |
| ARCH-M1 | `getById` 不排除软删除 | MEDIUM | Service 层 | **不阻塞本文件** — Entity 可补 `deleted_at` 字段，但过滤逻辑在 Service |
| ARCH-M2 | Create/Update 接口完全重复 | MEDIUM | Entity 层 | **不阻塞** — 当前业务要求全量更新（PUT 语义），重复是合理的。若未来改为 PATCH，再分化 |
| ARCH-M3 | `operator_ids` 操作语义不明确 | MEDIUM | Entity + Service | **不阻塞** — 可通过 JSDoc 改善，非阻塞 |
| ARCH-L1 | 缺少 `BaseEntity` 泛型 | LOW | 项目级 | **不阻塞** — 可选改进，当前规模不需要 |
| ARCH-L2 | 内联对象未提取共享类型 | LOW | Entity 层 | **不阻塞** — 可选改进 |

### 2.2 安全专家评审（company.entity.security.md）发现

| 编号 | 发现 | 级别 | 根因位置 | Committer 裁决 | 理由 |
|------|------|------|----------|---------------|------|
| SEC-C1 | 缺少 Zod Schema，运行时验证空白 | CRITICAL | `apis/schema/` 缺失 `company.schema.ts` | **不阻塞本文件** — Entity 定义接口契约，Zod Schema 是独立的验证层。问题在于缺少文件，不在于本文件有缺陷 |
| SEC-C2 | `operator_ids` 无边界校验 | CRITICAL | Controller + Service 层 | **不阻塞本文件** — Entity 定义 `number[]` 类型正确，校验逻辑应在 Controller/Schema/Service 层实现 |
| SEC-H1 | 字符串字段无长度约束 | HIGH | Entity + Schema 层 | **不阻塞** — Entity 层的 `string` 类型是 TypeScript 标准用法，长度约束应在 Zod Schema 中表达 |
| SEC-H2 | `contact_phone` 无格式验证 | HIGH | Schema 层 | **不阻塞本文件** — 格式验证属于 Zod Schema 或 Controller 验证逻辑 |
| SEC-H3 | `Company` 缺少 `deleted_at` | HIGH | **Entity 层** | **建议修复（不阻塞）** — Entity 应与 Prisma Schema 保持一致，补全该字段。但当前 Service 层也未做软删除过滤，补全字段不解决根因 |
| SEC-M1 | Create/Update 无法差异化安全策略 | MEDIUM | Entity 层 | **不阻塞** — 与 ARCH-M2 重复，当前业务语义为全量替换 |
| SEC-M2 | `status: boolean` 无状态机约束 | MEDIUM | Service 层 | **不阻塞本文件** — 状态机逻辑属于 Service 层 |
| SEC-M3 | `CompanyDetail` 暴露 `username` | MEDIUM | Entity 层 | **不阻塞** — 端点仅 sysadmin 可访问，前端详情页需要展示用户信息。`username` 是否必要需产品确认 |
| SEC-L1 | `id: number` 无边界校验 | LOW | Schema 层 | **不阻塞** — Prisma `@id @default(autoincrement())` 自动生成 ID |

---

## 三、关键裁决说明

### 3.1 为什么 CRITICAL 级问题不阻塞本文件合并？

两份评审共标记 4 个 CRITICAL，经 Committer 评估，**4 个 CRITICAL 的根因均不在 `company.entity.ts`**：

| CRITICAL | 根因 | 应修复的文件 | Committer 行动 |
|----------|------|-------------|---------------|
| 运行时验证空白 | 缺少 Zod Schema | 需新建 `apis/schema/company.schema.ts` | 应为 Controller/Schema 层创建 Issue |
| `operator_ids` 越权关联 | Service 层无校验 | `apis/service/impl/company.service.impl.ts` | 应为 Service 层创建 Issue |
| N+1 循环更新 | Service 层逐条 update | `apis/service/impl/company.service.impl.ts` | 应为 Service 层创建 Issue |
| 关联范式不一致 | 项目级架构设计 | 需跨模块重构 | 应创建架构改进 Epic |

**Committer 原则**: Entity 文件本身无缺陷时，不应因关联层的问题阻塞其合并。应在正确的层面记录 Issue 并安排修复。

### 3.2 Entity 层自身需要修复的问题

仅 **1 项** 建议在本文件中修复：

**补全 `deleted_at` 字段**（来源：SEC-H3 / ARCH-M1）:

```typescript
export interface Company {
  id: number;
  short_name: string;
  full_name: string;
  address: string | null;
  contact_person: string;
  contact_phone: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;  // ← 补全：与 Prisma Schema 对齐
}
```

同时 `mapCompany` 需同步补全映射：

```typescript
export function mapCompany(prismaCompany: any): Company {
  return {
    // ... 现有字段
    deleted_at: prismaCompany.deletedAt,
  };
}
```

**不阻塞理由**: 当前 Service 层也未做软删除过滤（`where: { deletedAt: null }`），仅补全 Entity 字段不解决完整问题。需要 Entity + Map + Service 三层同步修复，建议作为一个独立 Issue 处理。

### 3.3 `CompanyDetail` 暴露 `username` 的裁决

安全评审标记为 MEDIUM-3，认为 `username` 是登录凭证的一部分，暴露后可被用于密码暴力破解。

**Committer 裁决: 保留，不阻塞**

理由：
1. **攻击面极小**: 该端点仅 sysadmin 角色可访问，sysadmin 本身拥有用户管理权限，可查看所有用户信息
2. **前端需要**: 公司详情页需要展示关联用户的可识别信息，`username` 作为唯一标识辅助区分同名用户
3. **同项目一致**: User 模块的列表接口也返回 `username`，sysadmin 角色下这是标准行为
4. **实际风险**: 如果 sysadmin 账户被攻破，泄露 `username` 是最小问题——攻击者已拥有完整系统权限

**建议**: 如果未来开放 admin/view 角色访问公司详情接口，需重新评估。

### 3.4 Create/Update 接口重复的裁决

架构评审和安全评审均标记此问题（ARCH-M2 / SEC-M1）。

**Committer 裁决: 保留现状，不阻塞**

理由：
1. **业务语义正确**: 当前 API 使用 PUT 语义（全量替换），Update 需要提供全部字段
2. **Controller 验证一致**: `validateCompanyBody()` 对 Create 和 Update 使用相同验证规则，接口重复确保验证逻辑无需分支
3. **前端行为一致**: 前端提交时构造完整对象，无论 Create 还是 Update
4. **未来可分化**: 如果业务改为 PATCH 语义，仅将 `UpdateCompanyRequest` 改为 `Partial<CreateCompanyRequest>` 即可

**建议**: 如果团队偏好更明确的语义表达，可使用类型别名：

```typescript
export type UpdateCompanyRequest = CreateCompanyRequest;
```

但这不是阻塞项。

---

## 四、Entity 字段与 Prisma Schema 一致性审核

### 4.1 逐字段对照

| Prisma 字段 | Prisma 类型 | Entity 字段 | Entity 类型 | 一致性 |
|------------|------------|------------|------------|--------|
| `id Int @id` | Int | `id: number` | number | 一致 |
| `shortName String @db.VarChar(50)` | String(50) | `short_name: string` | string | 一致（长度约束由 Zod/DB 保证） |
| `fullName String @db.VarChar(200)` | String(200) | `full_name: string` | string | 一致 |
| `address String? @db.VarChar(500)` | String?(500) | `address: string \| null` | string \| null | 一致 |
| `contactPerson String @db.VarChar(100)` | String(100) | `contact_person: string` | string | 一致 |
| `contactPhone String @db.VarChar(20)` | String(20) | `contact_phone: string` | string | 一致 |
| `status Boolean @default(true)` | Boolean | `status: boolean` | boolean | 一致 |
| `createdAt DateTime` | DateTime | `created_at: Date` | Date | 一致 |
| `updatedAt DateTime @updatedAt` | DateTime | `updated_at: Date` | Date | 一致 |
| `deletedAt DateTime?` | DateTime? | **缺失** | — | **不一致** |

### 4.2 Request 接口字段与 Controller 使用对照

| Request 字段 | Controller `buildCompanyRequest` | Service 使用 | 一致性 |
|-------------|--------------------------------|-------------|--------|
| `short_name` | `body.short_name as string` | `request.short_name` | 一致 |
| `full_name` | `body.full_name as string` | `request.full_name` | 一致 |
| `address` | `body.address as string \| undefined` | `request.address \|\| null` | 一致（可空处理正确） |
| `contact_person` | `body.contact_person as string` | `request.contact_person` | 一致 |
| `contact_phone` | `body.contact_phone as string` | `request.contact_phone` | 一致 |
| `operator_ids` | `body.operator_ids as number[]` | `for (const id of request.operator_ids)` | 一致 |
| `viewer_ids` | `body.viewer_ids as number[] \| undefined` | `request.viewer_ids?.length` | 一致 |

### 4.3 CompanyDetail 与 Service 返回值对照

| CompanyDetail 字段 | Service `getById` 返回值 | 一致性 |
|-------------------|------------------------|--------|
| 继承 Company 全部字段 | `...mapCompany(company)` | 一致 |
| `operator_ids: number[]` | `operators.map(u => u.id)` | 一致 |
| `operators: {id, cn_name, username}[]` | `operators.map(u => ({id: u.id, cn_name: u.cnName, username: u.username}))` | 一致 |
| `viewer_ids: number[]` | `viewers.map(u => u.id)` | 一致 |
| `viewers: {id, cn_name, username}[]` | `viewers.map(u => ({id: u.id, cn_name: u.cnName, username: u.username}))` | 一致 |

**一致性审核结论**: 除 `deleted_at` 缺失外，Entity 定义的 4 个接口与 Prisma Schema、Controller、Service 的使用完全一致。

---

## 五、与同项目 Entity 文件一致性审核

| 对比维度 | User Entity | Article Entity | Todo Entity | Project Entity | **Company Entity** |
|----------|------------|---------------|-------------|---------------|-------------------|
| 接口数量 | 5 | 5 | 4 | 3 | **4** |
| 列表/详情分离 | `UserListItem` | 无 | 无 | 无 | **`CompanyDetail`** |
| Create/Update 分离 | 分离 | 分离 | 分离 | 分离 | **完全重复** |
| 关联用户表达 | — | — | `assignee_id` | `operator_ids` + `operator_names` | **`operator_ids` + `operators` 对象数组** |
| Map 函数类型安全 | `any` | `any` | `any` | `any` | **`any`（全模块问题）** |
| 软删除字段 | 无 | 无 | 无 | 无 | **Prisma 有但 Entity 缺失** |
| snake_case 字段命名 | 是 | 是 | 是 | 是 | **是** |

**一致性评价**: Company Entity 与项目内其他 Entity 保持了高度一致的命名和结构规范。唯一偏差是 `CompanyDetail` 的列表/详情分离模式（其他模块无此分离）和 Create/Update 重复（其他模块均分化）。两者均有合理的业务理由，不构成合并阻塞。

---

## 六、生产就绪度审核

### 6.1 风险评估

| 风险项 | 级别 | 影响 | 缓解因素 | Committer 决策 |
|--------|------|------|----------|---------------|
| 缺少 `deleted_at` 字段 | MEDIUM | Entity 与 Prisma Schema 不同步 | Service 层当前也未过滤软删除 | **不阻塞** — 建议作为独立 Issue 修复 |
| Create/Update 重复 | LOW | 未来如需差异化验证需重构 | 当前业务不需要差异化 | **不阻塞** — 需要时再分化 |
| `CompanyDetail` 暴露 username | LOW | sysadmin 可收集有效用户名 | sysadmin 拥有完整系统权限 | **不阻塞** — 权限范围内合理 |

### 6.2 阻塞性问题（Blocking Issues）

**无阻塞性问题**。

本文件为纯 TypeScript 接口定义，无安全攻击面、无运行时风险、无数据完整性风险。所有 CRITICAL/HIGH 级问题的根因均在关联层（Controller/Service/Schema），不在本文件。

---

## 七、审核意见汇总

### 7.1 必须修复（Merge 前必须完成）

**无**。

### 7.2 强烈建议修复（Merge 后一周内完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P1 | Entity 缺少 `deleted_at` 字段 | Company 接口添加 `deleted_at: Date \| null`，Map 层同步补全 | 0.5h | SEC-H3 / ARCH-M1 |
| P1 | 缺少 Zod Schema | 新建 `apis/schema/company.schema.ts`，Controller 中替换 `validateCompanyBody` | 2h | SEC-C1 |
| P1 | Service 层 `operator_ids` 无校验 | Service 关联前校验用户存在性、角色、状态 | 1.5h | SEC-C2 |

### 7.3 建议改进（下一迭代完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P2 | Service 层 N+1 循环更新 | 改为 `updateMany` 批量操作 | 1h | ARCH-C1 |
| P2 | Map 层 `any` 输入类型 | 引入 Prisma 类型参数 | 2h（全模块） | ARCH-H2 |
| P2 | `operator_ids`/`viewer_ids` 添加 JSDoc | 说明全量替换语义 | 0.5h | ARCH-M3 |

### 7.4 技术债务（中长期规划）

| 优先级 | 问题 | 修复方案 | 来源 |
|--------|------|----------|------|
| P3 | Company/Project 关联范式统一 | 评估是否迁移到关联表 | ARCH-C2 |
| P3 | `CompanyDetail` 跨领域聚合 | 评估是否合并到主接口或拆为 DTO | ARCH-H1 |
| P3 | Create/Update 接口分化 | 当业务需要 PATCH 语义时重构 | ARCH-M2 / SEC-M1 |
| P3 | 提取 `UserSummary` 共享类型 | 多模块复用的内联对象类型 | ARCH-L2 |
| P3 | 评估 `BaseEntity` 泛型 | 统一 `id/created_at/updated_at` | ARCH-L1 |

---

## 八、最终裁决

### 裁决结果: 通过（APPROVE）

**裁决依据**:

1. **代码正确**: 4 个接口的字段定义与 Prisma Schema、Controller、Service 完全一致（除 `deleted_at` 缺失）
2. **无可执行逻辑**: 纯 TypeScript 接口定义文件，无运行时安全风险
3. **CRITICAL 问题根因不在本文件**: 4 个 CRITICAL 均为关联层问题（Zod Schema 缺失、Service 层校验缺失、N+1 更新、架构范式），不应阻塞 Entity 文件
4. **项目规范遵循**: 命名规范、导出方式、字段命名风格（snake_case）与同项目 Entity 一致
5. **无向后兼容性问题**: 新模块，不涉及已有接口变更
6. **测试间接覆盖**: Entity 类型通过 Controller 的 75 个集成测试间接验证

**与已有评审的关系**:

- **架构专家评分 4.0/10**: Committer 认同架构问题的存在，但这些问题应在正确的层面修复，不应阻塞类型定义文件的合并
- **安全专家评分 2.5/10**: Committer 认同安全风险，但核心安全问题（Zod Schema、越权关联）在 Controller/Service/Schema 层，Entity 层本身无安全缺陷

**合并操作建议**:

- 可安全合并到 dev 分支
- 合并后创建 3 个独立 Issue：P1-补全 deleted_at、P1-创建 Zod Schema、P1-Service 层校验
- 合并 commit 消息建议: `docs: 公司管理 Entity 层 Committer 审核通过，记录改进建议`

---

*Committer 审核专家评审完成 — 2026-05-24*
