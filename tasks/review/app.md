# 架构评审：apis/app.ts

**评审日期**: 2026-05-23
**评审角色**: 软件架构专家
**评审范围**: Express 应用入口文件 `apis/app.ts`（209 行）
**关联文件**: `apis/server.ts`, `apis/config/index.ts`, `apis/middleware/*.ts`, `apis/controller/*.ts`

---

## 1. 架构总体评级：B+（结构合理，存在架构级改进空间）

`app.ts` 作为 Express 应用的组装层（Composition Root），职责定位清晰——中间件注册 + 路由挂载。整体结构在中小型项目中可接受，但随着业务域增长（当前已有 16 个 controller、52 条路由），面临模块化和扩展性挑战。

---

## 2. 架构视图分析

### 2.1 分层架构

```
server.ts (进程管理)
  └─ app.ts (组装层 / Composition Root)
       ├─ middleware/ (横切关注点)
       │   ├─ helmet → cors → json → static
       │   ├─ antiCrawlMiddleware (内存级 IP 封禁)
       │   ├─ rateLimitMiddleware (express-rate-limit)
       │   └─ authMiddleware + roleMiddleware (JWT + RBAC)
       └─ controller/*.ts (16 个，直接挂载到 app)
```

**评价**: 分层结构存在，但组装层（app.ts）直接耦合了所有 controller，缺少路由层抽象。

### 2.2 中间件管道

```
请求 → helmet → cors → express.json → static(/uploads) → antiCrawl → rateLimit → [路由匹配] → authMiddleware → roleMiddleware → controller
```

**评价**: 中间件顺序正确——安全头部 → 跨域 → 解析 → 限流 → 认证 → 授权。但存在以下问题：

| 环节 | 问题 | 风险 |
|------|------|------|
| helmet | 配置合理 | 无 |
| cors | 无 origin 白名单 | **高** |
| static | `/uploads` 路径经过 antiCrawl + rateLimit | 健康检查和静态资源被不必要限流 |
| antiCrawl | 内存 Map 存储，进程重启丢失 | 中 |
| rateLimit | 使用 `express-rate-limit`（默认内存存储） | 中 |

---

## 3. 架构级发现

### ARCH-1: 缺少路由模块化层（架构债务）

**严重度**: HIGH
**位置**: 第 71-202 行

**现状**: 52 条路由全部在 `app.ts` 中线性注册，直接引用 16 个 controller 模块。

**问题**:
- 违反**关注点分离**原则——app.ts 同时承担路由注册和中间件配置两个职责
- 路由无法独立测试（必须启动完整 Express 实例）
- 不同业务域（auth、article、knowledge）的路由混杂在一起
- 新增路由只能追加到文件末尾，无法按领域隔离

**建议架构**:

```
apis/
├─ app.ts              (仅中间件配置 + 路由挂载)
├─ routes/
│   ├─ index.ts        (汇总导出)
│   ├─ auth.routes.ts
│   ├─ company.routes.ts
│   ├─ article.routes.ts
│   ├─ knowledge.routes.ts
│   └─ ...
└─ controller/
    └─ ...
```

```typescript
// routes/article.routes.ts
import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import * as articleController from '../controller/article.controller';

const router = Router();

router.get('/:projectId/articles', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.listArticles);
// ...

export default router;

// app.ts
import articleRoutes from './routes/article.routes';
app.use('/api/projects', articleRoutes);
```

**收益**: 路由可独立测试、按域隔离、app.ts 从 209 行缩减至 ~60 行。

---

### ARCH-2: 缺少全局错误处理层（架构缺陷）

**严重度**: HIGH
**位置**: 文件末尾（缺失）

**现状**: 没有 error handler middleware 和 404 fallback。

**问题**:
- 未捕获异常由 Express 默认处理，返回 HTML 格式错误栈（泄露内部实现）
- 404 路由由 Express 默认处理（HTML 响应），前端 JSON 解析失败
- 没有统一的错误响应格式，各 controller 各自处理错误

**建议**:
```typescript
// 必须放在所有路由之后
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 全局错误处理 — Express 通过 4 参数签名识别
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled exception', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

---

### ARCH-3: CORS 安全策略缺失（安全架构问题）

**严重度**: HIGH
**位置**: 第 31 行

**现状**: `app.use(cors())` — 允许任意来源的跨域请求。

**问题**:
- 任何域名都可以向此 API 发起请求
- 浏览器不会拦截来自恶意网站的请求
- 与 JWT 认证组合使用时，若前端存储 token 在 cookie 中，构成 CSRF 攻击面

**建议**: 配置化 CORS 白名单：
```typescript
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.corsOrigins || ['http://localhost:5173'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));
```

---

### ARCH-4: 静态资源与 API 共享中间件链（架构耦合）

**严重度**: MEDIUM
**位置**: 第 35-38 行 vs 第 41-42 行

**现状**: `/uploads` 静态文件路由注册在 antiCrawl/rateLimit 之前，但 health check 端点（第 205 行）在其之后。

**问题**:
- `/api/health` 经过 antiCrawl 和 rateLimit 中间件，可能被限流
- 生产环境健康检查（负载均衡器探测）可能被误封 IP
- 静态资源请求被 antiCrawl 检查 User-Agent，影响 CDN 回源

**建议**: 分离公共端点和受保护端点的中间件链：
```typescript
// 公共端点 — 不经过限流
app.get('/api/health', healthHandler);
app.use('/uploads', staticMiddleware);

// 受限端点 — 经过完整中间件链
app.use(antiCrawlMiddleware);
app.use(rateLimitMiddleware);
// ... 所有 API 路由
```

---

### ARCH-5: Anti-Crawl 内存存储限制扩展性（部署架构问题）

**严重度**: MEDIUM
**位置**: `apis/middleware/anti-crawl.middleware.ts`

**现状**: IP 封禁数据存储在进程内存 `Map` 中。

**问题**:
- **多实例部署不共享**: 如果使用 PM2 cluster 或容器编排，每个实例独立计数，攻击者可分散到不同实例绕过限制
- **进程重启数据丢失**: 封禁记录全部清空
- **无 LRU 淘汰**: Map 无限增长，长时间运行可能内存泄漏

**建议**: 对于单实例部署，当前可接受。若需横向扩展：
- 短期：给 Map 添加定期清理和最大容量限制
- 长期：迁移到 Redis 存储，使用 `rate-limit-redis`

---

### ARCH-6: 缺少 API 版本化策略（演进架构问题）

**严重度**: MEDIUM
**位置**: 所有路由 `/api/` 前缀

**现状**: 所有 API 使用 `/api/` 前缀，无版本号。

**问题**:
- 不兼容变更（如删除字段、修改 URL 结构）无法平滑过渡
- 前后端必须同时发布
- 没有版本策略意味着 v1 隐式存在，后续无法引入 v2

**建议**: 引入 URL 版本前缀 + Express Router：
```typescript
import v1Routes from './routes/v1';
app.use('/api/v1', v1Routes);
```

---

### ARCH-7: Swagger 规格无条件初始化（资源浪费）

**严重度**: LOW
**位置**: 第 45-64 行

**现状**: `swaggerJSDoc()` 在模块加载时执行，即使 `config.swagger.enabled` 为 false。

**问题**: 生产环境执行了不必要的文件 I/O（扫描 `controller/*.ts`）。

**建议**: 延迟到条件分支内：
```typescript
if (config.swagger.enabled) {
  const swaggerSpec = swaggerJSDoc({ ... });
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
}
```

---

## 4. 架构质量属性评估

### 4.1 可维护性 — 6/10

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块化 | 5 | 路由未拆分，controller 直接耦合到 app |
| 可读性 | 8 | 注释清晰，路由分组明确 |
| 可测试性 | 5 | 路由无法独立测试，需完整启动 |
| 代码量 | 7 | 209 行可接受，但路由部分占 130 行 |

### 4.2 安全性 — 6/10

| 维度 | 评分 | 说明 |
|------|------|------|
| 认证 | 9 | JWT + roleMiddleware，设计良好 |
| CORS | 3 | 完全开放，生产环境不可接受 |
| 错误暴露 | 4 | 缺少全局错误处理，可能泄露栈信息 |
| 输入验证 | 7 | express.json + 各 controller 验证 |

### 4.3 可扩展性 — 5/10

| 维度 | 评分 | 说明 |
|------|------|------|
| 横向扩展 | 4 | antiCrawl/rateLimit 内存存储不共享 |
| 功能扩展 | 6 | 新增路由需修改 app.ts，但模式一致 |
| API 演进 | 4 | 无版本化策略 |

### 4.4 运维友好度 — 7/10

| 维度 | 评分 | 说明 |
|------|------|------|
| 健康检查 | 5 | 端点存在但可能被限流 |
| 优雅关闭 | 9 | server.ts 处理完善 |
| 配置管理 | 8 | config 模块集中管理 |
| 日志 | 6 | 缺少请求 ID 追踪 |

---

## 5. 架构改进路线图

### Phase 1: 安全加固（优先级 P0，预估 2h）

| 编号 | 改进项 | 工作量 |
|------|--------|--------|
| ARCH-2 | 添加全局错误处理 + 404 fallback | 1h |
| ARCH-3 | 配置 CORS 白名单 | 0.5h |
| ARCH-4 | 分离公共/受保护中间件链 | 0.5h |

### Phase 2: 模块化重构（优先级 P1，预估 4h）

| 编号 | 改进项 | 工作量 |
|------|--------|--------|
| ARCH-1 | 路由拆分到 `routes/` 目录 | 3h |
| ARCH-7 | Swagger 延迟初始化 | 0.5h |
| ARCH-4 | 请求体大小限制显式设置 | 0.5h |

### Phase 3: 扩展性优化（优先级 P2，按需）

| 编号 | 改进项 | 工作量 |
|------|--------|--------|
| ARCH-6 | API 版本前缀 `/api/v1/` | 2h |
| ARCH-5 | antiCrawl 添加清理机制/迁移 Redis | 2h |

---

## 6. 与已有质量评审的对照

| 维度 | 质量评审结论 | 架构评审补充 |
|------|-------------|-------------|
| 全局错误处理 | HIGH — 安全风险 | **架构缺陷** — 影响所有 controller 的错误传播模式 |
| CORS 开放 | HIGH — 安全风险 | **安全架构** — 需纳入部署架构规范 |
| 路由集中 | MEDIUM — 可维护性 | **架构债务** — 阻碍独立测试和模块化演进 |
| API 版本 | MEDIUM — 建议 | **演进架构** — 影响前后端发布策略 |
| antiCrawl 内存 | 未涉及 | **部署架构** — 影响横向扩展决策 |

---

## 7. 结论

`app.ts` 在中小型单体应用中表现合格，中间件管道设计合理，认证授权架构（JWT + RBAC）清晰。核心架构问题集中在三个方面：

1. **缺少错误处理层** — 影响系统的健壮性和安全性，应立即修复
2. **路由与组装层耦合** — 阻碍模块化演进和独立测试，应在功能稳定后重构
3. **无 API 版本策略** — 影响长期演进能力，建议在 v2 需求出现前建立

建议按 Phase 1 → Phase 2 → Phase 3 的顺序推进改进，优先解决安全相关的架构缺陷。
