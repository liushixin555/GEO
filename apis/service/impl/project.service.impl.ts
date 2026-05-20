import { getPrisma } from '../../utils';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../../entity';
import { mapProject } from '../../map';
import { IProjectService } from '../project.service';

const OPERATOR_INCLUDE = {
  company: true,
  operators: { include: { user: true } },
  viewers: { include: { user: true } },
};

export class ProjectServiceImpl implements IProjectService {
  async list(page: number, pageSize: number, search?: string, company_id?: number, status?: boolean, userId?: number, role?: string): Promise<{ list: Project[]; total: number }> {
    const prisma = getPrisma();

    const where: any = {};
    if (search) {
      where.OR = [
        { shortName: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (company_id) where.companyId = company_id;
    if (status !== undefined) where.status = status;

    // Admin can only see projects where they are an operator AND company is enabled
    if (role === 'admin' && userId) {
      where.operators = { some: { userId } };
      where.company = { status: true };
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: OPERATOR_INCLUDE,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return { list: items.map(mapProject), total };
  }

  async getById(id: number, userId?: number, role?: string): Promise<Project> {
    const prisma = getPrisma();
    const item = await prisma.project.findFirst({
      where: { id },
      include: OPERATOR_INCLUDE,
    });
    if (!item) throw new Error('项目不存在');
    // Company-level check is done in the controller using req.user.companyId
    return mapProject(item);
  }

  async create(request: CreateProjectRequest): Promise<Project> {
    const prisma = getPrisma();

    // Validate operators belong to the specified company
    if (request.operator_ids?.length) {
      const operators = await prisma.user.findMany({
        where: { id: { in: request.operator_ids }, companyId: request.company_id, role: 'admin' },
      });
      if (operators.length !== request.operator_ids.length) {
        throw new Error('运营者不属于指定公司');
      }
    }

    // Validate viewers belong to the specified company
    if (request.viewer_ids?.length) {
      const viewers = await prisma.user.findMany({
        where: { id: { in: request.viewer_ids }, companyId: request.company_id, role: 'view' },
      });
      if (viewers.length !== request.viewer_ids.length) {
        throw new Error('查看者不属于指定公司');
      }
    }

    const item = await prisma.project.create({
      data: {
        shortName: request.short_name,
        fullName: request.full_name,
        description: request.description || null,
        companyId: request.company_id,
        operators: {
          create: (request.operator_ids || []).map((userId: number) => ({ userId })),
        },
        viewers: {
          create: (request.viewer_ids || []).map((userId: number) => ({ userId })),
        },
      },
      include: OPERATOR_INCLUDE,
    });
    return mapProject(item);
  }

  async update(id: number, request: UpdateProjectRequest, userId?: number, role?: string): Promise<Project> {
    const prisma = getPrisma();

    const existing = await prisma.project.findFirst({ where: { id } });
    if (!existing) throw new Error('项目不存在');

    // Company-level check is done in the controller

    const data: any = {};
    if (request.short_name !== undefined) data.shortName = request.short_name;
    if (request.full_name !== undefined) data.fullName = request.full_name;
    if (request.description !== undefined) data.description = request.description;
    if (request.status !== undefined) data.status = request.status;

    // company_id changes are blocked by controller, always use existing company
    const targetCompanyId = existing.companyId;

    // Handle operators
    if (request.operator_ids !== undefined) {
      if (request.operator_ids.length > 0) {
        const operators = await prisma.user.findMany({
          where: { id: { in: request.operator_ids }, companyId: targetCompanyId, role: 'admin' },
        });
        if (operators.length !== request.operator_ids.length) {
          throw new Error('运营者不属于指定公司');
        }
      }
      await prisma.projectOperator.deleteMany({ where: { projectId: id } });
      data.operators = {
        create: request.operator_ids.map((userId: number) => ({ userId })),
      };
    }

    // Handle viewers
    if (request.viewer_ids !== undefined) {
      if (request.viewer_ids.length > 0) {
        const viewers = await prisma.user.findMany({
          where: { id: { in: request.viewer_ids }, companyId: targetCompanyId, role: 'view' },
        });
        if (viewers.length !== request.viewer_ids.length) {
          throw new Error('查看者不属于指定公司');
        }
      }
      await prisma.projectViewer.deleteMany({ where: { projectId: id } });
      data.viewers = {
        create: request.viewer_ids.map((userId: number) => ({ userId })),
      };
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: OPERATOR_INCLUDE,
    });
    return mapProject(updated);
  }

  async delete(id: number, userId?: number, role?: string): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.project.findFirst({ where: { id } });
    if (!existing) throw new Error('项目不存在');

    // Company-level check is done in the controller

    await prisma.project.delete({ where: { id } });
  }
}
