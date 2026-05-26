/**
 * @jest-environment node
 */
import {
  Article,
  ArticleDetail,
  ArticleStatus,
  ARTICLE_STATUSES,
  ArticleType,
  WriteMode,
  UpdatableArticleStatus,
  ArticleVersion,
  CreateArticleRequest,
  UpdateArticleRequest,
  ReviewArticleRequest,
} from '../../apis/entity/article.entity';

describe('article.entity', () => {
  // ==================== ARTICLE_STATUSES 常量 ====================

  describe('ARTICLE_STATUSES 常量', () => {
    it('should have 9 status values matching Prisma enum', () => {
      expect(ARTICLE_STATUSES).toHaveLength(9);
    });

    it('should include all expected statuses', () => {
      const expected = [
        'draft', 'manual_writing', 'generating', 'generate_failed',
        'pending_review', 'approved', 'publishing', 'published', 'publish_failed',
      ];
      expected.forEach(s => expect(ARTICLE_STATUSES).toContain(s));
    });

    it('should be readonly tuple (as const)', () => {
      expect(Array.isArray(ARTICLE_STATUSES)).toBe(true);
      expect(typeof ARTICLE_STATUSES[0]).toBe('string');
    });
  });

  // ==================== Article interface ====================

  describe('Article interface', () => {
    const baseArticle: Article = {
      id: 1,
      project_id: 1,
      title: '测试文章',
      article_type: '案例分析',
      write_mode: 'ai',
      keywords: '关键词1,关键词2',
      portrait: '人物画像',
      images: ['img1.jpg', 'img2.jpg'],
      skills: [1],
      llm_model_id: 1,
      content: '<p>文章内容</p>',
      version: 1,
      status: 'draft',
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    it('should create a valid Article with all required fields', () => {
      expect(baseArticle.id).toBe(1);
      expect(baseArticle.project_id).toBe(1);
      expect(baseArticle.title).toBe('测试文章');
      expect(baseArticle.article_type).toBe('案例分析');
      expect(baseArticle.write_mode).toBe('ai');
      expect(baseArticle.images).toEqual(['img1.jpg', 'img2.jpg']);
      expect(baseArticle.skills).toEqual([1]);
      expect(baseArticle.llm_model_id).toBe(1);
      expect(baseArticle.content).toBe('<p>文章内容</p>');
      expect(baseArticle.version).toBe(1);
      expect(baseArticle.status).toBe('draft');
      expect(baseArticle.created_by).toBe(1);
      expect(baseArticle.deleted_at).toBeNull();
    });

    it('should allow all nullable fields to be null', () => {
      const article: Article = {
        id: 2, project_id: 1, title: '最小文章',
        article_type: null, write_mode: null, keywords: null,
        portrait: null, images: null, skills: null, llm_model_id: null,
        content: null, version: 0, status: 'draft', created_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(article.article_type).toBeNull();
      expect(article.write_mode).toBeNull();
      expect(article.skills).toBeNull();
      expect(article.deleted_at).toBeNull();
    });

    it('should have correct field count', () => {
      expect(Object.keys(baseArticle).sort()).toEqual([
        'article_type', 'content', 'created_at', 'created_by', 'deleted_at',
        'id', 'images', 'keywords', 'llm_model_id', 'portrait', 'project_id',
        'skills', 'status', 'title', 'updated_at', 'version', 'write_mode',
      ].sort());
    });

    it('should support images as string array', () => {
      const article: Article = { ...baseArticle, images: ['a.jpg', 'b.png', 'c.gif'] };
      expect(article.images).toHaveLength(3);
      expect(article.images).toContain('a.jpg');
    });

    it('should support empty images array', () => {
      const article: Article = { ...baseArticle, images: [] };
      expect(article.images).toHaveLength(0);
    });

    it('should support skills as number array', () => {
      const article: Article = { ...baseArticle, skills: [1, 2, 3] };
      expect(Array.isArray(article.skills)).toBe(true);
      expect(article.skills).toEqual([1, 2, 3]);
    });

    it('should support skills as empty array', () => {
      const article: Article = { ...baseArticle, skills: [] };
      expect(article.skills).toEqual([]);
    });

    it('should support skills as null', () => {
      const article: Article = { ...baseArticle, skills: null };
      expect(article.skills).toBeNull();
    });

    it('should support skills with zero value', () => {
      const article: Article = { ...baseArticle, skills: [0] };
      expect(article.skills).toEqual([0]);
    });

    it('should support deleted_at as Date', () => {
      const deletedAt = new Date('2026-06-01T10:00:00Z');
      const article: Article = { ...baseArticle, deleted_at: deletedAt };
      expect(article.deleted_at).toBeInstanceOf(Date);
      expect(article.deleted_at).toBe(deletedAt);
    });

    it('should support deleted_at as null for active records', () => {
      expect(baseArticle.deleted_at).toBeNull();
    });

    it('should support various article_type values', () => {
      const types: ArticleType[] = ['榜单排名', '方法论讲解', '案例分析', '行业洞察',
        '对比测评', '客户证言', 'FAQ问答', '实操指南'];
      types.forEach((type) => {
        const article: Article = { ...baseArticle, article_type: type };
        expect(article.article_type).toBe(type);
      });
    });

    it('should support various write_mode values', () => {
      const modes: WriteMode[] = ['manual', 'ai'];
      modes.forEach((mode) => {
        const article: Article = { ...baseArticle, write_mode: mode };
        expect(article.write_mode).toBe(mode);
      });
    });

    it('should support all 9 ArticleStatus values', () => {
      ARTICLE_STATUSES.forEach((status) => {
        const article: Article = { ...baseArticle, status };
        expect(article.status).toBe(status);
      });
    });

    it('should support version as 0', () => {
      const article: Article = { ...baseArticle, version: 0 };
      expect(article.version).toBe(0);
    });

    it('should support high version numbers', () => {
      const article: Article = { ...baseArticle, version: 999 };
      expect(article.version).toBe(999);
    });

    it('should support long content', () => {
      const longContent = '<p>' + '长文本'.repeat(10000) + '</p>';
      const article: Article = { ...baseArticle, content: longContent };
      expect(article.content!.length).toBeGreaterThan(10000);
    });

    it('should support empty title', () => {
      const article: Article = { ...baseArticle, title: '' };
      expect(article.title).toBe('');
    });

    it('should support special characters in title', () => {
      const article: Article = { ...baseArticle, title: '测试<title>&"引号"' };
      expect(article.title).toContain('<title>');
    });

    it('should support unicode keywords', () => {
      const article: Article = { ...baseArticle, keywords: '人工智能,AI,GPT,大语言模型' };
      expect(article.keywords).toContain('人工智能');
    });

    it('should support images with URL paths', () => {
      const article: Article = { ...baseArticle, images: ['https://example.com/img1.jpg', '/uploads/img2.png'] };
      expect(article.images![0]).toContain('https://');
      expect(article.images![1]).toContain('/uploads/');
    });

    it('should support content with multi-line text', () => {
      const article: Article = { ...baseArticle, content: '第一段\n第二段\n第三段' };
      expect(article.content!.split('\n')).toHaveLength(3);
    });

    it('should support fractional version (Prisma Float)', () => {
      const article: Article = { ...baseArticle, version: 1.5 };
      expect(article.version).toBe(1.5);
    });

    it('should support very large id values', () => {
      const article: Article = { ...baseArticle, id: Number.MAX_SAFE_INTEGER };
      expect(article.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support unicode content', () => {
      const article: Article = { ...baseArticle, content: '这是中文内容 🎉 émojis àccënts' };
      expect(article.content).toContain('中文内容');
    });

    it('should support created_at as Date with specific time', () => {
      const createdAt = new Date('2026-05-24T08:30:00.000Z');
      const article: Article = { ...baseArticle, created_at: createdAt, updated_at: createdAt };
      expect(article.created_at.toISOString()).toBe('2026-05-24T08:30:00.000Z');
    });
  });

  // ==================== ArticleDetail interface ====================

  describe('ArticleDetail interface', () => {
    it('should extend Article with creator_name and schedule_count', () => {
      const detail: ArticleDetail = {
        id: 1, project_id: 1, title: '测试', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', created_by: 1, created_at: new Date(),
        updated_at: new Date(), deleted_at: null,
        creator_name: '张三', schedule_count: 3,
      };
      expect(detail.creator_name).toBe('张三');
      expect(detail.schedule_count).toBe(3);
      expect(detail.id).toBe(1);
      expect(detail.title).toBe('测试');
    });

    it('should allow creator_name to be null', () => {
      const detail: ArticleDetail = {
        id: 1, project_id: 1, title: 'T', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', created_by: null, created_at: new Date(),
        updated_at: new Date(), deleted_at: null,
        creator_name: null, schedule_count: 0,
      };
      expect(detail.creator_name).toBeNull();
    });

    it('should allow schedule_count to be 0', () => {
      const detail: ArticleDetail = {
        id: 1, project_id: 1, title: 'T', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', created_by: null, created_at: new Date(),
        updated_at: new Date(), deleted_at: null,
        creator_name: null, schedule_count: 0,
      };
      expect(detail.schedule_count).toBe(0);
    });
  });

  // ==================== ArticleVersion interface ====================

  describe('ArticleVersion interface', () => {
    it('should create a valid ArticleVersion', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: '<p>版本内容</p>',
        created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.id).toBe(1);
      expect(version.content).toBe('<p>版本内容</p>');
      expect(version.deleted_at).toBeNull();
    });

    it('should allow created_by to be null', () => {
      const version: ArticleVersion = {
        id: 2, article_id: 1, version: 2, content: '自动生成内容',
        created_by: null, created_at: new Date(), deleted_at: null,
      };
      expect(version.created_by).toBeNull();
    });

    it('should support deleted_at as Date for soft-deleted versions', () => {
      const deletedAt = new Date('2026-06-01T10:00:00Z');
      const version: ArticleVersion = {
        id: 3, article_id: 1, version: 1, content: '已删除版本',
        created_by: null, created_at: new Date(), deleted_at: deletedAt,
      };
      expect(version.deleted_at).toBeInstanceOf(Date);
      expect(version.deleted_at).toBe(deletedAt);
    });

    it('should have correct number of fields', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: 'c',
        created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(Object.keys(version).sort()).toEqual(
        ['article_id', 'content', 'created_at', 'created_by', 'deleted_at', 'id', 'version'].sort()
      );
    });

    it('should support version 0', () => {
      const version: ArticleVersion = {
        id: 3, article_id: 5, version: 0, content: '',
        created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.version).toBe(0);
    });

    it('should support empty content', () => {
      const version: ArticleVersion = {
        id: 5, article_id: 1, version: 1, content: '',
        created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.content).toBe('');
    });

    it('should support long HTML content', () => {
      const longContent = '<p>' + '段落内容'.repeat(5000) + '</p>';
      const version: ArticleVersion = {
        id: 6, article_id: 1, version: 1, content: longContent,
        created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.content.length).toBeGreaterThan(5000);
    });

    it('should support unicode content', () => {
      const version: ArticleVersion = {
        id: 7, article_id: 1, version: 1, content: '内容包含 <b>HTML</b> 标签 &amp; 特殊字符 ©️',
        created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.content).toContain('&amp;');
    });

    it('should support large article_id', () => {
      const version: ArticleVersion = {
        id: 8, article_id: Number.MAX_SAFE_INTEGER, version: 1,
        content: 'c', created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.article_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should preserve created_at timestamp precision', () => {
      const ts = new Date('2026-05-24T15:30:45.123Z');
      const version: ArticleVersion = {
        id: 12, article_id: 1, version: 1, content: 'c',
        created_by: 1, created_at: ts, deleted_at: null,
      };
      expect(version.created_at.getMilliseconds()).toBe(123);
    });
  });

  // ==================== CreateArticleRequest ====================

  describe('CreateArticleRequest interface', () => {
    it('should create a valid request with title and all optional fields', () => {
      const req: CreateArticleRequest = {
        title: '新文章',
        article_type: '案例分析',
        write_mode: 'ai',
        keywords: '关键词',
        portrait: '画像',
        images: ['img.jpg'],
        skills: [1, 2],
        llm_model_id: 1,
        content: '内容',
        status: 'draft',
      };
      expect(req.title).toBe('新文章');
      expect(req.skills).toEqual([1, 2]);
      expect(req.status).toBe('draft');
    });

    it('should allow only title (minimum valid request)', () => {
      const req: CreateArticleRequest = { title: '只有标题' };
      expect(req.title).toBe('只有标题');
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should restrict status to draft or manual_writing only', () => {
      const draftReq: CreateArticleRequest = { title: 'T', status: 'draft' };
      const manualReq: CreateArticleRequest = { title: 'T', status: 'manual_writing' };
      expect(draftReq.status).toBe('draft');
      expect(manualReq.status).toBe('manual_writing');
    });

    it('should allow images as empty array', () => {
      const req: CreateArticleRequest = { title: 'T', images: [] };
      expect(req.images).toHaveLength(0);
    });

    it('should allow skills as empty array', () => {
      const req: CreateArticleRequest = { title: 'T', skills: [] };
      expect(req.skills).toEqual([]);
    });

    it('should allow skills as null', () => {
      const req: CreateArticleRequest = { title: 'T', skills: null };
      expect(req.skills).toBeNull();
    });

    it('should allow skills with large number of IDs', () => {
      const req: CreateArticleRequest = { title: 'T', skills: Array.from({ length: 50 }, (_, i) => i + 1) };
      expect(req.skills).toHaveLength(50);
    });

    it('should have correct field count when all set', () => {
      const req: CreateArticleRequest = {
        title: 'T', article_type: '案例分析', write_mode: 'ai', keywords: 'k',
        portrait: 'p', images: [], skills: [1], llm_model_id: 1,
        content: 'c', status: 'draft',
      };
      expect(Object.keys(req)).toHaveLength(10);
    });

    it('should allow unicode title', () => {
      const req: CreateArticleRequest = { title: '中文标题🚀émoji' };
      expect(req.title).toContain('🚀');
    });

    it('should allow empty string title', () => {
      const req: CreateArticleRequest = { title: '' };
      expect(req.title).toBe('');
    });

    it('should allow very long content', () => {
      const longContent = '内容'.repeat(10000);
      const req: CreateArticleRequest = { title: 'T', content: longContent };
      expect(req.content!.length).toBeGreaterThanOrEqual(20000);
    });

    it('should allow content with mixed line endings', () => {
      const req: CreateArticleRequest = { title: 'T', content: 'line1\r\nline2\nline3' };
      expect(req.content).toContain('\r\n');
    });
  });

  // ==================== UpdateArticleRequest ====================

  describe('UpdateArticleRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateArticleRequest = {
        title: '更新标题',
        article_type: '案例分析',
        write_mode: 'manual',
        keywords: '新关键词',
        portrait: '新画像',
        images: ['new.jpg'],
        skills: [2],
        llm_model_id: 2,
        content: '更新内容',
        status: 'pending_review',
        scheduled_publish_at: '2026-12-31T00:00:00Z',
      };
      expect(req.title).toBe('更新标题');
      expect(req.status).toBe('pending_review');
      expect(req.scheduled_publish_at).toBe('2026-12-31T00:00:00Z');
    });

    it('should allow scheduled_publish_at to be null', () => {
      const req: UpdateArticleRequest = { scheduled_publish_at: null };
      expect(req.scheduled_publish_at).toBeNull();
    });

    it('should allow empty update request', () => {
      const req: UpdateArticleRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow partial updates with single field', () => {
      const req: UpdateArticleRequest = { title: '只改标题' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow updating only content', () => {
      const req: UpdateArticleRequest = { content: '新内容' };
      expect(req.content).toBe('新内容');
    });

    it('should allow updating only status', () => {
      const req: UpdateArticleRequest = { status: 'pending_review' };
      expect(req.status).toBe('pending_review');
    });

    it('should allow updating only images', () => {
      const req: UpdateArticleRequest = { images: ['a.jpg'] };
      expect(req.images).toEqual(['a.jpg']);
    });

    it('should allow updating only skills', () => {
      const req: UpdateArticleRequest = { skills: [1, 2, 3] };
      expect(req.skills).toEqual([1, 2, 3]);
    });

    it('should allow updating skills to null', () => {
      const req: UpdateArticleRequest = { skills: null };
      expect(req.skills).toBeNull();
    });

    it('should have correct field count when all set', () => {
      const req: UpdateArticleRequest = {
        title: 'T', article_type: '案例分析', write_mode: 'ai', keywords: 'k',
        portrait: 'p', images: [], skills: [1], llm_model_id: 1,
        content: 'c', status: 'draft', scheduled_publish_at: '2026-01-01T00:00:00.000Z',
      };
      expect(Object.keys(req)).toHaveLength(11);
    });

    it('should allow scheduled_publish_at as ISO string with milliseconds', () => {
      const req: UpdateArticleRequest = { scheduled_publish_at: '2026-06-15T10:30:00.123Z' };
      expect(req.scheduled_publish_at).toContain('.123');
    });

    it('should support UpdatableArticleStatus values (excluding published/publishing)', () => {
      const updatableStatuses: UpdatableArticleStatus[] = [
        'draft', 'manual_writing', 'generating', 'generate_failed',
        'pending_review', 'approved', 'publish_failed',
      ];
      updatableStatuses.forEach(status => {
        const req: UpdateArticleRequest = { status };
        expect(req.status).toBe(status);
      });
    });

    it('should support all ArticleStatus values for type coverage', () => {
      ARTICLE_STATUSES.forEach(status => {
        const article: Article = {
          id: 1, project_id: 1, title: 'T', article_type: null,
          write_mode: null, keywords: null, portrait: null, images: null,
          skills: null, llm_model_id: null, content: null, version: 1,
          status, created_by: null, created_at: new Date(),
          updated_at: new Date(), deleted_at: null,
        };
        expect(article.status).toBe(status);
      });
    });
  });

  // ==================== ReviewArticleRequest ====================

  describe('ReviewArticleRequest interface', () => {
    it('should create a valid approval request', () => {
      const req: ReviewArticleRequest = { approved: true };
      expect(req.approved).toBe(true);
    });

    it('should create a valid rejection request', () => {
      const req: ReviewArticleRequest = { approved: false };
      expect(req.approved).toBe(false);
    });

    it('should support comment field', () => {
      const req: ReviewArticleRequest = { approved: false, comment: '内容质量不达标' };
      expect(req.comment).toBe('内容质量不达标');
    });

    it('should support comment on approval', () => {
      const req: ReviewArticleRequest = { approved: true, comment: '优秀文章' };
      expect(req.approved).toBe(true);
      expect(req.comment).toBe('优秀文章');
    });

    it('should allow request without comment', () => {
      const req: ReviewArticleRequest = { approved: true };
      expect(req.comment).toBeUndefined();
    });

    it('should preserve boolean type strictly', () => {
      const approve: ReviewArticleRequest = { approved: true };
      const reject: ReviewArticleRequest = { approved: false };
      expect(typeof approve.approved).toBe('boolean');
      expect(typeof reject.approved).toBe('boolean');
    });

    it('should support array filter with approved status', () => {
      const reviews: ReviewArticleRequest[] = [
        { approved: true },
        { approved: false, comment: '需修改' },
        { approved: true, comment: '通过' },
      ];
      const approved = reviews.filter(r => r.approved);
      const rejected = reviews.filter(r => !r.approved);
      expect(approved).toHaveLength(2);
      expect(rejected).toHaveLength(1);
    });
  });

  // ==================== ArticleStatus lifecycle ====================

  describe('ArticleStatus lifecycle', () => {
    it('should have exactly 9 unique status values', () => {
      expect(ARTICLE_STATUSES).toHaveLength(9);
      expect(new Set(ARTICLE_STATUSES).size).toBe(9);
    });

    it('should represent complete AI generation flow', () => {
      const flow: ArticleStatus[] = ['draft', 'generating', 'pending_review', 'approved', 'publishing', 'published'];
      expect(flow[0]).toBe('draft');
      expect(flow[flow.length - 1]).toBe('published');
    });

    it('should represent failed generation flow', () => {
      const flow: ArticleStatus[] = ['draft', 'generating', 'generate_failed'];
      expect(flow).toHaveLength(3);
      expect(flow[2]).toContain('failed');
    });

    it('should represent failed publishing flow', () => {
      const flow: ArticleStatus[] = ['pending_review', 'publishing', 'publish_failed'];
      expect(flow).toHaveLength(3);
      expect(flow[2]).toContain('failed');
    });

    it('should represent manual writing to publish flow', () => {
      const flow: ArticleStatus[] = ['manual_writing', 'pending_review', 'approved', 'publishing', 'published'];
      expect(flow[0]).toBe('manual_writing');
      expect(flow).toHaveLength(5);
    });

    it('should represent retry after publish failure', () => {
      const flow: ArticleStatus[] = ['publish_failed', 'publishing', 'published'];
      expect(flow[0]).toBe('publish_failed');
      expect(flow[flow.length - 1]).toBe('published');
    });
  });

  // ==================== JSON serialization ====================

  describe('Article JSON serialization', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: '测试文章', article_type: '案例分析',
      write_mode: 'ai', keywords: '关键词', portrait: '画像',
      images: ['img1.jpg'], skills: [1, 2],
      llm_model_id: 1, content: '内容', version: 1, status: 'draft',
      created_by: 1, created_at: new Date('2026-05-24T08:00:00Z'),
      updated_at: new Date('2026-05-24T09:00:00Z'), deleted_at: null,
    };

    it('should serialize Date fields as ISO strings', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(parsed.deleted_at).toBeNull();
    });

    it('should serialize deleted_at as ISO string when set', () => {
      const article: Article = {
        ...baseArticle, deleted_at: new Date('2026-06-01T10:00:00Z'),
      };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.deleted_at).toBe('2026-06-01T10:00:00.000Z');
    });

    it('should deserialize JSON back to Article with Date conversion', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      const restored: Article = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
        deleted_at: parsed.deleted_at ? new Date(parsed.deleted_at) : null,
      };
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.deleted_at).toBeNull();
    });

    it('should serialize skills as number array', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      expect(parsed.skills).toEqual([1, 2]);
    });

    it('should serialize null fields as null', () => {
      const article: Article = {
        ...baseArticle, article_type: null, write_mode: null, keywords: null,
        portrait: null, images: null, skills: null,
        llm_model_id: null, content: null, created_by: null,
      };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.article_type).toBeNull();
      expect(parsed.skills).toBeNull();
      expect(parsed.content).toBeNull();
    });

    it('should handle ArticleVersion JSON roundtrip', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: '版本内容',
        created_by: 1, created_at: new Date('2026-05-24T10:00:00Z'), deleted_at: null,
      };
      const json = JSON.stringify(version);
      const parsed = JSON.parse(json);
      expect(parsed.content).toBe('版本内容');
      expect(parsed.deleted_at).toBeNull();
    });
  });

  // ==================== Object copy & immutability ====================

  describe('Article object copy', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: '原始标题', article_type: null,
      write_mode: null, keywords: null, portrait: null, images: ['a.jpg'],
      skills: null, llm_model_id: null, content: null,
      version: 1, status: 'draft', created_by: null,
      created_at: new Date(), updated_at: new Date(), deleted_at: null,
    };

    it('should create independent copy via spread', () => {
      const copy: Article = { ...baseArticle, title: '新标题' };
      expect(copy.title).toBe('新标题');
      expect(baseArticle.title).toBe('原始标题');
    });

    it('should share array references in shallow copy', () => {
      const copy: Article = { ...baseArticle };
      expect(copy.images).toBe(baseArticle.images);
      copy.images!.push('b.jpg');
      expect(baseArticle.images).toContain('b.jpg');
    });

    it('should create independent arrays with explicit copy', () => {
      const fresh: Article = { ...baseArticle, images: ['x.jpg'] };
      const copy: Article = { ...fresh, images: [...fresh.images!] };
      copy.images!.push('y.jpg');
      expect(fresh.images).not.toContain('y.jpg');
    });

    it('should support Object.freeze on Article', () => {
      const frozen = Object.freeze({ ...baseArticle });
      expect(() => { (frozen as any).title = 'modified'; }).toThrow();
    });

    it('should support deep clone via JSON roundtrip', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      const cloned: Article = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
        deleted_at: parsed.deleted_at ? new Date(parsed.deleted_at) : null,
      };
      cloned.title = '克隆标题';
      expect(baseArticle.title).toBe('原始标题');
      expect(cloned.title).toBe('克隆标题');
    });
  });

  // ==================== Cross-interface consistency ====================

  describe('cross-interface consistency', () => {
    it('CreateArticleRequest fields should be subset of Article fields', () => {
      const req: CreateArticleRequest = {
        title: '新文章', article_type: '案例分析', write_mode: 'ai',
        keywords: 'kw', portrait: 'p', images: [],
        skills: [1], llm_model_id: 1, content: 'c', status: 'draft',
      };
      const article: Article = {
        id: 1, project_id: 1,
        title: req.title,
        article_type: req.article_type ?? null,
        write_mode: req.write_mode ?? null,
        keywords: req.keywords ?? null,
        portrait: req.portrait ?? null,
        images: req.images ?? null,
        skills: req.skills ?? null,
        llm_model_id: req.llm_model_id ?? null,
        content: req.content ?? null,
        version: 0,
        status: req.status ?? 'draft',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(article.title).toBe('新文章');
      expect(article.status).toBe('draft');
      expect(article.deleted_at).toBeNull();
    });

    it('UpdateArticleRequest should be applicable to existing Article', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '原标题', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: null,
        version: 1, status: 'draft', created_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const update: UpdateArticleRequest = { title: '新标题', status: 'pending_review' };
      const updated: Article = { ...article, ...update, updated_at: new Date() };
      expect(updated.title).toBe('新标题');
      expect(updated.status).toBe('pending_review');
      expect(updated.id).toBe(1);
      expect(updated.deleted_at).toBeNull();
    });

    it('ArticleVersion should reference Article by article_id', () => {
      const article: Article = {
        id: 42, project_id: 1, title: 'T', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: null,
        version: 3, status: 'published', created_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const version: ArticleVersion = {
        id: 1, article_id: article.id, version: 3,
        content: 'v3内容', created_by: 1, created_at: new Date(), deleted_at: null,
      };
      expect(version.article_id).toBe(article.id);
    });

    it('CreateArticleRequest status values should be subset of ArticleStatus', () => {
      const createStatuses: Array<NonNullable<CreateArticleRequest['status']>> = ['draft', 'manual_writing'];
      createStatuses.forEach(s => {
        expect(ARTICLE_STATUSES).toContain(s);
      });
    });

    it('skills type should be number[] | null in Article', () => {
      const req1: UpdateArticleRequest = { skills: [1, 2, 3] };
      const req2: UpdateArticleRequest = { skills: null };
      const req3: UpdateArticleRequest = { skills: [] };
      expect(Array.isArray(req1.skills)).toBe(true);
      expect(req2.skills).toBeNull();
      expect(req3.skills).toEqual([]);
    });
  });

  // ==================== Edge cases ====================

  describe('Article edge cases', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: 'T', article_type: null,
      write_mode: null, keywords: null, portrait: null, images: null,
      skills: null, llm_model_id: null, content: null,
      version: 1, status: 'draft', created_by: null,
      created_at: new Date(), updated_at: new Date(), deleted_at: null,
    };

    it('should support id as 0', () => {
      const article: Article = { ...baseArticle, id: 0 };
      expect(article.id).toBe(0);
    });

    it('should support project_id as 0', () => {
      const article: Article = { ...baseArticle, project_id: 0 };
      expect(article.project_id).toBe(0);
    });

    it('should support created_by as 0', () => {
      const article: Article = { ...baseArticle, created_by: 0 };
      expect(article.created_by).toBe(0);
    });

    it('should support title with only spaces', () => {
      const article: Article = { ...baseArticle, title: '   ' };
      expect(article.title).toBe('   ');
    });

    it('should support images array with many elements', () => {
      const manyImages = Array.from({ length: 100 }, (_, i) => `img${i}.jpg`);
      const article: Article = { ...baseArticle, images: manyImages };
      expect(article.images).toHaveLength(100);
    });

    it('should support skills with large IDs', () => {
      const article: Article = { ...baseArticle, skills: [Number.MAX_SAFE_INTEGER] };
      expect(article.skills![0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support version as Number.MAX_SAFE_INTEGER', () => {
      const article: Article = { ...baseArticle, version: Number.MAX_SAFE_INTEGER };
      expect(article.version).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support deleted_at as epoch', () => {
      const article: Article = { ...baseArticle, deleted_at: new Date(0) };
      expect(article.deleted_at!.getTime()).toBe(0);
    });

    it('should support deleted_at as far future date', () => {
      const article: Article = { ...baseArticle, deleted_at: new Date('2100-12-31T23:59:59Z') };
      expect(article.deleted_at!.getUTCFullYear()).toBe(2100);
    });
  });

  // ==================== Security tests ====================

  describe('security tests', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: 'T', article_type: null,
      write_mode: null, keywords: null, portrait: null, images: null,
      skills: null, llm_model_id: null, content: null,
      version: 1, status: 'draft', created_by: null,
      created_at: new Date(), updated_at: new Date(), deleted_at: null,
    };

    it('should store title with script tags as plain text', () => {
      const xssTitle = '<script>alert("xss")</script>';
      const article: Article = { ...baseArticle, title: xssTitle };
      expect(article.title).toBe(xssTitle);
    });

    it('should store content with SQL injection as plain text', () => {
      const sqlContent = "'; DROP TABLE articles; --";
      const article: Article = { ...baseArticle, content: sqlContent };
      expect(article.content).toContain('DROP TABLE');
    });

    it('should store portrait with path traversal as plain text', () => {
      const traversal = '../../../etc/passwd';
      const article: Article = { ...baseArticle, portrait: traversal };
      expect(article.portrait).toBe(traversal);
    });

    it('should store images with javascript: protocol as plain string', () => {
      const xssImages = ['javascript:alert(1)', 'data:text/html,<h1>test</h1>'];
      const article: Article = { ...baseArticle, images: xssImages };
      expect(article.images![0]).toBe('javascript:alert(1)');
    });

    it('should store title with null bytes safely', () => {
      const nullTitle = 'title\x00injection';
      const article: Article = { ...baseArticle, title: nullTitle };
      expect(article.title).toContain('\x00');
    });
  });

  // ==================== Real-world usage scenarios ====================

  describe('real-world usage', () => {
    it('should create article from CreateArticleRequest with defaults', () => {
      const req: CreateArticleRequest = {
        title: 'AI时代的技术写作',
        article_type: '案例分析',
        write_mode: 'ai',
        keywords: 'AI,技术写作,大模型',
        skills: [1, 2],
        llm_model_id: 5,
        status: 'draft',
      };
      const article: Article = {
        id: 1, project_id: 10,
        title: req.title,
        article_type: req.article_type ?? null,
        write_mode: req.write_mode ?? null,
        keywords: req.keywords ?? null,
        portrait: req.portrait ?? null,
        images: req.images ?? null,
        skills: req.skills ?? null,
        llm_model_id: req.llm_model_id ?? null,
        content: req.content ?? null,
        version: 0, status: req.status ?? 'draft',
        created_by: 1, created_at: new Date(),
        updated_at: new Date(), deleted_at: null,
      };
      expect(article.title).toBe('AI时代的技术写作');
      expect(article.skills).toEqual([1, 2]);
    });

    it('should apply partial update to existing article', () => {
      const original: Article = {
        id: 1, project_id: 1, title: '原标题', article_type: '案例分析',
        write_mode: 'ai', keywords: '旧关键词', portrait: '旧画像',
        images: ['old.jpg'], skills: [1], llm_model_id: 1,
        content: '旧内容', version: 2, status: 'draft',
        created_by: 1, created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const update: UpdateArticleRequest = { title: '更新标题', status: 'pending_review' };
      const result: Article = { ...original, ...update, updated_at: new Date() };
      expect(result.title).toBe('更新标题');
      expect(result.status).toBe('pending_review');
      expect(result.content).toBe('旧内容');
      expect(result.deleted_at).toBeNull();
    });

    it('should handle review flow with comment', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '审核文章', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: '内容',
        version: 1, status: 'pending_review', created_by: 1,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const review: ReviewArticleRequest = { approved: false, comment: '需要补充数据支撑' };
      expect(review.approved).toBe(false);
      expect(review.comment).toBe('需要补充数据支撑');
    });

    it('should handle review approval', () => {
      const review: ReviewArticleRequest = { approved: true };
      const afterReview: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: '内容',
        version: 1, status: review.approved ? 'approved' : 'draft',
        created_by: 1, created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(afterReview.status).toBe('approved');
    });

    it('should create article version for content history', () => {
      const versions: ArticleVersion[] = [
        { id: 1, article_id: 1, version: 1, content: 'v1', created_by: 1, created_at: new Date(), deleted_at: null },
        { id: 2, article_id: 1, version: 2, content: 'v2', created_by: 1, created_at: new Date(), deleted_at: null },
        { id: 3, article_id: 1, version: 3, content: 'v3', created_by: 1, created_at: new Date(), deleted_at: null },
      ];
      expect(versions).toHaveLength(3);
      expect(versions.every(v => v.article_id === 1)).toBe(true);
      expect(versions.every(v => v.deleted_at === null)).toBe(true);
    });

    it('should handle soft delete on Article', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '已删除文章', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        skills: null, llm_model_id: null, content: null,
        version: 1, status: 'draft', created_by: 1,
        created_at: new Date(), updated_at: new Date(),
        deleted_at: new Date('2026-06-01T10:00:00Z'),
      };
      expect(article.deleted_at).toBeInstanceOf(Date);
      expect(article.deleted_at).not.toBeNull();
    });

    it('should handle schedule update for publishing', () => {
      const update: UpdateArticleRequest = {
        scheduled_publish_at: '2026-06-15T10:00:00+08:00',
      };
      expect(update.scheduled_publish_at).toBe('2026-06-15T10:00:00+08:00');
    });

    it('should handle clear schedule', () => {
      const update: UpdateArticleRequest = {
        scheduled_publish_at: null,
      };
      expect(update.scheduled_publish_at).toBeNull();
    });
  });
});
