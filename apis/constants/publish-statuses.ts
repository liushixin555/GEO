export const PUBLISH_SCHEDULE_STATUSES = ['pending', 'publishing', 'published', 'publish_failed'] as const;

export type PublishScheduleStatus = (typeof PUBLISH_SCHEDULE_STATUSES)[number];
