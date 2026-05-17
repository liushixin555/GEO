import { getPrisma } from '../../utils';
import { getRmToken, getAllRmResources } from '../../utils/rmapi.utils';
import { PublishingPlatform } from '../../entity';
import { mapPublishingPlatform } from '../../map';
import { IPublishingPlatformService } from '../publishing-platform.service';

export class PublishingPlatformServiceImpl implements IPublishingPlatformService {
  async syncFromRm(username: string, password: string): Promise<number> {
    // 1. Authenticate with RM API
    const token = await getRmToken({ mobile: username, password });

    // 2. Fetch all resources
    const resources = await getAllRmResources(token);

    // 3. Full replace in a transaction
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.publishingPlatform.deleteMany();
      if (resources.length > 0) {
        await tx.publishingPlatform.createMany({
          data: resources.map((r) => ({
            rmResourceId: r.id,
            name: r.name,
            taxonomy: r.taxonomy,
            price: r.price,
            remark: r.remark || null,
            includeRate: r.include_rate ?? 0,
            publishRate: r.publish_rate ?? 0,
          })),
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
