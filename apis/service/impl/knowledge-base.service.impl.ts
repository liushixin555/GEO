import { getPrisma } from '../../utils';
import { KnowledgeBase, CreateKnowledgeBaseRequest, UpdateKnowledgeBaseRequest } from '../../entity';
import { IKnowledgeBaseService } from '../knowledge-base.service';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';

const BASE_INCLUDE = {
  company: true,
  project: true,
  creator: true,
  _count: {
    select: {
      keywords: true,
      portraits: true,
      images: true,
      documents: true,
    },
  },
};

function mapKnowledgeBase(item: any): KnowledgeBase {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    scope: item.scope,
    company_id: item.companyId ?? null,
    company_name: item.company?.shortName || null,
    project_id: item.projectId ?? null,
    project_name: item.project?.shortName || null,
    status: item.status,
    created_by: item.createdBy ?? null,
    creator_name: item.creator?.cnName || null,
    keyword_count: item._count?.keywords ?? 0,
    portrait_count: item._count?.portraits ?? 0,
    image_count: item._count?.images ?? 0,
    document_count: item._count?.documents ?? 0,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export class KnowledgeBaseServiceImpl implements IKnowledgeBaseService {
  async list(page: number, pageSize: number, search?: string, scope?: string, status?: boolean, userId?: number, role?: string): Promise<{ list: KnowledgeBase[]; total: number }> {
    const prisma = getPrisma();

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (scope) {
      where.scope = scope;
    }

    if (status !== undefined) {
      where.status = status;
    }

    // Admin can only see: platform bases + their company bases + their project bases
    if (role === 'admin' && userId) {
      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) {
        return { list: [], total: 0 };
      }

      const orConditions: any[] = [
        { scope: 'platform', status: true },
      ];

      // Company scope: user's company
      if (user.companyId) {
        orConditions.push({ scope: 'company', companyId: user.companyId, status: true });
      }

      // Project scope: projects where user is an operator
      const operatorProjects = await prisma.projectOperator.findMany({
        where: { userId, deletedAt: null },
        select: { projectId: true },
      });
      const projectIds = operatorProjects.map(op => op.projectId);
      if (projectIds.length > 0) {
        orConditions.push({ scope: 'project', projectId: { in: projectIds }, status: true });
      }

      where.AND = [{ OR: orConditions }];
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where,
        include: BASE_INCLUDE,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.knowledgeBase.count({ where }),
    ]);

    return { list: items.map(mapKnowledgeBase), total };
  }

  async getById(id: number, userId?: number, role?: string): Promise<KnowledgeBase> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeBase.findFirst({
      where: { id },
      include: BASE_INCLUDE,
    });
    if (!item) throw new NotFoundError('知识库');

    // Non-sysadmin: check data-level access control (SEC-H-01)
    if (role !== 'sysadmin' && userId) {
      if (item.scope === 'platform') {
        // platform knowledge bases: only active ones are visible
        if (!item.status) throw new NotFoundError('知识库');
      } else if (item.scope === 'company') {
        const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
        if (!user || user.companyId !== item.companyId) {
          throw new NotFoundError('知识库');
        }
      } else if (item.scope === 'project') {
        if (!item.projectId) throw new NotFoundError('知识库');
        const operator = await prisma.projectOperator.findFirst({
          where: { userId, projectId: item.projectId, deletedAt: null },
        });
        if (!operator) {
          throw new NotFoundError('知识库');
        }
      }
    }

    return mapKnowledgeBase(item);
  }

  async create(request: CreateKnowledgeBaseRequest, userId: number, role?: string): Promise<KnowledgeBase> {
    const prisma = getPrisma();

    // Validate scope-specific fields
    if (request.scope === 'company' && !request.company_id) {
      throw new BusinessError('公司公共知识库必须选择公司');
    }
    if (request.scope === 'project' && !request.project_id) {
      throw new BusinessError('项目私有知识库必须选择项目');
    }

    // Ownership validation (SEC-M-01): only admin needs validation
    if (role === 'admin') {
      if (request.scope === 'company' && request.company_id) {
        const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
        if (!user || user.companyId !== request.company_id) {
          throw new ForbiddenError('无权关联该公司');
        }
      }
      if (request.scope === 'project' && request.project_id) {
        const operator = await prisma.projectOperator.findFirst({
          where: { userId, projectId: request.project_id, deletedAt: null },
        });
        if (!operator) {
          throw new ForbiddenError('无权关联该项目');
        }
      }
    }

    // For platform scope, clear company_id and project_id
    const companyId = request.scope === 'platform' ? null : request.company_id ?? null;
    const projectId = request.scope === 'project' ? request.project_id ?? null : null;

    const item = await prisma.knowledgeBase.create({
      data: {
        name: request.name,
        description: request.description || null,
        scope: request.scope,
        companyId,
        projectId,
        createdBy: userId,
      },
      include: BASE_INCLUDE,
    });
    return mapKnowledgeBase(item);
  }

  async update(id: number, request: UpdateKnowledgeBaseRequest, userId: number, role: string): Promise<KnowledgeBase> {
    const prisma = getPrisma();

    const existing = await prisma.knowledgeBase.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('知识库');

    // Non-sysadmin can only update their own
    if (role !== 'sysadmin' && existing.createdBy !== userId) {
      throw new ForbiddenError('只能修改自己创建的知识库');
    }

    // Ownership validation (SEC-M-01): only admin needs validation
    if (role === 'admin') {
      if (request.company_id !== undefined) {
        const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
        if (!user || user.companyId !== request.company_id) {
          throw new ForbiddenError('无权关联该公司');
        }
      }
      if (request.project_id !== undefined) {
        const operator = await prisma.projectOperator.findFirst({
          where: { userId, projectId: request.project_id, deletedAt: null },
        });
        if (!operator) {
          throw new ForbiddenError('无权关联该项目');
        }
      }
    }

    const data: any = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.description !== undefined) data.description = request.description || null;
    if (request.status !== undefined) data.status = request.status;

    // Handle scope change
    if (request.scope !== undefined) {
      data.scope = request.scope;
      if (request.scope === 'platform') {
        data.companyId = null;
        data.projectId = null;
      } else if (request.scope === 'company') {
        if (!request.company_id && !existing.companyId) {
          throw new BusinessError('公司公共知识库必须选择公司');
        }
        data.companyId = request.company_id ?? existing.companyId;
        data.projectId = null;
      } else if (request.scope === 'project') {
        if (!request.project_id && !existing.projectId) {
          throw new BusinessError('项目私有知识库必须选择项目');
        }
        data.projectId = request.project_id ?? existing.projectId;
        data.companyId = request.company_id ?? existing.companyId;
      }
    } else {
      if (request.company_id !== undefined) data.companyId = request.company_id;
      if (request.project_id !== undefined) data.projectId = request.project_id;
    }

    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data,
      include: BASE_INCLUDE,
    });
    return mapKnowledgeBase(updated);
  }

  async delete(id: number, userId: number, role: string): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.knowledgeBase.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('知识库');

    if (role !== 'sysadmin' && existing.createdBy !== userId) {
      throw new ForbiddenError('只能删除自己创建的知识库');
    }

    await prisma.knowledgeBase.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getAccessibleBaseIds(projectId: number): Promise<number[]> {
    const prisma = getPrisma();

    const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundError('项目');

    const orConditions: any[] = [
      { scope: 'platform', status: true },
      { scope: 'project', projectId, status: true },
    ];

    if (project.companyId) {
      orConditions.push({ scope: 'company', companyId: project.companyId, status: true });
    }

    const bases = await prisma.knowledgeBase.findMany({
      where: { OR: orConditions },
      select: { id: true },
    });

    return bases.map((b) => b.id);
  }
}
