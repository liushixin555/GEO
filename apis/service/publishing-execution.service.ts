export interface PublishingExecutionResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export interface IPublishingExecutionService {
  processDueSchedules(now?: Date): Promise<PublishingExecutionResult>;
}
