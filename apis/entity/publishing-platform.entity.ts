export interface PublishingPlatform {
  id: number;
  rm_resource_id: number;
  name: string;
  taxonomy: string;
  price: number;
  remark: string | null;
  include_rate: number;
  publish_rate: number;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}
