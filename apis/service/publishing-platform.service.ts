import { PublishingPlatform } from '../entity';

export interface IPublishingPlatformService {
  /** 从系统配置读取凭证并同步软盟发布平台资源 */
  syncFromSystemConfig(): Promise<number>;
  /** 全量同步软盟发布平台资源到本地表 */
  syncFromRm(username: string, password: string): Promise<number>;
  /** 获取所有发布平台 */
  listAll(): Promise<PublishingPlatform[]>;
  /** 分页查询发布平台 */
  list(page: number, pageSize: number, search?: string, taxonomy?: string, sortBy?: string, sortOrder?: string, isFavorite?: boolean): Promise<{ list: PublishingPlatform[]; total: number }>;
  /** 获取所有不重复的分类 */
  listTaxonomies(): Promise<string[]>;
  setFavorite(id: number, isFavorite: boolean): Promise<PublishingPlatform>;
}
