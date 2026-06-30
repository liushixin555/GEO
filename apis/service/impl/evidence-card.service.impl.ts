import {
  CreateEvidenceCardRequest,
  EvidenceCard,
  EvidenceCardListParams,
  UpdateEvidenceCardRequest,
} from '../../entity';
import { NotFoundError } from '../../errors';
import { getPrisma } from '../../utils';
import { IEvidenceCardService } from '../evidence-card.service';

type EvidenceCardClient = {
  findMany(args: any): Promise<any[]>;
  count(args: any): Promise<number>;
  findFirst(args: any): Promise<any | null>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<{ count: number }>;
};

function getEvidenceCardClient(): EvidenceCardClient {
  return (getPrisma() as any).evidenceCard as EvidenceCardClient;
}

export function normalizeEvidenceCardKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of input) {
    if (typeof item !== 'string') continue;
    const keyword = item.trim();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    normalized.push(keyword);
  }

  return normalized;
}

function mapEvidenceCard(item: any): EvidenceCard {
  const keywords = normalizeEvidenceCardKeywords(item.keywords);
  return {
    id: item.id,
    companyId: item.companyId ?? item.company_id ?? null,
    projectId: item.projectId ?? item.project_id ?? null,
    title: item.title,
    content: item.content,
    evidenceType: item.evidenceType ?? item.evidence_type,
    sourceType: item.sourceType ?? item.source_type,
    sourceId: item.sourceId ?? item.source_id ?? null,
    sourceUrl: item.sourceUrl ?? item.source_url ?? null,
    keywords,
    confidenceScore: item.confidenceScore ?? item.confidence_score ?? null,
    freshnessScore: item.freshnessScore ?? item.freshness_score ?? null,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
    deletedAt: item.deletedAt ?? item.deleted_at ?? null,
  };
}

function buildWhere(params: EvidenceCardListParams): any {
  const where: any = { deletedAt: null };
  if (params.companyId !== undefined) where.companyId = params.companyId;
  if (params.projectId !== undefined) where.projectId = params.projectId;
  if (params.evidenceType !== undefined) where.evidenceType = params.evidenceType;
  if (params.sourceType !== undefined) where.sourceType = params.sourceType;
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { content: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

function toCreateData(request: CreateEvidenceCardRequest): any {
  return {
    companyId: request.companyId ?? null,
    projectId: request.projectId ?? null,
    title: request.title,
    content: request.content,
    evidenceType: request.evidenceType,
    sourceType: request.sourceType,
    sourceId: request.sourceId ?? null,
    sourceUrl: request.sourceUrl ?? null,
    keywords: normalizeEvidenceCardKeywords(request.keywords),
    confidenceScore: request.confidenceScore ?? null,
    freshnessScore: request.freshnessScore ?? null,
  };
}

function toUpdateData(request: UpdateEvidenceCardRequest): any {
  const data: any = {};
  if (request.companyId !== undefined) data.companyId = request.companyId;
  if (request.projectId !== undefined) data.projectId = request.projectId;
  if (request.title !== undefined) data.title = request.title;
  if (request.content !== undefined) data.content = request.content;
  if (request.evidenceType !== undefined) data.evidenceType = request.evidenceType;
  if (request.sourceType !== undefined) data.sourceType = request.sourceType;
  if (request.sourceId !== undefined) data.sourceId = request.sourceId;
  if (request.sourceUrl !== undefined) data.sourceUrl = request.sourceUrl;
  if (request.keywords !== undefined) data.keywords = normalizeEvidenceCardKeywords(request.keywords);
  if (request.confidenceScore !== undefined) data.confidenceScore = request.confidenceScore;
  if (request.freshnessScore !== undefined) data.freshnessScore = request.freshnessScore;
  return data;
}

export class EvidenceCardServiceImpl implements IEvidenceCardService {
  async list(params: EvidenceCardListParams): Promise<{ list: EvidenceCard[]; total: number }> {
    const client = getEvidenceCardClient();
    const where = buildWhere(params);
    const [items, total] = await Promise.all([
      client.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      client.count({ where }),
    ]);
    return { list: items.map(mapEvidenceCard), total };
  }

  async getById(id: number): Promise<EvidenceCard> {
    const client = getEvidenceCardClient();
    const item = await client.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('EvidenceCard');
    return mapEvidenceCard(item);
  }

  async create(request: CreateEvidenceCardRequest): Promise<EvidenceCard> {
    const client = getEvidenceCardClient();
    const item = await client.create({
      data: toCreateData(request),
    });
    return mapEvidenceCard(item);
  }

  async update(id: number, request: UpdateEvidenceCardRequest): Promise<EvidenceCard> {
    const client = getEvidenceCardClient();
    const existing = await client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('EvidenceCard');
    const item = await client.update({
      where: { id },
      data: toUpdateData(request),
    });
    return mapEvidenceCard(item);
  }

  async deleteMany(ids: number[]): Promise<number> {
    const client = getEvidenceCardClient();
    const result = await client.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count;
  }
}
