import { getPrisma } from '../../utils';
import { KnowledgeKeyword, KnowledgePortrait, KnowledgeImage, CreateKeywordRequest, UpdateKeywordRequest, CreatePortraitRequest, UpdatePortraitRequest, CreateImageRequest, UpdateImageRequest } from '../../entity';
import { mapKeyword, mapPortrait, mapKnowledgeImage } from '../../map';
import { IKeywordService, IPortraitService, IImageService } from '../knowledge.service';

function mapRawKeyword(r: any): KnowledgeKeyword {
  return {
    id: r.id,
    project_id: r.project_id,
    keyword: r.keyword,
    group_id: r.group_id ?? null,
    created_by: r.created_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export class KeywordServiceImpl implements IKeywordService {
  async list(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeKeyword[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { projectId };
    if (search) {
      where.keyword = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeKeyword.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeKeyword.count({ where }),
    ]);
    return { list: items.map(mapKeyword), total };
  }

  async getById(id: number): Promise<KnowledgeKeyword> {
    const prisma = getPrisma();
    const rows: any[] = await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE id = ${id}`;
    if (!rows || rows.length === 0) throw new Error('关键词不存在');
    return mapRawKeyword(rows[0]);
  }

  async create(projectId: number, request: CreateKeywordRequest, userId: number): Promise<KnowledgeKeyword> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeKeyword.create({
      data: { projectId, keyword: request.keyword, createdBy: userId },
    });
    return mapKeyword(item);
  }

  async batchCreate(projectId: number, keywords: string[], userId: number, groupId: number): Promise<KnowledgeKeyword[]> {
    const prisma = getPrisma();
    for (const keyword of keywords) {
      await prisma.$executeRaw`INSERT INTO knowledge_keywords (project_id, keyword, group_id, created_by, created_at, updated_at) VALUES (${projectId}, ${keyword}, ${groupId}, ${userId}, NOW(), NOW())`;
    }
    const rows: any[] = await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE group_id = ${groupId} ORDER BY id ASC`;
    return rows.map(mapRawKeyword);
  }

  async listByGroup(groupId: number): Promise<KnowledgeKeyword[]> {
    const prisma = getPrisma();
    const rows: any[] = await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE group_id = ${groupId} ORDER BY id ASC`;
    return rows.map(mapRawKeyword);
  }

  async syncGroup(groupId: number, projectId: number, keywords: string[], userId: number): Promise<KnowledgeKeyword[]> {
    const prisma = getPrisma();
    // Delete all existing keywords in the group
    await prisma.$executeRaw`DELETE FROM knowledge_keywords WHERE group_id = ${groupId}`;
    // Re-create all selected keywords
    for (const keyword of keywords) {
      await prisma.$executeRaw`INSERT INTO knowledge_keywords (project_id, keyword, group_id, created_by, created_at, updated_at) VALUES (${projectId}, ${keyword}, ${groupId}, ${userId}, NOW(), NOW())`;
    }
    const rows: any[] = await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE group_id = ${groupId} ORDER BY id ASC`;
    return rows.map(mapRawKeyword);
  }

  async update(id: number, request: UpdateKeywordRequest): Promise<KnowledgeKeyword> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeKeyword.findFirst({ where: { id } });
    if (!existing) throw new Error('关键词不存在');
    const updated = await prisma.knowledgeKeyword.update({ where: { id }, data: { keyword: request.keyword } });
    return mapKeyword(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeKeyword.findFirst({ where: { id } });
    if (!existing) throw new Error('关键词不存在');
    await prisma.knowledgeKeyword.delete({ where: { id } });
  }
}

export class PortraitServiceImpl implements IPortraitService {
  async list(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgePortrait[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { projectId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgePortrait.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgePortrait.count({ where }),
    ]);
    return { list: items.map(mapPortrait), total };
  }

  async getById(id: number): Promise<KnowledgePortrait> {
    const prisma = getPrisma();
    const item = await prisma.knowledgePortrait.findFirst({ where: { id } });
    if (!item) throw new Error('画像不存在');
    return mapPortrait(item);
  }

  async create(projectId: number, request: CreatePortraitRequest, userId: number): Promise<KnowledgePortrait> {
    const prisma = getPrisma();
    const item = await prisma.knowledgePortrait.create({
      data: { projectId, title: request.title, content: request.content || null, createdBy: userId },
    });
    return mapPortrait(item);
  }

  async update(id: number, request: UpdatePortraitRequest): Promise<KnowledgePortrait> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgePortrait.findFirst({ where: { id } });
    if (!existing) throw new Error('画像不存在');
    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.content !== undefined) data.content = request.content;
    const updated = await prisma.knowledgePortrait.update({ where: { id }, data });
    return mapPortrait(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgePortrait.findFirst({ where: { id } });
    if (!existing) throw new Error('画像不存在');
    await prisma.knowledgePortrait.delete({ where: { id } });
  }
}

export class ImageServiceImpl implements IImageService {
  async list(projectId: number, page: number, pageSize: number, search?: string): Promise<{ list: KnowledgeImage[]; total: number }> {
    const prisma = getPrisma();
    const where: any = { projectId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.knowledgeImage.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.knowledgeImage.count({ where }),
    ]);
    return { list: items.map(mapKnowledgeImage), total };
  }

  async getById(id: number): Promise<KnowledgeImage> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeImage.findFirst({ where: { id } });
    if (!item) throw new Error('图片不存在');
    return mapKnowledgeImage(item);
  }

  async create(projectId: number, request: CreateImageRequest, userId: number): Promise<KnowledgeImage> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeImage.create({
      data: { projectId, title: request.title, description: request.description || null, imageUrl: request.image_url, createdBy: userId },
    });
    return mapKnowledgeImage(item);
  }

  async update(id: number, request: UpdateImageRequest): Promise<KnowledgeImage> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeImage.findFirst({ where: { id } });
    if (!existing) throw new Error('图片不存在');
    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.description !== undefined) data.description = request.description;
    const updated = await prisma.knowledgeImage.update({ where: { id }, data });
    return mapKnowledgeImage(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.knowledgeImage.findFirst({ where: { id } });
    if (!existing) throw new Error('图片不存在');
    await prisma.knowledgeImage.delete({ where: { id } });
  }
}
