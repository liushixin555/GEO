import { Request, Response } from 'express';
import { SystemConfigServiceImpl } from '../service/impl/system-config.service.impl';
import { success, fail } from '../utils';

const systemConfigService = new SystemConfigServiceImpl();

// H-6: 允许修改的配置项白名单
const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
] as const;

// 敏感配置项 — GET 接口返回时需要脱敏
const SENSITIVE_CONFIG_KEYS = new Set(['yishangshu_password']);

function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key) && value.length > 2) {
    return `${value.slice(0, 2)}****`;
  }
  return value;
}

export async function getSystemConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const items = await systemConfigService.getAll();
    const sanitized = items.map(item => ({
      ...item,
      config_value: maskSensitiveValue(item.config_key, item.config_value),
    }));
    success(res, sanitized);
  } catch (_err: unknown) {
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
    success(res, items, '更新系统配置成功');
  } catch (_err: unknown) {
    fail(res, 500, '更新系统配置失败');
  }
}
