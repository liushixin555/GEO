# article.entity.ts 架构评审

**文件**: `apis/entity/article.entity.ts`
**评审维度**: 架构（Architecture）
**评审日期**: 2026-05-26
**评审员**: 软件架构专家

---

## 总评: REQUEST CHANGES 4.0/10

Article 实体层存在多处架构缺陷：`deleted_at` 在 Entity/DTO 双层遗漏导致软删除形同虚设；`skills: unknown` 类型黑洞使 DTO-Entity 契约断裂；前端独立定义 ArticleStatus 导致状态漂移；测试文件引用了 Entity 中不存在的字段（platforms、schedule_type、scheduled_publish_at）暴露了代码与类型的实际脱节。Entity 层作为系统的单一事实来源（Single Source of Truth），当前状态无法承担这一职责。

---

## 发现项

### B-1 [BLOCKING] `deleted_at` 双层遗漏——软删除在 Entity 层完全丢失

**Prisma schema 已定义**:
```prisma
// schema.prisma Line 262
deletedAt DateTime? @map("deleted_at") @db.Timestamptz()
```

**但 Article Entity 缺失**:
```typescript
// article.entity.ts — Article interface 中无 deleted_at
export interface Article {
  // ... 无 deleted_at 字段
  updated_at: Date;
  schedule_count?: number;  // ← 到此结束
}
```

**ArticleVersion 同样遗漏**:
```prisma
// schema.prisma Line 281
deletedAt DateTime? @map("deleted_at") @db.Timestamptz()
```
```typescript
// article.entity.ts — ArticleVersion interface 中无 deleted_at
export interface ArticleVersion {
  // ... 无 deleted_at 字段
  created_at: Date;  // ← 到此结束
}
```

**影响**:
- Service 层查询已软删除的 Article 时，Entity 类型系统无法表达 `deleted_at`，Prisma 返回的数据在 TypeScript 侧被静默截断
- `where: { deleted_at: null }` 过滤条件在 Entity 侧无类型约束，开发者可能遗忘添加导致泄露已删除数据
- 与同项目 `skills.entity.ts` 修复后的模式（`deleted_at: Date | null`）不一致

**修复建议**: 在 Article 和 ArticleVersion 接口中添加 `deleted_at: Date | null`。

---

### B-2 [BLOCKING] 测试文件引用 Entity 中不存在的字段——类型系统已失效

测试文件 `tests/apis/article.entity.test.ts` 大量使用 Article 接口中**未定义**的字段：

```typescript
// test Line 24-26 — platforms 不在 Article interface 中
images: ['img1.jpg', 'img2.jpg'],
platforms: ['新浪', '搜狐'],       // ← Article 无此字段
skills: [1],
```

```typescript
// test Line 30-31 — scheduled_publish_at 和 schedule_type 不在 Article interface 中
scheduled_publish_at: null,        // ← Article 无此字段
schedule_type: null,                // ← Article 无此字段
```

```typescript
// test Line 181-186 — 字段清单校验包含不存在的字段
['id', 'project_id', 'title', 'article_type', 'write_mode', 'keywords',
 'portrait', 'images', 'platforms', 'skills', 'llm_model_id', 'content',
 'version', 'status', 'scheduled_publish_at', 'schedule_type', 'created_by', 'created_at',
 'updated_at'].sort()
```

**这意味着**:
- 要么 Entity 接口定义不完整（缺少 `platforms`、`scheduled_publish_at`、`schedule_type` 字段），测试反映了真实数据结构
- 要么测试全部通过虚假的类型断言（TypeScript structural typing 允许多余属性在对象字面量展开时通过）
- 无论哪种情况，Entity 作为"契约"的可信度为零

**修复建议**: 审查 Prisma schema，确认 `platforms`/`scheduled_publish_at`/`schedule_type` 是否为 Article model 的字段。若是，补充到 Entity；若不是（已迁移到 PublishingSchedule），则修复测试。

---

### H-1 [HIGH] `skills: unknown` 类型黑洞——DTO-Entity 契约断裂

```typescript
// Entity (Line 23)
skills: unknown | null;  // Prisma Json? 类型，运行时可为任意 JSON

// CreateArticleRequest (Line 52)
skills?: number[] | null;  // DTO 声明为 number[] | null

// UpdateArticleRequest (Line 66)
skills?: number[] | null;  // DTO 声明为 number[] | null
```

**问题链**:
1. DTO 层承诺 `skills` 为 `number[]`（技能 ID 列表）
2. Entity 层声明为 `unknown`，即"什么都可以"
3. Prisma `Json?` 类型在运行时可以存储 `{}`、`"string"`、`true` 等任意 JSON 值
4. 前端 `pages/article/types.ts` 又定义为 `skills: number[] | null`（Line 29）

三层类型不一致，形成了 `number[]` → `unknown` → `number[]` 的类型断裂。任何一层都可以静默地存储/读取非预期数据。

**修复建议**: Entity 层应声明为 `skills: number[] | null`，与 DTO 保持一致。Prisma Json 的运行时任意性应在 Service 层通过类型守卫（type guard）处理，而非在 Entity 层降级为 `unknown`。

---

### H-2 [HIGH] 前后端 ArticleStatus 漂移——无共享约束机制

**后端 Entity** (`apis/entity/article.entity.ts` Line 2-11):
```typescript
export type ArticleStatus =
  | 'draft' | 'manual_writing' | 'generating' | 'generate_failed'
  | 'pending_review' | 'approved' | 'publishing' | 'published' | 'publish_failed';
// 9 个值
```

**前端 types** (`pages/article/types.ts` Line 1-7):
```typescript
export type ArticleStatus =
  | 'draft' | 'manual_writing' | 'generating' | 'generate_failed'
  | 'pending_review' | 'approved';
// 6 个值，缺少 publishing / published / publish_failed
```

**Zod schema** (`apis/schema/article.schema.ts` Line 4-11):
```typescript
export const articleStatusSchema = z.enum([
  'draft', 'manual_writing', 'generating', 'generate_failed',
  'pending_review', 'approved',
]);
// 6 个值，与前端一致但与 Entity 不一致
```

**问题**:
- 三处定义相互独立，无编译时约束保证一致性
- 前端缺少 `publishing`/`published`/`publish_failed` 状态，发布流程的状态无法在前端展示
- Zod schema 也缺少这 3 个状态，意味着后端校验层拒绝这些合法状态
- `STATUS_CONFIG`（前端 Line 74-81）只有 6 个状态映射，`publishing`/`published`/`publish_failed` 状态的文章在前端无 label 和 color

**修复建议**:
1. 以 Prisma enum 为唯一真相来源
2. 后端 Entity 的 ArticleStatus 应从 Prisma schema 自动生成或手动同步
3. 前端应直接 import 后端 ArticleStatus 或通过 OpenAPI 生成类型
4. Zod schema 必须与 Entity 保持一致

---

### H-3 [HIGH] `article_type` / `write_mode` 使用裸 `string` 类型——业务语义未编码

```typescript
// Article (Line 17-18)
article_type: string | null;
write_mode: string | null;
```

前端已定义明确的业务枚举：
```typescript
// pages/article/types.ts Line 9-19
export type ArticleType = '榜单排名' | '方法论讲解' | '案例分析' | '行业洞察'
  | '对比测评' | '客户证言' | 'FAQ问答' | '实操指南';

export type WriteMode = 'manual' | 'ai';
```

Entity 层使用 `string` 丢失了所有业务约束，任何字符串都可以通过类型检查。

**修复建议**: 在 Entity 层定义 `ArticleType` 和 `WriteMode` 类型字面量联合，与前端保持同步。

---

### H-4 [HIGH] ReviewArticleRequest 缺少 `comment` 字段——审核无理由记录

```typescript
// Line 73-75
export interface ReviewArticleRequest {
  approved: boolean;
}
```

审核操作只有通过/拒绝的布尔值，无拒绝理由字段。业务上拒绝审核时必须提供原因，否则创作者无法理解拒绝原因并进行修改。

**修复建议**: 添加 `comment?: string` 字段，拒绝时要求必填。

---

### H-5 [HIGH] `created_by: number | null` 缺少关联展示字段——ID 孤岛

```typescript
// Line 28
created_by: number | null;
```

Entity 只存储用户 ID，前端展示需要用户名称。当前架构下：
- 每次列表展示都需要额外查询用户信息
- 或在 Service 层手动 join 并返回非 Entity 字段

对比 `skills.entity.ts` 修复后的模式（`SkillsDetail` 包含 `creator_name`），Article Entity 缺少面向展示层的 Detail 类型。

**修复建议**: 添加 `ArticleDetail` 接口，包含 `creator_name?: string` 和其他展示用聚合字段。

---

### M-1 [MEDIUM] `schedule_count` 聚合字段混入基础 Entity——职责混合

```typescript
// Line 32
schedule_count?: number;
```

`schedule_count` 是聚合查询结果（`COUNT(*)`），不属于 Article 的基础属性。将其混入基础 Entity 导致：
- 类型检查中 `schedule_count` 可选，无法区分"未查询"和"实际为 0"
- 与其他 Entity 的模式不一致（如 `KnowledgeBaseDetail` 单独拆分展示类型）

**修复建议**: 将 `schedule_count` 移至 `ArticleDetail` 接口。

---

### M-2 [MEDIUM] CreateArticleRequest 包含 `platforms` 但 Prisma Article model 无此字段

```typescript
// CreateArticleRequest (Line 51)
platforms?: string[] | null;
```

Prisma schema 中 Article model 没有 `platforms` 字段。平台信息存储在 `PublishingSchedule.platforms`。CreateArticleRequest 的 `platforms` 字段语义不明，可能为历史遗留。

**修复建议**: 确认业务逻辑。若创建时不直接关联平台，移除此字段；若需要，应在 Service 层映射到 PublishingSchedule。

---

### M-3 [MEDIUM] ArticleStatus 缺少状态机的类型级表达

当前 `ArticleStatus` 是一个平铺的联合类型，没有表达状态间的合法转换关系。例如 `published → draft` 应该是不合法的，但类型系统无法阻止：

```typescript
// 类型系统允许但不合法的转换
const update: UpdateArticleRequest = { status: 'draft' };  // 从 published 状态可传入
```

**修复建议**: 在 Entity 层添加状态转换的辅助类型或函数（如 `isValidStatusTransition`，当前在 Service 层但 Entity 无约束）。

---

### M-4 [MEDIUM] 零 JSDoc 文档——除 skills 外无任何字段注释

```typescript
// 唯一的 JSDoc
/** Prisma Json? 类型，运行时可能为任意 JSON 结构；API 输入输出为 number[] | null */
skills: unknown | null;
```

其余 17 个字段、3 个 DTO 接口、1 个枚举类型均无文档。作为系统核心实体，缺乏文档会导致：
- 新开发者无法理解业务语义（如 `portrait` 是人物画像还是目标受众画像）
- `write_mode` 的可选值不清楚
- `version` 字段的递增规则未说明

**修复建议**: 为所有接口和关键字段添加 JSDoc。

---

### M-5 [MEDIUM] CreateArticleRequest 允许空对象——无最少必填字段约束

```typescript
export interface CreateArticleRequest {
  title?: string;       // 可选
  content?: string;     // 可选
  status?: 'draft' | 'generating' | 'manual_writing';  // 可选
  // ... 全部可选
}
```

`const req: CreateArticleRequest = {}` 是合法的，但创建一个无标题、无内容、无类型的文章在业务上不合理。

**修复建议**: 至少 `title` 应为必填字段，或使用 branded type 在编译时约束。

---

## 评审汇总

| 级别 | 编号 | 问题 | 修复工时 |
|------|------|------|----------|
| BLOCKING | B-1 | `deleted_at` 双层遗漏（Article + ArticleVersion） | 15min |
| BLOCKING | B-2 | 测试引用 Entity 不存在的字段，类型契约失效 | 1h |
| HIGH | H-1 | `skills: unknown` 类型黑洞，DTO-Entity 断裂 | 30min |
| HIGH | H-2 | 前后端 ArticleStatus 三处漂移 | 30min |
| HIGH | H-3 | `article_type`/`write_mode` 裸 string | 20min |
| HIGH | H-4 | ReviewArticleRequest 缺 comment | 15min |
| HIGH | H-5 | `created_by` 缺 creator_name，无 Detail 类型 | 30min |
| MEDIUM | M-1 | `schedule_count` 聚合字段混入基础 Entity | 15min |
| MEDIUM | M-2 | CreateArticleRequest 的 `platforms` 字段在 Prisma 中不存在 | 30min |
| MEDIUM | M-3 | ArticleStatus 无状态机类型约束 | 1h |
| MEDIUM | M-4 | 零 JSDoc 文档 | 30min |
| MEDIUM | M-5 | CreateArticleRequest 无最少必填字段 | 15min |

**总修复工时**: 约 5h

---

## 修复优先级路线图

### P0 — 必须立即修复（阻断后续开发）
1. **B-1**: 补充 `deleted_at: Date | null` 到 Article 和 ArticleVersion
2. **B-2**: 审查 Prisma schema 与 Entity 字段对齐，修复测试或补充 Entity 字段

### P1 — 本迭代修复
3. **H-1**: `skills` 类型从 `unknown` 改为 `number[] | null`
4. **H-2**: 统一前后端 ArticleStatus，Zod schema 同步
5. **H-3**: 定义 `ArticleType` / `WriteMode` 字面量联合类型
6. **H-5**: 添加 `ArticleDetail` 接口

### P2 — 下一迭代
7. **H-4**: ReviewArticleRequest 添加 `comment` 字段
8. **M-1 ~ M-5**: 聚合字段拆分、文档补全、状态机约束

---

## 修复后预期评分

完成 P0 + P1 修复后预期评分: **7.5/10**
完成全部修复后预期评分: **8.5/10**
