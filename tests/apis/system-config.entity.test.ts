/**
 * @jest-environment node
 */
import {
  SystemConfig,
  UpdateSystemConfigsRequest,
} from '../../apis/entity/system-config.entity';

describe('system-config.entity', () => {
  // ============================================================
  // SystemConfig interface
  // ============================================================
  describe('SystemConfig interface', () => {
    it('should create a valid SystemConfig object with all required fields', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'site_name',
        config_value: '薄云商机倍增服务',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.id).toBe(1);
      expect(config.config_key).toBe('site_name');
      expect(config.config_value).toBe('薄云商机倍增服务');
    });

    it('should have exactly 5 fields', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(config).sort()).toEqual(
        ['id', 'config_key', 'config_value', 'created_at', 'updated_at'].sort()
      );
      expect(Object.keys(config)).toHaveLength(5);
    });

    // --- id ---
    it('should have id as number type', () => {
      const config: SystemConfig = {
        id: 999,
        config_key: 'k', config_value: 'v',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof config.id).toBe('number');
      expect(config.id).toBe(999);
    });

    it('should support id as 0', () => {
      const config: SystemConfig = {
        id: 0,
        config_key: 'k', config_value: 'v',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(config.id).toBe(0);
    });

    it('should support large id values', () => {
      const config: SystemConfig = {
        id: Number.MAX_SAFE_INTEGER,
        config_key: 'k', config_value: 'v',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(config.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative id values', () => {
      const config: SystemConfig = {
        id: -1,
        config_key: 'k', config_value: 'v',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(config.id).toBe(-1);
    });

    // --- config_key ---
    it('should have config_key as string type', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'test_key',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof config.config_key).toBe('string');
      expect(config.config_key).toBe('test_key');
    });

    it('should support empty string config_key', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: '',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('');
    });

    it('should support long config_key values', () => {
      const longKey = 'a'.repeat(1000);
      const config: SystemConfig = {
        id: 1,
        config_key: longKey,
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe(longKey);
      expect(config.config_key.length).toBe(1000);
    });

    it('should support config_key with special characters', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'app.module.sub-module[key]',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('app.module.sub-module[key]');
    });

    it('should support config_key with unicode characters', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: '站点_名称',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('站点_名称');
    });

    it('should support config_key with dots and underscores', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'app.settings.max_retries',
        config_value: '3',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('app.settings.max_retries');
    });

    // --- config_value ---
    it('should have config_value as string type', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'some_value',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof config.config_value).toBe('string');
      expect(config.config_value).toBe('some_value');
    });

    it('should support empty string config_value', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: '',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toBe('');
    });

    it('should store config_value as string even for numeric values', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'timeout',
        config_value: '30000',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof config.config_value).toBe('string');
      expect(config.config_value).toBe('30000');
    });

    it('should store config_value as string for boolean-like values', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'enabled',
        config_value: 'true',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toBe('true');
      expect(config.config_value).not.toBe(true);
    });

    it('should support config_value with JSON string', () => {
      const jsonValue = JSON.stringify({ theme: 'dark', lang: 'zh' });
      const config: SystemConfig = {
        id: 1,
        config_key: 'ui_settings',
        config_value: jsonValue,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toBe(jsonValue);
      const parsed = JSON.parse(config.config_value);
      expect(parsed.theme).toBe('dark');
    });

    it('should support config_value with comma-separated values', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'allowed_origins',
        config_value: 'http://localhost:3000,http://localhost:8080',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value.split(',')).toHaveLength(2);
    });

    it('should support long config_value strings', () => {
      const longValue = 'x'.repeat(5000);
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: longValue,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toBe(longValue);
      expect(config.config_value.length).toBe(5000);
    });

    it('should support config_value with special characters and newlines', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'description',
        config_value: 'line1\nline2\ttabbed\r\nwindows',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toContain('\n');
      expect(config.config_value).toContain('\t');
      expect(config.config_value).toContain('\r\n');
    });

    it('should support config_value with unicode/Chinese characters', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'site_name',
        config_value: '薄云商机倍增服务',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toBe('薄云商机倍增服务');
    });

    // --- created_at ---
    it('should have created_at as Date instance', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.created_at).toBeInstanceOf(Date);
    });

    it('should support specific created_at date', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: date,
        updated_at: new Date(),
      };
      expect(config.created_at).toBe(date);
      expect(config.created_at.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should support epoch date for created_at', () => {
      const epochDate = new Date(0);
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: epochDate,
        updated_at: new Date(),
      };
      expect(config.created_at.getTime()).toBe(0);
    });

    it('should support far future date for created_at', () => {
      const futureDate = new Date('2099-12-31T23:59:59.999Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: futureDate,
        updated_at: new Date(),
      };
      expect(config.created_at.getFullYear()).toBe(2100);
    });

    // --- updated_at ---
    it('should have updated_at as Date instance', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.updated_at).toBeInstanceOf(Date);
    });

    it('should support specific updated_at date', () => {
      const date = new Date('2025-06-20T14:00:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: new Date(),
        updated_at: date,
      };
      expect(config.updated_at).toBe(date);
      expect(config.updated_at.toISOString()).toBe('2025-06-20T14:00:00.000Z');
    });

    it('should support epoch date for updated_at', () => {
      const epochDate = new Date(0);
      const config: SystemConfig = {
        id: 1,
        config_key: 'k', config_value: 'v',
        created_at: new Date(),
        updated_at: epochDate,
      };
      expect(config.updated_at.getTime()).toBe(0);
    });

    // --- Object behavior ---
    it('should be mutable (fields can be reassigned)', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      config.config_value = 'new_value';
      expect(config.config_value).toBe('new_value');
    });

    it('should support object spread for creating copies', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const copy = { ...config, config_value: 'updated' };
      expect(copy.config_value).toBe('updated');
      expect(copy.id).toBe(config.id);
      expect(copy.config_key).toBe(config.config_key);
      // Original is unchanged
      expect(config.config_value).toBe('v');
    });

    it('should support Object.assign for merging', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const merged = Object.assign({}, config, { config_value: 'merged' });
      expect(merged.config_value).toBe('merged');
      expect(merged.id).toBe(1);
    });

    it('should be serializable to JSON', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'site_name',
        config_value: '薄云商机倍增服务',
        created_at: new Date('2024-06-01T00:00:00.000Z'),
        updated_at: new Date('2024-06-02T00:00:00.000Z'),
      };
      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.config_key).toBe('site_name');
      expect(parsed.config_value).toBe('薄云商机倍增服务');
      // Dates become ISO strings in JSON
      expect(parsed.created_at).toBe('2024-06-01T00:00:00.000Z');
      expect(parsed.updated_at).toBe('2024-06-02T00:00:00.000Z');
    });

    it('should support Object.entries iteration', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const entries = Object.entries(config);
      expect(entries).toHaveLength(5);
      const keys = entries.map(([k]) => k);
      expect(keys.sort()).toEqual(['config_key', 'config_value', 'created_at', 'id', 'updated_at'].sort());
    });

    it('should support destructuring', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const { id, config_key, config_value, created_at, updated_at } = config;
      expect(id).toBe(1);
      expect(config_key).toBe('k');
      expect(config_value).toBe('v');
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should support optional chaining on fields', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config?.id).toBe(1);
      expect(config?.config_key).toBe('k');
      expect(config?.config_value).toBe('v');
    });

    it('should correctly compare two distinct objects with same values', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const config1: SystemConfig = {
        id: 1, config_key: 'k', config_value: 'v',
        created_at: date, updated_at: date,
      };
      const config2: SystemConfig = {
        id: 1, config_key: 'k', config_value: 'v',
        created_at: date, updated_at: date,
      };
      expect(config1).not.toBe(config2); // different references
      expect(config1).toEqual(config2);  // same values
    });

    it('should support creating array of SystemConfig objects', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'k1', config_value: 'v1', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'k2', config_value: 'v2', created_at: new Date(), updated_at: new Date() },
        { id: 3, config_key: 'k3', config_value: 'v3', created_at: new Date(), updated_at: new Date() },
      ];
      expect(configs).toHaveLength(3);
      expect(configs[0].config_key).toBe('k1');
      expect(configs[2].id).toBe(3);
    });

    it('should support filter/find on array of configs', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'site_name', config_value: 'App', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'max_items', config_value: '100', created_at: new Date(), updated_at: new Date() },
      ];
      const found = configs.find(c => c.config_key === 'max_items');
      expect(found).toBeDefined();
      expect(found!.config_value).toBe('100');
    });
  });

  // ============================================================
  // UpdateSystemConfigsRequest interface
  // ============================================================
  describe('UpdateSystemConfigsRequest interface', () => {
    it('should create a valid request with configs array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'site_name', config_value: '新名称' },
          { config_key: 'max_articles', config_value: '200' },
        ],
      };
      expect(req.configs).toHaveLength(2);
      expect(req.configs[0].config_key).toBe('site_name');
      expect(req.configs[1].config_value).toBe('200');
    });

    it('should allow empty configs array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [],
      };
      expect(req.configs).toEqual([]);
      expect(req.configs).toHaveLength(0);
    });

    it('should accept single config update', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'key1', config_value: 'value1' }],
      };
      expect(req.configs).toHaveLength(1);
      expect(req.configs[0].config_key).toBe('key1');
    });

    it('should have configs as the only field', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [],
      };
      expect(Object.keys(req)).toEqual(['configs']);
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should support configs with empty key and value', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: '', config_value: '' }],
      };
      expect(req.configs[0].config_key).toBe('');
      expect(req.configs[0].config_value).toBe('');
    });

    it('should support configs with unicode/Chinese values', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: '站点名称', config_value: '薄云商机倍增服务' },
        ],
      };
      expect(req.configs[0].config_key).toBe('站点名称');
      expect(req.configs[0].config_value).toBe('薄云商机倍增服务');
    });

    it('should support configs with JSON string values', () => {
      const jsonStr = JSON.stringify({ enabled: true, count: 10 });
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'settings', config_value: jsonStr }],
      };
      const parsed = JSON.parse(req.configs[0].config_value);
      expect(parsed.enabled).toBe(true);
      expect(parsed.count).toBe(10);
    });

    it('should support large number of configs', () => {
      const configs = Array.from({ length: 100 }, (_, i) => ({
        config_key: `key_${i}`,
        config_value: `value_${i}`,
      }));
      const req: UpdateSystemConfigsRequest = { configs };
      expect(req.configs).toHaveLength(100);
      expect(req.configs[0].config_key).toBe('key_0');
      expect(req.configs[99].config_key).toBe('key_99');
    });

    it('should allow duplicate config_keys in array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'same_key', config_value: 'value1' },
          { config_key: 'same_key', config_value: 'value2' },
        ],
      };
      expect(req.configs).toHaveLength(2);
      expect(req.configs[0].config_key).toBe(req.configs[1].config_key);
      expect(req.configs[0].config_value).not.toBe(req.configs[1].config_value);
    });

    it('should support long config_value in request', () => {
      const longValue = 'a'.repeat(10000);
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'large_config', config_value: longValue }],
      };
      expect(req.configs[0].config_value.length).toBe(10000);
    });

    it('should support config_value with special characters', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'special', config_value: '<script>alert("xss")</script>' },
        ],
      };
      expect(req.configs[0].config_value).toContain('<script>');
    });

    it('should support config_value with newline and tab characters', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'multiline', config_value: 'line1\nline2\ttab' },
        ],
      };
      expect(req.configs[0].config_value).toContain('\n');
      expect(req.configs[0].config_value).toContain('\t');
    });

    it('should be serializable to JSON', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'k1', config_value: 'v1' },
          { config_key: 'k2', config_value: 'v2' },
        ],
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.configs).toHaveLength(2);
      expect(parsed.configs[0].config_key).toBe('k1');
    });

    it('should support destructuring of configs array items', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'test_key', config_value: 'test_value' }],
      };
      const { config_key, config_value } = req.configs[0];
      expect(config_key).toBe('test_key');
      expect(config_value).toBe('test_value');
    });

    it('should support forEach/map on configs array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'a', config_value: '1' },
          { config_key: 'b', config_value: '2' },
          { config_key: 'c', config_value: '3' },
        ],
      };
      const keys = req.configs.map(c => c.config_key);
      expect(keys).toEqual(['a', 'b', 'c']);

      const values: string[] = [];
      req.configs.forEach(c => values.push(c.config_value));
      expect(values).toEqual(['1', '2', '3']);
    });

    it('should support filter/reduce on configs array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'app_name', config_value: 'TestApp' },
          { config_key: 'app_version', config_value: '1.0' },
          { config_key: 'db_host', config_value: 'localhost' },
        ],
      };
      const filtered = req.configs.filter(c => c.config_key.startsWith('app'));
      expect(filtered).toHaveLength(2);

      const totalLength = req.configs.reduce((sum, c) => sum + c.config_value.length, 0);
      expect(totalLength).toBe('TestApp'.length + '1.0'.length + 'localhost'.length);
    });

    it('should support spread to create new request with modified configs', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'k', config_value: 'v' }],
      };
      const newReq: UpdateSystemConfigsRequest = {
        ...req,
        configs: [...req.configs, { config_key: 'k2', config_value: 'v2' }],
      };
      expect(newReq.configs).toHaveLength(2);
      expect(req.configs).toHaveLength(1); // original unchanged
    });

    it('should support numeric-like config_value strings', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'port', config_value: '8080' },
          { config_key: 'ratio', config_value: '0.85' },
          { config_key: 'negative', config_value: '-1' },
          { config_key: 'scientific', config_value: '1e5' },
        ],
      };
      expect(Number(req.configs[0].config_value)).toBe(8080);
      expect(Number(req.configs[1].config_value)).toBeCloseTo(0.85);
      expect(Number(req.configs[2].config_value)).toBe(-1);
      expect(Number(req.configs[3].config_value)).toBe(100000);
    });

    it('should support boolean-like config_value strings', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'flag_true', config_value: 'true' },
          { config_key: 'flag_false', config_value: 'false' },
        ],
      };
      expect(req.configs[0].config_value).toBe('true');
      expect(req.configs[1].config_value).toBe('false');
      // These are strings, not booleans
      expect(typeof req.configs[0].config_value).toBe('string');
    });
  });

  // ============================================================
  // Type import validation
  // ============================================================
  describe('type imports and compile-time validation', () => {
    it('should compile correctly when importing types', () => {
      const config: SystemConfig = {
        id: 1, config_key: 'key', config_value: 'value',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(config.config_key).toBe('key');
    });

    it('should allow using SystemConfig in generic contexts', () => {
      const configMap = new Map<string, SystemConfig>();
      configMap.set('site', {
        id: 1, config_key: 'site_name', config_value: 'App',
        created_at: new Date(), updated_at: new Date(),
      });
      expect(configMap.get('site')?.config_value).toBe('App');
    });

    it('should allow using UpdateSystemConfigsRequest in generic contexts', () => {
      const requests: UpdateSystemConfigsRequest[] = [
        { configs: [{ config_key: 'k', config_value: 'v' }] },
        { configs: [] },
      ];
      expect(requests).toHaveLength(2);
      expect(requests[0].configs).toHaveLength(1);
      expect(requests[1].configs).toHaveLength(0);
    });

    it('should support Promise<SystemConfig> pattern', async () => {
      const loadConfig = (): Promise<SystemConfig> => {
        return Promise.resolve({
          id: 1, config_key: 'async_key', config_value: 'async_value',
          created_at: new Date(), updated_at: new Date(),
        });
      };
      const config = await loadConfig();
      expect(config.config_key).toBe('async_key');
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('edge cases', () => {
    it('should handle config with whitespace-only values', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'spacing',
        config_value: '   ',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value.trim()).toBe('');
      expect(config.config_value.length).toBe(3);
    });

    it('should handle config with URL as value', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'api_endpoint',
        config_value: 'https://example.com/api/v1?key=abc&lang=zh',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toContain('https://');
      expect(config.config_value).toContain('?');
    });

    it('should handle config with base64-encoded value', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'encoded_data',
        config_value: Buffer.from('hello world').toString('base64'),
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Buffer.from(config.config_value, 'base64').toString()).toBe('hello world');
    });

    it('should handle config with path as value', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'upload_dir',
        config_value: '/var/www/uploads/images',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value.startsWith('/')).toBe(true);
      expect(config.config_value.split('/')).toHaveLength(5);
    });

    it('should handle config with email as value', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'admin_email',
        config_value: 'admin@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toContain('@');
    });

    it('should handle same created_at and updated_at', () => {
      const now = new Date();
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: now,
        updated_at: now,
      };
      expect(config.created_at).toBe(config.updated_at);
    });

    it('should handle updated_at before created_at (logically invalid but type-valid)', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date('2024-06-01'),
        updated_at: new Date('2024-01-01'),
      };
      expect(config.updated_at < config.created_at).toBe(true);
    });
  });
});
