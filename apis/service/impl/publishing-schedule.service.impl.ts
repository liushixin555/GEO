import { getPrisma } from '../../utils';
import type { PublishingSchedule, PublishingScheduleItem, PublishingScheduleUpdateResult, CreatePublishingScheduleRequest, UpdatePublishingScheduleRequest, ScheduleType, PublishingScheduleListParams, AutoCreatePublishingScheduleRequest, AutoCreatePublishingScheduleResult } from '../../entity/publishing-schedule.entity';
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

  private async assertPlatformsExist(platformNames: string[]): Promise<void> {
    const names = Array.from(new Set(platformNames.map((name) => name.trim()).filter(Boolean)));
    if (names.length === 0) throw new BusinessError('至少选择一个发布平台');

    const platforms = await getPrisma().publishingPlatform.findMany({
      where: { name: { in: names } },
      select: { name: true },
    });
    const existingNames = new Set(platforms.map((platform) => platform.name));
    const missing = names.filter((name) => !existingNames.has(name));
    if (missing.length > 0) {
      throw new BusinessError(`发布平台未同步或不存在：${missing.join('、')}`);
    }
  }

  private async assertScheduleHasPublicationAnchor(scheduleId: number, articleId: number): Promise<void> {
    const [orderCount, linkCount] = await Promise.all([
      getPrisma().publishingPlatformOrder.count({ where: { scheduleId } }),
      getPrisma().publishedArticleLink.count({ where: { articleId, scheduleId, deletedAt: null } }),
    ]);
    if (orderCount === 0 && linkCount === 0) {
      throw new BusinessError('发布计划缺少软盟订单或发布链接，不能标记为已发布');
    }
  }

  async list(params: PublishingScheduleListParams, auth: AuthContext): Promise<{ list: PublishingScheduleItem[]; total: number }> {
    const prisma = getPrisma();
    const { page, pageSize, search, status, projectId } = params;
    const { userId, role } = auth;

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

    const ordersByScheduleId = await this.loadOrdersByScheduleId(items.map((item: any) => item.id));
    return {
      list: items.map((item: any) => mapPublishingScheduleItem({
        ...item,
        platformOrders: ordersByScheduleId.get(item.id) || [],
      })),
      total,
    };
  }

  private async loadOrdersByScheduleId(scheduleIds: number[]): Promise<Map<number, any[]>> {
    const result = new Map<number, any[]>();
    if (scheduleIds.length === 0) return result;

    try {
      const rows = await getPrisma().$queryRaw<any[]>(Prisma.sql`
        SELECT
          id,
          schedule_id AS "scheduleId",
          platform_id AS "platformId",
          rm_order_id AS "rmOrderId",
          rm_status AS "rmStatus",
          rm_response_message AS "rmResponseMessage",
          rm_resource_name AS "rmResourceName",
          last_synced_at AS "lastSyncedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM publishing_platform_orders
        WHERE schedule_id IN (${Prisma.join(scheduleIds)})
        ORDER BY id ASC
      `);
      for (const row of rows) {
        const list = result.get(row.scheduleId) || [];
        list.push(row);
        result.set(row.scheduleId, list);
      }
    } catch {
      return result;
    }

    return result;
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

    await this.assertPlatformsExist(request.platforms || []);

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

  async autoCreate(request: AutoCreatePublishingScheduleRequest, auth: AuthContext): Promise<AutoCreatePublishingScheduleResult> {
    const prisma = getPrisma();
    const articleIds = Array.from(new Set(request.article_ids));
    if (request.schedule_type === 'asap') {
      throw new BusinessError('自动发布第一版不支持尽快执行，请选择指定时间执行或指定时间之后执行');
    }

    const platforms = await prisma.publishingPlatform.findMany({
      where: { isFavorite: true },
      orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
    });
    if (platforms.length === 0) {
      throw new BusinessError('请先收藏至少一个发布平台');
    }

    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds }, deletedAt: null },
      include: {
        project: {
          include: {
            operators: true,
            company: { select: { status: true } },
          },
        },
      },
    });
    if (articles.length !== articleIds.length) {
      throw new NotFoundError('文章');
    }

    const invalidArticle = articles.find((article) => article.status !== 'approved');
    if (invalidArticle) {
      throw new BusinessError('只能为已审核通过的文章创建发布计划');
    }

    if (auth.role !== 'sysadmin') {
      const noAccess = articles.find((article) => {
        const hasProjectAccess = article.project?.operators?.some((op) => op.userId === auth.userId);
        return !hasProjectAccess || article.project?.status !== true || article.project?.company?.status !== true;
      });
      if (noAccess) {
        throw new ForbiddenError('无权为所选文章创建发布计划');
      }
    }

    const existingSchedules = await prisma.publishingSchedule.findMany({
      where: {
        articleId: { in: articleIds },
        deletedAt: null,
        status: { in: ['pending', 'publishing', 'published'] },
      },
      select: { articleId: true },
    });
    if (existingSchedules.length > 0) {
      throw new BusinessError('所选文章中存在已排期或已发布的文章，请取消选择后重试');
    }

    const assignments = articleIds.map((articleId, index) => ({
      articleId,
      platform: request.strategy === 'random'
        ? platforms[Math.floor(Math.random() * platforms.length)]
        : platforms[index % platforms.length],
    }));

    const createdSchedules = await prisma.$transaction(
      assignments.map(({ articleId, platform }) =>
        prisma.publishingSchedule.create({
          data: {
            articleId,
            platforms: [platform.name],
            scheduleType: request.schedule_type,
            scheduledPublishAt: request.scheduled_publish_at ? new Date(request.scheduled_publish_at) : null,
            status: 'pending',
            createdBy: auth.userId,
          },
        }),
      ),
    );

    return {
      created: createdSchedules.length,
      items: createdSchedules.map((schedule, index) => {
        const platform = assignments[index].platform;
        return {
          article_id: schedule.articleId,
          schedule_id: schedule.id,
          platform_id: platform.id,
          platform_name: platform.name,
        };
      }),
    };
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
    if (request.status !== undefined) {
      if (request.status === 'published') {
        await this.assertScheduleHasPublicationAnchor(existing.id, existing.articleId);
      }
      data.status = request.status;
    }

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

  async reject(id: number, auth: AuthContext, reason?: string): Promise<PublishingSchedule> {
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
        data: { status: 'publish_failed', rejectReason: reason ?? null },
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
