import { getPrisma } from '../../utils';
import { Article, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../../entity';
import { mapArticle, mapArticleVersion } from '../../map';
import { IArticleService } from '../article.service';
import { Prisma, ArticleStatus } from '@prisma/client';

export class ArticleServiceImpl implements IArticleService {
  async list(projectId: number, page: number, pageSize: number, search?: string, status?: string, userId?: number, role?: string): Promise<{ list: Article[]; total: number }> {
    const prisma = getPrisma();

    const where: any = { projectId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    if (role === 'admin' && userId) {
      where.project = { operators: { some: { userId } } };
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

  async getById(id: number, userId?: number, role?: string): Promise<Article> {
    const prisma = getPrisma();
    const item = await prisma.article.findFirst({ where: { id } });
    if (!item) throw new Error('文章不存在');
    return mapArticle(item);
  }

  async create(projectId: number, request: CreateArticleRequest, userId: number): Promise<Article> {
    const prisma = getPrisma();

    const item = await prisma.article.create({
      data: {
        projectId,
        title: request.title,
        keywords: request.keywords || Prisma.JsonNull,
        portrait: request.portrait || null,
        images: request.images || Prisma.JsonNull,
        platforms: request.platforms || Prisma.JsonNull,
        skills: request.skills || Prisma.JsonNull,
        llmModelId: request.llm_model_id || null,
        status: (request.status as ArticleStatus) || 'draft',
        createdBy: userId,
      },
    });
    return mapArticle(item);
  }

  async update(id: number, request: UpdateArticleRequest, userId?: number, role?: string): Promise<Article> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({ where: { id } });
    if (!existing) throw new Error('文章不存在');

    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.keywords !== undefined) data.keywords = request.keywords || Prisma.JsonNull;
    if (request.portrait !== undefined) data.portrait = request.portrait || null;
    if (request.images !== undefined) data.images = request.images || Prisma.JsonNull;
    if (request.platforms !== undefined) data.platforms = request.platforms || Prisma.JsonNull;
    if (request.skills !== undefined) data.skills = request.skills || Prisma.JsonNull;
    if (request.llm_model_id !== undefined) data.llmModelId = request.llm_model_id || null;
    if (request.status !== undefined) data.status = request.status;

    // Content versioning: if content is being updated, bump version and save history
    if (request.content !== undefined && request.content !== existing.content) {
      const newVersion = Math.floor(existing.version) + 1.0;
      data.version = newVersion;
      data.content = request.content;

      // Save current content as a version snapshot before updating
      await prisma.articleVersion.create({
        data: {
          articleId: id,
          version: newVersion,
          content: request.content,
          createdBy: userId ?? null,
        },
      });
    }

    const updated = await prisma.article.update({
      where: { id },
      data,
    });
    return mapArticle(updated);
  }

  async delete(id: number, userId?: number, role?: string): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({ where: { id } });
    if (!existing) throw new Error('文章不存在');

    await prisma.article.delete({ where: { id } });
  }

  async review(id: number, approved: boolean, userId?: number, role?: string): Promise<Article> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({ where: { id } });
    if (!existing) throw new Error('文章不存在');

    if (existing.status !== 'pending_review') {
      throw new Error('文章当前状态不支持审核操作');
    }

    const newStatus = approved ? 'publishing' : 'draft';
    const updated = await prisma.article.update({
      where: { id },
      data: { status: newStatus },
    });
    return mapArticle(updated);
  }

  async regenerate(id: number, userId?: number, role?: string): Promise<Article> {
    const prisma = getPrisma();

    const existing = await prisma.article.findFirst({ where: { id } });
    if (!existing) throw new Error('文章不存在');

    if (existing.status !== 'pending_review') {
      throw new Error('文章当前状态不支持重新生成');
    }

    const updated = await prisma.article.update({
      where: { id },
      data: { status: 'generating' },
    });
    return mapArticle(updated);
  }

  async listVersions(articleId: number): Promise<ArticleVersion[]> {
    const prisma = getPrisma();
    const versions = await prisma.articleVersion.findMany({
      where: { articleId },
      orderBy: { version: 'desc' },
    });
    return versions.map(mapArticleVersion);
  }
}
