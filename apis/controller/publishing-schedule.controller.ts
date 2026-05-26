import { Request, Response } from 'express';
import { createPublishingScheduleService, createArticleService } from '../service';
import { success, fail, paginate, created } from '../utils';
import { AppError } from '../errors';
import { logger } from '../utils/logger.util';
import { PUBLISH_SCHEDULE_STATUSES } from '../constants/publish-statuses';
import { Role } from '../constants/roles';

const scheduleService = createPublishingScheduleService();
const articleService = createArticleService();

export async function listPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = req.query.search as string | undefined;

    const rawStatus = req.query.status as string | undefined;
    const status = rawStatus && (PUBLISH_SCHEDULE_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : undefined;

    const rawProjectId = parseInt(req.query.projectId as string, 10);
    const projectId = !isNaN(rawProjectId) ? rawProjectId : undefined;

    const { list, total } = await scheduleService.list({
      page, pageSize, search, status, projectId, userId, role,
    });

    paginate(res, list, total, page, pageSize);
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

    const item = await scheduleService.reject(id, { userId, role: role as Role });
    logger.info('publishing_schedule_rejected', { scheduleId: id, operatorId: userId, role });
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
export async function listPublishableArticles(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const search = req.query.search as string | undefined;
    const rawProjectId = parseInt(req.query.projectId as string, 10);
    const projectId = !isNaN(rawProjectId) ? rawProjectId : undefined;

    // 使用 articleService 查询已审核通过的文章
    const { list, total } = await articleService.list(projectId ?? 0, page, pageSize, { userId, role: role as Role }, search, 'approved');
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('list_publishable_articles_failed', { error: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '获取可发布文章列表失败');
    }
  }
}
