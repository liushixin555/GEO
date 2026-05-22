import { Request, Response } from 'express';
import { PublishingScheduleServiceImpl } from '../service/impl/publishing-schedule.service.impl';
import { success, fail, paginate } from '../utils';

const publishingScheduleService = new PublishingScheduleServiceImpl();

export async function listPublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

    const { userId, role } = req.user!;

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
  } catch (err: any) {
    fail(res, 500, err.message || '获取发布计划列表失败');
  }
}

export async function updatePublishingSchedule(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { scheduled_publish_at } = req.body;
    if (scheduled_publish_at !== undefined && scheduled_publish_at !== null && typeof scheduled_publish_at !== 'string') {
      fail(res, 400, 'scheduled_publish_at参数无效');
      return;
    }

    const { userId, role } = req.user!;
    const item = await publishingScheduleService.updateSchedule(id, scheduled_publish_at, userId, role);
    success(res, item, '更新发布计划成功');
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else if (err.message === '当前文章状态不可编辑发布计划') {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, err.message || '更新发布计划失败');
    }
  }
}
