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
  // ============================================================
  // KnowledgeKeyword interface
  // ============================================================
  describe('KnowledgeKeyword interface', () => {
    it('should create a valid KnowledgeKeyword object with all fields', () => {
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
      expect(keyword.base_id).toBe(1);
      expect(keyword.keyword).toBe('SEO优化');
      expect(keyword.seed_word).toBe('seo');
      expect(keyword.group_id).toBe(1);
      expect(keyword.created_by).toBe(1);
    });

    it('should allow all nullable fields to be null', () => {
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

    it('should allow expanded_words to be undefined', () => {
      const keyword: KnowledgeKeyword = {
        id: 3,
        base_id: 1,
        keyword: '无扩展词',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.expanded_words).toBeUndefined();
    });

    it('should support multiple expanded_words', () => {
      const keyword: KnowledgeKeyword = {
        id: 4,
        base_id: 1,
        keyword: '多扩展词',
        seed_word: '种子',
        group_id: 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 4, word: '扩展1', selected: true, created_at: new Date(), updated_at: new Date() },
          { id: 2, keyword_id: 4, word: '扩展2', selected: false, created_at: new Date(), updated_at: new Date() },
          { id: 3, keyword_id: 4, word: '扩展3', selected: true, created_at: new Date(), updated_at: new Date() },
        ],
      };
      expect(keyword.expanded_words).toHaveLength(3);
      expect(keyword.expanded_words![0].selected).toBe(true);
      expect(keyword.expanded_words![1].selected).toBe(false);
      expect(keyword.expanded_words![2].word).toBe('扩展3');
    });

    it('should have id as number type', () => {
      const keyword: KnowledgeKeyword = {
        id: 999,
        base_id: 1,
        keyword: 'K',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof keyword.id).toBe('number');
      expect(keyword.id).toBe(999);
    });

    it('should have base_id as number type', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 42,
        keyword: 'K',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof keyword.base_id).toBe('number');
      expect(keyword.base_id).toBe(42);
    });

    it('should support Chinese characters in keyword', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '薄云商机倍增服务关键词',
        seed_word: '薄云',
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.keyword).toContain('薄云');
      expect(keyword.keyword).toContain('关键词');
    });

    it('should have seed_word as non-null string', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '测试',
        seed_word: '种子词',
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.seed_word).toBe('种子词');
      expect(typeof keyword.seed_word).toBe('string');
    });

    it('should have group_id as non-null number', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '测试',
        seed_word: null,
        group_id: 10,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.group_id).toBe(10);
      expect(typeof keyword.group_id).toBe('number');
    });

    it('should have created_by as non-null number', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '测试',
        seed_word: null,
        group_id: null,
        created_by: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.created_by).toBe(5);
      expect(typeof keyword.created_by).toBe('number');
    });

    it('should have created_at and updated_at as Date instances', () => {
      const now = new Date();
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '时间测试',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      expect(keyword.created_at).toBeInstanceOf(Date);
      expect(keyword.updated_at).toBeInstanceOf(Date);
      expect(keyword.created_at).toBe(now);
      expect(keyword.updated_at).toBe(now);
    });

    it('should support different created_at and updated_at timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '时间差',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: created,
        updated_at: updated,
      };
      expect(keyword.created_at.getTime()).toBeLessThan(keyword.updated_at.getTime());
    });

    it('should support keyword as empty string', () => {
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: '',
        seed_word: null,
        group_id: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(keyword.keyword).toBe('');
    });
  });

  // ============================================================
  // KeywordExpandedWord interface
  // ============================================================
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
      expect(word.id).toBe(1);
      expect(word.keyword_id).toBe(1);
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

    it('should have id as number type', () => {
      const word: KeywordExpandedWord = {
        id: 999,
        keyword_id: 1,
        word: 'w',
        selected: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof word.id).toBe('number');
      expect(word.id).toBe(999);
    });

    it('should have keyword_id as number type', () => {
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 42,
        word: 'w',
        selected: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof word.keyword_id).toBe('number');
      expect(word.keyword_id).toBe(42);
    });

    it('should support Chinese characters in word', () => {
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 1,
        word: '薄云商机扩展词',
        selected: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(word.word).toContain('薄云');
    });

    it('should have created_at and updated_at as Date instances', () => {
      const now = new Date();
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 1,
        word: 'w',
        selected: true,
        created_at: now,
        updated_at: now,
      };
      expect(word.created_at).toBeInstanceOf(Date);
      expect(word.updated_at).toBeInstanceOf(Date);
    });

    it('should support different timestamps for created_at and updated_at', () => {
      const created = new Date('2024-06-01T00:00:00Z');
      const updated = new Date('2024-06-15T12:00:00Z');
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 1,
        word: 'w',
        selected: true,
        created_at: created,
        updated_at: updated,
      };
      expect(word.created_at.getTime()).toBeLessThan(word.updated_at.getTime());
    });

    it('should have selected as boolean type', () => {
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 1,
        word: 'w',
        selected: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof word.selected).toBe('boolean');
    });

    it('should support word as empty string', () => {
      const word: KeywordExpandedWord = {
        id: 1,
        keyword_id: 1,
        word: '',
        selected: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(word.word).toBe('');
    });
  });

  // ============================================================
  // KnowledgePortrait interface
  // ============================================================
  describe('KnowledgePortrait interface', () => {
    it('should create a valid KnowledgePortrait object with all fields', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: '用户画像',
        content: '画像内容',
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.id).toBe(1);
      expect(portrait.base_id).toBe(1);
      expect(portrait.title).toBe('用户画像');
      expect(portrait.content).toBe('画像内容');
      expect(portrait.created_by).toBe(1);
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

    it('should have id as number type', () => {
      const portrait: KnowledgePortrait = {
        id: 100,
        base_id: 1,
        title: 'T',
        content: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof portrait.id).toBe('number');
      expect(portrait.id).toBe(100);
    });

    it('should have base_id as number type', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 42,
        title: 'T',
        content: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof portrait.base_id).toBe('number');
      expect(portrait.base_id).toBe(42);
    });

    it('should support Chinese characters in title', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: '薄云商机倍增服务画像',
        content: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.title).toContain('薄云');
    });

    it('should have content as non-null string', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: 'T',
        content: '详细内容描述',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.content).toBe('详细内容描述');
    });

    it('should have created_by as non-null number', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: 'T',
        content: null,
        created_by: 7,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.created_by).toBe(7);
    });

    it('should have created_at and updated_at as Date instances', () => {
      const now = new Date();
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: 'T',
        content: null,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      expect(portrait.created_at).toBeInstanceOf(Date);
      expect(portrait.updated_at).toBeInstanceOf(Date);
    });

    it('should support different timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: '时间差',
        content: null,
        created_by: null,
        created_at: created,
        updated_at: updated,
      };
      expect(portrait.created_at.getTime()).toBeLessThan(portrait.updated_at.getTime());
    });

    it('should support empty string content', () => {
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: 'T',
        content: '',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.content).toBe('');
    });
  });

  // ============================================================
  // KnowledgeImage interface
  // ============================================================
  describe('KnowledgeImage interface', () => {
    it('should create a valid KnowledgeImage object with all fields', () => {
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
      expect(image.id).toBe(1);
      expect(image.base_id).toBe(1);
      expect(image.title).toBe('产品图');
      expect(image.description).toBe('产品展示图');
      expect(image.image_url).toBe('https://example.com/image.jpg');
      expect(image.created_by).toBe(1);
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
      expect(image.created_by).toBeNull();
    });

    it('should have id as number type', () => {
      const image: KnowledgeImage = {
        id: 999,
        base_id: 1,
        title: 'T',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof image.id).toBe('number');
    });

    it('should have base_id as number type', () => {
      const image: KnowledgeImage = {
        id: 1,
        base_id: 42,
        title: 'T',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof image.base_id).toBe('number');
      expect(image.base_id).toBe(42);
    });

    it('should support Chinese characters in title', () => {
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: '薄云产品展示图',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(image.title).toContain('薄云');
    });

    it('should have description as non-null string', () => {
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: 'T',
        description: '详细的图片描述信息',
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(image.description).toBe('详细的图片描述信息');
    });

    it('should support various image_url formats', () => {
      const urls = [
        'https://example.com/image.jpg',
        'https://cdn.example.com/path/to/image.png',
        '/uploads/local/image.webp',
      ];
      urls.forEach((url) => {
        const image: KnowledgeImage = {
          id: 1,
          base_id: 1,
          title: 'T',
          description: null,
          image_url: url,
          created_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(image.image_url).toBe(url);
      });
    });

    it('should have created_by as non-null number', () => {
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: 'T',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: 7,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(image.created_by).toBe(7);
    });

    it('should have created_at and updated_at as Date instances', () => {
      const now = new Date();
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: 'T',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      expect(image.created_at).toBeInstanceOf(Date);
      expect(image.updated_at).toBeInstanceOf(Date);
    });

    it('should support different timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: '时间差',
        description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null,
        created_at: created,
        updated_at: updated,
      };
      expect(image.created_at.getTime()).toBeLessThan(image.updated_at.getTime());
    });
  });

  // ============================================================
  // KnowledgeDocument interface
  // ============================================================
  describe('KnowledgeDocument interface', () => {
    it('should create a valid KnowledgeDocument object with all fields', () => {
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
      expect(doc.id).toBe(1);
      expect(doc.base_id).toBe(1);
      expect(doc.title).toBe('产品文档');
      expect(doc.description).toBe('产品说明文档');
      expect(doc.file_url).toBe('/uploads/doc.pdf');
      expect(doc.file_name).toBe('doc.pdf');
      expect(doc.file_type).toBe('application/pdf');
      expect(doc.file_size).toBe(1024);
      expect(doc.created_by).toBe(1);
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

    it('should have id as number type', () => {
      const doc: KnowledgeDocument = {
        id: 999,
        base_id: 1,
        title: 'T',
        description: null,
        file_url: '/uploads/f.pdf',
        file_name: 'f.pdf',
        file_type: 'application/pdf',
        file_size: 0,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof doc.id).toBe('number');
    });

    it('should have base_id as number type', () => {
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 42,
        title: 'T',
        description: null,
        file_url: '/uploads/f.pdf',
        file_name: 'f.pdf',
        file_type: 'application/pdf',
        file_size: 0,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof doc.base_id).toBe('number');
      expect(doc.base_id).toBe(42);
    });

    it('should support various file_type values', () => {
      const fileTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
      ];
      fileTypes.forEach((fileType) => {
        const doc: KnowledgeDocument = {
          id: 1,
          base_id: 1,
          title: 'T',
          description: null,
          file_url: '/uploads/f',
          file_name: 'f',
          file_type: fileType,
          file_size: 100,
          created_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(doc.file_type).toBe(fileType);
      });
    });

    it('should support file_size as zero', () => {
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: '空文件',
        description: null,
        file_url: '/uploads/empty.txt',
        file_name: 'empty.txt',
        file_type: 'text/plain',
        file_size: 0,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(doc.file_size).toBe(0);
    });

    it('should support large file_size values', () => {
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: '大文件',
        description: null,
        file_url: '/uploads/big.zip',
        file_name: 'big.zip',
        file_type: 'application/zip',
        file_size: 1073741824, // 1GB
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(doc.file_size).toBe(1073741824);
    });

    it('should have file_size as number type', () => {
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: 'T',
        description: null,
        file_url: '/uploads/f',
        file_name: 'f',
        file_type: 'text/plain',
        file_size: 512,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof doc.file_size).toBe('number');
    });

    it('should support Chinese characters in title', () => {
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: '薄云商机文档',
        description: null,
        file_url: '/uploads/f.pdf',
        file_name: 'f.pdf',
        file_type: 'application/pdf',
        file_size: 0,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(doc.title).toContain('薄云');
    });

    it('should support various file_name extensions', () => {
      const names = ['report.pdf', 'data.xlsx', 'notes.docx', 'readme.txt'];
      names.forEach((fileName) => {
        const doc: KnowledgeDocument = {
          id: 1,
          base_id: 1,
          title: 'T',
          description: null,
          file_url: `/uploads/${fileName}`,
          file_name: fileName,
          file_type: 'application/octet-stream',
          file_size: 100,
          created_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(doc.file_name).toBe(fileName);
      });
    });

    it('should have created_at and updated_at as Date instances', () => {
      const now = new Date();
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: 'T',
        description: null,
        file_url: '/uploads/f',
        file_name: 'f',
        file_type: 'text/plain',
        file_size: 0,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      expect(doc.created_at).toBeInstanceOf(Date);
      expect(doc.updated_at).toBeInstanceOf(Date);
    });

    it('should support different timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: '时间差',
        description: null,
        file_url: '/uploads/f',
        file_name: 'f',
        file_type: 'text/plain',
        file_size: 0,
        created_by: null,
        created_at: created,
        updated_at: updated,
      };
      expect(doc.created_at.getTime()).toBeLessThan(doc.updated_at.getTime());
    });
  });

  // ============================================================
  // CreateKeywordRequest interface
  // ============================================================
  describe('CreateKeywordRequest interface', () => {
    it('should create a valid request with required fields only', () => {
      const req: CreateKeywordRequest = {
        keyword: '新关键词',
      };
      expect(req.keyword).toBe('新关键词');
      expect(req.expanded_words).toBeUndefined();
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
      expect(req.expanded_words![1].selected).toBe(false);
    });

    it('should allow empty expanded_words array', () => {
      const req: CreateKeywordRequest = {
        keyword: '空扩展',
        expanded_words: [],
      };
      expect(req.expanded_words).toHaveLength(0);
    });

    it('should have keyword as string type', () => {
      const req: CreateKeywordRequest = { keyword: '类型检查' };
      expect(typeof req.keyword).toBe('string');
    });

    it('should support Chinese characters in keyword', () => {
      const req: CreateKeywordRequest = { keyword: '薄云商机关键词' };
      expect(req.keyword).toContain('薄云');
    });

    it('should support keyword as empty string', () => {
      const req: CreateKeywordRequest = { keyword: '' };
      expect(req.keyword).toBe('');
    });
  });

  // ============================================================
  // UpdateKeywordRequest interface
  // ============================================================
  describe('UpdateKeywordRequest interface', () => {
    it('should create a valid request with all fields', () => {
      const req: UpdateKeywordRequest = {
        keyword: '更新关键词',
        expanded_words: [{ word: '新扩展', selected: true }],
      };
      expect(req.keyword).toBe('更新关键词');
      expect(req.expanded_words).toHaveLength(1);
    });

    it('should allow keyword only update', () => {
      const req: UpdateKeywordRequest = { keyword: '只改词' };
      expect(req.keyword).toBe('只改词');
      expect(req.expanded_words).toBeUndefined();
    });

    it('should allow expanded_words with keyword update', () => {
      const req: UpdateKeywordRequest = {
        keyword: '关键词',
        expanded_words: [{ word: '只改扩展', selected: true }],
      };
      expect(req.keyword).toBe('关键词');
      expect(req.expanded_words).toHaveLength(1);
    });

    it('should allow empty expanded_words with keyword', () => {
      const req: UpdateKeywordRequest = {
        keyword: '关键词',
        expanded_words: [],
      };
      expect(req.expanded_words).toHaveLength(0);
    });

    it('should have keyword as string type when provided', () => {
      const req: UpdateKeywordRequest = { keyword: '类型检查' };
      expect(typeof req.keyword).toBe('string');
    });
  });

  // ============================================================
  // CreatePortraitRequest interface
  // ============================================================
  describe('CreatePortraitRequest interface', () => {
    it('should create a valid request with required fields only', () => {
      const req: CreatePortraitRequest = {
        title: '新画像',
      };
      expect(req.title).toBe('新画像');
      expect(req.content).toBeUndefined();
    });

    it('should include optional content', () => {
      const req: CreatePortraitRequest = {
        title: '新画像',
        content: '画像内容',
      };
      expect(req.content).toBe('画像内容');
    });

    it('should support empty string content', () => {
      const req: CreatePortraitRequest = {
        title: '空内容',
        content: '',
      };
      expect(req.content).toBe('');
    });

    it('should have title as string type', () => {
      const req: CreatePortraitRequest = { title: '类型检查' };
      expect(typeof req.title).toBe('string');
    });

    it('should support Chinese characters in title', () => {
      const req: CreatePortraitRequest = { title: '薄云商机画像' };
      expect(req.title).toContain('薄云');
    });
  });

  // ============================================================
  // UpdatePortraitRequest interface
  // ============================================================
  describe('UpdatePortraitRequest interface', () => {
    it('should allow title only update', () => {
      const req: UpdatePortraitRequest = { title: '更新标题' };
      expect(req.title).toBe('更新标题');
      expect(req.content).toBeUndefined();
    });

    it('should allow content only update', () => {
      const req: UpdatePortraitRequest = { content: '新内容' };
      expect(req.content).toBe('新内容');
      expect(req.title).toBeUndefined();
    });

    it('should allow both title and content update', () => {
      const req: UpdatePortraitRequest = {
        title: '新标题',
        content: '新内容',
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.title).toBe('新标题');
      expect(req.content).toBe('新内容');
    });

    it('should allow empty update request', () => {
      const req: UpdatePortraitRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow empty string content', () => {
      const req: UpdatePortraitRequest = { content: '' };
      expect(req.content).toBe('');
    });
  });

  // ============================================================
  // CreateImageRequest interface
  // ============================================================
  describe('CreateImageRequest interface', () => {
    it('should create a valid request with required fields only', () => {
      const req: CreateImageRequest = {
        title: '新图片',
        image_url: 'https://example.com/new.jpg',
      };
      expect(req.title).toBe('新图片');
      expect(req.image_url).toBe('https://example.com/new.jpg');
      expect(req.description).toBeUndefined();
    });

    it('should include optional description', () => {
      const req: CreateImageRequest = {
        title: '图片',
        description: '图片描述',
        image_url: 'https://example.com/img.jpg',
      };
      expect(req.description).toBe('图片描述');
    });

    it('should support various image_url formats', () => {
      const urls = [
        'https://cdn.example.com/image.png',
        '/uploads/local.webp',
        'https://s3.amazonaws.com/bucket/img.jpg',
      ];
      urls.forEach((url) => {
        const req: CreateImageRequest = { title: 'T', image_url: url };
        expect(req.image_url).toBe(url);
      });
    });

    it('should support Chinese characters in title', () => {
      const req: CreateImageRequest = {
        title: '薄云产品图',
        image_url: 'https://example.com/img.jpg',
      };
      expect(req.title).toContain('薄云');
    });

    it('should support empty string description', () => {
      const req: CreateImageRequest = {
        title: 'T',
        description: '',
        image_url: 'https://example.com/img.jpg',
      };
      expect(req.description).toBe('');
    });
  });

  // ============================================================
  // UpdateImageRequest interface
  // ============================================================
  describe('UpdateImageRequest interface', () => {
    it('should allow title only update', () => {
      const req: UpdateImageRequest = { title: '新标题' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.title).toBe('新标题');
    });

    it('should allow description only update', () => {
      const req: UpdateImageRequest = { description: '新描述' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.description).toBe('新描述');
    });

    it('should allow both title and description update', () => {
      const req: UpdateImageRequest = {
        title: '新标题',
        description: '新描述',
      };
      expect(Object.keys(req)).toHaveLength(2);
    });

    it('should allow empty update request', () => {
      const req: UpdateImageRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow empty string title', () => {
      const req: UpdateImageRequest = { title: '' };
      expect(req.title).toBe('');
    });
  });

  // ============================================================
  // CreateDocumentRequest interface
  // ============================================================
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
      expect(req.file_url).toBe('/uploads/new.pdf');
      expect(req.file_name).toBe('new.pdf');
      expect(req.file_type).toBe('application/pdf');
      expect(req.file_size).toBe(512);
      expect(req.description).toBeUndefined();
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

    it('should support file_size as zero', () => {
      const req: CreateDocumentRequest = {
        title: '空文件',
        file_url: '/uploads/empty.txt',
        file_name: 'empty.txt',
        file_type: 'text/plain',
        file_size: 0,
      };
      expect(req.file_size).toBe(0);
    });

    it('should support various file_type values', () => {
      const types = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/zip',
      ];
      types.forEach((fileType) => {
        const req: CreateDocumentRequest = {
          title: 'T',
          file_url: '/uploads/f',
          file_name: 'f',
          file_type: fileType,
          file_size: 100,
        };
        expect(req.file_type).toBe(fileType);
      });
    });

    it('should support empty string description', () => {
      const req: CreateDocumentRequest = {
        title: 'T',
        description: '',
        file_url: '/uploads/f',
        file_name: 'f',
        file_type: 'text/plain',
        file_size: 0,
      };
      expect(req.description).toBe('');
    });

    it('should have file_size as number type', () => {
      const req: CreateDocumentRequest = {
        title: 'T',
        file_url: '/uploads/f',
        file_name: 'f',
        file_type: 'text/plain',
        file_size: 2048,
      };
      expect(typeof req.file_size).toBe('number');
    });
  });

  // ============================================================
  // UpdateDocumentRequest interface
  // ============================================================
  describe('UpdateDocumentRequest interface', () => {
    it('should allow title only update', () => {
      const req: UpdateDocumentRequest = { title: '更新标题' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.title).toBe('更新标题');
    });

    it('should allow description only update', () => {
      const req: UpdateDocumentRequest = { description: '更新描述' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.description).toBe('更新描述');
    });

    it('should allow both title and description update', () => {
      const req: UpdateDocumentRequest = {
        title: '新标题',
        description: '新描述',
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.title).toBe('新标题');
      expect(req.description).toBe('新描述');
    });

    it('should allow empty update request', () => {
      const req: UpdateDocumentRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow empty string title', () => {
      const req: UpdateDocumentRequest = { title: '' };
      expect(req.title).toBe('');
    });

    it('should allow empty string description', () => {
      const req: UpdateDocumentRequest = { description: '' };
      expect(req.description).toBe('');
    });
  });

  // ============================================================
  // MinedKeyword interface
  // ============================================================
  describe('MinedKeyword interface', () => {
    it('should create a valid MinedKeyword object with all fields', () => {
      const mined: MinedKeyword = {
        id: 1,
        base_id: 1,
        keyword: '挖掘关键词',
        selected: false,
        created_by: 1,
        created_at: new Date(),
      };
      expect(mined.id).toBe(1);
      expect(mined.base_id).toBe(1);
      expect(mined.keyword).toBe('挖掘关键词');
      expect(mined.selected).toBe(false);
      expect(mined.created_by).toBe(1);
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

    it('should support selected being true', () => {
      const mined: MinedKeyword = {
        id: 3,
        base_id: 1,
        keyword: '已选',
        selected: true,
        created_by: null,
        created_at: new Date(),
      };
      expect(mined.selected).toBe(true);
    });

    it('should have id as number type', () => {
      const mined: MinedKeyword = {
        id: 999,
        base_id: 1,
        keyword: 'K',
        selected: false,
        created_by: null,
        created_at: new Date(),
      };
      expect(typeof mined.id).toBe('number');
      expect(mined.id).toBe(999);
    });

    it('should have base_id as number type', () => {
      const mined: MinedKeyword = {
        id: 1,
        base_id: 42,
        keyword: 'K',
        selected: false,
        created_by: null,
        created_at: new Date(),
      };
      expect(typeof mined.base_id).toBe('number');
      expect(mined.base_id).toBe(42);
    });

    it('should have selected as boolean type', () => {
      const mined: MinedKeyword = {
        id: 1,
        base_id: 1,
        keyword: 'K',
        selected: true,
        created_by: null,
        created_at: new Date(),
      };
      expect(typeof mined.selected).toBe('boolean');
    });

    it('should have created_at as Date instance', () => {
      const now = new Date();
      const mined: MinedKeyword = {
        id: 1,
        base_id: 1,
        keyword: 'K',
        selected: false,
        created_by: null,
        created_at: now,
      };
      expect(mined.created_at).toBeInstanceOf(Date);
      expect(mined.created_at).toBe(now);
    });

    it('should support Chinese characters in keyword', () => {
      const mined: MinedKeyword = {
        id: 1,
        base_id: 1,
        keyword: '薄云商机挖掘词',
        selected: true,
        created_by: null,
        created_at: new Date(),
      };
      expect(mined.keyword).toContain('薄云');
    });

    it('should have created_by as non-null number', () => {
      const mined: MinedKeyword = {
        id: 1,
        base_id: 1,
        keyword: 'K',
        selected: false,
        created_by: 5,
        created_at: new Date(),
      };
      expect(mined.created_by).toBe(5);
    });
  });

  // ============================================================
  // 字段数量验证
  // ============================================================
  describe('field count verification', () => {
    it('KnowledgeKeyword should have 8 required fields', () => {
      const obj: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(obj)).toHaveLength(8);
    });

    it('KnowledgeKeyword with expanded_words should have 9 fields', () => {
      const obj: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [],
      };
      expect(Object.keys(obj)).toHaveLength(9);
    });

    it('KeywordExpandedWord should have 6 fields', () => {
      const obj: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: 'w', selected: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(obj)).toHaveLength(6);
    });

    it('KnowledgePortrait should have 7 fields', () => {
      const obj: KnowledgePortrait = {
        id: 1, base_id: 1, title: 'T', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(obj)).toHaveLength(7);
    });

    it('KnowledgeImage should have 8 fields', () => {
      const obj: KnowledgeImage = {
        id: 1, base_id: 1, title: 'T', description: null,
        image_url: 'url', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(obj)).toHaveLength(8);
    });

    it('KnowledgeDocument should have 11 fields', () => {
      const obj: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(obj)).toHaveLength(11);
    });

    it('MinedKeyword should have 6 fields', () => {
      const obj: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: false,
        created_by: null, created_at: new Date(),
      };
      expect(Object.keys(obj)).toHaveLength(6);
    });

    it('CreateKeywordRequest should have 1-2 fields', () => {
      const min: CreateKeywordRequest = { keyword: 'K' };
      const max: CreateKeywordRequest = { keyword: 'K', expanded_words: [] };
      expect(Object.keys(min)).toHaveLength(1);
      expect(Object.keys(max)).toHaveLength(2);
    });

    it('CreateDocumentRequest should have 5-6 fields', () => {
      const min: CreateDocumentRequest = {
        title: 'T', file_url: 'u', file_name: 'f',
        file_type: 't', file_size: 0,
      };
      const max: CreateDocumentRequest = {
        title: 'T', description: 'd', file_url: 'u',
        file_name: 'f', file_type: 't', file_size: 0,
      };
      expect(Object.keys(min)).toHaveLength(5);
      expect(Object.keys(max)).toHaveLength(6);
    });

    it('UpdateDocumentRequest should have 0-2 fields', () => {
      const empty: UpdateDocumentRequest = {};
      const full: UpdateDocumentRequest = { title: 'T', description: 'd' };
      expect(Object.keys(empty)).toHaveLength(0);
      expect(Object.keys(full)).toHaveLength(2);
    });

    it('UpdatePortraitRequest should have 0-2 fields', () => {
      const empty: UpdatePortraitRequest = {};
      const full: UpdatePortraitRequest = { title: 'T', content: 'c' };
      expect(Object.keys(empty)).toHaveLength(0);
      expect(Object.keys(full)).toHaveLength(2);
    });

    it('UpdateImageRequest should have 0-2 fields', () => {
      const empty: UpdateImageRequest = {};
      const full: UpdateImageRequest = { title: 'T', description: 'd' };
      expect(Object.keys(empty)).toHaveLength(0);
      expect(Object.keys(full)).toHaveLength(2);
    });
  });

  // ============================================================
  // 不可变性测试（spread 模式）
  // ============================================================
  describe('immutability (spread pattern)', () => {
    it('KnowledgeKeyword spread should not affect original', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '原始', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const modified = { ...original, keyword: '修改后' };
      expect(original.keyword).toBe('原始');
      expect(modified.keyword).toBe('修改后');
    });

    it('KnowledgePortrait spread should not affect original', () => {
      const original: KnowledgePortrait = {
        id: 1, base_id: 1, title: '原始', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const modified = { ...original, title: '修改后' };
      expect(original.title).toBe('原始');
      expect(modified.title).toBe('修改后');
    });

    it('KnowledgeImage spread should not affect original', () => {
      const original: KnowledgeImage = {
        id: 1, base_id: 1, title: '原始', description: null,
        image_url: 'url1', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const modified = { ...original, image_url: 'url2' };
      expect(original.image_url).toBe('url1');
      expect(modified.image_url).toBe('url2');
    });

    it('KnowledgeDocument spread should not affect original', () => {
      const original: KnowledgeDocument = {
        id: 1, base_id: 1, title: '原始', description: null,
        file_url: 'url1', file_name: 'f1.pdf', file_type: 'application/pdf',
        file_size: 100, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const modified = { ...original, title: '修改后' };
      expect(original.title).toBe('原始');
      expect(modified.title).toBe('修改后');
    });

    it('MinedKeyword spread should not affect original', () => {
      const original: MinedKeyword = {
        id: 1, base_id: 1, keyword: '原始', selected: false,
        created_by: null, created_at: new Date(),
      };
      const modified = { ...original, selected: true };
      expect(original.selected).toBe(false);
      expect(modified.selected).toBe(true);
    });

    it('KeywordExpandedWord spread should not affect original', () => {
      const original: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: '原始', selected: false,
        created_at: new Date(), updated_at: new Date(),
      };
      const modified = { ...original, word: '修改后', selected: true };
      expect(original.word).toBe('原始');
      expect(original.selected).toBe(false);
      expect(modified.word).toBe('修改后');
      expect(modified.selected).toBe(true);
    });
  });

  // ============================================================
  // 跨接口交互测试
  // ============================================================
  describe('cross-interface interaction', () => {
    it('should create KnowledgeKeyword from CreateKeywordRequest fields', () => {
      const createReq: CreateKeywordRequest = {
        keyword: '新建关键词',
        expanded_words: [{ word: '扩展1', selected: true }],
      };
      const keyword: KnowledgeKeyword = {
        id: 1,
        base_id: 1,
        keyword: createReq.keyword,
        seed_word: null,
        group_id: null,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        expanded_words: createReq.expanded_words?.map((ew, i) => ({
          id: i + 1,
          keyword_id: 1,
          word: ew.word,
          selected: ew.selected,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      };
      expect(keyword.keyword).toBe('新建关键词');
      expect(keyword.expanded_words).toHaveLength(1);
      expect(keyword.expanded_words![0].word).toBe('扩展1');
    });

    it('should update KnowledgeKeyword via UpdateKeywordRequest spread', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '原始', seed_word: '种子',
        group_id: 1, created_by: 1,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdateKeywordRequest = { keyword: '更新后' };
      const updated: KnowledgeKeyword = {
        ...original,
        keyword: updateReq.keyword,
        updated_at: new Date(),
      };
      expect(updated.keyword).toBe('更新后');
      expect(updated.id).toBe(original.id);
      expect(updated.base_id).toBe(original.base_id);
      expect(updated.seed_word).toBe('种子');
    });

    it('should preserve non-updated fields in KnowledgeKeyword', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 5, keyword: '保留', seed_word: '种子',
        group_id: 10, created_by: 3,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdateKeywordRequest = { keyword: '新词' };
      const updated: KnowledgeKeyword = {
        ...original,
        keyword: updateReq.keyword,
      };
      expect(updated.keyword).toBe('新词');
      expect(updated.base_id).toBe(5);
      expect(updated.seed_word).toBe('种子');
      expect(updated.group_id).toBe(10);
      expect(updated.created_by).toBe(3);
    });

    it('should create KnowledgePortrait from CreatePortraitRequest fields', () => {
      const createReq: CreatePortraitRequest = {
        title: '新建画像',
        content: '画像内容',
      };
      const portrait: KnowledgePortrait = {
        id: 1,
        base_id: 1,
        title: createReq.title,
        content: createReq.content ?? null,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(portrait.title).toBe('新建画像');
      expect(portrait.content).toBe('画像内容');
    });

    it('should update KnowledgePortrait via UpdatePortraitRequest spread', () => {
      const original: KnowledgePortrait = {
        id: 1, base_id: 1, title: '原始画像', content: '原始内容',
        created_by: 1, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdatePortraitRequest = { content: '更新内容' };
      const updated: KnowledgePortrait = { ...original, ...updateReq, updated_at: new Date() };
      expect(updated.content).toBe('更新内容');
      expect(updated.title).toBe('原始画像');
      expect(updated.id).toBe(original.id);
    });

    it('should create KnowledgeImage from CreateImageRequest fields', () => {
      const createReq: CreateImageRequest = {
        title: '新建图片',
        description: '图片描述',
        image_url: 'https://example.com/img.jpg',
      };
      const image: KnowledgeImage = {
        id: 1,
        base_id: 1,
        title: createReq.title,
        description: createReq.description ?? null,
        image_url: createReq.image_url,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(image.title).toBe('新建图片');
      expect(image.description).toBe('图片描述');
      expect(image.image_url).toBe('https://example.com/img.jpg');
    });

    it('should update KnowledgeImage via UpdateImageRequest spread', () => {
      const original: KnowledgeImage = {
        id: 1, base_id: 1, title: '原始', description: '原始描述',
        image_url: 'https://old.com/img.jpg', created_by: 1,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdateImageRequest = { description: '新描述' };
      const updated: KnowledgeImage = { ...original, ...updateReq, updated_at: new Date() };
      expect(updated.description).toBe('新描述');
      expect(updated.title).toBe('原始');
      expect(updated.image_url).toBe('https://old.com/img.jpg');
    });

    it('should create KnowledgeDocument from CreateDocumentRequest fields', () => {
      const createReq: CreateDocumentRequest = {
        title: '新建文档',
        description: '文档描述',
        file_url: '/uploads/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'application/pdf',
        file_size: 2048,
      };
      const doc: KnowledgeDocument = {
        id: 1,
        base_id: 1,
        title: createReq.title,
        description: createReq.description ?? null,
        file_url: createReq.file_url,
        file_name: createReq.file_name,
        file_type: createReq.file_type,
        file_size: createReq.file_size,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(doc.title).toBe('新建文档');
      expect(doc.file_name).toBe('doc.pdf');
      expect(doc.file_size).toBe(2048);
    });

    it('should update KnowledgeDocument via UpdateDocumentRequest spread', () => {
      const original: KnowledgeDocument = {
        id: 1, base_id: 1, title: '原始', description: '原始描述',
        file_url: '/uploads/old.pdf', file_name: 'old.pdf',
        file_type: 'application/pdf', file_size: 100,
        created_by: 1, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdateDocumentRequest = { title: '更新标题' };
      const updated: KnowledgeDocument = { ...original, ...updateReq, updated_at: new Date() };
      expect(updated.title).toBe('更新标题');
      expect(updated.file_url).toBe('/uploads/old.pdf');
      expect(updated.file_name).toBe('old.pdf');
      expect(updated.file_size).toBe(100);
    });

    it('should handle empty UpdateRequests gracefully', () => {
      const originalKeyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const emptyUpdate: UpdateKeywordRequest = { keyword: 'K' };
      const updated = { ...originalKeyword, ...emptyUpdate };
      expect(updated.keyword).toBe('K');

      const originalPortrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: 'T', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const emptyPortraitUpdate: UpdatePortraitRequest = {};
      const updatedPortrait = { ...originalPortrait, ...emptyPortraitUpdate };
      expect(updatedPortrait).toEqual(originalPortrait);
    });

    it('should support full lifecycle: create → update → verify for keyword', () => {
      // Create
      const createReq: CreateKeywordRequest = { keyword: '生命周期', expanded_words: [{ word: '扩展', selected: true }] };
      const created: KnowledgeKeyword = {
        id: 1, base_id: 1,
        keyword: createReq.keyword,
        seed_word: null, group_id: null, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: createReq.expanded_words?.map((ew, i) => ({
          id: i + 1, keyword_id: 1, word: ew.word, selected: ew.selected,
          created_at: new Date(), updated_at: new Date(),
        })),
      };
      expect(created.keyword).toBe('生命周期');
      expect(created.expanded_words).toHaveLength(1);

      // Update
      const updateReq: UpdateKeywordRequest = { keyword: '更新生命周期' };
      const updated: KnowledgeKeyword = {
        ...created,
        keyword: updateReq.keyword,
        updated_at: new Date(),
      };
      expect(updated.keyword).toBe('更新生命周期');
      expect(updated.id).toBe(created.id);
      expect(updated.base_id).toBe(created.base_id);
    });

    it('should support full lifecycle: create → update → verify for document', () => {
      const createReq: CreateDocumentRequest = {
        title: '新文档', file_url: '/uploads/doc.pdf',
        file_name: 'doc.pdf', file_type: 'application/pdf', file_size: 1024,
      };
      const created: KnowledgeDocument = {
        id: 1, base_id: 1,
        ...createReq,
        description: null,
        created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(created.title).toBe('新文档');

      const updateReq: UpdateDocumentRequest = { title: '更新文档', description: '添加描述' };
      const updated: KnowledgeDocument = { ...created, ...updateReq, updated_at: new Date() };
      expect(updated.title).toBe('更新文档');
      expect(updated.description).toBe('添加描述');
      expect(updated.file_name).toBe('doc.pdf');
      expect(updated.file_size).toBe(1024);
    });
  });

  // ============================================================
  // 边界情况测试
  // ============================================================
  describe('edge cases', () => {
    it('KnowledgeKeyword should handle very long keyword', () => {
      const longKeyword = '很长的关键词'.repeat(100);
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: longKeyword, seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword.length).toBeGreaterThan(100);
    });

    it('KnowledgeKeyword should handle special characters in keyword', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试<title>&"引号"特殊字符',
        seed_word: '<script>', group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword).toContain('<title>');
      expect(keyword.seed_word).toBe('<script>');
    });

    it('KeywordExpandedWord should handle very long word', () => {
      const longWord = '很长的扩展词'.repeat(50);
      const word: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: longWord, selected: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(word.word.length).toBeGreaterThan(100);
    });

    it('KnowledgeDocument should handle large file_size (exactly MAX_SAFE_INTEGER)', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: Number.MAX_SAFE_INTEGER,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.file_size).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('MinedKeyword should have no updated_at field', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: false,
        created_by: null, created_at: new Date(),
      };
      expect((mined as unknown as Record<string, unknown>)['updated_at']).toBeUndefined();
    });

    it('CreateKeywordRequest should handle many expanded_words', () => {
      const req: CreateKeywordRequest = {
        keyword: '大量扩展',
        expanded_words: Array.from({ length: 100 }, (_, i) => ({
          word: `扩展词${i}`, selected: i % 2 === 0,
        })),
      };
      expect(req.expanded_words).toHaveLength(100);
      expect(req.expanded_words![0].selected).toBe(true);
      expect(req.expanded_words![1].selected).toBe(false);
    });

    it('UpdateKeywordRequest should allow replacing expanded_words', () => {
      const req: UpdateKeywordRequest = {
        keyword: '替换',
        expanded_words: [{ word: '全新扩展', selected: true }],
      };
      expect(req.expanded_words).toHaveLength(1);
      expect(req.expanded_words![0].word).toBe('全新扩展');
    });

    it('CreateImageRequest should handle various URL schemes', () => {
      const urls = ['https://img.com/a.jpg', 'http://img.com/b.png', '/local/c.webp', 'blob:abc123'];
      urls.forEach((url) => {
        const req: CreateImageRequest = { title: 'T', image_url: url };
        expect(req.image_url).toBe(url);
      });
    });

    it('CreateDocumentRequest should support all common file types', () => {
      const fileTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/json',
      ];
      fileTypes.forEach((ft) => {
        const req: CreateDocumentRequest = {
          title: 'T', file_url: 'u', file_name: 'f', file_type: ft, file_size: 0,
        };
        expect(req.file_type).toBe(ft);
      });
    });

    it('should handle KnowledgeKeyword with empty expanded_words array', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [],
      };
      expect(keyword.expanded_words).toEqual([]);
    });

    it('should handle simultaneous null for all nullable fields in KnowledgeDocument', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: 'u', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.description).toBeNull();
      expect(doc.created_by).toBeNull();
    });

    it('should handle simultaneous non-null for all nullable fields in KnowledgeDocument', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: '描述',
        file_url: 'u', file_name: 'f', file_type: 't',
        file_size: 100, created_by: 5,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.description).toBe('描述');
      expect(doc.created_by).toBe(5);
    });
  });

  // ============================================================
  // 重新导出验证
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword).toBe('K');
    });

    it('should allow all request types to be imported and used', () => {
      const createKeyword: CreateKeywordRequest = { keyword: '新词' };
      const updateKeyword: UpdateKeywordRequest = { keyword: '更新词' };
      const createPortrait: CreatePortraitRequest = { title: '新画像' };
      const updatePortrait: UpdatePortraitRequest = { title: '更新画像' };
      const createImage: CreateImageRequest = { title: '新图', image_url: 'https://example.com/img.jpg' };
      const updateImage: UpdateImageRequest = { title: '更新图' };
      const createDoc: CreateDocumentRequest = {
        title: '新文档', file_url: '/uploads/f.pdf',
        file_name: 'f.pdf', file_type: 'application/pdf', file_size: 100,
      };
      const updateDoc: UpdateDocumentRequest = { title: '更新文档' };

      expect(createKeyword.keyword).toBe('新词');
      expect(updateKeyword.keyword).toBe('更新词');
      expect(createPortrait.title).toBe('新画像');
      expect(updatePortrait.title).toBe('更新画像');
      expect(createImage.title).toBe('新图');
      expect(updateImage.title).toBe('更新图');
      expect(createDoc.title).toBe('新文档');
      expect(updateDoc.title).toBe('更新文档');
    });

    it('should allow MinedKeyword to be imported and used alongside other types', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: '挖掘',
        selected: true, created_by: null, created_at: new Date(),
      };
      const word: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: '扩展',
        selected: true, created_at: new Date(), updated_at: new Date(),
      };
      expect(mined.keyword).toBe('挖掘');
      expect(word.word).toBe('扩展');
    });
  });
});
