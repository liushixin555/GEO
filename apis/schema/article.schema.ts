import { z } from 'zod';

/** 文章状态枚举，与 Prisma ArticleStatus 一致 */
export const articleStatusSchema = z.enum([
  'draft',
  'manual_writing',
  'generating',
  'generate_failed',
  'pending_review',
  'publishing',
  'publish_failed',
  'published',
]);

export const createArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: z.string().max(50).optional(),
  write_mode: z.string().max(20).optional(),
  keywords: z.string().max(500).optional(),
  portrait: z.string().max(2000).optional(),
  images: z.array(z.string().max(2000)).max(20).nullable().optional(),
  platforms: z.array(z.string().max(100)).max(10).nullable().optional(),
  skills: z.array(z.number().int().nonnegative()).max(50).nullable().optional(),
  llm_model_id: z.number().int().nonnegative().nullable().optional(),
  content: z.string().max(500_000).optional(),
  status: z.enum(['draft', 'generating', 'manual_writing']).optional(),
}).strict();

export const updateArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: z.string().max(50).optional(),
  write_mode: z.string().max(20).optional(),
  keywords: z.string().max(500).optional(),
  portrait: z.string().max(2000).optional(),
  images: z.array(z.string().max(2000)).max(20).nullable().optional(),
  platforms: z.array(z.string().max(100)).max(10).nullable().optional(),
  skills: z.array(z.number().int().nonnegative()).max(50).nullable().optional(),
  llm_model_id: z.number().int().nonnegative().nullable().optional(),
  content: z.string().max(500_000).optional(),
  status: articleStatusSchema.optional(),
  scheduled_publish_at: z.string().datetime({ offset: true })
    .refine(val => new Date(val) > new Date(), '定时发布时间必须在未来')
    .nullable().optional(),
  schedule_type: z.enum(['asap', 'scheduled', 'after']).nullable().optional(),
}).strict();

export const reviewArticleSchema = z.object({
  approved: z.boolean(),
}).strict();

export const updateContentSchema = z.object({
  content: z.string().min(1).max(500_000),
}).strict();

export const listArticlesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: articleStatusSchema.optional(),
});
