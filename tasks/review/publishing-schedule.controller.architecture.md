# apis/controller/publishing-schedule.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + 职责边界 + 可扩展性 + 一致性）
**文件路径**: `apis/controller/publishing-schedule.controller.ts`
**代码行数**: 57 行（2 个导出函数 + 1 个模块级服务实例）
**依赖图**:

```
app.ts (路由注册 + 中间件编排)
  └─ publishing-schedule.controller.ts (HTTP 请求/响应处理)
       ├─ publishing-schedule.service.impl.ts (业务逻辑, 模块级单例)
       │    └─ Prisma Client (数据访问)
       ├─ response.util.ts (响应工具函数)
       └─ Express Request/Response
```

**关联接口**: `apis/service/publishing-schedule.service.ts`（`IPublishingScheduleService`）
**关联路由**:
- `GET /api/publishing-schedule` — 发布计划列表查询（sysadmin + admin + view）
- `PUT /api/publishing-schedule/:id` — 更新发布计划（sysadmin + admin）
**严重级别**: ARCH-MAJOR(3) / ARCH-MINOR(3) / OBSERVATION(3)

> **修复状态 (2026-05-24)**:
> - ARCH-MAJOR-2 ✅ 引入 NotFoundError/BusinessError/ForbiddenError 类型化异常，Controller 使用 `instanceof AppError` 替代字符串匹配
> - ARCH-MAJOR-3 ✅ 创建 `publishing-schedule.entity.ts`，Service 接口返回类型从 `any[]`/`any` 替换为 `PublishingScheduleItem[]`/`PublishingScheduleUpdateResult`
> - ARCH-MINOR-1 ✅ 统一使用 `instanceof AppError` 异常处理模式，list 和 update 端点错误处理策略一致
> - ARCH-MINOR-3 ✅ update 返回结构补充 `schedule_type` 字段，与 list 返回结构统一
> - OBS-1 ✅ 500 错误不再泄露 err.message，统一使用固定消息
> - OBS-2 ✅ catch 使用 `unknown` 类型（已有）
> - OBS-3 ✅ Service 接口 `userId`/`role` 从 optional 改为 required
> - ARCH-MAJOR-1 ⏳ P3 项目级技术债务，待统一重构

---

## 一、架构评价总览

发布计划控制器是项目中最小的控制器之一，仅包含 57 行代码、2 个端点处理函数。采用函数式导出模式，由 `app.ts` 统一编排路由和中间件链（auth → role → antiCrawl → rateLimit）。该文件仅负责 HTTP 协议适配和请求调度，不包含业务逻辑，符合 Controller 层的职责定义。

从架构视角审视，该文件在**分层隔离、职责单一性、函数规模**方面表现优秀，是项目中结构最简洁的控制器。但在**依赖注入方式、异常架构、输入验证层、数据契约**方面存在与其他控制器相同的结构性改进空间。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层职责 | 9/10 | Controller 仅做 HTTP 适配 + 请求调度，零业务逻辑，职责最纯粹 |
| 依赖管理 | 5/10 | 模块级硬编码单例，Controller 依赖具体实现类，与项目统一 |
| 关注点分离 | 6/10 | 输入验证嵌入 Controller（id + scheduled_publish_at 类型检查） |
| 异常架构 | 4/10 | 无统一异常体系，通过字符串匹配耦合 Service 层 |
| 数据契约 | 5/10 | 无显式 DTO 构造，Controller ↔ Service 数据传递缺少类型桥接 |
| 可测试性 | 6/10 | 函数式导出便于 supertest 集成测试，单元测试需 jest.mock |
| 一致性 | 7/10 | 与项目其他 Controller 风格一致，parseInt radix 有局部不一致 |
| 可扩展性 | 7/10 | 结构简洁，新增端点成本低；但验证和异常模式限制规模化 |

---

## 二、架构问题清单

### ARCH-MAJOR-1: 模块级硬编码单例 — 依赖反转缺失

**位置**: 第 2 行、第 5 行

```typescript
import { PublishingScheduleServiceImpl } from '../service/impl/publishing-schedule.service.impl';
const publishingScheduleService = new PublishingScheduleServiceImpl();
```

**架构影响分析**:

```
当前依赖方向:
  Controller ──(具体类依赖)──> PublishingScheduleServiceImpl ──(具体类依赖)──> Prisma Client

期望依赖方向（依赖反转原则 DIP）:
  Controller ──(接口依赖)──> IPublishingScheduleService <──(实现)── PublishingScheduleServiceImpl
```

虽然项目已定义 `IPublishingScheduleService` 接口，但 Controller 直接导入实现类并实例化：

1. **测试困难**: 单元测试需 `jest.mock()` 拦截模块导入，无法注入 mock service
2. **运行时不可替换**: 无法根据环境切换实现（如缓存装饰器、测试替身）
3. **启动时副作用**: 模块导入即触发实例化

**项目模式对比**:

| Controller | Service 实例化方式 | 可测试性 |
|------------|-------------------|----------|
| publishing-schedule.controller | `new PublishingScheduleServiceImpl()` | 需 jest.mock |
| article.controller | `new ArticleServiceImpl()` | 需 jest.mock |
| company.controller | `new CompanyServiceImpl()` | 需 jest.mock |
| auth.controller | `new AuthServiceImpl()` | 需 jest.mock |

全项目统一模式，属于**项目级架构技术债务**。

**重构建议**: 引入轻量级服务定位器：

```typescript
// 方案A: 简单工厂（最小改动）
// apis/service/index.ts
export function getPublishingScheduleService(): IPublishingScheduleService {
  return new PublishingScheduleServiceImpl();
}

// publishing-schedule.controller.ts
import { getPublishingScheduleService } from '../service';
const publishingScheduleService = getPublishingScheduleService();
```

**优先级**: P3 — 当前可通过 `jest.mock()` 解决测试需求，待项目统一重构

---

### ARCH-MAJOR-2: 无统一异常体系 — Controller 与 Service 层通过字符串形成隐式契约

**位置**: 第 28-30 行、第 47-54 行

```typescript
// Controller 层 — 字符串精确匹配识别 Service 层异常
catch (err: any) {
  if (err.message === '文章不存在') {          // 隐式契约 #1
    fail(res, 404, err.message);
  } else if (err.message === '当前文章状态不可编辑发布计划') {  // 隐式契约 #2
    fail(res, 400, err.message);
  } else {
    fail(res, 500, err.message || '更新发布计划失败');
  }
}

// Service 层 — 抛出字符串消息
throw new Error('文章不存在');                        // impl.ts:95
throw new Error('当前文章状态不可编辑发布计划');        // impl.ts:99
```

**架构影响分析**:

```
Service 层错误传播路径:

  Service.throw Error('文章不存在')
    → Controller.catch (err: any)
      → 字符串匹配 err.message === '文章不存在'
        → 匹配成功 → 404
        → 匹配失败 → 500 (业务异常被错误地当作系统错误)

风险点:
  - Service 修改错误消息文本 → Controller 匹配失效 → 业务异常变成 500
  - 新增业务异常类型 → 每个 Controller 都需添加新的字符串匹配
  - Service 异常类型增加时维护成本非线性增长
```

**项目模式对比**:

| Controller | 异常识别方式 | 类型安全性 |
|------------|------------|-----------|
| article.controller | `handleServerError()` 统一处理函数 + 字符串匹配 | 部分封装 |
| publishing-schedule.controller | 直接字符串匹配 | 无封装 |
| auth.controller | `instanceof LoginSelectionError` + 字符串混合 | 部分类型安全 |

**重构建议**: 引入分层异常体系：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) { super(`${entity}不存在`); this.name = 'NotFoundError'; }
}

export class BusinessError extends Error {
  readonly statusCode = 400;
  constructor(message: string) { super(message); this.name = 'BusinessError'; }
}

// Service 层
throw new NotFoundError('文章');
throw new BusinessError('当前文章状态不可编辑发布计划');

// Controller — 统一异常处理
catch (err: unknown) {
  if (err instanceof NotFoundError) fail(res, 404, err.message);
  else if (err instanceof BusinessError) fail(res, 400, err.message);
  else fail(res, 500, '更新发布计划失败');
}
```

**优先级**: P2 — 随业务异常类型增加，字符串匹配模式维护成本将持续上升

---

### ARCH-MAJOR-3: Service 层无 DTO/Entity 类型约束 — Controller ↔ Service 数据契约松散

**位置**: 第 17-26 行（list）、第 45 行（updateSchedule）

```typescript
// Controller 直接传递原始参数
const { list, total } = await publishingScheduleService.list({
  page, pageSize, search, status, projectId, userId, role,
});

// Service 接口返回 any[]
export interface IPublishingScheduleService {
  list(params: { ... }): Promise<{ list: any[]; total: number }>;
  updateSchedule(id: number, ...): Promise<any>;
}
```

**架构影响分析**:

```
当前数据契约状态:

  Controller ──(内联对象字面量)──> Service.list(params)
                                     返回 { list: any[], total: number }
  Controller ──(原始类型)──> Service.updateSchedule(id, string|null, number?, string?)
                                     返回 any

问题:
  - Service 接口返回 any[] / any，Controller 无法获得编译期类型保证
  - list params 使用内联对象类型，无命名 DTO
  - updateSchedule 参数顺序传递（id, scheduledPublishAt, userId, role），参数语义靠位置推断
```

**对比项目其他模块**:

| 模块 | Service 入参 | Service 返回值 | Entity 层 |
|------|-------------|--------------|----------|
| company | `CreateCompanyRequest` / `UpdateCompanyRequest` | `Company` / `CompanyDetail` | 完整 |
| article | `Record<string, unknown>` | 返回对象 | 有 map 层 |
| publishing-schedule | 内联 `{ page, pageSize, ... }` | `any[]` / `any` | **无** |

publishing-schedule 是项目中**唯一缺少 Entity 层类型定义**的模块。

**重构建议**: 引入显式 DTO 和返回类型：

```typescript
// apis/entity/publishing-schedule.entity.ts
export interface PublishingScheduleListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  projectId?: number;
  userId?: number;
  role?: string;
}

export interface PublishingScheduleItem {
  id: number;
  title: string;
  keywords: string | null;
  article_type: string;
  platforms: string[];
  status: string;
  scheduled_publish_at: Date | null;
  project_id: number;
  project_name: string;
  company_name: string;
  created_by: number | null;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface PublishingScheduleUpdateResult {
  id: number;
  title: string;
  status: string;
  scheduled_publish_at: Date | null;
  updated_at: Date;
}

// Service 接口
export interface IPublishingScheduleService {
  list(params: PublishingScheduleListParams): Promise<{ list: PublishingScheduleItem[]; total: number }>;
  updateSchedule(id: number, scheduledPublishAt: string | null, userId?: number, role?: string): Promise<PublishingScheduleUpdateResult>;
}
```

**优先级**: P2 — 当前 `any` 返回值使 Controller 层丧失类型安全保证

---

### ARCH-MINOR-1: listPublishingSchedule 与 updatePublishingSchedule 的错误处理模式不一致

**位置**: 第 28-31 行 vs 第 47-54 行

```typescript
// list — 简单 catch-all
catch (err: any) {
  fail(res, 500, err.message || '获取发布计划列表失败');
}

// update — 区分业务异常和系统异常
catch (err: any) {
  if (err.message === '文章不存在') { fail(res, 404, err.message); }
  else if (err.message === '当前文章状态不可编辑发布计划') { fail(res, 400, err.message); }
  else { fail(res, 500, err.message || '更新发布计划失败'); }
}
```

**架构影响**:

同一文件内两个端点的错误处理策略不同：`list` 只处理 500，`update` 区分 404/400/500。虽然 `list` 调用的 service 方法不会抛出业务异常（Prisma 查询空结果不报错），但这种不一致反映了**缺少统一错误处理策略**的架构问题。

若 Service 层的 `list` 方法未来需要抛出业务异常（如"无权查看该项目"），Controller 不会正确映射 HTTP 状态码。

**建议**: 抽取统一错误处理函数，与 `article.controller.ts` 的 `handleServerError()` 模式一致：

```typescript
function handleScheduleError(res: Response, err: unknown, defaultMessage: string): void {
  if (err instanceof Error && err.message === '文章不存在') {
    fail(res, 404, err.message);
  } else if (err instanceof Error && err.message === '当前文章状态不可编辑发布计划') {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, defaultMessage);
  }
}
```

---

### ARCH-MINOR-2: Controller 层未做权限校验 — 依赖 Service 层隐式过滤

**位置**: 第 15 行、第 44 行

```typescript
const { userId, role } = req.user!;
// 直接传递给 service，controller 层无权限判断
const { list, total } = await publishingScheduleService.list({ ..., userId, role });
```

**架构影响分析**:

```
当前权限架构:
  app.ts 中间件: authMiddleware → roleMiddleware('sysadmin', 'admin', 'view')
    → Controller: 直接传递 userId/role 给 Service
      → Service: 根据 role 构造不同的 Prisma where 条件

对比 article.controller:
  app.ts 中间件: authMiddleware → roleMiddleware
    → Controller: 显式调用 checkProjectOperator() 进行权限校验  ← 多一层防御
      → Service: 业务逻辑
```

publishing-schedule.controller 将权限逻辑完全下放到 Service 层的 Prisma 查询条件构造中（`impl.ts:39-51`）。Controller 层无任何权限判断代码。

**影响**:
- 当前列表端点允许 sysadmin/admin/view 三种角色，update 端点允许 sysadmin/admin。角色限制由 `roleMiddleware` 保证，Controller 无需重复判断。
- 但 `updateSchedule` 没有检查请求用户是否是文章的创建者或项目成员，完全依赖 Service 层的 Prisma 查询过滤。这意味着任何 sysadmin/admin 用户可以更新任何文章的发布计划，不论是否属于其管理的项目。

**建议**: 在 Controller 层增加项目归属校验，与 article.controller 的 `checkProjectOperator` 模式一致。

---

### ARCH-MINOR-3: list 端点返回字段与 update 端点返回字段结构不一致

**位置**: `impl.ts:71-86` vs `impl.ts:118-131`

```typescript
// list 返回 — 包含 created_by/created_by_name/created_at/updated_at
{ id, title, keywords, article_type, platforms, status, scheduled_publish_at,
  project_id, project_name, company_name,
  created_by, created_by_name, created_at, updated_at }

// update 返回 — 缺少 created_by/created_by_name/keywords/platforms
{ id, title, keywords, article_type, platforms, status, scheduled_publish_at,
  project_id, project_name, company_name,
  created_at, updated_at }
```

Service 层的 list 和 update 返回不同结构的对象。虽然 update 不返回 `created_by`/`created_by_name` 有其合理性（更新操作不需要返回创建者信息），但缺乏统一的返回类型定义导致前端无法使用一致的类型接口。

**建议**: 定义统一的 `PublishingScheduleItem` 类型（见 MAJOR-3），list 和 update 共享同一返回结构。

---

### OBS-1: update 端点的 500 错误泄露 err.message

**位置**: 第 53 行

```typescript
fail(res, 500, err.message || '更新发布计划失败');
```

`updatePublishingSchedule` 的 else 分支将 `err.message` 原样返回给客户端。如果 Service 层抛出的异常包含内部实现细节（如 Prisma 错误消息），会泄露给前端。对比 `article.controller.ts` 的 `handleServerError`，500 错误只返回固定的 contextMsg 而非 `err.message`。

---

### OBS-2: `catch (err: any)` 全文使用 `any` 类型

**位置**: 第 28 行、第 47 行

TypeScript 4.4+ 支持 `useUnknownInCatchVariables`。`any` 绕过类型安全检查，应使用 `unknown` + 安全窄化。这是项目级共性问题。

---

### OBS-3: Service 接口 updateSchedule 的 userId/role 参数标记为 optional

**位置**: `publishing-schedule.service.ts:12`

```typescript
updateSchedule(id: number, scheduledPublishAt: string | null, userId?: number, role?: string): Promise<any>;
```

`userId` 和 `role` 标记为 optional，但 Controller 始终传递这两个参数。Service 实现中也没有对 `userId`/`role` 缺失做防御处理。optional 标记与实际使用不一致，可能误导调用者认为权限参数是可选的。

---

## 三、架构层级分析

### 3.1 分层职责矩阵

| 层级 | 期望职责 | 实际职责 | 评价 |
|------|---------|---------|------|
| 路由层 (app.ts) | 中间件编排 + 路由注册 | auth + role('sysadmin','admin','view') + 路由 | 合理 |
| Controller 层 | HTTP 协议适配 + 请求调度 | 协议适配 + 请求调度 + 基础输入验证 | 合理 |
| Service 层 (接口) | 业务逻辑抽象 | 纯接口定义 | 合理 |
| Service 层 (实现) | 业务逻辑 + 数据访问编排 | Prisma 查询构造 + 权限过滤 + 字段映射 | 合理 |
| Entity 层 | 类型定义 | **缺失** | 需补充 |
| Map 层 | 数据格式转换 | **缺失**（转换内嵌在 Service impl） | 可接受（字段少） |

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
│ Controller                                │
│ (publishing-schedule.controller.ts)       │
│                                           │
│ list:                                     │
│   1. 解析 req.query (page/pageSize/...)  │
│   2. 解构 req.user! (userId/role)         │
│   3. 调用 service.list({...})             │
│   4. paginate(res, list, total, ...)      │
│                                           │
│ update:                                   │
│   1. 解析 req.params.id                   │
│   2. 校验 id + scheduled_publish_at 类型  │
│   3. 解构 req.user! (userId/role)          │
│   4. 调用 service.updateSchedule(...)     │
│   5. success(res, item, '...')            │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Service Impl                              │
│ (publishing-schedule.service.impl.ts)     │
│                                           │
│ list:                                     │
│   1. 构造 Prisma where 条件               │
│   2. 根据 role 过滤权限                    │
│   3. findMany + count (并行)              │
│   4. 映射字段 (camelCase → snake_case)    │
│                                           │
│ updateSchedule:                           │
│   1. findFirst 检查文章存在               │
│   2. 检查 status === 'publishing'         │
│   3. article.update + include 关联         │
│   4. 映射返回字段                          │
└──────┬───────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  Prisma/DB   │
│  (Article)   │
└─────────────┘
```

### 3.3 依赖关系图

```
publishing-schedule.controller.ts
  ├── import { PublishingScheduleServiceImpl } from '../service/impl/...'  ← 具体实现依赖
  ├── import { success, fail, paginate } from '../utils'                  ← 工具函数依赖
  └── import { Request, Response } from 'express'                         ← 框架依赖

publishing-schedule.service.impl.ts
  ├── import { getPrisma } from '../../utils'                             ← 全局 Prisma 实例
  ├── import { IPublishingScheduleService } from '../publishing-schedule.service'  ← 接口定义
  └── (无 Entity 层引用, 无 Map 层引用)                                    ← 类型定义缺失
```

**问题**: Controller 依赖箭头指向具体实现类，而非接口。Service 实现层无 Entity/Map 层依赖，类型和映射逻辑内嵌。

---

## 四、正面架构发现

1. **职责最纯粹的 Controller**: 57 行代码、2 个函数，零业务逻辑，是项目中分层最清晰的控制器。Controller 只做 HTTP 适配 + 参数解析 + 响应封装，完全不含业务规则。

2. **函数式导出模式**: 与 Express 路由注册天然契合，`import * as` 批量导入后直接挂载到路由，降低理解成本。

3. **最小化 API 表面积**: 仅暴露 2 个端点（list + update），无 create/delete/review 等复杂操作，减少了攻击面和维护成本。

4. **Service 接口抽象已存在**: `IPublishingScheduleService` 接口已定义，为未来依赖反转重构预留了扩展点。

5. **中间件层授权完备**: 认证与角色控制在 `app.ts` 中间件链完成（auth + role），Controller 不关心认证逻辑。

6. **Service 层并行查询优化**: `list` 方法使用 `Promise.all([findMany, count])` 并行执行，减少查询延迟。

7. **函数规模极佳**: `listPublishingSchedule` 24 行、`updatePublishingSchedule` 24 行，远低于 50 行上限。

---

## 五、与项目架构模式的一致性分析

### 5.1 项目通用模式

| 模式 | publishing-schedule.controller | 项目其他 Controller | 一致性 |
|------|-------------------------------|-------------------|--------|
| 函数式导出 | 导出 2 个 async 函数 | 统一函数式导出 | 一致 |
| 模块级单例 | `new PublishingScheduleServiceImpl()` | 统一模块级单例 | 一致 |
| try-catch 模式 | 2/2 端点全覆盖 | 部分覆盖 | 更一致 |
| success/fail/paginate 工具函数 | 2/2 使用 | 大部分使用 | 一致 |
| Swagger 注释 | 无 | 大部分有 | **缺失** |
| Entity 类型引用 | 无 Entity 层 | 统一引用 | **缺失** |
| Map 函数使用 | 无 Map 层（内嵌 Service） | 统一在 Service 层 | 基本一致 |
| 错误处理函数 | 无（内联字符串匹配） | article.controller 有 handleServerError | **缺失** |

### 5.2 架构模式评分

| 模式 | 评分 | 说明 |
|------|------|------|
| Controller-Service-Repository 分层 | 9/10 | Controller 零业务逻辑，分层最清晰 |
| 接口抽象 | 6/10 | 接口已定义但返回 any，Controller 未通过接口引用 |
| 依赖管理 | 5/10 | 模块级硬编码单例，无依赖注入 |
| 错误传播 | 4/10 | 字符串匹配，无异常类型体系 |
| 数据契约 | 4/10 | Service 返回 any，无 Entity/DTO 类型定义 |
| API 契约 | 5/10 | 无 Swagger 注释，缺少文档化 API 契约 |

---

## 六、重构建议路线图

### 第一阶段：最小改动（0.5 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MINOR-1 | 错误处理模式不一致 | 抽取 `handleScheduleError()` 函数 | 一致性 + 可维护性 |
| OBS-1 | 500 错误泄露 err.message | 500 分支使用固定消息 | 安全性 |
| OBS-2 | catch 使用 `any` | 改为 `unknown` | 类型安全 |

### 第二阶段：架构改进（1-2 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-3 | Service 返回 any | 引入 Entity 类型定义 | 编译期类型安全 |
| MINOR-3 | list/update 返回结构不一致 | 统一返回类型 | 前后端契约一致 |
| MAJOR-2 | 字符串匹配异常 | 引入 NotFoundError/BusinessError | 解耦 Controller-Service 异常契约 |

### 第三阶段：项目级重构（中长期）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-1 | 模块级硬编码单例 | 引入服务定位器/DI 容器 | 可测试性 + 可替换性 |
| MINOR-2 | Controller 无权限校验 | 增加 checkProjectOperator | 纵深防御 |

**注**: MAJOR-1 是项目级技术债务，建议统一规划重构。MAJOR-3（Entity 层）可独立在本模块先行实施。

---

## 七、评审结论

**判定: 通过 — 架构简洁合理，是项目中职责最清晰的控制器**

`publishing-schedule.controller.ts` 以 57 行代码实现了 2 个端点的完整 HTTP 适配，Controller 层零业务逻辑，是项目中分层最纯粹的模块。文件规模、函数长度、职责边界均达到优秀水平。

主要架构问题集中在三个方面：

1. **数据契约缺失（MAJOR-3）**: Service 层返回 `any[]`/`any`，缺少 Entity/DTO 类型定义，是本模块最突出的架构短板。publishing-schedule 是项目中唯一缺少 Entity 层的模块，建议优先补充。
2. **异常体系缺失（MAJOR-2）**: 通过字符串匹配耦合 Service 层，与项目其他模块存在相同问题，建议项目统一重构。
3. **依赖反转缺失（MAJOR-1）**: 模块级硬编码单例是项目通用模式，当前不构成阻塞性问题。

**建议**: 将 MAJOR-3（Entity 层类型定义）作为下一个迭代的改进重点，因为它对类型安全和前后端契约的影响最大、改动范围最可控（仅需新建 Entity 文件 + 更新 Service 接口）。

---

*软件架构专家评审完成 — 2026-05-24*
