import { getPrisma } from '../../utils';
import { IPublishingScheduleService } from '../publishing-schedule.service';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';
import type { PublishingScheduleItem, PublishingScheduleUpdateResult } from '../../entity/publishing-schedule.entity';

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
  }): Promise<{ list: PublishingScheduleItem[]; total: number }> {
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
          creator: { select: { id: true, cnName: true } },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    const list: PublishingScheduleItem[] = items.map((item: any) => ({
      id: item.id,
      title: item.title,
      keywords: item.keywords,
      article_type: item.articleType,
      platforms: item.platforms,
      status: item.status,
      scheduled_publish_at: item.scheduledPublishAt ?? null,
      schedule_type: item.scheduleType ?? null,
      project_id: item.projectId,
      project_name: item.project?.shortName || '',
      company_name: item.project?.company?.shortName || '',
      created_by: item.createdBy ?? null,
      created_by_name: item.creator?.cnName || '',
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));

    return { list, total };
  }

  async updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<PublishingScheduleUpdateResult> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({
      where: { id },
      include: {
        project: {
          include: {
            operators: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('文章');

    // Only allow updating publishing status
    if (existing.status !== 'publishing') {
      throw new BusinessError('当前文章状态不可编辑发布计划');
    }

    // Permission check — admin can only update articles in their own projects
    if (role !== 'sysadmin') {
      const hasAccess = existing.project?.operators?.some(op => op.userId === userId);
      if (!hasAccess) throw new ForbiddenError('无权操作此文章');
    }

    const data: any = {
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
      scheduleType: scheduleType ?? null,
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
      platforms: updated.platforms as string[] | null,
      status: updated.status,
      scheduled_publish_at: updated.scheduledPublishAt ?? null,
      schedule_type: updated.scheduleType ?? null,
      project_id: updated.projectId,
      project_name: updated.project?.shortName || '',
      company_name: updated.project?.company?.shortName || '',
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }
}
