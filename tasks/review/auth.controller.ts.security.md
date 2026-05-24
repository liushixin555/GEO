# apis/controller/auth.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 · 注入攻击 · 权限绕过 · 输入验证 · 信息泄露 · CSRF · SSRF · 加密安全）
**文件路径**: `apis/controller/auth.controller.ts`
**代码行数**: 289 行（8 个导出函数 + 1 个模块级常量）
**关联路由**: `apis/routes/auth.routes.ts` — 8 条路由（1 条公开 + 7 条认证）
**关联 Schema**: `apis/schema/auth.schema.ts` — 2 个 Zod Schema（loginSchema / saveSelectionSchema）
**关联服务**: `apis/service/auth.service.ts` → `apis/service/impl/auth.service.impl.ts`
**关联中间件**: `apis/middleware/auth.middleware.ts`（JWT 认证）、`apis/middleware/validate.ts`（Zod 验证）、`apis/middleware/rate-limit.middleware.ts`（速率限制）
**已有评审**: 架构评审（C-1 DIP 违反）、质量评审

---

## 一、安全总体评估

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 8/10 | JWT + authMiddleware 全局保护 + Service 层二次授权校验，认证链路完整 |
| 输入验证 | 7/10 | Zod Schema + Controller 双层验证，但存在冗余和遗漏 |
| 注入防护 | 9/10 | Prisma ORM 参数化查询 + parseInt NaN 检查，SQL 注入风险极低 |
| 信息泄露 | 7/10 | catch 块统一处理，但 login 的 Error.message 直接暴露至客户端 |
| 会话管理 | 5/10 | JWT 无服务端吊销机制，logout 为空操作，token 泄露后 2 小时内不可阻止 |
| 暴力破解防护 | 5/10 | 依赖全局 rate-limit，无登录专用限速 / 账户锁定机制 |
| CSRF 防护 | 8/10 | Bearer Token 认证天然 mitigate， helmet 中间件提供额外保护 |
| 业务逻辑安全 | 8/10 | saveSelection 的 IDOR 防护已完善，getCompanyDetail 的 RBAC 校验正确 |

**问题统计**: CRITICAL × 0 / HIGH × 3 / MEDIUM × 4 / LOW × 3 / INFO × 2

**安全评级: B（认证链路完整，核心防护到位，但会话管理和暴力破解防护存在明显短板）**

> 与上一版安全评审（2026-05-23）相比，IDOR 越权（原 C-1）、输入验证不足（原 H-1/H-3）等问题已修复。本次评审聚焦**残余安全风险**和**新发现问题**。

---

## 二、安全问题清单

### HIGH 级别

#### H-1: 登录端点缺乏专用暴力破解防护

**位置**: 第 36-61 行（`login` 函数）+ `apis/routes/auth.routes.ts` 第 10 行

**问题描述**:

`POST /api/auth/login` 仅依赖全局 `rateLimitMiddleware`（按 IP 限速），没有针对登录场景的专项防护：
- 无账户锁定机制（连续 N 次失败后临时锁定账户）
- 无登录专用速率限制（如同一用户名每分钟最多 5 次尝试）
- 无验证码/CAPTCHA 升级机制

**攻击场景**:

```
攻击者以低频率（每分钟 1-2 次）对目标用户名尝试密码字典
→ 不触发全局 rate-limit（假设 max=100/windowMs=15min）
→ 利用 bcrypt.compare 的响应时间侧信道判断用户是否存在
→ 最终破解密码
```

**OWASP 映射**: A07:2021 – Identification and Authentication Failures

**风险等级**: HIGH — 认证端点是最高价值攻击目标，缺乏专用防护等于将安全责任完全推给全局中间件

**修复建议**:

```typescript
// 方案一：基于用户名的登录限速（推荐，中等成本）
// 新建 apis/middleware/login-rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const { username } = req.body;
  if (!username) { next(); return; }

  const record = loginAttempts.get(username);
  const now = Date.now();

  if (record && record.lockedUntil > now) {
    res.status(429).json({ code: 429, message: '登录尝试过多，请稍后再试' });
    return;
  }

  if (record && record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 锁定 15 分钟
    record.count = 0;
    res.status(429).json({ code: 429, message: '登录尝试过多，请稍后再试' });
    return;
  }

  next();
}

// 登录失败后递增计数
// 在 login catch 块中: record.count++
// 登录成功后清除计数: loginAttempts.delete(username)

// 方案二：集成 CAPTCHA（高成本，长期方案）
// 在连续失败 3 次后要求图形验证码
```

---

#### H-2: JWT Token 无服务端吊销机制 — logout 为空操作

**位置**: 第 75-77 行（`logout` 函数）

```typescript
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');  // 仅返回成功，未做任何 token 失效操作
}
```

**问题描述**:

`logout` 函数仅返回 HTTP 200，未在服务端记录 token 已失效。JWT 的无状态特性意味着：
- 用户点击"登出"后，token 在剩余有效期内（2 小时）仍可使用
- 若 token 被截获（XSS、网络嗅探、日志泄露），用户无法主动使攻击者的会话失效
- 在"修改密码"或"紧急冻结"场景下，无法强制所有已登录设备下线

**攻击场景**:

```
1. 攻击者通过 XSS 窃取用户 JWT token
2. 用户发现异常，点击"登出"
3. logout API 返回成功，前端清除 localStorage
4. 但攻击者持有的 token 仍有效（最长 2 小时）
5. 攻击者在此期间可继续操作用户账户
```

**OWASP 映射**: A07:2021 – Identification and Authentication Failures

**风险等级**: HIGH — token 泄露后无应急响应手段，违反会话管理最佳实践

**修复建议**:

```typescript
// 方案一：Token 黑名单（推荐，中等成本）
// 新建 apis/service/token-blacklist.service.ts

const blacklistedTokens = new Map<string, number>(); // tokenId → expiresAt

export function revokeToken(token: string): void {
  const decoded = jwt.decode(token) as any;
  if (decoded?.exp) {
    blacklistedTokens.set(decoded.jti || token, decoded.exp * 1000);
  }
}

export function isTokenRevoked(token: string): boolean {
  const key = /* extract jti or hash of token */;
  return blacklistedTokens.has(key);
}

// 在 authMiddleware 中增加检查:
// if (isTokenRevoked(token)) { return 401; }

// 定期清理过期 token:
// setInterval(() => { /* remove expired entries */ }, 60_000);

// 方案二：Redis 黑名单（生产环境推荐）
// SET token:blacklist:<jti> 1 EX <remaining_ttl>
```

---

#### H-3: Controller 层验证与 Zod Schema 验证冗余 — 维护性安全风险

**位置**: `login`（第 39-50 行）+ `saveSelection`（第 136-146 行）对比 `apis/schema/auth.schema.ts`

**问题描述**:

登录和保存选择两个端点存在**双层验证**：
1. 路由层：`validate(loginSchema)` / `validate(saveSelectionSchema)` — Zod Schema 验证
2. Controller 层：手动 `typeof` / `parseInt` / 长度检查

```
请求流: client → Zod validate(路由层) → Controller 手动验证 → Service
```

**风险分析**:

- **一致性风险**：Zod Schema 已定义 `username.max(100)` 和 `password.max(200)`，Controller 层重复了相同的检查。若仅修改其中一层，验证规则将不一致
- **信任边界模糊**：Controller 层不应假设 Zod 中间件已过滤数据（因为两者位于不同信任边界），但也不应完全重复验证逻辑
- **实际影响**：当前 Zod 验证已完全覆盖 Controller 层的手动检查，Controller 层验证实际上永远不会触发（Zod 拦截在先）

**OWASP 映射**: A04:2021 – Insecure Design

**风险等级**: HIGH — 安全规则分散在两层导致维护时可能遗漏更新，属于设计层面缺陷

**修复建议**:

```typescript
// 方案一（推荐）：移除 Controller 层冗余验证，信任 Zod 中间件
// login 函数简化为:
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Zod loginSchema 已验证 username/password 为非空字符串且长度合规
    const { username, password } = req.body;
    const result = await authService.login({ username, password });
    success(res, result, '登录成功');
  } catch (err: unknown) {
    // ... error handling
  }
}

// 方案二：保留双层防御但添加注释说明依赖关系
// 在 Controller 验证处添加:
// // Defense-in-depth: 路由层 Zod Schema 已验证，此处为二次防护
```

---

### MEDIUM 级别

#### M-1: `login` catch 块直接暴露 Service 层 Error.message

**位置**: 第 53-60 行

```typescript
} catch (err: unknown) {
  if (err instanceof LoginSelectionError) {
    fail(res, 403, err.message);
    return;
  }
  const message = err instanceof Error ? err.message : '';  // ← 可能包含内部信息
  fail(res, 401, message || '登录失败');
}
```

**问题描述**:

`err.message` 直接返回给客户端。虽然当前 Service 层的 Error message 均为中文业务文案（如 `"用户名或密码错误"`），但：
- 未来 Service 层修改可能引入含内部细节的错误消息（如数据库错误、Prisma 异常等）
- 未认证的攻击者可利用错误消息差异判断系统内部状态

**OWASP 映射**: A04:2021 – Insecure Design · A09:2021 – Security Logging and Monitoring Failures

**风险等级**: MEDIUM — 当前无实际泄露，但缺乏消息白名单机制意味着未来可能引入泄露

**修复建议**:

```typescript
} catch (err: unknown) {
  if (err instanceof LoginSelectionError) {
    fail(res, 403, err.message);
    return;
  }
  // 登录失败统一返回固定消息，不暴露具体原因
  fail(res, 401, '用户名或密码错误');
}
```

---

#### M-2: `verify` 端点在 authMiddleware 之后重复提取并验证 Token

**位置**: 第 91-103 行

```typescript
export async function verify(_req: Request, res: Response): Promise<void> {
  const token = _req.headers.authorization?.substring(7);  // ← 手动提取
  if (!token) {
    fail(res, 401, '未登录');
    return;
  }
  const result = await authService.verifyToken(token);  // ← 重新验证 JWT
```

**问题描述**:

该端点在路由层已通过 `authMiddleware`（第 13 行 auth.routes.ts）验证了 JWT 并设置了 `req.user`。但 `verify` 函数：
1. 再次手动提取 token（使用 `substring(7)` 但未验证 Bearer 前缀）
2. 再次调用 `authService.verifyToken()` 解码并验证 JWT
3. 再次查询数据库获取用户信息

这导致：
- **性能浪费**：同一请求对 JWT 做 2 次 `jwt.verify()` + 2 次数据库查询
- **安全不一致**：若未来有人移除路由层的 `authMiddleware`，`verify` 的 token 提取将不安全（无 Bearer 前缀检查）

**OWASP 映射**: A04:2021 – Insecure Design

**风险等级**: MEDIUM — 当前因 authMiddleware 存在而无实际风险，但设计上存在防御薄弱点

**修复建议**:

```typescript
// 方案一：直接使用 req.user，仅在需要刷新数据时查询数据库
export async function verify(req: Request, res: Response): Promise<void> {
  // authMiddleware 已验证 token 有效性，直接使用 req.user
  // 如需刷新 selected_company/selected_project，调用轻量级查询
  const user = req.user;
  if (!user) {
    fail(res, 401, '未登录');
    return;
  }
  // 仅查询可能变更的 selected 数据
  const freshUser = await authService.getFreshUserData(user.userId);
  success(res, { valid: true, user: freshUser }, 'token有效');
}
```

---

#### M-3: `getContext` 缺少 `company_id` 查询参数的输入验证

**位置**: 第 241 行

```typescript
const targetCompanyId = req.query.company_id ? Number(req.query.company_id) : undefined;
```

**问题描述**:

- `Number()` 对非数字字符串返回 `NaN`，对数组 `['1','2']` 返回 `NaN`
- `NaN` 会被传给 `getAccessibleProjects()`，虽然 Service 层对 `NaN` 返回空数组不会报错，但：
  - 未向客户端返回明确的 400 错误
  - 与同文件的 `getAccessibleProjects`（第 204-207 行）使用 `parseInt` + `isNaN` 检查的模式不一致

**OWASP 映射**: A03:2021 – Injection（输入验证不足）

**风险等级**: MEDIUM — 无实际注入风险（Prisma 参数化），但违反输入验证一致性原则

**修复建议**:

```typescript
export async function getContext(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }

    let targetCompanyId: number | undefined;
    if (req.query.company_id) {
      targetCompanyId = parseInt(req.query.company_id as string, 10);
      if (isNaN(targetCompanyId) || targetCompanyId <= 0) {
        fail(res, 400, 'company_id 必须为正整数');
        return;
      }
    }
    // ...
  }
}
```

---

#### M-4: `getAccessibleProjects` 的 `company_id` 查询参数使用不安全的类型断言

**位置**: 第 204 行

```typescript
const companyId = parseInt(req.query.company_id as string, 10);
```

**问题描述**:

Express 的 `req.query` 类型为 `Record<string, string | string[] | qs.ParsedQs | qs.ParsedQs[] | undefined>`。使用 `as string` 断言：
- 当 `company_id` 为数组时（`?company_id=1&company_id=2`），`parseInt` 接收到的将是 `['1','2'].toString()` = `"1,2"`，`parseInt("1,2", 10)` = `1` — **静默截断为第一个值**
- 这不是严重安全问题（因为后续还有 `> 0` 检查），但行为不符合预期

**OWASP 映射**: A03:2021 – Injection（参数污染）

**风险等级**: MEDIUM — HTTP Parameter Pollution 场景下可能产生意外行为

**修复建议**:

```typescript
const rawCompanyId = req.query.company_id;
if (Array.isArray(rawCompanyId)) {
  fail(res, 400, 'company_id 不允许多个值');
  return;
}
const companyId = parseInt(rawCompanyId as string, 10);
```

---

### LOW 级别

#### L-1: `getCompanyDetail` 的 view 角色可查看同公司用户列表

**位置**: 第 267-288 行 + `apis/routes/auth.routes.ts` 第 17 行

**问题描述**:

`GET /api/auth/companies/:id` 路由仅配置 `authMiddleware`，未配置 `roleMiddleware`。Controller 层的 RBAC（第 278 行）允许 `view` 角色查看自己公司的用户列表（operators + viewers）。

根据 CLAUDE.md 铁律："view 角色只有被授权后查看每日检测报告的权限"。当前 `view` 角色可以调用此接口获取同公司其他用户的信息（id、username、cn_name），虽然这些是基本信息而非敏感数据。

**OWASP 映射**: A01:2021 – Broken Access Control

**风险等级**: LOW — 数据量有限（仅 id/username/cn_name），且限制在同公司范围

**修复建议**:

```typescript
// 方案一：在路由层限制为 sysadmin/admin
router.get('/companies/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), ctrl.getCompanyDetail);

// 方案二：在 Controller 中增加角色检查
if (user.role === 'view') {
  fail(res, 403, '当前角色无权查看公司用户');
  return;
}
```

---

#### L-2: 模块级硬编码 Service 实例 — 安全测试困难

**位置**: 第 6 行

```typescript
const authService = new AuthServiceImpl();
```

**问题描述**:

模块级单例无法在运行时替换为测试替身（mock/stub）。这导致：
- 安全测试无法注入模拟的恶意 Service 实现
- 集成测试难以隔离 Controller 与 Service 的边界
- 虽然可以通过 jest.mock 替代，但增加了测试复杂度

**风险等级**: LOW — 不直接影响运行时安全，但影响安全测试的便捷性

---

#### L-3: `saveSelection` Controller 层 `parseInt` 对非数字字符串的处理

**位置**: 第 136-137 行

```typescript
const companyId = parseInt(req.body.company_id, 10);
const projectId = req.body.project_id != null ? parseInt(req.body.project_id, 10) : null;
```

**问题描述**:

Zod Schema `saveSelectionSchema` 已将 `company_id` 定义为 `z.number().int().positive()`。`validate` 中间件在 Zod 解析通过后将 `req.body` 替换为解析后的数据。因此 `req.body.company_id` 在到达 Controller 时已经是 `number` 类型，`parseInt(number, 10)` 会将数字转为字符串再解析，虽然结果正确但行为多余。

**风险等级**: LOW — 无安全影响，但属于死代码

---

### INFO 级别

#### I-1: `login` 函数存在时序侧信道风险（已缓解）

**位置**: `apis/service/impl/auth.service.impl.ts` 第 23-29 行

```typescript
if (!user) {
  throw new Error('用户名或密码错误');  // 快速返回
}
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);  // 慢速（~100ms）
if (!isPasswordValid) {
  throw new Error('用户名或密码错误');  // 慢速返回
}
```

**分析**:

"用户不存在"的响应时间（~1ms DB 查询）与"密码错误"的响应时间（~100ms bcrypt.compare）存在显著差异。攻击者可通过响应时间判断用户名是否存在。

**当前缓解措施**: 统一的错误消息（"用户名或密码错误"）是标准缓解手段，且 bcrypt 的恒定时间比较提供了部分保护。

**理想修复**: 在"用户不存在"时执行一次虚拟的 `bcrypt.compare` 以消除时序差异。

#### I-2: Swagger 文档未标记 `view` 角色的权限约束

**位置**: 第 107-127 行（`saveSelection` 的 Swagger 注释）及其他端点

**分析**:

Swagger 文档中未标注各端点的角色权限要求。这不影响运行时安全（权限由代码控制），但可能导致 API 消费者误用。

---

## 三、安全修复优先级矩阵

| 编号 | 问题 | 等级 | 修复成本 | 建议优先级 | 里程碑 |
|------|------|------|----------|-----------|--------|
| H-1 | 登录暴力破解防护 | HIGH | 中 | P1 | v2.0 |
| H-2 | JWT Token 无吊销机制 | HIGH | 中-高 | P1 | v2.0 |
| H-3 | 双层验证冗余 | HIGH | 低 | P2 | v1.x |
| M-1 | Error.message 泄露风险 | MEDIUM | 低 | P2 | v1.x |
| M-2 | verify 重复验证 | MEDIUM | 低 | P3 | v1.x |
| M-3 | getContext 输入验证 | MEDIUM | 低 | P2 | v1.x |
| M-4 | 查询参数类型断言 | MEDIUM | 低 | P2 | v1.x |
| L-1 | view 角色权限边界 | LOW | 低 | P4 | 需产品确认 |
| L-2 | 模块级单例 | LOW | 中 | P4 | 架构重构时 |
| L-3 | parseInt 冗余 | LOW | 低 | P4 | 代码清理 |

---

## 四、安全亮点（做得好的地方）

| 安全实践 | 位置 | 说明 |
|----------|------|------|
| Zod Schema 验证 | `auth.schema.ts` | 类型安全的输入验证，防止参数类型篡改 |
| 统一错误消息 | login 第 59 行 | "用户名或密码错误"不区分用户名/密码错误，防止用户枚举 |
| Service 层授权校验 | `saveSelection` | 即使 Controller 遗漏，Service 仍验证 company/project 可访问性 |
| bcrypt 密码哈希 | `auth.service.impl.ts` 第 27 行 | 使用 bcrypt.compare 而非明文比较 |
| parseInt + NaN 检查 | 多处 | 正确处理非数字输入 |
| unknown catch 类型 | 全部 catch 块 | 类型安全的异常处理 |
| 全局 rate-limit | `rate-limit.middleware.ts` | 提供基础限速保护 |
| helmet 中间件 | `app.ts` | 设置安全响应头 |

---

## 五、与项目其他控制器的安全对比

| 对比维度 | auth.controller.ts | article.controller.ts |
|----------|-------------------|-----------------------|
| 输入验证 | Zod + 手动（冗余） | Zod `.strict()` + `pickAllowedFields()` |
| 授权模式 | Controller + Service 双层 | `roleMiddleware` + 创建者检查 |
| 错误处理 | 统一 fail() | 统一 fail() + BusinessError |
| Token 管理 | 无吊销 | N/A |
| 暴力破解防护 | 全局 rate-limit | N/A |
| 安全评级 | B | B+ |

**结论**: auth.controller.ts 的安全防护在认证/授权维度表现良好，但在**会话管理**和**暴力破解防护**两个认证特有领域存在短板。建议在 v2.0 版本中优先解决 H-1（登录限速）和 H-2（Token 吊销）两个问题。
