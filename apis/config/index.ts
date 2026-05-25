import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';

dotenv.config();

const DEFAULTS = {
  PORT: 8080,
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'geo_ts',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 10,
  JWT_EXPIRES_IN: '2h',
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX: 500,
  CRON_ARTICLE_INTERVAL: '*/5 * * * *',
  CORS_ORIGIN: 'http://localhost:5173',
  UPLOAD_IMAGE_MAX_SIZE: 10,
  UPLOAD_DOCUMENT_MAX_SIZE: 30,
  BODY_LIMIT_MB: 10,
} as const;

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
  readonly pool: { readonly min: number; readonly max: number };
}

export interface JwtConfig {
  readonly secret: string;
  readonly expiresIn: string;
}

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly max: number;
}

export interface CronConfig {
  readonly articleGenerationInterval: string;
  readonly articleGenerationEnabled: boolean;
}

export interface UploadConfig {
  readonly imageMaxSize: number;
  readonly documentMaxSize: number;
}

export interface AppConfig {
  readonly server: { readonly port: number; readonly trustProxy: number };
  readonly database: DatabaseConfig;
  readonly jwt: JwtConfig;
  readonly swagger: { readonly enabled: boolean };
  readonly rateLimit: RateLimitConfig;
  readonly cron: CronConfig;
  readonly corsOrigins: readonly string[];
  readonly uploadDir: string;
  readonly upload: UploadConfig;
  readonly bodyLimitMb: number;
}

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
  if (opts?.min !== undefined && parsed < opts.min) {
    throw new Error(`FATAL: ${name} must be >= ${opts.min}, got: ${parsed}`);
  }
  if (opts?.max !== undefined && parsed > opts.max) {
    throw new Error(`FATAL: ${name} must be <= ${opts.max}, got: ${parsed}`);
  }
  return parsed;
}

/** Recursively freezes plain objects and arrays. Not designed for Date, Map, Set, etc. */
function deepFreeze<T extends object>(obj: T): Readonly<T> {
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object') deepFreeze(val as object);
  }
  return Object.freeze(obj);
}

function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return [DEFAULTS.CORS_ORIGIN];
  const origins = raw
    .split(',')
    .map(s => s.trim())
    .filter(s => {
      if (s.length === 0) return false;
      if (!s.startsWith('http://') && !s.startsWith('https://')) {
        throw new Error(
          `FATAL: CORS_ORIGINS each entry must start with http:// or https://, got: "${s}"`
        );
      }
      // Extract hostname portion for validation
      const withoutProtocol = s.replace(/^https?:\/\//, '');
      const hostname = withoutProtocol.split('/')[0].split(':')[0];
      if (hostname.includes('*')) {
        throw new Error(
          `FATAL: CORS_ORIGINS must not contain wildcard (*), got: "${s}"`
        );
      }
      if (hostname === '0.0.0.0') {
        throw new Error(
          `FATAL: CORS_ORIGINS must not use 0.0.0.0, got: "${s}"`
        );
      }
      if (hostname.length === 0) {
        throw new Error(
          `FATAL: CORS_ORIGINS must have a valid hostname, got: "${s}"`
        );
      }
      return true;
    });
  if (origins.length === 0) {
    throw new Error('FATAL: CORS_ORIGINS must contain at least one valid origin');
  }
  return origins;
}

function validateTimeSpan(value: string, name: string): string {
  if (/^\d+$/.test(value)) return value;
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(value)) return value;
  throw new Error(
    `FATAL: ${name} must be a valid timespan (e.g., '2h', '7d', '3600'), got: "${value}"`
  );
}

function validateCronExpression(expr: string, name: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `FATAL: ${name} must be a valid 5-field cron expression, got: "${expr}"`
    );
  }
  return expr;
}

function resolvePassword(): string {
  const pwd = process.env.DB_PASSWORD;
  if (!pwd && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: DB_PASSWORD is required in production');
  }
  if (!pwd) {
    console.error(
      'WARNING: Using default DB_PASSWORD. Set DB_PASSWORD explicitly for better security.'
    );
  }
  return pwd || DEFAULTS.DB_PASSWORD;
}

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is required in production');
  }
  if (!secret) {
    const generated = crypto.randomBytes(32).toString('hex');
    console.error(
      'WARNING: JWT_SECRET not set. Using auto-generated secret (changes on restart). ' +
        'Generate a persistent one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
    return generated;
  }
  if (secret.length < 32) {
    console.error(
      `WARNING: JWT_SECRET is only ${secret.length} characters. ` +
        'Recommend at least 32 characters for adequate security.'
    );
  }
  return secret;
}

function resolveUploadDir(raw: string | undefined): string {
  if (raw) {
    if (raw.includes('..')) {
      throw new Error('FATAL: UPLOAD_DIR must not contain path traversal sequences (..)');
    }
    return path.resolve(raw);
  }
  // Default: resolve from project root via __dirname
  // Compiled: dist/apis/config/index.js → project root is ../../..
  return path.resolve(__dirname, '..', '..', '..', 'uploads');
}

const config: Readonly<AppConfig> = deepFreeze({
  server: {
    port: safeParseInt(process.env.PORT, DEFAULTS.PORT, 'PORT', { min: 1, max: 65535 }),
    trustProxy: safeParseInt(process.env.TRUST_PROXY, 1, 'TRUST_PROXY', { min: 0, max: 10 }),
  },
  /** Prisma 使用 DATABASE_URL 环境变量建立数据库连接，不读取 config.database。
   *  以下字段仅用于配置文档化、诊断日志和数据库连接信息展示（system-config 控制器）。
   *  修改 DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD 不会影响 Prisma 的实际连接行为。 */
  database: {
    host: process.env.DB_HOST || DEFAULTS.DB_HOST,
    port: safeParseInt(process.env.DB_PORT, DEFAULTS.DB_PORT, 'DB_PORT', { min: 1, max: 65535 }),
    name: process.env.DB_NAME || DEFAULTS.DB_NAME,
    user: process.env.DB_USER || DEFAULTS.DB_USER,
    password: resolvePassword(),
    pool: {
      min: safeParseInt(process.env.DB_POOL_MIN, DEFAULTS.DB_POOL_MIN, 'DB_POOL_MIN', { min: 0 }),
      max: safeParseInt(process.env.DB_POOL_MAX, DEFAULTS.DB_POOL_MAX, 'DB_POOL_MAX', { min: 1, max: 100 }),
    },
  },
  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: validateTimeSpan(process.env.JWT_EXPIRES_IN || DEFAULTS.JWT_EXPIRES_IN, 'JWT_EXPIRES_IN'),
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true' && process.env.NODE_ENV !== 'production',
  },
  rateLimit: {
    windowMs: safeParseInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULTS.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS', {
      min: 1,
    }),
    max: safeParseInt(process.env.RATE_LIMIT_MAX, DEFAULTS.RATE_LIMIT_MAX, 'RATE_LIMIT_MAX', { min: 1 }),
  },
  cron: {
    articleGenerationInterval: validateCronExpression(process.env.CRON_ARTICLE_INTERVAL || DEFAULTS.CRON_ARTICLE_INTERVAL, 'CRON_ARTICLE_INTERVAL'),
    articleGenerationEnabled: process.env.CRON_ARTICLE_ENABLED !== 'false',
  },
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  uploadDir: resolveUploadDir(process.env.UPLOAD_DIR),
  upload: {
    imageMaxSize: safeParseInt(process.env.UPLOAD_IMAGE_MAX_SIZE, DEFAULTS.UPLOAD_IMAGE_MAX_SIZE, 'UPLOAD_IMAGE_MAX_SIZE', { min: 1, max: 100 }) * 1024 * 1024,
    documentMaxSize: safeParseInt(process.env.UPLOAD_DOCUMENT_MAX_SIZE, DEFAULTS.UPLOAD_DOCUMENT_MAX_SIZE, 'UPLOAD_DOCUMENT_MAX_SIZE', { min: 1, max: 100 }) * 1024 * 1024,
  },
  bodyLimitMb: safeParseInt(process.env.BODY_LIMIT_MB, DEFAULTS.BODY_LIMIT_MB, 'BODY_LIMIT_MB', { min: 1, max: 100 }),
});

export default config;
