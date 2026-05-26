import { KnowledgeBase, KnowledgeBaseDetail, KnowledgeScope, CreateKnowledgeBaseRequest, UpdateKnowledgeBaseRequest } from '../entity';

export interface IKnowledgeBaseService {
  list(page: number, pageSize: number, search?: string, scope?: KnowledgeScope, status?: boolean, userId?: number, role?: string): Promise<{ list: KnowledgeBaseDetail[]; total: number }>;
  getById(id: number, userId?: number, role?: string): Promise<KnowledgeBaseDetail>;
  create(request: CreateKnowledgeBaseRequest, userId: number, role?: string): Promise<KnowledgeBaseDetail>;
  update(id: number, request: UpdateKnowledgeBaseRequest, userId: number, role: string): Promise<KnowledgeBaseDetail>;
  delete(id: number, userId: number, role: string): Promise<void>;
  getAccessibleBaseIds(projectId: number): Promise<number[]>;
}
