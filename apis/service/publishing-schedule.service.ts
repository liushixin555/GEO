export interface IPublishingScheduleService {
  list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    projectId?: number;
    userId?: number;
    role?: string;
  }): Promise<{ list: any[]; total: number }>;

  updateSchedule(
    id: number,
    scheduledPublishAt: string | null,
    scheduleType: string | null,
    userId?: number,
    role?: string,
  ): Promise<any>;
}
