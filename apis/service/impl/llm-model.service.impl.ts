import { getPrisma } from '../../utils';
import { LlmModel, CreateLlmModelRequest, UpdateLlmModelRequest } from '../../entity';
import { mapLlmModel } from '../../map';
import { ILlmModelService } from '../llm-model.service';
import { NotFoundError, ConflictError } from '../../errors';
import { encryptApiKey } from '../../utils/encryption.util';

export class LlmModelServiceImpl implements ILlmModelService {
  async list(): Promise<LlmModel[]> {
    const prisma = getPrisma();
    const items = await prisma.llmModel.findMany({ orderBy: { id: 'asc' } });
    return items.map(mapLlmModel);
  }

  async listEnabled(): Promise<Pick<LlmModel, 'id' | 'provider' | 'model_name'>[]> {
    const prisma = getPrisma();
    const items = await prisma.llmModel.findMany({
      where: { status: true },
      orderBy: { id: 'asc' },
      select: { id: true, provider: true, modelName: true },
    });
    return items.map((item: any) => ({ id: item.id, provider: item.provider, model_name: item.modelName }));
  }

  async getById(id: number): Promise<LlmModel> {
    const prisma = getPrisma();
    const item = await prisma.llmModel.findFirst({ where: { id } });
    if (!item) throw new NotFoundError('LLM模型');
    return mapLlmModel(item);
  }

  async create(request: CreateLlmModelRequest): Promise<LlmModel> {
    const prisma = getPrisma();
    const item = await prisma.llmModel.create({
      data: {
        provider: request.provider,
        baseUrl: request.base_url,
        apiKey: encryptApiKey(request.api_key),
        modelName: request.model_name,
      },
    });
    return mapLlmModel(item);
  }

  async update(id: number, request: UpdateLlmModelRequest): Promise<LlmModel> {
    const prisma = getPrisma();
    const existing = await prisma.llmModel.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('LLM模型');

    const data: any = {};
    if (request.provider !== undefined) data.provider = request.provider;
    if (request.base_url !== undefined) data.baseUrl = request.base_url;
    if (request.api_key !== undefined) data.apiKey = encryptApiKey(request.api_key);
    if (request.model_name !== undefined) data.modelName = request.model_name;
    if (request.status !== undefined) data.status = request.status;

    const updated = await prisma.llmModel.update({ where: { id }, data });
    return mapLlmModel(updated);
  }

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.llmModel.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('LLM模型');

    const articlesUsingModel = await prisma.article.count({
      where: { llmModelId: id },
    });
    if (articlesUsingModel > 0) {
      throw new ConflictError(`该模型正被 ${articlesUsingModel} 篇文章引用，无法删除`);
    }

    await prisma.llmModel.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        apiKey: '[DELETED]',
      },
    });
  }
}
