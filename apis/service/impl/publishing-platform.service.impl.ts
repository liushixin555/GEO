import { getPrisma } from '../../utils';
import { getRmToken, getAllRmResources } from '../../utils/rmapi.utils';
import { PublishingPlatform } from '../../entity';
import { mapPublishingPlatform } from '../../map';
import { IPublishingPlatformService } from '../publishing-platform.service';

export class PublishingPlatformServiceImpl implements IPublishingPlatformService {
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

    // 3. Full replace in a transaction using upsert
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const remoteIds = resources.map((r) => r.id);

      // Delete records no longer in remote data
      await tx.publishingPlatform.deleteMany({
        where: { rmResourceId: { notIn: remoteIds } },
      });

      // Upsert each resource
      for (const r of resources) {
        await tx.publishingPlatform.upsert({
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
        });
      }
    });

    return resources.length;
  }

  async listAll(): Promise<PublishingPlatform[]> {
    const prisma = getPrisma();
    const items = await prisma.publishingPlatform.findMany({ orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }] });
    return items.map(mapPublishingPlatform);
  }
}
