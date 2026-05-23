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
  skills: number | null;
  llm_model_id: number | null;
  content: string | null;
  version: number;
  status: string;
  scheduled_publish_at: Date | null;
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
  skills?: number;
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
  skills?: number;
  llm_model_id?: number;
  content?: string;
  status?: string;
  scheduled_publish_at?: string | null;
}

export interface ReviewArticleRequest {
  approved: boolean;
}
