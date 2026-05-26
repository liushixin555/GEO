# auth.service.test.ts — 测试安全专家评审报告

**评审日期**: 2026-05-26
**评审角色**: 测试安全专家（认证安全 · 权限绕过 · 输入验证 · 信息泄露 · 会话管理）
**文件路径**: `tests/apis/auth.service.test.ts`
**代码行数**: 1387 行（79 个测试用例）
**被测文件**: `apis/service/impl/auth.service.impl.ts`（248 行）

---

## 一、安全问题清单

### CRITICAL 级别

#### C-1: verifyToken 未测试禁用用户 token 仍然有效的安全漏洞

**位置**: `verifyToken` describe 块（第 422-476 行）

**问题描述**: `auth.service.impl.ts:104-126` 的 `verifyToken` 方法查询到用户后直接返回 `{ valid: true }`，**未检查 `user.status`**。

**当前实现漏洞**:
```typescript
if (!user) return { valid: false };
// ❌ 缺少 status 检查 — 禁用用户 token 仍有效
return { valid: true, user: { ... } };
```

**攻击场景**:
1. 管理员禁用某用户账号（`status: false`）
2. 该用户的 JWT token 在 2 小时有效期内仍可通过验证
3. 被禁用用户可持续操作系统直到 token 过期

**测试缺失**: 当前 7 个 verifyToken 测试中，没有任何一个测试 `user.status === false` 的场景。

**修复建议**:
1. 添加测试: `verifyToken 用户被禁用时应返回 { valid: false }`
2. 修复实现: `if (!user || !user.status) return { valid: false };`

---

### HIGH 级别

#### H-1: 零数据库错误路径安全测试

**位置**: 全文件

**问题描述**: 没有测试覆盖 Prisma 操作失败时的错误传播。数据库错误可能通过 `err.message` 泄露内部信息（连接字符串、SQL 语句、表结构）。

**关键缺失**:
- `login`: `prisma.user.update` 失败时是否泄露数据库错误？
- `getLatestUserState`: 失败时 `err.message` 是否直接传播？
- `getAccessibleCompanies/Projects`: 失败时的错误格式？

**修复建议**: 为每个方法添加至少 1 个数据库错误路径测试，验证错误不泄露内部信息

---

#### H-2: saveSelection 缺少负数/非法 ID 安全测试

**位置**: `saveSelection` describe 块

**问题描述**: 测试了正常权限拒绝（无权访问的公司/项目），但没有测试恶意输入：
- `company_id: -1` — 负数 ID 是否绕过权限检查？
- `project_id: -1` — 负数 ID 是否绕过权限检查？
- `company_id: 999999999` — 超大 ID 是否导致数据库错误？

**修复建议**: 添加负数 ID 测试，验证权限检查在非法输入下的正确行为

---

### MEDIUM 级别

#### M-1: JWT token 字段完整性未充分测试

**位置**: `login` describe 块（JWT token 应包含正确的用户信息，第 271-297 行）

**问题描述**: 只验证了 token 中的 `userId`、`username`、`role`、`companyId`，没有验证：
- Token 是否包含不应有的额外字段（如 passwordHash）
- `expiresIn` 是否正确应用
- Token 签发时间是否合理

---

#### M-2: login 缺少并发场景安全测试

**位置**: `login` describe 块

**问题描述**: 没有测试以下并发安全问题：
- 用户登录时，另一个请求同时修改了该用户的 `status`（竞态条件）
- 用户登录时，`selectedCompany` 被另一个请求修改
- `saveSelection` 并发调用时的数据一致性

**说明**: 此类测试对单测框架来说较难实现，建议记录为集成测试需求。

---

#### M-3: 环境变量硬编码为测试值

**位置**: 第 6-7 行

**问题描述**:
```typescript
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
```

虽然测试需要固定值，但 `test-secret` 作为 JWT 密钥可能被误用于其他场景。建议使用更明显的测试标识（如 `test-secret-DO-NOT-USE-IN-PROD`）。

---

## 二、安全度量

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证安全覆盖 | 5/10 | login 路径充分但 verifyToken 缺少禁用用户检查 |
| 权限边界测试 | 7/10 | 角色权限覆盖良好，缺少负数/非法 ID |
| 错误安全测试 | 1/10 | 零数据库错误路径测试 |
| 会话管理测试 | 6/10 | token 生成验证充分，缺少 token 失效场景 |
| 输入验证测试 | 4/10 | 正常输入充分，异常输入（超长/特殊字符/负数）缺失 |

**综合安全评分: 5.0/10**

**判定: REQUEST CHANGES** — C-1（verifyToken 禁用用户漏洞）为阻断项

---

## 三、修复优先级

### P0 — 安全阻断

| 问题 | 风险 | 工作量 |
|------|------|--------|
| C-1: verifyToken 禁用用户检查 | 禁用用户可继续操作 | 小（测试+实现修复） |
| H-1: 数据库错误路径 | 信息泄露 | 中 |

### P1 — 安全加固

| 问题 | 风险 | 工作量 |
|------|------|--------|
| H-2: 非法 ID 测试 | 权限绕过 | 小 |
| M-1: JWT 字段完整性 | 信息泄露 | 小 |

---

*测试安全专家评审完成 — 2026-05-26*
