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
  /** 文章类型，推荐值：榜单排名/方法论讲解/案例分析/行业洞察/对比测评/客户证言/FAQ问答/实操指南 */
  article_type: string | null;
  /** 写作模式，推荐值：manual（手工编写）/ ai（AI 生成） */
  write_mode: string | null;
  keywords: string | null;
  portrait: string | null;
  images: string[] | null;
  platforms: string[] | null;
  /** Prisma Json? 类型，运行时可能为任意 JSON 结构；API 输入输出为 number[] | null */
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
  schedule_type?: ScheduleType | null;
}

export interface ReviewArticleRequest {
  approved: boolean;
}
