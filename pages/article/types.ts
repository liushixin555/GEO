/** 文章内容生命周期状态（不含发布状态，发布状态由 PublishingSchedule 独立管理） */
export type ArticleStatus =
  | 'draft'
  | 'manual_writing'
  | 'generating'
  | 'generate_failed'
  | 'pending_review'
  | 'approved';

export type ArticleType =
  | '榜单排名'
  | '方法论讲解'
  | '案例分析'
  | '行业洞察'
  | '对比测评'
  | '客户证言'
  | 'FAQ问答'
  | '实操指南';

export type WriteMode = 'manual' | 'ai';

export interface ArticleData {
  id: number;
  title: string;
  article_type: ArticleType | null;
  write_mode: WriteMode | null;
  keywords: string | null;
  portrait: string | null;
  images: string[] | null;
  skills: number[] | null;
  llm_model_id: number | null;
  content: string | null;
  version: number;
  status: ArticleStatus;
  created_by: number | null;
  creator_name?: string | null;
  schedule_count?: number;
  deleted_at?: string | null;
  evidenceCards?: ArticleEvidenceCard[];
}

export interface ArticleFormValues {
  title?: string;
  article_type?: ArticleType;
  write_mode?: WriteMode;
  keywords?: string | string[];
  portrait?: string[];
  skills?: number[];
  llm_model_id?: number;
}

export interface SkillOption {
  label: string;
  value: number;
}

export interface LlmModelOption {
  label: string;
  value: number;
}

export interface KbKeyword {
  label: string;
  value: string;
}

export interface KbPortrait {
  label: string;
  value: string;
}

export interface KbImage {
  id: number;
  title: string;
  image_url: string;
}

export const STATUS_CONFIG: Record<ArticleStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  manual_writing: { label: '手工编写中', color: 'processing' },
  generating: { label: '生成中', color: 'processing' },
  generate_failed: { label: '生成失败', color: 'error' },
  pending_review: { label: '待审核', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
};

export const EDITABLE_STATUSES: ArticleStatus[] = ['draft', 'manual_writing', 'generate_failed'];

export const ARTICLE_TYPE_OPTIONS: { label: string; value: ArticleType }[] = [
  { label: '榜单排名', value: '榜单排名' },
  { label: '方法论讲解', value: '方法论讲解' },
  { label: '案例分析', value: '案例分析' },
  { label: '行业洞察', value: '行业洞察' },
  { label: '对比测评', value: '对比测评' },
  { label: '客户证言', value: '客户证言' },
  { label: 'FAQ问答', value: 'FAQ问答' },
  { label: '实操指南', value: '实操指南' },
];

export interface SkillApiItem {
  id: number;
  name: string;
}

export interface LlmModelApiItem {
  id: number;
  provider: string;
  model_name: string;
}

export interface KbKeywordApiItem {
  keyword: string;
}

export interface KbPortraitApiItem {
  title: string;
  content?: string;
}

export interface KbImageApiItem {
  id: number;
  title: string;
  image_url: string;
}

export type EvidenceCardType =
  | 'fact'
  | 'case'
  | 'method'
  | 'capability'
  | 'faq'
  | 'statistic'
  | 'quote'
  | 'image_description'
  | 'external';

export type EvidenceCardSourceType =
  | 'portrait'
  | 'document'
  | 'image'
  | 'manual'
  | 'external';

export type ArticleEvidenceUsageType = 'retrieved' | 'injected' | 'rejected';

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
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ArticleEvidenceCard {
  id?: number;
  articleId?: number;
  evidenceCardId?: number;
  usageType?: ArticleEvidenceUsageType;
  createdAt?: string;
  evidenceCard?: EvidenceCard;
}

export const EVIDENCE_TYPE_OPTIONS: { label: string; value: EvidenceCardType }[] = [
  { label: '事实', value: 'fact' },
  { label: '案例', value: 'case' },
  { label: '方法论', value: 'method' },
  { label: '能力', value: 'capability' },
  { label: '问答', value: 'faq' },
  { label: '数据', value: 'statistic' },
  { label: '引用', value: 'quote' },
  { label: '图片描述', value: 'image_description' },
  { label: '外部材料', value: 'external' },
];

export const SOURCE_TYPE_OPTIONS: { label: string; value: EvidenceCardSourceType }[] = [
  { label: '画像', value: 'portrait' },
  { label: '文档', value: 'document' },
  { label: '图片', value: 'image' },
  { label: '手工录入', value: 'manual' },
  { label: '外部来源', value: 'external' },
];
