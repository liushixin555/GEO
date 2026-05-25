import { getPrisma } from '../../utils';
import { Article, ArticleStatus, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../../entity';
import { mapArticle, mapArticleVersion } from '../../map';
import { IArticleService, AuthContext } from '../article.service';
import { Prisma } from '@prisma/client';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';

export class ArticleServiceImpl implements IArticleService {
  // C-2: Business constants — moved from controller to service layer
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    'draft': ['generating', 'manual_writing'],
    'manual_writing': ['pending_review'],
  };

  private static readonly SETTINGS_EDITABLE_STATUSES = ['draft'];
  private static readonly CONTENT_EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];

  // Business rule queries
  isSettingsEditable(status: string): boolean {
    return ArticleServiceImpl.SETTINGS_EDITABLE_STATUSES.includes(status);
  }

  isContentEditable(status: string): boolean {
    return ArticleServiceImpl.CONTENT_EDITABLE_STATUSES.includes(status);
  }

  isValidStatusTransition(from: string, to: string): boolean {
    return ArticleServiceImpl.STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  // Private helpers
  /** 查找文章，不存在则抛出 NotFoundError。支持事务客户端 */
  private async findArticleOrThrow(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? getPrisma();
    const item = await client.article.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('文章');
    return item;
  }

  /** H-4: 项目归属检查 — 文章必须属于指定项目 */
  private checkProjectOwnership(existing: { projectId: number }, projectId: number): void {
    if (existing.projectId !== projectId) throw new NotFoundError('文章');
  }

  /** H-4: 创建者/管理员权限检查 */
  private checkCreatorOrAdmin(existing: { createdBy: number | null }, auth: AuthContext, message = '只能操作自己创建的文章'): void {
    if (auth.role !== 'sysadmin' && existing.createdBy !== auth.userId) {
      throw new ForbiddenError(message);
    }
  }

  // --- Public methods ---

  async list(projectId: number, page: number, pageSize: number, search?: string, status?: string, auth?: AuthContext): Promise<{ list: Article[]; total: number }> {
    const prisma = getPrisma();

    const where: any = { projectId, deletedAt: null };
    if (search) {
      where.keywords = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    if (auth?.role === 'admin' && auth.userId) {
      where.project = { operators: { some: { userId: auth.userId } }, company: { status: true }, status: true };
    }

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    return { list: items.map(mapArticle), total };
  }

  async getById(id: number): Promise<Article> {
    const item = await this.findArticleOrThrow(id);
    return mapArticle(item);
  }

  async create(projectId: number, request: CreateArticleRequest, auth: AuthContext): Promise<Article> {
    const prisma = getPrisma();

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
        platforms: request.platforms || Prisma.JsonNull,
        skills: request.skills || Prisma.JsonNull,
        llmModelId: request.llm_model_id || null,
        content: request.content || null,
        status: (request.status as ArticleStatus) || 'draft',
        version,
        createdBy: auth.userId,
      },
    });

    // Save initial content as version snapshot
    if (request.content) {
      await prisma.articleVersion.create({
        data: {
          articleId: item.id,
          version,
          content: request.content,
          createdBy: auth.userId,
        },
      });
    }

    return mapArticle(item);
  }

  async update(projectId: number, id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction (TOCTOU-safe)
      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能修改自己创建的文章');

      // C-2: Business rule checks in service layer
      if (!this.isSettingsEditable(existing.status)) {
        throw new BusinessError('当前文章状态不可编辑');
      }

      if (request.status && !this.isValidStatusTransition(existing.status, request.status)) {
        throw new BusinessError('非法的状态转换');
      }

      // Generating branch: strip content (business rule)
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
      if (effectiveRequest.platforms !== undefined) data.platforms = effectiveRequest.platforms || Prisma.JsonNull;
      if (effectiveRequest.skills !== undefined) data.skills = effectiveRequest.skills || Prisma.JsonNull;
      if (effectiveRequest.llm_model_id !== undefined) data.llmModelId = effectiveRequest.llm_model_id || null;
      if (effectiveRequest.status !== undefined) data.status = effectiveRequest.status;
      if (effectiveRequest.scheduled_publish_at !== undefined) {
        data.scheduledPublishAt = effectiveRequest.scheduled_publish_at ? new Date(effectiveRequest.scheduled_publish_at) : null;
      }

      // Content versioning: if content is being updated, bump version and save history
      if (effectiveRequest.content !== undefined && effectiveRequest.content !== existing.content) {
        const newVersion = Math.floor(existing.version) + 1.0;
        data.version = newVersion;
        data.content = effectiveRequest.content;

        // For AI-generated articles, extract first non-empty line as title
        if (existing.writeMode !== 'manual' && !existing.title) {
          const firstLine = effectiveRequest.content.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l.length > 0);
          if (firstLine) data.title = firstLine;
        }

        // Save current content as a version snapshot before updating
        await tx.articleVersion.create({
          data: {
            articleId: id,
            version: newVersion,
            content: effectiveRequest.content,
            createdBy: auth.userId,
          },
        });
      }

      const updated = await tx.article.update({
        where: { id },
        data,
      });
      return mapArticle(updated);
    });
  }

  async updateContent(projectId: number, id: number, content: string, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction
      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能修改自己创建的文章');

      // C-2: Content editable status check in service layer
      if (!this.isContentEditable(existing.status)) {
        throw new BusinessError('当前文章状态不可编辑正文');
      }

      // Content versioning — only if content changed
      if (content === existing.content) {
        return mapArticle(existing);
      }

      const newVersion = Math.floor(existing.version) + 1.0;
      const data: any = { version: newVersion, content };

      // Title extraction for AI articles
      if (existing.writeMode !== 'manual' && !existing.title) {
        const firstLine = content.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l.length > 0);
        if (firstLine) data.title = firstLine;
      }

      await tx.articleVersion.create({
        data: {
          articleId: id,
          version: newVersion,
          content,
          createdBy: auth.userId,
        },
      });

      const updated = await tx.article.update({ where: { id }, data });
      return mapArticle(updated);
    });
  }

  async delete(projectId: number, id: number, auth: AuthContext): Promise<void> {
    await getPrisma().$transaction(async (tx) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction
      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能删除自己创建的文章');

      // Business rule: published articles cannot be deleted
      if (existing.status === 'published') {
        throw new BusinessError('已发布的文章不能删除');
      }

      await tx.article.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }

  async review(projectId: number, id: number, approved: boolean, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction
      this.checkProjectOwnership(existing, projectId);

      // Creator cannot review own article
      if (auth.role !== 'sysadmin' && existing.createdBy === auth.userId) {
        throw new ForbiddenError('不能审核自己创建的文章');
      }

      if (existing.status !== 'pending_review') {
        throw new BusinessError('文章当前状态不支持审核操作');
      }

      const newStatus = approved ? 'publishing' : (existing.writeMode === 'manual' ? 'manual_writing' : 'draft');
      const updated = await tx.article.update({
        where: { id },
        data: { status: newStatus },
      });
      return mapArticle(updated);
    });
  }

  async regenerate(projectId: number, id: number, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction
      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能重新生成自己创建的文章');

      const allowedRegenerateStatuses = ['generate_failed', 'pending_review'];
      if (!allowedRegenerateStatuses.includes(existing.status)) {
        throw new BusinessError('当前文章状态不支持重新生成');
      }

      const updated = await tx.article.update({
        where: { id },
        data: { status: 'generating' },
      });
      return mapArticle(updated);
    });
  }

  async submitForReview(projectId: number, id: number, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction
      this.checkProjectOwnership(existing, projectId);
      this.checkCreatorOrAdmin(existing, auth, '只能操作自己创建的文章');

      // Status check
      if (existing.status !== 'manual_writing') {
        throw new BusinessError('只有手工编写中的文章可以提交审核');
      }

      // Content not empty check
      if (!existing.content || existing.content.trim().length === 0) {
        throw new BusinessError('文章内容不能为空');
      }

      // Status transition check
      if (!this.isValidStatusTransition(existing.status, 'pending_review')) {
        throw new BusinessError('非法的状态转换');
      }

      const updated = await tx.article.update({
        where: { id },
        data: { status: 'pending_review' },
      });
      return mapArticle(updated);
    });
  }

  async listVersions(articleId: number): Promise<ArticleVersion[]> {
    const prisma = getPrisma();
    const versions = await prisma.articleVersion.findMany({
      where: { articleId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    return versions.map(mapArticleVersion);
  }
}
