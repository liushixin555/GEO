# dist/apis/apis/service/article.service.d.ts — 代码安全专家评审

**评审日期**: 2026-05-26
**评审角色**: 代码安全专家（认证授权 · 输入验证 · 注入攻击 · 信息泄露 · 权限提升 · 数据边界）
**文件路径**: `dist/apis/apis/service/article.service.d.ts`（源文件 `apis/service/article.service.ts`）
**代码行数**: 32 行（2 个 exported interface：AuthContext、IArticleService）
**关联文件**: `apis/controller/article.controller.ts`, `apis/service/impl/article.service.impl.ts`, `apis/entity/article.entity.ts`, `apis/entity/publishing-schedule.entity.ts`, `apis/routes/article.routes.ts`, `apis/schema/article.schema.ts`, `apis/utils/sanitize-markdown.util.ts`, `apis/constants/roles.ts`

---

## 一、评审范围

`article.service.d.ts` 定义了文章服务模块的两个核心 TypeScript 接口：`AuthContext`（认证上下文）和 `IArticleService`（服务契约，含 14 个方法）。

作为服务层接口定义，本文件是**安全契约的核心枢纽** — 控制器层通过此接口调用服务，实现层必须满足此契约。接口签名中的安全缺陷将：
1. 迫使安全校验下沉到实现层，增加遗漏风险
2. 允许绕过类型系统的非法调用
3. 阻碍编译器在编译期捕获安全问题

本次评审覆盖以下安全维度：

| 维度 | 关注点 |
|------|--------|
| 认证授权 | AuthContext 类型安全、方法级 auth 一致性 |
| 权限提升 | role 类型约束、项目归属边界 |
| 信息泄露 | IDOR（跨项目数据访问）、敏感数据暴露 |
| 输入验证 | 参数边界、类型约束、注入防护 |
| 接口安全 | ISP 违反、auth 模式一致性、攻击面 |
| 数据边界 | projectId 缺失、跨域操作 |

---

## 二、安全问题清单

### CRITICAL 级别

#### C-1: `getById` 与 `listVersions` 缺少 `projectId` 参数 — IDOR 跨项目数据访问

**位置**: `IArticleService` 第 13 行 `getById(id: number)`、第 20 行 `listVersions(articleId: number)`

**问题描述**: 两个方法仅接受 `id`/`articleId`，无 `projectId` 参数，接口层面无法表达项目归属约束。

```typescript
// 当前签名 — 无项目边界
getById(id: number): Promise<Article>;
listVersions(articleId: number): Promise<ArticleVersion[]>;

// 应为 — 强制项目边界
getById(projectId: number, id: number): Promise<Article>;
listVersions(projectId: number, articleId: number): Promise<ArticleVersion[]>;
```

**安全影响链**:

1. **控制器层事后补偿**：`article.controller.ts:100-105` 在 `getArticle` 中调用 `getById(ctx.articleId!)` 后再比较 `item.project_id !== ctx.projectId`，但这是 TOCTOU 竞态 — 并发请求可能在检查与删除之间改变文章归属
2. **控制器双重查询**：`article.controller.ts:149-153` 的 `listArticleVersions` 先调用 `getById` 再调 `listVersions`，两次独立查询无事务保护
3. **接口语义欺骗**：接口签名暗示"只需 ID 即可访问"，消费者无法从签名推断需要项目边界检查
4. **实现层无法防御**：`article.service.impl.ts:90-93` 的 `getById` 实现仅 `findFirst({ where: { id, deletedAt: null } })`，无 projectId 过滤

**修复**: 签名改为 `getById(projectId: number, id: number)` 和 `listVersions(projectId: number, articleId: number)`，实现层在 `findFirst` 中同时过滤 `projectId`。

---

#### C-2: `list()` 的 `auth?: AuthContext` 为可选参数 — 未认证数据泄露

**位置**: `IArticleService` 第 11 行

```typescript
list(projectId: number, page: number, pageSize: number, search?: string, status?: string, auth?: AuthContext)
```

**问题描述**: `auth` 参数为可选（`?`），实现层在 `article.service.impl.ts:73` 用 `if (auth?.role === 'admin')` 条件判断 — 当 `auth` 为 `undefined` 时，权限过滤逻辑完全跳过。

**安全影响链**:

1. **无认证调用路径**：任何调用者（如内部调度器、测试代码）可直接 `list(projectId, 1, 10)` 获取全量文章数据，无任何权限过滤
2. **admin 过滤绕过**：`where.project = { operators: { some: { userId: auth.userId } } }` 仅在 `auth?.role === 'admin'` 时生效。`auth` 为空或 `role` 为其他值时，返回目标项目的所有文章（包含其他运营商的文章）
3. **view 角色遗漏**：接口无 `role === 'view'` 的过滤逻辑，view 角色若通过此方法查询可看到全部文章

**修复**: 将 `auth` 改为必填参数 `auth: AuthContext`；实现层补充 view 角色过滤逻辑。若确实需要内部无认证调用，应拆分为 `listForInternal()` 方法并添加 `@internal` 注释。

---

#### C-3: `AuthContext.role: string` 类型过宽 — 角色注入风险

**位置**: `AuthContext` 接口第 7 行

```typescript
export interface AuthContext {
  userId: number;
  role: string;  // ← 应为 Role 联合类型
}
```

**问题描述**: `role` 类型为 `string`，TypeScript 编译器允许传入任意字符串。项目中已定义 `Role` 类型（`apis/constants/roles.ts:10`）和 `ROLES` 常量（`'sysadmin' | 'admin' | 'view'`）。

**安全影响链**:

1. **权限检查绕过**：`article.service.impl.ts:55` 的 `checkCreatorOrAdmin` 仅检查 `auth.role !== 'sysadmin'` — 传入 `role: 'superadmin'` 或 `role: ''` 都会走 creator 分支
2. **updateSchedule 权限绕过**：`article.service.impl.ts:466` 的 `if (role !== 'sysadmin')` 同样基于字符串比较，任意非 `'sysadmin'` 值都会走 admin 权限分支
3. **listPublishingSchedule 提权**：`article.service.impl.ts:393-405` 中 `role === 'admin'` 和 `role === 'view'` 的 if-else 链，传入未知角色会跳过所有过滤
4. **与 ROLES 常量断裂**：`article.routes.ts:11` 使用 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 严格限制路由层角色，但 service 接口层面类型不匹配

**修复**: 将 `role` 改为 `role: Role`，导入 `Role` 类型（`import type { Role } from '../constants/roles'`）。

---

### HIGH 级别

#### H-1: `updateSchedule` 解构 `AuthContext` — 认证模式不一致

**位置**: `IArticleService` 第 24 行

```typescript
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<PublishingScheduleUpdateResult>;
```

**问题描述**: 此方法将 `userId` 和 `role` 作为独立参数传入，违反了 `AuthContext` 统一认证上下文的设计意图。其他所有方法（create、update、delete、review 等）均使用 `auth: AuthContext`。

**安全影响**:

1. **调用者可伪造身份**：`userId: 999, role: 'sysadmin'` 可以独立传入，不受 `AuthContext` 构造约束
2. **双重 `role: string` 问题**：此处的 `role` 也为 `string` 类型，同样存在角色注入风险
3. **接口消费者混乱**：同一接口中两种认证传递模式增加误用概率

**修复**: 改为 `updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, auth: AuthContext)`。

---

#### H-2: `page`/`pageSize`/`id` 参数无类型级边界约束 — DoS/溢出风险

**位置**: 多处方法签名

```typescript
list(projectId: number, page: number, pageSize: number, ...)
getById(id: number): Promise<Article>;
```

**问题描述**: 所有数值参数均为 `number` 类型，无编译期边界保护。

| 参数 | 当前类型 | 风险值 | 后果 |
|------|----------|--------|------|
| `page` | `number` | `-1`、`0`、`1.5`、`Infinity` | 负偏移/浮点偏移导致意外查询 |
| `pageSize` | `number` | `100000`、`-1` | 大量数据加载（DoS）或异常查询 |
| `id` | `number` | `-1`、`0`、`1.5` | Prisma findFirst 匹配不到或异常 |

Zod schema（`listArticlesSchema`）在路由层限制 `pageSize: max(100)`，但接口不表达此约束 — 绕过路由直接调用 service 的消费者（调度器、测试）无此保护。

**修复**: 接口注释或 brand type 表达边界约束；实现层首行添加防御性校验。

---

#### H-3: `isValidStatusTransition` 参数为 `string` — 状态机探测风险

**位置**: `IArticleService` 第 30 行

```typescript
isValidStatusTransition(from: string, to: string): boolean;
```

**问题描述**: `from` 和 `to` 参数为 `string` 而非 `ArticleStatus`，允许传入任意字符串。

**安全影响**:

1. **无效状态探测**：攻击者可传入 `isValidStatusTransition('admin', 'root')` 等非法值探测状态机行为
2. **类型安全断裂**：`ArticleStatus` 已在 `article.entity.ts` 定义，接口未引用
3. **实现层隐式防御**：`STATUS_TRANSITIONS[from]?.includes(to) ?? false` 通过 `?.` 隐式返回 `false`，但接口不表达"无效输入返回 false"的语义

**修复**: 改为 `isValidStatusTransition(from: ArticleStatus, to: ArticleStatus): boolean`。

---

#### H-4: `PublishingScheduleListParams` 将认证数据与查询参数混合

**位置**: `IArticleService` 第 22 行引用 `PublishingScheduleListParams`

```typescript
// publishing-schedule.entity.ts
export interface PublishingScheduleListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  projectId?: number;
  userId?: number;    // ← 认证数据混入查询参数
  role?: string;      // ← 同上，且类型过宽
}
```

**问题描述**: `userId` 和 `role` 作为可选字段混在查询参数中，违反关注点分离原则。

**安全影响**:

1. **userId 可选**：`userId?: number` 允许不传 userId，实现层 `if (role === 'admin' && userId)` 的 `userId` 为 undefined 时权限过滤被跳过
2. **role 可选**：与 C-3 同理，`role?: string` 允许任意值或空值
3. **与 AuthContext 模式矛盾**：同一接口中三种认证传递方式（`AuthContext`、解构参数、嵌入查询对象）

**修复**: 将 `PublishingScheduleListParams` 中的 `userId`/`role` 移除，方法签名改为 `listPublishingSchedule(params: Omit<PublishingScheduleListParams, 'userId' | 'role'>, auth: AuthContext)`。

---

### MEDIUM 级别

#### M-1: ISP 违反 — 文章 CRUD 与发布计划两个领域合并同一接口

**位置**: `IArticleService` 全部 14 个方法

**问题描述**: 接口混合了两个不同领域：
- 文章生命周期管理（10 方法）：list、getById、create、update、updateContent、delete、review、regenerate、submitForReview、listVersions
- 发布计划管理（4 方法）：listPublishingSchedule、updateSchedule、rejectPublish、isSettingsEditable、isContentEditable、isValidStatusTransition

**安全影响**: 增加攻击面 — 只需要发布计划功能的消费者被迫获得文章 CRUD 的完整类型信息。

---

#### M-2: `search` 参数无长度约束 — ReDoS/性能风险

**位置**: `IArticleService` 第 11 行、第 22 行（通过 PublishingScheduleListParams）

**问题描述**: `search?: string` 无长度约束。虽然 Zod schema 限制 `max(200)`，但接口不表达此约束。

**实现层影响**: `article.service.impl.ts:67` 使用 `where.keywords = { contains: search, mode: 'insensitive' }`，超长搜索字符串会导致 PostgreSQL `ILIKE` 性能退化。

---

#### M-3: 状态机业务规则查询方法暴露在公共接口

**位置**: `IArticleService` 第 28-30 行

```typescript
isSettingsEditable(status: string): boolean;
isContentEditable(status: string): boolean;
isValidStatusTransition(from: string, to: string): boolean;
```

**问题描述**: 这三个方法暴露了内部状态机逻辑。攻击者可先调用 `isValidStatusTransition` 探测所有合法转换，再构造精确的权限提升攻击链。应在内部使用 `private` 或至少不在公共接口中暴露。

---

#### M-4: `updateSchedule` 缺少 `projectId` — 跨项目操作风险

**位置**: `IArticleService` 第 24 行

```typescript
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string)
```

**问题描述**: 与 C-1 类似，缺少 `projectId` 参数。实现层（`article.service.impl.ts:449-459`）通过 `findFirst({ where: { id, deletedAt: null } })` 查找，无项目边界过滤。虽有 `operators` 权限检查，但缺少项目归属一致性校验。

---

### LOW 级别

#### L-1: 返回类型暴露完整 `Article` 实体 — 无字段级访问控制

**位置**: `getById`、`create`、`update` 等方法返回 `Promise<Article>`

**问题描述**: 所有方法返回完整的 `Article` 对象。不同角色可能需要不同的字段可见性（例如 `view` 角色不应看到 `llm_model_id`）。接口不表达字段级访问控制。

---

#### L-2: `delete` 返回 `void` — 无审计确认

**位置**: `IArticleService` 第 16 行

**问题描述**: `delete` 返回 `void`，调用者无法确认删除操作的实际执行。虽然实现层使用软删除（`deletedAt: new Date()`），但接口不表达"删除是软删除"的语义。

---

## 三、纵深防御分析

| 防御层 | 覆盖状态 | 说明 |
|--------|----------|------|
| 路由层 auth | ✅ | `authMiddleware` + `roleMiddleware(SYSADMIN, ADMIN)` |
| 路由层 validate | ✅ | Zod schema 严格校验（`.strict()`） |
| 路由层 rate-limit | ⚠️ | 仅 delete、review、regenerate 有 `articleActionLimiter` |
| 控制器层 projectId | ⚠️ | `withArticleAuth` 提供 projectId，但 getById/listVersions 事后补偿 |
| 控制器层 operator | ✅ | admin 角色强制 `checkProjectOperator` |
| 服务层 AuthContext | ❌ | `role: string` 过宽（C-3） |
| 服务层 Markdown 消毒 | ✅ | `validateAndSanitizeMarkdown` 六层防御 |
| 服务层状态机 | ⚠️ | 完整状态转换表，但参数类型为 `string`（H-3） |
| 服务层项目归属 | ❌ | getById/listVersions 缺 projectId（C-1） |
| 服务层权限分离 | ✅ | 审核者不能是创建者（segregation of duties） |

---

## 四、与实现层对比 — 接口未捕获的安全逻辑

以下安全逻辑在实现层存在但接口签名**无法表达**：

| 实现层安全逻辑 | 对应位置 | 接口缺陷 |
|----------------|----------|----------|
| `checkProjectOwnership` 项目归属检查 | impl.ts:49-51 | getById/listVersions 签名缺 projectId |
| `checkCreatorOrAdmin` 创建者/管理员检查 | impl.ts:54-58 | 接口无法表达"部分方法需要创建者权限" |
| `validateAndSanitizeMarkdown` 内容消毒 | impl.ts:99, 176, 210 | 接口无法表达"content 参数会被消毒" |
| 事务包裹（`$transaction`） | impl.ts:137, 212, 253, 270 | 接口无法表达原子性保证 |
| `STATUS_TRANSITIONS` 完整状态机 | impl.ts:13-21 | 接口仅暴露 `isValidStatusTransition` |
| 软删除（`deletedAt`） | impl.ts:43, 265 | 接口无法表达 `delete` 是软删除 |

---

## 五、评分矩阵

| 维度 | 评分 | 等级 | 关键发现 |
|------|------|------|----------|
| 认证授权 | 3.5/10 | CRITICAL | `role: string` 过宽 + auth 可选 + 三种认证模式 |
| 权限提升防护 | 4.0/10 | HIGH | IDOR(C-1) + 角色注入(C-3) + 解构 AuthContext(H-1) |
| 输入验证 | 5.0/10 | HIGH | 参数无边界约束(H-2) + status 为 string(H-3) |
| 信息泄露防护 | 3.0/10 | CRITICAL | IDOR(C-1) + list 无认证(C-2) + 返回全量实体(L-1) |
| 接口安全设计 | 4.5/10 | HIGH | ISP 违反(M-1) + auth 混入查询参数(H-4) |
| 数据边界完整性 | 3.5/10 | CRITICAL | 缺 projectId(C-1) + 缺 projectId(M-4) |
| **综合** | **3.9/10** | **REQUEST CHANGES** | |

---

## 六、修复优先级矩阵

| 优先级 | 编号 | 问题 | 影响范围 | 修复成本 |
|--------|------|------|----------|----------|
| P0 | C-1 | getById/listVersions 缺 projectId | 所有文章详情/版本查询 | 中 — 改签名 + 实现 + 调用方 |
| P0 | C-2 | list() auth 可选 | 文章列表 | 低 — 改为必填 + 补实现 |
| P0 | C-3 | AuthContext.role: string | 全部方法 | 低 — 改为 Role 类型 |
| P1 | H-1 | updateSchedule 解构 AuthContext | 发布计划更新 | 低 — 改签名 |
| P1 | H-2 | page/pageSize/id 无边界 | 列表查询/详情 | 低 — 注释 + 防御校验 |
| P1 | H-3 | isValidStatusTransition string | 状态转换 | 低 — 改为 ArticleStatus |
| P1 | H-4 | auth 混入查询参数 | 发布计划列表 | 中 — 拆分接口 |
| P2 | M-1 | ISP 违反 | 接口设计 | 高 — 拆分接口 |
| P2 | M-2 | search 无长度约束 | 列表查询 | 低 — 注释 |
| P2 | M-3 | 状态机方法暴露 | 信息泄露 | 低 — 降为 private |
| P2 | M-4 | updateSchedule 缺 projectId | 发布计划 | 低 — 改签名 |
| P3 | L-1 | 返回完整实体 | 信息泄露 | 高 — DTO 投影 |
| P3 | L-2 | delete 返回 void | 审计 | 低 — 返回 Article |

---

## 七、修复后预期评分

| 修复阶段 | 预期评分 | 说明 |
|----------|----------|------|
| C-1 + C-2 + C-3 修复 | 5.8/10 | 消除 CRITICAL 级别 IDOR 和认证问题 |
| + H-1 ~ H-4 修复 | 7.2/10 | 统一认证模式 + 类型安全 + 边界约束 |
| + M-1 ~ M-4 修复 | 8.0/10 | ISP 合理 + 认证关注点分离 |

---

## 八、结论

**REQUEST CHANGES** — 综合评分 **3.9/10**，存在 3 项 CRITICAL 级别安全缺陷（IDOR + 认证绕过 + 角色注入）和 4 项 HIGH 级别问题（认证模式不一致 + 参数无边界 + 类型安全缺失 + auth 数据混合）。

核心风险总结：
1. **数据边界缺失**：`getById`/`listVersions` 无 `projectId`，任何已认证用户可跨项目读取文章
2. **认证模型断裂**：同一接口存在三种认证传递方式（`AuthContext`、解构参数、嵌入查询），`role: string` 允许角色注入
3. **类型安全缺口**：`string` 类型的 `role`、`status`、`from`/`to` 参数无法在编译期捕获非法值

修复后预期可达 8.0/10。
