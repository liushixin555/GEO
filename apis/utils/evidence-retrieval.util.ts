import { getPrisma } from './db.util';

export interface EvidenceRetrievalInput {
  projectId?: number;
  companyId?: number;
  title: string;
  keywords: string;
  limit?: number;
}

export interface RetrievedEvidenceCardSnapshot {
  id: number;
  companyId: number | null;
  projectId: number | null;
  title: string;
  content: string;
  evidenceType: string;
  sourceType: string;
  sourceId: number | null;
  sourceUrl: string | null;
  keywords: string[];
  confidenceScore: number;
  freshnessScore: number;
  score: number;
  matchedReasons: string[];
}

export interface EvidenceRetrievalQuerySnapshot {
  projectId?: number;
  companyId?: number;
  title: string;
  keywords: string[];
  limit: number;
}

export interface EvidenceRetrievalResult {
  cards: RetrievedEvidenceCardSnapshot[];
  query: EvidenceRetrievalQuerySnapshot;
  warnings: string[];
}

const DEFAULT_LIMIT = 8;
const MAX_CANDIDATES = 300;
const MAX_CONTENT_LENGTH = 420;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function tokenizeText(value: string): string[] {
  const normalized = String(value || '').toLowerCase();
  const asciiTokens = normalized.match(/[a-z0-9][a-z0-9_-]{1,}/g) || [];
  const chineseTokens = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const shortChineseTokens = chineseTokens.flatMap((token) => {
    if (token.length <= 4) return [token];
    const tokens: string[] = [];
    for (let index = 0; index <= token.length - 2; index++) {
      tokens.push(token.slice(index, index + 2));
    }
    for (let index = 0; index <= token.length - 3; index++) {
      tokens.push(token.slice(index, index + 3));
    }
    return tokens;
  });
  return unique([...asciiTokens, ...chineseTokens, ...shortChineseTokens])
    .filter(token => token.length >= 2)
    .slice(0, 80);
}

function parseKeywordInput(value: string): string[] {
  return unique(
    String(value || '')
      .split(/[,\n\r;\s\u3001\uFF0C\uFF1B]+/)
      .map(keyword => keyword.trim())
      .filter(Boolean),
  ).slice(0, 50);
}

function normalizeCardKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.filter((item): item is string => typeof item === 'string'));
}

function includesToken(text: string, token: string): boolean {
  return text.toLowerCase().includes(token.toLowerCase());
}

function compactContent(content: string): string {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_CONTENT_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_CONTENT_LENGTH)}...`;
}

function normalizeScore(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function buildCandidateWhere(input: EvidenceRetrievalInput, tokens: string[], keywords: string[]): any {
  const scopeConditions = [
    ...(input.projectId ? [{ projectId: input.projectId }] : []),
    ...(input.companyId ? [{ companyId: input.companyId }] : []),
    { projectId: null, companyId: null },
  ];
  const textTerms = unique([...tokens.slice(0, 20), ...keywords]).slice(0, 40);
  const textConditions = textTerms.flatMap(term => [
    { title: { contains: term, mode: 'insensitive' } },
    { content: { contains: term, mode: 'insensitive' } },
  ]);

  return {
    deletedAt: null,
    OR: [...scopeConditions, ...textConditions],
  };
}

function scoreCard(card: any, input: EvidenceRetrievalInput, titleTokens: string[], keywords: string[]): RetrievedEvidenceCardSnapshot {
  const cardTitle = String(card.title || '');
  const cardContent = String(card.content || '');
  const cardKeywords = normalizeCardKeywords(card.keywords);
  const cardKeywordText = cardKeywords.join('\n');
  const matchedReasons: string[] = [];
  let score = 0;

  if (input.projectId && card.projectId === input.projectId) {
    score += 30;
    matchedReasons.push('same_project:+30');
  }
  if (input.companyId && card.companyId === input.companyId) {
    score += 15;
    matchedReasons.push('same_company:+15');
  }

  for (const token of titleTokens) {
    if (includesToken(cardTitle, token)) {
      score += 20;
      matchedReasons.push(`title_token_title:${token}:+20`);
    }
    if (includesToken(cardContent, token)) {
      score += 8;
      matchedReasons.push(`title_token_content:${token}:+8`);
    }
  }

  for (const keyword of keywords) {
    if (includesToken(cardTitle, keyword)) {
      score += 18;
      matchedReasons.push(`keyword_title:${keyword}:+18`);
    }
    if (includesToken(cardKeywordText, keyword)) {
      score += 15;
      matchedReasons.push(`keyword_keywords:${keyword}:+15`);
    }
    if (includesToken(cardContent, keyword)) {
      score += 8;
      matchedReasons.push(`keyword_content:${keyword}:+8`);
    }
  }

  const confidenceScore = normalizeScore(card.confidenceScore, 0.7);
  const freshnessScore = normalizeScore(card.freshnessScore, 0.7);
  score += confidenceScore * 10;
  score += freshnessScore * 8;
  matchedReasons.push(`confidence:${confidenceScore}:+${Number((confidenceScore * 10).toFixed(2))}`);
  matchedReasons.push(`freshness:${freshnessScore}:+${Number((freshnessScore * 8).toFixed(2))}`);

  return {
    id: card.id,
    companyId: card.companyId ?? null,
    projectId: card.projectId ?? null,
    title: cardTitle,
    content: compactContent(cardContent),
    evidenceType: String(card.evidenceType || ''),
    sourceType: String(card.sourceType || ''),
    sourceId: card.sourceId ?? null,
    sourceUrl: card.sourceUrl ?? null,
    keywords: cardKeywords,
    confidenceScore,
    freshnessScore,
    score: Number(score.toFixed(2)),
    matchedReasons: matchedReasons.slice(0, 20),
  };
}

export async function retrieveEvidenceForArticle(input: EvidenceRetrievalInput): Promise<EvidenceRetrievalResult> {
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_LIMIT, DEFAULT_LIMIT));
  const titleTokens = tokenizeText(input.title);
  const keywords = parseKeywordInput(input.keywords);
  const query: EvidenceRetrievalQuerySnapshot = {
    projectId: input.projectId,
    companyId: input.companyId,
    title: input.title,
    keywords,
    limit,
  };
  const warnings: string[] = [];

  const prisma = getPrisma() as any;
  const client = prisma.evidenceCard;
  if (!client) {
    return {
      cards: [],
      query,
      warnings: ['EVIDENCE_CARD_CLIENT_UNAVAILABLE'],
    };
  }

  const candidates = await client.findMany({
    where: buildCandidateWhere(input, titleTokens, keywords),
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: MAX_CANDIDATES,
  });

  const cards = candidates
    .map((card: any) => scoreCard(card, input, titleTokens, keywords))
    .filter((card: RetrievedEvidenceCardSnapshot) => card.matchedReasons.some(reason => (
      reason.startsWith('same_') ||
      reason.startsWith('title_token_') ||
      reason.startsWith('keyword_')
    )))
    .sort((a: RetrievedEvidenceCardSnapshot, b: RetrievedEvidenceCardSnapshot) => b.score - a.score || a.id - b.id)
    .slice(0, limit);

  if (cards.length === 0) {
    warnings.push('NO_EVIDENCE_MATCHED');
  } else if (cards.length < 3) {
    warnings.push(`EVIDENCE_LESS_THAN_3:${cards.length}`);
  }
  if (input.projectId && !cards.some((card: RetrievedEvidenceCardSnapshot) => card.projectId === input.projectId)) {
    warnings.push('NO_SAME_PROJECT_EVIDENCE');
  }
  if (keywords.length > 0 && !cards.some((card: RetrievedEvidenceCardSnapshot) => keywords.some(keyword => (
    includesToken(card.title, keyword) ||
    includesToken(card.content, keyword) ||
    card.keywords.some((cardKeyword: string) => includesToken(cardKeyword, keyword))
  )))) {
    warnings.push('NO_KEYWORD_RELATED_EVIDENCE');
  }

  return { cards, query, warnings };
}
