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

  // ==================== 第二轮 TDD 补全 ====================

  describe('Article JSON 序列化/反序列化', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: '测试文章', article_type: 'seo',
      write_mode: 'auto', keywords: '关键词', portrait: '画像',
      images: ['img1.jpg'], platforms: ['新浪'], skills: null,
      llm_model_id: 1, content: '内容', version: 1, status: 'draft',
      scheduled_publish_at: new Date('2026-06-01T10:00:00Z'),
      schedule_type: 'scheduled', created_by: 1,
      created_at: new Date('2026-05-24T08:00:00Z'),
      updated_at: new Date('2026-05-24T09:00:00Z'),
    };

    it('should serialize Article to JSON with Date as ISO string', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(typeof parsed.scheduled_publish_at).toBe('string');
      expect(parsed.created_at).toBe('2026-05-24T08:00:00.000Z');
    });

    it('should deserialize JSON back to Article with Date conversion', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      const restored: Article = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
        scheduled_publish_at: parsed.scheduled_publish_at ? new Date(parsed.scheduled_publish_at) : null,
      };
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.updated_at).toBeInstanceOf(Date);
      expect(restored.scheduled_publish_at).toBeInstanceOf(Date);
      expect(restored.id).toBe(baseArticle.id);
      expect(restored.title).toBe(baseArticle.title);
    });

    it('should serialize null Date fields as null in JSON', () => {
      const article: Article = {
        ...baseArticle, scheduled_publish_at: null,
      };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.scheduled_publish_at).toBeNull();
    });

    it('should serialize images array correctly', () => {
      const article: Article = { ...baseArticle, images: ['a.jpg', 'b.png'] };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.images).toEqual(['a.jpg', 'b.png']);
    });

    it('should serialize platforms array correctly', () => {
      const article: Article = { ...baseArticle, platforms: ['头条', '百家号'] };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.platforms).toEqual(['头条', '百家号']);
    });

    it('should serialize skills as unknown JSON value', () => {
      const article: Article = { ...baseArticle, skills: { model: 'gpt-4', temp: 0.7 } };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.skills.model).toBe('gpt-4');
      expect(parsed.skills.temp).toBe(0.7);
    });

    it('should serialize null fields as null in JSON', () => {
      const article: Article = {
        ...baseArticle, article_type: null, write_mode: null, keywords: null,
        portrait: null, images: null, platforms: null, skills: null,
        llm_model_id: null, content: null, created_by: null,
      };
      const json = JSON.stringify(article);
      const parsed = JSON.parse(json);
      expect(parsed.article_type).toBeNull();
      expect(parsed.write_mode).toBeNull();
      expect(parsed.keywords).toBeNull();
      expect(parsed.portrait).toBeNull();
      expect(parsed.images).toBeNull();
      expect(parsed.platforms).toBeNull();
      expect(parsed.skills).toBeNull();
      expect(parsed.llm_model_id).toBeNull();
      expect(parsed.content).toBeNull();
      expect(parsed.created_by).toBeNull();
    });

    it('should preserve numeric fields through JSON roundtrip', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.project_id).toBe(1);
      expect(parsed.llm_model_id).toBe(1);
      expect(parsed.version).toBe(1);
    });

    it('should handle ArticleVersion JSON roundtrip', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: '版本内容',
        created_by: 1, created_at: new Date('2026-05-24T10:00:00Z'),
      };
      const json = JSON.stringify(version);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.article_id).toBe(1);
      expect(parsed.content).toBe('版本内容');
      expect(parsed.created_at).toBe('2026-05-24T10:00:00.000Z');
    });
  });

  describe('Article 对象拷贝与不可变性', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: '原始标题', article_type: null,
      write_mode: null, keywords: null, portrait: null, images: ['a.jpg'],
      platforms: ['p1'], skills: null, llm_model_id: null, content: null,
      version: 1, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, created_by: null,
      created_at: new Date(), updated_at: new Date(),
    };

    it('should create independent copy via spread operator', () => {
      const copy: Article = { ...baseArticle, title: '新标题' };
      expect(copy.title).toBe('新标题');
      expect(baseArticle.title).toBe('原始标题');
    });

    it('should share array references in shallow copy (images)', () => {
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

    it('should create independent platforms with explicit copy', () => {
      const fresh: Article = { ...baseArticle, platforms: ['px'] };
      const copy: Article = { ...fresh, platforms: [...fresh.platforms!] };
      copy.platforms!.push('py');
      expect(fresh.platforms).not.toContain('py');
    });

    it('should support Object.freeze on Article', () => {
      const frozen = Object.freeze({ ...baseArticle });
      expect(() => { (frozen as any).title = 'modified'; }).toThrow();
      expect(frozen.title).toBe('原始标题');
    });

    it('should support Object.freeze on nested arrays', () => {
      const frozen = Object.freeze({
        ...baseArticle,
        images: Object.freeze(['a.jpg']),
      });
      expect(() => { (frozen.images as any).push('b.jpg'); }).toThrow();
    });

    it('should preserve Date object identity in spread', () => {
      const copy: Article = { ...baseArticle };
      expect(copy.created_at).toBe(baseArticle.created_at);
    });

    it('should support deep clone via JSON roundtrip', () => {
      const json = JSON.stringify(baseArticle);
      const parsed = JSON.parse(json);
      const cloned: Article = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
        scheduled_publish_at: parsed.scheduled_publish_at ? new Date(parsed.scheduled_publish_at) : null,
      };
      cloned.title = '克隆标题';
      expect(baseArticle.title).toBe('原始标题');
      expect(cloned.title).toBe('克隆标题');
    });
  });

  describe('跨接口一致性', () => {
    it('CreateArticleRequest fields should be subset of Article fields', () => {
      const req: CreateArticleRequest = {
        title: '新文章', article_type: 'seo', write_mode: 'auto',
        keywords: 'kw', portrait: 'p', images: [], platforms: [],
        skills: [1], llm_model_id: 1, content: 'c', status: 'draft',
      };
      // All CreateArticleRequest fields should map to Article fields
      const article: Article = {
        id: 1, project_id: 1,
        title: req.title ?? '',
        article_type: req.article_type ?? null,
        write_mode: req.write_mode ?? null,
        keywords: req.keywords ?? null,
        portrait: req.portrait ?? null,
        images: req.images ?? null,
        platforms: req.platforms ?? null,
        skills: req.skills ?? null,
        llm_model_id: req.llm_model_id ?? null,
        content: req.content ?? null,
        version: 0,
        status: req.status ?? 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(article.title).toBe('新文章');
      expect(article.status).toBe('draft');
    });

    it('UpdateArticleRequest should be applicable to existing Article', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '原标题', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        platforms: null, skills: null, llm_model_id: null, content: null,
        version: 1, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateArticleRequest = { title: '新标题', status: 'pending_review' };
      const updated: Article = { ...article, ...update, updated_at: new Date() };
      expect(updated.title).toBe('新标题');
      expect(updated.status).toBe('pending_review');
      expect(updated.id).toBe(1);
      expect(updated.project_id).toBe(1);
    });

    it('ArticleVersion should reference Article by article_id', () => {
      const article: Article = {
        id: 42, project_id: 1, title: 'T', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        platforms: null, skills: null, llm_model_id: null, content: null,
        version: 3, status: 'published', scheduled_publish_at: null,
        schedule_type: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const version: ArticleVersion = {
        id: 1, article_id: article.id, version: 3,
        content: 'v3内容', created_by: 1, created_at: new Date(),
      };
      expect(version.article_id).toBe(article.id);
      expect(version.version).toBe(article.version);
    });

    it('CreateArticleRequest status values should be subset of ArticleStatus', () => {
      const createStatuses: Array<CreateArticleRequest['status']> = ['draft', 'generating', 'manual_writing'];
      const articleStatuses: ArticleStatus[] = [
        'draft', 'manual_writing', 'generating', 'generate_failed',
        'pending_review', 'publishing', 'publish_failed', 'published',
      ];
      createStatuses.forEach(s => {
        expect(articleStatuses).toContain(s);
      });
    });

    it('UpdateArticleRequest skills type should be number[] | null (aligned with entity fix)', () => {
      const req1: UpdateArticleRequest = { skills: [1, 2, 3] };
      const req2: UpdateArticleRequest = { skills: null };
      const req3: UpdateArticleRequest = { skills: [] };
      expect(Array.isArray(req1.skills)).toBe(true);
      expect(req2.skills).toBeNull();
      expect(req3.skills).toEqual([]);
    });

    it('CreateArticleRequest skills type should be number[] | null (aligned with entity fix)', () => {
      const req1: CreateArticleRequest = { skills: [10, 20] };
      const req2: CreateArticleRequest = { skills: null };
      expect(req1.skills).toEqual([10, 20]);
      expect(req2.skills).toBeNull();
    });
  });

  describe('Article 边界值补充', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: 'T', article_type: null,
      write_mode: null, keywords: null, portrait: null, images: null,
      platforms: null, skills: null, llm_model_id: null, content: null,
      version: 1, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, created_by: null,
      created_at: new Date(), updated_at: new Date(),
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

    it('should support llm_model_id as negative', () => {
      const article: Article = { ...baseArticle, llm_model_id: -1 };
      expect(article.llm_model_id).toBe(-1);
    });

    it('should support title with only spaces', () => {
      const article: Article = { ...baseArticle, title: '   ' };
      expect(article.title).toBe('   ');
    });

    it('should support content with only spaces', () => {
      const article: Article = { ...baseArticle, content: '  \n\t  ' };
      expect(article.content).toBe('  \n\t  ');
    });

    it('should support keywords with single character', () => {
      const article: Article = { ...baseArticle, keywords: 'A' };
      expect(article.keywords).toBe('A');
    });

    it('should support extremely long keywords string', () => {
      const longKeywords = '关键词'.repeat(5000);
      const article: Article = { ...baseArticle, keywords: longKeywords };
      expect(article.keywords!.length).toBe(15000);
    });

    it('should support extremely long portrait string', () => {
      const longPortrait = '画像描述'.repeat(5000);
      const article: Article = { ...baseArticle, portrait: longPortrait };
      expect(article.portrait!.length).toBe(20000);
    });

    it('should support images array with many elements', () => {
      const manyImages = Array.from({ length: 100 }, (_, i) => `img${i}.jpg`);
      const article: Article = { ...baseArticle, images: manyImages };
      expect(article.images).toHaveLength(100);
    });

    it('should support platforms array with many elements', () => {
      const manyPlatforms = Array.from({ length: 50 }, (_, i) => `平台${i}`);
      const article: Article = { ...baseArticle, platforms: manyPlatforms };
      expect(article.platforms).toHaveLength(50);
    });

    it('should support scheduled_publish_at as Date epoch', () => {
      const article: Article = { ...baseArticle, scheduled_publish_at: new Date(0) };
      expect(article.scheduled_publish_at!.getTime()).toBe(0);
    });

    it('should support scheduled_publish_at as far future date', () => {
      const farFuture = new Date('2100-12-31T23:59:59Z');
      const article: Article = { ...baseArticle, scheduled_publish_at: farFuture, schedule_type: 'scheduled' };
      expect(article.scheduled_publish_at!.getUTCFullYear()).toBe(2100);
    });

    it('should support images with duplicate values', () => {
      const article: Article = { ...baseArticle, images: ['same.jpg', 'same.jpg', 'same.jpg'] };
      expect(article.images).toHaveLength(3);
      expect(article.images!.every(img => img === 'same.jpg')).toBe(true);
    });

    it('should support platforms with duplicate values', () => {
      const article: Article = { ...baseArticle, platforms: ['新浪', '新浪', '新浪'] };
      expect(article.platforms).toHaveLength(3);
    });

    it('should support version as Number.MAX_SAFE_INTEGER', () => {
      const article: Article = { ...baseArticle, version: Number.MAX_SAFE_INTEGER };
      expect(article.version).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('ArticleVersion 边界值补充', () => {
    it('should support id as 0', () => {
      const version: ArticleVersion = {
        id: 0, article_id: 1, version: 1, content: 'c',
        created_by: null, created_at: new Date(),
      };
      expect(version.id).toBe(0);
    });

    it('should support article_id as 0', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 0, version: 1, content: 'c',
        created_by: null, created_at: new Date(),
      };
      expect(version.article_id).toBe(0);
    });

    it('should support version as Number.MAX_SAFE_INTEGER', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: Number.MAX_SAFE_INTEGER,
        content: 'c', created_by: null, created_at: new Date(),
      };
      expect(version.version).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support fractional version', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 2.5, content: 'c',
        created_by: null, created_at: new Date(),
      };
      expect(version.version).toBe(2.5);
    });

    it('should support content with null bytes', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: 'content\x00with\x00nulls',
        created_by: null, created_at: new Date(),
      };
      expect(version.content).toContain('\x00');
    });

    it('should support created_at as epoch', () => {
      const version: ArticleVersion = {
        id: 1, article_id: 1, version: 1, content: 'c',
        created_by: null, created_at: new Date(0),
      };
      expect(version.created_at.getTime()).toBe(0);
    });
  });

  describe('安全相关测试', () => {
    const baseArticle: Article = {
      id: 1, project_id: 1, title: 'T', article_type: null,
      write_mode: null, keywords: null, portrait: null, images: null,
      platforms: null, skills: null, llm_model_id: null, content: null,
      version: 1, status: 'draft', scheduled_publish_at: null,
      schedule_type: null, created_by: null,
      created_at: new Date(), updated_at: new Date(),
    };

    it('should store title with script tags as plain text', () => {
      const xssTitle = '<script>alert("xss")</script>';
      const article: Article = { ...baseArticle, title: xssTitle };
      expect(article.title).toBe(xssTitle);
      expect(article.title).toContain('<script>');
    });

    it('should store content with SQL injection pattern as plain text', () => {
      const sqlContent = "'; DROP TABLE articles; --";
      const article: Article = { ...baseArticle, content: sqlContent };
      expect(article.content).toBe(sqlContent);
      expect(article.content).toContain('DROP TABLE');
    });

    it('should store keywords with HTML entities as plain text', () => {
      const htmlKeywords = '&lt;script&gt;&amp;&lt;/script&gt;';
      const article: Article = { ...baseArticle, keywords: htmlKeywords };
      expect(article.keywords).toBe(htmlKeywords);
    });

    it('should store portrait with path traversal pattern as plain text', () => {
      const traversal = '../../../etc/passwd';
      const article: Article = { ...baseArticle, portrait: traversal };
      expect(article.portrait).toBe(traversal);
    });

    it('should store images with javascript: protocol as plain string', () => {
      const xssImages = ['javascript:alert(1)', 'data:text/html,<h1>test</h1>'];
      const article: Article = { ...baseArticle, images: xssImages };
      expect(article.images![0]).toBe('javascript:alert(1)');
      expect(article.images![1]).toBe('data:text/html,<h1>test</h1>');
    });

    it('should store content with prototype pollution pattern as plain text', () => {
      const pollution = '{"__proto__":{"admin":true}}';
      const article: Article = { ...baseArticle, content: pollution };
      expect(article.content).toBe(pollution);
    });

    it('should store content with very large unicode safely', () => {
      const bigUnicode = '￿'.repeat(1000);
      const article: Article = { ...baseArticle, content: bigUnicode };
      expect(article.content!.length).toBe(1000);
    });

    it('should store title with null bytes safely', () => {
      const nullTitle = 'title\x00injection';
      const article: Article = { ...baseArticle, title: nullTitle };
      expect(article.title).toContain('\x00');
    });
  });

  describe('CreateArticleRequest 补充测试', () => {
    it('should support content with HTML markup', () => {
      const req: CreateArticleRequest = { content: '<h1>标题</h1><p>段落</p>' };
      expect(req.content).toContain('<h1>');
      expect(req.content).toContain('</p>');
    });

    it('should support portrait with detailed description', () => {
      const portrait = '目标受众：25-35岁科技从业者，关注AI和大模型技术';
      const req: CreateArticleRequest = { portrait };
      expect(req.portrait).toContain('25-35岁');
    });

    it('should support write_mode with custom value', () => {
      const req: CreateArticleRequest = { write_mode: 'ai_assist' };
      expect(req.write_mode).toBe('ai_assist');
    });

    it('should support article_type with custom value', () => {
      const req: CreateArticleRequest = { article_type: '技术博客' };
      expect(req.article_type).toBe('技术博客');
    });

    it('should support images with mixed URL formats', () => {
      const req: CreateArticleRequest = {
        images: ['https://cdn.example.com/img.jpg', '/uploads/local.png', 'relative/path.gif'],
      };
      expect(req.images).toHaveLength(3);
    });

    it('should support platforms with mixed Chinese and English', () => {
      const req: CreateArticleRequest = { platforms: ['微信公众号', 'Medium', 'Dev.to'] };
      expect(req.platforms).toHaveLength(3);
    });

    it('should support skills with zero values', () => {
      const req: CreateArticleRequest = { skills: [0, 0, 0] };
      expect(req.skills).toEqual([0, 0, 0]);
    });

    it('should support skills with large IDs', () => {
      const req: CreateArticleRequest = { skills: [Number.MAX_SAFE_INTEGER] };
      expect(req.skills![0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support all three valid status values independently', () => {
      const statuses: Array<NonNullable<CreateArticleRequest['status']>> = ['draft', 'generating', 'manual_writing'];
      statuses.forEach(status => {
        const req: CreateArticleRequest = { status };
        expect(req.status).toBe(status);
      });
    });

    it('should support content with mixed line endings', () => {
      const req: CreateArticleRequest = { content: 'line1\r\nline2\nline3\rline4' };
      expect(req.content).toContain('\r\n');
      expect(req.content).toContain('\n');
    });
  });

  describe('UpdateArticleRequest 补充测试', () => {
    it('should support scheduled_publish_at as RFC 2822 format string', () => {
      const req: UpdateArticleRequest = { scheduled_publish_at: 'Sat, 01 Jan 2026 00:00:00 GMT' };
      expect(typeof req.scheduled_publish_at).toBe('string');
    });

    it('should support scheduled_publish_at as date-only string', () => {
      const req: UpdateArticleRequest = { scheduled_publish_at: '2026-06-15' };
      expect(req.scheduled_publish_at).toBe('2026-06-15');
    });

    it('should support schedule_type and scheduled_publish_at consistency', () => {
      const req: UpdateArticleRequest = {
        schedule_type: 'scheduled',
        scheduled_publish_at: '2026-12-31T23:59:59Z',
      };
      expect(req.schedule_type).toBe('scheduled');
      expect(req.scheduled_publish_at).toBeTruthy();
    });

    it('should support asap with null scheduled_publish_at (clear schedule)', () => {
      const req: UpdateArticleRequest = {
        schedule_type: 'asap',
        scheduled_publish_at: null,
      };
      expect(req.schedule_type).toBe('asap');
      expect(req.scheduled_publish_at).toBeNull();
    });

    it('should support updating only write_mode', () => {
      const req: UpdateArticleRequest = { write_mode: 'manual' };
      expect(Object.keys(req)).toEqual(['write_mode']);
    });

    it('should support updating only article_type', () => {
      const req: UpdateArticleRequest = { article_type: '技术深度' };
      expect(Object.keys(req)).toEqual(['article_type']);
    });

    it('should support updating title and content together', () => {
      const req: UpdateArticleRequest = { title: '新标题', content: '新内容' };
      expect(Object.keys(req).sort()).toEqual(['content', 'title']);
    });

    it('should support updating all status transitions', () => {
      type StatusTransition = [from: ArticleStatus, to: ArticleStatus];
      const transitions: StatusTransition[] = [
        ['draft', 'manual_writing'],
        ['draft', 'generating'],
        ['generating', 'generate_failed'],
        ['generating', 'pending_review'],
        ['manual_writing', 'pending_review'],
        ['pending_review', 'publishing'],
        ['pending_review', 'draft'],
        ['publishing', 'published'],
        ['publishing', 'publish_failed'],
        ['publish_failed', 'publishing'],
      ];
      transitions.forEach(([from, to]) => {
        const req: UpdateArticleRequest = { status: to };
        expect(req.status).toBe(to);
      });
    });

    it('should support skills as empty array to clear skills', () => {
      const req: UpdateArticleRequest = { skills: [] };
      expect(req.skills).toEqual([]);
    });

    it('should support updating only images to empty array', () => {
      const req: UpdateArticleRequest = { images: [] };
      expect(req.images).toEqual([]);
    });

    it('should support updating only platforms to empty array', () => {
      const req: UpdateArticleRequest = { platforms: [] };
      expect(req.platforms).toEqual([]);
    });
  });

  describe('ReviewArticleRequest 补充测试', () => {
    it('should support boolean equality comparison', () => {
      const approve: ReviewArticleRequest = { approved: true };
      const reject: ReviewArticleRequest = { approved: false };
      expect(approve.approved === true).toBe(true);
      expect(reject.approve !== undefined ? reject.approved === false : false).toBe(false);
      expect(reject.approved === false).toBe(true);
    });

    it('should support conditional branching based on approved', () => {
      const req: ReviewArticleRequest = { approved: true };
      let result = '';
      if (req.approved) {
        result = '通过';
      } else {
        result = '拒绝';
      }
      expect(result).toBe('通过');
    });

    it('should support negation pattern', () => {
      const req: ReviewArticleRequest = { approved: false };
      expect(!req.approved).toBe(true);
    });

    it('should support array filter with approved status', () => {
      const reviews: ReviewArticleRequest[] = [
        { approved: true },
        { approved: false },
        { approved: true },
      ];
      const approved = reviews.filter(r => r.approved);
      const rejected = reviews.filter(r => !r.approved);
      expect(approved).toHaveLength(2);
      expect(rejected).toHaveLength(1);
    });
  });

  describe('ArticleStatus 完整生命周期', () => {
    it('should represent complete AI generation flow', () => {
      const flow: ArticleStatus[] = [
        'draft',
        'generating',
        'pending_review',
        'publishing',
        'published',
      ];
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

    it('should represent retry after generation failure', () => {
      const flow: ArticleStatus[] = ['generate_failed', 'generating', 'pending_review', 'publishing', 'published'];
      expect(flow[0]).toBe('generate_failed');
      expect(flow[flow.length - 1]).toBe('published');
    });

    it('should represent retry after publish failure', () => {
      const flow: ArticleStatus[] = ['publish_failed', 'publishing', 'published'];
      expect(flow[0]).toBe('publish_failed');
      expect(flow[flow.length - 1]).toBe('published');
    });

    it('should represent manual writing to publish flow', () => {
      const flow: ArticleStatus[] = ['manual_writing', 'pending_review', 'publishing', 'published'];
      expect(flow[0]).toBe('manual_writing');
      expect(flow).toHaveLength(4);
    });

    it('should represent draft back from review', () => {
      const flow: ArticleStatus[] = ['pending_review', 'draft'];
      expect(flow).toHaveLength(2);
    });

    it('should have exactly 8 unique status values', () => {
      const allStatuses: ArticleStatus[] = [
        'draft', 'manual_writing', 'generating', 'generate_failed',
        'pending_review', 'publishing', 'publish_failed', 'published',
      ];
      expect(allStatuses).toHaveLength(8);
      expect(new Set(allStatuses).size).toBe(8);
    });

    it('should have 3 failure/terminal states', () => {
      const failureStates: ArticleStatus[] = ['generate_failed', 'publish_failed'];
      const terminalStates: ArticleStatus[] = ['published'];
      expect(failureStates).toHaveLength(2);
      expect(terminalStates).toHaveLength(1);
    });
  });

  describe('实际使用场景', () => {
    it('should create article from CreateArticleRequest with defaults', () => {
      const req: CreateArticleRequest = {
        title: 'AI时代的技术写作',
        article_type: 'seo',
        write_mode: 'auto',
        keywords: 'AI,技术写作,大模型',
        portrait: '科技从业者',
        images: [],
        platforms: ['微信公众号'],
        skills: [1, 2],
        llm_model_id: 5,
        content: '',
        status: 'draft',
      };
      const article: Article = {
        id: 1,
        project_id: 10,
        title: req.title ?? '',
        article_type: req.article_type ?? null,
        write_mode: req.write_mode ?? null,
        keywords: req.keywords ?? null,
        portrait: req.portrait ?? null,
        images: req.images ?? null,
        platforms: req.platforms ?? null,
        skills: req.skills ?? null,
        llm_model_id: req.llm_model_id ?? null,
        content: req.content ?? null,
        version: 0,
        status: req.status ?? 'draft',
        scheduled_publish_at: null,
        schedule_type: null,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(article.title).toBe('AI时代的技术写作');
      expect(article.status).toBe('draft');
      expect(article.version).toBe(0);
    });

    it('should apply partial update to existing article', () => {
      const original: Article = {
        id: 1, project_id: 1, title: '原标题', article_type: 'seo',
        write_mode: 'auto', keywords: '旧关键词', portrait: '旧画像',
        images: ['old.jpg'], platforms: ['旧平台'], skills: [1],
        llm_model_id: 1, content: '旧内容', version: 2, status: 'draft',
        scheduled_publish_at: null, schedule_type: null, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateArticleRequest = {
        title: '更新标题',
        status: 'pending_review',
      };
      const result: Article = { ...original, ...update, updated_at: new Date() };
      expect(result.title).toBe('更新标题');
      expect(result.status).toBe('pending_review');
      expect(result.content).toBe('旧内容');
      expect(result.version).toBe(2);
      expect(result.article_type).toBe('seo');
    });

    it('should handle review flow with ReviewArticleRequest', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '审核文章', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        platforms: null, skills: null, llm_model_id: null, content: '内容',
        version: 1, status: 'pending_review', scheduled_publish_at: null,
        schedule_type: null, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const review: ReviewArticleRequest = { approved: true };
      const afterReview: Article = {
        ...article,
        status: review.approved ? 'publishing' : 'draft',
        updated_at: new Date(),
      };
      expect(afterReview.status).toBe('publishing');
    });

    it('should handle rejected review', () => {
      const review: ReviewArticleRequest = { approved: false };
      const afterReject = review.approved ? 'publishing' : 'draft';
      expect(afterReject).toBe('draft');
    });

    it('should create article version for content history', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '版本化文章', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        platforms: null, skills: null, llm_model_id: null, content: 'v3内容',
        version: 3, status: 'draft', scheduled_publish_at: null,
        schedule_type: null, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const versions: ArticleVersion[] = [
        { id: 1, article_id: article.id, version: 1, content: 'v1', created_by: 1, created_at: new Date() },
        { id: 2, article_id: article.id, version: 2, content: 'v2', created_by: 1, created_at: new Date() },
        { id: 3, article_id: article.id, version: 3, content: article.content ?? '', created_by: 1, created_at: new Date() },
      ];
      expect(versions).toHaveLength(3);
      expect(versions[2].version).toBe(article.version);
      expect(versions.every(v => v.article_id === article.id)).toBe(true);
    });

    it('should handle schedule update for publishing', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '定时发布', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        platforms: null, skills: null, llm_model_id: null, content: '内容',
        version: 1, status: 'pending_review', scheduled_publish_at: null,
        schedule_type: null, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateArticleRequest = {
        schedule_type: 'scheduled',
        scheduled_publish_at: '2026-06-15T10:00:00+08:00',
      };
      const result: Article = {
        ...article, ...update, updated_at: new Date(),
      };
      expect(result.schedule_type).toBe('scheduled');
      expect(result.scheduled_publish_at).toBe('2026-06-15T10:00:00+08:00');
    });

    it('should handle clear schedule (asap)', () => {
      const article: Article = {
        id: 1, project_id: 1, title: '取消定时', article_type: null,
        write_mode: null, keywords: null, portrait: null, images: null,
        platforms: null, skills: null, llm_model_id: null, content: '内容',
        version: 1, status: 'draft',
        scheduled_publish_at: new Date('2026-06-15T10:00:00Z'),
        schedule_type: 'scheduled', created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateArticleRequest = {
        schedule_type: 'asap',
        scheduled_publish_at: null,
      };
      const result: Article = {
        ...article, ...update, updated_at: new Date(),
      };
      expect(result.schedule_type).toBe('asap');
      expect(result.scheduled_publish_at).toBeNull();
    });
  });
});
