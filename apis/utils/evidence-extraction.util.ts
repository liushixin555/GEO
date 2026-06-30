import { getPrisma } from './db.util';
import { AgentLoopUtil } from './llm.utils';
import { decryptApiKey, isEncrypted } from './encryption.util';
import {
  EVIDENCE_ARTICLE_TYPES,
  EVIDENCE_CARD_SOURCE_TYPES,
  EVIDENCE_CARD_STATUSES,
  EVIDENCE_CARD_TYPES,
  EVIDENCE_SOURCE_QUALITIES,
  EvidenceArticleType,
  EvidenceCardSourceType,
  EvidenceCardStatus,
  EvidenceCardType,
  EvidenceSourceQuality,
} from '../entity/evidence-card.entity';

export interface EvidenceExtractionInput {
  sourceType: EvidenceCardSourceType | string;
  sourceText: string;
  sourceId?: number | null;
  sourceUrl?: string | null;
  companyId?: number | null;
  projectId?: number | null;
}

export interface EvidenceExtractionCandidate {
  companyId: number | null;
  projectId: number | null;
  title: string;
  content: string;
  evidenceType: EvidenceCardType;
  sourceType: EvidenceCardSourceType;
  sourceId: number | null;
  sourceUrl: string | null;
  keywords: string[];
  status: EvidenceCardStatus;
  sourceQuality: EvidenceSourceQuality;
  articleTypes: EvidenceArticleType[];
  confidenceScore: number;
  freshnessScore: number;
  score: number;
}

export interface EvidenceExtractionResult {
  candidates: EvidenceExtractionCandidate[];
  warnings: string[];
  rawText?: string;
}

interface EvidenceExtractionParseContext {
  sourceType: EvidenceCardSourceType;
  sourceId?: number | null;
  sourceUrl?: string | null;
  companyId?: number | null;
  projectId?: number | null;
}

const GENERIC_MARKETING_PATTERNS = [
  /专业可靠/,
  /经验丰富/,
  /助力企业发展/,
  /提升竞争力/,
  /行业领先/,
  /优质服务/,
  /一站式服务/,
  /赋能企业/,
  /高质量发展/,
  /值得信赖/,
  /全方位(?:解决方案|服务)/,
  /持续创新/,
  /效果显著/,
  /深受客户好评/,
];

const CONCRETE_FACT_PATTERNS = [
  /\d/,
  /[一二三四五六七八九十]+个/,
  /包括|包含|分为|围绕|通过|采用|基于|形成|覆盖|适用于|用于|面向|提供|沉淀|建立/,
  /流程|步骤|阶段|方法|框架|模型|标准|指标|场景|案例|客户|问题|痛点|能力|交付|诊断|方案|数据|表单|清单/,
  /IPD|LTC|ITR|ISC|AI|CRM|ERP|SOP/i,
];

const MAX_SOURCE_TEXT_LENGTH = 24000;
const MAX_CARDS = 8;

function resolveApiKey(raw: string): string {
  return isEncrypted(raw) ? decryptApiKey(raw) : raw;
}

function isAllowedValue<T extends string>(value: string, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

function normalizeWhitespace(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = item.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
    if (normalized.length >= maxItems) break;
  }

  return normalized;
}

function normalizeArticleTypes(value: unknown): EvidenceArticleType[] {
  const articleTypes = normalizeStringArray(value, 20)
    .filter((item): item is EvidenceArticleType => isAllowedValue(item, EVIDENCE_ARTICLE_TYPES));
  return articleTypes.length > 0 ? articleTypes : ['general'];
}

function normalizeScore(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function hasConcreteFact(text: string): boolean {
  return CONCRETE_FACT_PATTERNS.some(pattern => pattern.test(text));
}

function isMarketingFluff(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return true;
  const matched = GENERIC_MARKETING_PATTERNS.filter(pattern => pattern.test(normalized)).length;
  const withoutMarketing = GENERIC_MARKETING_PATTERNS
    .reduce((current, pattern) => current.replace(pattern, ''), normalized)
    .replace(/[，。；、,.:\s]/g, '');

  return matched > 0 && withoutMarketing.length < 18 && !hasConcreteFact(normalized);
}

function getTextLength(text: string): number {
  return normalizeWhitespace(text).replace(/\s/g, '').length;
}

function getSourceType(value: string): EvidenceCardSourceType {
  return isAllowedValue(value, EVIDENCE_CARD_SOURCE_TYPES) ? value : 'document';
}

function stripJsonFence(rawText: string): string {
  const text = rawText.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) return fenceMatch[1].trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text;
}

function normalizeCandidate(
  raw: unknown,
  context: EvidenceExtractionParseContext,
  warnings: string[],
  index: number,
): EvidenceExtractionCandidate | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    warnings.push(`CARD_DROPPED_INVALID_OBJECT:${index}`);
    return null;
  }

  const item = raw as Record<string, unknown>;
  const title = normalizeWhitespace(item.title);
  const content = normalizeWhitespace(item.content);
  if (!title || !content) {
    warnings.push(`CARD_DROPPED_EMPTY_TITLE_OR_CONTENT:${index}`);
    return null;
  }

  if (getTextLength(content) < 24 && !hasConcreteFact(content)) {
    warnings.push(`CARD_DROPPED_TOO_SHORT_NO_FACT:${index}:${title}`);
    return null;
  }

  if (isMarketingFluff(`${title} ${content}`)) {
    warnings.push(`CARD_DROPPED_MARKETING_FLUFF:${index}:${title}`);
    return null;
  }

  const evidenceType = normalizeWhitespace(item.evidenceType || item.type);
  if (!isAllowedValue(evidenceType, EVIDENCE_CARD_TYPES)) {
    warnings.push(`CARD_DROPPED_INVALID_EVIDENCE_TYPE:${index}:${title}`);
    return null;
  }

  const sourceQualityValue = normalizeWhitespace(item.sourceQuality);
  const sourceQuality = isAllowedValue(sourceQualityValue, EVIDENCE_SOURCE_QUALITIES)
    ? sourceQualityValue
    : 'unknown';

  const statusValue = normalizeWhitespace(item.status);
  if (statusValue && statusValue !== 'draft' && isAllowedValue(statusValue, EVIDENCE_CARD_STATUSES)) {
    warnings.push(`CARD_STATUS_FORCED_DRAFT:${index}:${title}`);
  }

  return {
    companyId: context.companyId ?? null,
    projectId: context.projectId ?? null,
    title: title.slice(0, 300),
    content: content.slice(0, 5000),
    evidenceType,
    sourceType: context.sourceType,
    sourceId: context.sourceId ?? null,
    sourceUrl: context.sourceUrl ?? null,
    keywords: normalizeStringArray(item.keywords, 30),
    status: 'draft',
    sourceQuality,
    articleTypes: normalizeArticleTypes(item.articleTypes),
    confidenceScore: normalizeScore(item.confidenceScore, 0.7),
    freshnessScore: normalizeScore(item.freshnessScore, 0.7),
    score: normalizeScore(item.score, 0.7),
  };
}

function dedupeCandidates(
  candidates: EvidenceExtractionCandidate[],
  warnings: string[],
): EvidenceExtractionCandidate[] {
  const seen = new Set<string>();
  const deduped: EvidenceExtractionCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.title.toLowerCase()}::${candidate.content.toLowerCase()}`;
    if (seen.has(key)) {
      warnings.push(`CARD_DROPPED_DUPLICATE:${candidate.title}`);
      continue;
    }
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

async function getActiveModel(): Promise<{ baseUrl: string; apiKey: string; modelName: string } | null> {
  const prisma = getPrisma();
  const model = await prisma.llmModel.findFirst({
    where: { status: true, deletedAt: null },
    orderBy: { id: 'asc' },
  });
  return model;
}

export function buildEvidenceExtractionPrompt(input: EvidenceExtractionInput): string {
  const sourceText = String(input.sourceText || '').trim().slice(0, MAX_SOURCE_TEXT_LENGTH);
  const sourceMeta = [
    `sourceType: ${getSourceType(String(input.sourceType || 'document'))}`,
    input.sourceId !== undefined && input.sourceId !== null ? `sourceId: ${input.sourceId}` : '',
    input.sourceUrl ? `sourceUrl: ${input.sourceUrl}` : '',
    input.companyId ? `companyId: ${input.companyId}` : '',
    input.projectId ? `projectId: ${input.projectId}` : '',
  ].filter(Boolean).join('\n');

  return `你是 EvidenceCard 抽取器。请从给定材料中抽取可以支撑文章生成的证据候选。

输出要求：
1. 只输出 JSON，不要输出 Markdown、解释、前后缀或代码块。
2. 顶层结构必须是 { "cards": [...] }。
3. cards 最多 8 条；材料不足时返回 { "cards": [] }。
4. 每条候选字段为：
   - title: 简短标题，必须来自材料含义
   - content: 可被文章引用的具体事实、方法、流程、场景、案例、数据、客户问题或服务能力
   - evidenceType: 只能是 fact/case/method/capability/faq/statistic/quote/image_description/external
   - sourceQuality: 只能是 official/customer/research/third_party/manual/portrait/image/unknown
   - articleTypes: string[]，只能使用 ranking/comparison/guide/faq/case/methodology/brand/news/general
   - keywords: string[]
   - confidenceScore: 0 到 1
   - freshnessScore: 0 到 1
   - score: 0 到 1，表示该候选作为证据的质量
   - status: 必须是 draft
5. 不得编造材料中没有的客户、数字、资质、荣誉、案例、合作结果或承诺。
6. 不抽取空泛营销表达，例如“专业可靠、经验丰富、助力企业发展、提升竞争力、行业领先、优质服务、一站式服务、赋能企业、高质量发展、值得信赖、效果显著、深受客户好评”。
7. 只抽取有事实、方法、流程、场景、案例、数据、客户问题或服务能力支撑的内容。
8. 如果一句话只是形容词堆叠，或无法回答“它具体说明了什么”，不要抽取。

来源信息：
${sourceMeta || 'sourceType: document'}

材料：
${sourceText}`;
}

export function parseEvidenceExtractionOutput(
  rawText: string,
  context: EvidenceExtractionParseContext,
): { candidates: EvidenceExtractionCandidate[]; warnings: string[] } {
  const warnings: string[] = [];
  const jsonText = stripJsonFence(rawText);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      candidates: [],
      warnings: ['LLM_OUTPUT_NOT_JSON'],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      candidates: [],
      warnings: ['LLM_OUTPUT_INVALID_TOP_LEVEL'],
    };
  }

  const cards = (parsed as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) {
    return {
      candidates: [],
      warnings: ['LLM_OUTPUT_CARDS_NOT_ARRAY'],
    };
  }

  const normalized = cards
    .slice(0, MAX_CARDS)
    .map((card, index) => normalizeCandidate(card, context, warnings, index))
    .filter((card): card is EvidenceExtractionCandidate => Boolean(card));

  return {
    candidates: dedupeCandidates(normalized, warnings),
    warnings,
  };
}

export async function extractEvidenceCandidates(input: EvidenceExtractionInput): Promise<EvidenceExtractionResult> {
  const warnings: string[] = [];
  const sourceText = String(input.sourceText || '').trim();
  if (!sourceText) {
    return {
      candidates: [],
      warnings: ['SOURCE_TEXT_EMPTY'],
    };
  }

  const sourceType = getSourceType(String(input.sourceType || 'document'));
  if (sourceType !== input.sourceType) {
    warnings.push(`SOURCE_TYPE_FALLBACK:${input.sourceType || ''}->${sourceType}`);
  }

  const model = await getActiveModel();
  if (!model) {
    return {
      candidates: [],
      warnings: [...warnings, 'LLM_MODEL_UNAVAILABLE'],
    };
  }

  const prompt = buildEvidenceExtractionPrompt({ ...input, sourceType });
  let rawText = '';
  try {
    const result = await AgentLoopUtil.run({
      baseUrl: model.baseUrl.replace(/\/+$/, ''),
      apiKey: resolveApiKey(model.apiKey),
      modelName: model.modelName,
      prompt,
      systemPrompt: '你是严格的 JSON 抽取器。你只能输出合法 JSON，不能输出解释、Markdown 或代码块。',
      temperature: 0,
    });
    rawText = result.content;
  } catch (error) {
    return {
      candidates: [],
      warnings: [...warnings, `LLM_EXTRACTION_FAILED:${error instanceof Error ? error.message : 'unknown'}`],
    };
  }

  const parsed = parseEvidenceExtractionOutput(rawText, {
    sourceType,
    sourceId: input.sourceId ?? null,
    sourceUrl: input.sourceUrl ?? null,
    companyId: input.companyId ?? null,
    projectId: input.projectId ?? null,
  });

  return {
    candidates: parsed.candidates,
    warnings: [...warnings, ...parsed.warnings],
    rawText,
  };
}
