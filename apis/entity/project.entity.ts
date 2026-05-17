export interface Project {
  id: number;
  short_name: string;
  full_name: string;
  description: string | null;
  company_id: number;
  company_name: string;
  operator_ids: number[];
  operator_names: string[];
  viewer_ids: number[];
  viewer_names: string[];
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectRequest {
  short_name: string;
  full_name: string;
  description?: string;
  company_id: number;
  operator_ids?: number[];
  viewer_ids?: number[];
}

export interface UpdateProjectRequest {
  short_name?: string;
  full_name?: string;
  description?: string;
  company_id?: number;
  operator_ids?: number[];
  viewer_ids?: number[];
  status?: boolean;
}
