import { z } from 'zod';

export const createProjectSchema = z.object({
  short_name: z.string({ error: '项目简称不能为空' }).min(1, '项目简称不能为空').max(100, '项目简称不能超过100个字符').trim(),
  full_name: z.string({ error: '项目全称不能为空' }).min(1, '项目全称不能为空').max(200, '项目全称不能超过200个字符').trim(),
  description: z.string().max(2000, '项目描述不能超过2000个字符').trim().optional(),
  company_id: z.number({ error: '公司ID不能为空' }).int().positive('公司ID必须为正整数').optional(),
  operator_ids: z.array(z.number().int().positive()).max(100).optional(),
  viewer_ids: z.array(z.number().int().positive()).max(100).optional(),
}).strict();

export const updateProjectSchema = z.object({
  short_name: z.string().min(1, '项目简称不能为空').max(100, '项目简称不能超过100个字符').trim().optional(),
  full_name: z.string().min(1, '项目全称不能为空').max(200, '项目全称不能超过200个字符').trim().optional(),
  description: z.string().max(2000, '项目描述不能超过2000个字符').trim().optional(),
  company_id: z.number().int().positive('公司ID必须为正整数').optional(),
  operator_ids: z.array(z.number().int().positive()).max(100).optional(),
  viewer_ids: z.array(z.number().int().positive()).max(100).optional(),
  status: z.boolean().optional(),
}).strict();
