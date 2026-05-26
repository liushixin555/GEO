# token-blacklist.util.ts 架构评审

**文件**: `apis/utils/token-blacklist.util.ts`
**评审类型**: 软件架构评审
**评审日期**: 2026-05-26
**评审结论**: **CONDITIONAL APPROVE 5.8/10** — 模块级单例状态无封装+职责边界模糊(parseExpiryToMs归属错误)+无容量上限DoS+定时器生命周期与Map状态解耦不充分

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 单一职责 (SRP) | 6/10 | token黑名单管理与时间解析(parseExpiryToMs)是两个独立关注点，后者应归属config或独立util |
| 封装性 | 4/10 | 模块级可变状态(revokedTokens Map + cleanupTimer)完全暴露于模块作用域，无类/闭包封装，无法多实例化 |
| 依赖方向 | 7/10 | 依赖方向正确（util不依赖controller/service），但parseExpiryToMs反向消费了config的配置语义 |
| 可扩展性 | 3/10 | 内存Map硬编码，无法切换为Redis/外部存储；单实例部署约束已写死在架构中 |
| 生命周期管理 | 5/10 | cleanupTimer启动/停止逻辑分散在revokeToken/clearBlacklist中，isTokenRevoked不参与生命周期 |
| 可测试性 | 5/10 | clearBlacklist()是唯一重置手段，但无法模拟时间推进，parseExpiryToMs纯函数但无独立测试 |
| 错误处理策略 | 6/10 | revokeToken静默丢弃无效输入，parseExpiryToMs静默回退默认值，配置错误不可见 |

---

## 详细发现

### CRITICAL (1项)

**C-1: 模块级可变单例状态无封装 — 多实例/测试隔离不可行**
- **位置**: L1-3 `const revokedTokens = new Map()` / `let cleanupTimer`
- **问题**: 模块顶层声明可变状态，Node.js模块缓存机制确保单例。这意味着：
  1. 无法创建独立的黑名单实例（如按tenant隔离）
  2. 测试间状态泄漏风险——`clearBlacklist()`是唯一重置手段，但测试中忘记调用会导致跨test suite污染
  3. 无法在同一个进程中运行多套黑名单（如不同JWT策略对应不同过期时间）
- **架构影响**: 当前单实例部署场景下可工作，但违背了依赖注入原则，未来迁移到Redis/多实例时会需要完全重写调用方
- **修复方向**: 封装为类或工厂函数
```typescript
export function createTokenBlacklist(options?: { maxSize?: number; cleanupIntervalMs?: number }) {
  const store = new Map<string, number>();
  let timer: NodeJS.Timeout | null = null;
  // ... 返回 revokeToken / isTokenRevoked / destroy 方法
  return { revokeToken, isTokenRevoked, destroy };
}
```

### HIGH (4项)

**H-1: parseExpiryToMs 职责归属错误 — 违反SRP**
- **位置**: L46-59
- **问题**: `parseExpiryToMs` 是通用时间解析函数，与token黑名单管理无任何关系。它解决的是"将config字符串转为毫秒数"的问题，应归属：
  - `apis/utils/time.util.ts`（通用工具）
  - 或 `apis/config/index.ts`（与`validateTimeSpan`并列）
- **架构影响**: 消费者`auth.controller.ts`需要同时导入`token-blacklist.util`和config，形成"为了用时间解析而引入安全模块"的怪异依赖
- **修复**: 提取到独立util，blacklist模块只接收`number`类型的`expiresInMs`

**H-2: 黑名单Map无容量上限 — DoS攻击向量**
- **位置**: L1 `new Map<string, number>()` + L23 `revokedTokens.set()`
- **问题**: Map大小无上限。2h JWT过期窗口内：
  - 假设限流500 req/min → 每次logout撤销一个token → 2h内累积60K条目
  - 每条目约200字节（JWT token字符串 + Map开销） → 12MB
  - 无限流或提高并发时线性增长
- **架构影响**: 内存无界增长在容器化环境中尤为危险（OOM Killer）
- **修复**: 添加`MAX_BLACKLIST_SIZE`，超出时触发即时清理或LRU淘汰

**H-3: 定时器生命周期与Map状态解耦不充分**
- **位置**: L6-19 `startCleanup()` + L38-44 `clearBlacklist()`
- **问题**:
  1. `startCleanup()`仅在`revokeToken()`中调用——如果通过其他方式（如直接Map引用）写入条目，定时器不启动
  2. `isTokenRevoked()`中的惰性删除(L31-33)与定时器清理(L8-14)职责重叠，形成双路径清理
  3. `clearBlacklist()`清除Map但调用方可能持有旧引用（虽然当前代码无此问题）
- **架构影响**: 状态机不完整——Map有"空→有数据→空"的生命周期，但定时器有"未启动→运行中→已停止"的独立生命周期，两者之间缺乏正式的同步机制
- **修复**: 统一为`ensureCleanupRunning()`/`stopCleanupIfEmpty()`方法，Map为空时自动停止定时器

**H-4: parseExpiryToMs与config验证单位不一致**
- **位置**: L47 `/^(\d+)(ms|s|m|h|d)?$/`
- **问题**: `config/index.ts`的`validateTimeSpan`支持`w`(周)和`y`(年)，但`parseExpiryToMs`正则不包含这些单位。当`JWT_EXPIRES_IN=1w`时：
  - config验证通过 ✓
  - `parseExpiryToMs('1w')` → 正则不匹配 → 静默回退7_200_000(2h)
  - JWT实际有效期7天，但黑名单2h后清理 → 被撤销的token在2h~7天之间仍可使用
- **架构影响**: 两个模块对同一配置字符串的解析语义不一致，是典型的"validation-parser drift"
- **修复**: 共享单位常量或提取`parseTimeSpan`为config模块的公共API

### MEDIUM (4项)

**M-1: 无独立测试文件 — 架构可测试性缺陷**
- **现状**: 无`tests/apis/utils/token-blacklist.util.test.ts`
- **架构影响**: 模块的所有测试都是通过controller/middleware间接执行的，意味着：
  1. 无法单独验证parseExpiryToMs各单位的边界条件
  2. 无法测试cleanup定时器的精确行为（需要模拟时间）
  3. 测试耦合度高——修改blacklist实现可能需要修改controller/middleware测试
- **修复**: 创建独立测试，覆盖单元级边界条件

**M-2: 惰性清理与定时清理双重路径**
- **位置**: `isTokenRevoked()` L31-33 vs `startCleanup()` L8-14
- **问题**: 同一个过期token有两条删除路径：(1)isTokenRevoked访问时发现过期则删除；(2)定时器每60s扫描删除。双路径增加了推理复杂度
- **架构影响**: 低风险但增加了维护认知负担
- **建议**: 明确单一清理策略——要么纯惰性（去掉定时器），要么纯定时（isTokenRevoked不删除）

**M-3: 模块无barrel导出 — 与项目util模式不一致**
- **位置**: `apis/utils/index.ts`未导出token-blacklist函数
- **现状**: `db.util`、`response.util`、`error-handler.util`均从barrel导出，token-blacklist是唯一例外
- **分析**: 直接引用可防止内部模块被意外使用（安全考虑），但破坏了一致性
- **建议**: 保持现状但添加注释说明不导出的原因

**M-4: revokedTokens存储完整JWT token — 内存效率低**
- **位置**: L23 `revokedTokens.set(token, ...)`
- **问题**: Map的key是完整JWT token字符串（通常200-500字符），实际只需token的唯一标识（如jti claim或token的SHA-256 hash）
- **架构影响**: 同一token被多次引用时存储冗余；内存占用约为hash方案的10-50倍
- **建议**: 存储`sha256(token).slice(0,16)`作为key，减少内存占用

### LOW (3项)

**L-1: cleanupInterval 60s硬编码**
- **位置**: L4 `const CLEANUP_INTERVAL_MS = 60_000`
- **建议**: 提取为可配置参数，与JWT过期时间成比例调整

**L-2: parseInt无进制参数**
- **位置**: L49 `parseInt(match[1], 10)`
- **现状**: 已传入基数10，无问题。此项仅确认代码正确

**L-3: 缺少模块级JSDoc**
- **位置**: 文件顶部
- **建议**: 添加文档说明用途、单实例部署限制、与JWT过期时间的关系

---

## 架构依赖关系图

```
┌─────────────────────┐
│  auth.controller.ts  │
│  logout()            │
└──────┬──────┬───────┘
       │      │
       │      ▼
       │  parseExpiryToMs()  ◄── 职责归属错误(H-1)
       │      │
       ▼      ▼
┌──────────────────────────┐     ┌──────────────────┐
│  token-blacklist.util.ts │     │  config/index.ts  │
│  ┌──────────────────┐    │     │  validateTimeSpan │ ◄── 单位不一致(H-4)
│  │ revokedTokens Map│    │     │  jwt.expiresIn    │
│  │ (模块级单例)      │    │     └──────────────────┘
│  └──────────────────┘    │
│  ┌──────────────────┐    │
│  │ cleanupTimer     │    │
│  │ (生命周期耦合)    │    │
│  └──────────────────┘    │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────────┐
│  auth.middleware.ts   │
│  authMiddleware()     │
│  isTokenRevoked()     │
└─────────────────────┘
```

---

## 与质量评审的差异

本次架构评审与已有质量评审(`tasks/review/token-blacklist.util.ts.quality.md`)的关注点差异：

| 发现项 | 质量评审 | 架构评审 | 差异说明 |
|--------|----------|----------|----------|
| parseExpiryToMs归属 | 未关注 | **H-1** | 架构视角关注职责划分 |
| 模块单例无封装 | 未关注 | **C-1** | 架构视角关注可扩展性 |
| 定时器/Map双生命周期 | H-4(低视角) | **H-3** | 架构视角关注状态机完整性 |
| 存储完整token | 未关注 | **M-4** | 架构视角关注内存效率 |
| 双路径清理 | 未关注 | **M-2** | 架构视角关注策略一致性 |

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | C-1: 封装为工厂函数/createTokenBlacklist | 1h |
| P0 | H-1: 提取parseExpiryToMs到独立util | 30min |
| P0 | H-4: 统一parseExpiryToMs与validateTimeSpan单位 | 15min |
| P1 | H-2: 添加MAX_BLACKLIST_SIZE上限 | 30min |
| P1 | H-3: 统一定时器生命周期管理 | 30min |
| P1 | M-1: 创建独立测试文件 | 1h |
| P2 | M-2~M-4, L-1~L-3 | 45min |
| **总计** | | **~4.5h** |

---

## 修复后预期评分

| 修复范围 | 预期评分 |
|----------|----------|
| 仅修复C-1 + H-1 + H-4（P0项） | 7.0/10 |
| 修复全部CRITICAL + HIGH | 8.0/10 |
| 修复全部发现项 | 8.5/10 |

---

## 总结

`token-blacklist.util.ts`作为token撤销机制，在单实例部署场景下功能正确，但架构层面存在三个核心问题：(1) 模块级可变单例无封装，无法多实例化或切换存储后端；(2) `parseExpiryToMs`职责归属错误，且与config验证单位不一致，形成安全盲区；(3) 定时器与Map状态缺乏统一的生命周期管理。修复P0项（封装+职责拆分+单位统一）后，架构可达7.0/10；全面修复后可达8.5/10。
