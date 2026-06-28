/**
 * 引擎回复聚合 + 评分 — 移植自 geo-audit scoring.ts / run-audit.ts
 *
 * 输入：每个引擎每条提示词的回复文本
 * 输出：总分 + 等级 + 各引擎细分 + 盲点 + 综合结果 JSON
 */

import type {
  AuditResult,
  BlindSpotItem,
  EngineData,
  PromptCategory,
} from '../entity/audit.entity';
import { computeCitationScore } from './tavily-client';

export interface PromptResult {
  prompt: string;
  category: PromptCategory;
  engine: string;
  text: string;
  error: string | null;
}

/** 单条回复的提及分析 */
interface MentionAnalysis {
  mentions: number;
  sentiment: string;
  snippets: string[];
  genuine: boolean;
}

const UNKNOWN_PATTERNS = [
  "i don't have information", "i'm not familiar with", "i couldn't find",
  'no information available', "i'm not aware of", 'i cannot find',
  'not widely known', "i don't recognize", 'unable to find',
  "i don't have specific", "i don't have any data",
  "isn't a standard", "isn't a recognized", "isn't a well-known",
  "isn't a common", "isn't a widely", 'not a standard',
  'not a recognized', 'not a well-known', "doesn't appear to be",
  "i'm unable to", 'i am not aware', 'i have no information',
  'there is no widely known', 'no widely recognized',
  'could not find', "don't have enough information",
  'may refer to', 'could refer to', 'might refer to',
  // 中文未知模式
  '我没有关于', '我不了解', '没有找到', '没有相关信息', '没有找到相关信息',
  '目前没有', '暂时没有', '无法提供', '无法回答',
  '我没有听说过', '我未听说过', '不在我的知识',
];

const POSITIVE_WORDS = [
  'best', 'great', 'excellent', 'leading', 'top', 'recommend', 'popular', 'trusted', 'innovative',
  '推荐', '首选', '优秀', '领先', '知名', '可靠', '不错', '好用', '首选',
];
const NEGATIVE_WORDS = [
  'worst', 'bad', 'poor', 'avoid', 'expensive', 'outdated', 'lacking', 'limited',
  '最差', '不好', '差', '避免', '昂贵', '过时', '有限', '不足',
];

/** 分析文本中品牌的提及情况 */
export function analyzeMentions(text: string, brand: string): MentionAnalysis {
  if (!text) return { mentions: 0, sentiment: 'unknown', snippets: [], genuine: false };

  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  const isUnknown = UNKNOWN_PATTERNS.some((p) => lower.includes(p));

  const segments = text.split(/[。.!！?？\n]+/);
  const snippets: string[] = [];
  let realMentions = 0;

  for (const s of segments) {
    const sl = s.toLowerCase().trim();
    if (!sl.includes(brandLower) || sl.length < 3) continue;
    if (UNKNOWN_PATTERNS.some((p) => sl.includes(p))) continue;
    realMentions++;
    if (snippets.length < 3) snippets.push(s.trim().slice(0, 200));
  }

  const rawCount = lower.split(brandLower).length - 1;
  if (rawCount > realMentions && !isUnknown) {
    realMentions = Math.max(realMentions, rawCount);
  }

  if (isUnknown && realMentions <= 1) realMentions = 0;

  let posCount = 0, negCount = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) posCount++;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) negCount++;
  const sentiment = (isUnknown && realMentions === 0)
    ? 'unknown'
    : posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

  return { mentions: realMentions, sentiment, snippets, genuine: !isUnknown && realMentions > 0 };
}

/** 单引擎评分：min(mentions * 25, 60) + sentiment bonus */
export function scoreEngine(analysis: MentionAnalysis): number {
  if (analysis.mentions === 0) return 0;
  let score = Math.min(analysis.mentions * 25, 60);
  if (analysis.sentiment === 'positive') score += 40;
  else if (analysis.sentiment === 'neutral') score += 20;
  else score += 5;
  return Math.round(Math.min(score, 100));
}

interface EngineAggState {
  total: number;
  genuine: number;        // 真实提及的提示词数
  mentioned: number;      // genuine 命中数（= genuine）
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
  snippets: string[];
  blindSpotCount: number; // 未提及的（genuine=false）数量
}

/** Tavily 网络证据输入（可选） */
export interface TavilyEvidence {
  /** Tavily search.answer 文本 */
  webAnswer?: string;
  /** Tavily search.results 列表 */
  webSources?: Array<{ title: string; url: string; content: string }>;
  /** 品牌官网 URL，用于 citation 匹配 */
  brandUrl?: string | null;
}

/**
 * 聚合所有提示词回复 → AuditResult
 *
 * 评分模型：
 *   - knowledge_score = 所有引擎分数的算数平均（引擎分 = scoreEngine × 覆盖系数）
 *   - discoverability_score = 基于 Tavily 答案中品牌提及（无 Tavily 时降级 knowledge × 0.9）
 *   - citation_score = 品牌官网在 Tavily 中文搜索结果中的命中数 × 20
 *   - overall = round(knowledge*0.5 + discoverability*0.3 + citation*0.2)
 *
 * 一致性乘子 = min(引擎数 / 5, 1)（缺引擎会拉低总分）
 */
export function scoreAll(
  results: PromptResult[],
  brand: string,
  engines: string[],
  evidence: TavilyEvidence = {},
): { result: AuditResult; perPromptMeta: Map<string, { mentioned: boolean; snippet: string | null; sentiment: string | null; blindSpot: boolean }> } {
  const engineCount = engines.length;
  const consistencyMultiplier = Math.min(engineCount / 5, 1);

  const engineStates: Record<string, EngineAggState> = {};
  for (const e of engines) {
    engineStates[e] = {
      total: 0,
      genuine: 0,
      mentioned: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      unknown: 0,
      snippets: [],
      blindSpotCount: 0,
    };
  }

  // 唯一提示词集合（同 prompt 跨多引擎 → 视作一次"测试"）
  const uniquePrompts = new Map<string, PromptCategory>();
  for (const r of results) {
    if (!uniquePrompts.has(r.prompt)) uniquePrompts.set(r.prompt, r.category);
  }

  const perPromptMeta = new Map<string, { mentioned: boolean; snippet: string | null; sentiment: string | null; blindSpot: boolean }>();

  // 按引擎聚合
  for (const r of results) {
    const state = engineStates[r.engine];
    if (!state) continue;
    state.total++;

    const analysis = analyzeMentions(r.text || '', brand);
    if (analysis.genuine) {
      state.genuine++;
      state.mentioned++;
      if (analysis.sentiment === 'positive') state.positive++;
      else if (analysis.sentiment === 'neutral') state.neutral++;
      else if (analysis.sentiment === 'negative') state.negative++;
      else state.unknown++;
      if (state.snippets.length < 3 && analysis.snippets[0]) state.snippets.push(analysis.snippets[0]);
    } else {
      state.blindSpotCount++;
    }
  }

  // 计算每个引擎的分数
  const enginesData: Record<string, EngineData> = {};
  const engineScores: number[] = [];
  // 按传入顺序遍历（顺序由调用方决定，通常是 LlmModel.id 升序，保证报告稳定）
  for (const e of engines) {
    const state = engineStates[e];
    if (!state || state.total === 0) continue;
    const coverageRatio = state.genuine / state.total;
    const baseScore = scoreEngine({
      mentions: state.genuine,
      sentiment: state.positive >= state.negative && state.positive > 0 ? 'positive' : state.negative > state.positive ? 'negative' : 'neutral',
      snippets: state.snippets,
      genuine: state.genuine > 0,
    });
    const softCoverage = 0.3 + 0.7 * coverageRatio;
    const adjustedScore = state.genuine === 0 ? 0 : Math.round(baseScore * softCoverage);
    engineScores.push(adjustedScore);

    enginesData[e] = {
      score: adjustedScore,
      mentioned_count: state.genuine,
      total_count: state.total,
      positive: state.positive,
      neutral: state.neutral,
      negative: state.negative,
      blind_spots: state.blindSpotCount,
      sample_snippet: state.snippets[0] ?? undefined,
    };
  }

  // knowledge_score = 引擎分数平均
  const knowledge_score = engineScores.length > 0
    ? Math.round(engineScores.reduce((a, b) => a + b, 0) / engineScores.length)
    : 0;

  // awareness_bonus：基于 LLM 在「非品牌直接询问」场景下主动提及品牌的判定
  //
  // 判定逻辑：对 category=category/buying_intent/conversational/discovery/competitor
  //   且 prompt 文本中不包含品牌名 的子集（即用户没主动问品牌），
  //   若引擎回复仍然 genuine 提及品牌 → 计为「主动推荐」一次。
  //
  // 评分：0-20 分（与 awareness_bonus 在 overall 中权重一致）
  //   base = 主动推荐命中率 × 15
  //   positive_sentiment_boost：每条 positive 推荐 +1，最高 +5
  const brandLower = brand.toLowerCase();
  const nonBrandResults = results.filter((r) => {
    if (r.category === 'brand') return false;
    // prompt 中未显式提到品牌 → 才能算「主动推荐」
    return !r.prompt.toLowerCase().includes(brandLower);
  });

  let spontaneousHits = 0;
  let positiveHits = 0;
  for (const r of nonBrandResults) {
    const a = analyzeMentions(r.text || '', brand);
    if (a.genuine) {
      spontaneousHits++;
      if (a.sentiment === 'positive') positiveHits++;
    }
  }
  const spontaneousRatio = nonBrandResults.length > 0 ? spontaneousHits / nonBrandResults.length : 0;
  const awareness_bonus = Math.min(
    20,
    Math.round(spontaneousRatio * 15) + Math.min(positiveHits, 5),
  );

  // discoverability_score：基于 Tavily 答案中品牌提及的真实网络证据
  // 无 Tavily 配置或无结果时降级为 knowledge × 0.9
  let discoverability_score: number;
  if (evidence.webAnswer && evidence.webAnswer.trim().length > 0) {
    const webAnalysis = analyzeMentions(evidence.webAnswer, brand);
    if (webAnalysis.genuine) {
      // Tavily 答案中真实提及：基础 60 + 提及加权（最高 +30）+ 情感（+10/0/-10）
      let webScore = 60 + Math.min(webAnalysis.mentions * 10, 30);
      webScore += webAnalysis.sentiment === 'positive' ? 10 : webAnalysis.sentiment === 'negative' ? -10 : 0;
      discoverability_score = Math.max(0, Math.min(100, Math.round(webScore)));
    } else {
      // Tavily 答案中未真实提及：保守给低分（用户主动询问时搜索引擎看不到）
      discoverability_score = Math.round(knowledge_score * 0.3);
    }
  } else {
    // 无 Tavily 证据：降级保守值
    discoverability_score = Math.round(knowledge_score * 0.9);
  }

  // citation_score：品牌官网在 Tavily 中文搜索结果中的命中
  const citation_score = computeCitationScore(evidence.webSources ?? [], evidence.brandUrl);

  // 总分 = 基础三项加权 + awareness_bonus（主动推荐加成），再乘一致性乘子
  const base_score = Math.round(
    knowledge_score * 0.5 + discoverability_score * 0.3 + citation_score * 0.2,
  );
  let overall = base_score + awareness_bonus;
  overall = Math.round(overall * consistencyMultiplier);
  overall = Math.min(overall, 100);

  const grade = overall >= 90 ? 'A'
    : overall >= 80 ? 'B'
    : overall >= 70 ? 'C'
    : overall >= 60 ? 'D'
    : overall >= 40 ? 'E'
    : 'F';

  // 计算盲点（同一提示词所有引擎都没 genuine 提及 → 盲点）
  const promptToMissedEngines = new Map<string, string[]>();
  const promptToAnyHit = new Set<string>();
  const promptToSnippet = new Map<string, string>();
  for (const r of results) {
    const analysis = analyzeMentions(r.text || '', brand);
    if (analysis.genuine) {
      promptToAnyHit.add(r.prompt);
      if (!promptToSnippet.has(r.prompt) && analysis.snippets[0]) {
        promptToSnippet.set(r.prompt, analysis.snippets[0]);
      }
    } else {
      if (!promptToMissedEngines.has(r.prompt)) promptToMissedEngines.set(r.prompt, []);
      promptToMissedEngines.get(r.prompt)!.push(r.engine);
    }
  }

  const blind_spots: BlindSpotItem[] = [];
  for (const [prompt, missed] of promptToMissedEngines) {
    if (promptToAnyHit.has(prompt)) {
      perPromptMeta.set(prompt, { mentioned: true, snippet: promptToSnippet.get(prompt) ?? null, sentiment: 'neutral', blindSpot: false });
      continue;
    }
    perPromptMeta.set(prompt, { mentioned: false, snippet: null, sentiment: null, blindSpot: true });
    const category = uniquePrompts.get(prompt) ?? 'other';
    if (missed.length >= Math.max(1, Math.ceil(engineCount * 0.6))) {
      blind_spots.push({ category, prompt, engines: missed });
    }
  }

  // prompt_coverage：按 category 统计覆盖率
  const prompt_coverage: Record<string, number> = {};
  const catCounts: Record<string, { total: number; hit: number }> = {};
  for (const [prompt, cat] of uniquePrompts) {
    if (!catCounts[cat]) catCounts[cat] = { total: 0, hit: 0 };
    catCounts[cat].total++;
    if (promptToAnyHit.has(prompt)) catCounts[cat].hit++;
  }
  for (const [cat, c] of Object.entries(catCounts)) {
    prompt_coverage[cat] = c.total === 0 ? 0 : Math.round((c.hit / c.total) * 100);
  }

  // citations：把 Tavily 结果归一化为引用来源（最多 10 个）
  const citations = (evidence.webSources ?? [])
    .slice(0, 10)
    .map((s) => ({
      title: s.title,
      url: s.url,
      snippet: (s.content || '').slice(0, 200),
    }));

  const narrative = buildNarrative(brand, overall, grade, knowledge_score, discoverability_score, awareness_bonus, engineCount, blind_spots.length);

  const result: AuditResult = {
    overall_score: overall,
    grade,
    knowledge_score,
    discoverability_score,
    citation_score,
    awareness_bonus,
    consistency_multiplier: consistencyMultiplier,
    engines: enginesData,
    prompt_coverage,
    blind_spots: blind_spots.slice(0, 20),
    citations,
    competitor_analysis: [],
    narrative,
    agent_instructions: [],
    created_at: new Date().toISOString(),
  };

  return { result, perPromptMeta };
}

function buildNarrative(
  brand: string,
  overall: number,
  grade: string,
  knowledge: number,
  discovery: number,
  awareness: number,
  engineCount: number,
  blindSpotCount: number,
): string {
  const lines: string[] = [];
  lines.push(`综合 ${engineCount} 个国内主流 AI 引擎的可见度评测，${brand} 总分 ${overall}（等级 ${grade}）。`);
  lines.push(`知识得分 ${knowledge}（引擎认知深度），可发现性 ${discovery}（用户主动询问场景下的命中率）。`);
  const awarenessText = awarenessDesc(awareness);
  if (awarenessText) {
    lines.push(awarenessText);
  }
  if (blindSpotCount > 0) {
    lines.push(`共检测到 ${blindSpotCount} 个关键盲点场景——这些是用户真实会问、但当前引擎未提及您品牌的提问。`);
  } else {
    lines.push('未发现明显盲点，关键提问场景均有覆盖。');
  }
  if (overall >= 80) {
    lines.push('整体可见度处于行业领先水平，建议持续监控并补充长尾内容。');
  } else if (overall >= 60) {
    lines.push('整体可见度中等，需加强内容布局以提升引擎推荐概率。');
  } else {
    lines.push('整体可见度偏低，建议优先解决结构化数据、内容深度与外部引用三个维度的问题。');
  }
  return lines.join(' ');
}

/** 主动推荐加成的中文描述 */
function awarenessDesc(bonus: number): string | null {
  if (bonus >= 15) return `主动推荐加成 ${bonus}/20：引擎在用户未点名品牌的提问中高频自发推荐该品牌，品牌心智份额强。`;
  if (bonus >= 8) return `主动推荐加成 ${bonus}/20：部分场景下引擎会主动提及该品牌，仍存在提升空间。`;
  if (bonus > 0) return `主动推荐加成 ${bonus}/20：仅在少数提问中引擎主动提及，建议强化长尾内容覆盖。`;
  return null;
}
