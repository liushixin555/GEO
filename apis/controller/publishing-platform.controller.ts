import { Request, Response } from 'express';
import type { IPublishingPlatformService } from '../service/publishing-platform.service';
import { PublishingPlatformServiceImpl } from '../service/impl/publishing-platform.service.impl';
import { success, fail, paginate } from '../utils';

const publishingPlatformService: IPublishingPlatformService = new PublishingPlatformServiceImpl();

const VALID_SORT_FIELDS = ['name', 'taxonomy', 'price', 'include_rate', 'publish_rate'];
const VALID_SORT_ORDERS = ['asc', 'desc'];
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

export async function syncPublishingPlatforms(req: Request, res: Response): Promise<void> {
  try {
    const count = await publishingPlatformService.syncFromSystemConfig();
    success(res, { count }, `同步成功，共 ${count} 个发布平台`);
  } catch (err: unknown) {
    const message = err instanceof Error && err.message.includes('请先配置')
      ? err.message
      : '同步发布平台失败';
    fail(res, message.includes('请先配置') ? 400 : 500, message);
  }
}

export async function listPublishingPlatforms(req: Request, res: Response): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const taxonomy = req.query.taxonomy as string | undefined;

    /** @deprecated 全量返回接口，前端应迁移到分页查询。预计移除时间: v2.0 */
    if (!req.query.page && !req.query.pageSize && !search && !taxonomy) {
      const items = await publishingPlatformService.listAll();
      success(res, items);
      return;
    }

    const rawPage = parseInt(req.query.page as string, 10);
    const rawPageSize = parseInt(req.query.pageSize as string, 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const pageSize = Number.isNaN(rawPageSize) || rawPageSize < 1 ? 10 : Math.min(rawPageSize, MAX_PAGE_SIZE);

    if (search && search.length > MAX_SEARCH_LENGTH) {
      fail(res, 400, `搜索关键词不能超过${MAX_SEARCH_LENGTH}个字符`);
      return;
    }

    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;

    if (sortBy && !VALID_SORT_FIELDS.includes(sortBy)) {
      fail(res, 400, '无效的排序字段');
      return;
    }
    if (sortOrder && !VALID_SORT_ORDERS.includes(sortOrder)) {
      fail(res, 400, '无效的排序方向');
      return;
    }

    const { list, total } = await publishingPlatformService.list(page, pageSize, search, taxonomy, sortBy, sortOrder);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    const message = err instanceof Error && err.message ? err.message : '获取发布平台失败';
    fail(res, 500, message);
  }
}
