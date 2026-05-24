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
    'NODE_ENV',
    'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'DB_POOL_MIN', 'DB_POOL_MAX',
    'JWT_SECRET', 'JWT_EXPIRES_IN', 'SWAGGER_ENABLED',
    'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX',
    'CRON_ARTICLE_INTERVAL', 'CRON_ARTICLE_ENABLED', 'CORS_ORIGINS',
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

    it('should generate random JWT secret when not set (or use .env value)', async () => {
      const config = await loadConfigWithEnv({});
      expect(typeof config.jwt.secret).toBe('string');
      expect(config.jwt.secret.length).toBeGreaterThan(0);
    });

    it('should generate random JWT secret when explicitly cleared and .env absent', async () => {
      // Force random generation by providing a falsy JWT_SECRET
      // dotenv reloads .env, so we need to set it to override
      const config = await loadConfigWithEnv({ JWT_SECRET: '' });
      // Empty string is falsy, so random generation should kick in
      expect(typeof config.jwt.secret).toBe('string');
      expect(config.jwt.secret.length).toBeGreaterThan(0);
    });

    it('should generate 64-char hex JWT secret when not set', async () => {
      const config = await loadConfigWithEnv({ JWT_SECRET: '' });
      // crypto.randomBytes(32).toString('hex') → 64 hex chars
      expect(config.jwt.secret).toMatch(/^[0-9a-f]{64}$/);
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
    it('should throw when PORT is non-numeric', async () => {
      await expect(loadConfigWithEnv({ PORT: 'abc' })).rejects.toThrow(
        'FATAL: PORT must be a valid integer'
      );
    });

    it('should throw when DB_PORT is non-numeric', async () => {
      await expect(loadConfigWithEnv({ DB_PORT: 'not-a-port' })).rejects.toThrow(
        'FATAL: DB_PORT must be a valid integer'
      );
    });

    it('should throw when RATE_LIMIT_WINDOW_MS is non-numeric', async () => {
      await expect(loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: 'invalid' })).rejects.toThrow(
        'FATAL: RATE_LIMIT_WINDOW_MS must be a valid integer'
      );
    });

    it('should throw when RATE_LIMIT_MAX is non-numeric', async () => {
      await expect(loadConfigWithEnv({ RATE_LIMIT_MAX: 'abc' })).rejects.toThrow(
        'FATAL: RATE_LIMIT_MAX must be a valid integer'
      );
    });

    it('should throw when PORT is out of range (0)', async () => {
      await expect(loadConfigWithEnv({ PORT: '0' })).rejects.toThrow(
        'FATAL: PORT must be >= 1'
      );
    });

    it('should throw when PORT is out of range (70000)', async () => {
      await expect(loadConfigWithEnv({ PORT: '70000' })).rejects.toThrow(
        'FATAL: PORT must be <= 65535'
      );
    });

    it('should throw when RATE_LIMIT_MAX is zero', async () => {
      await expect(loadConfigWithEnv({ RATE_LIMIT_MAX: '0' })).rejects.toThrow(
        'FATAL: RATE_LIMIT_MAX must be >= 1'
      );
    });

    it('should fall back to default when PORT is empty string', async () => {
      // '' || '8080' evaluates to '8080' (empty string is falsy)
      const config = await loadConfigWithEnv({ PORT: '' });
      expect(config.server.port).toBe(8080);
    });

    it('should use default pool values when env vars not set', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.database.pool.min).toBe(2);
      expect(config.database.pool.max).toBe(10);
    });

    it('should override DB_POOL_MIN via env var', async () => {
      const config = await loadConfigWithEnv({ DB_POOL_MIN: '5' });
      expect(config.database.pool.min).toBe(5);
    });

    it('should override DB_POOL_MAX via env var', async () => {
      const config = await loadConfigWithEnv({ DB_POOL_MAX: '20' });
      expect(config.database.pool.max).toBe(20);
    });

    it('should throw when DB_POOL_MAX is zero', async () => {
      await expect(loadConfigWithEnv({ DB_POOL_MAX: '0' })).rejects.toThrow(
        'FATAL: DB_POOL_MAX must be >= 1'
      );
    });

    it('should allow DB_POOL_MIN to be zero', async () => {
      const config = await loadConfigWithEnv({ DB_POOL_MIN: '0' });
      expect(config.database.pool.min).toBe(0);
    });

    it('should throw when DB_PORT is out of range (0)', async () => {
      await expect(loadConfigWithEnv({ DB_PORT: '0' })).rejects.toThrow(
        'FATAL: DB_PORT must be >= 1'
      );
    });

    it('should throw when DB_PORT is out of range (70000)', async () => {
      await expect(loadConfigWithEnv({ DB_PORT: '70000' })).rejects.toThrow(
        'FATAL: DB_PORT must be <= 65535'
      );
    });

    it('should throw when RATE_LIMIT_WINDOW_MS is zero', async () => {
      await expect(loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '0' })).rejects.toThrow(
        'FATAL: RATE_LIMIT_WINDOW_MS must be >= 1'
      );
    });

    it('should throw when RATE_LIMIT_MAX is negative', async () => {
      await expect(loadConfigWithEnv({ RATE_LIMIT_MAX: '-5' })).rejects.toThrow(
        'FATAL: RATE_LIMIT_MAX must be >= 1'
      );
    });

    it('should throw when PORT is negative', async () => {
      await expect(loadConfigWithEnv({ PORT: '-1' })).rejects.toThrow(
        'FATAL: PORT must be >= 1'
      );
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

  describe('CORS origins', () => {
    it('should default to localhost:5173 when CORS_ORIGINS is not set', async () => {
      const config = await loadConfigWithEnv({});
      expect(config.corsOrigins).toEqual(['http://localhost:5173']);
    });

    it('should parse comma-separated CORS_ORIGINS', async () => {
      const config = await loadConfigWithEnv({
        CORS_ORIGINS: 'http://localhost:3000,https://example.com',
      });
      expect(config.corsOrigins).toEqual(['http://localhost:3000', 'https://example.com']);
    });

    it('should filter out empty strings from CORS_ORIGINS', async () => {
      const config = await loadConfigWithEnv({
        CORS_ORIGINS: 'http://localhost:3000,,https://example.com,',
      });
      expect(config.corsOrigins).toEqual(['http://localhost:3000', 'https://example.com']);
    });

    it('should throw when CORS_ORIGINS contains invalid URL', async () => {
      await expect(
        loadConfigWithEnv({ CORS_ORIGINS: 'http://localhost:3000,ftp://bad.com' })
      ).rejects.toThrow('must start with http:// or https://');
    });

    it('should throw when CORS_ORIGINS is only commas', async () => {
      await expect(loadConfigWithEnv({ CORS_ORIGINS: ',,,' })).rejects.toThrow(
        'FATAL: CORS_ORIGINS must contain at least one valid origin'
      );
    });

    it('should trim spaces around CORS origins', async () => {
      const config = await loadConfigWithEnv({
        CORS_ORIGINS: '  http://localhost:3000  ,  https://example.com  ',
      });
      expect(config.corsOrigins).toEqual(['http://localhost:3000', 'https://example.com']);
    });

    it('should handle single CORS origin', async () => {
      const config = await loadConfigWithEnv({
        CORS_ORIGINS: 'https://myapp.com',
      });
      expect(config.corsOrigins).toEqual(['https://myapp.com']);
    });
  });

  describe('config immutability (deepFreeze)', () => {
    it('should prevent modification of top-level config properties', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config as Record<string, unknown>).server = { port: 9999 };
      }).toThrow();
    });

    it('should prevent modification of nested config properties', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config.jwt as any).secret = 'hacked';
      }).toThrow();
    });

    it('should prevent pushing to corsOrigins array', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config.corsOrigins as string[]).push('http://evil.com');
      }).toThrow();
    });

    it('should prevent modification of database.pool', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config.database.pool as { min: number; max: number }).min = 99;
      }).toThrow();
    });

    it('should prevent modification of rateLimit properties', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config.rateLimit as { windowMs: number; max: number }).max = 9999;
      }).toThrow();
    });
  });

  describe('production environment', () => {
    it('should throw in production when DB_PASSWORD is not set', async () => {
      await expect(
        loadConfigWithEnv({ NODE_ENV: 'production' })
      ).rejects.toThrow('FATAL: DB_PASSWORD is required in production');
    });

    it('should throw in production when JWT_SECRET is not set', async () => {
      // DB_PASSWORD must be set first to reach JWT_SECRET check
      await expect(
        loadConfigWithEnv({ NODE_ENV: 'production', DB_PASSWORD: 'prod-pwd', JWT_SECRET: '' })
      ).rejects.toThrow('FATAL: JWT_SECRET is required in production');
    });

    it('should not throw in production when both DB_PASSWORD and JWT_SECRET are set', async () => {
      const config = await loadConfigWithEnv({
        NODE_ENV: 'production',
        DB_PASSWORD: 'prod-pwd',
        JWT_SECRET: 'prod-secret-key',
      });
      expect(config.database.password).toBe('prod-pwd');
      expect(config.jwt.secret).toBe('prod-secret-key');
    });
  });

  describe('safeParseInt boundary values', () => {
    it('should accept PORT=1 (minimum valid port)', async () => {
      const config = await loadConfigWithEnv({ PORT: '1' });
      expect(config.server.port).toBe(1);
    });

    it('should accept PORT=65535 (maximum valid port)', async () => {
      const config = await loadConfigWithEnv({ PORT: '65535' });
      expect(config.server.port).toBe(65535);
    });

    it('should accept DB_PORT=1 (minimum valid)', async () => {
      const config = await loadConfigWithEnv({ DB_PORT: '1' });
      expect(config.database.port).toBe(1);
    });

    it('should accept DB_PORT=65535 (maximum valid)', async () => {
      const config = await loadConfigWithEnv({ DB_PORT: '65535' });
      expect(config.database.port).toBe(65535);
    });

    it('should throw when PORT is a float string', async () => {
      await expect(loadConfigWithEnv({ PORT: '8080.9' })).rejects.toThrow(
        'FATAL: PORT must be a valid integer'
      );
    });

    it('should accept very large RATE_LIMIT_WINDOW_MS (no max constraint)', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '999999999' });
      expect(config.rateLimit.windowMs).toBe(999999999);
    });

    it('should throw when RATE_LIMIT_WINDOW_MS is negative', async () => {
      await expect(loadConfigWithEnv({ RATE_LIMIT_WINDOW_MS: '-100' })).rejects.toThrow(
        'FATAL: RATE_LIMIT_WINDOW_MS must be >= 1'
      );
    });

    it('should accept RATE_LIMIT_MAX=1 (minimum valid)', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_MAX: '1' });
      expect(config.rateLimit.max).toBe(1);
    });

    it('should accept RATE_LIMIT_MAX with very large value', async () => {
      const config = await loadConfigWithEnv({ RATE_LIMIT_MAX: '10000' });
      expect(config.rateLimit.max).toBe(10000);
    });
  });

  describe('console warnings', () => {
    it('should warn when DB_PASSWORD is not set in non-production', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await loadConfigWithEnv({ DB_PASSWORD: '' });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Using default DB_PASSWORD')
      );
      spy.mockRestore();
    });

    it('should warn when JWT_SECRET is not set in non-production', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await loadConfigWithEnv({ JWT_SECRET: '' });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET not set')
      );
      spy.mockRestore();
    });

    it('should not warn when DB_PASSWORD is explicitly set', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await loadConfigWithEnv({ DB_PASSWORD: 'my-password' });
      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining('Using default DB_PASSWORD')
      );
      spy.mockRestore();
    });

    it('should not warn when JWT_SECRET is explicitly set', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await loadConfigWithEnv({ JWT_SECRET: 'my-secret' });
      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET not set')
      );
      spy.mockRestore();
    });

    it('should warn when JWT_SECRET is set but shorter than 32 characters', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await loadConfigWithEnv({ JWT_SECRET: 'short-key' });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET is only 9 characters')
      );
      spy.mockRestore();
    });

    it('should not warn when JWT_SECRET is at least 32 characters', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      await loadConfigWithEnv({ JWT_SECRET: 'a-very-long-secret-key-that-is-more-than-32-chars' });
      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET is only')
      );
      spy.mockRestore();
    });
  });

  describe('deepFreeze additional tests', () => {
    it('should prevent modification of server.port directly', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config.server as { port: number }).port = 9999;
      }).toThrow();
    });

    it('should prevent modification of cron properties', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config.cron as { articleGenerationInterval: string }).articleGenerationInterval = '0 0 * * *';
      }).toThrow();
    });

    it('should prevent modification of swagger.enabled', async () => {
      const config = await loadConfigWithEnv({});
      expect(() => {
        (config.swagger as { enabled: boolean }).enabled = true;
      }).toThrow();
    });

    it('should preserve Object.keys on frozen config', async () => {
      const config = await loadConfigWithEnv({});
      const keys = Object.keys(config);
      expect(keys).toContain('server');
      expect(keys).toContain('database');
      expect(keys).toContain('jwt');
      expect(keys).toContain('swagger');
      expect(keys).toContain('rateLimit');
      expect(keys).toContain('cron');
      expect(keys).toContain('corsOrigins');
    });
  });

  describe('parseCorsOrigins additional edge cases', () => {
    it('should throw when CORS_ORIGINS entry has no protocol (plain hostname)', async () => {
      await expect(
        loadConfigWithEnv({ CORS_ORIGINS: 'www.example.com' })
      ).rejects.toThrow('must start with http:// or https://');
    });

    it('should throw when CORS_ORIGINS entry starts with just //', async () => {
      await expect(
        loadConfigWithEnv({ CORS_ORIGINS: '//example.com' })
      ).rejects.toThrow('must start with http:// or https://');
    });

    it('should throw when CORS_ORIGINS is only whitespace', async () => {
      await expect(
        loadConfigWithEnv({ CORS_ORIGINS: '   ' })
      ).rejects.toThrow('FATAL: CORS_ORIGINS must contain at least one valid origin');
    });

    it('should accept http:// origin', async () => {
      const config = await loadConfigWithEnv({ CORS_ORIGINS: 'http://192.168.1.1:3000' });
      expect(config.corsOrigins).toEqual(['http://192.168.1.1:3000']);
    });

    it('should accept https:// origin', async () => {
      const config = await loadConfigWithEnv({ CORS_ORIGINS: 'https://secure.example.com' });
      expect(config.corsOrigins).toEqual(['https://secure.example.com']);
    });

    it('should handle CORS_ORIGINS with many entries', async () => {
      const config = await loadConfigWithEnv({
        CORS_ORIGINS: 'http://a.com,http://b.com,http://c.com,http://d.com,http://e.com',
      });
      expect(config.corsOrigins).toHaveLength(5);
    });
  });

  describe('config reload consistency', () => {
    it('should produce different auto-generated JWT secrets on reload', async () => {
      const config1 = await loadConfigWithEnv({ JWT_SECRET: '' });
      const config2 = await loadConfigWithEnv({ JWT_SECRET: '' });
      expect(config1.jwt.secret).not.toBe(config2.jwt.secret);
    });

    it('should produce identical config with same explicit env vars', async () => {
      const env = {
        PORT: '3000',
        DB_HOST: 'test-host',
        DB_PASSWORD: 'test-pwd',
        JWT_SECRET: 'stable-secret',
      };
      const config1 = await loadConfigWithEnv(env);
      const config2 = await loadConfigWithEnv(env);
      expect(config1.server.port).toBe(config2.server.port);
      expect(config1.database.host).toBe(config2.database.host);
      expect(config1.jwt.secret).toBe(config2.jwt.secret);
    });
  });

  describe('CRON_ARTICLE_ENABLED edge cases', () => {
    it('should enable cron when CRON_ARTICLE_ENABLED=random-string', async () => {
      const config = await loadConfigWithEnv({ CRON_ARTICLE_ENABLED: 'yes' });
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });

    it('should enable cron when CRON_ARTICLE_ENABLED=1', async () => {
      const config = await loadConfigWithEnv({ CRON_ARTICLE_ENABLED: '1' });
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });

    it('should enable cron when CRON_ARTICLE_ENABLED is empty string', async () => {
      const config = await loadConfigWithEnv({ CRON_ARTICLE_ENABLED: '' });
      expect(config.cron.articleGenerationEnabled).toBe(true);
    });
  });

  describe('production environment additional', () => {
    it('should throw in production when DB_PASSWORD is empty string', async () => {
      await expect(
        loadConfigWithEnv({ NODE_ENV: 'production', DB_PASSWORD: '' })
      ).rejects.toThrow('FATAL: DB_PASSWORD is required in production');
    });

    it('should throw in production when JWT_SECRET is empty string', async () => {
      await expect(
        loadConfigWithEnv({ NODE_ENV: 'production', DB_PASSWORD: 'pwd', JWT_SECRET: '' })
      ).rejects.toThrow('FATAL: JWT_SECRET is required in production');
    });

    it('should not throw when NODE_ENV is development even without secrets', async () => {
      const config = await loadConfigWithEnv({ NODE_ENV: 'development' });
      expect(config.database.password).toBe('postgres');
      expect(typeof config.jwt.secret).toBe('string');
    });

    it('should not throw when NODE_ENV is test even without secrets', async () => {
      const config = await loadConfigWithEnv({ NODE_ENV: 'test' });
      expect(config.database.password).toBe('postgres');
      expect(typeof config.jwt.secret).toBe('string');
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
