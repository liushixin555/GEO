import type { PublishingScheduleListParams, PublishingScheduleItem, PublishingScheduleUpdateResult } from '../entity/publishing-schedule.entity';

export interface IPublishingScheduleService {
  list(params: PublishingScheduleListParams): Promise<{ list: PublishingScheduleItem[]; total: number }>;

  updateSchedule(
    id: number,
    scheduledPublishAt: string | null,
    scheduleType: string | null,
    userId: number,
    role: string,
  ): Promise<PublishingScheduleUpdateResult>;
}
