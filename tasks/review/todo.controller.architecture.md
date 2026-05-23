# apis/controller/todo.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 · 职责边界 · 扩展性 · 可测试性 · 一致性 · 架构原则）
**文件路径**: `apis/controller/todo.controller.ts`
**代码行数**: 269 行（10 个导出函数 + 2 个模块级服务实例）
**关联路由**: `apis/app.ts` 第 188-198 行，共 11 条路由绑定，均配置 `roleMiddleware('sysadmin', 'admin')`
**依赖图**:

```
app.ts (路由注册 + 中间件编排)
  └─ todo.controller.ts (HTTP 请求/响应处理)
       ├─ TodoServiceImpl (业务逻辑, 模块级单例) ─── ❌ 仅 8/10 端点使用
       │    └─ Prisma Client (数据访问)
       ├─ ProjectServiceImpl (项目权限校验, 模块级单例)
       │    └─ Prisma Client (数据访问)
       ├─ getPrisma() ─── ❌ Controller 层直接调用 (2 个端点)
       ├─ response.util.ts (响应工具函数)
       └─ Express Request/Response
```

**关联服务**: `apis/service/todo.service.ts`（接口 `ITodoService`）→ `apis/service/impl/todo.service.impl.ts`（实现 `TodoServiceImpl`）
**关联实体**: `apis/entity/todo.entity.ts`（Todo, TodoLog, CreateTodoRequest, UpdateTodoRequest, TransferTodoRequest）
**关联映射**: `apis/map/index.ts` — `mapTodo()`, `mapTodoLog()`
**严重级别**: CRITICAL(2) / HIGH(4) / MEDIUM(4) / OBSERVATION(3)

---

## 一、总体架构评估

待办管理控制器包含 10 个 HTTP 端点处理函数，覆盖待办 CRUD（list/get/create/update）、状态流转（close/reopen/transfer/reject）、操作日志（getLogs）和辅助查询（getObjectOptions/getAssigneeCandidates）。

从架构视角审视，该文件的核心问题是 **分层架构违规**：`getObjectOptions` 和 `getAssigneeCandidates` 两个函数在 Controller 层直接操作 Prisma Client，绕过 Service 层，形成"双数据访问模式"。这在项目所有 Controller 中是 **独一无二** 的架构缺陷。其余 8 个端点遵循标准的 Controller→Service→Prisma 三层架构，结构合理。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层合规性 | 5/10 | 8/10 端点遵循分层，2/10 端点 Controller 直接操作 Prisma — 项目内最严重的分层违规 |
| 职责单一性 | 6/10 | Controller 承担了数据访问（getObjectOptions/getAssigneeCandidates）+ 权限检查 + HTTP 适配 |
| 依赖管理 | 4/10 | 模块级硬编码单例，无 DI，`getPrisma()` 直接在 Controller 中调用 |
| 一致性 | 4/10 | 同一文件内两种数据访问模式、两种响应构造方式、两种 parseInt 风格并存 |
| 可测试性 | 4/10 | Controller 直接依赖 Prisma 的端点需 mock `getPrisma()`，复杂度高于 mock Service 接口 |
| 扩展性 | 5/10 | 新增待办类型或查询端点时需决定走 Service 还是直接 Prisma，无统一模式可循 |
| 授权架构 | 6/10 | 路由层 RBAC + Controller 层 tab 权限 + Service 层所有权检查，分层合理但职责分散 |

---

## 二、架构层面问题清单

### CRITICAL 级别

#### C-1: Controller 层直接操作 Prisma — 严重违反分层架构

**位置**: `getObjectOptions` 第 162-218 行、`getAssigneeCandidates` 第 220-268 行

**问题代码**:

```typescript
// getObjectOptions — Controller 直接获取 Prisma 实例并执行查询
export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  // ...
  const prisma = getPrisma();  // ❌ 绕过 Service 层
  const items = await prisma.article.findMany({ ... });  // ❌ Controller 直接查询数据库
  const kbs = await prisma.knowledgeBase.findMany({ ... });  // ❌ Controller 直接查询
  const items = await prisma.knowledgeKeyword.findMany({ ... });  // ❌ Controller 直接查询
}

// getAssigneeCandidates — 同样绕过 Service 层
export async function getAssigneeCandidates(req: Request, res: Response): Promise<void> {
  // ...
  const prisma = getPrisma();  // ❌ 绕过 Service 层
  const project = await prisma.project.findUnique({ ... });  // ❌ Controller 直接查询
  const users = await prisma.user.findMany({ ... });  // ❌ Controller 直接查询
}
```

**架构影响分析**:

```
当前架构 — 双数据访问模式:

  8 个端点遵循:
    Controller → ITodoService → TodoServiceImpl → Prisma Client ✅

  2 个端点违规:
    Controller → getPrisma() → Prisma Client ❌ (绕过 Service 层)
    Controller → ProjectServiceImpl → Prisma Client (仅用于权限检查)

期望架构 — 统一数据访问:

  Controller → ITodoService → TodoServiceImpl → Prisma Client ✅
  Controller → IProjectService → ProjectServiceImpl → Prisma Client ✅
```

具体影响：

1. **架构一致性破坏**: 同一 Controller 内两种数据访问模式并存，违反项目的 Controller→Service→Prisma 架构约定
2. **ITodoService 接口不完整**: `getObjectOptions` 和 `getAssigneeCandidates` 的业务逻辑不在 Service 接口中定义，接口无法反映完整的系统能力
3. **可测试性降低**: 测试这两个端点必须 mock `getPrisma()`（全局单例），而其余 8 个端点只需 mock `todoService`，测试策略不统一
4. **跨表查询无事务保护**: `getObjectOptions` 中 `keyword` 分支先查 `knowledgeBase` 再查 `knowledgeKeyword`，两步查询无事务保护，中间可能发生数据变更
5. **职责混乱**: Controller 承担了数据组装（article → `{id, name}`）、类型分发（objectType if-else）、去重（Set）等本应由 Service 处理的逻辑
6. **Prisma 模型泄漏**: Controller 直接依赖 `prisma.article`、`prisma.knowledgeBase`、`prisma.knowledgeKeyword`、`prisma.project`、`prisma.user` 五个 Prisma 模型，Controller 与数据库 schema 产生紧耦合

**项目模式对比**:

| Controller | 直接操作 Prisma | 遵循分层 |
|------------|----------------|---------|
| auth.controller | 0/8 | 8/8 |
| company.controller | 0/5 | 5/5 |
| project.controller | 0/5 | 5/5 |
| knowledge.controller | 0/8 | 8/8 |
| **todo.controller** | **2/10** | **8/10** |
| publishing-platform.controller | 0/6 | 6/6 |

**todo.controller 是项目所有 Controller 中唯一在 Controller 层直接操作 Prisma 的模块。**

**修复建议**: 将数据访问逻辑下沉到 Service 层，扩展 `ITodoService` 接口：

```typescript
// apis/service/todo.service.ts — 扩展接口
export interface ITodoService {
  // ...现有方法...
  getObjectOptions(params: {
    projectId: number;
    objectType: string;
    action: string;
  }): Promise<{ id: number; name: string }[]>;

  getAssigneeCandidates(projectId: number): Promise<{
    id: number; username: string; cn_name: string; role: string;
  }[]>;
}

// apis/controller/todo.controller.ts — 精简为纯 HTTP 适配
export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.query.projectId as string, 10);
    const objectType = req.query.objectType as string;
    const action = req.query.action as string;
    if (!projectId || !objectType) { fail(res, 400, '缺少必要参数'); return; }

    // 权限检查委托给 Service 层或保留在 Controller（取决于项目约定）
    await ensureProjectAccess(projectId, req.user!);

    const items = await todoService.getObjectOptions({ projectId, objectType, action });
    success(res, items);
  } catch (err: unknown) {
    handleServiceError(res, err, '获取操作对象失败');
  }
}
```

**优先级**: P0 — 项目架构一致性的关键缺陷

---

#### C-2: 双数据访问模式并存 — 架构一致性系统性破坏

**位置**: 全文件

**架构对比**:

```
模式 A — 8 个端点遵循（标准分层）:
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐
│  Controller  │────>│  ITodoService │────>│ TodoServiceImpl  │
│ (HTTP 适配)  │     │   (接口抽象)   │     │ (Prisma 数据访问) │
└─────────────┘     └───────────────┘     └─────────────────┘

模式 B — 2 个端点使用（分层违规）:
┌─────────────┐     ┌─────────────────┐
│  Controller  │────>│  Prisma Client   │  ← 绕过 Service 层
│ (HTTP 适配   │     │ (article/kb/kw/ │
│  + 业务逻辑  │     │  project/user)  │
│  + 数据访问)  │     └─────────────────┘
└─────────────┘
```

**架构风险**:

1. **模式选择困境**: 新增查询端点时，开发者需决定走模式 A 还是模式 B，无明确规范指导
2. **重构阻力**: 双模式导致重构范围不确定 — 仅重构 Service 层影响不到模式 B 的端点
3. **新成员困惑**: 同一文件内两套数据访问模式增加认知负担

**影响范围**: 2 个端点，约 107 行代码（占总代码量 40%）

**优先级**: P0 — 与 C-1 同源，修复 C-1 后自动解决

---

### HIGH 级别

#### H-1: 依赖倒置原则违反 — Controller 直接依赖具体实现类

**位置**: 第 2-3 行、第 7-8 行

```typescript
import { TodoServiceImpl } from '../service/impl/todo.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';

const todoService = new TodoServiceImpl();     // 具体类依赖
const projectService = new ProjectServiceImpl(); // 具体类依赖
```

**架构分析**:

```
当前依赖方向:
  Controller ──(具体类依赖)──> TodoServiceImpl ──> Prisma Client
  Controller ──(具体类依赖)──> ProjectServiceImpl ──> Prisma Client

期望依赖方向（DIP）:
  Controller ──(接口依赖)──> ITodoService <──(实现)── TodoServiceImpl
  Controller ──(接口依赖)──> IProjectService <──(实现)── ProjectServiceImpl
```

项目已定义 `ITodoService`（10 个方法签名）和 `IProjectService` 接口，但 Controller 导入的是具体实现类。这意味着：

1. **类型声明缺失**: `todoService` 类型被推断为 `TodoServiceImpl`，Controller 可访问实现类上未在接口中定义的方法
2. **测试需 mock 模块**: 无法通过构造函数注入 mock，必须使用 `jest.mock('../service/impl/todo.service.impl')`
3. **替换成本高**: 若需切换实现（如添加缓存装饰器代理），必须修改 Controller 导入路径

**修复建议**（最小改动）:

```typescript
import { ITodoService } from '../service/todo.service';
import { IProjectService } from '../service/project.service';
import { TodoServiceImpl } from '../service/impl/todo.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';

const todoService: ITodoService = new TodoServiceImpl();
const projectService: IProjectService = new ProjectServiceImpl();
```

**优先级**: P2 — 项目通用模式，建议统一重构

---

#### H-2: 无统一异常体系 — Controller 与 Service 通过字符串形成隐式契约

**位置**: 第 49、74、89、105、122、138、154 行（共 7 个 catch 块）

**现状**:

```typescript
// Controller 层 — 字符串精确匹配
catch (err: any) {
  if (err.message === '待办不存在') {  // 隐式契约
    fail(res, 404, err.message);
  } else {
    fail(res, 400, err.message || '操作失败');  // ❌ err.message 可能泄露 Prisma 错误
  }
}

// Service 层 — 抛出字符串消息 (todo.service.impl.ts)
throw new Error('待办不存在');     // 第 95、141、177、212、247、290、342 行 — 共 7 处
throw new Error('已关闭的待办不能修改');   // 第 144 行
throw new Error('只能修改自己负责的待办'); // 第 149 行
throw new Error('只有处理中的待办可以关闭'); // 第 179 行
```

**架构影响**:

```
Service 层错误传播路径:

  Service.throw Error('待办不存在')
    → Controller.catch (err: any)
      → 字符串匹配 err.message === '待办不存在'
        → 匹配成功 → 404
        → 匹配失败 → err.message 直接暴露给客户端

  Service.throw Error('已关闭的待办不能修改')
    → Controller.catch (err: any)
      → 不匹配 '待办不存在'
        → fail(res, 400, err.message)  // 业务异常正确映射到 400

  Service.throw Prisma.PrismaClientKnownRequestError  // 数据库异常
    → Controller.catch (err: any)
      → 不匹配 '待办不存在'
        → fail(res, 400, err.message)  // ❌ 数据库错误信息泄露
```

**项目模式对比**:

| Controller | 异常识别方式 | 类型安全 |
|------------|------------|---------|
| auth.controller | `instanceof LoginSelectionError` + 字符串 | 部分类型安全 |
| todo.controller | 纯字符串匹配（7 处） | 无类型安全 |
| 其他所有 Controller | 纯字符串匹配 | 无类型安全 |

**修复建议**: 引入分层异常体系（项目级统一重构）：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) { super(`${entity}不存在`); this.name = 'NotFoundError'; }
}
export class BusinessError extends Error {
  readonly statusCode = 400;
  constructor(message: string) { super(message); this.name = 'BusinessError'; }
}
export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) { super(message); this.name = 'ForbiddenError'; }
}

// Service 层抛出类型化异常
if (!item) throw new NotFoundError('待办');
if (existing.status === 'closed') throw new BusinessError('已关闭的待办不能修改');

// Controller 层统一错误映射
catch (err: unknown) {
  if (err instanceof NotFoundError) fail(res, 404, err.message);
  else if (err instanceof BusinessError) fail(res, 400, err.message);
  else if (err instanceof ForbiddenError) fail(res, 403, err.message);
  else fail(res, 500, '操作失败');
}
```

**优先级**: P1 — 随业务异常类型增加，当前模式维护成本持续上升

---

#### H-3: 授权职责分散 — 三层授权检查无统一抽象

**位置**: 路由层 + Controller 层 + Service 层

**授权分布矩阵**:

| 授权检查 | 执行层级 | 位置 | 检查内容 |
|----------|---------|------|----------|
| 角色白名单 | 路由层 (`app.ts`) | 第 188-198 行 | `roleMiddleware('sysadmin', 'admin')` |
| tab 权限 | Controller 层 | 第 19-21 行 | `all_open`/`all_closed` 仅 sysadmin |
| 项目访问权限 | Controller 层 | 第 174-180、226-232 行 | `project.operator_ids.includes(userId)` |
| 待办所有权 | Service 层 | service impl 第 147-149 行 | `existing.assigneeId !== userId` |
| 驳回权限 | Service 层 | service impl 第 295-297 行 | `role !== 'sysadmin'` |

**架构分析**:

```
当前授权模型:

  HTTP 请求
    → roleMiddleware(['sysadmin','admin'])  ← 层1: 角色白名单
    → Controller handler
        → if (tab === 'all_*' && role !== 'sysadmin') fail(403)  ← 层2: tab 权限
        → await projectService.getById() + operator_ids.includes()  ← 层3: 项目权限
        → Service 内部
            → if (role !== 'sysadmin' && assigneeId !== userId) throw  ← 层4: 所有权

问题: 授权逻辑散布在 4 个位置，新增角色或权限规则时修改面广
```

**特别关注 — Service 层授权不一致**:

| 方法 | 授权模式 |
|------|---------|
| `close` | sysadmin 无限制 + admin 仅自己的 |
| `reopen` | sysadmin 无限制 + admin 仅自己的 |
| `update` | sysadmin 无限制 + admin 仅自己的 |
| `transfer` | sysadmin 无限制 + admin 仅自己的 |
| `reject` | **仅 sysadmin**（admin 完全无权限） |
| `list` | sysadmin 可看全部 + admin 仅本公司 |
| `getById` | **无任何授权检查** |

`getById` 无授权检查意味着任何已通过路由层 `roleMiddleware('sysadmin', 'admin')` 的用户可以查看任何待办的详情，包括其他公司的待办。这可能是有意设计（待办详情页需要访问），但与 `list` 方法的公司隔离策略不一致。

**修复建议**: 将授权检查统一下沉到 Service 层，Controller 仅传递授权上下文：

```typescript
// Service 层统一处理
interface AuthContext { userId: number; role: string; companyId?: number; }

async getById(id: number, auth: AuthContext): Promise<Todo> {
  const item = await this.findOrThrow(id);
  // 非 sysadmin 只能查看自己公司的待办
  if (auth.role !== 'sysadmin' && item.company_id !== auth.companyId) {
    throw new ForbiddenError('无权查看该待办');
  }
  return item;
}
```

**优先级**: P1 — 当前不构成安全漏洞（路由层已限 sysadmin/admin），但授权架构不清晰

---

#### H-4: getAssigneeCandidates 重复查询同一张表 — TOCTOU + 性能浪费

**位置**: 第 226-239 行

```typescript
// 第一次查询 — 通过 projectService.getById() 检查权限
if (req.user!.role !== 'sysadmin') {
  const project = await projectService.getById(projectId, req.user!.userId, req.user!.role);
  // projectService.getById 内部: prisma.project.findFirst({ include: { operators, company, viewers } })
  if (!project.operator_ids.includes(req.user!.userId)) {
    fail(res, 403, '无权访问该项目');
    return;
  }
}

// 第二次查询 — 通过 prisma 直接获取运营者列表
const prisma = getPrisma();
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: { operators: { select: { userId: true } } },
});
// ...
const operatorIds = project.operators.map(o => o.userId);
const users = await prisma.user.findMany({ ... });  // 第三次查询
```

**架构分析**:

```
执行流程:
  1. projectService.getById(projectId)
     → Prisma SELECT project + operators + company + viewers (查询1)
     → 返回完整 Project 对象

  2. prisma.project.findUnique({ include: operators })
     → Prisma SELECT project + operators (查询2 — 重复！)

  3. prisma.user.findMany(...)
     → Prisma SELECT users (查询3)

总计: 3 次数据库查询，其中 1 次完全冗余
```

这是 C-1（Controller 直接操作 Prisma）的直接后果。若将整个逻辑移入 Service 层，三次查询可优化为：

```
优化后:
  1. prisma.project.findUnique({ include: { operators } })
     → 同时完成: 存在性检查 + 权限检查 + 获取运营者 ID (查询1)

  2. prisma.user.findMany({ where: { OR: [{ id: { in: operatorIds } }, { role: 'sysadmin' }] } })
     → 获取候选人列表 (查询2)

总计: 2 次数据库查询，无冗余
```

此外，两次查询之间存在 TOCTOU 时间窗口：在权限检查通过后、实际查询运营者列表前，项目的运营者可能已被其他请求修改。

**优先级**: P1 — 修复 C-1 后自动解决

---

### MEDIUM 级别

#### M-1: ITodoService 接口不完整 — 辅助查询方法未纳入接口契约

**位置**: `apis/service/todo.service.ts`

**当前接口定义**:

```typescript
export interface ITodoService {
  list(...): Promise<...>;
  getById(id: number): Promise<Todo>;
  create(...): Promise<Todo>;
  update(...): Promise<Todo>;
  close(...): Promise<Todo>;
  reopen(...): Promise<Todo>;
  transfer(...): Promise<Todo>;
  reject(...): Promise<Todo>;
  getLogs(todoId: number): Promise<TodoLog[]>;
  // ❌ 缺少: getObjectOptions
  // ❌ 缺少: getAssigneeCandidates
}
```

`getObjectOptions` 和 `getAssigneeCandidates` 的业务逻辑完全在 Controller 层实现，未纳入 Service 接口。这意味着：

1. **接口不能代表完整能力**: `ITodoService` 无法描述待办模块的全部数据访问能力
2. **无法编写 Service 层单元测试**: 两个查询的数据组装逻辑只能在 Controller 集成测试中覆盖
3. **无法替换实现**: 若需缓存查询结果或切换数据源，无接口可替换

**修复建议**: 将方法签名加入 `ITodoService` 接口，实现在 `TodoServiceImpl` 中。

**优先级**: P1 — 与 C-1 同步修复

---

#### M-2: createTodo 响应格式绕过统一契约

**位置**: 第 59-60 行

```typescript
// createTodo — 手动构造 201 响应
res.status(201).json({ code: 0, message: '待办创建成功', data: item });

// 其余 9 个端点 — 使用 response.util.ts 工具函数
success(res, item, '更新待办成功');
paginate(res, list, total, page, pageSize);
```

**架构影响**:

项目在 `response.util.ts` 中定义了统一响应契约：

```typescript
success()  → { code: 0, message, data }     HTTP 200
created()  → { code: 0, message, data }     HTTP 201  ← 已存在但未使用
fail()     → { code, message }              HTTP 4xx/5xx
paginate() → { code: 0, data: { list, total, page, pageSize } }  HTTP 200
```

`createTodo` 手动构造响应体绕过了 `created()` 工具函数。虽然当前两者输出格式一致，但若将来响应格式变更（如添加 `timestamp`），手动构造处不会同步更新。

**修复建议**:

```typescript
import { success, fail, created, paginate } from '../utils';
// ...
created(res, item, '待办创建成功');
```

**优先级**: P2 — 低成本高收益

---

#### M-3: req.body 整体传入 Service — 过度传递（Over-posting）风险

**位置**: 第 59、69、119 行

```typescript
const item = await todoService.create(req.body, req.user!.userId);          // ❌ req.body 整体传入
const item = await todoService.update(id, req.body, req.user!.userId, ...); // ❌
const item = await todoService.transfer(id, req.body, req.user!.userId, ...); // ❌
```

**架构分析**:

```
当前数据流:
  req.body (any) → Service.create(request: CreateTodoRequest)
  TypeScript 类型仅在编译时检查，运行时 req.body 可包含任意字段

推荐数据流:
  req.body (any) → Controller 验证 + 构造 DTO → Service.create(dto: CreateTodoRequest)
```

虽然 Service 层通过显式字段赋值（`data.title = request.title`）避免了实际的批量赋值漏洞，但 Controller 不做 DTO 构造导致：

1. **隐式依赖**: Controller 不清楚 Service 实际使用了哪些字段
2. **接口模糊**: 传入未经构造的 `req.body`，而非明确的类型安全对象
3. **额外字段透传**: `req.body` 中可能包含 `id`、`status`、`createdById` 等不应由客户端设置的字段

**修复建议**:

```typescript
const request: CreateTodoRequest = {
  title: req.body.title,
  company_id: req.body.company_id,
  project_id: req.body.project_id,
  object_type: req.body.object_type,
  object_id: req.body.object_id,
  action: req.body.action,
  source: req.body.source,
  priority: req.body.priority,
  assignee_id: req.body.assignee_id,
  due_at: req.body.due_at,
};
const item = await todoService.create(request, req.user!.userId);
```

**优先级**: P2 — 当前无安全风险（Service 层显式赋值），但属于不良实践

---

#### M-4: 验证逻辑嵌入 Controller — 缺少统一验证层

**位置**: 全文件

**当前验证模式**:

```typescript
// 模式 1: parseInt + isNaN（ID 参数）
const id = parseInt(req.params.id as string, 10);
if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

// 模式 2: truthy 检查（必填参数）
if (!projectId || !objectType) { fail(res, 400, '缺少必要参数'); return; }

// 模式 3: 隐式转换 + 默认值（分页参数）
const page = parseInt(req.query.page as string) || 1;

// 模式 4: 无验证（req.body）
const item = await todoService.create(req.body, req.user!.userId);  // 无任何验证
```

**架构问题**:

1. **验证层缺失**: 没有独立的验证层或验证中间件，验证逻辑与 Controller 耦合
2. **无 Schema 定义**: 验证规则分散在代码中，无法一览全貌
3. **createTodo 零验证**: `req.body` 直接传入 Service，无字段存在性、类型、长度、格式验证
4. **分页参数无边界**: `page=-1` 和 `pageSize=999999` 均可传入

**修复建议**: 引入 Zod 验证中间件（项目级统一方案）：

```typescript
// apis/validator/todo.validator.ts
export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().nullable().optional(),
  object_type: z.enum(['article', 'keyword']),
  object_id: z.number().int().positive().nullable().optional(),
  action: z.enum(['publish', 'update', 'delete', 'restore']),
  source: z.enum(['manual', 'system']).optional(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
  assignee_id: z.number().int().positive(),
  due_at: z.string().datetime().optional(),
});

// app.ts 路由注册
app.post('/api/todos', authMiddleware, roleMiddleware('sysadmin', 'admin'),
  validate(createTodoSchema), todoController.createTodo);
```

**优先级**: P2 — 建议与项目级 Zod 引入同步重构

---

### OBSERVATION 级别

#### OBS-1: `catch (err: any)` 全文使用 `any` 类型

**位置**: 第 36、48、61、73、89、105、122、138、153、215、265 行（共 11 个 catch 块）

TypeScript 4.4+ 支持 `useUnknownInCatchVariables`。`any` 绕过类型安全检查，`unknown` 强制窄化。这是 TypeScript 最佳实践问题，非架构缺陷。

**注**: `listTodos`（第 36 行）和 `createTodo`（第 61 行）已正确使用 `_err` 变量名且返回通用消息，但类型仍为 `any`。

---

#### OBS-2: 错误消息魔法字符串分散

**位置**: 全文

```typescript
'无效的待办ID'          // 出现 7 次
'无权访问全部待办'      // 出现 1 次
'无权访问该项目'        // 出现 2 次
'缺少必要参数'          // 出现 1 次
'缺少项目ID'            // 出现 1 次
```

建议提取为常量，但这是代码组织问题而非架构缺陷。

---

#### OBS-3: parseInt 使用不一致 — 部分缺少基数参数

**位置**: 第 163、222 行 vs 第 43、68、83、99、115、131、148 行

```typescript
const projectId = parseInt(req.query.projectId as string);     // ❌ 缺少基数
const id = parseInt(req.params.id as string, 10);             // ✓ 有基数
```

统一使用 `parseInt(value, 10)` 可避免潜在的十六进制解析。

---

## 三、架构层级分析

### 3.1 分层职责矩阵

| 层级 | 期望职责 | 实际职责 | 评价 |
|------|---------|---------|------|
| 路由层 (app.ts) | 中间件编排 + 路由注册 | auth + role + antiCrawl + rateLimit + 路由 | 合理 |
| Controller 层 | HTTP 协议适配 + 请求调度 | 协议适配 + 请求调度 + 数据访问（2端点）+ 权限检查 | 职责越界 |
| Service 层 (接口) | 业务逻辑抽象 | 10/12 方法定义 | 不完整 |
| Service 层 (实现) | 业务逻辑 + 数据访问编排 | 业务逻辑 + Prisma 调用 + 授权检查 | 合理 |
| Map 层 | 数据格式转换 | Prisma camelCase → API snake_case | 合理 |
| Entity 层 | 类型定义 | 接口/类型定义 | 合理 |

### 3.2 数据流图

```
┌─────────────┐
│   HTTP 请求  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ app.ts 中间件链                            │
│ helmet → cors → antiCrawl → rateLimit    │
│ → authMiddleware → roleMiddleware         │
│ ('sysadmin', 'admin')                     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Controller (todo.controller.ts)           │
│ ┌──────────────────────────────────────┐ │
│ │ 标准路径 (8/10 端点):                 │ │
│ │ 1. 解析 req.params / req.query       │ │
│ │ 2. 输入验证 (parseInt+isNaN/truthy)  │ │
│ │ 3. 调用 todoService 方法             │ │
│ │ 4. 构造 HTTP 响应                    │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 违规路径 (2/10 端点):                 │ │
│ │ 1. 解析 req.query                    │ │
│ │ 2. 权限检查 (projectService.getById) │ │
│ │ 3. ❌ 直接调用 getPrisma()           │ │
│ │ 4. ❌ 直接执行数据库查询              │ │
│ │ 5. ❌ Controller 内组装数据           │ │
│ │ 6. 构造 HTTP 响应                    │ │
│ └──────────────────────────────────────┘ │
└──────┬─────────────────────┬────────────┘
       │                     │
       ▼                     ▼
┌──────────────┐   ┌──────────────────────┐
│ Service      │   │ Prisma Client         │
│ (标准路径)    │   │ (违规路径 — 绕过Service)│
│ → Prisma     │   │ → article             │
│ → mapTodo()  │   │ → knowledgeBase       │
└──────────────┘   │ → knowledgeKeyword    │
                    │ → project             │
                    │ → user                │
                    └──────────────────────┘
```

### 3.3 依赖关系图

```
todo.controller.ts
  ├── import { TodoServiceImpl } from '../service/impl/todo.service.impl'    ← 具体实现依赖 ❌
  ├── import { ProjectServiceImpl } from '../service/impl/project.service.impl' ← 具体实现依赖 ❌
  ├── import { getPrisma } from '../utils'                                   ← 全局 Prisma 实例 ❌ (应通过 Service)
  ├── import { success, fail, paginate } from '../utils'                     ← 工具函数 ✅
  └── import { Request, Response } from 'express'                            ← 框架依赖 ✅

问题依赖链:
  Controller → getPrisma() → Prisma.article.findMany()  ❌ (跨层直接访问)
  Controller → getPrisma() → Prisma.user.findMany()     ❌
  Controller → getPrisma() → Prisma.project.findUnique() ❌
  Controller → ProjectServiceImpl → Prisma               ✅ (通过 Service 层)
```

### 3.4 函数逐项架构评审

#### listTodos（第 10-39 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 分层合规 | ✅ | 仅做参数提取 + Service 调用 + 响应格式化 |
| 职责边界 | ✅ | tab 权限检查属于 HTTP 层关注点，放在 Controller 合理 |
| 参数验证 | ⚠️ | page/pageSize 缺少范围校验，tab 无白名单 |
| 响应一致性 | ✅ | 使用 `paginate()` 标准响应 |

#### getTodo（第 41-55 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 分层合规 | ✅ | 纯 HTTP 适配 |
| 职责边界 | ✅ | 无业务逻辑 |
| 授权检查 | ⚠️ | Service 层 `getById` 无授权检查，任何 admin 可查看任意待办 |
| 错误映射 | ⚠️ | 基于字符串匹配 |

#### createTodo（第 57-64 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 分层合规 | ✅ | 调用 Service 层 |
| 输入验证 | ❌ | 无任何输入验证，req.body 直接透传 |
| 响应构造 | ❌ | 手动构造 201，未使用 `created()` |
| 过度传递 | ⚠️ | req.body 整体传入 |

#### updateTodo / closeTodo / reopenTodo / transferTodo / rejectTodo（第 66-144 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 分层合规 | ✅ | 统一调用 Service 层 |
| 职责边界 | ✅ | 纯 HTTP 适配 + 错误映射 |
| 参数验证 | ✅ | parseInt + NaN 检查 |
| 错误映射 | ⚠️ | 字符串匹配 + err.message 泄露 |

#### getObjectOptions（第 162-218 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 分层合规 | ❌ | Controller 直接操作 Prisma |
| 职责边界 | ❌ | 承担数据访问 + 类型分发 + 数据组装 |
| 授权检查 | ⚠️ | 通过 projectService.getById 检查权限，但逻辑重复 |
| 多表查询 | ❌ | 3 个 Prisma 模型直接查询，无事务保护 |

#### getAssigneeCandidates（第 220-268 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 分层合规 | ❌ | Controller 直接操作 Prisma |
| 职责边界 | ❌ | 承担数据访问 + 去重 + 映射 |
| 重复查询 | ❌ | 同一张 project 表查询两次 |
| TOCTOU | ⚠️ | 权限检查和数据获取之间存在时间窗口 |

---

## 四、授权架构专项分析

### 当前授权模型

```
请求 → roleMiddleware(['sysadmin','admin'])
          ↓
       Controller handler
          ├── listTodos:     if (tab === 'all_*' && role !== 'sysadmin') → 403
          ├── getObjectOptions:  projectService.getById → operator_ids.includes → 403
          ├── getAssigneeCandidates: projectService.getById → operator_ids.includes → 403
          └── 其余 7 个:    无 Controller 层授权
                              ↓
                          Service 层
                              ├── close/reopen/update/transfer: if (role !== 'sysadmin' && assigneeId !== userId) → throw
                              ├── reject:                        if (role !== 'sysadmin') → throw
                              └── getById/list/getLogs:          按 role 过滤数据
```

### 授权矩阵

| 操作 | sysadmin | admin (operator) | admin (非operator) |
|------|----------|------------------|-------------------|
| 列表(my_open/my_closed) | ✅ 自己的 | ✅ 自己的 | ✅ 自己的 |
| 列表(all_open/all_closed) | ✅ 全部 | ❌ 403 | ❌ 403 |
| 查看详情 | ✅ 全部 | ✅ 全部 | ✅ 全部 |
| 创建 | ✅ | ✅ | ✅ |
| 修改 | ✅ 全部 | ✅ 自己的 | ❌ 400 |
| 关闭 | ✅ 全部 | ✅ 自己的 | ❌ 400 |
| 重新打开 | ✅ 全部 | ✅ 自己的 | ❌ 400 |
| 转交 | ✅ 全部 | ✅ 自己的 | ❌ 400 |
| 驳回 | ✅ | ❌ | ❌ |
| 获取操作对象 | ✅ 全项目 | ✅ 有权项目 | ❌ 403 |
| 获取候选人 | ✅ 全项目 | ✅ 有权项目 | ❌ 403 |

**潜在问题**: `getById` 无授权检查 — 任何 admin 可查看其他公司的待办详情（如果知道 ID）。

---

## 五、与同类控制器的架构对比

| 架构维度 | todo.controller | project.controller | company.controller | knowledge.controller |
|----------|----------------|--------------------|--------------------|---------------------|
| 分层合规 | 8/10 | 5/5 | 5/5 | 8/8 |
| Controller 操作 Prisma | **2 端点** | 0 | 0 | 0 |
| 依赖注入 | `new Impl()` | 同 | 同 | 同 |
| 异常体系 | 字符串匹配 | 字符串匹配 | 字符串匹配 | 字符串匹配 |
| 响应构造 | 手动 201 | 手动 201 | 已用 `created()` | 已用 `created()` |
| 参数校验 | parseInt+truthy | 手写 if | 手写 if | parseInt+truthy |
| 授权模式 | 分散3层 | 分散2层 | 路由层 | 分散2层 |
| 文件规模 | 269 行 | 292 行 | 237 行 | ~300 行 |

**结论**: todo.controller 是项目中 **唯一** 存在 Controller 层直接操作 Prisma 的模块，也是最严重的分层违规。其他架构问题（依赖注入、异常体系、验证层）与其他 Controller 同源，属于项目级技术债务。

---

## 六、重构建议路线图

### 第一阶段：立即修复 — 恢复架构一致性（1-2 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| C-1/C-2 | Controller 直接操作 Prisma | 将 getObjectOptions 和 getAssigneeCandidates 的数据访问逻辑下沉到 TodoServiceImpl | 分层一致性 |
| H-4 | 重复查询同一张表 | 合并 Service 层查询 | 性能 + TOCTOU 消除 |
| M-1 | ITodoService 接口不完整 | 扩展接口定义 | 接口完整性 |
| M-2 | createTodo 响应格式不一致 | 使用 `created()` | 响应契约统一 |

### 第二阶段：短期改进 — 架构质量（3-5 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| H-1 | 依赖倒置违反 | `const service: IService = new Impl()` | 类型安全 |
| H-2 | 字符串匹配异常 | 引入 NotFoundError/BusinessError | 解耦异常契约 |
| H-3 | 授权分散 | 统一下沉到 Service 层 | 单一职责 |
| M-3 | req.body 整体传入 | 显式 DTO 构造 | 防过度传递 |
| M-4 | 验证嵌入 Controller | 引入 Zod 验证中间件 | 关注点分离 |

### 第三阶段：项目级重构（中长期）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| H-1(深化) | 模块级硬编码单例 | 引入 DI 容器或服务定位器 | 可测试性 + 可替换性 |
| H-2(深化) | Controller try-catch 样板 | 全局异常处理中间件 | 代码精简 |

---

## 七、评审结论

**判定: ⚠️ 有条件通过 — 存在严重分层违规需治理**

`todo.controller.ts` 的核心架构问题是 **Controller 层直接操作 Prisma**（C-1/C-2），这在项目所有 Controller 中是独一无二的。8/10 端点遵循标准分层架构，质量与项目其他模块相当；但 `getObjectOptions` 和 `getAssigneeCandidates` 两个辅助查询端点绕过 Service 层，导致：

1. **架构一致性破坏** — 同一文件内两种数据访问模式并存
2. **接口契约不完整** — ITodoService 无法描述模块的全部能力
3. **可测试性下降** — 测试策略不统一（mock Service vs mock Prisma）
4. **重复查询 + TOCTOU** — getAssigneeCandidates 对同一张表做了两次查询

其余架构问题（依赖倒置、异常体系、验证层、授权分散）与其他 Controller 同源，属于项目级技术债务，建议统一规划治理。

**建议优先级**:
- **P0**: 将 `getObjectOptions` 和 `getAssigneeCandidates` 的数据访问逻辑下沉到 Service 层 — 恢复架构一致性
- **P1**: 引入自定义异常类 + 统一错误映射 — 解耦 Controller-Service 异常契约
- **P2**: 引入 Zod 验证中间件 + 显式 DTO 构造 — 关注点分离

---

*软件架构专家评审完成 — 2026-05-24*
