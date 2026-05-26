import { getPrisma } from '../../utils';
import { getRmToken, getAllRmResources } from '../../utils/rmapi.utils';
import { PublishingPlatform } from '../../entity';
import { mapPublishingPlatform } from '../../map';
import { BusinessError } from '../../errors';
import { IPublishingPlatformService } from '../publishing-platform.service';
import type { ISystemConfigService } from '../system-config.service';
import { SystemConfigServiceImpl } from './system-config.service.impl';
import type { AuthContext } from '../../types/auth';

const SYSTEM_AUTH: AuthContext = { userId: 0, role: 'sysadmin' };

export class PublishingPlatformServiceImpl implements IPublishingPlatformService {
  private systemConfigService: ISystemConfigService;

  constructor() {
    this.systemConfigService = new SystemConfigServiceImpl();
  }

  async syncFromSystemConfig(): Promise<number> {
    const configs = await this.systemConfigService.getAll(SYSTEM_AUTH);
    const configMap = new Map(configs.map((c) => [c.config_key, c.config_value]));
    const username = configMap.get('ruanmeng_username');
    const password = configMap.get('ruanmeng_password');

    if (!username || !password) {
      throw new BusinessError('请先配置软盟账号和密码');
    }

    return this.syncFromRm(username, password);
  }

  async syncFromRm(username: string, password: string): Promise<number> {
    // 1. Authenticate with RM API
    const token = await getRmToken({ mobile: username, password });

    // 2. Fetch all resources and deduplicate by id
    const rawResources = await getAllRmResources(token);
    const seen = new Set<number>();
    const resources = rawResources.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // 3. Full replace: delete stale records, then upsert in batches
    const prisma = getPrisma();
    const remoteIdSet = new Set(resources.map((r) => r.id));

    // Delete records no longer in remote data (batch to avoid PG bind variable limit)
    const existing = await prisma.publishingPlatform.findMany({ select: { rmResourceId: true } });
    const toDelete = existing.map((e) => e.rmResourceId).filter((id) => !remoteIdSet.has(id));
    const DELETE_BATCH = 30000;
    for (let i = 0; i < toDelete.length; i += DELETE_BATCH) {
      await prisma.publishingPlatform.deleteMany({
        where: { rmResourceId: { in: toDelete.slice(i, i + DELETE_BATCH) } },
      });
    }

    // Upsert resources in small batches to avoid transaction timeout
    const UPSERT_BATCH = 500;
    for (let i = 0; i < resources.length; i += UPSERT_BATCH) {
      const batch = resources.slice(i, i + UPSERT_BATCH);
      await prisma.$transaction(
        batch.map((r) =>
          prisma.publishingPlatform.upsert({
            where: { rmResourceId: r.id },
            create: {
              rmResourceId: r.id,
              name: r.name,
              taxonomy: r.taxonomy,
              price: r.price,
              remark: r.remark || null,
              includeRate: r.include_rate ?? 0,
              publishRate: r.publish_rate ?? 0,
            },
            update: {
              name: r.name,
              taxonomy: r.taxonomy,
              price: r.price,
              remark: r.remark || null,
              includeRate: r.include_rate ?? 0,
              publishRate: r.publish_rate ?? 0,
            },
          }),
        ),
      );
    }

    return resources.length;
  }

  async listAll(): Promise<PublishingPlatform[]> {
    const prisma = getPrisma();
    const items = await prisma.publishingPlatform.findMany({ orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }] });
    return items.map(mapPublishingPlatform);
  }

  async list(page: number, pageSize: number, search?: string, taxonomy?: string, sortBy?: string, sortOrder?: string): Promise<{ list: PublishingPlatform[]; total: number }> {
    const prisma = getPrisma();
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { taxonomy: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (taxonomy) {
      where.taxonomy = taxonomy;
    }

    // Map frontend field names to Prisma field names
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      taxonomy: 'taxonomy',
      price: 'price',
      include_rate: 'includeRate',
      publish_rate: 'publishRate',
    };
    const order = (sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
    const orderBy = sortBy && sortFieldMap[sortBy]
      ? [{ [sortFieldMap[sortBy]]: order }] as any
      : [{ taxonomy: 'asc' }, { name: 'asc' }];

    const [items, total] = await Promise.all([
      prisma.publishingPlatform.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.publishingPlatform.count({ where }),
    ]);
    return { list: items.map(mapPublishingPlatform), total };
  }
}
