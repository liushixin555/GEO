export interface Article {
  id: number;
  project_id: number;
  title: string;
  keywords: string[] | null;
  portrait: string | null;
  images: string[] | null;
  platforms: string[] | null;
  skills: number | null;
  llm_model_id: number | null;
  content: string | null;
  version: number;
  status: string;
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
  title: string;
  keywords?: string[];
  portrait?: string;
  images?: string[];
  platforms?: string[];
  skills?: number;
  llm_model_id?: number;
  status?: 'draft' | 'generating';
}

export interface UpdateArticleRequest {
  title?: string;
  keywords?: string[];
  portrait?: string;
  images?: string[];
  platforms?: string[];
  skills?: number;
  llm_model_id?: number;
  content?: string;
  status?: string;
}

export interface ReviewArticleRequest {
  approved: boolean;
}
