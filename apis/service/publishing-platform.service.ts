import { PublishingPlatform } from '../entity';

export interface IPublishingPlatformService {
  /** 全量同步软盟发布平台资源到本地表 */
  syncFromRm(username: string, password: string): Promise<number>;
  /** 获取所有发布平台 */
  listAll(): Promise<PublishingPlatform[]>;
  /** 分页查询发布平台 */
  list(page: number, pageSize: number, search?: string, taxonomy?: string): Promise<{ list: PublishingPlatform[]; total: number }>;
}
