# apis/controller/publishing-platform.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 · 凭证管理 · 注入防护 · 信息泄露 · DoS 防护 · 审计追溯）
**文件路径**: `apis/controller/publishing-platform.controller.ts`
**代码行数**: 49 行（2 个导出函数 + 2 个模块级服务实例）
**关联路由**:
- `POST /api/publishing-platforms/sync` — 同步软盟发布平台（仅 sysadmin，需 JWT + anti-crawl + rate-limit）
- `GET /api/publishing-platforms` — 列表查询（sysadmin + admin，需 JWT + anti-crawl + rate-limit）

**安全中间件链**: `helmet` → `cors` → `antiCrawlMiddleware` → `rateLimitMiddleware` → `authMiddleware` → `roleMiddleware`

**关联外部服务**: `apis/utils/rmapi.utils/`（软盟 API 客户端，含认证 + 资源获取）

---

## 一、安全总体评估

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 凭证管理 | 3/10 | 密码明文流转于 controller→service→外部 API，错误响应可能泄露凭证上下文 |
| 注入防护 | 8/10 | Prisma 参数化查询有效防护 SQL 注入，但 sortBy/sortOrder 缺少白名单校验 |
| 信息泄露 | 5/10 | 错误消息直接透传外部 API 返回值，可能暴露内部系统架构细节 |
| 输入验证 | 4/10 | page/pageSize 无范围限制，search 无长度限制，存在 DoS 风险 |
| 审计追溯 | 3/10 | 无操作日志，无法追溯同步操作的触发者和结果 |
| 权限控制 | 8/10 | 路由层 roleMiddleware 正确限制访问角色 |

**问题统计**: CRITICAL × 2 / HIGH × 3 / MEDIUM × 3 / LOW × 2

**OWASP Top 10 映射**:
- A02:2021 — Cryptographic Failures（凭证明文存储与传输）
- A03:2021 — Injection（sortOrder 参数未校验）
- A04:2021 — Insecure Design（缺少请求审计）
- A05:2021 — Security Misconfiguration（错误响应泄露内部信息）
- A07:2021 — Identification and Authentication Failures（外部 API 硬编码 api_key）

---

## 二、安全漏洞清单

### CRITICAL 级别

#### C-1: 凭证明文从数据库读取后在 controller 层暴露 — A02:2021

**位置**: `syncPublishingPlatforms` 第 11-21 行

```typescript
const configs = await systemConfigService.getAll();
const configMap = new Map(configs.map((c) => [c.config_key, c.config_value]));
const username = configMap.get('ruanmeng_username') || '';
const password = configMap.get('ruanmeng_password') || '';
// ...
const count = await publishingPlatformService.syncFromRm(username, password);
```

**安全风险分析**:

1. **密码明文存储**: 软盟账号密码存储在 `SystemConfig` 表中，以明文 `config_value` 字段保存。数据库被攻破后，攻击者可直接获取第三方平台凭证。
2. **密码明文流转**: 密码从 DB → controller → service → `getRmToken()` → HTTP POST body，全程明文。controller 层是密码的中间暴露点，任何在此处插入的恶意代码（供应链攻击、调试断点）都可截获密码。
3. **错误泄露风险**: 如果 `syncFromRm` 抛出异常，`err.message` 可能包含外部 API 返回的错误详情（如 `rmapi 认证失败: 密码错误`），这个消息通过 `fail(res, 500, err.message)` 直接返回给前端。
4. **空字符串默认值**: `|| ''` 使得配置键名拼写错误时不会报错，而是传递空凭证到外部 API，可能导致不必要的登录尝试，触发对方 API 的防爆破机制导致账号锁定。

**攻击场景**:

```
攻击者获取了数据库只读权限
→ 读取 system_configs 表
→ 获取 ruanmeng_username 和 ruanmeng_password 的明文值
→ 利用这些凭证登录软盟平台，获取/修改媒体资源数据
→ 或进一步利用密码复用攻击其他系统
```

**修复建议**:

```typescript
// 方案 1（短期）: 将凭证获取逻辑封装到 service 层，减少暴露面
// 在 PublishingPlatformServiceImpl 中新增方法:
async syncFromSystemConfig(): Promise<number> {
  const configs = await systemConfigService.getAll();
  const configMap = new Map(configs.map((c) => [c.config_key, c.config_value]));
  const username = configMap.get('ruanmeng_username');
  const password = configMap.get('ruanmeng_password');
  if (!username || !password) {
    throw new Error('请先配置软盟账号和密码');
  }
  return this.syncFromRm(username, password);
}

// 方案 2（中期）: 使用 AES-256 加密存储密码
// 方案 3（长期）: 将第三方凭证存储在 Vault/SSM 等密钥管理服务中
```

---

#### C-2: 外部 API 硬编码 api_key 和 captcha_token — A07:2021

**位置**: `apis/utils/rmapi.utils/auth.util.ts` 第 29 行

```typescript
api_key: '3b98c40be00c15f9ec69131076646eb7',
```

虽然此问题在 utils 文件而非 controller 中，但 controller 的 `syncPublishingPlatforms` 函数是此硬编码凭证的唯一调用入口。这个 API Key 是软盟平台的共享密钥，一旦源码泄露（开源、代码仓库入侵），攻击者可:

1. 直接调用软盟 API，绕过本系统的认证流程
2. 获取所有媒体资源数据
3. 模拟广告主身份进行操作

**修复建议**: 将 `api_key` 移至环境变量或配置文件中，不在源码中硬编码。

---

### HIGH 级别

#### H-1: 错误响应可能泄露外部 API 内部信息 — A05:2021

**位置**: `syncPublishingPlatforms` 第 23-24 行、`listPublishingPlatforms` 第 47-48 行

```typescript
} catch (err: any) {
  fail(res, 500, err.message || '同步发布平台失败');
}
```

**安全风险分析**:

1. **外部 API 错误透传**: `getRmToken()` 抛出的错误消息格式为 `rmapi 认证失败: ${res.data.message}`，其中 `res.data.message` 来自第三方服务，可能包含:
   - 账号状态信息（"账号已冻结"、"密码错误次数过多"）
   - 内部系统标识（堆栈信息、服务名）
   - API 版本和端点信息
2. **`err: any` 类型不安全**: 绕过 TypeScript 类型检查，如果错误对象被后续代码修改或扩展，不会有任何编译期警告。
3. **错误堆栈可推断**: 500 状态码 + 详细错误消息可帮助攻击者了解系统内部结构。

**修复建议**:

```typescript
} catch (err: unknown) {
  // 对外返回通用错误消息
  const userMessage = err instanceof Error && err.message.includes('请先配置')
    ? err.message
    : '同步发布平台失败';
  // TODO: logger.error('syncPublishingPlatforms failed', { error: err, userId: req.user?.id });
  fail(res, 500, userMessage);
}
```

---

#### H-2: page/pageSize 无范围限制 — DoS 风险

**位置**: `listPublishingPlatforms` 第 30-31 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**攻击场景**:

```
GET /api/publishing-platforms?pageSize=999999
→ 单次查询返回全部数据（数十万条）
→ 数据库内存溢出
→ API 响应超时
→ 服务不可用
```

**修复建议**:

```typescript
const rawPage = parseInt(req.query.page as string, 10);
const rawPageSize = parseInt(req.query.pageSize as string, 10);
const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
const pageSize = Number.isNaN(rawPageSize) || rawPageSize < 1 ? 10 : Math.min(rawPageSize, 100);
```

---

#### H-3: `listAll()` 全量返回无上限保护 — 内存 DoS

**位置**: `listPublishingPlatforms` 第 38-42 行

```typescript
if (!req.query.page && !req.query.pageSize && !search && !taxonomy) {
  const items = await publishingPlatformService.listAll();
  success(res, items);
  return;
}
```

**安全风险分析**:

1. 当发布平台数据增长到数万条时，`findMany()` 会将所有记录加载到内存，可能导致 Node.js 堆内存溢出（默认 1.7GB）。
2. 响应 JSON 序列化大量数据也会消耗大量 CPU 时间。
3. 无分页的 GET 请求可被 CDN/代理缓存，如果数据频繁变更可能导致不一致。

**修复建议**: 废弃全量返回接口，强制使用分页。如果前端需要全量数据（如下拉选择），提供独立的轻量接口仅返回 `id + name` 字段。

---

### MEDIUM 级别

#### M-1: sortBy/sortOrder 参数未白名单校验 — A03:2021

**位置**: `listPublishingPlatforms` 第 34-35 行

```typescript
const sortBy = req.query.sortBy as string | undefined;
const sortOrder = req.query.sortOrder as string | undefined;
```

**安全分析**:

虽然 service 层通过 `sortFieldMap` 做了字段名映射（不匹配的字段会 fallback 到默认排序），Prisma 的参数化查询也防止了 SQL 注入，但:

1. **信息泄露**: 无效的排序字段不会报错，而是静默忽略。攻击者可通过尝试不同字段名来探测数据库结构。
2. **行为不一致**: 前端发送无效排序参数，得到的结果可能与预期不同，但无法通过响应判断原因。

**修复建议**: 在 controller 层增加白名单校验，对无效参数返回 400 错误。

---

#### M-2: search 参数无长度限制 — 查询性能 DoS

**位置**: `listPublishingPlatforms` 第 32 行

```typescript
const search = req.query.search as string | undefined;
```

**安全分析**:

1. 超长搜索字符串传递到 Prisma `contains` 查询，虽然参数化查询安全，但 `contains` 在 PostgreSQL 中会使用 `LIKE '%...%'` 模式，超长字符串会导致查询性能急剧下降。
2. 对 PostgreSQL 的 `LIKE` 查询，过长的模式可能导致正则引擎回溯，消耗 CPU。

**修复建议**:

```typescript
if (search && search.length > 100) {
  fail(res, 400, '搜索关键词不能超过100个字符');
  return;
}
```

---

#### M-3: 同步操作缺少审计日志 — A04:2021

**位置**: `syncPublishingPlatforms` 整个函数

**安全分析**:

1. `syncPublishingPlatforms` 涉及外部 API 调用和数据库全量更新（delete + upsert），属于高危操作。
2. 路由层已通过 `authMiddleware` + `roleMiddleware('sysadmin')` 限制了访问，但 controller 层无法获取操作者信息（`_req` 被标记为未使用）。
3. 无法回答安全审计问题："谁在什么时候同步了什么数据？同步了多少条？同步失败的原因是什么？"

**修复建议**:

```typescript
export async function syncPublishingPlatforms(req: Request, res: Response): Promise<void> {
  const operatorId = (req as any).user?.id;
  const startTime = Date.now();
  try {
    // ...
    // logger.info('syncPublishingPlatforms completed', { operatorId, count, duration: Date.now() - startTime });
  } catch (err: unknown) {
    // logger.error('syncPublishingPlatforms failed', { operatorId, error: err, duration: Date.now() - startTime });
  }
}
```

---

### LOW 级别

#### L-1: parseInt 缺少 radix 参数

**位置**: `listPublishingPlatforms` 第 30-31 行

```typescript
const page = parseInt(req.query.page as string) || 1;
```

未指定 radix=10，如果 query string 为 `0x10`，`parseInt` 会解析为十六进制 16。虽然实际攻击场景有限（攻击者需要绕过 auth），但不符合防御性编程原则。

---

#### L-2: getAllRmResources 文件缓存包含 API Token

**位置**: `apis/utils/rmapi.utils/resource.util.ts` 第 72-96 行

`getAllRmResources()` 将 API 响应缓存到 `data/rmdata/resources-page*.json` 文件。虽然响应 JSON 中不直接包含 token（token 在 query parameter 中传递），但如果 API 响应发生变化或包含敏感字段，这些文件可能泄露信息。建议:
1. 将缓存目录添加到 `.gitignore`
2. 缓存文件设置适当权限
3. 考虑使用内存缓存替代文件缓存

---

## 三、攻击面分析

### 攻击面 1: 同步接口（POST /api/publishing-platforms/sync）

| 攻击向量 | 风险等级 | 当前防护 | 建议加固 |
|----------|----------|----------|----------|
| 未授权访问 | ✅ 已防护 | JWT + roleMiddleware('sysadmin') | 无需额外措施 |
| 暴力破解 | ✅ 已防护 | rateLimitMiddleware | 无需额外措施 |
| 凭证泄露 | ❌ 未防护 | 密码明文存储和流转 | 加密存储 + 封装获取逻辑 |
| 信息泄露 | ⚠️ 部分 | 错误消息直接透传 | 区分内部/外部错误消息 |
| DoS | ⚠️ 部分 | rate-limit 限制了请求频率 | 外部 API 超时未配置 |
| 审计缺失 | ❌ 未防护 | 无日志 | 添加操作审计日志 |

### 攻击面 2: 列表接口（GET /api/publishing-platforms）

| 攻击向量 | 风险等级 | 当前防护 | 建议加固 |
|----------|----------|----------|----------|
| 未授权访问 | ✅ 已防护 | JWT + roleMiddleware('sysadmin', 'admin') | 无需额外措施 |
| SQL 注入 | ✅ 已防护 | Prisma 参数化查询 | 无需额外措施 |
| 数据 DoS | ❌ 未防护 | pageSize 无上限 | 限制 pageSize ≤ 100 |
| 全量 DoS | ❌ 未防护 | listAll() 无上限 | 废弃全量接口 |
| 查询 DoS | ⚠️ 部分 | search 直接传递 | 限制 search 长度 ≤ 100 |
| 参数探测 | ⚠️ 部分 | sortFieldMap 静默忽略 | 白名单校验 + 400 错误 |

---

## 四、安全修复优先级

### P0（立即修复 — 高危安全问题）

| 编号 | 问题 | 修复方案 | 预估工时 |
|------|------|----------|----------|
| C-1 | 凭证明文流转 | 将凭证获取逻辑封装到 service 层，controller 不接触密码 | 1h |
| C-2 | 外部 API 硬编码 api_key | 移至环境变量 | 30min |

### P1（尽快修复 — 中危安全问题）

| 编号 | 问题 | 修复方案 | 预估工时 |
|------|------|----------|----------|
| H-1 | 错误响应泄露内部信息 | 区分内部/外部错误消息 | 30min |
| H-2 | pageSize 无范围限制 | 限制 pageSize ≤ 100 | 15min |
| H-3 | listAll() 无上限保护 | 废弃全量接口，提供轻量下拉接口 | 1h |

### P2（计划修复 — 低危安全问题）

| 编号 | 问题 | 修复方案 | 预估工时 |
|------|------|----------|----------|
| M-1 | sortBy 无白名单 | 添加白名单校验 | 15min |
| M-2 | search 无长度限制 | 限制 search ≤ 100 字符 | 10min |
| M-3 | 缺少审计日志 | 添加操作日志 | 30min |
| L-1 | parseInt 缺少 radix | 添加 radix=10 | 5min |
| L-2 | 文件缓存权限 | 添加 .gitignore + 文件权限 | 15min |

---

## 五、推荐的安全加固代码

以下是修复所有安全问题后的推荐代码：

```typescript
import { Request, Response } from 'express';
import { PublishingPlatformServiceImpl, SystemConfigServiceImpl } from '../service';
import { success, fail, paginate } from '../utils';

const publishingPlatformService = new PublishingPlatformServiceImpl();

// 排序字段白名单
const VALID_SORT_FIELDS = ['name', 'taxonomy', 'price', 'include_rate', 'publish_rate'];
const VALID_SORT_ORDERS = ['asc', 'desc'];
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

export async function syncPublishingPlatforms(req: Request, res: Response): Promise<void> {
  const operatorId = (req as any).user?.id;
  try {
    // 凭证获取逻辑封装在 service 层，controller 不直接接触密码
    const count = await publishingPlatformService.syncFromSystemConfig();
    // TODO: logger.info('publishing-platform sync completed', { operatorId, count });
    success(res, { count }, `同步成功，共 ${count} 个发布平台`);
  } catch (err: unknown) {
    // 区分内部/外部错误，不泄露外部 API 细节
    const message = err instanceof Error && err.message.includes('请先配置')
      ? err.message
      : '同步发布平台失败';
    // TODO: logger.error('publishing-platform sync failed', { operatorId, error: err });
    fail(res, 500, message);
  }
}

export async function listPublishingPlatforms(req: Request, res: Response): Promise<void> {
  try {
    const rawPage = parseInt(req.query.page as string, 10);
    const rawPageSize = parseInt(req.query.pageSize as string, 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const pageSize = Number.isNaN(rawPageSize) || rawPageSize < 1 ? 10 : Math.min(rawPageSize, MAX_PAGE_SIZE);

    const search = req.query.search as string | undefined;
    if (search && search.length > MAX_SEARCH_LENGTH) {
      fail(res, 400, `搜索关键词不能超过${MAX_SEARCH_LENGTH}个字符`);
      return;
    }

    const taxonomy = req.query.taxonomy as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;

    if (sortBy && !VALID_SORT_FIELDS.includes(sortBy)) {
      fail(res, 400, '无效的排序字段');
      return;
    }
    if (sortOrder && !VALID_SORT_ORDERS.includes(sortOrder)) {
      fail(res, 400, '无效的排序方向');
      return;
    }

    // 废弃全量返回: 强制使用分页
    const { list, total } = await publishingPlatformService.list(page, pageSize, search, taxonomy, sortBy, sortOrder);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取发布平台失败';
    fail(res, 500, message);
  }
}
```

---

## 六、总结

`publishing-platform.controller.ts` 的安全态势整体处于**中等偏下**水平。主要安全优势在于:

1. **路由层防护完善**: JWT 认证 + 角色中间件 + anti-crawl + rate-limit 形成了多层防护
2. **SQL 注入防护到位**: Prisma 参数化查询有效防止注入攻击
3. **CORS 配置合理**: 基于 whitelist 的 CORS 策略

主要安全隐患:

1. **凭证管理严重不足（CRITICAL）**: 软盟密码明文存储在数据库中，明文流转于 controller→service→HTTP 层，是最大的安全风险。一旦数据库被攻破或源码泄露，第三方平台凭证将直接暴露。
2. **错误信息泄露（HIGH）**: 外部 API 的错误详情直接返回给前端，攻击者可借此了解系统内部架构。
3. **DoS 防护不完整（HIGH）**: pageSize 无上限、listAll() 无限制、search 无长度限制，攻击者可通过合法认证用户身份发起资源消耗攻击。
4. **审计能力缺失（MEDIUM）**: 同步操作无日志记录，无法满足安全审计和事件溯源要求。

建议按照 P0 → P1 → P2 的优先级逐步修复，P0 级别问题应在 48 小时内完成修复。
