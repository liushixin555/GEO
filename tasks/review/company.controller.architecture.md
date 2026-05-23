# apis/controller/company.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + 职责边界 + 可扩展性 + 一致性）
**文件路径**: `apis/controller/company.controller.ts`
**代码行数**: 237 行
**依赖图**:

```
app.ts (路由注册 + 中间件编排)
  └─ company.controller.ts (HTTP 请求/响应处理)
       ├─ company.service.impl.ts (业务逻辑, 模块级单例)
       │    └─ Prisma Client (数据访问)
       ├─ response.util.ts (响应工具函数)
       └─ Express Request/Response
```

**关联实体**: `entity/company.entity.ts` (Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail)
**关联映射**: `map/index.ts` (mapCompany: Prisma camelCase → API snake_case)
**严重级别**: ARCH-MAJOR(3) / ARCH-MINOR(4) / OBSERVATION(3)

---

## 一、架构评价总览

公司管理控制器是项目中结构最简洁的模块之一，采用函数式导出模式（非 Class Controller），由 `app.ts` 统一编排路由和中间件。该文件仅负责 HTTP 协议适配和请求调度，不包含业务逻辑，符合 Controller 层的职责定义。

从架构视角审视，该文件在**分层隔离、依赖方向、职责单一性**方面表现良好，但在**依赖注入方式、关注点分离、异常架构、横切关注点**方面存在结构性改进空间。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层职责 | 8/10 | Controller 仅做 HTTP 适配，不含业务逻辑，职责清晰 |
| 依赖管理 | 5/10 | 模块级硬编码单例，无法替换实现，测试需 mock 模块 |
| 关注点分离 | 5/10 | 输入验证逻辑内嵌 Controller，应抽至中间件或验证层 |
| 异常架构 | 4/10 | 无统一异常体系，通过字符串匹配耦合 Service 层 |
| 可测试性 | 5/10 | 函数式导出便于 supertest 集成测试，但单元测试需 jest.mock |
| 一致性 | 6/10 | 5 个端点中 1 个响应格式不一致、1 个缺 Swagger 文档 |
| 可扩展性 | 7/10 | 函数式结构简洁，新增端点成本低；但验证逻辑重复限制规模化 |

---

## 二、架构问题清单

### ARCH-MAJOR-1: 模块级硬编码单例 — 依赖反转缺失，无法运行时替换

**位置**: 第 2 行、第 5 行

```typescript
import { CompanyServiceImpl } from '../service/impl/company.service.impl';
const companyService = new CompanyServiceImpl();  // 模块加载时立即实例化
```

**架构影响分析**:

```
当前依赖方向:
  Controller ──(具体类依赖)──> CompanyServiceImpl ──(具体类依赖)──> Prisma Client

期望依赖方向（依赖反转原则 DIP）:
  Controller ──(接口依赖)──> ICompanyService <──(实现)── CompanyServiceImpl
```

虽然项目已定义 `ICompanyService` 接口（`company.service.ts`），但 Controller 直接导入实现类 `CompanyServiceImpl` 并在模块顶层实例化。这导致：

1. **测试困难**: 单元测试无法注入 mock service，必须使用 `jest.mock()` 拦截模块导入
2. **运行时不可替换**: 无法根据配置切换实现（如切换到缓存装饰器代理）
3. **启动时副作用**: 模块导入即触发 `new CompanyServiceImpl()`，若构造函数有副作用则不可控

**项目模式对比**:

| Controller | Service 实例化方式 | 可测试性 |
|------------|-------------------|----------|
| company.controller | `new CompanyServiceImpl()` 模块顶层 | 需 jest.mock |
| auth.controller | `new AuthServiceImpl()` 模块顶层 | 需 jest.mock |
| project.controller | 同上 | 同上 |

项目内所有 Controller 采用统一模式，这是**架构级技术债务**，需项目级统一重构。

**重构建议**: 引入轻量级服务定位器或工厂模式：

```typescript
// 方案A: 简单工厂（最小改动）
// apis/service/index.ts
export function getCompanyService(): ICompanyService {
  return new CompanyServiceImpl();
}

// company.controller.ts
import { getCompanyService } from '../service';
const companyService = getCompanyService();

// 方案B: 依赖注入容器（适合项目规模化）
// 生产环境: 容器注册 CompanyServiceImpl
// 测试环境: 容器注册 MockCompanyService
```

**优先级**: P3 — 当前可通过 `jest.mock()` 解决测试需求，待项目规模扩大后统一重构

---

### ARCH-MAJOR-2: 无统一异常体系 — Controller 与 Service 层通过字符串形成隐式契约

**位置**: 第 58 行、第 206 行、第 231 行

```typescript
// Controller 层 — 通过字符串精确匹配识别 Service 层异常
catch (err: any) {
  if (err.message === '公司不存在') {  // 隐式契约
    fail(res, 404, err.message);
  }
}

// Service 层 — 抛出字符串消息
throw new Error('公司不存在');  // company.service.impl.ts:119
```

**架构影响分析**:

```
Service 层错误传播路径:

  Service.throw Error('公司不存在')
    → Controller.catch (err: any)
      → 字符串匹配 err.message === '公司不存在'
        → 匹配成功 → 404
        → 匹配失败 → 500 (业务异常被错误地当作系统错误)

风险点:
  - Service 修改错误消息文本 → Controller 匹配失效 → 业务异常变成 500
  - 新增业务异常类型 → 每个 Controller 都需添加新的字符串匹配
  - Prisma 异常 (如 RecordNotFound) → 无法被识别 → 500
```

**项目模式对比**:

| Controller | 异常识别方式 | 类型安全性 |
|------------|------------|-----------|
| auth.controller | `instanceof LoginSelectionError` + 字符串匹配 | 部分类型安全 |
| company.controller | 纯字符串匹配 | 无类型安全 |
| project.controller | 字符串匹配 | 无类型安全 |

`auth.controller.ts` 使用了 `instanceof` 检测自定义异常类，是更优的模式。

**重构建议**: 引入分层异常体系（最小化方案）：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) { super(`${entity}不存在`); this.name = 'NotFoundError'; }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

// Controller — 统一异常处理
catch (err: unknown) {
  if (err instanceof NotFoundError) fail(res, 404, err.message);
  else if (err instanceof ValidationError) fail(res, 400, err.message);
  else fail(res, 500, '操作失败');
}
```

或更进一步，在 `app.ts` 的全局错误处理中间件中统一拦截：

```typescript
// app.ts 全局错误处理器已有基础框架（第 234 行）
// 扩展为识别自定义异常类型:
app.use((err: Error, _req, res, _next) => {
  if (err instanceof NotFoundError) return res.status(404).json({ code: 404, message: err.message });
  if (err instanceof ValidationError) return res.status(400).json({ code: 400, message: err.message });
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

**优先级**: P2 — 随业务异常类型增加，当前模式维护成本将持续上升

---

### ARCH-MAJOR-3: 输入验证嵌入 Controller 层 — 跨层关注点应上移至中间件

**位置**: 第 113-123 行、第 191-200 行、第 222-225 行

```typescript
// 验证逻辑直接写在 Controller 函数体内
export async function createCompany(req: Request, res: Response): Promise<void> {
  try {
    const { short_name, full_name, contact_person, contact_phone, operator_ids } = req.body;
    if (!short_name || !full_name || !contact_person || !contact_phone) { ... }
    if (!Array.isArray(operator_ids) || operator_ids.length === 0) { ... }
    // 业务调用
  }
}
```

**架构影响分析**:

```
当前架构分层:
  HTTP 请求
    → 中间件链 (auth, role, anti-crawl, rate-limit)
    → Controller (输入验证 + HTTP 适配 + 业务调度) ← 验证在此
    → Service (业务逻辑)
    → Prisma (数据访问)

推荐架构分层:
  HTTP 请求
    → 中间件链 (auth, role, anti-crawl, rate-limit)
    → 验证中间件 (schema validation) ← 验证应在此
    → Controller (纯 HTTP 适配 + 业务调度)
    → Service (业务逻辑)
    → Prisma (数据访问)
```

将验证逻辑嵌入 Controller 导致：

1. **职责膨胀**: Controller 承担了 HTTP 适配 + 输入验证两个职责
2. **验证逻辑重复**: createCompany 和 updateCompany 的验证代码完全相同（第 113-123 行 vs 第 191-200 行）
3. **无法复用**: 若其他端点（如导入公司）需要相同验证，必须复制代码
4. **测试复杂度**: 验证逻辑与 Controller 函数耦合，需通过 HTTP 请求测试验证

**项目模式对比**:

| 项目模块 | 验证方式 | 可复用性 |
|----------|---------|---------|
| company.controller | 内嵌 truthy 检查 | 不可复用 |
| auth.controller | 内嵌 truthy 检查 | 不可复用 |
| 所有 Controller | 统一内嵌 | 项目级模式 |

**重构建议**: 引入 Zod 验证中间件：

```typescript
// apis/middleware/validate.ts
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ code: 400, message: result.error.issues[0].message });
    }
    req.body = result.data;  // 替换为验证后的数据
    next();
  };
}

// apis/validator/company.validator.ts
export const createCompanySchema = z.object({
  short_name: z.string().min(1).max(50),
  full_name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  contact_person: z.string().min(1).max(50),
  contact_phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  operator_ids: z.array(z.number().int().positive()).min(1),
  viewer_ids: z.array(z.number().int().positive()).optional(),
});

// app.ts — 路由注册
app.post('/api/companies', authMiddleware, roleMiddleware('sysadmin'),
  validate(createCompanySchema), companyController.createCompany);
```

**优先级**: P2 — 当前验证可工作但维护成本高，建议与 Zod 引入同步重构

---

### ARCH-MINOR-1: createCompany 响应格式与其他端点不一致 — 违反统一响应契约

**位置**: 第 126 行

```typescript
// createCompany — 手动构造 201 响应
res.status(201).json({ code: 0, message: '创建公司成功', data: company });

// 其他 4 个端点 — 使用 success() 工具函数
success(res, company, '更新公司成功');
// → res.json({ code: 0, message: '更新公司成功', data: company })  // HTTP 200
```

**架构影响**: 项目有两个响应工具函数 `success()` 和 `fail()`，但 `success()` 不支持自定义 HTTP 状态码（固定 200）。当需要返回 201 时，Controller 被迫手动构造响应体，导致：

1. 响应信封格式（`{ code, message, data }`）由调用者和工具函数分别维护
2. 若响应格式变更（如添加 `timestamp`），手动构造处不会同步更新

**建议**: 扩展 `response.util.ts`，添加 `created()` 函数：

```typescript
export function created<T>(res: Response, data: T, message = '创建成功') {
  return res.status(201).json({ code: 0, message, data });
}
```

---

### ARCH-MINOR-2: Controller 层将整个 req.body 传入 Service — 缺少显式 DTO 构造

**位置**: 第 125 行、第 203 行

```typescript
const company = await companyService.create(req.body);         // req.body 整体传入
const company = await companyService.update(id, req.body);     // 同上
```

**架构影响**:

虽然 Service 层的 `create()` 和 `update()` 方法通过显式字段赋值避免了批量赋值风险，但 Controller → Service 的数据传递缺少显式 DTO 构造步骤：

```
当前数据流:
  req.body (any) → Service.create(request: CreateCompanyRequest)
  TypeScript 类型仅在编译时检查，运行时 req.body 可包含任意字段

推荐数据流:
  req.body (any) → Controller 显式构造 DTO → Service.create(dto: CreateCompanyRequest)
```

Controller 在第 113 行已解构了 `short_name, full_name, contact_person, contact_phone, operator_ids`，但未用这些解构值构造类型安全的 DTO 传入 Service，而是直接传递 `req.body`。

**建议**: 显式构造请求对象：

```typescript
const request: CreateCompanyRequest = {
  short_name, full_name,
  address: req.body.address,
  contact_person, contact_phone,
  operator_ids,
  viewer_ids: req.body.viewer_ids,
};
const company = await companyService.create(request);
```

---

### ARCH-MINOR-3: toggleCompanyStatus 缺少 Swagger 文档 — API 契约不完整

**位置**: 第 214-237 行

5 个端点中 4 个有完整的 Swagger 注释（路径、参数、请求体、响应码），但 `toggleCompanyStatus` 完全缺少 API 文档。

**架构影响**: Swagger 注释是本项目 API 契约的事实标准。缺失文档导致：

1. Swagger UI 中该端点不可见，前端开发者无法自助查询
2. API 契约覆盖率从 100% 降至 80%
3. 与其他端点的文档标准不一致

---

### ARCH-MINOR-4: listCompanies 无分页 — 缺少可演进的查询接口设计

**位置**: 第 19-26 行

```typescript
export async function listCompanies(_req: Request, res: Response): Promise<void> {
  const companies = await companyService.list();  // 返回全部记录
  success(res, companies, '获取公司列表成功');
}
```

**架构影响**: Service 接口 `list(): Promise<Company[]>` 无分页参数，若未来需要分页，需修改接口签名并影响所有调用者。当前作为内部管理系统且公司数量有限，影响可控，但接口设计不具备演进性。

**建议**: 预留分页参数但不强制要求：

```typescript
list(options?: { page?: number; pageSize?: number }): Promise<Company[] | PaginatedResult<Company>>;
```

---

### OBS-1: `catch (err: any)` 全文使用 `any` 类型 — 应使用 `unknown`

**位置**: 第 23、57、127、205、230 行

TypeScript 4.4+ 支持 `useUnknownInCatchVariables` 编译选项。`any` 绕过类型安全检查，`unknown` 强制窄化后才能访问属性。这是 TypeScript 最佳实践问题，非架构级问题。

---

### OBS-2: 错误消息魔法字符串分散

**位置**: 第 52、58、116、121、128、194、199、209、218、224、234 行

`'无效的公司ID'`（2 处）、`'公司名短名...'`（2 处）、`'运营者不能为空'`（2 处）等字符串在文件中重复出现。建议提取为常量，但这是代码组织问题而非架构缺陷。

---

### OBS-3: `parseInt(req.params.id as string, 10)` 中 `as string` 冗余

**位置**: 第 50、185、216 行

Express 的 `req.params.id` 类型已为 `string`，`as string` 断言冗余。无功能影响。

---

## 三、架构层级分析

### 3.1 分层职责矩阵

| 层级 | 期望职责 | 实际职责 | 评价 |
|------|---------|---------|------|
| 路由层 (app.ts) | 中间件编排 + 路由注册 | auth + role + antiCrawl + rateLimit + 路由 | 合理 |
| Controller 层 | HTTP 协议适配 + 请求调度 | 协议适配 + 请求调度 + 输入验证 | 验证应上移 |
| Service 层 (接口) | 业务逻辑抽象 | 纯接口定义 | 合理 |
| Service 层 (实现) | 业务逻辑 + 数据访问编排 | 业务逻辑 + Prisma 调用 + 事务管理 | 合理 |
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
│ 1. 解析 req.params / req.body             │
│ 2. 输入验证 (truthy + isArray)            │
│ 3. 调用 Service 方法                      │
│ 4. 构造 HTTP 响应                          │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Service (company.service.impl.ts)         │
│ 1. 业务逻辑编排                            │
│ 2. Prisma 事务管理                        │
│ 3. 返回 Entity 对象                        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Map (map/index.ts)                        │
│ Prisma camelCase → API snake_case         │
│ (在 Service 内调用，非独立层)              │
└──────┬───────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  Prisma/DB   │
└─────────────┘
```

### 3.3 依赖关系图

```
company.controller.ts
  ├── import { CompanyServiceImpl } from '../service/impl/company.service.impl'  ← 具体实现依赖
  ├── import { success, fail } from '../utils'                                   ← 工具函数依赖
  └── import { Request, Response } from 'express'                                ← 框架依赖

company.service.impl.ts
  ├── import { getPrisma } from '../../utils'                                    ← 全局 Prisma 实例
  ├── import { Company, CreateCompanyRequest, ... } from '../../entity'          ← 实体类型
  ├── import { mapCompany } from '../../map'                                     ← 映射函数
  └── import { ICompanyService } from '../company.service'                       ← 接口定义
```

**问题**: Controller 依赖箭头指向具体实现类（`CompanyServiceImpl`），而非接口（`ICompanyService`）。依赖反转原则要求高层模块依赖抽象。

---

## 四、正面架构发现（做得好的方面）

1. **函数式导出模式**: 导出独立的 async 函数而非 Class 方法，与 Express 路由注册模式天然契合，降低理解成本
2. **Service 接口抽象**: 虽然 Controller 未通过接口引用，但 `ICompanyService` 接口已定义，为未来重构预留了扩展点
3. **Map 层隔离**: Prisma 数据模型与 API 响应格式之间的转换通过 `mapCompany()` 统一处理，Controller 不直接操作 Prisma 数据结构
4. **Entity 层类型定义**: `CreateCompanyRequest`、`UpdateCompanyRequest`、`CompanyDetail` 类型定义完备，Controller ↔ Service 的数据契约明确
5. **中间件层授权**: 认证与授权完全在 `app.ts` 中间件链完成，Controller 不关心权限逻辑
6. **ID 解析一致**: `parseInt + isNaN` 模式在所有使用 path param 的端点中统一执行
7. **Service 层事务管理**: `create` 和 `update` 使用 `prisma.$transaction` 保证公司创建与用户关联的原子性
8. **文件规模合理**: 237 行，5 个函数平均 20-30 行，职责清晰

---

## 五、与项目架构模式的一致性分析

### 5.1 项目通用模式

| 模式 | company.controller | 项目其他 Controller | 一致性 |
|------|-------------------|-------------------|--------|
| 函数式导出 | 导出 5 个 async 函数 | 统一函数式导出 | 一致 |
| 模块级单例 | `new CompanyServiceImpl()` | 统一模块级单例 | 一致 |
| try-catch 模式 | 5/5 端点全覆盖 | 部分覆盖 | company 更一致 |
| success/fail 工具函数 | 4/5 使用 success() | 大部分使用 | 基本一致 |
| Swagger 注释 | 4/5 (80%) | 大部分 100% | 略低 |
| Entity 类型引用 | 完整引用 | 统一引用 | 一致 |
| Map 函数使用 | Service 层调用 | 统一在 Service 层 | 一致 |

### 5.2 架构模式评分

| 模式 | 评分 | 说明 |
|------|------|------|
| Controller-Service-Repository 分层 | 8/10 | 分层清晰，但验证逻辑未从 Controller 分离 |
| 接口抽象 | 6/10 | 接口已定义但未被 Controller 引用 |
| 依赖管理 | 5/10 | 模块级硬编码单例，无依赖注入 |
| 错误传播 | 4/10 | 字符串匹配，无异常类型体系 |
| API 契约 | 7/10 | Swagger 覆盖率高，响应格式基本一致 |

---

## 六、重构建议路线图

### 第一阶段：最小改动（1-2 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MINOR-1 | createCompany 响应格式不一致 | 添加 `created()` 工具函数 | 统一响应契约 |
| MINOR-3 | toggleCompanyStatus 缺 Swagger | 补全 Swagger 注释 | API 契约完整性 |
| OBS-1 | catch 使用 `any` | 改为 `unknown` | 类型安全 |

### 第二阶段：架构改进（3-5 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-2 | 无统一异常体系 | 引入 NotFoundError/ValidationError | 解耦 Controller-Service 异常契约 |
| MAJOR-3 | 验证嵌入 Controller | 引入 Zod 验证中间件 | 关注点分离 + DRY |
| MINOR-2 | req.body 整体传入 | 显式 DTO 构造 | 类型安全 + 防批量赋值 |

### 第三阶段：项目级重构（中长期）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-1 | 模块级硬编码单例 | 引入服务定位器/DI 容器 | 可测试性 + 可替换性 |
| MINOR-4 | list 无分页 | 预留分页参数 | 接口演进性 |

**注**: MAJOR-1 和 MAJOR-2 是项目级技术债务，建议统一规划而非单模块重构。

---

## 七、评审结论

**判定: 通过 — 架构基本合理，存在可改进的结构性问题**

该文件在分层职责和代码组织方面达到了项目标准，Controller 层正确地只做 HTTP 适配和请求调度。主要的架构问题集中在三个方面：

1. **依赖注入缺失（MAJOR-1）**: 模块级硬编码单例是项目通用模式，当前不构成阻塞性问题，但随着测试覆盖率和模块复杂度增加，将成为维护瓶颈
2. **异常体系缺失（MAJOR-2）**: 通过字符串匹配耦合 Service 层是最紧迫的架构问题，随业务异常类型增加，维护成本将非线性增长
3. **验证层缺失（MAJOR-3）**: 输入验证嵌入 Controller 导致验证逻辑重复、无法复用

**建议**: 将 MAJOR-2（异常体系）作为下一个迭代的架构改进重点，因为它对代码可维护性的影响最大、改动范围最可控。MAJOR-1（依赖注入）可推迟至项目需要引入 DI 容器时统一重构。

---

*软件架构专家评审完成 — 2026-05-24*
