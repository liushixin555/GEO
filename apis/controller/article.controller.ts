import { Request, Response } from 'express';
import { z } from 'zod';
import { createArticleService, createProjectService, IArticleService, IProjectService } from '../service';
import type { AuthContext } from '../service';
import { getPrisma, success, fail, paginate, created } from '../utils';
import { AppError, ForbiddenError } from '../errors';
import { logger } from '../utils/logger.util';
import { ROLES, Role } from '../constants/roles';
import {
  createArticleSchema,
  batchCreateArticlesSchema,
  updateArticleSchema,
  reviewArticleSchema,
  updateContentSchema,
  listArticlesSchema,
} from '../schema/article.schema';
import type { CreateArticleRequest, UpdateArticleRequest } from '../entity';

// M-1 fix: Factory pattern — lazy initialization, testable via module mock
const articleService: IArticleService = createArticleService();
const projectService: IProjectService = createProjectService();

async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === ROLES.SYSADMIN) return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new ForbiddenError('无权操作该项目');
  }
}

// Unified error handling — AppError hierarchy maps to HTTP status codes
function handleServerError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof z.ZodError) {
    fail(res, 400, err.issues.map((e: any) => e.message).join('; '));
  } else if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('unhandled_error', { error: err instanceof Error ? err.message : String(err), context: contextMsg });
    fail(res, 500, contextMsg);
  }
}

function getAuthUser(req: Request): AuthContext | null {
  if (!req.user) return null;
  return { userId: req.user.userId, role: req.user.role as Role };
}

function parseId(value: string | undefined, label: string, res: Response): number | null {
  if (value === undefined) { fail(res, 400, `无效的${label}`); return null; }
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) { fail(res, 400, `无效的${label}`); return null; }
  return id;
}

// C-1 fix: unified auth/context wrapper — eliminates ~141 lines of template duplication
interface RouteContext extends AuthContext {
  projectId: number;
  articleId?: number;
}

type AuthenticatedHandler = (req: Request, res: Response, ctx: RouteContext) => Promise<void>;

interface WithAuthOptions {
  requireId?: boolean;
  errorContext?: string;
}

function withArticleAuth(handler: AuthenticatedHandler, options: WithAuthOptions = {}): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = parseId(req.params.projectId as string, '项目ID', res);
      if (projectId === null) return;

      let articleId: number | undefined;
      if (options.requireId) {
        const parsedId = parseId(req.params.id as string, '文章ID', res);
        if (parsedId === null) return;
        articleId = parsedId;
      }

      const user = getAuthUser(req);
      if (!user) { fail(res, 401, '未认证'); return; }

      if (user.role === ROLES.ADMIN) {
        await checkProjectOperator(projectId, user.userId, user.role);
      }

      await handler(req, res, { ...user, role: user.role as Role, projectId, articleId });
    } catch (err: unknown) {
      handleServerError(res, err, options.errorContext ?? '操作失败');
    }
  };
}

// --- Handlers (thin — business logic delegated to service layer) ---

export const listArticles = withArticleAuth(async (req, res, ctx) => {
  // Route validate() middleware already validated req.query — no redundant parse
  const { page, pageSize, search, status } = req.query as unknown as z.infer<typeof listArticlesSchema>;
  const { list, total } = await articleService.list(ctx.projectId, page, pageSize, ctx, search, status);
  paginate(res, list, total, page, pageSize);
}, { errorContext: '获取文章列表失败' });

export const getArticle = withArticleAuth(async (req, res, ctx) => {
  const item = await articleService.getById(ctx.projectId, ctx.articleId!);
  success(res, item);
}, { requireId: true, errorContext: '获取文章详情失败' });

export const createArticle = withArticleAuth(async (req, res, ctx) => {
  const body = req.body as CreateArticleRequest;
  const item = await articleService.create(ctx.projectId, body, ctx);
  created(res, item, '创建文章成功');
}, { errorContext: '创建文章失败' });

export const batchCreateArticles = withArticleAuth(async (req, res, ctx) => {
  const { articles } = req.body as z.infer<typeof batchCreateArticlesSchema>;
  const items = await articleService.batchCreate(ctx.projectId, articles as CreateArticleRequest[], ctx);
  created(res, { list: items, total: items.length }, '批量提交AI生成成功');
}, { errorContext: '批量创建文章失败' });

export const updateArticle = withArticleAuth(async (req, res, ctx) => {
  const body = req.body as UpdateArticleRequest;
  const item = await articleService.update(ctx.projectId, ctx.articleId!, body, ctx);
  success(res, item, body.status === 'generating' ? '已提交AI生成' : '更新文章成功');
}, { requireId: true, errorContext: '更新文章失败' });

export const updateArticleContent = withArticleAuth(async (req, res, ctx) => {
  const { content } = req.body as z.infer<typeof updateContentSchema>;
  const item = await articleService.updateContent(ctx.projectId, ctx.articleId!, content, ctx);
  success(res, item, '更新正文成功');
}, { requireId: true, errorContext: '更新文章失败' });

export const deleteArticle = withArticleAuth(async (req, res, ctx) => {
  await articleService.delete(ctx.projectId, ctx.articleId!, ctx);
  logger.info('article_deleted', { articleId: ctx.articleId, projectId: ctx.projectId, operatorId: ctx.userId, role: ctx.role });
  success(res, null, '删除文章成功');
}, { requireId: true, errorContext: '删除文章失败' });

export const reviewArticle = withArticleAuth(async (req, res, ctx) => {
  const { approved } = req.body as z.infer<typeof reviewArticleSchema>;
  const item = await articleService.review(ctx.projectId, ctx.articleId!, approved, ctx);
  logger.info('article_reviewed', { articleId: ctx.articleId, projectId: ctx.projectId, operatorId: ctx.userId, role: ctx.role, approved });
  success(res, item, approved ? '审核通过' : '审核不通过');
}, { requireId: true, errorContext: '审核操作失败' });

export const regenerateArticle = withArticleAuth(async (req, res, ctx) => {
  const item = await articleService.regenerate(ctx.projectId, ctx.articleId!, ctx, req.body?.revision_instruction);
  success(res, item, '已重新提交AI生成');
}, { requireId: true, errorContext: '重新生成操作失败' });

export const batchRegenerateArticles = withArticleAuth(async (req, res, ctx) => {
  const result = await articleService.batchRegenerate(ctx.projectId, req.body.article_ids, ctx, req.body.revision_instruction);
  success(res, result, `已提交 ${result.success_count} 篇文章重新生成`);
}, { errorContext: '批量重新生成操作失败' });

export const submitForReview = withArticleAuth(async (req, res, ctx) => {
  const item = await articleService.submitForReview(ctx.projectId, ctx.articleId!, ctx);
  success(res, item, '已提交审核');
}, { requireId: true, errorContext: '提交审核失败' });

export const listArticleVersions = withArticleAuth(async (req, res, ctx) => {
  const versions = await articleService.listVersions(ctx.projectId, ctx.articleId!);
  success(res, versions);
}, { requireId: true, errorContext: '获取版本历史失败' });

export const getArticleGenerationDebug = withArticleAuth(async (req, res, ctx) => {
  await articleService.getById(ctx.projectId, ctx.articleId!);
  const prisma = getPrisma();
  const item = await prisma.articleGenerationDebug.findFirst({
    where: { articleId: ctx.articleId! },
    orderBy: { createdAt: 'desc' },
  });
  success(res, item);
}, { requireId: true, errorContext: '获取文章生成依据失败' });
function normalizeEvidenceKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean),
  ));
}

function mapArticleEvidenceCard(item: any): any {
  const card = item.evidenceCard;
  return {
    id: item.id,
    articleId: item.articleId,
    evidenceCardId: item.evidenceCardId,
    usageType: item.usageType,
    createdAt: item.createdAt,
    evidenceCard: card ? {
      id: card.id,
      companyId: card.companyId ?? null,
      projectId: card.projectId ?? null,
      title: card.title,
      content: card.content,
      evidenceType: card.evidenceType,
      sourceType: card.sourceType,
      sourceId: card.sourceId ?? null,
      sourceUrl: card.sourceUrl ?? null,
      keywords: normalizeEvidenceKeywords(card.keywords),
      confidenceScore: card.confidenceScore ?? null,
      freshnessScore: card.freshnessScore ?? null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      deletedAt: card.deletedAt ?? null,
    } : undefined,
  };
}

export const listArticleEvidenceCards = withArticleAuth(async (req, res, ctx) => {
  await articleService.getById(ctx.projectId, ctx.articleId!);
  const prisma = getPrisma() as any;
  const items = await prisma.articleEvidenceCard.findMany({
    where: {
      articleId: ctx.articleId!,
      usageType: 'injected',
      evidenceCard: { deletedAt: null },
    },
    orderBy: { createdAt: 'asc' },
    include: { evidenceCard: true },
  });
  const list = items.map(mapArticleEvidenceCard);
  success(res, { list, total: list.length });
}, { requireId: true, errorContext: '获取文章证据卡片失败' });
