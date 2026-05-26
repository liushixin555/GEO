# token-blacklist.util.ts 质量评审

**文件**: `apis/utils/token-blacklist.util.ts`
**评审类型**: 软件质量评审
**评审日期**: 2026-05-26
**评审结论**: **CONDITIONAL APPROVE 6.5/10** — 内存泄漏可控但无上限DoS+parseExpiryToMs静默兜底+零独立测试

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能正确性 | 7/10 | 核心功能正确，但 parseExpiryToMs 正则未覆盖 `w`/`y` 单位（config 的 validateTimeSpan 支持），且 switch default 不可达 |
| 健壮性 | 5/10 | 黑名单无容量上限，清理定时器生命周期管理有改进空间 |
| 可测试性 | 4/10 | 模块级状态（revokedTokens/cleanupTimer）无法重置，无独立测试文件 |
| API 设计 | 8/10 | 公共 API 简洁清晰，职责单一 |
| 安全性 | 6/10 | 内存黑名单单实例限制已知（CLAUDE.md 注明），但无容量防护 |
| 代码质量 | 8/10 | 代码简洁，命名清晰，unref() 防止进程阻塞 |

---

## 详细发现

### CRITICAL (0项)

无。

### HIGH (4项)

**H-1: 黑名单无容量上限 — DoS 攻击向量**
- **位置**: L1 `revokedTokens = new Map<string, number>()`
- **问题**: `revokeToken()` 对 Map 大小无任何限制。攻击者可通过大量 logout 请求（每次撤销一个新 token）使 Map 无限增长，最终 OOM。即使清理定时器 60s 运行一次，2h 过期窗口内可累积 ~120K 条目（500 req/min × 2h）
- **风险**: 内存耗尽导致进程崩溃，影响可用性
- **修复**: 添加 `MAX_BLACKLIST_SIZE` 常量（如 10_000），超出时拒绝新条目或 LRU 淘汰最旧条目
```typescript
const MAX_BLACKLIST_SIZE = 10_000;

export function revokeToken(token: string, expiresInMs: number): void {
  if (!token || expiresInMs <= 0) return;
  if (revokedTokens.size >= MAX_BLACKLIST_SIZE) {
    // 超出上限时清理过期条目后再判断
    cleanupExpired();
    if (revokedTokens.size >= MAX_BLACKLIST_SIZE) return;
  }
  revokedTokens.set(token, Date.now() + expiresInMs);
  startCleanup();
}
```

**H-2: parseExpiryToMs 正则与 config 验证不一致**
- **位置**: L47 `/^(\d+)(ms|s|m|h|d)?$/`
- **问题**: config 的 `validateTimeSpan`（config/index.ts:136-140）支持 `w`（周）和 `y`（年）单位，但 `parseExpiryToMs` 正则不匹配这些单位。如果 `JWT_EXPIRES_IN` 配置为 `1w` 或 `1y`，`parseExpiryToMs` 的正则不匹配，静默回退到 `7_200_000`（2h），与 JWT 实际过期时间严重不一致
- **影响**: token 在 JWT 端有效期远超黑名单记录的过期时间，被撤销的 token 在黑名单清理后仍可使用
- **修复**: 统一正则与 validateTimeSpan 的单位集合
```typescript
export function parseExpiryToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(ms|s|m|h|d|w|y)?$/);
  // ...
  case 'w': return value * 604_800_000;
  case 'y': return value * 31_536_000_000;
}
```

**H-3: parseExpiryToMs 静默回退隐藏配置错误**
- **位置**: L48 `if (!match) return 7_200_000`
- **问题**: 当输入无法解析时，静默返回 2h 默认值而不抛出异常。这意味着配置拼写错误（如 `2hour`、`120sec`）不会被检测到，token 黑名单过期时间可能与 JWT 实际过期时间不一致
- **修复**: 抛出错误或在开发环境打印警告
```typescript
if (!match) {
  console.error(`WARNING: parseExpiryToMs cannot parse "${expiresIn}", defaulting to 2h`);
  return 7_200_000;
}
```

**H-4: 清理定时器无法外部停止/重启**
- **位置**: L3-19 `cleanupTimer` / `startCleanup()`
- **问题**: `clearBlacklist()` 可停止定时器，但只有 `revokeToken()` 能重新启动。如果调用 `clearBlacklist()` 后直接通过 `revokedTokens.set()`（内部引用）添加条目，定时器不会重启。虽然当前代码没有这种调用模式，但定时器生命周期与 Map 状态耦合不紧密
- **影响**: 低风险，但模块级 `cleanupTimer` 状态管理不够健壮
- **修复**: `isTokenRevoked()` 或定时检查中也可触发 `startCleanup()`

### MEDIUM (4项)

**M-1: 无独立测试文件**
- **现状**: `token-blacklist.util.ts` 没有独立测试文件（`tests/**/token-blacklist*.test.ts` 不存在），仅在 `auth.controller.test.ts` 和 `auth.middleware.test.ts` 中间接测试
- **影响**: 边界条件（空 token、负数 expiresInMs、超大值、parseExpiryToMs 各单位）缺乏直接测试覆盖；覆盖率报告中 `parseExpiryToMs` 在多个覆盖率目录中标记为 `fstat-no`（未覆盖）
- **修复**: 创建 `tests/apis/utils/token-blacklist.util.test.ts`，覆盖所有公共函数和边界条件

**M-2: revokedTokens 未从 barrel 导出**
- **位置**: `apis/utils/index.ts`
- **问题**: `token-blacklist.util` 的函数未从 `apis/utils/index.ts` barrel 导出。消费者（`auth.controller.ts`、`auth.middleware.ts`）直接引用 `../utils/token-blacklist.util`
- **影响**: 与项目其他 util（`db.util`、`response.util`、`error-handler.util`）统一从 barrel 导出的模式不一致。不过考虑到这是安全敏感模块，直接引用也有优势（防止意外内部访问），暂不强制要求修改
- **建议**: 保持现状但添加注释说明意图，或统一到 barrel 导出

**M-3: cleanupTimer 类型推断可简化**
- **位置**: L3 `let cleanupTimer: ReturnType<typeof setInterval> | null = null`
- **问题**: 使用 `ReturnType<typeof setInterval>` 间接获取类型，虽然可移植（Node vs Browser 的 setInterval 返回值不同），但可读性略差
- **建议**: 可改用 `NodeJS.Timeout | null`（项目已确定 Node 运行时）

**M-4: parseExpiryToMs 的 switch default 不可达**
- **位置**: L57 `default: return value`
- **问题**: 正则已限制 `unit` 只能是 `ms|s|m|h|d`（或 undefined → `ms`），default 分支永远不会执行。虽然作为防御性编程合理，但会给读者造成"还有其他情况"的误解
- **建议**: 移除 default 或添加 `// unreachable — regex constrains unit` 注释

### LOW (3项)

**L-1: `expiresInMs <= 0` 校验应包含 NaN 检查**
- **位置**: L22 `if (!token || expiresInMs <= 0) return`
- **问题**: 如果 `expiresInMs` 为 `NaN`，`NaN <= 0` 为 false，不会提前返回。后续 `Date.now() + NaN` = NaN，`isTokenRevoked` 中 `NaN <= Date.now()` 为 false，token 会被视为永不过期
- **风险**: 极低（调用方传入 NaN 的概率低），但违反防御性编程
- **修复**: `if (!token || expiresInMs <= 0 || Number.isNaN(expiresInMs)) return`

**L-2: 整数溢出风险**
- **位置**: L51-57 `parseExpiryToMs` 乘法链
- **问题**: 大单位输入（如 `999999d`）可能导致 `Number.MAX_SAFE_INTEGER` 溢出，产生不准确的过期时间
- **风险**: 极低（实际配置不会使用如此大的值）
- **修复**: 添加 `if (result > Number.MAX_SAFE_INTEGER) throw new Error(...)`

**L-3: 缺少模块级 JSDoc**
- **位置**: 文件顶部
- **问题**: 模块无文档注释说明用途、限制（单实例部署）、与 JWT 过期时间的关系
- **建议**: 添加模块级注释

---

## 消费者分析

| 消费者 | 引用函数 | 用途 |
|--------|----------|------|
| `auth.controller.ts` (L5, L47-48) | `revokeToken`, `parseExpiryToMs` | logout 时撤销 token |
| `auth.middleware.ts` (L4, L32) | `isTokenRevoked` | 请求拦截时检查 token 是否被撤销 |
| `auth.controller.test.ts` | `clearBlacklist`, `isTokenRevoked` | 测试前后清理/验证 |
| `auth.middleware.test.ts` | `revokeToken`, `clearBlacklist` | 测试黑名单拦截逻辑 |

**调用链**: `logout` → `parseExpiryToMs(config.jwt.expiresIn)` → `revokeToken(token, expiryMs)` → 写入 Map + 启动清理定时器
**检查链**: `authMiddleware` → `isTokenRevoked(token)` → 查询 Map → 已过期则删除并返回 false

---

## 与 config 的耦合分析

`config.jwt.expiresIn` 默认值 `'2h'`，经过 `validateTimeSpan` 校验（支持 `ms/s/m/h/d/w/y`），然后传给 `parseExpiryToMs`（只支持 `ms/s/m/h/d`）。**存在单位支持不一致**（H-2）。

`parseExpiryToMs` 的默认回退 `7_200_000` 恰好是 `2h` 的毫秒数，与 `DEFAULTS.JWT_EXPIRES_IN` 一致，但这是隐式耦合——修改默认过期时间时需要同步更新两处。

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | H-2: parseExpiryToMs 补充 w/y 单位 | 15min |
| P0 | H-3: 静默回退改为警告 | 10min |
| P1 | H-1: 添加 MAX_BLACKLIST_SIZE 上限 | 30min |
| P1 | M-1: 创建独立测试文件 | 1h |
| P2 | H-4, M-2~M-4, L-1~L-3 | 30min |
| **总计** | | **~2.5h** |

---

## 总结

`token-blacklist.util.ts` 代码简洁、职责单一，API 设计清晰。主要问题集中在：(1) parseExpiryToMs 与 config 验证的单位不一致导致潜在的时间不匹配；(2) 黑名单 Map 无容量上限的 DoS 风险；(3) 缺乏独立测试。修复 4 项 HIGH 后预期可达 **8.0/10**。
