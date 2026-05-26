import { z } from 'zod';

export const createPublishingScheduleSchema = z.object({
  article_id: z.number({ message: 'article_id参数无效' }).int().positive('article_id必须为正整数'),
  platforms: z.array(z.string().max(200)).min(1, '至少选择一个发布平台').max(20),
  schedule_type: z.enum(['asap', 'scheduled', 'after'], { message: '排期类型必须是 asap/scheduled/after' }),
  scheduled_publish_at: z.string({ message: 'scheduled_publish_at参数无效' })
    .refine((v) => !isNaN(Date.parse(v)), { message: 'scheduled_publish_at日期格式无效' })
    .nullable()
    .optional(),
}).strict().refine(
  (data) => {
    if ((data.schedule_type === 'scheduled' || data.schedule_type === 'after') && !data.scheduled_publish_at) {
      return false;
    }
    return true;
  },
  { message: '指定时间执行和延时执行必须选择时间', path: ['scheduled_publish_at'] },
);

export const updatePublishingScheduleSchema = z.object({
  schedule_type: z.enum(['asap', 'scheduled', 'after'], { message: '排期类型必须是 asap/scheduled/after' }).nullable().optional(),
  scheduled_publish_at: z.string({ message: 'scheduled_publish_at参数无效' }).refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'scheduled_publish_at日期格式无效' },
  ).nullable().optional(),
  status: z.enum(['pending', 'publishing', 'published', 'publish_failed']).optional(),
}).strict();

export const rejectPublishingScheduleSchema = z.object({
  reason: z.string().max(500).optional(),
}).strict().optional();

export const listPublishingScheduleSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['pending', 'publishing', 'published', 'publish_failed']).optional(),
  projectId: z.coerce.number().int().positive().optional(),
});

export const listPublishableArticlesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  projectId: z.coerce.number().int().positive().optional(),
});
