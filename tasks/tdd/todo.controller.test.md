# todo.controller.test.ts 测试报告

> 日期：2026-05-23
> 文件：`tests/apis/todo.controller.test.ts`
> 覆盖目标：`apis/controller/todo.controller.ts` + `apis/service/impl/todo.service.impl.ts`

---

## 测试结果

| 指标 | 结果 |
|------|------|
| 测试总数 | 60 |
| 通过 | 60 |
| 失败 | 0 |
| 测试套件 | 1 passed |

## 覆盖率

| 文件 | 语句覆盖 | 分支覆盖 | 函数覆盖 | 行覆盖 | 未覆盖行 |
|------|---------|---------|---------|--------|---------|
| todo.controller.ts | 95.78% | 65.95% | 100% | 95.06% | 43, 98, 130, 148 |
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

### GET /api/todos/:id（4 个测试）
- 401 无 token
- 400 无效 ID
- 404 不存在
- 正常返回详情

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

### POST /api/todos/:id/reopen（4 个测试）
- 拒绝非 closed 状态重开
- 重开成功 + 日志

### POST /api/todos/:id/transfer（7 个测试）
- 基础校验
- 拒绝非 open 状态转交
- 拒绝非责任人转交
- 拒绝转交给不存在用户
- 转交成功 + 日志

### POST /api/todos/:id/reject（5 个测试）
- 拒绝非 sysadmin 驳回
- 拒绝非 open 状态驳回
- 手工待办驳回回退给创建者
- 系统待办驳回回退给 sysadmin

### GET /api/todos/:id/logs（5 个测试）
- 基础校验
- 返回日志列表
- 返回空数组
