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

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaKeyword(overrides: Record<string, any> = {}) {
  return {
    id: 1, baseId: 10, keyword: '测试关键词', seedWord: null, groupId: null,
    createdBy: 1, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-06-01'), deletedAt: null,
    ...overrides,
  };
}

function makePrismaExpandedWord(overrides: Record<string, any> = {}) {
  return {
    id: 1, keyword_id: 1, word: '扩展词', selected: true,
    created_at: new Date('2025-01-01'), updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

function makePrismaPortrait(overrides: Record<string, any> = {}) {
  return {
    id: 1, baseId: 10, title: '测试画像', content: '画像内容',
    createdBy: 1, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-06-01'), deletedAt: null,
    ...overrides,
  };
}

function makePrismaImage(overrides: Record<string, any> = {}) {
  return {
    id: 1, baseId: 10, title: '测试图片', description: '图片描述',
    imageUrl: 'https://example.com/img.png',
    createdBy: 1, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-06-01'), deletedAt: null,
    ...overrides,
  };
}

function makePrismaDocument(overrides: Record<string, any> = {}) {
  return {
    id: 1, baseId: 10, title: '测试文档', description: '文档描述',
    fileUrl: 'https://example.com/doc.pdf', fileName: 'doc.pdf', fileType: 'pdf', fileSize: 1024,
    createdBy: 1, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-06-01'), deletedAt: null,
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Round 2 – Deep Verification Tests
// ══════════════════════════════════════════

describe('KeywordServiceImpl R2 deep verification', () => {
  let service: KeywordServiceImpl;
  beforeEach(() => { service = new KeywordServiceImpl(); jest.clearAllMocks(); });

  it('list page 2 pageSize 5 should skip first 5', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findMany: mockFindMany, count: mockCount } } as any);
    await service.list(10, 2, 5);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
  });

  it('listByProject should pass correct orderBy/skip/take', async () => {
    const mockKbService = (service as any).kbService;
    mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findMany: mockFindMany, count: mockCount } } as any);
    await service.listByProject(1, 3, 15);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { id: 'desc' }, skip: 30, take: 15,
    }));
  });

  it('getById should call queryRaw twice (select + expanded)', async () => {
    const rawRow = { id: 42, base_id: 10, keyword: 'kw42', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() };
    const mockQueryRaw = jest.fn().mockResolvedValueOnce([rawRow]).mockResolvedValueOnce([]);
    mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);
    await service.getById(42);
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it('create should map returned snake_case fields', async () => {
    const created = makePrismaKeyword({ id: 10, baseId: 5, keyword: 'mapped', seedWord: 'seed', groupId: 3, createdBy: 7 });
    const mockCreate = jest.fn().mockResolvedValue(created);
    mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { create: mockCreate } } as any);
    const result = await service.create(5, { keyword: 'mapped' }, 7);
    expect(result).toEqual({
      id: 10, base_id: 5, keyword: 'mapped', seed_word: 'seed', group_id: 3, created_by: 7,
      created_at: expect.any(Date), updated_at: expect.any(Date),
    });
  });

  it('update with empty expanded_words should trigger sync (DELETE only, 0 INSERT)', async () => {
    const existing = makePrismaKeyword({ id: 1, baseId: 10 });
    const updated = makePrismaKeyword({ id: 1, keyword: 'empty' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const mockQueryRaw = jest.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
      $executeRaw: mockExecuteRaw, $queryRaw: mockQueryRaw,
    } as any);
    const result = await service.update(1, { keyword: 'empty', expanded_words: [] });
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    expect(result.expanded_words).toEqual([]);
  });

  it('update with undefined expanded_words should only list (no executeRaw)', async () => {
    const existing = makePrismaKeyword({ id: 1, baseId: 10 });
    const updated = makePrismaKeyword({ id: 1, keyword: 'nolist' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    const mockQueryRaw = jest.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
      $queryRaw: mockQueryRaw,
    } as any);
    const result = await service.update(1, { keyword: 'nolist' });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(result.expanded_words).toEqual([]);
  });

  it('batchCreate should pass correct where to findMany', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCreateMany = jest.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany } } as any);
    await service.batchCreate(20, ['w'], 5);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { baseId: 20, keyword: { in: ['w'] }, deletedAt: null },
      select: { keyword: true },
    });
  });

  it('syncExpandedWords 3 words should call executeRaw 4 times (1 DELETE + 3 INSERT)', async () => {
    const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const mockQueryRaw = jest.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ $executeRaw: mockExecuteRaw, $queryRaw: mockQueryRaw } as any);
    await service.syncExpandedWords(5, 10, [
      { word: 'A', selected: true }, { word: 'B', selected: false }, { word: 'C', selected: true },
    ], 1);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(4);
  });

  it('delete should pass Date instance as deletedAt', async () => {
    const existing = makePrismaKeyword({ id: 3 });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
    mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate } } as any);
    await service.delete(3);
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe('PortraitServiceImpl R2 deep verification', () => {
  let service: PortraitServiceImpl;
  beforeEach(() => { service = new PortraitServiceImpl(); jest.clearAllMocks(); });

  it('list page 2 pageSize 15 should skip 15', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { findMany: mockFindMany, count: mockCount } } as any);
    await service.list(10, 2, 15);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 15, take: 15 }));
  });

  it('getById should use deletedAt null filter', async () => {
    const item = makePrismaPortrait({ id: 5 });
    const mockFindFirst = jest.fn().mockResolvedValue(item);
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { findFirst: mockFindFirst } } as any);
    await service.getById(5);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 5, deletedAt: null } });
  });

  it('create without content should pass null to Prisma', async () => {
    const created = makePrismaPortrait({ content: null });
    const mockCreate = jest.fn().mockResolvedValue(created);
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { create: mockCreate } } as any);
    await service.create(10, { title: 'no content' }, 1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { baseId: 10, title: 'no content', content: null, createdBy: 1 },
    });
  });

  it('update should find via deletedAt null', async () => {
    const existing = makePrismaPortrait({ id: 1 });
    const updated = makePrismaPortrait({ id: 1, title: 'new' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate } } as any);
    await service.update(1, { title: 'new' });
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });

  it('listByProject page 3 pageSize 10 should skip 20', async () => {
    const mockKbService = (service as any).kbService;
    mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { findMany: mockFindMany, count: mockCount } } as any);
    await service.listByProject(1, 3, 10);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
  });

  it('delete should find via deletedAt null', async () => {
    const existing = makePrismaPortrait({ id: 1 });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({});
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { findFirst: mockFindFirst, update: mockUpdate } } as any);
    await service.delete(1);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });

  it('create should return snake_case fields', async () => {
    const created = makePrismaPortrait({ id: 10, baseId: 5, title: 'T', content: 'C', createdBy: 3 });
    const mockCreate = jest.fn().mockResolvedValue(created);
    mockedGetPrisma.mockReturnValue({ knowledgePortrait: { create: mockCreate } } as any);
    const result = await service.create(5, { title: 'T', content: 'C' }, 3);
    expect(result.base_id).toBe(5);
    expect(result.created_by).toBe(3);
  });
});

describe('ImageServiceImpl R2 deep verification', () => {
  let service: ImageServiceImpl;
  beforeEach(() => { service = new ImageServiceImpl(); jest.clearAllMocks(); });

  it('list page 4 pageSize 5 should skip 15', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeImage: { findMany: mockFindMany, count: mockCount } } as any);
    await service.list(10, 4, 5);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 15, take: 5 }));
  });

  it('getById should use deletedAt null filter', async () => {
    const item = makePrismaImage({ id: 7 });
    const mockFindFirst = jest.fn().mockResolvedValue(item);
    mockedGetPrisma.mockReturnValue({ knowledgeImage: { findFirst: mockFindFirst } } as any);
    await service.getById(7);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 7, deletedAt: null } });
  });

  it('create should map image_url to imageUrl', async () => {
    const created = makePrismaImage({ id: 1 });
    const mockCreate = jest.fn().mockResolvedValue(created);
    mockedGetPrisma.mockReturnValue({ knowledgeImage: { create: mockCreate } } as any);
    await service.create(10, { title: 'img', image_url: 'https://a.com/b.png' }, 1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { baseId: 10, title: 'img', description: null, imageUrl: 'https://a.com/b.png', createdBy: 1 },
    });
  });

  it('update should find via deletedAt null', async () => {
    const existing = makePrismaImage({ id: 1 });
    const updated = makePrismaImage({ id: 1, title: 'new' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    mockedGetPrisma.mockReturnValue({ knowledgeImage: { findFirst: mockFindFirst, update: mockUpdate } } as any);
    await service.update(1, { title: 'new' });
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });

  it('listByProject page 2 pageSize 25 should skip 25', async () => {
    const mockKbService = (service as any).kbService;
    mockKbService.getAccessibleBaseIds.mockResolvedValue([10, 20]);
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeImage: { findMany: mockFindMany, count: mockCount } } as any);
    await service.listByProject(1, 2, 25);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
  });
});

describe('DocumentServiceImpl R2 deep verification', () => {
  let service: DocumentServiceImpl;
  beforeEach(() => { service = new DocumentServiceImpl(); jest.clearAllMocks(); });

  it('list should NOT include deletedAt filter', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeDocument: { findMany: mockFindMany, count: mockCount } } as any);
    await service.list(10, 1, 10);
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where).toEqual({ baseId: 10 });
    expect(where).not.toHaveProperty('deletedAt');
  });

  it('list page 5 pageSize 10 should skip 40', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeDocument: { findMany: mockFindMany, count: mockCount } } as any);
    await service.list(10, 5, 10);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 10 }));
  });

  it('getById should use deletedAt null filter', async () => {
    const item = makePrismaDocument({ id: 8 });
    const mockFindFirst = jest.fn().mockResolvedValue(item);
    mockedGetPrisma.mockReturnValue({ knowledgeDocument: { findFirst: mockFindFirst } } as any);
    await service.getById(8);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 8, deletedAt: null } });
  });

  it('create should map snake_case request to camelCase data', async () => {
    const created = makePrismaDocument({ id: 1 });
    const mockCreate = jest.fn().mockResolvedValue(created);
    mockedGetPrisma.mockReturnValue({ knowledgeDocument: { create: mockCreate } } as any);
    await service.create(10, {
      title: 'doc', description: 'desc',
      file_url: 'https://a.com/f.pdf', file_name: 'f.pdf',
      file_type: 'pdf', file_size: 512,
    }, 1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        baseId: 10, title: 'doc', description: 'desc',
        fileUrl: 'https://a.com/f.pdf', fileName: 'f.pdf',
        fileType: 'pdf', fileSize: 512, createdBy: 1,
      },
    });
  });

  it('update should find via deletedAt null', async () => {
    const existing = makePrismaDocument({ id: 1 });
    const updated = makePrismaDocument({ id: 1, title: 'new' });
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    mockedGetPrisma.mockReturnValue({ knowledgeDocument: { findFirst: mockFindFirst, update: mockUpdate } } as any);
    await service.update(1, { title: 'new' });
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });

  it('listByProject page 2 pageSize 10 should skip 10', async () => {
    const mockKbService = (service as any).kbService;
    mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({ knowledgeDocument: { findMany: mockFindMany, count: mockCount } } as any);
    await service.listByProject(1, 2, 10);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });
});

describe('MinedKeywordServiceImpl R2 deep verification', () => {
  let service: MinedKeywordServiceImpl;
  beforeEach(() => { service = new MinedKeywordServiceImpl(); jest.clearAllMocks(); });

  it('listByBase should order by id desc', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ minedKeyword: { findMany: mockFindMany } } as any);
    await service.listByBase(10);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { baseId: 10, deletedAt: null },
      orderBy: { id: 'desc' },
    });
  });

  it('addMinedKeywords should use correct where in findMany', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCreateMany = jest.fn().mockResolvedValue({ count: 2 });
    mockedGetPrisma.mockReturnValue({ minedKeyword: { findMany: mockFindMany, createMany: mockCreateMany } } as any);
    await service.addMinedKeywords(20, ['A', 'B'], 5);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { baseId: 20, keyword: { in: ['A', 'B'] }, deletedAt: null },
      select: { keyword: true },
    });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { baseId: 20, keyword: 'A', createdBy: 5 },
        { baseId: 20, keyword: 'B', createdBy: 5 },
      ],
      skipDuplicates: true,
    });
  });

  it('clearAll should not include id in where', async () => {
    const mockUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    mockedGetPrisma.mockReturnValue({ minedKeyword: { updateMany: mockUpdateMany } } as any);
    await service.clearAll(10);
    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty('id');
    expect(call.where).toEqual({ baseId: 10, deletedAt: null });
  });

  it('toggleSelectBatch should only update non-deleted', async () => {
    const mockUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    mockedGetPrisma.mockReturnValue({ minedKeyword: { updateMany: mockUpdateMany } } as any);
    await service.toggleSelectBatch(10, [1, 2], true);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, baseId: 10, deletedAt: null },
      data: { selected: true },
    });
  });

  it('deleteByIds should constrain baseId and ids', async () => {
    const mockUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ minedKeyword: { updateMany: mockUpdateMany } } as any);
    await service.deleteByIds(30, [1, 2, 3]);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2, 3] }, baseId: 30, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
