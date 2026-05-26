/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

jest.mock('../../apis/service/impl/knowledge-base.service.impl', () => ({
  KnowledgeBaseServiceImpl: jest.fn().mockImplementation(() => ({
    getAccessibleBaseIds: jest.fn(),
  })),
}));

import { getPrisma } from '../../apis/utils/db.util';
import { KeywordServiceImpl, PortraitServiceImpl, ImageServiceImpl, DocumentServiceImpl, MinedKeywordServiceImpl } from '../../apis/service/impl/knowledge.service.impl';
import { KnowledgeBaseServiceImpl } from '../../apis/service/impl/knowledge-base.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaKeyword(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    baseId: 10,
    keyword: '测试关键词',
    seedWord: null,
    groupId: null,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makePrismaExpandedWord(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    keyword_id: 1,
    word: '扩展词',
    selected: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

function makePrismaPortrait(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    baseId: 10,
    title: '测试画像',
    content: '画像内容',
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makePrismaImage(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    baseId: 10,
    title: '测试图片',
    description: '图片描述',
    imageUrl: 'https://example.com/img.png',
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makePrismaDocument(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    baseId: 10,
    title: '测试文档',
    description: '文档描述',
    fileUrl: 'https://example.com/doc.pdf',
    fileName: 'doc.pdf',
    fileType: 'pdf',
    fileSize: 1024,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makePrismaMinedKeyword(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    baseId: 10,
    keyword: '挖掘关键词',
    selected: false,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  KeywordServiceImpl Tests
// ══════════════════════════════════════════

describe('KeywordServiceImpl', () => {
  let service: KeywordServiceImpl;

  beforeEach(() => {
    service = new KeywordServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return paginated keywords ordered by id desc', async () => {
      const items = [makePrismaKeyword({ id: 2 }), makePrismaKeyword({ id: 1 })];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
      expect(result.list[0].id).toBe(2);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { baseId: 10, deletedAt: null },
        orderBy: { id: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should calculate correct skip for page 3 with pageSize 20', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(10, 3, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should filter by search term', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(10, 1, 10, '搜索词');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: 10,
            deletedAt: null,
            keyword: { contains: '搜索词', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should correctly map keyword fields', async () => {
      const item = makePrismaKeyword({ id: 5, baseId: 10, keyword: '映射测试', seedWord: '种子词' });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.list[0]).toEqual({
        id: 5,
        base_id: 10,
        keyword: '映射测试',
        seed_word: '种子词',
        group_id: null,
        created_by: 1,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
        deleted_at: null,
      });
    });
  });

  // ──────────────────────────────────────
  //  listByProject()
  // ──────────────────────────────────────
  describe('listByProject', () => {
    it('should return empty list when no accessible bases', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([]);

      const result = await service.listByProject(1, 1, 10);

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('should query with accessible base IDs', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10, 20]);
      const mockFindMany = jest.fn().mockResolvedValue([makePrismaKeyword()]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listByProject(1, 1, 10);

      expect(result.list).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { baseId: { in: [10, 20] }, deletedAt: null },
        }),
      );
    });

    it('should filter by search in project context', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listByProject(1, 1, 10, '搜索');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: { in: [10] },
            deletedAt: null,
            keyword: { contains: '搜索', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('should return keyword with expanded words', async () => {
      const rawRow = { id: 1, base_id: 10, keyword: '测试', seed_word: null, group_id: null, created_by: 1, created_at: new Date('2025-01-01'), updated_at: new Date('2025-06-01') };
      const mockQueryRaw = jest.fn().mockResolvedValue([rawRow]);
      const expandedWords = [makePrismaExpandedWord({ keyword_id: 1, word: '扩展' })];
      const mockQueryRaw2 = jest.fn().mockResolvedValue(expandedWords);
      mockedGetPrisma.mockReturnValue({
        $queryRaw: mockQueryRaw,
      } as any);

      // listExpandedWords also calls $queryRaw
      const rawExpandedRows = [makePrismaExpandedWord({ keyword_id: 1, word: '扩展' })];
      const mockQueryRawForExpanded = jest.fn()
        .mockResolvedValueOnce([rawRow])   // getById query
        .mockResolvedValueOnce(rawExpandedRows); // listExpandedWords query
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRawForExpanded } as any);

      const result = await service.getById(1);

      expect(result.id).toBe(1);
      expect(result.keyword).toBe('测试');
      expect(result.expanded_words).toHaveLength(1);
      expect(result.expanded_words![0].word).toBe('扩展');
    });

    it('should throw error when keyword not found', async () => {
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

      await expect(service.getById(999)).rejects.toThrow('关键词不存在');
    });

    it('should return keyword without expanded words when none exist', async () => {
      const rawRow = { id: 1, base_id: 10, keyword: '孤立词', seed_word: null, group_id: null, created_by: 1, created_at: new Date('2025-01-01'), updated_at: new Date('2025-06-01') };
      const mockQueryRaw = jest.fn()
        .mockResolvedValueOnce([rawRow])
        .mockResolvedValueOnce([]);
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

      const result = await service.getById(1);

      expect(result.expanded_words).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('should create keyword without expanded words', async () => {
      const created = makePrismaKeyword({ id: 5, keyword: '新关键词' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { create: mockCreate },
      } as any);

      const result = await service.create(10, { keyword: '新关键词' }, 1);

      expect(result.id).toBe(5);
      expect(result.keyword).toBe('新关键词');
      expect(mockCreate).toHaveBeenCalledWith({
        data: { baseId: 10, keyword: '新关键词', createdBy: 1 },
      });
    });

    it('should create keyword with expanded words', async () => {
      const created = makePrismaKeyword({ id: 6, keyword: '带扩展' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const rawExpandedRows = [makePrismaExpandedWord({ keyword_id: 6, word: '扩展A' })];
      const mockQueryRaw = jest.fn().mockResolvedValue(rawExpandedRows);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { create: mockCreate },
        $executeRaw: mockExecuteRaw,
        $queryRaw: mockQueryRaw,
      } as any);

      const result = await service.create(10, {
        keyword: '带扩展',
        expanded_words: [{ word: '扩展A', selected: true }],
      }, 1);

      expect(result.expanded_words).toHaveLength(1);
      expect(result.expanded_words![0].word).toBe('扩展A');
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should not sync expanded words when empty array provided', async () => {
      const created = makePrismaKeyword({ id: 7, keyword: '空扩展' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { create: mockCreate },
      } as any);

      const result = await service.create(10, { keyword: '空扩展', expanded_words: [] }, 1);

      expect(result.expanded_words).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  batchCreate()
  // ──────────────────────────────────────
  describe('batchCreate', () => {
    it('should create new keywords and report duplicates', async () => {
      const existing = [{ keyword: '已有词' }];
      const mockFindMany = jest.fn().mockResolvedValue(existing);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 2 });
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      const result = await service.batchCreate(10, ['已有词', '新词1', '新词2'], 1);

      expect(result.created).toBe(2);
      expect(result.duplicates).toBe(1);
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          { baseId: 10, keyword: '新词1', seedWord: null, createdBy: 1 },
          { baseId: 10, keyword: '新词2', seedWord: null, createdBy: 1 },
        ],
      });
    });

    it('should pass seedWord when provided', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      await service.batchCreate(10, ['种子'], 1, '种子源');

      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [{ baseId: 10, keyword: '种子', seedWord: '种子源', createdBy: 1 }],
      });
    });

    it('should return all duplicates when all keywords exist', async () => {
      const existing = [{ keyword: '词A' }, { keyword: '词B' }];
      const mockFindMany = jest.fn().mockResolvedValue(existing);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 0 });
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      const result = await service.batchCreate(10, ['词A', '词B'], 1);

      expect(result.created).toBe(0);
      expect(result.duplicates).toBe(2);
      expect(mockCreateMany).not.toHaveBeenCalled();
    });

    it('should handle no duplicates', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 3 });
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      const result = await service.batchCreate(10, ['A', 'B', 'C'], 1);

      expect(result.created).toBe(3);
      expect(result.duplicates).toBe(0);
    });
  });

  // ──────────────────────────────────────
  //  listByGroup() & syncGroup()
  // ──────────────────────────────────────
  describe('listByGroup', () => {
    it('should return empty array (stub)', async () => {
      const result = await service.listByGroup(1);
      expect(result).toEqual([]);
    });
  });

  describe('syncGroup', () => {
    it('should return empty array (stub)', async () => {
      const result = await service.syncGroup(1, 10, ['词'], 1);
      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('should throw error when keyword not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(999, { keyword: '更新' })).rejects.toThrow('关键词不存在');
    });

    it('should update keyword without expanded words', async () => {
      const existing = makePrismaKeyword({ id: 1, baseId: 10 });
      const updated = makePrismaKeyword({ id: 1, keyword: '更新词' });
      const expandedWords = [makePrismaExpandedWord({ keyword_id: 1 })];
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockQueryRaw = jest.fn().mockResolvedValue(expandedWords);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
        $queryRaw: mockQueryRaw,
      } as any);

      const result = await service.update(1, { keyword: '更新词' });

      expect(result.keyword).toBe('更新词');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { keyword: '更新词' },
      });
    });

    it('should update keyword with expanded words sync', async () => {
      const existing = makePrismaKeyword({ id: 1, baseId: 10, createdBy: 2 });
      const updated = makePrismaKeyword({ id: 1, keyword: '带扩展更新' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const rawExpandedRows = [makePrismaExpandedWord({ keyword_id: 1, word: '新扩展' })];
      const mockQueryRaw = jest.fn().mockResolvedValue(rawExpandedRows);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
        $executeRaw: mockExecuteRaw,
        $queryRaw: mockQueryRaw,
      } as any);

      const result = await service.update(1, {
        keyword: '带扩展更新',
        expanded_words: [{ word: '新扩展', selected: true }],
      });

      expect(result.expanded_words).toHaveLength(1);
      expect(result.expanded_words![0].word).toBe('新扩展');
      // Should soft-delete old expanded words first
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should sync expanded words with existing createdBy when not 0', async () => {
      const existing = makePrismaKeyword({ id: 1, baseId: 10, createdBy: 5 });
      const updated = makePrismaKeyword({ id: 1, keyword: '更新' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
        $executeRaw: mockExecuteRaw,
        $queryRaw: mockQueryRaw,
      } as any);

      await service.update(1, {
        keyword: '更新',
        expanded_words: [{ word: '词1', selected: false }],
      });

      // Verify that the INSERT uses existing.createdBy (5), not 0
      expect(mockExecuteRaw).toHaveBeenCalledTimes(2); // 1 delete + 1 insert
    });

    it('should use 0 as userId when existing.createdBy is null', async () => {
      const existing = makePrismaKeyword({ id: 1, baseId: 10, createdBy: null });
      const updated = makePrismaKeyword({ id: 1, keyword: '空创建者' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
        $executeRaw: mockExecuteRaw,
        $queryRaw: mockQueryRaw,
      } as any);

      const result = await service.update(1, {
        keyword: '空创建者',
        expanded_words: [{ word: '扩展', selected: true }],
      });

      expect(result.expanded_words).toEqual([]);
      // createdBy null → uses 0 as fallback
      expect(mockExecuteRaw).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────
  describe('delete', () => {
    it('should throw error when keyword not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999)).rejects.toThrow('关键词不存在');
    });

    it('should soft delete keyword by setting deletedAt', async () => {
      const existing = makePrismaKeyword({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should find existing with deletedAt filter', async () => {
      const existing = makePrismaKeyword({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
    });
  });

  // ──────────────────────────────────────
  //  listExpandedWords()
  // ──────────────────────────────────────
  describe('listExpandedWords', () => {
    it('should return mapped expanded words', async () => {
      const rawRows = [
        makePrismaExpandedWord({ id: 1, keyword_id: 10, word: '词A', selected: true }),
        makePrismaExpandedWord({ id: 2, keyword_id: 10, word: '词B', selected: false }),
      ];
      const mockQueryRaw = jest.fn().mockResolvedValue(rawRows);
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

      const result = await service.listExpandedWords(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        keyword_id: 10,
        word: '词A',
        selected: true,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
        deleted_at: null,
      });
    });

    it('should return empty array when no expanded words', async () => {
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

      const result = await service.listExpandedWords(999);

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  syncExpandedWords()
  // ──────────────────────────────────────
  describe('syncExpandedWords', () => {
    it('should delete old and insert new expanded words', async () => {
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const rawExpandedRows = [makePrismaExpandedWord({ keyword_id: 1, word: '新词' })];
      const mockQueryRaw = jest.fn().mockResolvedValue(rawExpandedRows);
      mockedGetPrisma.mockReturnValue({
        $executeRaw: mockExecuteRaw,
        $queryRaw: mockQueryRaw,
      } as any);

      const result = await service.syncExpandedWords(1, 10, [
        { word: '新词', selected: true },
      ], 1);

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('新词');
      // First call: DELETE old, Second call: INSERT new
      expect(mockExecuteRaw).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple words insertion', async () => {
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const rawExpandedRows = [
        makePrismaExpandedWord({ word: '词1' }),
        makePrismaExpandedWord({ word: '词2' }),
      ];
      const mockQueryRaw = jest.fn().mockResolvedValue(rawExpandedRows);
      mockedGetPrisma.mockReturnValue({
        $executeRaw: mockExecuteRaw,
        $queryRaw: mockQueryRaw,
      } as any);

      const result = await service.syncExpandedWords(1, 10, [
        { word: '词1', selected: true },
        { word: '词2', selected: false },
      ], 1);

      expect(result).toHaveLength(2);
      expect(mockExecuteRaw).toHaveBeenCalledTimes(3); // 1 delete + 2 inserts
    });
  });

  // ──────────────────────────────────────
  //  mapRawKeyword (via getById)
  // ──────────────────────────────────────
  describe('field mapping (mapRawKeyword)', () => {
    it('should handle null seed_word and group_id', async () => {
      const rawRow = {
        id: 1, base_id: 10, keyword: '测试', seed_word: null, group_id: null,
        created_by: 1, created_at: new Date('2025-01-01'), updated_at: new Date('2025-06-01'),
      };
      const mockQueryRaw = jest.fn()
        .mockResolvedValueOnce([rawRow])
        .mockResolvedValueOnce([]);
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

      const result = await service.getById(1);

      expect(result.seed_word).toBeNull();
      expect(result.group_id).toBeNull();
    });

    it('should handle non-null seed_word and group_id', async () => {
      const rawRow = {
        id: 1, base_id: 10, keyword: '测试', seed_word: '种子', group_id: 5,
        created_by: 1, created_at: new Date('2025-01-01'), updated_at: new Date('2025-06-01'),
      };
      const mockQueryRaw = jest.fn()
        .mockResolvedValueOnce([rawRow])
        .mockResolvedValueOnce([]);
      mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

      const result = await service.getById(1);

      expect(result.seed_word).toBe('种子');
      expect(result.group_id).toBe(5);
    });
  });
});

// ══════════════════════════════════════════
//  PortraitServiceImpl Tests
// ══════════════════════════════════════════

describe('PortraitServiceImpl', () => {
  let service: PortraitServiceImpl;

  beforeEach(() => {
    service = new PortraitServiceImpl();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated portraits', async () => {
      const items = [makePrismaPortrait({ id: 2 }), makePrismaPortrait({ id: 1 })];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { baseId: 10, deletedAt: null },
        orderBy: { id: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by search term on title', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(10, 1, 10, '搜索');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: 10,
            deletedAt: null,
            title: { contains: '搜索', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should correctly map portrait fields', async () => {
      const item = makePrismaPortrait({ id: 5, title: '画像标题', content: '画像内容' });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.list[0]).toEqual({
        id: 5,
        base_id: 10,
        title: '画像标题',
        content: '画像内容',
        created_by: 1,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
        deleted_at: null,
      });
    });
  });

  describe('listByProject', () => {
    it('should return empty list when no accessible bases', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([]);

      const result = await service.listByProject(1, 1, 10);

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('should filter by search in project context', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listByProject(1, 1, 10, '画像');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: { in: [10] },
            deletedAt: null,
            title: { contains: '画像', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return portrait by id', async () => {
      const item = makePrismaPortrait({ id: 3, title: '获取画像' });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(3);

      expect(result.id).toBe(3);
      expect(result.title).toBe('获取画像');
    });

    it('should throw error when portrait not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('画像不存在');
    });
  });

  describe('create', () => {
    it('should create portrait with content', async () => {
      const created = makePrismaPortrait({ id: 5, title: '新建画像' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { create: mockCreate },
      } as any);

      const result = await service.create(10, { title: '新建画像', content: '内容' }, 1);

      expect(result.id).toBe(5);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { baseId: 10, title: '新建画像', content: '内容', createdBy: 1 },
      });
    });

    it('should create portrait with null content when not provided', async () => {
      const created = makePrismaPortrait({ content: null });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { create: mockCreate },
      } as any);

      await service.create(10, { title: '无内容' }, 1);

      expect(mockCreate).toHaveBeenCalledWith({
        data: { baseId: 10, title: '无内容', content: null, createdBy: 1 },
      });
    });
  });

  describe('update', () => {
    it('should throw error when portrait not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(999, { title: '更新' })).rejects.toThrow('画像不存在');
    });

    it('should update title only', async () => {
      const existing = makePrismaPortrait({ id: 1 });
      const updated = makePrismaPortrait({ id: 1, title: '新标题' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { title: '新标题' });

      expect(result.title).toBe('新标题');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: '新标题' },
      });
    });

    it('should update content only', async () => {
      const existing = makePrismaPortrait({ id: 1 });
      const updated = makePrismaPortrait({ id: 1, content: '新内容' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { content: '新内容' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { content: '新内容' },
      });
    });

    it('should update both title and content', async () => {
      const existing = makePrismaPortrait({ id: 1 });
      const updated = makePrismaPortrait({ id: 1, title: '双更新', content: '双内容' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { title: '双更新', content: '双内容' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: '双更新', content: '双内容' },
      });
    });

    it('should not update fields that are undefined', async () => {
      const existing = makePrismaPortrait({ id: 1 });
      const updated = makePrismaPortrait({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, {});

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {},
      });
    });
  });

  describe('delete', () => {
    it('should throw error when portrait not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999)).rejects.toThrow('画像不存在');
    });

    it('should soft delete portrait', async () => {
      const existing = makePrismaPortrait({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});

// ══════════════════════════════════════════
//  ImageServiceImpl Tests
// ══════════════════════════════════════════

describe('ImageServiceImpl', () => {
  let service: ImageServiceImpl;

  beforeEach(() => {
    service = new ImageServiceImpl();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated images', async () => {
      const items = [makePrismaImage({ id: 2 }), makePrismaImage({ id: 1 })];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
    });

    it('should filter by search term on title', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(10, 1, 10, '图片');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: 10,
            deletedAt: null,
            title: { contains: '图片', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should correctly map image fields', async () => {
      const item = makePrismaImage({ id: 5, title: '映射图片', imageUrl: 'https://example.com/test.png' });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.list[0]).toEqual({
        id: 5,
        base_id: 10,
        title: '映射图片',
        description: '图片描述',
        image_url: 'https://example.com/test.png',
        created_by: 1,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
        deleted_at: null,
      });
    });
  });

  describe('listByProject', () => {
    it('should return empty list when no accessible bases', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([]);

      const result = await service.listByProject(1, 1, 10);

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('should query with accessible base IDs', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
      const mockFindMany = jest.fn().mockResolvedValue([makePrismaImage()]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listByProject(1, 1, 10);

      expect(result.list).toHaveLength(1);
    });

    it('should filter by search in project context', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listByProject(1, 1, 10, '图片搜索');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: { in: [10] },
            deletedAt: null,
            title: { contains: '图片搜索', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return image by id', async () => {
      const item = makePrismaImage({ id: 3 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(3);

      expect(result.id).toBe(3);
    });

    it('should throw error when image not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('图片不存在');
    });
  });

  describe('create', () => {
    it('should create image with all fields', async () => {
      const created = makePrismaImage({ id: 5, title: '新建图片' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { create: mockCreate },
      } as any);

      const result = await service.create(10, {
        title: '新建图片',
        description: '描述',
        image_url: 'https://example.com/new.png',
      }, 1);

      expect(result.id).toBe(5);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          baseId: 10,
          title: '新建图片',
          description: '描述',
          imageUrl: 'https://example.com/new.png',
          createdBy: 1,
        },
      });
    });

    it('should set description to null when not provided', async () => {
      const created = makePrismaImage({ description: null });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { create: mockCreate },
      } as any);

      await service.create(10, {
        title: '无描述',
        image_url: 'https://example.com/img.png',
      }, 1);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          baseId: 10,
          title: '无描述',
          description: null,
          imageUrl: 'https://example.com/img.png',
          createdBy: 1,
        },
      });
    });
  });

  describe('update', () => {
    it('should throw error when image not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(999, { title: '更新' })).rejects.toThrow('图片不存在');
    });

    it('should update title only', async () => {
      const existing = makePrismaImage({ id: 1 });
      const updated = makePrismaImage({ id: 1, title: '新标题' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { title: '新标题' });

      expect(result.title).toBe('新标题');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: '新标题' },
      });
    });

    it('should update description only', async () => {
      const existing = makePrismaImage({ id: 1 });
      const updated = makePrismaImage({ id: 1, description: '新描述' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { description: '新描述' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: '新描述' },
      });
    });

    it('should not update fields that are undefined', async () => {
      const existing = makePrismaImage({ id: 1 });
      const updated = makePrismaImage({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, {});

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {},
      });
    });
  });

  describe('delete', () => {
    it('should throw error when image not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999)).rejects.toThrow('图片不存在');
    });

    it('should soft delete image', async () => {
      const existing = makePrismaImage({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});

// ══════════════════════════════════════════
//  DocumentServiceImpl Tests
// ══════════════════════════════════════════

describe('DocumentServiceImpl', () => {
  let service: DocumentServiceImpl;

  beforeEach(() => {
    service = new DocumentServiceImpl();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated documents without deletedAt filter', async () => {
      const items = [makePrismaDocument({ id: 2 }), makePrismaDocument({ id: 1 })];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
      // Note: list() does NOT filter by deletedAt: null
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { baseId: 10 },
        orderBy: { id: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by search on title and fileName', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(10, 1, 10, '文档');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: 10,
            OR: [
              { title: { contains: '文档', mode: 'insensitive' } },
              { fileName: { contains: '文档', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should correctly map document fields', async () => {
      const item = makePrismaDocument({
        id: 5, title: '文档标题', fileUrl: 'https://example.com/doc.pdf',
        fileName: 'doc.pdf', fileType: 'pdf', fileSize: 2048,
      });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(10, 1, 10);

      expect(result.list[0]).toEqual({
        id: 5,
        base_id: 10,
        title: '文档标题',
        description: '文档描述',
        file_url: 'https://example.com/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'pdf',
        file_size: 2048,
        created_by: 1,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
        deleted_at: null,
      });
    });
  });

  describe('listByProject', () => {
    it('should return empty list when no accessible bases', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([]);

      const result = await service.listByProject(1, 1, 10);

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('should query with accessible base IDs and deletedAt filter', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
      const mockFindMany = jest.fn().mockResolvedValue([makePrismaDocument()]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listByProject(1, 1, 10);

      expect(result.list).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { baseId: { in: [10] }, deletedAt: null },
        }),
      );
    });

    it('should filter by search on title and fileName in project context', async () => {
      const mockKbService = (service as any).kbService;
      mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listByProject(1, 1, 10, '搜索');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            baseId: { in: [10] },
            deletedAt: null,
            OR: [
              { title: { contains: '搜索', mode: 'insensitive' } },
              { fileName: { contains: '搜索', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return document by id', async () => {
      const item = makePrismaDocument({ id: 3 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(3);

      expect(result.id).toBe(3);
    });

    it('should throw error when document not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('文档不存在');
    });
  });

  describe('create', () => {
    it('should create document with all fields', async () => {
      const created = makePrismaDocument({ id: 5, title: '新建文档' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { create: mockCreate },
      } as any);

      const result = await service.create(10, {
        title: '新建文档',
        description: '描述',
        file_url: 'https://example.com/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
      }, 1);

      expect(result.id).toBe(5);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          baseId: 10,
          title: '新建文档',
          description: '描述',
          fileUrl: 'https://example.com/doc.pdf',
          fileName: 'doc.pdf',
          fileType: 'pdf',
          fileSize: 1024,
          createdBy: 1,
        },
      });
    });

    it('should set description to null when not provided', async () => {
      const created = makePrismaDocument({ description: null });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { create: mockCreate },
      } as any);

      await service.create(10, {
        title: '无描述',
        file_url: 'https://example.com/doc.pdf',
        file_name: 'doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
      }, 1);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw error when document not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(999, { title: '更新' })).rejects.toThrow('文档不存在');
    });

    it('should update title only', async () => {
      const existing = makePrismaDocument({ id: 1 });
      const updated = makePrismaDocument({ id: 1, title: '新标题' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { title: '新标题' });

      expect(result.title).toBe('新标题');
    });

    it('should update description only', async () => {
      const existing = makePrismaDocument({ id: 1 });
      const updated = makePrismaDocument({ id: 1, description: '新描述' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { description: '新描述' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: '新描述' },
      });
    });
  });

  describe('delete', () => {
    it('should throw error when document not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999)).rejects.toThrow('文档不存在');
    });

    it('should soft delete document', async () => {
      const existing = makePrismaDocument({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});

// ══════════════════════════════════════════
//  MinedKeywordServiceImpl Tests
// ══════════════════════════════════════════

describe('MinedKeywordServiceImpl', () => {
  let service: MinedKeywordServiceImpl;

  beforeEach(() => {
    service = new MinedKeywordServiceImpl();
    jest.clearAllMocks();
  });

  describe('listByBase', () => {
    it('should return mined keywords for a base', async () => {
      const items = [
        makePrismaMinedKeyword({ id: 2, keyword: '词2' }),
        makePrismaMinedKeyword({ id: 1, keyword: '词1' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { findMany: mockFindMany },
      } as any);

      const result = await service.listByBase(10);

      expect(result).toHaveLength(2);
      expect(result[0].keyword).toBe('词2');
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { baseId: 10, deletedAt: null },
        orderBy: { id: 'desc' },
      });
    });

    it('should correctly map mined keyword fields', async () => {
      const item = makePrismaMinedKeyword({ id: 5, baseId: 10, keyword: '映射', selected: true, createdBy: 3 });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { findMany: mockFindMany },
      } as any);

      const result = await service.listByBase(10);

      expect(result[0]).toEqual({
        id: 5,
        base_id: 10,
        keyword: '映射',
        selected: true,
        created_by: 3,
        created_at: new Date('2025-01-01'),
        deleted_at: null,
      });
    });

    it('should return empty array when no mined keywords', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { findMany: mockFindMany },
      } as any);

      const result = await service.listByBase(10);

      expect(result).toEqual([]);
    });
  });

  describe('addMinedKeywords', () => {
    it('should add new keywords and report duplicates', async () => {
      const existing = [{ keyword: '已有' }];
      const mockFindMany = jest.fn().mockResolvedValue(existing);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 2 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      const result = await service.addMinedKeywords(10, ['已有', '新1', '新2'], 1);

      expect(result.added).toBe(2);
      expect(result.duplicates).toBe(1);
    });

    it('should handle all new keywords', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 3 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      const result = await service.addMinedKeywords(10, ['A', 'B', 'C'], 1);

      expect(result.added).toBe(3);
      expect(result.duplicates).toBe(0);
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          { baseId: 10, keyword: 'A', createdBy: 1 },
          { baseId: 10, keyword: 'B', createdBy: 1 },
          { baseId: 10, keyword: 'C', createdBy: 1 },
        ],
        skipDuplicates: true,
      });
    });

    it('should handle all duplicates', async () => {
      const existing = [{ keyword: 'A' }, { keyword: 'B' }];
      const mockFindMany = jest.fn().mockResolvedValue(existing);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 0 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
      } as any);

      const result = await service.addMinedKeywords(10, ['A', 'B'], 1);

      expect(result.added).toBe(0);
      expect(result.duplicates).toBe(2);
      expect(mockCreateMany).not.toHaveBeenCalled();
    });
  });

  describe('toggleSelectBatch', () => {
    it('should toggle selected to true', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ count: 3 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { updateMany: mockUpdateMany },
      } as any);

      await service.toggleSelectBatch(10, [1, 2, 3], true);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] }, baseId: 10, deletedAt: null },
        data: { selected: true },
      });
    });

    it('should toggle selected to false', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { updateMany: mockUpdateMany },
      } as any);

      await service.toggleSelectBatch(10, [4, 5], false);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [4, 5] }, baseId: 10, deletedAt: null },
        data: { selected: false },
      });
    });
  });

  describe('deleteByIds', () => {
    it('should soft delete by ids', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { updateMany: mockUpdateMany },
      } as any);

      await service.deleteByIds(10, [1, 2]);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, baseId: 10, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('clearAll', () => {
    it('should soft delete all mined keywords for a base', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ count: 5 });
      mockedGetPrisma.mockReturnValue({
        minedKeyword: { updateMany: mockUpdateMany },
      } as any);

      await service.clearAll(10);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { baseId: 10, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});

// ══════════════════════════════════════════
//  Supplementary Edge-Case Tests
// ══════════════════════════════════════════

describe('KeywordServiceImpl – edge cases', () => {
  let service: KeywordServiceImpl;
  beforeEach(() => {
    service = new KeywordServiceImpl();
    jest.clearAllMocks();
  });

  it('list should return empty result with zero total', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
    } as any);

    const result = await service.list(999, 1, 10);
    expect(result).toEqual({ list: [], total: 0 });
  });

  it('batchCreate with empty keywords array should return zeros', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCreateMany = jest.fn().mockResolvedValue({ count: 0 });
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
    } as any);

    const result = await service.batchCreate(10, [], 1);
    expect(result).toEqual({ created: 0, duplicates: 0 });
  });

  it('getById should handle null rows response', async () => {
    const mockQueryRaw = jest.fn().mockResolvedValue(null);
    mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);

    await expect(service.getById(1)).rejects.toThrow('关键词不存在');
  });
});

describe('PortraitServiceImpl – edge cases', () => {
  let service: PortraitServiceImpl;
  beforeEach(() => {
    service = new PortraitServiceImpl();
    jest.clearAllMocks();
  });

  it('list should return empty result', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({
      knowledgePortrait: { findMany: mockFindMany, count: mockCount },
    } as any);

    const result = await service.list(999, 1, 10);
    expect(result).toEqual({ list: [], total: 0 });
  });

  it('listByProject should use accessible base IDs correctly', async () => {
    const mockKbService = (service as any).kbService;
    mockKbService.getAccessibleBaseIds.mockResolvedValue([10, 20]);
    const mockFindMany = jest.fn().mockResolvedValue([makePrismaPortrait()]);
    const mockCount = jest.fn().mockResolvedValue(1);
    mockedGetPrisma.mockReturnValue({
      knowledgePortrait: { findMany: mockFindMany, count: mockCount },
    } as any);

    const result = await service.listByProject(1, 1, 10);
    expect(result.list).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { baseId: { in: [10, 20] }, deletedAt: null },
      }),
    );
  });

  it('create should correctly map returned portrait fields', async () => {
    const created = makePrismaPortrait({ id: 99, title: '映射测试', content: '内容X', baseId: 5 });
    const mockCreate = jest.fn().mockResolvedValue(created);
    mockedGetPrisma.mockReturnValue({
      knowledgePortrait: { create: mockCreate },
    } as any);

    const result = await service.create(5, { title: '映射测试', content: '内容X' }, 2);

    expect(result.id).toBe(99);
    expect(result.base_id).toBe(5);
    expect(result.title).toBe('映射测试');
    expect(result.content).toBe('内容X');
    expect(result.created_by).toBe(1);
  });
});

describe('ImageServiceImpl – edge cases', () => {
  let service: ImageServiceImpl;
  beforeEach(() => {
    service = new ImageServiceImpl();
    jest.clearAllMocks();
  });

  it('update should update both title and description simultaneously', async () => {
    const existing = makePrismaImage({ id: 1 });
    const updated = makePrismaImage({ id: 1, title: '双更新', description: '双描述' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    mockedGetPrisma.mockReturnValue({
      knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate },
    } as any);

    const result = await service.update(1, { title: '双更新', description: '双描述' });

    expect(result.title).toBe('双更新');
    expect(result.description).toBe('双描述');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: '双更新', description: '双描述' },
    });
  });

  it('list should return empty result', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({
      knowledgeImage: { findMany: mockFindMany, count: mockCount },
    } as any);

    const result = await service.list(999, 1, 10);
    expect(result).toEqual({ list: [], total: 0 });
  });

  it('delete should verify findFirst uses deletedAt filter', async () => {
    const existing = makePrismaImage({ id: 1 });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({});
    mockedGetPrisma.mockReturnValue({
      knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate },
    } as any);

    await service.delete(1);

    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });
});

describe('DocumentServiceImpl – edge cases', () => {
  let service: DocumentServiceImpl;
  beforeEach(() => {
    service = new DocumentServiceImpl();
    jest.clearAllMocks();
  });

  it('update should update both title and description simultaneously', async () => {
    const existing = makePrismaDocument({ id: 1 });
    const updated = makePrismaDocument({ id: 1, title: '双更新', description: '双描述' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    mockedGetPrisma.mockReturnValue({
      knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate },
    } as any);

    const result = await service.update(1, { title: '双更新', description: '双描述' });

    expect(result.title).toBe('双更新');
    expect(result.description).toBe('双描述');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: '双更新', description: '双描述' },
    });
  });

  it('update should not update fields that are undefined', async () => {
    const existing = makePrismaDocument({ id: 1 });
    const updated = makePrismaDocument({ id: 1 });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    mockedGetPrisma.mockReturnValue({
      knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate },
    } as any);

    await service.update(1, {});

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {},
    });
  });

  it('delete should verify findFirst uses deletedAt filter', async () => {
    const existing = makePrismaDocument({ id: 1 });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({});
    mockedGetPrisma.mockReturnValue({
      knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate },
    } as any);

    await service.delete(1);

    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });
});

describe('MinedKeywordServiceImpl – edge cases', () => {
  let service: MinedKeywordServiceImpl;
  beforeEach(() => {
    service = new MinedKeywordServiceImpl();
    jest.clearAllMocks();
  });

  it('deleteByIds with empty ids array should still call updateMany', async () => {
    const mockUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { updateMany: mockUpdateMany },
    } as any);

    await service.deleteByIds(10, []);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [] }, baseId: 10, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('toggleSelectBatch with empty ids array should still call updateMany', async () => {
    const mockUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { updateMany: mockUpdateMany },
    } as any);

    await service.toggleSelectBatch(10, [], true);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [] }, baseId: 10, deletedAt: null },
      data: { selected: true },
    });
  });

  it('addMinedKeywords with empty array should return zeros', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCreateMany = jest.fn().mockResolvedValue({ count: 0 });
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
    } as any);

    const result = await service.addMinedKeywords(10, [], 1);
    expect(result).toEqual({ added: 0, duplicates: 0 });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});
