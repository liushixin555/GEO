import { KnowledgeBase, CreateKnowledgeBaseRequest, UpdateKnowledgeBaseRequest } from '../entity';

export interface IKnowledgeBaseService {
  list(page: number, pageSize: number, search?: string, scope?: string, status?: boolean, userId?: number, role?: string): Promise<{ list: KnowledgeBase[]; total: number }>;
  getById(id: number, userId?: number, role?: string): Promise<KnowledgeBase>;
  create(request: CreateKnowledgeBaseRequest, userId: number, role?: string): Promise<KnowledgeBase>;
  update(id: number, request: UpdateKnowledgeBaseRequest, userId: number, role: string): Promise<KnowledgeBase>;
  delete(id: number, userId: number, role: string): Promise<void>;
  getAccessibleBaseIds(projectId: number): Promise<number[]>;
}
