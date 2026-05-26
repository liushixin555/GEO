# apis/entity/company.entity.ts — Code Committer 综合审核报告

| 属性 | 值 |
|---|---|
| **文件** | `apis/entity/company.entity.ts` (35行, 4接口) |
| **评审类型** | Code Committer 综合审核（安全+架构+质量 三维交叉裁定） |
| **综合评分** | **4.8 / 10** |
| **裁决** | **REQUEST CHANGES** |
| **评审日期** | 2026-05-26 |

---

## 三维评审汇总

| 维度 | 评分 | 裁决 | 评审文件 |
|---|---|---|---|
| 质量 | 5.5/10 | CONDITIONAL APPROVE | `tasks/review/company.entity.ts.quality.md` |
| 架构 | 5.3/10 | CONDITIONAL APPROVE | `tasks/review/company.entity.ts.architecture.md` |
| 安全 | 5.0/10 | CONDITIONAL APPROVE | `tasks/review/company.entity.ts.security.md` |

---

## 阻断项（BLOCKING）— 合并前必须修复

### B-1. 零审计追踪——`created_by`/`updated_by` 完全缺失 [安全 C-1 + 质量 CO-4]

- **严重程度**: CRITICAL
- **跨维确认**: 安全评审 C-1 + 质量评审 CO-4 — 两份评审独立认定为最高优先级
- **现状**:
  - `Company` 接口（L1-12）仅有 `created_at`/`updated_at` 时间戳，无操作者字段
  - Prisma schema 同样缺少 `createdById`/`updatedById`
  - Service impl 所有写操作（create/update/toggleStatus）均无记录操作者
- **影响**:
  1. 多 sysadmin 环境下无法追溯谁创建/修改了公司数据
  2. 与项目所有其他业务实体不一致——Article、Skills、KnowledgeBase、Todo 均有 `created_by`
  3. 企业信息（公司名、联系人、电话）变更缺乏审计链，不符合数据治理基线
  4. "操作日志"功能无法实现，需回溯数据库 binlog
- **跨实体对比**:

  | 实体 | created_by | updated_by | 审计能力 |
  |------|-----------|-----------|---------|
  | **Company** | **无** | **无** | **零审计** |
  | Article | number \| null | — | 创建追踪 |
  | Skills | number | — | 创建追踪 |
  | KnowledgeBase | number \| null | — | 创建追踪 |
  | Todo | number | — | 创建追踪 |

- **修复**:
```typescript
// Company 接口添加
export interface Company {
  // ...existing fields...
  /** 创建者用户 ID（sysadmin），与 Article.created_by 一致 */
  created_by: number | null;
  /** 更新者用户 ID（sysadmin），用于审计追踪 */
  updated_by: number | null;
}
```
Prisma schema 同步添加 `createdById`/`updatedById` 字段并运行 migration。
- **阻断理由**: Company 作为系统多租户核心实体，是唯一缺少审计追踪的业务实体，两份独立评审均标记为最高优先级
- **预估工时**: 3h（含 Prisma migration + Service/Controller 注入 + map 同步）

### B-2. `UpdateCompanyRequest` 全量替换——项目唯一偏离 [架构 C-1 + 质量 CO-1/EX-1 + 安全 M-3]

- **严重程度**: CRITICAL
- **跨维确认**: 架构评审 C-1 + 质量评审 CO-1 + 质量评审 EX-1 + 安全评审 M-3 — 四处独立确认
- **现状**:
  - `UpdateCompanyRequest extends CreateCompanyRequest`（L27），所有字段必填
  - Company 是项目中**唯一使用全量替换 Update 模式**的实体
- **影响**:
  1. 前端被迫提交全量数据，部分字段修改需携带所有字段
  2. 并发更新冲突——两个管理员同时编辑不同字段，后提交者覆盖前者全部修改
  3. Service 层 `request.address || null`（company.service.impl.ts:52）将空字符串错误转为 null
  4. `extends` 语义误导——如果 Create 新增字段（如验证码），Update 会自动继承
- **项目对比**:

  | 实体 | Update 模式 | 必填字段数 |
  |------|------------|-----------|
  | **Company** | **全量替换** | **6** |
  | Project | 部分更新（全部 optional） | 0 |
  | Skills | 部分更新 + null 清除语义 | 0 |
  | KnowledgeBase | 部分更新 + null 清除语义 | 0 |
  | User | 部分更新（全部 optional） | 0 |
  | Todo | 部分更新（全部 optional） | 0 |

- **修复**:
```typescript
export interface UpdateCompanyRequest {
  short_name?: string;
  full_name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  address?: string | null;
  contact_person?: string;
  contact_phone?: string;
  operator_ids?: number[];
  viewer_ids?: number[];
}
```
Service impl 同步改为条件更新（仅更新提供的字段）。
- **阻断理由**: 四处独立确认的架构偏离，破坏并发安全性和扩展性，是当前代码最大的设计缺陷
- **预估工时**: 2h（含 Entity + Schema + Service + Controller 同步改造）

---

## 高优先级建议（HIGH）— 建议本迭代修复

### H-1. PII 字段在列表 API 无脱敏——缺少 `CompanyListItem` [安全 H-1 + 架构 H-4 + 质量 ID-1]

- **跨维确认**: 安全 H-1 + 架构 H-4 + 质量 ID-1 — 三份评审一致发现
- **现状**: `ICompanyService.list()` 返回 `Company[]`，直接暴露 `contact_person`/`contact_phone`/`deleted_at` 给前端
- **影响**: 列表页只需 short_name + full_name + status，却返回含 PII 的完整 Company；违反最小权限原则
- **修复**:
```typescript
/** 公司列表项（不含 PII 和软删除元数据） */
export interface CompanyListItem extends Omit<Company, 'contact_person' | 'contact_phone' | 'address' | 'deleted_at'> {
  user_count?: number;
  project_count?: number;
}
```
- **预估工时**: 1h（含 Service list() 返回类型调整）

### H-2. `address` 可空语义断裂——Entity/DTO 类型不一致 [架构 H-3 + 质量 TS-2 + 安全 M-1]

- **跨维确认**: 架构 H-3 + 质量 TS-2 + 安全 M-1 — 三份评审一致发现
- **现状**: `Company.address: string | null`（nullable）vs `CreateCompanyRequest.address?: string`（optional）。Service 层 `request.address || null` 将空字符串错误转为 null
- **修复**:
```typescript
/** 地址，最长 500 字符。undefined=不提供, string=新值, null=显式清除 */
address?: string | null;
```
- **预估工时**: 10min

### H-3. `operator_ids`/`viewer_ids` 缺少互斥校验 [安全 H-2]

- **跨维确认**: 安全评审独有发现
- **现状**: 同一用户可同时出现在 `operator_ids` 和 `viewer_ids` 中，Service 层 `validateUserIds()` 不检查交集
- **影响**: 用户同时是运营者和查看者，违反业务语义，未来细粒度权限判断将产生歧义
- **修复**: Schema 层添加 refine 交叉校验 + Entity 层 JSDoc 标注互斥约束
- **预估工时**: 30min

### H-4. 内联类型 `{ id: number; cn_name: string }` 重复，无共享定义 [架构 H-2 + 质量 TS-3]

- **跨维确认**: 架构 H-2 + 质量 TS-3
- **现状**: `operators` 和 `viewers` 使用相同匿名结构，且与 `UserListItem` 的 `{ id, cn_name }` 无类型级关联
- **修复**:
```typescript
/** 用户引用（ID + 姓名），数据来自 Prisma 查询 */
export interface UserRef {
  id: number;
  cn_name: string;
}
```
- **预估工时**: 10min

### H-5. 文档严重不足——仅 2 行 JSDoc [质量 DC-1/2/3 + 架构 L-1]

- **跨维确认**: 质量评审 DC-1/DC-2/DC-3（均 HIGH）+ 架构评审 L-1
- **现状**: 35 行代码仅 2 行 JSDoc。Prisma 约束（VarChar 长度）在实体层完全不可见
- **对比**:

  | 实体文件 | 行数 | JSDoc 数 | 字段注释覆盖 |
  |----------|------|---------|-------------|
  | company.entity.ts | 35 | 2 | 0% |
  | knowledge.entity.ts | ~200 | 30+ | ~90% |
  | skills.entity.ts | ~60 | 8 | ~60% |

- **修复**: 补全模块级 `@module` + 全字段 JSDoc（含 Prisma 约束、业务语义）
- **预估工时**: 20min

---

## 中优先级建议（MEDIUM）— 可下迭代修复

| # | 问题 | 来源维度 | 修复建议 | 工时 |
|---|------|---------|---------|------|
| M-1 | `CompanyDetail` 泄露 `deleted_at` | 安全 H-3 | `extends Omit<Company, 'deleted_at'>` | 10min |
| M-2 | `operator_ids`/`viewer_ids` 虚拟字段语义未表达 | 架构 H-1 + 质量 ID-2 | JSDoc 标注为计算字段 | 10min |
| M-3 | `operator/viewer` 组织方式与 Project 完全不同 | 架构 H-5 + 质量 CO-3 | 统一为 UserRef[] 模式 | 30min |
| M-4 | `status: boolean` 缺乏状态语义和扩展能力 | 架构 M-1 + 质量 ID-5 | 考虑 union type `'active' \| 'inactive'` | 20min |
| M-5 | 缺少 `CompanyRef` 轻量引用类型 | 架构 M-3 | 提取 `{ id, short_name }` 共享类型 | 10min |
| M-6 | 无分页/列表参数类型 | 架构 M-2 + 质量 ID-4 | 预留 `CompanyListParams` | 15min |

---

## 低优先级建议（LOW）— 可选

| # | 问题 | 来源 |
|---|------|------|
| L-1 | 无 branded/opaque type 保护 ID，不同实体 ID 可混淆 | 安全 L-1 |
| L-2 | 无 runtime type guard 导出 | 安全 L-2 |
| L-3 | `status` 禁用公司的级联安全影响未文档化 | 安全 L-3 |

---

## 问题交叉分析

### 跨维度重复发现（高置信度）

| 问题 | 发现次数 | 维度 | 最终裁定 |
|------|---------|------|---------|
| Update 全量替换 | 4 | 架构(C)+质量(CO-1)+质量(EX-1)+安全(M-3) | **B-2 BLOCKING** |
| 零审计追踪 | 2 | 安全(C)+质量(CO-4) | **B-1 BLOCKING** |
| PII 列表暴露/缺 CompanyListItem | 3 | 安全(H)+架构(H)+质量(ID-1) | H-1 HIGH |
| address 可空语义断裂 | 3 | 架构(H)+质量(TS-2)+安全(M-1) | H-2 HIGH |
| 内联类型重复 | 2 | 架构(H)+质量(TS-3) | H-4 HIGH |
| 文档严重不足 | 4 | 质量(DC-1/2/3)+架构(L-1) | H-5 HIGH |
| operator/viewer 组织不一致 | 2 | 架构(H)+质量(CO-3) | M-3 MEDIUM |
| status 语义不足 | 2 | 架构(M)+质量(ID-5) | M-4 MEDIUM |
| 无分页类型 | 2 | 架构(M)+质量(ID-4) | M-6 MEDIUM |

### 调用链验证

```
POST /api/v1/companies
  → authMiddleware (JWT ✓) + roleMiddleware(SYSADMIN ✓)
  → company.controller.createCompany()
    → createCompanySchema.safeParse(req.body) ← Zod 校验完整 ✓
    → companyService.create({
        short_name, full_name, address, contact_person, contact_phone,
        operator_ids, viewer_ids
      })
      → validateUserIds(tx, operator_ids, viewer_ids) ← 存在/角色/状态校验 ✓
        ⚠ 不检查 operator_ids ∩ viewer_ids 交集 (H-3)
      → prisma.company.create({ data: { ... } })
        ❌ 无 created_by 字段 (B-1)
        ⚠ address: request.address || null — 空字符串被错误清空 (B-2 关联)
      → tx.user.updateMany({ companyId: company.id }) ← 关联用户 ✓
      → mapCompany(company)
        ← ✅ deleted_at 正确映射 (对比 Skills 的遗漏)
  → 201 Created → 返回 Company（含 PII）

PUT /api/v1/companies/:id
  → authMiddleware (JWT ✓) + roleMiddleware(SYSADMIN ✓)
  → company.controller.updateCompany()
    → updateCompanySchema.safeParse(req.body) ← 与 create 相同 schema ✓
    → companyService.update(id, { 全部必填字段 })
      ⚠ 全量替换模式 (B-2) — 并发覆盖风险
      ❌ 无 updated_by 字段 (B-1)
      → 解绑旧 admin/view → 绑定新 admin/view ← 事务内完成 ✓

GET /api/v1/companies
  → companyService.list()
    → prisma.company.findMany({ where: { deletedAt: null } }) ← 过滤软删 ✓
    → companies.map(mapCompany)
    → 返回 Company[] ← ⚠ 含 PII + deleted_at (H-1)

GET /api/v1/companies/:id
  → companyService.getById(id)
    → prisma.company.findUnique + prisma.user.findMany
    → 组装 CompanyDetail ← ⚠ 含 deleted_at (M-1)
    → operators/viewers 手动筛选 ← ✅ 逻辑正确
```

### 安全边界总结

| 边界 | 保护措施 | 状态 |
|------|----------|------|
| 身份认证 | authMiddleware + roleMiddleware(SYSADMIN) | ✅ 仅 sysadmin 可访问 |
| 输入校验 | Zod schema（长度、格式、范围全覆盖） | ✅ 运行时安全 |
| 业务校验 | Service validateUserIds（存在/角色/状态） | ✅ 完整 |
| 审计追踪 | 无 | ❌ **B-1 零审计** |
| 并发安全 | 全量替换 Update | ⚠ **B-2 并发覆盖** |
| PII 保护 | 无脱敏 | ⚠ H-1 列表暴露 |
| 互斥校验 | 无 | ⚠ H-3 operator/viewer 重叠 |
| 数据库约束 | Prisma VarChar 长度、nullable | ✅ 完整 |

---

## 核心优点

1. **功能正确** — 4 个接口完整覆盖 Company CRUD + toggleStatus 场景，字段映射准确
2. **运行时安全网强** — Zod schema + Service validateUserIds + sysadmin-only 路由三层防护到位
3. **软删除正确** — `deleted_at: Date | null` 声明完整，mapCompany 正确映射（对比 Skills 的遗漏）
4. **事务一致性** — create/update 使用 `$transaction` 保证原子性，先解绑旧用户再绑定新用户
5. **snake_case 统一** — 实体层命名与 map 层转换一致
6. **Detail 分离** — `Company` + `CompanyDetail` 拆分比 Project 的"全部混入"模式更合理

---

## 与同类模块 Committer 评审对比

| 文件 | Committer 评分 | 裁决 | BLOCKING 数 | 核心问题 |
|------|---------------|------|-------------|---------|
| project.routes.ts | 7.0/10 | CONDITIONAL APPROVE | 2 | 权限粒度 |
| token-blacklist.util.ts | 6.0/10 | CONDITIONAL APPROVE | 2 | 容量上限 |
| ArticleImageManager.tsx | 5.6/10 | CONDITIONAL APPROVE | 4 | 组件设计 |
| **company.entity.ts** | **4.8/10** | **REQUEST CHANGES** | **2** | **审计缺失+模式偏离** |
| skills.entity.ts | 4.0/10 | REQUEST CHANGES | 2 | 字段遗漏+DTO暴露 |
| list-reveal-chapter.test.tsx | 1.0/10 | REJECT | 3 | 测试质量 |

Company entity 处于项目中下水平：代码功能正确且运行时安全网较强，但作为多租户核心实体，零审计追踪（B-1）和全量替换模式偏离（B-2）是必须修复的架构缺陷。与 Skills entity（4.0/10）相比，Company 至少在软删除声明和字段映射上是正确的。

---

## 最终裁决

### REQUEST CHANGES — 要求修改后重新提交

**合并条件**: 必须修复全部 2 项 BLOCKING 后方可重新提交审核。

| 条件 | 修复项 | 预估工时 |
|------|--------|---------|
| B-1 | Prisma 添加 createdById/updatedById + Entity 字段 + Service 注入 + map 同步 | 3h |
| B-2 | UpdateCompanyRequest 改为部分更新（全部 optional + 三值 null 语义）+ Service 条件更新 | 2h |

**合计阻断项工时**: 约 5h

### 建议同迭代修复（HIGH）

| 条件 | 修复项 | 预估工时 |
|------|--------|---------|
| H-1 | 新增 CompanyListItem，list() 返回脱敏类型 | 1h |
| H-2 | `address?: string \| null` 三值语义 | 10min |
| H-3 | Schema refine 互斥校验 + Entity JSDoc | 30min |
| H-4 | 提取 UserRef 命名类型 | 10min |
| H-5 | 补全全部字段 JSDoc | 20min |

**HIGH 合计工时**: 约 2h 10min

### 评分预测

| 阶段 | 预期评分 |
|------|---------|
| 当前 | 4.8 / 10 |
| 修复 B-1 + B-2 后 | 6.5 / 10 |
| 修复 H-1 ~ H-5 后 | 7.5 / 10 |
| 全部修复后 | 8.5 / 10 |

### Committer 备注

本模块呈现出"运行时安全但设计不安全"的典型特征。三层运行时防线（Zod + Service + sysadmin-only）有效保护了当前代码，但 Entity 层作为安全契约的第一入口，完全没有参与安全契约——零审计追踪让 Company 成为项目唯一无法追溯操作者的核心实体，全量替换 Update 模式让 Company 成为项目唯一不支持部分更新的实体。

值得肯定的是，Company 在以下方面优于部分同级实体：
- 软删除声明完整（对比 Skills 的 `deleted_at` 遗漏）
- Base/Detail 拆分合理（对比 Project 的"全部混入"）
- 事务内关联管理正确（先解绑再绑定）
- `mapCompany` 映射无遗漏

B-1（审计追踪）涉及 Prisma migration，是有破坏性的变更，建议在下一个迭代周期的第一个任务中完成，避免与其他实体修改冲突。B-2（全量替换改部分更新）可同步完成，两项合计约 5 小时。

---

## 审核签名

**审核人**: Code Committer 审核专家
**审核日期**: 2026-05-26
**代码版本**: dev 分支
**三维评审来源**: `tasks/review/company.entity.ts.{security|architecture|quality}.md`
**下一步**: 修复 B-1 + B-2 后提交复审
