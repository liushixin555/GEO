import type { PublishingSchedule, PublishingScheduleItem, PublishingScheduleUpdateResult, CreatePublishingScheduleRequest, UpdatePublishingScheduleRequest, PublishingScheduleListParams } from '../entity/publishing-schedule.entity';
import type { AuthContext } from './article.service';

export interface IPublishingScheduleService {
  list(params: PublishingScheduleListParams, auth: AuthContext): Promise<{ list: PublishingScheduleItem[]; total: number }>;

  create(request: CreatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingSchedule>;
  update(id: number, request: UpdatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingScheduleUpdateResult>;
  reject(id: number, auth: AuthContext, reason?: string): Promise<PublishingSchedule>;
  delete(id: number, auth: AuthContext): Promise<void>;
}
