import { getPrisma } from '../../utils';
import { Skills, CreateSkillsRequest, UpdateSkillsRequest } from '../../entity';
import { mapSkills } from '../../map';
import { ISkillsService } from '../skills.service';

export class SkillsServiceImpl implements ISkillsService {
  async list(page: number, pageSize: number, search?: string): Promise<{ list: Skills[]; total: number }> {
    const prisma = getPrisma();

    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };

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
      where: { id },
      include: { creator: true },
    });
    if (!item) throw new Error('技能不存在');
    return mapSkills(item);
  }

  async create(request: CreateSkillsRequest): Promise<Skills> {
    const prisma = getPrisma();

    // Check duplicate name
    const existing = await prisma.skills.findFirst({ where: { name: request.name } });
    if (existing) throw new Error(`已存在同名技能「${request.name}」`);

    const item = await prisma.skills.create({
      data: {
        name: request.name,
        description: request.description || null,
        skillDir: request.skill_dir,
        ...(request.created_by ? { createdBy: request.created_by } : {}),
      },
      include: { creator: true },
    });
    return mapSkills(item);
  }

  async update(id: number, request: UpdateSkillsRequest): Promise<Skills> {
    const prisma = getPrisma();

    const existing = await prisma.skills.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error('技能不存在');

    const data: any = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.description !== undefined) data.description = request.description;
    if (request.skill_dir !== undefined) data.skillDir = request.skill_dir;

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
    if (!existing) throw new Error('技能不存在');

    await prisma.skills.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
