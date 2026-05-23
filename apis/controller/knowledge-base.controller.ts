import { Request, Response } from 'express';
import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl';
import { success, fail, paginate, created } from '../utils';

const knowledgeBaseService = new KnowledgeBaseServiceImpl();

const VALID_SCOPES = ['platform', 'company', 'project'] as const;

export async function listKnowledgeBases(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const rawPageSize = parseInt(req.query.pageSize as string) || 10;
    const pageSize = Math.min(100, Math.max(1, rawPageSize));
    const search = req.query.search as string | undefined;
    const scope = req.query.scope as string | undefined;
    const status = req.query.status === undefined ? undefined : req.query.status === 'true';

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const { list, total } = await knowledgeBaseService.list(page, pageSize, search, scope, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, '获取知识库列表失败');
    }
  }
}

export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const item = await knowledgeBaseService.getById(id);
    success(res, item);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, '获取知识库详情失败');
    }
  }
}

export async function createKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, scope, company_id, project_id } = req.body;
    if (!name) { fail(res, 400, '知识库名称不能为空'); return; }
    if (!scope || !VALID_SCOPES.includes(scope)) {
      fail(res, 400, '知识库范围不合法，应为 platform/company/project');
      return;
    }

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId } = user;
    const item = await knowledgeBaseService.create(
      { name, description, scope, company_id, project_id },
      userId
    );
    created(res, item, '创建知识库成功');
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === '公司公共知识库必须选择公司' || err.message === '项目私有知识库必须选择项目')) {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, '创建知识库失败');
    }
  }
}

export async function updateKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const { scope } = req.body;
    if (scope !== undefined && !VALID_SCOPES.includes(scope)) {
      fail(res, 400, '知识库范围不合法，应为 platform/company/project');
      return;
    }

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const item = await knowledgeBaseService.update(id, req.body, userId, role);
    success(res, item, '更新知识库成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else if (err instanceof Error && err.message === '只能修改自己创建的知识库') {
      fail(res, 403, err.message);
    } else if (err instanceof Error && (err.message === '公司公共知识库必须选择公司' || err.message === '项目私有知识库必须选择项目')) {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, '更新知识库失败');
    }
  }
}

export async function deleteKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    await knowledgeBaseService.delete(id, userId, role);
    success(res, null, '删除知识库成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === '知识库不存在') {
      fail(res, 404, err.message);
    } else if (err instanceof Error && err.message === '只能删除自己创建的知识库') {
      fail(res, 403, err.message);
    } else {
      fail(res, 500, '删除知识库失败');
    }
  }
}
