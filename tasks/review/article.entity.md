# apis/entity/article.entity.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（类型安全、接口设计、领域模型一致性、可维护性、健壮性）
**文件路径**: `apis/entity/article.entity.ts`
**代码行数**: 63 行
**关联文件**: `apis/entity/index.ts`, `apis/service/impl/article.service.impl.ts`, `tests/apis/article.entity.test.ts`, `prisma/schema.prisma`
**严重级别**: HIGH(3) / MEDIUM(4) / LOW(2)

---

## 一、质量评价总览

`article.entity.ts` 定义了文章模块的 5 个接口：`Article`、`ArticleVersion`、`CreateArticleRequest`、`UpdateArticleRequest`、`ReviewArticleRequest`。作为数据传输对象（DTO）层，该文件承担了数据库模型与业务逻辑之间的类型桥梁作用。

从软件质量视角审视，该文件存在 **Prisma schema 不同步、类型安全缺失、接口设计不一致、缺少文档约束** 四大质量问题。

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| 类型安全 | 5/10 | 核心字段使用 `string` 代替字面量联合类型，编译期无法捕获非法值 |
| Schema 一致性 | 4/10 | 与 Prisma schema 存在 4 处显著差异，运行时可能产生数据不一致 |
| 接口设计 | 6/10 | CRUD 接口与同项目其他 entity 模式基本一致，但细节处存在偏差 |
| 可维护性 | 7/10 | 文件简洁，但缺少字段注释和类型约束，后续维护依赖阅读 schema |
| 测试覆盖 | 8/10 | 测试文件覆盖率良好，包含边界值、空值、字段完整性检查 |

---

## 二、问题清单

### HIGH-1: `Article.status` 使用 `string` 类型，与 Prisma `ArticleStatus` 枚举不同步

**位置**: 第 15 行

```typescript
status: string;
```

**问题**: Prisma schema 定义了 `ArticleStatus` 枚举（draft / manual_writing / generating / generate_failed / pending_review / publishing / publish_failed / published），但 entity 接口将 `status` 声明为宽泛的 `string`。这意味着：

1. 编译期无法阻止非法状态值（如 `typo_status`）通过
2. `service.impl.ts` 第 60 行和第 97 行需要手动类型断言 `(request.status as ArticleStatus)`，绕过了类型检查
3. 前端无法获得状态值的类型提示，容易拼错

**建议**: 定义状态字面量联合类型：

```typescript
export type ArticleStatus = 'draft' | 'manual_writing' | 'generating' | 'generate_failed'
  | 'pending_review' | 'publishing' | 'publish_failed' | 'published';

export interface Article {
  // ...
  status: ArticleStatus;
  // ...
}
```

---

### HIGH-2: `Article.skills` 类型为 `number | null`，但 Prisma schema 中为 `Json?`

**位置**: 第 11 行

```typescript
skills: number | null;
```

**问题**: Prisma schema 第 233 行定义 `skills Json?`，`Json` 类型在 Prisma 中可以是任意 JSON 值（对象、数组、字符串等）。entity 接口将其声明为 `number | null`，与数据库实际存储能力不匹配。

- 若数据库中 `skills` 实际存储的确实是数字，应考虑将 schema 改为 `Int?` 以获得类型安全
- 若 `skills` 可能存储复杂数据（如技能列表），entity 类型定义过窄

**建议**: 确认业务需求后，统一 schema 与 entity 的类型定义。若始终为数字，schema 改 `Int?`；若有扩展需求，entity 改为 `unknown | null`。

---

### HIGH-3: `Article.version` 类型为 `number`，但 Prisma schema 为 `Float`

**位置**: 第 14 行

```typescript
version: number;
```

**问题**: Prisma schema 第 236 行定义 `version Float @default(1.0)`，默认值为浮点数 `1.0`。entity 接口声明为 `number`，虽然 TypeScript 的 `number` 兼容浮点，但存在语义不一致：

1. 测试用例中版本号使用整数（1, 2, 100），未测试浮点版本号（1.5）
2. 如果业务意图是整数版本号，schema 应改为 `Int @default(1)`
3. 如果确实需要浮点版本号，entity 应添加注释说明

**建议**: 与业务方确认版本号语义，统一为 `Int` 或在 entity 中添加注释。

---

### MEDIUM-1: `UpdateArticleRequest.status` 为 `string`，缺少类型约束

**位置**: 第 56 行

```typescript
status?: string;
```

**问题**: `CreateArticleRequest.status` 使用了字面量联合类型 `'draft' | 'generating' | 'manual_writing'`，但 `UpdateArticleRequest.status` 退化为 `string`。这种不一致意味着：

1. 创建时只能选合法状态，更新时可以传入任意字符串
2. 攻击者可通过更新接口将状态设为非法值（与 article.controller.security 审计的 HIGH-1 问题联动）
3. 两个接口的约束力度不同，违反最小惊讶原则

**建议**: 将 `UpdateArticleRequest.status` 也改为字面量联合类型，且应包含全部 ArticleStatus 值：

```typescript
export interface UpdateArticleRequest {
  // ...
  status?: ArticleStatus;
  // ...
}
```

---

### MEDIUM-2: `UpdateArticleRequest.scheduled_publish_at` 类型为 `string | null`，与 `Article` 的 `Date | null` 不一致

**位置**: 第 57 行

```typescript
scheduled_publish_at?: string | null;
```

**问题**: `Article.scheduled_publish_at` 类型为 `Date | null`，但 `UpdateArticleRequest.scheduled_publish_at` 为 `string | null`。虽然 HTTP 请求以字符串传递日期是常见做法，但：

1. 缺少格式约束（ISO 8601? 时间戳? 自定义格式?）
2. service 层需要手动解析，增加了出错风险
3. 同一语义字段在不同接口中类型不同，增加心智负担

**建议**: 使用模板字面量类型或注释标注日期格式：

```typescript
/** ISO 8601 日期字符串，如 "2026-12-31T00:00:00Z" */
scheduled_publish_at?: string | null;
```

---

### MEDIUM-3: `CreateArticleRequest` 缺少 `project_id` 字段

**位置**: 第 31-43 行

```typescript
export interface CreateArticleRequest {
  title?: string;
  // ... 无 project_id
}
```

**问题**: `Article` 的必填字段 `project_id`（对应 Prisma `projectId Int`，非可选）未出现在 `CreateArticleRequest` 中。查看 `article.service.impl.ts` 第 46-66 行，`project_id` 通过控制器参数单独传入：

```typescript
async create(projectId: number, request: CreateArticleRequest, userId: number, role: string)
```

虽然这种模式在 RESTful 设计中常见（`projectId` 来自 URL 路径参数），但 `CreateArticleRequest` 缺少文档说明这一设计决策，且 `CreateProjectRequest` 同项目的做法是直接在请求体中包含 `company_id`。两种模式不一致。

**建议**: 添加注释说明 `project_id` 由路由参数提供：

```typescript
/** 创建文章请求 — project_id 由路由参数提供，不在此接口中 */
export interface CreateArticleRequest {
```

---

### MEDIUM-4: entity 缺少 `deletedAt` 软删除字段

**位置**: 整个文件

**问题**: Prisma schema 中 `Article` 和 `ArticleVersion` 都有 `deletedAt DateTime?` 字段用于软删除，但 entity 接口中完全省略了该字段。这意味着：

1. 从数据库查询到的 `deletedAt` 值在 TypeScript 类型层面不可访问
2. 若 service 层需要判断是否已软删除，无法通过类型系统获得帮助
3. 与 schema 不同步，增加维护成本

**建议**: 在 `Article` 和 `ArticleVersion` 接口中添加：

```typescript
deleted_at: Date | null;
```

---

### LOW-1: `ArticleVersion.id` 和 `ArticleVersion.article_id` 之间缺少关联注释

**位置**: 第 22-29 行

**问题**: `ArticleVersion` 接口字段没有 JSDoc 注释说明字段间关系（如 `article_id` 是 `Article.id` 的外键）。虽然命名规范暗示了关联，但缺乏显式文档对于新成员理解数据模型不友好。

**建议**: 对关键字段添加 JSDoc：

```typescript
export interface ArticleVersion {
  id: number;
  /** 关联的 Article.id */
  article_id: number;
  // ...
}
```

---

### LOW-2: `CreateArticleRequest` 和 `UpdateArticleRequest` 存在大量重复字段定义

**位置**: 第 31-58 行

**问题**: 两个接口有 10 个相同字段（title, article_type, write_mode, keywords, portrait, images, platforms, skills, llm_model_id, content），仅 `status` 类型和 `scheduled_publish_at` 有差异。使用 `Omit` 或 `Partial` 工具类型可以减少重复：

```typescript
type ArticleEditableFields = 'title' | 'article_type' | 'write_mode' | 'keywords'
  | 'portrait' | 'images' | 'platforms' | 'skills' | 'llm_model_id' | 'content';

export interface CreateArticleRequest extends Pick<Article, ArticleEditableFields> {
  status?: 'draft' | 'generating' | 'manual_writing';
}

export interface UpdateArticleRequest extends Partial<Pick<Article, ArticleEditableFields>> {
  status?: ArticleStatus;
  scheduled_publish_at?: string | null;
}
```

但鉴于当前文件仅 63 行且字段不多，这是低优先级的改进。

---

## 三、与 Prisma Schema 差异汇总

| 字段 | Entity 类型 | Prisma 类型 | 差异说明 |
|------|------------|-------------|----------|
| `status` | `string` | `ArticleStatus` (enum) | 缺少枚举约束 |
| `skills` | `number \| null` | `Json?` | 类型不匹配 |
| `version` | `number` | `Float` | 语义不明（整数 vs 浮点） |
| `deletedAt` | 缺失 | `DateTime?` | 软删除字段未暴露 |
| `images` | `string[] \| null` | `Json?` | Json 类型无结构约束 |
| `platforms` | `string[] \| null` | `Json?` | 同上 |

---

## 四、修复优先级建议

| 优先级 | 问题编号 | 修复工作量 | 说明 |
|--------|---------|-----------|------|
| P0 | HIGH-1 | 低 | 定义 `ArticleStatus` 联合类型，替换 `string` |
| P0 | HIGH-2 | 中 | 确认 skills 业务语义，统一 schema 与 entity |
| P1 | HIGH-3 | 低 | 确认 version 语义，统一为 Int 或注释说明 |
| P1 | MEDIUM-1 | 低 | UpdateArticleRequest.status 使用联合类型 |
| P1 | MEDIUM-4 | 低 | 添加 deleted_at 字段 |
| P2 | MEDIUM-2 | 低 | 添加日期格式注释 |
| P2 | MEDIUM-3 | 低 | 添加接口设计说明注释 |
| P3 | LOW-1 | 低 | 添加字段 JSDoc |
| P3 | LOW-2 | 中 | 提取公共字段（可选） |

---

## 五、总结

`article.entity.ts` 作为文章模块的核心类型定义，文件结构清晰、测试覆盖良好。但与 Prisma schema 存在多处不一致，尤其是 `status` 字段缺少枚举约束和 `skills` 字段类型不匹配，可能在运行时引发数据一致性问题。建议优先修复 HIGH 级别问题，将类型安全从"运行时断言"提升为"编译期保证"。

**综合质量评分: 6.2/10**
