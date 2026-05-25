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

  // ============================================================
  // JSON 序列化/反序列化 round-trip
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('KnowledgeKeyword should survive JSON round-trip', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 5, keyword: 'SEO优化', seed_word: 'seo',
        group_id: 10, created_by: 3,
        created_at: new Date('2024-06-15T08:30:00Z'),
        updated_at: new Date('2024-06-16T10:00:00Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.base_id).toBe(5);
      expect(parsed.keyword).toBe('SEO优化');
      expect(parsed.seed_word).toBe('seo');
      expect(parsed.group_id).toBe(10);
      expect(parsed.created_by).toBe(3);
      expect(parsed.created_at).toBe('2024-06-15T08:30:00.000Z');
      expect(parsed.updated_at).toBe('2024-06-16T10:00:00.000Z');
    });

    it('KnowledgeKeyword with expanded_words should survive JSON round-trip', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 1, word: '扩展1', selected: true, created_at: new Date(), updated_at: new Date() },
          { id: 2, keyword_id: 1, word: '扩展2', selected: false, created_at: new Date(), updated_at: new Date() },
        ],
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.expanded_words).toHaveLength(2);
      expect(parsed.expanded_words[0].word).toBe('扩展1');
      expect(parsed.expanded_words[0].selected).toBe(true);
      expect(parsed.expanded_words[1].selected).toBe(false);
    });

    it('KnowledgeKeyword with null fields should preserve null in JSON', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.seed_word).toBeNull();
      expect(parsed.group_id).toBeNull();
      expect(parsed.created_by).toBeNull();
    });

    it('KeywordExpandedWord should survive JSON round-trip', () => {
      const original: KeywordExpandedWord = {
        id: 1, keyword_id: 5, word: '扩展词', selected: true,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.id).toBe(1);
      expect(parsed.keyword_id).toBe(5);
      expect(parsed.word).toBe('扩展词');
      expect(parsed.selected).toBe(true);
    });

    it('KnowledgePortrait should survive JSON round-trip', () => {
      const original: KnowledgePortrait = {
        id: 1, base_id: 2, title: '画像标题', content: '画像内容',
        created_by: 1, created_at: new Date(), updated_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.title).toBe('画像标题');
      expect(parsed.content).toBe('画像内容');
    });

    it('KnowledgePortrait with null content should preserve null in JSON', () => {
      const original: KnowledgePortrait = {
        id: 1, base_id: 1, title: 'T', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.content).toBeNull();
      expect(parsed.created_by).toBeNull();
    });

    it('KnowledgeImage should survive JSON round-trip', () => {
      const original: KnowledgeImage = {
        id: 1, base_id: 3, title: '图片', description: '描述',
        image_url: 'https://cdn.example.com/img.jpg',
        created_by: 2, created_at: new Date(), updated_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.image_url).toBe('https://cdn.example.com/img.jpg');
      expect(parsed.description).toBe('描述');
    });

    it('KnowledgeDocument should survive JSON round-trip', () => {
      const original: KnowledgeDocument = {
        id: 1, base_id: 4, title: '文档', description: null,
        file_url: '/uploads/doc.pdf', file_name: 'doc.pdf',
        file_type: 'application/pdf', file_size: 2048,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.file_name).toBe('doc.pdf');
      expect(parsed.file_size).toBe(2048);
      expect(parsed.file_type).toBe('application/pdf');
      expect(parsed.description).toBeNull();
    });

    it('MinedKeyword should survive JSON round-trip', () => {
      const original: MinedKeyword = {
        id: 1, base_id: 1, keyword: '挖掘词', selected: true,
        created_by: 5, created_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.keyword).toBe('挖掘词');
      expect(parsed.selected).toBe(true);
      expect(parsed.created_by).toBe(5);
    });

    it('MinedKeyword with null created_by should preserve null', () => {
      const original: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: false,
        created_by: null, created_at: new Date(),
      };
      const parsed = JSON.parse(JSON.stringify(original));
      expect(parsed.created_by).toBeNull();
    });

    it('CreateKeywordRequest should survive JSON round-trip', () => {
      const req: CreateKeywordRequest = {
        keyword: '新关键词',
        expanded_words: [{ word: '扩展1', selected: true }],
      };
      const parsed = JSON.parse(JSON.stringify(req));
      expect(parsed.keyword).toBe('新关键词');
      expect(parsed.expanded_words).toHaveLength(1);
    });

    it('CreateDocumentRequest should survive JSON round-trip', () => {
      const req: CreateDocumentRequest = {
        title: '文档', description: '描述',
        file_url: '/uploads/f.pdf', file_name: 'f.pdf',
        file_type: 'application/pdf', file_size: 1024,
      };
      const parsed = JSON.parse(JSON.stringify(req));
      expect(parsed).toEqual(req);
    });

    it('Date fields should serialize to ISO strings', () => {
      const date = new Date('2024-12-25T00:00:00Z');
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: date, updated_at: date,
      };
      const json = JSON.stringify(keyword);
      expect(json).toContain('"2024-12-25T00:00:00.000Z"');
    });
  });

  // ============================================================
  // Object.freeze 不可变性
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen KnowledgeKeyword should reject mutation', () => {
      const keyword: KnowledgeKeyword = Object.freeze({
        id: 1, base_id: 1, keyword: '冻结', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (keyword as Record<string, unknown>).id = 999; }).toThrow();
      expect(keyword.id).toBe(1);
    });

    it('frozen KnowledgeKeyword should reject keyword mutation', () => {
      const keyword: KnowledgeKeyword = Object.freeze({
        id: 1, base_id: 1, keyword: '原始', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (keyword as Record<string, unknown>).keyword = '修改'; }).toThrow();
      expect(keyword.keyword).toBe('原始');
    });

    it('frozen KeywordExpandedWord should reject mutation', () => {
      const word: KeywordExpandedWord = Object.freeze({
        id: 1, keyword_id: 1, word: '冻结词', selected: true,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (word as Record<string, unknown>).word = '修改'; }).toThrow();
      expect(word.word).toBe('冻结词');
    });

    it('frozen KnowledgePortrait should reject mutation', () => {
      const portrait: KnowledgePortrait = Object.freeze({
        id: 1, base_id: 1, title: '冻结画像', content: '内容',
        created_by: 1, created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (portrait as Record<string, unknown>).title = '修改'; }).toThrow();
      expect(portrait.title).toBe('冻结画像');
    });

    it('frozen KnowledgeImage should reject mutation', () => {
      const image: KnowledgeImage = Object.freeze({
        id: 1, base_id: 1, title: '冻结图', description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (image as Record<string, unknown>).image_url = '修改'; }).toThrow();
      expect(image.image_url).toBe('https://example.com/img.jpg');
    });

    it('frozen KnowledgeDocument should reject mutation', () => {
      const doc: KnowledgeDocument = Object.freeze({
        id: 1, base_id: 1, title: '冻结文档', description: null,
        file_url: '/uploads/f.pdf', file_name: 'f.pdf',
        file_type: 'application/pdf', file_size: 100,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (doc as Record<string, unknown>).title = '修改'; }).toThrow();
      expect(doc.title).toBe('冻结文档');
    });

    it('frozen MinedKeyword should reject mutation', () => {
      const mined: MinedKeyword = Object.freeze({
        id: 1, base_id: 1, keyword: '冻结', selected: false,
        created_by: null, created_at: new Date(),
      });
      expect(() => { (mined as Record<string, unknown>).selected = true; }).toThrow();
      expect(mined.selected).toBe(false);
    });

    it('frozen CreateKeywordRequest should reject mutation', () => {
      const req: CreateKeywordRequest = Object.freeze({ keyword: '冻结请求' });
      expect(() => { (req as Record<string, unknown>).keyword = '修改'; }).toThrow();
      expect(req.keyword).toBe('冻结请求');
    });

    it('frozen UpdateDocumentRequest should reject mutation', () => {
      const req: UpdateDocumentRequest = Object.freeze({ title: '冻结更新' });
      expect(() => { (req as Record<string, unknown>).title = '修改'; }).toThrow();
      expect(req.title).toBe('冻结更新');
    });
  });

  // ============================================================
  // 数组/集合操作
  // ============================================================
  describe('collection operations', () => {
    const keywords: KnowledgeKeyword[] = [
      { id: 1, base_id: 10, keyword: 'SEO', seed_word: 'seo', group_id: 1, created_by: 1, created_at: new Date(), updated_at: new Date() },
      { id: 2, base_id: 10, keyword: 'SEM', seed_word: 'sem', group_id: 1, created_by: 1, created_at: new Date(), updated_at: new Date() },
      { id: 3, base_id: 10, keyword: '内容营销', seed_word: null, group_id: 2, created_by: 2, created_at: new Date(), updated_at: new Date() },
      { id: 4, base_id: 20, keyword: '品牌', seed_word: '品牌', group_id: null, created_by: null, created_at: new Date(), updated_at: new Date() },
    ];

    it('should filter keywords by base_id', () => {
      const filtered = keywords.filter(k => k.base_id === 10);
      expect(filtered).toHaveLength(3);
    });

    it('should filter keywords by group_id', () => {
      const filtered = keywords.filter(k => k.group_id === 1);
      expect(filtered).toHaveLength(2);
    });

    it('should filter keywords by created_by', () => {
      const filtered = keywords.filter(k => k.created_by === 1);
      expect(filtered).toHaveLength(2);
    });

    it('should filter keywords with null created_by', () => {
      const filtered = keywords.filter(k => k.created_by === null);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keyword).toBe('品牌');
    });

    it('should map keywords to keyword strings', () => {
      const words = keywords.map(k => k.keyword);
      expect(words).toEqual(['SEO', 'SEM', '内容营销', '品牌']);
    });

    it('should find keyword by id', () => {
      const found = keywords.find(k => k.id === 3);
      expect(found).toBeDefined();
      expect(found!.keyword).toBe('内容营销');
    });

    it('should return undefined for non-existent id', () => {
      const found = keywords.find(k => k.id === 999);
      expect(found).toBeUndefined();
    });

    it('should check every keyword has non-empty keyword field', () => {
      expect(keywords.every(k => k.keyword.length > 0)).toBe(true);
    });

    it('should check some keyword has seed_word', () => {
      expect(keywords.some(k => k.seed_word !== null)).toBe(true);
    });

    it('should reduce keyword lengths', () => {
      const totalLength = keywords.reduce((sum, k) => sum + k.keyword.length, 0);
      expect(totalLength).toBe('SEOSEM内容营销品牌'.length);
    });

    it('should sort keywords by id descending', () => {
      const sorted = [...keywords].sort((a, b) => b.id - a.id);
      expect(sorted[0].id).toBe(4);
      expect(sorted[3].id).toBe(1);
    });

    it('should group keywords by group_id', () => {
      const grouped = new Map<number | null, KnowledgeKeyword[]>();
      keywords.forEach(k => {
        const key = k.group_id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(k);
      });
      expect(grouped.get(1)).toHaveLength(2);
      expect(grouped.get(2)).toHaveLength(1);
      expect(grouped.get(null)).toHaveLength(1);
    });

    it('should operate on expanded_words array', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 1, word: '词A', selected: true, created_at: new Date(), updated_at: new Date() },
          { id: 2, keyword_id: 1, word: '词B', selected: false, created_at: new Date(), updated_at: new Date() },
          { id: 3, keyword_id: 1, word: '词C', selected: true, created_at: new Date(), updated_at: new Date() },
        ],
      };
      const selected = keyword.expanded_words!.filter(w => w.selected);
      expect(selected).toHaveLength(2);
      const words = keyword.expanded_words!.map(w => w.word);
      expect(words).toEqual(['词A', '词B', '词C']);
    });

    it('should operate on portraits collection', () => {
      const portraits: KnowledgePortrait[] = [
        { id: 1, base_id: 10, title: '画像A', content: '内容A', created_by: 1, created_at: new Date(), updated_at: new Date() },
        { id: 2, base_id: 10, title: '画像B', content: null, created_by: null, created_at: new Date(), updated_at: new Date() },
      ];
      const withContent = portraits.filter(p => p.content !== null);
      expect(withContent).toHaveLength(1);
      expect(withContent[0].title).toBe('画像A');
    });

    it('should operate on images collection', () => {
      const images: KnowledgeImage[] = [
        { id: 1, base_id: 10, title: '图1', description: '描述1', image_url: 'url1', created_by: 1, created_at: new Date(), updated_at: new Date() },
        { id: 2, base_id: 10, title: '图2', description: null, image_url: 'url2', created_by: 1, created_at: new Date(), updated_at: new Date() },
        { id: 3, base_id: 20, title: '图3', description: null, image_url: 'url3', created_by: null, created_at: new Date(), updated_at: new Date() },
      ];
      const urls = images.map(i => i.image_url);
      expect(urls).toEqual(['url1', 'url2', 'url3']);
      const base10 = images.filter(i => i.base_id === 10);
      expect(base10).toHaveLength(2);
    });

    it('should operate on documents collection', () => {
      const docs: KnowledgeDocument[] = [
        { id: 1, base_id: 10, title: '文档1', description: null, file_url: '/a.pdf', file_name: 'a.pdf', file_type: 'application/pdf', file_size: 100, created_by: 1, created_at: new Date(), updated_at: new Date() },
        { id: 2, base_id: 10, title: '文档2', description: null, file_url: '/b.docx', file_name: 'b.docx', file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', file_size: 200, created_by: null, created_at: new Date(), updated_at: new Date() },
      ];
      const totalSize = docs.reduce((sum, d) => sum + d.file_size, 0);
      expect(totalSize).toBe(300);
      const pdfOnly = docs.filter(d => d.file_type === 'application/pdf');
      expect(pdfOnly).toHaveLength(1);
    });

    it('should operate on mined keywords collection', () => {
      const mined: MinedKeyword[] = [
        { id: 1, base_id: 10, keyword: '挖掘1', selected: true, created_by: null, created_at: new Date() },
        { id: 2, base_id: 10, keyword: '挖掘2', selected: false, created_by: null, created_at: new Date() },
        { id: 3, base_id: 10, keyword: '挖掘3', selected: true, created_by: 1, created_at: new Date() },
      ];
      const selected = mined.filter(m => m.selected);
      expect(selected).toHaveLength(2);
      const userCreated = mined.filter(m => m.created_by !== null);
      expect(userCreated).toHaveLength(1);
    });
  });

  // ============================================================
  // 类型收窄（nullable 字段条件分支）
  // ============================================================
  describe('type narrowing for nullable fields', () => {
    it('KnowledgeKeyword.seed_word type narrows after null check', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: '种子',
        group_id: 5, created_by: 3,
        created_at: new Date(), updated_at: new Date(),
      };
      if (keyword.seed_word !== null) {
        expect(keyword.seed_word.toUpperCase()).toBe('种子');
        expect(typeof keyword.seed_word).toBe('string');
      }
    });

    it('KnowledgeKeyword.group_id type narrows after null check', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: 10, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (keyword.group_id !== null) {
        expect(keyword.group_id * 2).toBe(20);
      }
    });

    it('KnowledgeKeyword.created_by type narrows after null check', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: 7,
        created_at: new Date(), updated_at: new Date(),
      };
      if (keyword.created_by !== null) {
        expect(keyword.created_by + 1).toBe(8);
      }
    });

    it('KnowledgePortrait.content type narrows after null check', () => {
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: 'T', content: '内容',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      if (portrait.content !== null) {
        expect(portrait.content.length).toBe(2);
      }
    });

    it('KnowledgePortrait.created_by type narrows after null check', () => {
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: 'T', content: null,
        created_by: 5, created_at: new Date(), updated_at: new Date(),
      };
      if (portrait.created_by !== null) {
        expect(portrait.created_by).toBe(5);
      }
    });

    it('KnowledgeImage.description type narrows after null check', () => {
      const image: KnowledgeImage = {
        id: 1, base_id: 1, title: 'T', description: '描述文字',
        image_url: 'url', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (image.description !== null) {
        expect(image.description.includes('描述')).toBe(true);
      }
    });

    it('KnowledgeDocument.description type narrows after null check', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: '文档描述',
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (doc.description !== null) {
        expect(doc.description.length).toBeGreaterThan(0);
      }
    });

    it('KnowledgeDocument.created_by type narrows after null check', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: 10,
        created_at: new Date(), updated_at: new Date(),
      };
      if (doc.created_by !== null) {
        expect(doc.created_by).toBe(10);
      }
    });

    it('MinedKeyword.created_by type narrows after null check', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: true,
        created_by: 3, created_at: new Date(),
      };
      if (mined.created_by !== null) {
        expect(mined.created_by).toBe(3);
      }
    });

    it('should handle nullable field fallback with nullish coalescing', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const seedWord = keyword.seed_word ?? '默认种子';
      const groupId = keyword.group_id ?? 0;
      const createdBy = keyword.created_by ?? 0;
      expect(seedWord).toBe('默认种子');
      expect(groupId).toBe(0);
      expect(createdBy).toBe(0);
    });
  });

  // ============================================================
  // Scope 约束（base_id 一致性）
  // ============================================================
  describe('scope constraints (base_id consistency)', () => {
    const BASE_ID = 42;

    it('all entity types should share the same base_id', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: BASE_ID, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const portrait: KnowledgePortrait = {
        id: 1, base_id: BASE_ID, title: 'T', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const image: KnowledgeImage = {
        id: 1, base_id: BASE_ID, title: 'T', description: null,
        image_url: 'url', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const doc: KnowledgeDocument = {
        id: 1, base_id: BASE_ID, title: 'T', description: null,
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const mined: MinedKeyword = {
        id: 1, base_id: BASE_ID, keyword: 'K', selected: false,
        created_by: null, created_at: new Date(),
      };
      expect(keyword.base_id).toBe(BASE_ID);
      expect(portrait.base_id).toBe(BASE_ID);
      expect(image.base_id).toBe(BASE_ID);
      expect(doc.base_id).toBe(BASE_ID);
      expect(mined.base_id).toBe(BASE_ID);
    });

    it('mixed entities should filter by base_id correctly', () => {
      const entities = [
        { type: 'keyword', base_id: 1 } as const,
        { type: 'keyword', base_id: 2 } as const,
        { type: 'portrait', base_id: 1 } as const,
        { type: 'image', base_id: 1 } as const,
        { type: 'document', base_id: 2 } as const,
      ];
      const base1 = entities.filter(e => e.base_id === 1);
      expect(base1).toHaveLength(3);
      const base2 = entities.filter(e => e.base_id === 2);
      expect(base2).toHaveLength(2);
    });

    it('update should preserve base_id', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: BASE_ID, keyword: '原始', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const updated: KnowledgeKeyword = { ...original, keyword: '更新', updated_at: new Date() };
      expect(updated.base_id).toBe(BASE_ID);
    });

    it('request types should not have base_id (server-assigned)', () => {
      const createReq: CreateKeywordRequest = { keyword: 'K' };
      const updateReq: UpdateKeywordRequest = { keyword: 'K' };
      const createPortrait: CreatePortraitRequest = { title: 'T' };
      const createImage: CreateImageRequest = { title: 'T', image_url: 'url' };
      const createDoc: CreateDocumentRequest = {
        title: 'T', file_url: 'u', file_name: 'f',
        file_type: 't', file_size: 0,
      };
      expect('base_id' in createReq).toBe(false);
      expect('base_id' in updateReq).toBe(false);
      expect('base_id' in createPortrait).toBe(false);
      expect('base_id' in createImage).toBe(false);
      expect('base_id' in createDoc).toBe(false);
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('consecutive update chains', () => {
    it('should apply 3 consecutive keyword updates preserving integrity', () => {
      let keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '初始', seed_word: '种子',
        group_id: 1, created_by: 1,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      // Update 1
      const req1: UpdateKeywordRequest = { keyword: '第一次更新' };
      keyword = { ...keyword, keyword: req1.keyword, updated_at: new Date('2024-02-01') };
      expect(keyword.keyword).toBe('第一次更新');
      expect(keyword.seed_word).toBe('种子');

      // Update 2
      const req2: UpdateKeywordRequest = { keyword: '第二次更新', expanded_words: [{ word: '新扩展', selected: true }] };
      keyword = {
        ...keyword,
        keyword: req2.keyword,
        expanded_words: req2.expanded_words?.map((ew, i) => ({
          id: i + 1, keyword_id: keyword.id, word: ew.word, selected: ew.selected,
          created_at: new Date(), updated_at: new Date(),
        })),
        updated_at: new Date('2024-03-01'),
      };
      expect(keyword.keyword).toBe('第二次更新');
      expect(keyword.expanded_words).toHaveLength(1);

      // Update 3
      keyword = { ...keyword, seed_word: '新种子', updated_at: new Date('2024-04-01') };
      expect(keyword.seed_word).toBe('新种子');
      expect(keyword.keyword).toBe('第二次更新');
      expect(keyword.id).toBe(1);
      expect(keyword.base_id).toBe(1);
    });

    it('should apply 3 consecutive portrait updates', () => {
      let portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: '初始', content: null,
        created_by: 1, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      portrait = { ...portrait, content: '添加内容', updated_at: new Date('2024-02-01') };
      expect(portrait.content).toBe('添加内容');
      expect(portrait.title).toBe('初始');

      portrait = { ...portrait, title: '更新标题', updated_at: new Date('2024-03-01') };
      expect(portrait.title).toBe('更新标题');
      expect(portrait.content).toBe('添加内容');

      portrait = { ...portrait, content: '覆盖内容', updated_at: new Date('2024-04-01') };
      expect(portrait.content).toBe('覆盖内容');
      expect(portrait.title).toBe('更新标题');
    });

    it('should apply 3 consecutive document updates', () => {
      let doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: '文档', description: null,
        file_url: '/uploads/old.pdf', file_name: 'old.pdf',
        file_type: 'application/pdf', file_size: 100,
        created_by: 1, created_at: new Date(), updated_at: new Date(),
      };
      const update1: UpdateDocumentRequest = { title: '更新1' };
      doc = { ...doc, ...update1, updated_at: new Date() };
      expect(doc.title).toBe('更新1');
      expect(doc.file_name).toBe('old.pdf');

      const update2: UpdateDocumentRequest = { description: '添加描述' };
      doc = { ...doc, ...update2, updated_at: new Date() };
      expect(doc.description).toBe('添加描述');
      expect(doc.title).toBe('更新1');

      const update3: UpdateDocumentRequest = { title: '最终标题', description: '最终描述' };
      doc = { ...doc, ...update3, updated_at: new Date() };
      expect(doc.title).toBe('最终标题');
      expect(doc.description).toBe('最终描述');
      expect(doc.file_url).toBe('/uploads/old.pdf');
    });

    it('should handle toggle selected state on MinedKeyword', () => {
      let mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: false,
        created_by: null, created_at: new Date(),
      };
      mined = { ...mined, selected: true };
      expect(mined.selected).toBe(true);
      mined = { ...mined, selected: false };
      expect(mined.selected).toBe(false);
      mined = { ...mined, selected: true };
      expect(mined.selected).toBe(true);
    });

    it('should handle KeywordExpandedWord selected toggles', () => {
      const words: KeywordExpandedWord[] = [
        { id: 1, keyword_id: 1, word: 'A', selected: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, keyword_id: 1, word: 'B', selected: false, created_at: new Date(), updated_at: new Date() },
      ];
      const toggled = words.map(w => ({ ...w, selected: !w.selected }));
      expect(toggled[0].selected).toBe(false);
      expect(toggled[1].selected).toBe(true);
    });
  });

  // ============================================================
  // 高级边界条件
  // ============================================================
  describe('advanced boundary conditions', () => {
    it('should handle emoji in keyword field', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '🚀关键词🎯', seed_word: 'emoji🔑',
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword).toContain('🚀');
      expect(keyword.keyword).toContain('🎯');
      expect(keyword.seed_word).toContain('🔑');
    });

    it('should handle emoji in expanded word', () => {
      const word: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: '扩展🚀词', selected: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(word.word).toContain('🚀');
    });

    it('should handle emoji in portrait title and content', () => {
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: '📊画像标题📋', content: '📝详细内容✨',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.title).toContain('📊');
      expect(portrait.content).toContain('📝');
    });

    it('should handle whitespace-only strings in keyword', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '   ', seed_word: '  ',
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword).toBe('   ');
      expect(keyword.keyword.trim()).toBe('');
      expect(keyword.seed_word).toBe('  ');
    });

    it('should handle whitespace-only title in portrait', () => {
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: '  ', content: ' ',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.title.trim()).toBe('');
    });

    it('should handle unicode characters in various fields', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '日本語テスト', seed_word: '한국어',
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.keyword).toContain('日本語');
      expect(keyword.seed_word).toContain('한국어');
    });

    it('should handle negative file_size (edge case)', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: -1, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.file_size).toBe(-1);
    });

    it('should handle zero id', () => {
      const keyword: KnowledgeKeyword = {
        id: 0, base_id: 0, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.id).toBe(0);
      expect(keyword.base_id).toBe(0);
    });

    it('should handle very large id', () => {
      const keyword: KnowledgeKeyword = {
        id: Number.MAX_SAFE_INTEGER, base_id: Number.MAX_SAFE_INTEGER,
        keyword: 'K', seed_word: null, group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(keyword.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle special URL characters in image_url', () => {
      const image: KnowledgeImage = {
        id: 1, base_id: 1, title: 'T', description: null,
        image_url: 'https://example.com/img.jpg?token=abc123&size=large#section',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(image.image_url).toContain('?token=');
      expect(image.image_url).toContain('&size=');
      expect(image.image_url).toContain('#section');
    });

    it('should handle special characters in file_name', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: '/uploads/报告 2024 (最终版).pdf',
        file_name: '报告 2024 (最终版).pdf',
        file_type: 'application/pdf', file_size: 0,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.file_name).toContain(' ');
      expect(doc.file_name).toContain('(');
      expect(doc.file_name).toContain(')');
    });

    it('should handle very long image_url', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.jpg';
      const image: KnowledgeImage = {
        id: 1, base_id: 1, title: 'T', description: null,
        image_url: longUrl, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(image.image_url.length).toBeGreaterThan(2000);
    });

    it('should handle multiline content in portrait', () => {
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: 'T',
        content: '第一行\n第二行\n第三行\r\n第四行',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.content!.split('\n').length).toBeGreaterThanOrEqual(3);
    });

    it('should handle description with HTML-like content', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T',
        description: '<p>HTML内容</p><script>alert("xss")</script>',
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.description).toContain('<p>');
      expect(doc.description).toContain('<script>');
    });

    it('should handle MinedKeyword with empty string keyword', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: '', selected: false,
        created_by: null, created_at: new Date(),
      };
      expect(mined.keyword).toBe('');
      expect(mined.keyword.length).toBe(0);
    });

    it('should handle CreateKeywordRequest with only whitespace keyword', () => {
      const req: CreateKeywordRequest = { keyword: '  ' };
      expect(req.keyword.trim()).toBe('');
    });
  });

  // ============================================================
  // 结构相等性 / 深拷贝
  // ============================================================
  describe('structural equality and deep copy', () => {
    it('two KnowledgeKeywords with same values should be structurally equal', () => {
      const date = new Date();
      const a: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: date, updated_at: date,
      };
      const b: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: date, updated_at: date,
      };
      expect(a).toEqual(b);
    });

    it('spread copy of KnowledgeKeyword should be structurally equal', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: 's',
        group_id: 5, created_by: 3,
        created_at: new Date(), updated_at: new Date(),
      };
      const copy = { ...original };
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
    });

    it('spread copy of KnowledgeDocument should be structurally equal', () => {
      const original: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: 'd',
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 100, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const copy = { ...original };
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
    });

    it('spread copy of MinedKeyword should be structurally equal', () => {
      const original: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: true,
        created_by: null, created_at: new Date(),
      };
      const copy = { ...original };
      expect(copy).toEqual(original);
    });

    it('spread copy should create shallow copy of expanded_words', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 1, word: 'w', selected: true, created_at: new Date(), updated_at: new Date() },
        ],
      };
      const copy = { ...original };
      expect(copy.expanded_words).toBe(original.expanded_words); // same reference (shallow)
    });

    it('deep copy of expanded_words should be independent', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 1, word: 'w', selected: true, created_at: new Date(), updated_at: new Date() },
        ],
      };
      const deepCopy: KnowledgeKeyword = {
        ...original,
        expanded_words: original.expanded_words!.map(w => ({ ...w })),
      };
      expect(deepCopy.expanded_words).toEqual(original.expanded_words);
      expect(deepCopy.expanded_words).not.toBe(original.expanded_words);
      expect(deepCopy.expanded_words![0]).not.toBe(original.expanded_words![0]);
    });

    it('JSON parse/stringify should create deep copy of KnowledgeKeyword', () => {
      const date = new Date('2024-06-01');
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: 's',
        group_id: 5, created_by: 3,
        created_at: date, updated_at: date,
        expanded_words: [
          { id: 1, keyword_id: 1, word: 'w', selected: true, created_at: date, updated_at: date },
        ],
      };
      const jsonCopy = JSON.parse(JSON.stringify(original));
      expect(jsonCopy.id).toBe(1);
      expect(jsonCopy.keyword).toBe('K');
      expect(jsonCopy.expanded_words[0].word).toBe('w');
      expect(typeof jsonCopy.created_at).toBe('string');
    });
  });

  // ============================================================
  // 解构模式
  // ============================================================
  describe('destructuring patterns', () => {
    it('should destructure KnowledgeKeyword fields', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 5, keyword: '解构测试', seed_word: '种子',
        group_id: 10, created_by: 3,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, base_id, keyword: kw, seed_word, group_id, created_by } = keyword;
      expect(id).toBe(1);
      expect(base_id).toBe(5);
      expect(kw).toBe('解构测试');
      expect(seed_word).toBe('种子');
      expect(group_id).toBe(10);
      expect(created_by).toBe(3);
    });

    it('should destructure KeywordExpandedWord fields', () => {
      const word: KeywordExpandedWord = {
        id: 1, keyword_id: 5, word: '解构词', selected: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, keyword_id, word: w, selected } = word;
      expect(id).toBe(1);
      expect(keyword_id).toBe(5);
      expect(w).toBe('解构词');
      expect(selected).toBe(true);
    });

    it('should destructure KnowledgeDocument with file fields', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: '/uploads/f.pdf', file_name: 'f.pdf',
        file_type: 'application/pdf', file_size: 1024,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const { file_url, file_name, file_type, file_size } = doc;
      expect(file_url).toBe('/uploads/f.pdf');
      expect(file_name).toBe('f.pdf');
      expect(file_type).toBe('application/pdf');
      expect(file_size).toBe(1024);
    });

    it('should destructure MinedKeyword', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: true,
        created_by: null, created_at: new Date(),
      };
      const { id, keyword, selected } = mined;
      expect(id).toBe(1);
      expect(keyword).toBe('K');
      expect(selected).toBe(true);
    });

    it('should destructure CreateKeywordRequest with optional field', () => {
      const req: CreateKeywordRequest = {
        keyword: 'K',
        expanded_words: [{ word: 'w', selected: true }],
      };
      const { keyword, expanded_words } = req;
      expect(keyword).toBe('K');
      expect(expanded_words).toHaveLength(1);
    });

    it('should use rest operator for partial update', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: 'd',
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const { title, description, ...rest } = doc;
      expect(title).toBe('T');
      expect(description).toBe('d');
      expect(rest.id).toBe(1);
      expect(rest.file_name).toBe('f');
    });

    it('should destructure with default value for optional expanded_words', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const { expanded_words = [] } = keyword;
      expect(expanded_words).toEqual([]);
    });
  });

  // ============================================================
  // Object 迭代方法
  // ============================================================
  describe('Object iteration methods', () => {
    it('Object.keys should return all KnowledgeDocument fields', () => {
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: 'T', description: null,
        file_url: 'url', file_name: 'f', file_type: 't',
        file_size: 0, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const keys = Object.keys(doc);
      expect(keys).toContain('id');
      expect(keys).toContain('file_url');
      expect(keys).toContain('file_size');
      expect(keys).toHaveLength(11);
    });

    it('Object.values should return all KnowledgeKeyword values', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 2, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const values = Object.values(keyword);
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain('K');
      expect(values).toContain(null);
      expect(values).toHaveLength(8);
    });

    it('Object.entries should return key-value pairs for KnowledgeImage', () => {
      const image: KnowledgeImage = {
        id: 1, base_id: 1, title: 'T', description: null,
        image_url: 'https://example.com/img.jpg',
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const entries = Object.entries(image);
      expect(entries).toHaveLength(8);
      const titleEntry = entries.find(([k]) => k === 'title');
      expect(titleEntry).toBeDefined();
      expect(titleEntry![1]).toBe('T');
    });

    it('Object.keys on CreateDocumentRequest should have 5 keys without description', () => {
      const req: CreateDocumentRequest = {
        title: 'T', file_url: 'u', file_name: 'f',
        file_type: 't', file_size: 0,
      };
      expect(Object.keys(req)).toEqual(['title', 'file_url', 'file_name', 'file_type', 'file_size']);
    });

    it('Object.keys on UpdateDocumentRequest empty object should be empty array', () => {
      const req: UpdateDocumentRequest = {};
      expect(Object.keys(req)).toEqual([]);
    });

    it('Object.entries on MinedKeyword should have 6 entries', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 1, keyword: 'K', selected: true,
        created_by: null, created_at: new Date(),
      };
      const entries = Object.entries(mined);
      expect(entries).toHaveLength(6);
      const hasNoUpdatedAt = entries.every(([k]) => k !== 'updated_at');
      expect(hasNoUpdatedAt).toBe(true);
    });

    it('should count nullable fields using Object.values', () => {
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const nullCount = Object.values(keyword).filter(v => v === null).length;
      expect(nullCount).toBe(3);
    });

    it('should use Object.assign to merge update request', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '原始', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateKeywordRequest = { keyword: '合并' };
      const merged = Object.assign({}, original, update, { updated_at: new Date() });
      expect(merged.keyword).toBe('合并');
      expect(merged.id).toBe(1);
    });
  });

  // ============================================================
  // 安全注入测试
  // ============================================================
  describe('安全注入测试', () => {
    const baseKeyword: KnowledgeKeyword = {
      id: 1, base_id: 1, keyword: '测试', seed_word: null,
      group_id: null, created_by: null,
      created_at: new Date(), updated_at: new Date(),
    };

    it('should store keyword with script tags as plain text', () => {
      const xss = '<script>alert("xss")</script>';
      const kw: KnowledgeKeyword = { ...baseKeyword, keyword: xss };
      expect(kw.keyword).toBe(xss);
      expect(kw.keyword).toContain('<script>');
    });

    it('should store keyword with SQL injection pattern as plain text', () => {
      const sql = "'; DROP TABLE knowledge_keywords; --";
      const kw: KnowledgeKeyword = { ...baseKeyword, keyword: sql };
      expect(kw.keyword).toBe(sql);
      expect(kw.keyword).toContain('DROP TABLE');
    });

    it('should store seed_word with HTML entities as plain text', () => {
      const html = '&lt;script&gt;&amp;&lt;/script&gt;';
      const kw: KnowledgeKeyword = { ...baseKeyword, seed_word: html };
      expect(kw.seed_word).toBe(html);
    });

    it('should store expanded word with path traversal pattern as plain text', () => {
      const traversal = '../../../etc/passwd';
      const ew: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: traversal, selected: false,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(ew.word).toBe(traversal);
    });

    it('should store image_url with javascript: protocol as plain string', () => {
      const xssUrl = 'javascript:alert(1)';
      const img: KnowledgeImage = {
        id: 1, base_id: 1, title: '图片', description: null,
        image_url: xssUrl, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(img.image_url).toBe(xssUrl);
    });

    it('should store image_url with data: URI as plain string', () => {
      const dataUri = 'data:text/html,<h1>test</h1>';
      const img: KnowledgeImage = {
        id: 1, base_id: 1, title: '图片', description: null,
        image_url: dataUri, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(img.image_url).toBe(dataUri);
    });

    it('should store content with prototype pollution pattern as plain text', () => {
      const pollution = '{"__proto__":{"admin":true}}';
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: '画像', content: pollution,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.content).toBe(pollution);
    });

    it('should store keyword with null bytes safely', () => {
      const nullKeyword = 'keyword\x00injection';
      const kw: KnowledgeKeyword = { ...baseKeyword, keyword: nullKeyword };
      expect(kw.keyword).toContain('\x00');
    });

    it('should store portrait title with null bytes safely', () => {
      const nullTitle = 'title\x00attack';
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: nullTitle, content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.title).toContain('\x00');
    });

    it('should store document file_url with query string injection as plain text', () => {
      const injection = '/files/doc.pdf?redirect=http://evil.com';
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: '文档', description: null,
        file_url: injection, file_name: 'doc.pdf', file_type: 'pdf',
        file_size: 1024, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.file_url).toBe(injection);
    });

    it('should store document description with CRLF injection as plain text', () => {
      const crlf = 'desc\r\nSet-Cookie: evil=true';
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: '文档', description: crlf,
        file_url: '/f.pdf', file_name: 'f.pdf', file_type: 'pdf',
        file_size: 100, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.description).toBe(crlf);
    });

    it('should handle very large unicode in expanded word safely', () => {
      const bigUnicode = '￿'.repeat(1000);
      const ew: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: bigUnicode, selected: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(ew.word.length).toBe(1000);
    });

    it('should handle very large unicode in portrait content safely', () => {
      const bigUnicode = '￿'.repeat(1000);
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: '画像', content: bigUnicode,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.content!.length).toBe(1000);
    });

    it('should store MinedKeyword with XSS pattern as plain text', () => {
      const xss = '<img src=x onerror=alert(1)>';
      const mk: MinedKeyword = {
        id: 1, base_id: 1, keyword: xss, selected: false,
        created_by: null, created_at: new Date(),
      };
      expect(mk.keyword).toBe(xss);
      expect(mk.keyword).toContain('onerror');
    });

    it('should not pollute prototype when parsing JSON with __proto__', () => {
      const json = '{"__proto__":{"polluted":true},"keyword":"test"}';
      const parsed = JSON.parse(json);
      const req: CreateKeywordRequest = { keyword: parsed.keyword };
      expect(req.keyword).toBe('test');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('should safely handle constructor injection in JSON', () => {
      const json = '{"constructor":{"prototype":{"injected":true}}}';
      const parsed = JSON.parse(json);
      expect(parsed.keyword).toBeUndefined();
      expect(({} as Record<string, unknown>).injected).toBeUndefined();
    });
  });

  // ============================================================
  // 高级 JSON 序列化/反序列化
  // ============================================================
  describe('高级 JSON 序列化/反序列化', () => {
    it('should serialize KnowledgeKeyword Date fields as ISO strings', () => {
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T09:00:00Z'),
      };
      const json = JSON.stringify(kw);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(parsed.created_at).toBe('2026-05-24T08:00:00.000Z');
      expect(parsed.updated_at).toBe('2026-05-24T09:00:00.000Z');
    });

    it('should deserialize KnowledgeKeyword with Date reviver', () => {
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: '种子',
        group_id: 1, created_by: 1,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T09:00:00Z'),
      };
      const json = JSON.stringify(kw);
      const parsed = JSON.parse(json);
      const restored: KnowledgeKeyword = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
      };
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.updated_at).toBeInstanceOf(Date);
      expect(restored.id).toBe(kw.id);
      expect(restored.keyword).toBe(kw.keyword);
      expect(restored.seed_word).toBe('种子');
    });

    it('should serialize KnowledgeKeyword with expanded_words correctly', () => {
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T09:00:00Z'),
        expanded_words: [
          { id: 1, keyword_id: 1, word: '扩展1', selected: true,
            created_at: new Date('2026-05-24T10:00:00Z'),
            updated_at: new Date('2026-05-24T10:00:00Z') },
        ],
      };
      const json = JSON.stringify(kw);
      const parsed = JSON.parse(json);
      expect(parsed.expanded_words).toHaveLength(1);
      expect(parsed.expanded_words[0].word).toBe('扩展1');
      expect(typeof parsed.expanded_words[0].created_at).toBe('string');
    });

    it('should deserialize expanded_words with Date reviver', () => {
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: [
          { id: 1, keyword_id: 1, word: '扩展1', selected: true,
            created_at: new Date('2026-05-24T10:00:00Z'),
            updated_at: new Date('2026-05-24T10:00:00Z') },
        ],
      };
      const json = JSON.stringify(kw);
      const parsed = JSON.parse(json);
      const restored: KnowledgeKeyword = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
        expanded_words: parsed.expanded_words?.map((ew: Record<string, unknown>) => ({
          ...ew,
          created_at: new Date(ew.created_at as string),
          updated_at: new Date(ew.updated_at as string),
        })),
      };
      expect(restored.expanded_words![0].created_at).toBeInstanceOf(Date);
      expect(restored.expanded_words![0].updated_at).toBeInstanceOf(Date);
    });

    it('should serialize null fields as null in KnowledgeKeyword JSON', () => {
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(kw);
      const parsed = JSON.parse(json);
      expect(parsed.seed_word).toBeNull();
      expect(parsed.group_id).toBeNull();
      expect(parsed.created_by).toBeNull();
      expect(parsed.expanded_words).toBeUndefined();
    });

    it('should preserve numeric fields through JSON roundtrip for KnowledgeDocument', () => {
      const doc: KnowledgeDocument = {
        id: 42, base_id: 7, title: '文档', description: null,
        file_url: '/f.pdf', file_name: 'f.pdf', file_type: 'pdf',
        file_size: 1048576, created_by: 3,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(doc);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(42);
      expect(parsed.base_id).toBe(7);
      expect(parsed.file_size).toBe(1048576);
      expect(parsed.created_by).toBe(3);
    });

    it('should serialize KnowledgePortrait with null content as null', () => {
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1, title: '画像', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(portrait);
      const parsed = JSON.parse(json);
      expect(parsed.content).toBeNull();
      expect(parsed.created_by).toBeNull();
    });

    it('should serialize KnowledgeImage with null description as null', () => {
      const img: KnowledgeImage = {
        id: 1, base_id: 1, title: '图片', description: null,
        image_url: '/img.png', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(img);
      const parsed = JSON.parse(json);
      expect(parsed.description).toBeNull();
      expect(parsed.created_by).toBeNull();
    });

    it('should serialize MinedKeyword with Date field correctly', () => {
      const mk: MinedKeyword = {
        id: 1, base_id: 1, keyword: '挖掘词', selected: true,
        created_by: 1, created_at: new Date('2026-05-24T12:00:00Z'),
      };
      const json = JSON.stringify(mk);
      const parsed = JSON.parse(json);
      expect(parsed.created_at).toBe('2026-05-24T12:00:00.000Z');
      expect(parsed.selected).toBe(true);
    });

    it('should serialize MinedKeyword with null created_by as null', () => {
      const mk: MinedKeyword = {
        id: 1, base_id: 1, keyword: '挖掘词', selected: false,
        created_by: null, created_at: new Date(),
      };
      const json = JSON.stringify(mk);
      const parsed = JSON.parse(json);
      expect(parsed.created_by).toBeNull();
    });

    it('should handle JSON reviver for all entity Date fields', () => {
      const dateReviver = (_key: string, value: unknown): unknown => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      };
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T09:00:00Z'),
      };
      const json = JSON.stringify(kw);
      const restored = JSON.parse(json, dateReviver) as KnowledgeKeyword;
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.updated_at).toBeInstanceOf(Date);
    });

    it('should use JSON reviver with expanded_words nested Date fields', () => {
      const dateReviver = (_key: string, value: unknown): unknown => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      };
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '测试', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T09:00:00Z'),
        expanded_words: [
          { id: 1, keyword_id: 1, word: '扩展', selected: true,
            created_at: new Date('2026-05-24T10:00:00Z'),
            updated_at: new Date('2026-05-24T11:00:00Z') },
        ],
      };
      const json = JSON.stringify(kw);
      const restored = JSON.parse(json, dateReviver) as KnowledgeKeyword;
      expect(restored.expanded_words![0].created_at).toBeInstanceOf(Date);
      expect(restored.expanded_words![0].updated_at).toBeInstanceOf(Date);
    });

    it('should handle JSON reviver for KnowledgeDocument Date fields', () => {
      const dateReviver = (_key: string, value: unknown): unknown => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      };
      const doc: KnowledgeDocument = {
        id: 1, base_id: 1, title: '文档', description: null,
        file_url: '/f.pdf', file_name: 'f.pdf', file_type: 'pdf',
        file_size: 100, created_by: null,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T09:00:00Z'),
      };
      const json = JSON.stringify(doc);
      const restored = JSON.parse(json, dateReviver) as KnowledgeDocument;
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.updated_at).toBeInstanceOf(Date);
    });

    it('should preserve boolean fields through JSON roundtrip', () => {
      const ew: KeywordExpandedWord = {
        id: 1, keyword_id: 1, word: '词', selected: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(ew);
      const parsed = JSON.parse(json);
      expect(parsed.selected).toBe(true);
      expect(typeof parsed.selected).toBe('boolean');
    });

    it('should handle JSON.stringify for CreateDocumentRequest', () => {
      const req: CreateDocumentRequest = {
        title: '文档', description: '描述',
        file_url: '/f.pdf', file_name: 'f.pdf',
        file_type: 'pdf', file_size: 1024,
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('文档');
      expect(parsed.file_size).toBe(1024);
    });
  });

  // ============================================================
  // 实际使用场景
  // ============================================================
  describe('实际使用场景', () => {
    it('should create KnowledgeKeyword from CreateKeywordRequest with defaults', () => {
      const req: CreateKeywordRequest = {
        keyword: 'AI优化',
        expanded_words: [
          { word: '人工智能优化', selected: true },
          { word: 'AI搜索优化', selected: false },
        ],
      };
      const kw: KnowledgeKeyword = {
        id: 1, base_id: 10,
        keyword: req.keyword,
        seed_word: null, group_id: null, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
        expanded_words: req.expanded_words?.map((ew, i) => ({
          id: i + 1, keyword_id: 1, word: ew.word, selected: ew.selected,
          created_at: new Date(), updated_at: new Date(),
        })),
      };
      expect(kw.keyword).toBe('AI优化');
      expect(kw.expanded_words).toHaveLength(2);
      expect(kw.expanded_words![0].word).toBe('人工智能优化');
      expect(kw.expanded_words![0].selected).toBe(true);
    });

    it('should apply UpdateKeywordRequest to existing KnowledgeKeyword', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '旧关键词', seed_word: '旧种子',
        group_id: 1, created_by: 1,
        created_at: new Date('2026-05-20T00:00:00Z'),
        updated_at: new Date('2026-05-20T00:00:00Z'),
      };
      const update: UpdateKeywordRequest = {
        keyword: '新关键词',
        expanded_words: [{ word: '更新词', selected: true }],
      };
      const result: KnowledgeKeyword = {
        ...original,
        keyword: update.keyword,
        updated_at: new Date(),
      };
      expect(result.keyword).toBe('新关键词');
      expect(result.seed_word).toBe('旧种子');
      expect(result.id).toBe(1);
      expect(result.base_id).toBe(1);
    });

    it('should create KnowledgePortrait from CreatePortraitRequest', () => {
      const req: CreatePortraitRequest = {
        title: '用户画像',
        content: '技术型用户群体',
      };
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 10,
        title: req.title,
        content: req.content ?? null,
        created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.title).toBe('用户画像');
      expect(portrait.content).toBe('技术型用户群体');
    });

    it('should apply UpdatePortraitRequest partial update', () => {
      const original: KnowledgePortrait = {
        id: 1, base_id: 1, title: '旧画像', content: '旧内容',
        created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdatePortraitRequest = { content: '新内容' };
      const result: KnowledgePortrait = {
        ...original, ...update, updated_at: new Date(),
      };
      expect(result.content).toBe('新内容');
      expect(result.title).toBe('旧画像');
    });

    it('should create KnowledgeImage from CreateImageRequest', () => {
      const req: CreateImageRequest = {
        title: '产品图',
        description: '主图展示',
        image_url: '/uploads/product.png',
      };
      const img: KnowledgeImage = {
        id: 1, base_id: 10,
        title: req.title,
        description: req.description ?? null,
        image_url: req.image_url,
        created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(img.title).toBe('产品图');
      expect(img.image_url).toBe('/uploads/product.png');
    });

    it('should apply UpdateImageRequest partial update', () => {
      const original: KnowledgeImage = {
        id: 1, base_id: 1, title: '旧图', description: '旧描述',
        image_url: '/old.png', created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateImageRequest = { title: '新图' };
      const result: KnowledgeImage = {
        ...original, ...update, updated_at: new Date(),
      };
      expect(result.title).toBe('新图');
      expect(result.description).toBe('旧描述');
      expect(result.image_url).toBe('/old.png');
    });

    it('should create KnowledgeDocument from CreateDocumentRequest', () => {
      const req: CreateDocumentRequest = {
        title: '技术文档',
        description: 'API说明',
        file_url: '/files/api-docs.pdf',
        file_name: 'api-docs.pdf',
        file_type: 'pdf',
        file_size: 2048000,
      };
      const doc: KnowledgeDocument = {
        id: 1, base_id: 10,
        title: req.title,
        description: req.description ?? null,
        file_url: req.file_url,
        file_name: req.file_name,
        file_type: req.file_type,
        file_size: req.file_size,
        created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.title).toBe('技术文档');
      expect(doc.file_size).toBe(2048000);
      expect(doc.file_type).toBe('pdf');
    });

    it('should apply UpdateDocumentRequest partial update', () => {
      const original: KnowledgeDocument = {
        id: 1, base_id: 1, title: '旧文档', description: '旧描述',
        file_url: '/old.pdf', file_name: 'old.pdf', file_type: 'pdf',
        file_size: 1000, created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateDocumentRequest = { title: '新文档', description: '新描述' };
      const result: KnowledgeDocument = {
        ...original, ...update, updated_at: new Date(),
      };
      expect(result.title).toBe('新文档');
      expect(result.description).toBe('新描述');
      expect(result.file_url).toBe('/old.pdf');
      expect(result.file_size).toBe(1000);
    });

    it('should handle full keyword lifecycle: create → expand → update → verify', () => {
      // 1. 创建关键词
      const createReq: CreateKeywordRequest = { keyword: 'SEO' };
      const created: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: createReq.keyword,
        seed_word: null, group_id: null, created_by: 1,
        created_at: new Date('2026-05-24T08:00:00Z'),
        updated_at: new Date('2026-05-24T08:00:00Z'),
      };
      expect(created.keyword).toBe('SEO');
      expect(created.expanded_words).toBeUndefined();

      // 2. 添加扩展词
      const withExpanded: KnowledgeKeyword = {
        ...created,
        expanded_words: [
          { id: 1, keyword_id: 1, word: '搜索引擎优化', selected: true,
            created_at: new Date(), updated_at: new Date() },
          { id: 2, keyword_id: 1, word: '网站排名', selected: false,
            created_at: new Date(), updated_at: new Date() },
        ],
        updated_at: new Date('2026-05-24T09:00:00Z'),
      };
      expect(withExpanded.expanded_words).toHaveLength(2);
      expect(withExpanded.base_id).toBe(1);

      // 3. 更新关键词
      const updateReq: UpdateKeywordRequest = { keyword: 'SEO优化' };
      const updated: KnowledgeKeyword = {
        ...withExpanded,
        keyword: updateReq.keyword,
        updated_at: new Date('2026-05-24T10:00:00Z'),
      };
      expect(updated.keyword).toBe('SEO优化');
      expect(updated.expanded_words).toHaveLength(2);
      expect(updated.seed_word).toBeNull();
    });

    it('should handle document upload scenario', () => {
      const uploadReq: CreateDocumentRequest = {
        title: '市场报告',
        file_url: '/uploads/report-2026-q2.docx',
        file_name: 'report-2026-q2.docx',
        file_type: 'docx',
        file_size: 5242880,
        description: '2026年Q2市场分析报告',
      };
      const doc: KnowledgeDocument = {
        id: 1, base_id: 5,
        title: uploadReq.title,
        description: uploadReq.description ?? null,
        file_url: uploadReq.file_url,
        file_name: uploadReq.file_name,
        file_type: uploadReq.file_type,
        file_size: uploadReq.file_size,
        created_by: 2,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(doc.file_name).toBe('report-2026-q2.docx');
      expect(doc.file_size).toBe(5242880);

      // 更新文档描述
      const updateReq: UpdateDocumentRequest = { description: '已更新Q2市场报告' };
      const updated: KnowledgeDocument = {
        ...doc, ...updateReq, updated_at: new Date(),
      };
      expect(updated.description).toBe('已更新Q2市场报告');
      expect(updated.file_name).toBe('report-2026-q2.docx');
    });

    it('should filter mined keywords by selected status', () => {
      const mined: MinedKeyword[] = [
        { id: 1, base_id: 1, keyword: 'AI', selected: true,
          created_by: null, created_at: new Date() },
        { id: 2, base_id: 1, keyword: 'ML', selected: false,
          created_by: null, created_at: new Date() },
        { id: 3, base_id: 1, keyword: 'DL', selected: true,
          created_by: 1, created_at: new Date() },
      ];
      const selected = mined.filter(m => m.selected);
      const unselected = mined.filter(m => !m.selected);
      expect(selected).toHaveLength(2);
      expect(unselected).toHaveLength(1);
      expect(selected.every(m => m.selected)).toBe(true);
    });

    it('should convert MinedKeyword selection to KnowledgeKeyword', () => {
      const mined: MinedKeyword = {
        id: 1, base_id: 5, keyword: '数据挖掘', selected: true,
        created_by: 1, created_at: new Date(),
      };
      const kw: KnowledgeKeyword = {
        id: 10, base_id: mined.base_id,
        keyword: mined.keyword,
        seed_word: null, group_id: null,
        created_by: mined.created_by,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kw.base_id).toBe(mined.base_id);
      expect(kw.keyword).toBe(mined.keyword);
      expect(kw.created_by).toBe(1);
    });

    it('should handle portrait creation without content', () => {
      const req: CreatePortraitRequest = { title: '仅标题画像' };
      const portrait: KnowledgePortrait = {
        id: 1, base_id: 1,
        title: req.title,
        content: req.content ?? null,
        created_by: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(portrait.content).toBeNull();
      expect(portrait.title).toBe('仅标题画像');
    });

    it('should handle keyword grouping by group_id', () => {
      const keywords: KnowledgeKeyword[] = [
        { id: 1, base_id: 1, keyword: 'A', seed_word: null, group_id: 1,
          created_by: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, base_id: 1, keyword: 'B', seed_word: null, group_id: 1,
          created_by: null, created_at: new Date(), updated_at: new Date() },
        { id: 3, base_id: 1, keyword: 'C', seed_word: null, group_id: 2,
          created_by: null, created_at: new Date(), updated_at: new Date() },
        { id: 4, base_id: 1, keyword: 'D', seed_word: null, group_id: null,
          created_by: null, created_at: new Date(), updated_at: new Date() },
      ];
      const grouped = keywords.reduce<Record<number, KnowledgeKeyword[]>>((acc, kw) => {
        const gid = kw.group_id ?? 0;
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(kw);
        return acc;
      }, {});
      expect(grouped[1]).toHaveLength(2);
      expect(grouped[2]).toHaveLength(1);
      expect(grouped[0]).toHaveLength(1);
    });

    it('should handle expanded words selection toggle scenario', () => {
      const words: KeywordExpandedWord[] = [
        { id: 1, keyword_id: 1, word: '词1', selected: true,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, keyword_id: 1, word: '词2', selected: false,
          created_at: new Date(), updated_at: new Date() },
      ];
      // 全选
      const allSelected = words.map(w => ({ ...w, selected: true }));
      expect(allSelected.every(w => w.selected)).toBe(true);
      // 全取消
      const noneSelected = words.map(w => ({ ...w, selected: false }));
      expect(noneSelected.every(w => !w.selected)).toBe(true);
      // 反选
      const toggled = words.map(w => ({ ...w, selected: !w.selected }));
      expect(toggled[0].selected).toBe(false);
      expect(toggled[1].selected).toBe(true);
    });

    it('should handle multiple entity types coexisting under same base_id', () => {
      const baseId = 42;
      const keyword: KnowledgeKeyword = {
        id: 1, base_id: baseId, keyword: 'K', seed_word: null,
        group_id: null, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const portrait: KnowledgePortrait = {
        id: 1, base_id: baseId, title: 'P', content: null,
        created_by: null, created_at: new Date(), updated_at: new Date(),
      };
      const image: KnowledgeImage = {
        id: 1, base_id: baseId, title: 'I', description: null,
        image_url: '/img.png', created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const doc: KnowledgeDocument = {
        id: 1, base_id: baseId, title: 'D', description: null,
        file_url: '/f.pdf', file_name: 'f.pdf', file_type: 'pdf',
        file_size: 100, created_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const mined: MinedKeyword = {
        id: 1, base_id: baseId, keyword: 'M', selected: true,
        created_by: null, created_at: new Date(),
      };
      const allEntities = [keyword, portrait, image, doc, mined];
      expect(allEntities.every(e => e.base_id === baseId)).toBe(true);
      expect(allEntities).toHaveLength(5);
    });

    it('should handle empty update requests preserving all original fields', () => {
      const original: KnowledgeKeyword = {
        id: 1, base_id: 1, keyword: '原始', seed_word: '种子',
        group_id: 1, created_by: 1,
        created_at: new Date('2026-05-24T00:00:00Z'),
        updated_at: new Date('2026-05-24T00:00:00Z'),
      };
      const emptyUpdate: UpdateKeywordRequest = {};
      const result: KnowledgeKeyword = {
        ...original, ...emptyUpdate, updated_at: new Date(),
      };
      expect(result.keyword).toBe('原始');
      expect(result.seed_word).toBe('种子');
      expect(result.id).toBe(1);
    });

    it('should handle batch keyword creation from mined keywords', () => {
      const mined: MinedKeyword[] = [
        { id: 1, base_id: 5, keyword: '关键词A', selected: true,
          created_by: null, created_at: new Date() },
        { id: 2, base_id: 5, keyword: '关键词B', selected: true,
          created_by: 1, created_at: new Date() },
        { id: 3, base_id: 5, keyword: '关键词C', selected: false,
          created_by: null, created_at: new Date() },
      ];
      const keywords: KnowledgeKeyword[] = mined
        .filter(m => m.selected)
        .map((m, i) => ({
          id: i + 100, base_id: m.base_id, keyword: m.keyword,
          seed_word: null, group_id: null, created_by: m.created_by,
          created_at: new Date(), updated_at: new Date(),
        }));
      expect(keywords).toHaveLength(2);
      expect(keywords[0].keyword).toBe('关键词A');
      expect(keywords[1].keyword).toBe('关键词B');
    });
  });
});
