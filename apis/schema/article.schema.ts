import { z } from 'zod';

/**
 * 文章内容生命周期状态（不含发布状态）
 * 发布状态由 PublishingSchedule 独立管理
 */
export const articleStatusSchema = z.enum([
  'draft',
  'manual_writing',
  'generating',
  'generate_failed',
  'pending_review',
  'approved',
]);

/** 文章类型枚举，与 Entity ArticleType 一致 */
export const articleTypeSchema = z.enum([
  '榜单排名',
  '方法论讲解',
  '案例分析',
  '行业洞察',
  '对比测评',
  '客户证言',
  'FAQ问答',
  '实操指南',
]);

/** 写作模式枚举，与 Entity WriteMode 一致 */
export const writeModeSchema = z.enum(['manual', 'ai']);

const ARTICLE_PROMPT_CONTEXT_MAX_LENGTH = 500_000;

export const createArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: articleTypeSchema.optional(),
  write_mode: writeModeSchema.optional(),
  keywords: z.string().max(500).optional(),
  portrait: z.string().max(ARTICLE_PROMPT_CONTEXT_MAX_LENGTH, '画像内容不能超过500000个字符').optional(),
  images: z.array(z.string().max(2000)).max(20).nullable().optional(),
  skills: z.array(z.number().int().nonnegative()).max(50).nullable().optional(),
  llm_model_id: z.number().int().nonnegative().nullable().optional(),
  content: z.string().max(500_000).optional(),
  status: z.enum(['draft', 'manual_writing', 'generating']).optional(),
}).strict();

export const batchCreateArticlesSchema = z.object({
  articles: z.array(createArticleSchema).min(1).max(20),
}).strict();

export const updateArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: articleTypeSchema.optional(),
  write_mode: writeModeSchema.optional(),
  keywords: z.string().max(500).optional(),
  portrait: z.string().max(ARTICLE_PROMPT_CONTEXT_MAX_LENGTH, '画像内容不能超过500000个字符').optional(),
  images: z.array(z.string().max(2000)).max(20).nullable().optional(),
  skills: z.array(z.number().int().nonnegative()).max(50).nullable().optional(),
  llm_model_id: z.number().int().nonnegative().nullable().optional(),
  content: z.string().max(500_000).optional(),
  status: articleStatusSchema.optional(),
}).strict();

export const reviewArticleSchema = z.object({
  approved: z.boolean(),
  comment: z.string().max(2000).optional(),
  reject_reason: z.enum(['quality', 'compliance', 'accuracy', 'other']).optional(),
}).strict();

export const regenerateArticleSchema = z.object({
  revision_instruction: z.string().trim().max(5000).optional(),
}).strict();

export const batchRegenerateArticlesSchema = z.object({
  article_ids: z.array(z.number().int().positive()).min(1).max(50),
  revision_instruction: z.string().trim().max(5000).optional(),
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
