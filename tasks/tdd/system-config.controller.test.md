# system-config.controller.test.ts TDD 执行报告

## 基本信息
- **测试文件**: tests/apis/system-config.controller.test.ts
- **源文件**: apis/controller/system-config.controller.ts
- **执行日期**: 2026-05-23
- **测试数量**: 27 个测试
- **测试结果**: 27 passed, 0 failed

## 测试覆盖率

| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|-----------|
| Statements | 100% | - |
| Branch | 100% | - |
| Functions | 100% | - |
| Lines | 100% | - |

同时 `system-config.service.impl.ts` 和 `map/index.ts`（mapSystemConfig 部分）也达到 100% 覆盖率。

## 测试用例清单

### GET /api/system-configs（8 个）
1. 应返回401当无token时
2. 应返回403当角色为admin时
3. 应返回403当角色为view时
4. 应返回配置列表当角色为sysadmin时
5. 应返回空列表当无配置时
6. 应返回500当数据库错误时
7. 应返回兜底错误消息当异常无message时
8. 应返回完整字段格式的配置数据

### PUT /api/system-configs（19 个）
1. 应返回401当无token时
2. 应返回403当角色为admin时
3. 应返回403当角色为view时
4. 应返回400当configs为空数组时
5. 应返回400当configs不是数组时
6. 应返回400当configs字段缺失时
7. 应返回400当config_key缺失时
8. 应返回400当config_value为undefined时
9. 应返回400当多条配置中第二条缺少config_key时
10. 应返回400当多条配置中第二条缺少config_value时
11. 应成功批量更新配置
12. 应成功更新单条配置
13. 应允许config_value为空字符串
14. 应允许config_value为null
15. 应允许config_value为0
16. 应允许config_value为false
17. 应返回更新后配置的完整字段格式
18. 应返回500当数据库错误时
19. 应返回兜底错误消息当更新异常无message时

## 本次新增测试（相比上一版 +12 个）

### 认证/角色测试（+4 个）
- PUT: 401 无 token、403 admin、403 view

### 边界值测试（+4 个）
- config_value 为 null
- config_value 为 0
- config_value 为 false
- 多条配置中第二条缺少字段（2 个测试）

### 错误兜底测试（+2 个）
- GET 异常无 message 属性时触发兜底消息
- PUT 异常无 message 属性时触发兜底消息

### 响应格式验证（+2 个）
- GET 返回数据完整字段格式验证
- PUT 返回数据完整字段格式验证

## 技术要点

1. **权限控制**: 两个端点均仅限 sysadmin 角色，admin 和 view 角色返回 403
2. **输入验证**: configs 必须为非空数组，每项必须有 config_key 和 config_value（undefined 检查）
3. **兜底消息**: catch 块中 `err.message || '默认消息'` 覆盖了 err 无 message 属性的分支
4. **边界值**: config_value 使用 `=== undefined` 检查，允许 null、0、false、空字符串等 falsy 值
5. **辅助函数**: 提取 mockPrismaForGet/mockPrismaForGetError/mockPrismaForUpdate/mockPrismaForUpdateError 减少 mock 样板代码
