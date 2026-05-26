/**
 * 文章实体类型定义，映射 Prisma Article / ArticleVersion model
 * 单一真相源：Zod schema 和前端从此导出状态枚举
 */

/** 文章状态常量数组，与 Prisma ArticleStatus enum 一致 */
export const ARTICLE_STATUSES = [
  'draft',
  'manual_writing',
  'generating',
  'generate_failed',
  'pending_review',
  'approved',
  'publishing',
  'published',
  'publish_failed',
] as const;

/** 文章状态类型，从 ARTICLE_STATUSES 常量数组导出 */
export type ArticleStatus = typeof ARTICLE_STATUSES[number];

/** 文章类型，Prisma @db.VarChar(50) */
export type ArticleType =
  | '榜单排名'
  | '方法论讲解'
  | '案例分析'
  | '行业洞察'
  | '对比测评'
  | '客户证言'
  | 'FAQ问答'
  | '实操指南';

/** 写作模式，Prisma @db.VarChar(20) */
export type WriteMode = 'manual' | 'ai';

/** 文章内容生命周期状态（客户端可设置），发布状态由 PublishingSchedule 管理 */
export type ContentArticleStatus = 'draft' | 'manual_writing' | 'generating' | 'generate_failed' | 'pending_review' | 'approved';

/** 文章基础实体，映射 Prisma Article model */
export interface Article {
  id: number;
  /** 所属项目 ID */
  project_id: number;
  /** 文章标题，最长 500 字符（Prisma @db.VarChar(500)） */
  title: string;
  /** 文章类型，最长 50 字符（Prisma @db.VarChar(50)） */
  article_type: ArticleType | null;
  /** 写作模式，最长 20 字符（Prisma @db.VarChar(20)），合法值：manual/ai */
  write_mode: WriteMode | null;
  /** 关键词，最长 500 字符（Prisma @db.VarChar(500)） */
  keywords: string | null;
  /** 人物画像描述 */
  portrait: string | null;
  /** 图片 URL 列表（Prisma Json），最多 20 张 */
  images: string[] | null;
  /** 技能 ID 列表（Prisma Json），最多 50 个 */
  skills: number[] | null;
  /** LLM 模型 ID */
  llm_model_id: number | null;
  /** 文章内容（Markdown/HTML），最长 500000 字符 */
  content: string | null;
  /** 版本号（Prisma Float @default(1.0)） */
  version: number;
  /** 文章状态 */
  status: ArticleStatus;
  /** 创建者用户 ID */
  created_by: number | null;
  /** 创建时间（Prisma @db.Timestamptz） */
  created_at: Date;
  /** 更新时间（Prisma @db.Timestamptz） */
  updated_at: Date;
  /** 软删除时间（Prisma deletedAt DateTime?） */
  deleted_at: Date | null;
}

/** 文章详情，包含关联展示字段和聚合数据 */
export interface ArticleDetail extends Article {
  /** 创建者姓名，由 map 层从 User creator 关联填充 */
  creator_name: string | null;
  /** 关联的发布计划数量（Prisma _count.schedules 聚合） */
  schedule_count: number;
}

/** 文章版本实体，映射 Prisma ArticleVersion model */
export interface ArticleVersion {
  id: number;
  /** 所属文章 ID */
  article_id: number;
  /** 版本号 */
  version: number;
  /** 版本内容 */
  content: string;
  /** 创建者用户 ID */
  created_by: number | null;
  /** 创建时间（Prisma @db.Timestamptz） */
  created_at: Date;
  /** 软删除时间（Prisma deletedAt DateTime?） */
  deleted_at: Date | null;
}

/** 创建文章请求 DTO */
export interface CreateArticleRequest {
  /** 文章标题，最长 500 字符（Prisma @db.VarChar(500)） */
  title: string;
  /** 文章类型 */
  article_type?: ArticleType;
  /** 写作模式 */
  write_mode?: WriteMode;
  /** 关键词，最长 500 字符 */
  keywords?: string;
  /** 人物画像描述 */
  portrait?: string;
  /** 图片 URL 列表，最多 20 张 */
  images?: string[] | null;
  /** 技能 ID 列表，最多 50 个 */
  skills?: number[] | null;
  /** LLM 模型 ID */
  llm_model_id?: number | null;
  /** 文章内容，最长 500000 字符 */
  content?: string;
  /** 初始状态，仅允许 draft 或 manual_writing（generating 由系统内部设置） */
  status?: 'draft' | 'manual_writing';
}

/** 更新文章请求 DTO */
export interface UpdateArticleRequest {
  title?: string;
  article_type?: ArticleType;
  write_mode?: WriteMode;
  keywords?: string;
  portrait?: string;
  images?: string[] | null;
  /** 技能 ID 列表，最多 50 个 */
  skills?: number[] | null;
  llm_model_id?: number | null;
  content?: string;
  /** 状态更新，仅允许内容生命周期状态 */
  status?: ContentArticleStatus;
}

/** 审核拒绝原因分类 */
export type RejectReason = 'quality' | 'compliance' | 'accuracy' | 'other';

/** 审核文章请求 DTO */
export interface ReviewArticleRequest {
  /** 审核通过/拒绝 */
  approved: boolean;
  /** 审核意见，拒绝时建议必填 */
  comment?: string;
  /** 拒绝原因分类（当 approved=false 时） */
  reject_reason?: RejectReason;
}

/**
 * 运行时校验 skills 字段，防止数据库中被篡改的 JSON 透传到前端。
 * Prisma Json → number[] | null 的安全收窄。
 */
export function validateSkills(value: unknown): number[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  if (!value.every((v): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0)) return null;
  return value;
}
