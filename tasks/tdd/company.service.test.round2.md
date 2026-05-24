# company.service.test.ts TDD 第2轮补全报告

**日期**: 2026-05-24
**目标文件**: `apis/service/company.service.ts`（接口） + `apis/service/impl/company.service.impl.ts`（实现）
**测试文件**: `tests/apis/company.service.test.ts`

## 测试结果

| 指标 | 值 |
|------|-----|
| 总用例数 | **68** |
| 通过 | 68 |
| 失败 | 0 |
| 耗时 | ~5.0s |
| Statements 覆盖率 | **100%** |
| Branch 覆盖率 | **100%** |
| Functions 覆盖率 | **100%** |
| Lines 覆盖率 | **100%** |

## 本轮新增用例（25 个）

### validateUserIds — 用户不存在（4 个）
| # | 用例 | 说明 |
|---|------|------|
| 1 | create: operator ID 不存在 | `BusinessError('用户不存在: 999')` |
| 2 | create: viewer ID 不存在 | `BusinessError('用户不存在: 888')` |
| 3 | create: 列出所有缺失 ID | `BusinessError('用户不存在: 100, 101, 200')` |
| 4 | update: operator ID 不存在 | `BusinessError('用户不存在: 777')` |

### validateUserIds — sysadmin 防关联（3 个）
| # | 用例 | 说明 |
|---|------|------|
| 5 | create: operator 是 sysadmin | `BusinessError('系统管理员不可被关联到公司')` |
| 6 | create: viewer 是 sysadmin | `BusinessError('系统管理员不可被关联到公司')` |
| 7 | update: operator 是 sysadmin | `BusinessError('系统管理员不可被关联到公司')` |

### validateUserIds — 用户已禁用（4 个）
| # | 用例 | 说明 |
|---|------|------|
| 8 | create: operator 已禁用 | `BusinessError('用户已禁用: 5')` |
| 9 | create: viewer 已禁用 | `BusinessError('用户已禁用: 6')` |
| 10 | update: user 已禁用 | `BusinessError('用户已禁用: 3')` |
| 11 | create: 列出所有禁用 ID | `BusinessError('用户已禁用: 10, 11')` |

### validateUserIds — 空数组快速返回（2 个）
| # | 用例 | 说明 |
|---|------|------|
| 12 | create: 空数组跳过 findMany | `targetIds.length === 0` 提前返回 |
| 13 | update: 空数组跳过 findMany | `targetIds.length === 0` 提前返回 |

### 软删除公司（3 个）
| # | 用例 | 说明 |
|---|------|------|
| 14 | getById: 软删除公司抛 NotFoundError | `deletedAt !== null` |
| 15 | update: 软删除公司抛 NotFoundError | 不调用 company.update |
| 16 | toggleStatus: 软删除公司抛 NotFoundError | 不调用 company.update |

### ICompanyService 接口合规性（2 个）
| # | 用例 | 说明 |
|---|------|------|
| 17 | 实现 5 个接口方法 | list/getById/create/update/toggleStatus |
| 18 | 方法参数数量正确 | 验证 `.length` 属性 |

### validateUserIds — 校验优先级（3 个）
| # | 用例 | 说明 |
|---|------|------|
| 19 | 缺失 ID 优先于 sysadmin 检查 | 先报"用户不存在" |
| 20 | sysadmin 优先于禁用检查 | 先报"系统管理员不可被关联" |
| 21 | 合法 admin + view 用户通过校验 | 正常创建公司 |

### getById — 角色过滤（2 个）
| # | 用例 | 说明 |
|---|------|------|
| 22 | 排除 sysadmin 用户 | findMany 仅查 admin+view |
| 23 | 排除禁用用户 | findMany 仅查 status: true |

### list — 软删除过滤（1 个）
| # | 用例 | 说明 |
|---|------|------|
| 24 | 确认 deletedAt: null 过滤条件 | 验证 findMany 参数 |

## 覆盖盲区修复说明

本轮补全了第1轮遗漏的关键场景：

1. **`validateUserIds` 私有方法全量覆盖** — 三个校验分支（不存在/sysadmin/禁用）+ 空数组快速返回 + 校验优先级
2. **软删除路径** — `getById`/`update`/`toggleStatus` 三个方法均覆盖 `deletedAt !== null` 分支
3. **接口合规性** — 验证方法存在性和签名正确性

## 测试分布总览（68 用例）

| 方法/分组 | 用例数 |
|-----------|--------|
| list() | 6 |
| getById() | 10 |
| create() | 14 |
| update() | 16 |
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
