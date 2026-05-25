# 2026-05-25 system-config.controller.ts 评审问题修复

## 变更摘要

根据 Committer v2 + 安全 v2 评审报告修复 `system-config.controller.ts` 的安全问题。

## 修复内容

### P0 — PUT 响应明文回显密码 (SEC-H-01)
- PUT 端点 `batchUpdate` 返回数据未经过 `maskSensitiveValue` 脱敏
- 修复：复用 `sanitizeConfigItems` 统一脱敏 GET/PUT 响应

### P1 — 白名单双重定义漂移风险 (SEC-H-02 / COM-M-01)
- `ALLOWED_CONFIG_KEYS` 在 Controller 和 Schema 两处独立定义
- 修复：抽取到 `apis/constants/system-config.ts`，Controller 和 Schema 均从该文件导入

### P1 — 配置变更无审计日志 (SEC-H-03 / COM-M-02)
- 密码修改等敏感操作无日志记录
- 修复：引入 `logger.util`，成功更新记录 userId + keys（不记录 value），catch 块记录错误详情

### P2 — 短密码不脱敏 (SEC-M-03)
- `maskSensitiveValue` 中 `value.length > 2` 导致 1-2 位密码明文返回
- 修复：改为 `value.length > 2 ? prefix + '****' : '****'`，所有长度敏感值均脱敏

### P2 — Schema 缺长度/数量限制 (SEC-M-01 / SEC-M-02)
- `config_value` 无 `.max()` 限制，数组无 `.max()` 限制
- 修复：Schema 添加 `.max(10000)` 和 `.max(50)`

## 变更文件

| 文件 | 变更类型 |
|------|---------|
| `apis/constants/system-config.ts` | 新增 — 白名单和敏感键统一定义 |
| `apis/controller/system-config.controller.ts` | 修改 — PUT 脱敏 + 审计日志 + sanitizeConfigItems 抽取 |
| `apis/schema/system-config.schema.ts` | 修改 — 引用 constants + 添加长度/数量限制 |
| `tests/apis/system-config.controller.test.ts` | 修改 — 短密码脱敏期望值更新 |

## 测试结果

- 347 测试全部通过（4 个测试文件）
- Build 和 lint 均通过
