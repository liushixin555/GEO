# apis/entity/skills.entity.ts — Code Committer 综合审核报告

| 属性 | 值 |
|---|---|
| **文件** | `apis/entity/skills.entity.ts` (23行) |
| **评审类型** | Code Committer 综合审核（安全+架构+质量 三维交叉裁定） |
| **综合评分** | **4.0 / 10** |
| **裁决** | **REQUEST CHANGES** |
| **评审日期** | 2026-05-26 |

---

## 三维评审汇总

| 维度 | 评分 | 裁决 | 评审文件 |
|---|---|---|---|
| 安全 | 4.2/10 | REQUEST CHANGES | `tasks/review/skills.entity.ts.security.md` |
| 架构 | 3.8/10 | REQUEST CHANGES | `tasks/review/skills.entity.ts.architecture.md` |
| 质量 | 4.5/10 | CONDITIONAL APPROVE | `tasks/review/skills.entity.ts.quality.md` |

---

## 阻断项（BLOCKING）— 合并前必须修复

### B-1. `deleted_at` 遗漏——Prisma 有字段但实体未声明 [架构 C-1 + 安全 H-2 + 质量 B-1]

- **严重程度**: CRITICAL
- **跨维确认**: 架构 C-1 + 安全 H-2 + 质量 B-1 — 三份评审一致认定为最高优先级
- **现状**:
  - Prisma schema（`prisma/schema.prisma:117`）定义 `deletedAt DateTime? @map("deleted_at")`
  - Service impl 所有查询使用 `where: { deletedAt: null }` 过滤软删记录
  - `mapSkills()`（`apis/map/index.ts:21-32`）**有意跳过 `deletedAt` 不映射**
  - `Skills` 接口完全不暴露此字段
- **影响**:
  1. API 消费者无法区分已删除/未删除记录，若 Service 层过滤条件缺失，客户端将静默接收已删除记录
  2. 实体与数据库永久失同步，违反项目实体设计铁律——数据库有字段则实体必须有对应声明
  3. 前端无法防御性校验记录状态
- **对比**: 项目内所有支持软删除的实体均声明了 `deleted_at`：`Company`、`KnowledgeBase`、`KnowledgeKeyword`、`KnowledgePortrait` 等
- **修复**:
```typescript
// Skills 接口添加
/** 软删除时间戳，null 表示未删除（Prisma deletedAt） */
deleted_at: Date | null;

// mapSkills() 添加映射
deleted_at: prismaSkills.deletedAt ?? null,
```
- **阻断理由**: 三份评审一致 CRITICAL/BLOCKING，数据库字段与实体层严重失同步，影响数据完整性判断
- **预估工时**: 15 min

### B-2. `CreateSkillsRequest.created_by` 允许身份伪造 [安全 H-1 + 架构 H-2 + 质量 H-1]

- **严重程度**: HIGH
- **跨维确认**: 安全 H-1 + 架构 H-2 + 质量 H-1 — 三份评审独立确认
- **现状**:
  - `CreateSkillsRequest`（L16）声明 `created_by?: number`，暗示客户端可指定创建者
  - Controller（`skills.controller.ts:126`）使用 `req.user.userId` 覆盖此字段 — 当前安全
  - **但 Service impl（`skills.service.impl.ts:66/80`）直接使用 `request.created_by ?? null`，无二次校验**
  - `Skills` 是项目中唯一在 Create DTO 中暴露 `created_by` 的实体
- **攻击向量**:
  ```
  客户端 → [请求体 created_by: 999] → Controller（覆盖为 JWT userId）→ 安全 ✅
  新开发者 → 直接传递 req.body → Service（使用 request.created_by）→ 伪造成功 ❌
  ```
- **当前缓解**: Controller 单点覆盖有效，实际攻击面有限
- **修复**: 从 `CreateSkillsRequest` 中移除 `created_by`，由 Controller 注入
```typescript
export interface CreateSkillsRequest {
  name: string;
  description?: string;
  skill_dir: string;
  // created_by 由 Controller 从 req.user.userId 注入，不暴露给客户端
}
```
- **阻断理由**: DTO 给出错误安全信号，违反纵深防御原则，跨模块代码维护时极易引入 IDOR
- **预估工时**: 15 min（含 Controller/Service 同步更新）

---

## 高优先级建议（HIGH）— 建议本迭代修复

### H-1. `creator_name` 混入基础实体——违反 Base/Detail 分层模式 [架构 H-1 + 质量 H-3]

- **跨维确认**: 架构 H-1 + 质量 H-3
- **现状**: `Skills` 基础接口包含 `creator_name: string | null`（来自 Prisma 关联 `include: { creator: true }`），与 Prisma 直字段混杂
- **对比**: `KnowledgeBase` 正确拆分为 `KnowledgeBase`（基础）+ `KnowledgeBaseDetail extends KnowledgeBase`（含关联字段）
- **影响**: 基础实体与 API 响应 DTO 职责混合，新增关联字段时被迫修改基础接口，破坏开闭原则
- **Committer 判定**: 架构模式违反，应在本迭代修复。拆分为 `Skills`（基础，不含 `creator_name`）+ `SkillsDetail extends Skills`（含 `creator_name`）
- **预估工时**: 30 min（含 Service/Map/导出更新）

### H-2. `UpdateSkillsRequest.description` 无法清除——缺 null 三态语义 [架构 H-3 + 安全 M-4 + 质量 H-2]

- **跨维确认**: 架构 H-3 + 安全 M-4 + 质量 H-2
- **现状**: `description?: string` 仅有 `undefined`（不修改）和 `string`（新值），无法表达"清除为 null"
- **对比**: 项目内 `UpdateKnowledgeBaseRequest`、`UpdatePortraitRequest`、`UpdateImageRequest` 均使用 `string | null` 三态语义
- **影响**: 用户一旦填写描述就无法清空，违反数据最小化原则
- **Committer 判定**: 与项目约定不一致，三份评审均提及，应修复
```typescript
export interface UpdateSkillsRequest {
  name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}
```
- **预估工时**: 10 min

### H-3. 零 JSDoc 文档——字段约束完全不可见 [架构 H-4 + 质量 H-4]

- **跨维确认**: 架构 H-4 + 质量 H-4
- **现状**: 全文件 23 行，0 行 JSDoc。Prisma 约束（VarChar 长度、唯一性、默认值）在实体层不可见
- **影响**: Controller 硬编码 `name.length > 200` 等魔数与实体层断链，IDE hover 无法提示约束
- **Committer 判定**: 作为 API 契约基石，文档缺失直接影响消费方理解
- **预估工时**: 15 min

### H-4. `skill_dir` 暴露服务器文件系统路径 [安全 M-1 + 质量 M-1]

- **跨维确认**: 安全 M-1 + 质量 M-1
- **现状**: `skill_dir: string` 通过 `Skills` 接口直接返回给前端，暴露服务器内部目录结构
- **Committer 判定**: 当前 `skill_dir` 值为相对目录名（如 `"my-skill-v1"`），非绝对路径，风险有限。但 API 响应中确实无需此字段——前端 `pages/skills/index.tsx` 定义的 `SkillsItem` 接口已排除 `skill_dir`。建议在 API 响应层（`mapSkills` 或 `SkillsDetail`）控制不返回，而非从基础实体删除
- **预估工时**: 20 min

### H-5. `created_by: number | null` 暴露内部用户 ID [安全 M-2]

- **跨维确认**: 安全评审独有发现
- **现状**: `Skills.created_by` 直接暴露数字型用户 ID，支持用户枚举
- **前端实际使用**: `pages/skills/index.tsx:51-53` 使用 `created_by` 进行前端权限判断（`item.created_by === user.id`），说明前端确实需要此字段
- **Committer 判定**: 前端权限判断依赖 `created_by` 是合理的（前端权限检查仅为 UX 优化，后端有独立权限校验）。但结合 H-1 拆分后，可将 `created_by` 保留在 `Skills` 基础实体（内部使用），`SkillsDetail`（API 响应）可选择性包含。当前不阻断
- **预估工时**: 含在 H-1 中

---

## 中优先级建议（MEDIUM）— 可下迭代修复

| # | 问题 | 来源维度 | 修复建议 | 工时 |
|---|------|---------|---------|------|
| M-1 | 实体零输入约束，防御完全依赖 Controller | 安全 M-3 + 质量 M-3 | 添加 JSDoc 标注 Prisma 约束（VarChar 长度） | 10 min |
| M-2 | `mapSkills` 参数类型手工拼凑交叉类型 | 架构 M-3 | 使用 `Prisma.SkillsGetPayload<{ include: { creator: true } }>` | 15 min |
| M-3 | 缺少模块级 JSDoc | 架构 M-4 | 添加 `@module` 注释 | 5 min |
| M-4 | `name` 唯一约束未在实体层体现 | 安全 L-3 + 架构 M-2 | JSDoc 标注 `@@unique([name])` | 5 min |
| M-5 | `skill_dir` 默认值语义不明 | 架构 M-1 | 注释说明空字符串含义 | 5 min |
| M-6 | 接口名 `Skills` 为复数形式 | 质量 L-1 | 与 Prisma model 命名一致，暂不改动 | — |

---

## 低优先级建议（LOW）— 可选

| # | 问题 | 来源 |
|---|------|
| L-1 | 自增 `id: number` 支持枚举攻击 | 安全 L-1 |
| L-2 | `CreateSkillsRequest.description` 类型与 Prisma nullable 不一致 | 架构 L-2 |
| L-3 | 无 `SkillsDetail` 导出（`apis/entity/index.ts`） | 架构 L-1 |

---

## 问题交叉分析

### 跨维度重复发现（高置信度）

| 问题 | 发现次数 | 维度 | 最终裁定 |
|------|---------|------|---------|
| `deleted_at` 遗漏 | 3 | 架构(C)+安全(H)+质量(B) | **B-1 BLOCKING** |
| `created_by` DTO 暴露 | 3 | 安全(H)+架构(H)+质量(H) | **B-2 BLOCKING** |
| `creator_name` 混入基础实体 | 2 | 架构(H)+质量(H) | H-1 HIGH |
| `description` 不可清除 | 3 | 架构(H)+安全(M)+质量(H) | H-2 HIGH |
| 零 JSDoc 文档 | 2 | 架构(H)+质量(H) | H-3 HIGH |
| `skill_dir` 路径泄露 | 2 | 安全(M)+质量(M) | H-4 HIGH |
| 实体零输入约束 | 2 | 安全(M)+质量(M) | M-1 MEDIUM |
| `mapSkills` 类型过宽 | 2 | 架构(M)+安全(L) | M-2 MEDIUM |
| `name` 唯一约束未体现 | 2 | 安全(L)+架构(M) | M-4 MEDIUM |

### 调用链验证

```
POST /api/v1/skills (multipart/form-data)
  → authMiddleware (JWT 验证 ✓)
  → skills.controller.createSkills()
    → parseSkillZipMeta() — 从 zip 提取 name/description
    → findSoftDeletedByName() — 检查软删除
    → extractSkillZip() — 解压到 skillDir
    → skillsService.create({
        name, description, skill_dir: topDir,
        created_by: req.user.userId  ← Controller 正确覆盖 ✓
      })
      → prisma.skills.create({
          data: {
            createdBy: request.created_by ?? null  ← Service 直接信任 DTO ⚠
          }
        })
      → mapSkills(item)
        ← ❌ deletedAt 有意跳过不映射 (B-1)
        ← ⚠ creator_name 从关联获取，混入基础接口 (H-1)
        ← ⚠ skill_dir 直接暴露 (H-4)
  → 201 Created → 返回 Skills 对象给前端

PUT /api/v1/skills/:id
  → authMiddleware (JWT 验证 ✓)
  → skills.controller.updateSkills()
    → 权限检查: sysadmin || created_by === userId ✓
    → 白名单提取 { name, description }
    → 长度校验: name>200, description>500 ✓
    → skillsService.update(id, { name, description })
      → description?: string ← 无法传 null 清除 (H-2)

GET /api/v1/skills
  → skillsService.list()
    → where: { deletedAt: null } ← 过滤软删 ✓
    → mapSkills() → ❌ 不映射 deleted_at (B-1)
    → 前端无法验证记录是否实际活跃
```

### 安全边界总结

| 边界 | 保护措施 | 状态 |
|------|----------|------|
| 身份伪造（via `created_by`） | Controller 覆盖 `req.user.userId` | ⚠ **B-2 单点防御**，Service 层直接信任 |
| 数据状态完整性（`deleted_at`） | Service `where: { deletedAt: null }` | ❌ **B-1 实体层完全缺失** |
| 文件路径泄露（`skill_dir`） | 无保护 | ⚠ H-4 暴露在 API 响应中 |
| 用户 ID 枚举（`created_by`） | 无保护 | ⚠ H-5 数字 ID 直接暴露 |
| 输入约束 | Controller 运行时校验 | ⚠ M-1 实体层零约束 |
| 数据清除（`description`） | 无 null 三态 | ⚠ H-2 无法清除 |

---

## 核心优点

1. **结构简洁** — 23 行定义三个接口，无冗余逻辑，符合实体文件"薄层"原则
2. **Prisma 映射基本正确** — `id`/`name`/`description`/`created_at`/`updated_at` 等核心字段类型与 Prisma schema 一致
3. **Controller 防线有效** — `created_by` 虽暴露在 DTO，但 Controller 正确使用 `req.user.userId` 覆盖，当前无实际漏洞
4. **前端合理使用** — `pages/skills/index.tsx` 正确使用 `created_by` 做 UX 层权限提示，后端有独立权限校验
5. **Update 白名单模式** — `updateSkills` 仅提取 `name` 和 `description`，防止多余字段注入

---

## 与同类模块 Committer 评审对比

| 文件 | Committer 评分 | 裁决 | BLOCKING 数 |
|------|---------------|------|-------------|
| project.routes.ts | 7.0/10 | CONDITIONAL APPROVE | 2 |
| token-blacklist.util.ts | 6.0/10 | CONDITIONAL APPROVE | 2 |
| ArticleImageManager.tsx | 5.6/10 | CONDITIONAL APPROVE | 4 |
| KeywordDetail.tsx | 4.2/10 | REQUEST CHANGES | 3 |
| **skills.entity.ts** | **4.0/10** | **REQUEST CHANGES** | **2** |
| list-reveal-chapter.test.tsx | 1.0/10 | REJECT | 3 |

本模块处于项目偏下水平：作为 API 契约基石，23 行代码中有 2 项阻断级问题（CRITICAL `deleted_at` 遗漏 + HIGH `created_by` 身份伪造攻击面），且与项目已建立的实体设计模式（Base/Detail 拆分、`deleted_at` 声明、三态 Update）全面不一致。

---

## 最终裁决

### REQUEST CHANGES — 要求修改后重新提交

**合并条件**: 必须修复全部 2 项 BLOCKING 后方可重新提交审核。

| 条件 | 修复项 | 预估工时 |
|------|--------|---------|
| B-1 | `Skills` 添加 `deleted_at: Date | null` + 更新 `mapSkills()` | 15 min |
| B-2 | `CreateSkillsRequest` 移除 `created_by` + Controller/Service 同步更新 | 15 min |

**合计阻断项工时**: 约 30 min

### 建议同迭代修复（HIGH）

| 条件 | 修复项 | 预估工时 |
|------|--------|---------|
| H-1 | 拆分 `Skills`/`SkillsDetail` + `creator_name` 移入 Detail | 30 min |
| H-2 | `UpdateSkillsRequest.description` 改为 `string | null` 三态 | 10 min |
| H-3 | 补全全部字段 JSDoc | 15 min |
| H-4 | API 响应层控制不返回 `skill_dir` | 20 min |

**HIGH 合计工时**: 约 75 min

### 评分预测

| 阶段 | 预期评分 |
|------|---------|
| 当前 | 4.0 / 10 |
| 修复 B-1 + B-2 后 | 5.5 / 10 |
| 修复 H-1 ~ H-4 后 | 7.5 / 10 |
| 全部修复后 | 8.5 / 10 |

### Committer 备注

本模块是项目中少见的"代码量最少但问题密度最高"的案例。23 行代码中 2 项 BLOCKING + 5 项 HIGH，问题密度极高。核心原因是 `skills.entity.ts` 作为最后添加的实体模块，没有遵循项目早期已建立的实体设计模式（`knowledge-base.entity.ts` 的 Base/Detail 拆分、`deleted_at` 声明、三态 Update）。

特别值得注意的是 B-1（`deleted_at` 遗漏）：`mapSkills()` 函数（`apis/map/index.ts:21-32`）在映射时**有意跳过了 `deletedAt` 字段**，说明开发者知道此字段存在但刻意选择不映射。这一决策导致实体与数据库永久失同步，且无任何注释说明跳过原因，增加了后续维护者的理解成本。

B-2（`created_by` DTO 暴露）虽然当前不构成实际漏洞（Controller 正确覆盖），但 DTO 给出的错误安全信号会在代码维护过程中产生风险。项目中其他实体（`Project`、`Todo`）均不在 Create DTO 中暴露 `created_by`，`Skills` 应统一。

两项 BLOCKING 修复合计仅 30 分钟，建议立即修复。

---

## 审核签名

**审核人**: Code Committer 审核专家
**审核日期**: 2026-05-26
**代码版本**: dev 分支
**三维评审来源**: `tasks/review/skills.entity.ts.{security|architecture|quality}.md`
**下一步**: 修复 B-1 + B-2 后提交复审
