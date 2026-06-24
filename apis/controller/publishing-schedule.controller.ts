import { Request, Response } from 'express';
import { createPublishingScheduleService, createArticleService, createPublishingOrderSyncService } from '../service';
import { success, fail, paginate, created } from '../utils';
import { getPrisma } from '../utils';
import { AppError } from '../errors';
import { logger } from '../utils/logger.util';
import { Role } from '../constants/roles';
import { mapPublishingPlatformOrder } from '../map';
import { Prisma } from '@prisma/client';

const scheduleService = createPublishingScheduleService();
const articleService = createArticleService();
const orderSyncService = createPublishingOrderSyncService();

export async function listPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    // validate 中间件已验证 req.query，直接使用
    const { page, pageSize, search, status, projectId } = req.query as any;

    const { list, total } = await scheduleService.list({
      page: Number(page), pageSize: Number(pageSize), search, status, projectId: projectId ?? undefined,
    }, { userId, role: role as Role });

    paginate(res, list, total, Number(page), Number(pageSize));
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('list_publishing_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '获取发布计划列表失败');
    }
  }
}

export async function createPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const { article_id, platforms, schedule_type, scheduled_publish_at } = req.body;
    const item = await scheduleService.create(
      { article_id, platforms, schedule_type, scheduled_publish_at },
      { userId, role: role as Role },
    );
    logger.info('publishing_schedule_created', { scheduleId: item.id, articleId: article_id, operatorId: userId, role });
    created(res, item, '创建发布计划成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('create_publishing_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '创建发布计划失败');
    }
  }
}

export async function autoCreatePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const result = await scheduleService.autoCreate(req.body, { userId, role: role as Role });
    logger.info('publishing_schedule_auto_created', { created: result.created, operatorId: userId, role });
    created(res, result, `已创建 ${result.created} 个发布计划`);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('auto_create_publishing_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '自动创建发布计划失败');
    }
  }
}

export async function updatePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const { schedule_type, scheduled_publish_at, status } = req.body;
    const item = await scheduleService.update(id, { schedule_type, scheduled_publish_at, status }, { userId, role: role as Role });
    success(res, item, '更新发布计划成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('update_publishing_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '更新发布计划失败');
    }
  }
}

export async function rejectPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const reason = (req.body as any)?.reason as string | undefined;
    const item = await scheduleService.reject(id, { userId, role: role as Role }, reason);
    logger.info('publishing_schedule_rejected', { scheduleId: id, operatorId: userId, role, reason: reason || '未提供原因' });
    success(res, item, '驳回成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('reject_publishing_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '驳回操作失败');
    }
  }
}

export async function deletePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    await scheduleService.delete(id, { userId, role: role as Role });
    logger.info('publishing_schedule_deleted', { scheduleId: id, operatorId: userId, role });
    success(res, null, '删除发布计划成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('delete_publishing_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '删除发布计划失败');
    }
  }
}

/** 获取可发布的文章列表（已审核通过的文章，供创建发布计划时选择） */
export async function listPublishingScheduleOrders(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const orders = await getPrisma().$queryRaw<any[]>(Prisma.sql`
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
      WHERE schedule_id = ${id}
      ORDER BY id ASC
    `);
    success(res, orders.map(mapPublishingPlatformOrder), '获取订单状态成功');
  } catch (err: unknown) {
    logger.error('list_publishing_schedule_orders_failed', { error: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '获取订单状态失败');
  }
}

export async function syncPublishingScheduleOrders(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const result = await orderSyncService.syncOrderByScheduleId(id);
    success(res, result, '同步订单状态完成');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('sync_publishing_schedule_orders_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '同步订单状态失败');
    }
  }
}

export async function listPublishableArticles(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    // validate 中间件已验证 req.query，直接使用
    const { page, pageSize, search, projectId } = req.query as any;

    // 使用 articleService 查询已审核通过的文章
    const { list, total } = await articleService.list(Number(projectId) || 0, Number(page), Number(pageSize), { userId, role: role as Role }, search as string | undefined, 'approved');
    paginate(res, list, total, Number(page), Number(pageSize));
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('list_publishable_articles_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '获取可发布文章列表失败');
    }
  }
}
