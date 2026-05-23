# 代码评审：apis/app.ts

**评审日期**: 2026-05-23
**评审角色**: 软件质量专家
**评审范围**: Express 应用入口文件 `apis/app.ts`（209 行）
**关联文件**: `apis/config/index.ts`, `apis/middleware/*.ts`

---

## 1. 总体评分：B（良好，有改进空间）

文件结构清晰，中间件链顺序合理，路由分组有注释说明。但存在 **2 个高优先级问题** 和 **5 个中优先级问题**，建议尽快处理。

---

## 2. 评审发现

### CRITICAL（关键）— 0 项

无关键安全漏洞或数据丢失风险。

### HIGH（高优先级）— 2 项

#### H1: 缺少全局错误处理中间件

**位置**: 文件末尾（缺少）

**问题**: 没有注册全局错误处理中间件（error handler middleware）和 404 fallback handler。如果任何 controller 或 service 抛出未捕获异常，Express 默认返回 HTML 格式的错误栈，可能泄露内部实现细节。

**影响**:
- 未处理异常时向客户端暴露 Express 版本和调用栈
- 404 路由返回 HTML 而非 JSON，前端无法正确处理

**建议**:
```typescript
// 404 fallback — 放在所有路由之后
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 全局错误处理 — 必须放在最后，4 个参数
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

#### H2: CORS 配置完全开放

**位置**: 第 31 行 `app.use(cors())`

**问题**: `cors()` 不带任何配置参数，表示 **允许任何来源的跨域请求**。在生产环境中，这会导致 CSRF 攻击面扩大。

**影响**:
- 恶意网站可以代替用户向 API 发起请求
- 浏览器不会拦截跨域请求

**建议**:
```typescript
app.use(cors({
  origin: config.corsOrigins, // 从配置读取允许的域名列表
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

### MEDIUM（中优先级）— 5 项

#### M1: 缺少 API 版本控制

**位置**: 所有路由前缀 `/api/`

**问题**: 所有 API 都使用 `/api/` 前缀，没有版本号（如 `/api/v1/`）。一旦需要做不兼容变更，无法平滑过渡。

**建议**: 引入版本前缀 `/api/v1/`，通过 Express Router 隔离不同版本的 handler。

#### M2: 路由定义过于集中

**位置**: 第 71-202 行

**问题**: 所有 50+ 条路由集中在一个文件中（约 130 行路由定义），耦合了 16 个 controller。随着业务增长，维护成本高。

**建议**: 将路由拆分到 `routes/` 目录，每个领域一个路由文件（如 `auth.routes.ts`、`article.routes.ts`），在 `app.ts` 中只负责挂载：
```typescript
import authRoutes from './routes/auth.routes';
app.use('/api/v1/auth', authRoutes);
```

#### M3: Swagger 规格每次请求重新生成

**位置**: 第 45-64 行

**问题**: `swaggerJSDoc()` 在模块加载时执行一次，这本身没问题。但 `swaggerSpec` 对象是一个闭包变量，当 `config.swagger.enabled` 为 false 时仍然执行了 `swaggerJSDoc()` 的文件扫描。

**建议**: 延迟初始化 Swagger：
```typescript
if (config.swagger.enabled) {
  const swaggerSpec = swaggerJSDoc({ ... });
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}
```

#### M4: 静态文件服务缺少安全限制

**位置**: 第 35-38 行

**问题**: `/uploads` 路径直接映射到文件系统目录，没有：
- 文件类型白名单（可下载任意上传的文件）
- 目录遍历防护（Express 默认已处理，但建议显式确认）
- 缓存头设置（大文件每次都重新传输）

**建议**:
```typescript
app.use('/uploads', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('Cache-Control', 'public, max-age=86400'); // 1 天缓存
  next();
}, express.static(path.resolve(process.cwd(), 'uploads'), {
  dotfiles: 'deny',      // 禁止访问 .env 等隐藏文件
  maxAge: '1d',
}));
```

#### M5: 缺少请求体大小限制

**位置**: 第 32 行 `app.use(express.json())`

**问题**: 没有设置 `express.json()` 的 `limit` 参数，默认限制为 100kb。建议显式设置以便团队了解限制值，并根据业务需要调整。

**建议**:
```typescript
app.use(express.json({ limit: '10mb' })); // 显式声明
```

### LOW（低优先级）— 3 项

#### L1: 缺少请求压缩中间件

**问题**: 没有使用 `compression` 中间件，JSON 响应未压缩传输，带宽利用率低。

**建议**: `app.use(compression())` 放在路由之前。

#### L2: 缺少请求 ID 追踪

**问题**: 没有生成请求 ID（`X-Request-Id` header），日志中无法关联同一请求的多条记录。

**建议**: 使用 `uuid` 或 `nanoid` 为每个请求生成唯一 ID，并附加到 `req` 对象上。

#### L3: 健康检查端点位置不佳

**位置**: 第 205 行

**问题**: `/api/health` 放在所有路由最后，但经过 anti-crawl 和 rate-limit 中间件后可能被拦截。建议将其移到中间件链之前，或者使用单独的 Express 实例。

---

## 3. 架构评估

### 优点

| 方面 | 评价 |
|------|------|
| 中间件顺序 | helmet → cors → json → anti-crawl → rate-limit → auth，顺序合理 |
| 路由分组 | 有注释说明（Company/Skills/User/Article 等），可读性好 |
| 角色控制 | 每个路由都显式声明允许的角色，权限边界清晰 |
| 配置驱动 | Swagger 开关、端口、JWT 配置均来自 config，便于环境切换 |

### 不足

| 方面 | 评价 |
|------|------|
| 模块化 | 路由和 app 耦合，建议拆分路由模块 |
| 错误处理 | 缺少全局错误兜底 |
| 可测试性 | 路由注册难以独立测试 |
| 横向扩展 | anti-crawl 使用内存 Map，多实例部署时 IP 封禁不共享 |

---

## 4. 度量统计

| 指标 | 值 | 标准 | 评级 |
|------|-----|------|------|
| 文件行数 | 209 | < 800 | 合格 |
| 导入数量 | 22 | < 30 | 合格 |
| 路由数量 | 52 | — | — |
| 嵌套深度 | 最大 1 层 | < 4 | 合格 |
| 硬编码密钥 | 0 | 0 | 合格 |
| console.log | 0 | 0 | 合格 |

---

## 5. 改进建议优先级

| 优先级 | 编号 | 改进项 | 预估工作量 |
|--------|------|--------|------------|
| **P0** | H1 | 添加全局错误处理 + 404 fallback | 0.5h |
| **P0** | H2 | 配置 CORS 白名单 | 0.5h |
| P1 | M1 | API 版本前缀 | 2h（需同步改前端） |
| P1 | M2 | 路由拆分到 routes/ | 3h |
| P1 | M4 | uploads 安全加固 | 1h |
| P2 | M3 | Swagger 延迟初始化 | 0.5h |
| P2 | M5 | 显式设置请求体限制 | 0.2h |
| P3 | L1-L3 | 压缩/请求ID/健康检查 | 1h |

**总计预估工作量**: 约 8.7h

---

## 6. 结论

`app.ts` 作为 Express 应用入口，结构清晰、中间件链合理、角色权限控制到位。主要风险在于 **缺少全局错误处理**（可能导致错误栈泄露）和 **CORS 完全开放**（安全风险）。建议优先处理 H1 和 H2，然后逐步推进路由模块化拆分。
