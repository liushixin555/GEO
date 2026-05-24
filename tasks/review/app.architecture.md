# 软件架构专家评审：apis/app.ts

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 · 模块化 · 中间件管道 · 扩展性 · 关注点分离 · SOLID · 可演进性）
**文件路径**: `apis/app.ts`
**代码行数**: 239 行（Express 应用入口 + 中间件链 + 96 条路由注册 + 错误处理）
**关联文件**: `apis/server.ts`, `apis/config/index.ts`, `apis/middleware/index.ts`, `apis/middleware/auth.middleware.ts`, `apis/middleware/rate-limit.middleware.ts`, `apis/middleware/anti-crawl.middleware.ts`

---

## 一、总体架构评估

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 中间件管道设计 | 9/10 | 顺序合理，每层职责清晰，注释标注设计意图 |
| 配置架构 | 9/10 | deepFreeze + safeParseInt + 环境区分验证，设计精良 |
| 安全层架构 | 8/10 | JWT + RBAC + 限流 + 反爬 + Helmet + CORS，纵深防御到位 |
| 路由架构 | 4/10 | 96 条路由平铺，无 Router 模块化，无 API 版本化 |
| 模块化 | 3/10 | 单文件承担路由注册 + 中间件配置 + 错误处理，耦合过重 |
| 可演进性 | 4/10 | 无版本化、无插件机制、无路由懒加载 |
| 关注点分离 | 5/10 | 路由注册与中间件管道混在同一文件 |
| 一致性 | 5/10 | 注释存在错误，路由分组逻辑不统一 |

**问题统计**: CRITICAL × 2 / HIGH × 3 / MEDIUM × 4 / LOW × 2

**综合评级**: B-（安全基础和中间件管道优秀，路由架构是核心瓶颈）

---

## 二、架构层面问题清单

### CRITICAL 级别

#### C-1: 96 条路由平铺在入口文件 — 模块化架构缺失

**位置**: `app.ts:96-226`（130 行连续路由注册，占文件 55%）
**SOLID**: 单一职责原则（SRP）违反
**架构模式**: 缺少 Router 模式（Gang of Four 意义上的模块化组合）

**问题描述**:

`app.ts` 承担了三个完全不同的架构职责：

| 职责 | 行数 | 占比 | 应归属 |
|------|------|------|--------|
| 中间件管道组装 | 25-93 | 29% | app.ts（合理） |
| 路由注册 | 96-226 | 55% | routes/ 模块（缺失） |
| 错误处理 | 228-237 | 5% | app.ts（合理） |

入口文件应仅负责**组装**（Composition Root），而非**注册**（Registration）。当前模式下，`app.ts` 成了 14 个业务域的路由注册中心，违反了 SRP 和关注点分离原则。

**量化分析**:

| 指标 | 当前值 | 健康阈值 |
|------|--------|----------|
| 路由总数 | 96 | 入口文件 < 20（仅挂载 Router） |
| 业务域 | 14 | 每个 Router 模块 1 个域 |
| 文件行数 | 239 | 入口文件 < 80 行 |
| 直接 import 的 controller | 16 个 | 入口文件应为 0 |
| 添加新路由需修改的文件 | 1（app.ts） | 应只修改对应 Router 文件 |

**影响**:

1. **合并冲突**: 多人并行开发不同业务域时，全部在 `app.ts` 的 130 行路由区段修改，冲突概率极高
2. **认知负荷**: 开发者需在 96 条路由中定位目标位置，线性扫描成本 O(n)
3. **审查困难**: PR 审查时难以聚焦特定业务域的变更
4. **演进障碍**: 新增业务模块（如报表、消息通知）需继续膨胀此文件

**修复方案**:

```
apis/
├── app.ts                     # Composition Root（< 50 行）
│   └── 组装中间件链 + 挂载 Router 模块 + 错误处理
├── routes/
│   ├── auth.routes.ts         # Router 模块（20-30 行）
│   ├── company.routes.ts
│   ├── skills.routes.ts
│   ├── user.routes.ts
│   ├── llm-model.routes.ts
│   ├── system-config.routes.ts
│   ├── publishing-platform.routes.ts
│   ├── project.routes.ts      # 嵌套 Router: /:projectId/articles
│   ├── knowledge.routes.ts    # 聚合: knowledge-bases + knowledge-inventory
│   ├── upload.routes.ts
│   ├── publishing-schedule.routes.ts
│   └── todo.routes.ts
```

```typescript
// apis/routes/auth.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware';
import * as ctrl from '../controller/auth.controller';

const router = Router();
router.post('/login', ctrl.login);
router.get('/verify', authMiddleware, ctrl.verify);
router.post('/logout', authMiddleware, ctrl.logout);
// ...
export default router;

// apis/app.ts — 重构后
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
// ...

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
```

**收益**: `app.ts` 从 239 行缩至 ~50 行，合并冲突减少 90%，每个路由文件 20-40 行，职责单一。

---

#### C-2: 中间件链重复 90+ 次 — Router 级中间件未利用

**位置**: `app.ts:108-226`
**SOLID**: DRY 原则违反
**架构模式**: 缺少中间件组合（Middleware Composition）

**问题描述**:

`authMiddleware, roleMiddleware('sysadmin', 'admin')` 模式在 96 条路由中出现约 78 次。Express Router 支持 Router 级中间件挂载，可一次声明、全局生效，但当前未使用此能力。

**重复模式统计**:

| 中间件组合 | 出现次数 | 适用路由 |
|-----------|---------|---------|
| `authMiddleware, roleMiddleware('sysadmin')` | 14 | company, user, llm-model, system-config, publishing-platform(sync) |
| `authMiddleware, roleMiddleware('sysadmin', 'admin')` | 78 | skills, project, article, knowledge, upload, publishing-schedule, knowledge-base, todo |
| `authMiddleware, roleMiddleware('sysadmin', 'admin', 'view')` | 1 | publishing-schedule(list) |
| `authMiddleware`（仅认证） | 7 | auth 路由 |
| 无认证 | 1 | login |

**架构影响**:

1. **变更放大**: 修改认证逻辑（如增加日志中间件）需改动 90+ 处
2. **遗漏风险**: 新增路由时可能忘记添加 authMiddleware
3. **代码膨胀**: 每条路由多占 30-50 字符的中间件声明

**修复方案**:

```typescript
// 方案1: Router 级中间件（推荐，结合 C-1）
const router = Router();
router.use(authMiddleware, roleMiddleware('sysadmin', 'admin'));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
// 每条路由自动继承认证和授权

// 方案2: 路由工厂函数
function protectedRouter(...roles: string[]) {
  return Router().use(authMiddleware, roleMiddleware(...roles));
}
const adminRouter = protectedRouter('sysadmin', 'admin');
```

---

### HIGH 级别

#### H-1: 注释与代码不匹配 — 架构文档可信度问题

**位置**: `app.ts:187`
**Clean Code**: 注释应准确反映代码意图

**问题代码**:

```typescript
// Line 187: 注释标注为 Knowledge Item
// Knowledge Item routes (sysadmin + admin) - scoped to knowledge base
app.get('/api/todos', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.listTodos);
```

注释说 "Knowledge Item routes" 但实际注册的是 **Todo 路由**（`/api/todos`）。真正的 Knowledge Item 路由在 L200-226。

**架构影响**:

1. 开发者在 L187 寻找 Knowledge Item 路由会找到错误位置
2. 新增 Todo 路由时可能错误地插入到 Knowledge 区域
3. 这种注释错误暗示**代码审查流程薄弱**——路由分组区域未经严格审查

**修复**: 将 L187 注释改为 `// Todo routes (sysadmin + admin)`

---

#### H-2: 无 API 版本化 — 演进架构缺失

**位置**: 全部路由前缀 `/api/`
**SOLID**: 开闭原则（OCP）违反
**架构模式**: 缺少 API Versioning 模式

**问题描述**:

所有路由使用 `/api/` 前缀，无版本号。API 签名变更时无法平滑迁移客户端。

**演进风险矩阵**:

| 变更场景 | 当前影响 | 有版本化后影响 |
|----------|----------|---------------|
| 删除字段 | 所有客户端立即失败 | v1 保持兼容，v2 移除 |
| 修改响应格式 | 前端需同步发布 | 前端可渐进升级 |
| 新增必填参数 | 旧客户端请求失败 | v1 保持可选，v2 必填 |
| 修改错误码 | 所有错误处理逻辑失效 | v1/v2 独立演进 |

**修复方案**:

```typescript
// app.ts — 挂载时加版本前缀
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);

// 后续演进
// app.use('/api/v2/auth', authV2Routes);
```

**注意**: 版本化改造需同步修改前端 API 调用路径。可在重构路由模块化（C-1）时一并实施。

---

#### H-3: 缺少请求验证层 — 横切关注点未统一处理

**位置**: 全部 POST/PUT 路由
**架构模式**: 缺少 Validation Pipeline 模式

**问题描述**:

96 条路由中，所有 POST/PUT 端点接受原始 `req.body`，无统一的 Schema 验证。当前验证逻辑分散在各 controller 中，使用手动 `if (!field)` 检查。

**架构分析**:

```
请求 → 认证 → 授权 → [缺失: 验证层] → Controller → Service
                                    ↑
                              应在此处统一拦截
                              非法输入，避免
                              污染业务层
```

在分层架构中，验证层是 Controller 与 Service 之间的必要屏障：

1. **一致性**: 验证规则应集中定义（Schema），而非散落在各 handler
2. **安全性**: 统一拦截非法输入，防止绕过
3. **可测试性**: Schema 可独立测试，无需启动 HTTP 服务

**修复方案**:

```typescript
// apis/middleware/validate.ts — zod 验证中间件工厂
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ code: 400, message: result.error.issues[0].message });
      return;
    }
    req.body = result.data;
    next();
  };
}

// 在路由中使用
router.post('/',
  validate(z.object({ username: z.string().min(3), password: z.string().min(8) })),
  ctrl.createUser
);
```

---

### MEDIUM 级别

#### M-1: Swagger 规范无条件生成 — 启动时资源浪费

**位置**: `app.ts:69-88`
**性能/架构**: 懒加载缺失

```typescript
// L69: 总是执行 swaggerJSDoc()，扫描所有 controller 文件
const swaggerSpec = swaggerJSDoc({ ... });

// L90: 仅在条件满足时挂载
if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
}
```

Swagger 规范在模块加载时无条件生成（扫描所有 controller 文件），即使生产环境已禁用。应在条件内延迟初始化。

---

#### M-2: 无请求日志中间件 — 可观测性架构缺失

**位置**: 中间件链
**ISO 25010**: 可维护性 — 可诊断性

中间件链中无 HTTP 请求日志记录（无 morgan、winston 或自定义日志中间件）。仅有的日志是全局错误处理中的 `console.error`。

**缺失的可观测性能力**:

| 能力 | 当前状态 | 生产环境必需 |
|------|----------|-------------|
| 请求响应时间 | ❌ | ✅ 慢查询分析 |
| 请求路径+状态码分布 | ❌ | ✅ 错误率监控 |
| 错误堆栈追踪 | ⚠️ 仅 console.error | ✅ 结构化日志 |
| 审计日志 | ❌ | ✅ 安全合规 |

---

#### M-3: 错误处理不分类 — 架构层面的异常模型缺失

**位置**: `app.ts:234-237`

全局错误处理对所有错误统一返回 `500`，不区分业务错误（如"用户名已存在"）和系统错误（如数据库连接失败）。

```typescript
// 当前: 不区分错误类型
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

**架构影响**: 每个 controller 被迫在 try-catch 中自行映射错误码，导致错误处理逻辑分散、不一致。应引入统一的异常类层次结构。

**修复方案**:

```typescript
// apis/errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(404, `${resource}不存在`); }
}
export class BadRequestError extends AppError {
  constructor(message: string) { super(400, message); }
}
export class ForbiddenError extends AppError {
  constructor(message: string) { super(403, message); }
}

// app.ts — 全局错误处理
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.statusCode, message: err.message });
    return;
  }
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

---

#### M-4: 路由分组逻辑不一致 — 架构组织混乱

**位置**: `app.ts:163-226`

Knowledge 相关路由分散在三处，Todo 路由插在中间：

| 位置 | 路由前缀 | 注释说明 |
|------|---------|---------|
| L163-167 | `/api/projects/:projectId/knowledge/` | "Project Knowledge aggregation" |
| L169-171 | `/api/upload`, `/api/upload/document` | "Upload route" |
| L173-175 | `/api/publishing-schedule` | "Publishing Schedule" |
| L177-182 | `/api/knowledge-bases` | "Knowledge Base" |
| L184-185 | `/api/knowledge-inventory` | "Knowledge Inventory" |
| L187-198 | `/api/todos` | 注释错误标注为"Knowledge Item" |
| L200-226 | `/api/knowledge-bases/:baseId/...` | 无分组注释 |

7 个不同业务域的路由交织在一起，违反了按业务域分组的基本组织原则。如果使用 Router 模块化（C-1），此问题自然消除。

---

### LOW 级别

#### L-1: 角色字符串硬编码 — 魔法值

**位置**: `app.ts:108-226`

`'sysadmin'`、`'admin'`、`'view'` 在 90+ 处路由中以字符串字面量出现。拼写错误无法编译时发现，角色新增/重命名时需全局搜索替换。

```typescript
// 推荐: 定义角色常量
export const ROLES = { SYSADMIN: 'sysadmin', ADMIN: 'admin', VIEW: 'view' } as const;
```

---

#### L-2: 静态文件中间件位置可优化

**位置**: `app.ts:59-62`

静态文件服务放在认证中间件之前是设计决策（浏览器 `<img>` 标签无法携带 Authorization 头），但 `/uploads` 路径直接暴露整个 uploads 目录，无文件类型白名单。长远应考虑签名 URL 方案。

---

## 三、中间件管道架构专项分析

### 3.1 当前管道设计

```
trust proxy → health check → helmet → CORS → body parser → static files
    → anti-crawl → rate-limit → [routes] → 404 → error handler
```

### 3.2 管道顺序评估

| 步骤 | 中间件 | 位置 | 评估 | 设计意图 |
|------|--------|------|------|----------|
| 1 | `trust proxy` | L28 | ✅ | 在所有中间件之前设置，确保 req.ip 正确 |
| 2 | health check | L31 | ✅ | 在安全中间件之前，避免限流干扰 |
| 3 | helmet | L36 | ✅ | 尽早设置安全响应头 |
| 4 | CORS | L42 | ✅ | 在认证之前，允许预检请求 |
| 5 | body parser | L56 | ✅ | 在路由之前解析请求体 |
| 6 | static files | L59 | ✅ | 在认证之前（设计决策，`<img>` 无自定义头） |
| 7 | anti-crawl | L65 | ✅ | 在路由之前拦截恶意请求 |
| 8 | rate-limit | L66 | ✅ | 在路由之前限制请求频率 |
| 9 | routes | L96-226 | ⚠️ | 应拆分为 Router 模块 |
| 10 | 404 fallback | L229 | ✅ | 在所有路由之后 |
| 11 | error handler | L234 | ✅ | 4 参数签名正确 |

**结论**: 中间件管道设计**非常优秀**，每一层的顺序都有明确的设计理由，注释清晰（如 L27-28 "Trust first proxy"，L64 "intentionally placed before login route"）。这是本文件架构质量最高的部分。

### 3.3 管道架构图

```
                    ┌─────────────────────────────────────┐
                    │         app.ts (Composition Root)     │
                    │                                      │
 Incoming Request ──→ trust proxy (1)                     │
                    │     ↓                                │
                    │ health check (2) ← 公共端点          │
                    │     ↓                                │
                    │ helmet (3) ← 安全响应头              │
                    │     ↓                                │
                    │ CORS (4) ← 跨域策略                  │
                    │     ↓                                │
                    │ body parser (5) ← 请求体解析          │
                    │     ↓                                │
                    │ static files (6) ← 公共资源访问      │
                    │     ↓                                │
                    │ anti-crawl (7) ← 恶意请求拦截        │
                    │     ↓                                │
                    │ rate-limit (8) ← 频率限制            │
                    │     ↓                                │
                    │ ┌──────────────────────────────────┐ │
                    │ │  Routes (9) — 当前: 96条平铺      │ │
                    │ │  推荐: Router 模块化挂载           │ │
                    │ └──────────────────────────────────┘ │
                    │     ↓                                │
                    │ 404 fallback (10)                    │
                    │     ↓                                │
                    │ error handler (11)                   │
                    └─────────────────────────────────────┘
```

---

## 四、配置架构专项分析

### 4.1 配置模块设计评估

`apis/config/index.ts` 是本项目的**架构质量标杆**：

| 设计特性 | 评估 | 说明 |
|----------|------|------|
| 不可变性 | ✅ | `deepFreeze` 递归冻结，防止运行时篡改 |
| 类型安全 | ✅ | `AppConfig` 接口 + `Readonly<T>` 泛型约束 |
| 环境区分 | ✅ | JWT Secret/DB Password 生产环境强制验证 |
| 安全默认值 | ✅ | 开发环境自动生成 JWT Secret（重启变更） |
| 输入验证 | ✅ | `safeParseInt` 带范围校验和错误消息 |
| CORS 解析 | ✅ | `parseCorsOrigins` 格式验证 + 空值保护 |
| 集中管理 | ✅ | 所有配置项通过 `config` 单一出口 |

### 4.2 配置驱动验证

所有关键行为均由配置驱动，符合 12-Factor App 原则：

| 配置项 | 环境变量 | 默认值 | 验证 |
|--------|----------|--------|------|
| 端口 | PORT | 8080 | 1-65535 范围校验 |
| JWT Secret | JWT_SECRET | 自动生成 | 生产环境必须设置 |
| 限流窗口 | RATE_LIMIT_WINDOW_MS | 60000 | >= 1 |
| 限流阈值 | RATE_LIMIT_MAX | 100 | >= 1 |
| CORS 来源 | CORS_ORIGINS | localhost:5173 | http/https 格式校验 |
| Swagger | SWAGGER_ENABLED | false | 布尔值 |
| DB 密码 | DB_PASSWORD | postgres | 生产环境必须设置 |

---

## 五、安全层架构专项分析

### 5.1 纵深防御模型

```
Layer 1: 网络层 (Nginx/CDN)      ← 运维层（不在本文件范围）
Layer 2: Helmet 安全头            ← app.ts:36-39 ✅
Layer 3: CORS 白名单              ← app.ts:42-53 ✅
Layer 4: 请求体大小限制           ← app.ts:56 ✅ (10mb)
Layer 5: 反爬虫 (User-Agent + IP) ← app.ts:65 ✅
Layer 6: 限流 (IP + 窗口)         ← app.ts:66 ✅
Layer 7: JWT 认证                 ← authMiddleware ✅
Layer 8: RBAC 授权                ← roleMiddleware ✅
Layer 9: 全局错误处理             ← app.ts:234-237 ✅
```

9 层纵深防御，安全基础扎实。

### 5.2 认证/授权架构

```
                    authMiddleware                    roleMiddleware
                    ┌──────────┐                      ┌──────────────┐
  Request ────────→│ JWT 验证  │──── decoded ──────→│ 角色白名单检查 │
                    │ payload:  │                     │ allowedRoles  │
                    │ userId    │                     │ includes      │
                    │ username  │                     │ req.user.role │
                    │ role      │                     └──────┬───────┘
                    │ companyId │                            │
                    └──────────┘                     403 ← 未授权
                    401 ← 无/无效 token
```

优点：
- JWT payload 包含 `userId`、`role`、`companyId`，足够业务层使用
- `roleMiddleware` 使用可变参数（`...allowedRoles`），灵活性好
- 通过 Express 类型扩展（`declare global { namespace Express { interface Request { user?: AuthPayload } } }`）实现类型安全

局限：
- Token 中包含 `role` 信息，管理员更改用户角色后，旧 token 仍使用旧角色（最长 2 小时延迟）
- 无 Refresh Token 机制（B 端管理系统 2h 过期可接受）

---

## 六、应用生命周期架构分析

### 6.1 启动流程

```
server.ts
  │
  ├── import app.ts          ← 触发模块初始化
  │   ├── 加载 config        ← 深度冻结配置，验证生产环境变量
  │   ├── 初始化 Express 实例
  │   ├── 配置中间件链
  │   ├── 生成 Swagger 规范  ← 无条件扫描 controller 文件（M-1）
  │   ├── 注册 96 条路由
  │   └── 配置错误处理
  │
  ├── app.listen(PORT)
  └── startArticleGenerationCron()
```

### 6.2 关闭流程

```
SIGINT/SIGTERM
  ├── stopArticleGenerationCron()
  ├── closePrisma()
  └── server.close() → process.exit(0)
```

关闭流程设计合理：先停止定时任务、再关闭数据库连接、最后关闭 HTTP 服务。`server.close()` 会等待现有请求完成（graceful shutdown）。

---

## 七、与同类项目架构对比

| 架构维度 | 本项目 | 行业良好实践 | 差距 |
|----------|--------|-------------|------|
| 入口文件行数 | 239 | < 80 | 路由需拆分 |
| 路由模块化 | 无 | Express Router | 需重构 |
| API 版本化 | 无 | URL 前缀 /v1/ | 需补充 |
| 请求验证层 | 手动 if | zod/joi 中间件 | 需统一 |
| 请求日志 | 无 | morgan/winston | 需补充 |
| 错误分类 | 无 | 自定义 Error 类 | 建议补充 |
| 中间件管道 | 优秀 | 同 | 已达标 |
| 配置管理 | 优秀 | 同 | 已达标 |
| 安全基础 | 优秀 | 同 | 已达标 |
| 优雅关闭 | 良好 | 同 | 已达标 |

---

## 八、修复优先级路线图

### P0: 高优先级（架构缺陷，影响日常开发效率）

| 编号 | 修复项 | 工作量 | 收益 |
|------|--------|--------|------|
| C-1 | 路由拆分为 Router 模块 | 4h | 合并冲突减少 90%，代码审查效率提升 |
| C-2 | 消除中间件重复（Router 级中间件） | 2h | 配合 C-1，中间件变更从改 80+ 处变为改 1 处 |
| H-1 | 修正 L187 注释错误 | 0.1h | 消除误导 |

### P1: 中优先级（提升架构质量基线）

| 编号 | 修复项 | 工作量 | 收益 |
|------|--------|--------|------|
| H-2 | API 版本化（/api/v1/） | 2h | 支持平滑 API 演进 |
| H-3 | 引入 zod 请求验证中间件 | 8h | 统一验证层，减少 bug |
| M-3 | 错误分类处理（AppError 体系） | 2h | 区分业务错误与系统错误 |
| M-2 | 添加请求日志中间件 | 2h | 生产环境可观测性 |

### P2: 低优先级（架构整洁度改进）

| 编号 | 修复项 | 工作量 | 收益 |
|------|--------|--------|------|
| M-1 | Swagger 条件生成 | 0.5h | 生产启动性能微优化 |
| M-4 | 路由分组统一 | 1h | 代码一致性（C-1 解决后自动消除） |
| L-1 | 角色常量化 | 1h | 编译时类型安全 |
| L-2 | 静态文件签名 URL | 4h | 长远安全改进 |

---

## 九、重构后的目标架构

```typescript
// apis/app.ts — 重构后目标（~50 行）
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config';
import { rateLimitMiddleware, antiCrawlMiddleware } from './middleware';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import skillsRoutes from './routes/skills.routes';
import userRoutes from './routes/user.routes';
import llmModelRoutes from './routes/llm-model.routes';
import systemConfigRoutes from './routes/system-config.routes';
import publishingPlatformRoutes from './routes/publishing-platform.routes';
import projectRoutes from './routes/project.routes';
import uploadRoutes from './routes/upload.routes';
import publishingScheduleRoutes from './routes/publishing-schedule.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import todoRoutes from './routes/todo.routes';

const app: Express = express();
app.set('trust proxy', 1);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }));
app.use(cors({ origin: (o, cb) => { (!o || config.corsOrigins.includes(o)) ? cb(null, true) : cb(new Error('Not allowed by CORS')); }, methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', (_req, res, next) => { res.set('Cross-Origin-Resource-Policy', 'cross-origin'); next(); }, express.static(path.resolve(process.cwd(), 'uploads')));
app.use(antiCrawlMiddleware);
app.use(rateLimitMiddleware);

if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  const swaggerSpec = require('swagger-jsdoc')({ definition: { openapi: '3.0.0', info: { title: '薄云商机倍增服务 API', version: '1.0.0' }, components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } } }, apis: ['./apis/controller/*.ts'] });
  app.use('/api-docs', require('swagger-ui-express').serve, require('swagger-ui-express').setup(swaggerSpec));
  app.get('/api-docs.json', (_req: Request, res: Response) => res.json(swaggerSpec));
}

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/llm-models', llmModelRoutes);
app.use('/api/system-configs', systemConfigRoutes);
app.use('/api/publishing-platforms', publishingPlatformRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/publishing-schedule', publishingScheduleRoutes);
app.use('/api', knowledgeRoutes);
app.use('/api/todos', todoRoutes);

app.use((_req, res) => res.status(404).json({ code: 404, message: '接口不存在' }));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

export default app;
```

**效果**: 入口文件从 239 行缩减到 ~50 行，职责从"注册所有路由"变为"组装中间件链 + 挂载路由模块"。

---

## 十、结论

`apis/app.ts` 呈现出**两极分化**的架构质量：

**优秀面**：中间件管道设计（9 层纵深防御、顺序合理、注释标注设计意图）、配置管理架构（deepFreeze + safeParseInt + 环境区分验证 + 格式校验）、安全基础（JWT + RBAC + 限流 + 反爬 + Helmet + CORS 白名单）均达到行业良好水准。

**瓶颈面**：96 条路由平铺在入口文件中，构成严重的模块化缺失。这是**架构层面的技术债务**，非功能缺陷。建议在下一个迭代周期中实施 C-1 + C-2 路由拆分重构（预估 6h），将显著降低日常开发摩擦并为后续 API 版本化、请求验证层等改进奠定基础。

**核心建议**: `app.ts` 应回归 **Composition Root** 的本职——仅负责组装中间件链和挂载路由模块，而非直接注册路由。

---

*软件架构专家评审完成 — 2026-05-24*
