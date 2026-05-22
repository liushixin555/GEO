import { getPrisma } from '../../utils';
import { IPublishingScheduleService } from '../publishing-schedule.service';

const PUBLISH_STATUSES = ['publishing', 'published', 'publish_failed'];

export class PublishingScheduleServiceImpl implements IPublishingScheduleService {
  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    projectId?: number;
    userId?: number;
    role?: string;
  }): Promise<{ list: any[]; total: number }> {
    const prisma = getPrisma();
    const { page, pageSize, search, status, projectId, userId, role } = params;

    const where: any = {
      status: { in: PUBLISH_STATUSES },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { keywords: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    // Permission filter
    if (role === 'admin' && userId) {
      where.project = {
        operators: { some: { userId } },
        company: { status: true },
        status: true,
      };
    } else if (role === 'view' && userId) {
      where.project = {
        viewers: { some: { userId } },
        company: { status: true },
        status: true,
      };
    }

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          project: {
            include: {
              company: { select: { shortName: true } },
            },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    const list = items.map((item: any) => ({
      id: item.id,
      title: item.title,
      keywords: item.keywords,
      article_type: item.articleType,
      platforms: item.platforms,
      status: item.status,
      scheduled_publish_at: item.scheduledPublishAt ?? null,
      project_id: item.projectId,
      project_name: item.project?.shortName || '',
      company_name: item.project?.company?.shortName || '',
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));

    return { list, total };
  }

  async updateSchedule(id: number, scheduledPublishAt: string | null, userId?: number, role?: string): Promise<any> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({ where: { id } });
    if (!existing) throw new Error('文章不存在');

    // Only allow updating publishing status
    if (existing.status !== 'publishing') {
      throw new Error('当前文章状态不可编辑发布计划');
    }

    const data: any = {
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
    };

    const updated = await prisma.article.update({
      where: { id },
      data,
      include: {
        project: {
          include: {
            company: { select: { shortName: true } },
          },
        },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      keywords: updated.keywords,
      article_type: updated.articleType,
      platforms: updated.platforms,
      status: updated.status,
      scheduled_publish_at: updated.scheduledPublishAt ?? null,
      project_id: updated.projectId,
      project_name: updated.project?.shortName || '',
      company_name: updated.project?.company?.shortName || '',
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }
}
