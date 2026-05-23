# apis/controller/auth.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + API 设计 + 关注点分离 + 可扩展性 + 可维护性）
**文件路径**: `apis/controller/auth.controller.ts`
**代码行数**: 247 行
**关联文件**: `apis/service/auth.service.ts`, `apis/service/impl/auth.service.impl.ts`, `apis/middleware/auth.middleware.ts`, `apis/utils/response.util.ts`, `apis/entity/user.entity.ts`, `apis/app.ts`
**严重级别**: CRITICAL(1) / HIGH(4) / MEDIUM(4) / LOW(3)

---

## 一、架构评价总览

认证控制器包含 8 个 HTTP 端点处理函数，覆盖认证生命周期的核心阶段：登录 → 令牌验证 → 上下文选择 → 资源访问 → 登出。从 Express 分层架构视角看，该文件位于 **Controller 层**，应严格承担 HTTP 请求/响应适配的职责，将业务逻辑委托给 Service 层。

从软件架构专家视角审视，该文件存在 **依赖倒置缺失、关注点泄露、API 契约不一致、冗余防御层** 四大架构级问题。这些问题虽不直接导致运行时故障，但会随系统规模增长导致测试困难、维护成本激增和架构腐化。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层合规 | 4/10 | Controller 泄露了 Service 层异常类型（LoginSelectionError），违反层间隔离 |
| 依赖管理 | 3/10 | 直接依赖具体实现而非接口，无依赖注入，可测试性差 |
| API 设计 | 6/10 | RESTful 路径设计基本合理，但 HTTP 语义和状态码使用不一致 |
| 关注点分离 | 5/10 | 验证逻辑分散在 Controller 和 Service，缺少统一验证层 |
| 可扩展性 | 5/10 | 硬编码单例实例，横向扩展和替换能力弱 |
| 可维护性 | 6/10 | 文件大小合理，Swagger 完备，但访问模式不一致增加认知负担 |

---

## 二、架构问题清单

### CRITICAL-1: 依赖倒置原则（DIP）严重违反 — Controller 直接耦合 Service 实现

**位置**: 第 2 行 + 第 6 行

```typescript
import { AuthServiceImpl } from '../service/impl/auth.service.impl';  // 具体实现
const authService = new AuthServiceImpl();  // 模块级硬编码实例化
```

**架构问题**:

这是该文件最根本的架构缺陷。Controller 直接 `import` 并实例化了 Service 的**具体实现类** `AuthServiceImpl`，而非依赖抽象接口 `IAuthService`。

违反的 SOLID 原则:
- **D（依赖倒置）**: 高层模块（Controller）应依赖抽象（`IAuthService`），不依赖具体实现（`AuthServiceImpl`）
- **O（开闭）**: 替换 Service 实现必须修改 Controller 源码，无法通过配置切换

实际影响:

| 场景 | 当前状态 | 期望状态 |
|------|----------|----------|
| 单元测试 | 无法注入 mock，只能做集成测试 | 通过构造器/工厂注入 mock Service |
| 多实现切换 | 修改 import 语句 | 修改配置/DI 容器 |
| 服务降级/熔断 | Controller 硬编码，无法动态替换 | 替换为代理/装饰器实现 |

**注意**: 该模式在项目其他 Controller 中一致存在（如 `article.controller.ts`、`user.controller.ts`），属于项目级的架构权衡。但作为架构评审，仍标记为 CRITICAL，因为它影响整个代码库的可测试性和可替换性。

**修复建议**:

方案 A（最小改动 — 工厂模式）:

```typescript
// apis/controller/auth.controller.ts
import { IAuthService } from '../service/auth.service';

let authService: IAuthService;

export function setAuthService(service: IAuthService): void {
  authService = service;
}

// 默认实例化（生产环境）
setAuthService(new (require('../service/impl/auth.service.impl').AuthServiceImpl)());
```

方案 B（推荐 — 简单 DI 容器）:

```typescript
// apis/container.ts — 轻量级服务容器
class ServiceContainer {
  private services = new Map<string, any>();

  register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) throw new Error(`Service not registered: ${key}`);
    return service;
  }
}

export const container = new ServiceContainer();
```

```typescript
// apis/controller/auth.controller.ts
import { container } from '../container';
import { IAuthService } from '../service/auth.service';

const authService = container.resolve<IAuthService>('AuthService');
```

方案 C（测试环境专用 — 参数默认值）:

```typescript
export async function login(req: Request, res: Response, service: IAuthService = authService): Promise<void> {
  // 测试时注入 mock service
}
```

---

### HIGH-1: Controller 泄露 Service 层异常类型 — 分层边界破坏

**位置**: 第 3 行 + 第 46-48 行

```typescript
import { LoginSelectionError } from '../entity';  // 引入 Service 层异常

} catch (err: any) {
  if (err instanceof LoginSelectionError) {  // Controller 知道 Service 层的异常类型
    fail(res, 403, err.message);
    return;
  }
  fail(res, 401, err.message || '登录失败');
}
```

**架构问题**:

分层架构的基本原则是 **层间信息隐藏**。Controller 层不应了解 Service 层抛出的具体异常类型。这造成:

1. **耦合链**: `entity` → `service` → `controller`，异常类型变更会传播到 Controller
2. **语义泄露**: Controller 需要理解 `LoginSelectionError` 的业务含义（403 vs 401），违反职责单一
3. **不可扩展**: 新增 Service 异常类型（如 `TokenExpiredError`、`AccountLockError`）需同步修改 Controller

正确的架构是 Service 层返回结构化结果或抛出通用异常，由 Controller 统一映射到 HTTP 状态码。

**修复建议**:

方案 A（Service 返回结构化结果 — 推荐）:

```typescript
// apis/service/auth.service.ts — 接口定义
interface LoginResult {
  success: true;
  data: LoginResponse;
} | {
  success: false;
  reason: 'invalid_credentials' | 'no_accessible_entity';
  message: string;
}

export interface IAuthService {
  login(request: LoginRequest): Promise<LoginResult>;
  // ...
}

// Controller
export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login({ username, password });
  if (result.success) {
    success(res, result.data, '登录成功');
  } else if (result.reason === 'no_accessible_entity') {
    fail(res, 403, result.message);
  } else {
    fail(res, 401, result.message);
  }
}
```

方案 B（统一错误基类 + 错误码）:

```typescript
// apis/entity/errors.ts
class AppError extends Error {
  constructor(public code: string, public statusCode: number, message: string) {
    super(message);
  }
}

// Service 层
throw new AppError('LOGIN_NO_ENTITY', 403, '无可访问的公司或项目');

// Controller 统一处理
} catch (err) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    fail(res, 500, '操作失败');
  }
}
```

---

### HIGH-2: `verify` 端点架构冗余 — Controller 重复执行 Middleware 的职责

**位置**: 第 82-94 行

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.substring(7);  // 1. 重复提取 token
  if (!token) {
    fail(res, 401, '未提供token');                          // 2. 重复验证 token 存在性
    return;
  }
  const result = await authService.verifyToken(token);     // 3. 重复验证 token 有效性
  if (result.valid) {
    success(res, { valid: true }, 'token有效');
  } else {
    fail(res, 401, 'token无效或已过期');
  }
}
```

**架构问题**:

根据 `app.ts:99` 的路由配置，`/api/auth/verify` 已受 `authMiddleware` 保护。中间件的职责链是:

```
请求 → authMiddleware（提取 token → jwt.verify → 设置 req.user）→ verify handler
```

`authMiddleware`（`auth.middleware.ts:20-35`）已完成:
1. 从 `Authorization` header 提取 Bearer token
2. 调用 `jwt.verify()` 验证签名和有效期
3. 将解码后的 payload 附加到 `req.user`

Controller 的 `verify` 函数再次执行了上述全部三步，造成:

| 问题 | 影响 |
|------|------|
| 冗余 JWT 验证 | 每次请求 2 次 `jwt.verify()` 调用，浪费 CPU |
| `substring(7)` 硬编码 | 假设固定 `Bearer ` 前缀，与中间件的提取逻辑不同步 |
| 违反 DRY | token 提取逻辑在 middleware 和 controller 各一份 |
| 架构角色混乱 | Controller 越权执行了 Middleware 的认证职责 |

**修复建议**: Controller 应信任 Middleware 的认证结果:

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  // authMiddleware 已保证 req.user 存在且 token 有效
  success(res, { valid: true }, 'token有效');
}
```

---

### HIGH-3: API 契约不一致 — HTTP 语义和响应格式不统一

**位置**: 多个端点

#### 3a. HTTP 状态码语义错误

```typescript
// login: 认证失败返回 401 — 正确 ✓
fail(res, 401, '登录失败');

// saveSelection: userId 未获取到返回 500 — 错误 ✗
// 应返回 401（认证问题）或 400（请求问题）
fail(res, 500, err.message || '保存失败');

// getAccessibleCompanies: 无权限返回 500 — 错误 ✗
fail(res, 500, err.message || '获取公司列表失败');
```

#### 3b. 响应载荷结构不一致

```typescript
// login: 返回 { data: result, message: '登录成功' }
success(res, result, '登录成功');

// getAccessibleCompanies: 返回 { data: companies }（无 message）
success(res, companies);

// getContext: 返回 { data: { companies, projects }, message: '获取成功' }
success(res, { companies, projects }, '获取成功');
```

#### 3c. 输入解析模式不一致

```typescript
// req.body — 对象解构
const { username, password } = req.body;          // login, saveSelection

// req.query — 类型断言 + parseInt
const companyId = parseInt(req.query.company_id as string, 10);  // getAccessibleProjects

// req.params — parseInt + isNaN
const id = parseInt(req.params.id as string, 10);  // getCompanyDetail

// req.user — 三种不同访问方式
const userId = (req as any).user?.userId;          // saveSelection
const user = (req as any).user;                    // getAccessibleCompanies, getAccessibleProjects
const user = req.user!;                            // getContext, getCompanyDetail
```

**架构影响**: API 契约的不一致性导致:
- 前端开发者无法建立统一的心理模型
- 自动化测试需要为每个端点编写不同的断言模式
- API 文档（Swagger）无法从代码自动推导一致性规则

**修复建议**: 建立项目级 API 规范:

```typescript
// 1. 统一 req.user 访问模式
// 所有受保护端点开头统一:
const user = req.user;
if (!user) { fail(res, 401, '未登录'); return; }

// 2. 统一输入解析 — 提取公共函数
function parseId(value: string | undefined, fieldName: string): number | null {
  if (!value) return null;
  const id = parseInt(value, 10);
  return isNaN(id) ? null : id;
}

// 3. 统一响应格式 — success 总是带 message
success(res, data, '操作成功');  // 不省略 message
```

---

### HIGH-4: 缺少统一的请求验证层（Validation Layer）

**位置**: 全局架构问题

**架构问题**:

当前项目没有独立的请求验证层。验证逻辑分散在三个位置:

| 验证类型 | 当前位置 | 应在位置 |
|----------|----------|----------|
| 用户名/密码非空 | Controller（第 39 行） | Validation Middleware |
| company_id 类型检查 | Controller（第 123 行） | Validation Middleware |
| company_id 范围检查 | Controller（第 233 行） | Validation Middleware |
| 用户权限检查 | Service 层 | Authorization Middleware/Service |
| 公司状态检查 | Service 层（第 144-150 行） | Service 层 ✓ |

对比项目其他 Controller（如 `article.controller.ts`），同样存在验证逻辑分散在 Controller 内部的问题。

**修复建议**: 引入验证中间件层:

```typescript
// apis/middleware/validate.middleware.ts
import { z } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      fail(res, 400, result.error.issues.map(i => i.message).join('; '));
      return;
    }
    req.body = result.data.body;
    next();
  };
}

// 路由注册
app.post('/api/auth/login', validate(loginSchema), authController.login);
app.put('/api/auth/selection', authMiddleware, validate(selectionSchema), authController.saveSelection);
```

这将:
- 将验证逻辑从 Controller 中剥离
- 提供编译时类型安全（Zod 推导 TypeScript 类型）
- 在中间件层提前拒绝无效请求，减少 Controller 和 Service 的验证负担

---

### MEDIUM-1: `logout` 端点为空操作 — 架构上的认证/授权不完整

**位置**: 第 66-68 行

```typescript
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');
}
```

**架构问题**:

从认证架构完整性看，JWT 的无状态特性意味着"登出"无法在服务端真正实现。当前实现存在:

1. **安全架构缺口**: JWT 在 2 小时有效期内始终可用，"登出" 只是前端清除 localStorage 的假象
2. **API 契约误导**: Swagger 标注为 "User logout"，但服务端并未使令牌失效
3. **缺少令牌黑名单/刷新机制**: 架构上无法支持紧急令牌撤销（如密码泄露后强制登出）

**建议**: 这是 JWT 架构的已知权衡，短期可维持现状但应在 Swagger 文档中注明。长期考虑:

```
方案 A: 短期 JWT + 长期 Refresh Token
方案 B: Redis 令牌黑名单（logout 时将 token 加入黑名单）
方案 C: Token 版本号（User 表增加 tokenVersion 字段，logout 时递增）
```

---

### MEDIUM-2: `getAccessibleCompanies` / `getAccessibleProjects` 职责重叠 — 缺少 Facade 模式

**位置**: 第 143-181 行 + 第 201-213 行

**架构问题**:

`getContext`（第 201-213 行）本质上是 `getAccessibleCompanies` 和 `getAccessibleProjects` 的聚合调用:

```typescript
const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
const projects = targetCompanyId
  ? await authService.getAccessibleProjects(user.userId, user.role, targetCompanyId)
  : [];
```

但 `getAccessibleCompanies` 和 `getAccessibleProjects` 是独立端点，各自有 Controller 处理函数。这导致:

1. **路由碎片化**: 前端初始化需要分别调用 2-3 个 API（companies → 选择 company → projects），增加请求延迟
2. **Controller 重复**: 三个函数都执行类似的 user 提取 + 权限判断 + try-catch 模式
3. **无编排层**: 缺少 Service 层的编排方法来聚合多个子调用

**建议**: 在 Service 层添加 Facade 方法:

```typescript
// IAuthService
getContext(userId: number, role: string, companyId?: number | null, targetCompanyId?: number): Promise<{
  companies: Company[];
  projects: Project[];
}>;
```

---

### MEDIUM-3: 错误处理架构缺失 — 无统一错误中间件

**位置**: 全局架构

**架构问题**:

当前 8 个端点中有 6 个使用 try-catch，但每个 catch 块的处理模式不完全相同:

```typescript
// login — 区分 LoginSelectionError 和其他错误
if (err instanceof LoginSelectionError) { fail(res, 403, ...); }
fail(res, 401, err.message || '登录失败');

// saveSelection — 统一 500
fail(res, 500, err.message || '保存失败');

// verify — 无 try-catch（直接冒泡）
```

项目缺少 Express 全局错误处理中间件（`app.ts` 中未发现 `errorHandler` 中间件）。这导致:
- 每个 Controller 函数必须自行处理错误
- 错误处理风格不统一（有的返回 err.message，有的返回通用消息）
- 未捕获的异常可能导致进程崩溃

**建议**: 添加全局错误处理中间件:

```typescript
// apis/middleware/error-handler.middleware.ts
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', { error: err, path: req.path });

  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }

  // 不泄露内部错误信息
  fail(res, 500, '服务器内部错误');
}

// app.ts — 放在所有路由之后
app.use(errorHandler);
```

---

### MEDIUM-4: `saveSelection` 缺少授权验证 — 架构层面的访问控制缺口

**位置**: 第 119-132 行

```typescript
export async function saveSelection(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const { company_id, project_id } = req.body;
    // ❌ 未验证 company_id 是否为该用户可访问的公司
    // ❌ 未验证 project_id 是否为该用户可访问的项目
    await authService.saveSelection(userId, { company_id, project_id });
```

**架构问题**:

从访问控制架构看，系统的权限模型是:

```
sysadmin → 所有公司/项目
admin    → 所属公司 + 操作员项目
view     → 所属公司 + 可查看项目
```

但 `saveSelection` 允许用户将 `selectedCompanyId` 设置为任意值。虽然 `getAccessibleProjects` 和 `getAccessibleCompanies` 会在读取时过滤，但:
- 用户选择了一个无权限的公司后，后续依赖 `selectedCompanyId` 的业务逻辑可能产生意外行为
- Service 层的 `saveSelection` 直接更新数据库，未做授权检查

这属于 **访问控制策略不完整** 的架构问题。

---

### LOW-1: Swagger 文档与实际行为不完全匹配

**位置**: 多处 Swagger 注释

```typescript
// logout: Swagger 标注 "security: bearerAuth"，但实际不验证 token 有效性
// verify: Swagger 未说明此端点用于前端 token 有效性检查
// selection: Swagger requestBody 标注 project_id nullable，但代码未处理 null
```

**影响**: API 文档是前后端的契约，文档与行为不一致会增加前端集成成本。

---

### LOW-2: 函数签名中 `Promise<void>` 返回类型未充分利用

**位置**: 所有 8 个函数

```typescript
export async function login(req: Request, res: Response): Promise<void> {
```

**架构问题**: 所有 handler 返回 `Promise<void>`，Express 不使用返回值。这意味着:
- 测试时无法通过返回值断言结果，必须检查 `res` 的调用参数
- 无法使用函数式组合模式（如 `handler1().then(handler2)`）

这是 Express 的设计约束，但了解这一点有助于设计测试策略。

---

### LOW-3: 魔法字符串 `substring(7)` 和状态码硬编码

**位置**: 第 83 行

```typescript
const token = req.headers.authorization?.substring(7);  // "Bearer ".length === 7
```

以及多处状态码硬编码: `400`, `401`, `403`, `500`。

**建议**: 提取为常量或使用 HTTP 状态码枚举:

```typescript
import { StatusCodes } from 'http-status-codes';
// 或
const BEARER_PREFIX = 'Bearer ';
const token = req.headers.authorization?.slice(BEARER_PREFIX.length);
```

---

## 三、架构改进路线图

### 第一阶段：基础加固（1-2 天）

| 优先级 | 问题 | 修复方案 | 影响范围 |
|--------|------|----------|----------|
| P0 | CRITICAL-1 | 引入轻量 DI 容器或工厂模式 | 全项目 Controller |
| P1 | HIGH-2 | 简化 verify 函数，信任 Middleware | 本文件 |
| P1 | HIGH-3 | 统一 req.user 访问 + 输入解析 | 本文件 |

### 第二阶段：架构优化（1 周）

| 优先级 | 问题 | 修复方案 | 影响范围 |
|--------|------|----------|----------|
| P1 | HIGH-1 | 引入 AppError 基类，消除 LoginSelectionError 耦合 | entity + service + controller |
| P1 | HIGH-4 | 引入 Zod 验证中间件 | 全项目 |
| P2 | MEDIUM-3 | 添加全局错误处理中间件 | app.ts |

### 第三阶段：架构演进（持续）

| 优先级 | 问题 | 修复方案 | 影响范围 |
|--------|------|----------|----------|
| P2 | MEDIUM-1 | JWT 黑名单或 Refresh Token | 认证架构 |
| P2 | MEDIUM-2 | Service 层 Facade 方法 | auth.service |
| P2 | MEDIUM-4 | saveSelection 授权验证 | auth.service.impl |

---

## 四、与其他 Controller 的架构一致性分析

对比项目其他 Controller 文件:

| 架构特征 | auth.controller | article.controller | user.controller | 一致性评价 |
|----------|-----------------|-------------------|-----------------|------------|
| 模块级单例 | `new AuthServiceImpl()` | `new ArticleServiceImpl()` | 同 | 一致 — 但都是反面模式 |
| try-catch 模式 | 6/8 端点有 | 9/9 端点有 | 同 | 一致 |
| req.user 访问 | `(req as any).user` + `req.user!` | `req.user!` 为主 | 同 | auth 最不一致 |
| 错误信息处理 | `err.message` 泄露 | `err.message` 泄露 | 同 | 一致 — 但都是问题 |
| 输入验证 | 手动 if 检查 | 手动 if 检查 | 同 | 一致 — 但缺少 schema 验证 |

**结论**: `auth.controller.ts` 的架构问题具有项目级共性。修复应作为项目级重构任务，而非单独处理。

---

## 五、推荐的认证架构演进方向

```
当前架构:
┌──────────┐    ┌──────────────┐    ┌───────────────────┐
│  Client   │───→│  Middleware  │───→│  auth.controller  │
└──────────┘    │  (auth+rate) │    │  (new Service())  │
                └──────────────┘    └───────────────────┘
                                          │
                                    ┌─────▼──────────────┐
                                    │  AuthServiceImpl    │
                                    │  (Prisma + JWT)     │
                                    └─────────────────────┘

目标架构:
┌──────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────┐
│  Client   │───→│  Middleware 链   │───→│ auth.controller │───→│ IAuthService │
└──────────┘    │  auth + rate +   │    │  (DI 注入)      │    │ (interface)  │
                │  validate(schema)│    └─────────────────┘    └──────┬───────┘
                └──────────────────┘                                   │
                                                          ┌───────────▼────────────┐
                                                          │  AuthServiceImpl        │
                                                          │  (Prisma + JWT)         │
                                                          └────────────────────────┘
```

关键变化:
1. **Validation Layer** 独立为中间件
2. **Controller** 通过 DI 容器获取 Service 接口
3. **Error Handler** 统一处理所有异常
4. **AppError** 替代 LoginSelectionError 等具体异常类型

---

## 六、评审结论

**判定: ⚠️ 有条件通过 — 架构级问题应纳入技术债务治理计划**

核心架构问题集中在四个方面:

1. **依赖倒置缺失（CRITICAL-1）** — Controller 直接耦合 Service 实现，是项目级问题，影响所有 Controller 的可测试性
2. **分层边界破坏（HIGH-1）** — Controller 了解 Service 层异常类型，层间耦合过紧
3. **职责冗余（HIGH-2）** — verify 端点重复执行 Middleware 的认证职责
4. **验证层缺失（HIGH-4）** — 无统一请求验证层，验证逻辑分散在 Controller 中

这些问题不会立即导致运行时故障，但会随系统增长导致:
- 自动化测试覆盖率难以提升
- 新端点开发效率下降（每个端点重复编写验证和错误处理）
- Service 层变更的影响范围不可控

**建议**:
- 短期: 修复 HIGH-2（verify 简化）和 HIGH-3（统一访问模式），成本低且收益明确
- 中期: 引入 DI 容器 + Zod 验证中间件 + 全局错误处理
- 长期: 作为技术债务治理的一部分，统一重构所有 Controller

---

*软件架构专家评审完成 — 2026-05-23*

---

# apis/controller/auth.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 代码安全专家（认证与授权 / 输入验证 / 注入攻击 / 信息泄露 / 错误处理 / 会话管理）
**文件路径**: `apis/controller/auth.controller.ts`
**代码行数**: 247 行
**关联文件**: `apis/service/impl/auth.service.impl.ts`, `apis/middleware/auth.middleware.ts`, `apis/config/index.ts`, `apis/entity/user.entity.ts`, `apis/app.ts`
**严重级别**: CRITICAL(2) / HIGH(5) / MEDIUM(5) / LOW(4)

---

## 一、安全评价总览

从代码安全专家视角对认证控制器进行全面审查，重点关注 OWASP Top 10 安全风险：认证失效（A07）、访问控制失效（A01）、注入（A03）、安全配置错误（A05）、加密失败（A02）。

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证安全 | 6/10 | bcrypt 密码哈希、登录错误统一，但缺少暴力破解防护和账户状态检查 |
| 授权安全 | 5/10 | getCompanyDetail 有权限检查，但 saveSelection 和 getAccessibleProjects 缺少 |
| 输入验证 | 4/10 | 仅做基本的 truthy 检查，缺少类型、格式、范围验证 |
| 信息泄露防护 | 5/10 | 登录错误统一，但其他端点 err.message 直接暴露给客户端 |
| 会话管理 | 5/10 | JWT 2h 有效，logout 无服务端失效，无 Token 黑名单 |
| 错误处理 | 4/10 | catch 块中 err.message 可能泄露数据库表名、字段名等内部信息 |

**安全总评**: 6/10 — 存在 2 个 CRITICAL 和 5 个 HIGH 安全问题，需要优先修复。

---

## 二、安全问题清单

### CRITICAL-1: saveSelection 越权修改 — IDOR（Insecure Direct Object Reference）

**OWASP 分类**: A01:2021 – Broken Access Control
**位置**: 第 119-132 行 + `auth.service.impl.ts` 第 104-113 行

**问题描述**: `saveSelection` 接收 JWT 中的 `userId`，然后在 service 层直接使用该 userId 执行数据库更新，但**未验证**传入的 `company_id` 和 `project_id` 是否属于该用户可访问的范围。

```typescript
// auth.controller.ts 第 121-127 行
const userId = (req as any).user?.userId;
const { company_id, project_id } = req.body;
// ❌ 未验证 company_id / project_id 是否属于用户可访问范围
await authService.saveSelection(userId, { company_id, project_id });

// auth.service.impl.ts 第 104-113 行
await prisma.user.update({
  where: { id: userId },
  data: {
    selectedCompanyId: request.company_id,   // ❌ 任意值均可写入
    selectedProjectId: request.project_id ?? null,
  },
});
```

**安全影响**: 攻击者可使用合法 JWT token，将 `selectedCompanyId` 修改为任意公司 ID，包括不属于其权限范围的公司。后续业务逻辑若依赖 `selectedCompanyId` 做权限判断，将导致**权限提升**。

**修复建议**: 在 service 层调用 `getAccessibleCompanies` 和 `getAccessibleProjects` 验证 ID 合法性：

```typescript
async saveSelection(userId: number, role: string, userCompanyId: number | null | undefined, request: SaveSelectionRequest): Promise<void> {
    const accessibleCompanies = await this.getAccessibleCompanies(userId, role, userCompanyId);
    if (!accessibleCompanies.some(c => c.id === request.company_id)) {
      throw new Error('无权选择该公司');
    }
    if (request.project_id) {
      const accessibleProjects = await this.getAccessibleProjects(userId, role, request.company_id);
      if (!accessibleProjects.some(p => p.id === request.project_id)) {
        throw new Error('无权选择该项目');
      }
    }
    // 验证通过后才更新
    await prisma.user.update({ ... });
}
```

---

### CRITICAL-2: 登录端点缺少独立的暴力破解防护

**OWASP 分类**: A07:2021 – Identification and Authentication Failures
**位置**: 第 36-52 行 + `app.ts` 路由配置

**问题描述**: 登录端点 `POST /api/auth/login` 使用全局 rate-limit（100 次/分钟），对于认证端点过于宽松。攻击者可单 IP 每分钟尝试 100 种密码组合，24 小时可尝试 144,000 种。

```typescript
// app.ts — 登录使用全局 rateLimit (100/min)，无独立限流
app.post('/api/auth/login', authController.login);
```

**安全影响**: 暴力破解风险。特别是 seed 密码 `sysadmin123` 等弱密码可被快速猜中。

**修复建议**: 为登录端点配置独立的严格限流策略：

```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5,                    // 每个 IP 最多 5 次尝试
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

同时建议：
- 添加账户锁定机制（连续失败 N 次后锁定账户）
- 记录失败登录 IP 和时间
- 可选：引入验证码（CAPTCHA）在人机识别后放行

---

### HIGH-1: 登录输入验证不充分 — 缺少类型和格式验证

**OWASP 分类**: A03:2021 – Injection
**位置**: 第 38-42 行

**问题描述**: 仅检查 truthy，未验证类型和格式。传入数组或对象可能导致 `bcrypt.compare` 行为异常。

```typescript
const { username, password } = req.body;
if (!username || !password) {  // ❌ 仅 truthy 检查
  fail(res, 400, '用户名和密码不能为空');
  return;
}
```

**安全影响**: 非字符串类型输入可能导致意外错误，泄露系统内部信息。超长输入可能触发 bcrypt 的 DoS（bcrypt 对长输入有显著 CPU 开销）。

**修复建议**:

```typescript
const { username, password } = req.body;
if (typeof username !== 'string' || typeof password !== 'string') {
  fail(res, 400, '用户名和密码格式不正确');
  return;
}
if (username.length > 100 || password.length > 200) {
  fail(res, 400, '输入长度超出限制');
  return;
}
```

---

### HIGH-2: 错误信息泄露内部实现细节

**OWASP 分类**: A05:2021 – Security Misconfiguration
**位置**: 第 50、130、149、179、211、245 行

**问题描述**: 所有 catch 块均使用 `err.message` 直接返回客户端。Prisma 数据库错误消息可能包含表名、字段名、SQL 查询片段。

```typescript
// 第 130 行
fail(res, 500, err.message || '保存失败');  // ❌ err.message 可能是 Prisma 内部错误
// 第 149 行
fail(res, 500, err.message || '获取公司列表失败');  // ❌ 同上
```

**安全影响**: 内部错误消息帮助攻击者了解系统结构（数据库表名、ORM 查询模式），为后续攻击提供信息。

**修复建议**: 对客户端返回通用错误消息，将详细错误记录到服务端日志：

```typescript
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[saveSelection failed]', { error: message, userId });
    fail(res, 500, '保存失败，请稍后重试');  // 客户端通用消息
}
```

---

### HIGH-3: saveSelection 的 company_id 和 project_id 缺少类型和数值验证

**OWASP 分类**: A03:2021 – Injection
**位置**: 第 122-126 行

**问题描述**: `company_id` 仅做 truthy 检查，`project_id` 无任何验证。可传入负数、0、浮点数、极大数字或字符串。

```typescript
const { company_id, project_id } = req.body;
if (!company_id) {  // ❌ -1 会通过检查
  fail(res, 400, 'company_id 不能为空');
  return;
}
```

**安全影响**: 虽然 Prisma 参数化查询防止 SQL 注入，但非法输入可导致 Prisma 运行时错误，这些错误消息可能通过 HIGH-2 泄露到客户端。极大数字可导致数据库性能问题。

**修复建议**:

```typescript
const companyId = parseInt(req.body.company_id, 10);
const projectId = req.body.project_id != null ? parseInt(req.body.project_id, 10) : null;

if (!companyId || companyId <= 0 || isNaN(companyId)) {
  fail(res, 400, 'company_id 必须为正整数');
  return;
}
if (projectId !== null && (projectId <= 0 || isNaN(projectId))) {
  fail(res, 400, 'project_id 必须为正整数或 null');
  return;
}
```

---

### HIGH-4: getAccessibleProjects 允许信息探测 — 遍历 company_id

**OWASP 分类**: A01:2021 – Broken Access Control
**位置**: 第 168-181 行

**问题描述**: 任意已认证用户可查询任意 `company_id` 下的项目。admin/view 用户查询不属于自己的公司时返回空数组而非报错，允许通过枚举 company_id 探测系统中的公司数量和存在性。

```typescript
const companyId = parseInt(req.query.company_id as string, 10);
// ❌ 无公司归属检查，sysadmin 可查任意公司，admin/view 查非本公司返回空
const projects = await authService.getAccessibleProjects(user.userId, user.role, companyId);
```

**安全影响**: 信息泄露 — 攻击者通过枚举 company_id（1, 2, 3...）探测系统中的公司和项目数量，响应时间差异也可能泄露信息（时序攻击）。

**修复建议**: 对非 sysadmin 角色添加公司归属检查：

```typescript
if (user.role !== 'sysadmin' && user.companyId !== companyId) {
  fail(res, 403, '无权查询其他公司的项目');
  return;
}
```

---

### HIGH-5: verify 端点冗余 Token 解析 — 增加攻击面

**OWASP 分类**: A05:2021 – Security Misconfiguration
**位置**: 第 82-94 行

**问题描述**: `verify` 端点已受 `authMiddleware` 保护（已完成 JWT 验证），但函数内部又手动提取 token 并重新验证。`substring(7)` 硬编码假设 `Bearer ` 前缀，与中间件提取逻辑不同步。

```typescript
const token = req.headers.authorization?.substring(7);  // ❌ 硬编码，重复提取
const result = await authService.verifyToken(token);     // ❌ 重复验证
```

**安全影响**: 冗余验证增加攻击面。若 `authorization` header 格式非标准（前有空格、大小写不同），`substring(7)` 可能提取出错误的 token 片段。

**修复建议**: 信任 authMiddleware 的认证结果：

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  // authMiddleware 已保证 req.user 存在且 token 有效
  if (!req.user) {
    fail(res, 401, '未登录');
    return;
  }
  success(res, { valid: true }, 'token有效');
}
```

---

### MEDIUM-1: logout 无服务端 Token 失效机制

**OWASP 分类**: A07:2021 – Identification and Authentication Failures
**位置**: 第 66-68 行

**问题描述**: logout 仅返回成功消息，JWT 在 2 小时有效期内仍可使用。Token 被盗用时无法通过登出撤销。

```typescript
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');  // 空操作
}
```

**修复建议**: 短期缩短 JWT 有效期至 30 分钟；长期引入 Redis Token 黑名单或 Refresh Token 机制。

---

### MEDIUM-2: 登录成功响应暴露数据库自增 ID

**OWASP 分类**: A01:2021 – Broken Access Control
**位置**: `auth.service.impl.ts` 第 81-92 行

**问题描述**: 登录响应返回 `user.id`（数据库自增 ID），有助于攻击者进行 IDOR 枚举。

**修复建议**: 考虑使用 UUID 替代自增 ID，或确保所有使用 `user.id` 的端点都做了权限检查。

---

### MEDIUM-3: `as any` 类型断言绕过 TypeScript 类型安全

**位置**: 第 121、145、170 行

**问题描述**: 多处使用 `(req as any).user`，而 `auth.middleware.ts` 已通过 `declare global` 扩展了 Express.Request 类型。`as any` 绕过编译时检查，可能导致拼写错误（如 `userId` 写成 `userid`）使安全检查失效。

```typescript
const userId = (req as any).user?.userId;  // ❌ 第 121 行
const user = (req as any).user;             // ❌ 第 145、170 行
```

**修复建议**: 统一使用 `req.user`（第 203、235 行已正确使用 `req.user!`）。

---

### MEDIUM-4: parseInt 对负数验证不完整

**位置**: 第 171-172 行

**问题描述**: `!companyId` 不拦截负数（`!(-1)` 为 `false`），负数 company_id 会通过验证触发不必要的数据库查询。

**修复建议**: 使用 `isNaN(companyId) || companyId <= 0` 替代 `!companyId`。

---

### MEDIUM-5: JWT 不响应运行时权限变更

**位置**: `auth.service.impl.ts` JWT 签发处

**问题描述**: JWT payload 包含 `role`、`companyId`，2 小时有效期内，管理员修改用户角色或禁用账户后，旧 token 仍有效。

**修复建议**: (1) 缩短 JWT 至 15-30 分钟 + Refresh Token；(2) authMiddleware 中从数据库验证用户状态；(3) Token 版本号机制。

---

### LOW-1: catch 使用 `any` 类型

**位置**: 第 45 行

```typescript
} catch (err: any) {  // ❌ 应使用 unknown
```

**修复建议**: 改用 `catch (err: unknown)`，通过 `instanceof` 安全窄化。

---

### LOW-2: 登录缺少账户状态检查

**位置**: `auth.service.impl.ts` 登录查询

**问题描述**: 被禁用的用户（`status: false`）或被软删除的用户（`deletedAt` 不为 null）仍可登录成功。

**修复建议**:

```typescript
if (!user || !user.status || user.deletedAt) {
  throw new Error('用户名或密码错误');
}
```

---

### LOW-3: 缺少登录失败安全审计日志

**位置**: 第 45-51 行

**问题描述**: 登录失败时没有记录安全审计日志，无法追踪暴力破解攻击或异常登录行为。

**修复建议**: 添加安全日志（不记录密码）：

```typescript
logger.warn(`[Auth] Login failed`, { username, ip: req.ip, userAgent: req.get('User-Agent') });
```

---

### LOW-4: CORS 配置 `!origin` 允许非浏览器请求

**位置**: `app.ts` CORS 配置

**问题描述**: `!origin` 时直接放行，允许 Postman/curl 等非浏览器客户端绕过 CORS 检查。这是 CORS 的设计行为，影响有限，但生产环境应考虑更严格配置。

---

## 三、正面发现（做得好的方面）

1. **密码存储安全**: 使用 bcrypt 哈希，符合行业标准
2. **登录错误统一**: 不区分"用户不存在"和"密码错误"，防止用户名枚举
3. **安全中间件链**: `helmet → cors → anti-crawl → rate-limit → auth`，层次清晰
4. **Prisma 防注入**: 参数化查询有效防止 SQL 注入
5. **JWT Secret 生产校验**: `NODE_ENV=production` 时强制要求设置 JWT_SECRET
6. **公司访问控制**: `getCompanyDetail` 正确检查 admin/view 只能查自己公司
7. **Anti-crawl 机制**: 基于 IP 的反爬虫中间件含封禁和内存保护
8. **config deepFreeze**: 防止运行时修改配置

---

## 四、修复优先级

| 优先级 | 编号 | 问题 | 工作量 |
|--------|------|------|--------|
| **P0** | C-1 | saveSelection 越权修改（IDOR） | 中 |
| **P0** | C-2 | 登录暴力破解防护不足 | 小 |
| **P1** | L-2 | 被禁用用户可登录 | 小 |
| **P1** | H-1 | 登录输入验证不足 | 小 |
| **P1** | H-2 | 错误信息泄露内部细节 | 中 |
| **P1** | H-3 | saveSelection 参数验证 | 小 |
| **P2** | H-4 | 项目查询信息探测 | 小 |
| **P2** | H-5 | verify 冗余 Token 解析 | 小 |
| **P2** | M-1 | logout 无 Token 失效 | 大 |
| **P2** | M-5 | JWT 不响应权限变更 | 大 |
| **P3** | M-2 | 自增 ID 暴露 | 中 |
| **P3** | M-3 | as any 类型绕过 | 小 |
| **P3** | M-4 | parseInt 负数验证 | 小 |
| **P3** | L-1 | any 类型捕获 | 小 |
| **P3** | L-3 | 缺少安全审计日志 | 中 |
| **P3** | L-4 | CORS !origin 放行 | 小 |

---

## 五、架构安全改进建议

### 1. 引入输入验证层（Zod）

```typescript
// apis/middleware/validate.middleware.ts
import { z } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      fail(res, 400, result.error.issues.map(i => i.message).join('; '));
      return;
    }
    next();
  };
}

// 路由注册
app.post('/api/auth/login', loginLimiter, validate(loginSchema), authController.login);
```

### 2. 统一错误处理策略

```typescript
// apis/middleware/error-handler.middleware.ts
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', { error: err, path: req.path });
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }
  fail(res, 500, '服务器内部错误');  // 永远不泄露内部错误
}
```

### 3. Token 黑名单机制

```typescript
// 登出时将 token 加入 Redis 黑名单
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const token = req.headers.authorization?.substring(7);
  const decoded = jwt.decode(token!) as any;
  await redis.setex(`token:blacklist:${token}`, decoded.exp - Date.now() / 1000, '1');
  success(res, null, '登出成功');
});
```

### 4. 安全审计日志

为所有认证操作添加结构化安全日志：时间戳、IP、用户名（脱敏）、User-Agent、操作结果。

---

## 六、评审结论

**判定: ⚠️ 不通过 — 存在 2 个 CRITICAL 安全漏洞，必须在上线前修复**

核心安全问题：

1. **IDOR 越权（C-1）**: saveSelection 允许用户设置任意 company_id，是严重的权限提升风险
2. **暴力破解（C-2）**: 登录端点限流宽松（100次/分），弱密码可在短时间内被猜中

建议立即修复 P0 级别问题，并在下个迭代中处理 P1 级别问题。P2/P3 级别问题应纳入技术债务治理计划。

---

*代码安全专家评审完成 — 2026-05-23*
