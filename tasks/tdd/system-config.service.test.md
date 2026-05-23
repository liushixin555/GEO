# TDD 执行报告：system-config.service.impl.ts

## 测试文件
`tests/apis/system-config.service.test.ts`

## 被测文件
`apis/service/impl/system-config.service.impl.ts`

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 17 passed
- **覆盖率**: 100% (Statements / Branch / Functions / Lines)

## 覆盖率详情

| 文件 | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| system-config.service.impl.ts | 100% | 100% | 100% | 100% |

## 测试用例清单

### getAll() - 7 个测试
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应返回所有系统配置项 | 验证返回多条配置项及映射正确性 |
| 2 | 应按 id 升序排列 | 验证 findMany 使用 `{ orderBy: { id: 'asc' } }` |
| 3 | 无配置项时应返回空数组 | 空数据边界情况 |
| 4 | 应正确映射所有字段（camelCase → snake_case） | configKey→config_key, configValue→config_value 等 |
| 5 | 单条配置项时应正确返回 | 单条数据场景 |
| 6 | Prisma 抛出异常时应向上传播 | 数据库异常处理 |
| 7 | 应调用 getPrisma 获取实例 | 验证 getPrisma 被调用 |

### batchUpdate() - 10 个测试
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应批量更新多条配置 | 多条 upsert 正确执行和映射 |
| 2 | 应在事务中执行所有 upsert 操作 | 验证 $transaction 和 upsert 调用次数 |
| 3 | 应传递正确的 upsert 参数（where/update/create） | 验证参数结构 |
| 4 | 空配置数组时应返回空数组 | 空数组边界情况 |
| 5 | 应正确映射结果中的所有字段 | 结果字段映射验证 |
| 6 | 新配置应通过 create 创建 | 新配置的 upsert create 逻辑 |
| 7 | 事务失败时应向上传播错误 | $transaction 异常处理 |
| 8 | upsert 失败时应向上传播错误 | upsert 异常处理 |
| 9 | 应调用 getPrisma 获取实例 | 验证 getPrisma 被调用 |
| 10 | 应处理单条配置更新 | 单条配置更新场景 |

## 测试模式
- 使用 `jest.mock` mock `getPrisma` 函数
- Helper 函数 `makePrismaSystemConfig` / `makeMappedSystemConfig` 创建测试数据
- 覆盖正常流程、边界情况、字段映射、错误传播
