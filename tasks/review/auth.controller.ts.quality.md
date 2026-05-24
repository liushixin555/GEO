# auth.controller.ts 软件质量专家评审报告

| 项目 | 信息 |
|------|------|
| **评审文件** | `apis/controller/auth.controller.ts` |
| **评审角色** | 软件质量专家 (Quality Expert) |
| **评审日期** | 2026-05-24 |
| **代码行数** | 289 行 |
| **函数数量** | 8 个导出函数 |
| **综合评级** | **B (良好，有改进空间)** |

---

## 评审摘要

代码整体结构清晰、安全意识到位（输入校验、类型检查、长度限制），Swagger 文档齐全，响应格式统一。但存在几处值得关注的架构级问题：logout 安全缺陷、基于字符串的错误分类、以及模块级实例化导致测试困难。

| 级别 | 数量 | 说明 |
|------|------|------|
| CRITICAL | 0 | 无 |
| HIGH | 3 | logout 无效化缺陷、脆弱错误分类、Token 提取不安全 |
| MEDIUM | 5 | 无依赖注入、参数命名不一致、缺少日志、输入未清理、静默忽略无效输入 |
| LOW | 3 | 魔法数字、错误消息泄露、缺少请求追踪 |

---

## HIGH 级别问题

### H-1: logout 为空操作 — JWT Token 在"登出"后仍可使用

**位置**: L75-77

**问题描述**: `logout` 函数仅返回成功响应，未执行任何服务端 Token 失效化操作：

```typescript
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');
}
```

用户点击"登出"后，JWT Token 在过期前（2 小时）仍然有效。如果 Token 被截获，即使原始用户已"登出"，攻击者仍可使用该 Token 访问所有 API。

**影响**: 登出机制形同虚设，无法防御 Token 被盗用场景。

**修复建议**:
```typescript
// 方案1: Token 黑名单（Redis）
const token = req.headers.authorization?.substring(7);
if (token) {
  await tokenBlacklist.revoke(token, jwtExpiry);
}

// 方案2: 短 Token 有效期 + Refresh Token 轮换
// 登出时撤销 Refresh Token，Access Token 短期内自动过期
```

---

### H-2: saveSelection 基于中文字符串匹配判断错误类型 — 脆弱耦合

**位置**: L151

```typescript
if (err instanceof Error && err.message.includes('无权')) {
  fail(res, 403, err.message);
  return;
}
```

**问题**:
- service 层修改错误消息文本（如将"无权"改为"没有权限"）会导致 controller 层的 403 逻辑静默失效，退化为 500
- `includes` 匹配过于宽泛，任何包含"无权"的错误消息都会被归为 403
- 同项目 `article.controller.ts` 已有自定义错误类型（`PermissionDeniedError`），此处未遵循同一模式

**修复建议**:
```typescript
// 在 entity 层定义权限错误类型
export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// controller 中使用类型判断
if (err instanceof PermissionDeniedError) {
  fail(res, 403, err.message);
  return;
}
```

---

### H-3: verify 中 Token 提取使用硬编码偏移量 — 不验证 Bearer 前缀

**位置**: L92

```typescript
const token = _req.headers.authorization?.substring(7);
```

**问题**:
- 假设 Authorization header 恰好以 `"Bearer "` 开头（7 个字符），但未验证前缀
- 如果 header 格式异常（如 `"Token abc123"` 或 `"abc123"`），`substring(7)` 会截掉实际 Token 的前几个字符，导致验证总是失败但返回 "登录已过期" 而非更准确的错误信息
- 魔法数字 `7` 缺乏可读性

**修复建议**:
```typescript
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  fail(res, 401, '认证格式无效');
  return;
}
const token = authHeader.slice(7);
```

---

## MEDIUM 级别问题

### M-1: 模块级服务实例化 — 无依赖注入，测试困难

**位置**: L6

```typescript
const authService = new AuthServiceImpl();
```

**问题**: 服务在模块加载时实例化，单元测试中无法替换为 mock。如需 mock `AuthServiceImpl`，必须 `jest.mock` 整个模块，增加测试复杂度且影响其他并行测试。

**修复建议**:
```typescript
export function createAuthController(authSvc: AuthService = new AuthServiceImpl()) {
  return {
    login: async (req: Request, res: Response) => { ... },
    logout: async (req: Request, res: Response) => { ... },
    // ...
  };
}
```

---

### M-2: `_req` 参数命名不一致 — 违反 Express 惯例

**位置**: L75 (`logout`), L91 (`verify`)

**问题描述**: `logout` 和 `verify` 的 `req` 参数以下划线前缀 `_req` 命名。在 JavaScript/TypeScript 社区，下划线前缀表示"未使用的参数"。但：

- `verify` 实际上使用了 `_req.headers.authorization`（L92），参数并非未使用
- `logout` 确实未使用 `_req`，但该端点声明了 `security: bearerAuth`（Swagger），暗示需要认证但未校验

**修复建议**:
- `verify`: 改为 `req`（参数已使用）
- `logout`: 如果需要认证，加入 `req.user` 校验；如果不需要，考虑是否 Swagger 文档中的 `security` 声明应该移除

---

### M-3: login 缺少输入清理 — 用户名未 trim

**位置**: L38-39

```typescript
const { username, password } = req.body;
if (!username || !password) { ... }
```

**问题**: 用户名前后空格不会被移除。用户输入 `" admin "` 会导致登录失败，但错误信息"登录失败"无法提示原因。数据库中用户名通常不带空格。

**修复建议**:
```typescript
const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
const password = req.body.password;
if (!username || !password) { ... }
```

---

### M-4: getContext 静默忽略无效的 company_id 查询参数

**位置**: L241-245

```typescript
const targetCompanyId = req.query.company_id ? Number(req.query.company_id) : undefined;
const projects = targetCompanyId
  ? await authService.getAccessibleProjects(user.userId, user.role, targetCompanyId)
  : [];
```

**问题**: 如果 `company_id=abc`，`Number("abc")` 返回 `NaN`，而 `NaN` 为 falsy，所以 `projects` 被设为 `[]`。用户传入无效参数时收到 200 响应和空列表，无法意识到参数错误。

**修复建议**:
```typescript
if (req.query.company_id) {
  const companyId = Number(req.query.company_id);
  if (isNaN(companyId) || companyId <= 0) {
    fail(res, 400, 'company_id 必须为正整数');
    return;
  }
  // fetch projects with companyId
}
```

---

### M-5: 所有函数缺少结构化日志

**位置**: 全文件

**问题**: 8 个端点均无日志输出。认证模块是安全审计的核心——登录成功/失败、Token 验证、权限变更都应记录。当前如果发生安全事件（暴力破解、权限提升尝试），无日志可追溯。

**修复建议**:
```typescript
// 在关键操作处添加日志
logger.info('auth.login.success', { userId: result.user.userId, ip: req.ip });
logger.warn('auth.login.failed', { username, ip: req.ip });
logger.info('auth.selection.saved', { userId: user.userId, companyId, projectId });
```

---

## LOW 级别问题

### L-1: 魔法数字 — Token 前缀偏移量

**位置**: L92

`substring(7)` 中的 `7` 是 `"Bearer "` 的长度，应提取为常量。

**修复建议**: `const BEARER_PREFIX_LENGTH = 'Bearer '.length;`

---

### L-2: login 错误消息可能泄露用户存在性

**位置**: L54-59

```typescript
if (err instanceof LoginSelectionError) {
  fail(res, 403, err.message);  // 如 "无可访问的公司"
  return;
}
// ...
fail(res, 401, message || '登录失败');
```

`LoginSelectionError` 返回 403 而非 401，攻击者可据此区分"用户存在但无权限"和"用户不存在/密码错误"，实现用户枚举。

**修复建议**: 统一返回 401 和相同的模糊错误消息，将详细原因通过其他渠道（如登录后提示）传达。

---

### L-3: getCompanyDetail 未校验 user.companyId 类型

**位置**: L278

```typescript
if (user.role !== 'sysadmin' && user.companyId !== id) {
```

如果 `user.companyId` 为 `null` 或 `undefined`（如 sysadmin 未关联公司），比较结果为 `true`，返回 403。逻辑上正确但依赖隐式行为。建议显式处理 null 情况。

---

## 正面评价

1. **输入验证完备**: `login` 对类型、长度、空值三重校验；`saveSelection` / `getAccessibleProjects` / `getCompanyDetail` 均验证数值参数
2. **Swagger 文档齐全**: 所有 8 个端点都有完整的 Swagger 注解，包括请求体 schema、安全声明、响应描述
3. **响应格式统一**: 所有端点使用 `success()` / `fail()` 工具函数，保持一致的 JSON 响应结构
4. **权限分层清晰**: `getCompanyDetail` 中 sysadmin 可查看所有公司，admin/view 只能查看本公司
5. **防御性编程**: `typeof` 类型检查防止原型污染攻击、`parseInt` + `isNaN` 防止 SQL 注入向量
6. **自定义错误处理**: `LoginSelectionError` 区分"无可访问公司"和"凭证错误"两种登录失败场景

---

## 度量统计

| 指标 | 值 | 评价 |
|------|-----|------|
| 代码重复率 | ~8%（较低） | 优秀 |
| 函数平均长度 | ~18 行 | 优秀 |
| 圈复杂度（最高函数） | ~4（login） | 优秀 |
| Swagger 覆盖率 | 8/8（100%） | 优秀 |
| 输入验证覆盖率 | 7/8（87.5%） | 良好 |
| 错误处理一致性 | 中等 | 可改进 |

---

## 修复优先级建议

| 优先级 | 编号 | 修复工作量 | 风险 |
|--------|------|-----------|------|
| P1 重要 | H-1 logout Token 失效化 | 高（需引入 Redis/黑名单） | 安全性 |
| P1 重要 | H-2 自定义错误类型 | 低（新增实体类 + 改用 instanceof） | 健壮性 |
| P1 重要 | H-3 Token 提取安全 | 低（2 行改动） | 安全性 |
| P2 一般 | M-1 依赖注入 | 中（需改导出方式） | 可测试性 |
| P2 一般 | M-2 参数命名 | 低（重命名） | 可读性 |
| P2 一般 | M-3 输入 trim | 低（1 行） | 用户体验 |
| P2 一般 | M-4 getContext 参数校验 | 低（5 行） | 正确性 |
| P2 一般 | M-5 结构化日志 | 中（需引入 logger） | 可审计性 |
| P3 低 | L-1 ~ L-3 | 低 | 代码质量 |

---

*评审人: Claude Quality Expert | 评审模型: Claude Opus 4.7*
