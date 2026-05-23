import { Request, Response } from 'express';
import { SystemConfigServiceImpl } from '../service/impl/system-config.service.impl';
import { success, fail } from '../utils';

const systemConfigService = new SystemConfigServiceImpl();

// H-6: 允许修改的配置项白名单
const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
];

export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();
    success(res, items);
  } catch (_err: any) {
    fail(res, 500, '获取系统配置失败');
  }
}

export async function updateSystemConfigs(req: Request, res: Response): Promise<void> {
  try {
    const { configs } = req.body;
    if (!Array.isArray(configs) || configs.length === 0) {
      fail(res, 400, 'configs不能为空');
      return;
    }

    for (const c of configs) {
      if (!c.config_key || c.config_value === undefined) {
        fail(res, 400, 'config_key和config_value不能为空');
        return;
      }
      if (!ALLOWED_CONFIG_KEYS.includes(c.config_key)) {
        fail(res, 400, `不允许修改的配置项: ${c.config_key}`);
        return;
      }
    }

    const items = await systemConfigService.batchUpdate(req.body);
    success(res, items, '更新系统配置成功');
  } catch (_err: any) {
    fail(res, 500, '更新系统配置失败');
  }
}
