export interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  scope: 'platform' | 'company' | 'project';
  company_id: number | null;
  company_name: string | null;
  project_id: number | null;
  project_name: string | null;
  status: boolean;
  created_by: number | null;
  creator_name: string | null;
  keyword_count: number;
  portrait_count: number;
  image_count: number;
  document_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
  scope: 'platform' | 'company' | 'project';
  company_id?: number;
  project_id?: number;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  description?: string;
  scope?: 'platform' | 'company' | 'project';
  company_id?: number;
  project_id?: number;
  status?: boolean;
}
