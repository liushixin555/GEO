# TDD 执行报告（第四轮）— apis/config/index.ts

**测试文件**: `tests/apis/config.test.ts`
**目标文件**: `apis/config/index.ts`
**执行日期**: 2026-05-24

---

## 测试结果

| 指标 | 值 |
|------|------|
| 测试套件 | 1 passed |
| 测试用例 | 188 passed |
| 失败 | 0 |
| 执行时间 | ~3.0s |

## 覆盖率

| 指标 | 百分比 |
|------|--------|
| 语句覆盖率 (Statements) | 100% |
| 分支覆盖率 (Branches) | 100% |
| 函数覆盖率 (Functions) | 100% |
| 行覆盖率 (Lines) | 100% |

---

## 本轮变更摘要

### 1. Bug 修复（3 项）

**根因**：`loadConfigWithEnv({})` 清除 `process.env` 后，`dotenv.config()` 在模块重载时从 `.env` 文件重新加载值，导致：
- `DB_HOST` 测试期望 `localhost` 但收到 `.env` 中的 `172.17.0.1`
- `RATE_LIMIT_MAX` 测试期望 `100`（.env 值）但 DEFAULTS 实为 `500`
- 生产环境测试期望抛错但因 `.env` 提供了 `DB_PASSWORD` 而通过

**修复方案**：
1. 新增 `loadConfigPure()` 辅助函数 — 通过 `jest.doMock('dotenv', ...)` 阻止 .env 加载，测试纯 DEFAULTS 值
2. 在 `afterEach` 中添加 `jest.unmock('dotenv')`，防止 `jest.doMock` 残留影响后续测试
3. 将 `RATE_LIMIT_MAX` 默认值测试改为 `loadConfigPure()` 并期望 `500`（真正的 DEFAULTS 值）

### 2. 新增测试用例（22 个）

| 分类 | 数量 | 说明 |
|------|------|------|
| validateTimeSpan 补充 | 5 | ms/w/y 单元 + 无效单元 "10x" + 混合格式 "10h5m" |
| resolveUploadDir 边界 | 3 | 空字符串回退 + uploadDir 不可变 + 相对路径转绝对路径 |
| 纯默认值测试 | 4 | DB_HOST/RATE_LIMIT_MAX/RATE_LIMIT_WINDOW_MS/SWAGGER_ENABLED 通过 loadConfigPure 验证 |
| CRON 空格处理 | 1 | 字段间多余空格 |
| deepFreeze 补充 | 3 | corsOrigins 元素不可修改 + database.password/port 不可修改 |
| safeParseInt 无上限 | 1 | DB_POOL_MIN 无上限约束接受极大值 |
| uploadDir 路径穿越变体 | 2 | `../secret` + 混合分隔符 `uploads/..\etc` |
| 生产环境 dotenv mock | 3 | 使用 jest.doMock 隔离 dotenv 的生产环境完整场景 |

---

## 覆盖率演进

| 轮次 | 日期 | 用例数 | Stmts | Branch | Funcs | Lines | 说明 |
|------|------|--------|-------|--------|-------|-------|------|
| 第一轮 | 2026-05-24 | 82 | 100% | 94.74% | 100% | 100% | 初始 |
| 第二轮 | 2026-05-24 | 114 | 100% | 97.29% | 100% | 100% | 补充分支 |
| 第三轮 | 2026-05-24 | 145 | 100% | 100% | 100% | 100% | 全覆盖 |
| 第三轮后 | 2026-05-24 | 166 | 100% | 100% | 100% | 100% | 追加用例 |
| **第四轮** | **2026-05-24** | **188** | **100%** | **100%** | **100%** | **100%** | **修复 dotenv 干扰 + 补充边界** |

---

## 关键技术发现

1. **dotenv 干扰测试**：`loadConfigWithEnv({})` 清除 env vars 后，`dotenv.config()` 在模块重载时从 `.env` 重新加载。需要用 `jest.doMock('dotenv', ...)` 隔离。
2. **jest.doMock 残留**：`jest.doMock` 注册的 mock 不会被 `jest.resetModules()` 清除，需要在 `afterEach` 中显式 `jest.unmock('dotenv')`。
3. **DEFAULTS vs .env 值混淆**：部分"默认值"测试实际测的是 `.env` 文件值（如 `RATE_LIMIT_MAX=100`），而非代码 DEFAULTS（`500`）。通过 `loadConfigPure()` 区分两类测试。
