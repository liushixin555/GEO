import { Request, Response } from 'express';
import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl';
import { success, fail, paginate } from '../utils';

const knowledgeBaseService = new KnowledgeBaseServiceImpl();

export async function listKnowledgeBases(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;
    const scope = req.query.scope as string | undefined;
    const status = req.query.status === undefined ? undefined : req.query.status === 'true';

    const { userId, role } = req.user!;
    const { list, total } = await knowledgeBaseService.list(page, pageSize, search, scope, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取知识库列表失败');
  }
}

export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const item = await knowledgeBaseService.getById(id);
    success(res, item);
  } catch (err: any) {
    if (err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取知识库详情失败');
    }
  }
}

export async function createKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const { name, scope } = req.body;
    if (!name) { fail(res, 400, '知识库名称不能为空'); return; }
    if (!scope) { fail(res, 400, '知识库范围不能为空'); return; }

    const { userId } = req.user!;
    const item = await knowledgeBaseService.create(req.body, userId);
    res.status(201).json({ code: 0, message: '创建知识库成功', data: item });
  } catch (err: any) {
    if (err.message === '公司公共知识库必须选择公司' || err.message === '项目私有知识库必须选择项目') {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, err.message || '创建知识库失败');
    }
  }
}

export async function updateKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const { userId, role } = req.user!;
    const item = await knowledgeBaseService.update(id, req.body, userId, role);
    success(res, item, '更新知识库成功');
  } catch (err: any) {
    if (err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else if (err.message === '只能修改自己创建的知识库') {
      fail(res, 403, err.message);
    } else {
      fail(res, 500, err.message || '更新知识库失败');
    }
  }
}

export async function deleteKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const { userId, role } = req.user!;
    await knowledgeBaseService.delete(id, userId, role);
    success(res, null, '删除知识库成功');
  } catch (err: any) {
    if (err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else if (err.message === '只能删除自己创建的知识库') {
      fail(res, 403, err.message);
    } else {
      fail(res, 500, err.message || '删除知识库失败');
    }
  }
}
