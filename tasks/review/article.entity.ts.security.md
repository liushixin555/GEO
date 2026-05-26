# article.entity.ts 安全评审

**文件**: `apis/entity/article.entity.ts`
**评审类型**: 代码安全专家评审
**评审日期**: 2026-05-26
**评分**: 3.2/10 — REQUEST CHANGES

---

## 评审摘要

article.entity.ts 作为文章模块的类型定义基石，存在 **2 项 BLOCKING**、**4 项 HIGH**、**5 项 MEDIUM** 安全问题。核心风险集中在：(1) `deleted_at` 字段双层遗漏导致软删除型别不安全；(2) `skills: unknown` 类型黑洞造成运行时类型混淆攻击面；(3) `ReviewArticleRequest` 审核请求缺少审计字段；(4) DTO 层状态转换约束缺失。

| 等级 | 数量 | 说明 |
|------|------|------|
| BLOCKING | 2 | 必须修复才能合并 |
| HIGH | 4 | 强烈建议修复，安全风险显著 |
| MEDIUM | 5 | 建议修复，潜在安全风险 |
| LOW | 0 | — |

---

## BLOCKING

### B-1: `deleted_at` 双层遗漏 — 软删除型别不安全

**位置**: `Article` 接口 (L13-L33)、`ArticleVersion` 接口 (L35-L42)
**风险**: Prisma schema 中 `Article` 和 `ArticleVersion` 均定义了 `deletedAt DateTime? @map("deleted_at")`，service 层通过 `where: { deletedAt: null }` 实现软删除过滤。但 entity 接口完全遗漏此字段，导致：

1. **已删除记录可绕过 TypeScript 类型检查返回给前端** — 当 Prisma 查询返回包含 `deletedAt` 的记录时，TypeScript 编译器无法感知，代码中无 `.deletedAt` 属性可供判断
2. **service 层 WHERE 条件 `deletedAt: null` 无类型保障** — 如果 Prisma schema 变更删除了该字段，TypeScript 编译不会报错，运行时软删除过滤静默失效
3. **恢复操作无法建模** — 取消删除需要设置 `deletedAt: null`，但 entity 中不存在此字段，操作语义模糊

**修复方案**:
```typescript
export interface Article {
  // ...existing fields
  deleted_at: Date | null;
}

export interface ArticleVersion {
  // ...existing fields
  deleted_at: Date | null;
}
```

---

### B-2: `skills: unknown` 类型黑洞 — 运行时类型混淆攻击面

**位置**: `Article.skills` (L23)
**风险**: `skills` 在 `Article` 接口中声明为 `unknown | null`，但 `CreateArticleRequest` 和 `UpdateArticleRequest` 中声明为 `number[] | null`。实际数据流：

- **写入路径**: 客户端 → Zod 校验 `number[]` → Prisma `Json` 类型 → PostgreSQL `jsonb`
- **读取路径**: PostgreSQL `jsonb` → Prisma `Json` → **直接透传** (`apis/map/index.ts:106`: `skills: prismaArticle.skills`) → 前端收到 `unknown`

如果数据库中存储了被篡改的 JSON（如通过数据库直接修改、Prisma Studio、或上游服务写入 `{skills: "../../../etc/passwd"}`），读取路径无任何类型断言或校验，恶意数据直接传递给前端。

`unknown` 类型虽然比 `any` 安全（需显式收窄才能使用），但在 entity 层级使用意味着**消费方被迫进行不安全的类型断言**，而当前 `map/index.ts` 正是直接透传，未做任何运行时校验。

**修复方案**:
```typescript
// 方案一：添加运行时校验函数
export function validateSkills(value: unknown): number[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  if (!value.every(v => typeof v === 'number' && Number.isInteger(v) && v >= 0)) return null;
  return value;
}

// 方案二：分离数据库实体与 API 响应类型
interface ArticleRow { skills: Prisma.JsonValue | null; }  // DB 层
interface Article { skills: number[] | null; }               // API 层，映射时强制校验
```

---

## HIGH

### H-1: `ReviewArticleRequest` 缺少审计字段 — 审核无追踪

**位置**: `ReviewArticleRequest` 接口 (L73-L75)
**风险**: 审核请求仅包含 `approved: boolean`，缺少以下关键审计字段：

- `comment: string` — 审核意见/拒绝原因，违反合规审计要求
- 无审核理由时，拒绝操作无记录，不可追溯
- 监管/合规场景下，审核必须有书面记录是常见要求（ISO 27001 A.9.2.2、SOC 2 CC6.1）

当前 service 层 (`article.service.impl.ts:268`) 仅做状态变更，无 comment 存储机制。

**修复方案**:
```typescript
export interface ReviewArticleRequest {
  approved: boolean;
  /** 审核意见，拒绝时必填 */
  comment?: string;
  /** 拒绝原因分类（当 approved=false 时） */
  reject_reason?: 'quality' | 'compliance' | 'accuracy' | 'other';
}
```

---

### H-2: `UpdateArticleRequest.status` 无状态转换约束

**位置**: `UpdateArticleRequest.status` (L69)
**风险**: `status?: ArticleStatus` 允许任意 `ArticleStatus` 值，包括 `'published'`、`'publishing'` 等终端/系统状态。虽然 service 层有 `STATUS_TRANSITIONS` 映射验证，但 entity 层无约束意味着：

1. **DTO 类型与业务规则脱节** — 类型系统无法在编译时阻止非法状态赋值
2. **新增 service 实现可能遗漏验证** — 如果未来有新的 ArticleService 实现，entity 类型不会提醒开发者需要状态转换校验
3. **前端可构造任意 status 请求体** — 虽然 Zod schema 也允许全量 ArticleStatus，但那属于校验层，entity 层应首先约束

**修复方案**: 使用 branded type 或分离可转换状态类型：
```typescript
/** UpdateArticleRequest 中允许客户端设置的状态子集 */
export type UpdatableArticleStatus = Exclude<ArticleStatus, 'published' | 'publishing'>;

export interface UpdateArticleRequest {
  status?: UpdatableArticleStatus;
}
```

---

### H-3: `CreateArticleRequest.status` 允许 `'generating'` 系统状态注入

**位置**: `CreateArticleRequest.status` (L55)
**风险**: `status?: 'draft' | 'generating' | 'manual_writing'` 中包含 `'generating'`，这是一个应由后端 LLM 生成流程独占的系统状态。客户端可创建时直接注入 `'generating'`，潜在后果：

1. 前端显示"生成中"状态但后端无对应 LLM 任务
2. 其他工作流逻辑误判文章正在生成，跳过正常流程
3. 状态机死锁 — 文章卡在 `generating` 但无生成任务可完成它

**修复方案**: 客户端创建只允许 `draft` 和 `manual_writing`：
```typescript
export interface CreateArticleRequest {
  status?: 'draft' | 'manual_writing';
}
```

---

### H-4: `created_by` 暴露内部用户 ID 无保护

**位置**: `Article.created_by` (L28)、`ArticleVersion.created_by` (L40)
**风险**: `created_by: number | null` 直接暴露内部用户 ID（数据库自增主键），但：

1. 无 `creator_name` 字段 — 前端为显示创建者姓名需要额外 API 调用，导致 N+1 查询
2. 暴露自增 ID 可推断用户总数和注册顺序（信息泄露）
3. 与同项目 `skills.entity.ts` 修复后引入 `creator_name` 的模式不一致

**修复方案**: 在 entity 中添加 creator_name 关联字段，或在 map 层做 ID→name 映射：
```typescript
export interface Article {
  created_by: number | null;
  /** 创建者姓名，由 map 层从 User 关联填充 */
  creator_name?: string | null;
}
```

---

## MEDIUM

### M-1: 裸 `string` 类型无枚举约束

**位置**: `article_type: string | null` (L17)、`write_mode: string | null` (L18)、`portrait: string | null` (L20)
**风险**: 这三个字段使用裸 `string` 类型，无枚举约束。虽然 Zod schema 可能提供运行时校验，但 entity 层是类型真相的单一来源，裸 string 意味着：
- 编译时无法捕获非法值
- 新增合法值时无类型驱动的更新提醒
- `portrait` 可能包含 URL，未约束格式和协议

**建议**: 定义明确的联合类型或枚举。

---

### M-2: `images` / `platforms` 数组无长度约束

**位置**: `images?: string[] | null` (L51)、`platforms?: string[] | null` (L52)
**风险**: 虽然当前 Zod schema 中 `skills` 限制了 `.max(50)`，但 `images` 和 `platforms` 在 entity 层无长度约束。如果 Zod schema 遗漏或被绕过，攻击者可提交超大数组导致：
- JSON 序列化/反序列化性能问题
- 数据库 jsonb 存储膨胀
- 前端渲染性能问题

**建议**: 在 entity 层通过注释或 JSDoc 标注最大长度约束。

---

### M-3: `content` 字段无长度约束

**位置**: `content: string | null` (L25)、`content?: string` (L54)
**风险**: Entity 层无最大长度约束。当前 service 层通过 `validateAndSanitizeMarkdown` 限制 500k 字符，但 entity 作为类型契约应体现此约束，防止新消费方遗漏校验。

**建议**: 添加 JSDoc 标注长度限制。

---

### M-4: `scheduled_publish_at` 使用 `string` 而非 `Date`

**位置**: `UpdateArticleRequest.scheduled_publish_at` (L70)
**风险**: `scheduled_publish_at?: string | null` 使用 `string` 类型表示时间，而 `Article` 实体中 `created_at`/`updated_at` 使用 `Date` 类型。不一致的时间类型导致：
- 格式歧义（ISO 8601? Unix timestamp? 自定义格式?）
- 时区处理不统一
- 潜在的字符串注入（恶意构造的时间字符串可能绕过简单校验）

**建议**: 使用 `Date` 类型或明确的 ISO 字符串 branded type。

---

### M-5: `schedule_count` 聚合字段信息泄露

**位置**: `Article.schedule_count` (L32)
**风险**: `schedule_count?: number` 是一个聚合计算字段，混入基础实体可能导致：
- 信息泄露 — 暴露文章关联的发布计划数量
- 权限绕过 — 不同角色可能不应看到此信息
- 实体膨胀 — 聚合数据应在专门的 VO/DTO 中定义

**建议**: 将聚合字段移至专门的 `ArticleDetail` 或 `ArticleWithStats` 接口。

---

## 评审总结

| # | 等级 | 问题 | 工时估算 |
|---|------|------|----------|
| B-1 | BLOCKING | deleted_at 双层遗漏 | 15min |
| B-2 | BLOCKING | skills unknown 类型黑洞 | 30min |
| H-1 | HIGH | ReviewArticleRequest 缺审计字段 | 30min |
| H-2 | HIGH | UpdateArticleRequest.status 无约束 | 20min |
| H-3 | HIGH | CreateArticleRequest.status 系统状态注入 | 10min |
| H-4 | HIGH | created_by 暴露 ID 无 creator_name | 15min |
| M-1 | MEDIUM | 裸 string 无枚举 | 15min |
| M-2 | MEDIUM | images/platforms 无长度约束 | 10min |
| M-3 | MEDIUM | content 无长度约束 | 5min |
| M-4 | MEDIUM | scheduled_publish_at string vs Date | 10min |
| M-5 | MEDIUM | schedule_count 聚合字段信息泄露 | 15min |

**总工时**: 约 2.5h
**修复后预期评分**: 7.5/10
