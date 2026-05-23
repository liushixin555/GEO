import { Request, Response } from 'express';
import { ArticleServiceImpl } from '../service/impl/article.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, paginate } from '../utils';

const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();

const SETTINGS_EDITABLE_STATUSES = ['draft'];
const CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];
const MAX_CONTENT_LENGTH = 500_000;

// CRITICAL-2 fix: 合法的状态转换白名单
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['generating', 'manual_writing'],
  'manual_writing': ['pending_review'],
  'generate_failed': ['generating'],
  'publish_failed': ['publishing'],
  'pending_review': ['publishing', 'draft', 'manual_writing'],
};

function isValidStatusTransition(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// CRITICAL-1 fix: updateArticle 允许的字段白名单
const UPDATE_ALLOWED_FIELDS = [
  'title', 'article_type', 'write_mode', 'keywords', 'portrait',
  'images', 'platforms', 'skills', 'llm_model_id', 'content',
  'status', 'scheduled_publish_at',
];

// HIGH-1 fix: createArticle 允许的字段白名单
const CREATE_ALLOWED_FIELDS = [
  'title', 'article_type', 'write_mode', 'keywords', 'portrait',
  'images', 'platforms', 'skills', 'llm_model_id', 'content', 'status',
];

const VALID_CREATE_STATUSES = ['draft', 'manual_writing', 'generating'];

// 提取白名单字段
function pickAllowedFields(body: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
}

class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new PermissionDeniedError('无权操作该项目');
  }
}

// HIGH-3 fix: 统一错误处理，不泄露内部 err.message
function handleServerError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof Error && err.message === '文章不存在') {
    fail(res, 404, err.message);
  } else if (err instanceof Error && err.message === '文章当前状态不支持审核操作') {
    fail(res, 400, err.message);
  } else if (err instanceof Error && err.message === '文章当前状态不支持重新生成') {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, contextMsg);
  }
}

// MEDIUM-4 fix: 防御性获取用户信息
function getAuthUser(req: Request): { userId: number; role: string } | null {
  return req.user ?? null;
}

export async function listArticles(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    // MEDIUM-2 fix: 分页参数上下限
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));

    // LOW-1 fix: search 参数清理
    const search = typeof req.query.search === 'string'
      ? req.query.search.trim().slice(0, 200)
      : undefined;
    const status = req.query.status as string | undefined;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    const { list, total } = await articleService.list(projectId, page, pageSize, search, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleServerError(res, err, '获取文章列表失败');
  }
}

export async function getArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const item = await articleService.getById(id, userId, role);

    if (item.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    success(res, item);
  } catch (err: unknown) {
    handleServerError(res, err, '获取文章详情失败');
  }
}

export async function createArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    // HIGH-1 / CRITICAL-1 fix: 字段白名单过滤
    const body = pickAllowedFields(req.body, CREATE_ALLOWED_FIELDS);

    const { status } = body;
    if (status && !VALID_CREATE_STATUSES.includes(status as string)) {
      fail(res, 400, '无效的初始状态');
      return;
    }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    const item = await articleService.create(projectId, body, userId);
    res.status(201).json({ code: 0, message: '创建文章成功', data: item });
  } catch (err: unknown) {
    handleServerError(res, err, '创建文章失败');
  }
}

export async function updateArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    // Only creator or sysadmin can edit
    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的文章');
      return;
    }

    // Only editable settings in draft status
    if (!SETTINGS_EDITABLE_STATUSES.includes(existing.status)) {
      fail(res, 400, '当前文章状态不可编辑');
      return;
    }

    // CRITICAL-1 fix: 白名单过滤
    const body = pickAllowedFields(req.body, UPDATE_ALLOWED_FIELDS);

    // CRITICAL-2 fix: 状态转换白名单校验
    const targetStatus = body.status as string | undefined;
    if (targetStatus) {
      if (!isValidStatusTransition(existing.status, targetStatus)) {
        fail(res, 400, '非法的状态转换');
        return;
      }

      // 补充-1 fix: generating 分支排除 content
      if (targetStatus === 'generating') {
        const { content, ...metadata } = body;
        const item = await articleService.update(id, { ...metadata, status: 'generating' }, userId, role);
        success(res, item, '已提交AI生成');
        return;
      }
    }

    const item = await articleService.update(id, body, userId, role);
    success(res, item, '更新文章成功');
  } catch (err: unknown) {
    handleServerError(res, err, '更新文章失败');
  }
}

export async function updateArticleContent(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { content } = req.body;
    if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }

    // HIGH-4 fix: content 大小限制
    if (content.length > MAX_CONTENT_LENGTH) {
      fail(res, 400, `正文内容不能超过${MAX_CONTENT_LENGTH / 1000}KB`);
      return;
    }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    // Only creator or sysadmin can edit content
    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的文章');
      return;
    }

    // Content can be edited in content-editable statuses only
    if (!CONTENT_EDITABLE_STATUSES.includes(existing.status)) {
      fail(res, 400, '当前文章状态不可编辑正文');
      return;
    }

    const item = await articleService.update(id, { content }, userId, role);
    success(res, item, '更新正文成功');
  } catch (err: unknown) {
    handleServerError(res, err, '更新文章失败');
  }
}

export async function deleteArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    // Only creator or sysadmin can delete
    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能删除自己创建的文章');
      return;
    }

    // Published articles cannot be deleted
    if (existing.status === 'published') {
      fail(res, 400, '已发布的文章不能删除');
      return;
    }

    await articleService.delete(id, userId, role);
    success(res, null, '删除文章成功');
  } catch (err: unknown) {
    handleServerError(res, err, '删除文章失败');
  }
}

export async function reviewArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { approved } = req.body;
    if (typeof approved !== 'boolean') { fail(res, 400, '审核参数无效'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    // HIGH-2 fix: 创建者不能审核自己的文章
    if (role !== 'sysadmin' && existing.created_by === userId) {
      fail(res, 403, '不能审核自己创建的文章');
      return;
    }

    const item = await articleService.review(id, approved, userId, role);
    success(res, item, approved ? '审核通过' : '审核不通过');
  } catch (err: unknown) {
    handleServerError(res, err, '审核操作失败');
  }
}

export async function regenerateArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    // MEDIUM-3 fix: 只有创建者或 sysadmin 可以重新生成
    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能重新生成自己创建的文章');
      return;
    }

    const item = await articleService.regenerate(id, userId, role);
    success(res, item, '已重新提交AI生成');
  } catch (err: unknown) {
    handleServerError(res, err, '重新生成操作失败');
  }
}

export async function submitForReview(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    if (role !== 'sysadmin' && existing.created_by !== userId) {
      fail(res, 403, '只能操作自己创建的文章');
      return;
    }

    if (existing.status !== 'manual_writing') {
      fail(res, 400, '只有手工编写中的文章可以提交审核');
      return;
    }

    const item = await articleService.update(id, { status: 'pending_review' }, userId, role);
    success(res, item, '已提交审核');
  } catch (err: unknown) {
    handleServerError(res, err, '提交审核失败');
  }
}

export async function listArticleVersions(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          fail(res, 403, err.message);
        } else {
          throw err;
        }
        return;
      }
    }

    const versions = await articleService.listVersions(id);
    success(res, versions);
  } catch (err: unknown) {
    handleServerError(res, err, '获取版本历史失败');
  }
}
