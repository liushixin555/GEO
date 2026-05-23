# apis/controller/company.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（代码安全 + 架构质量 + 输入验证 + 错误处理 + API 设计）
**文件路径**: `apis/controller/company.controller.ts`
**代码行数**: 237 行
**关联文件**: `apis/service/company.service.ts`, `apis/service/impl/company.service.impl.ts`, `apis/entity/company.entity.ts`, `apis/utils/response.util.ts`, `apis/map/index.ts`, `apis/app.ts`
**严重级别**: HIGH(5) / MEDIUM(5) / LOW(3)

---

## 一、质量评价总览

公司管理控制器包含 5 个 HTTP 端点处理函数，覆盖公司 CRUD + 状态切换。路由层已通过 `roleMiddleware('sysadmin')` 限制所有端点仅系统管理员可访问，认证与授权边界在中间件层完成。

从软件质量视角审视，该文件存在 **响应格式不一致、输入验证薄弱、错误处理脆弱、Swagger 文档缺失** 四类核心问题。相较于项目内其他 Controller（如 `auth.controller.ts`），本文件质量稍优（无 CRITICAL 级安全漏洞），但仍有显著改进空间。

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| API 设计 | 6/10 | RESTful 路径基本合理，但 createCompany 响应格式与其他端点不一致，toggleCompanyStatus 缺 Swagger 文档 |
| 输入验证 | 4/10 | 仅做 truthy 检查和 Array.isArray，未验证字符串格式、数组元素类型、手机号格式 |
| 错误处理 | 5/10 | 通过字符串匹配检测 Service 层异常，err.message 直接暴露给客户端 |
| 代码一致性 | 5/10 | createCompany 手动构造响应，其余使用 success()；验证逻辑 create/update 重复 |
| 安全防护 | 7/10 | 路由层 roleMiddleware 限制 sysadmin，Prisma 防注入；但 operator_ids 未校验存在性 |
| 可维护性 | 6/10 | 文件规模合理，结构清晰；但重复验证逻辑和魔法字符串增加维护负担 |

---

## 二、问题清单

### HIGH-1: createCompany 响应格式与项目规范不一致

**位置**: 第 126 行

```typescript
// createCompany — 手动构造 201 响应
res.status(201).json({ code: 0, message: '创建公司成功', data: company });

// 其他所有端点 — 使用 success() 工具函数
success(res, company, '更新公司成功');
```

**问题分析**:

`success()` 工具函数固定返回 HTTP 200：

```typescript
export function success<T>(res: Response, data: T, message = '操作成功') {
  return res.json({ code: 0, message, data });
}
```

RESTful 规范要求资源创建返回 201，`success()` 无法满足此需求。当前代码手动构造 `{ code: 0, message, data }` 结构，存在两个风险：

1. **结构漂移**: 若未来 `success()` 的响应结构变更（如增加 `timestamp` 字段），此处不会同步更新
2. **一致性缺失**: 同一 Controller 内两种响应构造方式并存，增加认知负担

**修复建议**: 扩展 response 工具函数：

```typescript
// apis/utils/response.util.ts
export function created<T>(res: Response, data: T, message = '创建成功') {
  return res.status(201).json({ code: 0, message, data });
}

// company.controller.ts
import { success, fail, created } from '../utils';
created(res, company, '创建公司成功');
```

---

### HIGH-2: err.message 直接暴露给客户端 — 可能泄露数据库内部信息

**位置**: 第 24、59、128、209、234 行（所有 catch 块）

```typescript
} catch (err: any) {
  fail(res, 500, err.message || '创建公司失败');  // ❌ Prisma 错误消息可能含表名、字段名
}
```

**问题分析**:

Service 层使用 Prisma ORM，当数据库操作失败时，Prisma 抛出的错误消息可能包含：

- 表名：`Table 'public.User' not found`
- 字段名：`Invalid column name 'shortName'`
- 约束名：`Foreign key constraint failed on the field: User_companyId_fkey`
- 连接信息：`Can't reach database server at localhost:5432`

这些内部信息暴露给客户端，违反 OWASP A05（安全配置错误）原则。

**影响范围**: 5 个端点全部受影响。

**修复建议**: 对 500 错误统一返回通用消息，将详细错误记录到服务端日志：

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  // TODO: 替换为正式日志系统
  console.error('[CompanyController] 操作失败:', message);
  fail(res, 500, '服务器内部错误，请稍后重试');
}
```

对已知业务异常（如'公司不存在'），可精确匹配并返回对应状态码，其余一律返回通用 500 消息。

---

### HIGH-3: 输入验证薄弱 — 缺少类型、格式和范围校验

**位置**: 第 113-123 行（createCompany）和第 191-200 行（updateCompany）

```typescript
const { short_name, full_name, contact_person, contact_phone, operator_ids } = req.body;

if (!short_name || !full_name || !contact_person || !contact_phone) {  // ❌ 仅 truthy 检查
  fail(res, 400, '公司名短名、公司名全名、接口人、接口人电话不能为空');
  return;
}

if (!Array.isArray(operator_ids) || operator_ids.length === 0) {  // ❌ 未校验数组元素类型
  fail(res, 400, '运营者不能为空');
  return;
}
```

**问题清单**:

| 验证缺失 | 字段 | 风险 |
|----------|------|------|
| 未检查 `typeof` | short_name, full_name 等 | 传入数组/对象 `[1,2,3]` 会通过 truthy 检查，导致 Prisma 运行时错误 |
| 未限制长度 | 所有字符串字段 | 超长字符串导致数据库写入失败或存储溢出 |
| 未校验手机号格式 | contact_phone | `"abc"` 或 `"1"` 均可通过验证 |
| 未校验数组元素类型 | operator_ids | `[null, undefined, "abc", -1]` 均可通过 `Array.isArray` 检查 |
| 未校验数值范围 | operator_ids 元素 | 负数、0、浮点数、极大值均可通过 |
| address 未处理 | address | 未在验证中提及，但允许 undefined（符合 entity 定义） |

**修复建议**: 引入 Zod schema 验证：

```typescript
import { z } from 'zod';

const companySchema = z.object({
  short_name: z.string().min(1).max(50),
  full_name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  contact_person: z.string().min(1).max(50),
  contact_phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  operator_ids: z.array(z.number().int().positive()).min(1, '运营者不能为空'),
  viewer_ids: z.array(z.number().int().positive()).optional(),
});
```

---

### HIGH-4: toggleCompanyStatus 缺少 Swagger API 文档

**位置**: 第 214-237 行

```typescript
export async function toggleCompanyStatus(req: Request, res: Response): Promise<void> {
  // ❌ 无 @swagger 注释块
  try {
```

**问题分析**:

5 个端点中有 4 个具有完整的 Swagger 注释（路径、参数、请求体、响应码），但 `toggleCompanyStatus` 完全缺少 API 文档。这导致：

1. Swagger UI 中该端点不显示，前端开发者无法了解接口定义
2. 请求体 schema（`status: boolean`）未文档化
3. 响应格式未文档化
4. 与其他端点的文档覆盖率不一致

**修复建议**:

```typescript
/**
 * @swagger
 * /api/companies/{id}/status:
 *   put:
 *     summary: Toggle company status (enable/disable)
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company status updated
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Company not found
 */
```

---

### HIGH-5: Service 层异常通过字符串匹配检测 — 脆弱的错误识别模式

**位置**: 第 58-59 行、第 206-207 行、第 231-232 行

```typescript
} catch (err: any) {
  if (err.message === '公司不存在') {  // ❌ 字符串精确匹配
    fail(res, 404, err.message);
  } else {
    fail(res, 500, err.message || '获取公司详情失败');
  }
}
```

**问题分析**:

Controller 通过 `err.message === '公司不存在'` 精确匹配来识别 Service 层抛出的业务异常。这种模式存在：

1. **脆弱性**: 若 Service 层修改错误消息（如改为"该公司不存在"），Controller 的匹配将失效，业务异常被当作 500 返回
2. **不可扩展**: 新增业务异常需同步修改 Controller 的字符串匹配逻辑
3. **违反分层隔离**: Controller 依赖 Service 层的具体错误消息文本，形成隐式契约

项目内 `auth.controller.ts` 使用 `instanceof LoginSelectionError` 进行类型匹配，虽然也存在耦合问题，但至少是编译时可检查的。

**修复建议**: 引入统一的业务异常基类：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity}不存在`);
    this.name = 'NotFoundError';
  }
}

// Service 层
throw new NotFoundError('公司');

// Controller 层
} catch (err: unknown) {
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else {
    fail(res, 500, '操作失败');
  }
}
```

---

### MEDIUM-1: createCompany 与 updateCompany 验证逻辑完全重复 — 违反 DRY

**位置**: 第 113-123 行 vs 第 191-200 行

```typescript
// createCompany（第 113-123 行）
if (!short_name || !full_name || !contact_person || !contact_phone) {
  fail(res, 400, '公司名短名、公司名全名、接口人、接口人电话不能为空');
  return;
}
if (!Array.isArray(operator_ids) || operator_ids.length === 0) {
  fail(res, 400, '运营者不能为空');
  return;
}

// updateCompany（第 191-200 行）— 完全相同的代码
if (!short_name || !full_name || !contact_person || !contact_phone) {
  fail(res, 400, '公司名短名、公司名全名、接口人、接口人电话不能为空');
  return;
}
if (!Array.isArray(operator_ids) || operator_ids.length === 0) {
  fail(res, 400, '运营者不能为空');
  return;
}
```

**问题分析**: 两个函数中的验证逻辑完全相同，且错误消息字符串重复。若需修改验证规则（如添加手机号格式校验），必须同步修改两处。

**修复建议**: 提取为公共验证函数：

```typescript
function validateCompanyBody(body: Record<string, unknown>): string | null {
  const { short_name, full_name, contact_person, contact_phone, operator_ids } = body;
  if (!short_name || !full_name || !contact_person || !contact_phone) {
    return '公司名短名、公司名全名、接口人、接口人电话不能为空';
  }
  if (!Array.isArray(operator_ids) || operator_ids.length === 0) {
    return '运营者不能为空';
  }
  return null;
}
```

---

### MEDIUM-2: listCompanies 无分页机制 — 数据量增长后性能风险

**位置**: 第 19-26 行

```typescript
export async function listCompanies(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await companyService.list();  // ❌ 返回全部记录
    success(res, companies, '获取公司列表成功');
  } catch (err: any) {
    fail(res, 500, err.message || '获取公司列表失败');
  }
}
```

**问题分析**: `companyService.list()` 调用 `prisma.company.findMany()` 无分页限制。当前作为内部管理系统、公司数量有限时影响可控，但长期存在：

1. 数据量增长后响应时间增加
2. 内存占用随记录数线性增长
3. 前端渲染大量数据的性能问题

**修复建议**: 当前阶段可维持现状（公司数量有限），但应在代码中添加 TODO 注释，待公司数量超过 100 时引入分页。

---

### MEDIUM-3: catch 使用 `err: any` 类型 — 不符合 TypeScript 最佳实践

**位置**: 第 23、57、127、205、230 行（全部 catch 块）

```typescript
} catch (err: any) {  // ❌ 应使用 unknown
```

**问题分析**: `any` 类型跳过 TypeScript 的类型安全检查，允许随意访问 `err.message`、`err.stack` 等属性而不做类型窄化。如果传入非 Error 对象（如 Prisma 的原始错误），可能产生意外行为。

**修复建议**:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : '操作失败';
  // 使用 message
}
```

---

### MEDIUM-4: operator_ids 未校验用户存在性和角色合规性

**位置**: `company.service.impl.ts` create/update 方法

```typescript
// company.controller.ts — 传入任意数字数组
const company = await companyService.create(req.body);

// company.service.impl.ts — 直接用于数据库更新
for (const operatorId of request.operator_ids) {
  await tx.user.update({
    where: { id: operatorId },  // ❌ 若 operatorId 不存在，Prisma 抛出异常
    data: { companyId: company.id },
  });
}
```

**问题分析**:

1. **不存在用户**: 若传入不存在的 `operator_ids`，Prisma 抛出 `RecordNotFound` 异常，通过 HIGH-2 的 err.message 泄露到客户端
2. **角色不匹配**: 未验证被指定的用户是否具有 admin 角色，理论上可将 view 角色用户指定为运营者
3. **跨公司冲突**: update 时先解除关联再重新关联，未检查新 operator_ids 是否已属于其他公司

此问题横跨 Controller 和 Service 层，但 Controller 作为入口应首先拦截明显无效的输入。

**修复建议**: Service 层在事务内校验：

```typescript
// 验证 operator_ids 存在且角色正确
const operators = await tx.user.findMany({
  where: { id: { in: request.operator_ids }, role: 'admin' },
});
if (operators.length !== request.operator_ids.length) {
  throw new Error('部分运营者不存在或角色不正确');
}
```

---

### MEDIUM-5: updateCompany 中 req.body 整体传入 Service — 批量赋值风险

**位置**: 第 203 行

```typescript
const company = await companyService.update(id, req.body);  // ❌ req.body 直接传入
```

**问题分析**:

虽然 Service 层的 `update` 方法只使用了 `short_name`、`full_name`、`address`、`contact_person`、`contact_phone`、`operator_ids`、`viewer_ids` 字段（通过显式赋值），但将整个 `req.body` 传入 Service 接口是一个不良实践：

1. **隐式依赖**: Controller 不清楚 Service 实际使用了哪些字段
2. **接口模糊**: Service 接口类型为 `UpdateCompanyRequest`，但传入的是未经构造的 `req.body`
3. **潜在风险**: 若 Service 层改用 `prisma.company.update({ data: request })` 展开赋值，将导致批量赋值漏洞

对比 `createCompany`（第 125 行）也有相同问题。但 create 的 Service 实现同样通过显式字段赋值避免了实际风险。

**修复建议**: 在 Controller 层显式构造请求对象：

```typescript
const updateRequest: UpdateCompanyRequest = {
  short_name,
  full_name,
  address: req.body.address,
  contact_person,
  contact_phone,
  operator_ids,
  viewer_ids: req.body.viewer_ids,
};
const company = await companyService.update(id, updateRequest);
```

---

### LOW-1: 错误消息魔法字符串分散在多处

**位置**: 第 52、58、59、116、121、128、194、199、209、218、224、234 行

```typescript
fail(res, 400, '无效的公司ID');          // 出现 2 次
fail(res, 400, '公司名短名、公司名全名...'); // 出现 2 次
fail(res, 400, '运营者不能为空');          // 出现 2 次
```

**建议**: 提取为常量或消息模板：

```typescript
const MSG_INVALID_ID = '无效的公司ID';
const MSG_REQUIRED_FIELDS = '公司名短名、公司名全名、接口人、接口人电话不能为空';
const MSG_OPERATOR_REQUIRED = '运营者不能为空';
const MSG_COMPANY_NOT_FOUND = '公司不存在';
```

---

### LOW-2: `parseInt(req.params.id as string, 10)` 中 `as string` 冗余

**位置**: 第 50、185、216 行

```typescript
const id = parseInt(req.params.id as string, 10);
```

**问题分析**: `req.params.id` 类型已为 `string`（Express 类型定义），`as string` 断言冗余。若使用严格 TypeScript 配置，可简化为：

```typescript
const id = parseInt(req.params.id, 10);
```

---

### LOW-3: toggleCompanyStatus 的 status 参数未校验边界值

**位置**: 第 222-225 行

```typescript
const { status } = req.body;
if (typeof status !== 'boolean') {  // ✓ 类型检查正确
  fail(res, 400, 'status参数无效');
  return;
}
```

**正面评价**: 此处的 `typeof status !== 'boolean'` 检查是本文件中唯一正确的类型守卫实现。建议将此模式推广到其他参数的验证中。

---

## 三、正面发现（做得好的方面）

1. **路由层授权完备**: 所有 5 个端点在 `app.ts` 中均配置了 `authMiddleware + roleMiddleware('sysadmin')`，授权在正确的架构层完成
2. **ID 解析与验证**: `parseInt` + `isNaN` 的模式在每个使用 path param 的端点中一致执行
3. **toggleCompanyStatus 参数校验**: `typeof status !== 'boolean'` 是正确的类型守卫
4. **Swagger 文档覆盖率高**: 4/5 端点有完整的 Swagger 注释
5. **Service 层异常识别**: 通过 `err.message === '公司不存在'` 至少区分了业务异常和系统错误，虽然模式脆弱但意图正确
6. **Prisma 参数化查询**: Service 层使用 Prisma ORM，天然防止 SQL 注入
7. **文件规模合理**: 237 行，函数平均 20-30 行，可读性良好
8. **状态切换设计**: `toggleCompanyStatus` 使用显式 boolean 而非 toggle 模式，避免并发竞态

---

## 四、修复优先级路线图

### 第一阶段：立即修复（半天工作量）

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P1 | H-2 | err.message 泄露内部信息 | 500 错误统一返回通用消息 |
| P1 | H-4 | toggleCompanyStatus 缺 Swagger | 补全 API 文档注释 |
| P1 | H-1 | createCompany 响应格式不一致 | 添加 `created()` 工具函数 |

### 第二阶段：短期改进（1-2 天）

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P2 | H-3 | 输入验证薄弱 | 引入 Zod schema 验证 |
| P2 | H-5 | 字符串匹配异常检测 | 引入 NotFoundError 基类 |
| P2 | M-1 | 验证逻辑重复 | 提取公共验证函数 |
| P2 | M-3 | catch 使用 `any` | 改为 `unknown` + instanceof |

### 第三阶段：中长期优化

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P3 | M-2 | list 无分页 | 公司数量超过 100 时引入分页 |
| P3 | M-4 | operator_ids 未校验 | Service 层添加存在性和角色校验 |
| P3 | M-5 | req.body 整体传入 | Controller 显式构造请求对象 |
| P3 | L-1 | 魔法字符串 | 提取消息常量 |

---

## 五、与项目其他 Controller 的对比

| 质量特征 | company.controller | auth.controller | article.controller | 评价 |
|----------|-------------------|-----------------|-------------------|------|
| 模块级单例 | `new CompanyServiceImpl()` | `new AuthServiceImpl()` | 同 | 一致 — 项目级模式 |
| try-catch 模式 | 5/5 端点 | 6/8 端点 | 同 | company 更一致 |
| 响应工具函数 | 4/5 用 success() | 全用 success() | 同 | company 有1处手动构造 |
| 错误信息泄露 | err.message 5处 | err.message 6处 | 同 | 一致 — 都是问题 |
| Swagger 覆盖 | 4/5 (80%) | 8/8 (100%) | 同 | company 缺少1个 |
| 输入验证 | truthy + isArray | truthy | 同 | company 略好 |
| 异常检测方式 | 字符串匹配 | instanceof + 字符串 | 同 | auth 略好 |

**结论**: company.controller.ts 的质量处于项目平均水平，与 auth.controller.ts 有类似问题但整体略优（无 CRITICAL 级安全漏洞，因路由层已做 sysadmin 限制）。

---

## 六、评审结论

**判定: ⚠️ 有条件通过 — 无阻塞性安全问题，但应纳入技术债务治理**

核心问题集中在三个方面：

1. **错误信息泄露（H-2）** — err.message 可能暴露数据库内部信息，虽然路由层限制了 sysadmin 访问降低了风险，但仍是安全最佳实践的违规
2. **输入验证薄弱（H-3）** — 仅做 truthy 检查，缺少类型、格式、范围校验，依赖 Service 层和 Prisma 的隐式防御
3. **代码一致性（H-1, M-1）** — createCompany 响应格式不一致，验证逻辑重复

**建议**:
- 短期: 修复 H-2（错误消息脱敏）和 H-4（补全 Swagger 文档），成本低且收益明确
- 中期: 引入 Zod schema 验证 + NotFoundError 异常基类
- 长期: 作为项目级技术债务，与其他 Controller 统一重构

---

*软件质量专家评审完成 — 2026-05-24*
