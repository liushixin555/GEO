import { getPrisma } from '../../utils';
import { Skills, CreateSkillsRequest, UpdateSkillsRequest } from '../../entity';
import { mapSkills } from '../../map';
import { ISkillsService } from '../skills.service';

export class SkillsServiceImpl implements ISkillsService {
  async list(page: number, pageSize: number, search?: string, category?: string, status?: boolean): Promise<{ list: Skills[]; total: number }> {
    const prisma = getPrisma();

    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (category) where.category = category;
    if (status !== undefined) where.status = status;

    const [items, total] = await Promise.all([
      prisma.skills.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.skills.count({ where }),
    ]);

    return { list: items.map(mapSkills), total };
  }

  async getById(id: number): Promise<Skills> {
    const prisma = getPrisma();
    const item = await prisma.skills.findFirst({ where: { id } });
    if (!item) throw new Error('技能不存在');
    return mapSkills(item);
  }

  async create(request: CreateSkillsRequest): Promise<Skills> {
    const prisma = getPrisma();
    const item = await prisma.skills.create({
      data: {
        name: request.name,
        category: request.category,
        description: request.description || null,
        ...(request.company_id ? { companyId: request.company_id } : {}),
        ...(request.created_by ? { createdBy: request.created_by } : {}),
      },
    });
    return mapSkills(item);
  }

  async update(id: number, request: UpdateSkillsRequest): Promise<Skills> {
    const prisma = getPrisma();

    const existing = await prisma.skills.findFirst({ where: { id } });
    if (!existing) throw new Error('技能不存在');

    const data: any = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.category !== undefined) data.category = request.category;
    if (request.description !== undefined) data.description = request.description;
    if (request.status !== undefined) data.status = request.status;

    const updated = await prisma.skills.update({ where: { id }, data });
    return mapSkills(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.skills.findFirst({ where: { id } });
    if (!existing) throw new Error('技能不存在');

    await prisma.skills.delete({ where: { id } });
  }
}
