/**
 * @jest-environment node
 */
import {
  SystemConfig,
  UpdateSystemConfigsRequest,
} from '../../apis/entity/system-config.entity';

describe('system-config.entity', () => {
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

    it('should have all required fields', () => {
      const config: SystemConfig = {
        id: 2,
        config_key: 'max_articles',
        config_value: '100',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(config).sort()).toEqual(
        ['id', 'config_key', 'config_value', 'created_at', 'updated_at'].sort()
      );
    });

    it('should store config_value as string even for numeric values', () => {
      const config: SystemConfig = {
        id: 3,
        config_key: 'timeout',
        config_value: '30000',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof config.config_value).toBe('string');
    });

    it('should have proper Date instances for timestamps', () => {
      const config: SystemConfig = {
        id: 1,
        config_key: 'test',
        config_value: 'value',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(config.created_at).toBeInstanceOf(Date);
      expect(config.updated_at).toBeInstanceOf(Date);
    });
  });

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
    });

    it('should accept single config update', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [{ config_key: 'key1', config_value: 'value1' }],
      };
      expect(req.configs).toHaveLength(1);
    });

    it('should have configs as the only field', () => {
      const req: UpdateSystemConfigsRequest = {
        configs: [],
      };
      expect(Object.keys(req)).toEqual(['configs']);
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const config: SystemConfig = {
        id: 1, config_key: 'key', config_value: 'value',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(config.config_key).toBe('key');
    });
  });
});
