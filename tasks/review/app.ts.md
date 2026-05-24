# 安全评审：apis/app.ts（第二轮）

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 2021 / CWE / SANS 标准）
**评审范围**: Express 应用入口文件 `apis/app.ts`（239 行）及安全依赖链：中间件链、配置层、路由注册
**关联文件**: `apis/middleware/auth.middleware.ts`, `apis/middleware/anti-crawl.middleware.ts`, `apis/middleware/rate-limit.middleware.ts`, `apis/config/index.ts`, `apis/server.ts`
**前置评审**: 第一轮评审（2026-05-23，评级 C → 修复后 B+），参见 `tasks/review/app.md`

---

## 1. 安全总体评级：B（基础安全框架完善，纵深防御仍有缺口）

相较于第一轮评审（评级 C），`app.ts` 已完成 P0 全部修复和大部分 P1/P2 项，安全状况显著改善。当前代码具备完整的安全中间件链（trust proxy → health check → helmet → CORS 白名单 → body limit → anti-crawl → rate-limit → JWT auth → RBAC），但纵深防御层仍有提升空间。

| 安全域 | 第一轮评分 | 本轮评分 | 状态 |
|--------|-----------|---------|------|
| 认证（Authentication） | 7/10 | 8/10 | JWT 实现正确，密钥管理已修复 |
| 授权（Authorization） | 8/10 | 8/10 | RBAC 粒度合理，覆盖全面 |
| 传输安全（Transport） | 2/10 | 7/10 | CORS 白名单 + Helmet + trust proxy 已就位 |
| 输入验证（Input Validation） | 3/10 | 6/10 | Body limit 已设，但缺少请求级 schema 校验 |
| 错误处理（Error Handling） | 2/10 | 7/10 | 全局错误处理 + 404 fallback 已就位 |
| 数据保护（Data Protection） | 5/10 | 6/10 | 上传文件仍公开访问，CORS 绕过风险存在 |
| 可观测性（Observability） | —/10 | 3/10 | 无请求级日志、无安全事件审计 |
| 弹性（Resilience） | —/10 | 5/10 | 无请求超时、无优雅降级 |

---

## 2. 第一轮修复验证（12 项）

| 编号 | 修复内容 | 验证结果 | 当前代码位置 |
|------|----------|---------|-------------|
| SEC-01 | CORS 白名单 | ✅ 已修复，动态 origin 校验 | `app.ts:42-53` |
| SEC-02 | JWT Secret 强制验证 | ✅ 已修复，生产环境拒绝启动 | `config/index.ts` |
| SEC-03 | Body 大小限制 | ✅ 已修复，10mb 显式限制 | `app.ts:56` |
| SEC-04 | Helmet 安全头 | ✅ 已修复，`referrerPolicy` 增强 | `app.ts:36-39` |
| SEC-05 | 全局错误处理 | ✅ 已修复，404 + error handler | `app.ts:229-237` |
| SEC-06 | 上传文件认证 | ❌ 未修复，签名 URL 方案待设计 | `app.ts:59-62` |
| SEC-07 | trust proxy | ✅ 已修复 | `app.ts:28` |
| SEC-08 | 反爬虫内存限制 | ✅ 已修复，MAX_ENTRIES=10000 | `anti-crawl.middleware.ts` |
| SEC-09 | Refresh Token | ❌ 未修复，设计决策延后 | — |
| SEC-10 | 数据库凭据验证 | ✅ 已修复，生产环境拒绝启动 | `config/index.ts` |
| SEC-11 | Swagger 生产环境保护 | ✅ 已修复，双重检查 | `app.ts:90-93` |
| SEC-12 | Health check 位置 | ✅ 已修复，移至中间件前 | `app.ts:31-33` |

**修复率**: 10/12（83%），剩余 2 项为架构级变更，不阻塞合并。

---

## 3. 新发现漏洞清单（按 OWASP Top 10 2021 映射）

### SEC-2.01: 静态文件服务无认证 — OWASP A01:2021 Broken Access Control（延续）

**严重度**: 🔴 HIGH
**位置**: `app.ts:59-62`
**CWE**: CWE-284 (Improper Access Control)

```typescript
app.use('/uploads', (_req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.cwd(), 'uploads')));
```

**风险分析**:
- `/uploads` 路径注册于认证中间件之前，所有已上传文件（图片、文档）对公网公开可访问
- 攻击者无需认证即可枚举和下载所有上传内容，包含企业知识库文档、肖像图片等敏感资料
- `path.resolve(process.cwd(), 'uploads')` 依赖运行时工作目录，若部署路径变更可能指向错误目录
- 无上传文件类型白名单校验（在 controller 层实现但 app.ts 层无防护），恶意 HTML/SVG 文件可通过直接 URL 访问触发存储型 XSS

**影响**:
- 企业知识库文档泄露（商业机密风险）
- 用户肖像/图片泄露（隐私合规风险，违反 GDPR/PIPL）
- SVG 上传 → 直接 URL 访问 → 存储型 XSS

**修复方案**:
```typescript
// 方案 A: 签名 URL（推荐）
// 上传时生成带过期时间的签名 token，通过 Nginx X-Accel-Redirect 内部重定向验证
app.get('/uploads/:token/:filename', validateSignedUrl, serveUploadFile);

// 方案 B: 最小化 — 至少阻止目录列表和危险文件类型
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  dotfiles: 'deny',
  index: false,           // 禁止目录索引
  setHeaders: (res, filePath) => {
    // SVG/HTML 等危险类型强制 Content-Disposition: attachment
    const ext = path.extname(filePath).toLowerCase();
    if (['.svg', '.html', '.htm'].includes(ext)) {
      res.set('Content-Disposition', 'attachment');
      res.set('Content-Type', 'application/octet-stream');
    }
  },
}));
```

---

### SEC-2.02: CORS `!origin` 绕过 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟡 MEDIUM
**位置**: `app.ts:44-45`
**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)

```typescript
origin: (origin, callback) => {
  const allowed = config.corsOrigins;
  if (!origin || allowed.includes(origin)) {
    callback(null, true);
  }
```

**风险分析**:
- `!origin` 条件允许所有**无 Origin 头**的请求通过 CORS 检查
- 以下工具/场景不发 Origin 头：`curl`、`wget`、Postman、服务端请求、部分移动端 SDK
- 攻击者可通过省略 Origin 头绕过 CORS 策略，直接调用 API
- 虽然 Bearer Token 提供了第二层防护，但 CORS 应作为独立安全层运作
- 实际影响：恶意网站可通过 `fetch('https://api.example.com/api/users', { mode: 'no-cors' })` 发起请求，虽然浏览器 CORS 会阻止读取响应，但 **POST/PUT/DELETE 等变更操作仍可能成功**（取决于浏览器实现）

**修复方案**:
```typescript
origin: (origin, callback) => {
  const allowed = config.corsOrigins;
  // 仅允许有 Origin 头且在白名单内的请求
  // 服务端间调用（无 Origin）应使用 API Key 机制而非 CORS
  if (allowed.includes(origin || '')) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
},
```

**注意**: 移除 `!origin` 可能影响 Postman/curl 调试体验，建议仅在 `NODE_ENV=production` 时启用严格模式。

---

### SEC-2.03: CORS 错误未正确处理 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟡 MEDIUM
**位置**: `app.ts:48`
**CWE**: CWE-755 (Improper Handling of Exceptional Conditions)

```typescript
callback(new Error('Not allowed by CORS'));
```

**风险分析**:
- 当 origin 不在白名单时，`callback(new Error(...))` 会触发 Express 错误处理链
- 全局错误处理（`app.ts:234`）捕获后返回 `500` 状态码和通用错误消息
- CORS 拒绝应返回 `403` 而非 `500`，否则：
  1. 监控系统无法区分真实服务器错误和安全拦截
  2. 前端无法通过 HTTP 状态码判断是否为 CORS 问题
  3. 可能触发不必要的告警

**修复方案**:
```typescript
// 自定义 CORS 错误处理
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = config.corsOrigins;
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // 不传 Error，让 cors 模块返回 204 No Content
    }
  },
  // ...
};
```

或添加 CORS 专用错误处理中间件：
```typescript
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ code: 403, message: '跨域请求被拒绝' });
    return;
  }
  // ... 其他错误处理
});
```

---

### SEC-2.04: Swagger Spec 无条件生成 — OWASP A01:2021 Broken Access Control

**严重度**: 🟡 MEDIUM
**位置**: `app.ts:69-88`
**CWE**: CWE-200 (Exposure of Sensitive Information)

```typescript
// 第 69-88 行：swaggerJSDoc() 在模块加载时无条件执行
const swaggerSpec = swaggerJSDoc({
  definition: { ... },
  apis: ['./apis/controller/*.ts'],
});

// 第 90-93 行：仅 serving 有条件判断
if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
}
```

**风险分析**:
- `swaggerJSDoc()` 扫描所有 `controller/*.ts` 文件并解析 JSDoc 注释，在**任何环境**下都执行
- 虽然不暴露 HTTP 端点，但：
  1. 增加启动时间（文件 I/O + 正则解析）
  2. `swaggerSpec` 对象常驻内存，包含所有 API 端点定义
  3. 若后续代码意外导出 `swaggerSpec`（如用于测试），可能泄露 API 结构
- 生产环境不应持有 API 文档对象的内存引用

**修复方案**:
```typescript
let swaggerSpec: object | null = null;
if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  swaggerSpec = swaggerJSDoc({
    definition: { ... },
    apis: ['./apis/controller/*.ts'],
  });
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}
```

---

### SEC-2.05: 全局错误处理信息不足 — OWASP A09:2021 Security Logging and Monitoring Failures

**严重度**: 🟡 MEDIUM
**位置**: `app.ts:234-237`
**CWE**: CWE-778 (Insufficient Logging)

```typescript
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

**风险分析**:
- 错误日志仅记录 Error 对象本身，缺少请求上下文：
  - 无请求 URL、HTTP 方法
  - 无客户端 IP
  - 无触发用户 ID/角色
  - 无请求时间戳
- `console.error` 为同步阻塞 I/O，高并发下可能影响性能
- 无法将错误与具体请求关联，事件调查困难
- 无结构化日志格式，难以接入 ELK/Sentry 等监控系统

**修复方案**:
```typescript
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const errorContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.userId,
    userRole: req.user?.role,
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
  };
  console.error('[Unhandled Error]', JSON.stringify(errorContext));
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

---

### SEC-2.06: 缺少请求级安全审计日志 — OWASP A09:2021 Security Logging and Monitoring Failures

**严重度**: 🟡 MEDIUM
**位置**: 全局（缺失）
**CWE**: CWE-778 (Insufficient Logging)

**风险分析**:
- 当前应用**无请求级日志中间件**，无法回答以下安全审计问题：
  1. 谁在什么时间访问了什么资源？
  2. 认证失败发生在哪些 IP？
  3. 权限拒绝事件（403）的频率和来源？
  4. 异常请求模式（如突发大量 401/403）？
- 对安全事件的事后调查缺乏数据支撑
- 违反 OWASP ASVS 7.x（日志和监控）要求

**修复方案**:
```typescript
// 轻量级请求日志中间件（放在 authMiddleware 之后）
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.warn('[API]', req.method, req.originalUrl, res.statusCode,
        `${Date.now() - start}ms`,
        req.user?.userId || 'anonymous',
        req.ip);
    }
  });
  next();
});
```

---

### SEC-2.07: 缺少请求超时配置 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟢 LOW
**位置**: 全局（缺失）
**CWE**: CWE-400 (Uncontrolled Resource Consumption)

**风险分析**:
- 无服务端请求超时（`server.setTimeout`），慢查询或外部 API 调用（如 LLM 模型调用）可能长时间占用连接
- LLM 相关操作（文章生成、关键词挖掘）响应时间可达 30-60 秒，若无超时保护，恶意客户端可并发大量请求耗尽连接池
- Node.js 默认 HTTP 超时为 2 分钟，但 Express 不自动终止处理中的请求

**修复方案**:
```typescript
// server.ts 中
const server = app.listen(config.port);
server.timeout = 60_000;     // 60s 超时
server.keepAliveTimeout = 5_000;
```

或使用 `connect-timeout` 中间件对不同路由设置不同超时。

---

### SEC-2.08: 反爬虫 User-Agent 检查过弱 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟢 LOW
**位置**: `anti-crawl.middleware.ts:57-62`
**CWE**: CWE-807 (Reliance on Untrusted Inputs in a Security Decision)

```typescript
const ua = req.headers['user-agent'];
if (!ua || ua.length < 10) {
  res.status(403).json({ code: 403, message: '访问被拒绝' });
  return;
}
```

**风险分析**:
- 仅检查 User-Agent 长度 ≥ 10，任何包含 10+ 字符的字符串均可通过
- 常见爬虫（Scrapy、requests）默认携带合法 User-Agent，可轻松绕过
- `curl/7.88.1`（12 字符）即可通过检查
- 这提供了**零实际防护**，仅过滤了最基础的脚本攻击

**建议**: User-Agent 检查不应作为独立安全层，应与 rate-limit + IP 信誉 + 行为分析配合使用。当前实现的价值在于过滤低级自动化脚本，可接受但不应过度依赖。

---

### SEC-2.09: 认证错误消息区分度不足 — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🟢 LOW
**位置**: `auth.middleware.ts:23, 33`
**CWE**: CWE-204 (Observable Response Discrepancy)

```typescript
// Token 缺失
res.status(401).json({ code: 401, message: '未登录，请先登录' });
// Token 无效/过期
res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
```

**风险分析**:
- 两种不同的 401 消息允许攻击者区分"无 token"和"无效 token"
- 攻击者可利用此差异判断 token 格式是否正确，辅助 token 篡改攻击
- 虽然影响有限（JWT 签名验证无法绕过），但统一错误消息是安全最佳实践

**修复方案**: 统一两种场景的错误消息：
```typescript
res.status(401).json({ code: 401, message: '认证失败，请重新登录' });
```

---

### SEC-2.10: roleMiddleware 角色匹配未标准化 — OWASP A01:2021 Broken Access Control

**严重度**: 🟢 LOW
**位置**: `auth.middleware.ts:43`
**CWE**: CWE-863 (Incorrect Authorization)

```typescript
if (!allowedRoles.includes(req.user.role)) {
```

**风险分析**:
- 角色比较为**严格字符串匹配**（区分大小写）
- 若 JWT payload 中角色值大小写不一致（如 `Admin` vs `admin`），会导致权限拒绝
- 当前系统通过 `enum Role` 约束，实际风险较低，但缺乏防御性编程
- 建议添加大小写标准化：`req.user.role.toLowerCase()`

---

## 4. 攻击面分析（更新）

### 4.1 攻击面矩阵

| 攻击向量 | 可利用性 | 影响 | 当前防护 | 变更 |
|----------|----------|------|----------|------|
| JWT 伪造 | 低 | 完全控制 | ✅ 生产环境密钥强制 | ↑ 改善 |
| CORS 劫持 | 中 | 数据泄露 | ⚠️ 白名单但 `!origin` 绕过 | ↑ 部分改善 |
| 大 payload DoS | 低 | 服务不可用 | ✅ 10mb 显式限制 | ↑ 改善 |
| 错误信息泄露 | 低 | 信息泄露 | ✅ 全局错误处理 | ↑ 改善 |
| 上传文件未授权访问 | 高 | 数据泄露 | ❌ 无认证 | → 未变 |
| 静态文件存储型 XSS | 中 | 跨站脚本 | ❌ 无 Content-Type 强制 | 新发现 |
| CORS 绕过（无 Origin） | 中 | API 滥用 | ⚠️ Bearer Token 第二层 | 新发现 |
| Swagger 内存信息泄露 | 低 | API 结构暴露 | ⚠️ Spec 无条件生成 | 新发现 |
| 安全事件不可追踪 | 高 | 审计盲区 | ❌ 无请求日志 | 新发现 |

### 4.2 最危险攻击链（SEC-2.01 + SEC-2.02）

1. 攻击者使用 `curl`（无 Origin 头）绕过 CORS 检查
2. 尝试暴力枚举 `/uploads/` 目录下的文件名
3. 下载企业知识库文档、用户肖像等敏感资料
4. 若存在 SVG 上传，构造恶意 SVG 通过直接 URL 访问触发存储型 XSS

**缓解因素**: Bearer Token 保护了上传接口本身，攻击者无法上传文件，只能枚举已上传文件名。

---

## 5. 安全合规性检查（更新）

| 检查项 | 标准 | 第一轮 | 本轮 | 备注 |
|--------|------|--------|------|------|
| HTTPS 强制 | HSTS 头 | ⚠️ | ✅ | Helmet 默认启用 |
| CORS 策略 | 白名单 | ❌ | ✅ | 有 `!origin` 绕过 |
| 密钥管理 | 环境变量 | ❌ | ✅ | 生产环境强制 |
| 访问控制 | RBAC | ✅ | ✅ | — |
| 输入验证 | Body 限制 | ❌ | ✅ | 10mb |
| 错误处理 | 无泄露 | ❌ | ✅ | — |
| 日志审计 | 请求日志 | ❌ | ❌ | 仍无请求级日志 |
| 文件访问控制 | 认证/签名 | ❌ | ❌ | 签名 URL 待设计 |
| 请求超时 | 超时配置 | — | ❌ | 无超时保护 |
| Swagger 保护 | 非生产环境 | ⚠️ | ✅ | — |

---

## 6. 修复优先级路线图

### P0: 尽快修复（安全审计 + 攻击面缩减）

| 编号 | 修复项 | 工作量 | 风险降低 |
|------|--------|--------|----------|
| SEC-2.05 | 错误日志增加请求上下文 | 0.5h | 可观测性 ↑ |
| SEC-2.06 | 添加请求级安全审计日志 | 1h | 审计能力 ↑ |
| SEC-2.04 | Swagger Spec 条件生成 | 0.3h | 信息泄露 ↓ |

### P1: 计划修复（减少攻击面）

| 编号 | 修复项 | 工作量 | 风险降低 |
|------|--------|--------|----------|
| SEC-2.01 | 上传文件签名 URL / 危险类型拦截 | 4-8h | 🔴→🟢 |
| SEC-2.02 | CORS `!origin` 生产环境严格模式 | 0.5h | 🟡→🟢 |
| SEC-2.03 | CORS 错误返回 403 | 0.3h | 🟡→🟢 |

### P2: 增强防御（安全加固）

| 编号 | 修复项 | 工作量 | 风险降低 |
|------|--------|--------|----------|
| SEC-2.07 | 请求超时配置 | 0.5h | 弹性 ↑ |
| SEC-2.09 | 统一认证错误消息 | 0.1h | 🟢→🟢 |
| SEC-2.10 | 角色匹配标准化 | 0.2h | 🟢→🟢 |

---

## 7. 代码质量与安全实践评价

### 7.1 优点

1. **中间件顺序正确**: health check → helmet → CORS → body parser → static → anti-crawl → rate-limit → routes → 404 → error handler。每层职责清晰
2. **CORS 白名单配置完善**: 动态 origin 校验 + methods + headers 限制
3. **认证与授权分离**: `authMiddleware` 验证身份，`roleMiddleware` 验证权限，关注点分离良好
4. **生产环境保护**: JWT Secret、DB Password、Swagger 均有生产环境强制校验
5. **错误处理不泄露内部信息**: 统一返回通用 500 消息，无堆栈暴露
6. **trust proxy 配置**: 正确设置 `trust proxy: 1`，确保反向代理场景下 `req.ip` 准确

### 7.2 需改进

1. **文件应拆分**: 239 行中约 130 行为路由注册，建议将路由拆分到 `routes/` 目录，app.ts 仅保留中间件配置
2. **路由注册重复模式**: 每条路由都重复 `authMiddleware, roleMiddleware(...)` 调用，可使用路由分组简化：
   ```typescript
   const adminRouter = Router();
   adminRouter.use(authMiddleware, roleMiddleware('sysadmin', 'admin'));
   adminRouter.get('/projects', projectController.listProjects);
   // ...
   ```
3. **Magic number**: `express.json({ limit: '10mb' })` 中的 `10mb` 应提取为配置项

---

## 8. 结论

`app.ts` 自第一轮评审以来安全状况从 **C 提升至 B**。核心安全框架（认证、授权、传输安全、错误处理）已建立且实现正确。当前主要风险集中在：

1. **上传文件公开访问**（SEC-2.01）— 唯一剩余的高危项，但修复需要架构级变更（签名 URL）
2. **安全可观测性缺失**（SEC-2.05, SEC-2.06）— 无法进行有效的安全事件调查和审计
3. **CORS 细节问题**（SEC-2.02, SEC-2.03）— 不影响核心安全但有改进空间

建议按 P0 → P1 → P2 顺序推进，P0 项（安全审计能力）应在下个迭代内完成，P1 中的签名 URL 方案需要独立的架构设计。

**相比第一轮的关键进步**:
- 攻击链 "JWT 伪造 → CORS 全开 → 完全控制" 已被阻断
- 生产环境密钥管理已到位，消除了最高优先级风险
- 全局错误处理确保不会泄露内部信息
- 中间件链顺序经过安全考量，每层职责明确

**综合评级**: **B**（安全基础框架完善，纵深防御可进一步加强）
