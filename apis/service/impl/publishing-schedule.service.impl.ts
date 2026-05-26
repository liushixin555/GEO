import { getPrisma } from '../../utils';
import type { PublishingSchedule, PublishingScheduleItem, PublishingScheduleUpdateResult, CreatePublishingScheduleRequest, UpdatePublishingScheduleRequest, ScheduleType } from '../../entity/publishing-schedule.entity';
import { mapPublishingSchedule, mapPublishingScheduleItem } from '../../map';
import { IPublishingScheduleService } from '../publishing-schedule.service';
import type { AuthContext } from '../article.service';
import { Prisma } from '@prisma/client';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';

export class PublishingScheduleServiceImpl implements IPublishingScheduleService {
  private async findScheduleOrThrow(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? getPrisma();
    const item = await client.publishingSchedule.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('发布计划');
    return item;
  }

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

    const where: any = { deletedAt: null };

    if (search) {
      where.article = {
        ...(where.article || {}),
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { keywords: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.article = {
        ...(where.article || {}),
        projectId,
      };
    }

    // Permission filter
    if (role === 'admin' && userId) {
      where.article = {
        ...(where.article || {}),
        project: {
          operators: { some: { userId } },
          company: { status: true },
          status: true,
        },
      };
    } else if (role === 'view' && userId) {
      where.article = {
        ...(where.article || {}),
        project: {
          viewers: { some: { userId } },
          company: { status: true },
          status: true,
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.publishingSchedule.findMany({
        where,
        include: {
          article: {
            include: {
              project: {
                include: { company: { select: { shortName: true } } },
              },
            },
          },
          creator: { select: { id: true, cnName: true } },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.publishingSchedule.count({ where }),
    ]);

    return { list: items.map(mapPublishingScheduleItem), total };
  }

  async create(request: CreatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingSchedule> {
    const prisma = getPrisma();

    // 验证文章存在且已审核通过
    const article = await prisma.article.findFirst({
      where: { id: request.article_id, deletedAt: null },
    });
    if (!article) throw new NotFoundError('文章');
    if (article.status !== 'approved') {
      throw new BusinessError('只能为已审核通过的文章创建发布计划');
    }

    // 权限检查：非 sysadmin 只能为自己的文章创建发布计划
    if (auth.role !== 'sysadmin' && article.createdBy !== auth.userId) {
      throw new ForbiddenError('只能为自己的文章创建发布计划');
    }

    const item = await prisma.publishingSchedule.create({
      data: {
        articleId: request.article_id,
        platforms: request.platforms || Prisma.JsonNull,
        scheduleType: request.schedule_type,
        scheduledPublishAt: request.scheduled_publish_at ? new Date(request.scheduled_publish_at) : null,
        status: 'pending',
        createdBy: auth.userId,
      },
    });

    return mapPublishingSchedule(item);
  }

  async update(id: number, request: UpdatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingScheduleUpdateResult> {
    const prisma = getPrisma();

    const existing = await prisma.publishingSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        article: {
          include: {
            project: { include: { operators: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('发布计划');

    // 权限检查
    if (auth.role !== 'sysadmin') {
      const hasAccess = existing.article?.project?.operators?.some(op => op.userId === auth.userId);
      if (!hasAccess) throw new ForbiddenError('无权操作此发布计划');
    }

    const data: any = {};
    if (request.schedule_type !== undefined) data.scheduleType = request.schedule_type ?? null;
    if (request.scheduled_publish_at !== undefined) {
      data.scheduledPublishAt = request.scheduled_publish_at ? new Date(request.scheduled_publish_at) : null;
    }
    if (request.status !== undefined) data.status = request.status;

    const updated = await prisma.publishingSchedule.update({
      where: { id },
      data,
      include: {
        article: {
          include: {
            project: { include: { company: { select: { shortName: true } } } },
          },
        },
      },
    });

    return {
      id: updated.id,
      article_id: updated.articleId,
      title: updated.article?.title || '',
      keywords: updated.article?.keywords ?? null,
      article_type: updated.article?.articleType ?? null,
      platforms: updated.platforms as string[] | null,
      status: updated.status,
      schedule_type: (updated.scheduleType as ScheduleType) ?? null,
      scheduled_publish_at: updated.scheduledPublishAt ?? null,
      project_id: updated.article?.projectId ?? 0,
      project_name: updated.article?.project?.shortName || '',
      company_name: updated.article?.project?.company?.shortName || '',
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  async reject(id: number, auth: AuthContext): Promise<PublishingSchedule> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findScheduleOrThrow(id, tx);

      if (existing.status !== 'pending' && existing.status !== 'publishing') {
        throw new BusinessError('当前发布计划状态不支持驳回操作');
      }

      if (existing.createdBy === auth.userId) {
        throw new ForbiddenError('不能驳回自己创建的发布计划');
      }

      const updated = await tx.publishingSchedule.update({
        where: { id },
        data: { status: 'publish_failed' },
      });
      return mapPublishingSchedule(updated);
    });
  }

  async delete(id: number, auth: AuthContext): Promise<void> {
    await getPrisma().$transaction(async (tx) => {
      const existing = await this.findScheduleOrThrow(id, tx);

      if (existing.status === 'publishing' || existing.status === 'published') {
        throw new BusinessError('发布中或已发布的计划不能删除');
      }

      if (auth.role !== 'sysadmin' && existing.createdBy !== auth.userId) {
        throw new ForbiddenError('只能删除自己创建的发布计划');
      }

      await tx.publishingSchedule.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
