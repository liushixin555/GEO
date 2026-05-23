# apis/controller/knowledge-base.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + 错误策略 + 关注点分离 + 可扩展性 + 可测试性）
**文件路径**: `apis/controller/knowledge-base.controller.ts`
**代码行数**: 123 行（5 个导出函数 + 1 个模块级常量 + 1 个枚举常量）
**关联文件**: `apis/service/knowledge-base.service.ts`, `apis/service/impl/knowledge-base.service.impl.ts`, `apis/entity/knowledge-base.entity.ts`, `apis/utils/response.util.ts`, `apis/app.ts`

---

## 一、架构上下文

### 1.1 系统分层

```
┌─────────────────────────────────────────────────┐
│  app.ts (路由注册 + 全局中间件)                     │
│  authMiddleware → roleMiddleware → controller    │
├─────────────────────────────────────────────────┤
│  controller (参数提取 + 输入验证 + 响应构造)        │
│  knowledge-base.controller.ts                    │
├─────────────────────────────────────────────────┤
│  service interface (IKnowledgeBaseService)       │
│  service impl (KnowledgeBaseServiceImpl)         │
│  业务逻辑 + 授权检查 + 数据映射(mapKnowledgeBase)  │
├─────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL                        │
└─────────────────────────────────────────────────┘
```

### 1.2 路由注册

在 `app.ts:178-182` 中注册了 5 条 RESTful 路由，均受 `authMiddleware` + `roleMiddleware('sysadmin', 'admin')` 保护。另有 22 条子资源路由（keywords/portraits/images/documents）注册在 `app.ts:200-226`，挂载在 `/api/knowledge-bases/:baseId/` 下。

### 1.3 质量评审后的代码现状

代码已在前一次软件质量评审后修复了 11 个问题（scope 枚举验证、`err: unknown` 类型安全、`req.user` 空值保护、`created()` 工具函数使用、pageSize 上限、page 范围校验等）。本次评审聚焦**架构层面**。

---

## 二、架构问题清单

### CRITICAL 级别

#### C-1: 控制器承担了错误翻译职责（关注点未分离）

**位置**: 全部 5 个 catch 块（第 23-29、39-45、65-71、90-100、113-121 行）

**问题描述**: 每个 controller 函数的 catch 块都包含一组 `err.message === '...'` 字符串匹配，将 service 层抛出的 `Error` 翻译为 HTTP 状态码。这是典型的**错误翻译层**，属于横切关注点，不应由每个控制器重复实现。

```typescript
// 当前模式 — 每个 catch 块都重复这段逻辑
catch (err: unknown) {
  if (err instanceof Error && err.message === '知识库不存在') {
    fail(res, 404, err.message);
  } else if (err instanceof Error && err.message === '只能修改自己创建的知识库') {
    fail(res, 403, err.message);
  } else {
    fail(res, 500, '...');
  }
}
```

**架构缺陷**:
1. **脆弱耦合**: service 层的 `throw new Error('知识库不存在')` 和 controller 层的 `err.message === '知识库不存在'` 形成隐式字符串契约，任何一方修改字符串都会导致错误路由失败
2. **违反 DRY**: 5 个函数中 `知识库不存在` → 404 的映射重复出现 4 次（list/get/update/delete）
3. **不可扩展**: 新增业务异常需同时修改 service 和 controller，且无编译期保障

**修复建议**: 引入自定义异常类 + 全局错误处理中间件

```typescript
// 1. 定义业务异常
class NotFoundError extends Error { constructor(msg: string) { super(msg); } }
class ForbiddenError extends Error { constructor(msg: string) { super(msg); } }
class ValidationError extends Error { constructor(msg: string) { super(msg); } }

// 2. Service 层抛出自定义异常
if (!item) throw new NotFoundError('知识库不存在');

// 3. 全局错误处理中间件（app.ts）
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof NotFoundError) return fail(res, 404, err.message);
  if (err instanceof ForbiddenError) return fail(res, 403, err.message);
  if (err instanceof ValidationError) return fail(res, 400, err.message);
  logger.error('未处理异常', err);
  fail(res, 500, '服务器内部错误');
});

// 4. Controller 简化为纯业务编排
export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }
  const item = await knowledgeBaseService.getById(id);
  success(res, item);
}
```

**影响范围**: 全项目所有 controller（约 15+ 个文件），属于系统性架构改进。

---

### HIGH 级别

#### H-1: 硬编码的服务实例化（无依赖注入）

**位置**: 第 5 行

```typescript
const knowledgeBaseService = new KnowledgeBaseServiceImpl();
```

**问题描述**: Controller 直接 `new` 了具体实现类 `KnowledgeBaseServiceImpl`，违反**依赖倒置原则（DIP）**。Controller 应依赖 `IKnowledgeBaseService` 接口而非具体实现。

**影响**:
1. **不可测试**: 单元测试无法注入 mock service，只能通过 `jest.mock` 模块级别 mock，测试隔离性差
2. **不可替换**: 若需切换实现（如缓存装饰器、远程 service 代理），需修改 controller 源码
3. **生命周期耦合**: service 在模块加载时创建，与应用进程同生命周期，无法控制初始化时机

**修复建议**（轻量级 DI，无需引入框架）:

```typescript
// 方案 A: 工厂函数
export function createKnowledgeBaseController(service?: IKnowledgeBaseService) {
  const svc = service || new KnowledgeBaseServiceImpl();
  return {
    listKnowledgeBases: (req: Request, res: Response) => listKnowledgeBases(req, res, svc),
    // ...
  };
}

// 方案 B: 模块级 setter（适用于 app.ts 集中式注册）
let knowledgeBaseService: IKnowledgeBaseService = new KnowledgeBaseServiceImpl();
export function setKnowledgeBaseService(service: IKnowledgeBaseService) {
  knowledgeBaseService = service;
}
```

---

#### H-2: 授权逻辑分散在 controller 和 service 两层

**位置**:
- Controller: 第 18-20 行（`req.user` 空值检查）、第 57-59 行、第 85-87 行、第 108-110 行
- Service impl: 第 151-153 行（`role !== 'sysadmin' && existing.createdBy !== userId`）

**问题描述**: 认证检查（用户是否存在）在 controller 层，但授权检查（用户是否有权操作）分散在 controller 层（认证）和 service 层（权限判断）。两层都涉及 `userId` 和 `role`，职责边界模糊。

```typescript
// Controller 层 — 认证
const user = req.user;
if (!user) { fail(res, 401, '未登录'); return; }
const { userId, role } = user;

// Service 层 — 授权（同一个 userId/role）
if (role !== 'sysadmin' && existing.createdBy !== userId) {
  throw new Error('只能修改自己创建的知识库');
}
```

**架构缺陷**:
1. **双重传递**: `userId` 和 `role` 从 controller → service 的每次调用都传递，增加了函数签名复杂度（service.list 有 7 个参数）
2. **职责不清**: controller 不知道 service 内部做了哪些授权检查；service 不知道 controller 已经做了哪些认证检查
3. **不一致**: `listKnowledgeBases` 的 admin 可见性过滤在 service 层（第 63-89 行），`getKnowledgeBase` 没有任何可见性限制 — 是否是架构设计意图不明确

**修复建议**: 统一授权层位置

```typescript
// 方案: 在 service 层统一处理授权（推荐）
// Controller 只负责认证 + 参数提取
// Service 接收完整 user context 对象，而非散列参数

interface UserContext {
  userId: number;
  role: string;
  companyId?: number;
}

// Service 接口
interface IKnowledgeBaseService {
  list(page: number, pageSize: number, filters: ListFilters, user: UserContext): Promise<{...}>;
  // 而非 list(page, pageSize, search, scope, status, userId, role)
}
```

---

#### H-3: 缺少请求验证层（无 schema validation）

**位置**: `createKnowledgeBase` 第 50-55 行、`updateKnowledgeBase` 第 79-83 行

**问题描述**: 输入验证使用内联 `if` 语句，未使用 schema validation（如 Zod）。与 `article.controller.ts` 的 `pickAllowedFields` 模式相比，本控制器虽然已通过解构限制了字段范围（`const { name, description, scope, company_id, project_id } = req.body`），但缺少类型层面的运行时验证。

**架构风险**:
1. **类型不安全**: TypeScript 的 `CreateKnowledgeBaseRequest` 类型声明只在编译期生效，运行时 `req.body` 的实际类型是 `any`
2. **验证分散**: `scope` 枚举验证在 controller，`scope + company_id` 关联验证在 service，同一次请求的验证逻辑跨越两层
3. **无法生成 API 文档**: 无 schema 定义意味着无法自动生成 OpenAPI 的 request body schema

**修复建议**: 引入 Zod schema 验证（与项目 `common/validation` 规则一致）

```typescript
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scope: z.enum(['platform', 'company', 'project']),
  company_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
});

// Controller
const parsed = createSchema.safeParse(req.body);
if (!parsed.success) {
  fail(res, 400, parsed.error.issues.map(i => i.message).join('; '));
  return;
}
const item = await knowledgeBaseService.create(parsed.data, userId);
```

---

### MEDIUM 级别

#### M-1: Service.list 方法签名过长（7 个参数）

**位置**: service interface 第 4 行

```typescript
list(page: number, pageSize: number, search?: string, scope?: string, status?: boolean, userId?: number, role?: string): Promise<{ list: KnowledgeBase[]; total: number }>;
```

**问题描述**: 7 个参数的方法签名违反了**清洁代码原则**（建议不超过 3-4 个参数）。随着筛选条件增加，签名会持续膨胀。

**修复建议**: 使用参数对象模式

```typescript
interface ListKnowledgeBasesQuery {
  page: number;
  pageSize: number;
  search?: string;
  scope?: string;
  status?: boolean;
}

interface UserContext {
  userId: number;
  role: string;
}

list(query: ListKnowledgeBasesQuery, user?: UserContext): Promise<{ list: KnowledgeBase[]; total: number }>;
```

---

#### M-2: 路由注册集中式膨胀（app.ts 单文件 226+ 行）

**位置**: `apis/app.ts:178-226`

**问题描述**: 所有路由（含 knowledge-base 的 27 条路由）集中在 `app.ts` 中注册。随着模块增长（当前已有 13 个 controller），`app.ts` 将成为架构瓶颈。

**修复建议**: 引入模块化路由

```typescript
// apis/routes/knowledge-base.routes.ts
import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import * as ctrl from '../controller/knowledge-base.controller';

const router = Router();
router.get('/', authMiddleware, roleMiddleware('sysadmin', 'admin'), ctrl.listKnowledgeBases);
// ...
export default router;

// app.ts
import knowledgeBaseRoutes from './routes/knowledge-base.routes';
app.use('/api/knowledge-bases', knowledgeBaseRoutes);
```

---

#### M-3: Controller 参数提取与业务编排混合

**位置**: 全部 5 个函数

**问题描述**: 每个 controller 函数都包含三个职责：参数提取/验证、业务编排（调用 service）、响应构造。虽然当前代码量小（每个函数 12-26 行），但随着需求增长（如事务编排、事件发布），函数将膨胀。

**当前模式**（可接受，但需关注）:
```
参数提取（3-5 行） → 业务调用（1-2 行） → 响应构造（1-2 行）
```

**建议**: 保持当前结构，但通过 M-1 的参数对象 + H-1 的自定义异常来压缩参数提取和错误处理的行数，使每个函数聚焦于**请求→响应的映射逻辑**。

---

#### M-4: getKnowledgeBase 缺少可见性控制

**位置**: 第 32-46 行

**问题描述**: `getKnowledgeBase` 不传递 `userId`/`role` 给 service 层，任何已认证的 sysadmin/admin 都可以查看任意知识库详情。而 `listKnowledgeBases` 在 service 层根据 `userId`/`role` 过滤了可见范围。

**架构不一致**: 列表接口有可见性过滤，详情接口没有。这意味着 admin 用户在列表中看不到某些知识库，但如果知道 ID 可以直接访问。这是一个**访问控制漏洞**。

**修复建议**: `getById` 也应接收 `userId`/`role` 并在 service 层检查可见性，或在 service 中复用 `list` 的 where 条件。

---

### LOW 级别

#### L-1: VALID_SCOPES 常量定义位置不当

**位置**: 第 7 行

```typescript
const VALID_SCOPES = ['platform', 'company', 'project'] as const;
```

**问题描述**: scope 枚举值在 entity 层（`KnowledgeBase.scope` 类型）和 controller 层（`VALID_SCOPES`）各定义一次。若 scope 增加新值，需同步修改两处。

**修复建议**: 从 entity 类型推导验证常量

```typescript
import { KnowledgeBase } from '../entity';
type Scope = KnowledgeBase['scope'];
const VALID_SCOPES: readonly Scope[] = ['platform', 'company', 'project'];
// 或使用 Zod enum 直接从 schema 推导
```

---

#### L-2: Controller 导出独立函数而非对象

**位置**: 全部 5 个 `export async function`

**问题描述**: 当前使用独立函数导出 + `import * as knowledgeBaseController from '...'` 的模式。这是一种可接受的模式，但不利于 H-1 中提到的依赖注入改造。

---

## 三、架构质量评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 分层清晰度 | 6/10 | Controller-Service 分层存在，但授权、验证职责分散 |
| 关注点分离 | 5/10 | 错误翻译、授权检查、验证逻辑跨越两层 |
| 依赖管理 | 4/10 | 硬编码实例化，无 DI，接口声明了但未充分利用 |
| 可测试性 | 5/10 | 函数独立导出便于测试调用，但 mock service 需要 jest.mock |
| 可扩展性 | 5/10 | 路由集中注册、方法签名膨胀、错误处理重复是扩展瓶颈 |
| RESTful 设计 | 8/10 | 资源命名规范，HTTP 方法正确，状态码使用准确 |
| 错误策略 | 4/10 | 字符串匹配的错误翻译是最脆弱的架构环节 |
| 安全架构 | 7/10 | 中间件链（auth → role → controller）设计合理，但 getKnowledgeBase 存在访问控制遗漏 |

**综合架构评分: 5.5/10**

---

## 四、架构优点（正面评价）

| 优点 | 说明 |
|------|------|
| 接口驱动设计 | `IKnowledgeBaseService` 接口存在，为 DI 和替换提供了扩展点 |
| RESTful 规范 | 资源命名（`/api/knowledge-bases`）、HTTP 方法（GET/POST/PUT/DELETE）、状态码（200/201/400/401/403/404/500）使用正确 |
| 中间件链设计 | `authMiddleware → roleMiddleware → controller` 的洋葱模型清晰 |
| 统一响应格式 | `success/fail/paginate/created` 工具函数保证了 API 响应的一致性 |
| 字段白名单 | create 使用解构 `{ name, description, scope, company_id, project_id }` 限制了传入字段 |
| Entity 层隔离 | `mapKnowledgeBase` 函数将 Prisma 模型映射为业务实体，数据库细节不泄露 |
| 软删除设计 | service 层通过 `deletedAt` 实现软删除，数据可恢复 |

---

## 五、架构改进路线图

### Phase 1 — 基础架构加固（预估 2-3 小时）

| 优先级 | 改进项 | 影响范围 | 工作量 |
|--------|--------|----------|--------|
| P0 | C-1: 自定义异常 + 全局错误中间件 | 全项目 | 2h |
| P0 | H-3: Zod schema 验证 | knowledge-base 模块 | 1h |

### Phase 2 — 架构解耦（预估 2-4 小时）

| 优先级 | 改进项 | 影响范围 | 工作量 |
|--------|--------|----------|--------|
| P1 | H-1: 轻量级 DI 改造 | 全项目 controller | 2h |
| P1 | H-2: 授权层统一 | knowledge-base 模块 | 1h |
| P1 | M-4: getKnowledgeBase 可见性修复 | 1 个函数 | 30min |

### Phase 3 — 规模化准备（预估 3-4 小时）

| 优先级 | 改进项 | 影响范围 | 工作量 |
|--------|--------|----------|--------|
| P2 | M-1: Service 方法参数对象化 | service 接口 | 1h |
| P2 | M-2: 路由模块化拆分 | app.ts + 新建 routes/ | 2h |
| P2 | L-1: scope 枚举统一管理 | entity + controller | 30min |

---

## 六、与项目其他模块的架构一致性对比

| 模式 | knowledge-base | company | article | auth |
|------|---------------|---------|---------|------|
| 服务实例化 | `new Impl()` | `new Impl()` | `new Impl()` | `new Impl()` |
| 验证方式 | 内联 if | `validateCompanyBody()` | `pickAllowedFields()` | 内联 if |
| 错误处理 | `err.message === '...'` | `err.message === '...'` | `err.message === '...'` | 简单 catch |
| 字段白名单 | 解构提取 | 解构提取 | `pickAllowedFields()` | N/A |
| 自定义异常 | 无 | 无 | 无 | 无 |

**结论**: knowledge-base controller 的架构模式与项目其他控制器**完全一致**，上述问题（C-1/H-1/H-2/H-3）是**全项目系统性架构问题**，非本模块独有。建议以 knowledge-base 为试点，验证改进方案后再推广至全项目。

---

## 七、评审结论

**判定: 有条件通过 — 架构基础扎实，但存在系统性改进空间**

1. **最严重**: C-1（错误翻译层）是当前架构最脆弱的环节，字符串匹配的错误路由缺乏编译期保障，是生产事故的潜在风险点
2. **最有价值**: H-1（DI 改造）和 H-3（Zod 验证）将显著提升可测试性和运行时类型安全
3. **安全隐患**: M-4（getKnowledgeBase 缺少可见性控制）是一个实际的安全漏洞，admin 可以通过猜测 ID 访问不应看到的知识库
4. **架构共识**: 本模块的架构模式与全项目一致，问题具有普遍性，适合作为架构改进的试点模块

**建议**: 优先修复 M-4（安全漏洞，30 分钟），然后以本模块为试点实施 Phase 1 的自定义异常 + Zod 验证。

---

*软件架构专家评审完成 — 2026-05-24*
