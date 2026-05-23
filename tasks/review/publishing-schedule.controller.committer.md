# apis/controller/publishing-schedule.controller.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/controller/publishing-schedule.controller.ts`
**代码行数**: 57 行（2 个导出函数 + 1 个模块级服务实例）
**测试文件**: `tests/apis/publishing-schedule.controller.test.ts`（637 行，含 33 个测试用例）
**关联文件**: `apis/service/impl/publishing-schedule.service.impl.ts`, `apis/service/publishing-schedule.service.ts`, `apis/utils/response.util.ts`, `apis/app.ts`
**已有评审**: 软件质量评审（publishing-schedule.controller.md）、架构评审（publishing-schedule.controller.architecture.md）、安全评审（publishing-schedule.controller.security.md）

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，本文件是项目中**结构最简洁、职责最纯粹的控制器**，仅 57 行代码实现 2 个端点，Controller 层零业务逻辑。三份已有评审报告（质量、架构、安全）共发现 1 个 CRITICAL + 3 个 HIGH + 5 个 MEDIUM 级问题，但经过 Committer 综合评估，部分问题的实际影响需重新判定。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能完整性 | 10/10 | 通过 — list + update 完整实现，覆盖发布计划管理需求 |
| 测试完备性 | 7/10 | 有条件通过 — 33 个用例，认证/授权/参数/正常/异常/边界值已覆盖，但缺少越权测试 |
| API 契约正确性 | 7/10 | 有条件通过 — list 正确，update 存在水平越权风险 |
| 项目规范遵循 | 8/10 | 通过 — 函数式导出、success/fail/paginate 工具函数、中间件链一致 |
| 生产就绪度 | 5/10 | 有条件通过 — updateSchedule 缺归属权限校验，需修复后方可上线 |
| 向后兼容性 | 10/10 | 通过 — 新模块，无兼容性问题 |

**综合判定: 有条件通过（CONDITIONAL APPROVE）— 需修复 C-1 越权漏洞后方可合并**

---

## 二、测试完备性审核

### 2.1 测试规模与分布

| 端点 | 测试用例数 | 认证 | 授权 | 输入验证 | 正常流程 | 异常流程 | 边界值 |
|------|-----------|------|------|----------|----------|----------|--------|
| GET /api/publishing-schedule | 12 | 1 | 2 | 0 | 5 | 2 | 4 |
| GET /api/publishing-schedule（edge cases） | 9 | 0 | 0 | 0 | 4 | 0 | 5 |
| PUT /api/publishing-schedule/:id | 12 | 1 | 1 | 5 | 4 | 4 | 1 |
| **合计** | **33** | **2** | **3** | **5** | **13** | **6** | **10** |

### 2.2 测试质量评价

**优点**:

1. **认证/授权测试完备**: 无 token 返回 401、view 角色对 update 返回 403，验证中间件层访问控制正确
2. **参数传递测试细致**: 验证了 search/status/projectId/page/pageSize 全部参数传递到 service 层的正确性（含 expect.objectContaining 深度匹配）
3. **三种角色全覆盖**: sysadmin/admin/view 的 list 调用和参数传递均独立测试
4. **scheduled_publish_at 类型验证全面**: number/boolean/object/array 四种非法类型均有测试
5. **边界值测试**: id=0、负数 id、浮点 id、空字符串 projectId、特殊字符 search 等边界场景
6. **集成测试方式正确**: supertest + jest.mock + mockService 模式，测试完整的 HTTP 请求/响应周期

**不足**:

1. **缺少 update 越权测试（关键缺失）**: 未测试 admin 用户 A 更新 admin 用户 B 所属公司文章的场景。安全评审指出的 C-1 水平越权漏洞无测试覆盖
2. **负数 pageSize 测试验证了穿透行为但未断言错误**: 第 536-548 行测试了 `pageSize: -5` 直接穿透到 service，但只断言 `status: 200`，未验证 service 是否收到负值
3. **500 错误测试泄露了实现细节**: 第 240-249 行测试 `expect(response.body.message).toBe('数据库连接失败')`，断言了 err.message 直接返回给前端的行为，实际上固化了信息泄露行为
4. **缺少并发测试**: 未测试两个用户同时更新同一篇文章的发布计划

### 2.3 测试覆盖率估算

基于代码结构分析（非实际运行覆盖率工具）：

| 函数 | 行数 | 预估覆盖率 | 说明 |
|------|------|-----------|------|
| listPublishingSchedule (7-31) | 24 | ~95% | 缺：超大 pageSize 的异常路径 |
| updatePublishingSchedule (33-56) | 24 | ~90% | 缺：越权场景、scheduled_publish_at 非法日期字符串 |
| 模块级实例化 (5) | 1 | 100% | jest.mock 覆盖 |

**预估总行覆盖率: ~92%**，满足项目要求的 80% 最低标准。

---

## 三、API 契约正确性审核

### 3.1 路由注册一致性

**app.ts 路由定义（第 174-175 行）**:

```typescript
app.get('/api/publishing-schedule', authMiddleware, roleMiddleware('sysadmin', 'admin', 'view'), publishingScheduleController.listPublishingSchedule);
app.put('/api/publishing-schedule/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), publishingScheduleController.updatePublishingSchedule);
```

**审核结果**:

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 路由路径与函数名一致 | 2/2 通过 | list 对应 GET，update 对应 PUT |
| 中间件链完整 | 2/2 通过 | 均使用 authMiddleware + roleMiddleware |
| HTTP 方法语义正确 | 2/2 通过 | GET 用于查询，PUT 用于更新 |
| 角色限制合理 | 2/2 通过 | list 允许三种角色，update 限制 sysadmin+admin |

### 3.2 响应格式一致性

| 端点 | HTTP 状态码 | 响应体格式 | 使用工具函数 | 一致性 |
|------|-----------|-----------|-------------|--------|
| listPublishingSchedule | 200 | `{ code: 0, message, data: { list, total, page, pageSize } }` | `paginate()` | 一致 |
| updatePublishingSchedule | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| updatePublishingSchedule (400) | 400 | `{ code: 400, message }` | `fail()` | 一致 |
| updatePublishingSchedule (404) | 404 | `{ code: 404, message }` | `fail()` | 一致 |
| updatePublishingSchedule (500) | 500 | `{ code: 500, message }` | `fail()` | 一致 |

**Committer 评价**: 响应格式完全一致，paginate/success/fail 工具函数使用规范。

### 3.3 Swagger 文档

**缺失**: 两个端点均无 Swagger 注释。与项目中大部分控制器（article、company 等）有 Swagger 文档的风格不一致。

**Committer 意见**: 非阻塞问题，但应在下一迭代补全。发布计划是前端已使用的功能，文档缺失影响开发者体验。

---

## 四、与已有评审的交叉审核

本文件已有三份评审报告（质量、架构、安全），Committer 需综合评估其发现对合并决策的影响：

### 4.1 各评审的核心发现与 Committer 采纳情况

| 评审来源 | 核心发现 | 严重级别 | Committer 采纳 | 理由 |
|----------|---------|---------|---------------|------|
| 安全评审 | C-1: updateSchedule 缺归属权限校验（水平越权） | CRITICAL | **确认，阻塞合并** | admin 可修改其他公司文章发布计划 |
| 安全评审 | H-1: catch(err: any) 信息泄露 | HIGH | 确认，非阻塞 | 项目级模式，sysadmin/admin 角色限制 |
| 安全评审 | H-2: parseInt 未指定 radix | HIGH | 确认，非阻塞 | 同一文件内风格不一致 |
| 安全评审 | H-3: req.user! 非空断言 | HIGH | 确认，非阻塞 | 项目级模式，中间件保障 |
| 安全评审 | M-1: page/pageSize 负数穿透 | MEDIUM | 确认，非阻塞 | 功能影响有限 |
| 安全评审 | M-2: projectId NaN 校验缺失 | MEDIUM | 确认，非阻塞 | Prisma 处理 NaN 行为可接受 |
| 安全评审 | M-3: 日期格式未校验 | MEDIUM | 确认，非阻塞 | Service 层 new Date() 提供隐式校验 |
| 安全评审 | M-5: 错误消息差异化 | MEDIUM | 确认，非阻塞 | 需组合 C-1 才有实际影响 |
| 质量评审 | H-1: DI 违反 | HIGH | 确认，非阻塞 | 项目统一模式 |
| 质量评审 | H-2: catch(err: any) | HIGH | 确认，非阻塞 | 与安全评审 H-1 重复 |
| 质量评审 | H-3: parseInt radix | HIGH | 确认，非阻塞 | 与安全评审 H-2 重复 |
| 质量评审 | H-4: req.user! 断言 | HIGH | 确认，非阻塞 | 与安全评审 H-3 重复 |
| 架构评审 | MAJOR-1: 模块级硬编码单例 | ARCH-MAJOR | 确认，非阻塞 | 项目级技术债务 |
| 架构评审 | MAJOR-2: 无统一异常体系 | ARCH-MAJOR | 确认，非阻塞 | 项目级技术债务 |
| 架构评审 | MAJOR-3: Service 返回 any | ARCH-MAJOR | 确认，非阻塞 | 建议优先引入 Entity 类型 |
| 架构评审 | MINOR-2: Controller 无权限校验 | ARCH-MINOR | **确认，与 C-1 关联** | update 缺归属校验 |

### 4.2 对安全评审 C-1 的深度审核

安全评审指出的 **C-1: updateSchedule 缺归属权限校验** 是本次审核的核心问题。Committer 进行了独立验证：

**Service 层代码验证（impl.ts:91-132）**:

```typescript
async updateSchedule(id: number, scheduledPublishAt: string | null, userId?: number, role?: string): Promise<any> {
  const existing = await prisma.article.findFirst({ where: { id } });
  if (!existing) throw new Error('文章不存在');
  if (existing.status !== 'publishing') throw new Error('当前文章状态不可编辑发布计划');
  // ❌ 未检查 existing 是否属于当前用户的可操作范围
  const updated = await prisma.article.update({ where: { id }, data, ... });
  return updated;
}
```

**Committer 分析**:

1. **漏洞确认**: `updateSchedule` 接收 `userId` 和 `role` 参数，但 Service 层**从未使用它们进行权限校验**。`list` 方法正确地根据 role/userId 构造了 Prisma where 条件做权限过滤，但 `updateSchedule` 完全忽略了这两个参数。

2. **攻击向量**: admin 用户 A（公司 X）可直接 `PUT /api/publishing-schedule/{B的文章ID}` 修改公司 B 的文章发布计划。

3. **对比**: `listPublishingSchedule` 的 Service 层实现了完整的权限过滤（admin 看 operators、view 看 viewers），但 `updatePublishingSchedule` 的 Service 层完全没有权限校验。这是一个**认证-授权不一致**的缺陷。

4. **风险评级**: 维持 CRITICAL。虽然需要合法的 admin 凭据，但 admin 角色用户数量不止一个，跨公司越权的业务影响严重（可扰乱竞争对手的发布计划排期）。

**Committer 裁决**: **阻塞合并**。必须在 `updateSchedule` 的 Service 层添加归属权限校验，与 `list` 方法的权限过滤逻辑一致。

**修复建议**:

```typescript
// Service 层 updateSchedule 方法中，status 检查之后添加归属校验
if (role !== 'sysadmin' && userId) {
  const articleWithProject = await prisma.article.findFirst({
    where: { id },
    include: { project: { include: { operators: true } } },
  });
  const hasAccess = articleWithProject?.project?.operators?.some(op => op.userId === userId);
  if (!hasAccess) throw new Error('无权操作此文章');
}
```

同时 Controller 层的 catch 应增加 `无权操作此文章` → 403 的映射。

### 4.3 Committer 综合判断

三份评审报告共发现 **1 CRITICAL + 3 HIGH + 5 MEDIUM + 3 ARCH-MAJOR + 3 ARCH-MINOR** 级问题，经 Committer 综合评估：

1. **C-1 水平越权为唯一阻塞性问题**: 需在合并前修复
2. **HIGH 级问题均为项目级模式**: `catch(err: any)`、`parseInt` radix、`req.user!` 非空断言是全项目共性问题，不应因此阻塞单个模块合并
3. **架构问题为技术债务**: DI 违反、异常体系缺失、Entity 层缺失应纳入项目级改进计划

---

## 五、项目规范遵循审核

### 5.1 代码规范遵循度

| 规范要求 | 遵循情况 | 说明 |
|----------|---------|------|
| 函数式导出（非 Class Controller） | 通过 | 导出 2 个独立 async 函数 |
| Service 层分离 | 通过 | Controller 不含业务逻辑 |
| success/fail/paginate 工具函数使用 | 通过 | 3/3 使用正确 |
| try-catch 全覆盖 | 通过 | 2/2 端点全部 try-catch |
| 中文错误消息 | 通过 | 所有面向用户的错误消息使用中文 |
| 无 console.log | 通过 | 生产代码无调试输出 |
| ID 参数 parseInt + isNaN 验证 | 通过 | update 端点正确验证 |
| Entity 类型定义 | **缺失** | 项目中唯一缺少 Entity 层的模块 |
| Swagger 文档 | **缺失** | 两个端点均无 Swagger 注释 |

### 5.2 与项目其他控制器的对比

| 对比项 | publishing-schedule | article | company | 评价 |
|--------|--------------------|---------|---------|------|
| 代码行数 | 57 | ~400 | 237 | 最精简 |
| 端点数量 | 2 | 6+ | 5 | 最少 |
| 权限校验 | Service 层（update 缺失） | Controller 层 checkProjectOperator | roleMiddleware only | 需改进 |
| 错误处理 | 字符串匹配 | handleServerError() | 字符串匹配 | 可改进 |
| Swagger | 无 | 有 | 有（缺1个） | 缺失 |

---

## 六、生产就绪度审核

### 6.1 风险评估

| 风险项 | 级别 | 影响 | 缓解因素 | Committer 决策 |
|--------|------|------|----------|---------------|
| updateSchedule 水平越权 | CRITICAL | 跨公司篡改发布计划 | 需 admin 凭据 | **阻塞合并** — 必须修复 |
| err.message 泄露内部信息 | HIGH | 信息泄露 | admin 角色限制 | **不阻塞** — 建议下一迭代修复 |
| page/pageSize 无范围校验 | MEDIUM | DoS 向量 | 全局 rate-limit 缓解 | **不阻塞** — 建议下一迭代修复 |
| 日期格式未校验 | MEDIUM | 异常数据 | Service 层 new Date() 隐式校验 | **不阻塞** — 建议修复 |
| 缺少 Swagger 文档 | LOW | 开发者体验 | 前端已在使用 | **不阻塞** — 建议补全 |

### 6.2 阻塞性问题（Blocking Issues）

**C-1: updateSchedule 水平越权 — 阻塞合并**

- **问题**: admin 用户可修改任何其他公司文章的发布计划
- **修复方案**: Service 层 updateSchedule 添加归属权限校验（参照 list 方法的权限过滤逻辑）
- **修复位置**: `apis/service/impl/publishing-schedule.service.impl.ts:91-132`
- **预估工时**: 1-2 小时
- **验收标准**: admin 用户只能更新其所属公司项目下的文章发布计划

### 6.3 生产部署建议

1. **修复 C-1 后可部署**: 修复越权漏洞后，当前代码可安全部署到生产环境
2. **监控建议**: 对 500 错误和 403 错误设置告警
3. **后续迭代优先级**: C-1 修复 > 错误消息脱敏 > parseInt 统一 > Swagger 补全 > Entity 层

---

## 七、审核意见汇总

### 7.1 必须修复（Merge 前必须完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P0 | C-1: updateSchedule 水平越权 | Service 层添加归属权限校验 + Controller 层增加 403 映射 | 2h | 安全评审 C-1 / 架构评审 MINOR-2 |

### 7.2 强烈建议修复（Merge 后一周内完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P1 | catch(err: any) → catch(err: unknown) | 安全窄化 + 500 使用固定消息 | 1h | 安全 H-1 / 质量 H-2 |
| P1 | parseInt 统一添加 radix=10 | 3 处 parseInt 添加第二参数 | 0.5h | 安全 H-2 / 质量 H-3 |
| P1 | Swagger 文档补全 | 为两个端点添加 Swagger 注释 | 0.5h | 项目规范 |

### 7.3 建议改进（下一迭代完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P2 | page/pageSize 范围校验 | Math.max/Math.min 限制 | 0.5h | 安全 M-1 |
| P2 | 日期格式校验 | Date.parse + isNaN 校验 | 0.5h | 安全 M-3 |
| P2 | projectId NaN 校验 | isNaN 检查 | 0.5h | 安全 M-2 |
| P2 | Service 返回 any | 引入 Entity 类型定义 | 2h | 架构 MAJOR-3 |
| P2 | req.user! 防御性检查 | 添加 undefined 守卫 | 0.5h | 安全 H-3 / 质量 H-4 |

### 7.4 技术债务（中长期规划）

| 优先级 | 问题 | 修复方案 | 来源 |
|--------|------|----------|------|
| P3 | 模块级硬编码单例 | 引入服务定位器/DI 容器 | 架构 MAJOR-1 |
| P3 | 无统一异常体系 | 引入 NotFoundError/BusinessError | 架构 MAJOR-2 |
| P3 | 错误处理函数抽取 | 统一 handleScheduleError() | 架构 MINOR-1 |
| P3 | status 参数白名单 | VALID_STATUSES 校验 | 安全 M-4 |
| P3 | 补充越权测试用例 | admin 跨公司更新测试 | 测试覆盖 |

---

## 八、最终裁决

### 裁决结果: 有条件通过（CONDITIONAL APPROVE）

**裁决依据**:

1. **功能完整**: 2 个端点覆盖发布计划查询和更新，满足业务需求
2. **代码质量优秀**: 57 行、函数平均 24 行、零业务逻辑，是项目中分层最纯粹的控制器
3. **测试充分**: 33 个测试用例，预估行覆盖率 ~92%，超过 80% 最低要求
4. **架构合理**: Controller-Service-Repository 分层清晰
5. **项目规范基本遵循**: 与项目内其他 Controller 的代码风格和模式一致
6. **无向后兼容性问题**: 新模块

**附带条件**:

1. **合并前必须修复 C-1**: `updateSchedule` 添加归属权限校验，确保 admin 只能更新所属公司项目下的文章发布计划
2. **合并后一周内修复 P1**: catch 类型安全 + parseInt 统一 + Swagger 文档补全
3. **下一迭代纳入 P2**: 分页校验 + 日期校验 + Entity 类型定义 + req.user 守卫
4. **将 P3 纳入项目级技术债务管理**: DI 重构 + 异常体系 + 测试补充

**合并操作建议**:

- 修复 C-1 后可安全合并到 dev 分支
- 合并后建议运行完整测试套件确认无回归
- 合并 commit 消息建议: `fix: 发布计划控制器添加归属权限校验，修复水平越权漏洞`

---

## 九、对已有评审报告的质量评价

| 评审来源 | 质量评分 | 核心贡献 | 不足之处 |
|----------|---------|---------|---------|
| 安全评审 | 9/10 | C-1 越权漏洞发现精准，攻击面分析详尽，修复代码可直接使用 | 部分修复建议引入了 logger 但项目未定义 logger |
| 质量评审 | 8/10 | 问题分类清晰，修复优先级合理，测试覆盖评估准确 | 未发现 C-1 越权问题（仅关注代码质量维度） |
| 架构评审 | 9/10 | 分层数据流图优秀，依赖分析透彻，重构路线图可操作 | MAJOR-3（Entity 层）的建议过于理想化，实际改动范围较大 |

**三份评审的核心价值**: 安全评审的 C-1 越权漏洞发现是本次审核最有价值的贡献，直接决定了合并决策。架构评审的分层分析为长期重构提供了清晰方向。

---

*Committer 审核专家评审完成 — 2026-05-24*
