import { z } from 'zod';

export const createLlmModelSchema = z.object({
  provider: z.string({ error: '供应商不能为空' }).min(1, '供应商不能为空').max(100, '供应商不能超过100个字符').trim(),
  base_url: z.string({ error: 'Base URL不能为空' }).min(1, 'Base URL不能为空').max(2048, 'Base URL不能超过2048个字符').trim(),
  api_key: z.string({ error: 'API Key不能为空' }).min(1, 'API Key不能为空').max(512, 'API Key不能超过512个字符').trim(),
  model_name: z.string({ error: '模型名称不能为空' }).min(1, '模型名称不能为空').max(200, '模型名称不能超过200个字符').trim(),
}).strict();

export const updateLlmModelSchema = z.object({
  provider: z.string().min(1, '供应商不能为空').max(100, '供应商不能超过100个字符').trim().optional(),
  base_url: z.string().min(1, 'Base URL不能为空').max(2048, 'Base URL不能超过2048个字符').trim().optional(),
  api_key: z.string().min(1, 'API Key不能为空').max(512, 'API Key不能超过512个字符').trim().optional(),
  model_name: z.string().min(1, '模型名称不能为空').max(200, '模型名称不能超过200个字符').trim().optional(),
  status: z.boolean().optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: '至少提供一个更新字段',
});
