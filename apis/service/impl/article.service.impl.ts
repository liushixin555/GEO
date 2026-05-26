import { getPrisma } from '../../utils';
import { Article, ArticleStatus, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../../entity';
import { mapArticle, mapArticleVersion } from '../../map';
import { IArticleService } from '../article.service';
import type { AuthContext } from '../article.service';
import { Prisma } from '@prisma/client';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';
import { validateAndSanitizeMarkdown } from '../../utils/sanitize-markdown.util';

export class ArticleServiceImpl implements IArticleService {
  private static readonly STATUS_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
    'draft': ['generating', 'manual_writing'],
    'manual_writing': ['pending_review'],
    'generating': ['pending_review', 'generate_failed'],
    'generate_failed': ['generating'],
    'pending_review': ['approved', 'manual_writing', 'draft', 'generating'],
    'approved': [],
    'publishing': [],
    'published': [],
    'publish_failed': [],
  };

  private static readonly SETTINGS_EDITABLE_STATUSES: ArticleStatus[] = ['draft'];
  private static readonly CONTENT_EDITABLE_STATUSES: ArticleStatus[] = ['draft', 'manual_writing', 'generate_failed'];

  isSettingsEditable(status: ArticleStatus): boolean {
    return ArticleServiceImpl.SETTINGS_EDITABLE_STATUSES.includes(status);
  }

  isContentEditable(status: ArticleStatus): boolean {
    return ArticleServiceImpl.CONTENT_EDITABLE_STATUSES.includes(status);
  }

  isValidStatusTransition(from: ArticleStatus, to: ArticleStatus): boolean {
    return ArticleServiceImpl.STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private async findArticleOrThrow(id: number, tx?: Prisma.TransactionClient, projectId?: number) {
    const client = tx ?? getPrisma();
    const where: any = { id, deletedAt: null };
    if (projectId !== undefined) where.projectId = projectId;
    const item = await client.article.findFirst({ where });
    if (!item) throw new NotFoundError('文章');
    return item;
  }

  private checkProjectOwnership(existing: { projectId: number }, projectId: number): void {
    if (existing.projectId !== projectId) throw new NotFoundError('文章');
  }

  private checkCreatorOrAdmin(existing: { createdBy: number | null }, auth: AuthContext, message = '只能操作自己创建的文章'): void {
    if (auth.role !== 'sysadmin' && existing.createdBy !== auth.userId) {
      throw new ForbiddenError(message);
    }
  }

  async list(projectId: number, page: number, pageSize: number, auth: AuthContext, search?: string, status?: string): Promise<{ list: Article[]; total: number }> {
    const prisma = getPrisma();

    const where: any = { projectId, deletedAt: null };
    if (search) {
      where.keywords = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    if (auth.role === 'admin' && auth.userId) {
      where.project = { operators: { some: { userId: auth.userId } }, company: { status: true }, status: true };
    }

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      }),
      prisma.article.count({ where }),
    ]);

    return { list: items.map(mapArticle), total };
  }

  async getById(projectId: number, id: number): Promise<Article> {
    const prisma = getPrisma();
    const item = await prisma.article.findFirst({
      where: { id, projectId, deletedAt: null },
      include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
    });
    if (!item) throw new NotFoundError('文章');
    return mapArticle(item);
  }

  async create(projectId: number, request: CreateArticleRequest, auth: AuthContext): Promise<Article> {
    const prisma = getPrisma();

    const safeContent = request.content ? validateAndSanitizeMarkdown(request.content) : null;

    const version = 1;
    const item = await prisma.article.create({
      data: {
        projectId,
        title: request.title || '',
        articleType: request.article_type || null,
        writeMode: request.write_mode || null,
        keywords: request.keywords || null,
        portrait: request.portrait || null,
        images: request.images || Prisma.JsonNull,
        skills: request.skills || Prisma.JsonNull,
        llmModelId: request.llm_model_id || null,
        content: safeContent,
        status: (request.status as ArticleStatus) || 'draft',
        version,
        createdBy: auth.userId,
      },
    });

    if (safeContent) {
      await prisma.articleVersion.create({
        data: {
          articleId: item.id,
          version,
          content: safeContent,
          createdBy: auth.userId,
        },
      });
    }

    return mapArticle(item);
  }

  async update(projectId: number, id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能修改自己创建的文章');

      if (!this.isSettingsEditable(existing.status)) {
        throw new BusinessError('当前文章状态不可编辑');
      }

      if (request.status && !this.isValidStatusTransition(existing.status, request.status)) {
        throw new BusinessError('非法的状态转换');
      }

      const effectiveRequest = request.status === 'generating'
        ? { ...request, content: undefined }
        : request;

      const data: any = {};
      if (effectiveRequest.title !== undefined) data.title = effectiveRequest.title;
      if (effectiveRequest.article_type !== undefined) data.articleType = effectiveRequest.article_type || null;
      if (effectiveRequest.write_mode !== undefined) data.writeMode = effectiveRequest.write_mode || null;
      if (effectiveRequest.keywords !== undefined) data.keywords = effectiveRequest.keywords || null;
      if (effectiveRequest.portrait !== undefined) data.portrait = effectiveRequest.portrait || null;
      if (effectiveRequest.images !== undefined) data.images = effectiveRequest.images || Prisma.JsonNull;
      if (effectiveRequest.skills !== undefined) data.skills = effectiveRequest.skills || Prisma.JsonNull;
      if (effectiveRequest.llm_model_id !== undefined) data.llmModelId = effectiveRequest.llm_model_id || null;
      if (effectiveRequest.status !== undefined) data.status = effectiveRequest.status;

      if (effectiveRequest.content !== undefined && effectiveRequest.content !== existing.content) {
        const safeContent = typeof effectiveRequest.content === 'string'
          ? validateAndSanitizeMarkdown(effectiveRequest.content)
          : null;
        const newVersion = Math.floor(existing.version) + 1.0;
        data.version = newVersion;
        data.content = safeContent;

        if (safeContent && existing.writeMode !== 'manual' && !existing.title) {
          const firstLine = safeContent.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l.length > 0);
          if (firstLine) data.title = firstLine;
        }

        await tx.articleVersion.create({
          data: {
            articleId: id,
            version: newVersion,
            content: safeContent ?? '',
            createdBy: auth.userId,
          },
        });
      }

      const updated = await tx.article.update({
        where: { id },
        data,
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
      return mapArticle(updated);
    });
  }

  async updateContent(projectId: number, id: number, content: string, auth: AuthContext): Promise<Article> {
    const safeContent = validateAndSanitizeMarkdown(content);

    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能修改自己创建的文章');

      if (!this.isContentEditable(existing.status)) {
        throw new BusinessError('当前文章状态不可编辑正文');
      }

      if (safeContent === existing.content) {
        return mapArticle(existing);
      }

      const newVersion = Math.floor(existing.version) + 1.0;
      const data: any = { version: newVersion, content: safeContent };

      if (existing.writeMode !== 'manual' && !existing.title) {
        const firstLine = safeContent.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l.length > 0);
        if (firstLine) data.title = firstLine;
      }

      await tx.articleVersion.create({
        data: {
          articleId: id,
          version: newVersion,
          content: safeContent,
          createdBy: auth.userId,
        },
      });

      const updated = await tx.article.update({
        where: { id },
        data,
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
      return mapArticle(updated);
    });
  }

  async delete(projectId: number, id: number, auth: AuthContext): Promise<void> {
    await getPrisma().$transaction(async (tx) => {
      const existing = await this.findArticleOrThrow(id, tx);

      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能删除自己创建的文章');

      if (existing.status === 'approved') {
        throw new BusinessError('已审核通过的文章不能删除');
      }

      await tx.article.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }

  async review(projectId: number, id: number, approved: boolean, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      this.checkProjectOwnership(existing, projectId);

      if (existing.createdBy === auth.userId) {
        throw new ForbiddenError('不能审核自己创建的文章');
      }

      if (existing.status !== 'pending_review') {
        throw new BusinessError('文章当前状态不支持审核操作');
      }

      const newStatus = approved ? 'approved' : (existing.writeMode === 'manual' ? 'manual_writing' : 'draft');
      const updated = await tx.article.update({
        where: { id },
        data: { status: newStatus },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
      return mapArticle(updated);
    });
  }

  async regenerate(projectId: number, id: number, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能重新生成自己创建的文章');

      const allowedRegenerateStatuses = ['generate_failed', 'pending_review'];
      if (!allowedRegenerateStatuses.includes(existing.status)) {
        throw new BusinessError('文章当前状态不支持重新生成');
      }

      const updated = await tx.article.update({
        where: { id },
        data: { status: 'generating' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
      return mapArticle(updated);
    });
  }

  async submitForReview(projectId: number, id: number, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能操作自己创建的文章');

      if (existing.status !== 'manual_writing') {
        throw new BusinessError('只有手工编写中的文章可以提交审核');
      }

      if (!existing.content || existing.content.trim().length === 0) {
        throw new BusinessError('文章内容不能为空');
      }

      if (!this.isValidStatusTransition(existing.status, 'pending_review')) {
        throw new BusinessError('非法的状态转换');
      }

      const updated = await tx.article.update({
        where: { id },
        data: { status: 'pending_review' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
      return mapArticle(updated);
    });
  }

  async listVersions(projectId: number, articleId: number): Promise<ArticleVersion[]> {
    const prisma = getPrisma();
    // C-1 fix: verify article belongs to project before listing versions
    const article = await prisma.article.findFirst({
      where: { id: articleId, projectId, deletedAt: null },
    });
    if (!article) throw new NotFoundError('文章');
    const versions = await prisma.articleVersion.findMany({
      where: { articleId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    return versions.map(mapArticleVersion);
  }
}
