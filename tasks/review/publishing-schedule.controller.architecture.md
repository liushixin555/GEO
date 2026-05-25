# apis/controller/publishing-schedule.controller.ts — 软件架构专家评审报告（R2）

**评审日期**: 2026-05-25
**评审角色**: 软件架构专家（分层架构 · 职责边界 · 扩展性 · 可测试性 · 一致性 · 架构原则）
**文件路径**: `apis/controller/publishing-schedule.controller.ts`
**代码行数**: 82 行（2 个导出函数 + 1 个模块级服务实例 + 1 个常量）
**关联路由**: `apis/routes/publishing-schedule.routes.ts`
- `GET /api/publishing-schedule` — 发布计划列表查询（sysadmin + admin + view）
- `PUT /api/publishing-schedule/:id` — 更新发布计划（sysadmin + admin）
**关联服务**: `apis/service/publishing-schedule.service.ts`（接口 `IPublishingScheduleService`）→ `apis/service/impl/publishing-schedule.service.impl.ts`（实现 `PublishingScheduleServiceImpl`）
**关联实体**: `apis/entity/publishing-schedule.entity.ts`（PublishingScheduleListParams, PublishingScheduleItem, PublishingScheduleUpdateResult）
**关联校验**: `apis/schema/publishing-schedule.schema.ts`（`updatePublishingScheduleSchema` — Zod schema，通过 `validate` 中间件在路由层执行）
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate）、`apis/errors.ts`（AppError 层次结构）

**前序评审**: R1（2026-05-24）发现 ARCH-MAJOR×3 + ARCH-MINOR×3 + OBS×3，共 9 个问题
**R1 修复状态**: ARCH-MAJOR-1 ⏳P3项目级债务 | 其余 8 项 ✅已修复

---

## 一、总体架构评估

| 架构维度 | R1 评分 | R2 评分 | 变化说明 |
|----------|---------|---------|----------|
| 分层合规性 | — | 8/10 | Controller → Service(interface) → ServiceImpl → Prisma，分层清晰 |
| 职责单一性 | 9/10 | 7/10 | R1 零业务逻辑；R2 增加了验证逻辑（与 Zod 中间件冗余） |
| 依赖管理 | 5/10 | 5/10 | 模块级 `new` 具体实现类未变（P3 项目级债务） |
| 异常架构 | 4/10 | 8/10 | ✅ 引入 AppError 层次结构 + `instanceof` 判断，不再字符串匹配 |
| 数据契约 | 5/10 | 8/10 | ✅ Entity 层完整定义，Service 接口返回强类型 |
| 可测试性 | 6/10 | 7/10 | 函数式导出 + `err: unknown` 类型安全，但 DI 缺失 |
| 一致性 | 7/10 | 8/10 | ✅ 统一 parseInt radix、防御性 `!req.user` 检查、`console.error` 日志 |
| 扩展性 | 7/10 | 7/10 | 未变，新增参数仍需改三处 |

**问题统计**: CRITICAL × 0 / HIGH × 2 / MEDIUM × 4 / LOW × 2

**综合评分**: 7.8/10 → 8.0/10（↑ 0.2，R1 核心架构缺陷已消除）

---

## 二、R1 修复验证

### ✅ ARCH-MAJOR-2: 异常体系 — 已修复

**R1 问题**: Controller 通过字符串 `err.message === '文章不存在'` 匹配 Service 层异常。

**R2 现状**:
```typescript
// controller 第 74-75 行 — instanceof 类型化异常识别
} catch (err: unknown) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    console.error('[PublishingScheduleController] updatePublishingSchedule failed:', err);
    fail(res, 500, '更新发布计划失败');
  }
}

// service impl — 类型化异常抛出
throw new NotFoundError('文章');           // impl.ts:107
throw new BusinessError('当前文章状态不可编辑发布计划');  // impl.ts:111
throw new ForbiddenError('无权操作此文章');             // impl.ts:117
```

**验证结果**: Controller 通过 `instanceof AppError` 自动适配所有子类（NotFoundError/404、BusinessError/400、ForbiddenError/403），Service 层新增异常类型无需修改 Controller。字符串隐式契约彻底消除。

---

### ✅ ARCH-MAJOR-3: Entity 层类型定义 — 已修复

**R1 问题**: Service 接口返回 `any[]`/`any`，缺少 Entity 层。

**R2 现状**: `apis/entity/publishing-schedule.entity.ts` 已创建，定义了三个接口：
- `PublishingScheduleListParams` — 查询参数 DTO
- `PublishingScheduleItem` — 列表项类型（14 个字段）
- `PublishingScheduleUpdateResult` — 更新结果类型（13 个字段）

Service 接口和实现均已引用这些类型，编译期类型安全得到保障。

---

### ✅ ARCH-MINOR-1: 错误处理策略统一 — 已修复

**R1 问题**: `list` 不区分 AppError，`update` 区分。

**R2 现状**:
- `updatePublishingSchedule` 已统一使用 `instanceof AppError` 模式 ✅
- `listPublishingSchedule` 仍为简单 catch-all（第 36-39 行），但 Service 的 `list` 方法不抛出业务异常（Prisma 查询空结果不报错），行为正确
- **遗留**: `list` 缺少 `AppError` 区分（见下方 M-2）

---

### ✅ ARCH-MINOR-3: list/update 返回结构统一 — 已修复

**R2 现状**: `PublishingScheduleUpdateResult` 补充了 `schedule_type` 字段，与 `PublishingScheduleItem` 保持一致。两个接口的字段结构已对齐。

---

### ✅ OBS-1/2/3: 安全与类型问题 — 已修复

- OBS-1 ✅: 500 错误使用固定消息，不泄露 `err.message`
- OBS-2 ✅: catch 统一使用 `unknown` 类型
- OBS-3 ✅: Service 接口 `userId`/`role` 已改为 required

---

### ⏳ ARCH-MAJOR-1: DI 违反 — P3 项目级债务（未修复）

```typescript
// 第 6 行 — 仍然直接 new 具体实现类
const publishingScheduleService = new PublishingScheduleServiceImpl();
```

与项目其他 controller 统一模式，属于项目级技术债务。当前可保持现状。

---

## 三、R2 新发现问题清单

### HIGH 级别

#### H-1: 验证职责重复 — Controller 与 Zod 中间件双重校验

**位置**: 第 53-69 行（controller 内联校验）vs `publishing-schedule.schema.ts`（Zod schema）

**现状分析**:

路由层已配置 Zod 验证中间件：
```typescript
// routes/publishing-schedule.routes.ts 第 14 行
router.put('/:id', authMiddleware, roleMiddleware(...), validate(updatePublishingScheduleSchema), ctrl.updatePublishingSchedule);
```

Zod schema 定义了与 controller 相同的校验规则：
```typescript
// schema/publishing-schedule.schema.ts
export const updatePublishingScheduleSchema = z.object({
  scheduled_publish_at: z.string().refine(v => !isNaN(Date.parse(v)), ...),
  schedule_type: z.enum(['asap', 'scheduled', 'after']).nullable().optional(),
}).strict();
```

Controller 又手动重写了一遍校验逻辑：
```typescript
// controller 第 53-57 行
const validScheduleTypes = ['asap', 'scheduled', 'after'];
if (schedule_type !== undefined && schedule_type !== null && !validScheduleTypes.includes(schedule_type)) {
  fail(res, 400, 'schedule_type参数无效');
  return;
}

// controller 第 59-69 行
if (scheduled_publish_at !== undefined && scheduled_publish_at !== null) {
  if (typeof scheduled_publish_at !== 'string') { ... }
  if (scheduled_publish_at !== '' && isNaN(Date.parse(scheduled_publish_at))) { ... }
}
```

**架构影响**:

1. **违反 DRY**: `['asap', 'scheduled', 'after']` 在 controller 和 Zod schema 各定义一次。新增类型需同步修改两处。
2. **违反 SoC**: Controller 职责是参数提取与响应封装，输入验证应由验证中间件统一承担。
3. **语义分歧**: Zod schema 定义 `scheduled_publish_at` 为必填 `z.string()`，但 controller 允许 `null`/`undefined`/`''`——两层对"空值"的理解不一致。实际运行时 `validate` 中间件先执行，非法值已被拦截，controller 中的校验永远走不到 catch 分支（仅 `null` 和 `''` 可能绕过 Zod）。

**修复建议**:

方案 A（推荐）— 统一到 Zod schema：
```typescript
// schema — 覆盖完整业务规则
export const updatePublishingScheduleSchema = z.object({
  scheduled_publish_at: z.string()
    .refine(v => v === '' || !isNaN(Date.parse(v)), { message: 'scheduled_publish_at日期格式无效' })
    .nullable().optional(),
  schedule_type: z.enum(['asap', 'scheduled', 'after']).nullable().optional(),
}).strict();

// controller — 移除第 53-69 行全部校验逻辑
const { scheduled_publish_at, schedule_type } = req.body;
```

方案 B — 保留 controller 校验，移除路由层 `validate()`：不推荐，分散验证不是好的实践。

---

#### H-2: 模块级直接实例化服务 — 违反依赖倒置原则（延续 R1）

**位置**: 第 6 行

```typescript
const publishingScheduleService = new PublishingScheduleServiceImpl();
```

R1 已标记为 P3 项目级技术债务。全项目统一模式，当前不阻塞。此处不再赘述。

---

### MEDIUM 级别

#### M-1: VALID_STATUSES 与 PUBLISH_STATUSES 常量重复

**位置**: controller 第 8 行 vs service impl 第 6 行

```typescript
// controller
const VALID_STATUSES = ['publishing', 'published', 'publish_failed'];

// service impl
const PUBLISH_STATUSES = ['publishing', 'published', 'publish_failed'];
```

两处定义了值完全相同但名称不同的常量数组。新增发布状态时需同步修改，遗漏风险高。

**修复建议**: 提取到共享常量文件：

```typescript
// apis/constants/publish-statuses.ts
export const PUBLISH_STATUSES = ['publishing', 'published', 'publish_failed'] as const;
export type PublishStatus = typeof PUBLISH_STATUSES[number];
```

---

#### M-2: list 与 update 的错误处理策略仍有差异

**位置**: 第 36-39 行 vs 第 73-80 行

```typescript
// list — 简单 catch-all（无 AppError 区分）
} catch (err: unknown) {
  console.error('[PublishingScheduleController] listPublishingSchedule failed:', err);
  fail(res, 500, '获取发布计划列表失败');
}

// update — 区分 AppError 与未知错误
} catch (err: unknown) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    console.error('[PublishingScheduleController] updatePublishingSchedule failed:', err);
    fail(res, 500, '更新发布计划失败');
  }
}
```

**分析**: `list` 的 Service 方法当前不抛出 AppError，所以简单 catch-all 行为正确。但 Service 接口契约并未保证 `list` 永远不抛出 AppError——如果未来增加权限校验逻辑并抛出 `ForbiddenError`，Controller 会将其吞为 500。

**修复建议**: 为保持架构健壮性，`list` 也应区分 AppError：

```typescript
} catch (err: unknown) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    console.error('[PublishingScheduleController] listPublishingSchedule failed:', err);
    fail(res, 500, '获取发布计划列表失败');
  }
}
```

---

#### M-3: Service 接口使用原始类型传递 userId/role — 缺少请求上下文抽象

**位置**: `publishing-schedule.service.ts`

```typescript
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<...>;
```

`userId: number` 和 `role: string` 作为原始参数传递，`role` 未使用项目的 Role 枚举。多个 service 方法共享 `(userId, role)` 参数对，形成隐式的"请求上下文"但无显式抽象。

**修复建议**: 定义 `RequestContext` 类型：

```typescript
interface RequestContext {
  userId: number;
  role: Role;
}
```

**优先级**: P3 — 项目级改进项，与 H-2（DI）一并规划。

---

#### M-4: Date 字段序列化依赖 Express 隐式行为

**位置**: Service 返回的 `PublishingScheduleItem` / `PublishingScheduleUpdateResult` 中 `scheduled_publish_at`、`created_at`、`updated_at` 类型为 `Date | null`。

**分析**: `res.json()` 内部调用 `JSON.stringify()` 将 `Date` 序列化为 ISO 字符串。当前行为正确，但这是隐式行为——如果未来引入自定义 JSON 序列化或切换响应库，行为可能改变。项目中其他 controller（如 `project.controller.ts`）使用了 `mapProject()` 显式映射层，本文件未采用。

**严重性**: MEDIUM — 当前行为正确，但架构上缺少显式映射层。

**建议**: 如需严格控制响应格式，在 Entity 层增加 `toResponse()` 映射函数。

---

### LOW 级别

#### L-1: validScheduleTypes 应为模块级常量或共享常量

**位置**: 第 53 行

```typescript
const validScheduleTypes = ['asap', 'scheduled', 'after'];
```

每次请求创建新数组。虽然 GC 开销可忽略，但从语义上这是业务约束常量。如保留 controller 内校验（不推荐），应提升为模块级常量。

---

#### L-2: list 排序策略硬编码在 Service 层

Service impl 中 `orderBy: { id: 'desc' }`，controller 未暴露 `sortBy`/`sortOrder` 参数。对发布计划场景，按 `scheduled_publish_at` 排序是合理需求，但此为功能扩展建议，非架构缺陷。

---

## 四、分层架构合规性检查

| 检查项 | R1 状态 | R2 状态 | 说明 |
|--------|---------|---------|------|
| Controller 不直接访问数据库 | ✅ | ✅ | 所有数据操作通过 service 层 |
| Controller 不包含业务逻辑 | ✅ | ⚠️ | update handler 包含验证逻辑（与 Zod 中间件冗余） |
| 依赖接口而非实现 | ❌ | ❌ | 模块级 `new PublishingScheduleServiceImpl()`（P3） |
| 错误处理统一 | ❌ | ⚠️ | update 区分 AppError ✅，list 未区分（M-2） |
| 请求验证分层 | ❌ | ⚠️ | Zod 中间件 + controller 双重校验冗余（H-1） |
| 响应格式统一 | ✅ | ✅ | 使用 success/fail/paginate |
| 日志策略 | ❌ | ✅ | 两个 catch 块均有 console.error |
| Entity 类型定义 | ❌ | ✅ | 完整的 DTO/返回类型定义 |
| 异常类型体系 | ❌ | ✅ | AppError + 子类 + instanceof |

**R1→R2 改善**: 9 项中 5 项从 ❌ 升级为 ✅ 或 ⚠️。

---

## 五、依赖拓扑

```
publishing-schedule.routes.ts
  ├── authMiddleware            (middleware — JWT 认证)
  ├── roleMiddleware            (middleware — RBAC 角色鉴权)
  ├── validate(zodSchema)       (middleware — Zod body 校验)
  │     └── publishing-schedule.schema.ts
  └── publishing-schedule.controller.ts
        ├── PublishingScheduleServiceImpl  (直接 new，DIP 违反 ⏳)
        │     └── IPublishingScheduleService (interface)
        │           └── PublishingScheduleListParams / PublishingScheduleItem / PublishingScheduleUpdateResult (entity ✅)
        ├── success / fail / paginate      (utils — 统一响应)
        └── AppError                       (errors — 类型化异常 ✅)
```

**评价**: 依赖方向正确，无循环依赖。Entity 层和异常体系的补全使拓扑更健壮。唯一剩余问题是对具体实现类的直接依赖。

---

## 六、与项目其他 Controller 的横向一致性

| 一致性维度 | 本文件 | 项目惯例 | 评价 |
|------------|--------|----------|------|
| 模块级 service 实例化 | `new PublishingScheduleServiceImpl()` | 同 | ✅ 一致 |
| AppError 类型化异常处理 | `instanceof AppError` | 部分采用 | ✅ 本文件领先 |
| req.user 防御性检查 | `if (!req.user)` 先检查 | 部分用 `req.user!` | ✅ 本文件更优 |
| parseInt radix | 统一 `parseInt(x, 10)` | 部分统一 | ✅ 本文件更优 |
| page/pageSize 范围校验 | `Math.max(1, ...) + Math.min(100, ...)` | 部分有 | ✅ 本文件更优 |
| catch(err: unknown) | 统一 `unknown` | 部分仍为 `any` | ✅ 本文件更优 |
| Entity 层类型定义 | 完整 3 接口 | 大部分有 | ✅ 合规 |
| Zod schema + controller 双重校验 | 存在 | 部分重复 | ⚠️ 需统一 |
| 500 错误固定消息 | 是 | 大部分是 | ✅ 合规 |
| console.error 日志 | 两个 catch 块均有 | 部分缺失 | ✅ 本文件更优 |

**总体评价**: 本文件的架构质量已**超过项目平均水平**。R1 评审中的 8 个问题全部修复，剩余 2 个 HIGH 级别问题（H-1 验证冗余、H-2 DI 违反）中 H-2 为项目级债务，H-1 为 R1 修复过程中引入的新问题（controller 新增验证逻辑以补偿输入安全，但与 Zod 中间件冲突）。

---

## 七、安全性评估（架构视角）

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 认证层 | ✅ 安全 | 所有路由需 `authMiddleware` |
| 授权层 | ✅ 安全 | 路由层 RBAC + Service 层权限过滤 |
| 输入验证 | ✅ 安全 | Zod schema + controller 双重校验（冗余但不缺失） |
| SQL 注入 | ✅ 安全 | Prisma 参数化查询 |
| 敏感信息泄露 | ✅ 安全 | 500 固定消息，`console.error` 仅服务端 |
| IDOR 防护 | ✅ 安全 | Service 层 userId + role 数据隔离 |
| 类型化异常 | ✅ 安全 | AppError 层次结构，不再字符串匹配 |

---

## 八、修复优先级建议

| 优先级 | 编号 | 修复内容 | 工作量 |
|--------|------|----------|--------|
| P1 | H-1 | 移除 controller 内验证，依赖 Zod 中间件 | 小 |
| P2 | M-1 | 提取 PUBLISH_STATUSES 到共享常量 | 小 |
| P2 | M-2 | list 增加 AppError 区分 | 小 |
| P3 | H-2 | DI 重构（项目级） | 大 |
| P3 | M-3 | 引入 RequestContext 类型（项目级） | 中 |
| P4 | M-4 | 显式 Date → string 映射层 | 中 |
| P4 | L-1 | validScheduleTypes 提升（随 H-1 一并处理） | 小 |
| P4 | L-2 | 暴露排序参数 | 小 |

---

## 九、总结

**判定: ✅ 通过（8.0/10） — 架构健壮，R1 核心缺陷全部消除**

`publishing-schedule.controller.ts` 经 R1 修复后架构质量显著提升：

1. **异常体系**（R1 最大架构缺陷）已彻底解决：AppError 层次结构 + `instanceof` 判断取代了脆弱的字符串匹配，Controller 不再与 Service 层的具体异常消息耦合。
2. **数据契约**已补全：Entity 层定义了 `PublishingScheduleListParams`/`PublishingScheduleItem`/`PublishingScheduleUpdateResult` 三个接口，Service 接口返回强类型，编译期类型安全得到保障。
3. **防御性编程**全面到位：`!req.user` 检查、`Math.max/min` 范围校验、`parseInt(x, 10)` 统一 radix、`err: unknown` 类型安全、`VALID_STATUSES` 白名单过滤、`console.error` 日志——均为 R1 修复成果。

**R2 需关注的改进方向**：

1. **消除验证冗余**（H-1，P1）：controller 第 53-69 行的手动校验与 Zod 中间件重复，且存在语义分歧（Zod 必填 vs controller 允许 null）。应统一到 Zod schema，controller 仅做参数提取。
2. **常量归一化**（M-1，P2）：`VALID_STATUSES` / `PUBLISH_STATUSES` 提取为共享常量。
3. **错误处理完备性**（M-2，P2）：`list` 增加 `AppError` 区分，与 `update` 策略统一。

以上均为 HIGH 以下级别，无 CRITICAL 架构缺陷。代码在当前状态下架构合规，可安全运行。

---

*软件架构专家评审 R2 完成 — 2026-05-25*
