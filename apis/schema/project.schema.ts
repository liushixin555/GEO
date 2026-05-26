import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('无效的项目ID'),
});

export const listProjectSchema = z.object({
  page: z.coerce.number().int().min(1, '页码最小为1').max(10000, '页码最大为10000').default(1),
  pageSize: z.coerce.number().int().min(1, '每页条数最小为1').max(100, '每页条数最大为100').default(10),
  search: z.string().max(100, '搜索关键词不能超过100个字符').optional(),
  company_id: z.coerce.number().int().positive('公司ID必须为正整数').optional(),
  status: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
});

export const createProjectSchema = z.object({
  short_name: z.string({ error: '项目简称不能为空' }).min(1, '项目简称不能为空').max(50, '项目简称不能超过50个字符').trim(),
  full_name: z.string({ error: '项目全称不能为空' }).min(1, '项目全称不能为空').max(200, '项目全称不能超过200个字符').trim(),
  description: z.string().max(500, '项目描述不能超过500个字符').trim().nullable().optional(),
  company_id: z.number({ error: '公司ID不能为空' }).int().positive('公司ID必须为正整数').optional(),
  operator_ids: z.array(z.number().int().positive()).max(100).optional(),
  viewer_ids: z.array(z.number().int().positive()).max(100).optional(),
}).strict();

export const updateProjectSchema = z.object({
  short_name: z.string().min(1, '项目简称不能为空').max(50, '项目简称不能超过50个字符').trim().optional(),
  full_name: z.string().min(1, '项目全称不能为空').max(200, '项目全称不能超过200个字符').trim().optional(),
  description: z.string().max(500, '项目描述不能超过500个字符').trim().nullable().optional(),
  company_id: z.number().int().positive('公司ID必须为正整数').optional(),
  operator_ids: z.array(z.number().int().positive()).max(100).optional(),
  viewer_ids: z.array(z.number().int().positive()).max(100).optional(),
  status: z.boolean().optional(),
}).strict();
