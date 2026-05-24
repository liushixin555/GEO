# apis/controller/article.controller.ts — 软件架构专家评审报告

| 项目 | 信息 |
|------|------|
| **评审文件** | `apis/controller/article.controller.ts` (553 行) |
| **评审角色** | 软件架构专家 (Software Architecture Expert) |
| **评审日期** | 2026-05-24 |
| **评审范围** | 分层架构、职责划分、状态机设计、API 契约、可扩展性、可测试性 |
| **综合评级** | **B+（良好，架构层面有明确改进空间）** |

---

## 评审摘要

`article.controller.ts` 在安全防护（Zod + 白名单 + 状态机）方面表现突出，是项目中防护最完善的控制器。但从**架构设计**角度审视，存在以下系统性问题：控制器承载了过多职责（认证、授权、状态机、字段过滤），与 Service 层的职责边界模糊，导致 553 行代码中约 22% 为重复模板代码。状态机逻辑分散在 Controller 和 Service 两层，缺乏统一的状态机抽象层。双重验证（中间件 + 控制器）造成维护冗余。

| 级别 | 数量 | 核心关注点 |
|------|------|------------|
| CRITICAL | 1 | 状态机逻辑跨层分散，无原子性保证 |
| HIGH | 3 | Controller Fat、双重验证、Service 层违反 DRY |
| MEDIUM | 4 | 缺少 DI 容器、异常类孤岛、版本更新非事务性、API 设计不一致 |
| LOW | 3 | 类型断言不安全、常量位置不合理、缺少架构文档 |

---

## 一、分层架构评审

### 1.1 架构层次图

```
┌─────────────────────────────────────────────────────────────┐
│  Routes (article.routes.ts)                                  │
│  ┌─ authMiddleware + roleMiddleware                          │
│  └─ validate() middleware (Zod schema 验证)                  │
├─────────────────────────────────────────────────────────────┤
│  Controller (article.controller.ts) — 553 行                 │
│  ┌─ 认证检查 (getAuthUser)           ← 应在中间件           │
│  ┌─ 授权检查 (checkProjectOperator)  ← 应在中间件           │
│  ┌─ 参数验证 (safeParse)             ← 与路由 validate 重复 │
│  ┌─ 状态机校验 (STATUS_TRANSITIONS)  ← 应在 Service 层      │
│  ┌─ 字段白名单 (pickAllowedFields)   ← 应在 Schema 层       │
│  ┌─ 业务逻辑 (generating 分支)       ← 应在 Service 层      │
│  └─ 响应格式化 (success/fail/paginate)                       │
├─────────────────────────────────────────────────────────────┤
│  Service Interface (article.service.ts) — IArticleService    │
├─────────────────────────────────────────────────────────────┤
│  Service Impl (article.service.impl.ts) — 185 行             │
│  ┌─ 数据映射 (snake_case → camelCase)                       │
│  ┌─ 版本管理 (content versioning)                           │
│  ┌─ 状态转换 (review/regenerate)  ← 与 Controller 状态机重叠│
│  └─ Prisma 数据访问                                          │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 当前职责分布问题

**Controller 层职责过重**，违反 Single Responsibility Principle：

| 职责 | 当前所在层 | 正确所在层 | 行数 |
|------|-----------|-----------|------|
| JWT 认证检查 | Controller (L95-97) | 已有 authMiddleware，冗余 | ~30 行 × 10 |
| Admin 项目授权 | Controller (L100-110) | 应为独立中间件 | ~120 行 |
| Zod 参数验证 | Controller + Routes | 仅 Routes 中间件 | ~30 行 × 5 |
| 状态转换校验 | Controller (L14-25) | Service 层 | ~15 行 |
| 字段白名单过滤 | Controller (L28-49) | Schema `.strict()` 已覆盖 | ~25 行 |
| generating 分支逻辑 | Controller (L251-256) | Service 层 | ~10 行 |
| 项目归属验证 | Controller (L131-134) | Service 层 | ~30 行 |

**结论**: Controller 应仅负责「接收请求 → 委托 Service → 格式化响应」，当前承担了至少 5 项不属于它的职责。

---

## 二、核心架构问题

### C-1: 状态机逻辑跨层分散 — 无原子性保证

**严重度**: CRITICAL

**问题**: 文章状态转换的决策逻辑分散在三个位置，没有统一的状态机抽象：

```
位置 1: Controller — STATUS_TRANSITIONS 白名单 (L14-21)
  定义了 5 个源状态及其合法目标状态

位置 2: Controller — updateArticle 中的状态检查 (L229-256)
  SETTINGS_EDITABLE_STATUSES + isValidStatusTransition

位置 3: Service — review() 中的状态检查 (article.service.impl.ts L148-149)
  if (existing.status !== 'pending_review') throw ...

位置 4: Service — regenerate() 中的状态检查 (L166-167)
  if (existing.status !== 'pending_review') throw ...
```

**架构缺陷**:
1. **TOCTOU 竞态**: Controller 的 `getById` 和后续 `update` 之间无事务保护，两个并发请求可能同时通过状态检查
2. **状态转换规则重复**: `STATUS_TRANSITIONS['pending_review'] = ['publishing', ...]` 在 Controller 定义，但 Service `review()` 又独立检查 `status !== 'pending_review'`
3. **缺少声明式状态机**: 没有状态转换的副效应定义（如 generating 应触发 AI 异步任务）

**建议架构**: 将状态机提升为独立模块

```typescript
// apis/statemachine/article.statemachine.ts
export const articleStateMachine = defineStateMachine({
  initial: 'draft',
  states: {
    draft:           { on: { generate: 'generating', startManual: 'manual_writing' } },
    manual_writing:  { on: { submit: 'pending_review' } },
    generating:      { on: { success: 'pending_review', fail: 'generate_failed' } },
    generate_failed: { on: { retry: 'generating' } },
    pending_review:  { on: { approve: 'publishing', reject_manual: 'manual_writing',
                             reject_ai: 'draft', regenerate: 'generating' } },
    publishing:      { on: { success: 'published', fail: 'publish_failed' } },
    publish_failed:  { on: { retry: 'publishing' } },
    published:       { final: true },
  },
});
```

Service 层使用 Prisma 事务 + 条件更新保证原子性：

```typescript
const result = await prisma.$executeRaw`
  UPDATE "Article" SET status = $1 WHERE id = $2 AND status = $3
`;
if (result.count === 0) throw new ConflictError('状态已变更，请刷新后重试');
```

---

### H-1: Controller Fat — 职责膨胀（~22% 重复代码）

**严重度**: HIGH

**位置**: 8 个 handler 中重复的认证-授权-参数解析模板

**重复模式**（每个 handler 约 15 行，共 ~120 行重复）：

```typescript
// 以下代码块在 8 个 handler 中原样重复
const user = getAuthUser(req);
if (!user) { fail(res, 401, '未认证'); return; }
const { userId, role } = user;
const existing = await articleService.getById(id, userId, role);
if (existing.project_id !== projectId) { fail(res, 404, '文章不存在'); return; }
if (role === 'admin') {
  try { await checkProjectOperator(projectId, userId, role); }
  catch (err) {
    if (err instanceof PermissionDeniedError) { fail(res, 403, err.message); return; }
    throw err;
  }
}
```

**架构建议**: 提取为组合中间件链

```typescript
// apis/middleware/article-context.ts
export const articleContext = [
  authMiddleware,
  roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN),
  projectAccessMiddleware,      // checkProjectOperator
  articleOwnerMiddleware,       // creator check (按需)
  articleStatusMiddleware,      // editable status check (按需)
];
```

这样每个 handler 可以缩减到核心业务逻辑：

```typescript
export async function updateArticle(req: ArticleRequest, res: Response) {
  const { article, user, body } = req.context; // 中间件已填充
  const item = await articleService.update(article.id, body, user.userId, user.role);
  success(res, item, '更新文章成功');
}
```

---

### H-2: 双重验证架构 — 维护成本翻倍

**严重度**: HIGH

**位置**: `article.routes.ts` L14-23 vs `article.controller.ts` L88-92, L161-165, L235-239 等

**问题**: 每个 endpoint 的请求体/查询参数被验证两次：

```
请求 → Routes validate() middleware → Controller safeParse() → Service
         ↓ (第一次)                    ↓ (第二次)
         Zod schema 验证              Zod schema 验证
         失败 → 400                   失败 → 400
```

以 `updateArticle` 为例：
1. **路由层**: `validate(updateArticleSchema)` — L17，验证失败返回 `{ code: 400, message: "参数验证失败: ..." }`
2. **控制器层**: `updateArticleSchema.safeParse(req.body)` — L235，验证失败返回相同格式

两次验证使用**完全相同的 schema**，产生以下问题：
- 维护时需同步修改两处（实际上路由层的 `validate` 已经保证了 body 格式正确）
- 两层的错误响应格式虽一致但错误消息细节可能微小差异
- 性能浪费：每个请求的参数被解析两次

**架构建议**: 控制器层移除所有 `safeParse` 调用，完全信任路由层 `validate` 中间件的结果。`validate` 中间件已通过 `req.body = result.data` 将验证后的数据写入请求对象。

```typescript
// 路由层 (保留)
router.put('/projects/:projectId/articles/:id', validate(updateArticleSchema), ctrl.updateArticle);

// 控制器层 (移除 safeParse)
export async function updateArticle(req: Request, res: Response) {
  const body = pickAllowedFields(req.body, UPDATE_ALLOWED_FIELDS); // req.body 已被 validate 处理
  // ...
}
```

---

### H-3: Service 层违反 DRY — 重复的 entity 存在性检查

**严重度**: HIGH

**位置**: `article.service.impl.ts` L39-41, L85-86, L136-137, L145-146, L161-163

**问题**: Service 层每个方法都包含相同的 `findFirst + null check` 模式：

```typescript
// 在 getById(), update(), delete(), review(), regenerate() 中重复
const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
if (!existing) throw new NotFoundError('文章');  // 或 throw new Error('文章不存在')
```

更严重的是，**错误类型不一致**:
- `getById()` 使用 `NotFoundError`（继承自 `AppError`）
- `update()`、`delete()`、`review()`、`regenerate()` 使用原生 `Error`

这意味着 Controller 的 `handleServerError` 的 `instanceof NotFoundError` 分支无法捕获 Service 层大多数方法抛出的"不存在"错误。

**架构建议**: Service 层提取基础存在性检查方法，统一异常类型：

```typescript
private async getExisting(id: number): Promise<Article> {
  const item = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!item) throw new NotFoundError('文章');
  return item;
}
```

---

## 三、设计模式评审

### M-1: 缺少依赖注入 — 模块级单例

**严重度**: MEDIUM

**位置**: L8-9

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**问题**:
- 模块加载时创建实例，测试中只能通过 `jest.mock` 替换整个模块
- 无法注入不同的 Service 实现（如缓存装饰器、日志装饰器）
- Service 的构造函数无法接收配置参数

**建议**: 最小改动方案 — 使用延迟初始化工厂函数：

```typescript
let _articleService: IArticleService | null = null;
export function getArticleService(): IArticleService {
  return _articleService ??= new ArticleServiceImpl();
}
export function setArticleService(svc: IArticleService) { _articleService = svc; }
```

---

### M-2: `PermissionDeniedError` 异常孤岛

**严重度**: MEDIUM

**位置**: L51-56

```typescript
class PermissionDeniedError extends Error {
  constructor(message: string) { super(message); this.name = 'PermissionDeniedError'; }
}
```

**问题**:
- 项目已有 `ForbiddenError`（`apis/errors.ts` L35-39），语义完全相同
- `PermissionDeniedError` 不继承 `AppError`，缺少 `statusCode` 属性
- `handleServerError` 无法通过 `instanceof AppError` 统一处理

**建议**: 删除 `PermissionDeniedError`，改用全局 `ForbiddenError`。

---

### M-3: 版本更新非事务性 — 数据一致性风险

**严重度**: MEDIUM

**位置**: `article.service.impl.ts` L116-129

```typescript
// 步骤 1: 创建版本快照
await prisma.articleVersion.create({ data: { ... } });
// 步骤 2: 更新文章（如果失败，版本快照成为孤儿数据）
const updated = await prisma.article.update({ where: { id }, data });
```

**问题**: 版本创建和文章更新不是原子操作。如果步骤 2 失败，版本快照已持久化但文章未更新。

**建议**: 使用 Prisma 交互式事务：

```typescript
await prisma.$transaction(async (tx) => {
  await tx.articleVersion.create({ data: { ... } });
  return tx.article.update({ where: { id }, data });
});
```

---

### M-4: API 设计不一致 — 职责模糊的端点

**严重度**: MEDIUM

| 端点 | HTTP 方法 | 职责 | 问题 |
|------|-----------|------|------|
| `/articles/:id` | PUT | 更新元数据 + 状态 | 一个端点做两件事 |
| `/articles/:id/content` | PUT | 更新正文 | 正确分离 |
| `/articles/:id/submit-review` | PUT | 提交审核 | 状态转换端点 |
| `/articles/:id/review` | PUT | 审核通过/拒绝 | 状态转换端点 |
| `/articles/:id/regenerate` | PUT | 重新生成 | 状态转换端点 |

**问题**:
1. `updateArticle` (PUT `/articles/:id`) 同时处理**元数据更新**和**状态转换**（如 status=generating），违反单一职责
2. 状态转换有三种入口：通过 `updateArticle` 的 `status` 字段、通过 `submitForReview`、通过 `reviewArticle` — 缺乏统一风格
3. `submitForReview` 和 `updateArticle({ status: 'pending_review' })` 可能产生相同效果（如果白名单允许），造成语义混淆

**建议**: 将 `updateArticle` 限制为仅更新元数据，状态转换统一通过专用端点处理。同时移除 `UPDATE_ALLOWED_FIELDS` 中的 `status` 字段。

---

## 四、代码质量度量

### 4.1 度量指标

| 指标 | 当前值 | 目标值 | 评价 |
|------|--------|--------|------|
| 文件行数 | 553 | < 300 | 偏高 |
| 导出函数数 | 10 | 10 | 合理 |
| 辅助函数数 | 5 | — | 合理 |
| 函数平均长度 | 38 行 | < 30 行 | 偏高 |
| 代码重复率 | ~22% | < 5% | 严重偏高 |
| 圈复杂度（updateArticle） | 12 | < 10 | 偏高 |
| 认知复杂度（updateArticle） | ~20 | < 15 | 偏高 |
| Zod Schema 覆盖率 | 5/5 | 5/5 | 优秀 |
| 安全防护层数 | 3 层 | ≥ 2 层 | 优秀 |

### 4.2 依赖关系图

```
article.controller.ts
  ├── article.service.impl.ts     (new ArticleServiceImpl — 硬编码实例)
  ├── project.service.impl.ts     (new ProjectServiceImpl — 硬编码实例)
  ├── article.schema.ts           (5 个 Zod schema)
  ├── errors.ts                   (NotFoundError, BusinessError)
  ├── utils/response.util.ts      (success, fail, paginate, created)
  └── express                     (Request, Response 类型)
```

**问题**: Controller 直接依赖 Service 实现类而非接口，违反 Dependency Inversion Principle。

---

## 五、架构改进建议路线图

### Phase 1: 消除冗余（1-2 天，低风险）

| 改进项 | 改动 | 影响 |
|--------|------|------|
| 移除 Controller 层 `safeParse` | 删除 ~30 行 | 消除双重验证 |
| 统一 `PermissionDeniedError` → `ForbiddenError` | 修改 ~15 行 | 消除异常孤岛 |
| Service 层统一 `NotFoundError` | 修改 ~10 行 | 修复异常类型不一致 |

### Phase 2: 提取公共模式（2-3 天，中风险）

| 改进项 | 改动 | 影响 |
|--------|------|------|
| 提取认证-授权中间件链 | 新增中间件，重写 handler | 消除 22% 重复 |
| Service 层提取 `getExisting()` | 重构 ~20 行 | 消除 DRY 违反 |
| 版本更新包裹事务 | 修改 service impl | 修复数据一致性 |

### Phase 3: 状态机重构（3-5 天，高风险）

| 改进项 | 改动 | 影响 |
|--------|------|------|
| 创建 `article.statemachine.ts` | 新模块 | 统一状态转换定义 |
| Service 使用 Prisma 条件更新 | 重构 service | 修复 TOCTOU |
| `updateArticle` 移除 status 字段 | 修改白名单 | API 职责单一化 |

---

## 六、正面评价

1. **纵深防御体系优秀**: Zod `.strict()` + `pickAllowedFields` + Service 层显式字段映射，三层防护确保字段注入防护无死角。这是项目中的**标杆实现**。

2. **类型化异常处理**: `handleServerError` 使用 `instanceof` 区分异常类型，比其他控制器的字符串匹配或 `err.message` 泄露方式安全得多。

3. **状态可编辑性分离**: `SETTINGS_EDITABLE_STATUSES` 与 `CONTENT_EDITABLE_STATUSES` 的区分设计合理，允许正文在更多状态下可编辑（如 `generate_failed`、`publish_failed`）。

4. **项目归属二次验证**: 每个 handler 的 `item.project_id !== projectId` 检查防止了 URL 参数篡改，这是 REST API 安全的基本要求。

5. **职责分离**: 审核者不能审核自己创建的文章（L410-413），正确实现了 SoD（Separation of Duties）。

6. **测试覆盖度高**: 4131 行测试代码覆盖了所有端点的正常路径、权限拒绝、参数校验和错误处理。

---

## 七、与其他控制器的架构对比

| 架构维度 | article.controller | company.controller | user.controller |
|----------|--------------------|--------------------|-----------------|
| 安全防护 | Zod + 白名单 + 状态机 | 无 Zod | 无 Zod |
| 错误处理 | 类型化异常 | 字符串匹配 | err.message 泄露 |
| 代码重复率 | ~22% | ~15% | ~18% |
| Controller 职责 | 偏重（含状态机） | 适中 | 适中 |
| Service 事务 | 无（但有版本快照） | 无 | 无 |
| DI 模式 | 模块级单例 | 模块级单例 | 模块级单例 |

**结论**: `article.controller.ts` 在安全性上是项目标杆，但在架构分层上是项目**典型代表** — 集中反映了项目级的 Controller Fat、无 DI、无事务等通用问题。

---

## 八、最终评审意见

**综合评级: B+（良好）**

从安全防护角度，本文件是 A- 级（优秀）。但从软件架构角度降为 B+，主要扣分项：

1. **Controller 承载了 6 项不属于它的职责**（认证、授权、验证、状态机、字段过滤、业务分支），导致 22% 代码重复和圈复杂度偏高
2. **状态机逻辑跨 3 个位置分散**，缺少声明式定义和原子性保证
3. **双重验证** 是过度防御的典型案例，增加了维护成本而非安全性
4. **Service 层异常类型不一致**，Controller 的 `handleServerError` 无法正确分类所有 Service 异常

**核心建议**: 以 Phase 1（消除冗余）为起点，逐步将 Controller 瘦身至 < 300 行，使状态机、授权逻辑分别沉淀到独立模块。当前代码**可安全使用**，但技术债需在下一迭代中规划偿还。

---

*软件架构专家评审完成 — 2026-05-24*
