# publishing-schedule.controller TDD 补全

## 日期
2026-05-24

## 变更文件
- `tests/apis/publishing-schedule.controller.test.ts` — 重写，修复失败用例 + 新增单元测试
- `tests/apis/publishing-schedule.service.test.ts` — 修复 TS 编译错误（updateSchedule 签名变更）
- `tasks/tdd/publishing-schedule.controller.test.md` — TDD 报告更新

## 变更内容

### Controller 测试修复
- 修复 12 个因 schema 验证中间件拦截导致的失败用例
- 更新期望消息为 schema 验证格式（`参数验证失败: ...`）
- 修复请求体（schema 不允许 `scheduled_publish_at: null` / 空 body）
- 修复 `schedule_type: null` 测试发送有效 `scheduled_publish_at`

### Controller 单元测试新增（21 个）
- 直接调用 controller 函数绕过 schema 验证
- 覆盖防御性代码路径（L54-55 schedule_type、L61-62 类型检查、L65-66 日期格式）
- 覆盖非 Error 类型抛出（L84 catch else 分支）
- 覆盖 null/undefined/empty string scheduled_publish_at

### Service 测试修复
- 修复 `updateSchedule` 方法签名变更（新增 `scheduleType` 参数）导致的 TS 编译错误
- 19 处调用补全 `scheduleType: null` 参数
- 更新 mock 期望值包含 `scheduleType: null`
- 更新 list 映射期望值包含 `schedule_type: null`

## 测试结果
- 112 用例全部通过
- Controller 覆盖率：Stmts/Branch/Funcs/Lines 100%
- Service 覆盖率：Stmts/Branch/Funcs/Lines 100%
