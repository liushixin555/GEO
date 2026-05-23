# apis/config/index.ts — 代码安全专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 代码安全专家
**文件路径**: `apis/config/index.ts`
**严重级别**: CRITICAL(2) / HIGH(4) / MEDIUM(3) / LOW(2)

---

## 一、安全评价总览

配置模块是应用安全的第一道防线，承载了 JWT 密钥、数据库凭据、CORS 白名单、速率限制参数等所有安全敏感配置。该模块被 6 个下游模块直接依赖，任何安全缺陷都会被放大到整个应用。

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 密钥管理 | 4/10 | 生产环境有强制校验，但默认密钥可预测且存在泄露路径 |
| 输入验证 | 3/10 | 环境变量无值域校验，parseInt 可产生 NaN |
| 信息泄露 | 5/10 | console.warn 暴露安全配置状态，错误消息包含配置键名 |
| CORS 安全 | 4/10 | 默认白名单硬编码，split 未过滤空值 |
| 速率限制 | 5/10 | 默认值合理但运行时可被无效值绕过 |
| 不可变性 | 2/10 | 配置对象可被任意消费者运行时篡改 |

---

## 二、安全问题清单

### CRITICAL-1: JWT 默认密钥 `'dev-only-secret-key'` 可预测，非生产环境仍有被利用风险

**位置**: 第 67 行
**CWE**: CWE-798 (Use of Hard-coded Credentials) / CWE-321 (Use of Hard-coded Cryptographic Key)
**问题**: 当 `JWT_SECRET` 环境变量未设置且 `NODE_ENV !== 'production'` 时，使用硬编码默认值 `'dev-only-secret-key'`。此默认值：

1. **出现在源码中**：任何有代码访问权限的人都能获取
2. **被 .env.example 引用**：`.env.example` 中写着 `JWT_SECRET=your-secret-key-change-in-production`，但开发者常忘记修改
3. **开发/测试环境同样危险**：如果开发环境暴露在网络上（如内网测试服务器），攻击者可用此密钥伪造任意 JWT token
4. **被 3 个安全关键模块消费**：`auth.middleware.ts:29`（验证 token）、`auth.service.impl.ts:77`（签发 token）、`auth.service.impl.ts:97`（验证 token）

```typescript
// 当前代码 — 第 59-68 行
secret: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is required in production');
  }
  if (!secret) {
    console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET in production.');  // 安全风险
  }
  return secret || 'dev-only-secret-key';  // 硬编码密钥
})(),
```

**攻击场景**:
```
攻击者获取源码 → 提取默认密钥 'dev-only-secret-key'
→ 使用该密钥签发伪造 JWT { role: 'sysadmin', userId: 1 }
→ 获取系统管理员权限
```

**修复建议**:
```typescript
secret: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 所有环境必须设置 JWT_SECRET，不提供默认值
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
  if (secret.length < 32) {
    console.error('WARNING: JWT_SECRET should be at least 32 characters for adequate security');
  }
  return secret;
})(),
```

---

### CRITICAL-2: 数据库密码默认值 `'postgres'` 可预测，非生产环境数据库可被直接访问

**位置**: 第 54 行
**CWE**: CWE-798 (Use of Hard-coded Credentials)
**问题**: 与 JWT 密钥问题类似，`DB_PASSWORD` 在非生产环境默认为 `'postgres'`——这是 PostgreSQL 最常见的默认密码。

结合 `.env.example` 中的 `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/geo_ts`，如果开发/测试环境的 PostgreSQL 暴露在网络上（如 Docker 网络配置不当），攻击者可以直接用 `postgres/postgres` 登录数据库。

```typescript
// 当前代码 — 第 49-55 行
password: (() => {
  const pwd = process.env.DB_PASSWORD;
  if (!pwd && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: DB_PASSWORD is required in production');
  }
  return pwd || 'postgres';  // 可预测的默认密码
})(),
```

**修复建议**:
```typescript
password: (() => {
  const pwd = process.env.DB_PASSWORD;
  if (!pwd) {
    throw new Error(
      'FATAL: DB_PASSWORD environment variable is required in all environments. ' +
      'Use DATABASE_URL or set DB_PASSWORD explicitly.'
    );
  }
  return pwd;
})(),
```

---

### HIGH-1: `console.warn` 输出泄露安全配置状态，违反安全日志原则

**位置**: 第 65 行
**CWE**: CWE-532 (Insertion of Sensitive Information into Log File)
**问题**: `console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET in production.')` 在日志中明文暴露了安全配置状态：

1. 任何能查看应用日志的人都能确认 JWT 使用了默认密钥
2. 在容器化部署中，stdout 日志通常被集中收集（如 ELK、CloudWatch），扩大了泄露范围
3. 日志搜索 `default JWT_SECRET` 可批量发现使用了默认密钥的实例

**修复建议**: 使用结构化日志记录到安全审计通道，不输出到 stdout：
```typescript
// 移除 console.warn，改为启动时强制校验
if (!secret) {
  throw new Error('JWT_SECRET is required');
}
```

---

### HIGH-2: `parseInt` 对非数字环境变量返回 `NaN`，可导致安全机制失效

**位置**: 第 42、46、75、76 行
**CWE**: CWE-20 (Improper Input Validation)
**问题**: 四处 `parseInt` 调用均未处理 `NaN` 结果：

```typescript
// 第 42 行 — 服务端口
port: parseInt(process.env.PORT || '8080', 10),  // PORT=abc → NaN

// 第 46 行 — 数据库端口
port: parseInt(process.env.DB_PORT || '5432', 10),  // DB_PORT=abc → NaN

// 第 75-76 行 — 速率限制
windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),  // NaN → 速率限制失效
max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),  // NaN → 速率限制失效
```

**安全影响**:
- `RATE_LIMIT_WINDOW_MS=NaN`：`rate-limit.middleware.ts` 中 `windowMs: NaN` 可能导致速率限制完全失效或行为异常
- `RATE_LIMIT_MAX=NaN`：`max: NaN` 同样可能绕过速率限制
- `PORT=NaN`：服务启动失败但错误信息不明确

**修复建议**:
```typescript
function safeParseInt(value: string | undefined, defaultValue: number, name: string): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`FATAL: ${name} must be a valid integer, got: "${value}"`);
  }
  return parsed;
}

// 使用
port: safeParseInt(process.env.RATE_LIMIT_WINDOW_MS, 60000, 'RATE_LIMIT_WINDOW_MS'),
max: safeParseInt(process.env.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
```

---

### HIGH-3: CORS 白名单 `split(',')` 未过滤空字符串，可导致开放跨域

**位置**: 第 82-84 行
**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)
**问题**: 当 `CORS_ORIGINS` 设置为 `,` 或 `http://localhost:5173,` 等带尾逗号的值时，`split(',')` 会产生空字符串元素：

```typescript
corsOrigins: process.env.CORS_ORIGINS
  ? process.env.CORSOrigins.split(',').map(s => s.trim())
  : ['http://localhost:5173'],

// CORS_ORIGINS="," → ['', ''] → 允许空 origin（等同于开放跨域）
// CORS_ORIGINS="http://localhost:5173," → ['http://localhost:5173', ''] → 同样问题
```

在 `app.ts:44` 中 `const allowed = config.corsOrigins` 被直接用于 CORS 中间件配置，空字符串可能被某些 CORS 实现匹配为任意 origin。

**修复建议**:
```typescript
corsOrigins: process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  : ['http://localhost:5173'],
```

---

### HIGH-4: 配置对象未冻结，JWT 密钥可被运行时篡改

**位置**: 第 40、87 行
**CWE**: CWE-374 (Passing Mutable Objects to an Untrusted Method)
**问题**: `const config` 仅保证引用不可重赋值，但对象属性（包括嵌套属性）可被任意消费者修改：

```typescript
// 任意消费模块中
import config from '../config';
config.jwt.secret = 'attacker-controlled-key';  // 编译通过，运行时生效
config.rateLimit.max = 999999;  // 绕过速率限制
config.corsOrigins.push('http://evil.com');  // 添加恶意域名
```

被影响的下游安全模块：
- `auth.middleware.ts:29` — `jwt.verify(token, config.jwt.secret)` 读到被篡改的密钥
- `rate-limit.middleware.ts:5-6` — 读到被篡改的速率限制参数
- `app.ts:44` — 读到被篡改的 CORS 白名单

**修复建议**:
```typescript
function deepFreeze<T extends object>(obj: T): Readonly<T> {
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object') deepFreeze(val as object);
  }
  return Object.freeze(obj);
}

const config: Readonly<AppConfig> = deepFreeze({ ... });
export default config;
```

---

### MEDIUM-1: `NODE_ENV` 作为唯一安全开关不够可靠

**位置**: 第 51、61 行
**CWE**: CWE-807 (Untrusted Inputs in Security Decisions)
**问题**: JWT 密钥和数据库密码的安全性完全依赖于 `NODE_ENV` 环境变量：
- `NODE_ENV` 可被意外设置为空、`undefined`、或拼写错误（如 `produciton`）
- 任何情况下 `NODE_ENV !== 'production'` 都会回退到默认值
- 部署工具（Docker、PM2）可能未正确设置 `NODE_ENV`

**修复建议**: 不依赖 `NODE_ENV` 作为安全开关，对所有环境强制要求安全配置：
```typescript
// 所有环境都必须设置敏感配置
if (!secret) {
  throw new Error('JWT_SECRET is required. Run: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
```

---

### MEDIUM-2: `.env.example` 中 `JWT_SECRET` 值过于模板化，缺少强度引导

**位置**: `.env.example` 第 9 行
**问题**: `.env.example` 中 `JWT_SECRET=your-secret-key-change-in-production` 给出的是弱密钥示例。开发者可能直接使用或仅做微调修改。此外 `.env.example` 中缺少 `DB_PASSWORD`、`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`CRON_ARTICLE_INTERVAL` 等配置项，与实际代码不一致。

**修复建议**:
```bash
# .env.example
JWT_SECRET=  # Required! Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
DB_PASSWORD=  # Required! Use a strong password
DB_HOST=localhost
DB_PORT=5432
CRON_ARTICLE_INTERVAL=*/5 * * * *
```

---

### MEDIUM-3: `dotenv.config()` 加载 `.env` 文件失败时静默忽略

**位置**: 第 4 行
**CWE**: CWE-754 (Improper Check for Unusual or Exceptional Conditions)
**问题**: `dotenv.config()` 在 `.env` 文件不存在时不会抛错，仅返回 `{ error: ... }`。这意味着：
- 如果 `.env` 文件被意外删除或从未创建，应用将使用所有默认值（包括可预测的密钥）
- 在生产环境，如果 `.env` 加载失败但 `NODE_ENV` 因配置管理工具未传递而不是 `production`，所有安全校验被绕过

**修复建议**:
```typescript
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (result.error && process.env.NODE_ENV !== 'production') {
  // 开发环境需要 .env 文件存在
  console.error('WARNING: .env file not found. Using environment variables only.');
}
```

---

### LOW-1: 连接池参数硬编码，无法针对不同环境做安全调优

**位置**: 第 56 行
**问题**: `pool: { min: 2, max: 10 }` 硬编码。在高并发场景下 `max: 10` 可能成为瓶颈，在资源受限环境（如共享测试服务器）中 `min: 2` 可能占用过多连接。从安全角度，过大的连接池可能被利用为 DoS 放大向量。

**修复建议**: 将 `DB_POOL_MIN` 和 `DB_POOL_MAX` 环境变量化，并添加范围校验。

---

### LOW-2: cron 表达式未在配置层校验，无效值导致定时任务静默失败

**位置**: 第 79 行
**问题**: `articleGenerationInterval` 接受任意字符串作为 cron 表达式，校验延迟到 `article-generation.scheduler.ts:19`。如果定时任务模块加载失败，无效的 cron 表达式不会被捕获。

从安全角度，如果定时任务涉及数据清理或权限刷新等操作，静默失败可能导致安全策略过期。

**修复建议**: 在配置解析阶段即使用 `cron.validate()` 校验。

---

## 三、攻击面分析

```
攻击向量                              影响                     难度
─────────────────────────────────────────────────────────────────
默认 JWT 密钥伪造 token          → 全系统 sysadmin 权限       低
默认 DB 密码直接连接数据库       → 数据泄露/篡改             低
NaN 速率限制绕过                 → 暴力破解/DoS             中
CORS 空字符串开放跨域            → CSRF/XSS 放大            中
运行时篡改 config.jwt.secret     → 任意 token 伪造           中
运行时篡改 config.rateLimit      → DoS 防护绕过              中
```

---

## 四、修复优先级

| 优先级   | 编号       | 修复建议                                       | 工作量 |
|----------|------------|------------------------------------------------|--------|
| CRITICAL | 1          | 移除 JWT 默认密钥，所有环境强制设置             | 5min   |
| CRITICAL | 2          | 移除 DB 默认密码，所有环境强制设置               | 5min   |
| HIGH     | 1          | 移除 console.warn，改为强制校验或结构化审计日志  | 5min   |
| HIGH     | 2          | 添加 safeParseInt 函数，防止 NaN 值              | 15min  |
| HIGH     | 3          | CORS split 后 filter 空字符串                   | 2min   |
| HIGH     | 4          | deepFreeze 配置对象                              | 10min  |
| MEDIUM   | 1          | 移除 NODE_ENV 条件判断，强制所有环境安全配置     | 10min  |
| MEDIUM   | 2          | 更新 .env.example，添加密钥强度引导             | 10min  |
| MEDIUM   | 3          | dotenv.config() 错误处理                         | 5min   |
| LOW      | 1          | 连接池参数环境变量化                             | 10min  |
| LOW      | 2          | cron 表达式配置层校验                            | 10min  |

---

## 五、评审结论

**结果**: **阻止 — 存在 2 个关键安全漏洞，必须在合并前修复**

核心安全问题：

1. **硬编码可预测密钥**（CRITICAL-1/2）— JWT 默认密钥 `'dev-only-secret-key'` 和数据库默认密码 `'postgres'` 出现在源码中，任何获取代码的人都能利用。这不仅是开发便利问题，而是 **CWE-798 级别的硬编码凭据漏洞**。
2. **安全机制可被运行时绕过**（HIGH-2/3/4）— `parseInt` 产生 NaN 可导致速率限制失效，CORS 白名单可被注入空值，配置对象可被篡改。

建议立即修复 2 个 CRITICAL + 4 个 HIGH 问题，总工作量约 40 分钟。MEDIUM 和 LOW 问题可在后续迭代中解决。
