import type { PublishingSchedule, PublishingScheduleItem, PublishingScheduleUpdateResult, CreatePublishingScheduleRequest, UpdatePublishingScheduleRequest } from '../entity/publishing-schedule.entity';
import type { AuthContext } from './article.service';

export interface IPublishingScheduleService {
  list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    projectId?: number;
    userId?: number;
    role?: string;
  }): Promise<{ list: PublishingScheduleItem[]; total: number }>;

  create(request: CreatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingSchedule>;
  update(id: number, request: UpdatePublishingScheduleRequest, auth: AuthContext): Promise<PublishingScheduleUpdateResult>;
  reject(id: number, auth: AuthContext): Promise<PublishingSchedule>;
  delete(id: number, auth: AuthContext): Promise<void>;
}
