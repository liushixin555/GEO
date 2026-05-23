# apis/config/index.ts — 软件质量评审报告

**评审日期**: 2026-05-23
**评审角色**: 软件质量专家
**文件路径**: `apis/config/index.ts`
**严重级别**: CRITICAL(0) / HIGH(3) / MEDIUM(5) / LOW(2)

---

## 一、总体评价

配置模块结构清晰，使用 TypeScript 接口定义了完整的 `AppConfig` 类型，生产环境对关键密钥做了强制校验。但存在多处健壮性和安全性问题需要修复。

---

## 二、问题清单

### HIGH-1: `parseInt` 缺少 NaN 防护

**位置**: 第 42、47、75、76 行
**问题**: `parseInt(process.env.PORT || '8080', 10)` 等多处调用，当环境变量被设置为非数字字符串（如 `"abc"`）时，`parseInt` 返回 `NaN`，导致服务静默启动在无效端口上或产生不可预测行为。

```typescript
// 当前代码
port: parseInt(process.env.PORT || '8080', 10),

// 建议修复
port: (() => {
  const val = parseInt(process.env.PORT || '8080', 10);
  if (isNaN(val)) throw new Error('FATAL: PORT must be a number');
  return val;
})(),
```

**影响**: 服务可能以无效配置启动，运行时行为不可预测。

---

### HIGH-2: JWT_SECRET 开发默认值过于简单

**位置**: 第 67 行
**问题**: `"dev-only-secret-key"` 是一个极易被猜到的默认值。即使在开发环境中，如果开发者不慎以开发模式暴露服务到公网，攻击者可伪造任意 JWT。

```typescript
// 建议修复：开发环境也使用随机生成的密钥
secret: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is required in production');
  }
  if (!secret) {
    console.warn('WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET explicitly.');
    return `dev-${crypto.randomUUID()}`;
  }
  return secret;
})(),
```

**影响**: JWT 伪造风险。

---

### HIGH-3: CORS_ORIGINS 默认值硬编码 localhost

**位置**: 第 82-84 行
**问题**: 当 `CORS_ORIGINS` 未配置时，硬编码允许 `http://localhost:5173`。在生产环境若忘记配置，CORS 中间件会允许来自 localhost 的跨域请求，构成安全隐患。

```typescript
// 建议修复：生产环境必须显式配置
corsOrigins: (() => {
  const origins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : undefined;
  if (!origins || origins.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: CORS_ORIGINS is required in production');
    }
    return ['http://localhost:5173'];
  }
  return origins;
})(),
```

**影响**: 生产环境 CORS 配置缺失可能导致安全漏洞。

---

### MEDIUM-1: 端口号未校验有效范围

**位置**: 第 42、47 行
**问题**: `server.port` 和 `database.port` 未校验是否在有效端口范围（1-65535）内。

```typescript
// 建议修复：添加范围校验
if (val < 1 || val > 65535) throw new Error('FATAL: PORT must be between 1 and 65535');
```

**影响**: 无效端口导致运行时连接失败。

---

### MEDIUM-2: `console.warn` 用于生产代码

**位置**: 第 66 行
**问题**: 根据项目编码规范，禁止使用 `console.log`/`console.warn`，应使用正式的日志库。

**影响**: 不符合项目编码规范，日志不可管理。

---

### MEDIUM-3: Rate Limit 参数缺少合理性校验

**位置**: 第 74-77 行
**问题**: `windowMs` 和 `max` 未做下限校验。`windowMs=0` 或 `max=0` 会直接禁用限流，等于裸奔。

```typescript
// 建议修复
rateLimit: {
  windowMs: (() => {
    const val = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    if (isNaN(val) || val < 1000) throw new Error('FATAL: RATE_LIMIT_WINDOW_MS must be >= 1000');
    return val;
  })(),
  max: (() => {
    const val = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    if (isNaN(val) || val < 1) throw new Error('FATAL: RATE_LIMIT_MAX must be >= 1');
    return val;
  })(),
},
```

**影响**: 配置错误可能导致限流失效。

---

### MEDIUM-4: DB_PASSWORD 开发默认值不应使用真实密码

**位置**: 第 54 行
**问题**: `return pwd || 'postgres'` — 开发环境默认密码与用户名相同，容易形成不良习惯。

**影响**: 低安全风险，但不符合安全最佳实践。

---

### MEDIUM-5: 配置对象为顶层 `const` 但未标记 `as const` 或 `readonly`

**位置**: 第 40 行
**问题**: `config` 对象虽然声明为 `const`，但其属性仍然可变。配置应被视为不可变的运行时常量。

```typescript
// 建议修复
const config: Readonly<AppConfig> = { ... } as const;
// 或深冻结
function deepFreeze<T>(obj: T): Readonly<T> { ... }
```

**影响**: 配置意外被修改的风险。

---

### LOW-1: IIFE 模式重复多次

**位置**: 第 49-55、59-68 行
**问题**: 多处使用 `(() => { ... })()` IIFE 模式，可提取为通用辅助函数。

```typescript
function requireInProd(value: string | undefined, key: string, fallback: string): string {
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`FATAL: ${key} is required in production`);
  }
  return value || fallback;
}
```

**影响**: 代码可维护性。

---

### LOW-2: 缺少对 `cron` 配置表达式的格式校验

**位置**: 第 78-81 行
**问题**: `articleGenerationInterval` 接受任意字符串，未校验是否为合法的 cron 表达式。

**影响**: 无效 cron 表达式在运行时才会报错。

---

## 三、修复建议总结

| 优先级 | 编号 | 修复建议 |
|--------|------|----------|
| HIGH | 1 | 所有 `parseInt` 结果增加 `isNaN` 检查 |
| HIGH | 2 | JWT_SECRET 开发默认值改用随机生成 |
| HIGH | 3 | CORS_ORIGINS 生产环境强制要求配置 |
| MEDIUM | 1 | 端口号校验 1-65535 范围 |
| MEDIUM | 2 | `console.warn` 替换为日志库 |
| MEDIUM | 3 | Rate Limit 参数增加下限校验 |
| MEDIUM | 4 | DB_PASSWORD 开发默认值改为空字符串或提示 |
| MEDIUM | 5 | 配置对象添加 `Readonly` 深冻结 |
| LOW | 1 | 提取 IIFE 为通用辅助函数 |
| LOW | 2 | 添加 cron 表达式格式校验 |

---

## 四、评审结论

**结果**: **警告** — 存在 3 个 HIGH 级别问题，建议修复后再进入生产环境。核心风险是配置值缺乏类型安全的解析校验，以及生产环境对关键配置的强制要求不够严格。
