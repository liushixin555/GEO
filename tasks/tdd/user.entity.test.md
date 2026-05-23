# user.entity.test.ts TDD 执行报告

## 测试目标
- 源文件: `apis/entity/user.entity.ts`
- 测试文件: `tests/apis/user.entity.test.ts`

## 源文件内容概要
- `UserRole` 类型: `'sysadmin' | 'admin' | 'view'` 联合类型
- `User` 接口: 用户实体（9个字段，含可选 company_id）
- `LoginRequest` 接口: 登录请求（username, password）
- `LoginResponse` 接口: 登录响应（token + 嵌套 user 对象，含 selected_company/selected_project）
- `SaveSelectionRequest` 接口: 保存选择请求（company_id, 可选 project_id）
- `LoginSelectionError` 类: 自定义错误类，继承 Error
- `UserListItem` 接口: 用户列表项（含可选 company_name）
- `CreateUserRequest` 接口: 创建用户请求（含可选 company_id）
- `UpdateUserRequest` 接口: 更新用户请求（全可选字段）

## 测试用例统计
- 总测试数: **94 个**
- 通过: 94
- 失败: 0
- 跳过: 0

## 测试分组详情

### UserRole type（4 个测试）
- 验证 sysadmin/admin/view 三个角色值
- 验证恰好只有3个有效值

### User interface（14 个测试）
- 完整字段创建、company_id 的 null/undefined 可选性
- 三种角色支持、status 为 false 的禁用用户
- 字段数量和字段名验证
- id=0 边界值、中文字符、空字符串边界

### LoginRequest interface（5 个测试）
- 正常创建、字段精确验证
- 空 username/password 边界值

### LoginResponse interface（10 个测试）
- 完整嵌套结构、null/undefined 可选字段
- 顶层字段数量、嵌套 user 字段名验证
- selected_company/project 组合情况
- 三种角色在响应中的支持

### SaveSelectionRequest interface（5 个测试）
- 全字段/部分字段创建
- project_id 的 null/undefined 可选性
- 字段名精确验证

### LoginSelectionError class（14 个测试）
- 基本创建、name/message 属性
- instanceof Error / LoginSelectionError
- 原型链验证、toString 支持
- try-catch 兼容性、async/await 兼容性
- 中文消息、长消息、空消息
- 与普通 Error 的区分
- error 数组过滤、Promise.allSettled 集成

### UserListItem interface（9 个测试）
- 全字段创建、可选字段 null/undefined
- 字段数量和字段名验证
- 三种角色、status=false、空 company_name
- Date 类型时间戳验证

### CreateUserRequest interface（9 个测试）
- 全字段/部分字段创建
- company_id 的 null/undefined 可选性
- 字段名验证、三种角色
- 中文 cn_name、空字符串边界

### UpdateUserRequest interface（14 个测试）
- 全可选字段、空请求
- 单字段更新（cn_name/role/status/password）
- 两字段组合更新
- 三种角色、字段名验证、空密码

### cross-interface integration（6 个测试）
- User 与 UserListItem 共享字段一致性
- CreateUserRequest 字段可构造 User
- UpdateUserRequest 可部分覆盖 User
- LoginRequest 类型验证
- LoginResponse 包含 UserRole 验证
- SaveSelectionRequest 与 User company_id 对应

### re-exports from index（3 个测试）
- LoginSelectionError 从 index.ts 导出
- 类型导入编译正确性
- index 导出的类与直接导入一致

## 测试覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| index.ts | 100% | 100% | 100% | 100% |
| user.entity.ts | 100% | 100% | 100% | 100% |
| **总计** | **100%** | **100%** | **100%** | **100%** |

## 测试结果
```
Test Suites: 1 passed, 1 total
Tests:       94 passed, 94 total
Time:        4.953 s
```
