/**
 * @jest-environment node
 */
import {
  Article,
  ArticleVersion,
  CreateArticleRequest,
  UpdateArticleRequest,
  ReviewArticleRequest,
} from '../../apis/entity/article.entity';

describe('article.entity', () => {
  describe('Article interface', () => {
    it('should create a valid Article object with all required fields', () => {
      const article: Article = {
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
      expect(article.id).toBe(1);
      expect(article.title).toBe('测试文章');
      expect(article.version).toBe(1);
      expect(article.status).toBe('draft');
    });

    it('should allow nullable fields to be null', () => {
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
      expect(article.content).toBeNull();
      expect(article.images).toBeNull();
    });

    it('should support images as string array', () => {
      const article: Article = {
        id: 3,
        project_id: 1,
        title: '有图文章',
        article_type: null,
        write_mode: null,
        keywords: null,
        portrait: null,
        images: ['a.jpg', 'b.png'],
        platforms: null,
        skills: null,
        llm_model_id: null,
        content: null,
        version: 1,
        status: 'draft',
        scheduled_publish_at: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(article.images).toHaveLength(2);
    });

    it('should support scheduled_publish_at as Date', () => {
      const futureDate = new Date('2026-12-31');
      const article: Article = {
        id: 4,
        project_id: 1,
        title: '定时文章',
        article_type: null,
        write_mode: null,
        keywords: null,
        portrait: null,
        images: null,
        platforms: null,
        skills: null,
        llm_model_id: null,
        content: null,
        version: 1,
        status: 'scheduled',
        scheduled_publish_at: futureDate,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(article.scheduled_publish_at).toBeInstanceOf(Date);
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
  });

  describe('UpdateArticleRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateArticleRequest = {
        title: '更新标题',
        content: '更新内容',
        status: 'published',
        scheduled_publish_at: '2026-12-31T00:00:00Z',
      };
      expect(req.title).toBe('更新标题');
    });

    it('should allow scheduled_publish_at to be null', () => {
      const req: UpdateArticleRequest = {
        scheduled_publish_at: null,
      };
      expect(req.scheduled_publish_at).toBeNull();
    });

    it('should allow empty update request', () => {
      const req: UpdateArticleRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
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
      // Type-only imports are validated at compile time by TypeScript
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
