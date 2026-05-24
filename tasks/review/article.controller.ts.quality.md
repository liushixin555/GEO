# article.controller.ts 软件质量专家评审报告

| 项目 | 信息 |
|------|------|
| **评审文件** | `apis/controller/article.controller.ts` |
| **评审角色** | 软件质量专家 (Quality Expert) |
| **评审日期** | 2026-05-24 |
| **代码行数** | 553 行 |
| **函数数量** | 10 个导出函数 + 4 个辅助函数 |
| **综合评级** | **B (良好，有改进空间)** |

---

## 评审摘要

代码具备良好的安全意识（字段白名单、状态转换校验、权限分层），但存在显著的架构级代码重复、关键业务逻辑死代码、以及竞态条件风险。以下是按严重级别分类的所有发现。

| 级别 | 数量 | 说明 |
|------|------|------|
| CRITICAL | 2 | 竞态条件、不可达死代码影响业务正确性 |
| HIGH | 5 | 大规模重复、脆弱错误处理、响应格式不一致等 |
| MEDIUM | 6 | 缺少依赖注入、类型安全不足、验证缺口等 |
| LOW | 4 | 魔法数字、缺少日志、模块副作用等 |

---

## CRITICAL 级别问题

### C-1: TOCTOU 竞态条件 — 先查后改无原子保护

**位置**: `updateArticle` (L206-263), `deleteArticle` (L338-370), `reviewArticle` (L394-420), `submitForReview` (L480-511)

**问题描述**: 所有写操作都采用「先 `getById` 检查状态/权限，再执行写操作」的模式，两次数据库操作之间无事务或行锁保护。在高并发场景下：

```
请求A: getById → status=draft ✓ → [切换]
请求B: getById → status=draft ✓ → update(status=generating) ✓
请求A: → update(status=manual_writing) ✓  // 覆盖B的变更，或违反状态机
```

**影响**: 数据一致性被破坏，文章可能进入非法状态，尤其在 AI 生成（generating）和审核（review）流程并发时。

**修复建议**:
```typescript
// 方案1: 在 service 层使用 Prisma 事务 + 乐观锁
async update(id: number, request: UpdateArticleRequest, expectedStatus: string, ...) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.article.findUnique({ where: { id } });
    if (existing.status !== expectedStatus) throw new Error('状态已变更');
    return tx.article.update({ where: { id }, data: request });
  });
}

// 方案2: 在 SQL 层面使用条件更新
await prisma.article.updateMany({
  where: { id, status: expectedStatus },
  data: updateData,
});
// 检查 affected rows 是否为 0
```

---

### C-2: STATUS_TRANSITIONS 包含不可达的转换 — 死代码

**位置**: L14-25 (`STATUS_TRANSITIONS`), L233 (`SETTINGS_EDITABLE_STATUSES`)

**问题描述**: `updateArticle` 在 L233 检查 `SETTINGS_EDITABLE_STATUSES = ['draft']`，只允许 draft 状态的文章调用 update。但 `STATUS_TRANSITIONS` 定义了：

```typescript
'manual_writing': ['pending_review'],          // ❌ 不可达，manual_writing 不在 SETTINGS_EDITABLE_STATUSES
'generate_failed': ['generating'],             // ❌ 不可达
'publish_failed': ['publishing'],              // ❌ 不可达
'pending_review': ['publishing', 'draft', 'manual_writing'], // ❌ 不可达
```

这些转换永远不会被 `updateArticle` 触及，是死代码。如果确实需要这些转换，说明 `SETTINGS_EDITABLE_STATUSES` 过于严格，阻止了合法的状态变更。

**影响**: 如果业务需要 `pending_review → publishing` 等转换通过 `updateArticle` 完成，当前代码会返回 400 拒绝请求。如果这些转换由专用端点（`reviewArticle`、`regenerateArticle`）处理，则 `STATUS_TRANSITIONS` 中的相应条目应该删除。

**修复建议**: 明确状态机的入口，清理 `STATUS_TRANSITIONS` 中不由 `updateArticle` 处理的转换条目，或者调整 `SETTINGS_EDITABLE_STATUSES` 使其与实际业务需求一致。

---

## HIGH 级别问题

### H-1: 大规模代码重复 — 10 个函数中 8 个包含相同的权限检查模式

**位置**: 几乎所有导出函数

**问题描述**: 以下模式重复出现 8 次，每次约 15 行：

```typescript
const user = getAuthUser(req);
if (!user) { fail(res, 401, '未认证'); return; }
const { userId, role } = user;

// ... 获取 existing ...

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

全文件约 553 行，其中权限相关代码约 120 行是重复的（~22%）。

**修复建议**: 抽取为中间件或高阶函数：

```typescript
// 方案1: 中间件链
router.put('/:id', authMiddleware, projectAccessMiddleware(), articleOwnerMiddleware(), updateArticle);

// 方案2: 高阶包装函数
function withArticleAccess(handler: (req, res, ctx: ArticleContext) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const ctx = await resolveArticleContext(req, res);
    if (!ctx) return; // 已返回错误
    return handler(req, res, ctx);
  };
}
```

---

### H-2: handleServerError 基于字符串匹配错误消息 — 脆弱耦合

**位置**: L69-79

**问题描述**: 错误处理通过匹配 `err.message` 的中文字符串来判断错误类型：

```typescript
if (err instanceof Error && err.message === '文章不存在') { ... }
if (err instanceof Error && err.message === '文章当前状态不支持审核操作') { ... }
if (err instanceof Error && err.message === '文章当前状态不支持重新生成') { ... }
```

**问题**:
- service 层修改消息文本会导致 controller 层逻辑静默失效
- 无法处理国际化场景
- 如果 service 抛出包含相似文本的其他错误，可能误匹配

**修复建议**: 使用自定义错误类型或错误码：

```typescript
class NotFoundError extends Error { constructor() { super('文章不存在'); this.name = 'NOT_FOUND'; } }
class InvalidStateError extends Error { constructor(msg: string) { super(msg); this.name = 'INVALID_STATE'; } }

function handleServerError(res: Response, err: unknown, contextMsg: string) {
  if (err instanceof NotFoundError) return fail(res, 404, err.message);
  if (err instanceof InvalidStateError) return fail(res, 400, err.message);
  return fail(res, 500, contextMsg);
}
```

---

### H-3: createArticle 未使用 created() 工具函数 — 响应格式不一致

**位置**: L190

**问题描述**: `createArticle` 直接构造响应：
```typescript
res.status(201).json({ code: 0, message: '创建文章成功', data: item });
```

但 `response.util.ts` 已导出 `created()` 函数专门处理 201 响应，且其他 controller 中已使用。同时 `created` 已在 L4 行被导入但未使用。

**修复建议**:
```typescript
created(res, item, '创建文章成功');
```

---

### H-4: updateArticleContent 缺少 Zod schema 验证 — 安全降级

**位置**: L277-278

**问题描述**: `updateArticleContent` 仅做了简单的 `typeof content !== 'string'` 检查，未使用 Zod schema。对比 `updateArticle` 和 `createArticle` 都使用了 `safeParse`。

```typescript
const { content } = req.body;
if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }
```

**风险**:
- 如果 body 中存在其他字段（如 `status`、`title`），不会被过滤
- content 的最小长度未验证（空字符串被允许）
- 与其他端点的验证标准不一致

**修复建议**: 定义专用 schema：
```typescript
const updateContentSchema = z.object({
  content: z.string().min(1).max(500_000),
}).strict();
```

---

### H-5: `scheduled_publish_at` 未校验未来时间 — 业务逻辑漏洞

**位置**: L39 (schema), `updateArticle` 中无额外校验

**问题描述**: `updateArticleSchema` 允许 `scheduled_publish_at` 为任意 datetime，但未校验该时间是否在未来。用户可以设置一个过去的时间作为定时发布时间，导致发布行为未定义。

**修复建议**: 在 schema 或 controller 中增加验证：
```typescript
scheduled_publish_at: z.string().datetime({ offset: true })
  .refine(val => new Date(val) > new Date(), '定时发布时间必须在未来')
  .nullable().optional(),
```

---

## MEDIUM 级别问题

### M-1: 模块级服务实例化 — 无依赖注入，测试困难

**位置**: L7-8

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**问题**: 服务在模块加载时实例化，无法在测试中替换为 mock。需要使用 `jest.mock` 整个模块，增加了测试复杂度。

**修复建议**: 使用工厂函数或依赖注入：
```typescript
export function createController(articleSvc = new ArticleServiceImpl(), projectSvc = new ProjectServiceImpl()) {
  return { listArticles: ..., getArticle: ..., };
}
```

---

### M-2: `skills` 字段类型为 `unknown` — 缺乏结构验证

**位置**: `article.schema.ts` L23, `article.entity.ts`

**问题描述**: `skills` 在 Zod schema 中定义为 `z.unknown()`，在 entity 中类型也是 `unknown`。这意味着任何 JSON 数据（对象、数组、null、布尔值）都可以通过验证，缺少业务层面的结构约束。

**修复建议**: 定义 skills 的结构 schema：
```typescript
const skillSchema = z.object({
  name: z.string(),
  level: z.enum(['basic', 'intermediate', 'advanced']).optional(),
});
// skills: z.array(skillSchema).nullable().optional(),
```

---

### M-3: `pickAllowedFields` 丢失类型信息

**位置**: L43-51

**问题描述**: 函数返回 `Record<string, unknown>`，导致后续代码需要使用不安全的类型断言：

```typescript
const targetStatus = body.status as string | undefined; // L247, 不安全断言
```

**修复建议**: 使用泛型或 Zod 的 `.pick()` 方法保留类型信息。

---

### M-4: `getAuthUser` 包装过于简单 — 价值有限

**位置**: L82-84

```typescript
function getAuthUser(req: Request): { userId: number; role: string } | null {
  return req.user ?? null;
}
```

**问题**: 这个函数仅做 `?? null` 转换，但 `req.user` 的类型定义（来自 middleware 扩展）已经是 `{ userId: number; role: string } | undefined`。包装后反而丢失了 `companyId` 和 `username` 字段。

**修复建议**: 要么让函数返回完整的 `AuthPayload`，要么直接使用 `req.user`。

---

### M-5: `regenerateArticle` 未限制重试频率

**位置**: L427-468

**问题描述**: 重新生成 AI 内容的端点没有任何频率限制。用户可以反复调用 `regenerateArticle`，每次都会触发 AI 生成流程，可能导致：
- LLM API 费用暴增
- 服务端资源耗尽
- 数据库版本记录膨胀

**修复建议**: 在 service 层或 controller 层增加重试冷却时间检查，或在路由层增加专用 rate limit。

---

### M-6: `deleteArticle` 缺少关联数据清理指引

**位置**: L328-375

**问题描述**: 删除文章仅调用 `articleService.delete(id, userId, role)`（soft delete），但未说明关联的 `ArticleVersion`、发布计划等数据如何处理。虽然 Prisma 可能有 `onDelete: Cascade` 配置，但 controller 层应确保级联行为符合预期。

---

## LOW 级别问题

### L-1: 魔法数字 — MAX_CONTENT_LENGTH 与 schema 不同步

**位置**: L12 (`MAX_CONTENT_LENGTH = 500_000`), `article.schema.ts` L25 (`z.string().max(500_000)`)

**问题**: 限制值在两处独立定义（controller 常量 + schema 定义），改一处忘另一处会不一致。

**修复建议**: 将 `MAX_CONTENT_LENGTH` 定义在 schema 文件中，从 schema 导出。

---

### L-2: 缺少结构化日志

**位置**: 全文件

**问题**: 所有关键操作（创建、更新、删除、审核、重新生成）都没有日志记录。对于审计和问题排查，缺少 `req.user.userId`、`articleId`、操作结果等关键信息。

---

### L-3: `listArticles` 中 admin 权限检查使用 try-catch 控制流

**位置**: L103-114

**问题**: 用 `try { checkProjectOperator() } catch { if PermissionDeniedError → 403 else throw }` 模式控制流程。异常不应用于常规控制流，这里 `checkProjectOperator` 应返回 boolean 或使用 Result 类型。

---

### L-4: VALID_CREATE_STATUSES 与 createArticleSchema.status 不一致

**位置**: L40 (`VALID_CREATE_STATUSES = ['draft', 'manual_writing', 'generating']`), schema L26 (`z.enum(['draft', 'generating', 'manual_writing'])`)

**问题**: 常量定义和 schema 枚举值一致但顺序不同。`VALID_CREATE_STATUSES` 常量定义后未在代码中使用，是死代码。

---

## 正面评价

1. **安全意识强**: 字段白名单（`pickAllowedFields`）、状态转换白名单（`STATUS_TRANSITIONS`）、Zod schema 验证三重防护
2. **权限分层清晰**: sysadmin/admin/view 三级权限，admin 需要 operator_ids 校验，创建者有额外操作权限
3. **防御性编程**: `getAuthUser` 防御 `req.user` 可能为空、`isNaN` 校验路径参数
4. **关注点注释**: 每个修复点都有注释标记（如 `CRITICAL-1 fix`），便于追溯
5. **统一的响应工具**: 使用 `success`/`fail`/`paginate` 保持响应格式一致（除 createArticle 外）

---

## 度量统计

| 指标 | 值 | 评价 |
|------|-----|------|
| 代码重复率 | ~22%（权限检查） | 偏高 |
| 函数平均长度 | ~40 行 | 良好 |
| 圈复杂度（updateArticle） | ~12 | 偏高（建议 < 10） |
| 安全防护层数 | 3 层（schema + 白名单 + 权限） | 优秀 |
| 类型安全覆盖 | 中等（有 `as` 断言和 `unknown`） | 可改进 |
| 错误处理完备性 | 高（统一 handleServerError） | 良好 |

---

## 修复优先级建议

| 优先级 | 编号 | 修复工作量 | 风险 |
|--------|------|-----------|------|
| P0 紧急 | C-1 竞态条件 | 中（需改 service 层） | 数据一致性 |
| P0 紧急 | C-2 死代码清理 | 低 | 业务正确性 |
| P1 重要 | H-1 抽取权限中间件 | 中 | 可维护性 |
| P1 重要 | H-2 自定义错误类型 | 低 | 健壮性 |
| P1 重要 | H-3 使用 created() | 低（1 行） | 一致性 |
| P1 重要 | H-4 Content schema | 低 | 安全性 |
| P1 重要 | H-5 时间校验 | 低 | 业务正确性 |
| P2 一般 | M-1 ~ M-6 | 中 | 可测试性/健壮性 |
| P3 低 | L-1 ~ L-4 | 低 | 代码质量 |

---

*评审人: Claude Quality Expert | 评审模型: Claude Opus 4.7*
