import { z } from 'zod';
import {
  EVIDENCE_ARTICLE_TYPES,
  EVIDENCE_CARD_SOURCE_TYPES,
  EVIDENCE_CARD_STATUSES,
  EVIDENCE_CARD_TYPES,
  EVIDENCE_SOURCE_QUALITIES,
  EXTRACT_EVIDENCE_CARD_SOURCE_TYPES,
} from '../entity/evidence-card.entity';

const title = z.string({ error: 'title is required' })
  .trim()
  .min(1, 'title is required')
  .max(300, 'title must not exceed 300 characters');

const content = z.string({ error: 'content is required' })
  .trim()
  .min(1, 'content is required')
  .max(5000, 'content must not exceed 5000 characters');

const nullableId = z.number()
  .int('id must be an integer')
  .positive('id must be positive')
  .nullable()
  .optional();

const sourceUrl = z.string()
  .trim()
  .max(1000, 'sourceUrl must not exceed 1000 characters')
  .nullable()
  .optional()
  .transform(v => v === '' ? null : v);

const score = z.number()
  .min(0, 'score must be at least 0')
  .max(1, 'score must not exceed 1')
  .nullable()
  .optional();

const keywords = z.array(
  z.string({ error: 'keywords must contain only strings' })
    .max(100, 'each keyword must not exceed 100 characters'),
  { error: 'keywords must be an array' },
)
  .max(30, 'keywords must not exceed 30 items')
  .nullable()
  .optional();

const articleTypes = z.array(
  z.enum(EVIDENCE_ARTICLE_TYPES, { error: 'invalid articleTypes item' }),
  { error: 'articleTypes must be an array' },
)
  .max(20, 'articleTypes must not exceed 20 items')
  .nullable()
  .optional();

export const createEvidenceCardSchema = z.object({
  companyId: nullableId,
  projectId: nullableId,
  title,
  content,
  evidenceType: z.enum(EVIDENCE_CARD_TYPES, { error: 'invalid evidenceType' }),
  sourceType: z.enum(EVIDENCE_CARD_SOURCE_TYPES, { error: 'invalid sourceType' }),
  sourceId: nullableId,
  sourceUrl,
  keywords,
  status: z.enum(EVIDENCE_CARD_STATUSES, { error: 'invalid status' }).optional(),
  sourceQuality: z.enum(EVIDENCE_SOURCE_QUALITIES, { error: 'invalid sourceQuality' }).optional(),
  articleTypes,
  confidenceScore: score,
  freshnessScore: score,
}).strict();

export const updateEvidenceCardSchema = z.object({
  companyId: nullableId,
  projectId: nullableId,
  title: title.optional(),
  content: content.optional(),
  evidenceType: z.enum(EVIDENCE_CARD_TYPES, { error: 'invalid evidenceType' }).optional(),
  sourceType: z.enum(EVIDENCE_CARD_SOURCE_TYPES, { error: 'invalid sourceType' }).optional(),
  sourceId: nullableId,
  sourceUrl,
  keywords,
  status: z.enum(EVIDENCE_CARD_STATUSES, { error: 'invalid status' }).optional(),
  sourceQuality: z.enum(EVIDENCE_SOURCE_QUALITIES, { error: 'invalid sourceQuality' }).optional(),
  articleTypes,
  confidenceScore: score,
  freshnessScore: score,
}).strict();

export const listEvidenceCardSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  companyId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  evidenceType: z.enum(EVIDENCE_CARD_TYPES, { error: 'invalid evidenceType' }).optional(),
  sourceType: z.enum(EVIDENCE_CARD_SOURCE_TYPES, { error: 'invalid sourceType' }).optional(),
  status: z.enum(EVIDENCE_CARD_STATUSES, { error: 'invalid status' }).optional(),
  sourceQuality: z.enum(EVIDENCE_SOURCE_QUALITIES, { error: 'invalid sourceQuality' }).optional(),
  articleType: z.enum(EVIDENCE_ARTICLE_TYPES, { error: 'invalid articleType' }).optional(),
}).strict();

export const deleteEvidenceCardsSchema = z.object({
  ids: z.array(z.number().int().positive(), { error: 'ids must be an array' })
    .min(1, 'ids is required')
    .max(200, 'ids must not exceed 200 items'),
}).strict();

const extractedEvidenceCardCandidateSchema = z.object({
  companyId: nullableId,
  projectId: nullableId,
  title,
  content,
  evidenceType: z.enum(EVIDENCE_CARD_TYPES, { error: 'invalid evidenceType' }),
  sourceType: z.enum(['manual', 'portrait', 'image'], { error: 'invalid candidate sourceType' }),
  sourceId: nullableId,
  sourceUrl,
  keywords,
  status: z.literal('draft').optional(),
  sourceQuality: z.enum(EVIDENCE_SOURCE_QUALITIES, { error: 'invalid sourceQuality' }).optional(),
  articleTypes,
  confidenceScore: score,
  freshnessScore: score,
  extractionReason: z.string().trim().max(1000).optional(),
  warnings: z.array(z.string().trim().max(500)).max(20).optional(),
}).strict();

export const extractEvidenceCardSchema = z.object({
  companyId: nullableId,
  projectId: nullableId,
  sourceType: z.enum(EXTRACT_EVIDENCE_CARD_SOURCE_TYPES, { error: 'invalid sourceType' }),
  sourceId: nullableId,
  text: z.string()
    .trim()
    .max(300000, 'text must not exceed 300000 characters')
    .optional(),
  save: z.boolean().default(false),
  candidates: z.array(extractedEvidenceCardCandidateSchema).max(20).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.sourceType === 'manual' && !value.text) {
    ctx.addIssue({
      code: 'custom',
      path: ['text'],
      message: 'text is required when sourceType is manual',
    });
  }

  if ((value.sourceType === 'portrait' || value.sourceType === 'image') && !value.sourceId) {
    ctx.addIssue({
      code: 'custom',
      path: ['sourceId'],
      message: 'sourceId is required when sourceType is portrait or image',
    });
  }
});
