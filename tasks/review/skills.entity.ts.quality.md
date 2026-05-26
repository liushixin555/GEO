# skills.entity.ts 质量评审报告

**文件**: `apis/entity/skills.entity.ts`
**评审维度**: 软件质量（类型安全、一致性、完整性、文档、安全性）
**评审日期**: 2026-05-26
**评审结果**: **CONDITIONAL APPROVE 4.5/10**

---

## 总评

Skills 实体作为三个接口的简单定义文件，结构清晰但质量显著低于同项目其他实体（`knowledge-base.entity.ts` 7.5/10、`project.entity.ts` 7.0/10）。主要问题集中在：Prisma 字段遗漏（`deleted_at`）、Update 类型无法清除字段、computed 字段混入基础实体、零文档注释、`created_by` 安全隐患。

---

## 发现项汇总

| 级别 | 编号 | 问题 | 影响 |
|------|------|------|------|
| **BLOCKING** | B-1 | `deleted_at` 字段遗漏 | 消费者无法区分活跃/已软删记录 |
| **HIGH** | H-1 | `created_by` 暴露在 CreateSkillsRequest 中 | 客户端可伪造创建者身份 |
| **HIGH** | H-2 | UpdateSkillsRequest 无法清除 description | `description?: string` 语义缺陷 |
| **HIGH** | H-3 | `creator_name` 混入基础实体 | 关联计算字段与 Prisma 直字段混杂 |
| **HIGH** | H-4 | 零 JSDoc 文档 | 字段约束（VarChar 长度）完全不可见 |
| **MEDIUM** | M-1 | `skill_dir` 暴露服务器文件系统路径 | 信息泄露风险 |
| **MEDIUM** | M-2 | 缺少 SkillsDetail 扩展接口 | 无法区分 Prisma 直字段与关联聚合字段 |
| **MEDIUM** | M-3 | CreateSkillsRequest 无字段长度约束 | 依赖 controller 运行时校验，类型层无防护 |
| **MEDIUM** | M-4 | UpdateSkillsRequest 不含 `skill_dir` | 无法更新技能目录路径，意图未文档化 |
| **LOW** | L-1 | 接口名 `Skills` 为复数形式 | 与 `User`/`Project`/`Company` 单数命名不一致 |

---

## 详细分析

### B-1: `deleted_at` 字段遗漏 (BLOCKING)

**现状**: Prisma schema 定义了 `deletedAt DateTime? @map("deleted_at")`，service 层通过 `deletedAt: null` 过滤软删记录，但 `Skills` 接口完全不暴露此字段。

**对比**: `knowledge-base.entity.ts` 正确包含 `deleted_at: Date | null`，并注释为"软删除时间戳，null 表示未删除"。

**影响**: 消费者无法判断记录是否已被软删；若未来需要展示"已删除技能"列表，类型层无法支持。

```typescript
// 当前（缺失）
export interface Skills {
  // ... deleted_at 不存在
}

// 应修改为
export interface Skills {
  // ...
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}
```

---

### H-1: `created_by` 暴露在 CreateSkillsRequest 中 (HIGH)

**现状**: `CreateSkillsRequest` 包含 `created_by?: number`，但 controller 中 `created_by` 由 `req.user.userId`（JWT 令牌）强制覆盖：

```typescript
// skills.controller.ts line 126
created_by: req.user.userId
```

**问题**: 请求类型暗示客户端可设置此字段，存在身份伪造的误导。若某消费者绕过 controller 直接使用此类型，将产生安全漏洞。

**对比**: `CreateProjectRequest` 不含 `created_by`，由服务端自动注入。

**修复**: 从 `CreateSkillsRequest` 中移除 `created_by`，由 service/controller 层注入。

---

### H-2: UpdateSkillsRequest 无法清除 description (HIGH)

**现状**: `description?: string` 的语义为"undefined=不修改"，但无法表达"清除为 null"。

**对比**: `knowledge-base.entity.ts` 使用 `description?: string | null`，`null` 表示显式清除：

```typescript
// knowledge-base.entity.ts（正确做法）
export interface UpdateKnowledgeBaseRequest {
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}
```

**修复**:
```typescript
export interface UpdateSkillsRequest {
  name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}
```

---

### H-3: `creator_name` 混入基础实体 (HIGH)

**现状**: `Skills` 基础接口包含 `creator_name: string | null`，此字段来自 Prisma 关联查询 `creator.cnName`，不是 Skills 表的直接字段。

**对比**: `knowledge-base.entity.ts` 将关联字段（`company_name`、`project_name`、`creator_name`）和聚合计数（`keyword_count` 等）放在 `KnowledgeBaseDetail extends KnowledgeBase` 中：

```typescript
// knowledge-base.entity.ts（正确模式）
export interface KnowledgeBase { /* Prisma 直字段 */ }
export interface KnowledgeBaseDetail extends KnowledgeBase {
  company_name: string | null;  // 关联字段
  creator_name: string | null;  // 关联字段
  keyword_count: number;         // 聚合字段
}
```

**影响**: 基础实体与扩展数据混杂，增加重构成本；若只需 Prisma 直字段的场景被迫依赖关联查询。

**修复**: 拆分为 `Skills`（Prisma 直字段）+ `SkillsDetail extends Skills`（含 `creator_name`）。

---

### H-4: 零 JSDoc 文档 (HIGH)

**现状**: 整个文件无任何 JSDoc 注释。Prisma schema 定义了明确的字段约束但实体层不可见：

| 字段 | Prisma 约束 | 实体文档 |
|------|------------|---------|
| `name` | `@db.VarChar(200)` | 无 |
| `description` | `@db.VarChar(500)` | 无 |
| `skill_dir` | `@db.VarChar(500) @default("")` | 无 |

**对比**: `knowledge-base.entity.ts` 每个非常规字段都有 JSDoc：
```typescript
/** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
description: string | null;
/** 知识库作用域：platform=全平台, company=公司级, project=项目级 */
scope: KnowledgeScope;
```

---

### M-1: `skill_dir` 暴露服务器文件系统路径 (MEDIUM)

**现状**: `skill_dir: string` 暴露在面向前端的 `Skills` 接口中，路径可能包含服务器目录结构信息。

**建议**: 考虑在返回给前端时脱敏或仅在内部使用时携带此字段。

---

### M-2: 缺少 SkillsDetail 扩展接口 (MEDIUM)

同 H-3 的分析，应补充 `SkillsDetail extends Skills` 接口用于 API 返回，将 `creator_name` 等关联字段移入。

---

### M-3: CreateSkillsRequest 无字段长度约束 (MEDIUM)

**现状**: `name: string` 无长度约束提示。类型系统层面无法阻止超长字符串。

**对比**: Prisma 约束 `name @db.VarChar(200)` 仅在数据库层生效，实体层应通过 JSDoc 或 branded type 提前暴露约束。

---

### M-4: UpdateSkillsRequest 不含 `skill_dir` (MEDIUM)

`UpdateSkillsRequest` 仅允许更新 `name` 和 `description`，`skill_dir` 不可更新。此设计决策（技能目录上传后不可更改）合理但未文档化，应添加注释说明原因。

---

### L-1: 接口名 `Skills` 为复数形式 (LOW)

**现状**: 接口名为 `Skills`（复数），但表示单个技能实体。

**对比**: 同项目所有其他实体均使用单数：`User`、`Project`、`Company`、`KnowledgeBase`。

**原因**: Prisma model 命名为 `Skills`（复数），实体层沿用了此命名。重构代价大但长期应统一。

---

## 同项目实体横向对比

| 维度 | Skills | KnowledgeBase | Project | User |
|------|--------|---------------|---------|------|
| 基础实体 | 8 字段 | 10 字段 | 12 字段 | 8 字段 |
| Detail 扩展 | 无 | 有 (`KnowledgeBaseDetail`) | 无 | 有 (`UserListItem`) |
| `deleted_at` | 遗漏 | 有 | 无（硬删） | 无（硬删） |
| JSDoc | 零 | 每字段 | 零 | 零 |
| Create 含 `created_by` | 是 | 是 | 否 | 否 |
| Update 可清除字段 | 否 | 是（`string \| null`） | 否 | 否 |
| 类型别名 | 无 | 有（`KnowledgeScope`） | 无 | 有（`UserRole`） |

---

## 修复建议优先级

### 预计工时：1.5h

| 优先级 | 修复项 | 预计时间 |
|--------|--------|---------|
| P0 | B-1: 补充 `deleted_at: Date \| null` | 10min |
| P0 | H-1: 从 CreateSkillsRequest 移除 `created_by` | 15min（含消费者更新） |
| P0 | H-2: UpdateSkillsRequest description 改为 `string \| null` | 15min（含消费者更新） |
| P1 | H-3+M-2: 拆分 SkillsDetail，`creator_name` 移入 | 30min（含消费者更新） |
| P1 | H-4: 添加 JSDoc 文档 | 15min |
| P2 | M-3: 添加字段约束文档 | 10min |
| P2 | M-4: UpdateSkillsRequest 添加设计决策注释 | 5min |

**修复后预期评分**: 7.5/10

---

## 推荐重构后代码

```typescript
/** 技能基础实体（Prisma Skills 表字段） */
export interface Skills {
  id: number;
  /** 技能名称，最长 200 字符（Prisma @db.VarChar(200)），全局唯一 */
  name: string;
  /** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
  description: string | null;
  /** 技能文件目录路径（服务端内部使用） */
  skill_dir: string;
  /** 创建者用户 ID */
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}

/** 技能详情（含关联解析），用于列表/详情 API 返回 */
export interface SkillsDetail extends Skills {
  /** 创建者姓名（来自 User 关联） */
  creator_name: string | null;
}

/** 创建技能请求（created_by 由服务端从 JWT 注入，不暴露给客户端） */
export interface CreateSkillsRequest {
  /** 最长 200 字符 */
  name: string;
  /** 最长 500 字符 */
  description?: string;
  /** 技能文件目录路径 */
  skill_dir: string;
}

/** 更新技能请求（skill_dir 不可更新，需重新上传） */
export interface UpdateSkillsRequest {
  name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}
```

**注意**: 重构后需同步更新以下消费者：
- `apis/entity/index.ts` — 导出新增的 `SkillsDetail`
- `apis/service/skills.service.ts` — ISkillsService 返回类型
- `apis/service/impl/skills.service.impl.ts` — mapSkills 函数
- `apis/controller/skills.controller.ts` — 响应类型
- `apis/routes/skills.routes.ts` — 无变更（仅类型传递）
