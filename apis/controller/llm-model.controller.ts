import { Request, Response } from 'express';
import { LlmModelServiceImpl } from '../service/impl/llm-model.service.impl';
import { success, fail } from '../utils';

const llmModelService = new LlmModelServiceImpl();

export async function listLlmModels(_req: Request, res: Response): Promise<void> {
  try {
    const items = await llmModelService.list();
    success(res, items);
  } catch (err: any) {
    fail(res, 500, err.message || '获取LLM模型列表失败');
  }
}

export async function listEnabledLlmModels(_req: Request, res: Response): Promise<void> {
  try {
    const items = await llmModelService.listEnabled();
    success(res, items);
  } catch (err: any) {
    fail(res, 500, err.message || '获取启用的LLM模型列表失败');
  }
}

export async function getLlmModel(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的模型ID'); return; }

    const item = await llmModelService.getById(id);
    success(res, item);
  } catch (err: any) {
    if (err.message === 'LLM模型不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取LLM模型详情失败');
    }
  }
}

export async function createLlmModel(req: Request, res: Response): Promise<void> {
  try {
    const { provider, base_url, api_key, model_name } = req.body;
    if (!provider || !base_url || !api_key || !model_name) {
      fail(res, 400, '供应商、Base URL、API Key、模型名称不能为空');
      return;
    }

    const item = await llmModelService.create(req.body);
    res.status(201).json({ code: 0, message: '创建LLM模型成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建LLM模型失败');
  }
}

export async function updateLlmModel(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的模型ID'); return; }

    const item = await llmModelService.update(id, req.body);
    success(res, item, '更新LLM模型成功');
  } catch (err: any) {
    if (err.message === 'LLM模型不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新LLM模型失败');
    }
  }
}

export async function deleteLlmModel(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的模型ID'); return; }

    await llmModelService.delete(id);
    success(res, null, '删除LLM模型成功');
  } catch (err: any) {
    if (err.message === 'LLM模型不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '删除LLM模型失败');
    }
  }
}
