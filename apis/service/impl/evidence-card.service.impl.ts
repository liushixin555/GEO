import {
  CreateEvidenceCardRequest,
  EvidenceCard,
  EVIDENCE_ARTICLE_TYPES,
  EvidenceCardListParams,
  ExtractedEvidenceCardCandidate,
  ExtractEvidenceCardRequest,
  ExtractEvidenceCardsResult,
  UpdateEvidenceCardRequest,
} from '../../entity';
import { BusinessError, ForbiddenError, NotFoundError } from '../../errors';
import { extractEvidenceCandidates, getPrisma } from '../../utils';
import { IEvidenceCardService } from '../evidence-card.service';

type EvidenceCardClient = {
  findMany(args: any): Promise<any[]>;
  count(args: any): Promise<number>;
  findFirst(args: any): Promise<any | null>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<{ count: number }>;
};

type ExtractionSource = {
  text: string;
  sourceId: number | null;
  sourceUrl?: string | null;
  warnings: string[];
  companyId?: number | null;
  projectId?: number | null;
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

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

const MIN_EXTRACTED_CONTENT_LENGTH = 80;
const TARGET_EXTRACTED_CONTENT_LENGTH = 250;

function compactTextLength(value: string): number {
  return value.replace(/\s+/g, '').length;
}

function mergeShortEvidenceBlocks(blocks: string[], maxBlocks = 10): string[] {
  const merged: string[] = [];
  let buffer = '';

  for (const block of blocks) {
    const candidate = buffer ? `${buffer}\n${block}` : block;
    const candidateLength = compactTextLength(candidate);

    if (!buffer || candidateLength <= TARGET_EXTRACTED_CONTENT_LENGTH) {
      buffer = candidate;
      if (candidateLength >= MIN_EXTRACTED_CONTENT_LENGTH) {
        merged.push(buffer);
        buffer = '';
      }
    } else {
      merged.push(buffer);
      buffer = block;
    }

    if (merged.length >= maxBlocks) break;
  }

  if (buffer && merged.length < maxBlocks) {
    merged.push(buffer);
  }

  return merged
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, maxBlocks);
}

function splitEvidenceBlocks(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(item => item.length >= 20);

  if (paragraphs.length > 0) return mergeShortEvidenceBlocks(paragraphs);

  const sentences = normalized
    .split(/(?<=[。！？.!?])\s*/)
    .map(item => item.trim())
    .filter(item => item.length >= 20)
    .slice(0, 30);

  return mergeShortEvidenceBlocks(sentences);
}

const GENERIC_MARKETING_PATTERNS = [
  /专业可靠/g,
  /经验丰富/g,
  /助力企业发展/g,
  /提升竞争力/g,
  /行业领先/g,
  /优质服务/g,
  /一站式解决方案/g,
  /高效赋能/g,
  /深受客户信赖/g,
];

const CONCRETE_EVIDENCE_PATTERNS = [
  /方法|流程|步骤|框架|路径/,
  /客户|案例|项目|场景|问题|痛点/,
  /数据|比例|增长|下降|统计|检测|诊断/,
  /服务|能力|交付|审核|发布|引用|知识库|证据/,
  /适合|不适合|相比|区别|边界/,
];

function hasConcreteEvidence(value: string): boolean {
  return CONCRETE_EVIDENCE_PATTERNS.some(pattern => pattern.test(value));
}

function isGenericMarketingOnly(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  const hasMarketing = GENERIC_MARKETING_PATTERNS.some(pattern => pattern.test(compact));
  return hasMarketing && !hasConcreteEvidence(compact);
}

function normalizeCandidate(candidate: ExtractedEvidenceCardCandidate, request: ExtractEvidenceCardRequest, source: ExtractionSource): ExtractedEvidenceCardCandidate | null {
  const title = truncateText(normalizeWhitespace(candidate.title || ''), 300);
  const content = truncateText(normalizeWhitespace(candidate.content || ''), 5000);
  if (!title || !content) return null;
  if (content.length < 20 && !hasConcreteEvidence(`${title}\n${content}`)) return null;
  if (isGenericMarketingOnly(`${title}\n${content}`)) return null;

  return {
    companyId: candidate.companyId ?? request.companyId ?? source.companyId ?? null,
    projectId: candidate.projectId ?? request.projectId ?? source.projectId ?? null,
    title,
    content,
    evidenceType: candidate.evidenceType || (request.sourceType === 'image' ? 'image_description' : inferEvidenceType(content)),
    sourceType: candidate.sourceType || request.sourceType,
    sourceId: candidate.sourceId ?? source.sourceId,
    sourceUrl: candidate.sourceUrl ?? source.sourceUrl ?? null,
    keywords: normalizeEvidenceCardKeywords(candidate.keywords).slice(0, 30),
    status: 'draft',
    sourceQuality: candidate.sourceQuality ?? (request.sourceType === 'manual' ? 'manual' : request.sourceType),
    articleTypes: normalizeEvidenceCardArticleTypes(candidate.articleTypes),
    confidenceScore: Math.min(1, Math.max(0, candidate.confidenceScore ?? 0.7)),
    freshnessScore: Math.min(1, Math.max(0, candidate.freshnessScore ?? 0.7)),
    extractionReason: candidate.extractionReason,
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.filter(item => typeof item === 'string').slice(0, 20) : undefined,
  };
}

function cleanCandidates(candidates: ExtractedEvidenceCardCandidate[], request: ExtractEvidenceCardRequest, source: ExtractionSource, warnings: string[]): ExtractedEvidenceCardCandidate[] {
  const seen = new Set<string>();
  const cleaned: ExtractedEvidenceCardCandidate[] = [];
  let dropped = 0;

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate, request, source);
    if (!normalized) {
      dropped += 1;
      continue;
    }
    const key = `${normalized.title}\n${normalized.content}`;
    if (seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    cleaned.push(normalized);
    if (cleaned.length >= 8) break;
  }

  if (dropped > 0) warnings.push(`${dropped} low-value or duplicate evidence candidates were filtered`);
  return cleaned;
}

function buildCandidateTitle(content: string, index: number): string {
  const firstLine = content.split('\n').map(line => line.trim()).find(Boolean) || content;
  const clean = firstLine.replace(/^#+\s*/, '').replace(/^[\d]+[.、\s]+/, '').trim();
  return truncateText(clean || `EvidenceCard ${index + 1}`, 80);
}

function inferEvidenceType(content: string): ExtractedEvidenceCardCandidate['evidenceType'] {
  if (/案例|客户|项目|交付|实践|case/i.test(content)) return 'case';
  if (/方法|流程|步骤|框架|路径|method/i.test(content)) return 'method';
  if (/能力|服务|支持|提供|capability/i.test(content)) return 'capability';
  if (/问题|如何|为什么|faq|Q[:：]/i.test(content)) return 'faq';
  if (/%|比例|增长|下降|统计|数据|stat/i.test(content)) return 'statistic';
  if (/“|”|"|quote/i.test(content)) return 'quote';
  return 'fact';
}

function inferKeywords(content: string, title: string): string[] {
  const stopWords = new Set(['一个', '一种', '这个', '这些', '以及', '通过', '进行', '可以', '需要', '包括', '提供', '实现']);
  const text = `${title} ${content}`;
  const matches = text.match(/[A-Za-z0-9][A-Za-z0-9_-]{1,30}|[\u4e00-\u9fa5]{2,12}/g) || [];
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const raw of matches) {
    const item = raw.trim();
    if (!item || stopWords.has(item) || seen.has(item)) continue;
    seen.add(item);
    keywords.push(item);
    if (keywords.length >= 8) break;
  }

  return keywords;
}

function extractCandidatesFromText(request: ExtractEvidenceCardRequest, source: ExtractionSource): ExtractedEvidenceCardCandidate[] {
  const blocks = splitEvidenceBlocks(source.text);
  return blocks.map((block, index) => {
    const content = truncateText(block, 5000);
    const title = buildCandidateTitle(content, index);
    return {
      companyId: request.companyId ?? source.companyId ?? null,
      projectId: request.projectId ?? source.projectId ?? null,
      title,
      content,
      evidenceType: request.sourceType === 'image' ? 'image_description' : inferEvidenceType(content),
      sourceType: request.sourceType,
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl ?? null,
      keywords: inferKeywords(content, title),
      status: 'draft',
      sourceQuality: request.sourceType === 'manual' ? 'manual' : request.sourceType,
      articleTypes: ['general'],
      confidenceScore: 0.7,
      freshnessScore: 0.7,
      extractionReason: '从原始文本中识别到可支撑文章写作的事实、方法、场景或服务能力。',
    };
  });
}

async function extractCandidatesWithLlmFallback(
  request: ExtractEvidenceCardRequest,
  source: ExtractionSource,
  warnings: string[],
): Promise<ExtractedEvidenceCardCandidate[]> {
  const deterministicCandidates = (): ExtractedEvidenceCardCandidate[] => extractCandidatesFromText(request, source);

  try {
    const llmResult = await extractEvidenceCandidates({
      sourceType: request.sourceType,
      sourceText: source.text,
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl ?? null,
      companyId: request.companyId ?? source.companyId ?? null,
      projectId: request.projectId ?? source.projectId ?? null,
    });

    warnings.push(...llmResult.warnings.map(warning => `llm:${warning}`));

    if (llmResult.candidates.length > 0) {
      return llmResult.candidates.map(candidate => ({
        ...candidate,
        status: 'draft',
      }));
    }

    warnings.push('llm returned no usable candidates; deterministic fallback used');
    return deterministicCandidates();
  } catch (error) {
    warnings.push(`llm extraction crashed; deterministic fallback used: ${error instanceof Error ? error.message : 'unknown error'}`);
    return deterministicCandidates();
  }
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

async function assertKnowledgeBaseAccess(
  base: { scope: string; companyId?: number | null; projectId?: number | null } | null | undefined,
  actorUserId: number,
  actorRole: string,
): Promise<void> {
  if (!base) throw new NotFoundError('KnowledgeBase');
  if (actorRole === 'sysadmin') return;
  if (actorRole === 'view') throw new ForbiddenError('权限不足');

  const prisma = getPrisma() as any;

  if (base.scope === 'platform') return;

  if (base.scope === 'company') {
    const user = await prisma.user.findFirst({
      where: { id: actorUserId, deletedAt: null },
      select: { companyId: true },
    });
    if (!user || user.companyId !== base.companyId) throw new NotFoundError('KnowledgeBase');
    return;
  }

  if (base.scope === 'project') {
    if (!base.projectId) throw new NotFoundError('KnowledgeBase');
    const operator = await prisma.projectOperator.findFirst({
      where: { projectId: base.projectId, userId: actorUserId, deletedAt: null },
      select: { userId: true },
    });
    if (!operator) throw new ForbiddenError('无权操作该项目');
    return;
  }

  throw new ForbiddenError('权限不足');
}

export class EvidenceCardServiceImpl implements IEvidenceCardService {
  private async loadExtractionSource(request: ExtractEvidenceCardRequest, actorUserId: number, actorRole: string): Promise<ExtractionSource> {
    if (request.sourceType === 'manual') {
      return {
        text: request.text || '',
        sourceId: null,
        warnings: [],
      };
    }

    const prisma = getPrisma() as any;

    if (request.sourceType === 'portrait') {
      const portrait = await prisma.knowledgePortrait.findFirst({
        where: { id: request.sourceId, deletedAt: null },
        include: { base: true },
      });
      if (!portrait) throw new NotFoundError('KnowledgePortrait');
      await assertKnowledgeBaseAccess(portrait.base, actorUserId, actorRole);
      return {
        text: normalizeWhitespace(`${portrait.title}\n\n${portrait.content || ''}`),
        sourceId: portrait.id,
        companyId: portrait.base?.companyId ?? null,
        projectId: portrait.base?.projectId ?? null,
        warnings: portrait.content ? [] : ['portrait source has no content; only title was used'],
      };
    }

    if (request.sourceType === 'image') {
      const image = await prisma.knowledgeImage.findFirst({
        where: { id: request.sourceId, deletedAt: null },
        include: { base: true },
      });
      if (!image) throw new NotFoundError('KnowledgeImage');
      await assertKnowledgeBaseAccess(image.base, actorUserId, actorRole);
      return {
        text: normalizeWhitespace(`${image.title}\n\n${image.description || ''}\n\n${image.imageUrl}`),
        sourceId: image.id,
        sourceUrl: image.imageUrl,
        companyId: image.base?.companyId ?? null,
        projectId: image.base?.projectId ?? null,
        warnings: image.description ? [] : ['image source has no description; only title was used'],
      };
    }

    throw new BusinessError('invalid sourceType');
  }

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

  async extractEvidenceCards(request: ExtractEvidenceCardRequest, actorUserId: number, actorRole: string): Promise<ExtractEvidenceCardsResult> {
    const source = await this.loadExtractionSource(request, actorUserId, actorRole);
    const warnings = [...source.warnings];
    const rawCandidates = request.save && Array.isArray(request.candidates) && request.candidates.length > 0
      ? request.candidates
      : await extractCandidatesWithLlmFallback(request, source, warnings);
    const candidates = cleanCandidates(rawCandidates, request, source, warnings);

    if (candidates.length === 0) {
      warnings.push('no extractable evidence candidates found');
    }

    if (!request.save || candidates.length === 0) {
      return { candidates, saved: [], warnings };
    }

    const client = getEvidenceCardClient();
    const saved: EvidenceCard[] = [];
    for (const candidate of candidates) {
      const item = await client.create({
        data: toCreateData({ ...candidate, status: 'draft' }, actorUserId),
      });
      saved.push(mapEvidenceCard(item));
    }

    return { candidates, saved, warnings };
  }
}
