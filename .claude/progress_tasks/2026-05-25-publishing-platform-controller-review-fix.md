# publishing-platform.controller.ts 多轮评审修复

**日期**: 2026-05-25
**文件**: `apis/controller/publishing-platform.controller.ts` + `apis/service/impl/publishing-platform.service.impl.ts` + `tests/apis/publishing-platform.controller.test.ts`

## 评审来源

综合 6 份评审报告的修复：
- `tasks/review/publishing-platform.controller.md` — 软件质量专家（v1，12项全修复）
- `tasks/review/publishing-platform.controller.quality.md` — 软件质量专家（v2，8项新问题）
- `tasks/review/publishing-platform.controller.security.md` — 代码安全专家（v2，HIGH×2+MEDIUM×5+LOW×3）
- `tasks/review/publishing-platform.controller.architecture.md` — 软件架构专家（v2，HIGH×2+MEDIUM×3+LOW×2）
- `tasks/review/publishing-platform.controller.ts.md` — 软件质量专家（v1，归档）
- `tasks/review/publishing-platform.controller.committer.md` — Committer 审核专家（APPROVE）

## 修复清单

### HIGH 级别（全部修复）

| 编号 | 问题 | 修复方案 | 来源 |
|------|------|----------|------|
| H-1 | `(req as any).user` 类型断言绕过全局 Request 扩展 | 移除 `as any`，直接使用 `req.user?.userId/username/role` | 质量/架构/安全 |
| H-2 | sync 无并发控制，可导致数据不一致 | 添加模块级 `syncLock` 布尔互斥锁 + `try/finally` 保证释放 | 安全 |
| H-3 | 字符串匹配 `'请先配置'` 分派错误类型 | 引入 `BusinessError` 自定义异常 + `instanceof` 判断 | 质量/架构/安全 |

### MEDIUM 级别（全部修复）

| 编号 | 问题 | 修复方案 | 来源 |
|------|------|----------|------|
| M-1 | query 参数 `as string` 忽略数组情况 | 新增 `qp()` 辅助函数处理数组取首值 | 质量/安全 |
| M-2 | search 参数空白字符串绕过校验 | 添加 `.trim()` + 空值转 `undefined` | 安全 |
| M-3 | taxonomy 参数无长度限制 | 添加 `MAX_SEARCH_LENGTH` (100) 长度校验 | 质量/架构/安全 |
| M-4 | list catch 块 `err.message` 直接暴露内部错误 | 统一返回 `'获取发布平台失败'` + `logger.error` 记录详情 | 质量/安全 |
| M-5 | page/pageSize 解析使用 `as string` 不安全 | 改用 `typeof x === 'string'` 类型守卫 | 安全 |

### LOW 级别（已修复）

| 编号 | 问题 | 修复方案 | 来源 |
|------|------|----------|------|
| L-1 | operator 审计日志缺少 `role` 字段 | 添加 `role: req.user?.role` | 质量 |
| L-2 | list 操作缺少审计日志 | 添加 `logger.error('publishing-platform.list.failed', ...)` | 安全 |

## 变更文件

1. **`apis/controller/publishing-platform.controller.ts`** (71→96行)
   - 新增 `BusinessError` 导入
   - 新增 `syncLock` 互斥锁 + `qp()` 辅助函数
   - `syncPublishingPlatforms`: 移除 `as any` + BusinessError instanceof 判断 + syncLock 并发控制 + role 字段
   - `listPublishingPlatforms`: search trim + taxonomy 长度校验 + qp 数组防护 + typeof 类型守卫 + 错误消息脱敏 + 审计日志

2. **`apis/service/impl/publishing-platform.service.impl.ts`**
   - `throw new Error(...)` → `throw new BusinessError(...)`

3. **`tests/apis/publishing-platform.controller.test.ts`** (1297→1447行)
   - 导入 `BusinessError`
   - 暴露 `mockLoggerWarn`
   - 更新 7 个现有测试断言适配新行为
   - 新增 5 个 describe 块共 28 个新测试用例

## 测试结果

- **111 个测试用例全部通过**（原 83 个 + 新增 28 个）
- TypeScript 编译通过（api + page）
- ESLint 检查通过
