# apis/controller/system-config.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 + API 安全 + 输入验证 + 信息泄露 + 权限控制 + 密码安全）
**文件路径**: `apis/controller/system-config.controller.ts`
**代码行数**: 47 行（2 个导出函数 + 1 个模块级常量 + 1 个模块级服务实例）
**关联文件**: `apis/service/impl/system-config.service.impl.ts`, `apis/utils/response.util.ts`, `apis/map/index.ts:57-65`, `apis/entity/system-config.entity.ts`, `apis/app.ts:137-138`
**安全评级**: ⚠️ HIGH（高风险 — GET 接口明文暴露密码，输入验证薄弱，无审计日志）

---

## 一、安全评价总览

从代码安全专家视角审视，`system-config.controller.ts` 的整体安全态势为**高风险**。路由层已通过 `authMiddleware + roleMiddleware('sysadmin')` 限制仅系统管理员可访问（见 `app.ts:137-138`），Prisma ORM 天然防止 SQL 注入。白名单机制（`ALLOWED_CONFIG_KEYS`）是良好的纵深防御实践，防止任意配置项被篡改。

但该文件存在以下严重安全隐患：

| OWASP 分类 | 安全风险 | 严重级别 | 状态 |
|------------|----------|----------|------|
| A02:2021 — 加密机制失败 | GET 接口明文返回 `yishangshu_password`，密码未脱敏 | CRITICAL | ❌ 未修复 |
| A03:2021 — 注入 | 输入验证薄弱，缺少类型/格式/长度校验，未使用 Zod | HIGH | ❌ 未修复 |
| A09:2021 — 安全日志与监控不足 | 配置变更无审计日志，500 错误被静默吞掉 | HIGH | ❌ 未修复 |
| A01:2021 — 失效的访问控制 | 错误消息泄露白名单配置项信息 | MEDIUM | ❌ 未修复 |
| A04:2021 — 不安全的设计 | 白名单硬编码在控制器中，敏感值无分层保护 | MEDIUM | ❌ 未修复 |
| A08:2021 — 软件和数据完整性 | `batchUpdate` 接收完整 `req.body` 而非已验证数据 | LOW | ⚠️ 防御不足 |
| A05:2021 — 安全配置错误 | `catch (_err: any)` 使用 `any` 类型，错误被完全忽略 | LOW | ⚠️ 防御不足 |

---

## 二、安全漏洞详情

### SEC-C-01: GET 接口明文返回密码 — 敏感数据泄露（OWASP A02）

**严重级别**: CRITICAL
**位置**: 第 13-20 行（`getSystemConfigs` 函数）
**OWASP 分类**: A02:2021 — Cryptographic Failures
**CVSS 3.1 评分**: 7.5（High）

```typescript
export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();  // ❌ 返回所有配置的明文值
    success(res, items);                                // ❌ 包含 yishangshu_password 明文
  } catch (_err: any) {
    fail(res, 500, '获取系统配置失败');
  }
}
```

**问题分析**:

1. `ALLOWED_CONFIG_KEYS` 中包含 `yishangshu_password`，这是一个密码配置项
2. `systemConfigService.getAll()` 通过 `mapSystemConfig`（`apis/map/index.ts:57-65`）直接返回 `configValue` 原始值
3. 同项目的 `mapLlmModel`（`apis/map/index.ts:49`）已对 `api_key` 做了脱敏处理：
   ```typescript
   api_key: prismaLlmModel.apiKey
     ? `${prismaLlmModel.apiKey.slice(0, 4)}****${prismaLlmModel.apiKey.slice(-4)}`
     : '',
   ```
4. 但 `mapSystemConfig` **未做任何脱敏**，密码明文通过 API 返回

**攻击场景分析**:

```
即使只有 sysadmin 角色可以访问，仍存在以下风险：
1. 浏览器开发者工具中 JWT token 被窃取 → 攻击者获取明文密码
2. 前端日志/错误追踪系统意外记录响应内容 → 密码泄露到日志平台
3. 中间人攻击（如未强制 HTTPS）→ 密码在网络传输中暴露
4. 浏览器缓存/历史记录中保存响应 → 密码在本地暴露
5. 前端 XSS 漏洞 → 攻击者通过 JS 读取 API 响应中的密码
```

**影响范围**:
- 密码一旦泄露，攻击者可直接登录关联系统（亿商数平台）
- 无需任何额外利用链，单点泄露即可造成直接损害
- 密码泄露后难以追溯（无审计日志，见 SEC-H-03）

**修复建议**:

方案 A — 在 `mapSystemConfig` 中脱敏（推荐，与 `mapLlmModel` 一致）：

```typescript
// apis/constants/sensitive-keys.ts
export const SENSITIVE_CONFIG_KEYS = new Set([
  'yishangshu_password',
]);

// apis/map/index.ts
import { SENSITIVE_CONFIG_KEYS } from '../constants/sensitive-keys';

export function mapSystemConfig(prismaConfig: any, maskSensitive = true): SystemConfig {
  const value = prismaConfig.configValue;
  return {
    id: prismaConfig.id,
    config_key: prismaConfig.configKey,
    config_value: maskSensitive && SENSITIVE_CONFIG_KEYS.has(prismaConfig.configKey)
      ? `${value.slice(0, 2)}****`
      : value,
    created_at: prismaConfig.createdAt,
    updated_at: prismaConfig.updatedAt,
  };
}
```

方案 B — 在控制器层过滤（快速修复）：

```typescript
export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();
    const sanitized = items.map(item => ({
      ...item,
      config_value: item.config_key === 'yishangshu_password'
        ? '******'
        : item.config_value,
    }));
    success(res, sanitized);
  } catch (error: unknown) {
    fail(res, 500, '获取系统配置失败');
  }
}
```

---

### SEC-H-01: 输入验证薄弱 — 缺少类型/格式/长度校验（OWASP A03）

**严重级别**: HIGH
**位置**: 第 22-45 行（`updateSystemConfigs` 函数）
**OWASP 分类**: A03:2021 — Injection

```typescript
const { configs } = req.body;                          // ❌ req.body 是 any
if (!Array.isArray(configs) || configs.length === 0) { /* ... */ }

for (const c of configs) {
  if (!c.config_key || c.config_value === undefined) { /* ... */ }  // ❌ 仅检查存在性
  if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) { /* ... */ }    // ✅ 白名单检查
}
```

**问题分析**:

1. **类型不安全** — `req.body` 类型为 `any`，`configs` 元素也是 `any`，TypeScript 编译器无法捕获类型错误
2. **未验证 `config_key` 类型** — 如果传入 `{ config_key: 123, config_value: "x" }`，`!c.config_key` 为 `false`（123 是 truthy），白名单 `includes(123)` 返回 `false`，虽然最终会被拦截，但中间逻辑依赖隐式类型转换
3. **未验证 `config_value` 格式** — 对 `yishangshu_username` 应验证邮箱/用户名格式，对 `yishangshu_password` 应验证最小长度和复杂度
4. **未限制 `config_value` 长度** — 可传入超长字符串（如 10MB），消耗数据库存储和传输带宽
5. **未验证数组元素数量上限** — 可传入极大数组导致 DoS
6. **未使用项目规则要求的 Zod 验证** — 编码规范明确要求使用 Zod 进行 schema 验证

**攻击场景分析**:

```
# 场景 1：注入超长 config_value 导致存储膨胀
curl -X PUT http://target/api/system-configs \
  -H "Authorization: Bearer <sysadmin-token>" \
  -d '{"configs":[{"config_key":"yishangshu_username","config_value":"<100MB字符串>"}]}'

# 场景 2：批量请求消耗数据库连接
curl -X PUT http://target/api/system-configs \
  -d '{"configs":[{"config_key":"yishangshu_username","config_value":"a"},...]}'  # 10000个元素
```

**修复建议**:

```typescript
import { z } from 'zod';

const configItemSchema = z.object({
  config_key: z.string().min(1).max(100),
  config_value: z.string().min(1).max(10000),
});

const updateConfigsSchema = z.object({
  configs: z.array(configItemSchema).min(1).max(50),
});

export async function updateSystemConfigs(req: Request, res: Response): Promise<void> {
  try {
    const parsed = updateConfigsSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.errors[0].message);
      return;
    }

    for (const c of parsed.data.configs) {
      if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) {
        fail(res, 400, '包含不允许修改的配置项');
        return;
      }
    }

    const items = await systemConfigService.batchUpdate(parsed.data);
    success(res, items, '更新系统配置成功');
  } catch (error: unknown) {
    fail(res, 500, '更新系统配置失败');
  }
}
```

---

### SEC-H-02: 配置变更无审计日志（OWASP A09）

**严重级别**: HIGH
**位置**: 第 22-45 行（`updateSystemConfigs` 函数）及第 13-20 行（`getSystemConfigs` 函数）
**OWASP 分类**: A09:2021 — Security Logging and Monitoring Failures

```typescript
export async function updateSystemConfigs(req: Request, res: Response): Promise<void> {
  try {
    // ...验证逻辑...
    const items = await systemConfigService.batchUpdate(req.body);  // ❌ 无审计日志
    success(res, items, '更新系统配置成功');
  } catch (_err: any) {  // ❌ 错误被完全忽略
    fail(res, 500, '更新系统配置失败');
  }
}
```

**问题分析**:

1. **变更无审计日志** — 密码等敏感配置的修改没有任何日志记录
   - 无法追踪谁在什么时候修改了什么配置
   - 安全事件发生时无法回溯
   - 不满足等保/合规审计要求

2. **错误被完全吞掉** — `_err: any` 前缀 `_` 表示有意忽略，catch 块中无任何日志记录
   - 数据库连接失败、事务超时等严重错误完全静默
   - 生产环境中如果配置更新失败，运维人员完全无感知
   - 使用 `any` 类型违反项目安全编码规范（应使用 `unknown`）

3. **GET 接口也无日志** — 虽然读取操作日志优先级低于写入，但敏感配置的读取也应被记录

**攻击场景分析**:

```
1. 攻击者获取 sysadmin token 后修改 yishangshu_password
   → 无任何日志记录此变更
   → 无法追溯攻击时间窗口
   → 无法判断密码是否被篡改

2. 数据库连接异常导致 batchUpdate 失败
   → 返回 500 但无服务端日志
   → 运维只能从前端错误提示发现问题
   → 无法快速定位根因
```

**修复建议**:

```typescript
import { logger } from '../utils/logger'; // 或使用项目现有的日志方案

export async function updateSystemConfigs(req: Request, res: Response): Promise<void> {
  try {
    // ...验证逻辑...

    const items = await systemConfigService.batchUpdate(parsed.data);

    // 审计日志：记录谁修改了哪些配置
    logger.info('系统配置更新', {
      userId: (req as any).user?.userId,
      keys: parsed.data.configs.map(c => c.config_key),
      // 注意：不要在日志中记录 config_value（尤其是密码）
    });

    success(res, items, '更新系统配置成功');
  } catch (error: unknown) {
    logger.error('更新系统配置失败', {
      userId: (req as any).user?.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    fail(res, 500, '更新系统配置失败');
  }
}
```

---

### SEC-M-01: 错误消息泄露白名单配置项信息（OWASP A01）

**严重级别**: MEDIUM
**位置**: 第 35-37 行
**OWASP 分类**: A01:2021 — Broken Access Control（信息泄露）

```typescript
if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) {
  fail(res, 400, `不允许修改的配置项: ${c.config_key}`);  // ❌ 泄露用户输入的 key
  return;
}
```

**问题分析**:

1. 错误消息直接将用户提交的 `c.config_key` 拼接到响应中
2. 虽然白名单内容未直接泄露，但攻击者可据此推断：
   - 系统存在配置修改白名单机制
   - 通过尝试不同 key 值可以枚举出哪些 key 被允许（返回 400 "不允许" vs 返回其他错误）
3. 如果未来白名单检查逻辑变化（如返回 "配置项不存在" vs "不允许修改"），可能导致正则差异攻击

**攻击场景分析**:

```bash
# 枚举配置项名称
curl -X PUT http://target/api/system-configs \
  -H "Authorization: Bearer <token>" \
  -d '{"configs":[{"config_key":"database_url","config_value":"x"}]}'
# → 400 "不允许修改的配置项: database_url" → 知道此 key 不在白名单

curl -X PUT http://target/api/system-configs \
  -d '{"configs":[{"config_key":"yishangshu_username","config_value":"x"}]}'
# → 200 成功 → 知道此 key 在白名单
```

**修复建议**:

```typescript
if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) {
  fail(res, 400, '包含不允许修改的配置项');  // 不泄露具体 key 名称
  return;
}
```

---

### SEC-M-02: 白名单硬编码在控制器中，职责越界（OWASP A04）

**严重级别**: MEDIUM
**位置**: 第 8-11 行
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
// H-6: 允许修改的配置项白名单
const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
];
```

**问题分析**:

1. **白名单属于业务规则**，应放在 Service 层或配置层，而非 Controller 层
2. 新增可配置项需要修改控制器代码并重新部署，增加变更风险
3. 白名单中包含密码类配置（`yishangshu_password`），密码修改应有额外的安全策略（如二次验证、修改通知等）
4. `as const` 断言可提供更严格的类型推导

**修复建议**:

```typescript
// apis/constants/system-config.ts
export const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
] as const;

export type AllowedConfigKey = typeof ALLOWED_CONFIG_KEYS[number];

// 敏感配置项集合 — 需要脱敏的 key
export const SENSITIVE_CONFIG_KEYS = new Set<AllowedConfigKey>([
  'yishangshu_password',
]);
```

---

### SEC-L-01: `batchUpdate` 接收完整 `req.body` 而非已验证数据（OWASP A08）

**严重级别**: LOW
**位置**: 第 41 行
**OWASP 分类**: A08:2021 — Software and Data Integrity Failures

```typescript
// 验证的是 configs 数组...
for (const c of configs) { /* 验证 c.config_key, c.config_value */ }

// ...但传递给 service 的是整个 req.body
const items = await systemConfigService.batchUpdate(req.body);  // ❌ 传递未过滤的 body
```

**问题分析**:

1. Controller 验证了 `configs` 数组中的每个元素，但传递给 `batchUpdate` 的是完整的 `req.body`
2. `batchUpdate` 的 `UpdateSystemConfigsRequest` 接口定义为 `{ configs: Array<{ config_key: string; config_value: string }> }`
3. 如果 `req.body` 包含额外字段（如 `configs` 以外的属性），这些字段也会被传递给 Service 层
4. 当前 `batchUpdate` 实现中只使用 `request.configs`，实际无危害，但这是**防御不深**的信号

**修复建议**:

```typescript
// 仅传递已验证的数据
const validatedConfigs = parsed.data.configs;
const items = await systemConfigService.batchUpdate({ configs: validatedConfigs });
```

---

### SEC-L-02: `catch (_err: any)` 使用 `any` 类型（OWASP A05）

**严重级别**: LOW
**位置**: 第 17 行、第 43 行
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
catch (_err: any) {  // ❌ 使用 any 类型，违反项目编码规范
  fail(res, 500, '获取系统配置失败');
}
```

**问题分析**:

1. 项目编码规范明确要求避免使用 `any`，应使用 `unknown` 并安全收窄
2. `_err` 前缀 `_` 表示有意忽略，但 500 错误不应被忽略（见 SEC-H-02）
3. 同项目的 `knowledge-base.controller.ts` 已改进为 `catch (err: unknown)`，本文件应保持一致

**修复建议**:

```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('获取系统配置失败', message);  // 先记录，再返回
  fail(res, 500, '获取系统配置失败');
}
```

---

## 三、安全架构分析

### 纵深防御评估

```
                          ┌──────────────────────────────┐
  HTTP Request ──────────►│ authMiddleware               │ ✅ JWT 认证
                          │ roleMiddleware('sysadmin')   │ ✅ 角色限制
                          │ anti-crawl                   │ ✅ User-Agent 检查
                          │ rate-limit                   │ ✅ 速率限制
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ Controller 层                │
                          │ ├─ 白名单验证                │ ✅ ALLOWED_CONFIG_KEYS
                          │ ├─ 存在性验证                │ ⚠️ 仅检查非空
                          │ ├─ 类型/格式验证             │ ❌ 缺失
                          │ ├─ 敏感值脱敏                │ ❌ 缺失
                          │ └─ 审计日志                  │ ❌ 缺失
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ Service 层                   │
                          │ ├─ Prisma ORM                │ ✅ 防 SQL 注入
                          │ ├─ 事务保障                  │ ✅ $transaction
                          │ └─ 输入校验                  │ ❌ 完全信任 Controller
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ 数据库层                     │
                          │ └─ 明文存储密码              │ ⚠️ 未加密
                          └──────────────────────────────┘
```

### 信任边界分析

| 信任边界 | 防护措施 | 状态 |
|----------|----------|------|
| 网络 → Express | HTTPS（应强制）、Helmet 中间件 | ⚠️ 部分 |
| Express → 路由 | authMiddleware + roleMiddleware | ✅ 有效 |
| 路由 → Controller | 无额外防护 | ✅ 由路由层保障 |
| Controller → Service | 白名单验证、存在性验证 | ⚠️ 不完整 |
| Service → Prisma | 参数化查询 | ✅ 有效 |
| 数据库存储 | 密码明文存储 | ❌ 未加密 |

---

## 四、与其他 Controller 的安全对比

| 安全特性 | system-config | knowledge-base | llm-model |
|----------|:---:|:---:|:---:|
| 角色限制 | sysadmin | sysadmin, admin | sysadmin |
| 白名单验证 | ✅ | N/A | N/A |
| 敏感值脱敏 | ❌ 密码明文 | N/A | ✅ api_key 脱敏 |
| Zod 验证 | ❌ | ❌ | ❌ |
| 错误类型 | `_err: any` | `err: unknown` ✅ | `_err: any` |
| 审计日志 | ❌ | ❌ | ❌ |
| 输入长度限制 | ❌ | ❌ | ❌ |

**关键发现**: 同项目的 `llm-model.controller.ts` 通过 `mapLlmModel` 对 `api_key` 做了脱敏处理，但本文件的 `mapSystemConfig` 对 `yishangshu_password` 未做脱敏。安全策略不一致，应统一。

---

## 五、攻击面总结

```
攻击面 1: GET /api/system-configs（明文密码泄露）
├─ 前置条件: sysadmin JWT token
├─ 风险: 密码明文暴露
├─ 可利用性: 高（单次 API 调用）
└─ 影响: 直接获取关联系统密码

攻击面 2: PUT /api/system-configs（输入验证不足）
├─ 前置条件: sysadmin JWT token
├─ 风险: 存储异常数据、DoS
├─ 可利用性: 中（需要有效 token）
└─ 影响: 数据完整性受损、服务拒绝

攻击面 3: PUT /api/system-configs（信息枚举）
├─ 前置条件: sysadmin JWT token
├─ 风险: 枚举可修改的配置项名称
├─ 可利用性: 低（信息收集阶段）
└─ 影响: 为进一步攻击提供情报
```

---

## 六、修复优先级

| 优先级 | 编号 | 问题 | 工作量 | 影响 |
|--------|------|------|--------|------|
| **P0** | SEC-C-01 | GET 接口敏感值脱敏 | 0.5h | 消除密码明文泄露 |
| **P1** | SEC-H-01 | 引入 Zod 输入验证 | 1h | 消除注入和 DoS 风险 |
| **P1** | SEC-H-02 | 添加审计日志和错误记录 | 1h | 满足安全合规要求 |
| **P2** | SEC-M-01 | 修复错误消息信息泄露 | 5min | 减少攻击面 |
| **P2** | SEC-M-02 | 白名单外置到常量文件 | 0.5h | 改善职责分离 |
| **P3** | SEC-L-01 | 仅传递已验证数据给 Service | 5min | 深化防御 |
| **P3** | SEC-L-02 | `any` → `unknown` 类型修复 | 5min | 类型安全 |

---

## 七、完整修复代码参考

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { SystemConfigServiceImpl } from '../service/impl/system-config.service.impl';
import { success, fail } from '../utils';
import { logger } from '../utils/logger';

const systemConfigService = new SystemConfigServiceImpl();

// 白名单移至模块顶部，使用 as const 增强类型
const ALLOWED_CONFIG_KEYS = ['yishangshu_username', 'yishangshu_password'] as const;
const SENSITIVE_CONFIG_KEYS = new Set(['yishangshu_password']);

// Zod schema 验证
const configItemSchema = z.object({
  config_key: z.string().min(1).max(100),
  config_value: z.string().min(1).max(10000),
});

const updateConfigsSchema = z.object({
  configs: z.array(configItemSchema).min(1).max(50),
});

function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key) && value.length > 2) {
    return `${value.slice(0, 2)}****`;
  }
  return value;
}

export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();
    const sanitized = items.map(item => ({
      ...item,
      config_value: maskSensitiveValue(item.config_key, item.config_value),
    }));
    success(res, sanitized);
  } catch (error: unknown) {
    logger.error('获取系统配置失败', error instanceof Error ? error.message : String(error));
    fail(res, 500, '获取系统配置失败');
  }
}

export async function updateSystemConfigs(req: Request, res: Response): Promise<void> {
  try {
    const parsed = updateConfigsSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.errors[0].message);
      return;
    }

    for (const c of parsed.data.configs) {
      if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) {
        fail(res, 400, '包含不允许修改的配置项');
        return;
      }
    }

    const items = await systemConfigService.batchUpdate(parsed.data);

    logger.info('系统配置更新', {
      userId: (req as any).user?.userId,
      keys: parsed.data.configs.map(c => c.config_key),
    });

    success(res, items, '更新系统配置成功');
  } catch (error: unknown) {
    logger.error('更新系统配置失败', error instanceof Error ? error.message : String(error));
    fail(res, 500, '更新系统配置失败');
  }
}
```

---

## 八、结论

`system-config.controller.ts` 存在 **1 个 CRITICAL** 级别安全漏洞（密码明文泄露）和 **2 个 HIGH** 级别安全问题（输入验证缺失、审计日志缺失）。虽然路由层通过 `roleMiddleware('sysadmin')` 限制了访问范围，但不应将"只有管理员能访问"作为安全防护的唯一手段。纵深防御要求即使认证被绕过（如 token 泄露），敏感信息也不应明文暴露。

**核心建议**:
1. **立即修复 SEC-C-01** — 对 `yishangshu_password` 进行脱敏处理，与 `mapLlmModel` 的 `api_key` 脱敏策略保持一致
2. **下一个迭代修复 SEC-H-01/02** — 引入 Zod 验证和审计日志
3. **统一安全策略** — 确保所有敏感配置值的处理方式一致（脱敏、日志、验证）
