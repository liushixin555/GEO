# article.entity.ts Committer 评审

**文件**: `apis/entity/article.entity.ts`
**评审维度**: Committer 代码审查（合并准入评审）
**评审日期**: 2026-05-26
**评审员**: 代码 Committer 审核专家

---

## 总评: REQUEST CHANGES 3.0/10

**最终裁决: REJECT — 拒绝合并**

article.entity.ts 作为文章模块的核心类型契约，当前状态存在 **3 项 BLOCKING** + **5 项 HIGH** + **6 项 MEDIUM** 级别问题，**不具备合并条件**。核心阻断问题：

1. **测试文件与实体类型完全脱节** — 205 个测试全部通过但引用了 Article 接口中不存在的字段（`platforms`、`scheduled_publish_at`、`schedule_type`），测试给出虚假的通过信号
2. **`deleted_at` 双层遗漏** — Prisma schema 明确定义了软删除字段，Article 和 ArticleVersion 实体均未声明，软删除机制在类型层面不可见
3. **`skills: unknown` 类型黑洞** — Entity 声明 `unknown`，DTO 声明 `number[]`，前端声明 `number[]`，全栈类型链条在 Entity 层断裂

与同项目已修复的 `skills.entity.ts`（7.5/10）、`knowledge-base.entity.ts`（7.5/10）相比，质量显著偏低。

---

## 发现清单

| 级别 | 编号 | 问题 | 评审维度 | 工时 |
|------|------|------|----------|------|
| **BLOCKING** | B-1 | 测试引用 Article 中不存在的字段，205 测试全部给出虚假通过信号 | 测试有效性 | 1h |
| **BLOCKING** | B-2 | `deleted_at` 双层遗漏（Article + ArticleVersion） | 契约完整性 | 15min |
| **BLOCKING** | B-3 | `skills: unknown` 类型黑洞，DTO-Entity 契约断裂 | 类型安全 | 30min |
| **HIGH** | H-1 | `ArticleStatus` 三处漂移（Entity 9 值 vs Schema 6 值 vs 前端 6 值） | 类型一致性 | 30min |
| **HIGH** | H-2 | `CreateArticleRequest.status` 允许 `'generating'` 系统状态注入 | 安全 | 10min |
| **HIGH** | H-3 | `UpdateArticleRequest.status` 无状态转换约束，允许终端状态 | 安全 | 20min |
| **HIGH** | H-4 | `ReviewArticleRequest` 缺少 `comment` 审计字段 | 业务完整性 | 15min |
| **HIGH** | H-5 | `created_by` 暴露内部 ID，无 `creator_name` 关联字段 | 数据契约 | 20min |
| **MEDIUM** | M-1 | DTO `platforms`/`scheduled_publish_at` 在 Entity 中无对应字段 | 契约一致性 | 30min |
| **MEDIUM** | M-2 | `schedule_count` 聚合字段混入基础 Entity | 职责分离 | 15min |
| **MEDIUM** | M-3 | `article_type`/`write_mode` 使用裸 `string` 无枚举约束 | 类型安全 | 20min |
| **MEDIUM** | M-4 | 零 JSDoc 文档（全文件 76 行仅 2 行注释） | 可维护性 | 20min |
| **MEDIUM** | M-5 | `CreateArticleRequest` 全部字段可选，允许空对象 | 业务约束 | 15min |
| **MEDIUM** | M-6 | Map 层 `mapArticle`/`mapArticleVersion` 参数类型为 `any` | 类型安全 | 20min |

---

## 详细分析

### B-1 [BLOCKING] 测试与实体类型完全脱节 — 虚假通过信号

**现状**: `tests/apis/article.entity.test.ts`（1787 行、205 测试）全部通过，但 `baseArticle: Article`（L15-35）引用了 Article 接口中**不存在**的字段：

```typescript
// tests/apis/article.entity.test.ts L15-35
const baseArticle: Article = {
  // ...Article 接口定义的字段
  platforms: ['新浪', '搜狐'],         // ← Article 接口无此字段
  scheduled_publish_at: null,          // ← Article 接口无此字段
  schedule_type: null,                 // ← Article 接口无此字段
};
```

**Article 接口实际字段**（L13-33）:
```
id, project_id, title, article_type, write_mode, keywords, portrait,
images, skills, llm_model_id, content, version, status, created_by,
created_at, updated_at, schedule_count?
```

**测试断言验证的字段清单**（L181-185）:
```
id, project_id, title, article_type, write_mode, keywords, portrait,
images, platforms, skills, llm_model_id, content, version, status,
scheduled_publish_at, schedule_type, created_by, created_at, updated_at
```

**差异**: 测试期望 `platforms`、`scheduled_publish_at`、`schedule_type` 三个字段，但 Entity 不定义这些字段。

**为什么会通过**:
- Jest 运行时使用 JavaScript，不强制 TypeScript 类型
- Jest 的 inline tsconfig 可能未启用 strict excess property checking
- TypeScript structural typing 允许运行时对象携带多余属性

**Committer 判定**: 这是最严重的阻断问题。205 个测试全部通过，但测试验证的是一个与实际类型定义不同的"影子接口"。测试给出了虚假的通过信号，新开发者会误以为 Article 接口包含这些字段。

**Prisma 验证**: Article model 无 `platforms`、`scheduled_publish_at`、`schedule_type` 列——平台信息在 `PublishingSchedule` 关联表中。

**修复方案**:
1. 从 `baseArticle` 中移除 `platforms`、`scheduled_publish_at`、`schedule_type`
2. 将相关测试移至 DTO（`CreateArticleRequest`/`UpdateArticleRequest`）测试块
3. 字段清单断言（L181-185）对齐 Article 接口实际字段
4. 验证 Jest tsconfig 启用 `strict: true`

---

### B-2 [BLOCKING] `deleted_at` 双层遗漏 — 软删除类型丢失

**Prisma schema**:
```prisma
// Article (L262)
deletedAt DateTime? @map("deleted_at") @db.Timestamptz()

// ArticleVersion (L279)
deletedAt DateTime? @map("deleted_at") @db.Timestamptz()
```

**Entity 接口**: 两者均未声明 `deleted_at`。

**Map 层**: `mapArticle`（map/index.ts:96-116）和 `mapArticleVersion`（map/index.ts:118-127）也不映射此字段。

**项目一致性**: 所有支持软删除的实体均声明了 `deleted_at`——`KnowledgeBase`(L20)、`KnowledgeKeyword`(L18)、`Skills`(修复后)。Article 和 ArticleVersion 是唯一遗漏。

**Committer 判定**: Prisma 查询 `where: { deletedAt: null }` 过滤软删除记录，但 Entity 类型系统完全无法表达此概念。Service 层开发者无法从类型推断软删行为。属于系统性的类型-数据库失同步。

**修复方案**:
```typescript
// Article 接口添加
deleted_at: Date | null;

// ArticleVersion 接口添加
deleted_at: Date | null;

// mapArticle 添加
deleted_at: prismaArticle.deletedAt ?? null,

// mapArticleVersion 添加
deleted_at: prismaVersion.deletedAt ?? null,
```

---

### B-3 [BLOCKING] `skills: unknown` 类型黑洞 — 全栈类型链条断裂

**类型链条**:
```
Schema (zod)              →  number[]        ← 输入校验
CreateArticleRequest      →  number[] | null ← DTO 契约
UpdateArticleRequest      →  number[] | null ← DTO 契约
前端 ArticleData.skills   →  number[] | null ← 前端契约
Article.skills (Entity)   →  unknown | null  ← ★ 类型黑洞
Map 层                    →  直接透传 any    ← 无校验
```

**问题**: Entity 层是全栈类型链条的中心环节。上游（Schema/DTO）和下游（前端）均承诺 `number[]`，但 Entity 声明为 `unknown`，形成类型断裂。

**Committer 判定**:
1. `unknown` 迫使消费方使用不安全的类型断言 `as number[]`
2. 前端消费 API 时编译期保护完全丧失
3. Map 层直接透传 `prismaArticle.skills`，若数据库存储了被篡改的 JSON（如通过 Prisma Studio），恶意数据直达前端
4. 与项目其他实体的 Prisma Json 处理方式不一致——`images` 声明为 `string[] | null` 而非 `unknown`

**修复方案**:
```typescript
// Article.skills 改为
skills: number[] | null;

// mapArticle 添加类型断言
skills: Array.isArray(prismaArticle.skills) ? prismaArticle.skills as number[] : null,
```

---

### H-1 [HIGH] `ArticleStatus` 三处漂移 — 无编译时一致性保障

**对比**:
| 状态 | Prisma enum | Entity type | Zod schema | 前端 types.ts | STATUS_CONFIG |
|------|:-----------:|:-----------:|:----------:|:-------------:|:-------------:|
| draft | ✅ | ✅ | ✅ | ✅ | ✅ |
| manual_writing | ✅ | ✅ | ✅ | ✅ | ✅ |
| generating | ✅ | ✅ | ✅ | ✅ | ✅ |
| generate_failed | ✅ | ✅ | ✅ | ✅ | ✅ |
| pending_review | ✅ | ✅ | ✅ | ✅ | ✅ |
| approved | ✅ | ✅ | ✅ | ✅ | ✅ |
| publishing | ✅ | ✅ | ❌ | ❌ | ❌ |
| published | ✅ | ✅ | ❌ | ❌ | ❌ |
| publish_failed | ✅ | ✅ | ❌ | ❌ | ❌ |

**问题**: Zod schema（article.schema.ts L4-11）和前端 types.ts 均缺少 `publishing`/`published`/`publish_failed` 三个状态。但测试（L137）已使用这 8 个状态值（遗漏 `approved`）。

**影响**: 文章进入发布流程时前端无法识别状态，`STATUS_CONFIG[status]` 返回 `undefined` 导致渲染崩溃。

**修复方案**: 以 Entity 的 `ArticleStatus` 为唯一真相源，Zod schema 和前端从此导出。建议使用 `as const` 数组：
```typescript
export const ARTICLE_STATUSES = ['draft','manual_writing','generating','generate_failed',
  'pending_review','approved','publishing','published','publish_failed'] as const;
export type ArticleStatus = typeof ARTICLE_STATUSES[number];
```

---

### H-2 [HIGH] `CreateArticleRequest.status` 允许系统状态注入

**位置**: `CreateArticleRequest.status` (L55)
```typescript
status?: 'draft' | 'generating' | 'manual_writing';
```

`'generating'` 是 LLM 生成流程独占的系统状态，客户端创建时注入会导致：
1. 前端显示"生成中"但后端无 LLM 任务
2. 状态机死锁 — 文章卡在 `generating` 但无任务完成它

**修复**: 客户端创建只允许 `'draft' | 'manual_writing'`。

---

### H-3 [HIGH] `UpdateArticleRequest.status` 无状态转换约束

**位置**: `UpdateArticleRequest.status` (L69)
```typescript
status?: ArticleStatus;  // 允许全部 9 个状态值
```

允许 `'published'`、`'publishing'` 等终端/系统状态直接设置。虽然 service 层有 `STATUS_TRANSITIONS` 验证，但 Entity 层无约束意味着新的 service 实现可能遗漏此验证。

**修复**: 定义 `UpdatableArticleStatus` 排除终端状态：
```typescript
export type UpdatableArticleStatus = Exclude<ArticleStatus, 'published' | 'publishing'>;
```

---

### H-4 [HIGH] `ReviewArticleRequest` 缺少审计字段

**位置**: L73-75
```typescript
export interface ReviewArticleRequest {
  approved: boolean;  // 仅此一个字段
}
```

审核拒绝时无理由记录，违反合规审计基本要求（ISO 27001 A.9.2.2、SOC 2 CC6.1）。创作者无法获知修改方向。

**修复**:
```typescript
export interface ReviewArticleRequest {
  approved: boolean;
  /** 审核意见，拒绝时建议必填 */
  comment?: string;
}
```

---

### H-5 [HIGH] `created_by` 暴露内部 ID，无 `creator_name`

**位置**: `Article.created_by` (L28)、`ArticleVersion.created_by` (L40)

Prisma 有 `creator User?` 关联（Article L257、ArticleVersion L277），但 Entity 未利用。前端展示需要额外 API 调用解析 ID→姓名。

与 `skills.entity.ts`（修复后 `SkillsDetail` 含 `creator_name`）和 `knowledge-base.entity.ts`（`KnowledgeBaseDetail` 含 `creator_name`）的模式不一致。

**修复**: 添加 `ArticleDetail extends Article` 接口，包含 `creator_name` 和 `schedule_count`。

---

### M-1 [MEDIUM] DTO 字段与 Entity 无对应

`CreateArticleRequest.platforms`（L51）和 `UpdateArticleRequest.platforms`（L65）在 Article 实体中无对应字段——平台信息存储在 `PublishingSchedule` 关联表。`UpdateArticleRequest.scheduled_publish_at`（L70）同理。

Zod schema（article.schema.ts）也**没有**定义 `platforms` 和 `scheduled_publish_at`，说明 DTO 声明了字段但 schema 验证不认——DTO 与实际数据流断裂。

**修复**: 从 DTO 中移除或明确标注"此字段写入 PublishingSchedule 关联表"。

---

### M-2 [MEDIUM] `schedule_count` 聚合字段混入基础 Entity

`schedule_count?: number`（L32）来自 Prisma `_count.schedules` 聚合，不是 Article 表的列。与 `KnowledgeBase`（聚合计数放 `KnowledgeBaseDetail`）的模式不一致。

**修复**: 移至 `ArticleDetail` 接口。

---

### M-3 [MEDIUM] `article_type`/`write_mode` 使用裸 `string`

前端已定义明确的字面量联合类型：
```typescript
export type ArticleType = '榜单排名' | '方法论讲解' | '案例分析' | ... ;
export type WriteMode = 'manual' | 'ai';
```

Entity 层使用 `string` 丢失了所有业务约束。

---

### M-4 [MEDIUM] 零 JSDoc 文档

全文件 76 行仅 2 行 JSDoc 注释（L1 状态枚举说明、L23 skills 类型说明）。其余 17 个字段、3 个 DTO 接口均无文档。

**对比**: `knowledge-base.entity.ts` 每个约束字段都有 JSDoc 标注 Prisma 约束。

---

### M-5 [MEDIUM] `CreateArticleRequest` 全部字段可选

```typescript
export interface CreateArticleRequest {
  title?: string;       // 可选
  content?: string;     // 可选
  status?: 'draft' | 'generating' | 'manual_writing';  // 可选
  // ... 全部可选
}
```

`const req: CreateArticleRequest = {}` 合法，但创建无标题、无内容、无类型的文章不合理。至少 `title` 应为必填。

---

### M-6 [MEDIUM] Map 层参数类型为 `any`

`mapArticle(prismaArticle: any)` 和 `mapArticleVersion(prismaVersion: any)` 参数类型均为 `any`，字段拼写错误不会编译报错。

---

## 全栈类型契约审计

```
Prisma Schema                 Entity (本文件)          Map Layer           Zod Schema           前端 types.ts
──────────────                ───────────────          ─────────           ───────────           ──────────────
Article.deletedAt DateTime?   ❌ 缺失                  ❌ 不映射            N/A                   N/A
ArticleVersion.deletedAt ?    ❌ 缺失                  ❌ 不映射            N/A                   N/A
Article.skills Json?          unknown | null           any → any           number[] (z.array)    number[] | null
Article.images Json?          string[] | null          any → any           string[] (z.array)    string[] | null
Article.version Float         number                   透传                N/A                   number
ArticleStatus (9 values)      type (9 values)          N/A                 z.enum (6 values!)    type (6 values!)
platforms                     ❌ 不在Entity            N/A                 ❌ schema无            N/A
scheduled_publish_at          ❌ 不在Entity            N/A                 ❌ schema无            N/A
```

**结论**: 6 个关键映射点中 4 个存在类型断裂或遗漏。

---

## 同项目实体横向对比

| 维度 | article.entity.ts | skills.entity.ts (修复后) | knowledge-base.entity.ts | project.entity.ts |
|------|:-:|:-:|:-:|:-:|
| deleted_at | ❌ | ✅ | ✅ | N/A |
| Base/Detail 拆分 | ❌ | ✅ | ✅ | ❌ |
| JSDoc 覆盖率 | 8% (2/26) | 90% | 100% | ~60% |
| DTO-Entity 一致性 | ❌ (skills断裂) | ✅ | ✅ | ✅ |
| 状态枚举约束 | type alias | N/A | N/A | N/A |
| 测试可信度 | ❌ (虚假通过) | ✅ | ✅ | ✅ |
| **Committer 评分** | **3.0/10** | **7.5/10** | **7.5/10** | **7.0/10** |

---

## 修复优先级路线图

### P0 — BLOCKING（必须修复才能合并）

| 编号 | 修复内容 | 工时 |
|------|----------|------|
| B-1 | 修复测试：移除 `platforms`/`scheduled_publish_at`/`schedule_type`，字段清单断言对齐 Entity | 1h |
| B-2 | Article + ArticleVersion 添加 `deleted_at: Date \| null`，Map 层补映射 | 15min |
| B-3 | `skills` 改为 `number[] \| null`，Map 层添加类型断言 | 30min |

**P0 总工时**: 约 1h45min

### P1 — HIGH（本迭代修复）

| 编号 | 修复内容 | 工时 |
|------|----------|------|
| H-1 | 统一三层 ArticleStatus 为 9 值（Entity + Schema + 前端） | 30min |
| H-2 | CreateArticleRequest.status 移除 `'generating'` | 10min |
| H-3 | UpdateArticleRequest.status 使用 `UpdatableArticleStatus` | 20min |
| H-4 | ReviewArticleRequest 添加 `comment` 字段 | 15min |
| H-5 | 添加 `ArticleDetail` 接口，含 `creator_name` + `schedule_count` | 20min |

**P1 总工时**: 约 1h35min

### P2 — MEDIUM（下一迭代）

| 编号 | 修复内容 | 工时 |
|------|----------|------|
| M-1~M-6 | DTO 清理、聚合字段拆分、枚举类型、JSDoc、必填约束、Map 类型安全 | 2h |

**全部修复后预期评分**: **7.5/10**

---

## 评审签名

**评审人**: 代码 Committer 审核专家 (Claude Code)
**评审模型**: Committer Review v1.0
**评审依据**: 三份前置评审（架构 4.0/10、安全 3.2/10、质量 3.5/10）+ Prisma schema 对齐验证 + 测试执行验证 + Map/Schema/前端全栈追踪
