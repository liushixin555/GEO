# apis/controller/system-config.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-25
**评审角色**: 代码安全专家（OWASP Top 10 · 敏感数据泄露 · 输入验证 · 权限控制 · 审计合规 · 纵深防御）
**文件路径**: `apis/controller/system-config.controller.ts`
**代码行数**: 61 行（2 个导出函数 + 2 个模块级常量 + 1 个辅助函数 + 1 个模块级服务实例）
**关联文件**:
- 路由: `apis/routes/system-config.routes.ts`（authMiddleware + roleMiddleware(SYSADMIN) + Zod validate）
- Schema: `apis/schema/system-config.schema.ts`（`updateSystemConfigsSchema` — `z.enum` 白名单 + `.strict()`）
- Service: `apis/service/impl/system-config.service.impl.ts`（Prisma `$transaction` + `upsert`）
- 测试: `tests/apis/system-config.controller.test.ts`（926 行，含路由集成 + 直接调用 + 边界场景）
**已有评审**: 架构评审(v1) · 安全评审(v1) · Committer评审 · Dev专家评审 · 质量评审(v1)
**安全评级**: ⚠️ HIGH（PUT 接口明文回显密码 + 白名单双重定义漂移风险 + 无审计日志）

---

## 一、与上一版安全评审对比（v1 → v2）

| 编号 | v1 问题 | v1 级别 | v2 状态 | 说明 |
|------|--------|---------|---------|------|
| SEC-C-01 | GET 接口明文返回密码 | CRITICAL | ✅ 已修复 | 新增 `maskSensitiveValue` + `SENSITIVE_CONFIG_KEYS` |
| SEC-H-01 | 输入验证薄弱，无 Zod | HIGH | ✅ 已修复 | 路由层 `validate(updateSystemConfigsSchema)` 已集成 |
| SEC-H-02 | 配置变更无审计日志 | HIGH | ❌ 未修复 | 仍然无任何日志记录 |
| SEC-M-01 | 错误消息泄露白名单 key | MEDIUM | ✅ 已修复 | 改为通用消息 `'包含不允许修改的配置项'` |
| SEC-M-02 | 白名单硬编码 + 无 `as const` | MEDIUM | ⚠️ 部分修复 | 加了 `as const`，但仍留在本文件，与 Schema 重复定义 |
| SEC-L-01 | 传递完整 `req.body` 给 Service | LOW | ✅ 已修复 | 改为 `batchUpdate({ configs })` |
| SEC-L-02 | `catch (_err: any)` | LOW | ✅ 已修复 | 改为 `catch (_err: unknown)` |

**v1 的 7 项问题中 5 项已修复，1 项部分修复，1 项未修复。但本次评审发现 2 项新 HIGH 问题和 2 项新 MEDIUM 问题。**

---

## 二、安全问题清单

### HIGH 级别

#### SEC-H-01（新发现）: PUT 接口响应明文回显密码 — 敏感数据泄露（OWASP A02）

**位置**: 第 55-56 行（`updateSystemConfigs` 函数）
**OWASP 分类**: A02:2021 — Cryptographic Failures
**CVSS 3.1 评分**: 6.5（Medium-High，受限攻击面）

```typescript
// 第 55-56 行
const items = await systemConfigService.batchUpdate({ configs });
success(res, items, '更新系统配置成功');  // ❌ items 含明文密码
```

**问题分析**:

1. `batchUpdate` 返回的 `items` 是 Service 层通过 `mapSystemConfig` 映射的原始数据，包含 `config_value` 明文
2. GET 接口已正确使用 `maskSensitiveValue` 对 `yishangshu_password` 脱敏，但 PUT 接口**遗漏了脱敏处理**
3. 当调用 `PUT /api/system-configs` 更新密码时，响应直接回显 `yishangshu_password` 明文值

**测试验证**:

测试文件第 329-348 行验证了批量更新密码场景，仅断言 `status === 200` 和 `data.length === 2`，**未校验密码是否被脱敏**，间接证实了此漏洞：

```typescript
// tests/apis/system-config.controller.test.ts:329-348
const result2 = { id: 2, configKey: 'yishangshu_password', configValue: 'new_pass', ... };
mockPrismaForUpdate([result1, result2]);
// ...发送更新请求...
expect(response.body.data).toHaveLength(2);  // ❌ 未检查 password 是否脱敏
```

**攻击场景**:

```
1. sysadmin 更新亿商数平台密码 → PUT 响应回显明文密码
2. 浏览器 DevTools Network 面板可见明文密码
3. 前端错误追踪系统（Sentry 等）可能捕获响应体 → 密码泄露至第三方平台
4. 中间人攻击（HTTPS 配置不当时）截获明文密码
5. 浏览器 XSS 漏洞 → 攻击者 JS 读取 API 响应中的密码
```

**修复建议**:

```typescript
// 第 55-56 行修复
const items = await systemConfigService.batchUpdate({ configs });
const sanitized = items.map(item => ({
  ...item,
  config_value: maskSensitiveValue(item.config_key, item.config_value),
}));
success(res, sanitized, '更新系统配置成功');
```

**补充**: 建议抽取 `maskSensitiveValue` 的调用为公共逻辑，避免 GET/PUT 重复编写：

```typescript
function sanitizeConfigItems(items: SystemConfig[]) {
  return items.map(item => ({
    ...item,
    config_value: maskSensitiveValue(item.config_key, item.config_value),
  }));
}
```

---

#### SEC-H-02（新发现）: ALLOWED_CONFIG_KEYS 双重定义 — 白名单漂移风险（OWASP A04）

**位置**:
- 控制器第 8-11 行: `ALLOWED_CONFIG_KEYS`
- Schema 第 3 行: `ALLOWED_KEYS`

```typescript
// apis/controller/system-config.controller.ts:8-11
const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
] as const;

// apis/schema/system-config.schema.ts:3
const ALLOWED_KEYS = ['yishangshu_username', 'yishangshu_password'] as const;
```

**问题分析**:

1. **两处独立维护同一白名单** — Schema 用 `z.enum(ALLOWED_KEYS)` 校验 `config_key`，Controller 用 `ALLOWED_CONFIG_KEYS.includes()` 二次校验
2. **漂移场景**: 新增可配置项时，如果只更新了 Schema 的 `ALLOWED_KEYS` 但忘记更新 Controller 的 `ALLOWED_CONFIG_KEYS`（或反之），两层校验规则不一致
3. **攻击向量**:
   - 如果 Schema 允许 `secret_key` 但 Controller 不允许 → Zod 校验通过但被 Controller 拦截，功能异常
   - 如果 Controller 允许 `secret_key` 但 Schema 不允许 → Zod 拦截在先，Controller 永远不会触发（**功能看似正常，实际 Controller 的白名单已失效**）
   - 如果两者都允许了不该允许的 key → 无安全校验
4. **违反 DRY 原则** — 同一业务规则（白名单）不应在两处定义

**修复建议**:

```typescript
// apis/constants/system-config.ts — 单一来源
export const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
] as const;

export type AllowedConfigKey = typeof ALLOWED_CONFIG_KEYS[number];

export const SENSITIVE_CONFIG_KEYS = new Set<AllowedConfigKey>([
  'yishangshu_password',
]);

// apis/schema/system-config.schema.ts — 引用常量
import { ALLOWED_CONFIG_KEYS } from '../constants/system-config';
const ALLOWED_KEYS = ALLOWED_CONFIG_KEYS; // 或直接使用

// apis/controller/system-config.controller.ts — 引用常量
import { ALLOWED_CONFIG_KEYS, SENSITIVE_CONFIG_KEYS } from '../constants/system-config';
```

---

#### SEC-H-03（遗留）: 配置变更无审计日志（OWASP A09）

**位置**: 第 23-60 行（两个函数的 catch 块均无日志记录）
**OWASP 分类**: A09:2021 — Security Logging and Monitoring Failures
**遗留状态**: v1 SEC-H-02 未修复

```typescript
// 第 57-59 行
} catch (_err: unknown) {
  fail(res, 500, '更新系统配置失败');  // ❌ 无服务端日志，错误被完全忽略
}
```

**问题分析**:

1. **密码修改无审计记录** — `yishangshu_password` 被修改时，无法追溯谁在什么时间修改了密码
2. **500 错误被静默吞掉** — `_err` 前缀 `_` 表示有意忽略，数据库异常、事务超时等严重错误无任何服务端记录
3. **不满足合规要求** — 等保/ISO 27001 要求对敏感配置变更保留审计日志

**修复建议**:

```typescript
import { logger } from '../utils/logger.util';

// updateSystemConfigs 成功后
logger.info('系统配置更新', {
  event: 'system_config.update',
  userId: (req as any).user?.userId,
  keys: configs.map(c => c.config_key),
  // 注意：不在日志中记录 config_value（尤其是密码）
});

// catch 块中
catch (err: unknown) {
  logger.error('更新系统配置失败', {
    event: 'system_config.update_error',
    error: err instanceof Error ? err.message : String(err),
  });
  fail(res, 500, '更新系统配置失败');
}
```

---

### MEDIUM 级别

#### SEC-M-01（新发现）: Zod Schema 缺少 `config_value` 长度限制 — 存储 DoS 风险（OWASP A03）

**位置**: `apis/schema/system-config.schema.ts` 第 9 行
**OWASP 分类**: A03:2021 — Injection

```typescript
// apis/schema/system-config.schema.ts:6-10
z.object({
  config_key: z.enum(ALLOWED_KEYS, { message: '包含不允许修改的配置项' }),
  config_value: z.string({ error: 'config_value不能为空' }),  // ❌ 无 .max() 限制
}),
```

**问题分析**:

1. `z.string()` 无 `.max()` 约束，可接受任意长度字符串
2. 攻击者可传入 10MB+ 的 `config_value`，消耗数据库存储和网络带宽
3. Controller 层的 `c.config_value === undefined` 检查仅验证存在性，不验证长度

**攻击场景**:

```bash
curl -X PUT http://target/api/v1/system-configs \
  -H "Authorization: Bearer <sysadmin-token>" \
  -d '{"configs":[{"config_key":"yishangshu_username","config_value":"<100MB字符串>"}]}'
```

**修复建议**:

```typescript
config_value: z.string({ error: 'config_value不能为空' }).max(10000, 'config_value长度不能超过10000'),
```

---

#### SEC-M-02（新发现）: Zod Schema 缺少数组大小上限 — 批量 DoS 风险（OWASP A03）

**位置**: `apis/schema/system-config.schema.ts` 第 6-12 行
**OWASP 分类**: A03:2021 — Injection

```typescript
configs: z.array(
  z.object({ ... }),
).min(1, 'configs不能为空'),  // ❌ 无 .max() 限制
```

**问题分析**:

1. `.min(1)` 但无 `.max()`，可传入极大数组
2. 每个元素触发一次 Prisma `upsert`，大量元素可耗尽数据库连接池
3. 当前白名单仅 2 个 key，理论最大有效数组为 2，但 Schema 不应依赖业务规则限制

**修复建议**:

```typescript
configs: z.array(configItemSchema).min(1, 'configs不能为空').max(50, '单次最多更新50条配置'),
```

---

#### SEC-M-03: maskSensitiveValue 短密码不脱敏 — 防护缺口（OWASP A02）

**位置**: 第 16-21 行
**OWASP 分类**: A02:2021 — Cryptographic Failures

```typescript
function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key) && value.length > 2) {  // ❌ 长度 ≤ 2 时不脱敏
    return `${value.slice(0, 2)}****`;
  }
  return value;
}
```

**问题分析**:

1. 密码长度为 1-2 个字符时不触发脱敏，明文返回
2. 测试文件第 185-197 行明确验证了此行为：`expect(response.body.data[0].config_value).toBe('ab')` — 短密码未脱敏
3. 虽然实际生产中 1-2 位密码极罕见，但安全防护不应依赖输入特征假设
4. 即使 `value.length === 1`，也应至少返回 `'****'`

**修复建议**:

```typescript
function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key)) {
    return value.length >= 2 ? `${value.slice(0, 2)}****` : '****';
  }
  return value;
}
```

---

### LOW 级别

#### SEC-L-01: Controller 层验证与 Zod Schema 冗余 — 维护性风险

**位置**: 第 38-53 行 vs `apis/schema/system-config.schema.ts`

**问题分析**:

路由层已通过 `validate(updateSystemConfigsSchema)` 执行了 Zod 校验（含 `z.enum` 白名单 + `.strict()` + 数组 `.min(1)`），且 `validate` 中间件会用 `result.data` 替换 `req.body`。Controller 层的手动检查（`Array.isArray`、`!c.config_key`、`ALLOWED_CONFIG_KEYS.includes`）属于防御性编程，但：

1. Zod 的 `.strict()` 已拒绝额外字段
2. `z.enum(ALLOWED_KEYS)` 已执行白名单校验
3. Controller 层检查**理论上永远不会被触发**（Zod 拦截在先）
4. 维护成本：两处规则需同步更新

**评估**: 作为纵深防御可接受，但应添加注释说明依赖关系，或移除冗余逻辑。

---

#### SEC-L-02: 500 错误无服务端日志记录

**位置**: 第 31-33 行、第 57-59 行

```typescript
} catch (_err: unknown) {  // `_` 前缀表示有意忽略
  fail(res, 500, '获取系统配置失败');  // ❌ 无 logger 调用
}
```

**问题分析**:

错误变量前缀 `_` 表明开发者有意忽略异常。虽然 `_err` 类型已从 `any` 改为 `unknown`（类型安全），但 catch 块中无任何日志输出，生产环境诊断困难。与 SEC-H-03 关联，但此问题侧重**错误诊断能力**而非审计合规。

---

#### SEC-L-03: 模块级 Service 实例化 — 安全测试受限

**位置**: 第 5 行

```typescript
const systemConfigService = new SystemConfigServiceImpl();
```

**问题分析**:

模块级单例无法在运行时替换为测试替身。安全测试需要：
- 注入模拟的恶意 Service 实现以验证 Controller 的输入过滤
- 隔离 Controller/Service 边界的安全测试

当前依赖 `jest.mock('../../apis/utils/db.util')` 间接模拟数据库层，测试覆盖充分（926 行），但架构上仍建议依赖注入。

---

## 三、安全架构评估

### 纵深防御图（当前状态）

```
                          ┌──────────────────────────────┐
  HTTP Request ──────────►│ authMiddleware               │ ✅ JWT 认证
                          │ roleMiddleware(ROLES.SYSADMIN)│ ✅ 仅系统管理员
                          │ anti-crawl                   │ ✅ User-Agent 检查
                          │ rate-limit                   │ ✅ 速率限制
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ Zod Schema (路由层)           │
                          │ ├─ z.enum 白名单             │ ✅ 类型安全白名单
                          │ ├─ .strict()                 │ ✅ 拒绝额外字段
                          │ ├─ config_value 长度限制      │ ❌ 缺失
                          │ └─ 数组大小上限              │ ❌ 缺失
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ Controller 层                │
                          │ ├─ 白名单二次校验            │ ✅ 防御性编程
                          │ ├─ 存在性验证                │ ✅ config_key/value
                          │ ├─ GET 敏感值脱敏            │ ✅ maskSensitiveValue
                          │ ├─ PUT 敏感值脱敏            │ ❌ 遗漏！
                          │ └─ 审计日志                  │ ❌ 缺失
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ Service 层                   │
                          │ ├─ Prisma ORM                │ ✅ 参数化查询
                          │ ├─ $transaction              │ ✅ 原子性保障
                          │ └─ upsert                    │ ✅ 幂等操作
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │ 数据库层                     │
                          │ └─ 密码明文存储              │ ⚠️ 未加密（设计选择）
                          └──────────────────────────────┘
```

### 信任边界安全评分

| 信任边界 | 防护措施 | 评分 |
|----------|----------|------|
| 网络 → Express | HTTPS + Helmet + CORS | ✅ 8/10 |
| Express → 路由 | authMiddleware + roleMiddleware(SYSADMIN) | ✅ 9/10 |
| 路由 → Controller | Zod Schema（白名单 + strict） | ✅ 8/10 |
| Controller → Service | 白名单二次校验 + 存在性校验 | ⚠️ 7/10 |
| Service → Prisma | 参数化查询 + 事务 | ✅ 9/10 |
| 响应 → 客户端 | GET 脱敏 ✅ / PUT 脱敏 ❌ | ❌ 5/10 |

---

## 四、测试安全覆盖评估

| 安全测试场景 | 覆盖状态 | 测试位置 |
|-------------|---------|---------|
| 无 token 返回 401（GET/PUT） | ✅ | 第 80-83、215-221 行 |
| admin/view 角色返回 403 | ✅ | 第 85-97、223-239 行 |
| 过期 token 返回 401 | ✅ | 第 785-812 行 |
| 无效 token 返回 401 | ✅ | 第 814-829 行 |
| GET 密码脱敏 | ✅ | 第 167-211 行 |
| **PUT 密码脱敏** | ❌ **缺失** | 无对应测试 |
| 白名单 key 拒绝 | ✅ | 第 279-287 行 |
| null body 拒绝 | ✅ | 第 885-892 行 |
| 500 错误兜底 | ✅ | 第 126-146、448-478 行 |
| XSS 特殊字符存储 | ✅ | 第 833-847 行（但无前端转义测试） |
| 超长 value 拒绝 | ❌ 缺失 | Schema 无 max 限制 |
| 超大数组拒绝 | ❌ 缺失 | Schema 无 max 限制 |

**测试安全覆盖率**: 约 75% — 认证/授权/输入验证覆盖良好，但**PUT 响应脱敏**和**输入长度限制**测试缺失。

---

## 五、修复优先级矩阵

| 优先级 | 编号 | 问题 | 级别 | 工作量 | 安全收益 |
|--------|------|------|------|--------|---------|
| **P0** | SEC-H-01 | PUT 响应明文回显密码 | HIGH | 15min | 消除密码泄露 |
| **P1** | SEC-H-02 | 白名单双重定义漂移 | HIGH | 30min | 消除维护性安全风险 |
| **P1** | SEC-H-03 | 配置变更审计日志 | HIGH | 1h | 满足合规追溯要求 |
| **P2** | SEC-M-01 | Schema 缺 config_value 长度限制 | MEDIUM | 5min | 防止存储 DoS |
| **P2** | SEC-M-02 | Schema 缺数组大小上限 | MEDIUM | 5min | 防止批量 DoS |
| **P2** | SEC-M-03 | 短密码不脱敏 | MEDIUM | 5min | 消除防护缺口 |
| **P3** | SEC-L-01 | Controller/Zod 验证冗余 | LOW | N/A | 可接受（防御性编程） |
| **P3** | SEC-L-02 | 500 错误无日志 | LOW | 10min | 改善诊断能力 |
| **P3** | SEC-L-03 | 模块级 Service 实例 | LOW | N/A | 架构优化 |

**总修复工作量**: P0+P1 ≈ 1.75h / P2 ≈ 15min / 全部 ≈ 2h

---

## 六、完整修复代码参考

```typescript
import { Request, Response } from 'express';
import { SystemConfigServiceImpl } from '../service/impl/system-config.service.impl';
import { success, fail } from '../utils';
import { logger } from '../utils/logger.util';
import { ALLOWED_CONFIG_KEYS, SENSITIVE_CONFIG_KEYS } from '../constants/system-config';

const systemConfigService = new SystemConfigServiceImpl();

function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key)) {
    return value.length >= 2 ? `${value.slice(0, 2)}****` : '****';
  }
  return value;
}

function sanitizeConfigItems<T extends { config_key: string; config_value: string }>(items: T[]) {
  return items.map(item => ({
    ...item,
    config_value: maskSensitiveValue(item.config_key, item.config_value),
  }));
}

export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();
    success(res, sanitizeConfigItems(items));
  } catch (err: unknown) {
    logger.error('获取系统配置失败', { error: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '获取系统配置失败');
  }
}

export async function updateSystemConfigs(req: Request, res: Response): Promise<void> {
  try {
    const { configs } = req.body;
    if (!Array.isArray(configs) || configs.length === 0) {
      fail(res, 400, 'configs不能为空');
      return;
    }

    for (const c of configs) {
      if (!c.config_key || c.config_value === undefined) {
        fail(res, 400, 'config_key和config_value不能为空');
        return;
      }
      if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) {
        fail(res, 400, '包含不允许修改的配置项');
        return;
      }
    }

    const items = await systemConfigService.batchUpdate({ configs });

    logger.info('系统配置更新', {
      userId: (req as any).user?.userId,
      keys: configs.map((c: { config_key: string }) => c.config_key),
    });

    success(res, sanitizeConfigItems(items), '更新系统配置成功');
  } catch (err: unknown) {
    logger.error('更新系统配置失败', { error: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '更新系统配置失败');
  }
}
```

---

## 七、安全亮点（做得好的地方）

| 安全实践 | 位置 | 说明 |
|----------|------|------|
| `SENSITIVE_CONFIG_KEYS` 独立集合 | 第 14 行 | 敏感 key 可独立扩展，不与白名单耦合 |
| `as const` 类型断言 | 第 8-11 行 | 白名单不可变，TypeScript 编译期保障 |
| Zod `.strict()` | Schema 第 12 行 | 拒绝额外字段，防止参数注入 |
| `z.enum` 白名单 | Schema 第 8 行 | 类型安全的枚举校验，编译期+运行期双重保障 |
| `_err: unknown` 类型 | 第 31、57 行 | 类型安全的异常捕获 |
| 通用错误消息 | 第 51 行 | 不泄露具体 key 名称，防止信息枚举 |
| Prisma `$transaction` | Service 层 | 原子性批量更新，防止部分成功导致数据不一致 |
| 测试覆盖 926 行 | 测试文件 | 认证/授权/边界/脱敏/错误路径全面覆盖 |

---

## 八、结论

`system-config.controller.ts` 相比上一版安全评审有显著改善：GET 接口密码明文泄露（原 CRITICAL）已修复，Zod Schema 验证已集成，错误类型已改为 `unknown`。但**PUT 接口响应明文回显密码**是新引入的遗漏（v1 评审时 GET 和 PUT 均未脱敏，修复时只处理了 GET），需立即修复。

**核心建议**:
1. **立即修复 SEC-H-01**（15 分钟）— PUT 响应复用 `maskSensitiveValue`，与 GET 保持一致
2. **本轮迭代修复 SEC-H-02**（30 分钟）— 白名单抽至 `apis/constants/system-config.ts`，消除双重定义
3. **下个迭代修复 SEC-H-03**（1 小时）— 引入结构化审计日志，满足合规要求
4. **随 Schema 修复 SEC-M-01/02**（10 分钟）— 为 `config_value` 和数组加 `.max()` 限制

**安全评级变化**: v1(HIGH·1 CRITICAL + 2 HIGH + 2 MEDIUM + 2 LOW) → v2(0 CRITICAL + 3 HIGH + 3 MEDIUM + 3 LOW) — CRITICAL 已消除，但 HIGH 数量因新发现增加，整体安全态势持平。修复 SEC-H-01 后可降至 MEDIUM 风险。
