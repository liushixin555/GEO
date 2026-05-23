import { Request, Response } from 'express';
import { PublishingScheduleServiceImpl } from '../service/impl/publishing-schedule.service.impl';
import { success, fail, paginate } from '../utils';

const publishingScheduleService = new PublishingScheduleServiceImpl();

const VALID_STATUSES = ['publishing', 'published', 'publish_failed'];

export async function listPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = req.query.search as string | undefined;

    const rawStatus = req.query.status as string | undefined;
    const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined;

    const rawProjectId = parseInt(req.query.projectId as string, 10);
    const projectId = !isNaN(rawProjectId) ? rawProjectId : undefined;

    const { list, total } = await publishingScheduleService.list({
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
    const message = err instanceof Error ? err.message : '获取发布计划列表失败';
    fail(res, 500, message || '获取发布计划列表失败');
  }
}

export async function updatePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未授权访问'); return; }
    const { userId, role } = req.user;

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的ID'); return; }

    const { scheduled_publish_at } = req.body;
    if (scheduled_publish_at !== undefined && scheduled_publish_at !== null) {
      if (typeof scheduled_publish_at !== 'string') {
        fail(res, 400, 'scheduled_publish_at参数无效');
        return;
      }
      if (scheduled_publish_at !== '' && isNaN(Date.parse(scheduled_publish_at))) {
        fail(res, 400, 'scheduled_publish_at日期格式无效');
        return;
      }
    }

    const item = await publishingScheduleService.updateSchedule(id, scheduled_publish_at, userId, role);
    success(res, item, '更新发布计划成功');
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === '文章不存在') {
        fail(res, 404, err.message);
      } else if (err.message === '当前文章状态不可编辑发布计划') {
        fail(res, 400, err.message);
      } else if (err.message === '无权操作此文章') {
        fail(res, 403, err.message);
      } else {
        fail(res, 500, '更新发布计划失败');
      }
    } else {
      fail(res, 500, '更新发布计划失败');
    }
  }
}
