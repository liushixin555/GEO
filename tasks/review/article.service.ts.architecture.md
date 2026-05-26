# apis/service/article.service.ts — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 接口隔离原则 (ISP) | 3.0/10 | CRITICAL |
| 聚合根边界完整性 | 4.0/10 | HIGH |
| 认证上下文一致性 | 4.5/10 | HIGH |
| AuthContext 定义归属 | 5.0/10 | HIGH |
| 分层职责清晰度 | 6.5/10 | MEDIUM |
| 状态机封装与可测试性 | 7.0/10 | MEDIUM |
| 实现层事务安全 | 8.5/10 | LOW |
| **综合** | **5.2/10** | **HIGH** |

**结论：CONDITIONAL APPROVE** — 存在 1 项 CRITICAL 架构缺陷（ISP 违反），4 项 HIGH 级别问题，修复后预期 **7.8/10 APPROVE**。

---

## CRITICAL-1 — IArticleService 违反接口隔离原则，合并两个不相关的领域服务

**位置**：`article.service.ts:10-31`

`IArticleService` 接口承载了 17 个方法，横跨两个独立业务领域：

| 领域 | 方法数 | 方法列表 |
|------|--------|---------|
| 文章 CRUD + 状态流转 | 10 | list, getById, create, update, updateContent, delete, review, regenerate, submitForReview, listVersions |
| 发布计划管理 | 3 | listPublishingSchedule, updateSchedule, rejectPublish |
| 业务规则查询 | 3 | isSettingsEditable, isContentEditable, isValidStatusTransition |
| 合计 | **17** | |

注释 `// Publishing schedule (merged from PublishingScheduleService)` 明确承认这是从独立服务合并而来。合并后的影响：

1. **消费者被迫依赖不相关的方法**：文章 CRUD 消费者看到发布计划方法，发布计划消费者看到文章 CRUD 方法
2. **实体类型交叉导入**：接口同时导入 `Article/ArticleVersion` 和 `PublishingScheduleItem/PublishingScheduleListParams/PublishingScheduleUpdateResult`，两个 entity 模块耦合
3. **实现类膨胀**：`ArticleServiceImpl` 达到 534 行，混合两种不同的查询模式（文章用 `mapArticle`，发布计划用手工 `items.map`）
4. **独立演化受阻**：发布计划需要独立修改（如新增批量操作），必须改动文章服务接口，影响所有消费者
5. **单一职责违反**：一个接口两个变更理由——文章业务变更 + 发布计划变更

**修复建议**：
```typescript
// 文章服务 — 只保留文章 CRUD + 状态流转 + 业务规则查询
export interface IArticleService {
  list(projectId: number, page: number, pageSize: number, search?: string, status?: string, auth: AuthContext): Promise<{ list: Article[]; total: number }>;
  getById(projectId: number, id: number): Promise<Article>;
  create(projectId: number, request: CreateArticleRequest, auth: AuthContext): Promise<Article>;
  update(projectId: number, id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article>;
  updateContent(projectId: number, id: number, content: string, auth: AuthContext): Promise<Article>;
  delete(projectId: number, id: number, auth: AuthContext): Promise<void>;
  review(projectId: number, id: number, approved: boolean, auth: AuthContext): Promise<Article>;
  regenerate(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  submitForReview(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  listVersions(projectId: number, articleId: number, auth: AuthContext): Promise<ArticleVersion[]>;
  rejectPublish(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  isSettingsEditable(status: string): boolean;
  isContentEditable(status: string): boolean;
  isValidStatusTransition(from: string, to: string): boolean;
}

// 发布计划服务 — 独立接口（或回归 PublishingScheduleService）
export interface IPublishingScheduleService {
  list(params: PublishingScheduleListParams, auth: AuthContext): Promise<{ list: PublishingScheduleItem[]; total: number }>;
  updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, auth: AuthContext): Promise<PublishingScheduleUpdateResult>;
}
```

---

## HIGH-1 — AuthContext 定义在 Service 接口文件中，跨模块基础类型归属错误

**位置**：`article.service.ts:4-8`

```typescript
/** 认证上下文 — 统一传递用户身份信息 */
export interface AuthContext {
  userId: number;
  role: string;
}
```

`AuthContext` 是全系统共享的认证基础设施类型，Controller 层（`article.controller.ts:5` 的 `import { AuthContext }`）、其他 service 接口均引用它。将它定义在 `article.service.ts` 中导致：

1. **反向依赖**：Controller 导入 Service 文件只是为了获取 AuthContext 类型，违反依赖方向（Controller → Service，但 AuthContext 应该是被两者共同依赖的基础类型）
2. **复用摩擦**：新增 service 时必须从 `article.service` 导入 AuthContext，或将 AuthContext 复制定义（实际已有多个 service 定义各自的 AuthContext）
3. **单一文件双职责**：`article.service.ts` 既是 AuthContext 的定义者，又是 IArticleService 的定义者

**修复建议**：
```typescript
// apis/types/auth.ts — 独立认证上下文类型
export interface AuthContext {
  userId: number;
  role: 'sysadmin' | 'admin' | 'view';  // 同步修复 H-2
}

// apis/service/article.service.ts — 从基础类型模块导入
import type { AuthContext } from '../types/auth';
```

---

## HIGH-2 — getById/listVersions 缺少 projectId 参数，聚合根边界缺失

**位置**：`article.service.ts:12,20`

```typescript
getById(id: number): Promise<Article>;                      // 无 projectId
listVersions(articleId: number): Promise<ArticleVersion[]>; // 无 projectId，也无 auth
```

Article 的聚合根是 Project。在领域驱动设计（DDD）中，聚合根外部的实体访问必须经过聚合根。当前设计：

1. **getById** 只接受 `id`，不校验 `projectId`。Controller 在 `getArticle` 中做了补偿：先调 `getById`，再 `item.project_id !== ctx.projectId` 比对。但 service 层已执行了完整 DB 查询，数据已泄漏到内存
2. **listVersions** 完全无鉴权无项目校验。Controller 的 `listArticleVersions` 先调 `getById` 做项目校验，再调 `listVersions`——两次 DB 查询，其中第一次纯粹为了校验归属
3. 如果新增调用方（如定时任务、内部 API）忘记加项目校验，直接暴露跨项目数据

**修复建议**：
```typescript
getById(projectId: number, id: number): Promise<Article>;
listVersions(projectId: number, articleId: number, auth: AuthContext): Promise<ArticleVersion[]>;
```

实现层在 `findArticleOrThrow` 后立即执行 `checkProjectOwnership`，与 update/delete 等方法保持一致的安全边界。

---

## HIGH-3 — updateSchedule 参数拆解 AuthContext，接口一致性破坏

**位置**：`article.service.ts:24`

```typescript
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<PublishingScheduleUpdateResult>;
```

14 个方法中 12 个使用 `auth: AuthContext`，唯独 `updateSchedule` 和 `listPublishingSchedule`（通过 `PublishingScheduleListParams`）将认证信息拆解为 `userId + role`。这导致：

1. **调用方必须手动拆解**：Controller 调用时写 `updateSchedule(id, date, type, ctx.userId, ctx.role)`，而非直接传 `ctx`
2. **签名不统一**：新增方法时开发者不知道该用 `auth: AuthContext` 还是 `userId, role`
3. **类型丢失**：`role: string` 比 `AuthContext.role: string` 更宽松（虽然目前都是 string，但如果 H-1 修复为联合类型，拆解参数不会获得类型收窄）

**修复建议**：
```typescript
updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, auth: AuthContext): Promise<PublishingScheduleUpdateResult>;
```

---

## HIGH-4 — list 方法 auth 参数可选，授权边界语义模糊

**位置**：`article.service.ts:11`

```typescript
list(projectId: number, page: number, pageSize: number, search?: string, status?: string, auth?: AuthContext): Promise<{ list: Article[]; total: number }>;
```

`auth?` 可选意味着合法的调用路径包括"无认证查询所有文章"。实现中 `auth?.role === 'admin'` 做权限过滤，如果 `auth` 为空则不过滤——返回该项目的全部文章。

语义上的歧义：
- 如果"无 auth 返回全部"是故意的（如内部服务调用），应该在接口文档中明确
- 如果不是故意的，`auth` 应为必选参数，与 create/update/delete 保持一致

**修复建议**：
```typescript
list(projectId: number, page: number, pageSize: number, search?: string, status?: string, auth: AuthContext): Promise<{ list: Article[]; total: number }>;
```

---

## MEDIUM-1 — 状态机定义为实现类私有静态属性，不可独立测试且不可扩展

**位置**：`article.service.impl.ts:13-21`

```typescript
private static readonly STATUS_TRANSITIONS: Record<string, string[]> = { ... };
private static readonly SETTINGS_EDITABLE_STATUSES = ['draft'];
private static readonly CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];
```

三个关键业务规则（状态转换表、可编辑状态列表）作为 `private static readonly` 嵌入实现类：

1. **不可独立单元测试**：无法直接测试 `STATUS_TRANSITIONS` 的完备性（如 'published' 终态是否显式声明），只能通过 `isValidStatusTransition` 间接测试
2. **不可扩展**：新增文章状态必须修改 ServiceImpl 类，违反开放封闭原则（OCP）
3. **三处规则分散**：转换表在 L13-21，可编辑状态在 L23-24，写方法中还有硬编码的约束（如 review L282 `existing.status !== 'pending_review'`、regenerate L305 `allowedRegenerateStatuses`），形成隐性规则

**修复建议**：
```typescript
// apis/constants/article-status.ts — 独立可导出的状态机定义
export const ARTICLE_STATUS_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ['generating', 'manual_writing'],
  manual_writing: ['pending_review'],
  generating: ['pending_review', 'generate_failed'],
  generate_failed: ['generating'],
  pending_review: ['publishing', 'manual_writing', 'draft', 'generating'],
  publishing: ['published', 'publish_failed', 'pending_review', 'manual_writing', 'draft'],
  publish_failed: ['publishing'],
  published: [],  // 终态
};
```

---

## MEDIUM-2 — 发布计划方法使用内联类型而非导入的 Entity 类型，DTO 一致性断裂

**位置**：`article.service.ts:22-23` vs `article.service.impl.ts:360-368`

接口声明使用了 Entity 导入类型：
```typescript
listPublishingSchedule(params: PublishingScheduleListParams): Promise<{ list: PublishingScheduleItem[]; total: number }>;
```

但实现中 `listPublishingSchedule` 的参数签名是内联对象：
```typescript
async listPublishingSchedule(params: {
  page: number; pageSize: number; search?: string; status?: string; projectId?: number; userId?: number; role?: string;
}): Promise<...>
```

虽然 TypeScript 结构化类型兼容，但：
1. 与接口声明不一致，增加阅读摩擦
2. 内联类型中的 `userId/role` 与 `PublishingScheduleListParams` 重复定义，修改时容易遗漏

---

## MEDIUM-3 — 业务规则查询方法 (isSettingsEditable/isContentEditable/isValidStatusTransition) 不应属于 Service 接口

**位置**：`article.service.ts:28-30`

```typescript
isSettingsEditable(status: string): boolean;
isContentEditable(status: string): boolean;
isValidStatusTransition(from: string, to: string): boolean;
```

三个纯函数无状态、无副作用、不访问数据库，不依赖任何 Service 实例。它们属于领域规则层，不属于 Service 接口。将它们放在 IArticleService 中：

1. **违反最小知识原则**：Controller 只需要知道"这个状态是否可编辑"，但被迫依赖整个 IArticleService
2. **无法独立复用**：前端如果想做同样的前端校验，无法复用（需要构建整个 Service 实例）
3. **参数类型 `string` 而非 `ArticleStatus`**：丧失了枚举约束，任何字符串都能传入

**修复建议**：提取为独立的纯函数模块或静态工具类，参数使用 `ArticleStatus` 类型。

---

## MEDIUM-4 — 实现层 listPublishingSchedule 使用手工 map 而非 mapArticle，映射策略不统一

**位置**：`article.service.impl.ts:425-441`

```typescript
const list: PublishingScheduleItem[] = items.map((item: any) => ({
  id: item.id,
  title: item.title,
  // ... 15 行手工映射
}));
```

文章 CRUD 方法统一使用 `mapArticle(prismaItem)` 做字段转换，但发布计划方法使用内联 `items.map((item: any) => ...)` 手工映射。两者：
1. 字段转换逻辑不一致（camelCase → snake_case 映射模式重复）
2. `item: any` 丧失类型检查
3. 新增字段时容易遗漏

**修复建议**：添加 `mapPublishingScheduleItem` 映射函数，纳入 `apis/map/index.ts`。

---

## LOW-1 — published 状态在 STATUS_TRANSITIONS 中无显式条目

**位置**：`article.service.impl.ts:13-21`

8 个 ArticleStatus 中 7 个有显式条目，`published` 缺失。`isValidStatusTransition('published', any)` 依赖 `?? false` 兜底。功能正确但意图不明确，调试时容易误认为遗漏。

**建议**：显式添加 `'published': []` 并加注释 `// 终态，无合法后续转换`。

---

## LOW-2 — 接口方法缺少 @throws 文档

IArticleService 的 17 个方法均未标注可能抛出的异常类型（`NotFoundError`、`BusinessError`、`ForbiddenError`）。调用方无法从接口契约获知应处理的错误类型。

---

## LOW-3 — 混合导入风格

```typescript
import { Article, ... } from '../entity';                     // value import
import type { PublishingScheduleListParams, ... } from '...';  // type-only import
```

同一模块的导入分成两条语句，建议合并。

---

## 评分细则

| 维度 | 得分 | 权重 | 加权得分 | 说明 |
|------|------|------|---------|------|
| 接口隔离原则 (ISP) | 3.0 | 20% | 0.60 | 17 方法合并两个领域，ISP 严重违反 |
| 聚合根边界完整性 | 4.0 | 15% | 0.60 | getById/listVersions 缺 projectId |
| 认证上下文一致性 | 4.5 | 15% | 0.68 | list 可选 + updateSchedule 拆解 |
| AuthContext 定义归属 | 5.0 | 10% | 0.50 | 基础类型放在 Service 文件中 |
| 分层职责清晰度 | 6.5 | 15% | 0.98 | 纯函数混入 Service + 映射策略不统一 |
| 状态机封装与可测试性 | 7.0 | 10% | 0.70 | private static 不可测试不可扩展 |
| 实现层事务安全 | 8.5 | 15% | 1.28 | 除 updateSchedule 外全部事务保护 |
| **综合加权** | — | — | **5.34** | 四舍五入 **5.2/10** |

---

## 修复优先级

| 优先级 | 编号 | 预估工时 | 风险 |
|--------|------|---------|------|
| P0 | C-1 拆分 IPublishingScheduleService | 3h | 高 — ISP 违反影响所有消费者 |
| P0 | H-1 AuthContext 移至独立模块 | 1h | 中 — 跨模块类型归属 |
| P0 | H-2 getById/listVersions 添加 projectId | 1.5h | 高 — 聚合根边界 |
| P1 | H-3 updateSchedule 统一 AuthContext | 0.5h | 中 — 接口一致性 |
| P1 | H-4 list auth 必选 | 0.5h | 中 — 授权语义 |
| P2 | M-1~M-4 | 3h | 低 — 可维护性改善 |

---

## 与质量评审的交叉对照

| 架构评审编号 | 质量评审编号 | 关系 |
|-------------|-------------|------|
| C-1 (ISP 违反) | — | 架构独有 |
| H-1 (AuthContext 归属) | H-2 (role: string) | 互补 — 归属修复时一并收紧类型 |
| H-2 (缺 projectId) | H-3 (缺 projectId) | 完全对应 |
| H-3 (updateSchedule 拆解) | H-1 (AuthContext 不一致) | 同一问题的不同视角 |
| H-4 (list auth 可选) | H-1 (AuthContext 不一致) | 同一问题的不同视角 |
| M-1 (状态机封装) | M-4 (published 缺失) | 互补 — 封装问题与文档问题 |

**结论**：修复 C-1（拆分接口）+ H-1~H-4 后，预期可达 **7.8/10 APPROVE**。
