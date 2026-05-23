# apis/entity/article.entity.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构、领域建模、接口契约、演进性、跨模块一致性）
**文件路径**: `apis/entity/article.entity.ts`
**代码行数**: 63 行
**关联文件**: `apis/entity/index.ts`, `apis/service/article.service.ts`, `apis/service/impl/article.service.impl.ts`, `apis/controller/article.controller.ts`, `prisma/schema.prisma`
**严重级别**: CRITICAL(1) / HIGH(3) / MEDIUM(3) / LOW(2)

---

## 一、架构评价总览

`article.entity.ts` 是文章模块的 Entity 层，定义了 5 个接口：`Article`、`ArticleVersion`、`CreateArticleRequest`、`UpdateArticleRequest`、`ReviewArticleRequest`。从架构视角审视，该文件承担了**领域模型**与**传输对象（DTO）**的双重职责，但缺乏明确的职责边界划分。

从软件架构视角审视，核心问题集中在：**Entity-DTO 职责混淆、类型契约不完整、领域概念泄漏、与同项目其他模块设计不一致**。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 职责分离 | 4/10 | Entity 与 DTO 混于同一文件，领域模型与传输对象无边界 |
| 类型契约 | 3/10 | 核心枚举字段退化为 `string`，类型契约形同虚设 |
| Schema 同步 | 3/10 | 与 Prisma schema 存在 6 处显著差异，`deletedAt` 字段完全缺失 |
| 模块一致性 | 5/10 | 与 Project/Knowledge 等模块的 DTO 模式存在设计偏差 |
| 领域建模 | 5/10 | 状态机概念隐含在 service 层，Entity 层未表达领域规则 |
| 演进性 | 4/10 | 缺少版本化策略、类型扩展点、JSON 字段无结构约束 |
| 安全架构 | 5/10 | 白名单在 controller 层，但 Entity 层类型约束缺位导致防御纵深不足 |

---

## 二、架构问题清单

### CRITICAL-1: Entity 与 DTO 职责混淆，缺少分层边界

**位置**: 整个文件（第 1-63 行）

**问题**: 文件同时包含领域实体（`Article`、`ArticleVersion`）和请求传输对象（`CreateArticleRequest`、`UpdateArticleRequest`、`ReviewArticleRequest`）。在分层架构中，Entity 和 DTO 承担不同职责：

| 类型 | 职责 | 消费者 |
|------|------|--------|
| Entity（`Article`） | 领域模型，反映数据全貌 | Service、Repository、前端 |
| DTO（`CreateArticleRequest`） | 入站传输契约，定义 API 接受什么 | Controller、Validation |
| DTO（`UpdateArticleRequest`） | 入站传输契约，部分更新语义 | Controller、Validation |

**当前设计导致的问题**：
1. 修改 DTO（如添加验证规则）会影响 Entity 的导入方
2. Entity 无法包含仅面向领域层的计算属性或方法
3. 与同项目 `project.entity.ts` 的模式一致（也混合了），但这不代表架构正确——这是全项目的系统性问题

**建议**: 考虑将 DTO 拆分到 `apis/dto/article.dto.ts` 或至少在文件中用注释分区：

```typescript
// ── 领域模型 ─────────────────────────────
export interface Article { ... }
export interface ArticleVersion { ... }

// ── 请求传输对象 ──────────────────────────
export interface CreateArticleRequest { ... }
export interface UpdateArticleRequest { ... }
export interface ReviewArticleRequest { ... }
```

> **注**: 此问题在项目所有 entity 文件中普遍存在，属于系统级架构债务。当前阶段可通过注释分区改善，不建议立即大规模重构。

---

### HIGH-1: `Article.status` 缺少枚举类型，状态机概念在架构层泄漏

**位置**: 第 15 行

```typescript
status: string;
```

**问题**: Prisma 定义了 `ArticleStatus` 枚举（8 种状态），controller 定义了状态转换白名单，service 实现了状态转换逻辑——这是一个完整的**有限状态机（FSM）**领域概念。但 Entity 层将 `status` 声明为 `string`，导致：

1. **架构防御纵深断裂**: controller 有白名单，但 Entity 无类型约束。若绕过 controller 直接操作 service，非法状态值无编译期拦截
2. **状态机隐式实现**: 状态转换规则散落在 controller（白名单）和 service（if/else）中，Entity 未承载领域知识
3. **与 Project 模块对比**: `Project.status` 使用 `boolean`（激活/停用），语义简单。Article 有 8 种状态 + 复杂转换规则，需要更强的类型表达

**建议**: 在 Entity 层定义状态类型，作为架构级别的领域契约：

```typescript
export type ArticleStatus =
  | 'draft'           // 草稿
  | 'manual_writing'  // 手动编写
  | 'generating'      // AI 生成中
  | 'generate_failed' // 生成失败
  | 'pending_review'  // 待审核
  | 'publishing'      // 发布中
  | 'publish_failed'  // 发布失败
  | 'published';      // 已发布

/** 合法的状态转换路径 */
export const ARTICLE_STATUS_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ['manual_writing', 'generating'],
  manual_writing: ['pending_review', 'draft'],
  generating: ['generate_failed', 'pending_review'],
  generate_failed: ['generating', 'draft'],
  pending_review: ['publishing', 'draft'],
  publishing: ['publish_failed', 'published'],
  publish_failed: ['publishing'],
  published: [],
};
```

将状态机从 service/controller 的实现细节提升为 Entity 层的领域知识，是 DDD 战术设计的基本实践。

---

### HIGH-2: `Article.skills` 类型 `number | null` 与 Prisma `Json?` 不匹配，领域语义模糊

**位置**: 第 11 行

```typescript
skills: number | null;
```

**问题**: Prisma schema 定义 `skills Json?`，`Json` 类型可存储任意 JSON 值。Entity 声明为 `number | null`，存在架构层面的语义歧义：

1. **领域概念不明**: "skills" 是关联 ID？评分？技能列表？`number` 类型无法回答这个问题
2. **与关联模块不一致**: 同项目中 `Project.operator_ids: number[]` 使用数组表达关联关系，`KnowledgeKeyword` 使用独立关联表。`skills` 的 `number` 类型既不像关联 ID（应该是数组），也不像外键（应该是 `llm_model_id` 那样的命名）
3. **JSON 字段无结构约束**: Prisma 的 `Json?` 类型配合 `number | null` 的 Entity 类型，等于放弃了类型安全

**建议**: 确认业务语义后统一架构决策：
- 若 `skills` 是技能评分 → schema 改 `Int?`，保持 `number | null`
- 若 `skills` 是技能 ID 列表 → Entity 改 `number[] | null`，与 `images`/`platforms` 模式一致
- 若 `skills` 是复杂结构 → 定义 `SkillConfig` 接口，使用 Zod 做运行时校验

---

### HIGH-3: `Article` 和 `ArticleVersion` 缺少 `deleted_at` 字段，软删除架构不完整

**位置**: 整个文件

**问题**: Prisma schema 中 `Article` 和 `ArticleVersion` 均有 `deletedAt DateTime?` 用于软删除。service.impl 通过 `where: { deletedAt: null }` 过滤已删除记录。但 Entity 接口完全省略了此字段：

1. **架构层信息丢失**: Prisma 查询返回的 `deletedAt` 值在 TypeScript 类型层面不可访问，service 层必须使用 `as any` 或忽略类型错误
2. **API 响应泄漏风险**: 若 service 返回完整 Article 对象（含 deletedAt），前端会收到 Entity 类型未定义的幽灵字段
3. **与架构意图矛盾**: 软删除是项目的架构级决策（所有核心模型都有 `deletedAt`），Entity 层不表达等于架空了这个决策

**建议**: 在两个接口中添加：

```typescript
export interface Article {
  // ...
  deleted_at: Date | null;
}

export interface ArticleVersion {
  // ...
  deleted_at: Date | null;
}
```

---

### MEDIUM-1: `CreateArticleRequest.status` 与 `UpdateArticleRequest.status` 类型约束不对称

**位置**: 第 42 行 vs 第 56 行

```typescript
// CreateArticleRequest
status?: 'draft' | 'generating' | 'manual_writing';

// UpdateArticleRequest
status?: string;
```

**问题**: 架构层面的防御不一致：
- 创建时约束 3 种状态（合理：新建只能从这 3 种开始）
- 更新时退化为 `string`（不合理：更新应允许全部合法状态转换，但不应该是任意字符串）

这是**最小权限原则**在 API 契约设计中的违反：更新接口的权限应不大于创建接口。

**建议**:

```typescript
export interface UpdateArticleRequest {
  // ...
  status?: ArticleStatus;  // 允许全部合法状态，由 controller/service 校验转换路径
}
```

---

### MEDIUM-2: `Article` 接口缺少 `project` 关联的表达

**位置**: `Article` 接口（第 1-20 行）

**问题**: Prisma schema 定义了 `Article → Project` 的多对一关联（`project Project @relation(...)`），且 controller 使用嵌套路由 `/api/projects/:projectId/articles`。但 Entity 接口只暴露了 `project_id: number`，未表达关联关系。

对比 `Project` 的 Entity 设计：
```typescript
interface Project {
  company_id: number;
  company_name: string;  // ← 冗余字段，表达关联的展示名称
}
```

`Project` 通过冗余字段 `company_name` 解决了 N+1 查询问题。`Article` 没有类似的 `project_name` 或关联表达，意味着前端列表页如需显示项目名称，必须额外查询。

**建议**: 评估是否需要添加冗余字段或在 service 的 `list()` 返回中包含项目信息：

```typescript
export interface ArticleListItem extends Article {
  project_name?: string;  // 列表页显示用
}
```

---

### MEDIUM-3: JSON 字段（`images`、`platforms`）缺少结构契约

**位置**: 第 9-10 行

```typescript
images: string[] | null;
platforms: string[] | null;
```

**问题**: Prisma 中这两个字段是 `Json?` 类型，Entity 声明为 `string[] | null`。虽然比 `any` 好，但缺少运行时校验：
1. Prisma 不会验证 JSON 内容是否为字符串数组
2. 数据库直接操作可能写入非数组 JSON
3. 无 Zod schema 或运行时校验确保结构

在项目架构中，这是 JSON 字段的通用问题。建议在架构层面统一 JSON 字段的校验策略。

---

### LOW-1: `ArticleVersion` 缺少关联表达和软删除字段

**位置**: 第 22-29 行

**问题**: `ArticleVersion` 接口：
1. 未表达与 `Article` 的外键关系（`article_id` 无 JSDoc 说明）
2. 缺少 `deleted_at: Date | null`（Prisma 有此字段）
3. 缺少与 `User` 的创建者关联（`created_by` 无关联表达）

**建议**: 添加注释和缺失字段。

---

### LOW-2: `ReviewArticleRequest` 接口过于简单，未表达审核领域知识

**位置**: 第 60-62 行

```typescript
export interface ReviewArticleRequest {
  approved: boolean;
}
```

**问题**: 审核是一个重要的业务操作，当前接口仅传递 `approved: boolean`。在架构层面，缺少审核意见、审核原因（拒绝时）等字段的扩展点。虽然当前业务可能不需要，但建议预留。

---

## 三、与 Prisma Schema 差异矩阵

| 字段 | Entity 类型 | Prisma 类型 | 差异等级 | 架构影响 |
|------|------------|-------------|----------|----------|
| `status` | `string` | `ArticleStatus` (enum) | **严重** | 状态机领域概念未表达 |
| `skills` | `number \| null` | `Json?` | **严重** | 领域语义不明 |
| `version` | `number` | `Float` | 中等 | 整数 vs 浮点语义未定义 |
| `deletedAt` | **缺失** | `DateTime?` | **严重** | 软删除架构不完整 |
| `images` | `string[] \| null` | `Json?` | 低 | 无运行时结构校验 |
| `platforms` | `string[] \| null` | `Json?` | 低 | 同上 |

---

## 四、架构改进路线图

### 短期（低风险、高价值）

| 步骤 | 工作量 | 影响 |
|------|--------|------|
| 定义 `ArticleStatus` 联合类型，替换 `string` | 低 | 编译期捕获非法状态值 |
| 添加 `deleted_at` 字段 | 低 | 补全软删除架构 |
| 统一 `UpdateArticleRequest.status` 类型约束 | 低 | 防御一致性 |
| 添加 `scheduled_publish_at` 日期格式注释 | 低 | API 契约清晰 |

### 中期（中风险、中价值）

| 步骤 | 工作量 | 影响 |
|------|--------|------|
| 确认 `skills` 业务语义，统一 Entity/Schema | 中 | 消除类型不匹配 |
| 确认 `version` 语义（Int vs Float） | 低 | 语义精确性 |
| 将状态转换规则提升为 Entity 层常量 | 中 | 领域知识集中化 |

### 长期（高价值、需协调）

| 步骤 | 工作量 | 影响 |
|------|--------|------|
| Entity/DTO 分层（全项目级） | 高 | 架构职责清晰 |
| JSON 字段统一 Zod 校验策略 | 中 | 运行时安全 |
| 引入领域事件（审核通过 → 触发发布） | 高 | 解耦业务流程 |

---

## 五、总结

`article.entity.ts` 作为文章模块的核心类型定义，在 API 契约层面基本可用，但在架构层面存在显著改进空间。最关键的问题是**状态机概念未在类型层表达**和**Entity 与 Prisma Schema 不同步**，前者导致领域知识泄漏到 service/controller 实现，后者导致类型安全防线存在缺口。

从架构演进角度，建议优先解决 **Entity-Schema 同步**和**状态类型化**两个问题，它们风险低但收益高——将隐式的业务规则变为显式的类型契约，是从"能跑"到"可靠"的关键一步。

**综合架构评分: 5.5/10**
