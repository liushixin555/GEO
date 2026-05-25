import { Request, Response } from 'express';
import { SystemConfigServiceImpl } from '../service/impl/system-config.service.impl';
import { success, fail } from '../utils';
import { logger } from '../utils/logger.util';
import { ALLOWED_CONFIG_KEYS, SENSITIVE_CONFIG_KEYS } from '../constants/system-config';

const systemConfigService = new SystemConfigServiceImpl();

function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key)) {
    return value.length > 2 ? `${value.slice(0, 2)}****` : '****';
  }
  return value;
}

function sanitizeConfigItems(items: { config_key: string; config_value: string }[]) {
  return items.map(item => ({
    ...item,
    config_value: maskSensitiveValue(item.config_key, item.config_value),
  }));
}

export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();
    success(res, sanitizeConfigItems(items));
  } catch (err: unknown) {
    logger.error('获取系统配置失败', { error: err instanceof Error ? err.message : String(err) });
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
        fail(res, 400, '包含不允许修改的配置项');
        return;
      }
    }

    const items = await systemConfigService.batchUpdate({ configs });

    logger.info('系统配置更新', {
      userId: (req as any).user?.userId,
      keys: configs.map((c: { config_key: string }) => c.config_key),
    });

    success(res, sanitizeConfigItems(items), '更新系统配置成功');
  } catch (err: unknown) {
    logger.error('更新系统配置失败', { error: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '更新系统配置失败');
  }
}
