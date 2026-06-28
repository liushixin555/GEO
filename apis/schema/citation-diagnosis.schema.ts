import { z } from 'zod';

export const listCitationDiagnosisSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  projectId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(50).optional(),
});

export const createPublishedArticleLinkSchema = z.object({
  article_id: z.number().int().positive(),
  schedule_id: z.number().int().positive().nullable().optional(),
  platform_name: z.string().trim().max(200).nullable().optional(),
  url: z.string().trim().min(1).max(1000),
}).strict();

export const createCitationDetectionRunSchema = z.object({
  project_id: z.number().int().positive().nullable().optional(),
  model_name: z.string().trim().min(1).max(100),
  prompt: z.string().trim().max(5000).nullable().optional(),
  answer: z.string().trim().max(20000).nullable().optional(),
  sources: z.array(z.object({
    url: z.string().trim().min(1).max(1000),
    title: z.string().trim().max(500).nullable().optional(),
  }).strict()).min(1).max(100),
}).strict();

export const runAutomaticCitationDetectionSchema = z.object({
  project_id: z.number().int().positive().nullable().optional(),
  article_ids: z.array(z.number().int().positive()).max(50).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  question_count: z.number().int().min(1).max(5).optional(),
  platforms: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  force: z.boolean().optional(),
}).strict();
