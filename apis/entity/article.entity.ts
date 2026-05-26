/** 文章状态枚举，与 Prisma ArticleStatus 一致 */
export type ArticleStatus =
  | 'draft'
  | 'manual_writing'
  | 'generating'
  | 'generate_failed'
  | 'pending_review'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'publish_failed';

export interface Article {
  id: number;
  project_id: number;
  title: string;
  article_type: string | null;
  write_mode: string | null;
  keywords: string | null;
  portrait: string | null;
  images: string[] | null;
  /** Prisma Json? 类型，运行时可能为任意 JSON 结构；API 输入输出为 number[] | null */
  skills: unknown | null;
  llm_model_id: number | null;
  content: string | null;
  version: number;
  status: ArticleStatus;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 关联的发布计划数量 */
  schedule_count?: number;
}

export interface ArticleVersion {
  id: number;
  article_id: number;
  version: number;
  content: string;
  created_by: number | null;
  created_at: Date;
}

export interface CreateArticleRequest {
  title?: string;
  article_type?: string;
  write_mode?: string;
  keywords?: string;
  portrait?: string;
  images?: string[] | null;
  platforms?: string[] | null;
  skills?: number[] | null;
  llm_model_id?: number | null;
  content?: string;
  status?: 'draft' | 'generating' | 'manual_writing';
}

export interface UpdateArticleRequest {
  title?: string;
  article_type?: string;
  write_mode?: string;
  keywords?: string;
  portrait?: string;
  images?: string[] | null;
  platforms?: string[] | null;
  skills?: number[] | null;
  llm_model_id?: number | null;
  content?: string;
  status?: ArticleStatus;
  scheduled_publish_at?: string | null;
}

export interface ReviewArticleRequest {
  approved: boolean;
}
