# TDD 第2轮执行报告 — skills.service.impl.ts

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件 | `apis/service/impl/skills.service.impl.ts` |
| 测试文件 | `tests/apis/skills.service.test.ts` |
| 执行日期 | 2026-05-25 |
| 第1轮测试数 | 84 |
| 第2轮新增 | **+18** |
| 总测试数 | **102** |
| 结果 | **全部通过 (102/102)** |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 第2轮新增测试用例（18个）

### 错误类型验证 — 4 个

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | getById 不存在时应抛出 NotFoundError（非通用 Error） | 验证 error.name === 'NotFoundError', statusCode === 404 |
| 2 | create 同名时应抛出 ConflictError（非通用 Error） | 验证 error.name === 'ConflictError', statusCode === 409 |
| 3 | update 不存在时应抛出 NotFoundError 且 statusCode=404 | 错误类型 + HTTP 状态码 |
| 4 | delete 不存在时应抛出 NotFoundError 且 statusCode=404 | 错误类型 + HTTP 状态码 |

### list 额外边界 — 4 个

| # | 测试用例 | 说明 |
|---|---------|------|
| 5 | 极大页码时 skip 应正确计算 | page=9999, pageSize=50 → skip=499900 |
| 6 | pageSize 为小数时应直接传递 | 验证不做取整，由调用方保证 |
| 7 | search 仅包含空格时应作为搜索词传递 | 空格字符串是 truthy |
| 8 | count 与 findMany 使用相同的 where 条件 | 验证搜索条件下两者一致 |

### create 额外边界 — 4 个

| # | 测试用例 | 说明 |
|---|---------|------|
| 9 | ConflictError 消息格式应包含技能名称 | 验证 `已存在同名技能「AI写作」` 格式 |
| 10 | description 为纯空格时应作为有值字符串传递 | `'   ' \|\| null → '   '`（truthy） |
| 11 | name 包含前后空格时应原样传递 | 不做 trim |
| 12 | 重名检查不匹配时不应阻止创建 | findFirst 返回 null → 正常创建 |

### update 额外边界 — 2 个

| # | 测试用例 | 说明 |
|---|---------|------|
| 13 | description 设为 null 时应在 data 中包含 | `null !== undefined` 所以包含 |
| 14 | 更新后 mapSkills 应映射更新后的数据 | 结果取自 update 返回值，非 findFirst |

### delete 额外边界 — 2 个

| # | 测试用例 | 说明 |
|---|---------|------|
| 15 | 删除后不应返回任何数据 | 返回 undefined，忽略 update 返回值 |
| 16 | 负数 ID 不存在时应抛出 NotFoundError | ID=-999 的错误类型验证 |

### mapSkills 综合映射 — 2 个

| # | 测试用例 | 说明 |
|---|---------|------|
| 17 | creator.cnName 为 null 时 creator_name 应为 null | `null \|\| null → null` |
| 18 | creator.cnName 为数字时 creator_name 应为该值 | truthy 非 null/undefined 直接返回 |

## 第2轮补充测试策略

第1轮已达成 100% 代码覆盖率，第2轮聚焦于以下维度：

| 维度 | 说明 | 测试数 |
|------|------|--------|
| 错误类型精确验证 | 不仅检查 message，还验证 `name`、`statusCode` 属性 | 4 |
| 数据一致性 | count/findMany 使用相同 where；update 返回映射后数据 | 2 |
| 字符串边界 | 纯空格、前后空格、空格搜索词 | 3 |
| 数值边界 | 极大页码、小数 pageSize、负数 ID | 3 |
| 类型边界 | cnName 为 null/数字时的映射行为 | 2 |
| 消息格式 | ConflictError 包含技能名 | 1 |
| 逻辑验证 | 重名不匹配时正常创建、删除不返回数据 | 2 |
| 空值处理 | description=null vs undefined 在 update 中的区别 | 1 |
