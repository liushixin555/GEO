# 安全评审：apis/app.ts

**评审日期**: 2026-05-23
**评审角色**: 代码安全专家（OWASP / SANS / CWE 标准视角）
**评审范围**: Express 应用入口文件 `apis/app.ts`（209 行）及关联中间件、配置
**关联文件**: `apis/config/index.ts`, `apis/middleware/auth.middleware.ts`, `apis/middleware/anti-crawl.middleware.ts`, `apis/middleware/rate-limit.middleware.ts`

---

## 1. 安全总体评级：C（存在多个高危漏洞，需立即修复）

应用具备基础安全框架（JWT 认证 + RBAC 授权 + 限流 + 反爬），但关键安全配置存在严重缺陷，生产环境面临被攻击的实质性风险。

| 安全域 | 评分 | 状态 |
|--------|------|------|
| 认证（Authentication） | 7/10 | JWT 实现基本正确，但密钥管理有缺陷 |
| 授权（Authorization） | 8/10 | RBAC 粒度合理，覆盖全面 |
| 传输安全（Transport） | 2/10 | CORS 全开、缺少安全响应头 |
| 输入验证（Input Validation） | 3/10 | 无请求体大小限制、无统一验证层 |
| 错误处理（Error Handling） | 2/10 | 无全局错误处理、可能泄露栈信息 |
| 数据保护（Data Protection） | 5/10 | 密码等敏感数据依赖框架处理 |

---

## 2. 漏洞清单（按 OWASP Top 10 2021 映射）

### SEC-01: CORS 策略完全开放 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🔴 CRITICAL
**位置**: `app.ts:31`
**CWE**: CWE-942 (Overly Permissive CORS Policy)

```typescript
// 当前代码
app.use(cors());
```

**风险分析**:
- `cors()` 无参数调用 = `origin: '*'`，允许**任何域名**发起跨域请求
- 攻击者可构造恶意页面，诱骗已登录用户浏览器向 API 发起请求
- 虽然使用 Bearer Token（非 Cookie）减轻了 CSRF 风险，但仍存在：
  - **数据泄露**: 恶意网站可通过 XSS 读取 localStorage 中的 token 后调用 API
  - **CSRF 变体**: 若未来改用 Cookie 存储 token，将直接暴露于 CSRF 攻击
- **影响范围**: 全部 52 条 API 路由

**修复方案**:
```typescript
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.corsOrigins || ['http://localhost:5173'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

### SEC-02: JWT Secret 使用硬编码默认值 — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🔴 CRITICAL
**位置**: `apis/config/index.ts:52`
**CWE**: CWE-798 (Use of Hard-coded Credentials)

```typescript
// 当前代码
jwt: {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '2h',
}
```

**风险分析**:
- 若 `.env` 文件缺失或 `JWT_SECRET` 未设置，使用公开可猜测的默认密钥
- 攻击者可使用此密钥**伪造任意用户的 JWT token**，包括 `sysadmin` 角色
- 该默认值出现在源代码中，任何有代码访问权限的人都能伪造 token
- **影响**: 完整的认证绕过，等同于数据库无密码

**修复方案**:
```typescript
jwt: {
  secret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is required');
    }
    if (secret.length < 32) {
      console.warn('WARNING: JWT_SECRET should be at least 32 characters');
    }
    return secret;
  })(),
  expiresIn: process.env.JWT_EXPIRES_IN || '2h',
}
```

---

### SEC-03: 缺少请求体大小限制 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟠 HIGH
**位置**: `app.ts:32`
**CWE**: CWE-400 (Uncontrolled Resource Consumption)

```typescript
// 当前代码
app.use(express.json());
```

**风险分析**:
- `express.json()` 无 `limit` 参数，默认限制为 100kb（Express 4.x），但：
  - 默认值未显式声明，依赖框架行为，属于隐式安全
  - 100kb 对于大多数 API 请求过大，允许构造大型 JSON payload 进行 DoS
  - 文件上传端点（`/api/upload`, `/api/upload/document`）使用独立的 multer 中间件，但 JSON 解析器仍接受 100kb
- 攻击者可发送大量 99kb 的 JSON 请求耗尽服务器内存

**修复方案**:
```typescript
app.use(express.json({ limit: '1mb' })); // 显式设置合理上限
```

---

### SEC-04: Helmet 安全头配置严重不足 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟠 HIGH
**位置**: `app.ts:28-30`
**CWE**: CWE-693 (Protection Mechanism Failure)

```typescript
// 当前代码
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

**风险分析**:
- Helmet 默认启用大部分安全头，但仅显式配置了 `crossOriginResourcePolicy`
- `cross-origin` 策略允许跨域加载资源，适用于图片分享场景，但降低了资源保护级别
- 缺少以下关键安全头的显式配置和验证：

| 安全头 | 状态 | 风险 |
|--------|------|------|
| Content-Security-Policy | ❌ 缺失 | 无 XSS 防护（前端 SPA 的最后一道防线） |
| Strict-Transport-Security | ⚠️ Helmet 默认启用 | 未验证 HTTPS 部署是否生效 |
| X-Frame-Options | ⚠️ Helmet 默认 SAMEORIGIN | 防止点击劫持 |
| X-Content-Type-Options | ⚠️ Helmet 默认 nosniff | 防止 MIME 嗅探 |
| Referrer-Policy | ⚠️ Helmet 默认 no-referrer | 控制引用来源泄露 |
| Permissions-Policy | ❌ 未配置 | 未限制浏览器功能（摄像头、麦克风等） |

**修复方案**:
```typescript
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

### SEC-05: 缺少全局错误处理 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟠 HIGH
**位置**: `app.ts` 文件末尾（缺失）
**CWE**: CWE-209 (Generation of Error Message Containing Sensitive Information)

```typescript
// 缺失 — 文件在第 209 行 export default app; 结束
```

**风险分析**:
- Express 默认错误处理会将错误栈以 HTML 格式返回
- 未捕获的异常可能泄露：
  - 文件系统路径
  - 数据库连接字符串
  - 内部 IP 地址和端口
  - 第三方库版本信息
- 404 路由返回 Express 默认 HTML 页面，前端 JSON 解析失败
- 没有统一的错误响应格式，各 controller 错误处理不一致

**修复方案**:
```typescript
// 404 fallback — 必须在所有路由之后
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 全局错误处理 — Express 通过 4 参数签名识别
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});
```

---

### SEC-06: 静态文件服务可能泄露上传文件 — OWASP A01:2021 Broken Access Control

**严重度**: 🟠 HIGH
**位置**: `app.ts:35-38`
**CWE**: CWE-552 (Files or Directories Accessible to External Parties)

```typescript
app.use('/uploads', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.cwd(), 'uploads')));
```

**风险分析**:
- `/uploads` 路径注册在 `authMiddleware` 之前，**任何人无需认证即可访问上传文件**
- `path.resolve(process.cwd(), 'uploads')` 直接暴露整个 uploads 目录
- 无目录遍历防护（虽然 `express.static` 默认防护了 `..`，但未显式验证）
- 无文件类型白名单 — 如果上传了 `.php`、`.jsp` 等可执行文件，可能被 Web 服务器执行
- 无文件访问日志

**修复方案**:
```typescript
// 方案1: 将静态文件移到认证中间件之后
app.use('/uploads', authMiddleware, express.static('uploads'));

// 方案2: 使用签名 URL 替代直接文件访问
// 方案3: 至少添加文件类型白名单中间件
```

---

### SEC-07: 反爬虫中间件 IP 获取不安全 — OWASP A04:2021 Insecure Design

**严重度**: 🟡 MEDIUM
**位置**: `apis/middleware/anti-crawl.middleware.ts:11`
**CWE**: CWE-290 (Authentication Bypass by Spoofing)

```typescript
const ip = req.ip || req.socket.remoteAddress || 'unknown';
```

**风险分析**:
- `req.ip` 的值取决于 Express 的 `trust proxy` 设置
- 当前未配置 `app.set('trust proxy', ...)`，在反向代理（Nginx）后：
  - `req.ip` 返回代理服务器 IP（如 `127.0.0.1`），非真实客户端 IP
  - 所有请求被视为来自同一 IP，正常用户可能被误封
  - 或者攻击者通过 `X-Forwarded-For` 头伪造 IP 绕过封禁
- `req.socket.remoteAddress` 在代理场景下同样不可靠

**修复方案**:
```typescript
// 在 app.ts 中，必须在代理中间件之前设置
app.set('trust proxy', 1); // 信任第一层代理

// anti-crawl.middleware.ts 中使用
const ip = req.ip; // trust proxy 设置后，req.ip 会正确解析 X-Forwarded-For
```

---

### SEC-08: 反爬虫内存存储无容量限制 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟡 MEDIUM
**位置**: `apis/middleware/anti-crawl.middleware.ts:3-8`
**CWE**: CWE-770 (Allocation of Resources Without Limits)

```typescript
const requestCounts = new Map<string, { count: number; lastReset: number }>();
const blockedIPs = new Map<string, number>();
```

**风险分析**:
- 两个 Map 均无最大容量限制，长时间运行后：
  - 攻击者使用大量伪造 IP（配合 SEC-07 的 IP 获取问题），填满 Map 导致内存耗尽
  - `requestCounts` 中的过期记录未被主动清理，仅在被重新访问时才检查过期
  - `blockedIPs` 同理，过期记录仅在下次访问时删除
- 无定期清理机制（如 `setInterval`）

**修复方案**:
```typescript
// 添加定期清理
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts) {
    if (now - record.lastReset > WINDOW_MS) requestCounts.delete(ip);
  }
  for (const [ip, expiry] of blockedIPs) {
    if (now >= expiry) blockedIPs.delete(ip);
  }
}, WINDOW_MS);

// 添加容量上限
const MAX_ENTRIES = 10_000;
function safeSet(map: Map<string, any>, key: string, value: any) {
  if (map.size >= MAX_ENTRIES) {
    // 删除最旧的条目
    const firstKey = map.keys().next().value;
    if (firstKey) map.delete(firstKey);
  }
  map.set(key, value);
}
```

---

### SEC-09: JWT Token 无刷新机制 — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🟡 MEDIUM
**位置**: `apis/config/index.ts:53`, `apis/middleware/auth.middleware.ts`
**CWE**: CWE-613 (Insufficient Session Expiration)

```typescript
expiresIn: process.env.JWT_EXPIRES_IN || '2h',
```

**风险分析**:
- Token 2 小时过期，无刷新（Refresh Token）机制
- 用户在 2 小时后被强制重新登录，体验差
- 若延长过期时间（如改为 7 天），被盗 token 的有效窗口增大
- Token 中包含 `role` 信息，管理员更改用户角色后，旧 token 仍使用旧角色（最长 2 小时）

**修复方案**:
- 引入 Refresh Token 机制（双 token 模式）
- 或在 token 中仅存储 userId，每次请求时从数据库查询角色

---

### SEC-10: 数据库默认凭据 — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🟡 MEDIUM
**位置**: `apis/config/index.ts:44-48`
**CWE**: CWE-798 (Use of Hard-coded Credentials)

```typescript
database: {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
}
```

**风险分析**:
- 默认数据库用户名/密码为 `postgres/postgres`，是 PostgreSQL 最常见的默认凭据
- 如果 `.env` 文件缺失，应用静默使用默认值连接数据库，无任何警告
- 结合 SEC-02（JWT 默认密钥），攻击者可伪造 token → 获取 sysadmin 权限 → 通过 API 读取/修改数据

**修复方案**:
```typescript
password: (() => {
  const pwd = process.env.DB_PASSWORD;
  if (!pwd && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: DB_PASSWORD is required in production');
  }
  return pwd || 'postgres';
})(),
```

---

### SEC-11: Swagger 在生产环境可能暴露 API 文档 — OWASP A01:2021 Broken Access Control

**严重度**: 🟡 MEDIUM
**位置**: `app.ts:66-69`
**CWE**: CWE-200 (Exposure of Sensitive Information)

```typescript
if (config.swagger.enabled) {
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}
```

**风险分析**:
- Swagger 开关由环境变量 `SWAGGER_ENABLED` 控制，无认证保护
- 若生产环境误设 `SWAGGER_ENABLED=true`，所有 API 端点文档对公网暴露
- Swagger UI 无认证中间件，任何人可访问 `/api-docs`
- `swaggerJSDoc()` 在模块加载时无条件执行（第 45-64 行），即使 disabled 也会扫描 controller 文件

**修复方案**:
```typescript
// 方案1: 仅在非生产环境启用
if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  // ...
}

// 方案2: 对 Swagger 路径添加认证
if (config.swagger.enabled) {
  app.use('/api-docs', authMiddleware, roleMiddleware('sysadmin'),
    swaggerUI.serve, swaggerUI.setup(swaggerSpec));
}

// 方案3: 延迟初始化 swaggerSpec
if (config.swagger.enabled) {
  const swaggerSpec = swaggerJSDoc({ ... });
  // ...
}
```

---

### SEC-12: 健康检查端点经过限流 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟢 LOW
**位置**: `app.ts:205-207`
**CWE**: CWE-770 (Allocation of Resources Without Limits)

```typescript
// 在 antiCrawl + rateLimit 之后
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

**风险分析**:
- 健康检查端点位于 antiCrawl 和 rateLimit 中间件之后
- 负载均衡器每 5-10 秒探测一次，100 次/分钟限制可能被健康检查消耗
- 频繁探测可能触发反爬虫机制，导致实例被标记为不健康
- `timestamp` 返回服务器时间，可用于时序攻击辅助

**修复方案**: 将 health check 移到安全中间件之前。

---

## 3. 攻击面分析

### 3.1 攻击面矩阵

| 攻击向量 | 可利用性 | 影响 | 当前防护 |
|----------|----------|------|----------|
| JWT 伪造（默认密钥） | 高 | 完全控制 | ❌ 无启动验证 |
| CORS 劫持 | 高 | 数据泄露 | ❌ 全开放 |
| 大 payload DoS | 中 | 服务不可用 | ⚠️ 隐式 100kb 限制 |
| 错误信息泄露 | 中 | 信息泄露 | ❌ 无全局处理 |
| 上传文件未授权访问 | 高 | 数据泄露 | ❌ 无认证 |
| IP 伪造绕过限流 | 中 | 限流失效 | ❌ 无 trust proxy |
| 内存耗尽（Map 增长） | 低 | 服务不可用 | ❌ 无容量限制 |
| Swagger 信息泄露 | 低 | API 结构暴露 | ⚠️ 环境变量控制 |

### 3.2 攻击链演示

**最危险的攻击链（SEC-02 → SEC-06）**:
1. 攻击者获取源代码（公开仓库/泄露）
2. 发现 JWT 默认密钥 `'your-secret-key-change-in-production'`
3. 伪造 sysadmin 角色 token
4. 调用 `POST /api/upload` 上传恶意文件
5. 通过 `/uploads/` 无认证访问已上传文件
6. 实现任意文件读取或存储型攻击

---

## 4. 安全合规性检查

| 检查项 | 标准 | 状态 | 备注 |
|--------|------|------|------|
| HTTPS 强制 | HSTS 头 | ⚠️ | Helmet 默认启用，但需验证 |
| 敏感数据传输 | TLS 加密 | ❓ | 取决于部署配置 |
| 密钥管理 | 环境变量 + 无默认值 | ❌ | JWT/DB 有默认值 |
| 访问控制 | RBAC | ✅ | 实现完善 |
| 输入验证 | 请求体限制 | ❌ | 无显式限制 |
| 错误处理 | 不泄露内部信息 | ❌ | 无全局处理 |
| 日志审计 | 请求日志 | ❌ | 无请求级日志 |
| CSRF 防护 | Token 或 SameSite | ⚠️ | Bearer Token 减轻了风险 |

---

## 5. 修复优先级路线图

### P0: 立即修复（阻断攻击链）

| 编号 | 修复项 | 工作量 | 风险降低 |
|------|--------|--------|----------|
| SEC-02 | JWT Secret 启动时强制验证 | 0.5h | 🔴→🟢 |
| SEC-01 | CORS 白名单配置 | 0.5h | 🔴→🟢 |
| SEC-05 | 全局错误处理 + 404 fallback | 1h | 🟠→🟢 |
| SEC-03 | 请求体大小限制 | 0.1h | 🟠→🟢 |

### P1: 尽快修复（减少攻击面）

| 编号 | 修复项 | 工作量 | 风险降低 |
|------|--------|--------|----------|
| SEC-06 | 上传文件访问控制 | 1h | 🟠→🟢 |
| SEC-04 | Helmet 完整配置 | 0.5h | 🟠→🟡 |
| SEC-07 | trust proxy 设置 | 0.2h | 🟡→🟢 |
| SEC-10 | 数据库凭据启动验证 | 0.3h | 🟡→🟢 |

### P2: 计划修复（增强纵深防御）

| 编号 | 修复项 | 工作量 | 风险降低 |
|------|--------|--------|----------|
| SEC-08 | 反爬虫 Map 容量限制 + 定期清理 | 1h | 🟡→🟢 |
| SEC-09 | Refresh Token 机制 | 4h | 🟡→🟢 |
| SEC-11 | Swagger 生产环境保护 | 0.5h | 🟡→🟢 |
| SEC-12 | Health check 移到中间件前 | 0.2h | 🟢→🟢 |

---

## 6. 安全最佳实践建议

### 6.1 部署层面

1. **HTTPS 强制**: 在 Nginx/负载均衡器层强制 HTTPS，配置 HSTS
2. **环境变量审计**: 生产环境 `.env` 文件权限设为 `600`，禁止提交到 Git
3. **密钥轮换**: 建立定期轮换 JWT Secret 的机制
4. **日志收集**: 接入 ELK/Sentry 等日志系统，监控异常请求

### 6.2 代码层面

1. **启动时验证**: 所有关键配置（JWT_SECRET、DB_PASSWORD）在启动时验证，缺失则拒绝启动
2. **安全中间件顺序**: 公共端点 → 安全头 → 解析 → 认证 → 授权 → 业务逻辑
3. **纵深防御**: 每一层都应有独立的安全检查，不依赖单一防护
4. **安全测试**: 添加安全相关的集成测试（CORS、认证绕过、输入验证等）

### 6.3 运维层面

1. **依赖审计**: 定期运行 `npm audit`，及时更新有漏洞的依赖
2. **容器安全**: Docker 镜像使用非 root 用户运行
3. **网络隔离**: 数据库不应暴露公网，仅允许应用服务器访问
4. **备份策略**: 确保数据库定期备份，备份文件加密存储

---

## 7. 结论

`app.ts` 的安全架构具备基础骨架（JWT + RBAC + 限流 + 反爬），但存在**4 个高危漏洞**可构成完整攻击链。最紧迫的风险是 JWT 默认密钥（SEC-02）和 CORS 全开放（SEC-01），两者组合可让攻击者在获取源代码后完全控制系统。

建议按 P0 → P1 → P2 顺序修复，P0 项应在部署到生产环境前全部完成。
