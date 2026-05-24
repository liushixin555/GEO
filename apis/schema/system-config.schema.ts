import { z } from 'zod';

const ALLOWED_KEYS = ['yishangshu_username', 'yishangshu_password'] as const;

export const updateSystemConfigsSchema = z.object({
  configs: z.array(
    z.object({
      config_key: z.enum(ALLOWED_KEYS, { message: '包含不允许修改的配置项' }),
      config_value: z.string({ error: 'config_value不能为空' }),
    }),
  ).min(1, 'configs不能为空'),
}).strict();
