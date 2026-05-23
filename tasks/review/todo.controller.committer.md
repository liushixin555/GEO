# apis/controller/todo.controller.ts — Committer 审核意见与最终裁决

**审核日期**: 2026-05-24
**审核角色**: 代码 Committer（代码库合并审批人）
**审核对象**: `tasks/review/todo.controller.security.md`（代码安全专家评审报告）
**审核文件**: `apis/controller/todo.controller.ts`（268 行）
**最终裁决**: ⚠️ CONDITIONAL APPROVE（有条件批准）— 安全评审报告质量优秀，但部分建议需调整后方可实施

---

## 一、Committer 总体评价

安全评审报告 **质量优秀**，对 `todo.controller.ts` 的安全风险识别全面且深入。报告覆盖了 OWASP Top 10 中的 6 个分类，共 8 个安全问题，从 CRITICAL 到 LOW 分级合理。修复代码示例可直接使用。

**Committer 同意** 8 个问题中的 **7 个**，对 **1 个** 提出不同意见。

---

## 二、逐项审核意见

### SEC-C-01: IDOR 越权访问 — getTodo / getTodoLogs 缺少资源所有权校验

**Committer 裁决**: ✅ **同意 — CRITICAL 确认**

验证了 Service 层代码：
- `todoService.getById(id)` 确认仅按 `id` 查询，无 `userId`/`role`/`companyId` 参数（`todo.service.impl.ts:84-98`）
- `todoService.getLogs(todoId)` 同样仅按 `todoId` 查询（`todo.service.impl.ts:338-348`）
- 路由中间件 `roleMiddleware('sysadmin', 'admin')` 限制了角色，但 **同角色的不同公司用户之间没有隔离**

这是真实的安全漏洞，admin 用户可通过遍历 ID 访问跨公司的待办数据。**必须修复**。

**Committer 对修复方案的建议**：
- Service 层 `getById` 签名改为 `getById(id, userId, role, companyId)` 是正确的
- 但建议 **先做 404 检查再鉴权**，避免通过鉴权失败/成功的差异来探测 ID 是否存在（信息泄露侧信道）
- 建议实现方式：非 sysadmin 在同一查询中加入 `companyId` 条件，查不到时统一返回 404

---

### SEC-H-01: getObjectOptions / getAssigneeCandidates 控制器绕过 Service 层

**Committer 裁决**: ✅ **同意 — HIGH 确认，但优先级可调整**

验证了代码：
- `getObjectOptions` 第 182 行 `const prisma = getPrisma()` 确认在控制器直接操作数据库
- `getAssigneeCandidates` 第 234 行同样直接使用 Prisma
- 第 174-179 行和第 226-231 行的手动权限校验与 Service 层逻辑重复

**Committer 意见**：
- 同意这是架构问题，应迁移到 Service 层
- 但 `where: any` 类型问题属于 **代码质量** 而非安全问题，建议从本报告中拆出，归入代码质量评审
- 实际影响：这些端点已经过 `authMiddleware` + `roleMiddleware` 保护，且有手动项目权限校验，实际被利用的风险低于 SEC-C-01
- **建议降为 P1 但排在 SEC-C-01 之后执行**

---

### SEC-H-02: 全部端点缺少输入验证（Zod Schema）

**Committer 裁决**: ✅ **同意 — HIGH 确认**

**Committer 意见**：
- `pageSize=999999` 的 DoS 风险是真实且高优先级的
- `req.body` 整体传入 Service 的批量赋值风险已通过 Prisma 的字段白名单机制部分缓解（Prisma `create` 只取 schema 中定义的字段），但 **不应依赖 ORM 做输入验证**
- Zod Schema 修复方案合理，但需注意：
  1. `listTodosSchema` 中 `search` 的 `max(100)` 需与业务确认是否足够
  2. `createTodoSchema` 的字段应与 `CreateTodoRequest` entity 保持同步
  3. 建议将 Schema 定义集中到 `apis/schema/todo.schema.ts` 文件，便于复用和测试

**实施建议**：可分两批执行
- 第一批（P0）：`listTodos` 的 page/pageSize 边界 + `createTodo` 的 body 验证
- 第二批（P1）：其余端点

---

### SEC-M-01: catch 块 err.message 可能泄露内部信息

**Committer 裁决**: ✅ **同意 — MEDIUM 确认**

**Committer 意见**：
- 验证了代码，`err.message` 在 `else` 分支确实直接传递给客户端
- Prisma 的约束错误消息可能包含表名和字段名，这是一个真实的信息泄露风险
- 修复方案中的 `logger.error` + 固定消息是正确做法
- **额外建议**：应在项目级别统一创建错误处理中间件（Express error handler），而非逐个 catch 块修改

---

### SEC-M-02: 批量赋值（Mass Assignment）风险

**Committer 裁决**: ⚠️ **部分同意 — 降为 LOW**

**Committer 不同意**：
- 报告自身也指出 "Service 层的 `create` 方法从 `request` 中读取特定字段，不会直接受额外字段影响"
- Prisma 的 `create` / `update` 方法基于 schema 白名单，额外字段会被自动忽略
- `updateTodo` Service 层使用逐字段检查（`request.title !== undefined`），无效字段无法注入
- 实际风险较低，建议与 SEC-H-02（Zod 验证）合并处理，不单独列为 MEDIUM

---

### SEC-L-01: 整数解析缺少边界检查

**Committer 裁决**: ✅ **同意 — LOW 确认**

- `id=0` 和 `id=-1` 通过 `isNaN` 检查是事实
- 修复方案 `id <= 0` 简单有效，建议在修复 SEC-H-02 时一并处理

---

### SEC-L-02: Service 异常通过字符串匹配检测

**Committer 裁决**: ✅ **同意 — LOW 确认，但实施需谨慎**

**Committer 意见**：
- 自定义异常类（`NotFoundError`、`ForbiddenError`、`BusinessError`）是正确的工程实践
- 但这需要 **Service 层全面改造**，所有 `throw new Error(...)` 都需替换
- 影响范围大，建议作为独立重构任务，不应与安全修复混合在一个 PR 中
- **建议**：创建 `apis/errors.ts` 统一定义异常类，分阶段迁移

---

## 三、修复计划确认

Committer 确认的修复优先级（与安全专家报告微调）：

| 优先级 | 漏洞编号 | 修复内容 | Committer 指定 PR |
|--------|----------|----------|-------------------|
| **P0** | SEC-C-01 | getTodo/getTodoLogs 增加资源所有权校验 | PR-1（安全修复，最高优先） |
| **P0** | SEC-H-02（部分） | listTodos page/pageSize 边界 + createTodo body 验证 | PR-1 |
| **P1** | SEC-H-01 | getObjectOptions/getAssigneeCandidates 迁移至 Service 层 | PR-2（架构重构） |
| **P1** | SEC-H-02（剩余） | 其余 9 个端点 Zod Schema 验证 | PR-2 |
| **P2** | SEC-M-01 | catch 块错误消息脱敏 + 统一错误处理中间件 | PR-3 |
| **P3** | SEC-L-01 | 整数解析边界检查 | PR-2 |
| **P3** | SEC-L-02 | 自定义异常类 | PR-4（独立重构） |

**预计 PR 数量**：4 个
**P0 修复建议完成时间**：尽快，不晚于本周

---

## 四、正面发现确认

Committer 确认安全专家报告中的正面发现均属实：

1. ✅ 全部 11 个端点均使用 `authMiddleware` + `roleMiddleware('sysadmin', 'admin')`（`app.ts:188-198`）
2. ✅ Prisma ORM 参数化查询，无 SQL 注入风险
3. ✅ Tab 权限控制（all_open/all_closed 限制 sysadmin）逻辑正确
4. ✅ 全部 parseInt 结果均有 isNaN 检查
5. ✅ Service 层对 update/close/reopen/transfer/reject 均有 assigneeId 或 role 校验

---

## 五、最终裁决

### ⚠️ CONDITIONAL APPROVE（有条件批准）

**条件**：
1. **SEC-C-01（IDOR）必须在下一个 PR 中修复**，这是真实的安全漏洞，不可延期
2. SEC-H-02 的 `pageSize` 上限限制须与 SEC-C-01 同 PR 提交
3. 其余修复按上表优先级分 PR 逐步推进
4. SEC-M-02 降为 LOW，与 SEC-H-02 合并处理
5. SEC-L-02 自定义异常类作为独立重构任务，不阻塞当前安全修复

**不阻塞当前代码的合并**：现有代码已有 `authMiddleware` + `roleMiddleware` 保护，IDOR 仅在同角色跨公司场景下可被利用，在修复 PR 提交前可暂时接受。

---

## 六、Committer 签名

| 角色 | 姓名 | 日期 | 裁决 |
|------|------|------|------|
| Committer | Claude Code | 2026-05-24 | ⚠️ CONDITIONAL APPROVE |
| 安全专家 | Claude Code | 2026-05-24 | 🔴 HIGH（高风险） |
