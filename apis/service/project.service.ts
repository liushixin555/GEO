import { Project, CreateProjectRequest, UpdateProjectRequest } from '../entity';

export interface IProjectService {
  list(page: number, pageSize: number, search?: string, company_id?: number, status?: boolean, userId?: number, role?: string): Promise<{ list: Project[]; total: number }>;
  getById(id: number, userId?: number, role?: string): Promise<Project>;
  create(request: CreateProjectRequest): Promise<Project>;
  update(id: number, request: UpdateProjectRequest, userId?: number, role?: string): Promise<Project>;
  delete(id: number, userId?: number, role?: string): Promise<void>;
}
