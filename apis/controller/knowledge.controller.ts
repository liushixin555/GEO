import { Request, Response } from 'express';
import { KeywordServiceImpl, PortraitServiceImpl, ImageServiceImpl, DocumentServiceImpl, MinedKeywordServiceImpl } from '../service/impl/knowledge.service.impl';
import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { LlmServiceImpl } from '../service/impl/llm.service.impl';
import { success, fail, paginate, created } from '../utils';
import { getPrisma } from '../utils';

const keywordService = new KeywordServiceImpl();
const portraitService = new PortraitServiceImpl();
const imageService = new ImageServiceImpl();
const documentService = new DocumentServiceImpl();
const knowledgeBaseService = new KnowledgeBaseServiceImpl();
const projectService = new ProjectServiceImpl();
const llmService = new LlmServiceImpl();
const minedKeywordService = new MinedKeywordServiceImpl();

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}

async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;

  const base = await knowledgeBaseService.getById(baseId);

  if (base.scope === 'platform') return;

  if (base.scope === 'company') {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { companyId: true },
    });
    if (!user || user.companyId !== base.company_id) {
      throw new Error('知识库不存在');
    }
    return;
  }

  if (base.scope === 'project') {
    if (!base.project_id) throw new Error('知识库不存在');
    await checkProjectOperator(base.project_id, userId, role);
    return;
  }
}

// ==================== Keywords ====================

export async function listKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await keywordService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, '获取关键词列表失败');
    }
  }
}

export async function getKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const item = await keywordService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '关键词不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '关键词不存在') { fail(res, 404, err.message); } else if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取关键词详情失败'); }
  }
}

export async function createKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const item = await keywordService.create(baseId, req.body, userId);
    created(res, item, '创建关键词成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '创建关键词失败'); }
  }
}

export async function updateKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    const existing = await keywordService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '关键词不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的关键词');
      return;
    }

    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }

    const item = await keywordService.update(id, req.body);
    success(res, item, '更新关键词成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '关键词不存在') { fail(res, 404, err.message); } else { fail(res, 500, '更新关键词失败'); }
  }
}

export async function deleteKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    const existing = await keywordService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '关键词不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能删除自己创建的关键词');
      return;
    }

    await keywordService.delete(id);
    success(res, null, '删除关键词成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '关键词不存在') { fail(res, 404, err.message); } else { fail(res, 500, '删除关键词失败'); }
  }
}

export async function batchCreateKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { keywords, seed_word } = req.body;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      fail(res, 400, '关键词列表不能为空');
      return;
    }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const result = await keywordService.batchCreate(baseId, keywords, userId, seed_word);
    success(res, result, `成功创建 ${result.created} 个关键词${result.duplicates > 0 ? `，${result.duplicates} 个已存在被跳过` : ''}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '批量创建关键词失败'); }
  }
}

export async function expandKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }

    const keywords = await llmService.expandKeywords(keyword);
    success(res, keywords);
  } catch (err: unknown) {
    fail(res, 500, '智能扩词失败');
  }
}

// ==================== Portraits ====================

export async function listPortraits(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await portraitService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取画像列表失败'); }
  }
}

export async function getPortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const item = await portraitService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '画像不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '画像不存在') { fail(res, 404, err.message); } else if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取画像详情失败'); }
  }
}

export async function createPortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { title, content } = req.body;
    if (!title) { fail(res, 400, '画像标题不能为空'); return; }
    if (!content) { fail(res, 400, '画像内容不能为空'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const item = await portraitService.create(baseId, req.body, userId);
    created(res, item, '创建画像成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '创建画像失败'); }
  }
}

export async function updatePortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    const existing = await portraitService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '画像不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的画像');
      return;
    }

    const item = await portraitService.update(id, req.body);
    success(res, item, '更新画像成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '画像不存在') { fail(res, 404, err.message); } else { fail(res, 500, '更新画像失败'); }
  }
}

export async function deletePortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    const existing = await portraitService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '画像不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能删除自己创建的画像');
      return;
    }

    await portraitService.delete(id);
    success(res, null, '删除画像成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '画像不存在') { fail(res, 404, err.message); } else { fail(res, 500, '删除画像失败'); }
  }
}

// ==================== Images ====================

export async function listImages(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await imageService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取图片列表失败'); }
  }
}

export async function getImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const item = await imageService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '图片不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '图片不存在') { fail(res, 404, err.message); } else if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取图片详情失败'); }
  }
}

export async function createImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { title, image_url } = req.body;
    if (!title) { fail(res, 400, '图片标题不能为空'); return; }
    if (!image_url) { fail(res, 400, '图片地址不能为空'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    // 检查标题重复
    const prisma = getPrisma();
    const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
    if (dupTitle) { fail(res, 400, '该知识库已存在相同标题的图片'); return; }
    // 检查图片URL重复
    const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl: image_url, deletedAt: null } });
    if (dupUrl) { fail(res, 400, '该知识库已存在相同的图片'); return; }

    const item = await imageService.create(baseId, req.body, userId);
    created(res, item, '创建图片成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '创建图片失败'); }
  }
}

export async function updateImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    const existing = await imageService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '图片不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的图片');
      return;
    }

    // 检查标题重复（排除自身）
    const newTitle = req.body.title;
    if (newTitle && newTitle !== existing.title) {
      const prisma = getPrisma();
      const dup = await prisma.knowledgeImage.findFirst({ where: { baseId, title: newTitle, id: { not: id }, deletedAt: null } });
      if (dup) { fail(res, 400, '该知识库已存在相同标题的图片'); return; }
    }

    const item = await imageService.update(id, req.body);
    success(res, item, '更新图片成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '图片不存在') { fail(res, 404, err.message); } else { fail(res, 500, '更新图片失败'); }
  }
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    const existing = await imageService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '图片不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能删除自己创建的图片');
      return;
    }

    await imageService.delete(id);
    success(res, null, '删除图片成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '图片不存在') { fail(res, 404, err.message); } else { fail(res, 500, '删除图片失败'); }
  }
}

// ==================== Documents ====================

export async function listDocuments(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await documentService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取文档列表失败'); }
  }
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文档ID'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const item = await documentService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '文档不存在'); return; }

    success(res, item);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '文档不存在') { fail(res, 404, err.message); } else if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取文档详情失败'); }
  }
}

export async function createDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { title, file_url, file_name, file_type, file_size } = req.body;
    if (!title) { fail(res, 400, '文档标题不能为空'); return; }
    if (!file_url) { fail(res, 400, '文档地址不能为空'); return; }
    if (!file_name) { fail(res, 400, '文件名不能为空'); return; }
    if (!file_type) { fail(res, 400, '文件类型不能为空'); return; }
    if (!file_size) { fail(res, 400, '文件大小不能为空'); return; }

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    // 检查标题重复
    const prisma = getPrisma();
    const dupTitle = await prisma.knowledgeDocument.findFirst({ where: { baseId, title, deletedAt: null } });
    if (dupTitle) { fail(res, 400, '该知识库已存在相同标题的文档'); return; }
    // 检查文件URL重复
    const dupUrl = await prisma.knowledgeDocument.findFirst({ where: { baseId, fileUrl: file_url, deletedAt: null } });
    if (dupUrl) { fail(res, 400, '该知识库已存在相同的文档'); return; }

    const item = await documentService.create(baseId, req.body, userId);
    created(res, item, '创建文档成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '创建文档失败'); }
  }
}

export async function updateDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文档ID'); return; }

    const { userId, role } = req.user!;
    const existing = await documentService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '文档不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的文档');
      return;
    }

    // 检查标题重复（排除自身）
    const newTitle = req.body.title;
    if (newTitle && newTitle !== existing.title) {
      const prisma = getPrisma();
      const dup = await prisma.knowledgeDocument.findFirst({ where: { baseId, title: newTitle, id: { not: id }, deletedAt: null } });
      if (dup) { fail(res, 400, '该知识库已存在相同标题的文档'); return; }
    }

    const item = await documentService.update(id, req.body);
    success(res, item, '更新文档成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '文档不存在') { fail(res, 404, err.message); } else { fail(res, 500, '更新文档失败'); }
  }
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文档ID'); return; }

    const { userId, role } = req.user!;
    const existing = await documentService.getById(id);

    if (existing.base_id !== baseId) { fail(res, 404, '文档不存在'); return; }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能删除自己创建的文档');
      return;
    }

    await documentService.delete(id);
    success(res, null, '删除文档成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '文档不存在') { fail(res, 404, err.message); } else { fail(res, 500, '删除文档失败'); }
  }
}

// ==================== Project-scoped aggregation ====================

export async function listProjectKeywords(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await keywordService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, '获取关键词列表失败'); }
  }
}

export async function listProjectPortraits(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await portraitService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, '获取画像列表失败'); }
  }
}

export async function listProjectImages(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await imageService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, '获取图片列表失败'); }
  }
}

export async function listProjectDocuments(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await documentService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, '获取文档列表失败'); }
  }
}

// ==================== Knowledge Inventory ====================

export async function listInventory(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;

    // Get all accessible knowledge bases
    const { list: bases } = await knowledgeBaseService.list(1, 10000, undefined, undefined, undefined, userId, role);
    const baseIds = bases.map(b => b.id);
    const baseMap = new Map(bases.map(b => [b.id, b]));

    if (baseIds.length === 0) {
      res.json({ code: 0, data: { stats: { keyword: 0, portrait: 0, image: 0, document: 0, total: 0 }, list: [], total: 0 } });
      return;
    }

    const prisma = getPrisma();
    const baseFilter = { baseId: { in: baseIds } };

    // Count by type
    const [keywordCount, portraitCount, imageCount, documentCount] = await Promise.all([
      prisma.knowledgeKeyword.count({ where: baseFilter }),
      prisma.knowledgePortrait.count({ where: baseFilter }),
      prisma.knowledgeImage.count({ where: baseFilter }),
      prisma.knowledgeDocument.count({ where: baseFilter }),
    ]);

    // Build merged items list
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

    // Collect all creator IDs for batch lookup
    const creatorIds = new Set<number>();

    const getScopeLabel = (base: typeof bases[0]) => {
      if (base.project_name) return base.project_name;
      if (base.company_name) return base.company_name;
      return '平台';
    };

    if (!category || category === 'keyword') {
      const kwWhere: any = { ...baseFilter };
      if (search) kwWhere.keyword = { contains: search, mode: 'insensitive' };
      const keywords = await prisma.knowledgeKeyword.findMany({ where: kwWhere, orderBy: { updatedAt: 'desc' } });
      for (const k of keywords) {
        if (k.createdBy) creatorIds.add(k.createdBy);
        const base = baseMap.get(k.baseId);
        items.push({
          id: `keyword-${k.id}`,
          name: k.keyword,
          category: '关键词',
          categoryKey: 'keyword',
          baseId: k.baseId,
          baseName: base?.name || '-',
          scope: base?.scope || 'platform',
          companyName: base?.company_name || '-',
          projectName: base ? getScopeLabel(base) : '-',
          creatorName: '',
          creatorId: k.createdBy,
          updatedAt: k.updatedAt,
        });
      }
    }

    if (!category || category === 'portrait') {
      const ptWhere: any = { ...baseFilter };
      if (search) ptWhere.title = { contains: search, mode: 'insensitive' };
      const portraits = await prisma.knowledgePortrait.findMany({ where: ptWhere, orderBy: { updatedAt: 'desc' } });
      for (const p of portraits) {
        if (p.createdBy) creatorIds.add(p.createdBy);
        const base = baseMap.get(p.baseId);
        items.push({
          id: `portrait-${p.id}`,
          name: p.title,
          category: '画像',
          categoryKey: 'portrait',
          baseId: p.baseId,
          baseName: base?.name || '-',
          scope: base?.scope || 'platform',
          companyName: base?.company_name || '-',
          projectName: base ? getScopeLabel(base) : '-',
          creatorName: '',
          creatorId: p.createdBy,
          updatedAt: p.updatedAt,
        });
      }
    }

    if (!category || category === 'image') {
      const imgWhere: any = { ...baseFilter };
      if (search) imgWhere.title = { contains: search, mode: 'insensitive' };
      const images = await prisma.knowledgeImage.findMany({ where: imgWhere, orderBy: { updatedAt: 'desc' } });
      for (const i of images) {
        if (i.createdBy) creatorIds.add(i.createdBy);
        const base = baseMap.get(i.baseId);
        items.push({
          id: `image-${i.id}`,
          name: i.title,
          category: '图片',
          categoryKey: 'image',
          baseId: i.baseId,
          baseName: base?.name || '-',
          scope: base?.scope || 'platform',
          companyName: base?.company_name || '-',
          projectName: base ? getScopeLabel(base) : '-',
          creatorName: '',
          creatorId: i.createdBy,
          updatedAt: i.updatedAt,
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
      const documents = await prisma.knowledgeDocument.findMany({ where: docWhere, orderBy: { updatedAt: 'desc' } });
      for (const d of documents) {
        if (d.createdBy) creatorIds.add(d.createdBy);
        const base = baseMap.get(d.baseId);
        items.push({
          id: `document-${d.id}`,
          name: d.title,
          category: '文档',
          categoryKey: 'document',
          baseId: d.baseId,
          baseName: base?.name || '-',
          scope: base?.scope || 'platform',
          companyName: base?.company_name || '-',
          projectName: base ? getScopeLabel(base) : '-',
          creatorName: '',
          creatorId: d.createdBy,
          updatedAt: d.updatedAt,
        });
      }
    }

    // Batch lookup creator names
    if (creatorIds.size > 0) {
      const creators = await prisma.user.findMany({
        where: { id: { in: Array.from(creatorIds) } },
        select: { id: true, cnName: true },
      });
      const creatorMap = new Map(creators.map((c: any) => [c.id, c.cnName || '']));
      for (const item of items) {
        if (item.creatorId) {
          item.creatorName = creatorMap.get(item.creatorId) || '-';
        } else {
          item.creatorName = '-';
        }
      }
    } else {
      for (const item of items) {
        item.creatorName = '-';
      }
    }

    // Sort by updatedAt desc
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = items.length;
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize).map(({ creatorId, ...rest }) => rest);

    res.json({
      code: 0,
      data: {
        stats: { keyword: keywordCount, portrait: portraitCount, image: imageCount, document: documentCount, total: keywordCount + portraitCount + imageCount + documentCount },
        list: pagedItems,
        total,
      },
    });
  } catch (err: unknown) {
    fail(res, 500, '获取知识清单失败');
  }
}

// ==================== Mined Keywords (关键词挖掘) ====================

export async function listMinedKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);
    const items = await minedKeywordService.listByBase(baseId);
    success(res, items);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取挖掘关键词失败'); }
  }
}

export async function mineKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);
    const sourceType = req.body.source_type || 'all';

    const prisma = getPrisma();
    const contentParts: string[] = [];

    if (sourceType === 'all' || sourceType === 'document') {
      const docs = await prisma.knowledgeDocument.findMany({ where: { baseId, deletedAt: null } });
      contentParts.push(...docs.map((d: any) => `[文档] 标题: ${d.title}${d.description ? ', 描述: ' + d.description : ''}`));
    }
    if (sourceType === 'all' || sourceType === 'portrait') {
      const pts = await prisma.knowledgePortrait.findMany({ where: { baseId, deletedAt: null } });
      contentParts.push(...pts.map((p: any) => `[画像] 标题: ${p.title}${p.content ? ', 内容: ' + p.content : ''}`));
    }
    if (sourceType === 'all' || sourceType === 'image') {
      const imgs = await prisma.knowledgeImage.findMany({ where: { baseId, deletedAt: null } });
      contentParts.push(...imgs.map((i: any) => `[图片] 标题: ${i.title}${i.description ? ', 描述: ' + i.description : ''}`));
    }

    if (contentParts.length === 0) { fail(res, 400, '知识库中暂无内容可供挖掘'); return; }

    const content = contentParts.join('\n').substring(0, 8000);
    const keywords = await llmService.mineKeywordsFromContent(content);
    const result = await minedKeywordService.addMinedKeywords(baseId, keywords, userId);
    const allMined = await minedKeywordService.listByBase(baseId);

    success(res, { mined: result.added, duplicates: result.duplicates, total: allMined.length, list: allMined });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '关键词挖掘失败'); }
  }
}

export async function saveMinedKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);
    const { keywords } = req.body;
    if (!Array.isArray(keywords) || keywords.length === 0) { fail(res, 400, '请选择至少一个关键词'); return; }

    const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');

    // Delete saved keywords from mined list
    const prisma = getPrisma();
    await prisma.minedKeyword.updateMany({
      where: { baseId, keyword: { in: keywords }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    success(res, result, `成功保存 ${result.created} 个关键词${result.duplicates > 0 ? `，${result.duplicates} 个已存在被跳过` : ''}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '保存关键词失败'); }
  }
}

export async function toggleMinedKeywordsBatch(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);
    const { ids, selected } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) { fail(res, 400, '请选择关键词'); return; }
    await minedKeywordService.toggleSelectBatch(baseId, ids, selected);
    const items = await minedKeywordService.listByBase(baseId);
    success(res, items);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '操作失败'); }
  }
}

export async function deleteMinedKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);
    await minedKeywordService.clearAll(baseId);
    success(res, null, '已清空挖掘关键词');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '清空失败'); }
  }
}
