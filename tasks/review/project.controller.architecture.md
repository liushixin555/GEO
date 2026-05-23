# apis/controller/project.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 · 职责边界 · 扩展性 · 可测试性 · 一致性 · 架构原则）
**文件路径**: `apis/controller/project.controller.ts`
**代码行数**: 292 行（5 个导出函数 + 1 个模块级服务实例）
**关联路由**: `apis/app.ts` 第 145-149 行，共 5 条路由绑定，均配置 `roleMiddleware('sysadmin', 'admin')`
**关联服务**: `apis/service/project.service.ts`（接口 `IProjectService`）→ `apis/service/impl/project.service.impl.ts`（实现 `ProjectServiceImpl`）
**关联实体**: `apis/entity/project.entity.ts`（Project, CreateProjectRequest, UpdateProjectRequest）
**关联映射**: `apis/map/index.ts` — `mapProject()`
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate, created）

---

## 一、总体架构评估

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层合规性 | 7/10 | controller → service(interface) → service/impl → Prisma，分层清晰但存在层级越界 |
| 职责单一性 | 5/10 | controller 承担了过多业务逻辑（权限判断、数据过滤），违反 SRP |
| 依赖管理 | 4/10 | 模块顶层 `new` 具体实现类，违反依赖倒置原则（DIP） |
| 一致性 | 5/10 | 响应构造方式不统一（手动 201 vs `created()`），parseInt 使用不一致 |
| 可测试性 | 4/10 | 无 DI 机制，业务逻辑与 HTTP handler 耦合，mock 必须劫持整个模块 |
| 扩展性 | 5/10 | 验证逻辑硬编码在 handler 内，新增字段或规则需逐函数修改 |
| 授权架构 | 6/10 | 路由层 RBAC + controller 层细粒度检查的双层设计合理，但职责划分不清 |

**问题统计**: CRITICAL × 2 / HIGH × 4 / MEDIUM × 4 / LOW × 3

---

## 二、架构层面问题清单

### CRITICAL 级别

#### C-1: 授权职责分散 — controller 与 service 层权限边界模糊

**位置**: 全文件（getProject 第 85-88 行、updateProject 第 225-228 行、deleteProject 第 274-279 行）+ service impl

**现状分析**:

项目的授权检查分布在三个层级：

| 层级 | 检查内容 | 代码位置 |
|------|----------|----------|
| 路由层 (`app.ts`) | 角色白名单 `roleMiddleware('sysadmin', 'admin')` | app.ts 第 145-149 行 |
| Controller 层 | admin 用户的 operator 归属检查 | controller 第 85、225、274 行 |
| Service 层 | admin 用户的 company 过滤（list）、数据存在性检查 | service impl 第 27-29、102、158 行 |

问题在于：

1. **同一授权逻辑在多处重复**: admin 的 operator 归属检查在 `getProject`、`updateProject`、`deleteProject` 中各写了一次，且实现细节略有不同（getProject/update 用 `existing.operator_ids.includes(userId)`，deleteProject 也用同样的模式但先调用 `getById`）。
2. **sysadmin 与 admin 的权限隔离完全依赖 controller 层的 `if (role === 'admin')` 分支**: 如果某个 handler 忘记写这个分支，sysadmin 和 admin 的行为完全一致——这在架构上是脆弱的。
3. **service 层对 `list` 方法做了角色过滤但对 `getById` 不做**: `getById` 的数据隔离完全依赖 controller 层，这意味着 service 接口本身不是"安全"的，调用者必须知道外部约束。

**架构影响**:

这种分散的授权模式违反了 **单一职责原则**（SRP）和 **关注点分离**（SoC）。当新增角色或修改权限规则时，需要在三个层级同步修改，极易遗漏。

**修复建议**:

```typescript
// 方案: 将授权逻辑下沉到 service 层，controller 只做参数校验和响应
// service 接口增加授权上下文参数
interface AuthContext {
  userId: number;
  role: string;
  companyId?: number;
}

// service 层统一处理授权
async getById(id: number, auth: AuthContext): Promise<Project> {
  const item = await this.findOrThrow(id);
  if (auth.role === 'admin') {
    if (!item.operator_ids.includes(auth.userId)) throw new ForbiddenError('无权操作该项目');
  }
  return item;
}

// controller 层简化为
export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const item = await projectService.getById(id, {
      userId: req.user!.userId,
      role: req.user!.role,
      companyId: req.user!.companyId,
    });
    success(res, item);
  } catch (err: unknown) {
    // 统一错误映射
    handleServiceError(res, err);
  }
}
```

---

#### C-2: Controller 层承担业务逻辑 — 违反分层架构的职责边界

**位置**: `createProject` 第 150-152 行、`updateProject` 第 219-231 行

**问题代码**:

```typescript
// createProject — 业务规则：admin 只能为自己的公司创建项目
if (req.user?.role === 'admin') {
  req.body.company_id = req.user.companyId;
}

// updateProject — 业务规则：company_id 不可更改
if (req.body.company_id !== undefined && req.body.company_id !== existing.company_id) {
  fail(res, 400, '项目所属公司不可更改');
  return;
}
// Strip company_id to prevent service from processing it
delete req.body.company_id;
```

**架构分析**:

按照标准的分层架构原则：

| 层级 | 应有职责 | 当前实际职责 |
|------|----------|-------------|
| Controller | HTTP 协议处理（参数提取、响应格式化、HTTP 状态码映射） | + 业务规则执行（company_id 覆盖、不可更改检查） |
| Service | 业务逻辑（验证、授权、业务规则） | 部分业务逻辑（operator/viewer 归属验证、存在性检查） |
| Service Impl | 数据访问（Prisma 查询） | 混合了验证和查询 |

具体问题：

1. **`company_id` 不可更改** 是业务规则，应在 service 层强制执行，而非由 controller 负责拦截和剥离。
2. **admin 只能为自己的公司创建项目** 是业务规则，应封装在 service 层的 `create` 方法中。
3. **`delete req.body.company_id`** 在 controller 层直接操作请求体来防止 service 处理某个字段，这是一种**通过副作用传递意图**的反模式。

**架构风险**:

如果未来有新的入口点（如 CLI 命令、消息队列消费者、定时任务）需要创建/更新项目，必须复制 controller 层的业务逻辑，否则授权规则会被绕过。

**修复建议**:

```typescript
// service 层增加 company_id 不可更改的强制执行
async update(id: number, request: UpdateProjectRequest, auth: AuthContext): Promise<Project> {
  // 强制剥离 company_id，无论调用方是谁
  const { company_id, ...safeRequest } = request;
  // ... 执行更新
}

// create 时 admin 自动使用自己的 companyId
async create(request: CreateProjectRequest, auth: AuthContext): Promise<Project> {
  const effectiveCompanyId = auth.role === 'admin'
    ? auth.companyId!
    : request.company_id;
  // ...
}
```

---

### HIGH 级别

#### H-1: 依赖倒置原则违反 — controller 直接依赖具体实现类

**位置**: 第 2、5 行

```typescript
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
const projectService = new ProjectServiceImpl();
```

**架构分析**:

项目采用标准分层架构 `controller → service(interface) → service/impl`，接口 `IProjectService` 已定义。但 controller 直接导入并实例化具体实现类 `ProjectServiceImpl`：

1. **依赖方向错误**: 高层模块（controller）不应依赖低层模块（impl），两者都应依赖抽象（接口）。这是 SOLID 原则中 DIP 的核心要求。
2. **类型声明缺失**: `projectService` 的类型被 TypeScript 推断为 `ProjectServiceImpl`，而非 `IProjectService`。意味着 controller 可以直接访问实现类的任何 public 方法，绕过接口契约。
3. **替换成本高**: 若未来需要切换项目存储方式（如从 PostgreSQL 切换到外部 API），必须修改所有 controller 文件。
4. **测试困难**: 单元测试无法通过构造函数注入 mock，必须使用 `jest.mock` 劫持整个模块。

**修复建议**:

```typescript
// 最小改动方案 — 声明接口类型
import { IProjectService } from '../service/project.service';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';

const projectService: IProjectService = new ProjectServiceImpl();
```

---

#### H-2: 错误处理架构 — 基于 `err.message` 字符串匹配的异常分派

**位置**: 全文件所有 catch 块

```typescript
catch (err: any) {
  if (err.message === '项目不存在') {
    fail(res, 404, err.message);
  } else if (err.message === '运营者不属于指定公司' || err.message === '查看者不属于指定公司') {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, err.message || '获取项目详情失败');
  }
}
```

**架构分析**:

当前错误处理使用 **字符串匹配** 来决定 HTTP 状态码映射。这种模式存在严重的架构问题：

1. **隐式契约**: service 层抛出的错误消息是 controller 和 service 之间的隐式契约。如果 service 层修改了中文错误消息（如改为"该项目不存在"），controller 的 catch 逻辑会静默失效，所有错误变为 500。
2. **无法扩展**: 新增业务错误类型时，需要在 service 层抛出特定消息，同时到 controller 层添加对应的字符串匹配分支。这是一个散弹式修改。
3. **违反 OCP**: 开闭原则要求对扩展开放、对修改关闭。当前模式要求每次新增错误类型都修改 controller。
4. **`err: any` 类型不安全**: 所有 catch 使用 `any` 类型，如果 err 不是 Error 对象，`err.message` 为 `undefined`。

**修复建议**:

```typescript
// 方案: 引入自定义异常类 + 统一错误映射中间件
class AppError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource}不存在`, 404); }
}

class BadRequestError extends AppError {
  constructor(message: string) { super(message, 400); }
}

// service 层抛出类型化异常
async getById(id: number): Promise<Project> {
  const item = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!item) throw new NotFoundError('项目');
  return mapProject(item);
}

// 统一错误处理中间件（app.ts 级别）
function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    const message = err instanceof Error ? err.message : '服务器内部错误';
    fail(res, 500, message);
  }
}

// controller 简化为
export async function getProject(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('无效的项目ID');

  const item = await projectService.getById(id, authContext(req));
  success(res, item);
  // 错误由中间件统一处理，controller 不需要 try-catch
}
```

---

#### H-3: TOCTOU 竞态条件 — update 和 delete 中先读后写的时间窗口

**位置**: `updateProject` 第 216-233 行、`deleteProject` 第 274-282 行

```typescript
// updateProject
const existing = await projectService.getById(id, userId, role);  // 时间点 T1
// ... 基于 existing 做判断 ...
const item = await projectService.update(id, req.body, userId, role);  // 时间点 T2

// deleteProject
const existing = await projectService.getById(id, userId, role);  // 时间点 T1
// ... 基于 existing 做判断 ...
await projectService.delete(id, userId, role);  // 时间点 T2
```

**架构分析**:

1. **update 场景**: 在 T1 到 T2 之间，另一个请求可能已经删除了该项目，或修改了 operator 列表。`update` 操作在 service 层又会做一次存在性检查（Prisma update 找不到记录会抛异常），但 controller 层基于 `existing` 做的 `company_id` 检查和 operator 权限检查可能已过时。
2. **delete 场景**: `getById` 和 `delete` 之间存在时间窗口，两个并发 delete 请求可能都通过了 `getById` 检查，然后都执行软删除（虽然软删除幂等不会出错，但语义不正确）。
3. **service 层重复查询**: `updateProject` 先调 `getById`（做权限检查），再调 `update`（service 内部又查一次做存在性检查），同一条记录被查询了两次。

**修复建议**:

```typescript
// 方案: 在 service 层提供原子化的 getForUpdate 方法
async updateWithAuth(id: number, request: UpdateProjectRequest, auth: AuthContext): Promise<Project> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    // 在事务内加锁读取
    const existing = await tx.project.findFirst({
      where: { id, deletedAt: null },
      include: OPERATOR_INCLUDE,
    });
    if (!existing) throw new NotFoundError('项目');

    // 在事务内做授权检查
    if (auth.role === 'admin' && !existing.operators.some(op => op.userId === auth.userId)) {
      throw new ForbiddenError('无权操作该项目');
    }

    // 在事务内执行更新
    // ...
  });
}
```

---

#### H-4: 响应构造不一致 — 违反接口契约统一性

**位置**: `createProject` 第 155 行 vs 其他函数

```typescript
// createProject — 手动构造
res.status(201).json({ code: 0, message: '创建项目成功', data: item });

// 其他函数 — 使用工具函数
success(res, item, '更新项目成功');
paginate(res, list, total, page, pageSize);
```

**架构分析**:

项目定义了统一的响应工具函数 `success()`、`created()`、`fail()`、`paginate()`，这是 API 响应格式的契约保障。但 `createProject` 手动构造响应：

1. **绕过抽象层**: `created()` 函数已提供标准 201 响应构造，手动构造等于绕过了项目的抽象层。
2. **格式漂移风险**: 如果将来修改响应格式（如添加 `timestamp` 字段），使用工具函数的地方会自动更新，手动构造的不会。
3. **`created()` 已导入但未使用**: 第 3 行 `import { success, fail, paginate } from '../utils';` 缺少 `created`。

**修复建议**:

```typescript
import { success, fail, paginate, created } from '../utils';
// ...
created(res, item, '创建项目成功');
```

---

### MEDIUM 级别

#### M-1: 参数校验架构缺失 — 无统一的验证层

**位置**: 全文件

**分析**:

当前参数校验分散在各 handler 中，使用手写的 `if` 检查：

```typescript
// 各处不同的校验模式
if (!short_name || !full_name || !company_id) { ... }  // 存在性检查
if (isNaN(id)) { ... }                                    // 类型检查
const page = parseInt(req.query.page as string) || 1;     // 隐式转换 + 默认值
```

问题：

1. **无统一的验证 Schema**: 每个字段用什么规则验证、最大长度、格式要求等，都散落在代码中，无法一览全貌。
2. **`short_name` 类型未验证**: `!short_name` 只检查 falsy，空字符串 `""` 会通过检查。
3. **`company_id` 可能是非正整数**: `!company_id` 对 `0` 和 `-1` 都返回 true（会被拦截），但对 `1.5` 不会拦截，`parseInt("1.5")` 返回 `1`。
4. **缺少 `operator_ids`/`viewer_ids` 数组校验**: 未验证是否为数组、元素是否为正整数。

**修复建议**:

引入 Zod 或类似的 schema 验证库，统一定义验证规则：

```typescript
import { z } from 'zod';

const createProjectSchema = z.object({
  short_name: z.string().min(1).max(50),
  full_name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  company_id: z.number().int().positive(),
  operator_ids: z.array(z.number().int().positive()).optional(),
  viewer_ids: z.array(z.number().int().positive()).optional(),
});

// 可作为中间件或 handler 内使用
const validated = createProjectSchema.parse(req.body);
```

---

#### M-2: `req.body` 直接传递给 service — 过度传递（Over-posting）风险

**位置**: `createProject` 第 154 行、`updateProject` 第 233 行

```typescript
// createProject — 整个 req.body 传给 service
const item = await projectService.create(req.body);

// updateProject — delete company_id 后传给 service
delete req.body.company_id;
const item = await projectService.update(id, req.body, userId, role);
```

**分析**:

1. **create 场景**: `req.body` 中的所有字段直接传递给 service 的 `create` 方法。如果攻击者在 body 中添加额外字段（如 `status: true`），service 层的 `mapProject` 不会处理这些字段，但 Prisma 的 `data` 对象如果不做白名单过滤，可能存在风险。
2. **update 场景**: 通过 `delete req.body.company_id` 来防止 company_id 被修改，这是一种**黑名单**模式。如果未来新增需要保护的字段，必须记住在 controller 层添加对应的 delete 操作。

正确做法：使用**白名单**模式，只提取允许的字段。

```typescript
// 白名单模式
const data: CreateProjectRequest = {
  short_name: req.body.short_name,
  full_name: req.body.full_name,
  description: req.body.description,
  company_id: effectiveCompanyId,
  operator_ids: req.body.operator_ids,
  viewer_ids: req.body.viewer_ids,
};
const item = await projectService.create(data);
```

---

#### M-3: Controller 与 Service 的查询协调问题 — 重复查询

**位置**: `updateProject` 第 216-233 行、`deleteProject` 第 274-282 行

**分析**:

`updateProject` 的执行流程：

```
controller.getById(id)          → Prisma SELECT (查项目 + 关联)
  ↓ controller 做权限检查
controller.update(id, body)     → service.update()
  ↓ service 内部
  service.findFirst(id)         → Prisma SELECT (再查一次项目)
  ↓ service 做存在性检查
  service Prisma UPDATE         → Prisma UPDATE (含 include)
```

同一条项目记录在 service 层被查询了两次（controller 的 `getById` 和 service 的 `update` 内部的 `findFirst`），不仅浪费数据库资源，还引入了上述 TOCTOU 问题。

`deleteProject` 的 admin 分支同样如此。

**修复建议**:

将 controller 中的权限检查逻辑下沉到 service 层，避免 controller 单独调用 `getById`。或者让 service 的 `update`/`delete` 方法接受可选的 `existing` 参数，避免重复查询。

---

#### M-4: 模块级服务实例 — 单例在测试中的隔离问题

**位置**: 第 5 行

```typescript
const projectService = new ProjectServiceImpl();
```

**分析**:

模块顶层创建服务实例意味着：

1. **测试隔离困难**: 所有测试共享同一个 `projectService` 实例。如果 service 内部有状态（虽然当前是无状态的），测试之间可能相互影响。
2. **无法按测试场景配置**: 如果需要为不同测试传入不同的配置（如不同的数据库连接），无法通过构造函数参数传递。
3. **import 副作用**: 任何 `import` 此 controller 模块的代码都会触发 `ProjectServiceImpl` 的实例化，即使不需要使用它。

**修复建议**:

使用工厂函数或延迟初始化：

```typescript
let _projectService: IProjectService | null = null;

function getProjectService(): IProjectService {
  if (!_projectService) {
    _projectService = new ProjectServiceImpl();
  }
  return _projectService;
}
```

---

### LOW 级别

#### L-1: Swagger 文档与实际行为不一致

**位置**: 所有 Swagger 注释

**分析**:

1. **缺少 401/403 响应**: 路由层配置了 `authMiddleware` 和 `roleMiddleware`，但 Swagger 注释未定义 401/403 响应。
2. **create 的 response 应为 201**: Swagger 注释中 `responses` 部分只定义了 201，但未定义 400。实际上代码中会返回 400（验证失败）和 500（服务异常）。
3. **update/delete 缺少 403 响应**: admin 非 operator 会被拒绝，但 Swagger 未标注。

---

#### L-2: Controller 缺少输入/输出的 TypeScript 类型约束

**位置**: 全文件

**分析**:

所有 handler 使用 Express 的 `Request` 和 `Response` 类型，`req.body` 的类型是 `any`，`req.query` 的类型也是 `any`。如果使用泛型约束（如 `Request<{}, {}, CreateProjectRequest>`），可以在编译时捕获字段名拼写错误。

---

#### L-3: 缺少分页参数的边界约束

**位置**: `listProjects` 第 42-43 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**分析**:

未限制 `pageSize` 的最大值。攻击者可以传入 `pageSize=1000000` 导致一次查询返回大量数据，造成内存溢出或数据库性能问题。建议限制 `pageSize` 上限为 100。

---

## 三、函数逐项架构评审

### 3.1 listProjects（第 40-54 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 仅做参数提取和响应格式化，业务逻辑在 service 层 |
| 参数验证 | ⚠️ | page/pageSize/company_id 缺少范围校验 |
| 响应一致性 | ✅ | 使用 `paginate()` 标准响应 |
| 分页安全性 | ⚠️ | pageSize 无上限 |

### 3.2 getProject（第 76-98 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | 包含 admin operator 权限检查（应下沉到 service） |
| 参数验证 | ✅ | ID 校验完整（parseInt + NaN） |
| 授权架构 | ⚠️ | 权限检查应统一在 service 层 |
| 错误映射 | ⚠️ | 基于字符串匹配的错误分派 |

### 3.3 createProject（第 141-163 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ❌ | 包含 company_id 覆盖业务规则（应下沉到 service） |
| 参数验证 | ⚠️ | 缺少字段类型和长度验证 |
| 不可变性 | ❌ | 直接修改 `req.body` |
| 响应构造 | ❌ | 手动构造 201 响应，未用 `created()` |
| 过度传递 | ⚠️ | `req.body` 整体传给 service |

### 3.4 updateProject（第 210-244 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ❌ | 包含 company_id 不可更改的业务规则 + operator 权限检查 |
| 重复查询 | ❌ | controller `getById` + service `findFirst` 重复 |
| TOCTOU | ⚠️ | 先读后更新的竞态窗口 |
| 不可变性 | ❌ | `delete req.body.company_id` 直接修改请求体 |

### 3.5 deleteProject（第 266-291 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | admin 分支包含 operator 权限检查 |
| 重复查询 | ⚠️ | admin 分支调用 `getById` 后再调 `delete`（内部又查一次） |
| TOCTOU | ⚠️ | 先读后删的竞态窗口 |
| 一致性 | ⚠️ | 与 update 的权限检查实现模式不同 |

---

## 四、授权架构专项分析

### 当前授权模型

```
请求 → roleMiddleware(['sysadmin','admin']) → controller handler → service
                                                ↓
                                        if (role === 'admin') {
                                          // operator 归属检查
                                        }
```

### 问题总结

| 问题 | 影响范围 | 架构风险 |
|------|----------|----------|
| 授权检查分散在 controller 和 service | getProject, updateProject, deleteProject | 新增角色需修改多处 |
| sysadmin 的行为隐式为"无限制" | 全部 handler | 依赖隐式假设，未来可能需要 sysadmin 级别约束 |
| admin 的 operator 检查在 controller 而非 service | getProject, updateProject, deleteProject | 绕过 controller 直接调 service 会跳过授权 |
| 无授权中间件统一处理 | 全局 | 每个 handler 手写授权逻辑 |

### 理想架构

```
请求 → authMiddleware → roleMiddleware → resourceAuthMiddleware → controller → service
                                                  ↓                              ↓
                                          统一资源归属检查              纯业务逻辑
                                          (owner/operator)            (无授权代码)
```

或者将资源授权下沉到 service 层：

```
请求 → authMiddleware → roleMiddleware → controller → service
                                                  ↓
                                          service.getById(id, authContext)
                                            → 内部统一做角色+归属检查
```

---

## 五、与同类控制器的架构对比

| 架构维度 | project.controller | llm-model.controller | company.controller |
|----------|--------------------|--------------------|--------------------|
| 依赖注入 | `new Impl()` 无接口类型 | 同 | 同 |
| 授权模式 | controller 层 if-else | service 层过滤 | controller 层 |
| 错误处理 | 字符串匹配 | 字符串匹配 | 字符串匹配 |
| 响应构造 | 手动 201 | 已用 `created()` | 已用 `created()` |
| 参数校验 | 手写 if | 手写 if + NaN 检查 | 手写 if |
| TOCTOU | 存在 | 不涉及 | 不涉及 |
| 职责边界 | 混入业务逻辑 | 较清晰 | 较清晰 |

**结论**: project.controller 是所有控制器中业务逻辑侵入 controller 层最严重的。其他控制器通常只做参数提取和响应映射，而 project.controller 承担了 company_id 业务规则和 operator 权限检查。

---

## 六、修复优先级建议

### P0（立即修复 — 架构缺陷）

1. **C-1**: 将 admin 的 operator 归属检查从 controller 下沉到 service 层
2. **C-2**: 将 `company_id` 覆盖和不可更改规则从 controller 下沉到 service 层

### P1（尽快修复 — 架构质量）

3. **H-1**: 将 `projectService` 类型声明为 `IProjectService` 接口
4. **H-2**: 引入自定义异常类替代字符串匹配错误分派
5. **H-4**: 使用 `created()` 替代手动 201 响应构造
6. **M-2**: 改为白名单模式提取请求参数

### P2（计划修复 — 可维护性）

7. **H-3**: 评估 TOCTOU 风险，考虑在 service 层引入事务
8. **M-1**: 引入 Zod schema 验证替代手写 if 检查
9. **M-3**: 消除 controller 和 service 的重复查询

### P3（可选改进）

10. **M-4**: 改进服务实例化方式（工厂/延迟初始化）
11. **L-1**: 完善 Swagger 错误响应定义
12. **L-2**: 为 handler 添加 TypeScript 泛型约束
13. **L-3**: 添加 pageSize 上限

---

## 七、总结

`project.controller.ts` 的核心架构问题是**职责边界模糊**：

1. **Controller 层承载了过多业务逻辑**: `company_id` 不可更改规则、admin 公司覆盖规则、admin operator 归属检查——这些都应该在 service 层执行。Controller 应该只负责 HTTP 协议层面的工作（提取参数、映射状态码、格式化响应）。

2. **授权架构分散**: 路由层做角色白名单、controller 层做资源归属、service 层做数据过滤——三层各管一部分，没有统一的授权抽象。当角色体系扩展时，修改面广且易遗漏。

3. **错误处理基于隐式契约**: service 层抛出的错误消息字符串是 controller 层 catch 逻辑的分派依据，这是一个脆弱的隐式契约。应引入类型化的异常体系。

4. **响应格式不一致**: 手动构造 201 响应绕过了项目的响应工具函数，在 API 契约层面引入了不确定性。

建议按照 **service 层承业务逻辑 → 自定义异常 → 统一授权中间件** 的路径逐步重构，使 controller 回归到纯粹的 HTTP 适配器角色。
