# apis/controller/knowledge.controller.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/controller/knowledge.controller.ts`
**代码行数**: 906 行（28 个导出函数 + 2 个内部辅助函数 + 8 个模块级服务实例）
**测试文件**: `tests/apis/knowledge.controller.test.ts`（1595 行，含 155 个测试用例）
**关联文件**: `apis/service/impl/knowledge.service.impl.ts`, `apis/service/impl/knowledge-base.service.impl.ts`, `apis/service/impl/llm.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/utils/response.util.ts`, `apis/app.ts`
**已有评审**: 架构评审（knowledge.controller.md）、安全评审（knowledge.controller.security.md）

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，本文件**功能覆盖完整但存在阻塞性安全缺陷**。与同项目的 `company.controller.ts`（CONDITIONAL APPROVE）和 `knowledge-base.controller.ts`（CONDITIONAL APPROVE）不同，本文件存在两个 CRITICAL 级访问控制漏洞（SEC-C-01: `checkBaseAccess` 空函数、SEC-C-02: 4 个 `getById` 无权限检查），导致 admin 用户可以跨公司访问任意知识库的所有资源。这构成**合并阻塞**。

然而，除安全缺陷外，本文件的测试覆盖、功能完整性和项目规范遵循度均达到可接受水平。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能完整性 | 9/10 | 通过 — 28 个端点覆盖 7 个业务域的全部 CRUD + 聚合 + 挖掘功能 |
| 测试完备性 | 7/10 | 有条件通过 — 155 个用例，但 Project Knowledge 仅 4 个测试，缺少权限边界测试 |
| API 契约正确性 | 7/10 | 有条件通过 — RESTful 规范基本遵守，但创建响应格式不统一 |
| 项目规范遵循 | 6/10 | 有条件通过 — 分层穿透（7 处 Prisma 直连）、906 行超 800 行上限、err:any |
| 生产就绪度 | 3/10 | **不通过** — 访问控制缺失、全量加载 DoS 风险、Prompt Injection |
| 向后兼容性 | 10/10 | 通过 — 新模块，无兼容性问题 |

**综合判定: 要求修改（REQUEST CHANGES）**

---

## 二、测试完备性审核

### 2.1 测试规模与分布

| 端点分类 | 测试用例数 | 认证 | 授权 | 输入验证 | 正常流程 | 异常流程 | 边界值 |
|----------|-----------|------|------|----------|----------|----------|--------|
| Auth & Role Guards | 7 | 1 | 6 | — | — | — | — |
| Keywords CRUD (5端点) | ~31 | — | — | 8 | 5 | 12 | 6 |
| Keywords batch+expand | ~10 | — | — | 4 | 1 | 5 | — |
| Portraits CRUD (5端点) | ~27 | — | — | 4 | 5 | 12 | 6 |
| Images CRUD (5端点) | ~27 | — | — | 4 | 5 | 12 | 6 |
| Documents CRUD (5端点) | ~28 | — | — | 8 | 5 | 11 | 4 |
| Project Knowledge (4端点) | 4 | — | — | 4 | — | — | — |
| Knowledge Inventory | 4 | — | — | — | 2 | 1 | 1 |
| Mined Keywords (5端点) | ~17 | — | — | 6 | 1 | 10 | — |
| **合计** | **~155** | **1** | **6** | **38** | **24** | **63** | **23** |

### 2.2 测试质量评价

**优点**:

1. **认证/角色守卫覆盖**: 7 个 Auth Guard 测试覆盖了未登录 + view 角色拒绝，确保中间件层访问控制正确
2. **CRUD 全覆盖**: Keywords/Portraits/Images/Documents 四种资源的 create/update/delete 各有完整的正常/异常/验证路径测试
3. **所有权检查测试**: update/delete 端点测试了「非创建者非 sysadmin 返回 403」场景，验证了业务权限
4. **base_id 一致性检查测试**: 所有 getById/update/delete 端点测试了 baseId 不匹配返回 404
5. **去重逻辑测试**: createImage/createDocument 测试了标题重复和 URL 重复的 400 响应
6. **集成测试方式正确**: 使用 `supertest` + `jest.mock` + `getPrisma.mockReturnValue` 模式
7. **错误消息精确断言**: 大部分错误场景验证了 HTTP 状态码和错误消息

**不足（Committer 必须关注）**:

1. **Project Knowledge 仅 4 个测试且全部是 400 验证**: `listProjectKeywords/listProjectPortraits/listProjectImages/listProjectDocuments` 各仅有 1 个测试（无效 projectId 返回 400）。缺少：正常流程、权限检查（非操作者）、数据内容验证、分页测试。这是**严重测试盲区**。
2. **listInventory 测试不足（4 个）**: 仅覆盖了无数据/有数据/category 过滤/500 异常。缺少：分页正确性、search 搜索、stats 统计精确性、跨资源类型排序验证。
3. **缺少 admin 跨公司访问测试**: 未测试 admin-A 访问 admin-B 公司知识库的越权场景（与 SEC-C-01 一致）。这是安全测试的核心盲区。
4. **缺少 pageSize 边界测试**: 未测试 pageSize=999999 或 pageSize=0 场景（与 SEC-M-02 一致）。
5. **expandKeywords 测试仅有 2 个**: 缺少正常流程测试（LLM 返回关键词）和 Prompt Injection 防御测试。
6. **mineKeywords 缺少正常流程测试**: 只有 400 和 500 测试，未测试成功挖掘的完整流程。

### 2.3 测试覆盖率估算

| 函数分组 | 行数 | 预估覆盖率 | 说明 |
|----------|------|-----------|------|
| listKeywords + getKeyword | 39-76 | ~90% | 覆盖正常/400/404/500，遗漏 admin 权限边界 |
| createKeyword + updateKeyword + deleteKeyword | 78-145 | ~90% | 覆盖正常/400/403/404/500 |
| batchCreateKeywords + expandKeywords | 147-181 | ~70% | expand 缺正常流程 |
| Portraits CRUD (5 函数) | 185-287 | ~90% | 覆盖正常/验证/权限/异常 |
| Images CRUD (5 函数) | 291-409 | ~90% | 覆盖正常/验证/权限/去重/异常 |
| Documents CRUD (5 函数) | 413-533 | ~90% | 覆盖正常/验证/权限/去重/异常 |
| Project Aggregation (4 函数) | 537-611 | ~20% | 仅覆盖 400，缺正常/权限/数据 |
| listInventory | 615-808 | ~40% | 仅覆盖基本场景，缺分页/搜索/排序 |
| Mined Keywords (5 函数) | 812-905 | ~65% | 缺正常流程，仅覆盖验证和异常 |

**预估总行覆盖率: ~72%**，**未达到**项目要求的 80% 最低标准（因 Project Aggregation 和 listInventory 覆盖率严重不足）。

---

## 三、API 契约正确性审核

### 3.1 路由注册一致性

**app.ts 路由定义（第 164-226 行）**:

共 29 条路由绑定，全部使用 `authMiddleware + roleMiddleware('sysadmin', 'admin')` 中间件链。

**审核结果**:

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 中间件链完整 | 29/29 通过 | 全部使用 authMiddleware + roleMiddleware |
| HTTP 方法正确 | 29/29 通过 | GET/POST/PUT/DELETE 语义正确 |
| Controller 导出函数名与路由注册匹配 | 28/28 通过 | 28 个导出函数均有对应路由 |
| 路由路径 RESTful 规范 | 27/29 通过 | 2 个非标准：deleteMinedKeywords 用 POST 而非 DELETE；toggleMinedKeywordsBatch 用 POST（可接受） |

### 3.2 响应格式一致性

| 端点类型 | HTTP 状态码 | 响应体格式 | 使用工具函数 | 一致性 |
|----------|-----------|-----------|-------------|--------|
| list 类（8个） | 200 | `{ code: 0, data: { list, total } }` | `paginate()` | 一致 |
| get 类（4个） | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| create 类（4个） | **201** | `{ code: 0, message, data }` | **手动构造** | **不一致** |
| update 类（4个） | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| delete 类（4个） | 200 | `{ code: 0, message, data: null }` | `success()` | 一致 |
| expandKeywords | 200 | `{ code: 0, data }` | `success()` | 一致 |
| inventory | 200 | `{ code: 0, data: { stats, list, total } }` | **手动构造** | **不一致** |
| mined 类（5个） | 200 | 混合 | success() + 手动 | 基本一致 |

**Committer 意见**:

1. **create 端点手动构造 201 响应（4 处）**: 与 `knowledge-base.controller.ts` 使用 `created()` 工具函数不一致。建议统一使用 `created()`。
2. **listInventory 手动构造响应**: `res.json({ code: 0, data: { ... } })` 直接构造，不使用 `success()` 或 `paginate()`。由于响应结构特殊（含 stats），可接受但建议封装。

### 3.3 与 knowledge-base.controller.ts 的一致性对比

| 对比项 | knowledge-base.controller.ts | knowledge.controller.ts | Committer 评价 |
|--------|------------------------------|-------------------------|---------------|
| catch 类型 | `err: unknown` ✓ | `err: any` ❌ | **退步** — 应统一为 unknown |
| 错误收窄 | `instanceof Error` ✓ | 直接 `err.message` ❌ | **退步** — 信息泄露风险 |
| req.user 保护 | 空值检查 ✓ | 非空断言 `req.user!` ❌ | **退步** — 潜在运行时错误 |
| 创建响应 | `created()` ✓ | 手动 `res.status(201).json()` ❌ | **退步** — 不一致 |
| pageSize 上限 | `Math.min(100, ...)` ✓ | 无上限 ❌ | **退步** — DoS 风险 |

**Committer 意见**: 本文件在多个方面与同项目已有的最佳实践不一致，构成**规范性退步**。

---

## 四、项目规范遵循审核

### 4.1 代码规范遵循度

| 规范要求 | 遵循情况 | 说明 |
|----------|---------|------|
| 函数式导出（非 Class Controller） | 通过 | 导出 28 个独立 async 函数 |
| Service 层分离 | **未通过** | 7 处直接操作 Prisma ORM |
| success/fail 工具函数使用 | 基本通过 | 4 处 create 手动构造 |
| try-catch 全覆盖 | 通过 | 28/28 端点全部 try-catch |
| 中文错误消息 | 通过 | 所有面向用户的错误消息使用中文 |
| 无 console.log | 通过 | 生产代码无调试输出 |
| ID 参数 parseInt + isNaN 验证 | 通过 | 所有 ID 参数均验证 |
| 文件行数 < 800 行 | **未通过** | 906 行，超出 800 行上限 |
| 函数行数 < 50 行 | **未通过** | listInventory 193 行 |

### 4.2 分层架构合规性

**Committer 特别关注**: 架构评审报告（AC-2）指出 7 处 Prisma 直连，这是**分层穿透**问题：

| 位置 | Prisma 调用 | 应属于的层 | 严重程度 |
|------|------------|-----------|---------|
| 第 341-346 行 | createImage 去重检查 | Service | HIGH |
| 第 375-377 行 | updateImage 去重检查 | Service | HIGH |
| 第 465-469 行 | createDocument 去重检查 | Service | HIGH |
| 第 499-501 行 | updateDocument 去重检查 | Service | HIGH |
| 第 634-777 行 | listInventory 全量查询 | Service（新建 InventoryService） | CRITICAL |
| 第 830-844 行 | mineKeywords 内容收集 | Service | HIGH |
| 第 870-874 行 | saveMinedKeywords 标记删除 | Service | HIGH |

**Committer 评价**: 7 处分层穿透中，4 处去重检查是**可接受的临时方案**（已正确实现逻辑），但 listInventory 的 143 行 Prisma 操作和 mineKeywords 的业务编排逻辑是**必须下沉到 Service 层的**。

### 4.3 错误处理规范性

**Committer 对比评价**:

同项目 `knowledge-base.controller.ts` 已采用更安全的错误处理模式（`err: unknown` + `instanceof Error` + 通用消息），本文件完全未跟进。这不是项目级技术债务，而是**明确的规范性退步**。

---

## 五、生产就绪度审核

### 5.1 风险评估

| 风险项 | 级别 | 影响 | 缓解因素 | Committer 决策 |
|--------|------|------|----------|---------------|
| checkBaseAccess 空函数（SEC-C-01） | **CRITICAL** | admin 跨公司访问任意知识库 | 仅 admin 角色 | **🔴 阻塞合并** |
| getById 无权限检查（SEC-C-02） | **CRITICAL** | IDOR 漏洞，遍历获取详情 | base_id 一致性检查提供微弱保护 | **🔴 阻塞合并** |
| mining 端点无鉴权（SEC-M-01） | HIGH | 跨公司操作挖掘关键词 | 仅 admin 角色 | **不阻塞** — 建议修复 |
| err.message 泄露（SEC-H-01） | HIGH | 数据库结构信息泄露 | admin 角色，需构造异常输入 | **不阻塞** — 建议修复 |
| listInventory 全量加载（SEC-H-02） | HIGH | DoS + 内存溢出 | 数据量当前有限 | **不阻塞** — 但必须限制 |
| 输入验证不足（SEC-H-03） | HIGH | 类型混淆/超长输入 | Prisma 隐式防御 | **不阻塞** — 建议引入 Zod |
| Prompt Injection（SEC-H-04） | HIGH | LLM 被恶意操控 | admin 角色 + 有限输出 | **不阻塞** — 建议净化 |
| pageSize 无上限（SEC-M-02） | MEDIUM | DoS 向量 | admin 角色 | **不阻塞** — 快速修复 |
| 文件超 800 行 | MEDIUM | 可维护性下降 | 可通过 IDE 折叠管理 | **不阻塞** — 建议拆分 |
| 创建响应格式不一致 | LOW | 未来维护风险 | 响应体结构一致 | **不阻塞** — 建议统一 |

### 5.2 阻塞性问题（Blocking Issues）

**2 个 CRITICAL 级安全缺陷阻塞合并**：

#### BLOCK-1: `checkBaseAccess` 空函数（SEC-C-01）

**Committer 复核确认**:

```typescript
// 第 26-37 行
async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  const base = await knowledgeBaseService.getById(baseId);
  if (role === 'sysadmin') return;
  if (base.scope === 'platform') return;
  // For now, allow access — ❌ company 和 project scope 无任何校验
}
```

**实际影响验证**:
- 所有 12 个 list/create 端点调用 `checkBaseAccess`，但 company/project scope 的知识库**无任何权限校验**
- admin-A（公司1）可以访问 admin-B（公司2）的 company scope 知识库下的所有资源
- 影响数据：关键词策略、客户画像、文档资产 — **商业机密级别数据**

**Committer 判定**: 虽然攻击者需要 admin 角色，但 admin 是系统中数量最多的管理角色。跨公司数据泄露的后果严重（商业竞争信息暴露）。**阻塞合并**。

**修复工作量**: 约 2 小时。建议在修复时参考安全评审报告中的方案。

#### BLOCK-2: 4 个 `getById` 端点无权限检查（SEC-C-02）

**Committer 复核确认**:

```typescript
// getKeyword 第 60-76 行 — 其他 3 个 getById 结构相同
export async function getKeyword(req: Request, res: Response): Promise<void> {
  const { userId, role } = req.user!;  // 解构但未使用
  const item = await keywordService.getById(id);  // 无权限检查
  if (item.base_id !== baseId) { fail(res, 404, '关键词不存在'); return; }
  success(res, item);
}
```

**实际影响验证**:
- `baseId` 一致性检查（`item.base_id !== baseId`）仅防止 URL 参数不匹配，**不提供权限保护**
- 攻击者只需同时修改 URL 中的 `baseId` 和 `id` 即可访问任意资源
- 影响范围：getKeyword + getPortrait + getImage + getDocument 共 4 个端点

**Committer 判定**: IDOR 漏洞虽受限于 admin 角色，但攻击复杂度极低（仅修改 URL 参数），且影响 4 个端点。**阻塞合并**。

**修复工作量**: 约 1 小时（在每个 getById 中添加 `await checkBaseAccess(baseId, userId, role)` 调用）。

### 5.3 生产部署建议

1. **不可部署**: 当前代码存在 CRITICAL 级访问控制缺失，**不建议部署到生产环境**
2. **修复后可部署**: 修复 BLOCK-1 和 BLOCK-2 后（预估 3 小时），代码可安全部署
3. **监控建议**: 部署后对知识库相关 API 添加访问日志，监控跨公司访问行为

---

## 六、与已有评审的交叉审核

本文件已有两份评审报告（架构、安全），Committer 需综合评估其发现对合并决策的影响：

### 6.1 各评审的核心发现与 Committer 采纳情况

| 评审来源 | 核心发现 | 严重级别 | Committer 采纳 | 理由 |
|----------|---------|---------|---------------|------|
| 架构评审 AC-1 | 单文件 906 行、7 个业务域 | CRITICAL | 非阻塞（建议拆分） | 功能内聚，拆分非紧急 |
| 架构评审 AC-2 | 7 处 Prisma 直连 | CRITICAL | **阻塞部分**（listInventory + mineKeywords） | 去重检查可接受，但 193 行聚合查询必须下沉 |
| 架构评审 AC-3 | listInventory 193 行、8 项职责 | CRITICAL | 非阻塞（建议重构） | 功能正确但性能有隐患 |
| 架构评审 AC-4 | checkBaseAccess 空函数 | CRITICAL | **🔴 阻塞合并** | 与 SEC-C-01 一致 |
| 架构评审 AH-1 | 8 个服务实例顶层 new | HIGH | 非阻塞 | 项目级模式 |
| 架构评审 AH-2 | CRUD 结构重复 | HIGH | 非阻塞 | 可通过工厂模式优化，非紧急 |
| 架构评审 AH-3 | 硬编码四资源类型 | HIGH | 非阻塞 | 可通过注册式架构优化 |
| 架构评审 AH-4 | 错误处理不一致 | HIGH | 非阻塞（建议修复） | 与同项目已有最佳实践不一致 |
| 架构评审 AH-5 | mineKeywords 业务逻辑 | HIGH | 非阻塞（建议下沉） | 应移到 Service 层 |
| 安全评审 SEC-C-01 | checkBaseAccess 空函数 | CRITICAL | **🔴 阻塞合并** | 跨公司数据泄露 |
| 安全评审 SEC-C-02 | getById IDOR | CRITICAL | **🔴 阻塞合并** | 遍历获取任意资源 |
| 安全评审 SEC-H-01 | err.message 泄露 | HIGH | 非阻塞（建议修复） | admin 角色缓解 |
| 安全评审 SEC-H-02 | listInventory DoS | HIGH | 非阻塞（必须限制） | 当前数据量有限 |
| 安全评审 SEC-H-03 | 输入验证不足 | HIGH | 非阻塞 | 项目级模式，Prisma 隐式防御 |
| 安全评审 SEC-H-04 | Prompt Injection | HIGH | 非阻塞（建议净化） | admin 角色 + LLM 输出有限 |
| 安全评审 SEC-M-01 | mining 端点无鉴权 | MEDIUM | 非阻塞（建议修复） | 需添加 checkBaseAccess |
| 安全评审 SEC-M-02 | pageSize 无上限 | MEDIUM | 非阻塞（快速修复） | 1 行代码修复 |
| 安全评审 SEC-M-03 | 字符串匹配异常 | MEDIUM | 非阻塞 | 项目级技术债务 |
| 安全评审 SEC-M-04 | Prisma 竞态条件 | MEDIUM | 非阻塞 | 并发概率低 |
| 安全评审 SEC-L-01 | 内容截断硬编码 | LOW | 非阻塞 | 影响有限 |
| 安全评审 SEC-L-02 | 聚合端点过滤不足 | LOW | 非阻塞 | checkProjectOperator 已有基础保护 |

### 6.2 Committer 综合判断

两份评审报告共发现 **8 CRITICAL + 4 HIGH + 4 MEDIUM + 2 LOW** 级问题（架构和安全有重叠），Committer 综合评估后：

1. **2 个 CRITICAL 问题阻塞合并**: SEC-C-01（checkBaseAccess 空函数）和 SEC-C-02（getById IDOR）。这两个问题可被 admin 角色利用，实现跨公司数据访问，构成商业信息安全风险。
2. **其余 CRITICAL 问题不阻塞**: 架构级的文件过大、分层穿透等问题属于代码质量范畴，不影响运行时安全。
3. **HIGH 级问题均不阻塞但需跟进**: 在 admin 角色限制下，攻击面有限，可作为技术债务管理。
4. **两个评审报告质量均较高**: 问题定位准确、影响分析清晰、修复方案可行。Committer 对两份报告的发现全部确认。

---

## 七、审核意见汇总

### 7.1 必须修复（Merge 前必须完成）— 阻塞合并

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P0 | checkBaseAccess 空函数（BLOCK-1） | 实现 company/project scope 校验逻辑 | 2h | 安全 SEC-C-01 / 架构 AC-4 |
| P0 | getById 无权限检查（BLOCK-2） | 4 个 getById 添加 checkBaseAccess 调用 | 1h | 安全 SEC-C-02 |

### 7.2 强烈建议修复（Merge 后一周内完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P1 | err.message 泄露 | 统一 err:unknown + 通用消息 | 2h | 安全 SEC-H-01 / 架构 AH-4 |
| P1 | pageSize 无上限 | Math.min(100, pageSize) | 0.5h | 安全 SEC-M-02 |
| P1 | mining 端点无鉴权 | 添加 checkBaseAccess 调用 | 1h | 安全 SEC-M-01 |
| P1 | 补全 Project Knowledge 测试 | 添加正常流程+权限测试 | 2h | 测试盲区 |

### 7.3 建议改进（下一迭代完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P2 | listInventory 重构 | 拆分到 InventoryService + 数据库层分页 | 1d | 架构 AC-3 / 安全 SEC-H-02 |
| P2 | mineKeywords 业务下沉 | 内容收集逻辑移到 Service 层 | 2h | 架构 AH-5 |
| P2 | 输入验证加强 | 引入 Zod schema | 4h | 安全 SEC-H-03 |
| P2 | Prompt Injection 防御 | 输入净化 + 格式限制 | 2h | 安全 SEC-H-04 |
| P2 | 创建响应格式统一 | 使用 created() 工具函数 | 0.5h | 架构 AM-4 |
| P2 | req.user 非空断言改为空值检查 | 提取 extractUser 辅助函数 | 1h | 架构 AH-4 |

### 7.4 技术债务（中长期规划）

| 优先级 | 问题 | 修复方案 | 来源 |
|--------|------|----------|------|
| P3 | 文件 906 行超限 | 拆分为 7 个独立控制器模块 | 架构 AC-1 |
| P3 | CRUD 结构重复 | 提取通用控制器工厂 | 架构 AH-2 |
| P3 | 硬编码四资源类型 | 注册式架构 | 架构 AH-3 |
| P3 | 依赖注入缺失 | 引入 DI 或服务定位器 | 架构 AH-1 |
| P3 | 字符串匹配异常 | 引入 AppError 异常体系 | 安全 SEC-M-03 |
| P3 | Prisma 竞态条件 | 去重逻辑移入事务 | 安全 SEC-M-04 |

---

## 八、最终裁决

### 裁决结果: 要求修改（REQUEST CHANGES）

**裁决依据**:

**合并阻塞因素**:

1. **SEC-C-01 + AC-4: checkBaseAccess 空函数** — company/project scope 知识库无任何访问控制，admin 用户可跨公司访问全部知识资源。影响范围：12 个 list/create 端点。影响数据：关键词策略、客户画像、文档资产（商业机密级别）。
2. **SEC-C-02: getById IDOR 漏洞** — 4 个详情端点完全无权限检查，admin 用户可遍历 ID 获取任意知识库下的资源详情。

**两个阻塞问题的修复总工作量: 约 3 小时**，修复后可重新提交审核。

**修复后的预期裁决**: 有条件通过（CONDITIONAL APPROVE），附带条件为：
1. 合并后一周内修复 P1 级问题（错误消息脱敏 + pageSize 上限 + mining 鉴权 + 补全测试）
2. 下一迭代纳入 P2 级问题（listInventory 重构 + Zod 验证 + Prompt 净化 + 响应格式统一）
3. 将 P3 级问题纳入项目级技术债务管理

**与其他控制器对比**:

| 控制器 | Committer 裁决 | 关键差异 |
|--------|---------------|---------|
| company.controller.ts | CONDITIONAL APPROVE | sysadmin 角色限制，攻击面小 |
| knowledge-base.controller.ts | CONDITIONAL APPROVE | getById 缺权限但 scope 过滤提供基础保护 |
| **knowledge.controller.ts** | **REQUEST CHANGES** | **checkBaseAccess 空函数 + 4 个 IDOR，无任何数据级保护** |

**合并操作建议**:

- 修复 BLOCK-1 和 BLOCK-2 后重新提交审核
- 修复后运行完整测试套件确认无回归
- 部署后建议对知识库 API 添加访问审计日志

---

## 九、评审报告质量评价

### 9.1 架构评审（knowledge.controller.md）

**评价: 高质量**

- 问题分类清晰（4 CRITICAL + 5 HIGH + 4 MEDIUM + 2 LOW），严重级别判定合理
- AC-1（文件拆分方案）和 AC-2（Prisma 下沉方案）的建议具体可行
- AC-3（listInventory）的 8 项职责分析深入，修复方案（拆分 stats + items API）有实际价值
- 目标架构蓝图（第七节）提供了清晰的重构方向
- **唯一不足**: AH-1（依赖注入）建议引入 tsyringe 等 DI 容器，对当前项目而言过重。应推荐更轻量的方案（工厂函数 + 接口类型）。

### 9.2 安全评审（knowledge.controller.security.md）

**评价: 高质量，是本文件最重要的评审**

- SEC-C-01 的攻击场景分析（curl 命令示例）使问题直观可见
- SEC-H-01 的 Prisma 错误泄露类型分析表（5 种场景 × 泄露信息）极具参考价值
- SEC-H-03 的逐端点验证缺失分析表和 4 个 PoC（pageSize DoS / SSRF / Prompt Injection / 批量滥用）提供了可执行的攻击验证
- 攻击面分析图（ASCII）直观展示了防御层级和漏洞位置
- OWASP Top 10 映射完整
- **Committer 确认**: 所有安全发现经代码复核后全部确认有效

---

*Committer 审核专家评审完成 — 2026-05-24*
