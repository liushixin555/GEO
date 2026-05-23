# apis/controller/auth.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 软件质量专家（安全 + 代码质量 + 可靠性 + 性能 + 可维护性）
**文件路径**: `apis/controller/auth.controller.ts`
**代码行数**: 247 行
**关联文件**: `apis/service/impl/auth.service.impl.ts`, `apis/middleware/auth.middleware.ts`, `apis/utils/index.ts`
**严重级别**: CRITICAL(1) / HIGH(4) / MEDIUM(4) / LOW(2)

---

## 一、质量评价总览

认证控制器包含 8 个 HTTP 端点处理函数，覆盖登录、登出、令牌验证、选择保存、公司与项目列表获取、上下文聚合和公司详情等核心认证场景。整体结构清晰，Swagger 文档完备。

从软件质量视角审视，该文件存在 **内部错误信息泄露、输入类型验证缺失、req.user 类型访问不一致、冗余令牌解析** 四大问题。

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| 安全性 | 4/10 | 多处 `err.message` 泄露内部实现细节，输入缺乏类型校验 |
| 代码质量 | 6/10 | 函数职责单一，命名清晰，但 req.user 访问模式不统一 |
| 可靠性 | 5/10 | parseInt 校验不一致，user 属性缺乏空值守卫 |
| 性能 | 8/10 | 无明显性能问题，轻量级控制器 |
| 可维护性 | 6/10 | 文件大小合理，Swagger 文档完善，但验证模式不统一增加维护成本 |

---

## 二、问题清单

### CRITICAL-1: `login` 函数泄露内部错误信息

**位置**: 第 45-51 行

```typescript
} catch (err: any) {
  if (err instanceof LoginSelectionError) {
    fail(res, 403, err.message);
    return;
  }
  fail(res, 401, err.message || '登录失败');  // 第50行: 泄露 err.message
}
```

**问题**: 泛型 catch 块将 `err.message` 直接返回给客户端。当 `authService.login()` 抛出非预期异常时（Prisma 连接失败、超时、模式不匹配等），原始内部错误消息可能包含堆栈跟踪、SQL 语句、表名或连接配置等敏感信息，直接暴露给攻击者。

**严重性**: 攻击者可通过精心构造的输入触发内部错误，获取数据库结构、框架版本等关键信息，辅助后续攻击。

**修复建议**:

```typescript
} catch (err: any) {
  if (err instanceof LoginSelectionError) {
    fail(res, 403, err.message);
    return;
  }
  console.error('[Login Error]', err);
  fail(res, 401, '登录失败');
}
```

---

### HIGH-1: 四个端点的 catch 块泄露内部错误信息

**位置**: 第 130 行（`saveSelection`）、第 149 行（`getAccessibleCompanies`）、第 179 行（`getAccessibleProjects`）、第 211 行（`getContext`）

```typescript
// 第130行
fail(res, 500, err.message || '保存失败');
// 第149行
fail(res, 500, err.message || '获取公司列表失败');
// 第179行
fail(res, 500, err.message || '获取项目列表失败');
// 第211行
fail(res, 500, err.message || '获取上下文失败');
```

**问题**: 四处 catch 块均将 `err.message` 返回客户端。Prisma 抛出的错误（如 `PrismaClientKnownRequestError: Field "selectedCompanyId" does not exist`）会暴露数据库模式信息。

**修复建议**: 返回通用用户消息，将实际错误记录到服务端日志：

```typescript
} catch (err: any) {
  console.error('[saveSelection Error]', err);
  fail(res, 500, '保存失败');
}
```

---

### HIGH-2: `saveSelection` 缺少输入类型验证

**位置**: 第 119-127 行

```typescript
export async function saveSelection(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const { company_id, project_id } = req.body;
    if (!company_id) {                    // 仅做了 truthiness 检查
      fail(res, 400, 'company_id 不能为空');
      return;
    }
    await authService.saveSelection(userId, { company_id, project_id });
```

**问题**: 仅检查 `company_id` 的 truthiness，不验证类型。攻击者可发送 `company_id: "abc"` 或 `company_id: { malicious: "object" }`，通过 truthiness 检查后直接传递给 Prisma 查询，可能导致异常行为或错误泄露。`project_id` 完全无验证。

**修复建议**:

```typescript
const companyId = Number(company_id);
if (!Number.isInteger(companyId) || companyId <= 0) {
  fail(res, 400, 'company_id 必须是正整数');
  return;
}
if (project_id != null && (!Number.isInteger(Number(project_id)) || Number(project_id) <= 0)) {
  fail(res, 400, 'project_id 必须是正整数或为空');
  return;
}
await authService.saveSelection(userId, { company_id: companyId, project_id: project_id ? Number(project_id) : undefined });
```

---

### HIGH-3: `req.user` 访问方式不一致且类型不安全

**位置**: 第 121、145、170 行（`(req as any).user`） vs 第 203、235 行（`req.user!`）

```typescript
// 模式A — 不安全的 any 转型（第121、145、170行）
const userId = (req as any).user?.userId;
const user = (req as any).user;

// 模式B — 非空断言（第203、235行）
const user = req.user!;
```

**问题**:
- `(req as any).user` 完全绕过 TypeScript 类型安全，`user.userId`、`user.role`、`user.companyId` 全部为 `any` 类型，隐藏空值风险
- `req.user!` 非空断言，若中间件意外遗漏将导致运行时 TypeError
- 同一文件中两种模式混用，增加维护混乱

auth middleware（`auth.middleware.ts:30`）已通过全局 `AuthPayload` 声明正确扩展了 `Express.Request`，应使用统一的安全访问方式。

**修复建议**: 统一使用 `req.user` 并添加空值守卫：

```typescript
const user = req.user;
if (!user) {
  fail(res, 401, '未登录');
  return;
}
```

---

### HIGH-4: `verify` 函数冗余且脆弱的令牌解析

**位置**: 第 82-94 行

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.substring(7);  // 手动截取令牌
  if (!token) {
    fail(res, 401, '未提供token');
    return;
  }
  const result = await authService.verifyToken(token);     // 二次验证
  if (result.valid) {
    success(res, { valid: true }, 'token有效');
  } else {
    fail(res, 401, 'token无效或已过期');
  }
}
```

**问题**: `verify` 端点已受 `authMiddleware` 保护（`app.ts:99`），中间件已调用 `jwt.verify()` 并设置 `req.user`。控制器再次手动截取 Authorization header 并重复验证令牌，存在：
1. `substring(7)` 假设固定 `Bearer ` 前缀，格式变化时静默提取错误令牌
2. 令牌被验证两次，浪费资源
3. 与其他端点使用 `req.user` 的模式不一致

**修复建议**: 直接使用 `req.user`，中间件已保证令牌有效：

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      fail(res, 401, '未登录');
      return;
    }
    success(res, { valid: true }, 'token有效');
  } catch (err: any) {
    fail(res, 500, '验证失败');
  }
}
```

---

### MEDIUM-1: `getAccessibleProjects` 中 parseInt 校验不一致

**位置**: 第 171-173 行 vs 第 232-233 行

```typescript
// 第171-173行: 使用 falsy 检查（脆弱）
const companyId = parseInt(req.query.company_id as string, 10);
if (!companyId) { ... }

// 第232-233行: 使用 isNaN 检查（正确）
if (isNaN(id)) { fail(res, 400, '无效的公司ID'); return; }
```

**问题**: `!companyId` 检查将 `0` 视为无效值（falsy），而数据库自增 ID 通常从 1 开始但不应假设。同一文件中两种校验模式混用，增加维护风险。

**修复建议**: 统一使用 `isNaN` 检查：

```typescript
const companyId = parseInt(req.query.company_id as string, 10);
if (isNaN(companyId) || companyId <= 0) {
  fail(res, 400, 'company_id 无效');
  return;
}
```

---

### MEDIUM-2: `getAccessibleCompanies` 和 `getAccessibleProjects` 缺少 user 属性空值守卫

**位置**: 第 144-146 行、第 170-176 行

```typescript
const user = (req as any).user;  // 可能为 undefined
const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
// user 为 undefined 时抛出同步 TypeError，async try/catch 无法捕获
```

**问题**: `(req as any).user` 可能为 `undefined`，访问 `.userId` 将抛出同步 TypeError。虽然 Node.js 后来支持 async 函数中的同步异常捕获，但这种模式容易引起困惑，且 TypeScript 无法提供类型保护。

**修复建议**: 参见 HIGH-3 统一使用 `req.user` + 空值守卫。

---

### MEDIUM-3: `logout` 为空操作，API 契约具有误导性

**位置**: 第 66-68 行

```typescript
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');
}
```

**问题**: 登出处理器直接返回成功，未使 JWT 令牌失效。令牌在 2 小时有效期内仍然可用。"登出" 后被窃取的令牌可继续使用。

**建议**: 这是 JWT 无状态设计的常见权衡，但应在 Swagger 中明确说明，并确保前端清除 localStorage。如安全要求更高，可考虑令牌黑名单或短期令牌 + 刷新令牌模式。

---

### MEDIUM-4: `saveSelection` 未验证用户是否有权访问所选公司/项目

**位置**: 第 119-132 行

```typescript
await authService.saveSelection(userId, { company_id, project_id });
```

**问题**: 保存用户选择时，未验证 `company_id` 和 `project_id` 是否为该用户可访问的实体。服务层直接更新数据库，用户可将 `selectedCompanyId` 设置为无权访问的公司。虽然下游 `getAccessibleProjects` 会限制实际数据访问，但可能导致意外的 UI 行为。

**修复建议**: 在服务层添加授权验证，确认用户有权访问所选公司和项目。

---

### LOW-1: `verify` 函数缺少 try-catch

**位置**: 第 82-94 行

```typescript
export async function verify(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.substring(7);
  // ... 无 try-catch 包裹
  const result = await authService.verifyToken(token);
```

**问题**: 与其他所有处理器不同，`verify` 函数无 try-catch。若 `authService.verifyToken()` 抛出非预期异常（如 JWT secret 未配置），异常将冒泡至全局错误处理器，响应格式与 `fail()` 不同。

**修复建议**: 包裹 try-catch 以保持一致性。

---

### LOW-2: 模块级单例实例化 `AuthServiceImpl`

**位置**: 第 6 行

```typescript
const authService = new AuthServiceImpl();
```

**问题**: 服务作为模块级单例实例化，这使得单元测试难以注入 mock 服务。但与项目其他控制器保持一致，属于架构层面的已知权衡。

**建议**: 如需提高可测试性，可引入依赖注入容器（如 tsyringe），或通过工厂函数导出。

---

## 三、修复优先级

| 优先级 | 问题编号 | 描述 | 工作量 |
|--------|---------|------|--------|
| P0 | CRITICAL-1 | login 泄露内部错误信息 | 小 |
| P1 | HIGH-1 | 4处 catch 泄露错误信息 | 小 |
| P1 | HIGH-2 | saveSelection 缺少类型验证 | 小 |
| P1 | HIGH-3 | req.user 访问不一致 | 中 |
| P1 | HIGH-4 | verify 冗余令牌解析 | 小 |
| P2 | MEDIUM-1 | parseInt 校验不一致 | 小 |
| P2 | MEDIUM-2 | user 属性空值守卫 | 小（与 HIGH-3 合并修复） |
| P2 | MEDIUM-3 | logout 空操作 | 需评估 |
| P2 | MEDIUM-4 | saveSelection 授权验证 | 中 |
| P3 | LOW-1 | verify 缺 try-catch | 小 |
| P3 | LOW-2 | 单例实例化 | 架构层面 |

---

## 四、评审结论

**判定: BLOCK** — 1 个 CRITICAL 和 4 个 HIGH 问题应在合并前修复。

核心问题集中在：
1. **错误信息泄露**（5处）— 统一使用通用错误消息 + 服务端日志
2. **输入验证不足** — 添加类型和范围校验
3. **类型安全缺失** — 统一使用 `req.user` + 空值守卫
4. **冗余逻辑** — `verify` 函数应简化

修复后可显著提升控制器层的安全性和可维护性。
