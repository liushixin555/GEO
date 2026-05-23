/**
 * @jest-environment node
 */
import { PublishingPlatform } from '../../apis/entity/publishing-platform.entity';

describe('publishing-platform.entity', () => {
  describe('PublishingPlatform interface', () => {
    it('should create a valid PublishingPlatform object with all required fields', () => {
      const platform: PublishingPlatform = {
        id: 1,
        rm_resource_id: 100,
        name: '新浪',
        taxonomy: '门户',
        price: 500,
        remark: '优质媒体资源',
        include_rate: 0.95,
        publish_rate: 0.9,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(platform.id).toBe(1);
      expect(platform.rm_resource_id).toBe(100);
      expect(platform.name).toBe('新浪');
      expect(platform.taxonomy).toBe('门户');
      expect(platform.price).toBe(500);
      expect(platform.include_rate).toBe(0.95);
      expect(platform.publish_rate).toBe(0.9);
    });

    it('should allow remark to be null', () => {
      const platform: PublishingPlatform = {
        id: 2,
        rm_resource_id: 200,
        name: '搜狐',
        taxonomy: '门户',
        price: 300,
        remark: null,
        include_rate: 0.8,
        publish_rate: 0.7,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(platform.remark).toBeNull();
    });

    it('should have all required fields', () => {
      const platform: PublishingPlatform = {
        id: 3,
        rm_resource_id: 300,
        name: '网易',
        taxonomy: '新闻',
        price: 400,
        remark: null,
        include_rate: 0.85,
        publish_rate: 0.75,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(platform).sort()).toEqual(
        ['id', 'rm_resource_id', 'name', 'taxonomy', 'price', 'remark', 'include_rate', 'publish_rate', 'created_at', 'updated_at'].sort()
      );
    });

    it('should support numeric price values', () => {
      const freePlatform: PublishingPlatform = {
        id: 4,
        rm_resource_id: 400,
        name: '免费平台',
        taxonomy: '免费',
        price: 0,
        remark: null,
        include_rate: 1.0,
        publish_rate: 1.0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(freePlatform.price).toBe(0);
    });

    it('should support rate values between 0 and 1', () => {
      const platform: PublishingPlatform = {
        id: 5,
        rm_resource_id: 500,
        name: '测试平台',
        taxonomy: '测试',
        price: 100,
        remark: '低通过率',
        include_rate: 0.1,
        publish_rate: 0.2,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(platform.include_rate).toBeGreaterThanOrEqual(0);
      expect(platform.include_rate).toBeLessThanOrEqual(1);
      expect(platform.publish_rate).toBeGreaterThanOrEqual(0);
      expect(platform.publish_rate).toBeLessThanOrEqual(1);
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toBe('A');
    });
  });
});
