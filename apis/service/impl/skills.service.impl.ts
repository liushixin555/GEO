import { Prisma } from '@prisma/client';
import { getPrisma } from '../../utils';
import { CreateSkillsRequest, UpdateSkillsRequest, SkillsDetail } from '../../entity';
import { NotFoundError, ConflictError } from '../../errors';
import { mapSkills } from '../../map';
import { ISkillsService } from '../skills.service';

export class SkillsServiceImpl implements ISkillsService {
  async list(page: number, pageSize: number, search?: string): Promise<{ list: SkillsDetail[]; total: number }> {
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

  async getById(id: number): Promise<SkillsDetail> {
    const prisma = getPrisma();
    const item = await prisma.skills.findFirst({
      where: { id, deletedAt: null },
      include: { creator: true },
    });
    if (!item) throw new NotFoundError('技能');
    return mapSkills(item);
  }

  async getSkillDirById(id: number): Promise<string> {
    const prisma = getPrisma();
    const item = await prisma.skills.findFirst({
      where: { id, deletedAt: null },
      select: { skillDir: true },
    });
    if (!item) throw new NotFoundError('技能');
    return item.skillDir;
  }

  async findSoftDeletedByName(name: string): Promise<{ id: number; skill_dir: string } | null> {
    const prisma = getPrisma();
    const item = await prisma.skills.findFirst({
      where: { name, deletedAt: { not: null } },
      select: { id: true, skillDir: true },
    });
    if (!item) return null;
    return { id: item.id, skill_dir: item.skillDir };
  }

  async create(request: CreateSkillsRequest, createdBy: number): Promise<SkillsDetail> {
    const prisma = getPrisma();

    // Rule 1: active (non-deleted) skill with same name → reject
    const activeDuplicate = await prisma.skills.findFirst({ where: { name: request.name, deletedAt: null } });
    if (activeDuplicate) throw new ConflictError(`已存在同名技能「${request.name}」`);

    // Rule 2: soft-deleted skill with same name → reuse record with new data
    const softDeleted = await prisma.skills.findFirst({ where: { name: request.name, deletedAt: { not: null } } });
    if (softDeleted) {
      const updated = await prisma.skills.update({
        where: { id: softDeleted.id },
        data: {
          description: request.description || null,
          skillDir: request.skill_dir,
          createdBy: createdBy,
          deletedAt: null,
        },
        include: { creator: true },
      });
      return mapSkills(updated);
    }

    // No existing record → create new
    const item = await prisma.skills.create({
      data: {
        name: request.name,
        description: request.description || null,
        skillDir: request.skill_dir,
        createdBy: createdBy,
      },
      include: { creator: true },
    });
    return mapSkills(item);
  }

  async update(id: number, request: UpdateSkillsRequest): Promise<SkillsDetail> {
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
