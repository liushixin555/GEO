export const PUBLISH_STATUSES = ['publishing', 'published', 'publish_failed'] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const PUBLISH_SCHEDULE_STATUSES = ['pending', 'publishing', 'published', 'publish_failed'] as const;

export type PublishScheduleStatus = (typeof PUBLISH_SCHEDULE_STATUSES)[number];
