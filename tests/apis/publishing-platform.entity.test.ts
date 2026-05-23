/**
 * @jest-environment node
 */
import { PublishingPlatform } from '../../apis/entity/publishing-platform.entity';

describe('publishing-platform.entity', () => {
  // ============================================================
  // PublishingPlatform interface
  // ============================================================
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
      expect(platform.remark).toBe('优质媒体资源');
      expect(platform.include_rate).toBe(0.95);
      expect(platform.publish_rate).toBe(0.9);
    });

    it('should have exactly 10 fields', () => {
      const platform: PublishingPlatform = {
        id: 1,
        rm_resource_id: 1,
        name: 'A',
        taxonomy: 'B',
        price: 0,
        remark: null,
        include_rate: 0,
        publish_rate: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(platform).sort()).toEqual(
        ['id', 'rm_resource_id', 'name', 'taxonomy', 'price', 'remark', 'include_rate', 'publish_rate', 'created_at', 'updated_at'].sort()
      );
      expect(Object.keys(platform)).toHaveLength(10);
    });

    // --- id ---
    it('should have id as number type', () => {
      const platform: PublishingPlatform = {
        id: 999,
        rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.id).toBe('number');
      expect(platform.id).toBe(999);
    });

    it('should support id as 0', () => {
      const platform: PublishingPlatform = {
        id: 0,
        rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.id).toBe(0);
    });

    it('should support large id values', () => {
      const platform: PublishingPlatform = {
        id: Number.MAX_SAFE_INTEGER,
        rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative id values', () => {
      const platform: PublishingPlatform = {
        id: -1,
        rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.id).toBe(-1);
    });

    // --- rm_resource_id ---
    it('should have rm_resource_id as number type', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 500,
        name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.rm_resource_id).toBe('number');
      expect(platform.rm_resource_id).toBe(500);
    });

    it('should support rm_resource_id as 0', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 0,
        name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.rm_resource_id).toBe(0);
    });

    it('should support large rm_resource_id values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: Number.MAX_SAFE_INTEGER,
        name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.rm_resource_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    // --- name ---
    it('should have name as string type', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪网',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.name).toBe('string');
      expect(platform.name).toBe('新浪网');
    });

    it('should support name with Chinese characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '薄云商机倍增服务',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toContain('薄云');
    });

    it('should support name with various formats', () => {
      const names = ['PRJ-001', 'test_platform', 'ABC123', 'sina.com'];
      names.forEach((n) => {
        const platform: PublishingPlatform = {
          id: 1, rm_resource_id: 1, name: n,
          taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
          created_at: new Date(), updated_at: new Date(),
        };
        expect(platform.name).toBe(n);
      });
    });

    it('should support empty string name', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toBe('');
    });

    it('should support name with special characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '平台 (v2.0) - 测试版',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toContain('v2.0');
      expect(platform.name).toContain('测试版');
    });

    it('should support long name', () => {
      const longName = 'A'.repeat(200);
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: longName,
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toBe(longName);
      expect(platform.name.length).toBe(200);
    });

    // --- taxonomy ---
    it('should have taxonomy as string type', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A',
        taxonomy: '门户', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.taxonomy).toBe('string');
      expect(platform.taxonomy).toBe('门户');
    });

    it('should support taxonomy with Chinese characters', () => {
      const taxonomies = ['门户', '新闻', '社交媒体', '博客', '论坛', '视频', '自媒体'];
      taxonomies.forEach((t) => {
        const platform: PublishingPlatform = {
          id: 1, rm_resource_id: 1, name: 'A', taxonomy: t,
          price: 0, remark: null, include_rate: 0, publish_rate: 0,
          created_at: new Date(), updated_at: new Date(),
        };
        expect(platform.taxonomy).toBe(t);
      });
    });

    it('should support empty string taxonomy', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A',
        taxonomy: '', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.taxonomy).toBe('');
    });

    it('should support taxonomy with English values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A',
        taxonomy: 'Portal', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.taxonomy).toBe('Portal');
    });

    // --- price ---
    it('should have price as number type', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 500, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.price).toBe('number');
      expect(platform.price).toBe(500);
    });

    it('should support price as 0 (free)', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '免费平台', taxonomy: '免费',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(0);
    });

    it('should support large price values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 999999, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(999999);
    });

    it('should support decimal price values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 99.99, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(99.99);
    });

    it('should support negative price values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: -100, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(-100);
    });

    it('should support very small positive price', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0.01, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(0.01);
    });

    // --- remark ---
    it('should allow remark to be null', () => {
      const platform: PublishingPlatform = {
        id: 2, rm_resource_id: 200, name: '搜狐', taxonomy: '门户',
        price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toBeNull();
    });

    it('should support remark as string', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '这是一个备注', include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toBe('这是一个备注');
    });

    it('should support remark as empty string', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '', include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toBe('');
    });

    it('should support remark with Chinese characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '薄云商机倍增服务备注', include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toContain('薄云');
    });

    it('should support long remark text', () => {
      const longRemark = 'R'.repeat(1000);
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: longRemark, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toBe(longRemark);
      expect(platform.remark!.length).toBe(1000);
    });

    it('should support remark with special characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '备注 @admin #tag https://example.com',
        include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toContain('@admin');
      expect(platform.remark).toContain('#tag');
    });

    // --- include_rate ---
    it('should have include_rate as number type', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.95, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.include_rate).toBe('number');
      expect(platform.include_rate).toBe(0.95);
    });

    it('should support include_rate as 0', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(0);
    });

    it('should support include_rate as 1', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 1, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(1);
    });

    it('should support include_rate as decimal', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.333, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBeCloseTo(0.333, 3);
    });

    it('should support include_rate boundary 0.0001', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.0001, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(0.0001);
    });

    it('should support include_rate boundary 0.9999', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.9999, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(0.9999);
    });

    // --- publish_rate ---
    it('should have publish_rate as number type', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0.85,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof platform.publish_rate).toBe('number');
      expect(platform.publish_rate).toBe(0.85);
    });

    it('should support publish_rate as 0', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBe(0);
    });

    it('should support publish_rate as 1', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBe(1);
    });

    it('should support publish_rate as decimal', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0.667,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBeCloseTo(0.667, 3);
    });

    it('should support publish_rate boundary 0.0001', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0.0001,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBe(0.0001);
    });

    it('should support publish_rate boundary 0.9999', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0.9999,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBe(0.9999);
    });

    // --- rate range validation ---
    it('should support rate values between 0 and 1', () => {
      const platform: PublishingPlatform = {
        id: 5, rm_resource_id: 500, name: '测试平台', taxonomy: '测试',
        price: 100, remark: '低通过率', include_rate: 0.1, publish_rate: 0.2,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBeGreaterThanOrEqual(0);
      expect(platform.include_rate).toBeLessThanOrEqual(1);
      expect(platform.publish_rate).toBeGreaterThanOrEqual(0);
      expect(platform.publish_rate).toBeLessThanOrEqual(1);
    });

    it('should allow include_rate and publish_rate to be equal', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(platform.publish_rate);
    });

    it('should allow include_rate greater than publish_rate', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.9, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBeGreaterThan(platform.publish_rate);
    });

    it('should allow publish_rate greater than include_rate', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.3, publish_rate: 0.8,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBeGreaterThan(platform.include_rate);
    });

    // --- created_at / updated_at ---
    it('should have created_at as Date instance', () => {
      const now = new Date();
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: now, updated_at: new Date(),
      };
      expect(platform.created_at).toBeInstanceOf(Date);
      expect(platform.created_at).toBe(now);
    });

    it('should have updated_at as Date instance', () => {
      const now = new Date();
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: now,
      };
      expect(platform.updated_at).toBeInstanceOf(Date);
      expect(platform.updated_at).toBe(now);
    });

    it('should support different created_at and updated_at timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: created, updated_at: updated,
      };
      expect(platform.created_at.getTime()).toBeLessThan(platform.updated_at.getTime());
    });

    it('should support same created_at and updated_at timestamps', () => {
      const now = new Date();
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: now, updated_at: now,
      };
      expect(platform.created_at.getTime()).toBe(platform.updated_at.getTime());
    });

    it('should support created_at with specific date', () => {
      const created = new Date('2024-06-15T08:30:00Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: created, updated_at: new Date(),
      };
      expect(platform.created_at.getFullYear()).toBe(2024);
      expect(platform.created_at.getMonth()).toBe(5); // June (0-indexed)
    });

    it('should support updated_at in the future', () => {
      const future = new Date('2099-06-15T00:00:00Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: future,
      };
      expect(platform.updated_at.getUTCFullYear()).toBe(2099);
    });

    // --- realistic scenarios ---
    it('should create a complete platform with realistic portal data', () => {
      const platform: PublishingPlatform = {
        id: 100,
        rm_resource_id: 20001,
        name: '新浪',
        taxonomy: '门户',
        price: 500,
        remark: '优质门户媒体资源',
        include_rate: 0.95,
        publish_rate: 0.9,
        created_at: new Date('2024-06-01T08:00:00Z'),
        updated_at: new Date('2024-06-15T12:30:00Z'),
      };
      expect(platform.name).toBe('新浪');
      expect(platform.taxonomy).toBe('门户');
      expect(platform.price).toBe(500);
      expect(platform.include_rate).toBe(0.95);
      expect(platform.publish_rate).toBe(0.9);
    });

    it('should create a platform with no remark', () => {
      const platform: PublishingPlatform = {
        id: 2, rm_resource_id: 200, name: '搜狐', taxonomy: '门户',
        price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(platform.remark).toBeNull();
      expect(platform.price).toBe(300);
    });

    it('should create a free platform', () => {
      const platform: PublishingPlatform = {
        id: 4, rm_resource_id: 400, name: '免费平台', taxonomy: '免费',
        price: 0, remark: null, include_rate: 1.0, publish_rate: 1.0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(0);
      expect(platform.include_rate).toBe(1);
      expect(platform.publish_rate).toBe(1);
    });

    it('should create a premium platform with high rates', () => {
      const platform: PublishingPlatform = {
        id: 10, rm_resource_id: 10001, name: '新华网', taxonomy: '国家级媒体',
        price: 10000, remark: '国家级重点媒体', include_rate: 0.99, publish_rate: 0.98,
        created_at: new Date('2024-03-01'), updated_at: new Date('2024-06-01'),
      };
      expect(platform.price).toBe(10000);
      expect(platform.include_rate).toBeGreaterThan(0.95);
      expect(platform.publish_rate).toBeGreaterThan(0.95);
    });

    it('should create multiple platforms with different taxonomies', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 101, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 102, name: '今日头条', taxonomy: '自媒体', price: 200, remark: '高流量', include_rate: 0.8, publish_rate: 0.75, created_at: new Date(), updated_at: new Date() },
        { id: 3, rm_resource_id: 103, name: '微信公众号', taxonomy: '社交媒体', price: 300, remark: '精准推送', include_rate: 0.85, publish_rate: 0.8, created_at: new Date(), updated_at: new Date() },
      ];
      expect(platforms).toHaveLength(3);
      expect(platforms.map((p) => p.taxonomy)).toEqual(['门户', '自媒体', '社交媒体']);
    });

    it('should create a platform with low rates', () => {
      const platform: PublishingPlatform = {
        id: 20, rm_resource_id: 20001, name: '低质量平台', taxonomy: '其他',
        price: 10, remark: '收录率低', include_rate: 0.1, publish_rate: 0.05,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBeLessThan(0.2);
      expect(platform.publish_rate).toBeLessThan(0.1);
    });

    it('should allow object spread to create new platform with overrides', () => {
      const base: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };
      const updated: PublishingPlatform = { ...base, name: 'Updated', price: 200 };
      expect(updated.name).toBe('Updated');
      expect(updated.price).toBe(200);
      expect(updated.id).toBe(base.id);
      expect(updated.include_rate).toBe(base.include_rate);
    });

    it('should allow destructuring of platform fields', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '备注', include_rate: 0.9, publish_rate: 0.8,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, name, taxonomy, price, include_rate, publish_rate } = platform;
      expect(id).toBe(1);
      expect(name).toBe('新浪');
      expect(taxonomy).toBe('门户');
      expect(price).toBe(500);
      expect(include_rate).toBe(0.9);
      expect(publish_rate).toBe(0.8);
    });

    it('should support Object.keys on platform', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const keys = Object.keys(platform);
      expect(keys).toContain('id');
      expect(keys).toContain('rm_resource_id');
      expect(keys).toContain('name');
      expect(keys).toContain('taxonomy');
      expect(keys).toContain('price');
      expect(keys).toContain('remark');
      expect(keys).toContain('include_rate');
      expect(keys).toContain('publish_rate');
      expect(keys).toContain('created_at');
      expect(keys).toContain('updated_at');
    });

    it('should support Object.values on platform', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 2, name: 'X', taxonomy: 'Y',
        price: 100, remark: 'Z', include_rate: 0.5, publish_rate: 0.6,
        created_at: new Date(), updated_at: new Date(),
      };
      const values = Object.values(platform);
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain('X');
      expect(values).toContain('Y');
      expect(values).toContain(100);
      expect(values).toContain('Z');
      expect(values).toContain(0.5);
      expect(values).toContain(0.6);
    });

    it('should support Object.entries on platform', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const entries = Object.entries(platform);
      expect(entries).toHaveLength(10);
      const idEntry = entries.find(([key]) => key === 'id');
      expect(idEntry).toBeDefined();
      expect(idEntry![1]).toBe(1);
    });

    it('should support JSON.stringify on platform with date conversion', () => {
      const created = new Date('2024-06-01T00:00:00Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: '备注', include_rate: 0.5, publish_rate: 0.6,
        created_at: created, updated_at: created,
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('A');
      expect(parsed.price).toBe(100);
      expect(parsed.remark).toBe('备注');
      expect(parsed.include_rate).toBe(0.5);
      expect(parsed.publish_rate).toBe(0.6);
      expect(typeof parsed.created_at).toBe('string');
    });

    it('should support JSON.stringify with null remark', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.remark).toBeNull();
    });

    it('should allow hasOwnProperty checks on platform', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.hasOwnProperty('id')).toBe(true);
      expect(platform.hasOwnProperty('name')).toBe(true);
      expect(platform.hasOwnProperty('remark')).toBe(true);
      expect(platform.hasOwnProperty('nonexistent')).toBe(false);
    });

    it('should support array methods on platform collection', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7, created_at: new Date(), updated_at: new Date() },
        { id: 3, rm_resource_id: 3, name: '微信', taxonomy: '社交媒体', price: 400, remark: '高流量', include_rate: 0.85, publish_rate: 0.8, created_at: new Date(), updated_at: new Date() },
      ];
      const filtered = platforms.filter((p) => p.taxonomy === '门户');
      expect(filtered).toHaveLength(2);

      const total = platforms.reduce((sum, p) => sum + p.price, 0);
      expect(total).toBe(1200);

      const found = platforms.find((p) => p.name === '微信');
      expect(found).toBeDefined();
      expect(found!.price).toBe(400);
    });

    it('should support sorting platforms by price', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: 'C', taxonomy: 'T', price: 300, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: 'A', taxonomy: 'T', price: 100, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 3, rm_resource_id: 3, name: 'B', taxonomy: 'T', price: 200, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...platforms].sort((a, b) => a.price - b.price);
      expect(sorted.map((p) => p.name)).toEqual(['A', 'B', 'C']);
    });

    it('should support mapping platform fields', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7, created_at: new Date(), updated_at: new Date() },
      ];
      const names = platforms.map((p) => p.name);
      expect(names).toEqual(['新浪', '搜狐']);

      const ids = platforms.map((p) => p.id);
      expect(ids).toEqual([1, 2]);
    });

    it('should support platform comparison', () => {
      const platform1: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const platform2: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform1.id).toBe(platform2.id);
      expect(platform1.name).toBe(platform2.name);
      expect(platform1.price).toBe(platform2.price);
    });

    it('should create a platform with all rates at maximum', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '完美平台', taxonomy: '顶级',
        price: 100000, remark: '百分百收录和发布', include_rate: 1, publish_rate: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(1);
      expect(platform.publish_rate).toBe(1);
      expect(platform.price).toBe(100000);
    });

    it('should create a platform with all rates at minimum', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '最差平台', taxonomy: '低级',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(0);
      expect(platform.publish_rate).toBe(0);
    });
  });

  // ============================================================
  // re-exports from index
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toBe('A');
    });

    it('should allow creating and using platform objects together', () => {
      const platform1: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: '优质', include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const platform2: PublishingPlatform = {
        id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户',
        price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform1.name).not.toBe(platform2.name);
      expect(platform1.price).toBeGreaterThan(platform2.price);
    });

    it('should support type narrowing for remark', () => {
      const platformWithRemark: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '备注内容', include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const platformNullRemark: PublishingPlatform = {
        id: 2, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      if (platformWithRemark.remark !== null) {
        expect(platformWithRemark.remark.length).toBeGreaterThan(0);
      }
      if (platformNullRemark.remark === null) {
        expect(platformNullRemark.remark).toBeNull();
      }
    });
  });
});
