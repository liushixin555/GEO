# token-blacklist.util.ts 评审修复记录

**日期**: 2026-05-26
**文件**: `apis/utils/token-blacklist.util.ts`
**评审来源**: `tasks/review/token-blacklist.util.ts.{security|architecture|quality|committer}.md`

---

## 修复项汇总

### BLOCKING（已修复）

| # | 问题 | 修复内容 |
|---|------|---------|
| B-1 | parseExpiryToMs 缺少 w/y 单位 → token 复活 | 正则添加 `w`/`y`，使用 UNIT_MS 常量表 |
| B-2 | Map 无容量上限 → OOM DoS | 添加 MAX_BLACKLIST_SIZE=10_000 + 容量溢出即时清理 |

### HIGH（已修复）

| # | 问题 | 修复内容 |
|---|------|---------|
| H-4 | revokeToken 无 JWT 格式校验 | 添加 JWT_PATTERN 正则 + MAX_TOKEN_LENGTH=2048 |
| H-5 | 零安全日志 | 集成 logger.util.ts，关键操作记录 JSON 日志 |

### MEDIUM（已修复）

| # | 问题 | 修复内容 |
|---|------|---------|
| M-2 | parseExpiryToMs 静默回退 | 解析失败时输出 logger.error |
| M-3 | clearBlacklist 生产环境无保护 | 添加 NODE_ENV=production 检查 |
| M-4 | JWT 明文存储 | 改用 SHA-256 hash 前 32 字符作为 Map key |

### LOW（已修复）

| # | 问题 | 修复内容 |
|---|------|---------|
| L-1 | NaN expiresInMs | 添加 Number.isNaN 检查 |
| L-2 | 整数溢出 | 添加 MAX_SAFE_INTEGER 检查 |
| L-3 | 缺少模块文档 | 添加模块级 JSDoc |
| L-5 | switch default 不可达 | 改用 UNIT_MS 常量表替代 switch |

### 未修复（技术债务）

| # | 问题 | 原因 |
|---|------|------|
| H-1 | 模块级单例无封装 | Committer 判定不阻断，单实例部署下功能正确 |
| H-2 | parseExpiryToMs 职责归属 | 设计优化，可在 H-1 重构时一并处理 |
| H-3 | 进程重启丢失撤销记录 | 2h JWT 有效期风险有限，需 Redis 持久化 |
| M-5/M-6 | 定时器生命周期解耦 | 当前功能正确，低优先级 |

---

## 测试覆盖

- 新增 `tests/apis/utils/token-blacklist.util.test.ts`（29 测试）
- 覆盖：revokeToken(8)、isTokenRevoked(5)、clearBlacklist(2)、parseExpiryToMs(14)
- auth 相关 312 测试全部通过，无回归

---

## 修复前后对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 评分 | 6.0/10 | 预期 7.5-8.0/10 |
| BLOCKING | 2 项 | 0 项 |
| 安全日志 | 0 | 4 处 |
| token 存储 | 明文 | SHA-256 hash |
| 单位覆盖 | 5 (ms/s/m/h/d) | 7 (ms/s/m/h/d/w/y) |
| 容量上限 | 无 | 10,000 |
| 独立测试 | 0 | 29 |
