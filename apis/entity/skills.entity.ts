export interface Skills {
  id: number;
  name: string;
  category: string;
  description: string | null;
  status: boolean;
  company_id?: number | null;
  created_by?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSkillsRequest {
  name: string;
  category: string;
  description?: string;
  company_id?: number | null;
  created_by?: number | null;
}

export interface UpdateSkillsRequest {
  name?: string;
  category?: string;
  description?: string;
  status?: boolean;
}
