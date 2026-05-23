/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { getPrisma } from '../../apis/utils/db.util';
import { SkillsServiceImpl } from '../../apis/service/impl/skills.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaSkill(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: 'SEO优化',
    description: '搜索引擎优化技能',
    skillDir: '/skills/seo',
    createdBy: 10,
    creator: { id: 10, cnName: '张三' },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makeMappedSkill(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: 'SEO优化',
    description: '搜索引擎优化技能',
    skill_dir: '/skills/seo',
    created_by: 10,
    creator_name: '张三',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('SkillsServiceImpl', () => {
  let service: SkillsServiceImpl;

  beforeEach(() => {
    service = new SkillsServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('应返回分页列表和总数', async () => {
      const prismaItems = [makePrismaSkill({ id: 1 }), makePrismaSkill({ id: 2, name: '内容营销' })];
      const mockFindMany = jest.fn().mockResolvedValue(prismaItems);
      const mockCount = jest.fn().mockResolvedValue(2);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.list[0]).toEqual(makeMappedSkill({ id: 1 }));
      expect(result.list[1]).toEqual(makeMappedSkill({ id: 2, name: '内容营销' }));
    });

    it('应正确计算分页偏移量 skip = (page - 1) * pageSize', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(3, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('第一页 page=1 时 skip 应为 0', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('有 search 参数时应按 name 过滤（insensitive）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([makePrismaSkill()]);
      const mockCount = jest.fn().mockResolvedValue(1);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, 'SEO');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'SEO', mode: 'insensitive' } },
        }),
      );
      expect(mockCount).toHaveBeenCalledWith({
        where: { name: { contains: 'SEO', mode: 'insensitive' } },
      });
    });

    it('无 search 参数时 where 应为空对象', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(mockCount).toHaveBeenCalledWith({ where: {} });
    });

    it('search 为空字符串时 where 应为空对象', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('应按 id 降序排列', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('应包含 creator 关联数据', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { creator: true } }),
      );
    });

    it('返回空列表时应正确映射', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('Promise.all 应并行执行 findMany 和 count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([makePrismaSkill()]);
      const mockCount = jest.fn().mockResolvedValue(1);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
    });

    it('mapSkills 应正确映射 skillDir → skill_dir', async () => {
      const prismaItem = makePrismaSkill({ skillDir: '/skills/marketing' });
      const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
      const mockCount = jest.fn().mockResolvedValue(1);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].skill_dir).toBe('/skills/marketing');
    });

    it('creator 为 null 时 creator_name 应为 null', async () => {
      const prismaItem = makePrismaSkill({ createdBy: null, creator: null });
      const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
      const mockCount = jest.fn().mockResolvedValue(1);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].created_by).toBeNull();
      expect(result.list[0].creator_name).toBeNull();
    });

    it('findMany 抛出错误时应向上传播', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB连接失败'));
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await expect(service.list(1, 10)).rejects.toThrow('DB连接失败');
    });

    it('count 抛出错误时应向上传播', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockRejectedValue(new Error('Count失败'));

      mockedGetPrisma.mockReturnValue({
        skills: { findMany: mockFindMany, count: mockCount },
      } as any);

      await expect(service.list(1, 10)).rejects.toThrow('Count失败');
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('应返回指定 ID 的技能', async () => {
      const prismaItem = makePrismaSkill({ id: 5, name: '短视频' });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaItem);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(5);

      expect(result).toEqual(makeMappedSkill({ id: 5, name: '短视频' }));
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 5 },
        include: { creator: true },
      });
    });

    it('技能不存在时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('技能不存在');
    });

    it('应包含 creator 关联数据', async () => {
      const prismaItem = makePrismaSkill({
        creator: { id: 10, cnName: '李四' },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaItem);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.creator_name).toBe('李四');
    });

    it('mapSkills 应正确映射所有字段', async () => {
      const prismaItem = makePrismaSkill({
        id: 3,
        name: '数据分析',
        description: '数据驱动决策',
        skillDir: '/skills/data',
        createdBy: 5,
        creator: { id: 5, cnName: '王五' },
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-07-01'),
      });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaItem);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(3);

      expect(result).toEqual({
        id: 3,
        name: '数据分析',
        description: '数据驱动决策',
        skill_dir: '/skills/data',
        created_by: 5,
        creator_name: '王五',
        created_at: new Date('2025-03-01'),
        updated_at: new Date('2025-07-01'),
      });
    });

    it('findFirst 抛出错误时应向上传播', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB查询失败'));

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(1)).rejects.toThrow('DB查询失败');
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('应成功创建技能并返回映射结果', async () => {
      const existing = null;
      const created = makePrismaSkill({ id: 10, name: '新技能' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockCreate = jest.fn().mockResolvedValue(created);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      const result = await service.create({
        name: '新技能',
        description: '测试描述',
        skill_dir: '/skills/new',
      });

      expect(result).toEqual(makeMappedSkill({ id: 10, name: '新技能' }));
    });

    it('同名技能已存在时应抛出错误', async () => {
      const existing = makePrismaSkill({ name: 'SEO优化' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.create({ name: 'SEO优化', skill_dir: '/skills/seo' }),
      ).rejects.toThrow('已存在同名技能「SEO优化」');
    });

    it('应先检查重名再创建', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({ name: '测试', skill_dir: '/skills/test' });

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { name: '测试' } });
      expect(mockCreate).toHaveBeenCalled();
    });

    it('description 为 undefined 时应传 null', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({ name: '测试', skill_dir: '/test' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('description 有值时应正常传递', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({
        name: '测试',
        description: '详细描述',
        skill_dir: '/test',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: '详细描述' }),
        }),
      );
    });

    it('created_by 有值时应包含在 data 中', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(
        makePrismaSkill({ createdBy: 42 }),
      );

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({
        name: '测试',
        skill_dir: '/test',
        created_by: 42,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdBy: 42 }),
        }),
      );
    });

    it('created_by 为 null 时不应包含在 data 中', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(
        makePrismaSkill({ createdBy: null }),
      );

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({
        name: '测试',
        skill_dir: '/test',
        created_by: null,
      });

      // created_by 为 null (falsy) 时 spread 不会添加
      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBeUndefined();
    });

    it('created_by 为 undefined 时不应包含在 data 中', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({ name: '测试', skill_dir: '/test' });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBeUndefined();
    });

    it('创建时应包含 creator 关联查询', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({ name: '测试', skill_dir: '/test' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ include: { creator: true } }),
      );
    });

    it('skillDir 应正确映射为 skill_dir', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({ name: '测试', skill_dir: '/skills/advanced' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ skillDir: '/skills/advanced' }),
        }),
      );
    });

    it('description 为空字符串时应转为 null（falsy 值）', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaSkill());

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await service.create({ name: '测试', description: '', skill_dir: '/test' });

      // '' || null === null — 空字符串被视为 falsy
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('findFirst 检查重名抛出错误时应向上传播', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB连接失败'));

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.create({ name: '测试', skill_dir: '/test' }),
      ).rejects.toThrow('DB连接失败');
    });

    it('create 操作抛出错误时应向上传播', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockRejectedValue(new Error('写入失败'));

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, create: mockCreate },
      } as any);

      await expect(
        service.create({ name: '测试', skill_dir: '/test' }),
      ).rejects.toThrow('写入失败');
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('应成功更新技能并返回映射结果', async () => {
      const existing = makePrismaSkill({ id: 1 });
      const updated = makePrismaSkill({ id: 1, name: 'SEO专家' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { name: 'SEO专家' });

      expect(result).toEqual(makeMappedSkill({ name: 'SEO专家' }));
    });

    it('技能不存在（含已软删除）时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.update(999, { name: '不存在' }),
      ).rejects.toThrow('技能不存在');
    });

    it('查找现有记录时 should check deletedAt is null', async () => {
      const existing = makePrismaSkill({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: '更新' });

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });

    it('只更新 name 时 data 应只包含 name', async () => {
      const existing = makePrismaSkill();
      const updated = makePrismaSkill({ name: '新名称' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: '新名称' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: '新名称' } }),
      );
    });

    it('只更新 description 时 data 应只包含 description', async () => {
      const existing = makePrismaSkill();
      const updated = makePrismaSkill({ description: '新描述' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { description: '新描述' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { description: '新描述' } }),
      );
    });

    it('只更新 skill_dir 时 data 应只包含 skillDir', async () => {
      const existing = makePrismaSkill();
      const updated = makePrismaSkill({ skillDir: '/skills/new-dir' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { skill_dir: '/skills/new-dir' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { skillDir: '/skills/new-dir' } }),
      );
    });

    it('同时更新多个字段时 data 应包含所有字段', async () => {
      const existing = makePrismaSkill();
      const updated = makePrismaSkill({
        name: '新名称',
        description: '新描述',
        skillDir: '/new-dir',
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, {
        name: '新名称',
        description: '新描述',
        skill_dir: '/new-dir',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: '新名称', description: '新描述', skillDir: '/new-dir' },
        }),
      );
    });

    it('空请求对象时 data 应为空对象', async () => {
      const existing = makePrismaSkill();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, {});

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: {} }),
      );
    });

    it('字段值为 undefined 时不应包含在 data 中', async () => {
      const existing = makePrismaSkill();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: undefined, description: undefined });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: {} }),
      );
    });

    it('更新时应包含 creator 关联查询', async () => {
      const existing = makePrismaSkill();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: '更新' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ include: { creator: true } }),
      );
    });

    it('update 应使用 where: { id } 定位记录', async () => {
      const existing = makePrismaSkill({ id: 7 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(7, { name: '更新' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
    });

    it('description 设为 null 时应更新 description 为 null', async () => {
      const existing = makePrismaSkill({ description: '旧描述' });
      const updated = makePrismaSkill({ description: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { description: null as any });

      // description: null is not undefined, so it should be in data
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ description: null }) }),
      );
    });

    it('update 操作抛出错误时应向上传播', async () => {
      const existing = makePrismaSkill();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new Error('更新失败'));

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.update(1, { name: '更新' })).rejects.toThrow('更新失败');
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────
  describe('delete', () => {
    it('应成功软删除技能（设置 deletedAt）', async () => {
      const existing = makePrismaSkill({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('技能不存在时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999)).rejects.toThrow('技能不存在');
    });

    it('查找时 should check deletedAt is null（不允许删除已删除的）', async () => {
      const existing = makePrismaSkill({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });

    it('已软删除的技能再次删除应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(1)).rejects.toThrow('技能不存在');
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });

    it('删除后返回值应为 void（undefined）', async () => {
      const existing = makePrismaSkill({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.delete(1);

      expect(result).toBeUndefined();
    });

    it('软删除操作抛出错误时应向上传播', async () => {
      const existing = makePrismaSkill({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new Error('删除失败'));

      mockedGetPrisma.mockReturnValue({
        skills: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.delete(1)).rejects.toThrow('删除失败');
    });
  });
});
