import dotenv from 'dotenv';
import path from 'path';

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
  server: { port: number };
  database: DatabaseConfig;
  jwt: JwtConfig;
  swagger: { enabled: boolean };
  rateLimit: RateLimitConfig;
  cron: CronConfig;
  corsOrigins: string[];
}

const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '8080', 10),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'geo_ts',
    user: process.env.DB_USER || 'postgres',
    password: (() => {
      const pwd = process.env.DB_PASSWORD;
      if (!pwd && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: DB_PASSWORD is required in production');
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
        console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET in production.');
      }
      return secret || 'dev-only-secret-key';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  cron: {
    articleGenerationInterval: process.env.CRON_ARTICLE_INTERVAL || '*/5 * * * *',
    articleGenerationEnabled: process.env.CRON_ARTICLE_ENABLED !== 'false',
  },
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173'],
};

export default config;
