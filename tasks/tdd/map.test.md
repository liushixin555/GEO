# map.test.ts TDD 执行报告

## 测试目标
- 源文件: `apis/map/index.ts`
- 测试文件: `tests/apis/map.test.ts`

## 源文件内容概要
- 16 个 map 函数，将 Prisma camelCase 数据映射为 snake_case 业务实体
- `mapCompany` — Company 映射
- `mapSkills` — Skills 映射（含 creator 关联）
- `mapUser` — User 映射（含 company 关联）
- `mapLlmModel` — LlmModel 映射（apiKey 脱敏）
- `mapSystemConfig` — SystemConfig 映射
- `mapProject` — Project 映射（含 operators/viewers 关联数组）
- `mapArticle` — Article 映射（含多个 nullable 字段）
- `mapArticleVersion` — ArticleVersion 映射
- `mapPublishingPlatform` — PublishingPlatform 映射
- `mapKeyword` — KnowledgeKeyword 映射
- `mapPortrait` — KnowledgePortrait 映射
- `mapKnowledgeImage` — KnowledgeImage 映射
- `mapKnowledgeDocument` — KnowledgeDocument 映射
- `mapMinedKeyword` — MinedKeyword 映射
- `mapTodo` — Todo 映射（含多个关联和 dueAt→ISO 转换）
- `mapTodoLog` — TodoLog 映射

## 测试用例统计
- 总测试数: **217 个**（从 158 个补全至 217 个，本次 +59 个）
- 通过: 217
- 失败: 0
- 跳过: 0

## 测试覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| index.ts | 100% | 100% | 100% | 100% |

## 测试结果
```
Test Suites: 1 passed, 1 total
Tests:       217 passed, 217 total
Time:        4.474 s
```

## 测试维度汇总

| 测试维度 | 用例数 | 说明 |
|---------|-------|------|
| 基础字段映射 | 158 | 16 个 map 函数的正向映射、null/undefined 边界 |
| scheduleType 边界 | 4 | mapArticle 遗漏的 scheduleType 字段测试 |
| apiKey 脱敏边界 | 5 | 1/4/5/7/8 字符长度的脱敏行为 |
| 不可变性 | 4 | 输入对象不被修改 |
| Object.freeze 兼容 | 3 | 冻结输入后仍能正常映射 |
| 属性数量验证 | 16 | 每个 map 函数返回精确属性数 |
| JSON 序列化安全 | 4 | stringify/parse 往返、apiKey 不泄漏 |
| 深拷贝独立性 | 2 | 连续调用结果互不影响 |
| dueAt 边界 | 3 | epoch/远未来/毫秒精度 |
| null operators/viewers | 3 | mapProject 中 null 值处理 |
| 连续映射幂等性 | 3 | 同一输入多次调用结果一致 |
| 原型链安全 | 2 | 返回纯对象无原型污染 |
| 解构模式 | 3 | 解构/Object.entries 遍历 |
| 集合操作 | 2 | Set 去重/find/filter |
| 属性描述符 | 2 | writable/enumerable/configurable |
| 函数参数传递 | 3 | 高阶函数/filter+map/reduce |
| **合计** | **217** | |

## 各 map 函数覆盖详情

| 函数 | 属性数 | 用例数 |
|------|--------|--------|
| mapCompany | 10 | 13 |
| mapSkills | 8 | 11 |
| mapUser | 9 | 14 |
| mapLlmModel | 8 | 15 |
| mapSystemConfig | 5 | 7 |
| mapProject | 13 | 18 |
| mapArticle | 19 | 26 |
| mapArticleVersion | 6 | 8 |
| mapPublishingPlatform | 10 | 12 |
| mapKeyword | 8 | 11 |
| mapPortrait | 7 | 8 |
| mapKnowledgeImage | 8 | 8 |
| mapKnowledgeDocument | 11 | 10 |
| mapMinedKeyword | 6 | 7 |
| mapTodo | 19 | 25 |
| mapTodoLog | 9 | 14 |

## 本次新增用例（+59 个）

### 1. scheduleType 边界（4 个）
- scheduleType 为 null 时映射为 null
- scheduleType 为 undefined 时映射为 null
- scheduleType 有值时正确映射
- scheduleType 为空字符串时保持为空字符串

### 2. apiKey 脱敏边界（5 个）
- 恰好 8 字符：前4+****+后4 无重叠
- 1 字符时：slice(0,4) 和 slice(-4) 都返回同一字符
- 4 字符时：slice(0,4)=全串，slice(-4)=全串
- 5 字符时：abcd****bcde
- 7 字符时：abcd****defg

### 3. 不可变性（4 个）
- mapCompany 不修改输入对象
- mapUser 不修改输入对象
- mapProject 不修改输入的 operators/viewers 数组
- mapTodo 不修改输入的 dueAt Date 对象

### 4. Object.freeze 兼容（3 个）
- mapCompany 冻结输入后仍能正常映射
- mapSkills 冻结输入后仍能正常映射
- mapTodo 冻结输入后仍能正常映射

### 5. 属性数量验证（16 个）
- 16 个 map 函数各自精确属性数量验证

### 6. JSON 序列化安全（4 个）
- mapCompany 结果可 JSON.stringify/parse 往返
- mapLlmModel 脱敏后 apiKey 可安全序列化（不含原始密钥）
- mapTodo 结果可 JSON.stringify/parse 往返
- mapArticle 含数组和 null 字段可安全序列化

### 7. 深拷贝独立性（2 个）
- mapArticle 返回的 images 数组不影响后续调用
- mapProject 返回的 operator_ids 不影响后续调用

### 8. dueAt 边界（3 个）
- 1970-01-01 epoch 时间正确转换
- 2099-12-31 远未来日期正确转换
- 含毫秒时保留毫秒精度

### 9. null operators/viewers（3 个）
- operators 为 null 时默认为空数组
- viewers 为 null 时默认为空数组
- operators/viewers 同时为 null 时默认为空数组

### 10. 连续映射幂等性（3 个）
- mapCompany 同一输入多次调用结果一致
- mapLlmModel 同一输入多次调用脱敏结果一致
- mapTodo 同一输入多次调用 due_at 一致

### 11. 原型链安全（2 个）
- mapUser 返回纯对象（无原型污染）
- mapProject 返回纯对象

### 12. 解构模式（3 个）
- mapCompany 返回值可安全解构
- mapUser 返回值可安全解构并传递
- mapArticle 返回值可用 Object.entries 遍历

### 13. 集合操作（2 个）
- mapCompany 多个结果可放入 Set 去重
- mapUser 结果数组可用 find/filter

### 14. 属性描述符（2 个）
- mapCompany 返回对象所有属性可写、可枚举、可配置
- mapSkills 返回对象所有属性可写、可枚举、可配置

### 15. 函数参数传递（3 个）
- 所有 map 函数可作为高阶函数参数
- mapMinedKeyword 可用于 filter + map 链
- mapKeyword 可用于 reduce 聚合

## 关键发现
1. **mapLlmModel apiKey 脱敏逻辑**：`apiKey ? slice(0,4)+'****'+slice(-4) : ''` — 当 apiKey 为 falsy（null/undefined/''）返回空字符串，否则取前4后4拼接
2. **`??` vs `||` 行为差异**：`seedWord ?? null` 中空字符串 `''` 不是 nullish，所以保留为空字符串；而 `creator?.cnName || null` 中空字符串是 falsy，会返回 null
3. **mapUser 返回类型为 `any`**，其余函数均有明确返回类型
4. **mapTodo 的 `dueAt`** 使用 `?.toISOString() || null`，需确保 Date 对象非 null 才调用
5. **mapProject operators/viewers** 使用 `|| []` 默认空数组，operator_ids 中 `user?.id ?? userId` 优先使用 user.id
6. **mapArticle 属性数**为 19 个（含 schedule_type 字段），原测试遗漏了该字段的测试
7. **Object.freeze 兼容**：所有 map 函数均为只读访问输入属性，不修改输入对象，因此与冻结输入完全兼容
