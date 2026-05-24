# apis/controller/company.controller.ts — 软件质量专家评审报告

| 项目 | 信息 |
|------|------|
| **评审文件** | `apis/controller/company.controller.ts` |
| **评审角色** | 软件质量专家 (Quality Expert) |
| **评审日期** | 2026-05-24 |
| **代码行数** | 115 行 |
| **函数数量** | 5 个导出函数 + 1 个内部辅助函数 |
| **关联路由** | `apis/routes/company.routes.ts` — 5 条路由 |
| **综合评级** | **B-（良好基线，存在架构级冗余与一致性缺陷）** |

---

## 评审摘要

该文件相比旧版（237 行）已完成显著改进：引入 `created()` 响应工具函数、Zod schema 验证、`err: unknown` 类型、消息常量提取。代码结构清晰、函数职责单一。

但从软件质量视角深入审查后发现三组核心问题：

1. **冗余验证架构** — 路由中间件 `validate()` 与控制器内 `safeParse()` 双重校验，控制器内验证实为死代码
2. **错误分类脆弱** — `isNotFoundError()` 基于字符串精确匹配，项目已有 `LoginSelectionError` 等自定义异常类型但未复用
3. **验证覆盖不一致** — `toggleCompanyStatus` 端点绕过了 Zod schema 验证体系，仅做手动 `typeof` 检查

| 级别 | 数量 | 说明 |
|------|------|------|
| CRITICAL | 0 | 无 |
| HIGH | 4 | 死代码/冗余验证、toggle 缺 schema、脆弱错误分类、静默吞错 |
| MEDIUM | 3 | 无依赖注入、list 无分页、常量覆盖不完整 |
| LOW | 2 | 冗余类型断言、toggle 路由未用 validate 中间件 |

---

## 质量评分矩阵

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| API 设计 | 8/10 | RESTful 路径规范，`created()` 用于 POST 201，响应格式统一 |
| 输入验证 | 7/10 | Zod schema 覆盖 4/5 端点，但 toggle 缺 schema；双验证属冗余 |
| 错误处理 | 6/10 | `err: unknown` + `isNotFoundError` 模式合理，但字符串匹配脆弱且无日志 |
| 代码一致性 | 6/10 | 响应格式统一，但验证策略不一致（middleware vs 手动 typeof） |
| 安全防护 | 8/10 | 路由层 sysadmin 限制 + Prisma 防注入 + Zod 白名单 |
| 可维护性 | 7/10 | 消息常量提取、函数短小、结构清晰 |

---

## HIGH 级别问题

### H-1: createCompany / updateCompany 控制器内 Zod 验证是死代码

**位置**: L51-55（createCompany）、L73-77（updateCompany）

```typescript
// 路由层已通过 validate 中间件校验
router.post('/', validate(createCompanySchema), ctrl.createCompany);
router.put('/:id', validate(updateCompanySchema), ctrl.updateCompany);

// 控制器再次校验 — 这是死代码
const parsed = createCompanySchema.safeParse(req.body);
if (!parsed.success) {                          // ← 此分支永远不可达
  fail(res, 400, parsed.error.issues.map(...).join('; '));
  return;
}
```

**问题分析**:

`validate()` 中间件（`apis/middleware/validate.ts`）在请求到达控制器前已执行 `safeParse`。若验证失败，中间件直接返回 400 并终止请求；若验证成功，`req.body` 已被替换为经过校验和转换的 `parsed.data`。

因此控制器再次执行 `safeParse` 时，输入必定合法，`!parsed.success` 分支**永远不会被执行**。

**影响**:
1. 每次请求执行两次 Zod 解析，浪费 CPU（Zod 解析非零成本，尤其含正则和 transform 时）
2. 误导维护者以为控制器是验证的最终防线，实际中间件已承担此职责
3. 控制器的验证错误消息格式（`e.message.join('; ')`）与中间件格式（`'参数验证失败: ' + ...`）不一致，但因死代码不会触发

**修复建议**: 删除控制器内 `safeParse` 调用，直接使用 `req.body`（已被中间件替换为校验后的数据）：

```typescript
export async function createCompany(req: Request, res: Response): Promise<void> {
  try {
    const createRequest: CreateCompanyRequest = req.body; // validate 中间件已校验
    const company = await companyService.create(createRequest);
    created(res, company, '创建公司成功');
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      fail(res, 404, MSG_NOT_FOUND);
    } else {
      fail(res, 500, MSG_CREATE_FAIL);
    }
  }
}
```

---

### H-2: toggleCompanyStatus 缺少 Zod Schema 验证

**位置**: L91-113（控制器）+ L15（路由）

```typescript
// 路由 — 无 validate 中间件
router.put('/:id/status', ctrl.toggleCompanyStatus);

// 控制器 — 仅手动 typeof 检查
const { status } = req.body;
if (typeof status !== 'boolean') {
  fail(res, 400, 'status参数无效');
  return;
}
```

**问题分析**:

1. **缺少 schema 约束**: `req.body` 可包含任意额外字段（如 `{ status: true, id: 999, role: 'admin' }`），这些字段不会被拦截
2. **与其他端点验证策略不一致**: `createCompany` 和 `updateCompany` 使用 Zod schema 白名单验证，`toggleCompanyStatus` 使用手动 `typeof` 检查
3. **验证强度不对等**: Zod 的 `boolean()` 会拒绝 `null`、`undefined`、`"true"`（字符串），但 `typeof` 只检查 JS 类型，`Boolean(true)` 等 box 类型也能通过

**修复建议**: 创建专用 schema 并在路由层使用 `validate` 中间件：

```typescript
// apis/schema/company.schema.ts — 新增
export const toggleCompanyStatusSchema = z.object({
  status: z.boolean({ error: 'status参数无效' }),
});

// apis/routes/company.routes.ts
router.put('/:id/status', validate(toggleCompanyStatusSchema), ctrl.toggleCompanyStatus);
```

---

### H-3: isNotFoundError 基于字符串精确匹配 — 脆弱的错误分类

**位置**: L18-20

```typescript
const MSG_NOT_FOUND = '公司不存在';

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message === MSG_NOT_FOUND;
}
```

**问题分析**:

Service 层 `company.service.impl.ts` 在三处抛出 `throw new Error('公司不存在')`，控制器通过 `err.message === '公司不存在'` 精确匹配来识别。此模式存在：

1. **脆弱性**: 若 Service 层修改消息文本（如改为 `"该公司不存在"` 或 `"公司不存在(id=1)"`），控制器匹配静默失效，业务异常退化为 500
2. **不可扩展**: Service 层还抛出 `"系统管理员不可被关联到公司"` 和 `"用户已禁用: ..."` 等错误，控制器无法区分这些不同的业务异常
3. **违反项目一致性**: 项目 `user.entity.ts` 已定义 `LoginSelectionError` 和 `PermissionDeniedError` 自定义异常类型，本模块未遵循同一模式

**影响**: 错误响应码错误（业务异常被当作 500 返回），且错误消息不具指导性。

**修复建议**: 定义统一的业务异常类型：

```typescript
// apis/entity/company.entity.ts
export class CompanyNotFoundError extends Error {
  constructor() { super('公司不存在'); this.name = 'CompanyNotFoundError'; }
}

// Service 层
throw new CompanyNotFoundError();

// Controller 层
if (err instanceof CompanyNotFoundError) {
  fail(res, 404, err.message);
}
```

---

### H-4: 所有 catch 块静默吞掉错误 — 无日志记录

**位置**: L27-29, L42-46, L60-62, L82-88, L107-113（全部 5 个 catch 块）

```typescript
} catch (err: unknown) {
  // ❌ 错误被吞掉，无 console.error / logger / 任何记录
  fail(res, 500, MSG_CREATE_FAIL);
}
```

**问题分析**:

当 500 错误发生时（如 Prisma 连接超时、事务死锁、磁盘满），没有任何服务端日志记录。运维人员只能通过用户反馈得知问题，无法：
1. 定位错误发生的时间和频率
2. 获取完整的错误堆栈
3. 分析错误根因（数据库 / 网络 / 业务逻辑）

项目内 `auth.controller.ts` 同样存在此问题，属于项目级技术债务。

**修复建议**:

```typescript
} catch (err: unknown) {
  console.error('[CompanyController] createCompany failed:', err);
  fail(res, 500, MSG_CREATE_FAIL);
}
```

长期应引入结构化日志（如 `pino` / `winston`），统一请求 ID 追踪。

---

## MEDIUM 级别问题

### M-1: 模块级 `new CompanyServiceImpl()` — 无依赖注入

**位置**: L7

```typescript
const companyService = new CompanyServiceImpl();
```

**问题分析**:

模块顶层硬编码实例化，导致：
1. **单元测试困难**: 无法注入 mock service，需 monkey-patch 模块或依赖 `CompanyServiceImpl` 的真实数据库连接
2. **生命周期不可控**: 服务实例随模块加载创建，与应用生命周期绑定
3. **与项目模式一致**: `auth.controller.ts` 等也使用相同模式，属于项目级架构选择

**当前影响**: 中等 — 功能正确但测试成本高。作为项目级技术债务，可与其他控制器统一重构。

---

### M-2: listCompanies 无分页机制

**位置**: L22-29

```typescript
export async function listCompanies(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await companyService.list();  // 返回全部记录
    success(res, companies, '获取公司列表成功');
```

**问题分析**: 当前作为内部管理系统、公司数量有限时影响可控。项目已有 `paginate()` 工具函数（`apis/utils/response.util.ts`），可零成本引入分页。

**建议**: 当前阶段维持现状，但在代码中添加 TODO 注释标记。待公司数量超过 100 时引入分页。

---

### M-3: 消息常量覆盖不完整

**位置**: L9-16 vs L101, L106

```typescript
// 已提取的常量
const MSG_INVALID_ID = '无效的公司ID';
const MSG_NOT_FOUND = '公司不存在';
// ...

// 未提取的硬编码字符串
fail(res, 400, 'status参数无效');           // L101
success(res, company, status ? '公司已启用' : '公司已禁用');  // L106
```

**问题分析**: 5 个端点中 4 个的错误/成功消息已提取为常量，但 `toggleCompanyStatus` 中有 2 处字符串未提取，破坏了消息管理的完整性。

**修复建议**:

```typescript
const MSG_STATUS_INVALID = 'status参数无效';
const MSG_ENABLED = '公司已启用';
const MSG_DISABLED = '公司已禁用';
```

---

## LOW 级别问题

### L-1: `req.params.id as string` 类型断言冗余

**位置**: L33, L67, L93

```typescript
const id = parseInt(req.params.id as string, 10);
```

Express 的 `req.params` 类型定义为 `{ [key: string]: string }`，`req.params.id` 已是 `string` 类型，`as string` 断言无实际作用。可简化为：

```typescript
const id = parseInt(req.params.id, 10);
```

---

### L-2: toggleCompanyStatus 路由未使用 validate 中间件模式

**位置**: `apis/routes/company.routes.ts` L15

```typescript
// 当前
router.put('/:id/status', ctrl.toggleCompanyStatus);

// 建议（与 H-2 修复一致）
router.put('/:id/status', validate(toggleCompanyStatusSchema), ctrl.toggleCompanyStatus);
```

此问题与 H-2 重复，但强调的是**路由层的架构一致性**：所有路由应统一通过 `validate()` 中间件处理输入校验，而非在控制器内部手动检查。

---

## 正面发现（做得好的方面）

| 编号 | 发现 | 说明 |
|------|------|------|
| G-1 | `created()` 工具函数 | POST 创建使用 201 状态码，符合 RESTful 规范，旧版已修复 |
| G-2 | Zod schema + validate 中间件 | 输入验证从 truthy 检查升级为 schema 白名单，旧版已修复 |
| G-3 | `err: unknown` 类型 | 所有 catch 块使用 `unknown` 而非 `any`，旧版已修复 |
| G-4 | 消息常量提取 | `MSG_*` 常量集中管理，旧版已修复 |
| G-5 | 显式 boolean 检查 | `toggleCompanyStatus` 使用 `typeof status !== 'boolean'` 而非 truthy 检查 |
| G-6 | `isNotFoundError` 辅助函数 | 错误分类逻辑提取为命名函数，意图清晰 |
| G-7 | Service 层 validateUserIds | 用户 ID 存在性、角色、状态校验完备，旧版已修复 |
| G-8 | 响应格式统一 | 全部使用 `success()` / `fail()` / `created()` 工具函数 |
| G-9 | 函数规模合理 | 平均 15-20 行/函数，职责单一，可读性优秀 |
| G-10 | 显式请求类型构造 | `CreateCompanyRequest` / `UpdateCompanyRequest` 类型标注明确 |

---

## 修复优先级路线图

### 第一阶段：立即修复（2 小时工作量）

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P1 | H-1 | 控制器内 Zod 验证死代码 | 删除控制器内 `safeParse`，信任中间件 |
| P1 | H-2 | toggleCompanyStatus 缺 schema | 新增 `toggleCompanyStatusSchema` + 路由 validate |
| P1 | H-4 | 静默吞错 | 添加 `console.error` 日志 |

### 第二阶段：短期改进（1 天工作量）

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P2 | H-3 | 字符串匹配错误分类 | 引入 `CompanyNotFoundError` 自定义异常 |
| P2 | M-3 | 消息常量不完整 | 补充 `MSG_STATUS_INVALID` 等常量 |
| P2 | L-1 | 冗余类型断言 | 删除 `as string` |

### 第三阶段：中长期优化

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P3 | M-1 | 无依赖注入 | 项目级 DI 重构（与其他控制器统一） |
| P3 | M-2 | list 无分页 | 公司数超 100 时引入 `paginate()` |

---

## 与旧版评审对比（质量演进）

| 旧版问题编号 | 旧版问题描述 | 当前状态 |
|-------------|-------------|---------|
| H-1 | createCompany 手动构造 201 响应 | **已修复** — 使用 `created()` 工具函数 |
| H-2 | err.message 泄露内部信息 | **已修复** — 500 错误返回通用消息常量 |
| H-3 | 输入验证薄弱（仅 truthy 检查） | **已修复** — 引入 Zod schema |
| H-4 | toggleCompanyStatus 缺 Swagger | **需验证** — 应检查 `swagger-spec.json` |
| H-5 | 字符串匹配异常检测 | **部分修复** — 提取为 `isNotFoundError` 函数，但仍基于字符串 |
| M-1 | 验证逻辑重复 | **已修复** — schema + validate 中间件消除重复 |
| M-2 | list 无分页 | **未修复** — 当前规模可控 |
| M-3 | catch 使用 `any` | **已修复** — 改为 `unknown` |
| M-4 | operator_ids 未校验 | **已修复** — Service 层 `validateUserIds` |
| M-5 | req.body 整体传入 | **已修复** — Zod parsed.data 显式构造 |
| L-1 | 魔法字符串 | **已修复** — 提取为 `MSG_*` 常量 |
| L-2 | `as string` 冗余 | **未修复** — 仍存在 |

**改进率**: 12 项中 9 项已修复（75%），整体质量显著提升。

---

## 评审结论

**判定: B- — 良好基线，存在架构级冗余和一致性问题**

该文件相比旧版已从 237 行精简至 115 行，修复了 75% 的已识别问题。代码风格清晰、安全防护到位（sysadmin 路由限制 + Zod 白名单 + Prisma 参数化查询）。

主要技术债务集中在**验证架构的一致性**上：路由层 `validate()` 中间件与控制器内 `safeParse()` 并存，前者使后者成为死代码；`toggleCompanyStatus` 端点完全绕过了这套验证体系。建议优先清理冗余验证（H-1）和补全 toggle schema（H-2），工作量小但架构收益明显。

---

*软件质量专家评审完成 — 2026-05-24*
