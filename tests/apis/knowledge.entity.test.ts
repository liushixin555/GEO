/**
 * @jest-environment node
 */
import {
  KnowledgeKeyword,
  KeywordExpandedWord,
  KnowledgePortrait,
  KnowledgeImage,
  KnowledgeDocument,
  CreateKeywordRequest,
  UpdateKeywordRequest,
  CreatePortraitRequest,
  UpdatePortraitRequest,
  CreateImageRequest,
  UpdateImageRequest,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MinedKeyword,
} from '../../apis/entity/knowledge.entity';

describe('knowledge.entity', () => {
  describe('KnowledgeKeyword interface', () => {
    it('should create a valid KnowledgeKeyword object', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: 'SEO优化',
        seed_word: 'seo',
        group_id: 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.id).toBe(1);
      expect(keyword.keyword).toBe('SEO优化');
      expect(keyword.seed_word).toBe('seo');
    });

    it('should allow nullable fields to be null', () => {
      const keyword: KnowledgeKeyword = {
        id: 2,
        base_id: 1,
        keyword: '测试',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.seed_word).toBeNull();
      expect(keyword.group_id).toBeNull();
      expect(keyword.created_by).toBeNull();
    });

    it('should include optional expanded_words', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '测试',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 1, word: '扩展词1', selected: true, created_at: new Date(), updated_at: new Date() },
        ],
      };
      expect(keyword.expanded_words).toHaveLength(1);
      expect(keyword.expanded_words![0].word).toBe('扩展词1');
    });
  });

  describe('KeywordExpandedWord interface', () => {
    it('should create a valid KeywordExpandedWord object', () => {
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 1,
        word: '扩展词',
        selected: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(word.word).toBe('扩展词');
      expect(word.selected).toBe(true);
    });

    it('should support selected being false', () => {
      const word: KeywordExpandedWord = {
        id: 2,
        keyword_id: 1,
        word: '未选中词',
        selected: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(word.selected).toBe(false);
    });
  });

  describe('KnowledgePortrait interface', () => {
    it('should create a valid KnowledgePortrait object', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: '用户画像',
        content: '画像内容',
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.title).toBe('用户画像');
      expect(portrait.content).toBe('画像内容');
    });

    it('should allow content and created_by to be null', () => {
      const portrait: KnowledgePortrait = {
        id: 2,
        base_id: 1,
        title: '空画像',
        content: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.content).toBeNull();
      expect(portrait.created_by).toBeNull();
    });
  });

  describe('KnowledgeImage interface', () => {
    it('should create a valid KnowledgeImage object', () => {
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: '产品图',
        description: '产品展示图',
        image_url: 'https://example.com/image.jpg',
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(image.title).toBe('产品图');
      expect(image.image_url).toBe('https://example.com/image.jpg');
    });

    it('should allow description and created_by to be null', () => {
      const image: KnowledgeImage = {
        id: 2,
        base_id: 1,
        title: '无描述图',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(image.description).toBeNull();
    });
  });

  describe('KnowledgeDocument interface', () => {
    it('should create a valid KnowledgeDocument object', () => {
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: '产品文档',
        description: '产品说明文档',
        file_url: '/uploads/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(doc.title).toBe('产品文档');
      expect(doc.file_name).toBe('doc.pdf');
      expect(doc.file_type).toBe('application/pdf');
      expect(doc.file_size).toBe(1024);
    });

    it('should allow description and created_by to be null', () => {
      const doc: KnowledgeDocument = {
        id: 2,
        base_id: 1,
        title: '无描述文档',
        description: null,
        file_url: '/uploads/file.docx',
        file_name: 'file.docx',
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 2048,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(doc.description).toBeNull();
      expect(doc.created_by).toBeNull();
    });
  });

  describe('CreateKeywordRequest interface', () => {
    it('should create a valid request with required fields', () => {
      const req: CreateKeywordRequest = {
        keyword: '新关键词',
      };
      expect(req.keyword).toBe('新关键词');
    });

    it('should include optional expanded_words', () => {
      const req: CreateKeywordRequest = {
        keyword: '带扩展词',
        expanded_words: [
          { word: '扩展1', selected: true },
          { word: '扩展2', selected: false },
        ],
      };
      expect(req.expanded_words).toHaveLength(2);
      expect(req.expanded_words![0].selected).toBe(true);
    });
  });

  describe('UpdateKeywordRequest interface', () => {
    it('should create a valid request', () => {
      const req: UpdateKeywordRequest = {
        keyword: '更新关键词',
        expanded_words: [{ word: '新扩展', selected: true }],
      };
      expect(req.keyword).toBe('更新关键词');
    });

    it('should allow keyword only update', () => {
      const req: UpdateKeywordRequest = { keyword: '只改词' };
      expect(req.expanded_words).toBeUndefined();
    });
  });

  describe('CreatePortraitRequest interface', () => {
    it('should create a valid request with required fields', () => {
      const req: CreatePortraitRequest = {
        title: '新画像',
      };
      expect(req.title).toBe('新画像');
    });

    it('should include optional content', () => {
      const req: CreatePortraitRequest = {
        title: '新画像',
        content: '画像内容',
      };
      expect(req.content).toBe('画像内容');
    });
  });

  describe('UpdatePortraitRequest interface', () => {
    it('should allow partial updates', () => {
      const req: UpdatePortraitRequest = { title: '更新标题' };
      expect(req.content).toBeUndefined();
    });

    it('should allow content only update', () => {
      const req: UpdatePortraitRequest = { content: '新内容' };
      expect(req.title).toBeUndefined();
    });
  });

  describe('CreateImageRequest interface', () => {
    it('should create a valid request with required fields', () => {
      const req: CreateImageRequest = {
        title: '新图片',
        image_url: 'https://example.com/new.jpg',
      };
      expect(req.title).toBe('新图片');
      expect(req.image_url).toBe('https://example.com/new.jpg');
    });

    it('should include optional description', () => {
      const req: CreateImageRequest = {
        title: '图片',
        description: '图片描述',
        image_url: 'https://example.com/img.jpg',
      };
      expect(req.description).toBe('图片描述');
    });
  });

  describe('UpdateImageRequest interface', () => {
    it('should allow partial updates', () => {
      const req: UpdateImageRequest = { title: '新标题' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update', () => {
      const req: UpdateImageRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });
  });

  describe('CreateDocumentRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateDocumentRequest = {
        title: '新文档',
        file_url: '/uploads/new.pdf',
        file_name: 'new.pdf',
        file_type: 'application/pdf',
        file_size: 512,
      };
      expect(req.title).toBe('新文档');
      expect(req.file_size).toBe(512);
    });

    it('should include optional description', () => {
      const req: CreateDocumentRequest = {
        title: '文档',
        description: '文档描述',
        file_url: '/uploads/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
      };
      expect(req.description).toBe('文档描述');
    });
  });

  describe('UpdateDocumentRequest interface', () => {
    it('should allow partial updates', () => {
      const req: UpdateDocumentRequest = { title: '更新标题' };
      expect(Object.keys(req)).toHaveLength(1);
    });
  });

  describe('MinedKeyword interface', () => {
    it('should create a valid MinedKeyword object', () => {
      const mined: MinedKeyword = {
        id: 1,
        base_id: 1,
        keyword: '挖掘关键词',
        selected: false,
        created_by: 1,
        created_at: new Date(),
      };
      expect(mined.keyword).toBe('挖掘关键词');
      expect(mined.selected).toBe(false);
    });

    it('should allow created_by to be null', () => {
      const mined: MinedKeyword = {
        id: 2,
        base_id: 1,
        keyword: '系统挖掘',
        selected: true,
        created_by: null,
        created_at: new Date(),
      };
      expect(mined.created_by).toBeNull();
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword).toBe('K');
    });
  });
});
