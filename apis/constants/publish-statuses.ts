export const PUBLISH_STATUSES = ['publishing', 'published', 'publish_failed'] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];
