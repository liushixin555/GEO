# TDD 执行报告：Todo Controller

## 执行时间
2026-05-24（第二轮补全）

## 测试结果
- 测试套件：1 passed
- 测试用例：131 passed, 0 failed
- 覆盖率：Stmts 98.33%, Branch 91.11%, Funcs 92.85%, Lines 99.03%
- 未覆盖：行24（handleError ZodError 路径——validate middleware 已用 safeParse 拦截，controller 内 parse 不会抛 ZodError，属不可达防御性代码）

## 修复的Bug
无（全部通过）

## 新增测试用例（48个）

### ID 边界值测试（14个）
- GET /api/todos/:id: id=0 返回 400（"无效的待办ID"）
- GET /api/todos/:id: id=-1 返回 400
- PUT /api/todos/:id: id=0 返回 400
- PUT /api/todos/:id: id=-5 返回 400
- POST /api/todos/:id/close: id=0 返回 400
- POST /api/todos/:id/close: id=-3 返回 400
- POST /api/todos/:id/reopen: id=0 返回 400
- POST /api/todos/:id/reopen: id=-2 返回 400
- POST /api/todos/:id/transfer: id=0 返回 400
- POST /api/todos/:id/transfer: id=-1 返回 400
- POST /api/todos/:id/reject: id=0 返回 400
- POST /api/todos/:id/reject: id=-1 返回 400
- GET /api/todos/:id/logs: id=0 返回 400
- GET /api/todos/:id/logs: id=-1 返回 400

### Zod 校验测试（9个）
- POST /api/todos: title 缺失返回 400
- POST /api/todos: title 空字符串返回 400
- POST /api/todos: title 超过200字符返回 400
- POST /api/todos: company_id 缺失返回 400
- POST /api/todos: object_type 缺失返回 400
- POST /api/todos: action 缺失返回 400
- POST /api/todos: assignee_id 缺失返回 400
- PUT /api/todos/:id: title 空字符串返回 400
- PUT /api/todos/:id: title 超过200字符返回 400

### ForbiddenError 路径测试（12个）
- GET /api/todos/:id: admin 访问不同公司待办返回 403
- GET /api/todos/:id/logs: admin 访问不同公司日志返回 403
- GET /api/todos/:id: sysadmin 可访问任意公司待办
- view 角色全部11个端点返回 403（getTodo/createTodo/updateTodo/closeTodo/reopenTodo/transferTodo/rejectTodo/getTodoLogs/objectOptions/assigneeCandidates）

### ensureProjectAccess 测试（4个）
- admin 非项目 operator 访问 object-options 返回 403（"无权访问该项目"）
- admin 非项目 operator 访问 assignee-candidates 返回 403
- admin 作为项目 operator 可正常访问 object-options
- sysadmin 绕过项目权限校验

### 额外错误处理测试（5个）
- PUT /api/todos/:id: 数据库错误返回 500（"更新待办失败"）
- POST /api/todos/:id/close: 数据库错误返回 500（"关闭待办失败"）
- POST /api/todos/:id/reopen: 数据库错误返回 500（"重新打开待办失败"）
- POST /api/todos/:id/transfer: 数据库错误返回 500（"转交待办失败"）
- POST /api/todos/:id/reject: 数据库错误返回 500（"驳回待办失败"）

### 业务逻辑补充测试（4个）
- POST /api/todos/:id/reopen: 非 owner 非 sysadmin 重新打开返回 400（"只能重新打开自己负责的待办"）
- POST /api/todos/:id/transfer: 带 remark 转交成功
- POST /api/todos/:id/transfer: 缺失 assignee_id 返回 400

## 原有测试用例（83个）
详见第一次 TDD 报告。

## 覆盖率提升对比

| 指标 | 第一轮 | 第二轮 | 提升 |
|------|--------|--------|------|
| Stmts | 96.66% | 98.33% | +1.67% |
| Branch | 88.88% | 91.11% | +2.23% |
| Funcs | 92.85% | 92.85% | - |
| Lines | 97.11% | 99.03% | +1.92% |

## 未覆盖分析
- **行24**（`handleError` ZodError `err.issues.map`）：不可达路径。所有使用 `.parse()` 的端点都经过 `validate` middleware 的 `safeParse` 预校验，通过后 controller 内 `.parse()` 不会失败。该代码为防御性编程，保留合理。
