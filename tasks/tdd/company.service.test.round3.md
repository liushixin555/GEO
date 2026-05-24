# company.service.test.ts TDD 第3轮补全报告

**日期**: 2026-05-25
**目标文件**: `apis/service/impl/company.service.impl.ts`（167行）
**测试文件**: `tests/apis/company.service.test.ts`

## 测试结果

| 指标 | 值 |
|------|-----|
| 总用例数 | **85** |
| 通过 | 85 |
| 失败 | 0 |
| 耗时 | ~6.0s |
| Statements 覆盖率 | **100%** |
| Branch 覆盖率 | **100%** |
| Functions 覆盖率 | **100%** |
| Lines 覆盖率 | **100%** |

## 本轮新增用例（17 个）

### update — 公司不存在 null（3 个）
| # | 用例 | 说明 |
|---|------|------|
| 1 | findUnique 返回 null 时抛 NotFoundError | `!existing` 分支（区别于软删除） |
| 2 | 公司不存在时不调用 company.update | 验证无副作用 |
| 3 | 公司不存在时不调用 user.updateMany | 验证无副作用 |

### create — 操作顺序（2 个）
| # | 用例 | 说明 |
|---|------|------|
| 4 | validateUserIds 在 company.create 之前执行 | 验证操作序列：validate → create → updateMany |
| 5 | validateUserIds 失败时不调用 company.create 和 updateMany | 校验失败时零副作用 |

### validateUserIds — 查询参数（4 个）
| # | 用例 | 说明 |
|---|------|------|
| 6 | create: 合并 operator + viewer IDs 查询 | `where: { id: { in: [10,11,20,21] } }` |
| 7 | update: 合并 operator + viewer IDs 查询 | `where: { id: { in: [5,6] } }` |
| 8 | create: 仅 operator IDs（无 viewer_ids） | `where: { id: { in: [1,2] } }` |
| 9 | create: operator 和 viewer 存在重复 ID | `[...operatorIds, ...viewerIds]` 不去重 |

### update — 操作顺序（2 个）
| # | 用例 | 说明 |
|---|------|------|
| 10 | 完整执行序列：findUnique → update → unlink → validate → link | 6步顺序验证 |
| 11 | validateUserIds 失败时仅触发 unlink（不触发 relink） | updateMany 仅调用1次（unlink） |

### validateUserIds — update 路径（4 个）
| # | 用例 | 说明 |
|---|------|------|
| 12 | update: viewer 为 sysadmin | `BusinessError('系统管理员不可被关联到公司')` |
| 13 | update: viewer 已禁用 | `BusinessError('用户已禁用: 5')` |
| 14 | update: 列出所有缺失 ID | `BusinessError('用户不存在: 100, 200, 201')` |
| 15 | update: 列出所有禁用 ID | `BusinessError('用户已禁用: 10, 20')` |

### list — 状态字段（1 个）
| # | 用例 | 说明 |
|---|------|------|
| 16 | status=false 公司正确映射 | mapCompany 保留布尔值 |

### getById — deleted_at（1 个）
| # | 用例 | 说明 |
|---|------|------|
| 17 | 活跃公司 deleted_at 为 null | 确认字段值 |

## 覆盖盲区修复说明

本轮补全了第2轮遗漏的关键场景：

1. **update 公司不存在（null）** — 第2轮只覆盖了 `deletedAt !== null`（软删除），遗漏了 `findUnique` 返回 `null`（公司不存在）的场景，以及相关的副作用验证
2. **操作顺序验证** — `create` 中 `validateUserIds` 在 `company.create` 之前执行；`update` 中完整的6步执行序列
3. **validateUserIds 查询参数** — 验证 `user.findMany` 的 `where` 和 `select` 参数，包括 ID 合并逻辑和重复 ID 处理
4. **update 路径的 validateUserIds 补全** — 第2轮只测了 `update` 中 operator 的 sysadmin/禁用场景，遗漏了 viewer 的对应场景
5. **副作用验证** — validateUserIds 失败时确认 `company.create`/`user.updateMany` 未被调用

## 测试分布总览（85 用例）

| 方法/分组 | 用例数 |
|-----------|--------|
| list() | 7 |
| getById() | 11 |
| create() | 15 |
| update() | 19 |
| toggleStatus() | 7 |
| Edge cases | 6 |
| Additional robustness | 2 |
| validateUserIds（用户不存在） | 4 |
| validateUserIds（sysadmin） | 3 |
| validateUserIds（已禁用） | 4 |
| validateUserIds（空数组） | 2 |
| 软删除公司 | 3 |
| 接口合规性 | 2 |
| 校验优先级 | 3 |
| 角色过滤 | 2 |
| list 软删除过滤 | 1 |
| update 公司不存在 null | 3 |
| create 操作顺序 | 2 |
| validateUserIds 查询参数 | 4 |
| update 操作顺序 | 2 |
| validateUserIds update 路径 | 4 |
| list 状态字段 | 1 |
| getById deleted_at | 1 |
