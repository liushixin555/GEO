import { z } from 'zod';
import { ALLOWED_CONFIG_KEYS } from '../constants/system-config';

export const updateSystemConfigsSchema = z.object({
  configs: z.array(
    z.object({
      config_key: z.enum(ALLOWED_CONFIG_KEYS, { message: '包含不允许修改的配置项' }),
      config_value: z.string({ error: 'config_value不能为空' }).max(10000, 'config_value长度不能超过10000'),
    }),
  ).min(1, 'configs不能为空').max(50, '单次最多更新50条配置'),
}).strict();
