# apis/controller/publishing-schedule.controller.ts — 软件开发专家评审修复报告

**修复日期**: 2026-05-24
**修复角色**: 软件开发专家
**依据评审**: 软件质量评审、架构评审、安全评审、Committer审核
**修复文件**:
- `apis/controller/publishing-schedule.controller.ts`
- `apis/service/impl/publishing-schedule.service.impl.ts`
- `tests/apis/publishing-schedule.controller.test.ts`
- `tests/apis/publishing-schedule.service.test.ts`

---

## 修复问题汇总

### P0 — 阻塞性问题（已修复）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| C-1 | updateSchedule 水平越权漏洞 | Service 层添加归属权限校验（project.operators 包含当前 userId），sysadmin 跳过校验 |
| C-1配套 | Controller 层缺少 403 映射 | 新增 `err.message === '无权操作此文章'` → 403 响应 |

### P1 — 强烈建议修复（已修复）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| H-1 | catch(err: any) 类型不安全 | 全部改为 `catch(err: unknown)` + `instanceof Error` 安全窄化；list catch 不再返回原始 `err.message`，使用固定消息防止信息泄露 |
| H-2 | parseInt 未指定 radix | 3 处 parseInt 统一添加 radix=10 |
| H-3 | req.user! 非空断言 | 添加 `if (!req.user)` 防御性检查，返回 401 |

### P2 — 建议修复（已修复）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| M-1 | page/pageSize 负数穿透 | Math.max/Math.min 钳制：page >= 1, 1 <= pageSize <= 100 |
| M-2 | projectId NaN 穿透 | parseInt 后 isNaN 检查，无效值设为 undefined |
| M-3 | scheduled_publish_at 日期格式未校验 | 新增 Date.parse + isNaN 校验，空字符串允许通过 |
| M-4 | 错误消息术语不一致 | '无效的文章ID' → '无效的ID' |
| M-5 | status 参数无白名单 | 新增 VALID_STATUSES 白名单校验 |
| OBS-1 | 500 错误泄露 err.message | update 端点 500 分支使用固定消息 '更新发布计划失败' |

### P4 — 审计日志（已修复）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| L-1 | 缺少安全审计日志 | 两个 catch 块均添加 `console.error` 审计日志（含函数名和原始错误对象） |

### 未修复（项目级技术债务）

| 编号 | 问题 | 原因 |
|------|------|------|
| H-1(DI) | 模块级硬编码单例 | 项目统一模式，需整体重构 |
| ARCH-MAJOR-2 | 无统一异常体系 | 需项目级引入 NotFoundError/BusinessError |
| ARCH-MAJOR-3 | Service 返回 any | 需引入 Entity 层类型定义 |

---

## 测试结果

- **Controller 测试**: 38 个测试全部通过（新增 5 个：403越权、日期格式校验、status白名单、projectId NaN、pageSize上限）
- **Service 测试**: 48 个测试全部通过（新增 3 个：admin有权限、admin越权拦截、sysadmin绕过）
- **总计**: 112 个测试，全部通过（安全评审追加修复后更新）

---

*软件开发专家评审修复完成 — 2026-05-24*
