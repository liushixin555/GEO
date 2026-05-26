# article.service.ts 质量评审报告

| 维度 | 评分 |
|------|------|
| **综合评分** | **6.8/10 CONDITIONAL APPROVE** |
| 评审文件 | `apis/service/article.service.ts` (接口) + `apis/service/impl/article.service.impl.ts` (实现) |
| 评审日期 | 2026-05-26 |
| 评审标准 | 接口契约完整性、类型安全、AuthContext 一致性、实现层健壮性 |

---

## 评审概要

接口定义整体清晰，AuthContext 统一认证上下文、工厂模式解耦实现、状态机驱动业务规则均为加分项。但存在三类系统性问题：(1) AuthContext 参数模式在3个方法上不一致；(2) `role` 使用宽松 `string` 而非联合类型；(3) 实现层 `any` 散布在关键数据路径上。

---

## H 级（HIGH）— 阻断项

### H-1: AuthContext 参数模式不一致 — 3处绕过统一认证

**位置**: `article.service.ts:11,20,24`

三个方法的认证参数不使用 `AuthContext`，破坏了统一认证上下文的设计意图：

| 方法 | 当前签名 | 问题 |
|------|---------|------|
| `list` (line 11) | `auth?: AuthContext` | **可选** — authorization 不应为 optional |
| `listVersions` (line 20) | 无 auth 参数 | 零鉴权 — 任何已认证用户可查任意文章版本 |
| `updateSchedule` (line 24) | `userId: number, role: string` | **拆解参数** — 绕过 AuthContext 封装 |

**影响**:
- `list` 可选 auth 意味着实现层必须 `auth?.` 防御式编码，遗漏时静默绕过权限
- `listVersions` 完全无鉴权，controller 层补偿但 service 层裸露
- `updateSchedule` 拆解参数，与其它14个方法不统一，新增方法容易继续走错路径

**修复建议**:
```typescript
// 修复前
list(..., auth?: AuthContext): Promise<...>;
listVersions(articleId: number): Promise<ArticleVersion[]>;
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<...>;

// 修复后
list(..., auth: AuthContext): Promise<...>;
listVersions(articleId: number, auth: AuthContext): Promise<ArticleVersion[]>;
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, auth: AuthContext): Promise<...>;
```

同步修改 `listPublishingSchedule` 的 `PublishingScheduleListParams`，将 `userId/role` 替换为 `auth: AuthContext`。

---

### H-2: `role: string` 宽松类型 — 编译期无法捕获非法角色

**位置**: `article.service.ts:6` (`AuthContext.role`)

```typescript
export interface AuthContext {
  userId: number;
  role: string;  // ← 任何字符串都合法
}
```

项目定义了三角色体系 (`sysadmin | admin | view`)，`ROLES` 常量也已存在，但接口使用 `string` 意味着：
- `role: 'superadmin'` 编译通过但运行时静默走 admin 分支
- 实现层到处 `=== 'sysadmin'` 硬编码比较，无 exhaustive check

**修复建议**:
```typescript
import { ROLES } from '../constants/roles';

export interface AuthContext {
  userId: number;
  role: keyof typeof ROLES | Lowercase<keyof typeof ROLES>;
  // 或更直接：
  role: 'sysadmin' | 'admin' | 'view';
}
```

---

### H-3: `getById` 和 `listVersions` 缺少项目归属校验 — 跨项目数据泄漏

**位置**: `article.service.ts:12` (getById) + `article.service.ts:20` (listVersions)

```typescript
getById(id: number): Promise<Article>;           // ← 无 projectId 参数
listVersions(articleId: number): Promise<ArticleVersion[]>; // ← 无 projectId 参数
```

实现层 `findArticleOrThrow` 只检查 `id + deletedAt`，不检查 `projectId`。虽然 controller 在响应前做了 `item.project_id !== ctx.projectId` 比对，但：

- service 层已执行了完整的 DB 查询（信息已泄漏到内存）
- 如果新增调用方忘记加项目校验，直接暴露跨项目数据
- 违反 "service 层自包含安全边界" 原则

**修复建议**:
```typescript
getById(projectId: number, id: number): Promise<Article>;
listVersions(projectId: number, articleId: number, auth: AuthContext): Promise<ArticleVersion[]>;
```

实现层在 `findArticleOrThrow` 后立即执行 `checkProjectOwnership`。

---

## M 级（MEDIUM）— 非阻断项

### M-1: 实现层 `any` 散布在关键数据路径

**位置**: `article.service.impl.ts:65,158,230,372,425,471`

```typescript
const where: any = { ... };          // line 65, 372
const data: any = {};                 // line 158, 230, 471
items.map((item: any) => ({ ... }));  // line 425
```

共6处 `any`，分布在 `where`/`data`/`item` 三类关键数据结构上：
- 丧失字段名拼写检查（`articleTypo` 不会报错）
- 丧失 null/undefined 自动提示
- Prisma 提供了 `Prisma.ArticleWhereInput` / `Prisma.ArticleUpdateInput` / `Prisma.ArticleCreateInput` 等精确类型

**修复建议**: 使用 Prisma 生成的输入类型替代 `any`。

---

### M-2: `Math.floor(existing.version) + 1.0` — 浮点语义与整数意图不一致

**位置**: `article.service.impl.ts:179,229`

```typescript
const newVersion = Math.floor(existing.version) + 1.0;
```

`version` 在 entity 中类型为 `number`，Prisma schema 为 `Float`，但业务语义是递增整数。`+ 1.0` 是浮点运算，虽然结果在安全整数范围内无精度问题，但表达了错误的数学意图。

**修复建议**: 数据库 schema 改为 `Int` 类型；如暂不改 schema，至少用 `+ 1` 表达整数语义。

---

### M-3: `updateSchedule` 缺少事务保护 — TOCTOU 竞态

**位置**: `article.service.impl.ts:446-503`

```typescript
async updateSchedule(id, ...) {
  const existing = await prisma.article.findFirst(...);  // ← 读
  // ... 校验 ...
  const updated = await prisma.article.update(...);       // ← 写（无事务）
}
```

读和写之间无事务保护。并发场景下：
1. 线程 A 读到 status=publishing
2. 线程 B 同时将 status 改为 published
3. 线程 A 的 update 仍然写入 scheduledPublishAt

其它所有写操作（update、delete、review、rejectPublish）都使用了 `$transaction`，唯独 `updateSchedule` 没有。

**修复建议**: 包裹 `$transaction`，与其它写方法保持一致。

---

### M-4: `published` 状态在 STATUS_TRANSITIONS 中无条目 — 未文档化

**位置**: `article.service.impl.ts:13-21`

```typescript
private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': [...],
  'manual_writing': [...],
  // ... 共7个状态
  // 'published' 缺失！
};
```

`published` 没有合法的后续状态（`isValidStatusTransition('published', any)` 恒返回 `false`）。这可能是正确的业务规则（已发布不可回退），但：
- 没有注释说明设计意图
- 调试时容易被误认为遗漏

**修复建议**: 显式添加 `'published': []` 并加注释 `// published 为终态，无合法后续转换`。

---

### M-5: `skills` 字段类型 `unknown | null` — 无运行时校验

**位置**: `article.entity.ts:28`

```typescript
/** Prisma Json? 类型，运行时可能为任意 JSON 结构 */
skills: unknown | null;
```

Entity 注释已承认运行时不可预测，但 service 层从未对 `skills` 做运行时校验。`CreateArticleRequest.skills` 声明为 `number[] | null`，但写入 Prisma Json 列后读出为 `unknown`，类型链断裂。

**修复建议**: 在 `mapArticle` 或 service 层添加 `Array.isArray(val) && val.every(Number.isInteger)` 断言，或使用 Zod schema 对 Json 字段做运行时校验。

---

## L 级（LOW）— 改善建议

### L-1: 接口缺少错误契约文档

`IArticleService` 的11个方法均未标注可能抛出的异常类型。调用方无法从接口获知应处理 `NotFoundError`、`BusinessError` 还是 `ForbiddenError`。

**建议**: 在接口方法上添加 JSDoc `@throws` 标签。

### L-2: `PublishingScheduleListParams` 内嵌鉴权参数

`PublishingScheduleListParams` 包含 `userId` 和 `role` 字段，混合了查询参数和鉴权参数。应拆分为纯查询参数 + `AuthContext`。

### L-3: 混合导入风格

```typescript
import { Article, ... } from '../entity';                        // value import
import type { PublishingScheduleListParams, ... } from '...';     // type-only import
```

同一模块的导入分成两条语句。建议合并为一条 `import` 语句，type 修饰符内联到具名导入上。

---

## 评分细则

| 维度 | 得分 | 说明 |
|------|------|------|
| 接口契约完整性 | 6/10 | 3处AuthContext不一致+2处缺projectId |
| 类型安全 | 6/10 | role:string宽松 + 6处any + skills:unknown |
| 认证/授权一致性 | 5/10 | list可选/getById无/listVersions无/updateSchedule拆解 |
| 实现层健壮性 | 8/10 | 状态机完整+事务安全(除updateSchedule)+内容消毒 |
| 文档与可维护性 | 7/10 | JSDoc仅AuthContext有，状态机缺少published说明 |
| 综合加权 | **6.8** | H级3项阻断，修复后预期 **8.2/10** |

---

## 修复优先级

| 优先级 | 编号 | 预估工时 | 风险 |
|--------|------|---------|------|
| P0 | H-1 AuthContext统一 | 1h | 高 — 安全边界缺口 |
| P0 | H-2 role联合类型 | 0.5h | 中 — 类型安全 |
| P0 | H-3 projectId归属 | 1h | 高 — 跨项目数据泄漏 |
| P1 | M-3 updateSchedule事务 | 0.5h | 中 — 并发竞态 |
| P1 | M-1 消除any | 1.5h | 低 — 可维护性 |
| P2 | M-2/M-4/M-5 | 1h | 低 — 技术债 |

**结论**: 修复 H-1/H-2/H-3 后可达 **8.2/10 APPROVE**。
