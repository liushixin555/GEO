import { SystemConfig, UpdateSystemConfigsRequest } from '../entity';

export interface ISystemConfigService {
  getAll(): Promise<SystemConfig[]>;
  batchUpdate(request: UpdateSystemConfigsRequest): Promise<SystemConfig[]>;
}
