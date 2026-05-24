# apis/controller/article.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 · 职责边界 · 扩展性 · 可测试性 · 一致性 · 架构原则）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 553 行（9 个导出函数 + 5 个模块级常量 + 4 个辅助函数 + 1 个自定义异常类）
**关联路由**: `apis/app.ts` 第 164-174 行，共 10 条路由绑定，均配置 `roleMiddleware('sysadmin', 'admin')`
**关联服务**: `apis/service/article.service.ts`（接口 `IArticleService`）→ `apis/service/impl/article.service.impl.ts`（实现 `ArticleServiceImpl`）
**关联服务**: `apis/service/project.service.ts`（接口 `IProjectService`）→ `apis/service/impl/project.service.impl.ts`（实现 `ProjectServiceImpl`）
**关联校验**: `apis/schema/article.schema.ts`（Zod Schema: create/update/review/list）
**关联实体**: `apis/entity/article.entity.ts`（Article, ArticleVersion, CreateArticleRequest, UpdateArticleRequest）
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate）

**前置评审**: 已有安全评审（`article.controller.md`，2026-05-23）、质量评审（`article.controller.ts.quality.md`，2026-05-24）。本评审聚焦架构层面，已确认的安全修复（状态机白名单、字段过滤、错误消息屏蔽）均已生效。

---

## 一、总体架构评估

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层合规性 | 7/10 | controller → service(interface) → service/impl → Prisma，分层清晰；引入 Zod schema 验证层，但 controller 仍承担业务规则 |
| 职责单一性 | 5/10 | controller 承担了权限检查、状态机校验、字段白名单、业务规则判断，违反 SRP |
| 依赖管理 | 4/10 | 模块顶层 `new` 两个具体实现类，违反依赖倒置原则（DIP），且未声明接口类型 |
| 一致性 | 7/10 | 9 个 handler 结构一致（参数校验 → 认证 → 权限 → 业务逻辑），但验证方式不完全统一 |
| 可测试性 | 4/10 | 无 DI 机制，权限逻辑与 handler 耦合，mock 必须劫持模块级实例 |
| 扩展性 | 5/10 | 新增 handler 需要复制完整的认证-权限-查询模板代码；状态机硬编码在 controller 中 |
| 授权架构 | 6/10 | 三层授权（路由 RBAC + controller operator 检查 + service 数据过滤）合理，但职责划分不清 |

**问题统计**: CRITICAL × 2 / HIGH × 4 / MEDIUM × 4 / LOW × 3

---

## 二、架构层面问题清单

### CRITICAL 级别

#### C-1: Handler 模板代码大规模重复 — 违反 DRY 原则的架构级问题

**位置**: 全部 9 个 handler 函数（`listArticles` 到 `listArticleVersions`）

**现状分析**:

9 个 handler 中有 7 个（除 `listArticles` 和 `listArticleVersions`）遵循完全相同的执行模板：

```
1. parseInt(projectId) + NaN 校验
2. parseInt(id) + NaN 校验                     ← 7 个 handler 重复
3. getAuthUser(req) → null 检查               ← 9 个 handler 重复
4. articleService.getById(id, userId, role)    ← 7 个 handler 重复
5. existing.project_id !== projectId 检查      ← 7 个 handler 重复
6. if (role === 'admin') → checkProjectOperator ← 8 个 handler 重复
7. PermissionDeniedError 区分处理               ← 8 个 handler 重复
8. 业务逻辑（各不相同）
9. handleServerError(err, ...)                 ← 9 个 handler 重复
```

以 `checkProjectOperator` 的 admin 分支为例，完全相同的代码块在 8 个 handler 中各出现一次（第 103-114、140-151、176-187、213-224、296-307、344-356、401-412、444-455、487-498 行），每处 9 行，共 **72 行完全重复代码**。

加上认证检查（`getAuthUser` → null 检查）的 3 行 × 9 = **27 行**，ID 解析校验的 3 行 × 7 = **21 行**，项目归属校验的 3 行 × 7 = **21 行**——**总计约 141 行模板重复代码**，占文件 553 行的 **25.5%**。

**架构影响**:

1. **维护成本指数增长**: 新增一个 handler 需要复制约 30 行模板代码。如果修改权限检查逻辑（如新增角色），需要同时修改 8+ 个位置。
2. **一致性风险**: 重复代码的细微差异可能是有意设计，也可能是遗漏。例如 `listArticles` 没有对 admin 做创建者检查，而 `updateArticle` 有——这是设计差异还是遗漏？
3. **违反 DRY 原则**: DRY 不只是代码重复，更是知识重复。权限检查的"知识"在 8 个位置各表达一次，修改一处时容易遗漏其他。

**修复建议**:

```typescript
// 方案 A: 提取公共中间件/高阶函数（推荐）
// 将重复的认证-授权-资源获取逻辑封装为高阶函数

type ArticleHandler = (
  req: Request,
  res: Response,
  ctx: { user: { userId: number; role: string }; existing?: Article }
) => Promise<void>;

function withArticleAuth(handler: ArticleHandler, options?: {
  requireId?: boolean;
  requireOwnership?: boolean;
  editableStatuses?: string[];
}) {
  return async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

      const user = getAuthUser(req);
      if (!user) { fail(res, 401, '未认证'); return; }

      let existing: Article | undefined;
      if (options?.requireId) {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }
        existing = await articleService.getById(id, user.userId, user.role);
        if (existing.project_id !== projectId) { fail(res, 404, '文章不存在'); return; }
      }

      if (user.role === 'admin') {
        try {
          await checkProjectOperator(projectId, user.userId, user.role);
        } catch (err) {
          if (err instanceof PermissionDeniedError) {
            fail(res, 403, err.message); return;
          }
          throw err;
        }
      }

      if (options?.requireOwnership && existing && user.role !== 'sysadmin') {
        if (existing.created_by !== user.userId) {
          fail(res, 403, '只能操作自己创建的文章'); return;
        }
      }

      await handler(req, res, { user, existing });
    } catch (err) {
      handleServerError(res, err, '操作失败');
    }
  };
}

// 使用示例 — handler 只写业务逻辑
export const updateArticle = withArticleAuth(async (req, res, ctx) => {
  const { existing, user } = ctx;
  if (!SETTINGS_EDITABLE_STATUSES.includes(existing!.status)) {
    fail(res, 400, '当前文章状态不可编辑'); return;
  }
  // ... 仅保留业务逻辑
}, { requireId: true, requireOwnership: true });
```

---

#### C-2: Controller 层承载业务逻辑 — 状态机、可编辑状态、字段白名单应在 Service 层

**位置**: 第 10-51 行（常量/辅助函数）+ 各 handler 中的业务判断

**问题代码**:

```typescript
// 业务规则 1: 可编辑状态白名单 — 应属于 Service 层
const SETTINGS_EDITABLE_STATUSES = ['draft'];                              // 第 10 行
const CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed']; // 第 11 行

// 业务规则 2: 状态转换白名单 — 应属于 Service 层
const STATUS_TRANSITIONS: Record<string, string[]> = {                     // 第 15-21 行
  'draft': ['generating', 'manual_writing'],
  // ...
};

// 业务规则 3: 允许更新/创建的字段白名单 — 应属于 Service 层
const UPDATE_ALLOWED_FIELDS = [...];                                       // 第 28-32 行
const CREATE_ALLOWED_FIELDS = [...];                                       // 第 35-38 行

// 业务规则 4: 内容长度限制 — 应属于 Service 层
const MAX_CONTENT_LENGTH = 500_000;                                        // 第 12 行
```

**架构分析**:

按照标准分层架构的职责分配：

| 层级 | 应有职责 | 当前实际承载 |
|------|----------|-------------|
| Controller | HTTP 协议适配（参数提取、响应格式化、状态码映射） | + 状态机校验、可编辑状态判断、字段白名单过滤、内容长度限制 |
| Service | 业务逻辑（业务规则、授权、状态转换） | 仅做数据存取 + 简单的存在性检查 |
| Service Impl | 数据访问（Prisma 查询） | 混合了版本快照逻辑 |

具体问题：

1. **`STATUS_TRANSITIONS` 是核心业务规则**: 状态机的合法转换是文章生命周期的核心知识，放在 controller 意味着如果未来有新的入口点（CLI、消息队列、定时任务）需要触发状态转换，必须复制这些常量。
2. **`SETTINGS_EDITABLE_STATUSES` / `CONTENT_EDITABLE_STATUSES`**: "哪种状态下可以编辑设置/内容"是业务规则，不是 HTTP 协议关注点。
3. **`MAX_CONTENT_LENGTH`**: 内容长度限制是数据约束，应与 Prisma schema 的字段长度约束一致。
4. **`pickAllowedFields` + `UPDATE_ALLOWED_FIELDS` / `CREATE_ALLOWED_FIELDS`**: 字段白名单是对数据模型的理解，属于 service 层的职责。
5. **`isValidStatusTransition`**: 状态转换合法性判断是纯业务逻辑。

当前架构下，如果新增一个 CLI 工具批量更新文章，必须将 controller 中的所有业务常量和判断逻辑复制到 CLI 工具中。

**修复建议**:

```typescript
// Service 层封装业务规则
class ArticleServiceImpl implements IArticleService {
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    'draft': ['generating', 'manual_writing'],
    'manual_writing': ['pending_review'],
    'generate_failed': ['generating'],
    'publish_failed': ['publishing'],
    'pending_review': ['publishing', 'draft', 'manual_writing'],
  };

  private static readonly SETTINGS_EDITABLE = ['draft'];
  private static readonly CONTENT_EDITABLE = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];
  private static readonly MAX_CONTENT = 500_000;

  async update(id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article> {
    const existing = await this.findOrThrow(id);

    // 状态转换校验 — 在 service 层执行
    if (request.status && !this.isValidTransition(existing.status, request.status)) {
      throw new BusinessError('非法的状态转换');
    }

    // 可编辑状态校验
    if (request.title !== undefined && !ArticleServiceImpl.SETTINGS_EDITABLE.includes(existing.status)) {
      throw new BusinessError('当前文章状态不可编辑设置');
    }

    // 内容长度校验
    if (request.content && request.content.length > ArticleServiceImpl.MAX_CONTENT) {
      throw new BusinessError(`正文内容不能超过${ArticleServiceImpl.MAX_CONTENT / 1000}KB`);
    }

    // ... 执行更新
  }
}

// Controller 层简化为纯协议适配
export async function updateArticle(req: Request, res: Response): Promise<void> {
  const { projectId, id } = parseArticleIds(req, res);
  if (!projectId || !id) return;

  const auth = getAuthContext(req, res);
  if (!auth) return;

  const parsed = updateArticleSchema.safeParse(req.body);
  if (!parsed.success) { fail(res, 400, formatZodError(parsed.error)); return; }

  try {
    const item = await articleService.update(id, parsed.data, auth);
    success(res, item, '更新文章成功');
  } catch (err) {
    handleServiceError(res, err);
  }
}
```

---

### HIGH 级别

#### H-1: 依赖倒置原则违反 — controller 直接依赖两个具体实现类，且缺少接口类型声明

**位置**: 第 2-8 行

```typescript
import { ArticleServiceImpl } from '../service/impl/article.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';

const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**架构分析**:

1. **双重 DIP 违反**: controller 同时直接依赖 `ArticleServiceImpl` 和 `ProjectServiceImpl`，导入路径穿越了 `service/` 接口层直达 `service/impl/`。
2. **类型推断为具体类**: TypeScript 将 `articleService` 推断为 `ArticleServiceImpl`，而非 `IArticleService`。controller 可以直接调用实现类的任何 public 方法，绕过接口契约。
3. **单一替换点缺失**: 如果 `ProjectServiceImpl` 的构造参数变化（如需要传入数据库连接），所有 controller 文件都需要修改。
4. **测试隔离困难**: 测试需要使用 `jest.mock('../service/impl/article.service.impl')` 劫持模块，这比依赖注入的 mock 复杂得多。

**修复建议**:

```typescript
import { IArticleService } from '../service/article.service';
import { IProjectService } from '../service/project.service';
import { ArticleServiceImpl } from '../service/impl/article.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';

const articleService: IArticleService = new ArticleServiceImpl();
const projectService: IProjectService = new ProjectServiceImpl();
```

---

#### H-2: 错误处理架构 — `handleServerError` 基于字符串匹配的异常分派仍是脆弱契约

**位置**: 第 69-79 行

```typescript
function handleServerError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof Error && err.message === '文章不存在') {
    fail(res, 404, err.message);
  } else if (err instanceof Error && err.message === '文章当前状态不支持审核操作') {
    fail(res, 400, err.message);
  } else if (err instanceof Error && err.message === '文章当前状态不支持重新生成') {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, contextMsg);
  }
}
```

**架构分析**:

相比之前安全评审时的 `err.message` 直接返回，已改进为不泄露内部错误信息。但核心架构问题——**基于字符串匹配的异常分派**——仍然存在：

1. **隐式契约**: service 层抛出的 3 个特定错误消息是 controller 和 service 之间的隐式契约。`article.service.impl.ts` 第 39、148、166 行分别硬编码了这些中文消息。如果 service 层改措辞（如"该文章不存在"），controller 的 catch 逻辑会静默失效，所有错误变为 500。
2. **散弹式修改**: 新增业务错误类型需要在 service 层抛出特定消息，同时在 `handleServerError` 添加匹配分支。
3. **违反 OCP**: 每新增一种错误类型都需修改 controller。
4. **一个 controller 一个 `handleServerError`**: 如果其他 controller 也有类似的错误类型，需要各自实现字符串匹配。

**修复建议**:

```typescript
// 引入类型化异常体系（全局共享）
class AppError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = this.constructor.name;
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource}不存在`, 404); }
}

class BusinessError extends AppError {
  constructor(message: string) { super(message, 400); }
}

class ForbiddenError extends AppError {
  constructor(message: string) { super(message, 403); }
}

// Service 层抛出类型化异常
if (!item) throw new NotFoundError('文章');
if (existing.status !== 'pending_review') throw new BusinessError('文章当前状态不支持审核操作');

// 统一错误处理中间件（app.ts 级别，所有 controller 共享）
function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('Unhandled error', err);
    fail(res, 500, '服务器内部错误');
  }
}

// Controller 不再需要 try-catch 和 handleServerError
```

---

#### H-3: TOCTOU 竞态条件 — 先读后写的时间窗口

**位置**: `updateArticle`（第 196-268 行）、`deleteArticle`（第 328-375 行）、`updateArticleContent`（第 270-326 行）、`reviewArticle`（第 377-425 行）、`regenerateArticle`（第 427-468 行）

**问题代码**:

```typescript
// updateArticle
const existing = await articleService.getById(id, userId, role);   // T1: 读取
// ... 基于 existing.status 做判断 ...
const item = await articleService.update(id, body, userId, role);  // T2: 写入（service 内部又查一次）

// deleteArticle
const existing = await articleService.getById(id, userId, role);   // T1: 读取
// ... 基于 existing.status 做判断 ...
await articleService.delete(id, userId, role);                     // T2: 删除（service 内部又查一次）
```

**架构分析**:

1. **状态判断过时**: 在 T1 到 T2 之间，另一个请求可能已经修改了文章状态。例如，用户 A 和用户 B 同时对同一篇 draft 文章发起操作：A 发起 `generating`，B 发起 `manual_writing`。两者都通过了 `SETTINGS_EDITABLE_STATUSES.includes(existing.status)` 检查，但只有一个应该成功。
2. **权限判断过时**: 在 T1 到 T2 之间，项目的 operator 列表可能已被修改。T1 时用户是 operator，T2 时已不是。
3. **service 层重复查询**: controller 调 `getById`（Prisma SELECT），service 的 `update`/`delete` 内部又做 `findFirst`（Prisma SELECT）。同一条记录被查两次，且两次查询不在同一事务中。

**修复建议**:

```typescript
// 在 service 层提供原子化的 getAndOperate 方法
async updateWithCheck(id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article> {
  return getPrisma().$transaction(async (tx) => {
    const existing = await tx.article.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('文章');

    // 在事务内做所有校验（状态、权限、状态转换）
    if (!ArticleServiceImpl.SETTINGS_EDITABLE.includes(existing.status)) {
      throw new BusinessError('当前文章状态不可编辑');
    }
    if (request.status && !this.isValidTransition(existing.status, request.status)) {
      throw new BusinessError('非法的状态转换');
    }

    // 在事务内执行更新
    const updated = await tx.article.update({ where: { id }, data: buildUpdateData(request) });
    return mapArticle(updated);
  });
}
```

---

#### H-4: 授权逻辑分散在 Controller 和 Service 两层 — 缺少统一的授权抽象

**位置**: 全文件（`checkProjectOperator` 第 60-66 行 + 各 handler 中的 `role === 'admin'` 分支）

**现状分析**:

授权检查分布在三层：

| 层级 | 检查内容 | 代码位置 |
|------|----------|----------|
| 路由层 (`app.ts`) | 角色白名单 `roleMiddleware('sysadmin', 'admin')` | app.ts 第 164-174 行 |
| Controller 层 | admin 的 operator 归属检查 + 创建者归属检查 | controller 第 103-114、227-230 行等 |
| Service 层 | admin 用户在 `list` 中的数据过滤 | service impl 第 19-20 行 |

但 **service 的 `getById` 方法不做任何权限过滤**（第 36-41 行直接 `findFirst`），这意味着：

1. **数据隔离完全依赖 controller**: 如果某个 handler 忘记调用 `checkProjectOperator`，admin 用户可以看到任何项目的文章。
2. **sysadmin 隐式无限制**: 所有 `if (role === 'admin')` 分支隐含了 sysadmin 不受限制的假设，但这个假设没有在接口层面声明。
3. **创建者检查不一致**: `updateArticle`、`updateArticleContent`、`deleteArticle` 有创建者检查（第 227、310、359 行），但 `regenerateArticle` 也有（第 458 行），而 `reviewArticle` 是**反向检查**（创建者不能审核，第 415 行），`listArticleVersions` 则**完全没有**创建者检查。

**授权检查一致性问题汇总**:

| Handler | Admin Operator 检查 | 创建者归属检查 | 创建者排除检查 |
|---------|---------------------|---------------|---------------|
| listArticles | 有 | 无 | 无 |
| getArticle | 有 | 无 | 无 |
| createArticle | 有 | N/A | N/A |
| updateArticle | 有 | 有 | 无 |
| updateArticleContent | 有 | 有 | 无 |
| deleteArticle | 有 | 有 | 无 |
| reviewArticle | 有 | 无 | 有（排除创建者） |
| regenerateArticle | 有 | 有 | 无 |
| submitForReview | 有 | 有 | 无 |
| listArticleVersions | 有 | **无** | 无 |

**修复建议**:

将授权逻辑统一到 service 层，通过 `AuthContext` 参数传递：

```typescript
interface AuthContext {
  userId: number;
  role: string;
}

// service 层统一处理授权
async getById(id: number, auth: AuthContext): Promise<Article> {
  const item = await this.findOrThrow(id);
  // 不做授权检查 — getById 是数据获取
  return item;
}

async update(id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article> {
  const existing = await this.findOrThrow(id);
  // 创建者或 sysadmin 可以修改
  if (auth.role !== 'sysadmin' && existing.createdBy !== auth.userId) {
    throw new ForbiddenError('只能修改自己创建的文章');
  }
  // ... 业务校验和更新
}
```

---

### MEDIUM 级别

#### M-1: `updateArticle` 与 `updateArticleContent` 端点职责重叠

**位置**: 第 196-268 行（`updateArticle`）vs 第 270-326 行（`updateArticleContent`）

**分析**:

两个端点都更新文章，但规则不同：

| 维度 | `updateArticle` | `updateArticleContent` |
|------|----------------|-----------------------|
| 可编辑状态 | `['draft']` | `['draft', 'manual_writing', 'generate_failed', 'publish_failed']` |
| 允许字段 | 12 个字段（白名单） | 仅 `content` |
| 内容长度限制 | Zod schema 限制 | 手动 `MAX_CONTENT_LENGTH` 检查 |
| 创建者检查 | 有 | 有 |

问题：

1. **`updateArticle` 的白名单包含 `content`**: `UPDATE_ALLOWED_FIELDS` 第 30 行包含 `content`，但 `updateArticle` 限制 `SETTINGS_EDITABLE_STATUSES = ['draft']`，所以 content 只能在 draft 状态通过 `updateArticle` 修改。而 `updateArticleContent` 允许更多状态修改 content。这种分割在语义上是合理的（设置 vs 内容），但增加了调用者的认知负担。
2. **两套内容长度校验**: `updateArticle` 通过 Zod schema（`z.string().max(500_000)`）校验 content，`updateArticleContent` 通过手动 `MAX_CONTENT_LENGTH` 校验。两个 500_000 是同一个值但表达方式不同。

**修复建议**:

将内容长度限制统一到 schema 层或 service 层，避免两处维护同一约束。

---

#### M-2: `PermissionDeniedError` 是局部定义，应全局共享

**位置**: 第 53-58 行

```typescript
class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}
```

**分析**:

1. **仅在 article.controller.ts 中定义**: 其他 controller（如 project.controller.ts）如果也需要 operator 归属检查，需要各自定义类似的异常类或使用不同的处理方式。
2. **与 `handleServerError` 耦合**: `handleServerError` 不处理 `PermissionDeniedError`，而是在每个 handler 中单独 catch。如果引入统一的错误处理中间件，这个局部类需要被全局共享。
3. **命名不够精确**: `PermissionDeniedError` 比 `ForbiddenError` 更口语化，不符合异常命名的惯例。

**修复建议**:

移到 `apis/errors/` 或 `apis/utils/` 目录下全局共享：

```typescript
// apis/errors/index.ts
export class AppError extends Error { ... }
export class NotFoundError extends AppError { ... }
export class BusinessError extends AppError { ... }
export class ForbiddenError extends AppError { ... }
```

---

#### M-3: `createArticle` 响应格式与其他 handler 不一致

**位置**: 第 190 行

```typescript
res.status(201).json({ code: 0, message: '创建文章成功', data: item });
```

**分析**:

其他 handler 使用 `success(res, item, '...')` 工具函数，但 `createArticle` 手动构造 201 响应。项目的 `apis/utils/response.util.ts` 已导出 `created()` 函数，但 controller 未导入使用。

**修复建议**:

```typescript
import { success, fail, paginate, created } from '../utils';
// ...
created(res, item, '创建文章成功');
```

---

#### M-4: `listArticleVersions` 缺少访问控制 — 任何项目的 operator 可查看任意文章版本

**位置**: 第 517-552 行

**分析**:

`listArticleVersions` 通过了 admin operator 检查，但没有任何创建者归属检查。理论上，同项目但非创建者的 admin operator 可以查看其他用户文章的版本历史（包含文章内容快照）。虽然从"项目内协作"的角度这可能是有意设计，但与 `getArticle`（也允许同项目 operator 查看）保持一致的同时，暴露了完整的版本内容历史。

**建议**: 确认业务需求是否允许项目内所有 operator 查看彼此的版本历史。如果是敏感内容，应增加创建者或项目级别的访问控制。

---

### LOW 级别

#### L-1: `getAuthUser` 辅助函数过于简单，价值有限

**位置**: 第 82-84 行

```typescript
function getAuthUser(req: Request): { userId: number; role: string } | null {
  return req.user ?? null;
}
```

**分析**: 这个函数只是做了 `req.user ?? null` 的包装。虽然在安全评审后引入了防御性检查，但 TypeScript 的 `req.user` 类型本身就是 `any`（Express 扩展），如果要做真正的防御应包含类型验证（如确认 `userId` 是 number、`role` 是 string）。当前实现只是避免 `!` 非空断言，但未提供类型安全保证。

---

#### L-2: 模块级服务实例的 import 副作用

**位置**: 第 7-8 行

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**分析**: 模块顶层创建服务实例意味着任何 `import` 此 controller 的代码（如测试文件 `jest.mock` 或 `app.ts` 注册路由）都会触发两个 service impl 的实例化。如果 service impl 构造函数中有昂贵操作（如建立数据库连接），会在模块加载时执行。当前 impl 构造函数为空，风险较低。

---

#### L-3: `VALID_CREATE_STATUSES` 已定义但未使用

**位置**: 第 40 行

```typescript
const VALID_CREATE_STATUSES = ['draft', 'manual_writing', 'generating'];
```

**分析**: 此常量在 controller 中定义但从未被引用。状态校验已通过 Zod schema `z.enum(['draft', 'generating', 'manual_writing'])` 实现（`article.schema.ts` 第 14 行）。属于遗留代码，应删除以避免混淆。

---

## 三、函数逐项架构评审

### 3.1 listArticles（第 86-121 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | 包含 admin operator 权限检查（应下沉到 service） |
| 参数验证 | ✅ | Zod schema 验证查询参数（page/pageSize/search/status） |
| 响应一致性 | ✅ | 使用 `paginate()` 标准响应 |
| 重复代码 | ⚠️ | admin 分支的 try-catch 模式与其他 handler 相同 |

### 3.2 getArticle（第 123-157 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | 包含 admin operator 权限检查 + project_id 归属校验 |
| 参数验证 | ✅ | projectId + id 双重 parseInt + NaN 校验 |
| 授权架构 | ⚠️ | 权限检查在 controller，不在 service |
| 错误映射 | ✅ | 使用 `handleServerError` 统一处理 |

### 3.3 createArticle（第 159-194 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 较为清晰：Zod 验证 → 白名单过滤 → service 调用 |
| 参数验证 | ✅ | Zod schema + `pickAllowedFields` 双重过滤 |
| 响应构造 | ❌ | 手动构造 201 响应，未用 `created()` |
| 一致性 | ⚠️ | `CREATE_ALLOWED_FIELDS` 与 `createArticleSchema` 存在重复定义 |

### 3.4 updateArticle（第 196-268 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ❌ | 包含状态机校验、可编辑状态判断、字段白名单 |
| TOCTOU | ❌ | 先 `getById` 后 `update`，两次查询非原子 |
| 业务逻辑 | ❌ | 状态转换白名单校验 + generating 分支的特殊处理 |
| 一致性 | ✅ | Zod 验证 + 白名单过滤 + 状态机校验三重防护 |

### 3.5 updateArticleContent（第 270-326 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | 内容长度限制是业务规则，应在 service 层 |
| 验证一致性 | ⚠️ | 手动验证 content 类型 + 长度，未使用 Zod schema |
| 重复代码 | ❌ | 与 `updateArticle` 重复了认证-权限-查询模板 |
| TOCTOU | ❌ | 先 `getById` 后 `update` |

### 3.6 deleteArticle（第 328-375 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | 已发布不可删除是业务规则 |
| TOCTOU | ❌ | 先 `getById` 后 `delete` |
| 一致性 | ⚠️ | 与 `updateArticle` 的权限检查模式相同 |

### 3.7 reviewArticle（第 377-425 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 较为清晰：Zod 验证 → 权限检查 → service 调用 |
| 授权检查 | ⚠️ | 创建者排除检查在 controller（应在 service） |
| 业务规则 | ⚠️ | service 层检查 status 必须为 pending_review（正确） |

### 3.8 regenerateArticle（第 427-468 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 较简单，主要是认证-权限-service 调用 |
| 重复代码 | ❌ | 认证-权限模板与其他 handler 完全相同 |
| 一致性 | ⚠️ | service 层检查 status 必须为 pending_review，但 controller 不知道这个约束 |

### 3.9 submitForReview（第 470-515 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ❌ | 状态约束 `status !== 'manual_writing'` 在 controller 判断 |
| 业务逻辑 | ❌ | 直接调用 `articleService.update(id, { status: 'pending_review' })` 而非专用方法 |
| 一致性 | ⚠️ | 与 `regenerateArticle` 类似但没有用 service 层的专用方法 |

### 3.10 listArticleVersions（第 517-552 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 纯查询，逻辑清晰 |
| 访问控制 | ⚠️ | 无创建者归属检查，同项目 operator 可查看所有版本 |
| 重复代码 | ❌ | 认证-权限模板重复 |

---

## 四、授权架构专项分析

### 当前授权模型

```
请求 → authMiddleware(JWT)
     → roleMiddleware(['sysadmin','admin'])
     → controller handler
         ↓
     getAuthUser(req) → null 检查
         ↓
     articleService.getById(id)   ← 不做授权
         ↓
     if (role === 'admin')
       checkProjectOperator()     ← controller 层做资源归属
         ↓
     if (role !== 'sysadmin' && existing.created_by !== userId)  ← controller 层做创建者归属
         ↓
     service.update() / service.delete()
```

### 问题总结

| 问题 | 影响范围 | 架构风险 |
|------|----------|----------|
| 授权检查分散在 controller + service 两层 | 全部 handler | 新增角色需修改多处 |
| `getById` 不做授权，数据隔离依赖 controller | get/update/delete/review/regenerate | 绕过 controller 直接调 service 会跳过授权 |
| 创建者归属检查不一致 | update vs listVersions | 权限模型语义不统一 |
| 无统一授权中间件 | 全局 | 每个 handler 手写 30+ 行授权代码 |
| sysadmin 隐式无限制 | 全部 handler | 靠 `if (role === 'admin')` 的 else 隐式放行 |

### 理想架构

```
请求 → authMiddleware → roleMiddleware → resourceAuthMiddleware → controller → service
                                                  ↓                              ↓
                                          统一资源归属检查              纯业务逻辑
                                          (owner/operator)            (无授权代码)
```

或更轻量的方案——将授权下沉到 service 层：

```
请求 → authMiddleware → roleMiddleware → controller → service
                                                               ↓
                                                   service 操作内统一做
                                                   角色检查 + 归属检查 + 业务校验
```

---

## 五、Controller 层代码量构成分析

| 代码类别 | 行数 | 占比 | 应有层级 |
|----------|------|------|----------|
| HTTP 协议适配（参数提取、响应格式化） | ~90 行 | 16% | Controller ✅ |
| 认证/授权检查（含重复模板） | ~180 行 | 33% | 中间件/Service ❌ |
| 业务规则（状态机、可编辑状态、字段白名单） | ~60 行 | 11% | Service ❌ |
| 输入验证（Zod 调用、parseInt） | ~50 行 | 9% | Controller ✅（Zod）/ Middleware |
| 常量/辅助函数定义 | ~50 行 | 9% | Service / Schema |
| 错误处理 | ~30 行 | 5% | Middleware |
| 空行/注释 | ~93 行 | 17% | — |

**Controller 层实际承载的业务逻辑约占 44%（认证授权 + 业务规则）**，远超 HTTP 协议适配的 16%。

---

## 六、与同类控制器的架构对比

| 架构维度 | article.controller | project.controller | company.controller |
|----------|--------------------|--------------------|--------------------|
| 代码行数 | 553 行 | 292 行 | ~180 行 |
| Handler 数量 | 9 个 | 5 个 | ~4 个 |
| 依赖注入 | `new Impl()` 无接口类型 | 同 | 同 |
| 授权模式 | controller 层 if-else + 创建者检查 | controller 层 if-else | controller 层 |
| 错误处理 | `handleServerError` 字符串匹配 | 字符串匹配 | 字符串匹配 |
| 参数校验 | Zod schema ✅ | 手写 if | 手写 if |
| 字段过滤 | 白名单 + Zod `.strict()` ✅ | 无 | 无 |
| 状态机 | 有白名单 ✅ | 无 | 无 |
| TOCTOU | 存在 | 存在 | 不涉及 |
| 响应构造 | 手动 201 ❌ | 手动 201 ❌ | 已用 `created()` ✅ |
| 重复代码量 | ~141 行 (25.5%) | ~80 行 (27%) | 较少 |

**结论**: article.controller 是所有控制器中安全防护最完善的（Zod schema + 字段白名单 + 状态机 + 错误消息屏蔽），但同时也是 **重复代码最多、controller 层业务逻辑最重** 的。安全加固的代价是增加了 controller 层的复杂度，这些复杂度应该下沉到 service 层。

---

## 七、修复优先级建议

### P0（立即修复 — 架构缺陷）

1. **C-1**: 提取公共 `withArticleAuth` 高阶函数或中间件，消除 141 行重复模板代码
2. **C-2**: 将 `STATUS_TRANSITIONS`、`SETTINGS_EDITABLE_STATUSES`、`CONTENT_EDITABLE_STATUSES`、`pickAllowedFields`、`MAX_CONTENT_LENGTH` 下沉到 service 层

### P1（尽快修复 — 架构质量）

3. **H-1**: 将 `articleService` 和 `projectService` 类型声明为接口类型（`IArticleService` / `IProjectService`）
4. **H-2**: 引入自定义异常类（`AppError` / `NotFoundError` / `BusinessError` / `ForbiddenError`）替代字符串匹配
5. **M-3**: 使用 `created()` 替代手动 201 响应构造
6. **M-2**: 将 `PermissionDeniedError` 移到全局共享的 `apis/errors/` 目录

### P2（计划修复 — 可维护性）

7. **H-3**: 评估 TOCTOU 风险，在 service 层引入事务包装关键操作
8. **H-4**: 统一授权检查策略，确定每个操作的归属检查规则并文档化
9. **M-1**: 统一 `updateArticle` 和 `updateArticleContent` 的内容长度校验方式

### P3（可选改进）

10. **L-3**: 删除未使用的 `VALID_CREATE_STATUSES` 常量
11. **M-4**: 确认 `listArticleVersions` 的访问控制需求
12. **L-1**: 增强 `getAuthUser` 的类型验证

---

## 八、总结

`article.controller.ts` 呈现出**"安全加固完成但架构债务累积"**的特征：

1. **安全防护是所有 controller 中最完善的**: 引入了 Zod schema 验证、字段白名单过滤、状态机转换校验、错误消息屏蔽、内容长度限制——这些修复直接回应了之前安全评审的 CRITICAL 和 HIGH 级别问题。

2. **但安全加固的代价由 controller 层承担**: 所有业务规则（状态机、可编辑状态、字段白名单）都实现在 controller 中，导致 controller 层代码量从安全评审前的 ~426 行膨胀到 553 行，新增的 127 行主要是安全加固代码。这些代码应该下沉到 service 层。

3. **重复代码是最大的架构债务**: 9 个 handler 中有 ~141 行（25.5%）是认证-授权-查询的模板代码。这不仅是维护成本问题，更是**一致性风险**——每个 handler 手写权限检查，任何遗漏都是一个安全漏洞。

4. **错误处理仍是架构短板**: 虽然改进为不泄露内部错误消息，但基于字符串匹配的异常分派机制在 service 层业务错误类型增多时会越来越脆弱。引入类型化异常体系是从根本上解决问题的路径。

**建议的演进路径**: `提取公共中间件/高阶函数（消除重复）` → `业务规则下沉到 service 层（明确职责）` → `引入类型化异常体系（统一错误处理）` → `声明接口类型（依赖倒置）`。每一步都是独立可交付的，不需要大爆炸重构。

---

*软件架构专家评审完成 — 2026-05-24*
