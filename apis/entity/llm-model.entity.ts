export interface LlmModel {
  id: number;
  provider: string;
  base_url: string;
  api_key: string;
  model_name: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLlmModelRequest {
  provider: string;
  base_url: string;
  api_key: string;
  model_name: string;
}

export interface UpdateLlmModelRequest {
  provider?: string;
  base_url?: string;
  api_key?: string;
  model_name?: string;
  status?: boolean;
}
