# article.entity.ts 质量评审

**文件**: `apis/entity/article.entity.ts`
**评审维度**: 软件质量（类型安全、一致性、完整性、文档、安全性）
**评审日期**: 2026-05-26
**评审基线**: Prisma schema `Article`/`ArticleVersion` model + Map 层 `mapArticle`/`mapArticleVersion` + Schema 层 `article.schema.ts` + 前端 `pages/article/types.ts` + 同项目实体横向对比（`skills.entity.ts`、`knowledge-base.entity.ts`）

---

## 评审结论

**评分: 3.5/10 — REQUEST CHANGES → 修复后 7.5/10 — APPROVED**

Article 实体是文章管理模块的核心契约，涉及 Prisma/Entity/Schema/Map/前端五层消费。当前文件存在 2 项 BLOCKING + 5 项 HIGH 级别质量缺陷：两个实体的 `deleted_at` 字段全部遗漏、`skills: unknown` 类型安全黑洞贯穿全栈、前端 ArticleStatus 枚举与后端漂移、零 JSDoc 文档、`platforms` DTO-Entity 契约断裂。质量显著低于同项目 `knowledge-base.entity.ts`（7.5/10）和 `project.entity.ts`（7.0/10）。

---

## 发现清单

| 级别 | 编号 | 问题 | 影响 |
|------|------|------|------|
| **BLOCKING** | B-1 | `deleted_at` 字段遗漏（Article + ArticleVersion） | Prisma 有字段但实体未声明，消费者无法区分活跃/软删记录 |
| **BLOCKING** | B-2 | `skills: unknown \| null` 类型安全黑洞 | 实体层 `unknown`、DTO 层 `number[] \| null`、前端 `number[] \| null` 三方类型断链 |
| **HIGH** | H-1 | 前端 ArticleStatus 缺少 `publishing`/`publish_failed` | 后端9态 vs 前端7态，两种状态前端无法处理 |
| **HIGH** | H-2 | 零 JSDoc 文档（全文件仅2行注释） | VarChar 约束、Json 语义、状态转换规则完全不可见 |
| **HIGH** | H-3 | `created_by` 暴露内部用户 ID，无 `creator_name` | Prisma 有 `creator User?` 关联但实体未利用 |
| **HIGH** | H-4 | `platforms`/`scheduled_publish_at` 在 DTO 中存在但 Article 实体缺失 | 客户端可提交但无法通过实体类型回读 |
| **HIGH** | H-5 | ReviewArticleRequest 缺少审核意见字段 | `approved: boolean` 无法记录审核理由 |
| **MEDIUM** | M-1 | `schedule_count` 聚合字段混入基础实体 | Prisma 直字段与关联聚合计数混合 |
| **MEDIUM** | M-2 | `ArticleStatus` 是 type alias 而非 const enum | 无运行时校验能力，与 schema 层 z.enum 双重定义漂移 |
| **MEDIUM** | M-3 | Map 层参数类型为 `any` | `mapArticle(prismaArticle: any)` 丧失类型安全 |
| **MEDIUM** | M-4 | `images: string[] \| null` 与 Prisma `Json?` 映射不透明 | Map 层直接透传不做类型转换 |
| **MEDIUM** | M-5 | `version` Prisma 为 Float，语义应为整数 | `1.0`/`2.0` 而非 `1`/`2`，版本号浮点语义不严谨 |
| **LOW** | L-1 | `content` 在 Article 和 ArticleVersion 中语义重叠 | 基础实体和版本实体重复存储同名字段 |

---

## 详细分析

### B-1: `deleted_at` 字段遗漏 (BLOCKING)

**现状**: Prisma `Article` 有 `deletedAt DateTime? @map("deleted_at")`，`ArticleVersion` 也有 `deletedAt DateTime? @map("deleted_at")`。但 `Article` 接口（L13-33）和 `ArticleVersion` 接口（L35-42）均未声明 `deleted_at` 字段。Map 层 `mapArticle()`（map/index.ts:96-116）和 `mapArticleVersion()`（map/index.ts:118-127）也不映射此字段。

**对比**: 项目内所有支持软删除的实体均声明了 `deleted_at`：`KnowledgeBase`(L20)、`KnowledgeKeyword`(L18)、`KnowledgePortrait`(L73)、`KnowledgeImage`(L113)、`KnowledgeDocument`(L160)、`MinedKeyword`(L203)、`Company`(L33)、`Skills`(修复后)。Article 和 ArticleVersion 是仅有的两个遗漏。

**影响**: ① API 消费者无法区分活跃/已软删记录 ② 若 service 层通过 `deletedAt: null` 过滤，前端无法实现"回收站"功能 ③ 实体与 Prisma schema 永久失同步，新开发者无法从类型推断软删行为 ④ Map 层有意跳过映射，形成系统性遗漏。

**修复**:
```typescript
// Article 接口添加
export interface Article {
  // ...existing fields
  deleted_at: Date | null;
}

// ArticleVersion 接口添加
export interface ArticleVersion {
  // ...existing fields
  deleted_at: Date | null;
}

// mapArticle 添加
deleted_at: prismaArticle.deletedAt ?? null,

// mapArticleVersion 添加
deleted_at: prismaVersion.deletedAt ?? null,
```

---

### B-2: `skills: unknown | null` 类型安全黑洞 (BLOCKING)

**现状**: `Article.skills` 声明为 `unknown | null`（L23），注释说明"运行时可能为任意 JSON 结构"。但：
- `CreateArticleRequest.skills` 为 `number[] | null`（L52）
- `UpdateArticleRequest.skills` 为 `number[] | null`（L66）
- 前端 `types.ts` 的 `ArticleData.skills` 为 `number[] | null`（L29）
- Schema 层 `article.schema.ts` 验证为 `z.array(z.number().int().nonnegative()).max(50)`（L20）
- Map 层 `mapArticle` 直接透传 `prismaArticle.skills`（map/index.ts:106），不做类型转换

**全栈类型链条断裂**: Schema(Zod `number[]`) → DTO(TypeScript `number[]`) → Service → Prisma(Json) → Map(透传) → Entity(`unknown`) → API 响应(`unknown`) → 前端(断言为 `number[]`)

**影响**: ① 前端消费 API 时必须强制类型断言 `as number[]`，丧失编译期保护 ② `unknown` 意味着 IDE 无法提供字段补全 ③ 若 Prisma Json 中存储了非数组结构（如旧数据迁移），前端运行时崩溃但编译期无感知 ④ schema 层已验证为 `number[]`，实体层声明 `unknown` 否定了上游验证成果。

**修复**:
```typescript
// Article 接口
/** Prisma Json 类型，API 输入输出均为 number[] | null；skills 字段 ID 列表，最多 50 个 */
skills: number[] | null;
```
同步在 `mapArticle` 中添加类型断言：
```typescript
skills: Array.isArray(prismaArticle.skills) ? prismaArticle.skills as number[] : null,
```

---

### H-1: 前端 ArticleStatus 枚举漂移 (HIGH)

**现状**: 后端 `article.entity.ts` 定义 ArticleStatus 包含 9 个状态值（L2-11），包括 `publishing` 和 `publish_failed`。但前端 `pages/article/types.ts` 只定义了 7 个状态值（L1-7），缺少 `publishing` 和 `publish_failed`。

**漂移详情**:
| 状态 | 后端 entity | Schema zod | 前端 types.ts | STATUS_CONFIG |
|------|:-----------:|:----------:|:-------------:|:-------------:|
| draft | ✅ | ✅ | ✅ | ✅ |
| manual_writing | ✅ | ✅ | ✅ | ✅ |
| generating | ✅ | ✅ | ✅ | ✅ |
| generate_failed | ✅ | ✅ | ✅ | ✅ |
| pending_review | ✅ | ✅ | ✅ | ✅ |
| approved | ✅ | ✅ | ✅ | ✅ |
| publishing | ✅ | ❌ | ❌ | ❌ |
| published | ✅ | ❌ | ❌ | ❌ |
| publish_failed | ✅ | ❌ | ❌ | ❌ |

注意：`published` 也缺失——后端有此状态但前端未定义。实际上后端 `articleStatusSchema`（schema L4-11）也只定义了6个状态（缺少 `publishing`/`published`/`publish_failed`），这意味着 schema 层、前端层均与 entity 层漂移。

**影响**: ① 文章进入 `publishing`/`publish_failed`/`published` 状态时，前端无法识别和渲染 ② `STATUS_CONFIG` 无对应 entry，`STATUS_CONFIG[status]` 返回 undefined 导致渲染崩溃 ③ `EDITABLE_STATUSES` 不覆盖这三种状态，编辑权限判断失效。

**修复**: 统一三层枚举定义。建议在 entity 层使用 `as const` 数组作为单一真相源，schema 和前端从此导出：
```typescript
export const ARTICLE_STATUSES = ['draft','manual_writing','generating','generate_failed','pending_review','approved','publishing','published','publish_failed'] as const;
export type ArticleStatus = typeof ARTICLE_STATUSES[number];
```

---

### H-2: 零 JSDoc 文档 (HIGH)

**现状**: 全文件76行，仅2行 JSDoc 注释（L1、L23）。Prisma 约束在实体层完全不可见：

| 字段 | Prisma 约束 | 实体声明 | JSDoc |
|------|-------------|----------|-------|
| title | VarChar(500) | `string` | ❌ |
| article_type | VarChar(50) | `string \| null` | ❌ |
| write_mode | VarChar(20) | `string \| null` | ❌ |
| keywords | VarChar(500) | `string \| null` | ❌ |
| images | Json? | `string[] \| null` | ❌ |
| skills | Json? | `unknown \| null` | ⚠️ 仅说明 Json 类型 |
| content | String? | `string \| null` | ❌ |
| version | Float @default(1.0) | `number` | ❌ |
| status | @default(draft) | `ArticleStatus` | ❌ |

**对比**: `knowledge-base.entity.ts` 每个约束字段都有 JSDoc：`/** 描述，最长 500 字符（Prisma @db.VarChar(500)） */`。

**影响**: ① 消费者无法从 TypeScript 接口推断字段约束 ② controller 层和 schema 层硬编码约束值（`max(500)`/`max(50)`/`max(20)`），与实体层断链 ③ IDE hover 无法提示字段含义和约束 ④ 新开发者无法理解 `write_mode` 的合法值（`manual`/`ai`）。

**修复**: 为所有字段添加 JSDoc，标注 Prisma 约束。参考 `knowledge-base.entity.ts` 的注释风格：
```typescript
/** 文章标题，最长 500 字符（Prisma @db.VarChar(500)） */
title: string;
/** 文章类型，最长 50 字符（Prisma @db.VarChar(50)），合法值：榜单排名/方法论讲解/案例分析/行业洞察/对比测评/客户证言/FAQ问答/实操指南 */
article_type: string | null;
```

---

### H-3: `created_by` 暴露内部用户 ID，无 `creator_name` (HIGH)

**现状**: `Article.created_by: number | null`（L28）直接暴露内部用户 ID。Prisma 有 `creator User?` 关联（通过 `ArticleCreator` 关系），但实体层不提供 `creator_name` 人类可读字段。

**对比**: `KnowledgeBase` 拆分为 `KnowledgeBase`(基础) + `KnowledgeBaseDetail extends KnowledgeBase`(含 `creator_name`、聚合计数)。`Skills` 修复后同样拆分为 `Skills`(基础) + `SkillsDetail`(含 `creator_name`和 `creator_cn_name`)。

**影响**: ① 前端显示"创建者"时需要额外请求 User API 解析 ID ② 无法利用 Prisma `include: { creator: true }` 关联查询 ③ 与项目其他实体的 Base/Detail 分层模式不一致。

**修复**: 拆分为 `Article`(基础) + `ArticleDetail extends Article`(含 `creator_name`、`schedule_count` 等)。Service 的 `getById`/`list` 返回 `ArticleDetail`。

---

### H-4: `platforms`/`scheduled_publish_at` DTO-Entity 契约断裂 (HIGH)

**现状**: `CreateArticleRequest`（L51）和 `UpdateArticleRequest`（L65）声明了 `platforms?: string[] | null`，`UpdateArticleRequest` 还有 `scheduled_publish_at?: string | null`（L70）。但 `Article` 接口完全没有这两个字段。

**Prisma 验证**: Article model 中无 `platforms` 列——platforms 通过关联的 `PublishingSchedule` 管理。`scheduled_publish_at` 也不在 Article 表中。但 `article.schema.ts` 的 `createArticleSchema` 和 `updateArticleSchema` 中**也没有** `platforms` 和 `scheduled_publish_at` 字段（schema L13-37），说明 schema 层已抛弃这两个字段。

**影响**: ① DTO 声明了字段但 schema 验证和实体层都不认——DTO 与实际数据流完全断裂 ② 新开发者看到 DTO 中有 `platforms`，会误以为 Article 表有此列 ③ `UpdateArticleRequest.scheduled_publish_at` 的 `string | null` 三态语义正确，但无消费方。

**修复**: 从 `CreateArticleRequest` 和 `UpdateArticleRequest` 中移除 `platforms` 和 `scheduled_publish_at`（若由 PublishingSchedule 独立管理）。或保留并在 JSDoc 中明确标注"此字段写入 PublishingSchedule 关联表"。

---

### H-5: ReviewArticleRequest 缺少审核意见字段 (HIGH)

**现状**: `ReviewArticleRequest`（L73-75）仅包含 `approved: boolean`，无法记录审核理由、修改建议或拒绝原因。

**行业实践**: 内容审核系统至少需要：
- `comment: string` — 审核意见
- `reason?: string` — 拒绝原因分类（内容质量/格式/合规等）

**影响**: ① 审核拒绝时创作者无法获知修改方向 ② 无审核历史追溯能力 ③ 违反内容管理系统的基本审计要求。

**修复**:
```typescript
export interface ReviewArticleRequest {
  approved: boolean;
  /** 审核意见，拒绝时建议必填 */
  comment?: string;
}
```

---

### M-1: `schedule_count` 聚合字段混入基础实体 (MEDIUM)

**现状**: `schedule_count?: number`（L32）来自 Prisma `_count.schedules` 聚合，不是 Article 表的列。与 Prisma 直字段（id, title, status...）混合在同一接口中。

**对比**: `KnowledgeBase` 将 `knowledge_count`、`keyword_count` 等聚合计数放在 `KnowledgeBaseDetail` 中，不混入基础实体。

**修复**: 将 `schedule_count` 移至 `ArticleDetail extends Article`。

---

### M-2: `ArticleStatus` type alias vs const enum (MEDIUM)

**现状**: `ArticleStatus` 声明为 `type` alias（L2-11），无运行时值。Schema 层用 `z.enum([...])` 独立定义了状态列表（schema L4-11），前端也独立定义了状态列表（types.ts L1-7）。三处定义互相独立，漂移风险高（H-1 已证明漂移已发生）。

**修复**: 使用 `as const` 数组作为单一真相源，三处从此导出：
```typescript
export const ARTICLE_STATUSES = [...] as const;
export type ArticleStatus = typeof ARTICLE_STATUSES[number];
// schema: z.enum(ARTICLE_STATUSES)
// 前端: import { ARTICLE_STATUSES } from 'apis/entity/article.entity'
```

---

### M-3: Map 层参数类型为 `any` (MEDIUM)

**现状**: `mapArticle(prismaArticle: any)`（map/index.ts:96）和 `mapArticleVersion(prismaVersion: any)`（map/index.ts:118）参数类型均为 `any`。

**影响**: Map 函数内部的字段访问无编译期校验。拼写错误（如 `prismaArticle.titel`）不会报错，只在运行时返回 `undefined`。与项目中其他 map 函数的 `any` 参数类型问题一致（`mapSkills(prismaSkills: any)`、`mapProject(prismaProject: any)`），是系统性问题。

**修复**: 使用 Prisma 生成的类型或定义 `PrismaArticleWithRelations` 交叉类型：
```typescript
import { Article as PrismaArticle } from '@prisma/client';
type PrismaArticleWithCount = PrismaArticle & { _count?: { schedules: number } };
export function mapArticle(prismaArticle: PrismaArticleWithCount): Article { ... }
```

---

### M-4: `images` 映射不透明 (MEDIUM)

**现状**: Prisma `images Json?` → 实体 `images: string[] | null`（L21）→ Map 层直接透传 `images: prismaArticle.images`。Schema 验证为 `z.array(z.string().max(2000)).max(20)`。Map 层不做 Json→`string[]` 转换，依赖 Prisma 运行时自动序列化/反序列化 Json 类型。

**影响**: ① 若 Prisma 返回原始 Json 对象而非 `string[]`，实体类型声明错误但编译期无感知 ② 与 `skills`（同样 Json→数组）的处理方式一致（也是透传），说明这是系统性的 Prisma Json 映射策略问题。

**修复**: 在 map 层显式转换：`images: Array.isArray(prismaArticle.images) ? prismaArticle.images as string[] : null`。

---

### M-5: `version` Prisma Float 语义问题 (MEDIUM)

**现状**: Prisma `version Float @default(1.0)` 映射为 `version: number`（L26）。版本号使用浮点数导致 `1.0`/`2.0` 而非 `1`/`2`。

**影响**: ① JSON 序列化时 `1.0` 在大多数引擎中变为 `1`，但在某些场景（如前端比较 `version === 1.0`）可能不一致 ② `ArticleVersion.version` 同样为 Float，版本号语义应为整数。

**修复**: Prisma 层面改为 `Int`（需要 migration），或在 map 层取整：`version: Math.floor(prismaArticle.version)`。

---

### L-1: `content` 字段语义重叠 (LOW)

**现状**: `Article.content: string | null`（L25）和 `ArticleVersion.content: string`（L39）存储相同概念。Article 的 `content` 是"当前内容"，ArticleVersion 的 `content` 是"历史版本内容"。

**影响**: 两者同步依赖 service 层保证——更新 Article.content 时必须同时创建 ArticleVersion。当前 ArticleVersion 更像是一个值对象而非独立聚合根，放在同一文件中合理，但应在 JSDoc 中明确语义区分。

---

## 全栈类型链条审计

```
Prisma Schema                    Entity (本文件)             Schema (zod)              Map Layer                前端 types.ts
─────────────                    ─────────────────           ─────────────             ─────────                ──────────────
Article.deletedAt DateTime?      ❌ 缺失                     N/A                       ❌ 不映射                 N/A
Article.skills Json?             unknown | null              number[] (z.array)        any → any                number[] | null
Article.version Float            number                      N/A                       透传                     number
Article.images Json?             string[] | null             string[] (z.array)        any → any                string[] | null
ArticleVersion.deletedAt ?       ❌ 缺失                     N/A                       ❌ 不映射                 N/A
ArticleStatus (9 values)         type (9 values)             z.enum (6 values!)        N/A                      type (7 values!)
```

**结论**: 5 个关键映射点中 3 个存在类型断裂或遗漏。

---

## 修复优先级

| 优先级 | 编号 | 修复内容 | 预估工时 |
|--------|------|----------|----------|
| P0 | B-1 | Article + ArticleVersion 添加 `deleted_at`，Map 层补映射 | 15 min |
| P0 | B-2 | `skills` 改为 `number[] \| null`，Map 层添加类型断言 | 10 min |
| P1 | H-1 | 统一三层 ArticleStatus 为 9 个值（entity + schema + 前端） | 30 min |
| P1 | H-2 | 为所有字段添加 JSDoc（Prisma 约束 + 业务语义） | 20 min |
| P1 | H-3 | 拆分 ArticleDetail，添加 creator_name | 20 min |
| P1 | H-4 | 清理 DTO 中无效的 platforms/scheduled_publish_at | 10 min |
| P1 | H-5 | ReviewArticleRequest 添加 comment 字段 | 5 min |
| P2 | M-1~M-5 | 聚合字段拆分、const enum、Map 类型安全、version 语义 | 45 min |

**总预估**: P0 约 25 min，P1 约 85 min，P2 约 45 min。全部修复后预期评分 **7.5/10**。

---

## 同项目实体横向对比

| 维度 | article.entity.ts | knowledge-base.entity.ts | skills.entity.ts (修复后) | project.entity.ts |
|------|:-:|:-:|:-:|:-:|
| deleted_at | ❌ | ✅ | ✅ | N/A |
| Base/Detail 拆分 | ❌ | ✅ | ✅ | ❌ |
| JSDoc 覆盖率 | 8% (2/26字段) | 100% | 90% | ~60% |
| Update 三态语义 | ✅ (nullable) | ✅ | ✅ | ✅ |
| 枚举类型安全 | type alias | N/A | N/A | N/A |
| **综合评分** | **3.5/10** | **7.5/10** | **7.5/10** | **7.0/10** |

---

## 评审签名

**评审人**: 软件质量专家 (Claude Code)
**评审模型**: Quality Review v1.0
**评审耗时**: 全栈五层追踪 + 横向对比
