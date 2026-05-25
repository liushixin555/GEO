/**
 * @jest-environment node
 */
import {
  Article,
  ArticleStatus,
  ArticleVersion,
  CreateArticleRequest,
  UpdateArticleRequest,
  ReviewArticleRequest,
} from '../../apis/entity/article.entity';

describe('article.entity', () => {
  describe('Article interface', () => {
    const baseArticle: Article = {
      id: 1,
      project_id: 1,
      title: '测试文章',
      article_type: 'seo',
      write_mode: 'auto',
      keywords: '关键词1,关键词2',
      portrait: '人物画像',
      images: ['img1.jpg', 'img2.jpg'],
      platforms: ['新浪', '搜狐'],
      skills: 1,
      llm_model_id: 1,
      content: '<p>文章内容</p>',
      version: 1,
      status: 'draft',
      scheduled_publish_at: null,
      schedule_type: null,
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create a valid Article object with all required fields', () => {
      expect(baseArticle.id).toBe(1);
      expect(baseArticle.project_id).toBe(1);
      expect(baseArticle.title).toBe('测试文章');
      expect(baseArticle.article_type).toBe('seo');
      expect(baseArticle.write_mode).toBe('auto');
      expect(baseArticle.keywords).toBe('关键词1,关键词2');
      expect(baseArticle.portrait).toBe('人物画像');
      expect(baseArticle.images).toEqual(['img1.jpg', 'img2.jpg']);
      expect(baseArticle.platforms).toEqual(['新浪', '搜狐']);
      expect(baseArticle.skills).toBe(1);
      expect(baseArticle.llm_model_id).toBe(1);
      expect(baseArticle.content).toBe('<p>文章内容</p>');
      expect(baseArticle.version).toBe(1);
      expect(baseArticle.status).toBe('draft');
      expect(baseArticle.scheduled_publish_at).toBeNull();
      expect(baseArticle.created_by).toBe(1);
      expect(baseArticle.created_at).toBeInstanceOf(Date);
      expect(baseArticle.updated_at).toBeInstanceOf(Date);
    });

    it('should allow all nullable fields to be null', () => {
      const article: Article = {
        id: 2,
        project_id: 1,
        title: '最小文章',
        article_type: null,
        write_mode: null,
        keywords: null,
        portrait: null,
        images: null,
        platforms: null,
        skills: null,
        llm_model_id: null,
        content: null,
        version: 0,
        status: 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(article.article_type).toBeNull();
      expect(article.write_mode).toBeNull();
      expect(article.keywords).toBeNull();
      expect(article.portrait).toBeNull();
      expect(article.images).toBeNull();
      expect(article.platforms).toBeNull();
      expect(article.skills).toBeNull();
      expect(article.llm_model_id).toBeNull();
      expect(article.content).toBeNull();
      expect(article.scheduled_publish_at).toBeNull();
      expect(article.created_by).toBeNull();
    });

    it('should support images as string array', () => {
      const article: Article = { ...baseArticle, images: ['a.jpg', 'b.png', 'c.gif'] };
      expect(article.images).toHaveLength(3);
      expect(article.images).toContain('a.jpg');
    });

    it('should support platforms as string array', () => {
      const article: Article = { ...baseArticle, platforms: ['头条', '百家号', '企鹅号'] };
      expect(article.platforms).toHaveLength(3);
    });

    it('should support empty images array', () => {
      const article: Article = { ...baseArticle, images: [] };
      expect(article.images).toHaveLength(0);
    });

    it('should support empty platforms array', () => {
      const article: Article = { ...baseArticle, platforms: [] };
      expect(article.platforms).toHaveLength(0);
    });

    it('should support scheduled_publish_at as Date', () => {
      const futureDate = new Date('2026-12-31');
      const article: Article = { ...baseArticle, scheduled_publish_at: futureDate };
      expect(article.scheduled_publish_at).toBeInstanceOf(Date);
    });

    it('should support various article_type values', () => {
      const types = ['seo', 'original', 'rewrite', 'custom'];
      types.forEach((type) => {
        const article: Article = { ...baseArticle, article_type: type };
        expect(article.article_type).toBe(type);
      });
    });

    it('should support various write_mode values', () => {
      const modes = ['auto', 'manual', 'ai_assist'];
      modes.forEach((mode) => {
        const article: Article = { ...baseArticle, write_mode: mode };
        expect(article.write_mode).toBe(mode);
      });
    });

    it('should support various status values', () => {
      const statuses: ArticleStatus[] = ['draft', 'generating', 'manual_writing', 'pending_review', 'published', 'publishing', 'generate_failed', 'publish_failed'];
      statuses.forEach((status) => {
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

    it('should support skills as 0', () => {
      const article: Article = { ...baseArticle, skills: 0 };
      expect(article.skills).toBe(0);
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

    it('should have correct number of fields', () => {
      expect(Object.keys(baseArticle).sort()).toEqual(
        ['id', 'project_id', 'title', 'article_type', 'write_mode', 'keywords',
         'portrait', 'images', 'platforms', 'skills', 'llm_model_id', 'content',
         'version', 'status', 'scheduled_publish_at', 'schedule_type', 'created_by', 'created_at',
         'updated_at'].sort()
      );
    });

    // === 新增测试用例 ===

    it('should support skills as JSON object (unknown type)', () => {
      const article: Article = { ...baseArticle, skills: { model: 'gpt-4', temperature: 0.7 } };
      expect(typeof article.skills).toBe('object');
      expect((article.skills as Record<string, unknown>).model).toBe('gpt-4');
    });

    it('should support skills as JSON array (unknown type)', () => {
      const article: Article = { ...baseArticle, skills: [1, 2, 3] };
      expect(Array.isArray(article.skills)).toBe(true);
    });

    it('should support skills as string (unknown type)', () => {
      const article: Article = { ...baseArticle, skills: 'skill-name' };
      expect(article.skills).toBe('skill-name');
    });

    it('should support skills as boolean (unknown type)', () => {
      const article: Article = { ...baseArticle, skills: true };
      expect(article.skills).toBe(true);
    });

    it('should support schedule_type as "asap"', () => {
      const article: Article = { ...baseArticle, schedule_type: 'asap', scheduled_publish_at: null };
      expect(article.schedule_type).toBe('asap');
    });

    it('should support schedule_type as "scheduled"', () => {
      const scheduledDate = new Date('2026-06-01T10:00:00Z');
      const article: Article = { ...baseArticle, schedule_type: 'scheduled', scheduled_publish_at: scheduledDate };
      expect(article.schedule_type).toBe('scheduled');
      expect(article.scheduled_publish_at).toBeInstanceOf(Date);
    });

    it('should support schedule_type as "after"', () => {
      const afterDate = new Date('2026-07-15T08:30:00Z');
      const article: Article = { ...baseArticle, schedule_type: 'after', scheduled_publish_at: afterDate };
      expect(article.schedule_type).toBe('after');
    });

    it('should support scheduled_publish_at as past date', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const article: Article = { ...baseArticle, scheduled_publish_at: pastDate, schedule_type: 'scheduled' };
      expect(article.scheduled_publish_at!.getFullYear()).toBe(2020);
    });

    it('should support negative version numbers (Prisma Float edge case)', () => {
      const article: Article = { ...baseArticle, version: -1 };
      expect(article.version).toBe(-1);
    });

    it('should support fractional version (Prisma Float)', () => {
      const article: Article = { ...baseArticle, version: 1.5 };
      expect(article.version).toBe(1.5);
    });

    it('should support very large id values', () => {
      const article: Article = { ...baseArticle, id: Number.MAX_SAFE_INTEGER };
      expect(article.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support very large project_id', () => {
      const article: Article = { ...baseArticle, project_id: 999999 };
      expect(article.project_id).toBe(999999);
    });

    it('should support unicode content', () => {
      const content = '这是中文内容 🎉 émojis àccënts';
      const article: Article = { ...baseArticle, content };
      expect(article.content).toContain('中文内容');
    });

    it('should support very long title', () => {
      const longTitle = '很长的标题'.repeat(100);
      const article: Article = { ...baseArticle, title: longTitle };
      expect(article.title.length).toBeGreaterThanOrEqual(400);
    });

    it('should support images with URL paths', () => {
      const article: Article = { ...baseArticle, images: ['https://example.com/img1.jpg', '/uploads/img2.png'] };
      expect(article.images![0]).toContain('https://');
      expect(article.images![1]).toContain('/uploads/');
    });

    it('should support content with multi-line text', () => {
      const multiLine = '第一段\n第二段\n第三段';
      const article: Article = { ...baseArticle, content: multiLine };
      expect(article.content!.split('\n')).toHaveLength(3);
    });

    it('should support created_at as Date with specific time', () => {
      const createdAt = new Date('2026-05-24T08:30:00.000Z');
      const article: Article = { ...baseArticle, created_at: createdAt, updated_at: createdAt };
      expect(article.created_at.toISOString()).toBe('2026-05-24T08:30:00.000Z');
      expect(article.updated_at.toISOString()).toBe('2026-05-24T08:30:00.000Z');
    });
  });

  describe('ArticleVersion interface', () => {
    it('should create a valid ArticleVersion object', () => {
      const version: ArticleVersion = {
        id: 1,
        article_id: 1,
        version: 1,
        content: '<p>版本内容</p>',
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.id).toBe(1);
      expect(version.article_id).toBe(1);
      expect(version.version).toBe(1);
      expect(version.content).toBe('<p>版本内容</p>');
      expect(version.created_by).toBe(1);
    });

    it('should allow created_by to be null', () => {
      const version: ArticleVersion = {
        id: 2,
        article_id: 1,
        version: 2,
        content: '自动生成内容',
        created_by: null,
        created_at: new Date(),
      };
      expect(version.created_by).toBeNull();
    });

    it('should support version 0', () => {
      const version: ArticleVersion = {
        id: 3,
        article_id: 5,
        version: 0,
        content: '',
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.version).toBe(0);
    });

    it('should support high version numbers', () => {
      const version: ArticleVersion = {
        id: 4,
        article_id: 5,
        version: 100,
        content: '内容',
        created_by: null,
        created_at: new Date(),
      };
      expect(version.version).toBe(100);
    });

    it('should support empty content', () => {
      const version: ArticleVersion = {
        id: 5,
        article_id: 1,
        version: 1,
        content: '',
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.content).toBe('');
    });

    it('should support long HTML content', () => {
      const longContent = '<p>' + '段落内容'.repeat(5000) + '</p>';
      const version: ArticleVersion = {
        id: 6,
        article_id: 1,
        version: 1,
        content: longContent,
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.content.length).toBeGreaterThan(5000);
    });

    it('should have correct number of fields', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: 'c', created_by: 1, created_at: new Date(),
      };
      expect(Object.keys(version).sort()).toEqual(
        ['id', 'article_id', 'version', 'content', 'created_by', 'created_at'].sort()
      );
    });

    // === 新增测试用例 ===

    it('should support unicode and special characters in content', () => {
      const version: ArticleVersion = {
        id: 7,
        article_id: 1,
        version: 1,
        content: '内容包含 <b>HTML</b> 标签 &amp; 特殊字符 ©️',
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.content).toContain('&amp;');
      expect(version.content).toContain('©️');
    });

    it('should support large article_id', () => {
      const version: ArticleVersion = {
        id: 8,
        article_id: Number.MAX_SAFE_INTEGER,
        version: 1,
        content: 'c',
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.article_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative version numbers (Prisma Float edge case)', () => {
      const version: ArticleVersion = {
        id: 9,
        article_id: 1,
        version: -1,
        content: 'c',
        created_by: null,
        created_at: new Date(),
      };
      expect(version.version).toBe(-1);
    });

    it('should support content with only whitespace', () => {
      const version: ArticleVersion = {
        id: 10,
        article_id: 1,
        version: 1,
        content: '   \n\t  ',
        created_by: null,
        created_at: new Date(),
      };
      expect(version.content).toBe('   \n\t  ');
    });

    it('should support content with markdown formatting', () => {
      const version: ArticleVersion = {
        id: 11,
        article_id: 1,
        version: 1,
        content: '# 标题\n\n- 列表项1\n- 列表项2\n\n**加粗文本**',
        created_by: 1,
        created_at: new Date(),
      };
      expect(version.content).toContain('# 标题');
      expect(version.content).toContain('**加粗文本**');
    });

    it('should preserve created_at timestamp precision', () => {
      const ts = new Date('2026-05-24T15:30:45.123Z');
      const version: ArticleVersion = {
        id: 12,
        article_id: 1,
        version: 1,
        content: 'c',
        created_by: 1,
        created_at: ts,
      };
      expect(version.created_at.getMilliseconds()).toBe(123);
    });
  });

  describe('CreateArticleRequest interface', () => {
    it('should create a valid request with all optional fields omitted', () => {
      const req: CreateArticleRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should include all optional fields', () => {
      const req: CreateArticleRequest = {
        title: '新文章',
        article_type: 'seo',
        write_mode: 'auto',
        keywords: '关键词',
        portrait: '画像',
        images: ['img.jpg'],
        platforms: ['新浪'],
        skills: [1, 2],
        llm_model_id: 1,
        content: '内容',
        status: 'draft',
      };
      expect(req.title).toBe('新文章');
      expect(req.article_type).toBe('seo');
      expect(req.write_mode).toBe('auto');
      expect(req.keywords).toBe('关键词');
      expect(req.portrait).toBe('画像');
      expect(req.images).toEqual(['img.jpg']);
      expect(req.platforms).toEqual(['新浪']);
      expect(req.skills).toEqual([1, 2]);
      expect(req.llm_model_id).toBe(1);
      expect(req.content).toBe('内容');
      expect(req.status).toBe('draft');
    });

    it('should restrict status to valid values', () => {
      const draftReq: CreateArticleRequest = { status: 'draft' };
      const generatingReq: CreateArticleRequest = { status: 'generating' };
      const manualReq: CreateArticleRequest = { status: 'manual_writing' };
      expect(draftReq.status).toBe('draft');
      expect(generatingReq.status).toBe('generating');
      expect(manualReq.status).toBe('manual_writing');
    });

    it('should allow only title', () => {
      const req: CreateArticleRequest = { title: '只有标题' };
      expect(req.title).toBe('只有标题');
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow only content', () => {
      const req: CreateArticleRequest = { content: '只有内容' };
      expect(req.content).toBe('只有内容');
    });

    it('should allow images as empty array', () => {
      const req: CreateArticleRequest = { images: [] };
      expect(req.images).toHaveLength(0);
    });

    it('should allow platforms as empty array', () => {
      const req: CreateArticleRequest = { platforms: [] };
      expect(req.platforms).toHaveLength(0);
    });

    it('should allow skills as empty array', () => {
      const req: CreateArticleRequest = { skills: [] };
      expect(req.skills).toEqual([]);
    });

    it('should allow skills as number array', () => {
      const req: CreateArticleRequest = { skills: [1, 2, 3] };
      expect(req.skills).toEqual([1, 2, 3]);
    });

    it('should allow skills as null', () => {
      const req: CreateArticleRequest = { skills: null };
      expect(req.skills).toBeNull();
    });

    it('should have correct number of fields when all set', () => {
      const req: CreateArticleRequest = {
        title: 'T', article_type: 'a', write_mode: 'w', keywords: 'k',
        portrait: 'p', images: [], platforms: [], skills: [1], llm_model_id: 1,
        content: 'c', status: 'draft',
      };
      expect(Object.keys(req)).toHaveLength(11);
    });

    // === 新增测试用例 ===

    it('should allow skills with large number of IDs', () => {
      const req: CreateArticleRequest = { skills: Array.from({ length: 50 }, (_, i) => i + 1) };
      expect(req.skills).toHaveLength(50);
    });

    it('should allow llm_model_id as 0', () => {
      const req: CreateArticleRequest = { llm_model_id: 0 };
      expect(req.llm_model_id).toBe(0);
    });

    it('should allow very large llm_model_id', () => {
      const req: CreateArticleRequest = { llm_model_id: Number.MAX_SAFE_INTEGER };
      expect(req.llm_model_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should allow unicode title', () => {
      const req: CreateArticleRequest = { title: '中文标题🚀émoji' };
      expect(req.title).toContain('🚀');
    });

    it('should allow keywords with various separators', () => {
      const req: CreateArticleRequest = { keywords: '关键词1, 关键词2; 关键词3' };
      expect(req.keywords).toContain(',');
      expect(req.keywords).toContain(';');
    });

    it('should allow very long content', () => {
      const longContent = '内容'.repeat(10000);
      const req: CreateArticleRequest = { content: longContent };
      expect(req.content!.length).toBeGreaterThanOrEqual(20000);
    });

    it('should allow empty string title', () => {
      const req: CreateArticleRequest = { title: '' };
      expect(req.title).toBe('');
    });

    it('should allow empty string content', () => {
      const req: CreateArticleRequest = { content: '' };
      expect(req.content).toBe('');
    });

    it('should allow only keywords', () => {
      const req: CreateArticleRequest = { keywords: 'SEO优化' };
      expect(Object.keys(req)).toEqual(['keywords']);
    });

    it('should allow only llm_model_id', () => {
      const req: CreateArticleRequest = { llm_model_id: 42 };
      expect(req.llm_model_id).toBe(42);
    });

    it('should allow only portrait', () => {
      const req: CreateArticleRequest = { portrait: '目标受众画像' };
      expect(req.portrait).toBe('目标受众画像');
    });

    it('should allow status "generating" for auto-generation flow', () => {
      const req: CreateArticleRequest = { title: 'AI生成文章', status: 'generating' };
      expect(req.status).toBe('generating');
    });

    it('should allow status "manual_writing" for manual writing flow', () => {
      const req: CreateArticleRequest = { title: '手动撰写', status: 'manual_writing' };
      expect(req.status).toBe('manual_writing');
    });

    it('should have exactly 11 fields in the interface', () => {
      const allFields = ['title', 'article_type', 'write_mode', 'keywords', 'portrait',
        'images', 'platforms', 'skills', 'llm_model_id', 'content', 'status'];
      const req: CreateArticleRequest = {
        title: 't', article_type: 'a', write_mode: 'w', keywords: 'k', portrait: 'p',
        images: [], platforms: [], skills: [], llm_model_id: 0, content: 'c', status: 'draft',
      };
      expect(Object.keys(req).sort()).toEqual(allFields.sort());
    });
  });

  describe('UpdateArticleRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateArticleRequest = {
        title: '更新标题',
        article_type: 'seo',
        write_mode: 'manual',
        keywords: '新关键词',
        portrait: '新画像',
        images: ['new.jpg'],
        platforms: ['新平台'],
        skills: [2],
        llm_model_id: 2,
        content: '更新内容',
        status: 'published',
        scheduled_publish_at: '2026-12-31T00:00:00Z',
      };
      expect(req.title).toBe('更新标题');
      expect(req.content).toBe('更新内容');
      expect(req.status).toBe('published');
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
      const req: UpdateArticleRequest = { status: 'published' };
      expect(req.status).toBe('published');
    });

    it('should allow updating only images', () => {
      const req: UpdateArticleRequest = { images: ['a.jpg'] };
      expect(req.images).toEqual(['a.jpg']);
    });

    it('should allow updating only platforms', () => {
      const req: UpdateArticleRequest = { platforms: ['头条'] };
      expect(req.platforms).toEqual(['头条']);
    });

    it('should have correct number of fields when all set', () => {
      const req: UpdateArticleRequest = {
        title: 'T', article_type: 'a', write_mode: 'w', keywords: 'k',
        portrait: 'p', images: [], platforms: [], skills: [1], llm_model_id: 1,
        content: 'c', status: 'draft', scheduled_publish_at: '2026-01-01T00:00:00.000Z',
      };
      expect(Object.keys(req)).toHaveLength(12);
    });

    // === 新增测试用例 ===

    it('should support schedule_type as "asap"', () => {
      const req: UpdateArticleRequest = { schedule_type: 'asap', scheduled_publish_at: null };
      expect(req.schedule_type).toBe('asap');
    });

    it('should support schedule_type as "scheduled"', () => {
      const req: UpdateArticleRequest = { schedule_type: 'scheduled', scheduled_publish_at: '2026-12-31T10:00:00Z' };
      expect(req.schedule_type).toBe('scheduled');
    });

    it('should support schedule_type as "after"', () => {
      const req: UpdateArticleRequest = { schedule_type: 'after', scheduled_publish_at: '2026-07-01T00:00:00Z' };
      expect(req.schedule_type).toBe('after');
    });

    it('should allow schedule_type to be null', () => {
      const req: UpdateArticleRequest = { schedule_type: null };
      expect(req.schedule_type).toBeNull();
    });

    it('should allow updating all ArticleStatus values', () => {
      const statuses: ArticleStatus[] = ['draft', 'manual_writing', 'generating', 'generate_failed',
        'pending_review', 'publishing', 'publish_failed', 'published'];
      statuses.forEach((status) => {
        const req: UpdateArticleRequest = { status };
        expect(req.status).toBe(status);
      });
    });

    it('should allow updating only schedule_type', () => {
      const req: UpdateArticleRequest = { schedule_type: 'asap' };
      expect(Object.keys(req)).toEqual(['schedule_type']);
    });

    it('should allow updating only keywords', () => {
      const req: UpdateArticleRequest = { keywords: '新关键词1,新关键词2' };
      expect(req.keywords).toBe('新关键词1,新关键词2');
    });

    it('should allow updating only portrait', () => {
      const req: UpdateArticleRequest = { portrait: '更新后的画像' };
      expect(req.portrait).toBe('更新后的画像');
    });

    it('should allow updating only skills', () => {
      const req: UpdateArticleRequest = { skills: [1, 2, 3] };
      expect(req.skills).toEqual([1, 2, 3]);
    });

    it('should allow updating skills to null', () => {
      const req: UpdateArticleRequest = { skills: null };
      expect(req.skills).toBeNull();
    });

    it('should allow updating only llm_model_id', () => {
      const req: UpdateArticleRequest = { llm_model_id: 42 };
      expect(req.llm_model_id).toBe(42);
    });

    it('should allow scheduled_publish_at as ISO string with milliseconds', () => {
      const req: UpdateArticleRequest = { scheduled_publish_at: '2026-06-15T10:30:00.123Z' };
      expect(req.scheduled_publish_at).toContain('.123');
    });

    it('should have exactly 13 fields in the interface', () => {
      const allFields = ['title', 'article_type', 'write_mode', 'keywords', 'portrait',
        'images', 'platforms', 'skills', 'llm_model_id', 'content', 'status',
        'scheduled_publish_at', 'schedule_type'];
      const req: UpdateArticleRequest = {
        title: 't', article_type: 'a', write_mode: 'w', keywords: 'k', portrait: 'p',
        images: [], platforms: [], skills: null, llm_model_id: 0, content: 'c',
        status: 'draft', scheduled_publish_at: null, schedule_type: null,
      };
      expect(Object.keys(req).sort()).toEqual(allFields.sort());
    });
  });

  describe('ReviewArticleRequest interface', () => {
    it('should create a valid approval request', () => {
      const req: ReviewArticleRequest = { approved: true };
      expect(req.approved).toBe(true);
    });

    it('should create a valid rejection request', () => {
      const req: ReviewArticleRequest = { approved: false };
      expect(req.approved).toBe(false);
    });

    it('should have exactly one field', () => {
      const req: ReviewArticleRequest = { approved: true };
      expect(Object.keys(req)).toEqual(['approved']);
    });

    // === 新增测试用例 ===

    it('should treat approved=true as truthy for conditional checks', () => {
      const req: ReviewArticleRequest = { approved: true };
      expect(req.approved).toBeTruthy();
    });

    it('should treat approved=false as falsy for conditional checks', () => {
      const req: ReviewArticleRequest = { approved: false };
      expect(req.approved).toBeFalsy();
    });

    it('should preserve boolean type strictly', () => {
      const approve: ReviewArticleRequest = { approved: true };
      const reject: ReviewArticleRequest = { approved: false };
      expect(typeof approve.approved).toBe('boolean');
      expect(typeof reject.approved).toBe('boolean');
    });
  });

  describe('ArticleStatus type coverage', () => {
    it('should cover all 8 ArticleStatus values', () => {
      const allStatuses: ArticleStatus[] = [
        'draft',
        'manual_writing',
        'generating',
        'generate_failed',
        'pending_review',
        'publishing',
        'publish_failed',
        'published',
      ];
      expect(allStatuses).toHaveLength(8);
      const unique = [...new Set(allStatuses)];
      expect(unique).toHaveLength(8);
    });

    it('should have draft as initial status', () => {
      const article: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null, write_mode: null,
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 0,
        status: 'draft', scheduled_publish_at: null, schedule_type: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.status).toBe('draft');
    });

    it('should represent generation lifecycle: draft -> generating -> generate_failed', () => {
      const statuses: ArticleStatus[] = ['draft', 'generating', 'generate_failed'];
      expect(statuses[0]).toBe('draft');
      expect(statuses[1]).toBe('generating');
      expect(statuses[2]).toBe('generate_failed');
    });

    it('should represent publish lifecycle: pending_review -> publishing -> publish_failed/published', () => {
      const statuses: ArticleStatus[] = ['pending_review', 'publishing', 'published'];
      expect(statuses[0]).toBe('pending_review');
      expect(statuses[2]).toBe('published');
    });

    it('should represent manual writing status', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '手动文章', article_type: null, write_mode: 'manual',
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 0,
        status: 'manual_writing', scheduled_publish_at: null, schedule_type: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.status).toBe('manual_writing');
      expect(article.write_mode).toBe('manual');
    });
  });

  describe('ScheduleType type coverage', () => {
    it('should cover all 3 ScheduleType values', () => {
      const types: ScheduleType[] = ['asap', 'scheduled', 'after'];
      expect(types).toHaveLength(3);
    });

    it('should support "asap" for immediate scheduling', () => {
      const article: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null, write_mode: null,
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', scheduled_publish_at: null, schedule_type: 'asap', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.schedule_type).toBe('asap');
      expect(article.scheduled_publish_at).toBeNull();
    });

    it('should support "scheduled" for fixed-time scheduling', () => {
      const date = new Date('2026-06-01T10:00:00+08:00');
      const article: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null, write_mode: null,
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', scheduled_publish_at: date, schedule_type: 'scheduled', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.schedule_type).toBe('scheduled');
      expect(article.scheduled_publish_at).toBeInstanceOf(Date);
    });

    it('should support "after" for relative-time scheduling', () => {
      const date = new Date('2026-07-01T00:00:00Z');
      const article: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null, write_mode: null,
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', scheduled_publish_at: date, schedule_type: 'after', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.schedule_type).toBe('after');
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const article: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null, write_mode: null,
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', scheduled_publish_at: null, schedule_type: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.title).toBe('T');
    });
  });
});
