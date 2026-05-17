export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateSystemConfigsRequest {
  configs: Array<{ config_key: string; config_value: string }>;
}
