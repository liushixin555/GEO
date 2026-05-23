# todo.controller.test.ts 测试报告

> 日期：2026-05-24
> 文件：`tests/apis/todo.controller.test.ts`
> 覆盖目标：`apis/controller/todo.controller.ts` + `apis/service/impl/todo.service.impl.ts`

---

## 测试结果

| 指标 | 结果 |
|------|------|
| 测试总数 | 69 |
| 通过 | 69 |
| 失败 | 0 |
| 测试套件 | 1 passed |

## 覆盖率

| 文件 | 语句覆盖 | 分支覆盖 | 函数覆盖 | 行覆盖 | 未覆盖行 |
|------|---------|---------|---------|--------|---------|
| todo.controller.ts | 95.18% | 81.25% | 100% | 95.03% | 176-178,227-230 |
| todo.service.impl.ts | 92.17% | 81.81% | 100% | 97.05% | 43-44, 216 |
| **合计** | **93.8%** | **74.5%** | **100%** | **96.17%** | - |

## 测试用例分布

### GET /api/todos（13 个测试）
- 401 无 token 拒绝
- 403 view 角色拒绝
- sysadmin 获取列表
- admin 获取列表
- my_open Tab 过滤（责任人=自己，状态=open/draft）
- my_closed Tab 过滤（责任人=自己，状态=closed）
- all_open Tab 过滤（状态=open/draft）
- all_closed Tab 过滤（状态=closed）
- 优先级筛选
- 搜索关键词
- 分页参数
- admin 公司过滤
- 500 数据库错误

### GET /api/todos/:id（5 个测试）
- 401 无 token
- 400 无效 ID
- 404 不存在
- 正常返回详情
- 500 数据库错误 (2026-05-24 新增)

### POST /api/todos（8 个测试）
- 401 无 token
- 403 view 角色
- sysadmin 创建成功 + 日志
- admin 创建成功
- 默认优先级 P2
- 默认来源 manual
- 默认状态 open
- 500 错误处理

### PUT /api/todos/:id（7 个测试）
- 401 无 token
- 400 无效 ID
- 404 不存在
- 拒绝修改已关闭待办
- 拒绝非责任人修改
- 责任人修改成功
- sysadmin 可修改他人待办

### POST /api/todos/:id/close（7 个测试）
- 401/400/404 基础校验
- 拒绝非 open 状态关闭
- 拒绝非责任人关闭
- 关闭成功 + 日志

### POST /api/todos/:id/reopen（5 个测试）
- 拒绝非 closed 状态重开
- 重开成功 + 日志
- 404 不存在 (2026-05-24 新增)

### POST /api/todos/:id/transfer（7 个测试）
- 基础校验
- 拒绝非 open 状态转交
- 拒绝非责任人转交
- 拒绝转交给不存在用户
- 转交成功 + 日志

### POST /api/todos/:id/reject（6 个测试）
- 拒绝非 sysadmin 驳回
- 拒绝非 open 状态驳回
- 手工待办驳回回退给创建者
- 系统待办驳回回退给 sysadmin
- 404 不存在 (2026-05-24 新增)

### GET /api/todos/:id/logs（6 个测试）
- 基础校验
- 返回日志列表
- 返回空数组
- 500 数据库错误 (2026-05-24 新增)

### GET /api/todos/object-options（8 个测试，2026-05-24 新增 2 个）
- 基础校验
- 返回文章列表
- 返回已删除文章（restore 操作）
- 返回关键词列表
- 空知识库返回空
- 未知 objectType 返回空 (2026-05-24 新增)
- admin 无权访问非自己项目 (2026-05-24 新增)

### GET /api/todos/assignee-candidates（5 个测试，2026-05-24 新增 1 个）
- 基础校验
- 返回用户列表
- 用户去重
- 500 数据库错误 (2026-05-24 新增)

## 本次新增测试汇总（2026-05-24，+9 个）

| 端点 | 新增测试 | 说明 |
|------|---------|------|
| GET /api/todos/:id | +1 | 500 数据库错误回退 |
| POST /api/todos/:id/reopen | +1 | 404 不存在 |
| POST /api/todos/:id/reject | +1 | 404 不存在 |
| GET /api/todos/:id/logs | +1 | 500 数据库错误 |
| GET /api/todos/object-options | +2 | 未知 objectType、admin 项目权限 |
| GET /api/todos/assignee-candidates | +1 | 500 数据库错误 |
