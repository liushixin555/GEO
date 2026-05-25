# todo.controller.ts 安全评审修复记录

**日期**: 2026-05-26
**关联评审文件**: `tasks/review/todo.controller.security.md`
**安全评级变化**: HIGH → LOW

## 修复内容

### 已有修复（本次确认）
- SEC-C-01 (IDOR): getTodo/getTodoLogs 已有资源所有权校验
- SEC-H-01 (Service层绕过): getObjectOptions/getAssigneeCandidates 已在 Service 层
- SEC-M-01 (错误泄露): handleError 统一错误处理，固定消息
- SEC-L-01 (整数边界): isNaN(id) || id <= 0
- SEC-L-02 (字符串匹配): NotFoundError/BusinessError/ForbiddenError 自定义异常

### 本次新增修复
1. **SEC-H-02 补充**: Zod Schema 枚举验证加强
   - `object_type`: `z.string()` → `z.enum(['article', 'keyword'])`
   - `action`: `z.string()` → `z.enum(['add', 'delete', 'update', 'restore'])`
   - `source`: `z.string()` → `z.enum(['manual', 'content_iteration', 'smart_link'])`
   - `priority`: `z.string()` → `z.enum(['P0', 'P1', 'P2', 'P3', 'P4'])`
   - `listTodosSchema.priority` 同步更新包含 P4

2. **SEC-M-02 补充**: transfer 跨项目校验
   - `todo.service.impl.ts` transfer 方法新增 projectOperator 查询
   - 非系统管理员的目标用户必须是待办项目的操作员

## 修改文件
- `apis/schema/todo.schema.ts` — 枚举验证加强
- `apis/service/impl/todo.service.impl.ts` — transfer 跨项目校验
- `tasks/review/todo.controller.security.md` — 评审状态更新
- `tests/apis/todo.schema.test.ts` — 测试用例适配
- `tests/apis/todo.controller.test.ts` — 测试用例适配
- `tests/apis/todo.service.test.ts` — transfer mock 更新

## 测试结果
- todo schema 测试: PASS
- todo controller 测试: PASS (785 tests)
- todo service 测试: PASS
- 构建: PASS
- Lint: PASS
