import { Request, Response } from 'express';
import { KeywordServiceImpl, PortraitServiceImpl, ImageServiceImpl } from '../service/impl/knowledge.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { LlmServiceImpl } from '../service/impl/llm.service.impl';
import { success, fail, paginate } from '../utils';

const keywordService = new KeywordServiceImpl();
const portraitService = new PortraitServiceImpl();
const imageService = new ImageServiceImpl();
const projectService = new ProjectServiceImpl();
const llmService = new LlmServiceImpl();

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}

// ==================== Keywords ====================

export async function listKeywords(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const { list, total } = await keywordService.list(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取关键词列表失败');
  }
}

export async function getKeyword(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    const item = await keywordService.getById(id);

    if (item.project_id !== projectId) { fail(res, 404, '关键词不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    success(res, item);
  } catch (err: any) {
    if (err.message === '关键词不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '获取关键词详情失败'); }
  }
}

export async function createKeyword(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const item = await keywordService.create(projectId, req.body, userId);
    res.status(201).json({ code: 0, message: '创建关键词成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建关键词失败');
  }
}

export async function updateKeyword(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    const existing = await keywordService.getById(id);

    if (existing.project_id !== projectId) { fail(res, 404, '关键词不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

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
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的关键词ID'); return; }

    const { userId, role } = req.user!;
    const existing = await keywordService.getById(id);

    if (existing.project_id !== projectId) { fail(res, 404, '关键词不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

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

export async function expandKeywords(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const keywords = await llmService.expandKeywords(keyword);
    success(res, keywords);
  } catch (err: any) {
    fail(res, 500, err.message || '智能扩词失败');
  }
}

export async function batchCreateKeywords(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { keywords, group_id } = req.body;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      fail(res, 400, '关键词列表不能为空');
      return;
    }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const groupId = group_id || Math.floor(Date.now() / 1000);
    const items = await keywordService.batchCreate(projectId, keywords, userId, groupId);
    res.status(201).json({ code: 0, message: `成功创建${items.length}个关键词`, data: items });
  } catch (err: any) {
    fail(res, 500, err.message || '批量创建关键词失败');
  }
}

export async function getKeywordGroup(req: Request, res: Response): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId as string, 10);
    if (isNaN(groupId)) { fail(res, 400, '无效的组ID'); return; }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      const projectId = parseInt(req.params.projectId as string, 10);
      if (!isNaN(projectId)) {
        try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
      }
    }

    const items = await keywordService.listByGroup(groupId);
    success(res, items);
  } catch (err: any) {
    fail(res, 500, err.message || '获取关键词组失败');
  }
}

export async function syncKeywordGroup(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { group_id, keywords } = req.body;
    if (!group_id) { fail(res, 400, '组ID不能为空'); return; }
    if (!Array.isArray(keywords) || keywords.length === 0) {
      fail(res, 400, '关键词列表不能为空');
      return;
    }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const items = await keywordService.syncGroup(group_id, projectId, keywords, userId);
    success(res, items, '保存成功');
  } catch (err: any) {
    fail(res, 500, err.message || '同步关键词组失败');
  }
}

// ==================== Portraits ====================

export async function listPortraits(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const { list, total } = await portraitService.list(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取画像列表失败');
  }
}

export async function getPortrait(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    const item = await portraitService.getById(id);

    if (item.project_id !== projectId) { fail(res, 404, '画像不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    success(res, item);
  } catch (err: any) {
    if (err.message === '画像不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '获取画像详情失败'); }
  }
}

export async function createPortrait(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { title, content } = req.body;
    if (!title) { fail(res, 400, '画像标题不能为空'); return; }
    if (!content) { fail(res, 400, '画像内容不能为空'); return; }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const item = await portraitService.create(projectId, req.body, userId);
    res.status(201).json({ code: 0, message: '创建画像成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建画像失败');
  }
}

export async function updatePortrait(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    const existing = await portraitService.getById(id);

    if (existing.project_id !== projectId) { fail(res, 404, '画像不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

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
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的画像ID'); return; }

    const { userId, role } = req.user!;
    const existing = await portraitService.getById(id);

    if (existing.project_id !== projectId) { fail(res, 404, '画像不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

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
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const { list, total } = await imageService.list(projectId, page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取图片列表失败');
  }
}

export async function getImage(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    const item = await imageService.getById(id);

    if (item.project_id !== projectId) { fail(res, 404, '图片不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    success(res, item);
  } catch (err: any) {
    if (err.message === '图片不存在') { fail(res, 404, err.message); } else { fail(res, 500, err.message || '获取图片详情失败'); }
  }
}

export async function createImage(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { title, image_url } = req.body;
    if (!title) { fail(res, 400, '图片标题不能为空'); return; }
    if (!image_url) { fail(res, 400, '图片地址不能为空'); return; }

    const { userId, role } = req.user!;
    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

    const item = await imageService.create(projectId, req.body, userId);
    res.status(201).json({ code: 0, message: '创建图片成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建图片失败');
  }
}

export async function updateImage(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    const existing = await imageService.getById(id);

    if (existing.project_id !== projectId) { fail(res, 404, '图片不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

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
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的图片ID'); return; }

    const { userId, role } = req.user!;
    const existing = await imageService.getById(id);

    if (existing.project_id !== projectId) { fail(res, 404, '图片不存在'); return; }

    if (role === 'admin') {
      try { await checkProjectOperator(projectId, userId, role); } catch { fail(res, 403, '无权操作该项目'); return; }
    }

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
