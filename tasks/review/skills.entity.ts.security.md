# skills.entity.ts 安全评审

**文件**: `apis/entity/skills.entity.ts`
**评审维度**: 安全（Security）
**评审日期**: 2026-05-26
**评审基线**: OWASP Top 10 2021 + CWE + Prisma schema `model Skills` + Controller/Service/Map 全链路消费分析
**关联评审**: 架构评审 3.8/10（`skills.entity.ts.architecture.md`）、质量评审 4.5/10（`skills.entity.ts.quality.md`）

---

## 评审结论

**评分: 4.2/10 — REQUEST CHANGES**

`skills.entity.ts` 作为 API 契约的基石，存在 2 项 HIGH + 4 项 MEDIUM 安全缺陷。实体层直接参与 API 请求/响应的数据成型，当前设计在身份伪造防护（`created_by` DTO 暴露）、信息泄露（`skill_dir` 路径暴露 + `created_by` 用户 ID 暴露）、数据状态完整性（`deleted_at` 遗漏）三个维度均有安全隐患。

---

## 发现清单

| 级别 | 编号 | 问题 | OWASP/CWE |
|------|------|------|-----------|
| **HIGH** | H-1 | `CreateSkillsRequest.created_by` 允许客户端伪造创建者身份 | A01:2021/CWE-639 |
| **HIGH** | H-2 | `deleted_at` 遗漏导致 API 消费者无法验证数据状态完整性 | A04:2021/CWE-345 |
| **MEDIUM** | M-1 | `skill_dir` 在 API 响应中暴露服务器文件系统信息 | A01:2021/CWE-200 |
| **MEDIUM** | M-2 | `created_by: number \| null` 暴露内部用户 ID 支持用户枚举 | A01:2021/CWE-209 |
| **MEDIUM** | M-3 | 实体类型零输入约束，防御完全依赖 controller 运行时校验 | A03:2021/CWE-20 |
| **MEDIUM** | M-4 | `UpdateSkillsRequest.description` 缺少 null 语义致数据不可清除 | A04:2021/CWE-374 |

---

## 详细分析

### H-1 [HIGH] `CreateSkillsRequest.created_by` — 身份伪造攻击面

| 项目 | 内容 |
|------|------|
| **位置** | `skills.entity.ts:16` — `created_by?: number` |
| **OWASP** | A01:2021 Broken Access Control / CWE-639 (Authorization Bypass Through User-Controlled Key) |
| **现状** | `CreateSkillsRequest` 声明了 `created_by?: number`，暗示客户端可指定创建者。Controller 层（`skills.controller.ts:126`）使用 `req.user.userId` 覆盖了此字段，形成了一道运行时防线。**但防御仅存在于 Controller 单点** |

**攻击向量分析**:

```
客户端 → [请求体 created_by: 999] → Controller（覆盖为 JWT userId）→ Service（使用 request.created_by）→ DB
                                       ↑ 当前防线                            ↑ 若跳过 Controller 则伪造成功
```

1. **Service 层直接信任 DTO** — `skills.service.impl.ts:66` 和 `:80` 使用 `request.created_by ?? null`，无二次校验
2. **DTO 给出错误安全信号** — 类型声明 `created_by?: number` 告诉消费者"这个字段可以设置"，违反最小权限原则
3. **横向对比** — `CreateProjectRequest`、`CreateTodoRequest` 均不含 `created_by`，由服务端注入。`Skills` 是唯一一个在 Create DTO 中暴露此字段的实体

**风险场景**:
- 新开发者添加新路由，直接传递 `req.body` 给 Service，绕过 Controller 覆盖
- 单元测试直接调用 Service 时传入任意 `created_by`
- 未来重构将 `created_by` 改为可选参数时，遗漏覆盖逻辑

**修复**:
```typescript
// 从 CreateSkillsRequest 中移除 created_by
export interface CreateSkillsRequest {
  name: string;
  description?: string;
  skill_dir: string;
  // created_by 由 Controller 从 req.user.userId 注入，不暴露给客户端
}
```

---

### H-2 [HIGH] `deleted_at` 遗漏 — 数据状态完整性破坏

| 项目 | 内容 |
|------|------|
| **位置** | `skills.entity.ts:1-10` — `Skills` 接口缺失 `deleted_at` |
| **OWASP** | A04:2021 Insecure Design / CWE-345 (Insufficient Verification of Data Authenticity) |
| **现状** | Prisma schema 定义了 `deletedAt DateTime? @map("deleted_at")`，Service 层所有查询使用 `where: { deletedAt: null }` 过滤，`mapSkills()` 函数（`apis/map/index.ts:21-32`）**有意跳过 `deletedAt` 字段**不映射 |

**安全影响**:

1. **信任边界模糊** — API 消费者收到 `Skills` 对象时，无法确认该记录是否实际处于"活跃"状态。如果 Service 层的 `deletedAt: null` 过滤条件因 bug 缺失（如某新方法忘记加过滤），客户端将**静默接收已删除记录**
2. **前端无法防御性校验** — 前端 `skills/index.tsx` 无法在客户端侧验证记录状态，全靠后端"不返回"来保证，违反纵深防御原则
3. **软删除/复活竞态** — `findSoftDeletedByName`（`skills.service.impl.ts:41-49`）返回的 `{ id, skill_dir }` 与 `create` 方法（`:51-85`）之间存在 TOCTOU 窗口。两个并发请求可能同时通过软删除检查，导致数据不一致。`deleted_at` 未在实体中声明使得客户端无法检测此竞态的结果

**对比** — 项目内所有支持软删除的实体均声明了 `deleted_at`:
- `Company.deleted_at: Date | null` (`company.entity.ts`)
- `KnowledgeBase.deleted_at: Date | null` (`knowledge-base.entity.ts`)
- `KnowledgeKeyword.deleted_at: Date | null` (`knowledge.entity.ts`)

**修复**:
```typescript
export interface Skills {
  // ... 现有字段
  deleted_at: Date | null;  // 软删除时间戳，null=活跃
}
```

同步更新 `mapSkills()`:
```typescript
deleted_at: prismaSkills.deletedAt ?? null,
```

---

### M-1 [MEDIUM] `skill_dir` 暴露服务器文件系统信息

| 项目 | 内容 |
|------|------|
| **位置** | `skills.entity.ts:5` — `skill_dir: string` |
| **OWASP** | A01:2021 Broken Access Control / CWE-200 (Exposure of Sensitive Information) |
| **现状** | `skill_dir` 是 Prisma `skillDir` 字段的直接映射，存储技能文件在服务器上的目录名（如 `"my-skill-v1"`、`"seo-toolkit"`）。通过 `Skills` 接口作为 API 响应直接返回给前端 |

**信息泄露分析**:
- `skill_dir` 虽非绝对路径，但暴露了服务器内部文件组织结构
- 攻击者可通过此字段推断技能上传的目标目录命名规则
- 与 `skills-file.service.impl.ts` 中的路径拼接逻辑配合（`path.join(skillsDir, topDir)`），攻击者可推测完整路径

**修复建议**: 将 `skill_dir` 从基础 `Skills` 接口移至内部类型，API 响应中不返回此字段，或对前端脱敏为布尔值 `has_files: boolean`

---

### M-2 [MEDIUM] `created_by: number | null` 暴露内部用户 ID

| 项目 | 内容 |
|------|------|
| **位置** | `skills.entity.ts:6` — `created_by: number \| null` |
| **OWASP** | A01:2021 Broken Access Control / CWE-209 (Generation of Error Message Containing Sensitive Information) |
| **现状** | `Skills` 接口直接暴露 `created_by` 为数字型用户 ID。API 响应中每个技能都携带创建者的内部 ID |

**风险分析**:
1. **用户枚举** — 通过遍历技能列表（`GET /api/v1/skills`），攻击者可收集所有活跃用户的内部 ID
2. **关联推理** — 结合 `creator_name`（当非 null 时），可将用户 ID 与姓名直接关联，在其他模块中进行 IDOR 攻击
3. **`created_by: null` 泄漏** — null 值暴露了系统可能存在"无创建者"的遗留数据或系统级操作痕迹

**对比** — `KnowledgeBase` 将 `created_by` 保留在基础实体但通过 `KnowledgeBaseDetail` 提供 `creator_name` 作为人类可读替代

**修复建议**: API 响应中不返回 `created_by` 数字 ID，仅通过 `creator_name` 提供创建者信息。如需在内部使用 `created_by`，应拆分为 `Skills`（内部，含 `created_by`）和 `SkillsResponse`（API 响应，仅含 `creator_name`）

---

### M-3 [MEDIUM] 实体类型零输入约束 — 防御层单一

| 项目 | 内容 |
|------|------|
| **位置** | `skills.entity.ts:12-22` — `CreateSkillsRequest` 和 `UpdateSkillsRequest` |
| **OWASP** | A03:2021 Injection / CWE-20 (Improper Input Validation) |
| **现状** | 所有字段均为原始类型，无任何长度或格式约束 |

**逐字段分析**:

| 字段 | Prisma 约束 | 实体约束 | Controller 校验 | 防御层数 |
|------|------------|---------|---------------|---------|
| `name` | VarChar(200) | `string` | L159: `name.length > 200` | 2 (DB + Controller) |
| `description` | VarChar(500) | `string` | L165: `description.length > 500` | 2 (DB + Controller) |
| `skill_dir` | VarChar(500) | `string` | 无 | 1 (仅 DB) |
| `created_by` | Int? | `number` | 覆盖为 `req.user.userId` | 1 (Controller) |

**风险**: `skill_dir` 在 `CreateSkillsRequest` 中**仅依赖 DB 层约束**，若 Prisma 连接异常或约束未生效，超长路径将直接写入数据库

**修复建议**: 使用 branded type 或在 JSDoc 中标注约束，将实体层作为防御第一层

---

### M-4 [MEDIUM] `description` 不可清除 — 数据完整性缺陷

| 项目 | 内容 |
|------|------|
| **位置** | `skills.entity.ts:21` — `description?: string` |
| **OWASP** | A04:2021 Insecure Design / CWE-374 (Passing Mutable Objects to an Untrusted Method) |
| **现状** | `UpdateSkillsRequest.description?: string` 只有两种语义：`undefined`（不修改）和 `string`（新值）。无法表达"清除为 null" |

**安全影响**:
1. 用户填写了敏感描述（如内部备注）后无法清除，违反数据最小化原则
2. Service 层（`skills.service.impl.ts:101`）`data.description = request.description` 仅处理 `undefined` 和 `string`，空字符串 `""` 被存入 DB 而非 null
3. 与 GDPR"被遗忘权"要求冲突——用户无法删除自己的文本数据

**对比** — `UpdateKnowledgeBaseRequest.description?: string | null`（三态语义）：
- `undefined` = 不修改
- `string` = 新值
- `null` = 显式清除

**修复**:
```typescript
export interface UpdateSkillsRequest {
  name?: string;
  description?: string | null;  // null=显式清除
}
```

---

## 次要发现（LOW）

### L-1 自增 ID `id: number` 支持枚举攻击

`Skills.id` 为自增整数，攻击者可通过遍历 `GET /api/v1/skills/:id` 推断技能总数和创建频率。建议考虑使用 UUID 或在 API 层使用非连续标识符。

### L-2 `mapSkills` 参数类型过宽降低类型安全

`apis/map/index.ts:21` 的 `mapSkills` 参数为 `PrismaSkills & { creator?: { cnName?: string } | null }`，手工拼凑的交叉类型无法保证与 Prisma `include` 返回类型一致。若 Prisma schema 变更（如 `cnName` 重命名），TypeScript 编译器不会报错，导致运行时 `creator_name` 静默返回 null。建议使用 `Prisma.SkillsGetPayload<{ include: { creator: true } }>` 替代。

### L-3 `name` 唯一约束未在实体层体现

Prisma `@@unique([name])` 是核心安全约束（防同名技能重复创建），但 `CreateSkillsRequest.name` 和 `UpdateSkillsRequest.name` 均无唯一性标注。虽然 Service 层有运行时检查（`skills.service.impl.ts:55-56`, `:94-97`），但实体层应通过注释说明此约束。

---

## 安全纵深防御评估

```
                          ┌─────────────────────────────────────┐
  客户端请求 ────────────→ │  Entity (TypeScript 类型约束)        │  ← 防御层1: 当前几乎为0
                          ├─────────────────────────────────────┤
                          │  Controller (运行时校验 + 覆盖)       │  ← 防御层2: 主要防线
                          ├─────────────────────────────────────┤
                          │  Service (业务规则 + 权限)            │  ← 防御层3: 部分覆盖
                          ├─────────────────────────────────────┤
                          │  Prisma/DB (约束 + 字段限制)          │  ← 防御层4: 最后防线
                          └─────────────────────────────────────┘
```

**当前实体层安全防御覆盖率: ~15%** — 仅提供类型提示，无约束标注，无文档，Create DTO 暴露应服务端注入的字段

---

## 攻击面总结

| 攻击面 | 当前风险 | 利用难度 | 影响 |
|--------|---------|---------|------|
| 身份伪造（via `created_by`） | 需绕过 Controller | 低（未来重构时可能暴露） | H-1 |
| 信息泄露（`skill_dir` 路径） | 直接可读 | 无 | M-1 |
| 用户枚举（`created_by` ID） | 遍历即可 | 无 | M-2 |
| 状态欺骗（缺失 `deleted_at`） | 依赖 Service bug | 中 | H-2 |
| 输入注入（零类型约束） | 需绕过 Controller | 低 | M-3 |
| 数据残留（不可清除 description） | 直接可用 | 无 | M-4 |

---

## 修复优先级与工时预估

| 优先级 | 编号 | 修复项 | 预估工时 |
|--------|------|--------|---------|
| P0 | H-1 | `CreateSkillsRequest` 移除 `created_by` | 15min |
| P0 | H-2 | `Skills` 添加 `deleted_at` + 更新 `mapSkills` | 15min |
| P1 | M-1 | `skill_dir` 从 API 响应移除或脱敏 | 30min（含前端适配） |
| P1 | M-2 | 拆分内部/API 响应类型，隐藏 `created_by` | 30min |
| P1 | M-3 | 添加 JSDoc 约束标注 | 15min |
| P1 | M-4 | `description?: string \| null` 三态语义 | 10min |
| P2 | L-1~L-3 | 次要修复 | 20min |

**总预估工时**: ~2h

---

## 横向对比评分

| 实体 | Create DTO 安全 | `deleted_at` | 路径泄露 | ID 暴露 | Update 安全 | 评分 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| knowledge-base.entity.ts | 无 `created_by` | 有 | 无路径字段 | 有但含 `creator_name` | 三态 | 7.0 |
| knowledge.entity.ts | 无 `created_by` | 有 | 无路径字段 | 有但含 `creator_name` | 三态 | 6.5 |
| **skills.entity.ts** | **暴露 `created_by`** | **缺失** | **有** | **仅有 ID** | **二态** | **4.2** |

---

## 修复后预期评分

全部 P0+P1 修复完成后，预期可达 **7.5/10**。

---

## 推荐修复后代码

```typescript
/**
 * 技能基础实体（Prisma Skills 表字段）
 * 仅用于内部类型传递，API 响应使用 SkillsDetail
 */
export interface Skills {
  id: number;
  /** 技能名称，最长 200 字符（Prisma @db.VarChar(200)），全局唯一（@@unique） */
  name: string;
  /** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
  description: string | null;
  /** 技能文件目录路径（服务端内部使用，不暴露给客户端） */
  skill_dir: string;
  /** 创建者用户 ID（内部关联字段，API 响应中不返回） */
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除（Prisma deletedAt） */
  deleted_at: Date | null;
}

/** 技能详情（含关联解析），用于列表/详情 API 返回 */
export interface SkillsDetail extends Omit<Skills, 'skill_dir' | 'created_by'> {
  /** 创建者姓名（来自 User 关联，替代 created_by 数字 ID） */
  creator_name: string | null;
}

/** 创建技能请求（created_by 由 Controller 从 JWT 注入，不暴露给客户端） */
export interface CreateSkillsRequest {
  /** 最长 200 字符（Prisma @db.VarChar(200)） */
  name: string;
  /** 最长 500 字符（Prisma @db.VarChar(500)） */
  description?: string;
  /** 技能文件目录路径 */
  skill_dir: string;
}

/** 更新技能请求（skill_dir 不可更新，需重新上传） */
export interface UpdateSkillsRequest {
  name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}
```
