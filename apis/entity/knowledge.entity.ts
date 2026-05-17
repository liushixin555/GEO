export interface KnowledgeKeyword {
  id: number;
  project_id: number;
  keyword: string;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgePortrait {
  id: number;
  project_id: number;
  title: string;
  content: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeImage {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  image_url: string;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKeywordRequest {
  keyword: string;
}

export interface UpdateKeywordRequest {
  keyword: string;
}

export interface CreatePortraitRequest {
  title: string;
  content?: string;
}

export interface UpdatePortraitRequest {
  title?: string;
  content?: string;
}

export interface CreateImageRequest {
  title: string;
  description?: string;
  image_url: string;
}

export interface UpdateImageRequest {
  title?: string;
  description?: string;
}
