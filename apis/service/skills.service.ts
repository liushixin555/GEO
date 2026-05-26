import { Skills, CreateSkillsRequest, UpdateSkillsRequest } from '../entity';

export interface ISkillsService {
  list(page: number, pageSize: number, search?: string): Promise<{ list: Skills[]; total: number }>;
  getById(id: number): Promise<Skills>;
  findSoftDeletedByName(name: string): Promise<{ id: number; skill_dir: string } | null>;
  create(request: CreateSkillsRequest): Promise<Skills>;
  update(id: number, request: UpdateSkillsRequest): Promise<Skills>;
  delete(id: number): Promise<void>;
}
