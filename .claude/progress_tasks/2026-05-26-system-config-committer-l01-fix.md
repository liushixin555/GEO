# system-config.controller Committer 评审 P2 修复

**日期**: 2026-05-26
**关联评审**: `tasks/review/system-config.controller.ts.committer.md`（已从 git 历史恢复）

## 修复概要

实现评审报告中 COM-L-01（脱敏逻辑下沉到 mapper）+ 修复预先存在的直接调用测试缺陷。

## 修复项

| 优先级 | 编号 | 问题 | 修复方案 | 状态 |
|--------|------|------|----------|------|
| P2 | COM-L-01 | 脱敏逻辑仅在 Controller | `maskSensitiveValue` 移至 `constants/system-config.ts`，脱敏集成到 `mapSystemConfig`（参照 `mapLlmModel` 的 api_key 脱敏模式） | ✅ |
| — | 测试缺陷 | 直接调用测试 `req` 缺少 `user` 属性 | 所有 17 个直接调用测试补充 `user: { userId, role }` | ✅ |
| — | 测试缺陷 | "user为undefined"测试预期错误 | 改为测试 error 日志路径（`getAuth()` 抛出时） | ✅ |

## 修改文件

| 文件 | 变更 |
|------|------|
| `apis/constants/system-config.ts` | 新增 `maskSensitiveValue` 函数（从 Controller 迁移） |
| `apis/map/index.ts` | `mapSystemConfig` 内置脱敏逻辑，导入 `maskSensitiveValue` |
| `apis/controller/system-config.controller.ts` | 移除 `maskSensitiveValue`/`sanitizeConfigItems`/`SENSITIVE_CONFIG_KEYS` 导入 |
| `tests/apis/system-config.controller.test.ts` | 17 个直接调用测试补充 `user` 属性，1 个测试修正预期 |

## 测试结果

- 4 个 system-config 测试套件，492 个测试用例，全部通过
- lint 通过
- build 错误均为预先存在（`article.controller.ts` 类型 + `mapArticle` 的 `ArticleDetail`）
