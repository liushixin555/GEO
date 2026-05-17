import { Request, Response } from 'express';
import { PublishingPlatformServiceImpl, SystemConfigServiceImpl } from '../service';
import { success, fail } from '../utils';

const publishingPlatformService = new PublishingPlatformServiceImpl();
const systemConfigService = new SystemConfigServiceImpl();

export async function syncPublishingPlatforms(_req: Request, res: Response): Promise<void> {
  try {
    // Get RM credentials from system config
    const configs = await systemConfigService.getAll();
    const configMap = new Map(configs.map((c) => [c.config_key, c.config_value]));
    const username = configMap.get('ruanmeng_username') || '';
    const password = configMap.get('ruanmeng_password') || '';

    if (!username || !password) {
      fail(res, 400, '请先配置软盟账号和密码');
      return;
    }

    const count = await publishingPlatformService.syncFromRm(username, password);
    success(res, { count }, `同步成功，共 ${count} 个发布平台`);
  } catch (err: any) {
    fail(res, 500, err.message || '同步发布平台失败');
  }
}

export async function listPublishingPlatforms(_req: Request, res: Response): Promise<void> {
  try {
    const items = await publishingPlatformService.listAll();
    success(res, items);
  } catch (err: any) {
    fail(res, 500, err.message || '获取发布平台失败');
  }
}
