import { SystemConfig, UpdateSystemConfigsRequest } from '../entity';
import { AuthContext } from './article.service';

export interface ISystemConfigService {
  getAll(auth: AuthContext): Promise<SystemConfig[]>;
  batchUpdate(request: UpdateSystemConfigsRequest, auth: AuthContext): Promise<SystemConfig[]>;
}
