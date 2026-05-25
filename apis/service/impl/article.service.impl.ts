import { getPrisma } from '../../utils';
import { Article, ArticleStatus, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../../entity';
import type { PublishingScheduleItem, PublishingScheduleUpdateResult } from '../../entity/publishing-schedule.entity';
import { mapArticle, mapArticleVersion } from '../../map';
import { IArticleService, AuthContext } from '../article.service';
import { Prisma } from '@prisma/client';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';
import { PUBLISH_STATUSES } from '../../constants/publish-statuses';
import { validateAndSanitizeMarkdown } from '../../utils/sanitize-markdown.util';

export class ArticleServiceImpl implements IArticleService {
  // C-1 fix: Complete state machine — all 8 states with valid transitions
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    'draft': ['generating', 'manual_writing'],
    'manual_writing': ['pending_review'],
    'generating': ['pending_review', 'generate_failed'],
    'generate_failed': ['generating'],
    'pending_review': ['publishing', 'manual_writing', 'draft', 'generating'],
    'publishing': ['published', 'publish_failed', 'pending_review', 'manual_writing', 'draft'],
    'publish_failed': ['publishing'],
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

    // REQ-3: 服务端 Markdown 内容消毒
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
        platforms: request.platforms || Prisma.JsonNull,
        skills: request.skills || Prisma.JsonNull,
        llmModelId: request.llm_model_id || null,
        content: safeContent,
        status: (request.status as ArticleStatus) || 'draft',
        version,
        createdBy: auth.userId,
      },
    });

    // Save initial content as version snapshot
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
        // REQ-3: 服务端 Markdown 内容消毒
        const safeContent = validateAndSanitizeMarkdown(effectiveRequest.content);
        const newVersion = Math.floor(existing.version) + 1.0;
        data.version = newVersion;
        data.content = safeContent;

        // For AI-generated articles, extract first non-empty line as title
        if (existing.writeMode !== 'manual' && !existing.title) {
          const firstLine = safeContent.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l.length > 0);
          if (firstLine) data.title = firstLine;
        }

        // Save current content as a version snapshot before updating
        await tx.articleVersion.create({
          data: {
            articleId: id,
            version: newVersion,
            content: safeContent,
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
    // REQ-3: 服务端 Markdown 内容消毒
    const safeContent = validateAndSanitizeMarkdown(content);

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
      if (safeContent === existing.content) {
        return mapArticle(existing);
      }

      const newVersion = Math.floor(existing.version) + 1.0;
      const data: any = { version: newVersion, content: safeContent };

      // Title extraction for AI articles
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

      // Business rule: published and publishing articles cannot be deleted
      if (existing.status === 'published' || existing.status === 'publishing') {
        throw new BusinessError('发布中或已发布的文章不能删除');
      }

      await tx.article.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }

  async review(projectId: number, id: number, approved: boolean, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // H-3/H-4: Auth checks inside transaction
      this.checkProjectOwnership(existing, projectId);

      // M-3 fix: Creator cannot review own article — including sysadmin (segregation of duties)
      if (existing.createdBy === auth.userId) {
        throw new ForbiddenError('不能审核自己创建的文章');
      }

      // Review only accepts pending_review articles (business constraint beyond state machine)
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

      // Regenerate has stricter constraints than general state machine:
      // only generate_failed and pending_review can trigger regeneration
      const allowedRegenerateStatuses = ['generate_failed', 'pending_review'];
      if (!allowedRegenerateStatuses.includes(existing.status)) {
        throw new BusinessError('文章当前状态不支持重新生成');
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

      // Business rule: only manual_writing articles can submit for review
      if (existing.status !== 'manual_writing') {
        throw new BusinessError('只有手工编写中的文章可以提交审核');
      }

      // Content not empty check
      if (!existing.content || existing.content.trim().length === 0) {
        throw new BusinessError('文章内容不能为空');
      }

      // Defense-in-depth: validate transition against state machine
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

  // --- Publishing schedule methods (merged from PublishingScheduleService) ---

  async listPublishingSchedule(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    projectId?: number;
    userId?: number;
    role?: string;
  }): Promise<{ list: PublishingScheduleItem[]; total: number }> {
    const prisma = getPrisma();
    const { page, pageSize, search, status, projectId, userId, role } = params;

    const where: any = {
      status: { in: PUBLISH_STATUSES },
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { keywords: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    // Permission filter
    if (role === 'admin' && userId) {
      where.project = {
        operators: { some: { userId } },
        company: { status: true },
        status: true,
      };
    } else if (role === 'view' && userId) {
      where.project = {
        viewers: { some: { userId } },
        company: { status: true },
        status: true,
      };
    }

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          project: {
            include: {
              company: { select: { shortName: true } },
            },
          },
          creator: { select: { id: true, cnName: true } },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    const list: PublishingScheduleItem[] = items.map((item: any) => ({
      id: item.id,
      title: item.title,
      keywords: item.keywords,
      article_type: item.articleType,
      platforms: item.platforms,
      status: item.status,
      scheduled_publish_at: item.scheduledPublishAt ?? null,
      schedule_type: item.scheduleType ?? null,
      project_id: item.projectId,
      project_name: item.project?.shortName || '',
      company_name: item.project?.company?.shortName || '',
      created_by: item.createdBy ?? null,
      created_by_name: item.creator?.cnName || '',
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));

    return { list, total };
  }

  async updateSchedule(id: number, scheduledPublishAt: string | null, scheduleType: string | null, userId: number, role: string): Promise<PublishingScheduleUpdateResult> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: {
          include: {
            operators: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('文章');

    if (existing.status !== 'publishing') {
      throw new BusinessError('当前文章状态不可编辑发布计划');
    }

    // Permission check — admin can only update articles in their own projects
    if (role !== 'sysadmin') {
      const hasAccess = existing.project?.operators?.some(op => op.userId === userId);
      if (!hasAccess) throw new ForbiddenError('无权操作此文章');
    }

    const data: any = {
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
      scheduleType: scheduleType ?? null,
    };

    const updated = await prisma.article.update({
      where: { id },
      data,
      include: {
        project: {
          include: {
            company: { select: { shortName: true } },
          },
        },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      keywords: updated.keywords,
      article_type: updated.articleType,
      platforms: updated.platforms as string[] | null,
      status: updated.status,
      scheduled_publish_at: updated.scheduledPublishAt ?? null,
      schedule_type: updated.scheduleType ?? null,
      project_id: updated.projectId,
      project_name: updated.project?.shortName || '',
      company_name: updated.project?.company?.shortName || '',
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  async rejectPublish(id: number, auth: AuthContext): Promise<Article> {
    return await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await this.findArticleOrThrow(id, tx);

      // Status check: only publishing articles can be rejected
      if (existing.status !== 'publishing') {
        throw new BusinessError('当前文章状态不支持驳回操作');
      }

      // Permission: creator cannot reject own article, only sysadmin or non-creator admin
      if (existing.createdBy === auth.userId) {
        throw new ForbiddenError('不能驳回自己创建的文章');
      }

      // Reject always returns article to pending_review for re-review
      const rejectStatus = 'pending_review';

      // Defense-in-depth: validate transition against state machine
      if (!this.isValidStatusTransition(existing.status, rejectStatus)) {
        throw new BusinessError('非法的状态转换');
      }

      const updated = await tx.article.update({
        where: { id },
        data: { status: rejectStatus },
      });
      return mapArticle(updated);
    });
  }
}
