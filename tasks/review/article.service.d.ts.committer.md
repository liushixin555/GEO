# apis/service/article.service.d.ts — Committer 审核专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `apis/service/article.service.ts`（接口 32 行）+ `apis/service/impl/article.service.impl.ts`（实现 534 行） |
| **关联文件** | `apis/controller/article.controller.ts`、`apis/routes/article.routes.ts`、`apis/entity/article.entity.ts`、`apis/entity/publishing-schedule.entity.ts`、`apis/constants/roles.ts`、`apis/schema/article.schema.ts` |
| **评审类型** | Committer 审核（合并准入 · 铁律合规 · 安全纵深验证 · 功能正确性 · 生产就绪度） |
| **评审日期** | 2026-05-26 |
| **已有评审** | 安全评审（3.9/10 REQUEST CHANGES）、架构评审（5.2/10 CONDITIONAL APPROVE）、质量评审（6.8/10 CONDITIONAL APPROVE） |
| **综合评分** | **5.5 / 10** |
| **裁决** | **CONDITIONAL APPROVE** — 3 项 CRITICAL 中 2 项降级、1 项维持，共 5 项 HIGH 阻断必须修复，修复后预期 **8.0/10** |

---

## 一、Committer 审核总览

`IArticleService` 是文章管理模块的核心服务契约，承载 14 个方法横跨文章 CRUD、状态流转、版本管理和发布计划四个子领域。Committer 视角的核心关切：

1. **安全纵深链是否完整？** — 路由层 auth + roleMiddleware 已到位，但 service 接口层面存在 IDOR 缺口（getById/listVersions 无 projectId）和认证模式不一致（三种传递方式）
2. **接口契约是否可信赖？** — `role: string` 丧失编译期类型安全，`auth?:` 可选参数破坏了统一认证模型
3. **三份评审交叉验证后，哪些是真实阻断项？** — 3 项 CRITICAL 中经 Controller 层补偿验证后降级 2 项；5 项 HIGH 经确认均须修复
4. **代码是否达到生产合并标准？** — 当前代码在生产环境运行稳定，Controller 层补偿了 service 层的安全缺口，但接口设计不应对调用方做假设

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 铁律合规性 | 8/10 | ✅ 通过 — 后端 service 接口，不涉及 antd/DESIGN.md 前端铁律 |
| 安全纵深 | 5/10 | 🟡 有条件通过 — 路由层+控制器层防护到位，但 service 层接口存在 IDOR 和认证缺口 |
| 功能正确性 | 8/10 | ✅ 通过 — 14 个方法签名与实现层一一对应，状态机完整覆盖 8 种状态 |
| 架构质量 | 5/10 | 🟡 有条件通过 — ISP 违反（17 方法合并两领域）+ AuthContext 归属错误 |
| 类型安全 | 4/10 | 🟡 不通过 — `role: string` + `status: string` + `from/to: string` 三处丧失编译期约束 |
| 接口一致性 | 4/10 | 🟡 不通过 — 三种认证传递模式（AuthContext / 解构参数 / 嵌入查询对象） |
| 生产就绪度 | 7/10 | ✅ 通过 — 实现层事务安全（除 updateSchedule）、内容消毒、职责分离均到位 |

---

## 二、三份评审综合裁定

| 评审 | 评分 | 核心结论 | Committer 裁定 |
|------|------|---------|---------------|
| 安全评审 | 3.9/10 REQUEST CHANGES | 3 CRITICAL（IDOR + auth 可选 + role 注入）+ 4 HIGH（认证不一致 + 边界约束 + 类型安全 + auth 混合） | 🔴 C-1 **维持 CRITICAL** / C-2 **降级 HIGH** / C-3 **降级 HIGH** / H-1~H-4 **维持 HIGH** |
| 架构评审 | 5.2/10 CONDITIONAL APPROVE | C-1 ISP 违反 + 4 HIGH（AuthContext 归属 + 缺 projectId + 拆解参数 + auth 可选） | 🔴 C-1 **降级 HIGH** / H-1~H-4 **维持 HIGH** |
| 质量评审 | 6.8/10 CONDITIONAL APPROVE | 3 HIGH（AuthContext 不一致 + role 过宽 + 缺 projectId）+ 5 MEDIUM | 🔴 H-1~H-3 **维持 HIGH** |

### 评审间矛盾裁定

| 矛盾点 | 涉及评审 | Committer 裁定 |
|---|---|---|
| getById/listVersions 缺 projectId 严重程度 | 安全 C-1(CRITICAL) + 架构 H-2(HIGH) + 质量 H-3(HIGH) | **维持 CRITICAL** — 三份评审一致认定，Controller 事后补偿不等于 service 层安全，新增调用方无补偿时直接暴露 |
| list() auth 可选严重程度 | 安全 C-2(CRITICAL) + 架构 H-4(HIGH) + 质量 H-1(HIGH) | **降级为 HIGH** — Controller 层 `withArticleAuth` 始终传入 ctx（含 auth），HTTP 路径无法利用。风险仅限于内部调用方（调度器/测试）|
| role: string 严重程度 | 安全 C-3(CRITICAL) + 质量 H-2(HIGH) | **降级为 HIGH** — 运行时保护到位（Prisma enum + auth middleware 约束 JWT 中的 role 值），但编译期类型安全确实丧失 |
| ISP 违反严重程度 | 安全 M-1(MEDIUM) + 架构 C-1(CRITICAL) | **降级为 HIGH** — ISP 违反是架构债务，不直接导致运行时安全漏洞，但增加攻击面和维护成本 |
| updateSchedule 拆解 AuthContext | 安全 H-1(HIGH) + 架构 H-3(HIGH) + 质量 H-1(相关) | **维持 HIGH** — 三份评审一致认定，破坏统一认证模式 |
| 状态机方法暴露 | 安全 M-3(MEDIUM) | **降级为 LOW** — 三个纯函数返回 boolean，不泄露敏感数据。攻击者可通过尝试状态转换+观察错误消息获取同等信息 |
| page/pageSize 无边界 | 安全 H-2(HIGH) | **降级为 MEDIUM** — Zod schema 在路由层限制 `pageSize: max(100)`，接口层可加注释但非阻断 |

---

## 三、逐条审核意见

### 3.1 CRITICAL — 阻断合并

#### C-1 [CRITICAL] getById/listVersions 缺少 projectId — IDOR 跨项目数据访问

- **来源**: 安全 C-1 + 架构 H-2 + 质量 H-3（三份评审一致）
- **位置**: `article.service.ts:12,20`
- **现状**:
  ```typescript
  getById(id: number): Promise<Article>;                      // 无 projectId
  listVersions(articleId: number): Promise<ArticleVersion[]>; // 无 projectId，也无 auth
  ```
- **Controller 层补偿验证**:
  - `article.controller.ts:100-105` — `getArticle` 先调 `getById` 再比较 `item.project_id !== ctx.projectId`
  - `article.controller.ts:148-153` — `listArticleVersions` 先调 `getById` 做项目校验再调 `listVersions`
  - 补偿有效但 service 层已执行完整 DB 查询，数据已泄漏到内存
- **实现层验证**:
  - `article.service.impl.ts:41-46` — `findArticleOrThrow` 仅 `findFirst({ where: { id, deletedAt: null } })`，无 projectId 过滤
  - `article.service.impl.ts:349-356` — `listVersions` 直接 `findMany({ where: { articleId, deletedAt: null } })`，零归属校验
- **Committer 裁定**: 🔴 **维持 CRITICAL — 阻断合并**
  - 三份评审一致认定
  - Controller 补偿是"事后补丁"，service 接口签名暗示"只需 ID 即可访问"
  - 新增调用方（定时任务、内部 API）将直接暴露跨项目数据
- **修复方案**:
  ```typescript
  getById(projectId: number, id: number): Promise<Article>;
  listVersions(projectId: number, articleId: number): Promise<ArticleVersion[]>;
  ```
  实现层在 `findFirst` 中同时过滤 `projectId`，消除 Controller 层补偿需求。
- **预估工时**: 1.5h

---

### 3.2 HIGH — 阻断合并

#### H-1 [HIGH] AuthContext.role: string 类型过宽 — 编译期角色注入

- **来源**: 安全 C-3 + 质量 H-2
- **位置**: `article.service.ts:5-8`
- **现状**:
  ```typescript
  export interface AuthContext {
    userId: number;
    role: string;  // 任意字符串都合法
  }
  ```
- **运行时保护验证**:
  - `roles.ts:10` — `Role = 'sysadmin' | 'admin' | 'view'` 类型已存在
  - Prisma schema — User.role 使用 enum 约束，数据库层保证合法值
  - `auth.middleware.ts` — JWT 解码后的 role 来自数据库，运行时不可伪造（需 JWT secret）
- **编译期缺口**:
  - 内部调用方可传 `{ userId: 1, role: 'superadmin' }` 编译通过
  - 实现层 `auth.role !== 'sysadmin'` 对非法角色走 creator 分支
- **Committer 裁定**: 🔴 **降级为 HIGH — 阻断合并**
  - 安全评审标记为 CRITICAL，但运行时保护链（JWT + Prisma enum + middleware）完整
  - 编译期类型安全确实丧失，内部调用方无保护
- **修复方案**:
  ```typescript
  import type { Role } from '../constants/roles';
  export interface AuthContext {
    userId: number;
    role: Role;  // 'sysadmin' | 'admin' | 'view'
  }
  ```
- **预估工时**: 0.5h

---

#### H-2 [HIGH] list() auth 参数可选 — 未认证调用路径

- **来源**: 安全 C-2 + 架构 H-4 + 质量 H-1
- **位置**: `article.service.ts:11`
- **现状**: `list(..., auth?: AuthContext)` 可选参数
- **Controller 层验证**:
  - `article.controller.ts:93-98` — `withArticleAuth` 包装器强制要求 `user` 非空（line 78 `if (!user) { fail(res, 401) }`)
  - `listArticles` 始终传入 `ctx`（含 auth），HTTP 路径无法绕过
- **内部调用风险**: 调度器/测试直接调用 `list(projectId, 1, 10)` 无需 auth 即获全量文章
- **Committer 裁定**: 🔴 **降级为 HIGH — 阻断合并**
  - HTTP 路径不可利用（Controller 强制传入 auth）
  - 但接口语义错误 — auth 不应为可选
- **修复方案**: `auth?: AuthContext` → `auth: AuthContext`
- **预估工时**: 0.5h

---

#### H-3 [HIGH] updateSchedule 解构 AuthContext — 认证模式不一致

- **来源**: 安全 H-1 + 架构 H-3 + 质量 H-1（三份评审一致）
- **位置**: `article.service.ts:24`
- **现状**:
  ```typescript
  updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<PublishingScheduleUpdateResult>;
  ```
- **影响**: 14 个方法中 12 个使用 `auth: AuthContext`，唯独 updateSchedule 和 listPublishingSchedule 拆解为 `userId + role`
- **Committer 裁定**: 🔴 **维持 HIGH — 阻断合并**
  - 三份评审一致认定
  - 拆解参数绕过 AuthContext 封装，新增方法时开发者不确定该用哪种模式
- **修复方案**: 改为 `updateSchedule(id, scheduledPublishAt, scheduleType, auth: AuthContext)`
- **预估工时**: 0.5h

---

#### H-4 [HIGH] AuthContext 定义在 article.service.ts — 跨模块基础类型归属错误

- **来源**: 架构 H-1
- **位置**: `article.service.ts:4-8`
- **现状**: `AuthContext` 定义在文章服务接口文件中，但被 Controller 层（`article.controller.ts:3`）、service/index.ts barrel 等广泛导入
- **依赖方向验证**:
  - `service/index.ts:28` — `import { IArticleService, AuthContext } from './article.service'`
  - `article.controller.ts:3` — `import { ..., AuthContext } from '../service'`
  - Controller 导入 Service 文件仅为获取 AuthContext，反向依赖
- **Committer 裁定**: 🔴 **维持 HIGH — 阻断合并**
  - 基础类型放在业务 service 文件中违反依赖方向
  - 新增 service 复制 AuthContext 定义会导致类型不一致
- **修复方案**: 移至 `apis/types/auth.ts` 或 `apis/constants/roles.ts` 同文件
- **预估工时**: 1h

---

#### H-5 [HIGH] ISP 违反 — 14 方法合并两个不相关领域

- **来源**: 安全 M-1 + 架构 C-1
- **位置**: `IArticleService` 全部方法
- **现状**: 注释 `// Publishing schedule (merged from PublishingScheduleService)` 承认从独立服务合并
- **影响**:
  - 文章 CRUD 消费者被迫依赖发布计划方法
  - 实现类 534 行混合两种查询模式
  - 独立演化受阻
- **Committer 裁定**: 🔴 **降级为 HIGH — 阻断合并**
  - 架构评审标记为 CRITICAL，但这是技术债而非运行时安全漏洞
  - 接口拆分影响面大（Controller + 路由 + 测试全部需调整），但长期收益显著
- **修复方案**: 拆分为 `IArticleService`（10 方法）+ `IPublishingScheduleService`（3 方法）+ 独立纯函数模块（3 方法）
- **预估工时**: 3h

---

### 3.3 MEDIUM — 非阻断但建议修复

#### M-1 [MEDIUM] isValidStatusTransition/isSettingsEditable/isContentEditable 参数为 string

- **来源**: 安全 H-3
- **位置**: `article.service.ts:28-30`
- **现状**: `status: string`、`from: string, to: string` 而非 `ArticleStatus`
- **修复**: 改为 `status: ArticleStatus`，`from: ArticleStatus, to: ArticleStatus`
- **Committer 裁定**: 🟡 **不阻断合并，建议本迭代修复** — `ArticleStatus` 类型已定义，改动极小

#### M-2 [MEDIUM] PublishingScheduleListParams 混合认证数据与查询参数

- **来源**: 安全 H-4
- **位置**: `publishing-schedule.entity.ts:2-10`
- **现状**: `userId?: number` 和 `role?: string` 混在查询参数中
- **修复**: 移除 userId/role，方法签名添加 `auth: AuthContext` 参数
- **Committer 裁定**: 🟡 **不阻断合并，建议本迭代修复**

#### M-3 [MEDIUM] updateSchedule 缺少 projectId — 跨项目操作风险

- **来源**: 安全 M-4
- **位置**: `article.service.ts:24`
- **现状**: 实现层 `findFirst({ where: { id, deletedAt: null } })` 无 projectId 过滤
- **修复**: 添加 `projectId` 参数
- **Committer 裁定**: 🟡 **不阻断合并，建议下迭代修复** — 与 C-1 同源问题

#### M-4 [MEDIUM] updateSchedule 缺少事务保护

- **来源**: 质量 M-3
- **位置**: `article.service.impl.ts:446-503`
- **现状**: 其他所有写操作都使用 `$transaction`，唯独 updateSchedule 没有
- **Committer 裁定**: 🟡 **不阻断合并，建议下迭代修复**

#### M-5 [MEDIUM] page/pageSize/id 无编译期边界约束

- **来源**: 安全 H-2（降级）
- **现状**: Zod schema 在路由层限制 `pageSize: max(100)`，但接口签名不表达此约束
- **Committer 裁定**: 🟡 **不阻断合并** — 路由层已有保护

### 3.4 LOW — 改善建议

| 编号 | 来源 | 问题 | 建议 |
|------|------|------|------|
| L-1 | 安全 L-1 | 返回完整 Article 实体，无字段级访问控制 | 后续考虑 DTO 投影 |
| L-2 | 安全 L-2 | delete 返回 void，无审计确认 | 后续考虑返回 Article |
| L-3 | 安全 M-3 | 状态机方法暴露在公共接口 | 降级为 LOW — 不泄露敏感数据 |
| L-4 | 架构 L-1 | published 状态在 STATUS_TRANSITIONS 无显式条目 | 添加 `'published': []` + 注释 |
| L-5 | 架构 L-2 | 接口方法缺少 @throws 文档 | 添加 JSDoc @throws 标签 |
| L-6 | 质量 M-2 | version 使用 `+ 1.0` 浮点语义 | 改为 `+ 1` 或数据库改 Int |

---

## 四、修复优先级矩阵

| 优先级 | 编号 | 问题 | 预估工时 | 风险 |
|--------|------|------|---------|------|
| **P0 阻断** | C-1 | getById/listVersions 缺 projectId | 1.5h | 高 — IDOR |
| **P0 阻断** | H-1 | role: string → Role 联合类型 | 0.5h | 中 — 类型安全 |
| **P0 阻断** | H-2 | list() auth 可选 → 必填 | 0.5h | 中 — 认证语义 |
| **P0 阻断** | H-3 | updateSchedule 统一 AuthContext | 0.5h | 中 — 接口一致性 |
| **P1 建议** | H-4 | AuthContext 移至独立模块 | 1h | 中 — 跨模块依赖 |
| **P1 建议** | H-5 | ISP 拆分接口 | 3h | 低 — 架构债务 |
| **P2 建议** | M-1~M-5 | 类型收紧 + 事务保护 | 2h | 低 — 健壮性 |
| **P3 改善** | L-1~L-6 | 文档 + 边界 + 改善 | 1h | 低 |

---

## 五、修复后预期评分

| 修复阶段 | 预期评分 | 说明 |
|----------|----------|------|
| 当前 | 5.5/10 | CRITICAL IDOR + HIGH 认证不一致 |
| P0 修复（C-1 + H-1~H-3） | 7.5/10 | 消除安全阻断 + 统一认证模式 |
| + H-4~H-5 修复 | 8.0/10 | AuthContext 归属正确 + ISP 合理 |
| + M-1~M-5 修复 | 8.5/10 | 类型安全 + 事务完整 |

---

## 六、结论

**CONDITIONAL APPROVE** — 综合评分 **5.5/10**，存在 1 项 CRITICAL（IDOR）+ 5 项 HIGH（角色类型 + auth 可选 + 认证不一致 + AuthContext 归属 + ISP 违反）。

### 合并条件

**必须修复后方可合并（P0 阻断）：**

1. **C-1**: `getById`/`listVersions` 添加 `projectId` 参数 — 1.5h
2. **H-1**: `AuthContext.role` 改为 `Role` 联合类型 — 0.5h
3. **H-2**: `list()` 的 `auth` 改为必填 — 0.5h
4. **H-3**: `updateSchedule` 统一使用 `auth: AuthContext` — 0.5h

P0 合计预估工时：**3h**。修复后可达 **7.5/10 APPROVE**。

**建议本迭代修复（P1）：**

5. **H-4**: AuthContext 移至独立模块 — 1h
6. **H-5**: ISP 拆分接口 — 3h

### 核心风险总结

1. **数据边界缺失**：`getById`/`listVersions` 无 `projectId`，service 层安全不自包含
2. **认证模型断裂**：同一接口三种认证传递方式（AuthContext / 解构参数 / 嵌入查询），`role: string` 丧失编译期约束
3. **类型安全缺口**：`string` 类型的 role/status/from/to 无法在编译期捕获非法值

---

*Committer 审核完成 — 2026-05-26*
