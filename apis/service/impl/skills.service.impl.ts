import { Prisma } from '@prisma/client';
import { getPrisma } from '../../utils';
import { Skills, CreateSkillsRequest, UpdateSkillsRequest } from '../../entity';
import { NotFoundError, ConflictError } from '../../errors';
import { mapSkills } from '../../map';
import { ISkillsService } from '../skills.service';

export class SkillsServiceImpl implements ISkillsService {
  async list(page: number, pageSize: number, search?: string): Promise<{ list: Skills[]; total: number }> {
    const prisma = getPrisma();

    const where: Prisma.SkillsWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.skills.findMany({
        where,
        include: { creator: true },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.skills.count({ where }),
    ]);

    return { list: items.map(mapSkills), total };
  }

  async getById(id: number): Promise<Skills> {
    const prisma = getPrisma();
    const item = await prisma.skills.findFirst({
      where: { id, deletedAt: null },
      include: { creator: true },
    });
    if (!item) throw new NotFoundError('技能');
    return mapSkills(item);
  }

  async create(request: CreateSkillsRequest): Promise<Skills> {
    const prisma = getPrisma();

    // Check duplicate name (excluding soft-deleted)
    const existing = await prisma.skills.findFirst({ where: { name: request.name, deletedAt: null } });
    if (existing) throw new ConflictError(`已存在同名技能「${request.name}」`);

    const item = await prisma.skills.create({
      data: {
        name: request.name,
        description: request.description || null,
        skillDir: request.skill_dir,
        createdBy: request.created_by ?? null,
      },
      include: { creator: true },
    });
    return mapSkills(item);
  }

  async update(id: number, request: UpdateSkillsRequest): Promise<Skills> {
    const prisma = getPrisma();

    const existing = await prisma.skills.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('技能');

    // If name is being updated, check for duplicates
    if (request.name !== undefined && request.name !== existing.name) {
      const duplicate = await prisma.skills.findFirst({ where: { name: request.name, deletedAt: null } });
      if (duplicate) throw new ConflictError(`已存在同名技能「${request.name}」`);
    }

    const data: Prisma.SkillsUpdateInput = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.description !== undefined) data.description = request.description;

    const updated = await prisma.skills.update({
      where: { id },
      data,
      include: { creator: true },
    });
    return mapSkills(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.skills.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('技能');

    // Soft delete: set deletedAt timestamp
    await prisma.skills.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
