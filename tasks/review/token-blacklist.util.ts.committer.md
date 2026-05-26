# apis/utils/token-blacklist.util.ts — Code Committer 综合审核报告

| 属性 | 值 |
|---|---|
| **文件** | `apis/utils/token-blacklist.util.ts` (59行) |
| **评审类型** | Code Committer 综合审核（安全+架构+质量 三维交叉裁定） |
| **综合评分** | **6.0 / 10** → 修复后 **8.5 / 10** |
| **裁决** | **✅ APPROVE**（阻断项已全部修复） |
| **评审日期** | 2026-05-26 |

---

## 三维评审汇总

| 维度 | 评分 | 裁决 | 评审文件 |
|---|---|---|---|
| 安全 | 6.0→8.5/10 | ✅ APPROVE | `tasks/review/token-blacklist.util.ts.security.md` |
| 架构 | 5.8→8.0/10 | ✅ APPROVE | `tasks/review/token-blacklist.util.ts.architecture.md` |
| 质量 | 6.5→8.5/10 | ✅ APPROVE | `tasks/review/token-blacklist.util.ts.quality.md` |

---

## 阻断项（BLOCKING）— 合并前必须修复

### B-1. parseExpiryToMs 单位不一致导致被撤销 token 复活 [安全 H2 + 架构 H4 + 质量 H2]

- **严重程度**: CRITICAL
- **跨维确认**: 安全 H2 + 架构 H4 + 质量 H2 — 三份评审独立发现同一问题，置信度最高
- **现状**:
  - `config/index.ts:137` 的 `validateTimeSpan` 正则：`/^\d+(ms|s|m|h|d|w|y)$/`（支持 7 种单位）
  - `token-blacklist.util.ts:47` 的 `parseExpiryToMs` 正则：`/^(\d+)(ms|s|m|h|d)?$/`（仅支持 5 种单位，缺 `w`/`y`）
- **攻击场景**:
  1. 管理员配置 `JWT_EXPIRES_IN=1w`（7 天有效期）
  2. config 验证通过 → JWT 签发 7 天有效 token
  3. 用户 logout → `parseExpiryToMs('1w')` → 正则不匹配 → **静默回退 7,200,000ms（2h）**
  4. 黑名单 2h 后清理该 token，但 JWT 仍有 5 天有效期
  5. **被撤销的 token 在 2h~7 天之间仍可正常使用**
- **当前缓解**: 默认配置 `JWT_EXPIRES_IN='2h'` 不触发此漏洞
- **修复**: ✅ 已完成
  - 正则更新为 `/^(\d+)(ms|s|m|h|d|w|y)?$/`（7 种单位完整）
  - 使用 `UNIT_MS` Record 映射替代 switch，包含 `w`/`y`
  - 解析失败时 `logger.error` 输出警告，不再静默回退
  - 整数溢出检查 `Number.MAX_SAFE_INTEGER`
  - 测试覆盖：`should parse weeks (B-1 fix)` / `should parse years (B-1 fix)` / `should match config validateTimeSpan unit set exactly`
- **阻断理由**: 安全漏洞，被撤销 token 可绕过黑名单，三份评审一致认定为最高优先级
- **修复日期**: 2026-05-26

### B-2. 黑名单 Map 无容量上限 → 内存耗尽 DoS [安全 H1 + 架构 H2 + 质量 H1]

- **严重程度**: HIGH
- **跨维确认**: 安全 H1 + 架构 H2 + 质量 H1 — 三份评审独立确认
- **现状**: `revokedTokens` Map 无大小限制，`revokeToken()` 无条件写入
- **攻击向量**:
  - 攻击者获取有效凭证，高频调用 `POST /api/v1/auth/logout`
  - rate-limit 限制 500 req/min，2h 窗口内可累积 ~60K 条目
  - 每条目 ~600 字节（JWT 字符串 + Map 开销） → 60K × 600B ≈ 36MB
  - 无限流或提高并发时线性增长，最终 OOM
- **修复**: ✅ 已完成
  - `MAX_BLACKLIST_SIZE = 10_000` 常量限制
  - `revokeToken()` 容量检查：超限时先清理过期条目，仍超限则拒绝并 `logger.warn`
  - 额外纵深防御：JWT 格式校验（`JWT_PATTERN`）+ 长度限制（`MAX_TOKEN_LENGTH = 2048`）
  - SHA-256 hash 存储（`tokenKey()`），不存储明文 JWT
  - `NaN` 输入检查
  - 测试覆盖：`should respect MAX_BLACKLIST_SIZE capacity` / `should reject non-JWT format strings` / `should reject excessively long tokens`
- **阻断理由**: DoS 漏洞，OOM 可导致全部用户服务中断
- **修复日期**: 2026-05-26

---

## 高优先级建议（HIGH）— 建议本迭代修复

### H-1. 模块级可变单例无封装 — 多实例/测试隔离不可行 [架构 C-1]

- **跨维确认**: 架构 CRITICAL，安全评审间接提及（进程重启丢失 H3）
- **现状**: `revokedTokens` Map 和 `cleanupTimer` 在模块顶层声明，Node.js 模块缓存机制确保单例
- **影响**:
  1. 无法创建独立黑名单实例（如按 tenant 隔离）
  2. 测试间状态泄漏风险——忘记调用 `clearBlacklist()` 导致跨 suite 污染
  3. 无法切换存储后端（Redis/外部存储）
- **当前缓解**: 项目为单实例部署（CLAUDE.md 已注明），当前场景可工作
- **修复方向**: 封装为工厂函数
```typescript
export function createTokenBlacklist(options?: { maxSize?: number; cleanupIntervalMs?: number }) {
  const store = new Map<string, number>();
  let timer: ReturnType<typeof setInterval> | null = null;
  // ... 返回 revokeToken / isTokenRevoked / destroy 方法
  return { revokeToken, isTokenRevoked, destroy };
}
```
- **Committer 判定**: 当前不阻断——单实例部署下功能正确，但应列入技术债务计划
- **状态**: 🔜 技术债务（不阻断）
- **预估工时**: 1h

### H-2. parseExpiryToMs 职责归属错误 — 违反 SRP [架构 H-1]

- **跨维确认**: 架构评审独有发现
- **现状**: `parseExpiryToMs` 是通用时间解析函数，与 token 黑名单管理无关系
- **影响**: 消费者 `auth.controller.ts` 需同时导入 `token-blacklist.util` 和 config，形成"为了用时间解析而引入安全模块"的怪异依赖
- **Committer 判定**: 设计优化，不阻断。可在 H-1 工厂函数重构时一并处理
- **状态**: 🔜 技术债务（不阻断）
- **预估工时**: 30 min

### H-3. 进程重启丢失全部撤销记录 — 持久化缺失 [安全 H3]

- **跨维确认**: 安全评审独有发现
- **现状**: 所有撤销记录存储在进程内存，重启后全部丢失
- **攻击场景**: 用户主动 logout → 服务器重启 → 已撤销 token 复活
- **当前缓解**: JWT 有效期仅 2h，风险窗口有限
- **短期缓解**: ✅ 已实施 — `serverStartEpoch` 记录启动时间，`getServerStartTime()` 导出供 authMiddleware 使用
- **Committer 判定**: 当前 2h JWT 有效期下风险可控，不阻断，但须记录为技术债务
- **状态**: ✅ 短期缓解已实施（长期仍需 Redis 持久化）
- **预估工时**: 1h（短期缓解）/ 4h（Redis 持久化）

### H-4. revokeToken 无 JWT 格式校验 — 纵深防御缺失 [安全 H4]

- **跨维确认**: 安全评审独有发现
- **现状**: `revokeToken` 直接将任意字符串写入 Map，不验证 JWT 格式
- **当前缓解**: 当前唯一调用方 `auth.controller.ts:43-48` 有 `authMiddleware` 前置保护，到达 `revokeToken` 的 token 一定经过 JWT 验证
- **风险**: 作为公共导出函数，未来新调用方可能绕过上游验证
- **Committer 判定**: 当前调用链安全，但防御性编程应加强。与 B-2 的容量限制合并修复
- **状态**: ✅ 已修复（含在 B-2 修复中：JWT_PATTERN + MAX_TOKEN_LENGTH）
- **预估工时**: 15 min（含在 B-2 中）

### H-5. 零安全日志 — 可审计性缺失 [安全 M1]

- **跨维确认**: 安全评审独有发现
- **现状**: 四个公共函数均无日志输出（`revokeToken`/`isTokenRevoked`/`clearBlacklist`/`parseExpiryToMs`）
- **影响**: 安全事件（异常大量撤销、黑名单被意外清空）无法追溯
- **Committer 判定**: 作为安全模块缺乏审计日志，应修复但不阻断
- **状态**: ✅ 已修复（logger.info/warn/error 覆盖 revoke/isRevoked/clearBlacklist/parseExpiry）
- **预估工时**: 30 min

---

## 中优先级建议（MEDIUM）— 可下迭代修复

| # | 问题 | 来源维度 | 修复建议 | 工时 |
|---|------|---------|---------|------|
| M-1 | 零独立测试覆盖 | 质量 M1 + 安全 L3 | 创建 `tests/apis/utils/token-blacklist.util.test.ts` | 1h |
| M-2 | parseExpiryToMs 静默回退隐藏配置错误 | 质量 H3 | 解析失败时打印 console.error | 5 min |
| M-3 | clearBlacklist 生产环境无保护 | 安全 M2 | 添加 NODE_ENV 检查或重命名 | 10 min |
| M-4 | JWT token 明文存储 | 安全 M3 | 存储 SHA-256 hash 前 32 字符 | 30 min |
| M-5 | 定时器生命周期与 Map 状态解耦不充分 | 架构 H3 + 质量 H4 | 统一 ensureCleanupRunning/stopCleanupIfEmpty | 30 min |
| M-6 | 惰性清理与定时清理双路径 | 架构 M2 | 统一为单一清理策略 | 20 min |
| M-7 | 未从 barrel 导出 | 质量 M2 | 保持现状，添加注释说明安全考虑 | 5 min |

---

## 低优先级建议（LOW）— 可选

| # | 问题 | 来源 |
|---|------|
| L-1 | NaN expiresInMs 导致 token 永不过期 | 安全 L1 + 质量 L1 |
| L-2 | parseExpiryToMs 整数溢出风险 | 安全 L2 + 质量 L2 |
| L-3 | 缺少模块级 JSDoc | 架构 L3 + 质量 L3 |
| L-4 | cleanupTimer 类型可简化为 NodeJS.Timeout | 质量 M3 |
| L-5 | parseExpiryToMs switch default 不可达 | 质量 M4 |
| L-6 | CLEANUP_INTERVAL_MS 60s 硬编码 | 架构 L1 |
| L-7 | 存储完整 JWT 字符串（内存效率低） | 架构 M4 |

---

## 问题交叉分析

### 跨维度重复发现（高置信度）

| 问题 | 发现次数 | 维度 | 最终裁定 |
|------|---------|------|---------|
| parseExpiryToMs 单位不一致 | 3 | 安全+架构+质量 | **B-1 BLOCKING** |
| Map 无容量上限 DoS | 3 | 安全+架构+质量 | **B-2 BLOCKING** |
| 模块级单例无封装 | 2 | 架构(C)+安全(H3) | H-1 HIGH |
| parseExpiryToMs 静默回退 | 2 | 质量+安全 | M-2 MEDIUM |
| 定时器生命周期耦合 | 2 | 架构+质量 | M-5 MEDIUM |
| 缺少独立测试 | 2 | 质量+安全 | M-1 MEDIUM |
| NaN expiresInMs | 2 | 安全+质量 | L-1 LOW |

### 调用链安全验证

```
POST /api/v1/auth/logout
  → authMiddleware (JWT 验证 ✓)
  → auth.controller.logout()
    → parseExpiryToMs(config.jwt.expiresIn)
      ❌ w/y 单位不匹配 → 静默回退 2h (B-1)
    → revokeToken(token, expiryMs)
      ❌ 无容量上限 (B-2)
      ⚠ 无 JWT 格式校验，但上游已验证 (H-4, 非阻断)
      ✗ 无安全日志 (H-5)

GET /api/v1/* (需认证路由)
  → authMiddleware
    → isTokenRevoked(token)
      ✓ 已过期 token 惰性清理
      ⚠ 空 token fail-open (上游已拦截)
      ✗ 无拦截日志 (H-5)
    → jwt.verify() ← 双重验证（黑名单 + 签名）
```

### 安全边界总结

| 边界 | 保护措施 | 状态 |
|------|----------|------|
| 未认证访问 logout | authMiddleware JWT 验证 | ✅ 安全 |
| 无效 token 填充黑名单 | authMiddleware JWT 验证 | ✅ 当前安全 |
| 内存耗尽 DoS | rate-limit 500/min | ⚠ **B-2 不足**，无 Map 容量上限 |
| 黑名单提前清理 → token 复活 | parseExpiryToMs 单位一致性 | ❌ **B-1 不匹配** |
| 进程重启 → token 复活 | 无持久化 | ⚠ H-3，2h 窗口风险有限 |
| 安全事件可追溯性 | logger.util.ts 存在但未使用 | ⚠ H-5 缺失 |

---

## 核心优点

1. **代码简洁** — 59 行实现完整的 token 撤销机制，无冗余逻辑
2. **核心功能正确** — 在默认配置（`JWT_EXPIRES_IN='2h'`）下 token 撤销和拦截逻辑完全正确
3. **unref() 防阻塞** — L16-18 正确处理定时器不阻塞进程退出
4. **双重清理策略** — 惰性清理（isTokenRevoked L31-33）+ 定时清理（setInterval L8-14）确保过期条目最终被移除
5. **API 设计清晰** — 4 个公共函数职责明确，命名自文档化
6. **与 middleware 集成良好** — authMiddleware 在 JWT 验证前检查黑名单，形成双重校验

---

## 与同类模块 Committer 评审对比

| 文件 | Committer 评分 | 裁决 | BLOCKING 数 |
|------|---------------|------|-------------|
| project.routes.ts | 7.0/10 | CONDITIONAL APPROVE | 2 |
| MarkdownViewer.tsx | 7.6/10 | APPROVE | 0 |
| token-blacklist.util.ts | **6.0/10** | **CONDITIONAL APPROVE** | **2** |
| ArticleImageManager.tsx | 5.6/10 | CONDITIONAL APPROVE | 4 |
| KeywordDetail.tsx | 4.2/10 | REQUEST CHANGES | 3 |

本模块处于项目中等偏上水平：代码简洁度优于大部分前端组件，但存在跨模块配置解析不一致这一隐蔽安全漏洞。

---

## 最终裁决

### ✅ APPROVE — 通过

**合并条件**: ~~必须修复全部 2 项 BLOCKING 后方可合并~~ 全部 2 项 BLOCKING 已修复。

| 条件 | 修复项 | 状态 |
|------|--------|------|
| B-1 | parseExpiryToMs 补充 `w`/`y` 单位 + 解析失败警告 | ✅ 已修复 |
| B-2 | 添加 MAX_BLACKLIST_SIZE=10_000 容量上限 + 即时清理 | ✅ 已修复 |

**额外修复**: H-3 短期缓解（serverStartEpoch）+ H-4 JWT 格式校验 + H-5 审计日志 + M-2 解析失败日志 + M-3 clearBlacklist 生产保护 + M-4 SHA-256 hash 存储

### 评分更新

| 阶段 | 评分 |
|------|------|
| 初始评审 | 6.0 / 10 |
| 修复 B-1 + B-2 + H-3 + H-4 + H-5 + M-2 ~ M-4 后 | **8.5 / 10** |
| 剩余 H-1 工厂函数 + H-2 SRP 重构后（技术债务） | 9.0 / 10 |

### Committer 备注（更新）

B-1 和 B-2 两项阻断问题已修复，同时完成了 H-3/H-4/H-5/M-2/M-3/M-4 共 6 项非阻断修复，模块安全性和防御能力显著提升。剩余 H-1（工厂函数封装）和 H-2（SRP 职责分离）列入技术债务计划。

---

## 审核签名

**审核人**: Code Committer 审核专家
**审核日期**: 2026-05-26
**修复日期**: 2026-05-26
**代码版本**: dev 分支
**三维评审来源**: `tasks/review/token-blacklist.util.ts.{security|architecture|quality}.md`
**下一步**: 已通过评审。剩余技术债务：H-1 工厂函数封装 + H-2 SRP 职责分离
