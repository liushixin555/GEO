# TDD 执行报告：llm-model.service.impl.ts

## 测试文件
`tests/apis/llm-model.service.test.ts`

## 被测文件
`apis/service/impl/llm-model.service.impl.ts`

## 测试结果
- **测试数量**: 57 个测试
- **通过**: 57 个
- **失败**: 0 个
- **状态**: ✅ 全部通过

## 测试覆盖率
| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Stmts) | 100% |
| 分支覆盖率 (Branch) | 100% |
| 函数覆盖率 (Funcs) | 100% |
| 行覆盖率 (Lines) | 100% |

## 测试分组

### list() — 4 个测试
- 应返回所有 LLM 模型列表（按 id 升序）
- 应返回空数组当没有模型时
- 应正确映射单个模型
- 应正确映射 status 为 false 的模型

### listEnabled() — 5 个测试
- 应返回所有启用的模型（仅 id、provider、model_name）
- 应返回空数组当没有启用的模型时
- 应只查询 status: true 的模型
- 应只选择 id、provider、modelName 字段
- 应将 modelName 映射为 model_name

### getById() — 3 个测试
- 应返回指定 id 的模型
- 应在模型不存在时抛出错误
- 应正确映射所有字段

### create() — 4 个测试
- 应创建新模型并返回映射结果
- 应正确映射请求字段（snake_case → camelCase）
- 应正确映射返回结果（camelCase → snake_case）
- 应只传 data 中的四个字段给 Prisma create

### update() — 10 个测试
- 应更新指定模型并返回映射结果
- 应在模型不存在时抛出错误
- 应只更新提供的字段（provider / base_url / api_key / model_name / status 各1个）
- 应同时更新多个字段
- 应在所有字段为 undefined 时不传任何更新数据
- 应正确映射更新后的返回结果

### delete() — 5 个测试
- 应软删除存在的模型（设置 deletedAt）
- 应在模型不存在时抛出错误
- 删除操作不应有返回值
- 应使用 update 而非 delete 来实现软删除
- 应先检查模型是否存在再执行删除

### getPrisma 调用验证 — 1 个测试
- 每个方法都应调用 getPrisma 获取 prisma 实例

### 边界情况 — 9 个测试
- getById 传入 0 作为 id
- update/delete 传入负数 id
- list 返回大量数据（100条）应正确映射每一条
- listEnabled 返回的 model_name 字段来源验证
- update status 为 true 时正确处理
- update 不传任何字段时 data 为空对象
- update 传入 undefined 值的字段不应被包含在 data 中
- create 应正确处理不同 provider 的模型（5个 provider 循环测试）

### Prisma 异常传播 — 6 个测试
- list 应传播 Prisma 数据库错误
- listEnabled 应传播 Prisma 数据库错误
- getById 应传播 Prisma 数据库错误
- create 应传播 Prisma 唯一约束错误
- update 应传播 Prisma update 错误
- delete 应传播 Prisma update 错误

### update 全字段更新 — 2 个测试
- 应同时更新所有5个字段
- 应将 false 值的 status 正确包含在 data 中（不是 undefined）

### delete 详细验证 — 2 个测试
- deletedAt 时间应接近当前时间
- 应对不同 id 的模型执行软删除

### list 混合状态 — 2 个测试
- 应正确返回混合启用/禁用状态的模型
- 应正确映射所有字段（多个模型逐一验证）

### listEnabled 单条结果 — 1 个测试
- 应正确返回单条启用的模型

### create 特殊字符 — 2 个测试
- 应正确处理包含特殊字符的 API key
- 应正确处理包含中文的 base_url

### 服务实例复用 — 1 个测试
- 同一服务实例应可连续调用多个方法

## 测试策略
- 使用 `jest.mock` mock `getPrisma` 和 `db.util`
- 使用工厂函数 `makePrismaModel()` 和 `createMockPrisma()` 创建测试数据
- 覆盖正常路径、异常路径、边界情况
- 验证字段映射（snake_case ↔ camelCase）的正确性
- 验证 Prisma 调用参数的正确性
- 新增 Prisma 异常传播测试确保错误不被吞掉
- 新增特殊字符测试确保字段值正确传递
- 新增服务实例复用测试确保多次调用不互相干扰
