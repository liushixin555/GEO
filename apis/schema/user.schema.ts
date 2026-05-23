import { z } from 'zod';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200).optional(),
  role: z.enum(['sysadmin', 'admin', 'view']).optional(),
  status: z.enum(['true', 'false']).optional().transform(v =>
    v === undefined ? undefined : v === 'true'
  ),
});

export const createUserSchema = z.object({
  username: z.string({ error: '用户名不能为空' }).min(1, '用户名不能为空').max(50, '用户名不能超过50个字符'),
  password: z.string({ error: '密码不能为空' }).min(8, '密码长度不能少于8位').max(128, '密码不能超过128个字符'),
  cn_name: z.string({ error: '姓名不能为空' }).min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  role: z.enum(['sysadmin', 'admin', 'view'], { message: '角色值不合法' }),
  company_id: z.number().int().positive().optional(),
}).strict();

export const updateUserSchema = z.object({
  cn_name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符').optional(),
  role: z.enum(['sysadmin', 'admin', 'view'], { message: '角色值不合法' }).optional(),
  status: z.boolean().optional(),
  password: z.string().min(8, '密码长度不能少于8位').max(128, '密码不能超过128个字符').optional(),
}).strict();
