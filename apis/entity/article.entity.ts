/** 文章状态枚举，与 Prisma ArticleStatus 一致 */
export type ArticleStatus =
  | 'draft'
  | 'manual_writing'
  | 'generating'
  | 'generate_failed'
  | 'pending_review'
  | 'publishing'
  | 'publish_failed'
  | 'published';

/** 发布计划类型：尽快执行 / 指定时间执行 / 指定时间之后执行 */
export type ScheduleType = 'asap' | 'scheduled' | 'after';

export interface Article {
  id: number;
  project_id: number;
  title: string;
  article_type: string | null;
  write_mode: string | null;
  keywords: string | null;
  portrait: string | null;
  images: string[] | null;
  platforms: string[] | null;
  /** Prisma Json? 类型，运行时可能为任意 JSON 结构 */
  skills: unknown | null;
  llm_model_id: number | null;
  /** 文章正文（纯文本，禁止 HTML） */
  content: string | null;
  /** 版本号（Prisma Float，递增整数使用） */
  version: number;
  status: ArticleStatus;
  scheduled_publish_at: Date | null;
  schedule_type: ScheduleType | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
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
  images?: string[];
  platforms?: string[];
  /** 技能 ID 数组（与 Prisma Json? 对齐） */
  skills?: number[];
  llm_model_id?: number;
  content?: string;
  status?: 'draft' | 'generating' | 'manual_writing';
}

export interface UpdateArticleRequest {
  title?: string;
  article_type?: string;
  write_mode?: string;
  keywords?: string;
  portrait?: string;
  images?: string[];
  platforms?: string[];
  skills?: unknown;
  llm_model_id?: number;
  content?: string;
  status?: ArticleStatus;
  scheduled_publish_at?: string | null;
  schedule_type?: ScheduleType | null;
}

export interface ReviewArticleRequest {
  approved: boolean;
}
