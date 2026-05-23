# TDD 执行报告 — service/index 全部服务汇总

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件目录 | `apis/service/impl/` |
| 测试文件目录 | `tests/apis/` |
| 执行日期 | 2026-05-24 |
| 测试框架 | Jest + ts-jest |
| 服务总数 | 8 个 |
| 测试总数 | 380 个 |
| 结果 | **全部通过 (380/380)** |

## 覆盖率汇总

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 各服务覆盖率明细

| 服务 | 源文件 | 测试文件 | Stmts | Branch | Funcs | Lines | 测试数 |
|------|--------|---------|-------|--------|-------|-------|--------|
| AuthServiceImpl | `auth.service.impl.ts` | `auth.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| CompanyServiceImpl | `company.service.impl.ts` | `company.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| SkillsServiceImpl | `skills.service.impl.ts` | `skills.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| UserServiceImpl | `user.service.impl.ts` | `user.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| LlmModelServiceImpl | `llm-model.service.impl.ts` | `llm-model.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| SystemConfigServiceImpl | `system-config.service.impl.ts` | `system-config.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| PublishingPlatformServiceImpl | `publishing-platform.service.impl.ts` | `publishing-platform.service.test.ts` | 100% | 100% | 100% | 100% | 已有 |
| TodoServiceImpl | `todo.service.impl.ts` | `todo.service.test.ts` | 100% | 100% | 100% | 100% | 64 |

## 本次变更

### 新增测试（TodoServiceImpl）

补全了 `getObjectOptions()` 和 `getAssigneeCandidates()` 两个方法的测试用例：

- **getObjectOptions()** — 6个新测试
  - objectType=article 正常查询
  - objectType=article + action=restore 查询已删除
  - objectType=keyword 正常查询
  - objectType=keyword + action=restore 查询已删除
  - objectType=keyword 无知识库返回空
  - 未知 objectType 返回空

- **getAssigneeCandidates()** — 3个新测试
  - 正常返回操作员+sysadmin列表
  - 用户去重逻辑
  - 项目不存在错误

### 覆盖率变化

TodoServiceImpl 覆盖率从 77.7% → **100%**（Stmts/Branch/Funcs/Lines 全100%）

## 测试执行输出

```
Test Suites: 8 passed, 8 total
Tests:       380 passed, 380 total
Snapshots:   0 total
Time:        10.603 s
```
