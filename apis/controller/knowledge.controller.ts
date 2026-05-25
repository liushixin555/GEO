import { Request, Response } from 'express';
import { z } from 'zod';
import { KeywordServiceImpl, PortraitServiceImpl, ImageServiceImpl, DocumentServiceImpl, MinedKeywordServiceImpl } from '../service/impl/knowledge.service.impl';
import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { LlmServiceImpl } from '../service/impl/llm.service.impl';
import { success, fail, paginate, created, getPrisma } from '../utils';
import { AppError, NotFoundError, BusinessError, ForbiddenError, ConflictError, UnauthorizedError } from '../errors';
import { logger } from '../utils/logger.util';
import {
  createKeywordSchema, updateKeywordSchema, batchCreateKeywordsSchema, expandKeywordsSchema,
  createPortraitSchema, updatePortraitSchema, createImageSchema, updateImageSchema,
  createDocumentSchema, updateDocumentSchema, mineKeywordsSchema, saveMinedKeywordsSchema,
  toggleMinedKeywordsBatchSchema,
} from '../schema/knowledge.schema';

// --- Lazy-initialized service container (M-1: enables test mocking) ---

function createServices() {
  return {
    keywordService: new KeywordServiceImpl(),
    portraitService: new PortraitServiceImpl(),
    imageService: new ImageServiceImpl(),
    documentService: new DocumentServiceImpl(),
    knowledgeBaseService: new KnowledgeBaseServiceImpl(),
    projectService: new ProjectServiceImpl(),
    llmService: new LlmServiceImpl(),
    minedKeywordService: new MinedKeywordServiceImpl(),
  };
}

type Services = ReturnType<typeof createServices>;
let _services: Services | null = null;
function getServices(): Services {
  if (!_services) _services = createServices();
  return _services;
}

/** Reset services (used by tests) */
export function _resetServices(): void { _services = null; }

// --- Shared helpers ---

function parseId(value: string | string[] | undefined, label: string): number | null {
  if (value === undefined || Array.isArray(value)) return null;
  const id = parseInt(value, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
}

function getScopeLabel(base: { project_name?: string | null; company_name?: string | null }): string {
  if (base.project_name) return base.project_name;
  if (base.company_name) return base.company_name;
  return '平台';
}

function handleControllerError(err: unknown, res: Response, fallbackMsg: string): void {
  if (err instanceof z.ZodError) {
    fail(res, 400, err.issues.map((e: z.ZodIssue) => e.message).join('; '));
  } else if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('[KnowledgeController] 未预期错误', { error: err instanceof Error ? err.message : String(err) });
    fail(res, 500, fallbackMsg);
  }
}

function checkOwnership(existing: { created_by: number | null }, userId: number, role: string, action: string, entityName: string): void {
  if (role === 'sysadmin') return;
  if (existing.created_by !== null && existing.created_by === userId) return;
  throw new ForbiddenError(`只能${action}自己创建的${entityName}`);
}

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const { projectService } = getServices();
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new ForbiddenError('无权操作该项目');
  }
}

/** SEC-H-04: 净化用户输入再传入 LLM，防止 Prompt Injection */
function sanitizeForLlm(input: string): string {
  return input
    .replace(/[\r\n]/g, ' ')
    .substring(0, 200);
}

/** SEC-H-02: listInventory 每类最多加载数量，防止内存溢出 */
const MAX_INVENTORY_ITEMS_PER_CATEGORY = 1000;
/** H-8: 加载用户可访问知识库的上限常量，替代硬编码 */
const MAX_ACCESSIBLE_BASES = 10000;

/** C-4: 防御性 user 解构，替代 req.user! 非空断言 */
function getUser(req: Request): { userId: number; role: string } {
  const user = req.user;
  if (!user) throw new UnauthorizedError();
  return user;
}

async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  if (role === 'view') throw new ForbiddenError('权限不足');
  if (role === 'sysadmin') return;

  const { knowledgeBaseService } = getServices();
  const base = await knowledgeBaseService.getById(baseId);

  if (base.scope === 'platform') return;

  if (base.scope === 'company') {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { companyId: true },
    });
    if (!user || user.companyId !== base.company_id) {
      throw new NotFoundError('知识库');
    }
    return;
  }

  if (base.scope === 'project') {
    if (!base.project_id) throw new NotFoundError('知识库');
    await checkProjectOperator(base.project_id, userId, role);
    return;
  }
}

// ==================== Keywords ====================

export async function listKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { keywordService } = getServices();
    const { list, total } = await keywordService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取关键词列表失败');
  }
}

export async function getKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '关键词ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { keywordService } = getServices();
    const item = await keywordService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '关键词不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取关键词详情失败');
  }
}

export async function createKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const validated = createKeywordSchema.parse(req.body);

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { keywordService } = getServices();
    const item = await keywordService.create(baseId, validated, userId);
    created(res, item, '创建关键词成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '创建关键词失败');
  }
}

export async function updateKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '关键词ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { keywordService } = getServices();
    const existing = await keywordService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('关键词');

    checkOwnership(existing, userId, role, '修改', '关键词');

    const validated = updateKeywordSchema.parse(req.body);

    const item = await keywordService.update(id, validated);
    success(res, item, '更新关键词成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '更新关键词失败');
  }
}

export async function deleteKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '关键词ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { keywordService } = getServices();
    const existing = await keywordService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('关键词');

    checkOwnership(existing, userId, role, '删除', '关键词');

    await keywordService.delete(id);
    success(res, null, '删除关键词成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '删除关键词失败');
  }
}

export async function batchCreateKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const { keywords, seed_word } = batchCreateKeywordsSchema.parse(req.body);

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { keywordService } = getServices();
    const result = await keywordService.batchCreate(baseId, keywords, userId, seed_word);
    success(res, result, `成功创建 ${result.created} 个关键词${result.duplicates > 0 ? `，${result.duplicates} 个已存在被跳过` : ''}`);
  } catch (err: unknown) {
    handleControllerError(err, res, '批量创建关键词失败');
  }
}

export async function expandKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const { keyword } = expandKeywordsSchema.parse(req.body);

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { llmService } = getServices();
    const sanitizedKeyword = sanitizeForLlm(keyword);
    const keywords = await llmService.expandKeywords(sanitizedKeyword);
    success(res, keywords);
  } catch (err: unknown) {
    handleControllerError(err, res, '智能扩词失败');
  }
}

// ==================== Portraits ====================

export async function listPortraits(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { portraitService } = getServices();
    const { list, total } = await portraitService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取画像列表失败');
  }
}

export async function getPortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '画像ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { portraitService } = getServices();
    const item = await portraitService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '画像不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取画像详情失败');
  }
}

export async function createPortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const validated = createPortraitSchema.parse(req.body);

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { portraitService } = getServices();
    const item = await portraitService.create(baseId, validated, userId);
    created(res, item, '创建画像成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '创建画像失败');
  }
}

export async function updatePortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '画像ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { portraitService } = getServices();
    const existing = await portraitService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('画像');

    checkOwnership(existing, userId, role, '修改', '画像');

    const item = await portraitService.update(id, req.body);
    success(res, item, '更新画像成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '更新画像失败');
  }
}

export async function deletePortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '画像ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { portraitService } = getServices();
    const existing = await portraitService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('画像');

    checkOwnership(existing, userId, role, '删除', '画像');

    await portraitService.delete(id);
    success(res, null, '删除画像成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '删除画像失败');
  }
}

// ==================== Images ====================

export async function listImages(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { imageService } = getServices();
    const { list, total } = await imageService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取图片列表失败');
  }
}

export async function getImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '图片ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { imageService } = getServices();
    const item = await imageService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '图片不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取图片详情失败');
  }
}

export async function createImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const validated = createImageSchema.parse(req.body);

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { imageService } = getServices();
    await imageService.checkDuplicate(baseId, validated.title, validated.image_url);

    const item = await imageService.create(baseId, validated, userId);
    created(res, item, '创建图片成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '创建图片失败');
  }
}

export async function updateImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '图片ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { imageService } = getServices();
    const existing = await imageService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('图片');

    checkOwnership(existing, userId, role, '修改', '图片');

    const newTitle = req.body.title;
    if (newTitle && newTitle !== existing.title) {
      await imageService.checkDuplicateTitle(baseId, newTitle, id);
    }

    const item = await imageService.update(id, req.body);
    success(res, item, '更新图片成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '更新图片失败');
  }
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '图片ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { imageService } = getServices();
    const existing = await imageService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('图片');

    checkOwnership(existing, userId, role, '删除', '图片');

    await imageService.delete(id);
    success(res, null, '删除图片成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '删除图片失败');
  }
}

// ==================== Documents ====================

export async function listDocuments(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { documentService } = getServices();
    const { list, total } = await documentService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取文档列表失败');
  }
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '文档ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的文档ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { documentService } = getServices();
    const item = await documentService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '文档不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取文档详情失败');
  }
}

export async function createDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }

    const validated = createDocumentSchema.parse(req.body);

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { documentService } = getServices();
    await documentService.checkDuplicate(baseId, validated.title, validated.file_url);

    const item = await documentService.create(baseId, validated, userId);
    created(res, item, '创建文档成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '创建文档失败');
  }
}

export async function updateDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '文档ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的文档ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { documentService } = getServices();
    const existing = await documentService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('文档');

    checkOwnership(existing, userId, role, '修改', '文档');

    const newTitle = req.body.title;
    if (newTitle && newTitle !== existing.title) {
      await documentService.checkDuplicateTitle(baseId, newTitle, id);
    }

    const item = await documentService.update(id, req.body);
    success(res, item, '更新文档成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '更新文档失败');
  }
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    const id = parseId(req.params.id, '文档ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    if (id === null) { fail(res, 400, '无效的文档ID'); return; }

    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { documentService } = getServices();
    const existing = await documentService.getById(id);

    if (existing.base_id !== baseId) throw new NotFoundError('文档');

    checkOwnership(existing, userId, role, '删除', '文档');

    await documentService.delete(id);
    success(res, null, '删除文档成功');
  } catch (err: unknown) {
    handleControllerError(err, res, '删除文档失败');
  }
}

// ==================== Project-scoped aggregation ====================

export async function listProjectKeywords(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId, '项目ID');
    if (projectId === null) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkProjectOperator(projectId, userId, role);

    const { keywordService } = getServices();
    const { list, total } = await keywordService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取关键词列表失败');
  }
}

export async function listProjectPortraits(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId, '项目ID');
    if (projectId === null) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkProjectOperator(projectId, userId, role);

    const { portraitService } = getServices();
    const { list, total } = await portraitService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取画像列表失败');
  }
}

export async function listProjectImages(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId, '项目ID');
    if (projectId === null) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkProjectOperator(projectId, userId, role);

    const { imageService } = getServices();
    const { list, total } = await imageService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取图片列表失败');
  }
}

export async function listProjectDocuments(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId, '项目ID');
    if (projectId === null) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    await checkProjectOperator(projectId, userId, role);

    const { documentService } = getServices();
    const { list, total } = await documentService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取文档列表失败');
  }
}

// ==================== Knowledge Inventory ====================

export async function listInventory(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const { userId, role } = getUser(req);
    const { knowledgeBaseService } = getServices();

    const { list: bases } = await knowledgeBaseService.list(1, MAX_ACCESSIBLE_BASES, undefined, undefined, undefined, userId, role);
    const baseIds = bases.map(b => b.id);
    const baseMap = new Map(bases.map(b => [b.id, b]));

    if (baseIds.length === 0) {
      res.json({ code: 0, data: { stats: { keyword: 0, portrait: 0, image: 0, document: 0, total: 0 }, list: [], total: 0, page, pageSize } });
      return;
    }

    const prisma = getPrisma();
    const baseFilter = { baseId: { in: baseIds }, deletedAt: null };

    const [keywordCount, portraitCount, imageCount, documentCount] = await Promise.all([
      prisma.knowledgeKeyword.count({ where: baseFilter }),
      prisma.knowledgePortrait.count({ where: baseFilter }),
      prisma.knowledgeImage.count({ where: baseFilter }),
      prisma.knowledgeDocument.count({ where: baseFilter }),
    ]);

    const items: Array<{
      id: string;
      name: string;
      category: string;
      categoryKey: string;
      baseId: number;
      baseName: string;
      scope: string;
      companyName: string;
      projectName: string;
      creatorName: string;
      creatorId: number | null;
      updatedAt: Date;
    }> = [];

    const creatorIds = new Set<number>();

    if (!category || category === 'keyword') {
      const kwWhere: any = { ...baseFilter };
      if (search) kwWhere.keyword = { contains: search, mode: 'insensitive' };
      const keywords = await prisma.knowledgeKeyword.findMany({ where: kwWhere, orderBy: { updatedAt: 'desc' }, take: MAX_INVENTORY_ITEMS_PER_CATEGORY });
      for (const k of keywords) {
        if (k.createdBy) creatorIds.add(k.createdBy);
        const base = baseMap.get(k.baseId);
        items.push({
          id: `keyword-${k.id}`, name: k.keyword, category: '关键词', categoryKey: 'keyword',
          baseId: k.baseId, baseName: base?.name || '-', scope: base?.scope || 'platform',
          companyName: base?.company_name || '-', projectName: base ? getScopeLabel(base) : '-',
          creatorName: '', creatorId: k.createdBy, updatedAt: k.updatedAt,
        });
      }
    }

    if (!category || category === 'portrait') {
      const ptWhere: any = { ...baseFilter };
      if (search) ptWhere.title = { contains: search, mode: 'insensitive' };
      const portraits = await prisma.knowledgePortrait.findMany({ where: ptWhere, orderBy: { updatedAt: 'desc' }, take: MAX_INVENTORY_ITEMS_PER_CATEGORY });
      for (const p of portraits) {
        if (p.createdBy) creatorIds.add(p.createdBy);
        const base = baseMap.get(p.baseId);
        items.push({
          id: `portrait-${p.id}`, name: p.title, category: '画像', categoryKey: 'portrait',
          baseId: p.baseId, baseName: base?.name || '-', scope: base?.scope || 'platform',
          companyName: base?.company_name || '-', projectName: base ? getScopeLabel(base) : '-',
          creatorName: '', creatorId: p.createdBy, updatedAt: p.updatedAt,
        });
      }
    }

    if (!category || category === 'image') {
      const imgWhere: any = { ...baseFilter };
      if (search) imgWhere.title = { contains: search, mode: 'insensitive' };
      const images = await prisma.knowledgeImage.findMany({ where: imgWhere, orderBy: { updatedAt: 'desc' }, take: MAX_INVENTORY_ITEMS_PER_CATEGORY });
      for (const i of images) {
        if (i.createdBy) creatorIds.add(i.createdBy);
        const base = baseMap.get(i.baseId);
        items.push({
          id: `image-${i.id}`, name: i.title, category: '图片', categoryKey: 'image',
          baseId: i.baseId, baseName: base?.name || '-', scope: base?.scope || 'platform',
          companyName: base?.company_name || '-', projectName: base ? getScopeLabel(base) : '-',
          creatorName: '', creatorId: i.createdBy, updatedAt: i.updatedAt,
        });
      }
    }

    if (!category || category === 'document') {
      const docWhere: any = { ...baseFilter };
      if (search) {
        docWhere.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
        ];
      }
      const documents = await prisma.knowledgeDocument.findMany({ where: docWhere, orderBy: { updatedAt: 'desc' }, take: MAX_INVENTORY_ITEMS_PER_CATEGORY });
      for (const d of documents) {
        if (d.createdBy) creatorIds.add(d.createdBy);
        const base = baseMap.get(d.baseId);
        items.push({
          id: `document-${d.id}`, name: d.title, category: '文档', categoryKey: 'document',
          baseId: d.baseId, baseName: base?.name || '-', scope: base?.scope || 'platform',
          companyName: base?.company_name || '-', projectName: base ? getScopeLabel(base) : '-',
          creatorName: '', creatorId: d.createdBy, updatedAt: d.updatedAt,
        });
      }
    }

    if (creatorIds.size > 0) {
      const creators = await prisma.user.findMany({
        where: { id: { in: Array.from(creatorIds) } },
        select: { id: true, cnName: true },
      });
      const creatorMap = new Map(creators.map((c: any) => [c.id, c.cnName || '']));
      for (const item of items) {
        item.creatorName = item.creatorId ? (creatorMap.get(item.creatorId) || '-') : '-';
      }
    } else {
      for (const item of items) {
        item.creatorName = '-';
      }
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = items.length;
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize).map(({ creatorId, ...rest }) => rest);

    res.json({
      code: 0,
      data: {
        stats: { keyword: keywordCount, portrait: portraitCount, image: imageCount, document: documentCount, total: keywordCount + portraitCount + imageCount + documentCount },
        list: pagedItems,
        total,
        page,
        pageSize,
      },
    });
  } catch (err: unknown) {
    handleControllerError(err, res, '获取知识清单失败');
  }
}

// ==================== Mined Keywords (关键词挖掘) ====================

export async function listMinedKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);
    const { minedKeywordService } = getServices();
    const items = await minedKeywordService.listByBase(baseId);
    success(res, items);
  } catch (err: unknown) {
    handleControllerError(err, res, '获取挖掘关键词失败');
  }
}

export async function mineKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);

    const { source_type: sourceType } = mineKeywordsSchema.parse(req.body);

    const { minedKeywordService, llmService } = getServices();
    const content = await minedKeywordService.aggregateContent(baseId, sourceType);

    if (content.length === 0) { fail(res, 400, '知识库中暂无内容可供挖掘'); return; }

    const keywords = await llmService.mineKeywordsFromContent(content);
    const result = await minedKeywordService.addMinedKeywords(baseId, keywords, userId);
    const allMined = await minedKeywordService.listByBase(baseId);

    success(res, { mined: result.added, duplicates: result.duplicates, total: allMined.length, list: allMined });
  } catch (err: unknown) {
    handleControllerError(err, res, '关键词挖掘失败');
  }
}

export async function saveMinedKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);
    const { keywords } = saveMinedKeywordsSchema.parse(req.body);

    const { keywordService, minedKeywordService } = getServices();
    const result = await minedKeywordService.saveAndRemove(baseId, keywords, userId, keywordService);

    success(res, result, `成功保存 ${result.created} 个关键词${result.duplicates > 0 ? `，${result.duplicates} 个已存在被跳过` : ''}`);
  } catch (err: unknown) {
    handleControllerError(err, res, '保存关键词失败');
  }
}

export async function toggleMinedKeywordsBatch(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);
    const { ids, selected } = toggleMinedKeywordsBatchSchema.parse(req.body);
    const { minedKeywordService } = getServices();
    await minedKeywordService.toggleSelectBatch(baseId, ids, selected);
    const items = await minedKeywordService.listByBase(baseId);
    success(res, items);
  } catch (err: unknown) {
    handleControllerError(err, res, '操作失败');
  }
}

export async function deleteMinedKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseId(req.params.baseId, '知识库ID');
    if (baseId === null) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = getUser(req);
    await checkBaseAccess(baseId, userId, role);
    const { minedKeywordService } = getServices();
    await minedKeywordService.clearAll(baseId);
    success(res, null, '已清空挖掘关键词');
  } catch (err: unknown) {
    handleControllerError(err, res, '清空失败');
  }
}
