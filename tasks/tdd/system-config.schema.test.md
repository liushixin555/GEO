# TDD 执行报告：System-Config Schema 测试补全

## 执行时间
2026-05-25

## 测试结果
- 测试套件：4 passed
- 测试用例总数：324（Controller 37 + Service 53 + Schema 51 + Entity 183）
- 新增测试用例：51（system-config.schema.test.ts）
- 覆盖率：所有源文件 Stmts/Branch/Funcs/Lines 均达 100%

## 覆盖率明细

| 源文件 | Stmts | Branch | Funcs | Lines | 测试文件 |
|--------|-------|--------|-------|-------|----------|
| system-config.controller.ts | 100% | 100% | 100% | 100% | system-config.controller.test.ts (37用例) |
| system-config.service.impl.ts | 100% | 100% | 100% | 100% | system-config.service.test.ts (53用例) |
| system-config.schema.ts | 100% | 100% | 100% | 100% | system-config.schema.test.ts (51用例，新增) |

## 新增测试文件说明

### system-config.schema.test.ts（51个用例）

对 `apis/schema/system-config.schema.ts` 中的 Zod schema 进行独立单元测试，覆盖以下维度：

#### 合法输入（8个）
- 单条配置、多条配置、yishangshu_password 白名单 key
- config_value 为空字符串、特殊字符、中文、超长字符串
- strict 模式验证（外层 strict 拒绝多余字段；内层无 strict，多余字段被静默过滤）

#### configs 字段验证（8个）
- configs 缺失、空数组、字符串、数字、null、布尔值、非数组对象
- body 包含额外字段被 strict 模式拒绝

#### config_key 白名单验证（9个）
- 未知 key、空字符串、大小写不匹配、前后空格、缺失
- config_key 为 null/数字/布尔值
- 多条配置中第二条 key 不合法

#### config_value 类型验证（8个）
- config_value 缺失、null、数字、布尔值 true/false、对象、数组、undefined

#### 边界场景（13个）
- 整个 body 为 null/undefined/字符串/数组
- config_value 含空格/换行符/emoji
- configs 允许重复 key
- 部分项不合法时整体失败
- configs 元素为非对象/null/数字

#### 解析数据结构（2个）
- 正确解析返回所有字段
- 解析结果只包含 configs 字段

#### Zod schema 特性（3个）
- 外层 strict 拒绝多余字段
- 内层无 strict（多余字段静默过滤）
- 正确报告多个错误

## 关键发现
1. **schema 外层 strict，内层无 strict**：`updateSystemConfigsSchema` 使用 `.strict()` 拒绝外层多余字段，但内层 `z.object()` 没有 `.strict()`，多余字段被静默过滤。
2. **enum 白名单**：`config_key` 使用 `z.enum()` 精确限制为 `yishangshu_username` 和 `yishangshu_password`。
3. **三层防线**：schema 中间件 → controller 防御性校验 → service 层事务，形成完整的输入验证链。
