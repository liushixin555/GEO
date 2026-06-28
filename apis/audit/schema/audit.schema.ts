import { z } from 'zod';

/** 诊断列表查询参数 */
export const listAuditsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['processing', 'complete', 'failed']).optional(),
  search: z.string().max(200).optional(),
});

/** 品牌自动检测入参 */
export const detectSchema = z.object({
  website: z
    .string()
    .min(1, '网址不能为空')
    .max(500, '网址过长')
    .refine(
      (v) => /^https?:\/\//i.test(v) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(v),
      '网址格式不正确'
    ),
});

/** 创建诊断任务入参 */
export const createAuditSchema = z.object({
  website: z.string().max(500).optional(),
  brand: z.string().min(1, '品牌名不能为空').max(200),
  industry: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  competitors: z.array(z.string().max(200)).max(20).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  features: z.array(z.string().max(200)).max(30).optional(),
  suggestedPrompts: z.array(z.string().max(500)).max(20).optional(),
  tier: z.enum(['free', 'pro']).default('pro'),
});
