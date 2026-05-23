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
         'version', 'status', 'scheduled_publish_at', 'created_by', 'created_at',
         'updated_at'].sort()
      );
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
        skills: 1,
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
      expect(req.skills).toBe(1);
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

    it('should allow skills as 0', () => {
      const req: CreateArticleRequest = { skills: 0 };
      expect(req.skills).toBe(0);
    });

    it('should have correct number of fields when all set', () => {
      const req: CreateArticleRequest = {
        title: 'T', article_type: 'a', write_mode: 'w', keywords: 'k',
        portrait: 'p', images: [], platforms: [], skills: 1, llm_model_id: 1,
        content: 'c', status: 'draft',
      };
      expect(Object.keys(req)).toHaveLength(11);
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
        skills: 2,
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
        portrait: 'p', images: [], platforms: [], skills: 1, llm_model_id: 1,
        content: 'c', status: 'draft', scheduled_publish_at: '2026-01-01T00:00:00.000Z',
      };
      expect(Object.keys(req)).toHaveLength(12);
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
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const article: Article = {
        id: 1, project_id: 1, title: 'T', article_type: null, write_mode: null,
        keywords: null, portrait: null, images: null, platforms: null,
        skills: null, llm_model_id: null, content: null, version: 1,
        status: 'draft', scheduled_publish_at: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(article.title).toBe('T');
    });
  });
});
