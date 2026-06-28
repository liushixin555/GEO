/** 发布计划状态枚举 */
export type PublishingScheduleStatus = 'pending' | 'publishing' | 'published' | 'publish_failed';

/** 发布计划类型：尽快执行 / 指定时间执行 / 指定时间之后执行 */
export type ScheduleType = 'asap' | 'scheduled' | 'after';

/** 发布计划实体 */
export interface PublishingSchedule {
  id: number;
  article_id: number;
  platforms: string[] | null;
  schedule_type: ScheduleType | null;
  scheduled_publish_at: Date | null;
  status: PublishingScheduleStatus;
  reject_reason: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

/** 创建发布计划请求 */
export interface CreatePublishingScheduleRequest {
  article_id: number;
  platforms: string[];
  schedule_type: ScheduleType;
  scheduled_publish_at?: string | null;
}

export type AutoPublishStrategy = 'round_robin' | 'random';

export interface AutoCreatePublishingScheduleRequest {
  article_ids: number[];
  strategy: AutoPublishStrategy;
  schedule_type: ScheduleType;
  scheduled_publish_at?: string | null;
}

export interface AutoCreatePublishingScheduleResult {
  created: number;
  items: Array<{
    article_id: number;
    schedule_id: number;
    platform_id: number;
    platform_name: string;
  }>;
}

/** 更新发布计划请求 */
export interface UpdatePublishingScheduleRequest {
  schedule_type?: ScheduleType | null;
  scheduled_publish_at?: string | null;
  status?: PublishingScheduleStatus;
}

/** 发布计划列表查询参数 */
export interface PublishingScheduleListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  projectId?: number;
}

/** 发布计划列表项（含关联信息） */
export interface PublishingScheduleItem {
  id: number;
  article_id: number;
  title: string;
  keywords: string | null;
  article_type: string | null;
  platforms: string[] | null;
  status: string;
  schedule_type: string | null;
  scheduled_publish_at: Date | null;
  project_id: number;
  project_name: string;
  company_name: string;
  created_by: number | null;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
  orders?: PublishingPlatformOrder[];
}

export interface PublishingPlatformOrder {
  id: number;
  schedule_id: number;
  platform_id: number;
  rm_order_id: string;
  rm_status: number;
  rm_response_message: string | null;
  rm_resource_name: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** 发布计划更新结果 */
export interface PublishingScheduleUpdateResult {
  id: number;
  article_id: number;
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
