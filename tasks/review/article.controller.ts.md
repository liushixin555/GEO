# apis/controller/article.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 + 认证授权 + 注入防护 + 数据泄露 + 输入验证 + 竞态条件）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 553 行
**评审基线**: 基于已修复 CRITICAL-1/2、HIGH-1~4、MEDIUM-3/4 的最新版本
**关联文件**: `apis/schema/article.schema.ts`, `apis/service/impl/article.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/middleware/auth.middleware.ts`, `apis/app.ts`
**严重级别**: HIGH(2) / MEDIUM(5) / LOW(4) / INFO(2)

---

## 一、安全评价总览

文章控制器包含 10 个 HTTP 端点处理函数，处理文章的 CRUD、审核、AI 生成、内容更新和版本查询等核心业务。相比前一版本，已修复了以下关键安全问题：

- **CRITICAL-1 已修复**: 引入 `UPDATE_ALLOWED_FIELDS` / `CREATE_ALLOWED_FIELDS` 白名单 + `pickAllowedFields()` 过滤函数
- **CRITICAL-2 已修复**: 引入 `STATUS_TRANSITIONS` 状态机白名单 + `isValidStatusTransition()` 校验函数
- **HIGH-1 已修复**: `createArticle` 引入 Zod `createArticleSchema` + 字段白名单
- **HIGH-2 已修复**: `reviewArticle` 添加创建者/审核者分离检查
- **HIGH-3 已修复**: 统一错误处理函数 `handleServerError()`，500 错误不再泄露 `err.message`
- **HIGH-4 已修复**: `updateArticleContent` 添加 `MAX_CONTENT_LENGTH` 大小限制
- **MEDIUM-3 已修复**: `regenerateArticle` 添加创建者检查
- **MEDIUM-4 已修复**: 引入 `getAuthUser()` 防御性函数替代 `req.user!`

**当前版本安全评分**:

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 8/10 | 三层权限模型完整，职责分离已实现，sysadmin/admin/viewer 边界清晰 |
| 输入验证 | 7/10 | Zod schema + 白名单 + 状态机，但 `updateArticleContent` 和 `skills` 字段仍有缺口 |
| 注入防护 | 8/10 | Prisma ORM 参数化查询，Zod `.strict()` 拒绝未知字段，白名单二次过滤 |
| 数据泄露 | 8/10 | `handleServerError` 统一处理，`getAuthUser` 防御性检查，日志仅写服务端 |
| CSRF/点击劫持 | 8/10 | Bearer Token + helmet + CORS 白名单，风险极低 |
| 拒绝服务 | 6/10 | 全局 10MB 限制 + content 500KB 限制，但版本列表无分页，存在存储放大攻击 |
| 审计追踪 | 7/10 | app.ts 全局 4xx/5xx 日志，但控制器层缺少操作级审计 |
| 竞态安全 | 5/10 | 检查-更新非原子操作，并发请求可绕过状态校验 |

**综合评分: B+（良好，少量问题需修复）**

---

## 二、问题清单

### HIGH-1: `updateArticle` 存在 TOCTOU 竞态条件，并发请求可绕过状态校验

**位置**: 第 196-268 行 `updateArticle` 函数

```typescript
// 第 206 行: 先读取当前状态
const existing = await articleService.getById(id, userId, role);

// 第 233 行: 检查当前状态是否允许编辑
if (!SETTINGS_EDITABLE_STATUSES.includes(existing.status)) { ... }

// 第 249 行: 检查目标状态转换是否合法
if (!isValidStatusTransition(existing.status, targetStatus)) { ... }

// 第 263 行: 执行更新（此时状态可能已被并发请求修改）
const item = await articleService.update(id, body, userId, role);
```

**问题**: 检查（第 206/233/249 行）与更新（第 263 行）之间不是原子操作。在并发场景下：

```
请求 A: getById → status='draft' → 通过编辑性检查 → 通过状态转换检查
请求 B: getById → status='draft' → 通过编辑性检查 → 通过状态转换检查
请求 A: update(id, {status: 'generating'}) → 成功
请求 B: update(id, {status: 'manual_writing'}) → 成功，覆盖了 A 的状态变更
```

`article.service.impl.ts` 第 125-128 行的 Prisma `update` 使用 `where: { id }` 但不带状态条件，因此第二次更新会直接覆盖第一次的结果。

**攻击场景**: 攻击者同时发送两个 PUT 请求，一个将 draft 设为 generating（触发 AI 生成），另一个将 draft 设为 manual_writing。两个请求都通过状态检查，但最终状态取决于执行顺序，可能导致不可预期的业务状态。

**影响**: 虽然不会直接导致安全绕过（因为每个单独的状态转换都是合法的），但会导致数据不一致和业务逻辑异常。

**建议**: 在 service 层的 Prisma update 中添加状态条件，实现原子性 compare-and-swap：

```typescript
// article.service.impl.ts 中的 update 方法
const updated = await prisma.article.update({
  where: { id },
  data,
}).catch((err) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    throw new Error('文章状态已变更，请刷新后重试');
  }
  throw err;
});
```

更好的方案是使用 Prisma 事务 + 状态条件：

```typescript
const updated = await prisma.$transaction(async (tx) => {
  const current = await tx.article.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new Error('文章不存在');
  if (current.status !== expectedStatus) throw new Error('文章状态已变更');
  return tx.article.update({ where: { id }, data });
});
```

---

### HIGH-2: `updateArticleContent` 绕过 Zod 验证，仅做基本类型/长度检查

**位置**: 第 270-326 行 `updateArticleContent` 函数

```typescript
// 第 277-278 行: 直接从 req.body 解构，无 Zod 验证
const { content } = req.body;
if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }

// 第 281-284 行: 长度检查
if (content.length > MAX_CONTENT_LENGTH) { ... }
```

**问题**:

1. **无 Zod schema 验证**: 与 `updateArticle`（第 239 行）和 `createArticle`（第 165 行）使用 Zod schema + `.strict()` 不同，`updateArticleContent` 没有使用任何 schema 验证。虽然只解构了 `content` 字段（其他字段被忽略），但缺少 `.strict()` 验证意味着请求体结构的一致性校验缺失。

2. **无内容格式验证**: `content` 字段接受任意字符串，包括可能的 HTML/JavaScript 代码。当前端渲染文章内容时若使用不安全的渲染方式（如 `dangerouslySetInnerHTML`），会导致存储型 XSS。虽然这是前端的责任，但后端应作为纵深防御层做基本清理。

3. **空字符串被允许**: `typeof '' === 'string'` 为 true，空字符串会通过验证并更新数据库，创建一条无意义的版本快照。

**影响**: 存储型 XSS 是最常见的 Web 攻击向量之一（OWASP A03:2021）。如果其他系统消费这些文章数据（如发布到第三方平台），恶意脚本可能被执行。

**建议**:

```typescript
// 定义 content 更新 schema
const updateContentSchema = z.object({
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
}).strict();

export async function updateArticleContent(req: Request, res: Response): Promise<void> {
  try {
    // ... 参数校验 ...

    const parsed = updateContentSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, `参数验证失败: ${parsed.error.issues.map(i => i.message).join('; ')}`);
      return;
    }
    const { content } = parsed.data;

    // ... 后续逻辑 ...
  }
}
```

---

### MEDIUM-1: `handleServerError` 基于错误消息字符串匹配，脆弱且可被利用做状态枚举

**位置**: 第 69-79 行

```typescript
function handleServerError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof Error && err.message === '文章不存在') {
    fail(res, 404, err.message);                           // 404
  } else if (err instanceof Error && err.message === '文章当前状态不支持审核操作') {
    fail(res, 400, err.message);                           // 400
  } else if (err instanceof Error && err.message === '文章当前状态不支持重新生成') {
    fail(res, 400, err.message);                           // 400
  } else {
    fail(res, 500, contextMsg);                            // 500
  }
}
```

**问题**:

1. **字符串匹配脆弱**: 服务层 `article.service.impl.ts` 中的错误消息（如 `'文章不存在'`）是硬编码字符串。如果服务层修改了消息文本（如改为 `'未找到该文章'`），控制器无法正确匹配，会将 404 错误作为 500 返回。

2. **信息枚举**: 攻击者可以通过观察不同 ID 的响应状态码（404 vs 500）来枚举哪些文章 ID 存在。虽然 404 本身暴露文章存在性是合理的（资源不存在就应返回 404），但 500 响应暗示服务层抛出了非预期错误，可能泄露内部状态。

3. **错误消息直接返回客户端**: 第 71/74/77 行将 `err.message` 直接作为 API 响应返回。虽然这些是已知的业务错误消息，但它们仍包含业务逻辑信息（如"当前状态不支持审核操作"暴露了状态机规则）。

**建议**: 使用自定义错误类替代字符串匹配：

```typescript
class NotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'NotFoundError'; }
}
class BusinessError extends Error {
  constructor(message: string) { super(message); this.name = 'BusinessError'; }
}

function handleServerError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else if (err instanceof BusinessError) {
    fail(res, 400, err.message);
  } else {
    logger.error(contextMsg, err);
    fail(res, 500, contextMsg);
  }
}
```

---

### MEDIUM-2: `skills` 字段使用 `z.unknown()` 允许任意 JSON 注入

**位置**: `apis/schema/article.schema.ts` 第 23 行和第 37 行

```typescript
skills: z.unknown().optional(),
```

**问题**: `skills` 字段类型为 `z.unknown()`，接受任意 JSON 值（对象、数组、数字、布尔值、null）。该字段通过白名单过滤后传递给服务层，服务层存储为 Prisma JSON 类型（`article.service.impl.ts` 第 95 行 `data.skills = request.skills || Prisma.JsonNull`）。

虽然 Prisma 的 JSON 类型可以存储任意数据，但如果下游系统（AI 生成服务、前端渲染）对 `skills` 字段有特定结构预期，恶意构造的数据可能导致：
1. 下游解析错误（TypeError）导致服务中断
2. 如果 skills 数据被用于构造 prompt/SQL/命令，可能引发注入
3. 超大 JSON 对象消耗存储空间

**影响**: 取决于下游消费方式。如果 skills 仅用于展示，风险较低；如果用于 AI prompt 构造，风险较高。

**建议**: 定义具体的 skills schema：

```typescript
skills: z.union([
  z.array(z.string().max(200)).max(50),
  z.record(z.string().max(100), z.unknown()),
  z.null(),
]).optional(),
```

---

### MEDIUM-3: `listArticleVersions` 无分页，可被用于存储放大攻击

**位置**: 第 517-552 行

```typescript
const versions = await articleService.listVersions(id);
success(res, versions);
```

`article.service.impl.ts` 第 176-183 行:

```typescript
async listVersions(articleId: number): Promise<ArticleVersion[]> {
  const versions = await prisma.articleVersion.findMany({
    where: { articleId, deletedAt: null },
    orderBy: { version: 'desc' },
  });
  return versions.map(mapArticleVersion);
}
```

**问题**:
1. **无分页**: 每次请求返回该文章的所有版本记录。如果一篇文章被频繁更新（如 AI 反复生成），版本数量可能达到数百甚至数千。
2. **每个版本包含完整 content**: 版本记录包含完整的文章内容快照（`article.service.impl.ts` 第 115-123 行每次内容更新都创建快照）。如果文章内容接近 500KB（MAX_CONTENT_LENGTH），100 个版本就是 50MB 的响应数据。
3. **存储放大**: 攻击者可以通过反复更新文章内容（在 CONTENT_EDITABLE_STATUSES 状态下），每次修改 1 个字符即创建一个新版本快照，快速消耗数据库存储。

**建议**:

```typescript
// 控制器层添加分页
export async function listArticleVersions(req: Request, res: Response): Promise<void> {
  try {
    // ... 参数和权限校验 ...

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));

    const { list, total } = await articleService.listVersions(id, page, pageSize);
    paginate(res, list, total, page, pageSize);
  }
}
```

---

### MEDIUM-4: `updateArticle` 中 `SETTINGS_EDITABLE_STATUSES` 与 `STATUS_TRANSITIONS` 存在语义重叠和逻辑冲突

**位置**: 第 10-11 行 vs 第 15-21 行

```typescript
const SETTINGS_EDITABLE_STATUSES = ['draft'];              // 第 10 行
const CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed']; // 第 11 行

const STATUS_TRANSITIONS: Record<string, string[]> = {     // 第 15 行
  'draft': ['generating', 'manual_writing'],
  'manual_writing': ['pending_review'],
  'generate_failed': ['generating'],
  'publish_failed': ['publishing'],
  'pending_review': ['publishing', 'draft', 'manual_writing'],
};
```

**问题**:

1. **双重检查但覆盖范围不一致**: `SETTINGS_EDITABLE_STATUSES` 限制只有 `draft` 状态的文章可以通过 `updateArticle` 修改设置。但 `STATUS_TRANSITIONS` 定义了更多状态（`manual_writing`、`generate_failed`、`publish_failed`、`pending_review`）的合法转换，这些转换定义在 `updateArticle` 中永远无法触发（因为前面的 SETTINGS 检查已经拒绝了非 draft 状态）。

2. **逻辑冲突风险**: 如果未来有人放宽 `SETTINGS_EDITABLE_STATUSES`（如添加 `pending_review`），那么 `pending_review → publishing` 的转换可以通过 `updateArticle` 直接执行，绕过 `reviewArticle` 中的职责分离检查（创建者不能审核自己的文章）。

3. **`submitForReview` 不经过 STATUS_TRANSITIONS 验证**: 第 510 行 `articleService.update(id, { status: 'pending_review' }, userId, role)` 直接调用 service.update 设置状态，绕过了控制器的状态转换白名单。虽然第 505 行显式检查了 `existing.status !== 'manual_writing'`，但这意味着状态转换验证逻辑分散在两处。

**建议**: 统一状态转换入口，所有状态变更必须经过同一个验证函数：

```typescript
function validateAndUpdateStatus(id: number, from: string, to: string, userId: number, role: string) {
  if (!isValidStatusTransition(from, to)) {
    throw new Error('非法的状态转换');
  }
  return articleService.update(id, { status: to }, userId, role);
}
```

---

### MEDIUM-5: `updateArticle` 中 `generating` 分支的数据来源不一致

**位置**: 第 244 行 vs 第 256 行

```typescript
// 第 244 行: 使用 Zod 验证 + 白名单过滤后的数据
const body = pickAllowedFields(parsed.data, UPDATE_ALLOWED_FIELDS);

// 第 256 行: generating 分支从已过滤的 body 解构
if (targetStatus === 'generating') {
  const { content, ...metadata } = body;           // ✓ 从过滤后的 body 解构
  const item = await articleService.update(id, { ...metadata, status: 'generating' }, userId, role);
  return;
}
```

**问题**: 这个分支的实现是正确的（从已过滤的 `body` 解构，排除 `content`），但代码注释 `// 补充-1 fix: generating 分支排除 content` 表明这是一个后续修复。这说明原始代码曾使用 `req.body`（未过滤数据），修复后改为使用过滤后的 `body`。当前实现是安全的，但代码结构表明修复是在原有逻辑上打补丁，增加了理解难度。

**影响**: 无直接安全风险（当前代码已修复），但代码可维护性差，未来修改可能意外回退到不安全的实现。

**建议**: 添加明确的注释说明为什么 generating 分支必须排除 content：

```typescript
// generating 状态变更不应携带 content：
// 1. 防止版本快照被用户提交的内容污染
// 2. AI 生成完成后会通过服务层回调设置内容
if (targetStatus === 'generating') {
  const { content, ...metadata } = body;
  ...
}
```

---

### LOW-1: `VALID_CREATE_STATUSES` 常量已定义但从未使用（死代码）

**位置**: 第 40 行

```typescript
const VALID_CREATE_STATUSES = ['draft', 'manual_writing', 'generating'];
```

**问题**: 该常量在文件中从未被引用。创建时的状态验证由 Zod `createArticleSchema` 的 `status: z.enum(['draft', 'generating', 'manual_writing'])` 完成。死代码增加维护负担，且可能导致误解（开发者以为验证依赖此常量）。

**建议**: 删除该常量。

---

### LOW-2: 模块级 Service 单例缺少依赖注入，影响安全测试能力

**位置**: 第 7-8 行

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**问题**: Service 实例在模块加载时创建为顶层常量。虽然不影响运行时安全，但导致控制器层无法进行真正的单元测试（无法注入 mock service）。在安全测试中，无法模拟 service 层抛出特定异常（如数据库错误、权限拒绝），降低了对 `handleServerError` 等安全关键路径的测试覆盖率。

**建议**: 长期考虑引入简单的 DI 模式。短期维持现状。

---

### LOW-3: 权限检查逻辑重复，缺乏统一的授权中间件

**位置**: 几乎每个端点处理器内部

```typescript
// 每个处理器中重复出现的模式（共 9 处）:
if (role === 'admin') {
  try {
    await checkProjectOperator(projectId, userId, role);
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      fail(res, 403, err.message);
    } else {
      throw err;
    }
    return;
  }
}
```

**问题**:
1. **重复代码**: admin 角色的项目操作员检查在 9 个处理器中完全重复（第 103-113、140-151、176-187、213-224、296-307、345-356、401-412、444-455、487-498 行），占代码总量的约 20%。
2. **不一致风险**: 如果某次修改遗漏了某个处理器的权限检查，会直接导致授权绕过。
3. **读取-权限-执行顺序问题**: 部分处理器（如 `getArticle`）先读取数据（第 133 行），再检查权限（第 140 行）。虽然权限不足时返回 403 不泄露数据，但数据已被加载到内存。

**建议**: 将权限检查提取为 Express 中间件或高阶函数：

```typescript
function withProjectAuth(handler: (req: Request, res: Response, user: AuthUser) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    if (user.role === 'admin') {
      try {
        await checkProjectOperator(projectId, user.userId, user.role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) { fail(res, 403, err.message); return; }
        throw err;
      }
    }

    await handler(req, res, user);
  };
}
```

---

### LOW-4: `getArticle` 先加载数据再检查权限，存在时序侧信道

**位置**: 第 123-157 行

```typescript
// 第 133 行: 先加载文章数据
const item = await articleService.getById(id, userId, role);

// 第 135-138 行: 再检查项目归属
if (item.project_id !== projectId) {
  fail(res, 404, '文章不存在');
  return;
}

// 第 140-151 行: 再检查权限
if (role === 'admin') {
  await checkProjectOperator(projectId, userId, role);
}
```

**问题**: 文章数据在权限验证之前已从数据库加载。虽然未授权用户无法获取数据内容（返回 404 或 403），但数据库查询本身会留下痕迹（查询日志、缓存状态）。此外，响应时间差异可以被用于判断文章是否存在：不存在的文章（第 133 行抛异常 → 500）与不属于当前项目的文章（第 135 行 → 404）的响应时间可能不同。

**影响**: 极低。仅在高安全场景（如军事/金融）中才需考虑时序攻击。

**建议**: 对于一般业务系统，当前实现可接受。如需加固，可将权限检查前置：

```typescript
// 先检查项目权限，再查询文章
if (role === 'admin') {
  await checkProjectOperator(projectId, userId, role);
}
const item = await articleService.getById(id, userId, role);
```

---

### INFO-1: 已修复的安全措施评估

| 修复编号 | 修复内容 | 评估 |
|----------|----------|------|
| CRITICAL-1 fix | `UPDATE_ALLOWED_FIELDS` + `pickAllowedFields()` | ✅ 有效 — 白名单过滤覆盖所有敏感字段，与 Zod `.strict()` 双重保障 |
| CRITICAL-2 fix | `STATUS_TRANSITIONS` + `isValidStatusTransition()` | ✅ 有效 — 状态机白名单阻断了非法状态跳转，draft 无法直接变为 published |
| HIGH-1 fix | Zod `createArticleSchema` + `CREATE_ALLOWED_FIELDS` | ✅ 有效 — 创建请求有了完整的类型验证和字段过滤 |
| HIGH-2 fix | `reviewArticle` 创建者/审核者分离检查 | ✅ 有效 — `existing.created_by === userId` 阻止了自我审核 |
| HIGH-3 fix | `handleServerError` 统一错误处理 | ✅ 有效 — 500 错误不再返回 `err.message`，仅返回 `contextMsg` |
| HIGH-4 fix | `MAX_CONTENT_LENGTH = 500_000` 大小限制 | ✅ 有效 — 阻止了超大内容写入和版本快照膨胀 |
| MEDIUM-3 fix | `regenerateArticle` 创建者检查 | ✅ 有效 — 与 update/delete 保持一致的权限模型 |
| MEDIUM-4 fix | `getAuthUser()` 防御性函数 | ✅ 有效 — 替代了 `req.user!` 非空断言，路由配置错误时返回 401 |

### INFO-2: 安全设计亮点

1. **纵深防御**: Zod schema (`.strict()`) + 字段白名单 (`pickAllowedFields`) + 服务层显式字段映射，三层防护确保即使一层失效也不会导致字段注入。
2. **统一错误处理**: `handleServerError` 函数集中处理错误响应，避免在 9 个处理器中重复写错误处理逻辑。
3. **自定义错误类**: `PermissionDeniedError` 使得权限拒绝错误可以在 catch 块中被精确区分，不会被当作系统错误吞没。
4. **`generating` 分支排除 content**: 防止用户在提交 AI 生成时注入内容到版本历史。
5. **项目归属二次验证**: 即使路由匹配了 `projectId`，仍通过 `item.project_id !== projectId` 交叉验证，防止 ID 篡改。

---

## 三、安全问题汇总矩阵

| 编号 | 严重级别 | 问题 | CWE 编号 | OWASP 分类 |
|------|----------|------|----------|------------|
| HIGH-1 | HIGH | TOCTOU 竞态条件可绕过状态校验 | CWE-367 | A01:2021 Broken Access Control |
| HIGH-2 | HIGH | `updateArticleContent` 无 Zod 验证 + 存储型 XSS 风险 | CWE-79 / CWE-20 | A03:2021 Injection |
| MEDIUM-1 | MEDIUM | 错误处理基于字符串匹配，脆弱且可枚举 | CWE-478 | A05:2021 Security Misconfiguration |
| MEDIUM-2 | MEDIUM | `skills` 字段 `z.unknown()` 允许任意 JSON | CWE-20 | A03:2021 Injection |
| MEDIUM-3 | MEDIUM | 版本列表无分页，存储放大攻击 | CWE-770 | A05:2021 Security Misconfiguration |
| MEDIUM-4 | MEDIUM | 状态验证逻辑分散，`submitForReview` 不经过 STATUS_TRANSITIONS | CWE-863 | A01:2021 Broken Access Control |
| MEDIUM-5 | MEDIUM | generating 分支补丁式修复，可维护性差 | CWE-1068 | A05:2021 Security Misconfiguration |
| LOW-1 | LOW | `VALID_CREATE_STATUSES` 死代码 | CWE-1068 | A05:2021 Security Misconfiguration |
| LOW-2 | LOW | 模块级 Service 单例影响安全测试 | CWE-1061 | A05:2021 Security Misconfiguration |
| LOW-3 | LOW | 权限检查重复 9 处，缺乏统一抽象 | CWE-1068 | A05:2021 Security Misconfiguration |
| LOW-4 | LOW | 先加载数据再检查权限的时序侧信道 | CWE-385 | A01:2021 Broken Access Control |

---

## 四、安全加固路线图

### 立即修复（建议当前迭代完成）

1. **HIGH-2**: `updateArticleContent` 引入 Zod schema 验证，添加内容基本清理（去除 `<script>` 标签等），拒绝空字符串
2. **MEDIUM-2**: 将 `skills` 字段从 `z.unknown()` 改为具体的类型定义

### 短期加固（1-2 周内）

3. **HIGH-1**: 在 service 层 Prisma update 中添加状态条件 WHERE 子句，或使用事务保证原子性
4. **MEDIUM-1**: 用自定义错误类（`NotFoundError`、`BusinessError`）替代字符串匹配
5. **MEDIUM-3**: `listArticleVersions` 添加分页参数

### 中期加固（1 个月内）

6. **MEDIUM-4**: 统一所有状态变更入口，确保都经过 `isValidStatusTransition` 验证
7. **LOW-3**: 提取权限检查为中间件/高阶函数，消除 9 处重复代码
8. **LOW-1**: 删除 `VALID_CREATE_STATUSES` 死代码

### 长期改进

9. **LOW-2**: 引入 DI 模式提升可测试性
10. **LOW-4**: 权限检查前置（如需要）

---

## 五、总结

该控制器经过前一轮安全修复后，安全状况有**显著改善**。最关键的两个漏洞（字段注入 CRITICAL-1 和状态机绕过 CRITICAL-2）已被有效修复，输入验证从 3/10 提升至 7/10，授权控制从 5/10 提升至 8/10。

**当前最需关注的问题**:

1. **TOCTOU 竞态条件**（HIGH-1）: 虽然在 Node.js 单线程模型下窗口很小，但在高并发场景下可能导致数据不一致。建议在下个迭代中通过 Prisma 事务修复。
2. **`updateArticleContent` 缺少 Zod 验证**（HIGH-2）: 这是唯一没有使用 Zod schema 的写操作端点，应与其他端点保持一致的验证策略。
3. **存储放大攻击**（MEDIUM-3）: 版本列表无分页 + 每次更新创建快照 = 潜在的 DoS 向量。

**安全加固优先级**: HIGH-2 > HIGH-1 > MEDIUM-1~3 > LOW

**评审结论: ✅ 通过（附建议）** — 核心安全问题已修复，剩余问题为改进项，不阻断合并。建议在下一个迭代中优先处理 HIGH 级别问题。

---

*代码安全专家评审完成 — 2026-05-24*
