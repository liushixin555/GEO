# todo.controller 架构评审第二轮修复 — 2026-05-26

## 变更范围
- `apis/controller/todo.controller.ts` — 移除重复验证、company_id归属校验、ensureProjectAccess防泄露
- `apis/schema/todo.schema.ts` — 新增 todoIdSchema
- `apis/routes/todo.routes.ts` — 所有ID端点添加 validate(todoIdSchema, 'params')
- `apis/utils/error-handler.util.ts` — 新建共享错误处理工具
- `apis/utils/index.ts` — 导出 handleControllerError
- `tests/apis/todo.controller.test.ts` — 更新测试+新增4个测试
- `tasks/review/todo.controller.architecture.md` — 更新评审状态

## 修复项

### H-1: 移除Controller内重复.parse()调用
- 移除6处与validate中间件重复的Zod .parse()调用
- Controller直接使用req.body/req.query中validate中间件已验证的数据

### H-2: createTodo添加company_id归属校验
- admin角色强制使用req.user.companyId，防止跨公司创建待办
- sysadmin保持使用body中的company_id

### M-1: handleError提取为共享工具
- 新建apis/utils/error-handler.util.ts
- 利用AppError基类statusCode统一映射，无需为每个子类写instanceof分支
- todo.controller已切换到handleControllerError

### M-2: ID参数验证使用Zod Schema
- 新增todoIdSchema（z.coerce.number().int().positive()）
- 路由层7个ID端点全部添加validate(todoIdSchema, 'params')
- Controller内getValidatedId()直接读取已验证的params

### M-4: ensureProjectAccess防信息泄露
- NotFoundError转为ForbiddenError('无权访问该项目')
- 防止通过404/403差异探测项目ID是否存在

## 测试
- 219个测试全部通过（含4个新增测试：H-2×2 + M-4×2）
- mock anti-crawl中间件避免测试套件超过200请求触发限流
