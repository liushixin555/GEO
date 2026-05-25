# apis/controller/company.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24（2026-05-26 修复 MINOR-1）
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + 职责边界 + 可扩展性 + 一致性）
**文件路径**: `apis/controller/company.controller.ts`
**代码行数**: 116 行（已从历史 237 行重构精简）
**依赖图**:

```
app.ts (路由注册 + 中间件编排)
  └─ company.controller.ts (HTTP 请求/响应处理)
       ├─ CompanyServiceImpl (业务逻辑, 模块级单例)
       │    └─ Prisma Client (数据访问)
       ├─ response.util.ts (success / fail / created)
       ├─ company.schema.ts (Zod 验证 schema)
       └─ Express Request / Response
```

**关联实体**: `entity/company.entity.ts` (Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail)
**关联映射**: `map/index.ts` (mapCompany: Prisma camelCase → API snake_case)
**严重级别**: ARCH-MAJOR(2) / ARCH-MINOR(3) / OBSERVATION(2)

---

## 一、架构评价总览

公司管理控制器是项目中结构最简洁的模块之一，采用函数式导出模式，由 `app.ts` 统一编排路由和中间件。该文件仅负责 HTTP 协议适配和请求调度，不含业务逻辑，符合 Controller 层的职责定义。

相较于历史版本（237 行），当前代码在**输入验证、响应格式一致性、错误消息管理、类型安全**方面已有显著提升：

| 改进项 | 历史版本 | 当前版本 | 状态 |
|--------|---------|---------|------|
| 输入验证 | truthy + Array.isArray 手动检查 | Zod schema 验证 | 已修复 |
| 响应格式 | createCompany 手动构造 201 | 统一使用 `created()` | 已修复 |
| 错误消息 | 魔法字符串分散（10+ 处） | 常量集中定义（7 个常量） | 已修复 |
| catch 类型 | `err: any` | `err: unknown` | 已修复 |
| req.body 传递 | 整体传入 Service | Zod 解析后构造类型安全 DTO | 已修复 |
| 代码行数 | 237 行 | 114 行（减少 52%） | 显著精简 |

从架构视角审视，**已修复的问题不再重复列出**，以下仅评审当前代码中仍存在的架构问题。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层职责 | 9/10 | Controller 仅做 HTTP 适配 + Zod 验证调度，不含业务逻辑 |
| 依赖管理 | 5/10 | 模块级硬编码单例，依赖具体实现类而非接口 |
| 关注点分离 | 8/10 | 验证通过 Zod schema 外置，仅 toggleStatus 保留内联验证 |
| 异常架构 | 6/10 | `isNotFoundError()` 封装了字符串匹配，但本质仍是隐式契约 |
| 可测试性 | 6/10 | 函数式导出便于集成测试，Zod schema 可独立测试 |
| 一致性 | 8/10 | 5 个端点中 4 个使用 Zod 验证，1 个内联验证 |
| 可扩展性 | 8/10 | 新增端点成本低，schema 验证模式可复用 |

---

## 二、架构问题清单

### ARCH-MAJOR-1: 模块级硬编码单例 — 依赖反转缺失

**位置**: 第 2 行、第 7 行

```typescript
import { CompanyServiceImpl } from '../service/impl/company.service.impl';
// ...
const companyService = new CompanyServiceImpl();  // 模块加载时立即实例化
```

**架构影响分析**:

```
当前依赖方向:
  Controller ──(具体类依赖)──> CompanyServiceImpl ──> Prisma Client

期望依赖方向（依赖反转原则 DIP）:
  Controller ──(接口依赖)──> ICompanyService <──(实现)── CompanyServiceImpl
```

虽然项目已定义 `ICompanyService` 接口（`company.service.ts`），Controller 直接导入具体实现类 `CompanyServiceImpl` 并在模块顶层实例化：

1. **测试困难**: 单元测试无法注入 mock service，必须使用 `jest.mock()` 拦截模块导入
2. **运行时不可替换**: 无法根据配置切换实现
3. **启动时副作用**: 模块导入即触发实例化

**项目模式一致性**: 所有 Controller（auth、project、company 等）采用统一模式，属项目级技术债务。

**重构建议**: 引入轻量级工厂：

```typescript
// apis/service/index.ts
export function getCompanyService(): ICompanyService {
  return new CompanyServiceImpl();
}

// company.controller.ts
import { getCompanyService } from '../service';
const companyService = getCompanyService();
```

**优先级**: P3 — 当前可通过 `jest.mock()` 解决测试需求，属项目级统一重构范畴

---

### ARCH-MAJOR-2: 异常识别仍依赖字符串匹配 — Service 层隐式契约

**位置**: 第 18-20 行（`isNotFoundError`）、第 41、83、108 行（调用处）

```typescript
function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message === MSG_NOT_FOUND;  // 字符串精确匹配
}
```

**架构影响分析**:

当前代码将字符串匹配封装为 `isNotFoundError()` 函数，比历史版本的分散内联匹配有显著改进。但本质上仍存在：

1. **隐式契约**: Controller 依赖 Service 层 `throw new Error('公司不存在')` 的精确文本
2. **脆弱性**: Service 层修改错误消息 → Controller 匹配失效 → 业务异常变为 500
3. **不可扩展**: 新增业务异常类型（如权限不足、重复名称）需同步修改 Controller

**对比**: `auth.controller.ts` 使用 `instanceof LoginSelectionError`，是编译时可检查的类型安全模式。

**重构建议**: 引入业务异常基类（项目级统一方案）：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) { super(`${entity}不存在`); this.name = 'NotFoundError'; }
}

// Service 层
throw new NotFoundError('公司');

// Controller 层
if (err instanceof NotFoundError) fail(res, 404, err.message);
```

或更进一步，在 `app.ts` 全局错误处理中间件中统一拦截，Controller 完全不处理异常类型识别。

**优先级**: P2 — 随业务异常类型增加，维护成本持续上升

---

### ARCH-MINOR-1: toggleCompanyStatus 未使用 Zod 验证 — 与其余端点验证模式不一致

**位置**: 第 91-114 行

```typescript
export async function toggleCompanyStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { ... }

    const { status } = req.body;          // ❌ 无 Zod schema 验证
    if (typeof status !== 'boolean') {    // ❌ 手动类型检查
      fail(res, 400, 'status参数无效');
      return;
    }
    // ...
```

对比 `createCompany`（第 49-63 行）和 `updateCompany`（第 65-89 行）使用的 Zod 模式：

```typescript
const parsed = createCompanySchema.safeParse(req.body);
if (!parsed.success) {
  fail(res, 400, parsed.error.issues.map((e: { message: string }) => e.message).join('; '));
  return;
}
```

**架构影响**:

1. **验证模式不一致**: 同一 Controller 内存在两种验证模式（Zod vs 手动 typeof）
2. **缺少 Zod schema**: `company.schema.ts` 未定义 `toggleStatusSchema`
3. **错误格式差异**: Zod 返回结构化错误（多字段联合消息），手动检查返回单一消息

**修复建议**: 在 `company.schema.ts` 添加 toggleStatus schema：

```typescript
export const toggleStatusSchema = z.object({
  status: z.boolean({ error: 'status参数无效' }),
});
```

---

### ARCH-MINOR-2: listCompanies 无分页参数 — 接口缺乏演进性

**位置**: 第 22-29 行

```typescript
export async function listCompanies(_req: Request, res: Response): Promise<void> {
  const companies = await companyService.list();  // 返回全部记录
  success(res, companies, '获取公司列表成功');
}
```

Service 接口 `list(): Promise<Company[]>` 无分页参数。当前作为内部管理系统、公司数量有限，影响可控。但接口签名不具备演进性，若未来需要分页需修改接口并影响所有调用者。

**优先级**: P4 — 待公司数量超过 100 时引入分页

---

### ARCH-MINOR-3: CreateCompanyRequest 与 UpdateCompanyRequest 类型完全相同

**位置**: `entity/company.entity.ts` 第 14-36 行

```typescript
export interface CreateCompanyRequest {    // 字段完全相同
  short_name: string;
  full_name: string;
  // ...
}

export interface UpdateCompanyRequest {    // 字段完全相同
  short_name: string;
  full_name: string;
  // ...
}
```

两者字段定义 100% 一致。Controller 中第 57 行和第 79 行分别将 Zod 解析结果断言为不同类型：

```typescript
const createRequest: CreateCompanyRequest = parsed.data;   // 第 57 行
const updateRequest: UpdateCompanyRequest = parsed.data;   // 第 79 行
```

**架构影响**: 未来若 Create 和 Update 的字段集产生差异（如 Update 允许部分字段可选），需分别修改两处。当前使用 `createCompanySchema` 和 `updateCompanySchema` 两个独立 Zod schema，验证层已预留了差异化能力，但 Entity 类型层未体现。

**建议**: 使用类型别名统一，待差异出现时再拆分：

```typescript
export type CreateCompanyRequest = {
  short_name: string;
  full_name: string;
  // ...
};
export type UpdateCompanyRequest = CreateCompanyRequest;
```

---

### OBS-1: Zod 错误提取的匿名类型注解

**位置**: 第 53 行、第 75 行

```typescript
parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
```

`(e: { message: string })` 使用了内联匿名类型而非引用 Zod 的导出类型。功能正确，但若 Zod 升级后 `issues` 结构变更，此处不会得到编译器提示。

**影响**: 无功能影响，属代码风格层面。

---

### OBS-2: `parseInt(req.params.id as string, 10)` 中 `as string` 冗余

**位置**: 第 33、67、93 行

Express `req.params.id` 类型已为 `string`，`as string` 断言冗余。无功能影响。

---

## 三、架构层级分析

### 3.1 分层职责矩阵

| 层级 | 期望职责 | 实际职责 | 评价 |
|------|---------|---------|------|
| 路由层 (app.ts) | 中间件编排 + 路由注册 | auth + role + antiCrawl + rateLimit + 路由 | 合理 |
| Controller 层 | HTTP 协议适配 + 请求调度 | 协议适配 + Zod 验证调度 + 请求分发 | 良好 |
| Schema 层 | 输入验证规则定义 | Zod schema 独立文件 | 良好 |
| Service 层 (接口) | 业务逻辑抽象 | 纯接口定义 | 合理 |
| Service 层 (实现) | 业务逻辑 + 数据访问编排 | 业务逻辑 + Prisma 事务 + 用户校验 | 合理 |
| Map 层 | 数据格式转换 | Prisma camelCase → API snake_case | 合理 |
| Entity 层 | 类型定义 | 接口/类型定义 | 合理 |

### 3.2 数据流图

```
┌─────────────┐
│   HTTP 请求  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ app.ts 中间件链                            │
│ helmet → cors → antiCrawl → rateLimit    │
│ → authMiddleware → roleMiddleware         │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Controller (company.controller.ts)        │
│ 1. parseInt(req.params.id) + isNaN 校验   │
│ 2. Zod safeParse(req.body) 验证           │
│ 3. 构造类型安全 DTO 传入 Service           │
│ 4. success/created/fail 构造响应           │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Service (company.service.impl.ts)         │
│ 1. 业务逻辑编排                            │
│ 2. Prisma 事务管理                        │
│ 3. validateUserIds 校验                   │
│ 4. mapCompany 数据映射                     │
└──────────────────────────────────────────┘
```

### 3.3 依赖关系图

```
company.controller.ts
  ├── import { CompanyServiceImpl } from '../service/impl/...'  ← 具体实现依赖 ⚠️
  ├── import { success, fail, created } from '../utils'        ← 工具函数
  ├── import { CreateCompanyRequest, UpdateCompanyRequest }    ← Entity 类型
  ├── import { createCompanySchema, updateCompanySchema }      ← Zod Schema
  └── import { Request, Response } from 'express'              ← 框架类型
```

**问题**: Controller 依赖箭头指向具体实现类而非接口 `ICompanyService`，违反依赖反转原则。

---

## 四、正面架构发现

1. **Zod schema 外置**: 验证规则定义在独立 `company.schema.ts` 文件中，Controller 仅调用 `safeParse`，关注点分离良好
2. **类型安全 DTO 传递**: Zod 解析后的 `parsed.data` 通过显式类型断言构造 DTO，而非直接传递 `req.body`
3. **`created()` 工具函数**: 资源创建返回 HTTP 201，响应格式通过工具函数统一管理
4. **错误消息常量化**: 7 个常量集中定义，消除魔法字符串
5. **`isNotFoundError()` 封装**: 字符串匹配逻辑收敛为单一函数，调用处语义清晰
6. **`err: unknown` 类型安全**: 所有 catch 块使用 `unknown`，配合 `instanceof Error` 窄化
7. **函数式导出模式**: 独立 async 函数与 Express 路由注册天然契合
8. **ID 解析一致**: `parseInt + isNaN` 模式在 3 个端点中统一执行
9. **toggleCompanyStatus 显式 boolean**: 使用 `status: boolean` 而非 toggle 模式，避免并发竞态
10. **文件规模优秀**: 114 行，5 个函数平均 15-20 行，职责高度清晰

---

## 五、与项目其他 Controller 的对比

| 质量特征 | company.controller (当前) | 项目平均 | 评价 |
|----------|--------------------------|---------|------|
| Zod 验证 | 4/5 端点 (80%) | 大部分已迁移 | toggleStatus 待补 |
| 响应工具函数 | 5/5 统一 (success/created/fail) | 部分统一 | 最佳 |
| catch 类型 | 5/5 使用 `unknown` | 混用 `any`/`unknown` | 最佳 |
| 错误消息常量 | 全部常量化 | 大部分常量化 | 最佳 |
| 代码行数 | 114 行 | 150-250 行 | 最精简 |

**结论**: company.controller.ts 是项目内重构最彻底的 Controller 之一，在验证、响应格式、错误处理、类型安全等方面均达到项目最佳水平。

---

## 六、重构建议路线图

### 第一阶段：短期完善（半天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MINOR-1 | toggleStatus 未使用 Zod | 添加 `toggleStatusSchema` | 验证模式统一 |

### 第二阶段：架构改进（1-2 天，项目级）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-2 | 字符串匹配异常检测 | 引入 NotFoundError 异常基类 | Controller-Service 解耦 |
| MINOR-3 | Create/Update 类型重复 | 使用类型别名 | 消除冗余 |

### 第三阶段：中长期（项目级统一重构）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-1 | 模块级硬编码单例 | 引入工厂模式/DI 容器 | 可测试性 + 可替换性 |
| MINOR-2 | list 无分页 | 预留分页参数 | 接口演进性 |

---

## 七、评审结论

**判定: 通过 — 架构质量优秀，仅剩项目级结构性债务**

该文件经过重构后质量显著提升，从 237 行精简至 114 行，消除了历史评审中指出的全部 HIGH 级问题（响应格式不一致、输入验证薄弱、err.message 泄露、魔法字符串）。当前仅存的两项 ARCH-MAJOR 问题均为**项目级技术债务**（依赖注入缺失、异常体系缺失），非本模块独有问题。

核心评价：

1. **分层职责清晰** — Controller 仅做 HTTP 适配 + 验证调度 + 请求分发，不含业务逻辑
2. **Zod schema 外置** — 验证规则独立管理，可复用、可独立测试
3. **唯一不足**: `toggleCompanyStatus` 未迁移至 Zod 验证模式，是当前唯一需要修复的模块级问题

**建议**: ~~将 MINOR-1（toggleStatus Zod 迁移）纳入下一个迭代~~ **已于 2026-05-26 修复**，其余问题作为项目级统一重构计划处理。

---

## 八、修复记录

### 2026-05-26: MINOR-1 修复 — toggleCompanyStatus Zod 验证迁移

**修改文件**: `apis/controller/company.controller.ts`

**变更内容**:
1. 导入 `toggleCompanyStatusSchema`（schema 已预存在于 `company.schema.ts`）
2. `toggleCompanyStatus` 函数中使用 `safeParse` 验证 `req.body`，替代直接解构 `req.body`
3. 验证失败返回结构化错误消息（`parsed.error.issues.map(e => e.message).join('; ')`）

**验证结果**:
- `pnpm build` ✅
- `pnpm lint` ✅
- company 相关 509 个测试全部通过 ✅

### OBS-2 确认: `as string` 非冗余

经构建验证，Express 类型定义中 `req.params.id` 类型为 `string | string[]`，`as string` 断言为类型安全所需，保留不修改。

---

*软件架构专家评审完成 — 2026-05-24*
