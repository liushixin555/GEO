export interface KnowledgeKeyword {
  id: number;
  base_id: number;
  keyword: string;
  seed_word: string | null;
  group_id: number | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  expanded_words?: KeywordExpandedWord[];
}

export interface KeywordExpandedWord {
  id: number;
  keyword_id: number;
  word: string;
  selected: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgePortrait {
  id: number;
  base_id: number;
  title: string;
  content: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeImage {
  id: number;
  base_id: number;
  title: string;
  description: string | null;
  image_url: string;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKeywordRequest {
  keyword: string;
  expanded_words?: { word: string; selected: boolean }[];
}

export interface UpdateKeywordRequest {
  keyword: string;
  expanded_words?: { word: string; selected: boolean }[];
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
