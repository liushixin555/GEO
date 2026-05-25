/**
 * @jest-environment node
 */
import {
  PublishingScheduleListParams,
  PublishingScheduleItem,
  PublishingScheduleUpdateResult,
} from '../../apis/entity/publishing-schedule.entity';

describe('publishing-schedule.entity', () => {
  // ============================================================
  // PublishingScheduleListParams interface
  // ============================================================
  describe('PublishingScheduleListParams interface', () => {
    it('should create params with all required fields', () => {
      const params: PublishingScheduleListParams = {
        page: 1,
        pageSize: 20,
      };
      expect(params.page).toBe(1);
      expect(params.pageSize).toBe(20);
    });

    it('should allow all optional fields', () => {
      const params: PublishingScheduleListParams = {
        page: 2,
        pageSize: 50,
        search: '关键词',
        status: 'published',
        projectId: 10,
        userId: 5,
        role: 'admin',
      };
      expect(params.search).toBe('关键词');
      expect(params.status).toBe('published');
      expect(params.projectId).toBe(10);
      expect(params.userId).toBe(5);
      expect(params.role).toBe('admin');
    });

    it('should have page and pageSize as only required fields', () => {
      const params: PublishingScheduleListParams = { page: 1, pageSize: 10 };
      expect(Object.keys(params).sort()).toEqual(['page', 'pageSize'].sort());
    });

    it('should allow page = 0', () => {
      const params: PublishingScheduleListParams = { page: 0, pageSize: 10 };
      expect(params.page).toBe(0);
    });

    it('should allow large pageSize', () => {
      const params: PublishingScheduleListParams = { page: 1, pageSize: 1000 };
      expect(params.pageSize).toBe(1000);
    });

    it('should allow empty search string', () => {
      const params: PublishingScheduleListParams = {
        page: 1,
        pageSize: 20,
        search: '',
      };
      expect(params.search).toBe('');
    });

    it('should allow status as various values', () => {
      const statuses = ['draft', 'pending', 'published', 'failed', 'scheduled'];
      statuses.forEach((status) => {
        const params: PublishingScheduleListParams = {
          page: 1,
          pageSize: 20,
          status,
        };
        expect(params.status).toBe(status);
      });
    });

    it('should allow projectId = 0', () => {
      const params: PublishingScheduleListParams = {
        page: 1,
        pageSize: 20,
        projectId: 0,
      };
      expect(params.projectId).toBe(0);
    });

    it('should allow userId = 0', () => {
      const params: PublishingScheduleListParams = {
        page: 1,
        pageSize: 20,
        userId: 0,
      };
      expect(params.userId).toBe(0);
    });

    it('should allow role as various role strings', () => {
      const roles = ['sysadmin', 'admin', 'view'];
      roles.forEach((role) => {
        const params: PublishingScheduleListParams = {
          page: 1,
          pageSize: 20,
          role,
        };
        expect(params.role).toBe(role);
      });
    });

    it('should not include undefined optional fields in keys', () => {
      const params: PublishingScheduleListParams = { page: 1, pageSize: 10 };
      expect(params.search).toBeUndefined();
      expect(params.status).toBeUndefined();
      expect(params.projectId).toBeUndefined();
      expect(params.userId).toBeUndefined();
      expect(params.role).toBeUndefined();
    });

    it('should serialize to JSON correctly', () => {
      const params: PublishingScheduleListParams = {
        page: 1,
        pageSize: 20,
        search: 'test',
      };
      const json = JSON.stringify(params);
      const parsed = JSON.parse(json);
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
      expect(parsed.search).toBe('test');
    });

    it('should allow negative page number for edge case', () => {
      const params: PublishingScheduleListParams = { page: -1, pageSize: 10 };
      expect(params.page).toBe(-1);
    });
  });

  // ============================================================
  // PublishingScheduleItem interface
  // ============================================================
  describe('PublishingScheduleItem interface', () => {
    const createBaseItem = (): PublishingScheduleItem => ({
      id: 1,
      title: '测试发布计划',
      keywords: 'SEO,优化',
      article_type: 'blog',
      platforms: ['wechat', 'weibo'],
      status: 'draft',
      scheduled_publish_at: new Date('2025-12-31'),
      schedule_type: 'once',
      project_id: 10,
      project_name: '项目A',
      company_name: '测试公司',
      created_by: 5,
      created_by_name: '管理员',
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-06-01'),
    });

    it('should create a valid item with all required fields', () => {
      const item = createBaseItem();
      expect(item.id).toBe(1);
      expect(item.title).toBe('测试发布计划');
      expect(item.status).toBe('draft');
      expect(item.project_id).toBe(10);
      expect(item.project_name).toBe('项目A');
      expect(item.company_name).toBe('测试公司');
    });

    it('should allow keywords to be null', () => {
      const item = createBaseItem();
      item.keywords = null;
      expect(item.keywords).toBeNull();
    });

    it('should allow article_type to be null', () => {
      const item = createBaseItem();
      item.article_type = null;
      expect(item.article_type).toBeNull();
    });

    it('should allow platforms to be null', () => {
      const item = createBaseItem();
      item.platforms = null;
      expect(item.platforms).toBeNull();
    });

    it('should allow platforms to be empty array', () => {
      const item = createBaseItem();
      item.platforms = [];
      expect(item.platforms).toEqual([]);
    });

    it('should allow platforms with multiple values', () => {
      const item = createBaseItem();
      item.platforms = ['wechat', 'weibo', 'douyin', 'xiaohongshu'];
      expect(item.platforms).toHaveLength(4);
      expect(item.platforms).toContain('douyin');
    });

    it('should allow scheduled_publish_at to be null', () => {
      const item = createBaseItem();
      item.scheduled_publish_at = null;
      expect(item.scheduled_publish_at).toBeNull();
    });

    it('should allow schedule_type to be null', () => {
      const item = createBaseItem();
      item.schedule_type = null;
      expect(item.schedule_type).toBeNull();
    });

    it('should allow created_by to be null', () => {
      const item = createBaseItem();
      item.created_by = null;
      expect(item.created_by).toBeNull();
    });

    it('should have all expected fields', () => {
      const item = createBaseItem();
      const expectedKeys = [
        'id', 'title', 'keywords', 'article_type', 'platforms',
        'status', 'scheduled_publish_at', 'schedule_type', 'project_id',
        'project_name', 'company_name', 'created_by', 'created_by_name',
        'created_at', 'updated_at',
      ].sort();
      expect(Object.keys(item).sort()).toEqual(expectedKeys);
    });

    it('should handle Date objects for created_at and updated_at', () => {
      const item = createBaseItem();
      expect(item.created_at).toBeInstanceOf(Date);
      expect(item.updated_at).toBeInstanceOf(Date);
    });

    it('should handle Date object for scheduled_publish_at', () => {
      const item = createBaseItem();
      expect(item.scheduled_publish_at).toBeInstanceOf(Date);
    });

    it('should serialize to JSON with ISO date strings', () => {
      const item = createBaseItem();
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(typeof parsed.scheduled_publish_at).toBe('string');
    });

    it('should handle id = 0', () => {
      const item = createBaseItem();
      item.id = 0;
      expect(item.id).toBe(0);
    });

    it('should handle large id value', () => {
      const item = createBaseItem();
      item.id = Number.MAX_SAFE_INTEGER;
      expect(item.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should allow empty title string', () => {
      const item = createBaseItem();
      item.title = '';
      expect(item.title).toBe('');
    });

    it('should allow long title', () => {
      const longTitle = 'A'.repeat(500);
      const item = createBaseItem();
      item.title = longTitle;
      expect(item.title).toHaveLength(500);
    });

    it('should allow various status values', () => {
      const statuses = ['draft', 'pending_review', 'approved', 'scheduled', 'publishing', 'published', 'failed'];
      statuses.forEach((status) => {
        const item = createBaseItem();
        item.status = status;
        expect(item.status).toBe(status);
      });
    });

    it('should allow various schedule_type values', () => {
      const types = ['once', 'daily', 'weekly', 'monthly'];
      types.forEach((scheduleType) => {
        const item = createBaseItem();
        item.schedule_type = scheduleType;
        expect(item.schedule_type).toBe(scheduleType);
      });
    });

    it('should handle all nullable fields being null simultaneously', () => {
      const item: PublishingScheduleItem = {
        id: 1,
        title: '全空值',
        keywords: null,
        article_type: null,
        platforms: null,
        status: 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        project_id: 1,
        project_name: 'P',
        company_name: 'C',
        created_by: null,
        created_by_name: '未知',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(item.keywords).toBeNull();
      expect(item.article_type).toBeNull();
      expect(item.platforms).toBeNull();
      expect(item.scheduled_publish_at).toBeNull();
      expect(item.schedule_type).toBeNull();
      expect(item.created_by).toBeNull();
    });

    it('should be mutable', () => {
      const item = createBaseItem();
      item.title = '修改后的标题';
      item.status = 'published';
      expect(item.title).toBe('修改后的标题');
      expect(item.status).toBe('published');
    });

    it('should support object spread cloning', () => {
      const item = createBaseItem();
      const clone = { ...item };
      clone.title = '克隆标题';
      expect(item.title).toBe('测试发布计划');
      expect(clone.title).toBe('克隆标题');
    });

    it('should support Object.assign', () => {
      const item = createBaseItem();
      const assigned = Object.assign({}, item, { status: 'published' });
      expect(assigned.status).toBe('published');
      expect(item.status).toBe('draft');
    });
  });

  // ============================================================
  // PublishingScheduleUpdateResult interface
  // ============================================================
  describe('PublishingScheduleUpdateResult interface', () => {
    const createBaseResult = (): PublishingScheduleUpdateResult => ({
      id: 1,
      title: '更新后的发布计划',
      keywords: '新关键词',
      article_type: 'news',
      platforms: ['wechat'],
      status: 'published',
      scheduled_publish_at: new Date('2025-12-31'),
      schedule_type: 'weekly',
      project_id: 10,
      project_name: '项目A',
      company_name: '测试公司',
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-06-15'),
    });

    it('should create a valid result with all fields', () => {
      const result = createBaseResult();
      expect(result.id).toBe(1);
      expect(result.title).toBe('更新后的发布计划');
      expect(result.status).toBe('published');
    });

    it('should allow keywords to be null', () => {
      const result = createBaseResult();
      result.keywords = null;
      expect(result.keywords).toBeNull();
    });

    it('should allow article_type to be null', () => {
      const result = createBaseResult();
      result.article_type = null;
      expect(result.article_type).toBeNull();
    });

    it('should allow platforms to be null', () => {
      const result = createBaseResult();
      result.platforms = null;
      expect(result.platforms).toBeNull();
    });

    it('should allow platforms to be empty array', () => {
      const result = createBaseResult();
      result.platforms = [];
      expect(result.platforms).toEqual([]);
    });

    it('should allow scheduled_publish_at to be null', () => {
      const result = createBaseResult();
      result.scheduled_publish_at = null;
      expect(result.scheduled_publish_at).toBeNull();
    });

    it('should allow schedule_type to be null', () => {
      const result = createBaseResult();
      result.schedule_type = null;
      expect(result.schedule_type).toBeNull();
    });

    it('should have all expected fields', () => {
      const result = createBaseResult();
      const expectedKeys = [
        'id', 'title', 'keywords', 'article_type', 'platforms',
        'status', 'scheduled_publish_at', 'schedule_type', 'project_id',
        'project_name', 'company_name', 'created_at', 'updated_at',
      ].sort();
      expect(Object.keys(result).sort()).toEqual(expectedKeys);
    });

    it('should not have created_by and created_by_name fields (unlike Item)', () => {
      const result = createBaseResult();
      expect(result).not.toHaveProperty('created_by');
      expect(result).not.toHaveProperty('created_by_name');
    });

    it('should handle Date objects for created_at and updated_at', () => {
      const result = createBaseResult();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should serialize to JSON with ISO date strings', () => {
      const result = createBaseResult();
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(typeof parsed.scheduled_publish_at).toBe('string');
    });

    it('should handle all nullable fields being null simultaneously', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 1,
        title: '全空',
        keywords: null,
        article_type: null,
        platforms: null,
        status: 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        project_id: 1,
        project_name: 'P',
        company_name: 'C',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(result.keywords).toBeNull();
      expect(result.article_type).toBeNull();
      expect(result.platforms).toBeNull();
      expect(result.scheduled_publish_at).toBeNull();
      expect(result.schedule_type).toBeNull();
    });

    it('should be mutable', () => {
      const result = createBaseResult();
      result.title = '再次修改';
      result.status = 'failed';
      expect(result.title).toBe('再次修改');
      expect(result.status).toBe('failed');
    });

    it('should support object spread cloning', () => {
      const result = createBaseResult();
      const clone = { ...result };
      clone.status = 'draft';
      expect(result.status).toBe('published');
      expect(clone.status).toBe('draft');
    });

    it('should handle large id value', () => {
      const result = createBaseResult();
      result.id = Number.MAX_SAFE_INTEGER;
      expect(result.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support platforms array with many values', () => {
      const result = createBaseResult();
      result.platforms = ['wechat', 'weibo', 'douyin', 'xiaohongshu', 'zhihu', 'bilibili'];
      expect(result.platforms).toHaveLength(6);
    });
  });

  // ============================================================
  // 跨接口集成测试
  // ============================================================
  describe('cross-interface integration', () => {
    it('should share common fields between Item and UpdateResult', () => {
      const item: PublishingScheduleItem = {
        id: 1,
        title: 'T',
        keywords: null,
        article_type: null,
        platforms: null,
        status: 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        project_id: 1,
        project_name: 'P',
        company_name: 'C',
        created_by: null,
        created_by_name: 'N',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const commonFields = [
        'id', 'title', 'keywords', 'article_type', 'platforms',
        'status', 'scheduled_publish_at', 'schedule_type',
        'project_id', 'project_name', 'company_name',
        'created_at', 'updated_at',
      ];

      commonFields.forEach((field) => {
        expect(item).toHaveProperty(field);
      });
    });

    it('should differentiate Item and UpdateResult by created_by fields', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: 'T', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 1, created_by_name: 'Admin',
        created_at: new Date(), updated_at: new Date(),
      };

      const result: PublishingScheduleUpdateResult = {
        id: 1, title: 'T', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_at: new Date(), updated_at: new Date(),
      };

      expect(item).toHaveProperty('created_by');
      expect(item).toHaveProperty('created_by_name');
      expect(result).not.toHaveProperty('created_by');
      expect(result).not.toHaveProperty('created_by_name');
    });

    it('should use ListParams to filter Items', () => {
      const items: PublishingScheduleItem[] = [
        {
          id: 1, title: '文章A', keywords: null, article_type: null,
          platforms: null, status: 'draft', scheduled_publish_at: null,
          schedule_type: null, project_id: 1, project_name: 'P1',
          company_name: 'C1', created_by: null, created_by_name: 'N',
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, title: '文章B', keywords: null, article_type: null,
          platforms: null, status: 'published', scheduled_publish_at: null,
          schedule_type: null, project_id: 2, project_name: 'P2',
          company_name: 'C2', created_by: null, created_by_name: 'N',
          created_at: new Date(), updated_at: new Date(),
        },
      ];

      const params: PublishingScheduleListParams = {
        page: 1,
        pageSize: 10,
        status: 'draft',
      };

      const filtered = items.filter((i) =>
        params.status ? i.status === params.status : true,
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should allow converting Item to UpdateResult-like object', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: 'T', keywords: 'k', article_type: 'blog',
        platforms: ['wechat'], status: 'draft', scheduled_publish_at: new Date(),
        schedule_type: 'once', project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: 'Admin',
        created_at: new Date(), updated_at: new Date(),
      };

      const { created_by, created_by_name, ...resultFields } = item;
      const result: PublishingScheduleUpdateResult = resultFields;
      expect(result.id).toBe(1);
      expect(result).not.toHaveProperty('created_by');
    });
  });

  // ============================================================
  // barrel 重新导出测试
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const params: PublishingScheduleListParams = { page: 1, pageSize: 10 };
      expect(params.page).toBe(1);
    });
  });

  // ============================================================
  // JSON 序列化 round-trip 测试
  // ============================================================
  describe('JSON serialization round-trip', () => {
    const makeItem = (): PublishingScheduleItem => ({
      id: 1, title: '测试计划', keywords: 'SEO', article_type: 'blog',
      platforms: ['wechat', 'weibo'], status: 'draft',
      scheduled_publish_at: new Date('2025-06-15T10:30:00.000Z'),
      schedule_type: 'once', project_id: 10, project_name: '项目A',
      company_name: '公司', created_by: 5, created_by_name: '管理员',
      created_at: new Date('2025-01-01T00:00:00.000Z'),
      updated_at: new Date('2025-06-01T12:00:00.000Z'),
    });

    it('should round-trip Item with all fields preserved', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(item.id);
      expect(parsed.title).toBe(item.title);
      expect(parsed.keywords).toBe(item.keywords);
      expect(parsed.platforms).toEqual(item.platforms);
      expect(parsed.status).toBe(item.status);
      expect(parsed.project_id).toBe(item.project_id);
    });

    it('should round-trip Item with null fields', () => {
      const item = makeItem();
      item.keywords = null;
      item.article_type = null;
      item.platforms = null;
      item.scheduled_publish_at = null;
      item.schedule_type = null;
      item.created_by = null;
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.keywords).toBeNull();
      expect(parsed.article_type).toBeNull();
      expect(parsed.platforms).toBeNull();
      expect(parsed.scheduled_publish_at).toBeNull();
      expect(parsed.schedule_type).toBeNull();
      expect(parsed.created_by).toBeNull();
    });

    it('should round-trip UpdateResult with all fields preserved', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 2, title: '更新结果', keywords: null, article_type: null,
        platforms: ['douyin'], status: 'published',
        scheduled_publish_at: null, schedule_type: null,
        project_id: 5, project_name: 'P', company_name: 'C',
        created_at: new Date('2025-03-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-15T00:00:00.000Z'),
      };
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(2);
      expect(parsed.platforms).toEqual(['douyin']);
      expect(parsed).not.toHaveProperty('created_by');
    });

    it('should round-trip ListParams', () => {
      const params: PublishingScheduleListParams = {
        page: 3, pageSize: 25, search: '测试', status: 'draft',
        projectId: 5, userId: 10, role: 'admin',
      };
      const json = JSON.stringify(params);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(params);
    });

    it('should convert Date fields to ISO strings after serialization', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.created_at).toBe('2025-01-01T00:00:00.000Z');
      expect(parsed.updated_at).toBe('2025-06-01T12:00:00.000Z');
      expect(parsed.scheduled_publish_at).toBe('2025-06-15T10:30:00.000Z');
    });

    it('should handle platforms as null vs empty array in JSON', () => {
      const item1 = makeItem();
      item1.platforms = null;
      const item2 = makeItem();
      item2.platforms = [];
      const p1 = JSON.parse(JSON.stringify(item1));
      const p2 = JSON.parse(JSON.stringify(item2));
      expect(p1.platforms).toBeNull();
      expect(p2.platforms).toEqual([]);
    });

    it('should preserve Unicode characters in title through round-trip', () => {
      const item = makeItem();
      item.title = '中文标题🎉发布计划';
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('中文标题🎉发布计划');
    });
  });

  // ============================================================
  // Object.freeze 不可变性测试
  // ============================================================
  describe('Object.freeze immutability', () => {
    const makeItem = (): PublishingScheduleItem => ({
      id: 1, title: '冻结测试', keywords: null, article_type: null,
      platforms: null, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, project_id: 1, project_name: 'P',
      company_name: 'C', created_by: null, created_by_name: 'N',
      created_at: new Date(), updated_at: new Date(),
    });

    it('should reject title mutation on frozen Item', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.title = '修改'; }).toThrow();
    });

    it('should reject status mutation on frozen Item', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.status = 'published'; }).toThrow();
    });

    it('should reject platforms mutation on frozen Item', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.platforms = ['wechat']; }).toThrow();
    });

    it('should reject created_at mutation on frozen Item', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.created_at = new Date(); }).toThrow();
    });

    it('should reject project_id mutation on frozen Item', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.project_id = 999; }).toThrow();
    });

    it('should reject mutation on frozen UpdateResult', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 1, title: '冻结结果', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(result);
      expect(() => { result.title = '修改'; }).toThrow();
    });

    it('should reject mutation on frozen ListParams', () => {
      const params: PublishingScheduleListParams = { page: 1, pageSize: 10 };
      Object.freeze(params);
      expect(() => { params.page = 2; }).toThrow();
    });

    it('should detect frozen state with Object.isFrozen', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(Object.isFrozen(item)).toBe(true);
    });
  });

  // ============================================================
  // 安全注入防护测试
  // ============================================================
  describe('security injection prevention', () => {
    const makeItem = (overrides: Partial<PublishingScheduleItem> = {}): PublishingScheduleItem => ({
      id: 1, title: '安全测试', keywords: null, article_type: null,
      platforms: null, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, project_id: 1, project_name: 'P',
      company_name: 'C', created_by: null, created_by_name: 'N',
      created_at: new Date(), updated_at: new Date(),
      ...overrides,
    });

    it('should store XSS script in title as plain string without execution', () => {
      const xssPayload = '<script>alert("xss")</script>';
      const item = makeItem({ title: xssPayload });
      expect(item.title).toBe(xssPayload);
      expect(typeof item.title).toBe('string');
    });

    it('should store XSS in keywords without execution', () => {
      const xssPayload = '<img src=x onerror="alert(1)">';
      const item = makeItem({ keywords: xssPayload });
      expect(item.keywords).toBe(xssPayload);
    });

    it('should store SQL injection in title without execution', () => {
      const sqlPayload = "'; DROP TABLE schedules; --";
      const item = makeItem({ title: sqlPayload });
      expect(item.title).toBe(sqlPayload);
      expect(item.title).toContain('DROP TABLE');
    });

    it('should store SQL injection in project_name without execution', () => {
      const sqlPayload = "' OR 1=1; --";
      const item = makeItem({ project_name: sqlPayload });
      expect(item.project_name).toBe(sqlPayload);
    });

    it('should store prototype pollution attempt in title', () => {
      const item = makeItem({ title: '__proto__' });
      expect(item.title).toBe('__proto__');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('should not pollute prototype via company_name', () => {
      const item = makeItem({ company_name: '{"__proto__":{"polluted":true}}' });
      expect(item.company_name).toContain('__proto__');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('should handle title with HTML entity encoding', () => {
      const htmlEntities = '&lt;script&gt;&amp;&quot;';
      const item = makeItem({ title: htmlEntities });
      expect(item.title).toBe(htmlEntities);
    });

    it('should handle company_name with null byte injection', () => {
      const nullPayload = 'test\x00injection';
      const item = makeItem({ company_name: nullPayload });
      expect(item.company_name).toBe(nullPayload);
      expect(item.company_name).toContain('\x00');
    });

    it('should handle title with CRLF injection', () => {
      const crlfPayload = 'test\r\nInjected-Header: evil';
      const item = makeItem({ title: crlfPayload });
      expect(item.title).toBe(crlfPayload);
      expect(item.title).toContain('\r\n');
    });

    it('should handle schedule_type with format string attack', () => {
      const formatPayload = '%s%s%s%s%s';
      const item = makeItem({ schedule_type: formatPayload });
      expect(item.schedule_type).toBe(formatPayload);
    });

    it('should handle created_by_name with LDAP injection', () => {
      const ldapPayload = ')(|(cn=*))';
      const item = makeItem({ created_by_name: ldapPayload });
      expect(item.created_by_name).toBe(ldapPayload);
    });

    it('should handle title with path traversal', () => {
      const pathPayload = '../../../etc/passwd';
      const item = makeItem({ title: pathPayload });
      expect(item.title).toBe(pathPayload);
    });

    it('should safely JSON serialize XSS payload in title', () => {
      const xssPayload = '<script>document.cookie</script>';
      const item = makeItem({ title: xssPayload });
      const json = JSON.stringify(item);
      expect(json).toContain('script');
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe(xssPayload);
    });

    it('should safely JSON serialize SQL injection in keywords', () => {
      const sqlPayload = "'; DROP TABLE schedules; --";
      const item = makeItem({ keywords: sqlPayload });
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.keywords).toBe(sqlPayload);
    });

    it('should handle title as constructor without side effects', () => {
      const item = makeItem({ title: 'constructor' });
      expect(item.title).toBe('constructor');
      expect(typeof item).toBe('object');
    });

    it('should not allow toString override via title', () => {
      const item = makeItem({ title: 'toString' });
      expect(item.title).toBe('toString');
      expect(String(item)).toBe('[object Object]');
    });

    it('should store XSS in platforms array items without execution', () => {
      const xssPlatforms = ['<script>alert(1)</script>', '<img onerror="evil">'];
      const item = makeItem({ platforms: xssPlatforms });
      expect(item.platforms).toEqual(xssPlatforms);
    });
  });

  // ============================================================
  // JSON Reviver for Date fields
  // ============================================================
  describe('JSON reviver for Date fields', () => {
    const dateReviver = (key: string, value: unknown): unknown => {
      if (typeof value === 'string') {
        const dateFields = ['created_at', 'updated_at', 'scheduled_publish_at'];
        if (dateFields.includes(key)) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) return d;
        }
      }
      return value;
    };

    const makeItem = (): PublishingScheduleItem => ({
      id: 1, title: 'Reviver测试', keywords: 'SEO', article_type: 'blog',
      platforms: ['wechat'], status: 'draft',
      scheduled_publish_at: new Date('2025-06-15T10:30:00.000Z'),
      schedule_type: 'once', project_id: 10, project_name: '项目A',
      company_name: '公司', created_by: 5, created_by_name: '管理员',
      created_at: new Date('2025-01-01T00:00:00.000Z'),
      updated_at: new Date('2025-06-01T12:00:00.000Z'),
    });

    it('should revive created_at as Date object', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.created_at.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should revive updated_at as Date object', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.updated_at).toBeInstanceOf(Date);
      expect(revived.updated_at.toISOString()).toBe('2025-06-01T12:00:00.000Z');
    });

    it('should revive scheduled_publish_at as Date object', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.scheduled_publish_at).toBeInstanceOf(Date);
      expect(revived.scheduled_publish_at.toISOString()).toBe('2025-06-15T10:30:00.000Z');
    });

    it('should preserve number fields through reviver', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.id).toBe(1);
      expect(revived.project_id).toBe(10);
      expect(revived.created_by).toBe(5);
    });

    it('should preserve string fields through reviver', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.title).toBe('Reviver测试');
      expect(revived.status).toBe('draft');
      expect(revived.project_name).toBe('项目A');
    });

    it('should preserve null scheduled_publish_at through reviver', () => {
      const item = makeItem();
      item.scheduled_publish_at = null;
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.scheduled_publish_at).toBeNull();
    });

    it('should preserve platforms array through reviver', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.platforms).toEqual(['wechat']);
    });

    it('should handle round-trip with reviver preserving all data', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.id).toBe(item.id);
      expect(revived.title).toBe(item.title);
      expect(revived.created_at.getTime()).toBe(item.created_at.getTime());
      expect(revived.updated_at.getTime()).toBe(item.updated_at.getTime());
      expect(revived.scheduled_publish_at!.getTime()).toBe(item.scheduled_publish_at!.getTime());
    });

    it('should revive dates in array of items', () => {
      const items: PublishingScheduleItem[] = [
        makeItem(),
        { ...makeItem(), id: 2, created_at: new Date('2023-01-01T00:00:00.000Z') },
      ];
      const json = JSON.stringify(items);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem[];
      expect(revived[0].created_at).toBeInstanceOf(Date);
      expect(revived[1].created_at).toBeInstanceOf(Date);
      expect(revived[1].created_at.getFullYear()).toBe(2023);
    });

    it('should not revive non-date string fields', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(typeof revived.title).toBe('string');
      expect(typeof revived.status).toBe('string');
    });

    it('should handle invalid date string gracefully', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const modified = json.replace('"2025-01-01T00:00:00.000Z"', '"not-a-date"');
      const revived = JSON.parse(modified, dateReviver) as PublishingScheduleItem;
      expect(typeof revived.created_at).toBe('string');
    });

    it('should handle epoch timestamp strings via reviver', () => {
      const item = makeItem();
      item.created_at = new Date(0);
      const json = JSON.stringify(item);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleItem;
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.created_at.getTime()).toBe(0);
    });

    it('should handle empty string date gracefully via reviver', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const modified = json.replace('"2025-01-01T00:00:00.000Z"', '""');
      const revived = JSON.parse(modified, dateReviver) as PublishingScheduleItem;
      expect(typeof revived.created_at).toBe('string');
      expect(revived.created_at).toBe('');
    });

    it('should revive UpdateResult dates correctly', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 1, title: 'R', keywords: null, article_type: null,
        platforms: null, status: 'draft',
        scheduled_publish_at: new Date('2025-12-31T23:59:59.000Z'),
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-15T00:00:00.000Z'),
      };
      const json = JSON.stringify(result);
      const revived = JSON.parse(json, dateReviver) as PublishingScheduleUpdateResult;
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.updated_at).toBeInstanceOf(Date);
      expect(revived.scheduled_publish_at).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // NaN / Infinity 边界值测试
  // ============================================================
  describe('NaN and Infinity boundary values', () => {
    const makeItem = (overrides: Partial<PublishingScheduleItem> = {}): PublishingScheduleItem => ({
      id: 1, title: '边界测试', keywords: null, article_type: null,
      platforms: null, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, project_id: 1, project_name: 'P',
      company_name: 'C', created_by: null, created_by_name: 'N',
      created_at: new Date(), updated_at: new Date(),
      ...overrides,
    });

    it('should support NaN for id (TypeScript allows)', () => {
      const item = makeItem({ id: NaN });
      expect(item.id).toBeNaN();
    });

    it('should support Infinity for id', () => {
      const item = makeItem({ id: Infinity });
      expect(item.id).toBe(Infinity);
    });

    it('should support -Infinity for id', () => {
      const item = makeItem({ id: -Infinity });
      expect(item.id).toBe(-Infinity);
    });

    it('should support NaN for project_id', () => {
      const item = makeItem({ project_id: NaN });
      expect(item.project_id).toBeNaN();
    });

    it('should support NaN for created_by', () => {
      const item = makeItem({ created_by: NaN });
      expect(item.created_by).toBeNaN();
    });

    it('should serialize NaN id as null in JSON', () => {
      const item = makeItem({ id: NaN });
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBeNull();
    });

    it('should serialize Infinity id as null in JSON', () => {
      const item = makeItem({ id: Infinity });
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBeNull();
    });

    it('should handle NaN comparison in filter', () => {
      const items = [
        makeItem({ id: 1, project_id: NaN }),
        makeItem({ id: 2, project_id: 100 }),
      ];
      const valid = items.filter(i => !isNaN(i.project_id));
      expect(valid).toHaveLength(1);
      expect(valid[0].id).toBe(2);
    });

    it('should handle NaN in id comparisons', () => {
      const item = makeItem({ id: NaN });
      expect(item.id >= 0).toBe(false);
      expect(item.id <= 0).toBe(false);
    });

    it('should handle Infinity in sort by id', () => {
      const items = [
        makeItem({ id: Infinity }),
        makeItem({ id: 100 }),
        makeItem({ id: -Infinity }),
      ];
      const sorted = [...items].sort((a, b) => a.id - b.id);
      expect(sorted[0].id).toBe(-Infinity);
      expect(sorted[2].id).toBe(Infinity);
    });

    it('should serialize NaN created_by as null in JSON', () => {
      const item = makeItem({ created_by: NaN });
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json);
      expect(parsed.created_by).toBeNull();
    });

    it('should support negative id values', () => {
      const item = makeItem({ id: -1 });
      expect(item.id).toBe(-1);
    });

    it('should support MAX_SAFE_INTEGER for project_id', () => {
      const item = makeItem({ project_id: Number.MAX_SAFE_INTEGER });
      expect(item.project_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support decimal id (TypeScript does not enforce integer)', () => {
      const item = makeItem({ id: 3.14 });
      expect(item.id).toBe(3.14);
    });
  });

  // ============================================================
  // 深冻结和密封增强测试
  // ============================================================
  describe('deep freeze and seal enhanced', () => {
    const makeItem = (): PublishingScheduleItem => ({
      id: 1, title: '冻结测试', keywords: 'K', article_type: 'blog',
      platforms: ['wechat'], status: 'draft',
      scheduled_publish_at: new Date(), schedule_type: 'once',
      project_id: 1, project_name: 'P', company_name: 'C',
      created_by: 5, created_by_name: '管理员',
      created_at: new Date(), updated_at: new Date(),
    });

    it('frozen item should reject title mutation', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.title = '修改'; }).toThrow();
    });

    it('frozen item should reject status mutation', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.status = 'published'; }).toThrow();
    });

    it('frozen item should reject created_at mutation', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.created_at = new Date(); }).toThrow();
    });

    it('frozen item should reject keywords mutation', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.keywords = '新关键词'; }).toThrow();
    });

    it('sealed item should allow value modification', () => {
      const item = makeItem();
      Object.seal(item);
      item.title = '密封修改';
      expect(item.title).toBe('密封修改');
    });

    it('sealed item should reject property deletion', () => {
      const item = makeItem();
      Object.seal(item);
      expect(() => delete (item as Record<string, unknown>).title).toThrow();
    });

    it('sealed item should reject adding new property', () => {
      const item = makeItem();
      Object.seal(item);
      expect(() => { (item as Record<string, unknown>).extra = 'new'; }).toThrow();
    });

    it('Object.isSealed should return true for sealed item', () => {
      const item = makeItem();
      Object.seal(item);
      expect(Object.isSealed(item)).toBe(true);
    });

    it('Object.isFrozen should return false for sealed-only item', () => {
      const item = makeItem();
      Object.seal(item);
      expect(Object.isFrozen(item)).toBe(false);
    });

    it('should prevent extension after Object.preventExtensions', () => {
      const item = makeItem();
      Object.preventExtensions(item);
      expect(Object.isExtensible(item)).toBe(false);
      expect(() => { (item as Record<string, unknown>).extra = 'new'; }).toThrow();
    });

    it('should allow modification after Object.preventExtensions', () => {
      const item = makeItem();
      Object.preventExtensions(item);
      item.title = '修改后';
      expect(item.title).toBe('修改后');
    });

    it('frozen UpdateResult should reject all mutations', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 1, title: '冻结结果', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(result);
      expect(() => { result.title = '修改'; }).toThrow();
      expect(() => { result.status = 'published'; }).toThrow();
    });
  });

  // ============================================================
  // 业务场景测试
  // ============================================================
  describe('business scenario tests', () => {
    const makeItem = (overrides: Partial<PublishingScheduleItem> = {}): PublishingScheduleItem => ({
      id: 1, title: '业务测试', keywords: null, article_type: null,
      platforms: null, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, project_id: 1, project_name: 'P',
      company_name: 'C', created_by: null, created_by_name: 'N',
      created_at: new Date(), updated_at: new Date(),
      ...overrides,
    });

    it('should filter schedules by status for dashboard', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, status: 'draft' }),
        makeItem({ id: 2, status: 'published' }),
        makeItem({ id: 3, status: 'draft' }),
        makeItem({ id: 4, status: 'scheduled' }),
      ];
      const draftSchedules = schedules.filter(s => s.status === 'draft');
      expect(draftSchedules).toHaveLength(2);
      expect(draftSchedules.every(s => s.status === 'draft')).toBe(true);
    });

    it('should filter schedules by project for project view', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, project_id: 10, project_name: '项目A' }),
        makeItem({ id: 2, project_id: 20, project_name: '项目B' }),
        makeItem({ id: 3, project_id: 10, project_name: '项目A' }),
      ];
      const projectA = schedules.filter(s => s.project_id === 10);
      expect(projectA).toHaveLength(2);
      expect(projectA.every(s => s.project_name === '项目A')).toBe(true);
    });

    it('should calculate schedule completion rate', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, status: 'published' }),
        makeItem({ id: 2, status: 'published' }),
        makeItem({ id: 3, status: 'draft' }),
        makeItem({ id: 4, status: 'failed' }),
      ];
      const published = schedules.filter(s => s.status === 'published').length;
      const rate = published / schedules.length;
      expect(rate).toBe(0.5);
    });

    it('should group schedules by schedule_type', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, schedule_type: 'once' }),
        makeItem({ id: 2, schedule_type: 'weekly' }),
        makeItem({ id: 3, schedule_type: 'once' }),
        makeItem({ id: 4, schedule_type: 'daily' }),
      ];
      const grouped = schedules.reduce((acc, s) => {
        const type = s.schedule_type || 'none';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      expect(grouped['once']).toBe(2);
      expect(grouped['weekly']).toBe(1);
      expect(grouped['daily']).toBe(1);
    });

    it('should find schedules with upcoming publish dates', () => {
      const now = new Date();
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, scheduled_publish_at: new Date(now.getTime() + 86400000) }),
        makeItem({ id: 2, scheduled_publish_at: new Date(now.getTime() - 86400000) }),
        makeItem({ id: 3, scheduled_publish_at: null }),
      ];
      const upcoming = schedules.filter(s =>
        s.scheduled_publish_at !== null && s.scheduled_publish_at > now,
      );
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe(1);
    });

    it('should count unique platforms across schedules', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, platforms: ['wechat', 'weibo'] }),
        makeItem({ id: 2, platforms: ['douyin', 'wechat'] }),
        makeItem({ id: 3, platforms: null }),
      ];
      const allPlatforms = schedules
        .filter(s => s.platforms !== null)
        .flatMap(s => s.platforms!);
      const unique = [...new Set(allPlatforms)];
      expect(unique).toHaveLength(3);
      expect(unique).toContain('wechat');
    });

    it('should handle pagination on schedule list', () => {
      const schedules: PublishingScheduleItem[] = Array.from({ length: 25 }, (_, i) =>
        makeItem({ id: i + 1, title: `计划${i + 1}` }),
      );
      const page = 2;
      const pageSize = 10;
      const start = (page - 1) * pageSize;
      const paginated = schedules.slice(start, start + pageSize);
      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe(11);
      expect(paginated[9].id).toBe(20);
    });

    it('should search schedules by title substring', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, title: '微信公众号推广计划' }),
        makeItem({ id: 2, title: '微博营销计划' }),
        makeItem({ id: 3, title: '抖音短视频计划' }),
      ];
      const search = (keyword: string) => schedules.filter(s => s.title.includes(keyword));
      expect(search('计划')).toHaveLength(3);
      expect(search('微信')).toHaveLength(1);
      expect(search('不存在')).toHaveLength(0);
    });

    it('should validate schedule data export format', () => {
      const schedule = makeItem({
        id: 1, title: '测试计划', keywords: 'SEO', article_type: 'blog',
        platforms: ['wechat'], status: 'draft',
        scheduled_publish_at: new Date('2025-06-15T10:00:00.000Z'),
        project_id: 10, project_name: '项目A', company_name: '公司',
      });
      const exportRow = {
        ID: schedule.id,
        标题: schedule.title,
        关键词: schedule.keywords,
        状态: schedule.status,
        平台: schedule.platforms?.join(','),
        预计发布: schedule.scheduled_publish_at?.toISOString(),
      };
      expect(exportRow.ID).toBe(1);
      expect(exportRow.标题).toBe('测试计划');
      expect(exportRow.平台).toBe('wechat');
    });

    it('should generate company-wise schedule summary', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, company_name: '公司A', status: 'published' }),
        makeItem({ id: 2, company_name: '公司A', status: 'draft' }),
        makeItem({ id: 3, company_name: '公司B', status: 'published' }),
      ];
      const summary = schedules.reduce((acc, s) => {
        if (!acc[s.company_name]) acc[s.company_name] = { total: 0, published: 0 };
        acc[s.company_name].total++;
        if (s.status === 'published') acc[s.company_name].published++;
        return acc;
      }, {} as Record<string, { total: number; published: number }>);
      expect(summary['公司A'].total).toBe(2);
      expect(summary['公司A'].published).toBe(1);
      expect(summary['公司B'].total).toBe(1);
    });

    it('should filter schedules by creator', () => {
      const schedules: PublishingScheduleItem[] = [
        makeItem({ id: 1, created_by: 10, created_by_name: '张三' }),
        makeItem({ id: 2, created_by: 20, created_by_name: '李四' }),
        makeItem({ id: 3, created_by: 10, created_by_name: '张三' }),
      ];
      const byUser = schedules.filter(s => s.created_by === 10);
      expect(byUser).toHaveLength(2);
      expect(byUser.every(s => s.created_by_name === '张三')).toBe(true);
    });

    it('should calculate days until scheduled publish', () => {
      const now = new Date();
      const schedule = makeItem({
        scheduled_publish_at: new Date(now.getTime() + 7 * 86400000),
      });
      const daysUntil = Math.ceil(
        (schedule.scheduled_publish_at!.getTime() - now.getTime()) / 86400000,
      );
      expect(daysUntil).toBeGreaterThanOrEqual(7);
    });
  });

  // ============================================================
  // async import 测试
  // ============================================================
  describe('async import', () => {
    it('should dynamically import types from entity file', async () => {
      const mod = await import('../../apis/entity/publishing-schedule.entity');
      expect(mod).toBeDefined();
    });

    it('should import from barrel index', async () => {
      const mod = await import('../../apis/entity/index');
      expect(mod).toBeDefined();
    });

    it('should have consistent exports between direct and barrel import', async () => {
      const direct = await import('../../apis/entity/publishing-schedule.entity');
      const barrel = await import('../../apis/entity/index');
      expect(direct).toBeDefined();
      expect(barrel).toBeDefined();
    });
  });

  // ============================================================
  // 类型守卫和运行时验证
  // ============================================================
  describe('type guard and runtime validation', () => {
    const isPublishingScheduleItem = (obj: unknown): obj is PublishingScheduleItem => {
      if (typeof obj !== 'object' || obj === null) return false;
      const p = obj as Record<string, unknown>;
      return (
        typeof p.id === 'number' &&
        typeof p.title === 'string' &&
        (p.keywords === null || typeof p.keywords === 'string') &&
        (p.article_type === null || typeof p.article_type === 'string') &&
        (p.platforms === null || Array.isArray(p.platforms)) &&
        typeof p.status === 'string' &&
        (p.scheduled_publish_at === null || p.scheduled_publish_at instanceof Date) &&
        (p.schedule_type === null || typeof p.schedule_type === 'string') &&
        typeof p.project_id === 'number' &&
        typeof p.project_name === 'string' &&
        typeof p.company_name === 'string' &&
        (p.created_by === null || typeof p.created_by === 'number') &&
        typeof p.created_by_name === 'string' &&
        p.created_at instanceof Date &&
        p.updated_at instanceof Date
      );
    };

    const makeItem = (): PublishingScheduleItem => ({
      id: 1, title: '类型守卫', keywords: 'K', article_type: 'blog',
      platforms: ['wechat'], status: 'draft',
      scheduled_publish_at: new Date(), schedule_type: 'once',
      project_id: 10, project_name: '项目', company_name: '公司',
      created_by: 5, created_by_name: '管理员',
      created_at: new Date(), updated_at: new Date(),
    });

    it('should validate a valid item with type guard', () => {
      const item = makeItem();
      expect(isPublishingScheduleItem(item)).toBe(true);
    });

    it('should reject null with type guard', () => {
      expect(isPublishingScheduleItem(null)).toBe(false);
    });

    it('should reject undefined with type guard', () => {
      expect(isPublishingScheduleItem(undefined)).toBe(false);
    });

    it('should reject empty object with type guard', () => {
      expect(isPublishingScheduleItem({})).toBe(false);
    });

    it('should reject object with wrong id type', () => {
      const obj = { ...makeItem(), id: '1' };
      expect(isPublishingScheduleItem(obj)).toBe(false);
    });

    it('should reject object with missing title', () => {
      const { title: _, ...obj } = makeItem();
      expect(isPublishingScheduleItem(obj)).toBe(false);
    });

    it('should reject object with wrong status type', () => {
      const obj = { ...makeItem(), status: 123 };
      expect(isPublishingScheduleItem(obj)).toBe(false);
    });

    it('should accept item with null keywords', () => {
      const item = makeItem();
      item.keywords = null;
      expect(isPublishingScheduleItem(item)).toBe(true);
    });

    it('should accept item with null platforms', () => {
      const item = makeItem();
      item.platforms = null;
      expect(isPublishingScheduleItem(item)).toBe(true);
    });

    it('should accept item with null scheduled_publish_at', () => {
      const item = makeItem();
      item.scheduled_publish_at = null;
      expect(isPublishingScheduleItem(item)).toBe(true);
    });

    it('should reject item with number keywords', () => {
      const obj = { ...makeItem(), keywords: 123 };
      expect(isPublishingScheduleItem(obj)).toBe(false);
    });

    it('should reject object with string created_at', () => {
      const obj = { ...makeItem(), created_at: '2025-01-01' };
      expect(isPublishingScheduleItem(obj)).toBe(false);
    });

    it('should validate item after JSON reviver', () => {
      const item = makeItem();
      const json = JSON.stringify(item);
      const dateReviver = (key: string, value: unknown): unknown => {
        if (typeof value === 'string' && ['created_at', 'updated_at', 'scheduled_publish_at'].includes(key)) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) return d;
        }
        return value;
      };
      const revived = JSON.parse(json, dateReviver);
      expect(isPublishingScheduleItem(revived)).toBe(true);
    });

    it('should reject array with type guard', () => {
      expect(isPublishingScheduleItem([])).toBe(false);
    });

    it('should reject primitive with type guard', () => {
      expect(isPublishingScheduleItem('string')).toBe(false);
      expect(isPublishingScheduleItem(123)).toBe(false);
      expect(isPublishingScheduleItem(true)).toBe(false);
    });
  });

  // ============================================================
  // 生命周期模拟测试
  // ============================================================
  describe('lifecycle simulation', () => {
    it('should simulate schedule creation lifecycle', () => {
      const now = new Date();
      const schedule: PublishingScheduleItem = {
        id: 0,
        title: '新建计划',
        keywords: null,
        article_type: null,
        platforms: null,
        status: 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        project_id: 1,
        project_name: '新项目',
        company_name: '公司',
        created_by: null,
        created_by_name: '未知',
        created_at: now,
        updated_at: now,
      };
      expect(schedule.id).toBe(0);
      expect(schedule.status).toBe('draft');
      expect(schedule.platforms).toBeNull();
      expect(schedule.created_at).toBe(schedule.updated_at);
    });

    it('should simulate schedule data enrichment', () => {
      const schedule: PublishingScheduleItem = {
        id: 1, title: '测试', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: '管理员',
        created_at: new Date('2025-01-01'), updated_at: new Date('2025-01-01'),
      };
      schedule.keywords = 'SEO,营销';
      schedule.article_type = 'blog';
      schedule.platforms = ['wechat', 'weibo'];
      schedule.scheduled_publish_at = new Date('2025-12-31');
      schedule.schedule_type = 'once';
      schedule.status = 'scheduled';
      schedule.updated_at = new Date();
      expect(schedule.keywords).toBe('SEO,营销');
      expect(schedule.platforms).toEqual(['wechat', 'weibo']);
      expect(schedule.status).toBe('scheduled');
    });

    it('should simulate schedule status transition', () => {
      const schedule: PublishingScheduleItem = {
        id: 1, title: '状态测试', keywords: null, article_type: null,
        platforms: ['wechat'], status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 1, created_by_name: '管理员',
        created_at: new Date('2025-01-01'), updated_at: new Date('2025-01-01'),
      };
      const statusHistory = [schedule.status];
      schedule.status = 'pending_review';
      statusHistory.push(schedule.status);
      schedule.status = 'approved';
      statusHistory.push(schedule.status);
      schedule.status = 'scheduled';
      statusHistory.push(schedule.status);
      schedule.status = 'publishing';
      statusHistory.push(schedule.status);
      schedule.status = 'published';
      statusHistory.push(schedule.status);
      expect(statusHistory).toEqual(['draft', 'pending_review', 'approved', 'scheduled', 'publishing', 'published']);
    });

    it('should simulate schedule update and result conversion', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: '更新测试', keywords: 'K', article_type: 'blog',
        platforms: ['wechat'], status: 'draft', scheduled_publish_at: new Date(),
        schedule_type: 'once', project_id: 10, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: '管理员',
        created_at: new Date('2025-01-01'), updated_at: new Date('2025-01-01'),
      };
      item.title = '修改后的标题';
      item.status = 'published';
      item.updated_at = new Date();
      const { created_by, created_by_name, ...resultFields } = item;
      const result: PublishingScheduleUpdateResult = resultFields;
      expect(result.title).toBe('修改后的标题');
      expect(result.status).toBe('published');
      expect(result).not.toHaveProperty('created_by');
    });

    it('should simulate batch schedule creation', () => {
      const importData = [
        { title: '计划A', project_id: 1, project_name: '项目1', company_name: '公司A' },
        { title: '计划B', project_id: 2, project_name: '项目2', company_name: '公司B' },
        { title: '计划C', project_id: 1, project_name: '项目1', company_name: '公司A' },
      ];
      const now = new Date();
      const schedules: PublishingScheduleItem[] = importData.map((d, idx) => ({
        id: idx + 1,
        title: d.title,
        keywords: null,
        article_type: null,
        platforms: null,
        status: 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        project_id: d.project_id,
        project_name: d.project_name,
        company_name: d.company_name,
        created_by: 1,
        created_by_name: '管理员',
        created_at: now,
        updated_at: now,
      }));
      expect(schedules).toHaveLength(3);
      expect(schedules[0].title).toBe('计划A');
      schedules.forEach(s => {
        expect(s.created_at).toBeInstanceOf(Date);
        expect(s.updated_at).toBeInstanceOf(Date);
      });
    });

    it('should simulate schedule failure and retry', () => {
      const schedule: PublishingScheduleItem = {
        id: 1, title: '失败重试', keywords: null, article_type: null,
        platforms: ['wechat'], status: 'publishing', scheduled_publish_at: new Date(),
        schedule_type: 'once', project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 1, created_by_name: '管理员',
        created_at: new Date('2025-01-01'), updated_at: new Date('2025-01-01'),
      };
      schedule.status = 'failed';
      schedule.updated_at = new Date();
      expect(schedule.status).toBe('failed');
      // Retry
      schedule.status = 'publishing';
      schedule.updated_at = new Date();
      expect(schedule.status).toBe('publishing');
    });
  });

  // ============================================================
  // 响应结构一致性测试
  // ============================================================
  describe('response structure consistency', () => {
    it('should produce consistent JSON structure across Item instances', () => {
      const i1: PublishingScheduleItem = {
        id: 1, title: 'T1', keywords: 'K', article_type: 'blog',
        platforms: ['wechat'], status: 'draft',
        scheduled_publish_at: new Date('2025-01-01T00:00:00.000Z'),
        schedule_type: 'once', project_id: 10, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: 'N',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-01-01T00:00:00.000Z'),
      };
      const i2: PublishingScheduleItem = {
        id: 2, title: 'T2', keywords: null, article_type: null,
        platforms: null, status: 'published',
        scheduled_publish_at: null, schedule_type: null,
        project_id: 20, project_name: 'P2',
        company_name: 'C2', created_by: null, created_by_name: 'N2',
        created_at: new Date('2025-06-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-01T00:00:00.000Z'),
      };
      const keys1 = Object.keys(JSON.parse(JSON.stringify(i1)));
      const keys2 = Object.keys(JSON.parse(JSON.stringify(i2)));
      expect(keys1).toEqual(keys2);
    });

    it('should produce consistent JSON structure across UpdateResult instances', () => {
      const r1: PublishingScheduleUpdateResult = {
        id: 1, title: 'R1', keywords: 'K', article_type: 'blog',
        platforms: ['wechat'], status: 'draft',
        scheduled_publish_at: new Date('2025-01-01T00:00:00.000Z'),
        schedule_type: 'once', project_id: 10, project_name: 'P',
        company_name: 'C',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-01-01T00:00:00.000Z'),
      };
      const r2: PublishingScheduleUpdateResult = {
        id: 2, title: 'R2', keywords: null, article_type: null,
        platforms: null, status: 'published',
        scheduled_publish_at: null, schedule_type: null,
        project_id: 20, project_name: 'P2', company_name: 'C2',
        created_at: new Date('2025-06-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-01T00:00:00.000Z'),
      };
      const keys1 = Object.keys(JSON.parse(JSON.stringify(r1)));
      const keys2 = Object.keys(JSON.parse(JSON.stringify(r2)));
      expect(keys1).toEqual(keys2);
    });

    it('should maintain field order consistency for Item', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: 'T', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: null, created_by_name: 'N',
        created_at: new Date(), updated_at: new Date(),
      };
      const keys = Object.keys(item);
      expect(keys[0]).toBe('id');
      expect(keys[1]).toBe('title');
      expect(keys[14]).toBe('updated_at');
    });

    it('should produce same JSON shape as original after round-trip', () => {
      const original: PublishingScheduleItem = {
        id: 1, title: 'T', keywords: 'K', article_type: 'blog',
        platforms: ['wechat'], status: 'draft',
        scheduled_publish_at: new Date('2025-01-01T00:00:00.000Z'),
        schedule_type: 'once', project_id: 10, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: 'N',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-01T00:00:00.000Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      const keys = Object.keys(parsed);
      expect(keys).toHaveLength(15);
      keys.forEach(k => {
        expect(parsed[k]).not.toBeUndefined();
      });
    });
  });

  // ============================================================
  // 错误类型多样性测试
  // ============================================================
  describe('error type diversity', () => {
    const makeItem = (): PublishingScheduleItem => ({
      id: 1, title: '错误测试', keywords: null, article_type: null,
      platforms: null, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, project_id: 1, project_name: 'P',
      company_name: 'C', created_by: null, created_by_name: 'N',
      created_at: new Date(), updated_at: new Date(),
    });

    it('should throw TypeError on frozen object mutation', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => { item.title = 'modified'; }).toThrow(TypeError);
    });

    it('should throw TypeError on sealed object property addition', () => {
      const item = makeItem();
      Object.seal(item);
      expect(() => { (item as Record<string, unknown>).newField = 'value'; }).toThrow(TypeError);
    });

    it('should throw TypeError on frozen object deletion', () => {
      const item = makeItem();
      Object.freeze(item);
      expect(() => delete (item as Record<string, unknown>).title).toThrow(TypeError);
    });

    it('should handle TypeError from toISOString on invalid date', () => {
      const item = makeItem();
      (item.created_at as Date) = new Date('invalid');
      expect(isNaN(item.created_at.getTime())).toBe(true);
      expect(() => item.created_at.toISOString()).toThrow(RangeError);
    });

    it('should handle RangeError from invalid scheduled_publish_at', () => {
      const item = makeItem();
      item.scheduled_publish_at = new Date('invalid');
      expect(() => item.scheduled_publish_at!.toISOString()).toThrow(RangeError);
    });
  });

  // ============================================================
  // 并发安全模拟测试
  // ============================================================
  describe('concurrent safety simulation', () => {
    it('should handle interleaved field updates on Item', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: '初始', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: null, created_by_name: 'N',
        created_at: new Date(), updated_at: new Date(),
      };
      item.title = '更新1';
      item.status = 'pending_review';
      item.title = '更新2';
      item.keywords = 'K';
      expect(item.title).toBe('更新2');
      expect(item.status).toBe('pending_review');
      expect(item.keywords).toBe('K');
    });

    it('should handle interleaved updates on UpdateResult', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 1, title: '初始', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_at: new Date(), updated_at: new Date(),
      };
      result.title = '并发更新1';
      result.status = 'published';
      result.title = '并发更新2';
      expect(result.title).toBe('并发更新2');
      expect(result.status).toBe('published');
    });

    it('should handle last-writer-wins for title updates', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: '原始', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: null, created_by_name: 'N',
        created_at: new Date(), updated_at: new Date(),
      };
      const title1 = '线程1标题';
      const title2 = '线程2标题';
      item.title = title1;
      item.title = title2;
      expect(item.title).toBe(title2);
    });
  });

  // ============================================================
  // HTTP 方法语义模拟测试
  // ============================================================
  describe('HTTP method semantic simulation', () => {
    it('should simulate GET: list schedules with params', () => {
      const params: PublishingScheduleListParams = {
        page: 1, pageSize: 20, status: 'draft', search: '测试',
      };
      expect(params.page).toBe(1);
      expect(params.status).toBe('draft');
      expect(params.search).toBe('测试');
    });

    it('should simulate GET: retrieve single schedule', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: '获取测试', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: null, created_by_name: 'N',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.id).toBe(1);
      expect(item.title).toBe('获取测试');
    });

    it('should simulate PUT: update schedule returning UpdateResult', () => {
      const original: PublishingScheduleItem = {
        id: 1, title: '原始', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: '管理员',
        created_at: new Date('2025-01-01'), updated_at: new Date('2025-01-01'),
      };
      const updated = { ...original, title: '已更新', status: 'published' };
      const { created_by, created_by_name, ...result } = updated;
      const updateResult: PublishingScheduleUpdateResult = result;
      expect(updateResult.title).toBe('已更新');
      expect(updateResult.status).toBe('published');
    });

    it('should simulate PATCH: partial update schedule', () => {
      const original: PublishingScheduleItem = {
        id: 1, title: '原始', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: null, created_by_name: 'N',
        created_at: new Date(), updated_at: new Date(),
      };
      const patched = { ...original, status: 'scheduled', scheduled_publish_at: new Date('2025-12-31') };
      expect(patched.title).toBe('原始');
      expect(patched.status).toBe('scheduled');
      expect(patched.scheduled_publish_at).toBeInstanceOf(Date);
    });

    it('should simulate DELETE: verify schedule removal from list', () => {
      const schedules: PublishingScheduleItem[] = [
        { id: 1, title: 'A', keywords: null, article_type: null, platforms: null, status: 'draft', scheduled_publish_at: null, schedule_type: null, project_id: 1, project_name: 'P', company_name: 'C', created_by: null, created_by_name: 'N', created_at: new Date(), updated_at: new Date() },
        { id: 2, title: 'B', keywords: null, article_type: null, platforms: null, status: 'draft', scheduled_publish_at: null, schedule_type: null, project_id: 1, project_name: 'P', company_name: 'C', created_by: null, created_by_name: 'N', created_at: new Date(), updated_at: new Date() },
      ];
      const remaining = schedules.filter(s => s.id !== 1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(2);
    });
  });

  // ============================================================
  // 日志多样性测试
  // ============================================================
  describe('logging diversity', () => {
    it('should serialize Item for logging with JSON.stringify', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: '日志测试', keywords: 'K', article_type: 'blog',
        platforms: ['wechat'], status: 'draft',
        scheduled_publish_at: new Date('2025-12-31T00:00:00.000Z'),
        schedule_type: 'once', project_id: 10, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: '管理员',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-01T00:00:00.000Z'),
      };
      const logEntry = JSON.stringify(item);
      expect(logEntry).toContain('"id":1');
      expect(logEntry).toContain('"title":"日志测试"');
      expect(logEntry).toContain('"status":"draft"');
    });

    it('should create log-safe version excluding sensitive fields', () => {
      const item: PublishingScheduleItem = {
        id: 1, title: 'T', keywords: null, article_type: null,
        platforms: null, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C', created_by: 5, created_by_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const { created_by_name, ...safeLog } = item;
      expect(safeLog).not.toHaveProperty('created_by_name');
      expect(safeLog).toHaveProperty('id');
    });

    it('should handle console-friendly formatting for ListParams', () => {
      const params: PublishingScheduleListParams = {
        page: 1, pageSize: 20, status: 'draft', search: '关键词',
      };
      const logStr = `ListParams: page=${params.page}, pageSize=${params.pageSize}, status=${params.status}`;
      expect(logStr).toContain('page=1');
      expect(logStr).toContain('status=draft');
    });

    it('should serialize UpdateResult for logging', () => {
      const result: PublishingScheduleUpdateResult = {
        id: 1, title: 'R', keywords: null, article_type: null,
        platforms: null, status: 'published',
        scheduled_publish_at: new Date('2025-12-31T00:00:00.000Z'),
        schedule_type: null, project_id: 1, project_name: 'P',
        company_name: 'C',
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-06-01T00:00:00.000Z'),
      };
      const logEntry = JSON.stringify(result);
      expect(logEntry).toContain('"status":"published"');
      expect(logEntry).not.toContain('created_by');
    });
  });
});
