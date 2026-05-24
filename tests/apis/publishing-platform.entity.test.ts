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

    it('should support negative large id values', () => {
      const platform: PublishingPlatform = {
        id: -Number.MAX_SAFE_INTEGER,
        rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.id).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it('should support decimal id (TypeScript does not enforce integer)', () => {
      const platform: PublishingPlatform = {
        id: 3.14,
        rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.id).toBe(3.14);
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

    it('should support negative rm_resource_id values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: -100,
        name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.rm_resource_id).toBe(-100);
    });

    it('should support decimal rm_resource_id', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 2.5,
        name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.rm_resource_id).toBe(2.5);
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

    it('should support very long name', () => {
      const longName = 'A'.repeat(1000);
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: longName,
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toBe(longName);
      expect(platform.name.length).toBe(1000);
    });

    it('should support name with emoji characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '🚀 超级平台',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toContain('🚀');
    });

    it('should support name with unicode characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'プロジェクト 플랫폼',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toContain('プロ');
      expect(platform.name).toContain('플랫');
    });

    it('should support name with newlines and tabs', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'line1\nline2\ttab',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toContain('\n');
      expect(platform.name).toContain('\t');
    });

    it('should support name with whitespace', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '  spaced  ',
        taxonomy: 'B', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.name).toContain(' ');
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

    it('should support very long taxonomy', () => {
      const longTaxonomy = '分类'.repeat(500);
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A',
        taxonomy: longTaxonomy, price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.taxonomy).toBe(longTaxonomy);
    });

    it('should support taxonomy with emoji characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A',
        taxonomy: '📰 新闻', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.taxonomy).toContain('📰');
    });

    it('should support taxonomy with unicode characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A',
        taxonomy: 'カテゴリ', price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.taxonomy).toContain('カテゴリ');
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

    it('should support extremely large price values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: Number.MAX_SAFE_INTEGER, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative large price values', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: -Number.MAX_SAFE_INTEGER, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.price).toBe(-Number.MAX_SAFE_INTEGER);
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

    it('should support very long remark text', () => {
      const longRemark = '备注内容'.repeat(500);
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: longRemark, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toBe(longRemark);
      expect(platform.remark!.length).toBe(2000);
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

    it('should support remark with emoji characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '📝 这是备注 ✅',
        include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toContain('📝');
      expect(platform.remark).toContain('✅');
    });

    it('should support remark with newlines and tabs', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: 'line1\nline2\ttab',
        include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toContain('\n');
      expect(platform.remark).toContain('\t');
    });

    it('should support remark with unicode characters', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: 'プロジェクト Примечание',
        include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark).toContain('プロ');
      expect(platform.remark).toContain('Примечание');
    });

    it('should support remark with whitespace only', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '   ',
        include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark!.trim()).toBe('');
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

    it('should support negative include_rate', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: -0.5, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(-0.5);
    });

    it('should support include_rate greater than 1', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 1.5, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBe(1.5);
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

    it('should support negative publish_rate', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: -0.3,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBe(-0.3);
    });

    it('should support publish_rate greater than 1', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 2.0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.publish_rate).toBe(2.0);
    });

    // --- rate comparisons ---
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

    it('should support updated_at in the far future', () => {
      const future = new Date('2099-12-31T23:59:59Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: future,
      };
      expect(platform.updated_at.getUTCFullYear()).toBe(2099);
    });

    it('should support created_at in the far past', () => {
      const past = new Date('2000-01-01T00:00:00Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: past, updated_at: new Date(),
      };
      expect(platform.created_at.getFullYear()).toBe(2000);
    });

    it('should support Date epoch (1970-01-01)', () => {
      const epoch = new Date(0);
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: epoch, updated_at: epoch,
      };
      expect(platform.created_at.getTime()).toBe(0);
      expect(platform.updated_at.getTime()).toBe(0);
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

    it('should create a platform with low rates', () => {
      const platform: PublishingPlatform = {
        id: 20, rm_resource_id: 20001, name: '低质量平台', taxonomy: '其他',
        price: 10, remark: '收录率低', include_rate: 0.1, publish_rate: 0.05,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.include_rate).toBeLessThan(0.2);
      expect(platform.publish_rate).toBeLessThan(0.1);
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
  });

  // ============================================================
  // 对象操作
  // ============================================================
  describe('PublishingPlatform object operations', () => {
    const createPlatform = (): PublishingPlatform => ({
      id: 1,
      rm_resource_id: 100,
      name: '新浪',
      taxonomy: '门户',
      price: 500,
      remark: '优质资源',
      include_rate: 0.95,
      publish_rate: 0.9,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    });

    it('should be serializable to JSON', () => {
      const platform = createPlatform();
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.rm_resource_id).toBe(100);
      expect(parsed.name).toBe('新浪');
      expect(parsed.taxonomy).toBe('门户');
      expect(parsed.price).toBe(500);
      expect(parsed.remark).toBe('优质资源');
      expect(parsed.include_rate).toBe(0.95);
      expect(parsed.publish_rate).toBe(0.9);
    });

    it('should serialize dates as ISO strings in JSON', () => {
      const platform = createPlatform();
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
    });

    it('should serialize null remark correctly in JSON', () => {
      const platform: PublishingPlatform = {
        ...createPlatform(),
        remark: null,
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.remark).toBeNull();
    });

    it('should support JSON round-trip preserving data types except Date', () => {
      const platform = createPlatform();
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      // After round-trip, dates become strings
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      // Other fields preserve types
      expect(typeof parsed.id).toBe('number');
      expect(typeof parsed.name).toBe('string');
      expect(typeof parsed.price).toBe('number');
      expect(typeof parsed.include_rate).toBe('number');
      expect(typeof parsed.publish_rate).toBe('number');
    });

    it('should be cloneable with spread operator', () => {
      const platform = createPlatform();
      const clone = { ...platform };
      expect(clone).toEqual(platform);
      expect(clone).not.toBe(platform);
    });

    it('should allow field override via spread', () => {
      const platform = createPlatform();
      const updated: PublishingPlatform = { ...platform, name: 'Updated', price: 200 };
      expect(updated.name).toBe('Updated');
      expect(updated.price).toBe(200);
      expect(updated.id).toBe(platform.id);
      expect(updated.include_rate).toBe(platform.include_rate);
    });

    it('should be destructurable', () => {
      const platform = createPlatform();
      const { id, rm_resource_id, name, taxonomy, price, remark, include_rate, publish_rate, created_at, updated_at } = platform;
      expect(id).toBe(1);
      expect(rm_resource_id).toBe(100);
      expect(name).toBe('新浪');
      expect(taxonomy).toBe('门户');
      expect(price).toBe(500);
      expect(remark).toBe('优质资源');
      expect(include_rate).toBe(0.95);
      expect(publish_rate).toBe(0.9);
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should support Object.keys enumeration', () => {
      const platform = createPlatform();
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

    it('should support Object.values enumeration', () => {
      const platform = createPlatform();
      const values = Object.values(platform);
      expect(values).toContain(1);
      expect(values).toContain(100);
      expect(values).toContain('新浪');
      expect(values).toContain('门户');
      expect(values).toContain(500);
      expect(values).toContain('优质资源');
      expect(values).toContain(0.95);
      expect(values).toContain(0.9);
    });

    it('should support Object.entries iteration', () => {
      const platform = createPlatform();
      const entries = Object.entries(platform);
      expect(entries).toHaveLength(10);
      const nameEntry = entries.find(([key]) => key === 'name');
      expect(nameEntry).toBeDefined();
      expect(nameEntry![1]).toBe('新浪');
    });

    it('should support "in" operator', () => {
      const platform = createPlatform();
      expect('id' in platform).toBe(true);
      expect('name' in platform).toBe(true);
      expect('price' in platform).toBe(true);
      expect('remark' in platform).toBe(true);
      expect('nonexistent' in platform).toBe(false);
    });

    it('should support hasOwnProperty checks', () => {
      const platform = createPlatform();
      expect(platform.hasOwnProperty('id')).toBe(true);
      expect(platform.hasOwnProperty('name')).toBe(true);
      expect(platform.hasOwnProperty('remark')).toBe(true);
      expect(platform.hasOwnProperty('nonexistent')).toBe(false);
    });

    it('should support Object.freeze on platform', () => {
      const platform = createPlatform();
      Object.freeze(platform);
      expect(Object.isFrozen(platform)).toBe(true);
    });

    it('should support Object.seal on platform', () => {
      const platform = createPlatform();
      Object.seal(platform);
      expect(Object.isSealed(platform)).toBe(true);
    });

    it('should support overriding remark to null', () => {
      const platform: PublishingPlatform = {
        ...createPlatform(),
        remark: 'test',
      };
      expect(platform.remark).toBe('test');
      // TypeScript interface requires remark, so we override rather than delete
      const overridden: PublishingPlatform = { ...platform, remark: null };
      expect(overridden.remark).toBeNull();
    });
  });

  // ============================================================
  // 数组操作与集合处理
  // ============================================================
  describe('PublishingPlatform array operations', () => {
    const createPlatforms = (): PublishingPlatform[] => [
      { id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
      { id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7, created_at: new Date(), updated_at: new Date() },
      { id: 3, rm_resource_id: 3, name: '微信', taxonomy: '社交媒体', price: 400, remark: '高流量', include_rate: 0.85, publish_rate: 0.8, created_at: new Date(), updated_at: new Date() },
    ];

    it('should support filtering platforms by taxonomy', () => {
      const platforms = createPlatforms();
      const filtered = platforms.filter((p) => p.taxonomy === '门户');
      expect(filtered).toHaveLength(2);
    });

    it('should support filtering platforms by price range', () => {
      const platforms = createPlatforms();
      const expensive = platforms.filter((p) => p.price >= 400);
      expect(expensive).toHaveLength(2);
    });

    it('should support filtering platforms by rate threshold', () => {
      const platforms = createPlatforms();
      const highRate = platforms.filter((p) => p.include_rate >= 0.9);
      expect(highRate).toHaveLength(1);
      expect(highRate[0].name).toBe('新浪');
    });

    it('should support sorting platforms by price', () => {
      const platforms = createPlatforms();
      const sorted = [...platforms].sort((a, b) => a.price - b.price);
      expect(sorted.map((p) => p.name)).toEqual(['搜狐', '微信', '新浪']);
    });

    it('should support sorting platforms by include_rate', () => {
      const platforms = createPlatforms();
      const sorted = [...platforms].sort((a, b) => b.include_rate - a.include_rate);
      expect(sorted[0].name).toBe('新浪');
      expect(sorted[2].name).toBe('搜狐');
    });

    it('should support sorting platforms by id descending', () => {
      const platforms = createPlatforms();
      const sorted = [...platforms].sort((a, b) => b.id - a.id);
      expect(sorted[0].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });

    it('should support mapping platform names', () => {
      const platforms = createPlatforms();
      const names = platforms.map((p) => p.name);
      expect(names).toEqual(['新浪', '搜狐', '微信']);
    });

    it('should support mapping platform ids', () => {
      const platforms = createPlatforms();
      const ids = platforms.map((p) => p.id);
      expect(ids).toEqual([1, 2, 3]);
    });

    it('should support reducing total price', () => {
      const platforms = createPlatforms();
      const total = platforms.reduce((sum, p) => sum + p.price, 0);
      expect(total).toBe(1200);
    });

    it('should support reducing average include_rate', () => {
      const platforms = createPlatforms();
      const avg = platforms.reduce((sum, p) => sum + p.include_rate, 0) / platforms.length;
      expect(avg).toBeCloseTo(0.867, 2);
    });

    it('should support finding platform by name', () => {
      const platforms = createPlatforms();
      const found = platforms.find((p) => p.name === '微信');
      expect(found).toBeDefined();
      expect(found!.price).toBe(400);
    });

    it('should support finding platform by id', () => {
      const platforms = createPlatforms();
      const found = platforms.find((p) => p.id === 2);
      expect(found).toBeDefined();
      expect(found!.name).toBe('搜狐');
    });

    it('should return undefined when platform not found', () => {
      const platforms = createPlatforms();
      const found = platforms.find((p) => p.name === '不存在');
      expect(found).toBeUndefined();
    });

    it('should support checking if some platforms are expensive', () => {
      const platforms = createPlatforms();
      expect(platforms.some((p) => p.price > 400)).toBe(true);
      expect(platforms.some((p) => p.price > 1000)).toBe(false);
    });

    it('should support checking if every platform has positive rate', () => {
      const platforms = createPlatforms();
      expect(platforms.every((p) => p.include_rate > 0)).toBe(true);
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
      expect(platform1.include_rate).toBe(platform2.include_rate);
    });

    it('should support every platform has non-null remark check', () => {
      const platforms = createPlatforms();
      const allWithRemark = platforms.every((p) => p.remark !== null);
      expect(allWithRemark).toBe(false);
    });

    it('should support grouping platforms by taxonomy', () => {
      const platforms = createPlatforms();
      const grouped: Record<string, PublishingPlatform[]> = {};
      platforms.forEach((p) => {
        if (!grouped[p.taxonomy]) grouped[p.taxonomy] = [];
        grouped[p.taxonomy].push(p);
      });
      expect(Object.keys(grouped)).toEqual(['门户', '社交媒体']);
      expect(grouped['门户']).toHaveLength(2);
      expect(grouped['社交媒体']).toHaveLength(1);
    });

    it('should support creating a map from platforms', () => {
      const platforms = createPlatforms();
      const map = new Map(platforms.map((p) => [p.id, p]));
      expect(map.size).toBe(3);
      expect(map.get(1)!.name).toBe('新浪');
      expect(map.get(3)!.name).toBe('微信');
    });

    it('should support slicing platforms array', () => {
      const platforms = createPlatforms();
      const slice = platforms.slice(0, 2);
      expect(slice).toHaveLength(2);
      expect(slice[0].name).toBe('新浪');
      expect(slice[1].name).toBe('搜狐');
    });

    it('should support concatenating platform arrays', () => {
      const arr1 = createPlatforms();
      const arr2: PublishingPlatform[] = [
        { id: 4, rm_resource_id: 4, name: '知乎', taxonomy: '问答', price: 250, remark: null, include_rate: 0.7, publish_rate: 0.6, created_at: new Date(), updated_at: new Date() },
      ];
      const combined = arr1.concat(arr2);
      expect(combined).toHaveLength(4);
      expect(combined[3].name).toBe('知乎');
    });
  });

  // ============================================================
  // 类型收窄与特殊场景
  // ============================================================
  describe('Type narrowing and special scenarios', () => {
    it('should support type narrowing for remark (non-null)', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '备注内容', include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      if (platform.remark !== null) {
        expect(platform.remark.length).toBeGreaterThan(0);
        expect(typeof platform.remark).toBe('string');
      }
    });

    it('should support type narrowing for remark (null)', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      if (platform.remark === null) {
        expect(platform.remark).toBeNull();
      }
    });

    it('should distinguish between null and empty string remark', () => {
      const nullRemark: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const emptyRemark: PublishingPlatform = {
        id: 2, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: '', include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(nullRemark.remark).toBeNull();
      expect(emptyRemark.remark).toBe('');
      expect(nullRemark.remark === null).toBe(true);
      expect(emptyRemark.remark === '').toBe(true);
    });

    it('should support optional chaining on remark', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(platform.remark?.length).toBeUndefined();

      const platformWithRemark: PublishingPlatform = {
        ...platform,
        id: 2,
        remark: '备注',
      };
      expect(platformWithRemark.remark?.length).toBe(2);
    });

    it('should support nullish coalescing on remark', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const remark = platform.remark ?? '默认备注';
      expect(remark).toBe('默认备注');
    });

    it('should support using platform as Map value', () => {
      const map = new Map<number, PublishingPlatform>();
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      map.set(platform.id, platform);
      expect(map.get(1)?.name).toBe('新浪');
      expect(map.get(1)?.price).toBe(500);
    });

    it('should support using platform in Set', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const set = new Set<PublishingPlatform>();
      set.add(platform);
      expect(set.has(platform)).toBe(true);
      expect(set.size).toBe(1);
    });

    it('should compute price per rate point', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };
      const pricePerIncludeRate = platform.price / platform.include_rate;
      const pricePerPublishRate = platform.price / platform.publish_rate;
      expect(pricePerIncludeRate).toBe(200);
      expect(pricePerPublishRate).toBe(200);
    });

    it('should compute average rate', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.8, publish_rate: 0.6,
        created_at: new Date(), updated_at: new Date(),
      };
      const avgRate = (platform.include_rate + platform.publish_rate) / 2;
      expect(avgRate).toBeCloseTo(0.7, 5);
    });

    it('should compute rate difference', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.9, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };
      const diff = platform.include_rate - platform.publish_rate;
      expect(diff).toBe(0.4);
    });

    it('should support Object.assign for merging platform data', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updated = Object.assign({}, platform, { name: 'Updated', price: 999 });
      expect(updated.name).toBe('Updated');
      expect(updated.price).toBe(999);
      expect(updated.id).toBe(1);
      expect(platform.name).toBe('A'); // original unchanged
    });

    it('should support JSON.parse with date revival', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: '备注', include_rate: 0.5, publish_rate: 0.6,
        created_at: new Date('2024-06-01T00:00:00Z'),
        updated_at: new Date('2024-06-15T00:00:00Z'),
      };
      const json = JSON.stringify(platform);
      const revived = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') {
          return new Date(value);
        }
        return value;
      });
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.updated_at).toBeInstanceOf(Date);
      expect(revived.created_at.getFullYear()).toBe(2024);
    });

    it('should support creating platform with computed values', () => {
      const basePrice = 100;
      const multiplier = 5;
      const platform: PublishingPlatform = {
        id: 1,
        rm_resource_id: 1,
        name: '计算平台',
        taxonomy: '测试',
        price: basePrice * multiplier,
        remark: null,
        include_rate: 1 / 3,
        publish_rate: 2 / 3,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(platform.price).toBe(500);
      expect(platform.include_rate).toBeCloseTo(0.333, 2);
      expect(platform.publish_rate).toBeCloseTo(0.667, 2);
    });

    it('should support spread update preserving immutability', () => {
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '原始', taxonomy: 'T',
        price: 100, remark: '原始备注', include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updated: PublishingPlatform = {
        ...original,
        name: '更新',
        price: 200,
        updated_at: new Date(),
      };
      expect(original.name).toBe('原始');
      expect(original.price).toBe(100);
      expect(updated.name).toBe('更新');
      expect(updated.price).toBe(200);
      expect(updated.id).toBe(original.id);
      expect(updated.include_rate).toBe(original.include_rate);
    });

    it('should support sequential updates', () => {
      let platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'V1', taxonomy: '门户',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      // Update 1: change name
      platform = { ...platform, name: 'V2', updated_at: new Date('2024-03-01') };
      expect(platform.name).toBe('V2');
      expect(platform.price).toBe(100);

      // Update 2: change price and rates
      platform = { ...platform, price: 300, include_rate: 0.9, publish_rate: 0.8, updated_at: new Date('2024-06-01') };
      expect(platform.name).toBe('V2');
      expect(platform.price).toBe(300);
      expect(platform.include_rate).toBe(0.9);

      // Update 3: add remark
      platform = { ...platform, remark: '新增备注', updated_at: new Date('2024-09-01') };
      expect(platform.remark).toBe('新增备注');
      expect(platform.price).toBe(300);

      // Final state
      expect(platform.id).toBe(1);
      expect(platform.created_at.getFullYear()).toBe(2024);
    });

    it('should support full CRUD lifecycle', () => {
      // CREATE
      const created: PublishingPlatform = {
        id: 1, rm_resource_id: 1001, name: '新建平台', taxonomy: '自媒体',
        price: 200, remark: '新创建', include_rate: 0.7, publish_rate: 0.6,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(created.name).toBe('新建平台');

      // READ (simulate)
      const found = created;
      expect(found.id).toBe(1);
      expect(found.remark).toBe('新创建');

      // UPDATE
      const updated: PublishingPlatform = {
        ...created,
        name: '更新平台',
        price: 300,
        include_rate: 0.85,
        publish_rate: 0.8,
        updated_at: new Date('2024-06-01'),
      };
      expect(updated.name).toBe('更新平台');
      expect(updated.price).toBe(300);
      expect(updated.created_at.getFullYear()).toBe(2024);
      expect(updated.id).toBe(created.id); // id unchanged

      // DELETE (simulate - set rates to 0)
      const deleted: PublishingPlatform = {
        ...updated,
        include_rate: 0,
        publish_rate: 0,
        updated_at: new Date('2024-12-01'),
      };
      expect(deleted.include_rate).toBe(0);
      expect(deleted.publish_rate).toBe(0);
    });
  });

  // ============================================================
  // 重新导出验证
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from entity', () => {
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

  // ============================================================
  // JSON 序列化往返测试
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('should survive JSON round-trip with all fields', () => {
      const original: PublishingPlatform = {
        id: 42,
        rm_resource_id: 500,
        name: '新浪',
        taxonomy: '门户',
        price: 500,
        remark: '优质媒体',
        include_rate: 0.95,
        publish_rate: 0.9,
        created_at: new Date('2024-06-15T08:30:00Z'),
        updated_at: new Date('2024-06-20T10:00:00Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.id).toBe(42);
      expect(parsed.rm_resource_id).toBe(500);
      expect(parsed.name).toBe('新浪');
      expect(parsed.taxonomy).toBe('门户');
      expect(parsed.price).toBe(500);
      expect(parsed.remark).toBe('优质媒体');
      expect(parsed.include_rate).toBe(0.95);
      expect(parsed.publish_rate).toBe(0.9);
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
    });

    it('should survive JSON round-trip with null remark', () => {
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.remark).toBeNull();
    });

    it('should serialize Date fields to ISO strings', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date('2024-01-15T12:30:45.123Z'),
        updated_at: new Date('2024-06-20T08:00:00.000Z'),
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.created_at).toBe('2024-01-15T12:30:45.123Z');
      expect(parsed.updated_at).toBe('2024-06-20T08:00:00.000Z');
    });

    it('should preserve number precision through JSON round-trip', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 99.99, remark: null, include_rate: 0.333, publish_rate: 0.667,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.price).toBe(99.99);
      expect(parsed.include_rate).toBeCloseTo(0.333, 3);
      expect(parsed.publish_rate).toBeCloseTo(0.667, 3);
    });

    it('platform array should survive JSON round-trip', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 101, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
        { id: 2, rm_resource_id: 102, name: '搜狐', taxonomy: '门户', price: 300, remark: '高流量', include_rate: 0.8, publish_rate: 0.7, created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      ];
      const json = JSON.stringify(platforms);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('新浪');
      expect(parsed[1].remark).toBe('高流量');
    });

    it('should preserve Chinese characters through JSON round-trip', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '薄云商机倍增服务', taxonomy: '国家级媒体',
        price: 10000, remark: '优质资源备注', include_rate: 0.99, publish_rate: 0.98,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('薄云商机倍增服务');
      expect(parsed.taxonomy).toBe('国家级媒体');
      expect(parsed.remark).toBe('优质资源备注');
    });

    it('should preserve all numeric fields through JSON round-trip', () => {
      const platform: PublishingPlatform = {
        id: Number.MAX_SAFE_INTEGER, rm_resource_id: 99999,
        name: 'A', taxonomy: 'B', price: 0, remark: null,
        include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(platform);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(parsed.rm_resource_id).toBe(99999);
    });
  });

  // ============================================================
  // Object.freeze 不可变性（拒绝修改验证）
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen platform should reject name mutation', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(platform);
      expect(() => { (platform as any).name = '搜狐'; }).toThrow();
      expect(platform.name).toBe('新浪');
    });

    it('frozen platform should reject price mutation', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 500, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(platform);
      expect(() => { (platform as any).price = 0; }).toThrow();
      expect(platform.price).toBe(500);
    });

    it('frozen platform should reject id mutation', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(platform);
      expect(() => { (platform as any).id = 999; }).toThrow();
      expect(platform.id).toBe(1);
    });

    it('frozen platform should reject include_rate mutation', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0.95, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(platform);
      expect(() => { (platform as any).include_rate = 0; }).toThrow();
      expect(platform.include_rate).toBe(0.95);
    });

    it('frozen platform should reject remark mutation', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(platform);
      expect(() => { (platform as any).remark = 'new remark'; }).toThrow();
      expect(platform.remark).toBeNull();
    });

    it('frozen platform should reject adding new fields', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(platform);
      expect(() => { (platform as any).extra_field = 'test'; }).toThrow();
      expect((platform as any).extra_field).toBeUndefined();
    });

    it('Object.isFrozen should return true for frozen platform', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.isFrozen(platform)).toBe(false);
      Object.freeze(platform);
      expect(Object.isFrozen(platform)).toBe(true);
    });
  });

  // ============================================================
  // 结构相等与深拷贝
  // ============================================================
  describe('structural equality and deep copy', () => {
    const sharedDate = new Date('2024-01-01T00:00:00Z');

    it('two platforms with same values should be structurally equal', () => {
      const platform1: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '优质', include_rate: 0.95, publish_rate: 0.9,
        created_at: sharedDate, updated_at: sharedDate,
      };
      const platform2: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '优质', include_rate: 0.95, publish_rate: 0.9,
        created_at: sharedDate, updated_at: sharedDate,
      };
      expect(platform1).toEqual(platform2);
      expect(platform1).not.toBe(platform2);
    });

    it('spread copy should be structurally equal but different reference', () => {
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: sharedDate, updated_at: sharedDate,
      };
      const copy = { ...original };
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy.created_at).toBe(original.created_at); // shallow copy shares Date ref
    });

    it('JSON parse/stringify should create deep copy of platform', () => {
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '备注', include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-06-01'),
      };
      const deepCopy = JSON.parse(JSON.stringify(original));
      expect(deepCopy.id).toBe(original.id);
      expect(deepCopy.name).toBe(original.name);
      expect(deepCopy.price).toBe(original.price);
      expect(deepCopy.include_rate).toBe(original.include_rate);
      expect(typeof deepCopy.created_at).toBe('string'); // Date becomes string
      expect(typeof deepCopy.updated_at).toBe('string');
    });

    it('JSON deep copy should be independent from original', () => {
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: '备注', include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const copy = JSON.parse(JSON.stringify(original));
      copy.name = '搜狐';
      copy.price = 300;
      expect(original.name).toBe('新浪');
      expect(original.price).toBe(500);
    });

    it('spread copy of platform with null remark should be structurally equal', () => {
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: sharedDate, updated_at: sharedDate,
      };
      const copy = { ...original };
      expect(copy.remark).toBeNull();
      expect(copy).toEqual(original);
    });
  });

  // ============================================================
  // 解构模式（rest 运算符）
  // ============================================================
  describe('destructuring patterns', () => {
    it('should use rest operator for partial extraction', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '优质', include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, created_at, updated_at, ...rest } = platform;
      expect(id).toBe(1);
      expect(rest).toEqual({
        rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '优质', include_rate: 0.95, publish_rate: 0.9,
      });
    });

    it('should destructure all fields individually', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 100, name: '新浪', taxonomy: '门户',
        price: 500, remark: '优质', include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
      };
      const { id, rm_resource_id, name, taxonomy, price, remark, include_rate, publish_rate, created_at, updated_at } = platform;
      expect(id).toBe(1);
      expect(rm_resource_id).toBe(100);
      expect(name).toBe('新浪');
      expect(taxonomy).toBe('门户');
      expect(price).toBe(500);
      expect(remark).toBe('优质');
      expect(include_rate).toBe(0.95);
      expect(publish_rate).toBe(0.9);
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should destructure with computed property access', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const keys = ['name', 'taxonomy', 'price'] as const;
      const values = keys.map(k => platform[k]);
      expect(values).toEqual(['新浪', '门户', 500]);
    });

    it('should use rest operator to extract rates only', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const { include_rate, publish_rate } = platform;
      expect(include_rate).toBe(0.95);
      expect(publish_rate).toBe(0.9);
    });
  });

  // ============================================================
  // 集合高级操作
  // ============================================================
  describe('collection advanced operations', () => {
    const createPlatforms = (): PublishingPlatform[] => [
      { id: 1, rm_resource_id: 101, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 2, rm_resource_id: 102, name: '搜狐', taxonomy: '门户', price: 300, remark: '高流量', include_rate: 0.8, publish_rate: 0.7, created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      { id: 3, rm_resource_id: 103, name: '微信', taxonomy: '社交媒体', price: 400, remark: '高流量', include_rate: 0.85, publish_rate: 0.8, created_at: new Date('2024-03-01'), updated_at: new Date('2024-03-01') },
      { id: 4, rm_resource_id: 104, name: '知乎', taxonomy: '问答', price: 250, remark: null, include_rate: 0.7, publish_rate: 0.6, created_at: new Date('2024-04-01'), updated_at: new Date('2024-04-01') },
      { id: 5, rm_resource_id: 105, name: '今日头条', taxonomy: '自媒体', price: 200, remark: '高流量', include_rate: 0.75, publish_rate: 0.65, created_at: new Date('2024-05-01'), updated_at: new Date('2024-05-01') },
    ];

    it('should reduce platforms to taxonomy count map', () => {
      const platforms = createPlatforms();
      const countByTaxonomy = platforms.reduce<Record<string, number>>((acc, p) => {
        acc[p.taxonomy] = (acc[p.taxonomy] || 0) + 1;
        return acc;
      }, {});
      expect(countByTaxonomy['门户']).toBe(2);
      expect(countByTaxonomy['社交媒体']).toBe(1);
      expect(countByTaxonomy['问答']).toBe(1);
      expect(countByTaxonomy['自媒体']).toBe(1);
    });

    it('should filter and map in chain', () => {
      const platforms = createPlatforms();
      const expensiveNames = platforms.filter(p => p.price >= 400).map(p => p.name);
      expect(expensiveNames).toEqual(['新浪', '微信']);
    });

    it('should find index of platform by name', () => {
      const platforms = createPlatforms();
      const idx = platforms.findIndex(p => p.name === '知乎');
      expect(idx).toBe(3);
    });

    it('should return -1 from findIndex for non-existent name', () => {
      const platforms = createPlatforms();
      const idx = platforms.findIndex(p => p.name === '不存在');
      expect(idx).toBe(-1);
    });

    it('should flatMap platform names with taxonomy prefix', () => {
      const platforms = createPlatforms();
      const displayNames = platforms.flatMap(p => [`${p.taxonomy}/${p.name}`]);
      expect(displayNames).toHaveLength(5);
      expect(displayNames[0]).toBe('门户/新浪');
      expect(displayNames[2]).toBe('社交媒体/微信');
    });

    it('should use reduce to build id-to-platform map', () => {
      const platforms = createPlatforms();
      const idMap = platforms.reduce<Map<number, PublishingPlatform>>((map, p) => {
        map.set(p.id, p);
        return map;
      }, new Map());
      expect(idMap.get(1)!.name).toBe('新浪');
      expect(idMap.get(3)!.taxonomy).toBe('社交媒体');
      expect(idMap.has(99)).toBe(false);
    });

    it('should group platforms with remark vs without remark', () => {
      const platforms = createPlatforms();
      const withRemark = platforms.filter(p => p.remark !== null);
      const withoutRemark = platforms.filter(p => p.remark === null);
      expect(withRemark).toHaveLength(3);
      expect(withoutRemark).toHaveLength(2);
    });

    it('should compute total price across all platforms', () => {
      const platforms = createPlatforms();
      const total = platforms.reduce((sum, p) => sum + p.price, 0);
      expect(total).toBe(1650);
    });

    it('should compute average include_rate across all platforms', () => {
      const platforms = createPlatforms();
      const avg = platforms.reduce((sum, p) => sum + p.include_rate, 0) / platforms.length;
      expect(avg).toBeCloseTo(0.81, 1);
    });

    it('should find platform with highest publish_rate', () => {
      const platforms = createPlatforms();
      const best = platforms.reduce((best, p) => p.publish_rate > best.publish_rate ? p : best);
      expect(best.name).toBe('新浪');
      expect(best.publish_rate).toBe(0.9);
    });

    it('should find platform with lowest price', () => {
      const platforms = createPlatforms();
      const cheapest = platforms.reduce((min, p) => p.price < min.price ? p : min);
      expect(cheapest.name).toBe('今日头条');
      expect(cheapest.price).toBe(200);
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('consecutive update chains', () => {
    it('should apply 3 consecutive updates preserving integrity', () => {
      let platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1001, name: '新建平台', taxonomy: '自媒体',
        price: 200, remark: '初始', include_rate: 0.7, publish_rate: 0.6,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      // Update 1: change name
      platform = { ...platform, name: '更新平台V2', updated_at: new Date('2024-03-01') };
      expect(platform.name).toBe('更新平台V2');
      expect(platform.price).toBe(200);

      // Update 2: change price and rates
      platform = { ...platform, price: 500, include_rate: 0.9, publish_rate: 0.85, updated_at: new Date('2024-06-01') };
      expect(platform.name).toBe('更新平台V2');
      expect(platform.price).toBe(500);
      expect(platform.include_rate).toBe(0.9);

      // Update 3: change remark and taxonomy
      platform = { ...platform, remark: '升级为优质平台', taxonomy: '门户', updated_at: new Date('2024-09-01') };
      expect(platform.remark).toBe('升级为优质平台');
      expect(platform.taxonomy).toBe('门户');
      expect(platform.price).toBe(500); // retained

      // Verify final state
      expect(platform.id).toBe(1);
      expect(platform.rm_resource_id).toBe(1001); // always retained
      expect(platform.created_at.getFullYear()).toBe(2024);
    });

    it('should handle price update sequence', () => {
      let platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      platform = { ...platform, price: 200, updated_at: new Date('2024-02-01') };
      expect(platform.price).toBe(200);

      platform = { ...platform, price: 500, updated_at: new Date('2024-03-01') };
      expect(platform.price).toBe(500);

      platform = { ...platform, price: 0, updated_at: new Date('2024-04-01') };
      expect(platform.price).toBe(0);
    });

    it('should handle remark toggle (null -> string -> null)', () => {
      let platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(platform.remark).toBeNull();

      platform = { ...platform, remark: '新增备注', updated_at: new Date('2024-03-01') };
      expect(platform.remark).toBe('新增备注');

      platform = { ...platform, remark: null, updated_at: new Date('2024-06-01') };
      expect(platform.remark).toBeNull();
    });

    it('should handle 5 consecutive partial updates', () => {
      let platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'N1', taxonomy: 'T1',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };

      platform = { ...platform, name: 'N2', updated_at: new Date() };
      platform = { ...platform, taxonomy: 'T2', updated_at: new Date() };
      platform = { ...platform, price: 200, updated_at: new Date() };
      platform = { ...platform, include_rate: 0.9, updated_at: new Date() };
      platform = { ...platform, publish_rate: 0.85, updated_at: new Date() };

      expect(platform.name).toBe('N2');
      expect(platform.taxonomy).toBe('T2');
      expect(platform.price).toBe(200);
      expect(platform.include_rate).toBe(0.9);
      expect(platform.publish_rate).toBe(0.85);
      expect(platform.id).toBe(1); // always retained
    });
  });

  // ============================================================
  // 日期操作（时区、算术）
  // ============================================================
  describe('Date operations', () => {
    it('should support created_at with millisecond precision', () => {
      const date = new Date('2024-06-15T12:30:45.123Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: date, updated_at: date,
      };
      expect(platform.created_at.getMilliseconds()).toBe(123);
    });

    it('should support date arithmetic between created_at and updated_at', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-06-01T00:00:00Z');
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: created, updated_at: updated,
      };
      const diffMs = platform.updated_at.getTime() - platform.created_at.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(150);
      expect(diffDays).toBeLessThan(153);
    });

    it('should support updating updated_at to current time', () => {
      const before = new Date();
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date('2024-01-01'),
        updated_at: before,
      };
      platform.updated_at = new Date();
      expect(platform.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should support sorting platforms by created_at', () => {
      const platforms: PublishingPlatform[] = [
        { id: 3, rm_resource_id: 3, name: 'C', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2024-06-01'), updated_at: new Date() },
        { id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2024-01-01'), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: 'B', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2024-03-01'), updated_at: new Date() },
      ];
      const sorted = [...platforms].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should detect stale platforms via date comparison', () => {
      const staleThreshold = new Date('2024-01-01');
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: '旧平台', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2023-06-01'), updated_at: new Date('2023-06-01') },
        { id: 2, rm_resource_id: 2, name: '新平台', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01') },
      ];
      const stale = platforms.filter(p => p.updated_at < staleThreshold);
      expect(stale).toHaveLength(1);
      expect(stale[0].name).toBe('旧平台');
    });

    it('should support Date.now() for updated_at assignment', () => {
      const before = Date.now();
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(before),
      };
      const after = Date.now();
      expect(platform.updated_at.getTime()).toBeGreaterThanOrEqual(before);
      expect(platform.updated_at.getTime()).toBeLessThanOrEqual(after);
    });

    it('should support platforms from different years', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2020-01-01'), updated_at: new Date('2020-01-01') },
        { id: 2, rm_resource_id: 2, name: 'B', taxonomy: 'T', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date('2025-06-15'), updated_at: new Date('2025-06-15') },
      ];
      expect(platforms[0].created_at.getFullYear()).toBe(2020);
      expect(platforms[1].created_at.getFullYear()).toBe(2025);
    });
  });

  // ============================================================
  // Set/Map 操作
  // ============================================================
  describe('Set/Map operations', () => {
    it('should collect unique taxonomies into Set', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 3, rm_resource_id: 3, name: '微信', taxonomy: '社交媒体', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 4, rm_resource_id: 4, name: '知乎', taxonomy: '问答', price: 0, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
      ];
      const taxonomies = new Set(platforms.map(p => p.taxonomy));
      expect(taxonomies.size).toBe(3);
      expect(taxonomies.has('门户')).toBe(true);
      expect(taxonomies.has('社交媒体')).toBe(true);
      expect(taxonomies.has('问答')).toBe(true);
    });

    it('should store platforms in Map keyed by id', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 101, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 102, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7, created_at: new Date(), updated_at: new Date() },
      ];
      const platformMap = new Map(platforms.map(p => [p.id, p]));
      expect(platformMap.get(1)!.name).toBe('新浪');
      expect(platformMap.get(2)!.price).toBe(300);
      expect(platformMap.has(3)).toBe(false);
    });

    it('should build Map from platforms by rm_resource_id', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1001, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2001, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
      ];
      const resourceMap = new Map(platforms.map(p => [p.rm_resource_id, p]));
      expect(resourceMap.get(1001)!.name).toBe('新浪');
      expect(resourceMap.get(2001)!.price).toBe(300);
    });

    it('should collect unique price values into Set', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'T', price: 500, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: 'B', taxonomy: 'T', price: 500, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 3, rm_resource_id: 3, name: 'C', taxonomy: 'T', price: 300, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
      ];
      const prices = new Set(platforms.map(p => p.price));
      expect(prices.size).toBe(2);
      expect(prices.has(500)).toBe(true);
      expect(prices.has(300)).toBe(true);
    });

    it('should use Map for platform lookup by name', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0, publish_rate: 0, created_at: new Date(), updated_at: new Date() },
      ];
      const nameMap = new Map(platforms.map(p => [p.name, p]));
      expect(nameMap.get('新浪')!.price).toBe(500);
      expect(nameMap.get('搜狐')!.id).toBe(2);
      expect(nameMap.has('不存在')).toBe(false);
    });
  });

  // ============================================================
  // 属性描述符
  // ============================================================
  describe('property ownership and descriptors', () => {
    it('should verify hasOwnProperty for all PublishingPlatform fields', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.prototype.hasOwnProperty.call(platform, 'id')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'rm_resource_id')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'name')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'taxonomy')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'price')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'remark')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'include_rate')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'publish_rate')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'created_at')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'updated_at')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(platform, 'nonexistent')).toBe(false);
    });

    it('should verify all fields are enumerable', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 0, remark: null, include_rate: 0, publish_rate: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.keys(platform).forEach(key => {
        const desc = Object.getOwnPropertyDescriptor(platform, key);
        expect(desc!.enumerable).toBe(true);
        expect(desc!.writable).toBe(true);
        expect(desc!.configurable).toBe(true);
      });
    });

    it('should allow property reassignment on unfrozen platform', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      platform.name = '搜狐';
      platform.price = 300;
      expect(platform.name).toBe('搜狐');
      expect(platform.price).toBe(300);
    });

    it('should verify property descriptor for specific fields', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'B',
        price: 100, remark: null, include_rate: 0.5, publish_rate: 0.5,
        created_at: new Date(), updated_at: new Date(),
      };
      const priceDesc = Object.getOwnPropertyDescriptor(platform, 'price');
      expect(priceDesc!.value).toBe(100);
      expect(priceDesc!.writable).toBe(true);
      expect(priceDesc!.configurable).toBe(true);
      expect(priceDesc!.enumerable).toBe(true);

      const remarkDesc = Object.getOwnPropertyDescriptor(platform, 'remark');
      expect(remarkDesc!.value).toBeNull();
      expect(remarkDesc!.writable).toBe(true);
    });
  });

  // ============================================================
  // 函数参数传递与返回值
  // ============================================================
  describe('function parameter passing and return values', () => {
    const mockTransform = (platform: PublishingPlatform): { displayName: string; costPerRate: number } => ({
      displayName: `${platform.taxonomy} - ${platform.name}`,
      costPerRate: platform.include_rate > 0 ? platform.price / platform.include_rate : 0,
    });

    const mockCompare = (a: PublishingPlatform, b: PublishingPlatform): number => {
      if (a.include_rate !== b.include_rate) return b.include_rate - a.include_rate;
      return a.price - b.price;
    };

    it('should pass platform to transform function', () => {
      const platform: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const result = mockTransform(platform);
      expect(result.displayName).toBe('门户 - 新浪');
      expect(result.costPerRate).toBeCloseTo(526.316, 1);
    });

    it('should pass platforms to compare function', () => {
      const platformA: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'T',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date(), updated_at: new Date(),
      };
      const platformB: PublishingPlatform = {
        id: 2, rm_resource_id: 2, name: 'B', taxonomy: 'T',
        price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7,
        created_at: new Date(), updated_at: new Date(),
      };
      const result = mockCompare(platformA, platformB);
      expect(result).toBeLessThan(0); // A has higher include_rate, so B - A < 0
    });

    it('should use platform in filter callback', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: 'A', taxonomy: 'T', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: 'B', taxonomy: 'T', price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7, created_at: new Date(), updated_at: new Date() },
      ];
      const premium = platforms.filter(p => p.include_rate >= 0.9);
      expect(premium).toHaveLength(1);
      expect(premium[0].name).toBe('A');
    });

    it('should use platform in map callback to extract summary', () => {
      const platforms: PublishingPlatform[] = [
        { id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户', price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9, created_at: new Date(), updated_at: new Date() },
        { id: 2, rm_resource_id: 2, name: '搜狐', taxonomy: '门户', price: 300, remark: null, include_rate: 0.8, publish_rate: 0.7, created_at: new Date(), updated_at: new Date() },
      ];
      const summaries = platforms.map(p => ({ id: p.id, name: p.name, price: p.price }));
      expect(summaries).toEqual([
        { id: 1, name: '新浪', price: 500 },
        { id: 2, name: '搜狐', price: 300 },
      ]);
    });

    it('should create platform copy via function returning new object', () => {
      const clonePlatform = (source: PublishingPlatform, overrides: Partial<PublishingPlatform>): PublishingPlatform => ({
        ...source,
        ...overrides,
        updated_at: new Date(),
      });
      const original: PublishingPlatform = {
        id: 1, rm_resource_id: 1, name: '新浪', taxonomy: '门户',
        price: 500, remark: null, include_rate: 0.95, publish_rate: 0.9,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const cloned = clonePlatform(original, { name: '搜狐', price: 300 });
      expect(cloned.name).toBe('搜狐');
      expect(cloned.price).toBe(300);
      expect(cloned.id).toBe(1);
      expect(cloned.include_rate).toBe(0.95);
      expect(original.name).toBe('新浪'); // original unchanged
    });
  });
});
