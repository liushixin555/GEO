# apis/controller/publishing-schedule.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（安全性 · 可靠性 · 可维护性 · 一致性 · 鲁棒性 · 最佳实践）
**文件路径**: `apis/controller/publishing-schedule.controller.ts`
**代码行数**: 57 行（2 个导出函数 + 1 个模块级服务实例）
**关联路由**:
- `GET /api/publishing-schedule` — 发布计划列表查询（全部角色）
- `PUT /api/publishing-schedule/:id` — 更新发布计划（sysadmin + admin）
**关联服务**: `apis/service/publishing-schedule.service.ts`（接口 `IPublishingScheduleService`）→ `apis/service/impl/publishing-schedule.service.impl.ts`（实现 `PublishingScheduleServiceImpl`）
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate）

---

## 一、总体质量评估

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| 安全性 | 8/10 | 仅暴露必要参数，无敏感信息泄露风险，依赖中间件鉴权 |
| 可靠性 | 6/10 | parseInt 不一致、缺少范围校验、负数 pageSize 可穿透到 DB |
| 可维护性 | 6/10 | DI 违反（模块级 new）、catch(err: any) 类型不安全 |
| 一致性 | 5/10 | parseInt radix 使用不统一、错误消息术语不一致 |
| 鲁棒性 | 5/10 | 输入验证不够严格，日期格式未校验，projectId 无 NaN 检查 |
| 最佳实践 | 6/10 | 依赖倒置违反、any 类型使用、缺少请求日志 |

**问题统计**: CRITICAL × 0 / HIGH × 4 / MEDIUM × 5 / LOW × 2

---

## 二、问题清单

### HIGH 级别

#### H-1: 模块级直接实例化服务 — 违反依赖倒置原则

**位置**: 第 5 行

```typescript
const publishingScheduleService = new PublishingScheduleServiceImpl();
```

**分析**:
1. Controller 直接依赖具体实现类 `PublishingScheduleServiceImpl`，而非接口 `IPublishingScheduleService`。这违反了 SOLID 的依赖倒置原则（DIP）。
2. 测试时必须使用 `jest.mock` 替换整个模块，增加了测试复杂度和脆弱性。
3. 与项目其他 controller 的风格一致（均采用此模式），属于项目级技术债务而非孤立问题。

**严重性**: HIGH — 影响可测试性和可维护性，但与项目整体风格一致，暂不要求立即修改。

**建议**: 此为项目级架构问题，建议统一重构时引入 DI 容器或工厂模式。当前可保持现状。

---

#### H-2: catch(err: any) — 错误类型不安全

**位置**: 第 28 行、第 47 行

```typescript
} catch (err: any) {
  fail(res, 500, err.message || '获取发布计划列表失败');
}
```

```typescript
} catch (err: any) {
  // ...
  fail(res, 500, err.message || '更新发布计划失败');
}
```

**分析**:
1. `err: any` 绕过了 TypeScript 的类型安全，访问 `err.message` 没有编译期保证。
2. 如果抛出的不是 `Error` 实例（如 `throw 'something'`），`err.message` 为 `undefined`，会走 fallback 消息，行为正确但类型不安全。
3. 违反项目编码规范（`common/coding-style.md` 要求避免 `any`，使用 `unknown` 进行安全窄化）。

**修复建议**:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : '获取发布计划列表失败';
  fail(res, 500, message || '获取发布计划列表失败');
}
```

---

#### H-3: parseInt radix 参数使用不一致

**位置**: 第 9-13 行 vs 第 35 行

```typescript
// list 函数 — 未指定 radix
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

// update 函数 — 指定了 radix
const id = parseInt(req.params.id as string, 10);
```

**分析**:
1. `listPublishingSchedule` 中 `parseInt` 未指定 radix，虽然对于十进制数字通常不会有问题，但 `parseInt('010')` 在旧引擎中可能按八进制解析。
2. `updatePublishingSchedule` 中正确指定了 `radix = 10`，但同一文件内两种写法不一致，降低代码可读性。
3. 统一使用 `parseInt(x, 10)` 是最佳实践，ESLint 规则 `radix` 也要求如此。

**修复建议**: 所有 `parseInt` 调用统一加上 `radix = 10` 参数。

---

#### H-4: req.user! 非空断言 — 缺少运行时保护

**位置**: 第 15 行、第 44 行

```typescript
const { userId, role } = req.user!;
```

**分析**:
1. `req.user!` 使用非空断言操作符，假设 auth 中间件已正确执行并挂载了 user 对象。
2. 如果路由配置错误导致 auth 中间件未执行，或中间件 bug 导致 `req.user` 为 `undefined`，此处会在运行时抛出 `TypeError: Cannot destructure property 'userId' of undefined`，而非返回有意义的 401 错误。
3. 项目所有 controller 均采用此模式，依赖 auth 中间件保证。虽然实际风险较低（路由配置正确时不会触发），但属于防御性编程缺失。

**修复建议**:

```typescript
if (!req.user) {
  fail(res, 401, '未授权访问');
  return;
}
const { userId, role } = req.user;
```

> 注意：此为项目级共性问题，建议统一重构时处理，当前可保持现状。

---

### MEDIUM 级别

#### M-1: page / pageSize 缺少范围校验 — 负数可穿透到数据库查询

**位置**: 第 9-10 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**分析**:
1. `|| defaultValue` 模式无法拦截负数：`parseInt('-5') = -5`，`-5 || 10 = -5`（负数是 truthy）。
2. 负数 pageSize 传入 service 后，在 `take: pageSize` 和 `skip: (page - 1) * pageSize` 中被 Prisma 传给数据库，可能产生意外行为（Prisma 对负数 take 的处理取决于数据库引擎）。
3. 测试文件（第 537-548 行）已验证此行为：`pageSize: -5` 直接穿透。

**修复建议**:

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
```

---

#### M-2: status 参数缺少白名单校验

**位置**: 第 12 行

```typescript
const status = req.query.status as string | undefined;
```

**分析**:
1. `status` 直接传递给 service，虽然 service 层会覆盖 `where.status`（覆盖了 `status: { in: PUBLISH_STATUSES }`），但非法的 status 值会导致 Prisma 查询返回空结果而不会报错。
2. 不会造成安全问题（Prisma 参数化查询），但客户端可能传入拼写错误的 status 而收到空结果，缺少快速失败反馈。

**修复建议**:

```typescript
const VALID_STATUSES = ['publishing', 'published', 'publish_failed'];
const rawStatus = req.query.status as string | undefined;
const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined;
```

---

#### M-3: scheduled_publish_at 缺少日期格式校验

**位置**: 第 38-41 行

```typescript
if (scheduled_publish_at !== undefined && scheduled_publish_at !== null && typeof scheduled_publish_at !== 'string') {
  fail(res, 400, 'scheduled_publish_at参数无效');
  return;
}
```

**分析**:
1. 只验证了类型为 string，但未验证是否为有效的 ISO 8601 日期格式。
2. Service 层做 `new Date(scheduledPublishAt)`，无效字符串（如 `'not-a-date'`）会产生 `Invalid Date`，Prisma 写入时可能报错或写入 `NULL`，行为不确定。
3. 空字符串 `''` 也通过了校验，`new Date('')` 在 V8 中返回 `Invalid Date`。

**修复建议**:

```typescript
if (scheduled_publish_at !== undefined && scheduled_publish_at !== null) {
  if (typeof scheduled_publish_at !== 'string') {
    fail(res, 400, 'scheduled_publish_at参数无效');
    return;
  }
  if (scheduled_publish_at !== '' && isNaN(Date.parse(scheduled_publish_at))) {
    fail(res, 400, 'scheduled_publish_at日期格式无效');
    return;
  }
}
```

---

#### M-4: 错误消息术语不一致

**位置**: 第 36 行

```typescript
if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }
```

**分析**:
1. 该函数是 `updatePublishingSchedule`（更新发布计划），但错误消息使用"文章ID"而非"发布计划ID"。
2. 从业务语义看，发布计划本质是文章的发布时间属性，使用"文章ID"也有道理。但与函数名 `updatePublishingSchedule` 不一致，可能让调用方困惑。

**建议**: 可改为 `'无效的ID'` 或 `'无效的发布计划ID'`，与函数名保持一致。

---

#### M-5: projectId 参数缺少 NaN 校验

**位置**: 第 13 行

```typescript
const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
```

**分析**:
1. 当 `projectId=abc` 时，`parseInt('abc')` 返回 `NaN`，`NaN` 被传递给 service 层。
2. Prisma 的 `where: { projectId: NaN }` 查询行为不确定（可能返回空结果或抛出运行时错误），取决于数据库驱动。
3. 与 `updatePublishingSchedule` 中对 `id` 的 `isNaN` 校验形成不一致。

**修复建议**:

```typescript
const rawProjectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
const projectId = rawProjectId && !isNaN(rawProjectId) ? rawProjectId : undefined;
```

---

### LOW 级别

#### L-1: 缺少请求级日志

**位置**: 两个 catch 块

**分析**: 错误被 catch 后直接返回给客户端，没有 `console.error` 或 logger 调用记录错误堆栈。在排查生产问题时缺少服务端日志。

**建议**: 在 catch 块中添加 `logger.error('listPublishingSchedule failed', err);` 或等效日志。

---

#### L-2: `as string` 类型断言过多

**位置**: 第 9-13 行

**分析**: `req.query.page as string` 等多处类型断言。`req.query` 的值实际类型是 `string | string[] | qs.ParsedQs | undefined`，`as string` 断言不安全。实际使用中 Express query string 参数通常是 string，风险较低。

**建议**: 可使用 `String(req.query.page || '')` 或 Zod 做严格校验。

---

## 三、代码结构评估

| 评估项 | 评价 |
|--------|------|
| 函数长度 | 良好 — `listPublishingSchedule` 24行，`updatePublishingSchedule` 24行，均在 50 行以内 |
| 职责单一 | 良好 — 每个函数只处理一个 HTTP 端点 |
| 分层清晰 | 良好 — controller 只做参数解析和响应封装，业务逻辑在 service |
| 错误处理 | 中等 — 区分了业务异常（404/400）和系统异常（500），但类型不安全 |
| 输入验证 | 中等 — id 有 NaN 校验，但 page/pageSize/projectId/status 缺少完善校验 |
| 与 service 契约匹配 | 良好 — 参数传递与 `IPublishingScheduleService` 接口一致 |

---

## 四、安全性评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| SQL 注入 | 安全 | 依赖 Prisma 参数化查询 |
| XSS | 安全 | 返回 JSON，无 HTML 渲染 |
| 认证 | 安全 | 依赖 JWT 中间件，所有路由需认证 |
| 授权 | 安全 | userId/role 传入 service 做权限过滤 |
| 敏感信息泄露 | 安全 | 错误消息不包含敏感数据，catch fallback 使用固定文案 |
| 速率限制 | 安全 | 依赖全局 rate-limit 中间件 |

**安全评分**: 8/10 — 无重大安全隐患。

---

## 五、测试覆盖评估

测试文件 `tests/apis/publishing-schedule.controller.test.ts` 包含 **33 个测试用例**，覆盖：

| 测试场景 | 覆盖情况 |
|----------|----------|
| 无 token 访问 | 已覆盖 |
| 三种角色（sysadmin/admin/view） | 已覆盖 |
| 默认分页参数 | 已覆盖 |
| 查询参数传递（search/status/projectId） | 已覆盖 |
| 404 错误（文章不存在） | 已覆盖 |
| 400 错误（状态不可编辑/参数无效） | 已覆盖 |
| 500 错误 | 已覆盖 |
| 边界值（id=0/负数/浮点数/空字符串） | 已覆盖 |
| service 异常无消息 | 已覆盖 |

**未覆盖场景**:
- 并发更新同一发布计划（乐观锁冲突）
- 超大 pageSize（如 pageSize=999999）导致 DB 压力

---

## 六、修复优先级建议

| 优先级 | 编号 | 修复内容 | 工作量 |
|--------|------|----------|--------|
| P1 | H-2 | catch(err: any) → catch(err: unknown) + 安全窄化 | 小 |
| P1 | H-3 | parseInt 统一添加 radix=10 | 小 |
| P2 | M-1 | page/pageSize 范围校验 | 小 |
| P2 | M-3 | scheduled_publish_at 日期格式校验 | 小 |
| P2 | M-5 | projectId NaN 校验 | 小 |
| P3 | M-2 | status 白名单校验 | 小 |
| P3 | M-4 | 错误消息术语统一 | 小 |
| P3 | H-1 | DI 重构（项目级） | 大 |
| P3 | H-4 | req.user! 防御性检查（项目级） | 中 |
| P4 | L-1 | 添加错误日志 | 小 |
| P4 | L-2 | query 参数类型安全 | 中 |

---

## 七、总结

`publishing-schedule.controller.ts` 整体结构清晰，函数职责单一，与 service 层契约匹配良好。安全性方面无重大隐患，依赖 Prisma 和中间件保障。

主要改进方向：
1. **类型安全**：将 `catch(err: any)` 改为 `catch(err: unknown)`，统一 parseInt radix。
2. **输入校验**：补充 page/pageSize 范围校验、projectId NaN 检查、日期格式校验。
3. **一致性**：统一错误消息术语。

以上问题均为 HIGH 以下级别，无 CRITICAL 安全漏洞，代码在当前状态下可安全运行。建议按优先级逐步修复。
