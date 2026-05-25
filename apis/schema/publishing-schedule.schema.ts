import { z } from 'zod';

export const updatePublishingScheduleSchema = z.object({
  scheduled_publish_at: z.string({ error: 'scheduled_publish_at参数无效' }).refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'scheduled_publish_at日期格式无效' },
  ).nullable().optional(),
  schedule_type: z.enum(['asap', 'scheduled', 'after'], { message: '排期类型必须是 asap/scheduled/after' }).nullable().optional(),
}).strict();

export const rejectPublishingScheduleSchema = z.object({
  reason: z.string().max(500).optional(),
}).strict().optional();
