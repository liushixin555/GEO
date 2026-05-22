import { Request, Response } from 'express';
import { ArticleServiceImpl } from '../service/impl/article.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, paginate } from '../utils';

const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();

const SETTINGS_EDITABLE_STATUSES = ['draft'];
const CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}

export async function listArticles(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const { userId, role } = req.user!;

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }

    const { list, total } = await articleService.list(projectId, page, pageSize, search, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取文章列表失败');
  }
}

export async function getArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { userId, role } = req.user!;
    const item = await articleService.getById(id, userId, role);

    if (item.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }

    success(res, item);
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取文章详情失败');
    }
  }
}

export async function createArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }

    const { status } = req.body;
    if (status && !['draft', 'manual_writing', 'generating'].includes(status)) {
      fail(res, 400, '无效的初始状态');
      return;
    }

    const { userId, role } = req.user!;

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }

    const item = await articleService.create(projectId, req.body, userId);
    res.status(201).json({ code: 0, message: '创建文章成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建文章失败');
  }
}

export async function updateArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
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

    // If submitting for AI generation, validate and allow status transition
    const targetStatus = req.body.status;
    if (targetStatus && targetStatus === 'generating') {
      const item = await articleService.update(id, { ...req.body, status: 'generating' }, userId, role);
      success(res, item, '已提交AI生成');
      return;
    }

    const item = await articleService.update(id, req.body, userId, role);
    success(res, item, '更新文章成功');
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新文章失败');
    }
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

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
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
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新文章失败');
    }
  }
}

export async function deleteArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
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
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '删除文章失败');
    }
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

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }

    const item = await articleService.review(id, approved, userId, role);
    success(res, item, approved ? '审核通过' : '审核不通过');
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else if (err.message === '文章当前状态不支持审核操作') {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, err.message || '审核操作失败');
    }
  }
}

export async function regenerateArticle(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    // Admin must be operator of the project
    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }

    const item = await articleService.regenerate(id, userId, role);
    success(res, item, '已重新提交AI生成');
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else if (err.message === '文章当前状态不支持重新生成') {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, err.message || '重新生成操作失败');
    }
  }
}

export async function submitForReview(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
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
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '提交审核失败');
    }
  }
}

export async function listArticleVersions(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) { fail(res, 400, '无效的项目ID'); return; }
    if (isNaN(id)) { fail(res, 400, '无效的文章ID'); return; }

    const { userId, role } = req.user!;
    const existing = await articleService.getById(id, userId, role);

    if (existing.project_id !== projectId) {
      fail(res, 404, '文章不存在');
      return;
    }

    if (role === 'admin') {
      try {
        await checkProjectOperator(projectId, userId, role);
      } catch {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }

    const versions = await articleService.listVersions(id);
    success(res, versions);
  } catch (err: any) {
    if (err.message === '文章不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取版本历史失败');
    }
  }
}
