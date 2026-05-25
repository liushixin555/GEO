# apis/controller/publishing-schedule.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 · 注入攻击 · 认证授权 · 数据泄露 · 输入验证 · 业务逻辑安全）
**文件路径**: `apis/controller/publishing-schedule.controller.ts`
**代码行数**: 57 行（2 个导出函数 + 1 个模块级服务实例）
**关联路由**:
- `GET /api/publishing-schedule` — 发布计划列表查询（sysadmin + admin + view）
- `PUT /api/publishing-schedule/:id` — 更新发布计划（sysadmin + admin）
**关联服务**: `apis/service/impl/publishing-schedule.service.impl.ts`
**关联中间件**: `authMiddleware`（JWT 认证）+ `roleMiddleware`（角色鉴权）
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate）

---

## 一、总体安全评估

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 注入攻击防护 | 9/10 | 依赖 Prisma 参数化查询，SQL 注入风险极低 |
| 认证与授权 | 7/10 | JWT 中间件 + 角色中间件保护，但存在越权风险 |
| 输入验证 | 5/10 | 多处参数缺少严格校验，可被恶意构造利用 |
| 数据泄露防护 | 8/10 | 错误消息不含敏感信息，catch fallback 使用固定文案 |
| 业务逻辑安全 | 6/10 | update 缺少归属权限校验，存在水平越权风险 |
| 错误处理安全 | 7/10 | 类型不安全(err: any)，但实际泄露风险低 |
| 依赖安全 | 9/10 | Prisma + Express 均为成熟框架，无明显已知漏洞 |

**问题统计**: CRITICAL × 1 / HIGH × 3 / MEDIUM × 5 / LOW × 2

---

## 二、安全问题清单

### CRITICAL 级别

#### C-1: updatePublishingSchedule 缺少归属权限校验 — 水平越权漏洞

**位置**: 第 33-56 行（controller） + service 层第 91-132 行
**威胁类型**: BOLA（Broken Object Level Authorization）/ IDOR（Insecure Direct Object Reference）
**OWASP 分类**: API1:2023 — Broken Object Level Authorization

**问题代码**:

```typescript
// controller — 第 44-45 行
const { userId, role } = req.user!;
const item = await publishingScheduleService.updateSchedule(id, scheduled_publish_at, userId, role);
```

```typescript
// service — updateSchedule 方法
async updateSchedule(id: number, scheduledPublishAt: string | null, userId?: number, role?: string): Promise<any> {
  const existing = await prisma.article.findFirst({ where: { id } });
  if (!existing) throw new Error('文章不存在');
  // ❌ 没有检查 existing 是否属于当前用户的可操作范围！
  if (existing.status !== 'publishing') {
    throw new Error('当前文章状态不可编辑发布计划');
  }
  const updated = await prisma.article.update({ where: { id }, data, ... });
  return updated;
}
```

**攻击场景**:
1. 用户 A（admin 角色，关联公司 X）知道用户 B（admin 角色，关联公司 Y）的文章 ID 为 42
2. 用户 A 发送 `PUT /api/publishing-schedule/42` 并修改 `scheduled_publish_at`
3. Service 层收到 `userId=1, role='admin'`，但 **只检查了文章是否存在和状态是否为 publishing，从未验证该文章是否属于用户 A 的可操作范围**
4. 用户 A 成功修改了用户 B 的文章发布计划 — **水平越权成功**

**对比 list 接口**: `list` 方法正确实现了权限过滤（admin 只能看自己公司的文章），但 `updateSchedule` **接收了 userId/role 参数却从未使用它们做权限检查**，形成了认证-授权不一致。

**修复建议**:

```typescript
// service 层 updateSchedule 方法中，在状态检查之后添加归属校验
async updateSchedule(id: number, scheduledPublishAt: string | null, userId?: number, role?: string): Promise<any> {
  const prisma = getPrisma();
  const existing = await prisma.article.findFirst({
    where: { id },
    include: { project: { include: { operators: true, viewers: true } } }
  });
  if (!existing) throw new Error('文章不存在');
  if (existing.status !== 'publishing') {
    throw new Error('当前文章状态不可编辑发布计划');
  }

  // ✅ 权限校验
  if (role !== 'sysadmin') {
    const hasAccess = existing.project?.operators?.some(op => op.userId === userId);
    if (!hasAccess) throw new Error('无权操作此文章');
  }

  // ...继续更新
}
```

**风险等级**: CRITICAL — 任何 admin 角色用户可以修改任何其他公司的文章发布计划

---

### HIGH 级别

#### H-1: catch(err: any) — 错误类型不安全，可能导致信息泄露

**位置**: 第 28 行、第 47 行
**威胁类型**: Information Exposure Through an Error Message
**OWASP 分类**: API8:2023 — Security Misconfiguration

```typescript
} catch (err: any) {
  fail(res, 500, err.message || '获取发布计划列表失败');
}
```

**分析**:
1. `err: any` 允许访问任意属性，如果 Prisma 或其他底层库抛出的 Error 包含数据库连接字符串、表结构、SQL 片段等敏感信息，`err.message` 会原样返回给客户端。
2. 虽然当前 service 层抛出的错误消息（'文章不存在'、'当前文章状态不可编辑发布计划'）不敏感，但无法保证未来变更不会引入敏感信息的错误消息。
3. Prisma 的某些错误（如连接错误）可能包含数据库主机名、端口等信息。

**修复建议**:

```typescript
} catch (err: unknown) {
  // 生产环境不返回原始错误消息
  const isKnownError = err instanceof Error &&
    (err.message === '文章不存在' || err.message === '当前文章状态不可编辑发布计划');
  if (isKnownError) {
    fail(res, 400, (err as Error).message);
  } else {
    // 未知错误使用固定消息，避免信息泄露
    logger.error('listPublishingSchedule failed', err);
    fail(res, 500, '获取发布计划列表失败');
  }
}
```

---

#### H-2: parseInt 未指定 radix — 输入解析不一致

**位置**: 第 9-13 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
```

**分析**:
1. 未指定 radix 的 `parseInt` 在某些情况下可能产生非预期结果：`parseInt('0x10')` = 16（十六进制解析）。
2. 攻击者可构造 `?page=0x1` 或 `?pageSize=0xff` 产生非预期的分页参数。
3. 同一文件内 `updatePublishingSchedule` 正确使用了 `parseInt(x, 10)`，风格不一致。

**修复建议**: 所有 `parseInt` 统一使用 `parseInt(x, 10)`。

---

#### H-3: req.user! 非空断言 — 认证状态假设不安全

**位置**: 第 15 行、第 44 行

```typescript
const { userId, role } = req.user!;
```

**分析**:
1. 虽然路由配置了 `authMiddleware`，但 TypeScript 非空断言 `!` 仅在编译期生效，运行时 `req.user` 可能为 `undefined`（如中间件 bug、Express 类型扩展问题）。
2. 如果 `req.user` 为 `undefined`，解构操作抛出 `TypeError`，被外层 catch 捕获后返回 500 错误，攻击者可以通过 500 vs 401 的响应差异探测服务端行为。
3. 更严重的是：如果 `req.user` 为 `undefined`，`userId` 和 `role` 也是 `undefined`，传给 service 层后可能导致权限检查失效（如 service 层判断 `role !== 'sysadmin'` 为 true，但后续 `userId` 为 undefined 导致权限过滤条件失效）。

**修复建议**:

```typescript
if (!req.user) {
  fail(res, 401, '未授权访问');
  return;
}
const { userId, role } = req.user;
```

---

### MEDIUM 级别

#### M-1: page / pageSize 负数可穿透到数据库查询 — DoS 风险

**位置**: 第 9-10 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**分析**:
1. `parseInt('-5')` = -5，`-5 || 10` = -5（负数是 truthy），负数直接传入 service。
2. 攻击者发送 `?pageSize=-999999999` 可产生异常查询行为。
3. 超大 pageSize（如 `?pageSize=99999999`）可导致数据库内存溢出，构成拒绝服务攻击向量。

**修复建议**:

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
```

---

#### M-2: projectId 参数缺少 NaN 校验 — 异常查询行为

**位置**: 第 13 行

```typescript
const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
```

**分析**:
1. `?projectId=abc` → `parseInt('abc')` = `NaN`，NaN 传入 Prisma 查询。
2. Prisma 对 `where: { projectId: NaN }` 的行为不确定（可能返回所有记录或空结果），攻击者可用此探测数据库行为。

**修复建议**:

```typescript
const rawProjectId = parseInt(req.query.projectId as string, 10);
const projectId = !isNaN(rawProjectId) ? rawProjectId : undefined;
```

---

#### M-3: scheduled_publish_at 日期格式未校验 — 注入/异常风险

**位置**: 第 38-41 行

```typescript
if (scheduled_publish_at !== undefined && scheduled_publish_at !== null && typeof scheduled_publish_at !== 'string') {
  fail(res, 400, 'scheduled_publish_at参数无效');
  return;
}
```

**分析**:
1. 只检查了类型是否为 string，未校验是否为合法日期格式。
2. Service 层做 `new Date(scheduledPublishAt)`，`new Date('Invalid')` 产生 `Invalid Date`，Prisma 写入行为不确定。
3. 空字符串 `''` 通过校验，`new Date('')` 在 V8 中返回 `Invalid Date`。
4. 虽然不构成 SQL 注入（Prisma 参数化），但恶意构造的日期字符串可能触发数据库驱动异常，暴露错误堆栈。

**修复建议**:

```typescript
if (scheduled_publish_at !== undefined && scheduled_publish_at !== null) {
  if (typeof scheduled_publish_at !== 'string') {
    fail(res, 400, 'scheduled_publish_at参数无效');
    return;
  }
  const parsed = Date.parse(scheduled_publish_at);
  if (scheduled_publish_at !== '' && (isNaN(parsed) || parsed < 0)) {
    fail(res, 400, 'scheduled_publish_at日期格式无效');
    return;
  }
}
```

---

#### M-4: status 参数缺少白名单校验

**位置**: 第 12 行

**分析**: 虽然不构成注入（Prisma 参数化），但非法 status 值可能覆盖 service 层的默认过滤条件 `status: { in: PUBLISH_STATUSES }`，导致返回不符合预期的结果。

---

#### M-5: 错误消息差异化 — 用户枚举向量

**位置**: 第 48-51 行

```typescript
if (err.message === '文章不存在') {
  fail(res, 404, err.message);
} else if (err.message === '当前文章状态不可编辑发布计划') {
  fail(res, 400, err.message);
}
```

**分析**:
1. 攻击者通过返回不同的错误码（404 vs 400）可以判断某 ID 对应的文章是否存在，以及其当前状态是否为 `publishing`。
2. 这属于信息泄露的一种（IDOR 探测），攻击者可结合 C-1 漏洞批量枚举文章状态。
3. 虽然单看影响较小，但与其他漏洞组合可放大攻击效果。

**建议**: 对于非 sysadmin 用户，统一返回 `fail(res, 403, '无权操作')` 而非区分 404/400。

---

### LOW 级别

#### L-1: 缺少安全审计日志

**位置**: 两个 catch 块

**分析**: 错误被直接返回客户端，无服务端日志记录。安全事件（如越权尝试、异常参数）无法被审计追踪。

**建议**: 在 catch 块中添加 logger 记录，包含请求来源信息。

---

#### L-2: `as string` 类型断言不安全

**位置**: 第 9-13 行

**分析**: `req.query` 的值类型为 `string | string[] | qs.ParsedQs | undefined`，`as string` 断言不安全。攻击者可发送 `?page[]=1&page[]=2` 使 `req.query.page` 为数组，`parseInt(['1','2'] as string)` 返回 `NaN`。

---

## 三、OWASP API Security Top 10 对照

| OWASP 编号 | 威胁名称 | 是否存在 | 关联问题 |
|-------------|----------|----------|----------|
| API1:2023 | Broken Object Level Authorization | **是** | C-1: update 越权 |
| API2:2023 | Broken Authentication | 否 | JWT 中间件保障 |
| API3:2023 | Broken Object Property Level Authorization | 否 | 返回数据经过 service 层筛选 |
| API4:2023 | Unrestricted Resource Consumption | **是** | M-1: pageSize 无上限 |
| API5:2023 | Broken Function Level Authorization | 否 | roleMiddleware 正确配置 |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | **是** | C-1: 无归属校验 |
| API7:2023 | Server Side Request Forgery | 否 | 无外部请求 |
| API8:2023 | Security Misconfiguration | **是** | H-1: err: any 信息泄露 |
| API9:2023 | Improper Inventory Management | 否 | 路由明确 |
| API10:2023 | Unsafe Consumption of APIs | 否 | 无第三方 API 调用 |

---

## 四、攻击面分析

### 攻击面 1: 水平越权修改发布计划

```
攻击者: admin 角色用户 A（公司 X）
目标: 修改公司 Y 的文章发布计划

步骤:
1. 枚举文章 ID（GET /api/publishing-schedule 可查看自身文章范围）
2. 猜测或通过其他渠道获取目标文章 ID（如 ID=42）
3. 发送 PUT /api/publishing-schedule/42, body: { "scheduled_publish_at": "2099-01-01T00:00:00Z" }
4. Service 层: 查找文章 → 存在 → 状态为 publishing → 直接更新
5. ❌ 从未检查文章是否属于用户 A 的操作范围
6. ✅ 修改成功，公司 Y 的发布计划被篡改

影响:
- 恶意推迟竞争对手的文章发布时间
- 提前发布未审核的文章
- 扰乱发布计划排期
```

### 攻击面 2: 信息枚举

```
攻击者: 任意认证用户
目标: 确认特定 ID 的文章是否存在及其状态

步骤:
1. PUT /api/publishing-schedule/{id}, body: { "scheduled_publish_at": "2026-06-01" }
2. 响应 404 → 文章不存在
3. 响应 400 "当前文章状态不可编辑发布计划" → 文章存在但非 publishing 状态
4. 响应 200 → 文章存在且为 publishing 状态（且可修改）

影响: 攻击者可批量探测文章 ID 和状态
```

### 攻击面 3: 拒绝服务

```
攻击者: 任意认证用户（view 角色也可）

步骤:
1. GET /api/publishing-schedule?pageSize=999999999
2. 负数 pageSize 无防护，直接传入 Prisma 查询
3. 数据库执行无限制查询，消耗大量内存

影响: 数据库性能下降，影响其他用户
```

---

## 五、安全修复优先级

| 优先级 | 编号 | 修复内容 | 工作量 | 安全收益 |
|--------|------|----------|--------|----------|
| **P0 紧急** | C-1 | updateSchedule 添加归属权限校验 | 中 | 消除水平越权漏洞 |
| P1 | H-1 | catch(err: unknown) + 安全窄化 | 小 | 防止信息泄露 |
| P1 | H-3 | req.user 防御性检查 | 小 | 防止认证绕过 |
| P2 | M-1 | page/pageSize 范围校验 | 小 | 防止 DoS |
| P2 | M-3 | 日期格式校验 | 小 | 防止异常注入 |
| P2 | M-5 | 统一错误响应 | 小 | 防止信息枚举 |
| P3 | H-2 | parseInt radix 统一 | 小 | 输入一致性 |
| P3 | M-2 | projectId NaN 校验 | 小 | 异常行为防护 |
| P3 | M-4 | status 白名单 | 小 | 查询安全 |
| P4 | L-1 | 添加审计日志 | 小 | 安全可追溯性 |
| P4 | L-2 | query 参数类型安全 | 中 | 输入安全 |

---

## 六、安全加固建议（完整修复代码）

### 修复后的 controller

```typescript
import { Request, Response } from 'express';
import { PublishingScheduleServiceImpl } from '../service/impl/publishing-schedule.service.impl';
import { success, fail, paginate } from '../utils';

const publishingScheduleService = new PublishingScheduleServiceImpl();

export async function listPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    // ✅ 认证检查
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    // ✅ 参数安全解析
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = req.query.search as string | undefined;

    // ✅ status 白名单
    const VALID_STATUSES = ['publishing', 'published', 'publish_failed'];
    const rawStatus = req.query.status as string | undefined;
    const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined;

    // ✅ projectId NaN 校验
    const rawProjectId = parseInt(req.query.projectId as string, 10);
    const projectId = !isNaN(rawProjectId) ? rawProjectId : undefined;

    const { list, total } = await publishingScheduleService.list({
      page, pageSize, search, status, projectId, userId, role,
    });

    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    // ✅ 安全错误处理
    logger.error('listPublishingSchedule failed', err);
    fail(res, 500, '获取发布计划列表失败');
  }
}

export async function updatePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    // ✅ 认证检查
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const { scheduled_publish_at } = req.body;
    // ✅ 日期格式校验
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

    const item = await publishingScheduleService.updateSchedule(id, scheduled_publish_at, userId, role);
    success(res, item, '更新发布计划成功');
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === '文章不存在') {
        fail(res, 404, err.message);
      } else if (err.message === '当前文章状态不可编辑发布计划') {
        fail(res, 400, err.message);
      } else if (err.message === '无权操作此文章') {
        fail(res, 403, err.message);
      } else {
        logger.error('updatePublishingSchedule failed', err);
        fail(res, 500, '更新发布计划失败');
      }
    } else {
      logger.error('updatePublishingSchedule failed', err);
      fail(res, 500, '更新发布计划失败');
    }
  }
}
```

---

## 七、总结

`publishing-schedule.controller.ts` 存在一个 **CRITICAL 级别的水平越权漏洞（C-1）**：`updatePublishingSchedule` 接收了 `userId/role` 参数但 service 层从未使用它们进行归属校验，导致任何 admin 角色用户可以修改任何公司的文章发布计划。

其他安全问题包括：
- 错误处理类型不安全可能导致信息泄露（H-1）
- 认证状态假设不安全（H-3）
- 缺少分页参数范围校验（M-1，DoS 向量）
- 缺少日期格式校验（M-3）
- 错误响应差异可被用于信息枚举（M-5）

**建议立即修复 C-1 漏洞**，其他 HIGH 级别问题应在下一个迭代中处理。

---

## 八、修复验证结果（2026-05-25）

**验证状态**: ✅ 全部已修复

| 编号 | 问题 | 修复位置 | 验证结果 |
|------|------|----------|----------|
| C-1 | 水平越权 | service 114-117 行 `ForbiddenError` | ✅ 293 测试通过 |
| H-1 | catch(err: any) | controller 35/57 行 `catch(err: unknown)` + `AppError` 窄化 | ✅ |
| H-2 | parseInt radix | controller 全部 `parseInt(x, 10)` | ✅ |
| H-3 | req.user! | controller 11/47 行 `if (!req.user)` 防御检查 | ✅ |
| M-1 | page/pageSize 范围 | controller 14-15 行 `Math.max/min` 限制 | ✅ |
| M-2 | projectId NaN | controller 21-22 行 `isNaN` 检查 | ✅ |
| M-3 | 日期格式 | Zod schema `publishing-schedule.schema.ts` + `Date.parse` 校验 | ✅ |
| M-4 | status 白名单 | controller 19 行 `PUBLISH_STATUSES` 过滤 | ✅ |
| M-5 | 错误响应差异 | service 先验权限(403)再检查状态(400/404) | ✅ |
| L-1 | 审计日志 | controller 39/61 行 `console.error` 前缀日志 | ✅ |
| L-2 | query 类型安全 | `parseInt(x, 10)` + NaN 兜底 | ✅ |

**构建验证**: `pnpm build:api` ✅ | `pnpm lint` ✅ | 293 测试全部通过 ✅
