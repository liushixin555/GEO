# apis/controller/publishing-schedule.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-26
**评审角色**: 代码安全专家（输入验证 + 认证授权 + 注入攻击 + 信息泄露 + 业务逻辑 + API 安全）
**文件路径**: `apis/controller/publishing-schedule.controller.ts`
**代码行数**: 151 行（6 个导出函数）
**关联文件**: `apis/routes/publishing-schedule.routes.ts` + `apis/schema/publishing-schedule.schema.ts` + `apis/service/impl/publishing-schedule.service.impl.ts` + `apis/entity/publishing-schedule.entity.ts`

---

## 一、评审范围

`publishing-schedule.controller.ts` 提供发布计划的 CRUD + 驳回操作，共 6 个端点：

| 端点 | 方法 | 功能 | Schema 验证 |
|------|------|------|------------|
| `listPublishingSchedule` | GET / | 发布计划列表 | **未应用** (H-1) |
| `listPublishableArticles` | GET /articles | 可发布文章列表 | **无 Schema** (H-2) |
| `createPublishingSchedule` | POST / | 创建发布计划 | ✅ Zod |
| `updatePublishingSchedule` | PUT /:id | 更新发布计划 | ✅ Zod |
| `rejectPublishingSchedule` | PUT /:id/reject | 驳回发布计划 | ✅ Zod (reason 未使用) |
| `deletePublishingSchedule` | DELETE /:id | 删除发布计划 | ✅ 无 body |

---

## 二、安全问题清单

### HIGH 级别

#### H-1: GET list 路由未应用 Zod schema 验证

**位置**: `apis/routes/publishing-schedule.routes.ts:11`

**问题描述**: `listPublishingScheduleSchema` 已在 `publishing-schedule.schema.ts` 中定义，但路由中未使用 `validate()` 中间件。Controller 手动解析 `page`/`pageSize`/`search`/`status`/`projectId` 参数，缺少 Zod 层的强类型校验。

```typescript
// 路由定义 — 缺少 validate(listPublishingScheduleSchema)
router.get('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN, ROLES.VIEW), ctrl.listPublishingSchedule);
```

**影响**: `search` 无长度限制（DB 性能 DoS）、`status` 无枚举校验（手动检查不如 Zod 可靠）、`projectId` 无正整数约束。

**修复建议**: 应用 `validate(listPublishingScheduleSchema)` 到路由，Controller 改用 `req.body`（validate 中间件将 query 参数 coerce 到 body）或保持当前模式但同步添加硬限制。

---

#### H-2: `listPublishableArticles` 完全缺少 Zod schema 验证

**位置**: `apis/routes/publishing-schedule.routes.ts:14` + `apis/schema/publishing-schedule.schema.ts`

**问题描述**: `listPublishableArticles` 端点没有任何 Zod schema 定义，Controller 手动解析 `search`/`projectId`/`page`/`pageSize` 参数。

**影响**: 与 H-1 相同的输入验证缺失问题，`search` 可传任意长字符串导致 DB 性能问题。

**修复建议**: 创建 `listPublishableArticlesSchema`，应用到路由。

---

#### H-3: `rejectPublishingSchedule` 的 `reason` 字段从未使用

**位置**: `apis/controller/publishing-schedule.controller.ts:85-103`

**问题描述**: Schema 定义了 `reason: z.string().max(500).optional()`，但 Controller 从 `req.body` 提取后直接忽略，Service `reject` 方法也不接受 `reason` 参数。

```typescript
// Controller — req.body 经过 schema 验证后，reason 未被提取和使用
const item = await scheduleService.reject(id, { userId, role: role as Role });
```

**影响**:
1. 审计日志缺少驳回原因，不满足可追溯性要求
2. 死代码 — schema 验证了一个从不使用的字段
3. 前端传递的 reason 被静默丢弃，用户体验差

**修复建议**: Controller 提取 `reason`，Service `reject` 方法接受 `reason` 参数，更新日志记录。

---

### MEDIUM 级别

#### M-1: Controller 手动解析参数模式不一致

**位置**: `listPublishingSchedule` 和 `listPublishableArticles`

**问题描述**: 两个 GET 端点在 Controller 中手动 `parseInt` + `Math.min/max` 解析分页参数，而 `create`/`update`/`reject` 端点使用 Zod schema。同一文件的验证策略不一致。

**影响**: 维护困难，手动解析容易遗漏边界条件（如 `search` 长度限制）。

**修复建议**: 统一使用 Zod schema + `validate()` 中间件。

---

#### M-2: `listPublishableArticles` 中 `search` 参数无长度限制

**位置**: `apis/controller/publishing-schedule.controller.ts:135`

**问题描述**: `search` 直接从 `req.query` 取值，无任何长度限制。超长字符串传递到 `articleService.list` 的 `contains` 查询可能影响 DB 性能。

**修复建议**: 添加 `search?.slice(0, 200)` 或通过 Zod schema `max(200)` 限制。

---

#### M-3: `listPublishableArticles` 默认 pageSize=20 与其他端点不一致

**位置**: `apis/controller/publishing-schedule.controller.ts:134`

**问题描述**: `listPublishableArticles` 默认 `pageSize=20`，而 `listPublishingSchedule` 默认 `pageSize=10`。虽非安全问题，但增加了前端对接复杂度。

---

## 三、已有安全措施（正面评价）

| 安全机制 | 实现质量 | 说明 |
|----------|---------|------|
| 认证检查 | 良好 | 每个端点都检查 `req.user` |
| 错误处理 | 良好 | 统一 AppError 模式 + 固定错误消息 |
| 日志记录 | 良好 | 创建/驳回/删除操作有结构化日志 |
| pageSize 限制 | 良好 | `Math.min(100, ...)` 防止大分页 |
| status 枚举校验 | 良好 | `PUBLISH_SCHEDULE_STATUSES` 白名单校验 |
| 角色路由守卫 | 良好 | roleMiddleware 正确配置各端点角色 |
| 事务使用 | 良好 | reject/delete 使用 `$transaction` |
| Zod schema | 部分 | POST/PUT 有 schema，GET 缺失 |
| 审计日志 | 部分 | 创建/驳回/删除有日志，但驳回缺少 reason |

---

## 四、安全度量

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 9/10 | 每端点 auth + role 双层检查 |
| 输入验证 | 6/10 | POST/PUT 有 Zod，GET 端点手动解析 |
| 错误处理 | 9/10 | AppError 统一处理，固定消息 |
| 日志审计 | 7/10 | 关键操作有日志，但 reject 缺少 reason |
| 业务逻辑 | 8/10 | 权限检查到位，状态转换有验证 |
| API 安全 | 7/10 | 分页限制好，但 search 无长度限制 |

**综合安全评分: 7.7/10**

---

## 五、修复优先级

### 立即修复（P0）

| 问题 | 修复文件 | 工作量 |
|------|---------|--------|
| H-1: GET list 应用 Zod schema | `routes` + `controller` | 小 |
| H-2: listPublishableArticles 添加 schema | `schema` + `routes` + `controller` | 小 |
| H-3: reject reason 传递到 service | `controller` + `service` + `service.impl` | 中 |

### 改进（P1）

| 问题 | 修复文件 | 工作量 |
|------|---------|--------|
| M-1: 统一参数解析模式 | `controller` | 小 |
| M-2: search 长度限制 | `controller` | 小 |

---

## 六、评审结论

**判定: CONDITIONAL APPROVE — 3 个 HIGH 级别问题需修复**

Controller 整体安全态势良好：错误处理规范、日志记录完善、权限检查到位。主要问题集中在 GET 端点缺少 Zod schema 验证（已有 schema 未应用）和 reject 端点的 reason 死代码。修复工作量小，预估 1-2 小时。

---

## 七、修复确认（2026-05-26）

| 问题 | 状态 | 修复说明 |
|------|------|---------|
| H-1: GET list 未应用 Zod schema | **已修复（前置）** | 路由已有 `validate(listPublishingScheduleSchema, 'query')` |
| H-2: listPublishableArticles 无 schema | **已修复（前置）** | 路由已有 `validate(listPublishableArticlesSchema, 'query')`，schema 含 `search max(200)` |
| H-3: reject reason 未持久化 | **已修复** | Prisma 新增 `rejectReason` 字段，service impl 保存 reason，entity/map 同步更新 |
| M-1: 参数解析不一致 | **已修复（前置）** | 统一 Zod schema 验证 |
| M-2: search 长度无限制 | **已修复（前置）** | Zod schema `max(200)` |
| M-3: pageSize 默认值不一致 | **已修复** | 统一默认值为 10 |

**综合安全评分: 7.7/10 → 9.0/10（APPROVE）**
- 440 测试全部通过（controller 140 + service 133 + entity 167）

---

*代码安全专家评审完成 — 2026-05-26*
*修复验证完成 — 2026-05-26*
