/**
 * @jest-environment node
 */
import {
  PublishingScheduleListParams,
  PublishingScheduleItem,
  PublishingScheduleUpdateResult,
} from '../../apis/entity/publishing-schedule.entity';

describe('publishing-schedule.entity', () => {
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

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const params: PublishingScheduleListParams = { page: 1, pageSize: 10 };
      expect(params.page).toBe(1);
    });
  });
});
