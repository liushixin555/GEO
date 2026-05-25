# 2026-05-25 project.controller.ts 第三轮TDD补全

## 变更范围
- `tests/apis/project.controller.test.ts`: 新增89个测试用例（Round 3）

## 测试结果
- 206用例全部通过
- 100% 四维覆盖率 (Stmts/Branch/Funcs/Lines)

## 本轮新增测试维度
1. **getErrorMessage 辅助函数** (5用例) — Error空消息/number/object/null/undefined thrown
2. **handleServiceError AppError子类映射** (10用例) — NotFoundError/BusinessError/ForbiddenError/UnauthorizedError/ConflictError/自定义AppError 通过各端点验证
3. **安全注入测试** (5用例) — XSS/SQL注入/路径遍历/超长参数/Unicode
4. **响应结构验证** (6用例) — list/get/create/update/delete/error 响应格式
5. **字段白名单** (2用例) — 未知字段在create/update中被忽略
6. **边界值测试** (11用例) — MAX_SAFE_INTEGER/负数/0/浮点数
7. **角色矩阵** (10用例) — view×5端点 + sysadmin/admin + direct controller
8. **status参数边界** (7用例) — 大写/数字/空字符串/空格
9. **其他** (33用例) — company_id不可变/删除权限/并发/组合过滤/schema strict

## 技术要点
- RATE_LIMIT_MAX 调整为 1000 以支持 200+ 测试请求
- page 负数参数（如 -5）不会被 `|| 1` 转为 1（-5 是 truthy）
- parseInt('  ') = NaN → 400 无效ID
- Zod strict 模式拒绝额外字段
