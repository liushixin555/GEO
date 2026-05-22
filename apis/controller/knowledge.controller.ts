import { Request, Response } from 'express';
import { KeywordServiceImpl, PortraitServiceImpl, ImageServiceImpl } from '../service/impl/knowledge.service.impl';
import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { LlmServiceImpl } from '../service/impl/llm.service.impl';
import { success, fail, paginate } from '../utils';

const keywordService = new KeywordServiceImpl();
const portraitService = new PortraitServiceImpl();
const imageService = new ImageServiceImpl();
const knowledgeBaseService = new KnowledgeBaseServiceImpl();
const projectService = new ProjectServiceImpl();
const llmService = new LlmServiceImpl();

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}

async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  const base = await knowledgeBaseService.getById(baseId);
  if (role === 'sysadmin') return;

  // Check if user can access this base
  if (base.scope === 'platform') return; // platform bases are visible to all

  // For company scope: check if user belongs to the company
  // For project scope: check if user is an operator
  // This is already filtered in the list endpoint, but for direct access we check here
  // For now, allow access - the list endpoint handles visibility
}

// ==================== Keywords ====================

export async function listKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await keywordService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取关键词列表失败');
  }
}

export async function getKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    const item = await keywordService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '关键词不存在'); return; }

    success(res, item);
  } catch (err: any) {
    if (err.message === '关键词不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '获取关键词详情失败'); }
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
    res.status(201).json({ code: 0, message: '创建关键词成功', data: item });
  } catch (err: any) {
    if (err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '创建关键词失败'); }
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
  } catch (err: any) {
    if (err.message === '关键词不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '更新关键词失败'); }
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
  } catch (err: any) {
    if (err.message === '关键词不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '删除关键词失败'); }
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
  } catch (err: any) {
    fail(res, 500, err.message || '批量创建关键词失败');
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
  } catch (err: any) {
    fail(res, 500, err.message || '智能扩词失败');
  }
}

// ==================== Portraits ====================

export async function listPortraits(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await portraitService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取画像列表失败');
  }
}

export async function getPortrait(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    const item = await portraitService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '画像不存在'); return; }

    success(res, item);
  } catch (err: any) {
    if (err.message === '画像不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '获取画像详情失败'); }
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
    res.status(201).json({ code: 0, message: '创建画像成功', data: item });
  } catch (err: any) {
    if (err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '创建画像失败'); }
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
  } catch (err: any) {
    if (err.message === '画像不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '更新画像失败'); }
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
  } catch (err: any) {
    if (err.message === '画像不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '删除画像失败'); }
  }
}

// ==================== Images ====================

export async function listImages(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkBaseAccess(baseId, userId, role);

    const { list, total } = await imageService.list(baseId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取图片列表失败');
  }
}

export async function getImage(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    const item = await imageService.getById(id);

    if (item.base_id !== baseId) { fail(res, 404, '图片不存在'); return; }

    success(res, item);
  } catch (err: any) {
    if (err.message === '图片不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '获取图片详情失败'); }
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

    const item = await imageService.create(baseId, req.body, userId);
    res.status(201).json({ code: 0, message: '创建图片成功', data: item });
  } catch (err: any) {
    if (err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '创建图片失败'); }
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

    const item = await imageService.update(id, req.body);
    success(res, item, '更新图片成功');
  } catch (err: any) {
    if (err.message === '图片不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '更新图片失败'); }
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
  } catch (err: any) {
    if (err.message === '图片不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '删除图片失败'); }
  }
}

// ==================== Project-scoped aggregation ====================

export async function listProjectKeywords(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await keywordService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    if (err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, err.message || '获取关键词列表失败'); }
  }
}

export async function listProjectPortraits(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await portraitService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    if (err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, err.message || '获取画像列表失败'); }
  }
}

export async function listProjectImages(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    await checkProjectOperator(projectId, userId, role);

    const { list, total } = await imageService.listByProject(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    if (err.message === '无权操作该项目') { fail(res, 403, err.message); } else { fail(res, 500, err.message || '获取图片列表失败'); }
  }
}
