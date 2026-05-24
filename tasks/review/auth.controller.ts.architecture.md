# apis/controller/auth.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 · 职责边界 · 依赖管理 · API 契约 · 可测试性 · 架构原则）
**文件路径**: `apis/controller/auth.controller.ts`
**代码行数**: 289 行（8 个导出函数 + 1 个模块级常量）
**关联路由**: `apis/app.ts` — `/api/auth/*` 路由组，全局 helmet → cors → antiCrawl → rateLimit → auth 中间件链
**关联服务**: `apis/service/auth.service.ts`（接口 `IAuthService`）→ `apis/service/impl/auth.service.impl.ts`（实现 `AuthServiceImpl`）
**关联实体**: `apis/entity/user.entity.ts`（LoginSelectionError）
**关联工具**: `apis/utils/response.util.ts`（success, fail）
**前置评审**: 已有安全评审 + Committer 终审（`auth.controller.md`，2026-05-23）。本评审基于**当前最新代码**重新审视，部分问题已被修复。

**问题统计**: CRITICAL × 1 / HIGH × 3 / MEDIUM × 4 / LOW × 2

---

## 一、总体架构评估

认证控制器包含 8 个 HTTP 端点处理函数，覆盖认证生命周期的核心阶段：登录 → 令牌验证 → 上下文选择 → 资源访问 → 登出。从 Express 分层架构视角看，该文件位于 **Controller 层**，应严格承担 HTTP 请求/响应适配的职责。

### 与上一版评审（2026-05-23）的改进对比

| 原编号 | 原问题 | 当前状态 | 说明 |
|--------|--------|----------|------|
| C-1 (安全) | saveSelection IDOR 越权 | ✅ 已修复 | Service 层已实现完整授权校验（验证 company/project 可访问性） |
| H-1 (安全) | 登录输入验证不足 | ✅ 已修复 | 添加 typeof 检查 + 长度限制（第 43-50 行） |
| H-3 (安全) | saveSelection 参数验证 | ✅ 已修复 | parseInt + 正整数校验 + null 处理（第 136-146 行） |
| L-1 (安全) | catch 使用 `any` 类型 | ✅ 已修复 | 全部改为 `err: unknown` |
| M-3 (架构) | req.user 访问不一致 | ✅ 已修复 | 统一为 `req.user` + 空值检查 |

### 当前架构评分

| 架构维度 | 评分 | 较上次变化 | 说明 |
|----------|------|-----------|------|
| 分层合规 | 5/10 | ↑ +1 | Service 层新增授权校验，Controller 不再承担 saveSelection 权限判断 |
| 依赖管理 | 3/10 | — | 仍直接依赖具体实现 `AuthServiceImpl`，无依赖注入 |
| API 设计 | 7/10 | ↑ +1 | 输入验证统一，参数解析模式趋于一致 |
| 关注点分离 | 6/10 | ↑ +1 | 验证逻辑仍分散但质量提升，业务规则逐步下沉 |
| 可扩展性 | 5/10 | — | 硬编码单例实例，无法运行时替换 |
| 可维护性 | 7/10 | ↑ +1 | 代码风格统一，catch 类型安全，req.user 访问一致 |

---

## 二、架构问题清单

### CRITICAL 级别

#### C-1: 依赖倒置原则（DIP）违反 — Controller 直接耦合 Service 具体实现

**位置**: 第 2 行 + 第 6 行

```typescript
import { AuthServiceImpl } from '../service/impl/auth.service.impl';  // 具体实现类
const authService = new AuthServiceImpl();                            // 模块级硬编码实例化
```

**架构分析**:

这是该文件最根本的架构缺陷，也是**项目级共性问题**（所有 Controller 采用相同模式）。

违反的 SOLID 原则:

| 原则 | 违反方式 | 影响 |
|------|----------|------|
| D（依赖倒置） | 高层模块依赖具体实现而非抽象接口 `IAuthService` | 替换实现需修改 Controller 源码 |
| O（开闭） | 无法通过配置/DI 切换 Service 实现 | 测试必须使用 `jest.mock` 劫持模块路径 |
| D 类型安全 | TypeScript 推断 `authService` 为 `ArticleServiceImpl` 而非 `IAuthService` | Controller 可调用接口契约外的 public 方法 |

实际影响:

```
单元测试:     jest.mock('../service/impl/auth.service.impl')  ← 劫持路径字符串，脆弱
多实现切换:   修改 import 语句                                 ← 改源码，非配置
服务降级:     无法运行时替换为代理/装饰器                        ← 无扩展点
```

**与项目一致性的权衡**: 该模式在所有 Controller 中统一采用。单独修改 auth.controller 会破坏一致性。应作为项目级重构统一处理。

**修复建议**:

最小改动方案（类型声明改进）:

```typescript
import type { IAuthService } from '../service/auth.service';
import { AuthServiceImpl } from '../service/impl/auth.service.impl';

const authService: IAuthService = new AuthServiceImpl();
```

仅添加接口类型声明即可获得编译时契约约束，不改变运行时行为。

---

### HIGH 级别

#### H-1: `verify` 端点重复执行 Middleware 认证职责 — 架构角色混乱

**位置**: 第 91-103 行

```typescript
export async function verify(_req: Request, res: Response): Promise<void> {
  const token = _req.headers.authorization?.substring(7);   // 1. 重复提取 token
  if (!token) {
    fail(res, 401, '未登录');                                 // 2. 重复验证存在性
    return;
  }
  const result = await authService.verifyToken(token);      // 3. 重复验证 JWT
  if (!result.valid) {
    fail(res, 401, '登录已过期');
    return;
  }
  success(res, { valid: true, user: result.user }, 'token有效');
}
```

**架构分析**:

根据路由配置，`/api/auth/verify` 受 `authMiddleware` 保护。中间件已执行:

```
请求 → authMiddleware（提取 Bearer token → jwt.verify → 设置 req.user）→ verify handler
```

Controller 的 `verify` 函数再次执行了上述全部三步，造成:

| 问题 | 影响 |
|------|------|
| 冗余 JWT 验证 | 每次请求 2 次 `jwt.verify()`，浪费 CPU |
| `substring(7)` 硬编码 | 假设固定 `Bearer ` 前缀，与中间件提取逻辑不同步 |
| 违反 DRY | token 提取逻辑在 middleware 和 controller 各一份 |
| 架构角色混乱 | Controller 越权执行 Middleware 的认证职责 |

**修复建议**:

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  // authMiddleware 已保证 req.user 存在且 token 有效
  const user = req.user;
  if (!user) {
    fail(res, 401, '未登录');
    return;
  }
  success(res, { valid: true, user }, 'token有效');
}
```

---

#### H-2: Controller 泄露 Service 层异常类型 — 分层边界破坏

**位置**: 第 3 行 + 第 54 行

```typescript
import { LoginSelectionError } from '../entity';   // 引入 Service 层异常类型

// login handler
} catch (err: unknown) {
  if (err instanceof LoginSelectionError) {         // Controller 知道 Service 层的异常类型
    fail(res, 403, err.message);
    return;
  }
  // ...
}
```

**架构分析**:

分层架构的基本原则是**层间信息隐藏**。Controller 层不应了解 Service 层抛出的具体异常类型:

```
当前依赖链:  entity (LoginSelectionError) ← service (throw) ← controller (instanceof catch)
                                         ← service impl (throw) ─┘

理想依赖链:  entity (AppError) ← service (throw) ← 全局错误中间件 (instanceof catch)
                                    controller (无 catch，错误冒泡到中间件)
```

具体影响:

1. **耦合链**: 异常类型变更会传播到 Controller
2. **语义泄露**: Controller 需要理解 `LoginSelectionError` 的业务含义（403 vs 401），违反职责单一
3. **不可扩展**: 新增 Service 异常类型（如 `TokenExpiredError`、`AccountLockError`）需同步修改 Controller
4. **不一致模式**: 只有 `login` 使用 `instanceof` 分派，其他端点使用通用 catch

**修复建议**:

引入类型化异常基类:

```typescript
// apis/entity/errors.ts
export class AppError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

// Service 层
if (!hasAccessible) throw new AppError('无可访问的公司或项目', 403);

// 全局错误中间件 (app.ts)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('Unhandled error', err);
    fail(res, 500, '服务器内部错误');
  }
});
```

---

#### H-3: `saveSelection` 错误处理基于字符串匹配 — 脆弱的层间契约

**位置**: 第 150-156 行

```typescript
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes('无权')) {   // 基于字符串匹配
    fail(res, 403, err.message);
    return;
  }
  fail(res, 500, '保存失败，请稍后重试');
}
```

**架构分析**:

Service 层 `saveSelection` 在授权失败时抛出 `Error('无权选择该公司')` 或 `Error('无权选择该项目')`。Controller 通过 `err.message.includes('无权')` 来识别授权错误。

这是**基于字符串匹配的隐式契约**:

1. Service 层修改错误措辞（如"权限不足"）→ Controller 的 `includes('无权')` 静默失效 → 所有错误变为 500
2. 其他 Service 层的错误消息也可能包含"无权"字样 → 误匹配为 403
3. 中文字符串匹配脆弱 — 无法利用 TypeScript 编译时检查

**修复建议**:

与 H-2 合并修复 — 引入 `AppError` 或 `ForbiddenError` 类型化异常，用 `instanceof` 替代字符串匹配。

---

### MEDIUM 级别

#### M-1: `logout` 端点为空操作 — JWT 认证架构不完整

**位置**: 第 75-77 行

```typescript
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');
}
```

**架构分析**:

JWT 无状态特性意味着"登出"无法在服务端真正实现:

1. JWT 在 2 小时有效期内始终可用，"登出"只是前端清除 localStorage 的假象
2. Swagger 标注 "security: bearerAuth" 但服务端未使 token 失效
3. 缺少令牌黑名单/刷新机制，无法支持紧急令牌撤销（如密码泄露后强制登出）

**建议**: 这是 JWT 架构的已知权衡，短期可维持现状。长期考虑:
- 方案 A: 短期 JWT（15-30min）+ 长期 Refresh Token
- 方案 B: Redis 令牌黑名单
- 方案 C: User 表增加 `tokenVersion` 字段

---

#### M-2: 错误处理模式不一致 — 缺少全局错误中间件

**位置**: 全文件

**现状分析**:

8 个端点中有 6 个使用 try-catch，但处理模式各不相同:

| 端点 | catch 策略 | 返回给客户端的内容 |
|------|-----------|-------------------|
| login | `instanceof LoginSelectionError` 分派 + 通用 Error | `err.message`（非空时）或固定消息 |
| saveSelection | `err.message.includes('无权')` 分派 | 通用消息 |
| getAccessibleCompanies | 无分派 | 通用消息 |
| getAccessibleProjects | 无分派 | 通用消息 |
| getContext | 无分派 | 通用消息 |
| getCompanyDetail | 无分派 | 通用消息 |
| verify | 无 try-catch | 异常冒泡到 Express 默认处理 |
| logout | 无 try-catch | 不可能抛异常 |

问题:
1. `login` 泄露 `err.message`，其他端点使用通用消息 — 安全策略不一致
2. `verify` 和 `logout` 无 try-catch — 如果 `authService.verifyToken` 抛出未预期异常，Express 默认返回 HTML 错误页
3. 项目缺少 Express 全局错误处理中间件

**修复建议**:

添加全局错误中间件（放在 `app.ts` 所有路由之后）:

```typescript
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path });
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    fail(res, 500, '服务器内部错误');
  }
});
```

---

#### M-3: `getAccessibleCompanies` / `getAccessibleProjects` / `getContext` 职责重叠

**位置**: 第 168-180 行、第 197-214 行、第 234-250 行

**架构分析**:

`getContext` 本质上是 `getAccessibleCompanies` 和 `getAccessibleProjects` 的聚合调用:

```typescript
// getContext 内部
const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
const projects = targetCompanyId
  ? await authService.getAccessibleProjects(user.userId, user.role, targetCompanyId)
  : [];
```

三个端点共享以下重复模式:

```typescript
const user = req.user;
if (!user) { fail(res, 401, '未登录'); return; }
// ... authService 调用 ...
} catch (err: unknown) { fail(res, 500, '...失败，请稍后重试'); }
```

影响:
1. **路由碎片化**: 前端初始化需分别调用 2-3 个 API，增加请求延迟
2. **Controller 重复**: 三个函数有大量模板代码
3. **无 Service 层编排**: 缺少 Facade 方法来聚合多个子调用

**建议**: 在 Service 层添加编排方法:

```typescript
// IAuthService
getContext(userId: number, role: string, companyId?: number | null, targetCompanyId?: number): Promise<{
  companies: Company[];
  projects: Project[];
}>;
```

---

#### M-4: API 响应格式不完全一致

**位置**: 多个端点

**现状**:

```typescript
// login: 带 message
success(res, result, '登录成功');

// getAccessibleCompanies: 无 message
success(res, companies);

// getContext: 带 message
success(res, { companies, projects }, '获取成功');

// getCompanyDetail: 无 message
success(res, result);
```

`success()` 函数的第三个参数 `message` 有默认值 `'操作成功'`，因此省略时并非无 message，但显式传入的消息风格不统一 — 有的用"登录成功"（动作+结果），有的用"获取成功"（动词+结果），有的省略。

**建议**: 建立项目级 API 响应规范，要么全部显式传入 message，要么全部省略使用默认值。

---

### LOW 级别

#### L-1: 魔法字符串 `substring(7)` 和 HTTP 状态码硬编码

**位置**: 第 92 行 + 多处状态码

```typescript
const token = _req.headers.authorization?.substring(7);  // "Bearer ".length === 7
```

以及多处状态码硬编码: `400`, `401`, `403`, `500`。

**建议**: 提取为常量:

```typescript
const BEARER_PREFIX = 'Bearer ';
const token = _req.headers.authorization?.slice(BEARER_PREFIX.length);
```

---

#### L-2: 函数签名中 `Promise<void>` 的测试影响

**位置**: 所有 8 个函数

```typescript
export async function login(req: Request, res: Response): Promise<void> {
```

Express 不使用返回值。测试时无法通过返回值断言结果，必须检查 `res` 的调用参数。这是 Express 的设计约束，了解即可。

---

## 三、函数逐项架构评审

### 3.1 login（第 36-61 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | HTTP 适配 + `instanceof LoginSelectionError` 分派（应为全局错误中间件） |
| 输入验证 | ✅ | typeof + 长度限制 + 非空检查，覆盖完整 |
| 错误处理 | ⚠️ | `err.message` 对登录失败可能泄露内部信息 |
| 响应格式 | ✅ | 使用 `success()` 统一格式 |

### 3.2 logout（第 75-77 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | HTTP 适配正确 |
| 业务完整性 | ❌ | 无服务端 token 失效，JWT 架构不完整 |
| 安全语义 | ⚠️ | Swagger 标注需要认证但 logout 实为空操作 |

### 3.3 verify（第 91-103 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ❌ | 重复执行 Middleware 认证职责 |
| DRY | ❌ | token 提取逻辑与 middleware 重复 |
| 性能 | ❌ | 双重 `jwt.verify()` |
| 响应格式 | ✅ | 返回 user 信息有用 |

### 3.4 saveSelection（第 128-157 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | HTTP 适配 + 参数校验，授权已下沉到 Service |
| 输入验证 | ✅ | parseInt + 正整数校验 + null 处理 |
| 错误处理 | ⚠️ | `err.message.includes('无权')` 字符串匹配（H-3） |
| 授权架构 | ✅ | Service 层验证可访问性 |

### 3.5 getAccessibleCompanies（第 168-180 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 纯 HTTP 适配 |
| 错误处理 | ✅ | 通用 500 消息 |
| 响应格式 | ⚠️ | 无显式 message |

### 3.6 getAccessibleProjects（第 197-214 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | HTTP 适配 + 参数校验 |
| 输入验证 | ✅ | parseInt + 正整数校验 |
| 错误处理 | ✅ | 通用 500 消息 |

### 3.7 getContext（第 234-250 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ⚠️ | Controller 内聚合两个 Service 调用（应为 Service Facade） |
| 参数处理 | ✅ | query 参数可选处理正确 |
| 响应格式 | ✅ | 带 message |

### 3.8 getCompanyDetail（第 267-288 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | HTTP 适配 + 参数校验 + 权限检查 |
| 输入验证 | ✅ | parseInt + 正整数校验 |
| 授权架构 | ✅ | admin/view 只能查自己公司，sysadmin 可查所有 |
| 错误处理 | ✅ | 通用 500 消息 |

---

## 四、与同类 Controller 的架构对比

| 架构特征 | auth.controller (当前) | article.controller | 评价 |
|----------|----------------------|-------------------|------|
| 依赖注入 | `new AuthServiceImpl()` | `new ArticleServiceImpl()` | 一致 — 都是反面模式 |
| 输入验证 | 手写 typeof + parseInt + 范围检查 | Zod schema | auth 模式更原始 |
| 错误处理 | `instanceof` + `includes` 分派 | `handleServerError` 字符串匹配 | 都脆弱，方式不同 |
| 授权检查 | Service 层 (saveSelection) + Controller 层 (getCompanyDetail) | Controller 层为主 | auth 更合理 — 部分已下沉 |
| 代码重复 | 较少（模板统一但冗余不高） | ~141 行 (25.5%) | auth 控制较好 |
| catch 类型 | `err: unknown` ✅ | `err: unknown` ✅ | 一致 — 都已修复 |
| req.user 访问 | `req.user` 统一 ✅ | `getAuthUser()` 封装 | auth 直接但一致 |
| Swagger 文档 | 每个端点完备 | 每个端点完备 | 一致 ✅ |

**结论**: auth.controller 在**输入验证方式**上落后于 article.controller（手写验证 vs Zod schema），但在**授权架构**上更先进（saveSelection 授权已下沉到 Service 层）。代码重复程度远低于 article.controller。

---

## 五、Controller 层代码量构成分析

| 代码类别 | 行数 | 占比 | 应有层级 |
|----------|------|------|----------|
| HTTP 协议适配（参数提取、响应格式化） | ~100 行 | 35% | Controller ✅ |
| 输入验证（typeof、parseInt、范围检查） | ~40 行 | 14% | Controller 或 Validation Middleware |
| 认证/授权检查（req.user + null 检查） | ~30 行 | 10% | Middleware ✅（已大部分实现） |
| 错误处理（try-catch + instanceof 分派） | ~35 行 | 12% | 全局错误中间件 |
| Swagger 文档注释 | ~65 行 | 22% | Controller ✅ |
| 空行/导入 | ~19 行 | 7% | — |

**Controller 层实际承载的非协议逻辑约 26%（验证 + 错误处理）**，合理范围内。auth.controller 的职责分配比 article.controller 更健康。

---

## 六、修复优先级建议

### P0（立即修复 — 架构缺陷）

| 问题 | 修复方案 | 工作量 |
|------|----------|--------|
| H-1: verify 端点冗余认证 | 信任 authMiddleware，简化为读取 req.user | 0.5h |
| H-2 + H-3: 异常类型泄露 + 字符串匹配 | 引入 AppError 基类 + 全局错误中间件 | 4h |

### P1（尽快修复 — 架构质量）

| 问题 | 修复方案 | 工作量 |
|------|----------|--------|
| C-1: 依赖倒置 | 添加 `IAuthService` 接口类型声明 | 0.5h |
| M-2: 缺少全局错误中间件 | `app.ts` 添加 errorHandler | 2h |

### P2（计划修复 — 可维护性）

| 问题 | 修复方案 | 工作量 |
|------|----------|--------|
| M-3: 职责重叠端点 | Service 层 Facade 方法 | 2h |
| M-1: logout 空操作 | Token 黑名单或 Refresh Token | 8h+ |
| M-4: 响应格式不一致 | 建立 API 响应规范 | 1h |

### P3（可选优化）

| 问题 | 修复方案 | 工作量 |
|------|----------|--------|
| L-1: 魔法字符串 | 提取常量 | 0.5h |
| 输入验证升级 | 引入 Zod schema（参照 article.controller） | 4h |

---

## 七、推荐的认证架构演进方向

```
当前架构:
┌──────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  Client   │───→│  Middleware 链       │───→│  auth.controller     │
└──────────┘    │  helmet → cors       │    │  (new AuthServiceImpl)│
                │  antiCrawl → rateLimit│    │  instanceof 分派     │
                │  auth (JWT verify)   │    └──────────┬───────────┘
                └──────────────────────┘               │
                                              ┌────────▼──────────┐
                                              │  AuthServiceImpl   │
                                              │  (Prisma + JWT)    │
                                              └───────────────────┘

目标架构:
┌──────────┐    ┌──────────────────────┐    ┌──────────────────┐    ┌───────────────┐
│  Client   │───→│  Middleware 链       │───→│ auth.controller  │───→│ IAuthService  │
└──────────┘    │  helmet → cors       │    │  (DI 注入)       │    │  (interface)  │
                │  antiCrawl → rateLimit│    │  无 try-catch    │    └───────┬───────┘
                │  auth (JWT verify)   │    └──────────────────┘            │
                │  validate(schema)    │           │              ┌─────────▼─────────┐
                └──────────┬───────────┘           │              │  AuthServiceImpl   │
                           │                       ▼              │  (Prisma + JWT)    │
                ┌──────────▼───────────┐  全局 errorHandler      └───────────────────┘
                │  统一错误处理中间件   │  (AppError → HTTP)
                └──────────────────────┘
```

关键演进步骤:
1. **简化 verify** — 信任 middleware，删除冗余认证
2. **引入 AppError** — 替代 `LoginSelectionError` 和字符串匹配
3. **添加全局 errorHandler** — Controller 不再需要 try-catch
4. **接口类型声明** — `const authService: IAuthService`
5. **Zod schema 验证** — 替代手写 typeof/parseInt 校验

每一步都是**独立可交付**的，不需要大爆炸重构。

---

## 八、评审结论

**判定: ✅ 通过（有改进建议）**

相比上一版评审（2026-05-23），auth.controller.ts 已修复了 5 个重要问题（saveSelection IDOR、登录输入验证、参数类型校验、catch 类型安全、req.user 访问一致性），架构质量显著提升。

**核心评价**:

1. **职责分配合理**: Controller 层以 HTTP 协议适配为主（35%），非协议逻辑占 26%，在合理范围内。saveSelection 授权校验已正确下沉到 Service 层。

2. **代码风格统一**: 8 个 handler 遵循一致的认证-验证-调用-错误处理模式，认知负担低。

3. **输入验证完备**: 所有端点对输入参数做了类型、范围、空值检查。

4. **剩余架构债务可控**: 最突出的三个问题（verify 冗余、异常类型泄露、字符串匹配错误分派）修复工作量合计约 4.5h，且互不依赖可独立实施。

**建议优先修复 H-1（verify 简化）** — 改动量最小（删除 8 行 + 简化 5 行），收益最明确（消除冗余认证 + 减少攻击面 + 修复 `substring(7)` 硬编码）。

---

*软件架构专家评审完成 — 2026-05-24*
