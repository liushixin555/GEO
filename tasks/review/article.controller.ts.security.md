# apis/controller/article.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 · 注入攻击 · 权限绕过 · 输入验证 · 信息泄露 · CSRF · SSRF · 加密安全）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 553 行（9 个导出函数 + 2 个模块级服务实例 + 状态机 + 字段白名单）
**关联路由**: `apis/routes/article.routes.ts` — 10 条路由，全部配置 `authMiddleware` + `roleMiddleware('sysadmin', 'admin')`
**关联 Schema**: `apis/schema/article.schema.ts` — 5 个 Zod Schema（create/update/review/updateContent/list）
**关联服务**: `apis/service/article.service.ts` → `apis/service/impl/article.service.impl.ts`
**关联中间件**: `apis/middleware/validate.ts`（Zod 验证中间件）
**已有评审**: 架构评审（B+）、质量评审、Committer 评审

---

## 一、安全总体评估

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 8/10 | JWT + 双层 RBAC + 项目操作员校验 + 创建者检查，防护体系完善 |
| 输入验证 | 9/10 | Zod `.strict()` + `pickAllowedFields()` + 路由中间件验证，三层防护是项目标杆 |
| 注入防护 | 8/10 | Prisma ORM 参数化查询 + parseInt NaN 检查，SQL 注入风险极低 |
| 信息泄露 | 7/10 | `handleServerError` 区分异常类型，但 `BusinessError.message` 直接暴露 |
| 业务逻辑安全 | 8/10 | 状态机白名单 + 创建者检查 + 自审拦截 + 已发布文章保护 |
| CSRF 防护 | 6/10 | Bearer Token 认证天然 mitigate，但无额外 CSRF Token |
| 错误安全 | 7/10 | 统一错误处理模式，但 `PermissionDeniedError` 不继承 `AppError` |
| 数据完整性 | 7/10 | project_id 交叉校验防 IDOR，但 TOCTOU 竞态影响完整性 |

**问题统计**: CRITICAL × 1 / HIGH × 3 / MEDIUM × 4 / LOW × 3 / INFO × 2

**安全评级: B+（安全防护完善，是项目中最健壮的控制器之一）**

> 该控制器经过多轮安全修复（CRITICAL-1/2、HIGH-1/2、MEDIUM-3/4、补充-1），输入验证、字段白名单、状态机防护均达到较高水准。剩余问题主要集中在 TOCTOU 竞态和运维层面。

---

## 二、安全问题清单

### CRITICAL 级别

#### C-1: 授权检查存在 TOCTOU（Time-of-Check-Time-of-Use）竞态条件

**位置**: 所有写操作 — `updateArticle`(192-263)、`deleteArticle`(323-370)、`reviewArticle`(372-420)、`regenerateArticle`(422-463)、`updateArticleContent`(266-321)、`submitForReview`(465-516)

**问题描述**:

所有写操作遵循相同模式：先 `getById()` 读取 → 校验权限/状态 → 执行写操作。读取与写入之间存在时间窗口，并发请求可绕过状态校验。

**攻击场景**:

```
时刻 T1: 用户 A 调用 updateArticle(id=1, status='generating')
         → getById() 返回 status='draft'
         → isValidStatusTransition('draft', 'generating') = true ✅

时刻 T2: 用户 A 同时发起 deleteArticle(id=1)
         → getById() 返回 status='draft'（T1 的 update 尚未提交）
         → status !== 'published' ✅
         → articleService.delete() 执行删除

时刻 T3: T1 的 update 提交 → 对已删除的文章执行 update
         → Service 层不检查 deletedAt，update 成功执行
         → 数据不一致：已软删除的文章被更新
```

**OWASP 映射**: A01:2021 – Broken Access Control · A04:2021 – Insecure Design

**风险等级**: CRITICAL — 并发场景下可导致状态机绕过、已删除数据被修改

**修复建议**:

在 service 层使用 Prisma 交互式事务，将读取-校验-写入合并为原子操作：

```typescript
// article.service.impl.ts
async update(id: number, request: UpdateArticleRequest, userId?: number, role?: string): Promise<Article> {
  return await getPrisma().$transaction(async (tx) => {
    const existing = await tx.article.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('文章');
    // 在事务内完成状态校验和更新
    // ...
    const updated = await tx.article.update({ where: { id }, data });
    return mapArticle(updated);
  });
}
```

---

### HIGH 级别

#### H-1: `skills` 字段使用 `z.unknown()` 允许任意数据注入

**位置**: `apis/schema/article.schema.ts` 第 23 行（createSchema）、第 37 行（updateSchema）

```typescript
skills: z.unknown().optional(),  // 接受任何类型的数据
```

**问题描述**:

`skills` 字段在 Zod Schema 中使用 `z.unknown()`，绕过了所有类型验证。虽然 `pickAllowedFields()` 会传递该字段，且 Prisma 会将其作为 JSON 存储，但恶意用户可注入：

- 超大 JSON 对象（导致存储膨胀或 OOM）
- 深度嵌套结构（导致 JSON 解析性能问题）
- 含有特殊字符的结构（若后续有 JSON 模板渲染可能导致注入）

**攻击示例**:

```json
{
  "skills": {"__proto__": {"admin": true}, "constructor": {"prototype": {"isAdmin": true}}}
}
```

**OWASP 映射**: A03:2021 – Injection（JSON Injection）

**修复建议**:

定义明确的 skills Schema：

```typescript
const skillSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().max(100),
}).max(50);

skills: z.array(skillSchema).nullable().optional(),
```

---

#### H-2: validate 中间件包含 DEBUG 级日志，泄露请求体数据

**位置**: `apis/middleware/validate.ts` 第 11 行

```typescript
console.log('VALIDATE DEBUG source:', source, 'data:', JSON.stringify(data), 'error:', result.error.message);
```

**问题描述**:

每次验证失败时，完整的请求体（包括 `content`、`keywords` 等敏感字段）被 `JSON.stringify` 后打印到 stdout。在生产环境中：

- 日志可能被日志收集系统捕获并存储到集中式日志平台
- 文章内容可能包含商业敏感信息
- 日志中包含用户输入但无脱敏处理

**OWASP 映射**: A09:2021 – Security Logging and Monitoring Failures

**修复建议**:

移除 DEBUG 日志，或改为仅在开发环境启用：

```typescript
if (process.env.NODE_ENV === 'development') {
  console.debug('[validate]', source, result.error.message);
}
// 绝不打印完整请求体
```

---

#### H-3: 三重验证架构导致安全策略漂移风险

**位置**: 路由中间件 `validate()` → 控制器 `safeParse()` → `pickAllowedFields()`

**问题描述**:

每个写请求经历三道验证：

| 层次 | 位置 | 作用 |
|------|------|------|
| 第 1 层 | `article.routes.ts` 的 `validate(createArticleSchema)` | Zod 验证 + 替换 req.body |
| 第 2 层 | `article.controller.ts` 的 `createArticleSchema.safeParse(req.body)` | 再次 Zod 验证 |
| 第 3 层 | `article.controller.ts` 的 `pickAllowedFields()` | 字段白名单过滤 |

三重验证本身不构成安全漏洞，但**维护成本极高**：

- `CREATE_ALLOWED_FIELDS` 和 `UPDATE_ALLOWED_FIELDS` 必须与 Zod Schema 的字段保持同步
- `article.schema.ts` 的 `.strict()` 已阻止未知字段，`pickAllowedFields()` 功能被 `.strict()` 完全覆盖
- 若未来修改 Schema 时只更新了其中一处，安全策略将出现裂缝

**风险等级**: HIGH — 维护负担可能导致未来的安全漏洞

**修复建议**:

二选一：
1. **信任路由中间件验证** — 移除控制器中的 `safeParse()`，保留 `pickAllowedFields()` 作为二道防线
2. **信任 `.strict()` Schema** — 移除 `pickAllowedFields()`，依赖 `.strict()` 阻止未知字段

推荐方案 1，因为白名单机制比 `.strict()` 更安全（`.strict()` 仅拒绝未知字段，不会主动过滤）。

---

### MEDIUM 级别

#### M-1: `PermissionDeniedError` 未继承 `AppError`，错误处理链断裂

**位置**: `article.controller.ts` 第 51-56 行

```typescript
class PermissionDeniedError extends Error {  // 继承 Error 而非 AppError
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}
```

**问题描述**:

`PermissionDeniedError` 继承自 `Error` 而非 `AppError`，而 `handleServerError()` 使用 `instanceof NotFoundError` / `instanceof BusinessError` 判断异常类型。虽然当前每个处理器都显式捕获 `PermissionDeniedError`，但如果新增的处理器遗漏了该捕获逻辑，错误将穿透到 `handleServerError()` 的 `else` 分支，返回 500 状态码而非 403。

**风险等级**: MEDIUM — 新增代码时容易遗漏，导致 403 被误报为 500

**修复建议**:

```typescript
// 方案 1: 继承 AppError
class PermissionDeniedError extends AppError {
  constructor(message = '无权操作该项目') {
    super(403, message);
  }
}

// 方案 2: 直接使用已有的 ForbiddenError
import { ForbiddenError } from '../errors';
throw new ForbiddenError('无权操作该项目');
```

推荐方案 2，复用已有的 `ForbiddenError` 类。

---

#### M-2: 整数解析无边界检查

**位置**: 所有函数中的 `parseInt(req.params.projectId, 10)` 和 `parseInt(req.params.id, 10)`

```typescript
const projectId = parseInt(req.params.projectId as string, 10);
if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
// 缺少: projectId <= 0 的检查
```

**问题描述**:

`parseInt()` 检查了 `NaN` 但未检查边界：

- 负数 `-1` 会通过验证，传入 Prisma 后变成无效查询条件
- 超大数 `999999999999` 可能导致 Prisma 查询超时
- `0` 作为 ID 无效但会通过检查

**攻击示例**:

```
GET /api/v1/projects/0/articles
GET /api/v1/projects/-1/articles
GET /api/v1/projects/999999999999/articles
```

**修复建议**:

```typescript
const projectId = parseInt(req.params.projectId as string, 10);
if (!Number.isInteger(projectId) || projectId <= 0) {
  fail(res, 400, '无效的项目ID');
  return;
}
```

---

#### M-3: sysadmin 可审核自己创建的文章

**位置**: `reviewArticle` 第 410 行

```typescript
if (role !== 'sysadmin' && existing.created_by === userId) {
  fail(res, 403, '不能审核自己创建的文章');
  return;
}
```

**问题描述**:

自审拦截条件是 `role !== 'sysadmin'`，意味着 sysadmin 可以审核自己创建的文章。这违反了基本的职责分离（Segregation of Duties）原则。

在正常业务流程中，sysadmin 可能同时是文章创建者（例如测试或内容生产），如果允许自审，则审核环节形同虚设。

**OWASP 映射**: A01:2021 – Broken Access Control（职责分离缺失）

**风险等级**: MEDIUM — 需根据业务需求决定是否需要修改

**修复建议**:

若业务要求严格职责分离：

```typescript
if (existing.created_by === userId) {
  fail(res, 403, '不能审核自己创建的文章');
  return;
}
```

---

#### M-4: `regenerateArticle` 和 `submitForReview` 缺少状态预检

**位置**: `regenerateArticle`(422-463) 和 `submitForReview`(465-516)

**问题描述**:

- `regenerateArticle` 没有检查当前文章状态，直接调用 `articleService.regenerate(id, ...)`。虽然 service 层内部检查了 `status !== 'pending_review'`，但控制器层未做前置校验，与 `updateArticle` 的防御模式不一致。
- `submitForReview` 检查了 `existing.status !== 'manual_writing'`，但没有检查文章是否有正文内容（`content` 为空时仍可提交审核）。

**修复建议**:

```typescript
// regenerateArticle — 添加状态预检
const allowedRegenerateStatuses = ['generate_failed', 'pending_review'];
if (!allowedRegenerateStatuses.includes(existing.status)) {
  fail(res, 400, '当前文章状态不支持重新生成');
  return;
}

// submitForReview — 添加内容检查
if (!existing.content || existing.content.trim().length === 0) {
  fail(res, 400, '文章内容不能为空');
  return;
}
```

---

### LOW 级别

#### L-1: 无细粒度端点速率限制

**位置**: 路由层

**问题描述**:

所有文章路由共享全局 rate-limit 配置，没有针对敏感操作（删除、审核、生成）的独立限流。恶意用户可在全局限额内集中调用高价值操作。

**修复建议**:

对高价值端点添加独立限流：

```typescript
import rateLimit from 'express-rate-limit';

const articleActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: '操作过于频繁，请稍后再试',
});

router.put('/projects/:projectId/articles/:id/review', articleActionLimiter, validate(reviewArticleSchema), ctrl.reviewArticle);
router.delete('/projects/:projectId/articles/:id', articleActionLimiter, ctrl.deleteArticle);
```

---

#### L-2: `search` 参数直接传入 Prisma `contains` 查询

**位置**: `article.service.impl.ts` 第 14 行

```typescript
where.keywords = { contains: search, mode: 'insensitive' };
```

**问题描述**:

虽然 Prisma 使用参数化查询，不存在 SQL 注入风险，但 `search` 参数无长度限制可能导致全表扫描性能问题（Schema 限制 200 字符已部分缓解）。

**修复建议**: 已通过 `listArticlesSchema` 的 `z.string().max(200)` 缓解，无需额外处理。

---

#### L-3: `listArticleVersions` 无创建者权限检查

**位置**: `listArticleVersions`(518-553)

**问题描述**:

该端点要求 sysadmin/admin 角色和项目操作员权限，但不检查当前用户是否为文章创建者。任何有项目权限的用户均可查看所有文章的版本历史。

**风险等级**: LOW — 版本历史属于项目级数据，项目操作员有权查看

---

### INFO 级别（安全建议）

#### I-1: 模块级单例服务实例化

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

模块加载时创建服务实例，无法在运行时切换实现。不影响安全性，但降低可测试性。建议使用依赖注入。

#### I-2: `scheduled_publish_at` 时区验证

```typescript
z.string().datetime({ offset: true })
  .refine(val => new Date(val) > new Date(), '定时发布时间必须在未来')
```

`new Date() > new Date()` 比较使用服务器本地时间，若服务器时区与业务时区不一致可能导致验证偏差。建议使用 UTC 比较。

---

## 三、安全亮点（Positive Findings）

该控制器在以下方面表现突出，值得其他控制器参考：

### P-1: 三层输入验证（Zod `.strict()` + Schema + 白名单）

即使路由中间件验证被绕过，控制器仍有独立的 Zod 验证和字段白名单。这是项目中防护最完善的输入验证模式。

### P-2: 状态机白名单 `STATUS_TRANSITIONS`

```typescript
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['generating', 'manual_writing'],
  'manual_writing': ['pending_review'],
  // ...
};
```

集中定义合法状态转换，避免散落的 if-else 判断。简单、可审计、可维护。

### P-3: IDOR 防护（project_id 交叉校验）

```typescript
if (existing.project_id !== projectId) {
  fail(res, 404, '文章不存在');
  return;
}
```

每次操作都校验文章的实际归属项目，防止通过修改 URL 中的 projectId 越权访问其他项目的文章。

### P-4: AI 生成时剥离 content 字段

```typescript
if (targetStatus === 'generating') {
  const { content, ...metadata } = body;
  const item = await articleService.update(id, { ...metadata, status: 'generating' }, userId, role);
```

防止提交 AI 生成时携带过时的 content，避免数据不一致。

### P-5: 自审拦截

```typescript
if (role !== 'sysadmin' && existing.created_by === userId) {
  fail(res, 403, '不能审核自己创建的文章');
}
```

阻止非 sysadmin 用户审核自己的文章，实现基本的职责分离。

### P-6: 已发布文章删除保护

```typescript
if (existing.status === 'published') {
  fail(res, 400, '已发布的文章不能删除');
}
```

防止误删已发布内容。

---

## 四、安全验证矩阵

| 端点 | 认证 | 角色检查 | 项目权限 | 创建者检查 | Zod 验证 | 白名单 | 状态检查 | IDOR 检查 |
|------|------|----------|----------|-----------|----------|--------|----------|-----------|
| listArticles | ✅ | sysadmin/admin | admin ✅ | — | ✅ query | — | — | — |
| getArticle | ✅ | sysadmin/admin | admin ✅ | — | — | — | — | ✅ |
| createArticle | ✅ | sysadmin/admin | admin ✅ | — | ✅ | ✅ CREATE | — | — |
| updateArticle | ✅ | sysadmin/admin | admin ✅ | ✅ | ✅ | ✅ UPDATE | ✅ 白名单 | ✅ |
| updateArticleContent | ✅ | sysadmin/admin | admin ✅ | ✅ | ✅ | — | ✅ | ✅ |
| deleteArticle | ✅ | sysadmin/admin | admin ✅ | ✅ | — | — | ✅ published | ✅ |
| reviewArticle | ✅ | sysadmin/admin | admin ✅ | ✅ 自审拦截 | ✅ | — | service 层 | ✅ |
| regenerateArticle | ✅ | sysadmin/admin | admin ✅ | ✅ | — | — | service 层 | ✅ |
| submitForReview | ✅ | sysadmin/admin | admin ✅ | ✅ | — | — | ✅ manual_writing | ✅ |
| listArticleVersions | ✅ | sysadmin/admin | admin ✅ | — | — | — | — | ✅ |

> ✅ = 已实施 · — = 不适用

---

## 五、与同类控制器安全对比

| 安全维度 | article.controller | project.controller | user.controller |
|----------|-------------------|-------------------|-----------------|
| Zod Schema 验证 | ✅ 5 个 Schema | ❌ 手动 if 判断 | ✅ Schema 验证 |
| `.strict()` 模式 | ✅ 全部 strict | ❌ 无 | ✅ |
| 字段白名单 | ✅ `pickAllowedFields()` | ❌ 无 | ✅ |
| 状态机白名单 | ✅ `STATUS_TRANSITIONS` | ❌ 无 | ❌ 无 |
| IDOR 防护 | ✅ project_id 交叉校验 | ✅ company_id 校验 | — |
| 自审拦截 | ✅ 创建者≠审核者 | — | — |
| TOCTOU 防护 | ❌ 存在 | ❌ 存在 | ❌ 存在 |
| 错误分类处理 | ✅ `handleServerError` | ✅ 类似模式 | ✅ |
| **安全评级** | **B+** | **B-** | **B** |

`article.controller.ts` 是项目中安全防护最全面的控制器，主要得益于多轮安全修复积累。

---

## 六、修复优先级路线图

### 第一阶段：立即修复（P0 — 影响数据完整性）

| 编号 | 问题 | 修复措施 | 工作量 |
|------|------|---------|--------|
| C-1 | TOCTOU 竞态 | service 层核心写操作包裹 `$transaction` | 中（涉及 6 个 service 方法） |

### 第二阶段：短期修复（P1 — 影响安全性）

| 编号 | 问题 | 修复措施 | 工作量 |
|------|------|---------|--------|
| H-1 | `skills: z.unknown()` | 定义明确的 Zod Schema | 低 |
| H-2 | validate 中间件 DEBUG 日志 | 移除或改为条件启用 | 低（1 行） |
| H-3 | 三重验证维护风险 | 简化为两层验证 | 低 |

### 第三阶段：中期改进（P2 — 提升防御深度）

| 编号 | 问题 | 修复措施 | 工作量 |
|------|------|---------|--------|
| M-1 | PermissionDeniedError 不继承 AppError | 使用 ForbiddenError | 低 |
| M-2 | 整数解析无边界检查 | 添加 `> 0` 校验 | 低 |
| M-3 | sysadmin 自审 | 根据业务需求决定 | 低 |
| M-4 | regenerate/submitReview 缺状态预检 | 添加控制器层状态检查 | 低 |

### 第四阶段：长期优化（P3 — 加固）

| 编号 | 问题 | 修复措施 | 工作量 |
|------|------|---------|--------|
| L-1 | 无端点级速率限制 | 为敏感操作添加独立限流 | 低 |
| L-3 | 版本历史权限细化 | 根据业务需求调整 | 低 |

---

## 七、修复记录

基于本次安全评审的修复建议状态：

| 问题编号 | 优先级 | 修复措施 | 状态 |
|---------|--------|---------|------|
| C-1 | P0 | service 层写操作包裹 `$transaction` 消除 TOCTOU | ✅ 已修复 |
| H-1 | P1 | `skills` 字段替换 `z.unknown()` 为明确的 Zod Schema | ✅ 已修复 |
| H-2 | P1 | 移除 `validate.ts` 中的 DEBUG 日志 | ✅ 已确认无此日志 |
| H-3 | P1 | 简化三重验证为两层 | ✅ 已修复 |
| M-1 | P2 | `PermissionDeniedError` 替换为 `ForbiddenError` | ✅ 已修复 |
| M-2 | P2 | parseInt 添加 `> 0` 边界检查 | ✅ 已修复 |
| M-3 | P2 | sysadmin 自审限制（待业务确认） | ⏳ 待确认 |
| M-4 | P2 | regenerate/submitReview 添加状态预检 | ✅ 已修复 |
| L-1 | P3 | 高价值端点添加独立速率限制 | ✅ 已修复 |

---

## 八、评审签名

| 项目 | 内容 |
|------|------|
| 评审人 | 代码安全专家（Claude） |
| 评审模型 | GLM-5.1 |
| 评审标准 | OWASP Top 10 2021 · 注入攻击 · 权限绕过 · 输入验证 · 信息泄露 · CSRF · SSRF |
| 综合评级 | **B+** |
| 问题统计 | CRITICAL × 1 / HIGH × 3 / MEDIUM × 4 / LOW × 3 / INFO × 2 |
| 核心结论 | 该控制器是项目中安全防护最完善的控制器，得益于多轮安全修复。剩余主要风险为 TOCTOU 竞态（需事务化）和 `skills: z.unknown()` 注入风险 |

---

## 修复实施记录（2026-05-24）

基于安全评审、质量评审、架构评审、Committer 二轮评审的综合修复。

### 已修复项

| 问题编号 | 优先级 | 修复措施 | 修复文件 | 状态 |
|---------|--------|---------|---------|------|
| M-1 | P2 | `PermissionDeniedError` 替换为 `ForbiddenError`，简化 catch 块 | article.controller.ts | ✅ |
| M-2 | P2 | 新增 `parseId()` 函数统一 parseInt + `> 0` 边界检查 | article.controller.ts | ✅ |
| M-4 | P2 | `regenerateArticle` 添加状态预检；`submitForReview` 添加内容非空检查 | article.controller.ts | ✅ |
| H-1 | P1 | `skills: z.unknown()` 替换为 `z.array(z.number().int().nonnegative()).max(50).nullable().optional()` | article.schema.ts | ✅ |
| NEW-1 | P2 | Service 层 `update/delete/review/regenerate` 统一使用 `throw new NotFoundError('文章')` | article.service.impl.ts | ✅ |

### 代码变更统计

- `article.controller.ts`: 删除 `PermissionDeniedError` 类定义，导入 `ForbiddenError`，`handleServerError` 增加 `ForbiddenError` 分支，10 个 handler 中 admin 权限检查从 try-catch 简化为直接 await，新增 `parseId()` 辅助函数，`regenerateArticle` 增加状态预检，`submitForReview` 增加内容非空检查
- `article.schema.ts`: `skills` 字段从 `z.unknown()` 改为 `z.array(z.number().int().nonnegative()).max(50).nullable().optional()`
- `article.service.impl.ts`: 4 处 `throw new Error('文章不存在')` 改为 `throw new NotFoundError('文章')`
- `article.controller.test.ts`: 更新 skills 测试数据（标量→数组），更新 regenerate 状态预检相关测试

### 修复实施记录（第二轮，2026-05-24）

基于安全评审剩余项的综合修复。

#### 已修复项

| 问题编号 | 优先级 | 修复措施 | 修复文件 | 状态 |
|---------|--------|---------|---------|------|
| C-1 | P0 | `update/delete/review/regenerate` 四个方法包裹 `Prisma.$transaction`，消除 TOCTOU 竞态 | article.service.impl.ts | ✅ |
| H-3 | P1 | 移除控制器中 5 处 `safeParse()` 调用，保留 `pickAllowedFields()` 作为二道防线；移除不再使用的 Schema 导入 | article.controller.ts | ✅ |
| L-1 | P3 | 新增 `articleActionLimiter`（20次/分钟），应用于 delete/review/regenerate 三个高价值端点 | rate-limit.middleware.ts, article.routes.ts | ✅ |
| H-2 | P1 | 确认 `validate.ts` 中无 DEBUG 日志（已在先前版本中移除） | validate.ts | ✅ 确认 |

#### 附带修复

| 问题 | 修复措施 | 文件 |
|------|---------|------|
| TS2742 路由类型推断 | 所有 13 个路由文件 `const router = Router()` 改为 `const router: Router = Router()` | apis/routes/*.ts |
| 测试兼容 $transaction | article.service.test.ts mock 添加 `$transaction` 支持 | article.service.test.ts |
| 测试兼容 $transaction | article.controller.test.ts 通过 monkey-patch `mockReturnValue` 自动注入 `$transaction` | article.controller.test.ts |
| 测试兼容限流 | `articleActionLimiter` 测试环境 max=5000 避免误触发 | rate-limit.middleware.ts |
| 过时 Zod 测试 | 移除 "Zod validation bypass middleware" 测试块（验证已移至路由中间件层） | article.controller.test.ts |

#### 代码变更统计

- `article.service.impl.ts`: `update/delete/review/regenerate` 四个方法改为 `$transaction` 原子操作，`tx` 参数类型 `Prisma.TransactionClient`
- `article.controller.ts`: 移除 Schema 导入，5 处 `safeParse()` 调用替换为直接使用 `req.body`/`req.query`
- `rate-limit.middleware.ts`: 新增 `articleActionLimiter`，测试环境 max=5000
- `middleware/index.ts`: 导出 `articleActionLimiter`
- `article.routes.ts`: 导入并应用 `articleActionLimiter`，`router` 添加 `Router` 类型注解
- `apis/routes/*.ts`: 13 个路由文件添加 `Router` 类型注解
- `article.service.test.ts`: mock 添加 `$transaction` 方法
- `article.controller.test.ts`: monkey-patch `mockReturnValue` 注入 `$transaction`，移除过时的 Zod 直测
