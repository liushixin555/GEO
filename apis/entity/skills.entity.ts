export interface Skills {
  id: number;
  name: string;
  description: string | null;
  skill_dir: string;
  created_by: number | null;
  creator_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSkillsRequest {
  name: string;
  description?: string;
  skill_dir: string;
  created_by?: number;
}

export interface UpdateSkillsRequest {
  name?: string;
  description?: string;
}
