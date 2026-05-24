# TDD 执行报告：Todo Controller

## 执行时间
2026-05-24

## 测试结果
- 测试套件：1 passed
- 测试用例：83 passed, 0 failed
- 覆盖率：Stmts ~90%+, Branch ~85%+, Funcs ~95%+, Lines ~90%+

## 修复的Bug
无（本次全部通过）

## 测试用例分类

### 正向测试（Happy Path）
- GET /api/todos: sysadmin 获取待办列表（tab=my_open）
- GET /api/todos: admin 获取待办列表
- GET /api/todos: tab=my_open 过滤（assignee=me, status in [open, draft]）
- GET /api/todos: tab=my_closed 过滤（assignee=me, status=closed）
- GET /api/todos: tab=all_open 过滤（status in [open, draft]）
- GET /api/todos: tab=all_closed 过滤（status=closed）
- GET /api/todos: priority 过滤（P0）
- GET /api/todos: search 关键字过滤（title contains, mode: insensitive）
- GET /api/todos: 分页参数 page=2, pageSize=5
- GET /api/todos/:id: sysadmin 获取待办详情
- POST /api/todos: sysadmin 创建待办成功（含 todoLog create action=submit）
- POST /api/todos: admin 创建待办成功
- POST /api/todos: 默认 priority=P2
- POST /api/todos: 默认 source=manual
- POST /api/todos: 默认 status=open
- POST /api/todos: 接受 due_at 字段
- PUT /api/todos/:id: owner 更新待办成功（"更新待办成功"）
- PUT /api/todos/:id: sysadmin 更新非自己负责的待办成功
- POST /api/todos/:id/close: 关闭待办成功（含 todoLog create action=close）
- POST /api/todos/:id/reopen: 重新打开待办成功（含 todoLog create action=reopen）
- POST /api/todos/:id/transfer: 转交待办成功（含 todoLog create action=transfer, remark="转交给 用户B"）
- GET /api/todos/:id/logs: 获取操作日志列表
- GET /api/todos/:id/logs: 无日志时返回空数组
- GET /api/todos/object-options: 获取文章选项列表（active articles, deletedAt=null）
- GET /api/todos/object-options: action=delete 返回活跃文章
- GET /api/todos/object-options: action=restore 返回已删除文章（deletedAt not null）
- GET /api/todos/object-options: objectType=keyword 返回关键词列表
- GET /api/todos/object-options: 无 knowledge base 时返回空
- GET /api/todos/assignee-candidates: 返回 operators + sysadmin 用户
- GET /api/todos/assignee-candidates: 用户去重

### 边界条件测试
- GET /api/todos/:id: ID 非数字返回 400（"无效的待办ID"）
- GET /api/todos/:id: 不存在返回 404（"待办不存在"）
- POST /api/todos: 不存在返回 404
- PUT /api/todos/:id: ID 非数字返回 400
- PUT /api/todos/:id: 不存在返回 404
- POST /api/todos/:id/close: ID 非数字/不存在
- POST /api/todos/:id/reopen: 非关闭状态拒绝（"只有已关闭的待办可以重新打开"）
- POST /api/todos/:id/reopen: 不存在返回 404
- POST /api/todos/:id/transfer: 不存在返回 404
- POST /api/todos/:id/transfer: 目标用户不存在返回 400（"目标用户不存在"）
- POST /api/todos/:id/reject: 不存在返回 404
- GET /api/todos/:id/logs: ID 非数字返回 400
- GET /api/todos/:id/logs: 不存在返回 404
- GET /api/todos/object-options: 缺少 objectType 返回 400
- GET /api/todos/object-options: 未知 objectType 返回 400
- GET /api/todos/assignee-candidates: 缺少 projectId 返回 400
- GET /api/todos/assignee-candidates: 项目不存在返回 404
- 数据库错误返回 500 + 默认错误消息

### 安全测试
- 所有端点无 token 返回 401
- GET /api/todos/object-options: admin 非项目 operator 访问被拒

### 权限测试
- GET /api/todos: view 角色返回 403
- POST /api/todos: view 角色返回 403
- GET /api/todos: admin 不可访问 all_open/all_closed tab（"无权访问全部待办"）
- sysadmin 可访问 all_open/all_closed tab
- PUT /api/todos/:id: 非所有者非 sysadmin 修改返回 400（"只能修改自己负责的待办"）
- PUT /api/todos/:id: 已关闭待办不可修改（"已关闭的待办不能修改"）
- POST /api/todos/:id/close: 非所有者非 sysadmin 关闭返回 400（"只能关闭自己负责的待办"）
- POST /api/todos/:id/close: 非处理中状态不可关闭（"只有处理中的待办可以关闭"）
- POST /api/todos/:id/transfer: 非所有者非 sysadmin 转交返回 400（"只能转交自己负责的待办"）
- POST /api/todos/:id/transfer: 已关闭待办不可转交（"只有处理中的待办可以转交"）
- POST /api/todos/:id/reject: 仅 sysadmin 可驳回（admin 返回 403 "只有系统管理员可以驳回待办"）
- POST /api/todos/:id/reject: 非处理中不可驳回（"只有处理中的待办可以驳回"）
- POST /api/todos/:id/reject: manual 来源驳回重新指派给创建者
- POST /api/todos/:id/reject: 系统来源驳回重新指派给 sysadmin
