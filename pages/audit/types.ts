/**
 * 诊断管理 — 前端类型定义
 *
 * 与后端 `apis/audit/entity/audit.entity.ts` 对应，
 * 仅保留前端渲染所需字段；为简化字段访问，使用 camelCase。
 */

export type AuditStatus = 'processing' | 'complete' | 'failed';
export type AuditTier = 'free' | 'pro';

export type EngineKey = 'doubao' | 'deepseek' | 'qwen' | 'yuanbao' | 'wenxinyiyan';

export interface AuditListItem {
  id: number;
  jobId: string;
  userId: number;
  companyId: number | null;
  brand: string;
  website: string | null;
  industry: string | null;
  tier: AuditTier;
  status: AuditStatus;
  score: number | null;
  grade: string | null;
  engineCount: number;
  promptTotal: number;
  promptDone: number;
  createdAt: string;
  updatedAt: string;
}

export type PromptCategory =
  | 'brand'
  | 'category'
  | 'competitor'
  | 'buying_intent'
  | 'conversational'
  | 'discovery';

export interface AuditPromptResult {
  id: number;
  mentioned: boolean;
  snippet: string | null;
  sentiment: string | null;
  sourceType: string | null;
  blindSpot: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface AuditPromptDetail {
  id: number;
  promptIndex: number;
  category: PromptCategory;
  engine: string;
  llmModelId: number | null;
  prompt: string;
  result: AuditPromptResult | null;
}

export interface EngineData {
  score: number;
  mentioned_count: number;
  total_count: number;
  positive: number;
  neutral: number;
  negative: number;
  blind_spots: number;
  sample_snippet?: string;
}

export interface BlindSpotItem {
  category: string;
  prompt: string;
  engines: string[];
}

export interface CitationSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface CompetitorAnalysis {
  name: string;
  mentions: number;
  sentiment: string;
}

export interface WebsiteCheck {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail?: string;
}

export interface WebsiteHealth {
  pass: number;
  warn: number;
  fail: number;
  checks: WebsiteCheck[];
}

export interface AuditResult {
  overall_score: number;
  grade: string;
  knowledge_score: number;
  discoverability_score: number;
  citation_score: number;
  awareness_bonus: number;
  consistency_multiplier: number;
  engines: Record<string, EngineData>;
  prompt_coverage: Record<string, number>;
  blind_spots: BlindSpotItem[];
  citations: CitationSource[];
  competitor_analysis: CompetitorAnalysis[];
  narrative: string;
  website_health?: WebsiteHealth;
  agent_instructions?: string[];
  created_at: string;
}

export interface AuditDetail extends AuditListItem {
  description: string | null;
  competitors: string[] | null;
  keywords: string[] | null;
  features: string[] | null;
  result: AuditResult | null;
  aioResult: unknown | null;
  technicalResult: unknown | null;
  seoScoreResult: unknown | null;
  contentOptimizerResult: unknown | null;
  prompts: AuditPromptDetail[];
}

/** 引擎显示元数据（替代 geo-audit 的 ENGINE_META） */
export const ENGINE_META: Record<EngineKey, { label: string; color: string }> = {
  doubao: { label: '豆包', color: '#4B70F8' },
  deepseek: { label: 'DeepSeek', color: '#4D6BFE' },
  qwen: { label: '通义千问', color: '#615CED' },
  yuanbao: { label: '腾讯元宝', color: '#0053E1' },
  wenxinyiyan: { label: '文心一言', color: '#2932E1' },
};

export const ALL_ENGINES: EngineKey[] = ['doubao', 'deepseek', 'qwen', 'yuanbao', 'wenxinyiyan'];

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  brand: '品牌认知',
  category: '品类认知',
  competitor: '竞品对比',
  buying_intent: '购买意向',
  conversational: '自然对话',
  discovery: '产品发现',
};

export const STATUS_META: Record<AuditStatus, { label: string; color: string }> = {
  processing: { label: '进行中', color: 'processing' },
  complete: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

/** 评分等级颜色（与 Carbon 主色呼应） */
export const GRADE_COLORS: Record<string, string> = {
  A: 'success',
  B: 'success',
  C: 'warning',
  D: 'warning',
  E: 'error',
  F: 'error',
};

export function getGrade(score: number | null | undefined): string {
  if (score == null) return '-';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

export function getVerdict(score: number | null | undefined): { text: string; type: 'success' | 'info' | 'warning' | 'error' } {
  if (score == null) return { text: '尚无评分', type: 'info' };
  if (score >= 90) return { text: 'AI 可见度优秀，主流引擎均能识别并推荐您的品牌。', type: 'success' };
  if (score >= 80) return { text: 'AI 可见度良好，仍有优化空间。', type: 'success' };
  if (score >= 60) return { text: 'AI 可见度中等，部分关键提问未被覆盖。', type: 'warning' };
  if (score >= 40) return { text: 'AI 可见度偏低，多数引擎未提及您的品牌。', type: 'warning' };
  return { text: 'AI 可见度严重不足，几乎不被引擎识别。', type: 'error' };
}

export function scoreColor(val: number): string {
  if (val >= 75) return '#24a148';
  if (val >= 50) return '#f1c21b';
  if (val >= 25) return '#f1c21b';
  return '#da1e28';
}
