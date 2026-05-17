import { getPrisma } from '../../utils';
import { KnowledgeKeyword, KnowledgePortrait, KnowledgeImage, CreateKeywordRequest, UpdateKeywordRequest, CreatePortraitRequest, UpdatePortraitRequest, CreateImageRequest, UpdateImageRequest } from '../../entity';
import { mapKeyword, mapPortrait, mapKnowledgeImage } from '../../map';
import { IKeywordService, IPortraitService, IImageService } from '../knowledge.service';

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
    const item = await prisma.knowledgeKeyword.findFirst({ where: { id } });
    if (!item) throw new Error('关键词不存在');
    return mapKeyword(item);
  }

  async create(projectId: number, request: CreateKeywordRequest, userId: number): Promise<KnowledgeKeyword> {
    const prisma = getPrisma();
    const item = await prisma.knowledgeKeyword.create({
      data: { projectId, keyword: request.keyword, createdBy: userId },
    });
    return mapKeyword(item);
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
