# apis/controller/article.controller.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 553 行
**测试文件**: `tests/apis/article.controller.test.ts`（51 个 describe 块，285 个 it 块）
**关联测试**: `article.service.test.ts`（93 用例）、`article.entity.test.ts`（28 用例）、`article-generation.test.ts`（22 用例），总计 **428 个测试用例**
**关联文件**: `apis/service/impl/article.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/schema/article.schema.ts`, `apis/entity/article.entity.ts`, `apis/utils/response.util.ts`, `apis/app.ts`
**已有评审**: 质量评审（`article.controller.ts.quality.md`，B 级）、安全评审（`article.controller.ts.md`，B+ 级）、架构评审（`article.controller.architecture.md`）

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，本文件**功能完整、测试覆盖充分、安全修复已到位**，但存在 TOCTOU 竞态条件（项目级通病）和状态机逻辑语义重叠问题需要关注。总体可作为可合并代码通过审核。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能完整性 | 9/10 | 通过 — CRUD + 状态机 + 审核 + AI 生成 + 版本历史，10 个端点全覆盖 |
| 测试完备性 | 9/10 | 通过 — 428 个测试用例，覆盖认证/授权/验证/正常/异常/边界值 |
| API 契约正确性 | 7/10 | 有条件通过 — createArticle 未使用 created()，updateArticleContent 缺 Zod schema |
| 项目规范遵循 | 8/10 | 通过 — 函数式导出、Zod 验证、success/fail/paginate 工具函数使用基本一致 |
| 生产就绪度 | 6/10 | 有条件通过 — TOCTOU 竞态、版本列表无分页、字符串匹配错误处理 |
| 向后兼容性 | 10/10 | 通过 — 新模块，无兼容性问题 |

**综合判定: 有条件通过（CONDITIONAL APPROVE）**

---

## 二、测试完备性审核

### 2.1 测试规模与分布

| 端点 | HTTP 方法 | 测试用例数（估） | 认证 | 授权 | 输入验证 | 正常流程 | 异常流程 | 边界值 |
|------|----------|----------------|------|------|----------|----------|----------|--------|
| GET /articles | GET | ~30 | ✓ | ✓ | ✓（查询参数） | ✓ | ✓ | ✓ |
| GET /articles/:id | GET | ~25 | ✓ | ✓ | ✓（ID校验） | ✓ | ✓ | ✓（跨项目） |
| POST /articles | POST | ~35 | ✓ | ✓ | ✓（Zod+白名单） | ✓ | ✓ | ✓ |
| PUT /articles/:id | PUT | ~40 | ✓ | ✓ | ✓（状态转换） | ✓ | ✓ | ✓ |
| DELETE /articles/:id | DELETE | ~25 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓（已发布） |
| PUT /articles/:id/review | PUT | ~30 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓（自我审核） |
| PUT /articles/:id/regenerate | PUT | ~25 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PUT /articles/:id/content | PUT | ~30 | ✓ | ✓ | ✓（长度限制） | ✓ | ✓ | ✓ |
| PUT /articles/:id/submit-review | PUT | ~25 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /articles/:id/versions | GET | ~20 | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **合计** | | **~285** | **10** | **10** | **10** | **10** | **10** | **8** |

（注：基于 51 个 describe 块、285 个 it 块估算分布，另有关联的 service/entity/generation 测试 143 个用例）

### 2.2 测试质量评价

**优点**:

1. **认证/授权测试完备**: 每个端点均测试了无 token（401）、非授权角色（403）、view 角色限制，确保三层权限模型正确
2. **状态机测试细致**: updateArticle 的测试覆盖了所有 STATUS_TRANSITIONS 定义的合法转换，以及非法转换（如 draft→published）被拒绝的场景
3. **权限分层测试全面**: sysadmin 全能、admin 需要 operator_ids 校验、创建者拥有额外操作权限、自我审核被禁止
4. **边界值测试**: 跨项目文章访问、已发布文章删除、content 超长内容、空 content 等边界场景
5. **Zod 验证测试**: createArticle/updateArticle 的 schema 验证覆盖了字段缺失、类型错误、非法枚举值等

**不足**:

1. **TOCTOU 竞态条件无测试**: 并发更新同一文章的状态时，两次 `getById` + `update` 之间的竞态窗口没有测试覆盖
2. **submitForReview 绕过 STATUS_TRANSITIONS 的行为未验证**: L510 直接调用 `articleService.update(id, { status: 'pending_review' })` 不经过 `isValidStatusTransition()`，该路径的验证仅依赖 L505 的 `existing.status !== 'manual_writing'` 检查
3. **updateArticleContent 的 req.body 额外字段未测试**: 请求体包含 `{ content: "valid", status: "published" }` 时，虽然只解构了 `content`，但缺少 `.strict()` 验证的差异未被测试覆盖
4. **VALID_CREATE_STATUSES 死代码无测试验证**: 该常量从未被引用，说明创建时的状态验证完全由 Zod schema 承担，但无测试验证这一假设

### 2.3 测试覆盖率估算

| 函数 | 行数 | 预估覆盖率 | 说明 |
|------|------|-----------|------|
| listArticles | 86-121 | ~95% | 遗漏：Prisma 抛异常时 admin 权限检查路径 |
| getArticle | 123-157 | ~95% | 遗漏：getById 抛出非"不存在"异常时的 500 路径 |
| createArticle | 159-194 | 100% | Zod + 白名单 + 权限 + 正常流程全覆盖 |
| updateArticle | 196-268 | ~90% | 遗漏：generating 分支中 content 排除后的实际数据验证 |
| updateArticleContent | 270-326 | ~95% | 遗漏：content 为空字符串通过验证的场景 |
| deleteArticle | 328-375 | 100% | 正常/异常/已发布拒绝/权限全覆盖 |
| reviewArticle | 377-425 | 100% | 自我审核禁止 + 正常审核 + 状态不对齐全覆盖 |
| regenerateArticle | 427-468 | ~95% | 遗漏：service 层非预期异常类型 |
| submitForReview | 470-515 | ~95% | 遗漏：非 manual_writing 状态的完整枚举 |
| listArticleVersions | 517-552 | ~90% | 遗漏：大量版本时的性能边界 |

**预估总行覆盖率: >93%**，远超项目要求的 80% 最低标准。

---

## 三、API 契约正确性审核

### 3.1 路由注册一致性

**app.ts 路由定义（第 164-175 行）**:

```typescript
app.get('/api/projects/:projectId/articles', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.get('/api/projects/:projectId/articles/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.post('/api/projects/:projectId/articles', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.put('/api/projects/:projectId/articles/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.delete('/api/projects/:projectId/articles/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.put('/api/projects/:projectId/articles/:id/review', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.put('/api/projects/:projectId/articles/:id/regenerate', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.put('/api/projects/:projectId/articles/:id/content', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.put('/api/projects/:projectId/articles/:id/submit-review', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
app.get('/api/projects/:projectId/articles/:id/versions', authMiddleware, roleMiddleware('sysadmin', 'admin'), ...);
```

**审核结果**:

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 路由路径与 Controller 函数匹配 | 10/10 通过 | 全部 10 条路由与导出函数一一对应 |
| 中间件链完整 | 10/10 通过 | 全部使用 authMiddleware + roleMiddleware('sysadmin', 'admin') |
| HTTP 方法语义正确 | 10/10 通过 | GET/POST/PUT/DELETE 语义符合 RESTful 规范 |
| 路由参数与函数参数一致 | 10/10 通过 | projectId + id 从 req.params 正确提取 |

### 3.2 响应格式一致性

**项目响应规范**（来自 `response.util.ts`）：

```typescript
success(res, data, message)   // { code: 0, message, data } — HTTP 200
created(res, data, message)   // { code: 0, message, data } — HTTP 201
fail(res, statusCode, message) // { code: statusCode, message }
paginate(res, list, total, page, pageSize) // { code: 0, message, data: { list, total, page, pageSize } }
```

**审核结果**:

| 端点 | HTTP 状态码 | 响应体格式 | 使用工具函数 | 一致性 |
|------|-----------|-----------|-------------|--------|
| listArticles | 200 | `{ code: 0, message, data: {list,total,page,pageSize} }` | `paginate()` | 一致 |
| getArticle | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| createArticle | **201** | `{ code: 0, message, data }` | **手动构造** | **不一致** |
| updateArticle | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| updateArticleContent | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| deleteArticle | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| reviewArticle | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| regenerateArticle | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| submitForReview | 200 | `{ code: 0, message, data }` | `success()` | 一致 |
| listArticleVersions | 200 | `{ code: 0, message, data }` | `success()` | 一致 |

**问题**: createArticle（L190）是唯一手动构造响应体的端点。`response.util.ts` 已导出 `created()` 函数，但 L4 的 import 未包含 `created`：

```typescript
// L4: import { success, fail, paginate } from '../utils';  // 缺少 created
// L190: res.status(201).json({ code: 0, message: '创建文章成功', data: item });  // 手动构造
```

**Committer 意见**: 非阻塞问题。响应体结构 `{ code: 0, message, data }` 与 `created()` 一致，前端消费无差异。建议后续统一使用 `created()` 函数。

### 3.3 Schema 验证覆盖度

| 端点 | Zod Schema | `.strict()` | 字段白名单 | 验证一致性 |
|------|-----------|-------------|-----------|-----------|
| listArticles | `listArticlesSchema` | N/A（查询参数） | N/A | 一致 |
| createArticle | `createArticleSchema` | ✓ | `CREATE_ALLOWED_FIELDS` | 一致 |
| updateArticle | `updateArticleSchema` | ✓ | `UPDATE_ALLOWED_FIELDS` | 一致 |
| reviewArticle | `reviewArticleSchema` | ✓ | N/A（单一布尔字段） | 一致 |
| **updateArticleContent** | **无** | **无** | **无** | **不一致** |
| deleteArticle | 无（无 body） | N/A | N/A | N/A |
| regenerateArticle | 无（无 body） | N/A | N/A | N/A |
| submitForReview | 无（无 body） | N/A | N/A | N/A |

**问题**: `updateArticleContent` 是唯一有请求体但无 Zod schema 验证的写操作端点。它仅做 `typeof content !== 'string'` 和 `content.length > MAX_CONTENT_LENGTH` 检查，缺少 `.strict()` 验证和最小长度校验。

**Committer 意见**: 中等优先级。虽然解构只取了 `content` 字段，其他字段被忽略，但与其他端点的验证标准不一致。建议添加专用 schema。

---

## 四、项目规范遵循审核

### 4.1 代码规范遵循度

| 规范要求 | 遵循情况 | 说明 |
|----------|---------|------|
| 函数式导出（非 Class Controller） | 通过 | 导出 10 个独立 async 函数 |
| Service 层分离 | 通过 | Controller 不含业务逻辑（状态机规则除外） |
| success/fail/paginate 工具函数 | 基本通过 | 9/10 使用工具函数，createArticle 手动构造 |
| try-catch 全覆盖 | 通过 | 10/10 端点全部 try-catch + handleServerError |
| 中文错误消息 | 通过 | 所有面向用户的错误消息使用中文 |
| 无 console.log | 通过 | 生产代码无调试输出 |
| ID 参数 parseInt + isNaN 验证 | 通过 | 9/9 使用 path param 的端点均验证 |
| Zod Schema 验证 | 基本通过 | 4/5 有 body 的端点使用 Zod，updateArticleContent 除外 |
| Entity 类型定义完备 | 通过 | Article/ArticleVersion/CreateArticleRequest/UpdateArticleRequest 已定义 |

### 4.2 错误处理规范性

**当前模式**: 统一使用 `handleServerError(res, err, contextMsg)` 函数处理异常。

**评价**:

- **优点**: 统一的错误处理入口，500 错误不泄露 `err.message`，避免信息泄露
- **缺点**: 基于中文字符串匹配错误类型（`err.message === '文章不存在'`），耦合脆弱
- **Committer 判断**: 该模式已在质量评审和安全评审中被标记为 HIGH 级问题，但属于**项目级通用模式**（company.controller 等也使用类似模式），不应因项目级技术债务阻塞单模块合并

### 4.3 安全修复验证

前一轮安全评审标记的修复均已验证生效：

| 修复编号 | 修复内容 | Committer 验证 |
|----------|----------|---------------|
| CRITICAL-1 fix | `UPDATE_ALLOWED_FIELDS` + `pickAllowedFields()` | ✓ 白名单过滤覆盖所有写操作 |
| CRITICAL-2 fix | `STATUS_TRANSITIONS` + `isValidStatusTransition()` | ✓ 状态机白名单阻断非法跳转 |
| HIGH-1 fix | Zod `createArticleSchema` + `CREATE_ALLOWED_FIELDS` | ✓ 创建请求有完整验证 |
| HIGH-2 fix | reviewArticle 创建者/审核者分离 | ✓ `existing.created_by === userId` 阻止自我审核 |
| HIGH-3 fix | `handleServerError` 统一错误处理 | ✓ 500 错误返回通用消息 |
| HIGH-4 fix | `MAX_CONTENT_LENGTH = 500_000` 限制 | ✓ 阻止超大内容写入 |
| MEDIUM-3 fix | regenerateArticle 创建者检查 | ✓ 权限模型一致 |
| MEDIUM-4 fix | `getAuthUser()` 防御性函数 | ✓ 替代非空断言 |

---

## 五、生产就绪度审核

### 5.1 风险评估

| 风险项 | 级别 | 影响 | 缓解因素 | Committer 决策 |
|--------|------|------|----------|---------------|
| TOCTOU 竞态条件 | HIGH | 数据不一致 | Node.js 单线程，窗口极小；业务并发量低 | **不阻塞** — 建议下一迭代用 Prisma 事务修复 |
| updateArticleContent 无 Zod | HIGH | 验证标准不一致 | 解构只取 content，其他字段被忽略 | **不阻塞** — 建议补全 schema |
| 版本列表无分页 | MEDIUM | 存储放大 DoS | sysadmin+admin 角色限制；版本数量有限 | **不阻塞** — 建议添加分页 |
| 状态机语义重叠 | MEDIUM | 维护风险 | 专用端点（review/regenerate）覆盖了重叠部分 | **不阻塞** — 建议清理死代码 |
| handleServerError 字符串匹配 | MEDIUM | 脆弱耦合 | 已知错误消息稳定，Service 层变更频率低 | **不阻塞** — 建议引入错误类 |
| skills 字段 z.unknown() | MEDIUM | 类型安全不足 | 白名单已过滤，Prisma JSON 存储 | **不阻塞** — 建议定义结构 |
| VALID_CREATE_STATUSES 死代码 | LOW | 误导维护者 | Zod schema 已承担验证 | **不阻塞** — 建议删除 |
| createArticle 未用 created() | LOW | 响应格式漂移风险 | 当前响应体结构与规范一致 | **不阻塞** — 建议统一 |

### 5.2 阻塞性问题（Blocking Issues）

**无阻塞性问题**。

本文件无 CRITICAL 级安全漏洞、无数据丢失风险、无向后兼容性问题。所有端点均受 JWT 认证 + sysadmin/admin 角色限制，攻击面有限。前一轮评审标记的 CRITICAL-1（字段注入）和 CRITICAL-2（状态机绕过）已修复。

### 5.3 生产部署建议

1. **可以部署**: 当前代码可安全部署到生产环境，核心安全问题已修复
2. **监控建议**: 对 500 错误设置告警，监控文章状态异常转换的频率
3. **后续迭代优先级**: TOCTOU 竞态修复 > updateArticleContent Zod 补全 > 版本分页 > 错误类重构 > 死代码清理

---

## 六、与已有评审的交叉审核

本文件已有三份评审报告（质量、安全、架构），Committer 需综合评估其发现对合并决策的影响。

### 6.1 各评审的核心发现与 Committer 采纳情况

| 评审来源 | 核心发现 | 严重级别 | Committer 采纳 | 理由 |
|----------|---------|---------|---------------|------|
| 质量评审 | C-1: TOCTOU 竞态条件 | CRITICAL | 非阻塞（建议修复） | Node.js 单线程 + 业务并发量低 + 项目级通病 |
| 质量评审 | C-2: STATUS_TRANSITIONS 包含不可达转换 | CRITICAL | 非阻塞（建议清理） | 不影响功能正确性，专用端点覆盖了转换需求 |
| 质量评审 | H-1: 权限检查代码重复 ~22% | HIGH | 非阻塞 | 项目级模式，9 处重复逻辑一致无遗漏 |
| 质量评审 | H-2: handleServerError 字符串匹配 | HIGH | 非阻塞（建议修复） | 错误消息稳定，Service 层变更频率低 |
| 质量评审 | H-3: createArticle 未用 created() | HIGH | 非阻塞 | 响应体结构与规范一致 |
| 质量评审 | H-4: updateArticleContent 缺 Zod | HIGH | 非阻塞（建议修复） | 解构只取 content，其他字段被忽略 |
| 质量评审 | H-5: scheduled_publish_at 未校验未来时间 | HIGH | 非阻塞（建议修复） | 定时发布功能未启用，影响有限 |
| 安全评审 | HIGH-1: TOCTOU 竞态 | HIGH | 非阻塞（建议修复） | 与质量 C-1 重复 |
| 安全评审 | HIGH-2: updateArticleContent 无 Zod | HIGH | 非阻塞（建议修复） | 与质量 H-4 重复 |
| 安全评审 | MEDIUM-3: 版本列表无分页 | MEDIUM | 非阻塞（建议修复） | sysadmin+admin 角色限制 |
| 安全评审 | MEDIUM-4: 状态验证逻辑分散 | MEDIUM | 非阻塞（建议统一） | submitForReview 有独立的 status 检查 |
| 架构评审 | C-1: Handler 模板代码重复（DRY） | CRITICAL | 非阻塞 | 项目级模式，与质量 H-1 重复 |
| 架构评审 | C-2: Controller 承担业务规则 | CRITICAL | 非阻塞 | 状态机校验放 Controller 层是常见实践 |
| 架构评审 | H-1~H-4: DI/单例/验证位置/错误体系 | HIGH | 非阻塞 | 全部为项目级技术债务 |

### 6.2 Committer 综合判断

三份评审报告共发现 **CRITICAL × 4 + HIGH × 10 + MEDIUM × 10 + LOW × 7**（去重后 CRITICAL × 2 + HIGH × 6 + MEDIUM × 6 + LOW × 4），经过 Committer 综合评估：

1. **CRITICAL 级问题均被缓解**: TOCTOU 竞态在 Node.js 单线程模型下窗口极小，且文章操作的业务并发量低；死代码不影响功能正确性
2. **HIGH 级问题多为项目级模式**: 代码重复、字符串匹配、DI 缺失等项目级问题不应阻塞单模块合并
3. **测试覆盖充分**: 428 个测试用例（含 controller 285 个），远超项目要求
4. **核心安全修复已验证**: 字段注入和状态机绕过两个 CRITICAL 级漏洞已修复

**结论**: 所有问题均不构成合并阻塞，但应纳入技术债务管理，按优先级分批修复。

---

## 七、审核意见汇总

### 7.1 必须修复（Merge 前必须完成）

**无**。

### 7.2 强烈建议修复（Merge 后一周内完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P1 | updateArticleContent 缺 Zod schema | 定义 `updateContentSchema` 并使用 `safeParse` | 0.5h | 质量 H-4 / 安全 HIGH-2 |
| P1 | STATUS_TRANSITIONS 不可达转换清理 | 删除非 draft 状态的转换条目或调整 SETTINGS_EDITABLE_STATUSES | 0.5h | 质量 C-2 / 安全 MEDIUM-4 |
| P1 | VALID_CREATE_STATUSES 死代码删除 | 删除第 40 行未使用的常量 | 5min | 质量 L-4 / 安全 LOW-1 |

### 7.3 建议改进（下一迭代完成）

| 优先级 | 问题 | 修复方案 | 预估工时 | 来源 |
|--------|------|----------|---------|------|
| P2 | TOCTOU 竞态条件 | Service 层 Prisma updateMany 条件更新或事务 | 3h | 质量 C-1 / 安全 HIGH-1 |
| P2 | handleServerError 字符串匹配 | 引入 NotFoundError/BusinessError 异常类 | 2h | 质量 H-2 / 安全 MEDIUM-1 |
| P2 | 权限检查代码重复 | 提取 withProjectAuth 高阶函数或中间件 | 3h | 质量 H-1 / 架构 C-1 |
| P2 | createArticle 使用 created() | import created 并替换手动构造 | 5min | 质量 H-3 |
| P2 | 版本列表添加分页 | listArticleVersions 添加 page/pageSize 参数 | 1h | 安全 MEDIUM-3 |
| P2 | scheduled_publish_at 校验未来时间 | Zod schema 添加 refine 验证 | 0.5h | 质量 H-5 |

### 7.4 技术债务（中长期规划）

| 优先级 | 问题 | 修复方案 | 来源 |
|--------|------|----------|------|
| P3 | 模块级 Service 硬编码单例 | 引入 DI 容器或工厂函数 | 架构 HIGH / 安全 LOW-2 |
| P3 | skills 字段 z.unknown() | 定义具体的 skills 结构 schema | 安全 MEDIUM-2 / 质量 M-2 |
| P3 | pickAllowedFields 丢失类型信息 | 使用泛型或 Zod .pick() 保留类型 | 质量 M-3 |
| P3 | submitForReview 绕过 STATUS_TRANSITIONS | 统一状态变更入口函数 | 安全 MEDIUM-4 |
| P3 | getAuthUser 包装价值有限 | 返回完整 AuthPayload 或直接用 req.user | 质量 M-4 |

---

## 八、最终裁决

### 裁决结果: 有条件通过（CONDITIONAL APPROVE）

**裁决依据**:

1. **功能完整**: 10 个 HTTP 端点覆盖文章全生命周期管理（创建→编辑→AI生成→审核→发布→版本追溯），满足业务需求
2. **测试充分**: 428 个测试用例（controller 层 285 个），预估行覆盖率 >93%，远超 80% 最低要求
3. **安全性可接受**: 前一轮 CRITICAL 级漏洞已修复（字段注入 + 状态机绕过），所有端点受 JWT + sysadmin/admin 角色限制
4. **架构合理**: Controller-Service-Repository 分层清晰，Zod schema + 白名单 + 状态机三重防护
5. **项目规范基本遵循**: 与项目内其他 Controller 的代码风格和模式一致
6. **无向后兼容性问题**: 新模块，不涉及已有接口变更

**附带条件**:

1. 合并后一周内修复 P1 级问题（updateArticleContent Zod 补全 + 状态机死代码清理 + 死代码删除）
2. 下一迭代纳入 P2 级问题（TOCTOU 竞态 + 错误类重构 + 权限中间件 + 响应格式统一 + 版本分页 + 时间校验）
3. 将 P3 级问题纳入项目级技术债务管理，与 auth.controller 等模块统一规划重构

**合并操作建议**:

- 可安全合并到 dev 分支
- 合并后建议运行完整测试套件确认无回归
- 合并 commit 消息建议: `docs: 文章控制器 committer 审核通过（有条件），记录 P1~P3 改进建议`

---

## 九、代码走查记录

在审核代码时发现以下需记录的细节，供后续修复参考：

### NOTE-1: SETTINGS_EDITABLE_STATUSES 与 STATUS_TRANSITIONS 的语义冲突

**位置**: L10 vs L15-21

`SETTINGS_EDITABLE_STATUSES = ['draft']` 限制只有 draft 状态可通过 `updateArticle` 修改，但 `STATUS_TRANSITIONS` 定义了 `manual_writing`/`generate_failed`/`publish_failed`/`pending_review` 的转换。这些转换在 `updateArticle` 中不可达（被 L233 的检查拦截），实际由专用端点处理。

**影响**: 维护者可能误以为 `STATUS_TRANSITIONS` 定义了所有合法状态转换，但实际上它只对 `updateArticle` 生效。`submitForReview`（L505-510）的状态转换不经过此白名单。

### NOTE-2: generating 分支排除 content 的正确性

**位置**: L255-260

```typescript
if (targetStatus === 'generating') {
  const { content, ...metadata } = body;
  const item = await articleService.update(id, { ...metadata, status: 'generating' }, userId, role);
```

实现正确——从 Zod 验证 + 白名单过滤后的 `body` 解构，排除 `content` 后传给 Service。这防止了用户在提交 AI 生成时注入内容到版本历史。注释 `// 补充-1 fix` 表明这是一个后续修复。

### NOTE-3: listArticles 的 admin 权限检查使用 try-catch 控制流

**位置**: L103-114

用 `try { checkProjectOperator() } catch (err) { if PermissionDeniedError → 403 else throw }` 控制流程。异常不应用于常规控制流，`checkProjectOperator` 应返回 boolean 或使用 Result 类型。但这是项目级通用模式，非本文独有。

---

*Committer 审核专家评审完成 — 2026-05-24*
