import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  pool: { min: number; max: number };
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface CronConfig {
  articleGenerationInterval: string;
  articleGenerationEnabled: boolean;
}

export interface AppConfig {
  readonly server: { readonly port: number };
  readonly database: DatabaseConfig;
  readonly jwt: JwtConfig;
  readonly swagger: { readonly enabled: boolean };
  readonly rateLimit: RateLimitConfig;
  readonly cron: CronConfig;
  readonly corsOrigins: readonly string[];
}

function safeParseInt(
  value: string | undefined,
  defaultValue: number,
  name: string,
  opts?: { min?: number; max?: number }
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`FATAL: ${name} must be a valid integer, got: "${value}"`);
  }
  if (opts?.min !== undefined && parsed < opts.min) {
    throw new Error(`FATAL: ${name} must be >= ${opts.min}, got: ${parsed}`);
  }
  if (opts?.max !== undefined && parsed > opts.max) {
    throw new Error(`FATAL: ${name} must be <= ${opts.max}, got: ${parsed}`);
  }
  return parsed;
}

function deepFreeze<T extends object>(obj: T): Readonly<T> {
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object') deepFreeze(val as object);
  }
  return Object.freeze(obj);
}

function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return ['http://localhost:5173'];
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
      return true;
    });
  if (origins.length === 0) {
    throw new Error('FATAL: CORS_ORIGINS must contain at least one valid origin');
  }
  return origins;
}

const config: Readonly<AppConfig> = deepFreeze({
  server: {
    port: safeParseInt(process.env.PORT, 8080, 'PORT', { min: 1, max: 65535 }),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: safeParseInt(process.env.DB_PORT, 5432, 'DB_PORT', { min: 1, max: 65535 }),
    name: process.env.DB_NAME || 'geo_ts',
    user: process.env.DB_USER || 'postgres',
    password: (() => {
      const pwd = process.env.DB_PASSWORD;
      if (!pwd && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: DB_PASSWORD is required in production');
      }
      if (!pwd) {
        console.error(
          'WARNING: Using default DB_PASSWORD. Set DB_PASSWORD explicitly for better security.'
        );
      }
      return pwd || 'postgres';
    })(),
    pool: { min: 2, max: 10 },
  },
  jwt: {
    secret: (() => {
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
      return secret;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
  rateLimit: {
    windowMs: safeParseInt(process.env.RATE_LIMIT_WINDOW_MS, 60000, 'RATE_LIMIT_WINDOW_MS', {
      min: 1,
    }),
    max: safeParseInt(process.env.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX', { min: 1 }),
  },
  cron: {
    articleGenerationInterval: process.env.CRON_ARTICLE_INTERVAL || '*/5 * * * *',
    articleGenerationEnabled: process.env.CRON_ARTICLE_ENABLED !== 'false',
  },
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
});

export default config;
