# user.schema.ts TDD 执行报告

**文件**: `apis/schema/user.schema.ts`
**测试文件**: `tests/apis/user.schema.test.ts`
**执行日期**: 2026-05-24
**测试框架**: Jest + ts-jest
**被测 schema 数量**: 3（listUsersSchema、createUserSchema、updateUserSchema）

## 测试结果

| 指标 | 值 |
|------|------|
| 测试用例总数 | 150 |
| 通过 | 150 |
| 失败 | 0 |
| 测试耗时 | ~6.8s |

## 覆盖率

| 指标 | 值 |
|------|------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例分布

### listUsersSchema（51 用例）
- **page**（10 用例）: 默认值、有效正整数、大整数、coerce 字符串、拒绝 0/负数/浮点/null、布尔 coerce
- **pageSize**（9 用例）: 默认值、有效值、最小/最大边界、coerce、拒绝超限/0/负数/浮点
- **search**（8 用例）: 可选、有效值、空串、200 边界、unicode、拒绝数字/null
- **role**（9 用例）: 可选、3 种有效角色、拒绝无效/空串/数字/null/大小写/部分匹配
- **status**（11 用例）: transform "true"→true、"false"→false、拒绝 TRUE/FALSE/1/0/布尔/空串/null
- **完整对象**（4 用例）: 全字段、空对象默认值、coerce 组合
- **非 strict**（1 用例）: strip 未知字段

### createUserSchema（52 用例）
- **username**（10 用例）: 有效值、1 字符、50 边界、拒绝 51/空串/缺字段/null/数字、unicode
- **password**（11 用例）: 有效值、8 最小/128 最大边界、拒绝超限/不足/空串/缺字段/null/数字、特殊字符/unicode
- **cn_name**（9 用例）: 有效值、1 字符、50 边界、拒绝超限/空串/缺字段/null/数字、emoji
- **role**（9 用例）: 3 种有效角色、拒绝无效/空串/缺字段/null/数字/大小写、错误消息验证
- **company_id**（8 用例）: 有效正整数、可选、拒绝 0/负数/浮点/字符串/null
- **strict**（2 用例）: 拒绝未知字段（含/不含有效字段）
- **完整对象**（3 用例）: 全字段、最小必填、值一致性

### updateUserSchema（47 用例）
- **cn_name**（9 用例）: 可选、有效值、边界、拒绝超限/空串/null/数字、emoji
- **role**（9 用例）: 可选、3 种有效角色、拒绝无效/空串/null/数字/大小写、错误消息
- **status**（11 用例）: 布尔 true/false、可选、拒绝字符串/数字/null/数组/对象
- **password**（10 用例）: 可选、有效值、8/128 边界、拒绝超限/不足/空串/null/数字、特殊字符
- **strict**（2 用例）: 拒绝未知字段
- **完整对象**（4 用例）: 全字段、空对象、部分字段、值一致性

## 关键验证点

1. **z.coerce**: page/pageSize 支持字符串自动转数字
2. **status transform**: listUsersSchema 的 status 字段从 `'true'/'false'` 字符串转换为布尔值
3. **strict 模式**: createUserSchema/updateUserSchema 使用 `.strict()` 拒绝未知字段
4. **自定义错误消息**: username/password/cn_name 的中文错误消息验证
5. **边界值**: 所有 min/max 边界精确测试（含边界值通过、边界+1 失败）
6. **类型拒绝**: null/undefined/数字/数组/对象等非法类型全面覆盖
