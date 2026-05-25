# apis/controller/publishing-platform.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-25
**评审角色**: 代码安全专家（OWASP Top 10 · 注入攻击 · 认证授权 · 数据泄露 · 输入验证 · 业务逻辑安全）
**文件路径**: `apis/controller/publishing-platform.controller.ts`
**代码行数**: 71 行（2 个导出函数 + 常量定义 + 模块级服务实例）
**关联路由**:
- `POST /api/publishing-platforms/sync` — 同步软盟发布平台（仅 sysadmin）
- `GET /api/publishing-platforms` — 列表查询（sysadmin + admin）
**关联服务**: `apis/service/impl/publishing-platform.service.impl.ts`
**关联中间件**: `authMiddleware`（JWT 认证）+ `roleMiddleware`（角色鉴权）
**关联工具**: `apis/utils/rmapi.utils/`（外部 API 调用）、`apis/utils/response.util.ts`

**安全中间件链**: `helmet` → `cors` → `antiCrawlMiddleware` → `rateLimitMiddleware` → `authMiddleware` → `roleMiddleware`

---

## 一、总体安全评估

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 注入攻击防护 | 9/10 | Prisma 参数化查询有效防护 SQL 注入，sortBy/sortOrder 白名单到位 |
| 认证与授权 | 8/10 | JWT + roleMiddleware 双重保护，sync 仅限 sysadmin，list 限 sysadmin + admin |
| 输入验证 | 8/10 | page/pageSize 有 NaN + 范围校验，search 有长度限制，sortBy/sortOrder 白名单 |
| 数据泄露防护 | 7/10 | 凭证获取已封装至 service 层，但明文存储问题仍在；错误处理已区分已知/未知 |
| 业务逻辑安全 | 6/10 | sync 操作无并发控制，listAll 全量返回无上限 |
| 错误处理安全 | 8/10 | 已使用 `err: unknown` 类型安全，catch 中区分已知/未知错误 |
| 外部 API 安全 | 5/10 | 外部 API 调用缺少数据校验、缓存无过期机制 |
| 依赖安全 | 8/10 | Prisma + Express + Axios 均为成熟框架 |

**问题统计**: HIGH × 2 / MEDIUM × 5 / LOW × 3

> **与 v1 评审对比**: C-1 ✅已修复（凭证获取封装至 service 层） / C-2 ✅已修复（api_key 移至 RM_API_KEY 环境变量） / H-1 ✅已修复（err: unknown + 区分内部/外部错误） / H-2 ✅已修复（pageSize ≤ 100） / H-3 ✅已修复（标记 @deprecated） / M-1 ✅已修复（白名单校验） / M-2 ✅已修复（search ≤ 100） / M-3 ✅已修复（logger 审计日志） / L-1 ✅已修复（radix=10） / L-2 ✅已修复（data/rmdata/ 加入 .gitignore）

**OWASP API Security Top 10 映射**:
- API4:2023 — Unrestricted Resource Consumption（sync 无并发控制、listAll 无上限）
- API8:2023 — Security Misconfiguration（凭证明文存储于 DB）
- API9:2023 — Improper Inventory Management（deprecated API 仍可用）
- API10:2023 — Unsafe Consumption of APIs（外部 API 数据未校验直接入库）

---

## 二、安全问题清单

### HIGH 级别

#### H-1: syncFromRm 凭证明文链路 — 凭证泄露风险

**位置**: service impl 第 16-27 行 → rmapi auth.util.ts 第 22-41 行
**威胁类型**: Sensitive Data Exposure / Credential Leakage
**OWASP 分类**: API8:2023 — Security Misconfiguration

**问题链路**:

```
systemConfig 表 (plaintext)
  → service.syncFromSystemConfig() 读取 configMap
    → configMap.get('ruanmeng_password')  // 明文密码
      → syncFromRm(username, password)    // 明文传递给方法参数
        → getRmToken({ mobile, password })  // 明文传递给外部 API
          → axios.post(..., { password })    // HTTP body 明文传输
```

**安全风险**:

1. **数据库明文存储**: 软盟账号密码以明文存储在 `systemConfig` 表中。数据库被攻破后，攻击者可直接获取第三方平台凭证。
2. **内存驻留**: `syncFromSystemConfig()` 将密码读取到内存变量中，内存转储或调试断点可截获。
3. **密码复用风险**: 若软盟密码与内部系统密码相同，数据库泄露可导致横向渗透。
4. **改善**: controller 层已不再直接接触密码（v1 的 C-1 已修复），但 service 层内密码仍全程明文。

**攻击场景**:

```
攻击者获取了数据库只读权限（如 SQL 注入、备份泄露）
→ 读取 system_configs 表中 ruanmeng_username / ruanmeng_password
→ 利用凭证登录软盟平台，获取/修改媒体资源数据
→ 若密码复用，进一步渗透其他系统
```

**修复建议**:

```typescript
// 短期：确认日志中绝不包含 password 字段（已做到）
// 中期：对 systemConfig 中的敏感配置项 AES-256 加密存储
//   - 加密 key 从环境变量读取，不入库不入源码
//   - syncFromSystemConfig() 中解密后使用
// 长期：引入 Secrets Manager / Vault 管理外部 API 凭证
```

---

#### H-2: sync 操作无并发控制 — 资源滥用和数据破坏风险

**位置**: controller 第 14-28 行，路由 `POST /api/publishing-platforms/sync`
**威胁类型**: Unrestricted Resource Consumption / Race Condition
**OWASP 分类**: API4:2023 — Unrestricted Resource Consumption

**问题分析**:

1. **无并发锁**: 多个 sysadmin 可同时触发 `POST /sync`，service 层执行"全量删除 + 重建"（`deleteMany` + `upsert` 批量操作），并发执行会导致：
   - 多次调用外部 API（浪费配额，触发限流）
   - 交替删除和 upsert，数据出现中间状态不一致
   - `$transaction` 批量操作之间互相冲突，甚至死锁

2. **无频率限制**: 虽然全局有 rate-limit 中间件，但 sync 重量级操作（外部 API + 大批量 DB 写入）应单独限制（如每分钟仅允许 1 次）。

3. **同步不可逆**: service 层先 `deleteMany` 删除远程不存在的记录，再 `upsert` 新记录。如果 sync 在执行中失败（如外部 API 超时），已删除的数据无法恢复。

**攻击场景**:

```
攻击者: 已获取 sysadmin 账号

步骤:
1. 快速连续发送 10 次 POST /api/publishing-platforms/sync
2. 10 个请求同时触发 syncFromSystemConfig
3. 每个请求独立执行 deleteMany + upsert
4. 数据库在 10 个并发事务下出现死锁或数据不一致
5. 外部 API 被 10 次并发调用，可能触发限流或封禁

影响:
- 数据库性能骤降，影响其他业务
- 外部 API 限流或封禁账号
- 数据丢失（删除已完成但 upsert 未完成）
```

**修复建议**:

```typescript
// 方案 1: 简单互斥锁（单实例部署适用）
let syncLock = false;

export async function syncPublishingPlatforms(req: Request, res: Response): Promise<void> {
  if (syncLock) {
    fail(res, 409, '同步操作正在进行中，请稍后重试');
    return;
  }
  syncLock = true;
  try {
    const count = await publishingPlatformService.syncFromSystemConfig();
    success(res, { count }, `同步成功，共 ${count} 个发布平台`);
  } finally {
    syncLock = false;
  }
}

// 方案 2: 路由层添加专用频率限制
import rateLimit from 'express-rate-limit';
const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { code: 429, message: '同步操作每分钟仅允许一次' }
});
router.post('/sync', authMiddleware, roleMiddleware(ROLES.SYSADMIN), syncLimiter, ctrl.syncPublishingPlatforms);
```

---

### MEDIUM 级别

#### M-1: listAll() 全量查询无上限 — DoS 向量

**位置**: controller 第 36-39 行

```typescript
/** @deprecated 全量返回接口，前端应迁移到分页查询。预计移除时间: v2.0 */
if (!req.query.page && !req.query.pageSize && !search && !taxonomy) {
  const items = await publishingPlatformService.listAll();
  success(res, items);
  return;
}
```

**分析**:

1. `listAll()` 使用 `findMany` 不带 `take` 限制，返回全部记录。随数据增长可导致内存溢出。
2. 虽已标记 `@deprecated`，但仍可被攻击者利用：`GET /api/publishing-platforms`（无参数）即可触发全量加载。
3. 攻击者可批量拉取全部发布平台资源数据（商业资产）。

**修复建议**:

```typescript
// 短期: 添加数据量警告
if (items.length > 1000) {
  logger.warn('publishing-platform.listAll.large-result', { count: items.length });
}
// 长期: v2.0 移除全量返回，提供轻量下拉接口仅返回 id + name
```

---

#### M-2: 外部 API 响应数据未校验直接入库 — 数据完整性风险

**位置**: service impl 第 59-84 行（upsert 逻辑）
**威胁类型**: Unsafe Consumption of APIs
**OWASP 分类**: API10:2023 — Unsafe Consumption of APIs

```typescript
// 外部 API 返回的原始数据直接映射到 Prisma upsert
prisma.publishingPlatform.upsert({
  where: { rmResourceId: r.id },
  create: {
    rmResourceId: r.id,       // r.id 类型未校验
    name: r.name,             // 可能为空或超长
    taxonomy: r.taxonomy,     // 同上
    price: r.price,           // 可能为负数或非数字
    remark: r.remark || null, // 未清洗
    includeRate: r.include_rate ?? 0,
    publishRate: r.publish_rate ?? 0,
  },
  // update 类似
}),
```

**分析**:

1. 外部 API (`rmapi.ruan.net`) 响应数据未经验证直接写入数据库。
2. 如果外部 API 被入侵或返回恶意数据（超长字符串、HTML/JS 代码、负数价格），会直接污染本地数据。
3. 特别风险：`r.name` 和 `r.taxonomy` 可能包含 HTML/JS 代码，如果前端未做转义，可能导致存储型 XSS。
4. `r.id`（rmResourceId）未校验是否为合法正整数。

**修复建议**:

```typescript
function sanitizeResource(r: RmResourceItem) {
  return {
    id: typeof r.id === 'number' && r.id > 0 ? r.id : 0,
    name: typeof r.name === 'string' ? r.name.slice(0, 200).trim() : '',
    taxonomy: typeof r.taxonomy === 'string' ? r.taxonomy.slice(0, 100).trim() : '',
    price: typeof r.price === 'number' && r.price >= 0 ? r.price : 0,
    remark: typeof r.remark === 'string' ? r.remark.slice(0, 500).trim() : null,
    includeRate: typeof r.include_rate === 'number' ? Math.max(0, Math.min(100, r.include_rate)) : 0,
    publishRate: typeof r.publish_rate === 'number' ? Math.max(0, Math.min(100, r.publish_rate)) : 0,
  };
}
```

---

#### M-3: 外部 API 缓存文件无过期机制 — 缓存投毒风险

**位置**: rmapi utils `resource.util.ts` 第 72-98 行
**威胁类型**: Cache Poisoning / Stale Data

**分析**:

1. `getAllRmResources()` 将 API 响应缓存到 `data/rmdata/resources-page*.json`，永不过期。
2. 缓存文件无完整性校验（HMAC），若攻击者能写入该目录，可篡改缓存数据。
3. sync 操作在缓存文件存在时直接读取旧缓存，不请求外部 API，导致数据可能过时。
4. 攻击者修改缓存文件 → sysadmin 触发 sync → 篡改数据入库。

**修复建议**:

```typescript
// 1. sync 操作应绕过缓存，强制实时请求
// 2. 或为缓存添加 TTL
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟
if (fs.existsSync(outPath)) {
  const stat = fs.statSync(outPath);
  if (Date.now() - stat.mtimeMs > CACHE_TTL) {
    fs.unlinkSync(outPath); // 过期删除
  }
}
```

---

#### M-4: search 参数仅限长度未处理空值 — 查询准确性

**位置**: controller 第 47-50 行

```typescript
if (search && search.length > MAX_SEARCH_LENGTH) {
  fail(res, 400, `搜索关键词不能超过${MAX_SEARCH_LENGTH}个字符`);
  return;
}
```

**分析**:

1. 纯空格字符串 `search='   '` 通过长度校验，传入 `contains` 搜索可能返回意外结果。
2. 虽 Prisma 参数化查询消除了注入风险，但空格搜索消耗不必要的数据库资源。

**修复建议**:

```typescript
const trimmedSearch = search?.trim() || undefined;
if (trimmedSearch && trimmedSearch.length > MAX_SEARCH_LENGTH) {
  fail(res, 400, `搜索关键词不能超过${MAX_SEARCH_LENGTH}个字符`);
  return;
}
```

---

#### M-5: taxonomy 参数无格式校验 — 查询行为不可控

**位置**: controller 第 33 行 → service impl 第 104-106 行

```typescript
const taxonomy = req.query.taxonomy as string | undefined;
// 直接传入 Prisma where 条件
if (taxonomy) { where.taxonomy = taxonomy; }
```

**分析**:

1. 与 `sortBy`（有白名单 `VALID_SORT_FIELDS`）和 `sortOrder`（有白名单 `VALID_SORT_ORDERS`）不同，`taxonomy` 无任何校验。
2. 虽不构成 SQL 注入（Prisma 参数化），但攻击者可传入任意字符串探测数据。
3. taxonomy 值来源于外部 API，动态变化，白名单管理较困难。

**修复建议**:

```typescript
if (taxonomy && !/^[一-龥a-zA-Z0-9_\-\s]{1,50}$/.test(taxonomy)) {
  fail(res, 400, '无效的分类参数');
  return;
}
```

---

### LOW 级别

#### L-1: query 参数 `as string` 断言不安全 — 数组注入

**位置**: controller 第 33、42-43、52-53 行

```typescript
const search = req.query.search as string | undefined;
const rawPage = parseInt(req.query.page as string, 10);
```

**分析**: `req.query.page` 实际类型为 `string | string[] | qs.ParsedQs | undefined`。攻击者发送 `?page[]=1&page[]=2`，`req.query.page` 为数组，`parseInt(['1','2'] as string, 10)` 返回 `NaN`。当前代码已有 `Number.isNaN` 处理回退默认值，无实际危害，但 `as string` 断言不够严谨。

**修复建议**:

```typescript
const rawPage = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : NaN;
```

---

#### L-2: list 操作缺少审计日志

**位置**: `listPublishingPlatforms` 函数

**分析**: `syncPublishingPlatforms` 已有完善的审计日志（含操作者 userId、username、ip），但 `listPublishingPlatforms` 的 catch 块中无 `logger.error`。list 查询失败时无法通过日志追踪问题。

**修复建议**: 在 list 的 catch 块中添加 `logger.error('publishing-platform.list.failed', ...)`。

---

#### L-3: 错误消息字符串匹配判断错误类型 — 脆弱的错误分类

**位置**: controller 第 22-27 行

```typescript
const message = err instanceof Error && err.message.includes('请先配置')
  ? err.message : '同步发布平台失败';
fail(res, message.includes('请先配置') ? 400 : 500, message);
```

**分析**: 通过 `err.message.includes('请先配置')` 区分 400/500 是脆弱的。如果 service 层修改了错误消息文本，controller 的判断逻辑会静默失效。当前做法有效但缺乏类型安全保证。

**修复建议**: 引入自定义错误类型 `BusinessError`（含 statusCode 属性）替代字符串匹配。

---

## 三、OWASP API Security Top 10 对照

| OWASP 编号 | 威胁名称 | 是否存在 | 关联问题 |
|-------------|----------|----------|----------|
| API1:2023 | Broken Object Level Authorization | 否 | 数据不关联用户/公司，无水平越权风险 |
| API2:2023 | Broken Authentication | 否 | JWT 中间件保障 |
| API3:2023 | Broken Object Property Level Authorization | 否 | 返回数据经过 mapPublishingPlatform 映射 |
| API4:2023 | Unrestricted Resource Consumption | **是** | H-2: sync 无并发控制; M-1: listAll 无上限 |
| API5:2023 | Broken Function Level Authorization | 否 | roleMiddleware 正确限制 sync=仅 sysadmin |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | **是** | H-2: sync 可被重复触发 |
| API7:2023 | Server Side Request Forgery | 否 | 外部 API URL 硬编码，不接受用户输入 |
| API8:2023 | Security Misconfiguration | **是** | H-1: 凭证明文存储 |
| API9:2023 | Improper Inventory Management | **是** | M-1: deprecated API 仍可用 |
| API10:2023 | Unsafe Consumption of APIs | **是** | M-2: 外部 API 数据未校验 |

---

## 四、攻击面分析

### 攻击面 1: 并发同步导致数据丢失

```
攻击者: 已获取 sysadmin 权限
前置条件: 无额外条件

步骤:
1. 使用脚本同时发送 5 个 POST /api/publishing-platforms/sync 请求
2. 5 个请求各自独立执行 syncFromSystemConfig → syncFromRm
3. 请求 A 执行 deleteMany 删除 N 条记录
4. 请求 B 同时执行 deleteMany 尝试删除相同记录
5. 请求 A 开始 upsert，请求 B 的 deleteMany 与 A 的 upsert 交叉执行
6. 数据库出现不一致状态

影响:
- 发布平台数据丢失或重复
- 数据库性能骤降（多个大事务并发）
- 外部 API 被短时间多次调用，触发限流
```

### 攻击面 2: 缓存投毒

```
攻击者: 能写入服务器 data/rmdata/ 目录的内部人员或通过文件上传漏洞

步骤:
1. 修改 data/rmdata/resources-page1.json 中的数据
2. 等待 sysadmin 触发 POST /sync
3. sync 操作读取缓存文件（已存在，不重新请求外部 API）
4. 篡改的数据被 upsert 到数据库

影响:
- 发布平台名称、价格等商业数据被篡改
- 影响业务决策（如报价信息）
```

### 攻击面 3: 全量数据拉取

```
攻击者: 任意 admin 角色用户

步骤:
1. GET /api/publishing-platforms （不带分页参数）
2. 返回全部发布平台数据（无限制）
3. 可用于数据爬取或竞争对手信息收集

影响:
- 发布平台资源为商业资产，泄露可造成商业损失
- 大量数据序列化消耗内存
```

---

## 五、安全修复优先级

| 优先级 | 编号 | 修复内容 | 工作量 | 安全收益 |
|--------|------|----------|--------|----------|
| **P1** | H-1 | 敏感配置 AES-256 加密存储 | 中 | 消除凭证明文泄露风险 |
| **P1** | H-2 | sync 操作添加互斥锁 + 频率限制 | 小 | 防止并发数据破坏 |
| P2 | M-1 | listAll 添加上限或强制迁移到分页 | 小 | 防止 DoS |
| P2 | M-2 | 外部 API 数据入库前清洗验证 | 中 | 防止数据污染 |
| P2 | M-3 | 缓存机制添加 TTL + sync 绕过缓存 | 中 | 防止缓存投毒 |
| P3 | M-4 | search 参数 trim + 空值处理 | 小 | 查询准确性 |
| P3 | M-5 | taxonomy 格式校验 | 小 | 查询安全 |
| P4 | L-1 | query 参数类型安全检查 | 小 | 输入安全 |
| P4 | L-2 | list 操作添加审计日志 | 小 | 安全可追溯性 |
| P4 | L-3 | 引入自定义错误类型 | 中 | 错误分类安全 |

---

## 六、与同项目其他 Controller 的安全对比

| 安全特征 | publishing-platform | publishing-schedule | company |
|----------|-------------------|---------------------|---------|
| 认证保护 | auth + roleMiddleware | auth + roleMiddleware | auth + roleMiddleware |
| 水平越权风险 | **无**（数据不关联用户/公司） | **有**（IDOR） | **有**（IDOR） |
| 输入验证 | sortBy/sortOrder 白名单 + page/pageSize 范围 + search 长度 | 缺少 page/pageSize 范围 | 基本验证 |
| 错误类型安全 | `err: unknown` ✅ | `err: any` ❌ | `err: unknown` ✅ |
| 审计日志 | sync 有（含操作者信息），list 无 | 无 | 部分有 |
| 外部 API 调用 | 有（rmapi），缺少数据验证 | 无 | 无 |
| 并发控制 | **无**（sync 可并发） | 无 | 无 |
| deprecated API | listAll 全量返回（v2.0 移除） | 无 | 无 |
| 接口类型声明 | `IPublishingPlatformService` ✅ | 无 | 无 |

**关键发现**: `publishing-platform.controller.ts` 在多个安全维度优于同项目文件：
- 已使用 `err: unknown`（vs publishing-schedule 的 `err: any`）
- 已有 sortBy/sortOrder 白名单 + page/pageSize 范围限制 + search 长度限制
- 已有 sync 操作审计日志
- 已将接口类型声明为 `IPublishingPlatformService`
- 不存在水平越权风险（数据无用户/公司归属）

**主要剩余风险**集中在 **外部 API 数据链路**（凭证明文存储、数据未校验、缓存投毒）和 **同步操作并发安全**。

---

## 七、总结

`publishing-platform.controller.ts` 是项目中安全性较好的 controller 之一。v1 评审发现的 10 个问题已全部修复：

| v1 问题 | 修复状态 | 当前代码证据 |
|---------|----------|-------------|
| C-1 凭证获取暴露在 controller | ✅ 已修复 | `syncFromSystemConfig()` 封装至 service 层 |
| C-2 api_key 硬编码 | ✅ 已修复 | `process.env.RM_API_KEY` 从环境变量读取 |
| H-1 错误响应泄露 | ✅ 已修复 | `err: unknown` + 区分已知/未知错误消息 |
| H-2 pageSize 无上限 | ✅ 已修复 | `Math.min(rawPageSize, MAX_PAGE_SIZE)` |
| H-3 listAll 无限制 | ✅ 部分修复 | 标记 `@deprecated`，待 v2.0 移除 |
| M-1 sortBy 无白名单 | ✅ 已修复 | `VALID_SORT_FIELDS` 白名单校验 |
| M-2 search 无长度限制 | ✅ 已修复 | `MAX_SEARCH_LENGTH = 100` |
| M-3 缺少审计日志 | ✅ 已修复 | `logger.info/error` 含 operator 信息 |
| L-1 parseInt 无 radix | ✅ 已修复 | `parseInt(x, 10)` |
| L-2 缓存文件入 git | ✅ 已修复 | `data/rmdata/` 加入 `.gitignore` |

**当前 2 个 HIGH 级别新问题**:

1. **H-1 凭证明文链路**: 虽然 controller 不再直接接触密码，但 systemConfig 表中的密码仍为明文存储，service 层内部全程明文传递。建议优先引入加密存储。
2. **H-2 sync 无并发控制**: sysadmin 可并发触发同步操作，导致数据不一致和外部 API 滥用。建议添加互斥锁。

MEDIUM 级别问题（外部 API 数据未校验 M-2、缓存无过期 M-3、listAll 无上限 M-1）建议在下一个迭代中处理。
