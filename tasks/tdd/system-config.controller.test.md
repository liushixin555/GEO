# system-config.controller.test.ts TDD 执行报告

## 基本信息
- **测试文件**: tests/apis/system-config.controller.test.ts
- **源文件**: apis/controller/system-config.controller.ts
- **执行日期**: 2026-05-23
- **测试数量**: 15 个测试
- **测试结果**: 15 passed, 0 failed

## 测试覆盖率

| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|-----------|
| Statements | 100% | - |
| Branch | 80% | - |
| Functions | 100% | - |
| Lines | 100% | - |

## 测试用例清单

### GET /api/system-configs (6个)
1. should return 401 without token
2. should return 403 for admin role
3. should return 403 for view role
4. should return configs list for sysadmin
5. should return empty list when no configs
6. should return 500 on database error

### PUT /api/system-configs (9个)
1. should return 400 when configs is empty array
2. should return 400 when configs is not an array
3. should return 400 when config_key is missing
4. should return 400 when config_value is undefined
5. should return 400 when configs field is missing
6. should batch update configs successfully
7. should update single config successfully
8. should allow config_value to be empty string
9. should return 500 on database error

## 新增测试用例
1. **新增 view role 403 测试**: 验证 view 角色无权访问系统配置
2. **新增空列表测试**: 验证无配置时返回空数组
3. **新增非数组类型测试**: 验证 configs 字段类型校验
4. **新增 config_value undefined 测试**: 验证 config_value 为 undefined 时返回 400
5. **新增 configs 缺失测试**: 验证请求体无 configs 字段时返回 400
6. **新增单项更新测试**: 验证只更新一条配置
7. **新增空字符串值测试**: 验证 config_value 允许空字符串
8. **新增数据库错误测试**: GET 和 PUT 均覆盖数据库错误场景
