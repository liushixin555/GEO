# 代码安全专家评审：apis/config/index.ts

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 2021 / CWE / SANS Top 25 / NIST SP 800-53）
**评审范围**: 应用配置模块 `apis/config/index.ts`（175 行）
**关联文件**: `.env`、`apis/app.ts`、`apis/server.ts`、`apis/middleware/auth.middleware.ts`、`apis/middleware/rate-limit.middleware.ts`
**前置评审**: 原始评审（`config-index.md`，8.5/10）、质量评审（`config-index.quality.md`，A-）、架构评审（`config-index.architecture.md`，APPROVE）

---

## 1. 安全总体评级：B+/8.4（安全基线良好，存在可加固项）

该配置模块在同类 Node.js 项目中安全实践**高于平均水平**。生产环境强制密钥、`deepFreeze` 防篡改、`safeParseInt` 输入校验、CORS 协议白名单、JWT 密钥强度警告——这些都是企业级安全实践的体现。

主要扣分点在于**硬编码默认凭证（CWE-798）**、**缺少关键配置项格式校验（CWE-20）**、以及**uploadDir 路径未做遍历防护（CWE-22）**。

| 安全域 | 评分 | 状态 | 关键发现 |
|--------|------|------|----------|
| 凭证管理（Credential Management） | 7/10 | ⚠️ | 硬编码默认密码 + 自动生成 JWT secret |
| 输入验证（Input Validation） | 7.5/10 | ⚠️ | 数值校验严谨，但字符串配置缺格式验证 |
| 数据保护（Data Protection） | 9/10 | ✅ | deepFreeze + Readonly 类型双重不可变保护 |
| 访问控制（Access Control） | 8.5/10 | ✅ | 生产环境强制 JWT_SECRET / DB_PASSWORD |
| 错误处理（Error Handling） | 8/10 | ✅ | FATAL 错误含变量名和值，便于排查 |
| 环境隔离（Environment Isolation） | 8/10 | ✅ | 生产/非生产行为明确分离 |
| 路径安全（Path Security） | 6/10 | ⚠️ | uploadDir 未做目录遍历校验 |
| 安全可观测性（Observability） | 8/10 | ✅ | 警告消息清晰，生产环境会快速暴露问题 |

---

## 2. 威胁建模（STRIDE 分析）

| 威胁类型 | 风险 | 攻击向量 |
|----------|------|----------|
| **S**poofing（欺骗） | 中 | 使用默认 DB_PASSWORD 'postgres' 连接数据库 |
| **T**ampering（篡改） | 低 | deepFreeze 防止运行时配置篡改；环境变量在进程级可被覆写 |
| **R**epudiation（抵赖） | 低 | 配置变更无审计日志（但配置在启动时一次性加载） |
| **I**nformation Disclosure（信息泄露） | 中 | console.error 输出包含安全机制描述；默认凭证存在于源码 |
| **D**enial of Service（拒绝服务） | 低 | 无效的 cron 表达式可能导致定时任务崩溃 |
| **E**levation of Privilege（提权） | 中 | JWT_SECRET 未设置时自动生成，但每次重启会话失效 |

---

## 3. 安全风险逐项评审

### SEC-CFG-01：硬编码默认数据库密码 — 🟠 HIGH

- **CWE**: CWE-798 (Use of Hard-coded Credentials)
- **OWASP**: A07:2021 – Identification and Authentication Failures
- **严重度**: 🟠 高
- **代码位置**: 第 13 行

```typescript
const DEFAULTS = {
  // ...
  DB_PASSWORD: 'postgres',  // ← 硬编码默认密码
} as const;
```

**问题描述**: `'postgres'` 是 PostgreSQL 最常见的默认密码之一，广泛出现在自动化攻击字典中。虽然非生产环境才使用此默认值（第 118-127 行有生产环境保护），但：
1. 源码中包含明文凭证，任何有权访问代码仓库的人都能看到
2. 如果部署时忘记设置 `DB_PASSWORD` 环境变量且 `NODE_ENV` 不为 `production`，将使用此弱密码
3. 在 staging/测试环境中，此默认密码可能与生产数据库使用相同凭据

**影响范围**: 非生产环境数据库可能被未授权访问

**缓解建议**:
```typescript
// 建议 1：启动时校验默认密码是否仍在使用
password: (() => {
  const pwd = process.env.DB_PASSWORD;
  if (!pwd && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: DB_PASSWORD is required in production');
  }
  if (!pwd) {
    if (process.env.NODE_ENV === 'test') {
      return 'test-only-password';  // 测试环境专用
    }
    throw new Error(
      'FATAL: DB_PASSWORD is required. ' +
      'Create a .env file with a strong password.'
    );  // 开发环境也要求显式设置
  }
  return pwd;
})(),

// 建议 2：将默认值移至 .env.example 文件，源码中不留凭证
```

**当前缓解**: 第 118-119 行生产环境强制检查 + 第 122-125 行 stderr 警告

**残余风险**: MEDIUM — 开发/staging 环境仍有风险

---

### SEC-CFG-02：JWT_SECRET 未设置时自动生成（会话持久性风险） — 🟡 MEDIUM

- **CWE**: CWE-330 (Use of Insufficiently Random Values) / CWE-613 (Insufficient Session Expiration)
- **严重度**: 🟡 中
- **代码位置**: 第 134-154 行

```typescript
secret: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is required in production');
  }
  if (!secret) {
    const generated = crypto.randomBytes(32).toString('hex');  // 64 hex chars = 256 bits
    console.error('WARNING: JWT_SECRET not set. Using auto-generated secret...');
    return generated;
  }
  // ...
})(),
```

**问题描述**:
1. **会话持久性风险**: `crypto.randomBytes(32)` 生成的密钥是密码学安全的（熵足够），但每次进程重启都会重新生成。这意味着服务器重启后，所有已签发的 JWT token 将失效，导致**批量用户登出**
2. **多实例不一致**: 在水平扩展场景下（PM2 cluster / Kubernetes 多 Pod），每个实例生成不同的 secret，导致同一用户的请求在不同实例间验证失败
3. **静默退化**: 使用 `console.error` 警告而非 `throw`，应用仍会正常启动。运维人员可能忽略 stderr 输出

**正面评价**: 生产环境强制检查（第 136-137 行）是正确的设计。`crypto.randomBytes` 熵足够。密钥长度 32 bytes（256 bits）远超安全要求。

**缓解建议**:
```typescript
// 建议：非生产环境也应要求显式设置，或改为 throw
if (!secret) {
  throw new Error(
    'FATAL: JWT_SECRET is required. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}
```

**残余风险**: LOW（生产环境已防护） — 非生产环境存在运维隐患

---

### SEC-CFG-03：JWT_EXPIRES_IN 缺少格式校验 — 🟡 MEDIUM

- **CWE**: CWE-20 (Improper Input Validation)
- **严重度**: 🟡 中
- **代码位置**: 第 155 行

```typescript
expiresIn: process.env.JWT_EXPIRES_IN || DEFAULTS.JWT_EXPIRES_IN,
```

**问题描述**: `JWT_EXPIRES_IN` 的值直接透传给 `jsonwebtoken` 库的 `sign()` 方法，未做格式校验。`jsonwebtoken` 支持以下格式：
- 字符串: `'2h'`, `'7d'`, `'60s'`, `'365d'`
- 数字: 秒数（如 `7200`）
- 如果传入无效值（如 `'forever'`、`'abc'`），将在运行时 JWT 签发时抛出异常

潜在攻击场景：
- 攻击者如果能修改环境变量（已获得服务器访问权），设置 `JWT_EXPIRES_IN=999999d`（约 2739 年）可使 token 永不过期

**缓解建议**:
```typescript
function validateTimeSpan(value: string, name: string): string {
  if (/^\d+$/.test(value)) return value;  // 纯数字（秒数）
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(value)) return value;  // ms/ms/s/h/d/w/y 格式
  throw new Error(
    `FATAL: ${name} must be a valid timespan (e.g., '2h', '7d', '3600'), got: "${value}"`
  );
}

// 使用
expiresIn: validateTimeSpan(
  process.env.JWT_EXPIRES_IN || DEFAULTS.JWT_EXPIRES_IN,
  'JWT_EXPIRES_IN'
),
```

**残余风险**: MEDIUM — 需要配合环境变量注入攻击才能利用

---

### SEC-CFG-04：CRON_ARTICLE_INTERVAL 缺少 cron 表达式格式校验 — 🟡 MEDIUM

- **CWE**: CWE-20 (Improper Input Validation)
- **严重度**: 🟡 中
- **代码位置**: 第 167 行

```typescript
articleGenerationInterval: process.env.CRON_ARTICLE_INTERVAL || DEFAULTS.CRON_ARTICLE_INTERVAL,
```

**问题描述**: `CRON_ARTICLE_INTERVAL` 的值直接透传给 `node-cron` 或 `cron` 库，未做 cron 表达式格式校验。无效的 cron 表达式可能导致：
1. 定时任务静默失败（某些库不抛错，只是不执行）
2. 意外的执行频率（如 `* * * * *` 每分钟执行 vs 预期的每 5 分钟）
3. 启动时不会暴露配置错误，问题在运行时才显现

**缓解建议**:
```typescript
import { validate as validateCron } from 'cron-validator';

// 或手动校验
function validateCronExpression(expr: string, name: string): string {
  // 标准 5 段 cron: 分 时 日 月 周
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `FATAL: ${name} must be a valid 5-field cron expression, got: "${expr}"`
    );
  }
  return expr;
}
```

**残余风险**: MEDIUM — 可能导致定时任务异常但不影响核心安全

---

### SEC-CFG-05：uploadDir 未做目录遍历防护 — 🟡 MEDIUM

- **CWE**: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory - 'Path Traversal')
- **严重度**: 🟡 中
- **代码位置**: 第 171 行

```typescript
uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
```

**问题描述**: `UPLOAD_DIR` 环境变量直接用于文件上传目录，未做路径安全校验：
1. 如果设置 `UPLOAD_DIR=/etc` 或 `UPLOAD_DIR=../../sensitive-dir`，上传的文件可能写入系统敏感目录
2. `path.resolve(process.cwd(), 'uploads')` 依赖 `process.cwd()`，如果工作目录被改变（如通过 PM2 `cwd` 配置），上传目录会意外变化
3. 未检查目标目录是否存在、是否有写权限

**影响范围**: 文件上传功能的所有消费者

**缓解建议**:
```typescript
uploadDir: (() => {
  const raw = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
  const resolved = path.resolve(raw);

  // 防止路径遍历
  if (resolved.includes('..')) {
    throw new Error('FATAL: UPLOAD_DIR must not contain path traversal sequences');
  }

  // 可选：限制在项目根目录下
  // const projectRoot = path.resolve(process.cwd());
  // if (!resolved.startsWith(projectRoot)) {
  //   throw new Error('FATAL: UPLOAD_DIR must be within project directory');
  // }

  return resolved;
})(),
```

**残余风险**: MEDIUM — 需要能控制环境变量才能利用，但在容器化部署中 `UPLOAD_DIR` 常通过环境变量注入

---

### SEC-CFG-06：dotenv.config() 模块级副作用 — 🟢 LOW

- **CWE**: CWE-672 (Operation on a Resource with Incompatible Type)
- **严重度**: 🟢 低
- **代码位置**: 第 5 行

```typescript
dotenv.config();
```

**问题描述**: `dotenv.config()` 在模块顶层执行（import-time side effect），有以下安全影响：
1. **不可控性**: 任何 `import config` 的模块都会触发 `.env` 文件加载，无法跳过或延迟
2. **测试隔离**: 测试中无法避免加载 `.env` 文件，可能导致测试环境意外使用生产配置
3. **`.env` 文件权限**: 如果 `.env` 文件权限过于宽松（如 `chmod 644`），其他系统用户可读取其中的密钥

**正面评价**: 这是 Node.js 生态的标准实践，`dotenv` 库本身已处理了文件不存在等边界情况。

**缓解建议**:
```typescript
// 建议：显式指定 .env 文件路径 + 权限检查
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const stat = fs.statSync(envPath);
  const mode = stat.mode & 0o777;
  if (process.env.NODE_ENV !== 'test' && mode & 0o004) {
    console.error(
      `WARNING: .env file is world-readable (mode: ${mode.toString(8)}). ` +
      'Run: chmod 600 .env'
    );
  }
}
dotenv.config({ path: envPath });
```

**残余风险**: LOW — 标准实践，风险主要在运维层面

---

### SEC-CFG-07：DB_POOL_MAX 无上限约束 — 🟢 LOW

- **CWE**: CWE-770 (Allocation of Resources Without Limits or Throttling)
- **严重度**: 🟢 低
- **代码位置**: 第 130 行

```typescript
max: safeParseInt(process.env.DB_POOL_MAX, DEFAULTS.DB_POOL_MAX, 'DB_POOL_MAX', { min: 1 }),
// 注意：没有 max 约束
```

**问题描述**: `DB_POOL_MAX` 只约束了最小值（`min: 1`），未约束最大值。如果设置 `DB_POOL_MAX=99999`，可能耗尽数据库连接资源，导致 DoS。

**缓解建议**:
```typescript
max: safeParseInt(process.env.DB_POOL_MAX, DEFAULTS.DB_POOL_MAX, 'DB_POOL_MAX', {
  min: 1,
  max: 100,  // PostgreSQL 默认 max_connections 通常为 100
}),
```

**残余风险**: LOW — 需要能控制环境变量

---

### SEC-CFG-08：错误消息泄露配置结构信息 — 🟢 LOW

- **CWE**: CWE-209 (Generation of Error Message Containing Sensitive Information)
- **严重度**: 🟢 低
- **代码位置**: 多处（第 66、70、73、96、102、119、137 行）

```typescript
throw new Error(`FATAL: ${name} must be a valid integer, got: "${value}"`);
throw new Error('FATAL: DB_PASSWORD is required in production');
throw new Error('FATAL: JWT_SECRET is required in production');
```

**问题描述**: 错误消息包含配置键名（如 `DB_PASSWORD`、`JWT_SECRET`）和用户输入值。如果错误日志被攻击者获取，可推断出：
1. 应用使用的配置键名（帮助构造针对性攻击）
2. 环境变量解析逻辑（了解哪些是必需的）
3. 值的格式要求（如整数范围）

**正面评价**: `safeParseInt` 的错误消息中 `${value}` 是环境变量值（非用户输入），泄露面有限。这些错误仅发生在启动时，且会导致进程退出，攻击者难以利用。

**残余风险**: LOW — 启动时错误，进程会退出

---

### SEC-CFG-09：CORS origin 格式校验不充分 — 🟢 LOW

- **CWE**: CWE-942 (Permissive Cross-domain Policy with Untrusted Domains)
- **严重度**: 🟢 低
- **代码位置**: 第 87-105 行

```typescript
function parseCorsOrigins(raw: string | undefined): string[] {
  // ...
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    throw new Error(`FATAL: CORS_ORIGINS each entry must start with http:// or https://, got: "${s}"`);
  }
  // ...
}
```

**问题描述**: 仅校验了协议前缀（`http://` / `https://`），未校验完整 URL 格式。以下畸形值可通过校验：
- `http://` （空 host）
- `http://@evil.com` （用户信息注入）
- `http://localhost:5173\x00.evil.com` （空字节注入，取决于 HTTP 库处理）

**正面评价**: 基本防护已到位，实际攻击场景有限。`cors` 中间件会做 origin 比对，即使配置了畸形值，也难以直接利用。

**残余风险**: LOW — 实际利用难度高

---

## 4. 安全亮点（值得保持的优秀实践）

### ✅ SEC-GOOD-01：生产环境强制安全检查

```typescript
// 第 118-119 行
if (!pwd && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: DB_PASSWORD is required in production');
}

// 第 136-137 行
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET is required in production');
}
```

**评价**: 生产环境对关键密钥做了强制检查，这是防止密钥遗漏的最后一道防线。`throw new Error` 使进程无法以不安全状态启动。

### ✅ SEC-GOOD-02：deepFreeze 递归不可变保护

```typescript
function deepFreeze<T extends object>(obj: T): Readonly<T> {
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object') deepFreeze(val as object);
  }
  return Object.freeze(obj);
}

const config: Readonly<AppConfig> = deepFreeze({ ... });
```

**评价**: 防止运行时配置篡改（如原型链污染后的 config 修改）。配合 TypeScript `Readonly<AppConfig>` 类型，编译期和运行时双重保护。这是防御内存篡改攻击的有效措施。

### ✅ SEC-GOOD-03：safeParseInt 带范围校验的数值解析

```typescript
function safeParseInt(
  value: string | undefined,
  defaultValue: number,
  name: string,
  opts?: { min?: number; max?: number }
): number {
  if (!value) return defaultValue;
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`FATAL: ${name} must be a valid integer, got: "${value}"`);
  }
  const parsed = parseInt(value, 10);
  // ... min/max bounds check
}
```

**评价**: 三重防护（空值回退 → NaN 检测 → 值域校验），错误消息包含变量名和实际值，启动失败时能精确定位问题。特别好的是使用正则 `/^-?\d+$/` 预检，避免 `parseInt('123abc')` 静默返回 123 的陷阱。

### ✅ SEC-GOOD-04：JWT 密钥强度警告

```typescript
if (secret.length < 32) {
  console.error(
    `WARNING: JWT_SECRET is only ${secret.length} characters. ` +
    'Recommend at least 32 characters for adequate security.'
  );
}
```

**评价**: 主动检查密钥长度并发出警告，帮助运维人员识别弱密钥。32 字符的建议长度对应 256 bits 熵，符合 OWASP 推荐。

### ✅ SEC-GOOD-05：CORS 协议白名单校验

```typescript
if (!s.startsWith('http://') && !s.startsWith('https://')) {
  throw new Error(
    `FATAL: CORS_ORIGINS each entry must start with http:// or https://, got: "${s}"`
  );
}
```

**评价**: 防止将 `file://`、`ftp://` 等非 HTTP 协议加入 CORS 白名单。空值过滤（`s.length === 0`）也防止了空字符串通过。

### ✅ SEC-GOOD-06：接口与实现的一致不可变声明

```typescript
export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  // ...
  readonly pool: { readonly min: number; readonly max: number };
}
```

**评价**: 所有接口属性使用 `readonly` 修饰符，与运行时 `deepFreeze` 形成双重防护。TypeScript 编译器会在尝试修改时报告错误。

---

## 5. 风险矩阵汇总

| 编号 | 发现 | 严重度 | CWE | 当前缓解 | 建议优先级 |
|------|------|--------|-----|---------|-----------|
| SEC-CFG-01 | 硬编码默认数据库密码 | 🟠 HIGH | CWE-798 | 生产环境强制检查 + stderr 警告 | P1 |
| SEC-CFG-02 | JWT_SECRET 自动生成（会话持久性） | 🟡 MEDIUM | CWE-330/613 | 仅非生产使用 + crypto.randomBytes | P2 |
| SEC-CFG-03 | JWT_EXPIRES_IN 缺格式校验 | 🟡 MEDIUM | CWE-20 | 默认值 '2h' 合理 | P2 |
| SEC-CFG-04 | CRON_ARTICLE_INTERVAL 缺格式校验 | 🟡 MEDIUM | CWE-20 | 默认值 '*/5 * * * *' 合理 | P3 |
| SEC-CFG-05 | uploadDir 未做目录遍历防护 | 🟡 MEDIUM | CWE-22 | path.resolve 规范化 | P2 |
| SEC-CFG-06 | dotenv.config() 模块级副作用 | 🟢 LOW | CWE-672 | 标准实践 | P4 |
| SEC-CFG-07 | DB_POOL_MAX 无上限约束 | 🟢 LOW | CWE-770 | min: 1 约束 | P4 |
| SEC-CFG-08 | 错误消息泄露配置结构 | 🟢 LOW | CWE-209 | 仅启动时输出 | P4 |
| SEC-CFG-09 | CORS origin 格式校验不充分 | 🟢 LOW | CWE-942 | 协议前缀校验 | P4 |

---

## 6. 修复优先级建议

### P1 — 立即修复（发布前）

**SEC-CFG-01**: 移除源码中的默认密码，要求所有环境显式设置 `DB_PASSWORD`：

```typescript
// 替换 DEFAULTS.DB_PASSWORD 为启动时强制检查
password: (() => {
  const pwd = process.env.DB_PASSWORD;
  if (!pwd) {
    throw new Error(
      'FATAL: DB_PASSWORD is required. Set it in your .env file.'
    );
  }
  return pwd;
})(),
```

### P2 — 下个迭代修复

**SEC-CFG-05**: 添加 uploadDir 路径安全校验（防目录遍历）。
**SEC-CFG-02**: 将 JWT_SECRET 自动生成改为 `throw`，要求显式设置。
**SEC-CFG-03**: 添加 `JWT_EXPIRES_IN` 时间格式校验函数。

### P3 — 计划修复

**SEC-CFG-04**: 添加 cron 表达式格式校验。

### P4 — 长期改进

**SEC-CFG-06~09**: dotenv 文件权限检查、连接池上限、错误消息脱敏、CORS URL 格式校验。

---

## 7. 安全合规对照

| 标准 | 控制项 | 状态 | 说明 |
|------|--------|------|------|
| OWASP A02:2021 | Cryptographic Failures | ✅ | crypto.randomBytes(32) 密码学安全随机数 |
| OWASP A04:2021 | Insecure Design | ⚠️ | 默认密码设计模式需改进 |
| OWASP A05:2021 | Security Misconfiguration | ✅ | 生产环境强制检查 + 合理默认值 |
| OWASP A07:2021 | Identification and Authentication Failures | ⚠️ | 硬编码默认凭证 |
| CWE-798 | Hard-coded Credentials | ⚠️ | DB_PASSWORD 默认值 |
| CWE-20 | Improper Input Validation | ⚠️ | 字符串配置缺格式校验 |
| CWE-22 | Path Traversal | ⚠️ | uploadDir 未校验 |
| CWE-330 | Insufficiently Random Values | ✅ | crypto.randomBytes 熵足够 |
| CWE-374 | Mutable State | ✅ | deepFreeze 防篡改 |
| CWE-770 | Allocation Without Limits | ⚠️ | DB_POOL_MAX 无上限 |
| NIST AC-2 | Account Management | ✅ | 生产环境强制密钥 |
| NIST CM-6 | Configuration Settings | ✅ | 环境变量驱动 + 合理默认值 |
| NIST SA-11 | Development Testing | ✅ | 114 个测试用例覆盖 |

---

## 8. 评审结论

**评审结果**: ✅ **有条件通过（Conditional Approve）**

该配置模块的安全基线高于同类项目平均水平。`deepFreeze` 防篡改、生产环境强制密钥、`safeParseInt` 输入校验、CORS 协议白名单等实践体现了良好的安全意识。6 个安全亮点值得保持。

**需在发布前修复**: SEC-CFG-01（硬编码默认密码）是唯一的 HIGH 级别发现，建议将默认密码替换为强制显式设置。

**可延后至下个迭代**: SEC-CFG-02~05 为 MEDIUM 级别，不影响核心安全但在成熟度提升时应逐步修复。

**综合安全评分**: **B+ / 8.4**（安全基线优秀，凭证管理和输入验证仍有加固空间）

---

## 9. 修复执行记录

**修复日期**: 2026-05-24
**修复人**: 软件开发专家
**修复范围**: P1~P2 安全加固（5 项修复）

### 9.1 已完成修复

| # | 编号 | 修复内容 | 状态 |
|---|------|----------|------|
| 1 | SEC-CFG-05 | uploadDir 添加路径遍历防护（`resolveUploadDir` 函数，拒绝含 `..` 的路径） | ✅ 已修复 |
| 2 | SEC-CFG-03 | JWT_EXPIRES_IN 添加格式校验（`validateTimeSpan` 函数，支持数字+ms/s/m/h/d/w/y） | ✅ 已修复 |
| 3 | SEC-CFG-04 | CRON_ARTICLE_INTERVAL 添加 5 段格式校验（`validateCronExpression` 函数） | ✅ 已修复 |
| 4 | SEC-CFG-07 | DB_POOL_MAX 添加 max: 100 上限约束 | ✅ 已修复 |
| 5 | A-04 | Swagger 配置封装环境约束（`SWAGGER_ENABLED === 'true' && NODE_ENV !== 'production'`） | ✅ 已修复 |

### 9.2 未修复项（维持原评审裁决）

| 编号 | 原因 |
|------|------|
| SEC-CFG-01 | Committer 决定保留开发便利性，生产环境已有 NODE_ENV 保护 |
| SEC-CFG-02 | Committer 决定保留随机生成机制，生产环境强制设置 |
| SEC-CFG-06 | dotenv 模块级副作用为标准实践 |
| SEC-CFG-08 | 错误消息仅启动时输出，进程会退出 |
| SEC-CFG-09 | CORS 协议校验已到位，实际利用难度高 |

### 9.3 测试验证

- 测试从 145 个增加到 166 个（+21 新增测试用例）
- 新增：JWT_EXPIRES_IN 格式校验×7、CRON 格式校验×4、uploadDir 路径安全×4、DB_POOL_MAX 上限×3、Swagger 环境约束×3
- 166 个测试全部通过
- TypeScript 编译通过
- 关联模块测试（auth 176 个、server 13 个）全部通过，无回归
