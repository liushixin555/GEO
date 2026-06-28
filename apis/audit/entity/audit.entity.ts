/**
 * 诊断管理 — 实体类型 + DTO 定义
 *
 * 业务背景：一次「诊断」是对目标品牌在多个 AI 引擎（LlmModel 表中所有启用的模型）
 * 中的可见度进行批量问答打分，最终产出 0-100 分的报告与改进建议。
 *
 * 引擎来源完全由 LlmModel 表驱动（系统管理 → 模型管理 维护），不写死引擎种类。
 * 引擎唯一标识 = `${provider}:${modelName}`，存入 AuditPrompt.engine 列。
 *
 * 数据库三表对应关系：
 *   Audit (1) ──< AuditPrompt (1) ──(1) AuditPromptResult
 *   一次诊断    N 条提示词 × 引擎      每条提示词的回复分析结果
 */

/** 诊断状态 */
export type AuditStatus = 'processing' | 'complete' | 'failed';

/** 诊断层级（影响提示词数量与维度） */
export type AuditTier = 'free' | 'pro';

/** 单条提示词分类（用于聚合分析） */
export type PromptCategory =
  | 'brand'
  | 'category'
  | 'competitor'
  | 'buying_intent'
  | 'conversational'
  | 'discovery';

/** 诊断列表行（不含巨大 result JSON，避免列表接口过大） */
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

/** 诊断详情（完整含 result 快照与 prompts 列表） */
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

/** 诊断单条提示词 + 结果（详情接口返回） */
export interface AuditPromptDetail {
  id: number;
  promptIndex: number;
  category: PromptCategory;
  engine: string;
  llmModelId: number | null;
  prompt: string;
  result: {
    id: number;
    mentioned: boolean;
    snippet: string | null;
    sentiment: string | null;
    sourceType: string | null;
    blindSpot: boolean;
    latencyMs: number | null;
    error: string | null;
  } | null;
}

/** 完整诊断结果快照（聚合后写入 Audit.result 列） */
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

/** 单引擎聚合数据 */
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

/** 盲点项（被诊断品牌应当回答上但引擎未提及的话题） */
export interface BlindSpotItem {
  category: string;
  prompt: string;
  engines: string[];
}

/** 引用来源（外部搜索结果） */
export interface CitationSource {
  title: string;
  url: string;
  snippet?: string;
}

/** 竞品对比分析 */
export interface CompetitorAnalysis {
  name: string;
  mentions: number;
  sentiment: string;
}

/** 网站健康度（来自 sidechecks） */
export interface WebsiteHealth {
  pass: number;
  warn: number;
  fail: number;
  checks: WebsiteCheck[];
}

export interface WebsiteCheck {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail?: string;
}

// ──────────────── 请求 DTO ────────────────

export interface AuditListQuery {
  page: number;
  pageSize: number;
  status?: AuditStatus;
  search?: string;
}

export interface DetectRequest {
  website: string;
}

export interface CreateAuditRequest {
  website?: string;
  brand: string;
  industry?: string;
  description?: string;
  competitors?: string[];
  keywords?: string[];
  features?: string[];
  suggestedPrompts?: string[];
  tier?: AuditTier;
}

// ──────────────── 响应 DTO ────────────────

export interface DetectResponse {
  brand: string;
  description?: string;
  industry?: string;
  keywords: string[];
  features: string[];
  competitors: string[];
  suggestedPrompts?: string[];
}

export interface CreateAuditResponse {
  jobId: string;
  plan: { engine: string; prompt: string; promptIndex: number; category: PromptCategory }[];
  total: number;
  engineCount: number;
}

export interface StatusResponse {
  status: AuditStatus;
  done: number;
  total: number;
  score: number | null;
  grade: string | null;
  result: AuditResult | null;
}
