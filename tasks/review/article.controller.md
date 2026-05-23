# apis/controller/article.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 软件架构专家（分层架构 + 关注点分离 + 可扩展性 + 可测试性）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 426 行
**关联文件**: `apis/service/impl/article.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/utils/response.util.ts`, `apis/middleware/`
**严重级别**: CRITICAL(1) / HIGH(3) / MEDIUM(4) / LOW(3)

---

## 一、架构评价总览

文章控制器承载了 9 个 HTTP 端点处理函数，职责包括参数解析、权限控制、业务编排和响应格式化。从分层架构视角审视，该文件存在 **控制器层职责过重、横切关注点未抽取、依赖注入缺失** 三大架构问题。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层清晰度 | 3/10 | 控制器承担了本属于中间件/守卫层的权限、校验逻辑 |
| 关注点分离 | 3/10 | 参数解析、授权、业务规则、响应格式全部混在 handler 内 |
| 可扩展性 | 3/10 | 新增端点需复制粘贴大量重复模式，无复用基础设施 |
| 可测试性 | 4/10 | 模块级单例 + 无 DI，单元测试只能通过 jest.mock 模拟 |
| 依赖管理 | 3/10 | 硬编码依赖具体实现类，违反依赖倒置原则 |
| 一致性 | 6/10 | 9 个 handler 结构相似但存在不一致（如 createArticle 返回格式不同） |

---

## 二、问题清单

### CRITICAL-1: 控制器层职责严重越界，违反分层架构原则

**位置**: 全文 9 个 handler 函数
**问题**: 控制器承担了以下本不属于 HTTP 层的职责：

1. **授权逻辑**（第 33-40, 65-72, 98-105 行等）— admin 角色的项目操作员检查在 9 个 handler 中重复出现 9 次
2. **业务规则校验**（第 146-149, 204-207, 252-254, 376-379 行）— 状态可编辑性检查、文章状态转换规则属于 Service 层
3. **所有权检查**（第 140-143, 198-201, 246-249, 371-374 行）— `created_by !== userId` 检查是业务规则

**影响**: 控制器 426 行中有约 200 行是重复的授权/校验逻辑，真正的请求编排只占约一半。任何权限规则变更需要修改 9 个函数。

**建议**:

```
方案: 引入 Express 中间件链，按职责分层

路由层定义:
  router.get('/:projectId/articles',
    authMiddleware,           // JWT 解析
    projectAccessGuard,       // 项目访问权限（含 admin 操作员检查）
    articleOwnerGuard,        // 文章所有权检查（写操作）
    validate(listArticleSchema), // 请求参数校验
    articleController.list    // 纯粹的请求编排
  )

控制器职责收窄为:
  1. 从 req 提取已验证的参数
  2. 调用 service 方法
  3. 格式化响应
```

---

### HIGH-1: 无依赖注入，模块级硬编码单例

**位置**: 第 6-7 行

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**问题**:
- 控制器直接依赖具体实现类（`ArticleServiceImpl`），违反依赖倒置原则（DIP）
- 模块加载时创建实例，生命周期不可控
- 单元测试必须使用 `jest.mock()` 替换整个模块，无法注入 mock 实例
- Service 构造函数参数变化时，控制器必须同步修改

**建议**: 使用工厂函数或简单的 DI 容器：

```typescript
// 方案 A: 工厂函数（最小改动）
export function createArticleController(
  articleService: IArticleService,
  projectService: IProjectService
) {
  return {
    listArticles: async (req, res) => { /* ... */ },
    // ...
  }
}

// 方案 B: 类 + 构造注入
export class ArticleController {
  constructor(
    private articleService: IArticleService,
    private projectService: IProjectService
  ) {}
}
```

---

### HIGH-2: 横切关注点未抽取为中间件/守卫

**位置**: 每个函数中重复出现的以下模式

**模式 1 — 参数解析 + 校验**（出现 9 次）:
```typescript
const projectId = parseInt(req.params.projectId as string, 10);
const id = parseInt(req.params.id as string, 10);
if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }
```

**模式 2 — 项目操作员权限检查**（出现 9 次）:
```typescript
if (role === 'admin') {
  try {
    await checkProjectOperator(projectId, userId, role);
  } catch {
    fail(res, 403, '无权操作该项目');
    return;
  }
}
```

**模式 3 — 项目归属校验**（出现 7 次）:
```typescript
const existing = await articleService.getById(id, userId, role);
if (existing.project_id !== projectId) {
  fail(res, 404, '文章不存在');
  return;
}
```

**建议**: 每个模式抽取为独立中间件或参数装饰器：

```typescript
// middleware/paramParser.ts
export function parseIds(...names: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const name of names) {
      const val = parseInt(req.params[name], 10);
      if (isNaN(val)) { fail(res, 400, `无效的${labelMap[name]}`); return; }
      res.locals[name] = val;
    }
    next();
  };
}

// middleware/projectAccess.ts
export function requireProjectAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId, role } = req.user!;
    const projectId = res.locals.projectId;
    if (role === 'sysadmin') return next();
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
        return next();
      } catch { return fail(res, 403, '无权操作该项目'); }
    }
    next(); // view role — service 层通过 where 过滤
  };
}
```

---

### HIGH-3: 业务规则泄漏到控制器层

**位置**: 多处硬编码的业务状态规则

```typescript
// 第 9-10 行: 状态常量应来源于 Service/Domain 层
const SETTINGS_EDITABLE_STATUSES = ['draft'];
const CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];

// 第 90-93 行: 创建时的有效状态列表
if (status && !['draft', 'manual_writing', 'generating'].includes(status))

// 第 146-149 行: 设置可编辑性
if (!SETTINGS_EDITABLE_STATUSES.includes(existing.status))

// 第 204-207 行: 正文可编辑性
if (!CONTENT_EDITABLE_STATUSES.includes(existing.status))

// 第 376-379 行: 状态转换规则
if (existing.status !== 'manual_writing')
```

**问题**: 状态机规则分散在控制器中，与 Service 层的状态逻辑形成双重维护点。未来新增状态时，需要同时修改控制器常量和 Service 方法。

**建议**: 状态机规则收敛到 Service/Domain 层，控制器仅传递意图：

```typescript
// Service 层提供意图驱动方法
articleService.updateSettings(id, data, userId, role)  // 内部校验 status 可编辑性
articleService.updateContent(id, content, userId, role) // 内部校验 content 可编辑性
articleService.submitForReview(id, userId, role)        // 内部校验状态前置条件
```

---

### MEDIUM-1: 响应格式不一致

**位置**: 第 108 行 vs 其他所有 handler

```typescript
// createArticle — 自定义格式，不使用 success()
res.status(201).json({ code: 0, message: '创建文章成功', data: item });

// 其他所有 handler — 使用 success()
success(res, item, '更新文章成功');
```

**问题**: `success()` 工具函数内部可能设置 `code: 0`，但 `createArticle` 手动构造响应对象，存在格式不一致风险。如果 `success()` 的格式变更，`createArticle` 不会同步更新。

**建议**: 统一使用 `success()` 或 `created()` 工具函数：

```typescript
// 添加 created 响应工具
export function created(res: Response, data: any, message = '创建成功') {
  res.status(201).json({ code: 0, message, data });
}
```

---

### MEDIUM-2: 错误处理策略不统一

**位置**: 各 handler 的 catch 块

**问题**: 9 个 handler 的错误处理策略各不相同：

| Handler | 特殊错误处理 |
|---------|-------------|
| listArticles | 仅通用 500 |
| getArticle | 区分 '文章不存在' → 404 |
| createArticle | 仅通用 500 |
| updateArticle | 区分 '文章不存在' → 404 |
| updateArticleContent | 区分 '文章不存在' → 404 |
| deleteArticle | 区分 '文章不存在' → 404 |
| reviewArticle | 区分 '文章不存在' → 404 + 状态不支持 → 400 |
| regenerateArticle | 区分 '文章不存在' → 404 + 状态不支持 → 400 |
| submitForReview | 区分 '文章不存在' → 404 |

**建议**: 使用集中式错误映射或自定义错误类：

```typescript
// 方案: 自定义业务异常
class BusinessError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

// Service 层抛出
throw new BusinessError('文章不存在', 404);
throw new BusinessError('文章当前状态不支持审核操作', 400);

// 控制器统一处理
} catch (err) {
  if (err instanceof BusinessError) {
    fail(res, err.statusCode, err.message);
  } else {
    fail(res, 500, err.message || '操作失败');
  }
}
```

---

### MEDIUM-3: `req.user!` 非空断言不安全

**位置**: 第 30, 56, 95, 121 行等（9 处）

```typescript
const { userId, role } = req.user!;
```

**问题**: 非空断言 `!` 绕过了 TypeScript 的空值检查。如果认证中间件未正确挂载（如路由配置错误），运行时会抛出 `Cannot destructure property 'userId' of undefined`，错误信息不明确。

**建议**: 在控制器入口添加防御性检查或使用类型守卫：

```typescript
// 方案: auth 中间件保证 req.user 存在后，扩展 Express Request 类型
// types/express.d.ts 已声明 user 为可选，中间件应确保赋值
// 控制器中可添加:
if (!req.user) { fail(res, 401, '未认证'); return; }
const { userId, role } = req.user;
```

---

### MEDIUM-4: `checkProjectOperator` 额外查询数据库

**位置**: 第 12-18 行

```typescript
async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}
```

**问题**: 此函数在每次请求中额外调用 `projectService.getById()`，而后续 handler 中的 `articleService.getById()` 也会触发数据库查询。对于 getArticle、updateArticle 等已有 `articleService.getById` 调用的 handler，`checkProjectOperator` 产生了一次冗余的数据库查询。

**建议**: 在一次查询中获取 project + article 数据，或在中间件层缓存 project 信息：

```typescript
// 方案: 中间件层一次性获取 project 并挂载到 res.locals
export async function loadProjectContext(req: Request, res: Response, next: NextFunction) {
  const project = await projectService.getById(res.locals.projectId, req.user!.userId, req.user!.role);
  res.locals.project = project;
  next();
}
```

---

### LOW-1: 魔法字符串硬编码

**位置**: 多处

```typescript
// 角色字符串
role === 'sysadmin'  // 第 13, 140, 198, 246 行
role === 'admin'     // 第 33, 65, 98 行

// 状态字符串
status === 'generating'     // 第 153 行
existing.status === 'published' // 第 252 行
existing.status !== 'manual_writing' // 第 376 行
```

**建议**: 使用 Prisma 生成的枚举常量或统一常量文件：

```typescript
import { Role, ArticleStatus } from '@prisma/client';
if (role === Role.sysadmin) { /* ... */ }
if (existing.status === ArticleStatus.published) { /* ... */ }
```

---

### LOW-2: 函数签名过长且参数类型不明确

**位置**: 所有 handler 函数

```typescript
export async function listArticles(req: Request, res: Response): Promise<void> {
```

**问题**: 所有函数签名相同（`(req, res) => void`），无法从签名看出需要哪些参数、返回什么数据。Express 的 `Request/Response` 是通用的 HTTP 类型，不携带业务语义。

**建议**: 虽然这是 Express 的固有模式，但可以通过扩展 Request 类型改善：

```typescript
interface ArticleRequest extends Request {
  params: { projectId: string; id: string };
  query: { page?: string; pageSize?: string; search?: string; status?: string };
  user: { userId: number; role: string };
}
```

---

### LOW-3: 缺少 Handler 函数的统一导出契约

**位置**: 文件末尾

**问题**: 9 个 handler 函数独立导出，路由注册时需要逐个引用。没有统一的控制器对象或命名空间，增加了路由配置的维护成本。

**建议**: 聚合为控制器对象或使用类：

```typescript
export const articleController = {
  list: listArticles,
  get: getArticle,
  create: createArticle,
  update: updateArticle,
  updateContent: updateArticleContent,
  delete: deleteArticle,
  review: reviewArticle,
  regenerate: regenerateArticle,
  submitForReview: submitForReview,
  listVersions: listArticleVersions,
};
```

---

## 三、架构改进路线图

### 短期（低风险，可立即执行）

1. **统一响应格式** — `createArticle` 改用 `created()` 工具函数
2. **替换魔法字符串** — 引用 Prisma 枚举常量
3. **添加 `req.user` 防御检查** — 替代非空断言

### 中期（中等风险，需测试覆盖）

4. **抽取中间件链** — 参数解析、项目访问、文章归属各为独立中间件
5. **引入自定义错误类** — 统一错误映射策略
6. **状态机规则下沉到 Service** — 控制器仅传递意图

### 长期（需架构评审）

7. **引入依赖注入** — 控制器通过构造函数接收 Service 实例
8. **请求验证层** — 使用 Zod schema 定义请求/响应类型，替代手动校验
9. **控制器类化** — 聚合 handler 为 ArticleController 类，支持方法级中间件

---

## 四、推荐重构后的控制器结构

```
apis/
├── controller/
│   └── article.controller.ts          ← 纯编排层（~100行）
├── middleware/
│   ├── auth.ts                         ← 已有
│   ├── paramParser.ts                  ← 新增: ID 解析 + 校验
│   ├── projectAccess.ts                ← 新增: 项目访问权限守卫
│   └── articleOwner.ts                 ← 新增: 文章所有权守卫
├── routes/
│   └── article.routes.ts              ← 新增: 路由定义 + 中间件组合
├── errors/
│   └── business.ts                     ← 新增: BusinessError 类
└── service/
    └── impl/
        └── article.service.impl.ts     ← 承接状态机规则
```

**重构后的 handler 示例**:

```typescript
// article.controller.ts — 重构后
export async function listArticles(req: Request, res: Response): Promise<void> {
  const { projectId } = res.locals;
  const { page, pageSize, search, status } = req.query;
  const { userId, role } = req.user!;

  const { list, total } = await articleService.list(
    projectId, page, pageSize, search, status, userId, role
  );
  paginate(res, list, total, page, pageSize);
}

export async function updateArticle(req: Request, res: Response): Promise<void> {
  const { id } = res.locals;
  const { userId, role } = req.user!;

  const item = await articleService.update(id, req.body, userId, role);
  success(res, item, '更新文章成功');
}
```

---

## 五、总结

该控制器当前的架构问题是典型的 **"胖控制器"反模式** — 426 行代码中约 50% 是重复的横切关注点（参数解析、权限检查、错误处理），仅 50% 是真正的请求编排逻辑。

核心改进方向:
1. **控制器瘦身**: 通过中间件链消除重复代码，目标降至 ~150 行
2. **依赖倒置**: 依赖接口而非实现，提升可测试性
3. **规则下沉**: 业务规则（状态机、可编辑性）归属 Service 层

按优先级排序: CRITICAL-1 > HIGH-2 > HIGH-3 > HIGH-1 > MEDIUM-1~4 > LOW-1~3
