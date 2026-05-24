# TDD 执行报告：User Controller

## 执行时间
2026-05-24

## 测试结果
- 测试套件：1 passed
- 测试用例：75 passed, 0 failed
- 覆盖率：Stmts ~95%+, Branch ~90%+, Funcs ~100%, Lines ~95%+

## 修复的Bug
1. user.controller.ts: 移除重复的 schema.parse() 调用（validate 中间件已处理验证，双重 parse 导致 Zod v4 transform 冲突）
2. user.controller.test.ts: 更新验证错误消息，添加 validate 中间件的 "参数验证失败:" 前缀

## 测试用例分类

### 正向测试（Happy Path）
- GET /api/users: sysadmin 获取用户列表（含搜索、角色过滤、状态过滤、分页）
- GET /api/users: 搜索参数（username + cnName OR 查询）
- GET /api/users: role=admin 过滤
- GET /api/users: status=true/false 过滤
- GET /api/users: 组合过滤（search + role + status）
- GET /api/users: 分页参数 page=2, pageSize=5（skip=5, take=5）
- GET /api/users: 默认 page=1, pageSize=10
- GET /api/users: 正确的分页响应结构（total/page/pageSize/list）
- GET /api/users/:id: sysadmin 获取用户详情
- GET /api/users/:id: 正确的响应结构（code/data/message）
- POST /api/users: 创建用户成功（含 bcrypt 密码哈希）
- POST /api/users: 创建 sysadmin 角色用户成功
- POST /api/users: 创建 view 角色用户成功
- POST /api/users: 密码恰好 8 位通过验证
- POST /api/users: 正确的创建响应结构
- PUT /api/users/:id: 更新 cn_name 成功
- PUT /api/users/:id: 更新密码成功
- PUT /api/users/:id: 更新状态成功
- PUT /api/users/:id: 更新角色 admin -> view 成功
- PUT /api/users/:id: 同时更新多个字段
- PUT /api/users/:id: 空请求体更新成功（无字段变更）
- PUT /api/users/:id: 允许更新 sysadmin 用户的 cn_name
- DELETE /api/users/:id: 删除用户成功（软删除）
- DELETE /api/users/:id: 正确的删除响应结构（data=null）

### 边界条件测试
- GET /api/users: 空搜索参数
- GET /api/users: status=false 过滤
- GET /api/users/:id: id=0 边界情况
- GET /api/users/:id: 负数 ID
- POST /api/users: username 为空字符串（"参数验证失败: 用户名不能为空"）
- POST /api/users: password 为空字符串（"参数验证失败: 密码长度不能少于8位"）
- POST /api/users: cn_name 为空字符串（"参数验证失败: 姓名不能为空"）
- POST /api/users: role 为空字符串（"参数验证失败: 角色值不合法"）
- POST /api/users: 所有字段缺失/空 body（"参数验证失败: 用户名不能为空; 密码不能为空; 姓名不能为空; 角色值不合法"）
- POST /api/users: 密码 7 位拒绝/8 位通过
- PUT /api/users/:id: ID 非数字返回 400（"无效的用户ID"）
- PUT /api/users/:id: 不存在的用户返回 404（"用户不存在"）
- DELETE /api/users/:id: ID 非数字返回 400
- DELETE /api/users/:id: 不存在返回 404
- 数据库错误时返回 500 + 默认错误消息

### 安全测试
- POST /api/users: 角色 'superadmin' 拒绝（"参数验证失败: 角色值不合法"）
- POST /api/users: 角色 'user' 拒绝
- PUT /api/users/:id: 修改 sysadmin 用户角色返回 403（"系统管理员角色不可修改"）
- DELETE /api/users/:id: 删除 sysadmin 用户返回 403（"系统管理员不可删除"）
- POST /api/users: 重复 username 返回 409（Conflict）
- 所有端点无 token 返回 401

### 权限测试
- GET /api/users: admin 返回 403
- GET /api/users: view 返回 403
- GET /api/users/:id: admin/view 返回 403
- POST /api/users: admin/view 返回 403
- PUT /api/users/:id: admin/view 返回 403
- DELETE /api/users/:id: admin/view 返回 403
- 仅 sysadmin 角色可访问所有用户 CRUD 操作
