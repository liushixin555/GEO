import { Skills, CreateSkillsRequest, UpdateSkillsRequest } from '../entity';

export interface ISkillsService {
  list(page: number, pageSize: number, search?: string, category?: string, status?: boolean): Promise<{ list: Skills[]; total: number }>;
  getById(id: number): Promise<Skills>;
  create(request: CreateSkillsRequest): Promise<Skills>;
  update(id: number, request: UpdateSkillsRequest): Promise<Skills>;
  delete(id: number): Promise<void>;
}
