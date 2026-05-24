# TDD 执行报告：llm-model.service.impl.ts

## 执行日期
- 首次：2026-05-24（57用例）
- 第2轮补充：2026-05-25（81用例，+24新增）

## 测试文件
`tests/apis/llm-model.service.test.ts`

## 被测文件
`apis/service/impl/llm-model.service.impl.ts`

## 测试结果
- **测试数量**: 81 个测试
- **通过**: 81 个
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

### listEnabled() — 6 个测试
- 应返回所有启用的模型（仅 id、provider、model_name）
- 应返回空数组当没有启用的模型时
- 应只查询 status: true 的模型
- 应只选择 id、provider、modelName 字段
- 应将 modelName 映射为 model_name
- 【第2轮新增】应按 id 升序排列（orderBy 验证）

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

### 【第2轮新增】NotFoundError 类型验证 — 3 个测试
- getById 不存在时应抛出 NotFoundError 实例（验证 name/statusCode/message）
- update 不存在时应抛出 NotFoundError 实例
- delete 不存在时应抛出 NotFoundError 实例

### 【第2轮新增】findFirst 抛异常 — 3 个测试
- getById 应传播 findFirst 数据库异常
- update 应传播 findFirst 数据库异常（不调用 update）
- delete 应传播 findFirst 数据库异常（不调用 update）

### 【第2轮新增】mapLlmModel falsy apiKey — 4 个测试
- list 应将空字符串 apiKey 映射为空字符串
- getById 应将 null apiKey 映射为空字符串
- create 应将 null apiKey 映射为空字符串
- update 应将 null apiKey 映射为空字符串

### 【第2轮新增】API key 掩码边界值 — 3 个测试
- 极短 apiKey（5字符）应正确掩码
- 刚好4字符 apiKey 应正确掩码
- 超长 apiKey 应正确掩码

### 【第2轮新增】update 空字符串 vs undefined — 4 个测试
- 空字符串 provider 应被包含在 data 中（非 undefined）
- 空字符串 base_url 应被包含在 data 中
- 空字符串 api_key 应被包含在 data 中
- 空字符串 model_name 应被包含在 data 中

### 【第2轮新增】update findFirst 参数验证 — 2 个测试
- findFirst 应传入正确的 where 条件
- findFirst 应在 update 之前被调用

### 【第2轮新增】delete findFirst 参数验证 — 1 个测试
- findFirst 应传入正确的 where 条件

### 【第2轮新增】update status 布尔值 — 2 个测试
- 应将 status=true 正确包含在 data 中
- 应将 status=false 正确包含在 data 中

### 【第2轮新增】list orderBy 验证 — 1 个测试
- 应传递 orderBy: { id: asc } 给 Prisma

## 第2轮新增测试策略（+24用例）
1. **NotFoundError 类型验证** — 验证抛出的错误是正确的 NotFoundError 实例（name/statusCode/message 三个维度）
2. **findFirst 抛异常** — 覆盖 findFirst 方法本身抛异常（非返回 null）的场景，确保 update/delete 不继续执行
3. **mapLlmModel falsy apiKey** — 覆盖 apiKey 为空字符串或 null 时的映射分支
4. **API key 掩码边界值** — 测试极短（5字符）、刚好（4字符）、超长 key 的掩码行为
5. **空字符串 vs undefined** — 验证 update 中空字符串值被正确包含在 data 中（!== undefined）
6. **findFirst 参数和调用顺序** — 验证 findFirst 的 where 条件正确，且在 update 之前被调用
7. **listEnabled orderBy** — 验证排序参数传递
8. **status 布尔值** — 验证 true/false 值在 update data 中的正确处理

## 测试策略
- 使用 `jest.mock` mock `getPrisma` 和 `db.util`
- 使用工厂函数 `makePrismaModel()` 和 `createMockPrisma()` 创建测试数据
- 覆盖正常路径、异常路径、边界情况
- 验证字段映射（snake_case ↔ camelCase）的正确性
- 验证 Prisma 调用参数的正确性
- 新增 Prisma 异常传播测试确保错误不被吞掉
- 新增特殊字符测试确保字段值正确传递
- 新增服务实例复用测试确保多次调用不互相干扰
