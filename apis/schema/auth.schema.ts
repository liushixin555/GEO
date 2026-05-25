import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string({ error: '用户名不能为空' })
    .trim()
    .min(1, '用户名不能为空')
    .max(100, '用户名不能超过100个字符'),
  password: z.string({ error: '密码不能为空' })
    .min(1, '密码不能为空')
    .max(200, '密码不能超过200个字符'),
});

export const saveSelectionSchema = z.object({
  company_id: z.number({ error: 'company_id 必须为正整数' })
    .int('company_id 必须为整数')
    .positive('company_id 必须为正数'),
  project_id: z.number()
    .int('project_id 必须为整数')
    .positive('project_id 必须为正数')
    .nullable()
    .optional(),
});
