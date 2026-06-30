import {
  CreateEvidenceCardRequest,
  EvidenceCard,
  EVIDENCE_ARTICLE_TYPES,
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

type ArticleEvidenceCardClient = {
  groupBy(args: any): Promise<any[]>;
};

function getEvidenceCardClient(): EvidenceCardClient {
  return (getPrisma() as any).evidenceCard as EvidenceCardClient;
}

function getArticleEvidenceCardClient(): ArticleEvidenceCardClient {
  return (getPrisma() as any).articleEvidenceCard as ArticleEvidenceCardClient;
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

export function normalizeEvidenceCardArticleTypes(input: unknown): string[] {
  if (!Array.isArray(input)) return ['general'];
  const allowed = new Set<string>(EVIDENCE_ARTICLE_TYPES);
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of input) {
    if (typeof item !== 'string') continue;
    const articleType = item.trim();
    if (!allowed.has(articleType) || seen.has(articleType)) continue;
    seen.add(articleType);
    normalized.push(articleType);
  }

  return normalized.length > 0 ? normalized : ['general'];
}

async function loadInjectionStats(ids: number[]): Promise<Map<number, { injectedCount: number; lastInjectedAt: Date | null }>> {
  const stats = new Map<number, { injectedCount: number; lastInjectedAt: Date | null }>();
  if (ids.length === 0) return stats;

  const client = getArticleEvidenceCardClient();
  const rows = await client.groupBy({
    by: ['evidenceCardId'],
    where: {
      evidenceCardId: { in: ids },
      usageType: 'injected',
    },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  for (const row of rows) {
    stats.set(row.evidenceCardId, {
      injectedCount: row._count?._all ?? 0,
      lastInjectedAt: row._max?.createdAt ?? null,
    });
  }

  return stats;
}

function mapEvidenceCard(item: any, injectionStats?: { injectedCount: number; lastInjectedAt: Date | null }): EvidenceCard {
  const keywords = normalizeEvidenceCardKeywords(item.keywords);
  const articleTypes = normalizeEvidenceCardArticleTypes(item.articleTypes ?? item.article_types);
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
    status: item.status ?? 'draft',
    sourceQuality: item.sourceQuality ?? item.source_quality ?? 'unknown',
    articleTypes,
    confidenceScore: item.confidenceScore ?? item.confidence_score ?? null,
    freshnessScore: item.freshnessScore ?? item.freshness_score ?? null,
    verifiedAt: item.verifiedAt ?? item.verified_at ?? null,
    verifiedBy: item.verifiedBy ?? item.verified_by ?? null,
    injectedCount: injectionStats?.injectedCount ?? 0,
    lastInjectedAt: injectionStats?.lastInjectedAt ?? null,
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
  if (params.status !== undefined) where.status = params.status;
  if (params.sourceQuality !== undefined) where.sourceQuality = params.sourceQuality;
  if (params.articleType !== undefined) {
    where.articleTypes = {
      array_contains: [params.articleType],
    };
  }
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { content: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

function toCreateData(request: CreateEvidenceCardRequest, actorUserId?: number): any {
  const data: any = {
    companyId: request.companyId ?? null,
    projectId: request.projectId ?? null,
    title: request.title,
    content: request.content,
    evidenceType: request.evidenceType,
    sourceType: request.sourceType,
    sourceId: request.sourceId ?? null,
    sourceUrl: request.sourceUrl ?? null,
    keywords: normalizeEvidenceCardKeywords(request.keywords),
    status: request.status ?? 'draft',
    sourceQuality: request.sourceQuality ?? 'unknown',
    articleTypes: normalizeEvidenceCardArticleTypes(request.articleTypes),
    confidenceScore: request.confidenceScore ?? 0.7,
    freshnessScore: request.freshnessScore ?? 0.7,
  };

  if (data.status === 'verified') {
    data.verifiedAt = new Date();
    data.verifiedBy = actorUserId ?? null;
  }

  return data;
}

function toUpdateData(request: UpdateEvidenceCardRequest, existing: any, actorUserId?: number): any {
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
  if (request.status !== undefined) data.status = request.status;
  if (request.sourceQuality !== undefined) data.sourceQuality = request.sourceQuality;
  if (request.articleTypes !== undefined) data.articleTypes = normalizeEvidenceCardArticleTypes(request.articleTypes);
  if (request.confidenceScore !== undefined) data.confidenceScore = request.confidenceScore ?? 0.7;
  if (request.freshnessScore !== undefined) data.freshnessScore = request.freshnessScore ?? 0.7;

  if (request.status === 'verified' && existing.status !== 'verified') {
    data.verifiedAt = new Date();
    data.verifiedBy = actorUserId ?? null;
  }

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
    const stats = await loadInjectionStats(items.map(item => item.id));
    return { list: items.map(item => mapEvidenceCard(item, stats.get(item.id))), total };
  }

  async getById(id: number): Promise<EvidenceCard> {
    const client = getEvidenceCardClient();
    const item = await client.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('EvidenceCard');
    const stats = await loadInjectionStats([id]);
    return mapEvidenceCard(item, stats.get(id));
  }

  async create(request: CreateEvidenceCardRequest, actorUserId?: number): Promise<EvidenceCard> {
    const client = getEvidenceCardClient();
    const item = await client.create({
      data: toCreateData(request, actorUserId),
    });
    return mapEvidenceCard(item);
  }

  async update(id: number, request: UpdateEvidenceCardRequest, actorUserId?: number): Promise<EvidenceCard> {
    const client = getEvidenceCardClient();
    const existing = await client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('EvidenceCard');
    const item = await client.update({
      where: { id },
      data: toUpdateData(request, existing, actorUserId),
    });
    const stats = await loadInjectionStats([id]);
    return mapEvidenceCard(item, stats.get(id));
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
