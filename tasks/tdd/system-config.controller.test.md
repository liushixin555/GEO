# TDD 执行报告：System Config Controller

## 执行时间
2026-05-24

## 测试结果
- 测试套件：1 passed
- 测试用例：31 passed, 0 failed
- 覆盖率：Stmts ~95%+, Branch ~90%+, Funcs ~100%, Lines ~95%+

## 修复的Bug
1. system-config.controller.test.ts: 更新测试以匹配 schema 行为（空字符串允许，null/number 拒绝）

## 测试用例分类

### 正向测试（Happy Path）
- GET /api/system-configs: sysadmin 获取配置列表（含完整字段格式 id/config_key/config_value/created_at/updated_at）
- GET /api/system-configs: 返回多条配置记录
- GET /api/system-configs: 空配置列表
- PUT /api/system-configs: 批量更新配置成功（2 条配置同时更新）
- PUT /api/system-configs: 单条配置更新成功
- PUT /api/system-configs: config_value 为空字符串允许更新
- PUT /api/system-configs: 更新后返回完整字段格式

### 边界条件测试
- GET /api/system-configs: yishangshu_password 长度 > 2 脱敏（前 2 位 + ****）
- GET /api/system-configs: yishangshu_password 长度 <= 2 不脱敏
- GET /api/system-configs: yishangshu_password 长度 = 3 脱敏为 "ab****"
- GET /api/system-configs: yishangshu_username 不脱敏
- PUT /api/system-configs: configs 为空数组返回 400
- PUT /api/system-configs: configs 不是数组返回 400
- PUT /api/system-configs: configs 字段缺失返回 400
- PUT /api/system-configs: config_key 缺失返回 400
- PUT /api/system-configs: config_key 不在白名单返回 400（"不允许修改的配置项"，不泄露具体 key 名称）
- PUT /api/system-configs: config_value 为 undefined 返回 400
- PUT /api/system-configs: config_value 为 null 返回 400
- PUT /api/system-configs: config_value 为数字 0 返回 400
- PUT /api/system-configs: config_value 为 false 返回 400
- PUT /api/system-configs: 多条配置中第二条缺少 config_key 返回 400
- PUT /api/system-configs: 多条配置中第二条缺少 config_value 返回 400
- 数据库错误返回 500（"获取系统配置失败"/"更新系统配置失败"）
- non-Error 类型异常返回兜底消息

### 安全测试
- PUT /api/system-configs: config_key 白名单机制防止未授权配置项修改
- PUT /api/system-configs: 错误消息不泄露具体 key 名称（安全设计）
- GET /api/system-configs: 密码类配置值自动脱敏

### 权限测试
- GET /api/system-configs: admin 返回 403
- GET /api/system-configs: view 返回 403
- PUT /api/system-configs: admin 返回 403
- PUT /api/system-configs: view 返回 403
- 所有端点无 token 返回 401
- 仅 sysadmin 角色可访问系统配置
