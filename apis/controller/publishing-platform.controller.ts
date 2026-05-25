import { Request, Response } from 'express';
import type { IPublishingPlatformService } from '../service/publishing-platform.service';
import { PublishingPlatformServiceImpl } from '../service/impl/publishing-platform.service.impl';
import { BusinessError } from '../errors';
import { success, fail, paginate } from '../utils';
import { parsePagination } from '../utils/pagination.util';
import { logger } from '../utils/logger.util';

const publishingPlatformService: IPublishingPlatformService = new PublishingPlatformServiceImpl();

// 排序字段白名单 — PublishingPlatform Entity 的可排序字段子集
// Entity 另有 id, rmResourceId, remark, createdAt, updatedAt 字段不支持排序
const VALID_SORT_FIELDS = ['name', 'taxonomy', 'price', 'include_rate', 'publish_rate'];
const VALID_SORT_ORDERS = ['asc', 'desc'];
const MAX_SEARCH_LENGTH = 100;

let syncLock = false;

function qp(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function syncPublishingPlatforms(req: Request, res: Response): Promise<void> {
  const operator = { userId: req.user?.userId, username: req.user?.username, role: req.user?.role, ip: req.ip };
  logger.info('publishing-platform.sync.start', operator);

  if (syncLock) {
    logger.warn('publishing-platform.sync.conflict', operator);
    fail(res, 409, '同步操作正在进行中，请稍后重试');
    return;
  }
  syncLock = true;

  try {
    const count = await publishingPlatformService.syncFromSystemConfig();
    logger.info('publishing-platform.sync.success', { ...operator, count });
    success(res, { count }, `同步成功，共 ${count} 个发布平台`);
  } catch (err: unknown) {
    if (err instanceof BusinessError) {
      logger.warn('publishing-platform.sync.business-error', { ...operator, err: err.message });
      fail(res, err.statusCode, err.message);
    } else {
      logger.error('publishing-platform.sync.failed', { ...operator, err: err instanceof Error ? err.message : String(err) });
      fail(res, 500, '同步发布平台失败');
    }
  } finally {
    syncLock = false;
  }
}

export async function listPublishingPlatforms(req: Request, res: Response): Promise<void> {
  try {
    const search = qp(req.query.search as string | string[] | undefined)?.trim() || undefined;
    const taxonomy = qp(req.query.taxonomy as string | string[] | undefined);

    /** @deprecated 全量返回接口，前端应迁移到分页查询。预计移除时间: v2.0 */
    if (!req.query.page && !req.query.pageSize && !search && !taxonomy) {
      const items = await publishingPlatformService.listAll();
      success(res, items);
      return;
    }

    const { page, pageSize } = parsePagination(req.query.page, req.query.pageSize);

    if (search && search.length > MAX_SEARCH_LENGTH) {
      fail(res, 400, `搜索关键词不能超过${MAX_SEARCH_LENGTH}个字符`);
      return;
    }

    if (taxonomy && taxonomy.length > MAX_SEARCH_LENGTH) {
      fail(res, 400, `分类筛选不能超过${MAX_SEARCH_LENGTH}个字符`);
      return;
    }

    const sortBy = qp(req.query.sortBy as string | string[] | undefined);
    const sortOrder = qp(req.query.sortOrder as string | string[] | undefined);

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
    logger.error('publishing-platform.list.failed', { err: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '获取发布平台失败');
  }
}
