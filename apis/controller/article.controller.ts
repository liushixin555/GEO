import { Request, Response } from 'express';
import { ArticleServiceImpl } from '../service/impl/article.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, paginate, created } from '../utils';

import { AppError, ForbiddenError } from '../errors';
import { logger } from '../utils/logger.util';
import { ROLES } from '../constants/roles';

const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();

const SETTINGS_EDITABLE_STATUSES = ['draft'];
const CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];

// CRITICAL-2 fix: 合法的状态转换白名单（仅保留可达条目，regenerateArticle/reviewArticle 有独立状态校验）
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['generating', 'manual_writing'],
  'manual_writing': ['pending_review'],
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

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === ROLES.SYSADMIN) return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new ForbiddenError('无权操作该项目');
  }
}

// 统一错误处理，使用 AppError 基类匹配所有业务异常
function handleServerError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('unhandled_error', { error: err instanceof Error ? err.message : String(err), context: contextMsg });
    fail(res, 500, contextMsg);
  }
}

// MEDIUM-4 fix: 防御性获取用户信息
function getAuthUser(req: Request): { userId: number; role: string } | null {
  return req.user ?? null;
}

// M-2 fix: 统一整数参数解析 + 边界检查
function parseId(value: string | undefined, label: string, res: Response): number | null {
  if (value === undefined) { fail(res, 400, `无效的${label}`); return null; }
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) { fail(res, 400, `无效的${label}`); return null; }
  return id;
}

export async function listArticles(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;

    // 路由中间件已完成 Zod 验证，直接使用验证后的数据
    const { page, pageSize, search, status } = req.query as any;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    const { list, total } = await articleService.list(projectId, page, pageSize, search, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleServerError(res, err, '获取文章列表失败');
  }
}

export async function getArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const item = await articleService.getById(id, userId, role);

    if (item.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    success(res, item);
  } catch (err: unknown) {
    handleServerError(res, err, '获取文章详情失败');
  }
}

export async function createArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;

    // 路由中间件已完成 Zod 验证，pickAllowedFields 作为二道防线
    const body = pickAllowedFields(req.body, CREATE_ALLOWED_FIELDS);

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    const item = await articleService.create(projectId, body, userId);
    created(res, item, '创建文章成功');
  } catch (err: unknown) {
    handleServerError(res, err, '创建文章失败');
  }
}

export async function updateArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    // Only creator or sysadmin can edit
    if (role !== ROLES.SYSADMIN && existing.created_by !== userId) {
      fail(res, 403, '只能修改自己创建的文章');
      return;
    }

    // Only editable settings in draft status
    if (!SETTINGS_EDITABLE_STATUSES.includes(existing.status)) {
      fail(res, 400, '当前文章状态不可编辑');
      return;
    }

    // 路由中间件已完成 Zod 验证，pickAllowedFields 作为二道防线
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
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    // 路由中间件已完成 Zod 验证
    const { content } = req.body;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    // Only creator or sysadmin can edit content
    if (role !== ROLES.SYSADMIN && existing.created_by !== userId) {
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
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    // Only creator or sysadmin can delete
    if (role !== ROLES.SYSADMIN && existing.created_by !== userId) {
      fail(res, 403, '只能删除自己创建的文章');
      return;
    }

    // Published articles cannot be deleted
    if (existing.status === 'published') {
      fail(res, 400, '已发布的文章不能删除');
      return;
    }

    await articleService.delete(id, userId, role);
    logger.info('article_deleted', { articleId: id, projectId, operatorId: userId, role });
    success(res, null, '删除文章成功');
  } catch (err: unknown) {
    handleServerError(res, err, '删除文章失败');
  }
}

export async function reviewArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    // 路由中间件已完成 Zod 验证
    const { approved } = req.body;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    // HIGH-2 fix: 创建者不能审核自己的文章
    if (role !== ROLES.SYSADMIN && existing.created_by === userId) {
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
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    // MEDIUM-3 fix: 只有创建者或 sysadmin 可以重新生成
    if (role !== ROLES.SYSADMIN && existing.created_by !== userId) {
      fail(res, 403, '只能重新生成自己创建的文章');
      return;
    }

    // M-4 fix: 控制器层状态预检
    const allowedRegenerateStatuses = ['generate_failed', 'pending_review'];
    if (!allowedRegenerateStatuses.includes(existing.status)) {
      fail(res, 400, '当前文章状态不支持重新生成');
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
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    if (role !== ROLES.SYSADMIN && existing.created_by !== userId) {
      fail(res, 403, '只能操作自己创建的文章');
      return;
    }

    if (existing.status !== 'manual_writing') {
      fail(res, 400, '只有手工编写中的文章可以提交审核');
      return;
    }

    // M-4 fix: 内容非空检查
    if (!existing.content || existing.content.trim().length === 0) {
      fail(res, 400, '文章内容不能为空');
      return;
    }

    // 统一状态转换校验
    if (!isValidStatusTransition(existing.status, 'pending_review')) {
      fail(res, 400, '非法的状态转换');
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
    const projectId = parseId(req.params.projectId as string, '项目ID', res);
    if (projectId === null) return;
    const id = parseId(req.params.id as string, '文章ID', res);
    if (id === null) return;

    const user = getAuthUser(req);
    if (!user) { fail(res, 401, '未认证'); return; }
    const { userId, role } = user;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === ROLES.ADMIN) {
      await checkProjectOperator(projectId, userId, role);
    }

    const versions = await articleService.listVersions(id);
    success(res, versions);
  } catch (err: unknown) {
    handleServerError(res, err, '获取版本历史失败');
  }
}
