import { Request, Response } from 'express';
import { createArticleService } from '../service';
import { success, fail, paginate } from '../utils';
import { AppError } from '../errors';
import { PUBLISH_STATUSES } from '../constants/publish-statuses';

export async function listPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = req.query.search as string | undefined;

    const rawStatus = req.query.status as string | undefined;
    const status = rawStatus && (PUBLISH_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : undefined;

    const rawProjectId = parseInt(req.query.projectId as string, 10);
    const projectId = !isNaN(rawProjectId) ? rawProjectId : undefined;

    const articleService = createArticleService();
    const { list, total } = await articleService.listPublishingSchedule({
      page,
      pageSize,
      search,
      status,
      projectId,
      userId,
      role,
    });

    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      console.error('[PublishingScheduleController] listPublishingSchedule failed:', err);
      fail(res, 500, '获取发布计划列表失败');
    }
  }
}

export async function updatePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const { scheduled_publish_at, schedule_type } = req.body;

    const articleService = createArticleService();
    const item = await articleService.updateSchedule(id, scheduled_publish_at ?? null, schedule_type ?? null, userId, role);
    success(res, item, '更新发布计划成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      console.error('[PublishingScheduleController] updatePublishingSchedule failed:', err);
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

    const articleService = createArticleService();
    const item = await articleService.rejectPublish(id, { userId, role });
    success(res, item, '驳回成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      console.error('[PublishingScheduleController] rejectPublishingSchedule failed:', err);
      fail(res, 500, '驳回操作失败');
    }
  }
}
