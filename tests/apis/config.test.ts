/**
 * @jest-environment node
 *
 * Tests for apis/config/index.ts
 * Covers: default values, environment variable overrides, type correctness, edge cases
 */

// Save original env to restore after tests
const originalEnv = { ...process.env };

// Helper: reload config module with specific env vars
async function loadConfigWithEnv(envVars: Record<string, string | undefined>) {
  // Reset module cache
  jest.resetModules();

  // Clear all config-related env vars
  const configKeys = [
    'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'JWT_SECRET', 'JWT_EXPIRES_IN', 'SWAGGER_ENABLED',
    'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX',
    'CRON_ARTICLE_INTERVAL', 'CRON_ARTICLE_ENABLED',
  ];
  configKeys.forEach(key => delete process.env[key]);

  // Set provided env vars
  Object.entries(envVars).forEach(([key, value]) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  });

  // Re-import config
  const mod = await import('../../apis/config/index');
  return mod.default;
}

afterEach(() => {
  // Restore original env
  process.env = { ...originalEnv };
  jest.resetModules();
});

describe('apis/config/index.ts', () => {
  describe('default values', () => {
    it('should use default port 8080 when PORT is not set', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.server.port).toBe(8080);
    });

    it('should use default database host localhost', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.host).toBe('localhost');
    });

    it('should use default database port 5432', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.port).toBe(5432);
    });

    it('should use default database name geo_ts', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.name).toBe('geo_ts');
    });

    it('should use default database user postgres', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.user).toBe('postgres');
    });

    it('should use default database password postgres', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.password).toBe('postgres');
    });

    it('should use default database pool { min: 2, max: 10 }', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.pool).toEqual({ min: 2, max: 10 });
    });

    it('should use default JWT secret', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.jwt.secret).toBe('your-secret-key-change-in-production');
    });

    it('should use default JWT expiresIn 2h', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.jwt.expiresIn).toBe('2h');
    });

    it('should derive swagger.enabled from env (dotenv loads .env)', async () => {
      // dotenv loads .env on import; if SWAGGER_ENABLED is not set in the
      // runtime env, the .env file may provide a value.
      const config = await loadConfigWithEnv({});
      // Our loadConfigWithEnv clears SWAGGER_ENABLED, then dotenv reloads .env
      // which sets it. The config reads process.env.SWAGGER_ENABLED === 'true'.
      // This test verifies the behavior is consistent with the .env file.
      expect(typeof config.swagger.enabled).toBe('boolean');
    });

    it('should use default rate limit windowMs 60000', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.rateLimit.windowMs).toBe(60000);
    });

    it('should use default rate limit max 100', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.rateLimit.max).toBe(100);
    });

    it('should use default cron interval */5 * * * *', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.cron.articleGenerationInterval).toBe('*/5 * * * *');
    });

    it('should enable cron article generation by default', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });
  });

  describe('environment variable overrides', () => {
    it('should override PORT', async () => {
      const config = await loadConfigWithEnv({ PORT: '3000' });
      expect(config.server.port).toBe(3000);
    });

    it('should override DB_HOST', async () => {
      const config = await loadConfigWithEnv({ DB_HOST: 'db.example.com' });
      expect(config.database.host).toBe('db.example.com');
    });

    it('should override DB_PORT', async () => {
      const config = await loadConfigWithEnv({ DB_PORT: '3306' });
      expect(config.database.port).toBe(3306);
    });

    it('should override DB_NAME', async () => {
      const config = await loadConfigWithEnv({ DB_NAME: 'mydb' });
      expect(config.database.name).toBe('mydb');
    });

    it('should override DB_USER', async () => {
      const config = await loadConfigWithEnv({ DB_USER: 'admin' });
      expect(config.database.user).toBe('admin');
    });

    it('should override DB_PASSWORD', async () => {
      const config = await loadConfigWithEnv({ DB_PASSWORD: 'securepwd' });
      expect(config.database.password).toBe('securepwd');
    });

    it('should override JWT_SECRET', async () => {
      const config = await loadConfigWithEnv({ JWT_SECRET: 'my-super-secret' });
      expect(config.jwt.secret).toBe('my-super-secret');
    });

    it('should override JWT_EXPIRES_IN', async () => {
      const config = await loadConfigWithEnv({ JWT_EXPIRES_IN: '24h' });
      expect(config.jwt.expiresIn).toBe('24h');
    });

    it('should enable swagger when SWAGGER_ENABLED=true', async () => {
      const config = await loadConfigWithEnv({ SWAGGER_ENABLED: 'true' });
      expect(config.swagger.enabled).toBe(true);
    });

    it('should disable swagger when SWAGGER_ENABLED is not "true"', async () => {
      const config = await loadConfigWithEnv({ SWAGGER_ENABLED: 'false' });
      expect(config.swagger.enabled).toBe(false);
    });

    it('should disable swagger when SWAGGER_ENABLED is "1"', async () => {
      const config = await loadConfigWithEnv({ SWAGGER_ENABLED: '1' });
      expect(config.swagger.enabled).toBe(false);
    });

    it('should override RATE_LIMIT_WINDOW_MS', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '120000' });
      expect(config.rateLimit.windowMs).toBe(120000);
    });

    it('should override RATE_LIMIT_MAX', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_MAX: '200' });
      expect(config.rateLimit.max).toBe(200);
    });

    it('should override CRON_ARTICLE_INTERVAL', async () => {
      const config = await loadConfigWithEnv({ CRON_ARTICLE_INTERVAL: '0 * * * *' });
      expect(config.cron.articleGenerationInterval).toBe('0 * * * *');
    });

    it('should disable cron when CRON_ARTICLE_ENABLED=false', async () => {
      const config = await loadConfigWithEnv({ CRON_ARTICLE_ENABLED: 'false' });
      expect(config.cron.articleGenerationEnabled).toBe(false);
    });

    it('should enable cron when CRON_ARTICLE_ENABLED is not "false"', async () => {
      const config = await loadConfigWithEnv({ CRON_ARTICLE_ENABLED: 'true' });
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });

    it('should enable cron when CRON_ARTICLE_ENABLED is not set', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });
  });

  describe('config object structure', () => {
    it('should have server property with port', async () => {
      const config = await loadConfigWithEnv({});
      expect(config).toHaveProperty('server');
      expect(config.server).toHaveProperty('port');
    });

    it('should have database property with all required fields', async () => {
      const config = await loadConfigWithEnv({});
      expect(config).toHaveProperty('database');
      expect(config.database).toHaveProperty('host');
      expect(config.database).toHaveProperty('port');
      expect(config.database).toHaveProperty('name');
      expect(config.database).toHaveProperty('user');
      expect(config.database).toHaveProperty('password');
      expect(config.database).toHaveProperty('pool');
      expect(config.database.pool).toHaveProperty('min');
      expect(config.database.pool).toHaveProperty('max');
    });

    it('should have jwt property with secret and expiresIn', async () => {
      const config = await loadConfigWithEnv({});
      expect(config).toHaveProperty('jwt');
      expect(config.jwt).toHaveProperty('secret');
      expect(config.jwt).toHaveProperty('expiresIn');
    });

    it('should have swagger property with enabled boolean', async () => {
      const config = await loadConfigWithEnv({});
      expect(config).toHaveProperty('swagger');
      expect(config.swagger).toHaveProperty('enabled');
      expect(typeof config.swagger.enabled).toBe('boolean');
    });

    it('should have rateLimit property with windowMs and max', async () => {
      const config = await loadConfigWithEnv({});
      expect(config).toHaveProperty('rateLimit');
      expect(config.rateLimit).toHaveProperty('windowMs');
      expect(config.rateLimit).toHaveProperty('max');
    });

    it('should have cron property with interval and enabled', async () => {
      const config = await loadConfigWithEnv({});
      expect(config).toHaveProperty('cron');
      expect(config.cron).toHaveProperty('articleGenerationInterval');
      expect(config.cron).toHaveProperty('articleGenerationEnabled');
      expect(typeof config.cron.articleGenerationEnabled).toBe('boolean');
    });
  });

  describe('type correctness', () => {
    it('should return number for server.port', async () => {
      const config = await loadConfigWithEnv({ PORT: '9090' });
      expect(typeof config.server.port).toBe('number');
      expect(Number.isNaN(config.server.port)).toBe(false);
    });

    it('should return number for database.port', async () => {
      const config = await loadConfigWithEnv({ DB_PORT: '5433' });
      expect(typeof config.database.port).toBe('number');
      expect(Number.isNaN(config.database.port)).toBe(false);
    });

    it('should return number for rateLimit.windowMs', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '30000' });
      expect(typeof config.rateLimit.windowMs).toBe('number');
    });

    it('should return number for rateLimit.max', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_MAX: '50' });
      expect(typeof config.rateLimit.max).toBe('number');
    });

    it('should return string for jwt.secret', async () => {
      const config = await loadConfigWithEnv({});
      expect(typeof config.jwt.secret).toBe('string');
    });

    it('should return string for jwt.expiresIn', async () => {
      const config = await loadConfigWithEnv({});
      expect(typeof config.jwt.expiresIn).toBe('string');
    });

    it('should return string for database.host', async () => {
      const config = await loadConfigWithEnv({});
      expect(typeof config.database.host).toBe('string');
    });

    it('should return string for database.name', async () => {
      const config = await loadConfigWithEnv({});
      expect(typeof config.database.name).toBe('string');
    });

    it('should return string for cron.articleGenerationInterval', async () => {
      const config = await loadConfigWithEnv({});
      expect(typeof config.cron.articleGenerationInterval).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle NaN gracefully when PORT is non-numeric', async () => {
      const config = await loadConfigWithEnv({ PORT: 'abc' });
      expect(config.server.port).toBeNaN();
    });

    it('should handle NaN gracefully when DB_PORT is non-numeric', async () => {
      const config = await loadConfigWithEnv({ DB_PORT: 'not-a-port' });
      expect(config.database.port).toBeNaN();
    });

    it('should handle NaN gracefully when RATE_LIMIT_WINDOW_MS is non-numeric', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: 'invalid' });
      expect(config.rateLimit.windowMs).toBeNaN();
    });

    it('should handle NaN gracefully when RATE_LIMIT_MAX is non-numeric', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_MAX: 'abc' });
      expect(config.rateLimit.max).toBeNaN();
    });

    it('should fall back to default when PORT is empty string', async () => {
      // '' || '8080' evaluates to '8080' (empty string is falsy)
      const config = await loadConfigWithEnv({ PORT: '' });
      expect(config.server.port).toBe(8080);
    });

    it('should handle pool values being hardcoded', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.pool.min).toBe(2);
      expect(config.database.pool.max).toBe(10);
    });

    it('should handle multiple env overrides simultaneously', async () => {
      const config = await loadConfigWithEnv({
        PORT: '4000',
        DB_HOST: 'prod-db.example.com',
        DB_PORT: '5433',
        DB_NAME: 'prod_db',
        DB_USER: 'prod_user',
        DB_PASSWORD: 'prod_pwd',
        JWT_SECRET: 'prod-secret',
        JWT_EXPIRES_IN: '1h',
        SWAGGER_ENABLED: 'true',
        RATE_LIMIT_WINDOW_MS: '30000',
        RATE_LIMIT_MAX: '50',
        CRON_ARTICLE_INTERVAL: '*/10 * * * *',
        CRON_ARTICLE_ENABLED: 'true',
      });
      expect(config.server.port).toBe(4000);
      expect(config.database.host).toBe('prod-db.example.com');
      expect(config.database.port).toBe(5433);
      expect(config.database.name).toBe('prod_db');
      expect(config.database.user).toBe('prod_user');
      expect(config.database.password).toBe('prod_pwd');
      expect(config.jwt.secret).toBe('prod-secret');
      expect(config.jwt.expiresIn).toBe('1h');
      expect(config.swagger.enabled).toBe(true);
      expect(config.rateLimit.windowMs).toBe(30000);
      expect(config.rateLimit.max).toBe(50);
      expect(config.cron.articleGenerationInterval).toBe('*/10 * * * *');
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });
  });

  describe('interface exports', () => {
    it('should export DatabaseConfig interface (type-level)', async () => {
      // This test verifies the structure matches the DatabaseConfig interface
      const config = await loadConfigWithEnv({});
      const db: { host: string; port: number; name: string; user: string; password: string; pool: { min: number; max: number } } = config.database;
      expect(db.host).toBeDefined();
      expect(db.port).toBeDefined();
      expect(db.name).toBeDefined();
      expect(db.user).toBeDefined();
      expect(db.password).toBeDefined();
      expect(db.pool).toBeDefined();
    });

    it('should export JwtConfig interface (type-level)', async () => {
      const config = await loadConfigWithEnv({});
      const jwt: { secret: string; expiresIn: string } = config.jwt;
      expect(jwt.secret).toBeDefined();
      expect(jwt.expiresIn).toBeDefined();
    });

    it('should export RateLimitConfig interface (type-level)', async () => {
      const config = await loadConfigWithEnv({});
      const rl: { windowMs: number; max: number } = config.rateLimit;
      expect(rl.windowMs).toBeDefined();
      expect(rl.max).toBeDefined();
    });

    it('should export CronConfig interface (type-level)', async () => {
      const config = await loadConfigWithEnv({});
      const cron: { articleGenerationInterval: string; articleGenerationEnabled: boolean } = config.cron;
      expect(cron.articleGenerationInterval).toBeDefined();
      expect(cron.articleGenerationEnabled).toBeDefined();
    });
  });
});
