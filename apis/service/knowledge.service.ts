import { KnowledgeKeyword, KnowledgeKeywordDetail, KnowledgePortrait, KnowledgeImage, KnowledgeDocument, CreateKeywordRequest, UpdateKeywordRequest, CreatePortraitRequest, UpdatePortraitRequest, CreateImageRequest, UpdateImageRequest, CreateDocumentRequest, UpdateDocumentRequest, MinedKeyword } from '../entity';

export interface IKeywordService {
  list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }>;
  listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }>;
  getById(id: number): Promise<KnowledgeKeywordDetail>;
  create(baseId: number, request: CreateKeywordRequest, userId: number): Promise<KnowledgeKeywordDetail>;
  batchCreate(baseId: number, keywords: string[], userId: number, seedWord?: string): Promise<{ created: number; duplicates: number }>;
  listByGroup(groupId: number): Promise<KnowledgeKeyword[]>;
  syncGroup(groupId: number, baseId: number, keywords: string[], userId: number): Promise<KnowledgeKeyword[]>;
  update(id: number, request: UpdateKeywordRequest): Promise<KnowledgeKeywordDetail>;
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
  checkDuplicate(baseId: number, title: string, imageUrl: string): Promise<void>;
  checkDuplicateTitle(baseId: number, title: string, excludeId: number): Promise<void>;
}

export interface IDocumentService {
  list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeDocument[]; total: number }>;
  listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeDocument[]; total: number }>;
  getById(id: number): Promise<KnowledgeDocument>;
  create(baseId: number, request: CreateDocumentRequest, userId: number): Promise<KnowledgeDocument>;
  update(id: number, request: UpdateDocumentRequest): Promise<KnowledgeDocument>;
  delete(id: number): Promise<void>;
  checkDuplicate(baseId: number, title: string, fileUrl: string): Promise<void>;
  checkDuplicateTitle(baseId: number, title: string, excludeId: number): Promise<void>;
}

export interface IMinedKeywordService {
  listByBase(baseId: number): Promise<MinedKeyword[]>;
  addMinedKeywords(baseId: number, keywords: string[], userId: number): Promise<{ added: number; duplicates: number }>;
  toggleSelectBatch(baseId: number, ids: number[], selected: boolean): Promise<void>;
  deleteByIds(baseId: number, ids: number[]): Promise<void>;
  clearAll(baseId: number): Promise<void>;
  aggregateContent(baseId: number, sourceType: string): Promise<string>;
  saveAndRemove(baseId: number, keywords: string[], userId: number, keywordService: IKeywordService): Promise<{ created: number; duplicates: number }>;
}
