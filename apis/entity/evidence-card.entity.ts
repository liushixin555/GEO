export const EVIDENCE_CARD_TYPES = [
  'fact',
  'case',
  'method',
  'capability',
  'faq',
  'statistic',
  'quote',
  'image_description',
  'external',
] as const;

export const EVIDENCE_CARD_SOURCE_TYPES = [
  'portrait',
  'document',
  'image',
  'manual',
  'external',
] as const;

export type EvidenceCardType = typeof EVIDENCE_CARD_TYPES[number];
export type EvidenceCardSourceType = typeof EVIDENCE_CARD_SOURCE_TYPES[number];

export interface EvidenceCard {
  id: number;
  companyId: number | null;
  projectId: number | null;
  title: string;
  content: string;
  evidenceType: EvidenceCardType;
  sourceType: EvidenceCardSourceType;
  sourceId: number | null;
  sourceUrl: string | null;
  keywords: string[];
  confidenceScore: number | null;
  freshnessScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface EvidenceCardListParams {
  page: number;
  pageSize: number;
  search?: string;
  companyId?: number;
  projectId?: number;
  evidenceType?: EvidenceCardType;
  sourceType?: EvidenceCardSourceType;
}

export interface CreateEvidenceCardRequest {
  companyId?: number | null;
  projectId?: number | null;
  title: string;
  content: string;
  evidenceType: EvidenceCardType;
  sourceType: EvidenceCardSourceType;
  sourceId?: number | null;
  sourceUrl?: string | null;
  keywords?: string[] | null;
  confidenceScore?: number | null;
  freshnessScore?: number | null;
}

export interface UpdateEvidenceCardRequest {
  companyId?: number | null;
  projectId?: number | null;
  title?: string;
  content?: string;
  evidenceType?: EvidenceCardType;
  sourceType?: EvidenceCardSourceType;
  sourceId?: number | null;
  sourceUrl?: string | null;
  keywords?: string[] | null;
  confidenceScore?: number | null;
  freshnessScore?: number | null;
}
