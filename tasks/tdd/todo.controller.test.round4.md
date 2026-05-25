# todo.controller.test.ts 第4轮 TDD 执行报告

> 日期：2026-05-25
> 覆盖文件：`apis/controller/todo.controller.ts`, `apis/service/impl/todo.service.impl.ts`, `apis/schema/todo.schema.ts`, `apis/routes/todo.routes.ts`

## 执行摘要

| 指标 | 值 |
|------|-----|
| 测试文件 | 4 |
| 总用例数 | 649 |
| 通过 | 649 |
| 失败 | 0 |
| 新增用例（第4轮） | 22 |
| 核心文件覆盖率 | 100% (Statements / Branch / Function / Line) |

## 覆盖率明细

| 文件 | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| todo.controller.ts | 100% | 100% | 100% | 100% |
| todo.service.impl.ts | 100% | 100% | 100% | 100% |
| todo.schema.ts | 100% | 100% | 100% | 100% |
| todo.routes.ts | 100% | 100% | 100% | 100% |

## 第4轮新增用例清单（22个）

### GET /api/todos — 分页边界（5个）
1. 应接受 pageSize=1（最小值）
2. 应接受 pageSize=100（最大值）
3. 应拒绝 pageSize=0
4. 应拒绝 pageSize=101
5. 应同时使用 priority + search 过滤

### POST /api/todos — 创建边界（4个）
6. 应创建带 project_id 和 object_id 的完整待办
7. 应创建带 project_id=null 的待办
8. 应拒绝 company_id=0
9. 应拒绝 assignee_id 为负数

### POST /api/todos/:id/transfer — 转交边界（4个）
10. 应接受带 remark 的转交请求
11. 应拒绝 assignee_id=0 的转交
12. 应拒绝 remark 超过 500 字符的转交
13. 应接受 remark=500 字符的转交（最大值）

### PUT /api/todos/:id — 更新边界（3个）
14. 应接受仅更新 due_at 为 null（清空截止时间）
15. 应接受仅更新 priority
16. 应接受空 body（无字段更新）

### GET /api/todos/:id/logs — 日志边界（1个）
17. 应返回多条日志记录

### POST /api/todos/:id/reject — 驳回边界（2个）
18. 应拒绝 draft 状态的待办
19. 应返回 500 当驳回过程数据库出错

### GET /api/todos/assignee-candidates — 边界（1个）
20. 应接受 projectId 为字符串数字

### GET /api/todos/object-options — 边界（1个）
21. 应返回关键字选项（不带 action 参数）

### GET /api/todos — 分页响应结构（1个）
22. 应返回完整的分页结构（list, total, page, pageSize）

## 测试执行命令

```bash
npx jest --config jest.config.ts --no-cache --testPathPattern="tests/apis/todo" --coverage
```

## 历史轮次累计

| 轮次 | 新增用例 | 累计用例 | 覆盖率 |
|------|----------|----------|--------|
| 第1轮 | - | 初始覆盖 | ~85% |
| 第2轮 | - | ~605 | 100% |
| 第3轮 | - | ~627 | 100% |
| **第4轮** | **22** | **649** | **100%** |
