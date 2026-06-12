import { getPrisma } from '../../utils';
import { KnowledgeKeyword, KnowledgeKeywordDetail, KeywordExpandedWord, KnowledgePortrait, KnowledgeImage, KnowledgeDocument, CreateKeywordRequest, UpdateKeywordRequest, CreatePortraitRequest, UpdatePortraitRequest, CreateImageRequest, UpdateImageRequest, CreateDocumentRequest, UpdateDocumentRequest, MinedKeyword } from '../../entity';
import { mapKeyword, mapPortrait, mapKnowledgeImage, mapKnowledgeDocument, mapMinedKeyword } from '../../map';
import { IKeywordService, IPortraitService, IImageService, IDocumentService, IMinedKeywordService } from '../knowledge.service';
import { KnowledgeBaseServiceImpl } from './knowledge-base.service.impl';
import { NotFoundError, ConflictError } from '../../errors';
import { Prisma } from '@prisma/client';

// ─── Article usage count helpers ───

async function countKeywordUsage(keywordText: string): Promise<number> {
  const prisma = getPrisma();
  return prisma.article.count({
    where: { keywords: { contains: keywordText }, deletedAt: null },
  });
}

async function countPortraitUsage(content: string | null, title: string): Promise<number> {
  const prisma = getPrisma();
  if (!content) {
    return prisma.article.count({ where: { portrait: title, deletedAt: null } });
  }
  if (content === title) {
    return prisma.article.count({ where: { portrait: title, deletedAt: null } });
  }
  const [byContent, byTitle] = await Promise.all([
    prisma.article.count({ where: { portrait: content, deletedAt: null } }),
    prisma.article.count({ where: { portrait: title, deletedAt: null } }),
  ]);
  return byContent + byTitle;
}

async function countImageUsage(imageUrl: string): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM articles
    WHERE deleted_at IS NULL AND images IS NOT NULL
    AND images::jsonb @> to_jsonb(${imageUrl}::text)
  `;
  return Number(result[0]?.count ?? 0);
}

function mapRawKeyword(r: any): KnowledgeKeyword {
  return {
    id: r.id,
    base_id: r.base_id,
    keyword: r.keyword,
    seed_word: r.seed_word ?? null,
    group_id: r.group_id ?? null,
    created_by: r.created_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
  };
}

function mapRawExpandedWord(r: any): KeywordExpandedWord {
  return {
    id: r.id,
    keyword_id: r.keyword_id,
    word: r.word,
    selected: r.selected,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
  };
}

export class KeywordServiceImpl implements IKeywordService {
  private kbService = new KnowledgeBaseServiceImpl();

  async list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { baseId, deletedAt: null };
    if (search) {
      where.keyword = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeKeyword.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeKeyword.count({ where }),
    ]);
    const list = items.map(mapKeyword);
    const counts = await Promise.all(list.map(k => countKeywordUsage(k.keyword)));
    list.forEach((k, i) => { k.article_count = counts[i]; });
    return { list, total };
  }

  async listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }> {
    const prisma = getPrisma();
    const baseIds = await this.kbService.getAccessibleBaseIds(projectId);
    if (baseIds.length === 0) return { list: [], total: 0 };

    const where: any = { baseId: { in: baseIds }, deletedAt: null };
    if (search) {
      where.keyword = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeKeyword.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeKeyword.count({ where }),
    ]);
    const list = items.map(mapKeyword);
    const counts = await Promise.all(list.map(k => countKeywordUsage(k.keyword)));
    list.forEach((k, i) => { k.article_count = counts[i]; });
    return { list, total };
  }

  async getById(id: number): Promise<KnowledgeKeywordDetail> {
    const prisma = getPrisma();
    const rows: any[] = await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE id = ${id} AND deleted_at IS NULL`;
    if (!rows || rows.length === 0) throw new NotFoundError('关键词');
    const keyword = mapRawKeyword(rows[0]) as KnowledgeKeywordDetail;
    keyword.expanded_words = await this.listExpandedWords(id);
    return keyword;
  }

  async create(baseId: number, request: CreateKeywordRequest, userId: number): Promise<KnowledgeKeywordDetail> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeKeyword.create({
      data: { baseId, keyword: request.keyword, createdBy: userId },
    });
    const keyword = mapKeyword(item) as KnowledgeKeywordDetail;
    keyword.expanded_words = [];
    if (request.expanded_words && request.expanded_words.length > 0) {
      keyword.expanded_words = await this.syncExpandedWords(keyword.id, baseId, request.expanded_words, userId);
    }
    return keyword;
  }

  async batchCreate(baseId: number, keywords: string[], userId: number, seedWord?: string): Promise<{ created: number; duplicates: number }> {
    const prisma = getPrisma();
    // Check existing keywords to avoid duplicates
    const existing = await prisma.knowledgeKeyword.findMany({
      where: { baseId, keyword: { in: keywords }, deletedAt: null },
      select: { keyword: true },
    });
    const existingSet = new Set(existing.map((e: any) => e.keyword));
    const newKeywords = keywords.filter(k => !existingSet.has(k));

    if (newKeywords.length > 0) {
      await prisma.knowledgeKeyword.createMany({
        data: newKeywords.map(keyword => ({ baseId, keyword, seedWord: seedWord || null, createdBy: userId })),
      });
    }
    return { created: newKeywords.length, duplicates: existingSet.size };
  }

  async listByGroup(groupId: number): Promise<KnowledgeKeyword[]> {
    return [];
  }

  async syncGroup(groupId: number, baseId: number, keywords: string[], userId: number): Promise<KnowledgeKeyword[]> {
    return [];
  }

  async update(id: number, request: UpdateKeywordRequest): Promise<KnowledgeKeywordDetail> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeKeyword.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('关键词');
    const updated = await prisma.knowledgeKeyword.update({ where: { id }, data: { keyword: request.keyword } });
    const keyword = mapKeyword(updated) as KnowledgeKeywordDetail;
    if (request.expanded_words !== undefined) {
      keyword.expanded_words = await this.syncExpandedWords(id, existing.baseId, request.expanded_words, existing.createdBy ?? 0);
    } else {
      keyword.expanded_words = await this.listExpandedWords(id);
    }
    return keyword;
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeKeyword.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('关键词');
    const usage = await countKeywordUsage(existing.keyword);
    if (usage > 0) throw new ConflictError(`该关键词正在被 ${usage} 篇文章使用，无法删除`);
    await prisma.knowledgeKeyword.delete({ where: { id } });
  }

  async listExpandedWords(keywordId: number): Promise<KeywordExpandedWord[]> {
    const prisma = getPrisma();
    const rows: any[] = await prisma.$queryRaw`SELECT * FROM keyword_expanded_words WHERE keyword_id = ${keywordId} AND deleted_at IS NULL ORDER BY id ASC`;
    return rows.map(mapRawExpandedWord);
  }

  async syncExpandedWords(keywordId: number, _baseId: number, words: { word: string; selected: boolean }[], _userId: number): Promise<KeywordExpandedWord[]> {
    const prisma = getPrisma();
    await prisma.$executeRaw`UPDATE keyword_expanded_words SET deleted_at = NOW() WHERE keyword_id = ${keywordId} AND deleted_at IS NULL`;
    for (const w of words) {
      await prisma.$executeRaw`INSERT INTO keyword_expanded_words (keyword_id, word, selected, created_at, updated_at) VALUES (${keywordId}, ${w.word}, ${w.selected}, NOW(), NOW())`;
    }
    return this.listExpandedWords(keywordId);
  }
}

export class PortraitServiceImpl implements IPortraitService {
  private kbService = new KnowledgeBaseServiceImpl();

  async list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgePortrait[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { baseId, deletedAt: null };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgePortrait.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgePortrait.count({ where }),
    ]);
    const list = items.map(mapPortrait);
    const counts = await Promise.all(list.map(p => countPortraitUsage(p.content, p.title)));
    list.forEach((p, i) => { p.article_count = counts[i]; });
    return { list, total };
  }

  async listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgePortrait[]; total: number }> {
    const prisma = getPrisma();
    const baseIds = await this.kbService.getAccessibleBaseIds(projectId);
    if (baseIds.length === 0) return { list: [], total: 0 };

    const where: any = { baseId: { in: baseIds }, deletedAt: null };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgePortrait.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgePortrait.count({ where }),
    ]);
    const list = items.map(mapPortrait);
    const counts = await Promise.all(list.map(p => countPortraitUsage(p.content, p.title)));
    list.forEach((p, i) => { p.article_count = counts[i]; });
    return { list, total };
  }

  async getById(id: number): Promise<KnowledgePortrait> {
    const prisma = getPrisma();
    const item = await prisma.knowledgePortrait.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('画像');
    return mapPortrait(item);
  }

  async create(baseId: number, request: CreatePortraitRequest, userId: number): Promise<KnowledgePortrait> {
    const prisma = getPrisma();
    const item = await prisma.knowledgePortrait.create({
      data: { baseId, title: request.title, content: request.content || null, createdBy: userId },
    });
    return mapPortrait(item);
  }

  async update(id: number, request: UpdatePortraitRequest): Promise<KnowledgePortrait> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgePortrait.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('画像');
    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.content !== undefined) data.content = request.content;
    const updated = await prisma.knowledgePortrait.update({ where: { id }, data });
    return mapPortrait(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgePortrait.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('画像');
    const usage = await countPortraitUsage(existing.content, existing.title);
    if (usage > 0) throw new ConflictError(`该画像正在被 ${usage} 篇文章使用，无法删除`);
    await prisma.knowledgePortrait.delete({ where: { id } });
  }
}

export class ImageServiceImpl implements IImageService {
  private kbService = new KnowledgeBaseServiceImpl();

  async list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeImage[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { baseId, deletedAt: null };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeImage.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeImage.count({ where }),
    ]);
    const list = items.map(mapKnowledgeImage);
    const counts = await Promise.all(list.map(img => countImageUsage(img.image_url)));
    list.forEach((img, i) => { img.article_count = counts[i]; });
    return { list, total };
  }

  async listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeImage[]; total: number }> {
    const prisma = getPrisma();
    const baseIds = await this.kbService.getAccessibleBaseIds(projectId);
    if (baseIds.length === 0) return { list: [], total: 0 };

    const where: any = { baseId: { in: baseIds }, deletedAt: null };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeImage.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeImage.count({ where }),
    ]);
    const list = items.map(mapKnowledgeImage);
    const counts = await Promise.all(list.map(img => countImageUsage(img.image_url)));
    list.forEach((img, i) => { img.article_count = counts[i]; });
    return { list, total };
  }

  async getById(id: number): Promise<KnowledgeImage> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeImage.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('图片');
    return mapKnowledgeImage(item);
  }

  async create(baseId: number, request: CreateImageRequest, userId: number): Promise<KnowledgeImage> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeImage.create({
      data: { baseId, title: request.title, description: request.description || null, imageUrl: request.image_url, createdBy: userId },
    });
    return mapKnowledgeImage(item);
  }

  async update(id: number, request: UpdateImageRequest): Promise<KnowledgeImage> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeImage.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('图片');
    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.description !== undefined) data.description = request.description;
    const updated = await prisma.knowledgeImage.update({ where: { id }, data });
    return mapKnowledgeImage(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeImage.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('图片');
    const usage = await countImageUsage(existing.imageUrl);
    if (usage > 0) throw new ConflictError(`该图片正在被 ${usage} 篇文章使用，无法删除`);
    await prisma.knowledgeImage.delete({ where: { id } });
  }

  async checkDuplicate(baseId: number, title: string, imageUrl: string): Promise<void> {
    const prisma = getPrisma();
    const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
    if (dupTitle) throw new ConflictError('该知识库已存在相同标题的图片');
    const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl, deletedAt: null } });
    if (dupUrl) throw new ConflictError('该知识库已存在相同的图片');
  }

  async checkDuplicateTitle(baseId: number, title: string, excludeId: number): Promise<void> {
    const prisma = getPrisma();
    const dup = await prisma.knowledgeImage.findFirst({ where: { baseId, title, id: { not: excludeId }, deletedAt: null } });
    if (dup) throw new ConflictError('该知识库已存在相同标题的图片');
  }
}

export class DocumentServiceImpl implements IDocumentService {
  private kbService = new KnowledgeBaseServiceImpl();

  async list(baseId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeDocument[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { baseId };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeDocument.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeDocument.count({ where }),
    ]);
    return { list: items.map(mapKnowledgeDocument), total };
  }

  async listByProject(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeDocument[]; total: number }> {
    const prisma = getPrisma();
    const baseIds = await this.kbService.getAccessibleBaseIds(projectId);
    if (baseIds.length === 0) return { list: [], total: 0 };

    const where: any = { baseId: { in: baseIds }, deletedAt: null };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeDocument.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeDocument.count({ where }),
    ]);
    return { list: items.map(mapKnowledgeDocument), total };
  }

  async getById(id: number): Promise<KnowledgeDocument> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeDocument.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('文档');
    return mapKnowledgeDocument(item);
  }

  async create(baseId: number, request: CreateDocumentRequest, userId: number): Promise<KnowledgeDocument> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeDocument.create({
      data: {
        baseId,
        title: request.title,
        description: request.description || null,
        fileUrl: request.file_url,
        fileName: request.file_name,
        fileType: request.file_type,
        fileSize: request.file_size,
        createdBy: userId,
      },
    });
    return mapKnowledgeDocument(item);
  }

  async update(id: number, request: UpdateDocumentRequest): Promise<KnowledgeDocument> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeDocument.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('文档');
    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.description !== undefined) data.description = request.description;
    const updated = await prisma.knowledgeDocument.update({ where: { id }, data });
    return mapKnowledgeDocument(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    await prisma.knowledgeDocument.delete({ where: { id } }).catch(() => {});
  }

  async checkDuplicate(baseId: number, title: string, fileUrl: string): Promise<void> {
    const prisma = getPrisma();
    const dupTitle = await prisma.knowledgeDocument.findFirst({ where: { baseId, title, deletedAt: null } });
    if (dupTitle) throw new ConflictError('该知识库已存在相同标题的文档');
    const dupUrl = await prisma.knowledgeDocument.findFirst({ where: { baseId, fileUrl, deletedAt: null } });
    if (dupUrl) throw new ConflictError('该知识库已存在相同的文档');
  }

  async checkDuplicateTitle(baseId: number, title: string, excludeId: number): Promise<void> {
    const prisma = getPrisma();
    const dup = await prisma.knowledgeDocument.findFirst({ where: { baseId, title, id: { not: excludeId }, deletedAt: null } });
    if (dup) throw new ConflictError('该知识库已存在相同标题的文档');
  }
}

export class MinedKeywordServiceImpl implements IMinedKeywordService {
  async listByBase(baseId: number): Promise<MinedKeyword[]> {
    const prisma = getPrisma();
    const items = await prisma.minedKeyword.findMany({
      where: { baseId, deletedAt: null },
      orderBy: { id: 'desc' },
    });
    return items.map(mapMinedKeyword);
  }

  async addMinedKeywords(baseId: number, keywords: string[], userId: number, sourceType: string): Promise<{ added: number; duplicates: number }> {
    const prisma = getPrisma();
    const existing = await prisma.minedKeyword.findMany({
      where: { baseId, keyword: { in: keywords }, deletedAt: null },
      select: { keyword: true },
    });
    const existingSet = new Set(existing.map((e: any) => e.keyword));
    const newKeywords = keywords.filter(k => !existingSet.has(k));

    if (newKeywords.length > 0) {
      await prisma.minedKeyword.createMany({
        data: newKeywords.map(keyword => ({ baseId, keyword, sourceType, createdBy: userId })),
        skipDuplicates: true,
      });
    }
    return { added: newKeywords.length, duplicates: existingSet.size };
  }

  async toggleSelectBatch(baseId: number, ids: number[], selected: boolean): Promise<void> {
    const prisma = getPrisma();
    await prisma.minedKeyword.updateMany({
      where: { id: { in: ids }, baseId, deletedAt: null },
      data: { selected },
    });
  }

  async deleteByIds(baseId: number, ids: number[]): Promise<void> {
    const prisma = getPrisma();
    await prisma.minedKeyword.updateMany({
      where: { id: { in: ids }, baseId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async clearAll(baseId: number): Promise<void> {
    const prisma = getPrisma();
    await prisma.minedKeyword.updateMany({ where: { baseId, deletedAt: null }, data: { deletedAt: new Date() } });
  }

  async aggregateContent(baseId: number, sourceType: string): Promise<string> {
    const prisma = getPrisma();
    const contentParts: string[] = [];

    if (sourceType === 'all' || sourceType === 'document') {
      const docs = await prisma.knowledgeDocument.findMany({ where: { baseId, deletedAt: null } });
      contentParts.push(...docs.map((d: any) => `[文档] 标题: ${d.title}${d.description ? ', 描述: ' + d.description : ''}`));
    }
    if (sourceType === 'all' || sourceType === 'portrait') {
      const pts = await prisma.knowledgePortrait.findMany({ where: { baseId, deletedAt: null } });
      contentParts.push(...pts.map((p: any) => `[画像] 标题: ${p.title}${p.content ? ', 内容: ' + p.content : ''}`));
    }
    if (sourceType === 'all' || sourceType === 'image') {
      const imgs = await prisma.knowledgeImage.findMany({ where: { baseId, deletedAt: null } });
      contentParts.push(...imgs.map((i: any) => `[图片] 标题: ${i.title}${i.description ? ', 描述: ' + i.description : ''}`));
    }

    return contentParts.join('\n').substring(0, 8000);
  }

  async saveAndRemove(
    baseId: number,
    keywords: string[],
    userId: number,
    keywordService: IKeywordService,
  ): Promise<{ created: number; duplicates: number }> {
    const prisma = getPrisma();
    return prisma.$transaction(async () => {
      const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');
      await prisma.minedKeyword.updateMany({
        where: { baseId, keyword: { in: keywords }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return result;
    });
  }
}
