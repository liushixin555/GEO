# company.entity.ts — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 接口职责分离 | 5.0/10 | HIGH |
| Entity-DTO 映射准确性 | 7.0/10 | LOW |
| DTO 设计模式一致性 | 4.0/10 | CRITICAL |
| 类型复用与 DRY | 4.0/10 | HIGH |
| 领域模型表达力 | 5.5/10 | HIGH |
| 层级间契约完备性 | 6.0/10 | HIGH |
| **综合** | **5.3/10** | **CONDITIONAL APPROVE** |

**结论：CONDITIONAL APPROVE** — 存在 1 项 CRITICAL 级架构缺陷（Update 全量替换模式与项目全部其他实体不一致），5 项 HIGH 级问题，4 项 MEDIUM 级问题。文件功能正确、字段映射准确、map 函数完整，核心问题集中在 DTO 设计模式偏离项目惯例和类型复用不足。

---

## CRITICAL-1 — UpdateCompanyRequest 全量替换模式与项目全部其他实体不一致

**位置**：L27

```typescript
/** 更新公司请求 — 当前业务要求全量字段，与 Create 保持一致 */
export interface UpdateCompanyRequest extends CreateCompanyRequest {}
```

Company 是项目中**唯一使用全量替换 Update 模式**的实体。所有其他实体的 Update DTO 均为部分更新（字段全部 optional）：

| 实体 | Update 模式 | 必填字段数 |
|------|------------|-----------|
| **Company** | **全量替换（5 必填 + 1 必填数组）** | **6** |
| Project | 部分更新（全部 optional） | 0 |
| Skills | 部分更新（全部 optional + null 清除语义） | 0 |
| KnowledgeBase | 部分更新（全部 optional + null 清除语义） | 0 |
| User | 部分更新（全部 optional） | 0 |
| Todo | 部分更新（全部 optional） | 0 |

**影响链**：

1. **前端被迫提交全量数据**：更新联系人时必须同时提交 short_name、full_name、operator_ids 等所有字段，任何遗漏都会覆盖为默认值
2. **并发更新冲突风险**：两个管理员同时编辑不同字段（一个改联系人，一个改运营者），后提交者会覆盖前者的所有修改
3. **Service 层硬编码 `|| null` 转换**（company.service.impl.ts:52）：`address: request.address || null` 将空字符串错误地转为 null，破坏了合法的空字符串输入
4. **extends 语义误导**：`UpdateCompanyRequest extends CreateCompanyRequest` 暗示 Update "是一个" Create，但它们只是碰巧字段相同。如果未来 Create 新增字段（如 `logo_url`），Update 会自动继承为必填

**修复建议**：

```typescript
export interface UpdateCompanyRequest {
  short_name?: string;
  full_name?: string;
  address?: string | null;  // 三值语义：undefined=不修改, string=新值, null=清除
  contact_person?: string;
  contact_phone?: string;
  operator_ids?: number[];
  viewer_ids?: number[];
}
```

---

## HIGH-1 — operator_ids/viewer_ids 虚拟字段语义未表达，Entity 层与存储模型脱节

**位置**：L14-24, L29-34

Prisma schema 中 Company model **没有** `operator_ids`/`viewer_ids` 字段：

```prisma
// prisma/schema.prisma:17-35
model Company {
  id, shortName, fullName, address, contactPerson, contactPhone, status,
  createdAt, updatedAt, deletedAt
  users User[]           // ← 单纯的 1:N 反向关联
  // 无 operator_ids, viewer_ids 字段
}
```

实际的 operator/viewer 关系通过 `User.companyId` + `User.role` 推导：

```typescript
// company.service.impl.ts:24-30
const users = await prisma.user.findMany({
  where: { companyId: id, status: true, role: { in: ['admin', 'view'] } },
});
const operators = users.filter(u => u.role === 'admin');  // role=admin → operator
const viewers = users.filter(u => u.role === 'view');     // role=view → viewer
```

**Entity 层问题**：

1. `CreateCompanyRequest.operator_ids` 暗示 Company 有一个 `operator_ids` 列，但实际上这些 ID 是 User 表的外键值
2. `CompanyDetail.operator_ids` 是聚合查询的**计算字段**，不是持久化字段
3. 消费者无法从 Entity 类型区分"存储字段"和"计算字段"

**项目对比**：

| 实体 | operator/viewer 表达方式 | 是否与持久化模型一致 |
|------|-------------------------|-------------------|
| Company | CompanyDetail 含 `operator_ids` + `operators` | 虚拟字段，非持久化 |
| Project | 基础 Entity 含 `operator_ids` + `operator_names` | 虚拟字段，非持久化 |
| KnowledgeBase | 无 operator/viewer 概念 | N/A |

两个实体都存在同样的问题，但 Company 的 `CompanyDetail` 继承分离至少比 Project 的"全部混入基础 Entity"略好。

**修复建议**：添加 JSDoc 标注这些字段为计算字段：

```typescript
export interface CompanyDetail extends Company {
  /** 运营者用户 ID 列表（计算字段，来自 User.companyId + User.role='admin'） */
  operator_ids: number[];
  operators: CompanyUserRef[];
  /** 查看者用户 ID 列表（计算字段，来自 User.companyId + User.role='view'） */
  viewer_ids: number[];
  viewers: CompanyUserRef[];
}
```

---

## HIGH-2 — `{ id: number; cn_name: string }` 内联类型重复且无共享定义

**位置**：L31, L33

```typescript
operators: { id: number; cn_name: string }[];  // L31
viewers: { id: number; cn_name: string }[];    // L33
```

两处使用完全相同的匿名结构，违反 DRY 原则。且该结构与 `UserListItem` 的 `{ id, cn_name }` 子集有隐含关联但无类型级关联。

**跨文件影响**：

| 位置 | 使用 `{ id: number; cn_name: string }` |
|------|---------------------------------------|
| company.entity.ts:31 | `operators` 字段 |
| company.entity.ts:33 | `viewers` 字段 |
| user.entity.ts:28 | LoginResponse.selected_company（类似但不同：`{ id, short_name }`） |

**修复建议**：

```typescript
/** 用户引用（ID + 姓名），用于公司/项目关联展示 */
export interface UserRef {
  id: number;
  cn_name: string;
}
```

---

## HIGH-3 — address 可空语义三值表达缺失

**位置**：L5, L17

```typescript
// Company Entity（正确，匹配 Prisma String?）
address: string | null;         // L5

// CreateCompanyRequest（缺失 null 清除能力）
address?: string;               // L17
```

Entity 层 `string | null` 正确反映了 Prisma 的 `String?` 类型。但 DTO 层 `address?: string` 只有二值语义（`undefined`=不提供，`string`=新值），无法表达"显式清除为 null"。

Service 层通过 `request.address || null`（company.service.impl.ts:52）硬编码转换，导致合法空字符串 `""` 被错误转为 `null`。

**项目先例**（`skills.entity.ts:39-40`）：

```typescript
/** undefined=不修改, string=新值, null=显式清除 */
description?: string | null;
```

**修复建议**：

```typescript
/** 地址，最长 500 字符。undefined=不提供, string=新值, null=显式清除 */
address?: string | null;
```

---

## HIGH-4 — 缺少 CompanyListItem 类型，列表与详情共用基础 Entity

**位置**：L1-12, ICompanyService.list()

`ICompanyService.list()` 返回 `Company[]`，直接使用持久化实体作为列表项类型。

**项目对比**：

| 实体 | 列表类型 | 详情类型 | 是否分离 |
|------|---------|---------|---------|
| Company | `Company`（持久化实体） | `CompanyDetail` | 部分分离 |
| User | `UserListItem`（专用类型，隐藏 password_hash） | `User` | 完全分离 |
| Skills | `SkillsDetail`（含 creator_name） | `SkillsDetail` | 未区分列表/详情 |
| KnowledgeBase | `KnowledgeBaseDetail`（含 counts） | `KnowledgeBaseDetail` | 未区分列表/详情 |

**问题**：

1. `Company` 包含 `deleted_at`，列表 API 不应暴露软删除元数据给前端
2. 如果未来列表需要聚合字段（如用户数量、项目数量），只能修改 `Company` 或改返回类型（破坏性变更）
3. 与 `UserListItem` 的"列表专用类型"模式不一致

**修复建议**：预留 `CompanyListItem`，从 `Company` 中排除审计字段：

```typescript
export interface CompanyListItem extends Omit<Company, 'deleted_at'> {
  // 预留聚合字段
  user_count?: number;
  project_count?: number;
}
```

---

## HIGH-5 — CompanyDetail 与 Project 的 operator/viewer 组织方式完全不同

**位置**：L29-34

两个实体表达相同的"运营者/查看者"关联，但实现方式完全不同：

| 方面 | Company | Project |
|------|---------|---------|
| 位置 | `CompanyDetail`（Detail 子类型） | `Project`（基础 Entity） |
| ID 存储 | `operator_ids: number[]` | `operator_ids: number[]` |
| 名称存储 | `operators: { id, cn_name }[]` | `operator_names: string[]` |
| ID-名称关联 | **强关联**（同一对象的 id + name） | **弱关联**（两个平行数组，靠索引对应） |

**问题**：Company 的 `{ id, cn_name }[]` 比 Project 的 `string[]` 更安全（避免索引漂移），但两者没有统一的接口约束。新开发者无法知道应该遵循哪种模式。

**建议**：在项目层面统一 operator/viewer 表达方式，以 Company 的 `UserRef[]` 模式为标准。

---

## MEDIUM-1 — `status: boolean` 缺乏状态语义和扩展能力

**位置**：L8

```typescript
status: boolean;
```

`true`=启用、`false`=禁用的语义完全依赖隐含约定。对比同文件的 `UserRole` 使用字面量联合类型 `'sysadmin' | 'admin' | 'view'`，`status` 的类型设计粗糙。

如果未来需要"待审核"、"已冻结"等状态，必须改为 enum/union type，属于破坏性变更。

---

## MEDIUM-2 — 无分页/列表参数类型

**位置**：ICompanyService.list()

```typescript
list(): Promise<Company[]>;  // 全量返回，无分页参数
```

`list()` 返回全部未删除公司，无分页、排序、过滤参数。当前公司数量较少（sysadmin 全局管理），但随着业务增长会成为性能问题。

对比 `KnowledgeBase`、`Article` 等实体已有分页支持（通过 query params），Company 作为系统级核心实体缺少分页类型预留。

---

## MEDIUM-3 — 缺少 CompanyRef 轻量引用类型

**位置**：user.entity.ts:28

```typescript
// user.entity.ts — LoginResponse 中内联定义
selected_company: { id: number; short_name: string } | null;
```

公司引用 `{ id, short_name }` 在多处使用但从未提取为独立类型：

| 消费位置 | 引用方式 |
|---------|---------|
| LoginResponse.selected_company | `{ id: number; short_name: string }` |
| Project.company_name | `string`（无 ID） |
| UserListItem.company_name | `string`（无 ID） |

**修复建议**：

```typescript
/** 公司轻量引用（用于关联实体展示） */
export interface CompanyRef {
  id: number;
  short_name: string;
}
```

---

## MEDIUM-4 — CreateCompanyRequest 混合了实体字段和关联管理操作

**位置**：L14-24

```typescript
export interface CreateCompanyRequest {
  short_name: string;      // 实体字段
  full_name: string;       // 实体字段
  address?: string;        // 实体字段
  contact_person: string;  // 实体字段
  contact_phone: string;   // 实体字段
  operator_ids: number[];  // ← 关联管理操作（设置 User.companyId）
  viewer_ids?: number[];   // ← 关联管理操作（设置 User.companyId）
}
```

`operator_ids` 和 `viewer_ids` 不是 Company 表的列，而是对 User 表的副作用操作。将实体字段和关联管理操作混合在同一个 DTO 中，导致：

1. 消费者无法区分"创建公司"和"分配用户"两个独立操作
2. Service 层需要在一个事务中处理两种不同语义的操作（创建记录 + 更新外部表）
3. 如果未来需要独立的"分配运营者"API（不修改公司信息），当前 DTO 设计不支持

**判定**：当前全量替换模式（CRITICAL-1）下此问题可以接受，因为 update 总是提交全部字段。但如果改为部分更新模式，建议将关联管理拆分为独立 DTO。

---

## LOW-1 — 零模块级文档和字段级 JSDoc

**位置**：全文件 35 行

仅 2 行 JSDoc（operator_ids 和 viewer_ids 的全量替换说明）。对比 `skills.entity.ts`（42 行，8 条 JSDoc，字段约束全覆盖），文档密度差距明显。

---

## LOW-2 — UpdateCompanyRequest extends CreateCompanyRequest 的 "is-a" 语义不当

**位置**：L27

从 OOP 语义上，`extends` 意味着"Update 是一种特殊的 Create"，这在业务上不成立。两者只是碰巧字段相同。`skills.entity.ts` 正确地独立定义了 `CreateSkillsRequest` 和 `UpdateSkillsRequest`，没有使用 extends。

当前判定：如果修复 CRITICAL-1（Update 改为部分更新），此 extends 关系自然会消除。

---

## 架构对比：Company vs 同级实体

| 架构特征 | Company | Project | Skills | KnowledgeBase |
|---------|---------|---------|--------|---------------|
| 基础/详情分离 | Company + CompanyDetail | 无分离（全部在基础） | Skills + SkillsDetail | KnowledgeBase + KnowledgeBaseDetail |
| Update 模式 | **全量替换** | 部分更新 | 部分更新 + null 清除 | 部分更新 + null 清除 |
| operator/viewer | Detail 含 UserRef[] | 基础含 IDs + names | N/A | N/A |
| null 清除语义 | 无（二值 optional） | 无 | `string \| null` | `string \| null` |
| JSDoc 覆盖 | 2 行 | ~5 行 | 8 行 | ~15 行 |
| 关联统计 | 无 | 无 | 无 | 含 _count 聚合 |
| deleted_at | ✅ 正确 | N/A（无软删除） | ✅ 正确 | ✅ 正确 |

**Company 在以下方面领先**：基础/详情分离模式、deleted_at 正确包含
**Company 在以下方面落后**：Update 模式（全量 vs 部分）、null 清除语义、文档密度、类型复用

---

## 架构改进路线图

### 第一阶段（必须修复）

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| C-1 | Update 全量替换 | 改为部分更新（全部 optional） + 三值 null 语义 | 2h（含 Service/Controller/Schema 同步） |
| H-2 | 内联类型重复 | 提取 `UserRef` 命名类型 | 10min |
| H-3 | address null 语义 | `address?: string \| null` | 5min |

### 第二阶段（质量提升）

| # | 问题 | 修复方案 |
|---|------|---------|
| H-1 | 虚拟字段无文档 | 为 operator_ids/viewers 添加 JSDoc 计算字段标注 |
| H-4 | 缺少 CompanyListItem | 预留列表专用类型 |
| H-5 | operator/viewer 组织不一致 | 统一为 UserRef[] 模式 |
| M-1 | status 扩展性 | 考虑 `type CompanyStatus = 'active' \| 'inactive'` |
| M-3 | 缺少 CompanyRef | 提取 `{ id, short_name }` 共享类型 |

### 第三阶段（长期优化）

| # | 问题 | 修复方案 |
|---|------|---------|
| M-2 | 无分页类型 | 添加 `CompanyListParams` |
| M-4 | Create 混合关联操作 | 评估拆分关联管理 API |
| L-1 | 零 JSDoc | 补全模块级 + 字段级文档 |

---

## 修复后预期评分

完成第一阶段（C-1 + H-2 + H-3）后预期综合评分：**7.5/10**
完成全部修复后预期评分：**8.5/10**

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | apis/entity/company.entity.ts |
| 行数 | 35 |
| 接口数量 | 4 |
| 评审类型 | 软件架构专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | apis/service/company.service.ts, apis/service/impl/company.service.impl.ts, apis/schema/company.schema.ts, apis/controller/company.controller.ts, apis/map/index.ts:6-19, prisma/schema.prisma:17-35 |
| 关联评审 | [质量评审](company.entity.ts.quality.md) 5.5/10 CONDITIONAL APPROVE |
