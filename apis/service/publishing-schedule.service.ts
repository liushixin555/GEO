import type { PublishingSchedule, PublishingScheduleItem, PublishingScheduleUpdateResult, CreatePublishingScheduleRequest, UpdatePublishingScheduleRequest, PublishingScheduleListParams, AutoCreatePublishingScheduleRequest, AutoCreatePublishingScheduleResult } from '../entity/publishing-schedule.entity';
import type { AuthContext } from './article.service';

export interface IPublishingScheduleService {
  list(params: PublishingScheduleListParams, auth: AuthContext): Promise<{ list: PublishingScheduleItem[]; total: number }>;

  create(request: CreatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingSchedule>;
  autoCreate(request: AutoCreatePublishingScheduleRequest, auth: AuthContext): Promise<AutoCreatePublishingScheduleResult>;
  update(id: number, request: UpdatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingScheduleUpdateResult>;
  reject(id: number, auth: AuthContext, reason?: string): Promise<PublishingSchedule>;
  delete(id: number, auth: AuthContext): Promise<void>;
}
