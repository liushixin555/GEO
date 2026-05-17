import { getPrisma } from '../../utils';
import { SystemConfig, UpdateSystemConfigsRequest } from '../../entity';
import { mapSystemConfig } from '../../map';
import { ISystemConfigService } from '../system-config.service';

export class SystemConfigServiceImpl implements ISystemConfigService {
  async getAll(): Promise<SystemConfig[]> {
    const prisma = getPrisma();
    const items = await prisma.systemConfig.findMany({ orderBy: { id: 'asc' } });
    return items.map(mapSystemConfig);
  }

  async batchUpdate(request: UpdateSystemConfigsRequest): Promise<SystemConfig[]> {
    const prisma = getPrisma();
    const results = await prisma.$transaction(
      request.configs.map(config =>
        prisma.systemConfig.upsert({
          where: { configKey: config.config_key },
          update: { configValue: config.config_value },
          create: { configKey: config.config_key, configValue: config.config_value },
        })
      )
    );
    return results.map(mapSystemConfig);
  }
}
