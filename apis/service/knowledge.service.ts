import { KnowledgeKeyword, KnowledgePortrait, KnowledgeImage, CreateKeywordRequest, UpdateKeywordRequest, CreatePortraitRequest, UpdatePortraitRequest, CreateImageRequest, UpdateImageRequest } from '../entity';

export interface IKeywordService {
  list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }>;
  listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }>;
  getById(id: number): Promise<KnowledgeKeyword>;
  create(baseId: number, request: CreateKeywordRequest, userId: number): Promise<KnowledgeKeyword>;
  batchCreate(baseId: number, keywords: string[], userId: number): Promise<{ created: number; duplicates: number }>;
  listByGroup(groupId: number): Promise<KnowledgeKeyword[]>;
  syncGroup(groupId: number, baseId: number, keywords: string[], userId: number): Promise<KnowledgeKeyword[]>;
  update(id: number, request: UpdateKeywordRequest): Promise<KnowledgeKeyword>;
  delete(id: number): Promise<void>;
}

export interface IPortraitService {
  list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgePortrait[]; total: number }>;
  listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgePortrait[]; total: number }>;
  getById(id: number): Promise<KnowledgePortrait>;
  create(baseId: number, request: CreatePortraitRequest, userId: number): Promise<KnowledgePortrait>;
  update(id: number, request: UpdatePortraitRequest): Promise<KnowledgePortrait>;
  delete(id: number): Promise<void>;
}

export interface IImageService {
  list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeImage[]; total: number }>;
  listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeImage[]; total: number }>;
  getById(id: number): Promise<KnowledgeImage>;
  create(baseId: number, request: CreateImageRequest, userId: number): Promise<KnowledgeImage>;
  update(id: number, request: UpdateImageRequest): Promise<KnowledgeImage>;
  delete(id: number): Promise<void>;
}
