# auth.service.test.ts — 测试质量专家评审报告

**评审日期**: 2026-05-26
**评审角色**: 测试质量专家（覆盖率分析 · 错误路径 · 边界条件 · 测试隔离性 · Mock 合理性）
**文件路径**: `tests/apis/auth.service.test.ts`
**代码行数**: 1387 行（79 个测试用例）
**被测文件**: `apis/service/impl/auth.service.impl.ts`（248 行，7 个公开方法）

---

## 一、评审范围

对 `AuthServiceImpl` 的 7 个公开方法进行测试质量评估：
- `login` / `verifyToken` / `saveSelection` / `getLatestUserState`
- `getAccessibleCompanies` / `getAccessibleProjects` / `getCompanyUsers`

### 测试分布统计

| 方法 | 主测试 | 补充测试 | 第3轮 | 合计 | 错误路径 | 安全边界 |
|------|--------|---------|-------|------|---------|---------|
| login | 14 | 3 | 3 | 20 | 0 | 0 |
| verifyToken | 4 | 2 | 1 | 7 | 0 | 0 |
| saveSelection | 7 | 0 | 2 | 9 | 0 | 0 |
| getAccessibleCompanies | 8 | 0 | 2 | 10 | 0 | 0 |
| getAccessibleProjects | 10 | 0 | 1 | 11 | 0 | 0 |
| getCompanyUsers | 5 | 0 | 1 | 6 | 0 | 0 |
| getLatestUserState | 4 | 0 | 0 | 4 | 0 | 0 |
| 接口合规性 | 1 | 0 | 0 | 1 | — | — |
| **合计** | **53** | **5** | **10** | **68** | **0** | **0** |

---

## 二、质量问题清单

### CRITICAL 级别

#### C-1: 零错误路径测试

**位置**: 全文件 — 所有 79 个测试均为 happy path 或已知异常（业务错误）

**问题描述**: 没有任何测试覆盖 Prisma 数据库查询/更新失败的场景。当数据库连接断开、超时、或写入冲突时，服务层如何表现完全未知。

**缺失场景**:
- `login`: `prisma.user.findUnique` 抛出连接错误
- `login`: `prisma.user.update` 持久化选择时失败
- `verifyToken`: `prisma.user.findUnique` 抛出错误（当前被 catch 吞掉返回 valid:false）
- `getLatestUserState`: `prisma.user.findUnique` 抛出错误
- `getCompanyUsers`: `prisma.user.findMany` 抛出错误
- `saveSelection`: `prisma.user.update` 抛出错误
- `getAccessibleCompanies`: `prisma.company.findMany/findUnique` 抛出错误
- `getAccessibleProjects`: 各 prisma 查询抛出错误

**影响**: 生产环境数据库故障时，错误可能以未预期的形式传播到客户端（如 500 + 内部错误消息泄露）

**修复建议**: 为每个公开方法添加至少 1 个数据库错误路径测试

---

### HIGH 级别

#### H-1: hashPassword 辅助函数重复定义

**位置**: 第 33 行和第 1163 行

**问题描述**: `hashPassword` 函数在 `describe('login')` 和 `describe('login 第3轮补充')` 中各定义了一次，完全相同的实现：

```typescript
const hashPassword = (password: string) => require('bcryptjs').hashSync(password, 10);
```

**修复建议**: 提取到 `describe('AuthService')` 顶层作用域

---

#### H-2: Mock 结构冗余且无工厂函数

**位置**: 全文件

**问题描述**: 每个测试用例都手动构建 prisma mock 对象，结构高度重复。以 `login` 测试为例，以下模式重复出现 20+ 次：

```typescript
mockedGetPrisma.mockReturnValue({
  user: { findUnique: mockFindUnique, update: mockUpdate },
  company: { findUnique: mockCompanyFindUnique },
  projectOperator: { findMany: mockProjectOperatorFindMany },
} as any);
```

**修复建议**: 创建 `createPrismaMock` 工厂函数，按方法需求组合 mock

---

#### H-3: 无 verifyToken 禁用用户测试（安全+质量交叉）

**位置**: `verifyToken` describe 块

**问题描述**: `auth.service.impl.ts:104-126` 的 `verifyToken` 方法未检查 `user.status`。当用户被禁用后，其 token 在 2 小时有效期内仍然可通过验证。

**当前实现**:
```typescript
if (!user) return { valid: false };
// ❌ 缺少: if (!user.status) return { valid: false };
return { valid: true, user: { ... } };
```

**修复建议**:
1. 添加测试：`verifyToken 用户被禁用时应返回 { valid: false }`
2. 修复实现：在 `if (!user)` 后添加 `if (!user.status) return { valid: false };`

---

### MEDIUM 级别

#### M-1: 环境变量未隔离

**位置**: 第 6-7 行

**问题描述**: `process.env.JWT_SECRET` 和 `process.env.JWT_EXPIRES_IN` 在模块级别设置，没有 `afterAll` 清理。如果其他测试文件依赖这些环境变量的默认值，可能产生测试间污染。

**修复建议**: 在 `afterAll` 中恢复原始值

---

#### M-2: `as any` 过度使用

**位置**: 全文件（出现 50+ 次）

**问题描述**: 所有 prisma mock 都使用 `as any` 类型断言，完全绕过 TypeScript 类型检查。如果 Prisma schema 变更，这些测试不会产生编译错误，导致测试与实现不一致。

**修复建议**: 定义最小化的 Prisma mock 类型接口

---

#### M-3: 缺少 saveSelection 负数 ID 边界测试

**位置**: `saveSelection` describe 块

**问题描述**: 测试了 `project_id: 0` 和 `project_id: undefined/null`，但没有测试负数的 `company_id` 或 `project_id`。负数 ID 不在可访问列表中，应被拦截。

---

#### M-4: 缺少 getLatestUserState 禁用用户测试

**位置**: `getLatestUserState` describe 块

**问题描述**: 测试了用户不存在和正常用户，但没有测试 `status: false` 的用户。`getLatestUserState` 是否应该返回禁用用户的状态？如果 verifyToken 已拦截禁用用户，则此方法不需要额外检查，但应有测试文档化此行为。

---

## 三、已有优点（正面评价）

| 方面 | 评价 | 说明 |
|------|------|------|
| 角色覆盖 | 优秀 | sysadmin/admin/view 三种角色的核心路径均有测试 |
| 边界条件 | 良好 | null/undefined/0/空数组/disabled 等边界均有覆盖 |
| 选择持久化 | 良好 | login 的选择解析和持久化逻辑测试充分 |
| 接口合规性 | 良好 | 有专门的接口方法完整性测试 |
| 错误消息验证 | 良好 | 业务错误消息（如"用户名或密码错误"）有精确验证 |
| JWT 验证 | 良好 | 过期/伪造/格式错误 token 均有测试 |

---

## 四、质量度量

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| 正向路径覆盖 | 9/10 | 7 个方法的核心业务逻辑覆盖充分 |
| 错误路径覆盖 | 1/10 | 零数据库错误路径测试 |
| 安全边界覆盖 | 3/10 | 缺少禁用用户 token 验证、负数 ID 等边界 |
| 测试隔离性 | 6/10 | mock 清理良好但环境变量未隔离 |
| 代码复用性 | 3/10 | hashPassword 重复 + 无 mock 工厂 |
| Mock 合理性 | 7/10 | mock 结构正确但过度使用 as any |

**综合质量评分: 5.8/10**

**判定: REQUEST CHANGES** — C-1（零错误路径）为阻断项

---

## 五、修复优先级

### P0 — 阻断合并

| 问题 | 工作量 |
|------|--------|
| C-1: 补充 7+ 错误路径测试 | 中 |
| H-3: verifyToken 禁用用户测试 + 实现修复 | 小 |

### P1 — 本迭代

| 问题 | 工作量 |
|------|--------|
| H-1: hashPassword 提取 | 小 |
| H-2: mock 工厂函数 | 中 |
| M-1: 环境变量隔离 | 小 |
| M-3: 负数 ID 边界 | 小 |

---

*测试质量专家评审完成 — 2026-05-26*
