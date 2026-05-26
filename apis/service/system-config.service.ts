import { SystemConfig, UpdateSystemConfigsRequest } from '../entity';
import type { AuthContext } from '../types/auth';

export interface ISystemConfigService {
  getAll(auth: AuthContext): Promise<SystemConfig[]>;
  batchUpdate(request: UpdateSystemConfigsRequest, auth: AuthContext): Promise<SystemConfig[]>;
}
