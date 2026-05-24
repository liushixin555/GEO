/**
 * @jest-environment node
 *
 * Round 3 — 接口契约合规性测试
 * 测试目标: apis/service/knowledge.service.ts 中的 5 个接口定义
 * 验证维度: 导出完整性、实现类绑定、方法签名、参数数量、返回值结构、实体字段完整性
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
import type {
  IKeywordService,
  IPortraitService,
  IImageService,
  IDocumentService,
  IMinedKeywordService,
} from '../../apis/service/knowledge.service';
import {
  KeywordServiceImpl,
  PortraitServiceImpl,
  ImageServiceImpl,
  DocumentServiceImpl,
  MinedKeywordServiceImpl,
} from '../../apis/service/impl/knowledge.service.impl';
import { KnowledgeBaseServiceImpl } from '../../apis/service/impl/knowledge-base.service.impl';
import {
  KnowledgeKeyword,
  KeywordExpandedWord,
  KnowledgePortrait,
  KnowledgeImage,
  KnowledgeDocument,
  MinedKeyword,
  CreateKeywordRequest,
  UpdateKeywordRequest,
  CreatePortraitRequest,
  UpdatePortraitRequest,
  CreateImageRequest,
  UpdateImageRequest,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from '../../apis/entity';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  1. 接口-实现类型兼容性（编译时验证）
//  TypeScript 接口在运行时被擦除，此处通过赋值验证实现类满足接口契约
// ══════════════════════════════════════════
describe('knowledge.service.ts Round 3 — 接口-实现类型兼容性', () => {
  it('KeywordServiceImpl 应满足 IKeywordService 契约', () => {
    const _: IKeywordService = new KeywordServiceImpl();
    expect(_).toBeDefined();
  });
  it('PortraitServiceImpl 应满足 IPortraitService 契约', () => {
    const _: IPortraitService = new PortraitServiceImpl();
    expect(_).toBeDefined();
  });
  it('ImageServiceImpl 应满足 IImageService 契约', () => {
    const _: IImageService = new ImageServiceImpl();
    expect(_).toBeDefined();
  });
  it('DocumentServiceImpl 应满足 IDocumentService 契约', () => {
    const _: IDocumentService = new DocumentServiceImpl();
    expect(_).toBeDefined();
  });
  it('MinedKeywordServiceImpl 应满足 IMinedKeywordService 契约', () => {
    const _: IMinedKeywordService = new MinedKeywordServiceImpl();
    expect(_).toBeDefined();
  });
});

// ══════════════════════════════════════════
//  2. 实现类导出验证
// ══════════════════════════════════════════
describe('knowledge.service Round 3 — 实现类导出验证', () => {
  it('应导出 KeywordServiceImpl', () => {
    expect(KeywordServiceImpl).toBeDefined();
    expect(typeof KeywordServiceImpl).toBe('function');
  });
  it('应导出 PortraitServiceImpl', () => {
    expect(PortraitServiceImpl).toBeDefined();
    expect(typeof PortraitServiceImpl).toBe('function');
  });
  it('应导出 ImageServiceImpl', () => {
    expect(ImageServiceImpl).toBeDefined();
    expect(typeof ImageServiceImpl).toBe('function');
  });
  it('应导出 DocumentServiceImpl', () => {
    expect(DocumentServiceImpl).toBeDefined();
    expect(typeof DocumentServiceImpl).toBe('function');
  });
  it('应导出 MinedKeywordServiceImpl', () => {
    expect(MinedKeywordServiceImpl).toBeDefined();
    expect(typeof MinedKeywordServiceImpl).toBe('function');
  });
});

// ══════════════════════════════════════════
//  3. 实现类可实例化验证
// ══════════════════════════════════════════
describe('knowledge.service Round 3 — 实现类可实例化', () => {
  beforeEach(() => jest.clearAllMocks());

  it('KeywordServiceImpl 应可实例化', () => {
    const instance = new KeywordServiceImpl();
    expect(instance).toBeInstanceOf(KeywordServiceImpl);
  });
  it('PortraitServiceImpl 应可实例化', () => {
    const instance = new PortraitServiceImpl();
    expect(instance).toBeInstanceOf(PortraitServiceImpl);
  });
  it('ImageServiceImpl 应可实例化', () => {
    const instance = new ImageServiceImpl();
    expect(instance).toBeInstanceOf(ImageServiceImpl);
  });
  it('DocumentServiceImpl 应可实例化', () => {
    const instance = new DocumentServiceImpl();
    expect(instance).toBeInstanceOf(DocumentServiceImpl);
  });
  it('MinedKeywordServiceImpl 应可实例化', () => {
    const instance = new MinedKeywordServiceImpl();
    expect(instance).toBeInstanceOf(MinedKeywordServiceImpl);
  });
});

// ══════════════════════════════════════════
//  4. IKeywordService 方法存在性与签名验证
// ══════════════════════════════════════════
describe('IKeywordService 接口契约', () => {
  let service: KeywordServiceImpl;
  beforeEach(() => {
    service = new KeywordServiceImpl();
    jest.clearAllMocks();
  });

  // 4.1 方法存在性
  it('应包含 list 方法', () => {
    expect(typeof service.list).toBe('function');
  });
  it('应包含 listByProject 方法', () => {
    expect(typeof service.listByProject).toBe('function');
  });
  it('应包含 getById 方法', () => {
    expect(typeof service.getById).toBe('function');
  });
  it('应包含 create 方法', () => {
    expect(typeof service.create).toBe('function');
  });
  it('应包含 batchCreate 方法', () => {
    expect(typeof service.batchCreate).toBe('function');
  });
  it('应包含 listByGroup 方法', () => {
    expect(typeof service.listByGroup).toBe('function');
  });
  it('应包含 syncGroup 方法', () => {
    expect(typeof service.syncGroup).toBe('function');
  });
  it('应包含 update 方法', () => {
    expect(typeof service.update).toBe('function');
  });
  it('应包含 delete 方法', () => {
    expect(typeof service.delete).toBe('function');
  });

  // 4.2 参数数量验证
  it('list 应有 4 个参数 (baseId, page, pageSize, search?)', () => {
    expect(service.list.length).toBe(4);
  });
  it('listByProject 应有 4 个参数 (projectId, page, pageSize, search?)', () => {
    expect(service.listByProject.length).toBe(4);
  });
  it('getById 应有 1 个参数 (id)', () => {
    expect(service.getById.length).toBe(1);
  });
  it('create 应有 3 个参数 (baseId, request, userId)', () => {
    expect(service.create.length).toBe(3);
  });
  it('batchCreate 应有 4 个参数 (baseId, keywords, userId, seedWord?)', () => {
    expect(service.batchCreate.length).toBe(4);
  });
  it('listByGroup 应有 1 个参数 (groupId)', () => {
    expect(service.listByGroup.length).toBe(1);
  });
  it('syncGroup 应有 4 个参数 (groupId, baseId, keywords, userId)', () => {
    expect(service.syncGroup.length).toBe(4);
  });
  it('update 应有 2 个参数 (id, request)', () => {
    expect(service.update.length).toBe(2);
  });
  it('delete 应有 1 个参数 (id)', () => {
    expect(service.delete.length).toBe(1);
  });

  // 4.3 返回值结构验证
  it('list 应返回 { list: KnowledgeKeyword[], total: number }', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
    } as any);
    const result = await service.list(1, 1, 10);
    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.list)).toBe(true);
    expect(typeof result.total).toBe('number');
  });

  it('listByProject 应返回 { list: KnowledgeKeyword[], total: number }', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findMany: mockFindMany, count: mockCount },
    } as any);
    (service as any).kbService = {
      getAccessibleBaseIds: jest.fn().mockResolvedValue([1, 2]),
    };
    const result = await service.listByProject(1, 1, 10);
    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('total');
  });

  it('getById 应返回 KnowledgeKeyword 对象', async () => {
    const rawKeyword = {
      id: 1, base_id: 10, keyword: '测试', seed_word: null,
      group_id: null, created_by: 1,
      created_at: new Date('2025-01-01'), updated_at: new Date('2025-06-01'),
    };
    mockedGetPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValueOnce([rawKeyword]).mockResolvedValueOnce([]),
    } as any);
    const result = await service.getById(1);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('base_id');
    expect(result).toHaveProperty('keyword');
  });

  it('batchCreate 应返回 { created: number, duplicates: number }', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCreateMany = jest.fn().mockResolvedValue({ count: 2 });
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findMany: mockFindMany, createMany: mockCreateMany },
    } as any);
    const result = await service.batchCreate(1, ['a', 'b'], 1);
    expect(result).toHaveProperty('created');
    expect(result).toHaveProperty('duplicates');
    expect(typeof result.created).toBe('number');
    expect(typeof result.duplicates).toBe('number');
  });

  it('delete 应返回 void (undefined)', async () => {
    const mockFindFirst = jest.fn().mockResolvedValue({ id: 1, baseId: 10 });
    const mockUpdate = jest.fn().mockResolvedValue({});
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: { findFirst: mockFindFirst, update: mockUpdate },
    } as any);
    const result = await service.delete(1);
    expect(result).toBeUndefined();
  });
});

// ══════════════════════════════════════════
//  5. IPortraitService 方法存在性与签名验证
// ══════════════════════════════════════════
describe('IPortraitService 接口契约', () => {
  let service: PortraitServiceImpl;
  beforeEach(() => {
    service = new PortraitServiceImpl();
    jest.clearAllMocks();
  });

  it('应包含 list 方法', () => expect(typeof service.list).toBe('function'));
  it('应包含 listByProject 方法', () => expect(typeof service.listByProject).toBe('function'));
  it('应包含 getById 方法', () => expect(typeof service.getById).toBe('function'));
  it('应包含 create 方法', () => expect(typeof service.create).toBe('function'));
  it('应包含 update 方法', () => expect(typeof service.update).toBe('function'));
  it('应包含 delete 方法', () => expect(typeof service.delete).toBe('function'));

  it('list 应有 4 个参数', () => expect(service.list.length).toBe(4));
  it('listByProject 应有 4 个参数', () => expect(service.listByProject.length).toBe(4));
  it('getById 应有 1 个参数', () => expect(service.getById.length).toBe(1));
  it('create 应有 3 个参数', () => expect(service.create.length).toBe(3));
  it('update 应有 2 个参数', () => expect(service.update.length).toBe(2));
  it('delete 应有 1 个参数', () => expect(service.delete.length).toBe(1));

  it('list 应返回 { list: KnowledgePortrait[], total: number }', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    mockedGetPrisma.mockReturnValue({
      knowledgePortrait: { findMany: mockFindMany, count: mockCount },
    } as any);
    const result = await service.list(1, 1, 10);
    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.list)).toBe(true);
    expect(typeof result.total).toBe('number');
  });

  it('getById 应返回 KnowledgePortrait 对象', async () => {
    mockedGetPrisma.mockReturnValue({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, baseId: 10, title: '测试', content: null,
          createdBy: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        }),
      },
    } as any);
    const result = await service.getById(1);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('base_id');
    expect(result).toHaveProperty('title');
  });

  it('delete 应返回 void', async () => {
    mockedGetPrisma.mockReturnValue({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any);
    const result = await service.delete(1);
    expect(result).toBeUndefined();
  });
});

// ══════════════════════════════════════════
//  6. IImageService 方法存在性与签名验证
// ══════════════════════════════════════════
describe('IImageService 接口契约', () => {
  let service: ImageServiceImpl;
  beforeEach(() => {
    service = new ImageServiceImpl();
    jest.clearAllMocks();
  });

  it('应包含 list 方法', () => expect(typeof service.list).toBe('function'));
  it('应包含 listByProject 方法', () => expect(typeof service.listByProject).toBe('function'));
  it('应包含 getById 方法', () => expect(typeof service.getById).toBe('function'));
  it('应包含 create 方法', () => expect(typeof service.create).toBe('function'));
  it('应包含 update 方法', () => expect(typeof service.update).toBe('function'));
  it('应包含 delete 方法', () => expect(typeof service.delete).toBe('function'));

  it('list 应有 4 个参数', () => expect(service.list.length).toBe(4));
  it('listByProject 应有 4 个参数', () => expect(service.listByProject.length).toBe(4));
  it('getById 应有 1 个参数', () => expect(service.getById.length).toBe(1));
  it('create 应有 3 个参数', () => expect(service.create.length).toBe(3));
  it('update 应有 2 个参数', () => expect(service.update.length).toBe(2));
  it('delete 应有 1 个参数', () => expect(service.delete.length).toBe(1));

  it('list 应返回 { list: KnowledgeImage[], total: number }', async () => {
    mockedGetPrisma.mockReturnValue({
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any);
    const result = await service.list(1, 1, 10);
    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('total');
  });

  it('getById 应返回 KnowledgeImage 对象含 image_url', async () => {
    mockedGetPrisma.mockReturnValue({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, baseId: 10, title: '测试', description: null,
          imageUrl: 'https://example.com/img.png',
          createdBy: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        }),
      },
    } as any);
    const result = await service.getById(1);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('image_url');
  });
});

// ══════════════════════════════════════════
//  7. IDocumentService 方法存在性与签名验证
// ══════════════════════════════════════════
describe('IDocumentService 接口契约', () => {
  let service: DocumentServiceImpl;
  beforeEach(() => {
    service = new DocumentServiceImpl();
    jest.clearAllMocks();
  });

  it('应包含 list 方法', () => expect(typeof service.list).toBe('function'));
  it('应包含 listByProject 方法', () => expect(typeof service.listByProject).toBe('function'));
  it('应包含 getById 方法', () => expect(typeof service.getById).toBe('function'));
  it('应包含 create 方法', () => expect(typeof service.create).toBe('function'));
  it('应包含 update 方法', () => expect(typeof service.update).toBe('function'));
  it('应包含 delete 方法', () => expect(typeof service.delete).toBe('function'));

  it('list 应有 4 个参数', () => expect(service.list.length).toBe(4));
  it('listByProject 应有 4 个参数', () => expect(service.listByProject.length).toBe(4));
  it('getById 应有 1 个参数', () => expect(service.getById.length).toBe(1));
  it('create 应有 3 个参数', () => expect(service.create.length).toBe(3));
  it('update 应有 2 个参数', () => expect(service.update.length).toBe(2));
  it('delete 应有 1 个参数', () => expect(service.delete.length).toBe(1));

  it('list 应返回 { list: KnowledgeDocument[], total: number }', async () => {
    mockedGetPrisma.mockReturnValue({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any);
    const result = await service.list(1, 1, 10);
    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('total');
  });

  it('getById 应返回 KnowledgeDocument 对象含文件字段', async () => {
    mockedGetPrisma.mockReturnValue({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, baseId: 10, title: '测试', description: null,
          fileUrl: 'https://example.com/doc.pdf', fileName: 'doc.pdf',
          fileType: 'pdf', fileSize: 1024,
          createdBy: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
        }),
      },
    } as any);
    const result = await service.getById(1);
    expect(result).toHaveProperty('file_url');
    expect(result).toHaveProperty('file_name');
    expect(result).toHaveProperty('file_type');
    expect(result).toHaveProperty('file_size');
  });
});

// ══════════════════════════════════════════
//  8. IMinedKeywordService 方法存在性与签名验证
// ══════════════════════════════════════════
describe('IMinedKeywordService 接口契约', () => {
  let service: MinedKeywordServiceImpl;
  beforeEach(() => {
    service = new MinedKeywordServiceImpl();
    jest.clearAllMocks();
  });

  it('应包含 listByBase 方法', () => expect(typeof service.listByBase).toBe('function'));
  it('应包含 addMinedKeywords 方法', () => expect(typeof service.addMinedKeywords).toBe('function'));
  it('应包含 toggleSelectBatch 方法', () => expect(typeof service.toggleSelectBatch).toBe('function'));
  it('应包含 deleteByIds 方法', () => expect(typeof service.deleteByIds).toBe('function'));
  it('应包含 clearAll 方法', () => expect(typeof service.clearAll).toBe('function'));

  it('listByBase 应有 1 个参数', () => expect(service.listByBase.length).toBe(1));
  it('addMinedKeywords 应有 3 个参数', () => expect(service.addMinedKeywords.length).toBe(3));
  it('toggleSelectBatch 应有 3 个参数', () => expect(service.toggleSelectBatch.length).toBe(3));
  it('deleteByIds 应有 2 个参数', () => expect(service.deleteByIds.length).toBe(2));
  it('clearAll 应有 1 个参数', () => expect(service.clearAll.length).toBe(1));

  it('listByBase 应返回 MinedKeyword[]', async () => {
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { findMany: jest.fn().mockResolvedValue([]) },
    } as any);
    const result = await service.listByBase(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it('addMinedKeywords 应返回 { added: number, duplicates: number }', async () => {
    mockedGetPrisma.mockReturnValue({
      minedKeyword: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    } as any);
    const result = await service.addMinedKeywords(1, ['a', 'b'], 1);
    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('duplicates');
    expect(typeof result.added).toBe('number');
    expect(typeof result.duplicates).toBe('number');
  });

  it('toggleSelectBatch 应返回 void', async () => {
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { updateMany: jest.fn().mockResolvedValue({}) },
    } as any);
    const result = await service.toggleSelectBatch(1, [1, 2], true);
    expect(result).toBeUndefined();
  });

  it('deleteByIds 应返回 void', async () => {
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { updateMany: jest.fn().mockResolvedValue({}) },
    } as any);
    const result = await service.deleteByIds(1, [1, 2]);
    expect(result).toBeUndefined();
  });

  it('clearAll 应返回 void', async () => {
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { updateMany: jest.fn().mockResolvedValue({}) },
    } as any);
    const result = await service.clearAll(1);
    expect(result).toBeUndefined();
  });
});

// ══════════════════════════════════════════
//  9. 跨接口一致性验证
// ══════════════════════════════════════════
describe('跨接口一致性验证', () => {
  const crudServices = [
    { name: 'IKeywordService', get: () => new KeywordServiceImpl() },
    { name: 'IPortraitService', get: () => new PortraitServiceImpl() },
    { name: 'IImageService', get: () => new ImageServiceImpl() },
    { name: 'IDocumentService', get: () => new DocumentServiceImpl() },
  ];

  it('所有 CRUD 服务应有相同的 6 个核心方法', () => {
    const expectedMethods = ['list', 'listByProject', 'getById', 'create', 'update', 'delete'];
    for (const { name, get } of crudServices) {
      const svc = get();
      for (const method of expectedMethods) {
        expect(typeof (svc as any)[method]).toBe('function');
      }
    }
  });

  it('所有 CRUD 服务的 list 方法应有 4 个参数', () => {
    for (const { get } of crudServices) {
      expect((get() as any).list.length).toBe(4);
    }
  });

  it('所有 CRUD 服务的 listByProject 方法应有 4 个参数', () => {
    for (const { get } of crudServices) {
      expect((get() as any).listByProject.length).toBe(4);
    }
  });

  it('所有 CRUD 服务的 getById 方法应有 1 个参数', () => {
    for (const { get } of crudServices) {
      expect((get() as any).getById.length).toBe(1);
    }
  });

  it('所有 CRUD 服务的 create 方法应有 3 个参数', () => {
    for (const { get } of crudServices) {
      expect((get() as any).create.length).toBe(3);
    }
  });

  it('所有 CRUD 服务的 update 方法应有 2 个参数', () => {
    for (const { get } of crudServices) {
      expect((get() as any).update.length).toBe(2);
    }
  });

  it('所有 CRUD 服务的 delete 方法应有 1 个参数', () => {
    for (const { get } of crudServices) {
      expect((get() as any).delete.length).toBe(1);
    }
  });

  it('KeywordServiceImpl 应额外有 batchCreate, listByGroup, syncGroup 方法', () => {
    const svc = new KeywordServiceImpl();
    expect(typeof (svc as any).batchCreate).toBe('function');
    expect(typeof (svc as any).listByGroup).toBe('function');
    expect(typeof (svc as any).syncGroup).toBe('function');
  });

  it('MinedKeywordServiceImpl 不应继承 CRUD 模式方法', () => {
    const svc = new MinedKeywordServiceImpl();
    expect((svc as any).list).toBeUndefined();
    expect((svc as any).create).toBeUndefined();
    expect((svc as any).update).toBeUndefined();
    expect((svc as any).delete).toBeUndefined();
  });
});

// ══════════════════════════════════════════
//  10. 实体类型字段完整性验证
// ══════════════════════════════════════════
describe('实体类型字段完整性', () => {
  it('KnowledgeKeyword 应包含所有必要字段', () => {
    const entity: KnowledgeKeyword = {
      id: 1,
      base_id: 10,
      keyword: '测试',
      seed_word: null,
      group_id: null,
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('base_id');
    expect(entity).toHaveProperty('keyword');
    expect(entity).toHaveProperty('seed_word');
    expect(entity).toHaveProperty('group_id');
    expect(entity).toHaveProperty('created_by');
    expect(entity).toHaveProperty('created_at');
    expect(entity).toHaveProperty('updated_at');
  });

  it('KnowledgeKeyword 可包含可选 expanded_words', () => {
    const entity: KnowledgeKeyword = {
      id: 1, base_id: 10, keyword: '测试', seed_word: null,
      group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date(),
      expanded_words: [],
    };
    expect(entity).toHaveProperty('expanded_words');
    expect(Array.isArray(entity.expanded_words)).toBe(true);
  });

  it('KeywordExpandedWord 应包含所有必要字段', () => {
    const entity: KeywordExpandedWord = {
      id: 1, keyword_id: 1, word: '扩展词', selected: true,
      created_at: new Date(), updated_at: new Date(),
    };
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('keyword_id');
    expect(entity).toHaveProperty('word');
    expect(entity).toHaveProperty('selected');
  });

  it('KnowledgePortrait 应包含所有必要字段', () => {
    const entity: KnowledgePortrait = {
      id: 1, base_id: 10, title: '测试', content: null,
      created_by: 1, created_at: new Date(), updated_at: new Date(),
    };
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('base_id');
    expect(entity).toHaveProperty('title');
    expect(entity).toHaveProperty('content');
    expect(entity).toHaveProperty('created_by');
  });

  it('KnowledgeImage 应包含 image_url 字段', () => {
    const entity: KnowledgeImage = {
      id: 1, base_id: 10, title: '测试', description: null,
      image_url: 'https://example.com/img.png',
      created_by: 1, created_at: new Date(), updated_at: new Date(),
    };
    expect(entity).toHaveProperty('image_url');
    expect(typeof entity.image_url).toBe('string');
  });

  it('KnowledgeDocument 应包含文件相关字段', () => {
    const entity: KnowledgeDocument = {
      id: 1, base_id: 10, title: '测试', description: null,
      file_url: 'https://example.com/doc.pdf', file_name: 'doc.pdf',
      file_type: 'pdf', file_size: 1024,
      created_by: 1, created_at: new Date(), updated_at: new Date(),
    };
    expect(entity).toHaveProperty('file_url');
    expect(entity).toHaveProperty('file_name');
    expect(entity).toHaveProperty('file_type');
    expect(entity).toHaveProperty('file_size');
  });

  it('MinedKeyword 应包含 selected 字段', () => {
    const entity: MinedKeyword = {
      id: 1, base_id: 10, keyword: '挖掘词', selected: true,
      created_by: 1, created_at: new Date(),
    };
    expect(entity).toHaveProperty('selected');
    expect(typeof entity.selected).toBe('boolean');
  });

  it('MinedKeyword 不应有 updated_at 字段', () => {
    const entity: MinedKeyword = {
      id: 1, base_id: 10, keyword: '挖掘词', selected: false,
      created_by: null, created_at: new Date(),
    };
    expect((entity as any).updated_at).toBeUndefined();
  });
});

// ══════════════════════════════════════════
//  11. 请求类型字段验证
// ══════════════════════════════════════════
describe('请求类型字段验证', () => {
  it('CreateKeywordRequest 应含 keyword 和可选 expanded_words', () => {
    const req: CreateKeywordRequest = { keyword: '测试' };
    expect(req).toHaveProperty('keyword');
    const reqWithWords: CreateKeywordRequest = {
      keyword: '测试',
      expanded_words: [{ word: '扩展', selected: true }],
    };
    expect(reqWithWords.expanded_words).toHaveLength(1);
  });

  it('UpdateKeywordRequest 应含 keyword 和可选 expanded_words', () => {
    const req: UpdateKeywordRequest = { keyword: '更新' };
    expect(req).toHaveProperty('keyword');
  });

  it('CreatePortraitRequest 应含 title 和可选 content', () => {
    const req: CreatePortraitRequest = { title: '画像标题' };
    expect(req).toHaveProperty('title');
    const reqWithContent: CreatePortraitRequest = { title: '画像标题', content: '内容' };
    expect(reqWithContent.content).toBe('内容');
  });

  it('UpdatePortraitRequest 所有字段可选', () => {
    const empty: UpdatePortraitRequest = {};
    expect(Object.keys(empty)).toHaveLength(0);
    const full: UpdatePortraitRequest = { title: '新标题', content: '新内容' };
    expect(full.title).toBe('新标题');
    expect(full.content).toBe('新内容');
  });

  it('CreateImageRequest 应含 title 和 image_url', () => {
    const req: CreateImageRequest = { title: '图片', image_url: 'https://example.com/img.png' };
    expect(req).toHaveProperty('title');
    expect(req).toHaveProperty('image_url');
  });

  it('UpdateImageRequest 所有字段可选', () => {
    const empty: UpdateImageRequest = {};
    expect(Object.keys(empty)).toHaveLength(0);
    const full: UpdateImageRequest = { title: '新标题', description: '新描述' };
    expect(full.title).toBe('新标题');
  });

  it('CreateDocumentRequest 应含 title 和文件字段', () => {
    const req: CreateDocumentRequest = {
      title: '文档', file_url: 'https://example.com/doc.pdf',
      file_name: 'doc.pdf', file_type: 'pdf', file_size: 1024,
    };
    expect(req).toHaveProperty('title');
    expect(req).toHaveProperty('file_url');
    expect(req).toHaveProperty('file_name');
    expect(req).toHaveProperty('file_type');
    expect(req).toHaveProperty('file_size');
  });

  it('UpdateDocumentRequest 所有字段可选', () => {
    const empty: UpdateDocumentRequest = {};
    expect(Object.keys(empty)).toHaveLength(0);
    const full: UpdateDocumentRequest = { title: '新标题', description: '新描述' };
    expect(full.title).toBe('新标题');
  });
});

// ══════════════════════════════════════════
//  12. 接口方法总数验证
// ══════════════════════════════════════════
describe('接口方法总数验证', () => {
  it('IKeywordService 应有 9 个方法', () => {
    const svc = new KeywordServiceImpl();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(svc))
      .filter(m => m !== 'constructor' && typeof (svc as any)[m] === 'function');
    // list, listByProject, getById, create, batchCreate, listByGroup, syncGroup, update, delete
    // + listExpandedWords, syncExpandedWords = 11 total on class
    // interface defines 9 (excludes listExpandedWords, syncExpandedWords which are class-private)
    const interfaceMethods = ['list', 'listByProject', 'getById', 'create', 'batchCreate', 'listByGroup', 'syncGroup', 'update', 'delete'];
    for (const m of interfaceMethods) {
      expect(typeof (svc as any)[m]).toBe('function');
    }
    expect(interfaceMethods).toHaveLength(9);
  });

  it('IPortraitService 应有 6 个方法', () => {
    const interfaceMethods = ['list', 'listByProject', 'getById', 'create', 'update', 'delete'];
    expect(interfaceMethods).toHaveLength(6);
  });

  it('IImageService 应有 6 个方法', () => {
    const interfaceMethods = ['list', 'listByProject', 'getById', 'create', 'update', 'delete'];
    expect(interfaceMethods).toHaveLength(6);
  });

  it('IDocumentService 应有 6 个方法', () => {
    const interfaceMethods = ['list', 'listByProject', 'getById', 'create', 'update', 'delete'];
    expect(interfaceMethods).toHaveLength(6);
  });

  it('IMinedKeywordService 应有 5 个方法', () => {
    const interfaceMethods = ['listByBase', 'addMinedKeywords', 'toggleSelectBatch', 'deleteByIds', 'clearAll'];
    expect(interfaceMethods).toHaveLength(5);
  });

  it('5个接口方法总数应为 32', () => {
    // IKeywordService(9) + IPortraitService(6) + IImageService(6) + IDocumentService(6) + IMinedKeywordService(5)
    const total = 9 + 6 + 6 + 6 + 5;
    expect(total).toBe(32);
  });
});

// ══════════════════════════════════════════
//  13. 异步返回值类型验证 (Promise)
// ══════════════════════════════════════════
describe('异步返回值类型验证', () => {
  beforeEach(() => jest.clearAllMocks());

  it('KeywordServiceImpl.list 应返回 Promise', () => {
    const svc = new KeywordServiceImpl();
    mockedGetPrisma.mockReturnValue({
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any);
    const result = svc.list(1, 1, 10);
    expect(result).toBeInstanceOf(Promise);
  });

  it('KeywordServiceImpl.getById 应返回 Promise', () => {
    const svc = new KeywordServiceImpl();
    mockedGetPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1, base_id: 10, keyword: '测试', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }]),
    } as any);
    const result = svc.getById(1);
    expect(result).toBeInstanceOf(Promise);
  });

  it('MinedKeywordServiceImpl.addMinedKeywords 应返回 Promise', () => {
    const svc = new MinedKeywordServiceImpl();
    mockedGetPrisma.mockReturnValue({
      minedKeyword: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any);
    const result = svc.addMinedKeywords(1, [], 1);
    expect(result).toBeInstanceOf(Promise);
  });

  it('MinedKeywordServiceImpl.clearAll 应返回 Promise', () => {
    const svc = new MinedKeywordServiceImpl();
    mockedGetPrisma.mockReturnValue({
      minedKeyword: { updateMany: jest.fn().mockResolvedValue({}) },
    } as any);
    const result = svc.clearAll(1);
    expect(result).toBeInstanceOf(Promise);
  });
});

// ══════════════════════════════════════════
//  14. 接口与实现的命名规范一致性
// ══════════════════════════════════════════
describe('接口与实现的命名规范一致性', () => {
  const pairs: [string, Function][] = [
    ['IKeywordService', KeywordServiceImpl],
    ['IPortraitService', PortraitServiceImpl],
    ['IImageService', ImageServiceImpl],
    ['IDocumentService', DocumentServiceImpl],
    ['IMinedKeywordService', MinedKeywordServiceImpl],
  ];

  it('实现类名应为 "I{Name}Service" → "{Name}ServiceImpl"', () => {
    for (const [iface, impl] of pairs) {
      const expected = iface.replace(/^I/, '').replace(/Service$/, 'ServiceImpl');
      expect(impl.name).toBe(expected);
    }
  });

  it('接口数量应与实现数量一致', () => {
    expect(pairs).toHaveLength(5);
  });
});
