import { Request, Response } from 'express';
import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl';
import { success, fail, paginate, created } from '../utils';
import { UpdateKnowledgeBaseRequest } from '../entity';
import { AppError, BusinessError } from '../errors';

const knowledgeBaseService = new KnowledgeBaseServiceImpl();

const VALID_SCOPES = ['platform', 'company', 'project'] as const;

function validateInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new BusinessError(`${fieldName} 必须为正整数`);
  }
  return value;
}

export async function listKnowledgeBases(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const rawPageSize = parseInt(req.query.pageSize as string) || 10;
    const pageSize = Math.min(100, Math.max(1, rawPageSize));
    const rawSearch = req.query.search as string | undefined;
    const search = rawSearch ? rawSearch.slice(0, 100) : undefined;
    const rawScope = req.query.scope as string | undefined;
    const scope = rawScope && VALID_SCOPES.includes(rawScope as any) ? rawScope : undefined;
    const status = req.query.status === undefined ? undefined : req.query.status === 'true';

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const { list, total } = await knowledgeBaseService.list(page, pageSize, search, scope, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      fail(res, 500, '获取知识库列表失败');
    }
  }
}

export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const item = await knowledgeBaseService.getById(id, userId, role);
    success(res, item);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      fail(res, 500, '获取知识库详情失败');
    }
  }
}

export async function createKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, scope, company_id, project_id } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      fail(res, 400, '知识库名称不能为空'); return;
    }
    if (name.length > 200) { fail(res, 400, '知识库名称不能超过200个字符'); return; }
    const validDescription = typeof description === 'string' ? description : undefined as string | undefined;
    if (validDescription !== undefined && validDescription.length > 2000) {
      fail(res, 400, '描述不能超过2000个字符'); return;
    }
    if (!scope || !VALID_SCOPES.includes(scope)) {
      fail(res, 400, '知识库范围不合法，应为 platform/company/project');
      return;
    }
    const validCompanyId = validateInteger(company_id, 'company_id');
    const validProjectId = validateInteger(project_id, 'project_id');

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const item = await knowledgeBaseService.create(
      { name: name.trim(), description: validDescription, scope, company_id: validCompanyId, project_id: validProjectId },
      userId,
      role
    );
    created(res, item, '创建知识库成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
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
    // Input validation
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
        fail(res, 400, '知识库名称不能为空'); return;
      }
      if (req.body.name.length > 200) { fail(res, 400, '知识库名称不能超过200个字符'); return; }
    }
    // Normalize description: string → string, null → null (clear), other types → undefined (ignore)
    const validDescription = typeof req.body.description === 'string'
      ? req.body.description
      : (req.body.description === null ? null : undefined);
    if (typeof validDescription === 'string' && validDescription.length > 2000) {
      fail(res, 400, '描述不能超过2000个字符'); return;
    }

    // Explicitly construct update request to prevent mass assignment (SEC-M-04)
    const updateRequest: UpdateKnowledgeBaseRequest = {
      name: req.body.name,
      description: validDescription,
      scope: req.body.scope,
      status: typeof req.body.status === 'boolean' ? req.body.status : undefined,
      company_id: validateInteger(req.body.company_id, 'company_id'),
      project_id: validateInteger(req.body.project_id, 'project_id'),
    };

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const item = await knowledgeBaseService.update(id, updateRequest, userId, role);
    success(res, item, '更新知识库成功');
  } catch (err: unknown) {
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
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
    if (err instanceof AppError) {
      fail(res, err.statusCode, err.message);
    } else {
      fail(res, 500, '删除知识库失败');
    }
  }
}
