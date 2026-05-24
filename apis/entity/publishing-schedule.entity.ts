/** 发布计划列表查询参数 */
export interface PublishingScheduleListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  projectId?: number;
  userId?: number;
  role?: string;
}

/** 发布计划列表项 */
export interface PublishingScheduleItem {
  id: number;
  title: string;
  keywords: string | null;
  article_type: string | null;
  platforms: string[] | null;
  status: string;
  scheduled_publish_at: Date | null;
  schedule_type: string | null;
  project_id: number;
  project_name: string;
  company_name: string;
  created_by: number | null;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

/** 发布计划更新结果 */
export interface PublishingScheduleUpdateResult {
  id: number;
  title: string;
  keywords: string | null;
  article_type: string | null;
  platforms: string[] | null;
  status: string;
  scheduled_publish_at: Date | null;
  schedule_type: string | null;
  project_id: number;
  project_name: string;
  company_name: string;
  created_at: Date;
  updated_at: Date;
}
