# token-blacklist.util.ts 安全评审

**文件**: `apis/utils/token-blacklist.util.ts`
**评审类型**: 代码安全评审
**评审日期**: 2026-05-26
**评审结论**: **CONDITIONAL APPROVE 6.0/10** — 核心token撤销逻辑正确但存在4项HIGH安全风险：无容量上限DoS(H1)+parseExpiryToMs单位不一致导致撤销窗口漏洞(H2)+进程重启丢失全部撤销记录(H3)+撤销前零JWT签名验证(H4)

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 认证与授权 | 7/10 | logout路由有authMiddleware保护，但revokeToken本身无JWT签名验证 |
| 输入验证 | 5/10 | token参数无格式校验、expiresInMs无上界、parseExpiryToMs正则与config验证不一致 |
| 拒绝服务(DoS)防护 | 3/10 | Map无容量上限、单条目可无限增大、清理间隔60s在高并发下不够 |
| 数据保护 | 6/10 | JWT明文存储、进程重启丢失全部撤销记录、无持久化 |
| 会话管理 | 7/10 | token撤销机制正确集成到auth middleware，但缺乏并发session管理 |
| 可审计性 | 4/10 | 模块内零日志输出，revokeToken/isTokenRevoked/clearBlacklist均无审计记录 |

---

## 威胁模型

```
攻击者 ──→ logout API ──→ revokeToken() ──→ Map增长(DoS)
                                    │
                                    ├─→ 伪造token字符串填充黑名单
                                    │
攻击者 ──→ 被撤销的token ──→ isTokenRevoked() ──→ 过期后被清除
                                    │                  │
                                    │                  └─→ parseExpiryToMs单位不匹配
                                    │                      → 黑名单提前清理 → token复活
                                    │
进程重启 ──→ Map清空 ──→ 所有已撤销token复活
```

---

## 详细发现

### CRITICAL (0项)

无。

### HIGH (4项)

**H-1: 黑名单Map无容量上限 — 内存耗尽DoS**
- **位置**: L1 `new Map<string, number>()` + L23 `revokedTokens.set(token, ...)`
- **问题**: Map大小无任何限制。攻击向量分析：
  1. 攻击者获取有效凭证（或批量注册），通过脚本高频调用 `POST /api/v1/auth/logout`
  2. 每次logout经authMiddleware验证通过后，`revokeToken()`将JWT token（200-500字节）写入Map
  3. 虽然rate-limit限制500 req/min，但2h JWT窗口内仍可累积60K+条目
  4. 每条目~500字节（JWT字符串） + 8字节（过期时间） + Map开销(~80字节) ≈ 600字节
  5. 60K条目 ≈ 36MB，无上限时持续增长
  6. `revokeToken`的`!token`检查（L22）仅过滤空值，不过滤恶意构造的长字符串
- **攻击复杂度**: 低（仅需有效凭证和自动化脚本）
- **影响**: OOM导致进程崩溃，全部用户服务中断
- **修复**:
```typescript
const MAX_BLACKLIST_SIZE = 10_000;

export function revokeToken(token: string, expiresInMs: number): void {
  if (!token || expiresInMs <= 0 || Number.isNaN(expiresInMs)) return;
  if (revokedTokens.size >= MAX_BLACKLIST_SIZE) {
    cleanupExpired();
    if (revokedTokens.size >= MAX_BLACKLIST_SIZE) return; // 拒绝新条目
  }
  revokedTokens.set(token, Date.now() + expiresInMs);
  startCleanup();
}
```

**H-2: parseExpiryToMs与config验证单位不一致 — 撤销窗口安全漏洞**
- **位置**: L47 `/^(\d+)(ms|s|m|h|d)?$/`
- **问题**: 这是本项目最隐蔽的安全漏洞。`config/index.ts:137`的`validateTimeSpan`支持`w`(周)和`y`(年)，但`parseExpiryToMs`正则不匹配这些单位。攻击场景：
  1. 管理员将`JWT_EXPIRES_IN=1w`（7天有效期）
  2. config验证通过 ✓ → JWT签发7天有效token
  3. 用户logout → `parseExpiryToMs('1w')` → 正则不匹配 → **静默回退7,200,000ms（2h）**
  4. 黑名单在2h后清理该token，但JWT仍有5天有效期
  5. **被撤销的token在2h~7天之间仍可正常使用**
- **根本原因**: 两个模块对同一配置字符串定义了不同的合法字符集，形成"validation-parser drift"
- **影响**: 在使用`w`/`y`单位的部署环境中，token撤销机制完全失效
- **当前缓解**: 默认配置`JWT_EXPIRES_IN='2h'`不触发此漏洞
- **修复**: 统一单位集合，或从config直接导出`parseTimeSpan`
```typescript
export function parseExpiryToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(ms|s|m|h|d|w|y)?$/);
  if (!match) {
    console.error(`WARNING: parseExpiryToMs cannot parse "${expiresIn}", defaulting to 2h`);
    return 7_200_000;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  switch (unit) {
    case 'ms': return value;
    case 's':  return value * 1_000;
    case 'm':  return value * 60_000;
    case 'h':  return value * 3_600_000;
    case 'd':  return value * 86_400_000;
    case 'w':  return value * 604_800_000;
    case 'y':  return value * 31_536_000_000;
    default:   return value;
  }
}
```

**H-3: 进程重启丢失全部撤销记录 — 持久化缺失**
- **位置**: L1 `const revokedTokens = new Map<string, number>()`
- **问题**: 所有撤销记录存储在进程内存中。当以下事件发生时，Map被完全清空：
  1. 进程正常重启（部署/更新）
  2. 进程异常崩溃（OOM/未捕获异常）
  3. 容器编排重启（Kubernetes Pod重新调度）
  4. PM2 cluster模式下的worker重启
- **攻击场景**:
  1. 用户发现账户异常，主动logout撤销token
  2. 服务器因部署需要重启
  3. 所有已撤销的token（仍在JWT有效期内）复活
  4. 攻击者持有的旧token恢复有效
- **影响**: 在JWT 2h有效窗口内，任何重启都会导致撤销失效
- **当前缓解**: JWT有效期仅2h，风险窗口有限
- **修复方向**: 持久化到Redis/文件系统，或在重启时使所有已签发token失效（如记录最后重启时间）
- **短期缓解**: 在`clearBlacklist()`中添加警告日志

**H-4: revokeToken无JWT签名验证 — 垃圾数据注入**
- **位置**: L21-25 `revokeToken(token, expiresInMs)`
- **问题**: `revokeToken`直接将传入的字符串写入Map，不验证：
  1. 是否为合法JWT格式（三段base64url）
  2. 签名是否有效
  3. 字符串长度是否合理（JWT通常200-500字符）
- **当前调用链分析**: `auth.controller.ts:44-48`中，logout路由有`authMiddleware`前置保护，因此到达`revokeToken`的token一定是经过JWT验证的。**当前调用链是安全的。**
- **风险**: `revokeToken`作为公共导出函数，未来可能被其他调用方使用（如管理员强制下线功能），那时无验证就成为漏洞。此外，任意长字符串可作为Map key，放大H-1的DoS效果
- **修复**: 添加基础格式校验
```typescript
const MAX_TOKEN_LENGTH = 2048;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function revokeToken(token: string, expiresInMs: number): void {
  if (!token || expiresInMs <= 0) return;
  if (token.length > MAX_TOKEN_LENGTH || !JWT_PATTERN.test(token)) return;
  revokedTokens.set(token, Date.now() + expiresInMs);
  startCleanup();
}
```

### MEDIUM (4项)

**M-1: 模块内零安全日志 — 可审计性缺失**
- **位置**: 整个文件（L1-59）
- **问题**: 四个公共函数均无日志输出：
  - `revokeToken()`: 不记录哪个token被撤销、由谁触发
  - `isTokenRevoked()`: 不记录拦截事件
  - `clearBlacklist()`: 不记录黑名单被清空（可能是安全事件）
  - `parseExpiryToMs()`: 不记录解析失败事件
- **影响**: 安全事件发生时无法追溯。例如：
  - 异常大量的token撤销（DoS前兆）无法被监控系统发现
  - 黑名单被意外清空（可能是代码bug或攻击）无记录
- **修复**: 关键操作添加安全日志
```typescript
export function revokeToken(token: string, expiresInMs: number): void {
  if (!token || expiresInMs <= 0) return;
  // 日志中使用token hash而非明文
  logger.info('token.revoked', { tokenHash: sha256(token).slice(0, 16), expiresInMs });
  revokedTokens.set(token, Date.now() + expiresInMs);
  startCleanup();
}
```

**M-2: clearBlacklist()导出无保护 — 批量撤销清除**
- **位置**: L38-44 `clearBlacklist()`
- **问题**: 该函数清除全部已撤销token。当前未被任何生产代码调用（仅测试使用），但作为公共导出API存在风险：
  1. 如果未来有路由/管理端点调用，一次调用即可让所有已撤销token复活
  2. 测试代码中频繁调用但无保护（如测试崩溃不执行afterEach清理，影响其他测试套件）
- **修复**: 重命名为`_clearBlacklistForTesting()`或添加确认参数
```typescript
/** 仅用于测试清理。生产环境禁止调用。 */
export function clearBlacklist(): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('SECURITY: clearBlacklist() called in production — this should never happen');
    return;
  }
  revokedTokens.clear();
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
}
```

**M-3: JWT token明文存储 — 内存信息泄露风险**
- **位置**: L23 `revokedTokens.set(token, Date.now() + expiresInMs)`
- **问题**: Map key存储完整JWT token字符串。如果攻击者能读取进程内存（如通过/proc/pid/mem、核心转储、调试器附加），可获取全部已撤销token
- **影响**: 在JWT 2h有效窗口内，被撤销的token仍可被利用（虽然已被撤销，但通过其他漏洞可能绕过黑名单检查）
- **当前缓解**: 已撤销token本身已被拦截，泄露价值有限
- **修复**: 存储token的SHA-256 hash而非明文
```typescript
import { createHash } from 'crypto';
function tokenKey(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

// 使用: revokedTokens.set(tokenKey(token), Date.now() + expiresInMs);
// 查询: revokedTokens.get(tokenKey(token))
```

**M-4: isTokenRevoked对空token返回false — 语义不安全**
- **位置**: L28 `if (!token) return false`
- **问题**: 空token被视为"未撤销"，这是"fail-open"语义。安全关键系统应采用"fail-closed"——无法判断时拒绝访问
- **当前缓解**: `auth.middleware.ts:26`已检查Bearer前缀和空token，空token不会到达`isTokenRevoked`
- **修复**: 改为`if (!token) return false`（保持false但添加注释说明安全性依赖上游校验），或改为`if (!token) throw new Error('token required')`

### LOW (3项)

**L-1: NaN expiresInMs导致token永不过期**
- **位置**: L22 `if (!token || expiresInMs <= 0) return`
- **问题**: `NaN <= 0`为false，不会触发提前返回。后续`Date.now() + NaN = NaN`，`isTokenRevoked`中`NaN <= Date.now()`为false，token被视为永不过期
- **风险**: 极低（调用方为受控的`auth.controller.ts`，传入值由`parseExpiryToMs`保证为数字）
- **修复**: `if (!token || expiresInMs <= 0 || Number.isNaN(expiresInMs)) return`

**L-2: parseExpiryToMs整数溢出**
- **位置**: L51-57 乘法链
- **问题**: 极大值输入（如`999999d`）可能导致`Number.MAX_SAFE_INTEGER`溢出，产生不准确的过期时间
- **风险**: 极低（config的validateTimeSpan已在config层校验合理性，且实际配置不会使用极端值）
- **修复**: 添加`if (result > Number.MAX_SAFE_INTEGER) return 7_200_000`

**L-3: 无独立安全测试**
- **位置**: 测试文件缺失
- **问题**: 无`tests/apis/utils/token-blacklist.util.test.ts`。以下安全边界无测试覆盖：
  - 超长token字符串的DoS场景
  - NaN/negative expiresInMs
  - parseExpiryToMs各单位(w/y缺失)的正确性
  - clearBlacklist在production环境的行为
  - 并发revokeToken + isTokenRevoked的一致性
- **修复**: 创建独立安全测试文件

---

## 攻击面分析

### 调用链安全验证

```
POST /api/v1/auth/logout
  → authMiddleware (JWT验证 ✓ + 黑名单检查 ✓)
  → auth.controller.logout()
    → parseExpiryToMs(config.jwt.expiresIn)
      ⚠ 正则不匹配时静默回退2h (H-2)
    → revokeToken(token, expiryMs)
      ⚠ 无容量上限 (H-1)
      ⚠ 无JWT格式验证 (H-4，当前被上游缓解)
      ⚠ 明文存储 (M-3)
      ✗ 无安全日志 (M-1)

GET /api/v1/auth/verify (或其他需认证路由)
  → authMiddleware
    → isTokenRevoked(token)
      ✓ 已过期token惰性清理
      ⚠ 空token fail-open (M-4)
      ✗ 无拦截日志 (M-1)
    → jwt.verify() ← 双重验证（黑名单+签名）
```

### 安全边界总结

| 边界 | 保护措施 | 状态 |
|------|----------|------|
| 未认证访问logout | authMiddleware | ✅ 安全 |
| 无效token填充黑名单 | authMiddleware JWT验证 | ✅ 当前安全，但函数本身无验证 |
| 内存耗尽DoS | rate-limit 500/min | ⚠ 不足，无Map容量上限 |
| 黑名单提前清理导致token复活 | parseExpiryToMs单位一致性 | ❌ w/y单位不匹配 |
| 进程重启后token复活 | 无 | ❌ 无持久化 |
| 安全事件可追溯性 | logger.util.ts | ❌ 模块内未使用 |

---

## 与已有评审的差异

| 发现项 | 质量评审 | 架构评审 | 安全评审 | 说明 |
|--------|----------|----------|----------|------|
| Map无容量上限 | H-1 | H-2 | **H-1** | 三份评审一致，安全视角关注DoS攻击向量 |
| parseExpiryToMs单位不一致 | H-2 | H-4 | **H-2** | 安全视角关注"被撤销token复活"漏洞 |
| parseExpiryToMs静默回退 | H-3 | - | 合并到H-2 | 安全视角将其归入单位不一致的后果 |
| 进程重启丢失 | - | 提及可扩展性 | **H-3** | 安全视角关注"token复活"攻击场景 |
| 撤销前无JWT验证 | - | - | **H-4** | 安全视角独有：防御性编程+未来调用安全 |
| 零安全日志 | - | - | **M-1** | 安全视角独有：可审计性 |
| clearBlacklist无保护 | - | - | **M-2** | 安全视角独有：生产环境保护 |
| JWT明文存储 | - | M-4(内存效率) | **M-3** | 安全视角关注信息泄露 |
| 空token fail-open | - | - | **M-4** | 安全视角独有：fail-closed原则 |

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | H-2: parseExpiryToMs补充w/y单位+警告日志 | 30min |
| P1 | H-1: 添加MAX_BLACKLIST_SIZE容量上限 | 30min |
| P1 | H-4: revokeToken添加JWT格式校验 | 20min |
| P1 | M-1: 关键操作添加安全日志 | 30min |
| P2 | H-3: 重启时失效机制（短期：启动时记录时间戳，authMiddleware检查iat） | 1h |
| P2 | M-2: clearBlacklist生产环境保护 | 10min |
| P2 | M-3: token hash存储 | 30min |
| P2 | L-1~L-3: 边界加固+测试 | 1h |
| **总计** | | **~4h** |

---

## 修复后预期评分

| 修复范围 | 预期评分 |
|----------|----------|
| 仅修复H-1 + H-2 + H-4（P0+P1核心安全项） | 7.5/10 |
| 修复全部HIGH + M-1（安全日志） | 8.5/10 |
| 修复全部发现项 | 9.0/10 |

---

## 总结

`token-blacklist.util.ts`的token撤销机制在当前默认配置（2h JWT有效期）下功能正确，与auth middleware集成良好。但存在4项HIGH安全风险：(1) Map无容量上限可被DoS攻击利用；(2) `parseExpiryToMs`与config验证单位不一致，在`w`/`y`单位配置下导致被撤销token复活；(3) 进程重启丢失全部撤销记录；(4) `revokeToken`无JWT格式校验（当前被上游缓解但缺乏纵深防御）。此外，模块零安全日志导致安全事件无法追溯。修复H-1/H-2/H-4三项后安全评分可达7.5/10，全面修复后可达9.0/10。
