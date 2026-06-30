import { z } from 'zod';
import { EVIDENCE_CARD_SOURCE_TYPES, EVIDENCE_CARD_TYPES } from '../entity/evidence-card.entity';

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
}).strict();

export const deleteEvidenceCardsSchema = z.object({
  ids: z.array(z.number().int().positive(), { error: 'ids must be an array' })
    .min(1, 'ids is required')
    .max(200, 'ids must not exceed 200 items'),
}).strict();
