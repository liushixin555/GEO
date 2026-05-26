import { SkillsDetail, CreateSkillsRequest, UpdateSkillsRequest } from '../entity';

export interface ISkillsService {
  list(page: number, pageSize: number, search?: string): Promise<{ list: SkillsDetail[]; total: number }>;
  getById(id: number): Promise<SkillsDetail>;
  findSoftDeletedByName(name: string): Promise<{ id: number; skill_dir: string } | null>;
  create(request: CreateSkillsRequest, createdBy: number): Promise<SkillsDetail>;
  update(id: number, request: UpdateSkillsRequest): Promise<SkillsDetail>;
  delete(id: number): Promise<void>;
}
