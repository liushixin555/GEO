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
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof config.id).toBe('number');
      expect(config.id).toBe(999);
    });

    it('should support id as 0', () => {
      const config: SystemConfig = {
        id: 0,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.id).toBe(0);
    });

    it('should support large id values', () => {
      const config: SystemConfig = {
        id: Number.MAX_SAFE_INTEGER,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative id values', () => {
      const config: SystemConfig = {
        id: -1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.id).toBe(-1);
    });

    it('should support negative large id values', () => {
      const config: SystemConfig = {
        id: -Number.MAX_SAFE_INTEGER,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.id).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it('should support id with decimal values', () => {
      const config: SystemConfig = {
        id: 3.14,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.id).toBeCloseTo(3.14);
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

    it('should support config_key with emoji characters', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: '🔑_key',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('🔑_key');
    });

    it('should support config_key with whitespace characters', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'key with spaces',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('key with spaces');
      expect(config.config_key).toContain(' ');
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

    it('should support config_value with emoji', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'app_icon',
        config_value: '🚀🎉',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toBe('🚀🎉');
    });

    it('should support config_value with XML content', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'template',
        config_value: '<config><item key="a">1</item></config>',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toContain('<config>');
      expect(config.config_value).toContain('</config>');
    });

    it('should support config_value with regex pattern string', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'email_regex',
        config_value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const regex = new RegExp(config.config_value);
      expect(regex.test('test@example.com')).toBe(true);
      expect(regex.test('invalid')).toBe(false);
    });

    // --- created_at ---
    it('should have created_at as Date instance', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.created_at).toBeInstanceOf(Date);
    });

    it('should support specific created_at date', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
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
        config_key: 'k',
        config_value: 'v',
        created_at: epochDate,
        updated_at: new Date(),
      };
      expect(config.created_at.getTime()).toBe(0);
    });

    it('should support far future date for created_at', () => {
      const futureDate = new Date('2099-12-31T23:59:59.999Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: futureDate,
        updated_at: new Date(),
      };
      expect(config.created_at.getFullYear()).toBe(2100);
    });

    it('should support very old date for created_at', () => {
      const oldDate = new Date('1900-01-01T00:00:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: oldDate,
        updated_at: new Date(),
      };
      expect(config.created_at.getFullYear()).toBe(1900);
    });

    it('should support created_at with millisecond precision', () => {
      const date = new Date('2024-06-15T12:30:45.123Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: date,
        updated_at: new Date(),
      };
      expect(config.created_at.getMilliseconds()).toBe(123);
    });

    // --- updated_at ---
    it('should have updated_at as Date instance', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.updated_at).toBeInstanceOf(Date);
    });

    it('should support specific updated_at date', () => {
      const date = new Date('2025-06-20T14:00:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
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
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: epochDate,
      };
      expect(config.updated_at.getTime()).toBe(0);
    });

    it('should support very old date for updated_at', () => {
      const oldDate = new Date('1900-01-01T00:00:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: oldDate,
      };
      expect(config.updated_at.getFullYear()).toBe(1900);
    });

    it('should support updated_at with millisecond precision', () => {
      const date = new Date('2024-06-15T12:30:45.456Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: date,
      };
      expect(config.updated_at.getMilliseconds()).toBe(456);
    });

    // --- Timestamp comparison ---
    it('should support timestamp comparison between created_at and updated_at', () => {
      const created = new Date('2024-01-01T00:00:00.000Z');
      const updated = new Date('2024-06-01T00:00:00.000Z');
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: created,
        updated_at: updated,
      };
      expect(config.updated_at.getTime() - config.created_at.getTime()).toBeGreaterThan(0);
    });

    // --- Realistic scenarios ---
    it('should represent a site name config', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'site_name',
        config_value: '薄云商机倍增服务',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-06-01'),
      };
      expect(config.config_key).toBe('site_name');
      expect(config.config_value).toBe('薄云商机倍增服务');
    });

    it('should represent a numeric config', () => {
      const config: SystemConfig = {
        id: 2,
        config_key: 'max_upload_size_mb',
        config_value: '50',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Number(config.config_value)).toBe(50);
    });

    it('should represent a JSON config', () => {
      const settings = { theme: 'light', language: 'zh-CN', pageSize: 20 };
      const config: SystemConfig = {
        id: 3,
        config_key: 'ui_settings',
        config_value: JSON.stringify(settings),
        created_at: new Date(),
        updated_at: new Date(),
      };
      const parsed = JSON.parse(config.config_value);
      expect(parsed.theme).toBe('light');
      expect(parsed.pageSize).toBe(20);
    });

    it('should represent a boolean config', () => {
      const config: SystemConfig = {
        id: 4,
        config_key: 'maintenance_mode',
        config_value: 'false',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value === 'true').toBe(false);
    });

    it('should represent a comma-separated list config', () => {
      const config: SystemConfig = {
        id: 5,
        config_key: 'allowed_file_types',
        config_value: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const types = config.config_value.split(',');
      expect(types).toContain('.pdf');
      expect(types).toHaveLength(7);
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
      expect(parsed.created_at).toBe('2024-06-01T00:00:00.000Z');
      expect(parsed.updated_at).toBe('2024-06-02T00:00:00.000Z');
    });

    it('should support JSON round-trip with date recovery', () => {
      const original: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date('2024-06-01T00:00:00.000Z'),
        updated_at: new Date('2024-06-02T00:00:00.000Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      const restored: SystemConfig = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
      };
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.created_at.getTime()).toBe(original.created_at.getTime());
      expect(restored.updated_at.getTime()).toBe(original.updated_at.getTime());
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

    it('should support Object.keys', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const keys = Object.keys(config);
      expect(keys).toHaveLength(5);
      expect(keys).toContain('id');
      expect(keys).toContain('config_key');
      expect(keys).toContain('config_value');
    });

    it('should support Object.values', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const values = Object.values(config);
      expect(values).toHaveLength(5);
      expect(values).toContain(1);
      expect(values).toContain('k');
      expect(values).toContain('v');
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
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: date,
        updated_at: date,
      };
      const config2: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: date,
        updated_at: date,
      };
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should support hasOwnProperty check', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.hasOwnProperty('id')).toBe(true);
      expect(config.hasOwnProperty('config_key')).toBe(true);
      expect(config.hasOwnProperty('config_value')).toBe(true);
      expect(config.hasOwnProperty('created_at')).toBe(true);
      expect(config.hasOwnProperty('updated_at')).toBe(true);
      expect(config.hasOwnProperty('nonexistent')).toBe(false);
    });

    it('should support Object.freeze', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      Object.freeze(config);
      expect(Object.isFrozen(config)).toBe(true);
      expect(() => {
        (config as unknown as Record<string, unknown>).id = 99;
      }).toThrow();
    });

    it('should support Object.seal', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      Object.seal(config);
      expect(Object.isSealed(config)).toBe(true);
      config.config_value = 'new';
      expect(config.config_value).toBe('new');
    });

    // --- Array operations ---
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

    it('should support sorting configs by id', () => {
      const configs: SystemConfig[] = [
        { id: 3, config_key: 'c', config_value: '3', created_at: new Date(), updated_at: new Date() },
        { id: 1, config_key: 'a', config_value: '1', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'b', config_value: '2', created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...configs].sort((a, b) => a.id - b.id);
      expect(sorted[0].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });

    it('should support sorting configs by config_key', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'zebra', config_value: 'z', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'alpha', config_value: 'a', created_at: new Date(), updated_at: new Date() },
        { id: 3, config_key: 'middle', config_value: 'm', created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...configs].sort((a, b) => a.config_key.localeCompare(b.config_key));
      expect(sorted[0].config_key).toBe('alpha');
      expect(sorted[2].config_key).toBe('zebra');
    });

    it('should support map and reduce on configs array', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'k1', config_value: '10', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'k2', config_value: '20', created_at: new Date(), updated_at: new Date() },
      ];
      const keys = configs.map(c => c.config_key);
      expect(keys).toEqual(['k1', 'k2']);
      const sum = configs.reduce((acc, c) => acc + Number(c.config_value), 0);
      expect(sum).toBe(30);
    });

    it('should support some/every on configs array', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'a', config_value: '100', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'b', config_value: '200', created_at: new Date(), updated_at: new Date() },
        { id: 3, config_key: 'c', config_value: '300', created_at: new Date(), updated_at: new Date() },
      ];
      expect(configs.some(c => c.config_value === '200')).toBe(true);
      expect(configs.every(c => c.config_value.length > 0)).toBe(true);
      expect(configs.every(c => Number(c.config_value) > 150)).toBe(false);
    });

    it('should support slice and concat on configs array', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'a', config_value: '1', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'b', config_value: '2', created_at: new Date(), updated_at: new Date() },
        { id: 3, config_key: 'c', config_value: '3', created_at: new Date(), updated_at: new Date() },
      ];
      const sliced = configs.slice(0, 2);
      expect(sliced).toHaveLength(2);
      const extra: SystemConfig = {
        id: 4,
        config_key: 'd',
        config_value: '4',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const concatenated = configs.concat(extra);
      expect(concatenated).toHaveLength(4);
    });

    // --- Map/Set operations ---
    it('should support Map with SystemConfig values', () => {
      const configMap = new Map<string, SystemConfig>();
      configMap.set('site', {
        id: 1,
        config_key: 'site_name',
        config_value: 'App',
        created_at: new Date(),
        updated_at: new Date(),
      });
      expect(configMap.get('site')?.config_value).toBe('App');
      expect(configMap.size).toBe(1);
    });

    it('should support Set with SystemConfig objects', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const configSet = new Set<SystemConfig>();
      configSet.add(config);
      expect(configSet.has(config)).toBe(true);
      expect(configSet.size).toBe(1);
    });

    // --- Immutability pattern ---
    it('should support immutable update via spread', () => {
      const original: SystemConfig = {
        id: 1,
        config_key: 'timeout',
        config_value: '30',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const updated: SystemConfig = {
        ...original,
        config_value: '60',
        updated_at: new Date(),
      };
      expect(original.config_value).toBe('30');
      expect(updated.config_value).toBe('60');
      expect(original.id).toBe(updated.id);
      expect(original.config_key).toBe(updated.config_key);
    });

    // --- CRUD lifecycle simulation ---
    it('should simulate CRUD lifecycle', () => {
      const now = new Date('2024-01-01');
      const created: SystemConfig = {
        id: 1,
        config_key: 'app_version',
        config_value: '1.0.0',
        created_at: now,
        updated_at: now,
      };
      expect(created.config_value).toBe('1.0.0');

      // Read
      const { config_key, config_value } = created;
      expect(config_key).toBe('app_version');
      expect(config_value).toBe('1.0.0');

      // Update
      const updated: SystemConfig = {
        ...created,
        config_value: '2.0.0',
        updated_at: new Date('2024-06-01'),
      };
      expect(updated.config_value).toBe('2.0.0');
      expect(updated.created_at).toBe(created.created_at);

      // Delete - remove from collection
      const configs = [created, updated];
      const remaining = configs.filter(c => c.config_value !== '1.0.0');
      expect(remaining).toHaveLength(1);
    });

    // --- Computed values ---
    it('should support computed config_value creation', () => {
      const computeValue = (obj: Record<string, unknown>): SystemConfig => ({
        id: 1,
        config_key: 'serialized_data',
        config_value: JSON.stringify(obj),
        created_at: new Date(),
        updated_at: new Date(),
      });
      const config = computeValue({ count: 42, active: true });
      const parsed = JSON.parse(config.config_value);
      expect(parsed.count).toBe(42);
      expect(parsed.active).toBe(true);
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
      expect(req.configs).toHaveLength(1);
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
      expect(typeof req.configs[0].config_value).toBe('string');
    });

    it('should support Object.keys on request', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'k', config_value: 'v' }],
      };
      expect(Object.keys(req)).toEqual(['configs']);
    });

    it('should support Object.entries on request', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'k', config_value: 'v' }],
      };
      const entries = Object.entries(req);
      expect(entries).toHaveLength(1);
      expect(entries[0][0]).toBe('configs');
      expect(entries[0][1]).toHaveLength(1);
    });

    it('should support JSON round-trip for request', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'k1', config_value: 'v1' },
          { config_key: 'k2', config_value: 'v2' },
        ],
      };
      const json = JSON.stringify(req);
      const restored: UpdateSystemConfigsRequest = JSON.parse(json);
      expect(restored.configs).toHaveLength(2);
      expect(restored.configs[0].config_key).toBe('k1');
      expect(restored.configs[1].config_value).toBe('v2');
    });

    it('should support config_value with emoji in request', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'icon', config_value: '🎯🚀' }],
      };
      expect(req.configs[0].config_value).toBe('🎯🚀');
    });

    it('should support some/every on configs array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'a', config_value: '1' },
          { config_key: 'b', config_value: '' },
          { config_key: 'c', config_value: '3' },
        ],
      };
      expect(req.configs.some(c => c.config_value === '')).toBe(true);
      expect(req.configs.every(c => c.config_key.length > 0)).toBe(true);
    });

    it('should support findIndex on configs array', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'alpha', config_value: '1' },
          { config_key: 'beta', config_value: '2' },
          { config_key: 'gamma', config_value: '3' },
        ],
      };
      const idx = req.configs.findIndex(c => c.config_key === 'beta');
      expect(idx).toBe(1);
    });

    it('should support sorting configs in request', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'zebra', config_value: 'z' },
          { config_key: 'alpha', config_value: 'a' },
          { config_key: 'middle', config_value: 'm' },
        ],
      };
      const sorted = [...req.configs].sort((a, b) => a.config_key.localeCompare(b.config_key));
      expect(sorted[0].config_key).toBe('alpha');
      expect(sorted[2].config_key).toBe('zebra');
    });

    it('should support configs with config_key containing emoji', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: '🔑_api_key', config_value: 'secret123' }],
      };
      expect(req.configs[0].config_key).toContain('🔑');
    });
  });

  // ============================================================
  // Type import validation
  // ============================================================
  describe('type imports and compile-time validation', () => {
    it('should compile correctly when importing types', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'key',
        config_value: 'value',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_key).toBe('key');
    });

    it('should allow using SystemConfig in generic contexts', () => {
      const configMap = new Map<string, SystemConfig>();
      configMap.set('site', {
        id: 1,
        config_key: 'site_name',
        config_value: 'App',
        created_at: new Date(),
        updated_at: new Date(),
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
          id: 1,
          config_key: 'async_key',
          config_value: 'async_value',
          created_at: new Date(),
          updated_at: new Date(),
        });
      };
      const config = await loadConfig();
      expect(config.config_key).toBe('async_key');
    });

    it('should support Promise<UpdateSystemConfigsRequest> pattern', async () => {
      const loadRequest = (): Promise<UpdateSystemConfigsRequest> => {
        return Promise.resolve({
          configs: [{ config_key: 'k', config_value: 'v' }],
        });
      };
      const req = await loadRequest();
      expect(req.configs).toHaveLength(1);
    });

    it('should support Record transformation from SystemConfig', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'k',
        config_value: 'v',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const record: Record<string, unknown> = { ...config };
      expect(record.id).toBe(1);
      expect(record.config_key).toBe('k');
    });

    it('should support Partial<SystemConfig> pattern', () => {
      const partial: Partial<SystemConfig> = {
        config_key: 'k',
        config_value: 'v',
      };
      expect(partial.id).toBeUndefined();
      expect(partial.config_key).toBe('k');
    });

    it('should support Pick<SystemConfig, "config_key" | "config_value"> pattern', () => {
      const picked: Pick<SystemConfig, 'config_key' | 'config_value'> = {
        config_key: 'k',
        config_value: 'v',
      };
      expect(picked.config_key).toBe('k');
      expect(picked.config_value).toBe('v');
    });

    it('should support Omit<SystemConfig, "id" | "created_at" | "updated_at"> pattern', () => {
      const omitted: Omit<SystemConfig, 'id' | 'created_at' | 'updated_at'> = {
        config_key: 'k',
        config_value: 'v',
      };
      expect(omitted.config_key).toBe('k');
      expect(omitted.config_value).toBe('v');
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

    it('should handle config_value as hex color string', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'color',
        config_value: '#FF5733',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value.startsWith('#')).toBe(true);
      expect(config.config_value.length).toBe(7);
    });

    it('should handle config_value as IP address', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'server_ip',
        config_value: '192.168.1.100',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const parts = config.config_value.split('.');
      expect(parts).toHaveLength(4);
      expect(parts.every(p => !isNaN(Number(p)))).toBe(true);
    });

    it('should handle config_value as semicolon-separated values', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'path_list',
        config_value: '/usr/bin;/usr/local/bin;/home/user/bin',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value.split(';')).toHaveLength(3);
    });

    it('should handle config_value as serialized array', () => {
      const arr = ['option1', 'option2', 'option3'];
      const config: SystemConfig = {
        id: 1,
        config_key: 'options',
        config_value: JSON.stringify(arr),
        created_at: new Date(),
        updated_at: new Date(),
      };
      const parsed: string[] = JSON.parse(config.config_value);
      expect(parsed).toHaveLength(3);
      expect(parsed).toContain('option2');
    });

    it('should handle config_value with HTML content', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'welcome_message',
        config_value: '<h1>Welcome</h1><p>薄云商机倍增服务</p>',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toContain('<h1>');
      expect(config.config_value).toContain('薄云商机倍增服务');
    });

    it('should handle config_value with very long JSON object', () => {
      const largeObj: Record<string, string> = {};
      for (let i = 0; i < 500; i++) {
        largeObj[`key_${i}`] = `value_${i}`;
      }
      const config: SystemConfig = {
        id: 1,
        config_key: 'large_config',
        config_value: JSON.stringify(largeObj),
        created_at: new Date(),
        updated_at: new Date(),
      };
      const parsed = JSON.parse(config.config_value);
      expect(Object.keys(parsed)).toHaveLength(500);
    });

    it('should handle config_value with environment variable reference', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'db_url_template',
        config_value: 'postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/mydb',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.config_value).toContain('${DB_USER}');
      expect(config.config_value).toContain('postgresql://');
    });
  });

  // ============================================================
  // Re-exports and conversion scenarios
  // ============================================================
  describe('re-exports and conversion scenarios', () => {
    it('should simulate UpdateSystemConfigsRequest to SystemConfig conversion', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'site_name', config_value: '新名称' },
          { config_key: 'max_items', config_value: '100' },
        ],
      };
      const now = new Date();
      const configs: SystemConfig[] = req.configs.map((c, i) => ({
        id: i + 1,
        config_key: c.config_key,
        config_value: c.config_value,
        created_at: now,
        updated_at: now,
      }));
      expect(configs).toHaveLength(2);
      expect(configs[0].config_key).toBe('site_name');
      expect(configs[1].config_value).toBe('100');
    });

    it('should simulate batch update with existing configs', () => {
      const created = new Date('2024-01-01');
      const existing: SystemConfig[] = [
        { id: 1, config_key: 'site_name', config_value: '旧名称', created_at: created, updated_at: created },
        { id: 2, config_key: 'max_items', config_value: '50', created_at: created, updated_at: created },
      ];
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'site_name', config_value: '新名称' },
        ],
      };
      const updateDate = new Date('2024-06-01');
      const updated = existing.map(config => {
        const update = req.configs.find(c => c.config_key === config.config_key);
        if (update) {
          return { ...config, config_value: update.config_value, updated_at: updateDate };
        }
        return config;
      });
      expect(updated[0].config_value).toBe('新名称');
      expect(updated[1].config_value).toBe('50');
      expect(updated[0].updated_at.getTime()).toBeGreaterThan(updated[0].created_at.getTime());
    });

    it('should support config deduplication by key', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [
          { config_key: 'k1', config_value: 'v1' },
          { config_key: 'k2', config_value: 'v2' },
          { config_key: 'k1', config_value: 'v1_updated' },
        ],
      };
      const deduped = req.configs.reduce(
        (acc, curr) => {
          const existing = acc.find(c => c.config_key === curr.config_key);
          if (existing) {
            return acc.map(c => (c.config_key === curr.config_key ? curr : c));
          }
          return [...acc, curr];
        },
        [] as Array<{ config_key: string; config_value: string }>,
      );
      expect(deduped).toHaveLength(2);
      expect(deduped.find(c => c.config_key === 'k1')?.config_value).toBe('v1_updated');
    });

    it('should support converting SystemConfig to update request item', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'timeout',
        config_value: '30',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const reqItem = {
        config_key: config.config_key,
        config_value: config.config_value,
      };
      expect(reqItem.config_key).toBe('timeout');
      expect(reqItem.config_value).toBe('30');
    });

    it('should support multiple objects interaction', () => {
      const configs: SystemConfig[] = [
        { id: 1, config_key: 'k1', config_value: 'v1', created_at: new Date(), updated_at: new Date() },
        { id: 2, config_key: 'k2', config_value: 'v2', created_at: new Date(), updated_at: new Date() },
      ];
      const req: UpdateSystemConfigsRequest = {
        configs: configs.map(c => ({ config_key: c.config_key, config_value: c.config_value })),
      };
      expect(req.configs).toHaveLength(2);
      expect(req.configs[0].config_key).toBe('k1');
    });
  });
});
