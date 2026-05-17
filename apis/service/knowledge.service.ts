import { KnowledgeKeyword, KnowledgePortrait, KnowledgeImage, CreateKeywordRequest, UpdateKeywordRequest, CreatePortraitRequest, UpdatePortraitRequest, CreateImageRequest, UpdateImageRequest } from '../entity';

export interface IKeywordService {
  list(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }>;
  getById(id: number): Promise<KnowledgeKeyword>;
  create(projectId: number, request: CreateKeywordRequest, userId: number): Promise<KnowledgeKeyword>;
  update(id: number, request: UpdateKeywordRequest): Promise<KnowledgeKeyword>;
  delete(id: number): Promise<void>;
}

export interface IPortraitService {
  list(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgePortrait[]; total: number }>;
  getById(id: number): Promise<KnowledgePortrait>;
  create(projectId: number, request: CreatePortraitRequest, userId: number): Promise<KnowledgePortrait>;
  update(id: number, request: UpdatePortraitRequest): Promise<KnowledgePortrait>;
  delete(id: number): Promise<void>;
}

export interface IImageService {
  list(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeImage[]; total: number }>;
  getById(id: number): Promise<KnowledgeImage>;
  create(projectId: number, request: CreateImageRequest, userId: number): Promise<KnowledgeImage>;
  update(id: number, request: UpdateImageRequest): Promise<KnowledgeImage>;
  delete(id: number): Promise<void>;
}
