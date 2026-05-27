import { Request, Response } from 'express';
import { createLlmModelService } from '../service';
import { AppError } from '../errors';
import { success, fail, created } from '../utils';
import { logger } from '../utils/logger.util';
import { getClientIp } from '../utils/ip.util';

const llmModelService = createLlmModelService();

function handleError(res: Response, err: unknown, defaultMsg: string, context?: Record<string, unknown>): void {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    const message = err instanceof Error ? err.message : '未知错误';
    logger.error(defaultMsg, { ...context, error: message });
    fail(res, 500, defaultMsg);
  }
}

// === 审计日志 ===

function auditLog(req: Request, action: string, details?: Record<string, unknown>): void {
  logger.info(`[AUDIT] ${action}`, {
    userId: (req as any).user?.userId ?? 0,
    username: (req as any).user?.username ?? 'unknown',
    resourceType: 'llm-model',
    ip: getClientIp(req) ?? 'unknown',
    ...details,
  });
}

// === 工具函数 ===

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return (!isNaN(id) && id > 0 && String(id) === raw.trim()) ? id : null;
}

const MAX_FIELD_LENGTH = { provider: 100, base_url: 2048, api_key: 512, model_name: 200 };

const BLOCKED_HOSTNAMES = [
  /^127\./,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/,
  /^\[?fc00:/,
  /^\[?fd/,
];

function isUrlSafe(baseUrl: string): { safe: boolean; error?: string } {
  try {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, error: 'Base URL 必须以 http:// 或 https:// 开头' };
    }
    const host = url.hostname.toLowerCase();
    if (host === 'localhost') return { safe: false, error: '不允许使用 localhost' };
    for (const pattern of BLOCKED_HOSTNAMES) {
      if (pattern.test(host)) return { safe: false, error: '不允许使用内网或本地地址' };
    }
    return { safe: true };
  } catch {
    return { safe: false, error: 'Base URL 格式不合法' };
  }
}

function validateRequiredString(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value === undefined || value === null) return `${fieldName}不能为空`;
  if (typeof value !== 'string') return `${fieldName}必须为字符串类型`;
  if (!value.trim()) return `${fieldName}不能为空`;
  if (value.length > maxLength) return `${fieldName}长度不能超过${maxLength}个字符`;
  return null;
}

function validateOptionalString(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') return `${fieldName}必须为字符串类型`;
  if (!value.trim()) return `${fieldName}不能为空`;
  if (value.length > maxLength) return `${fieldName}长度不能超过${maxLength}个字符`;
  return null;
}

// === Handler 函数 ===

export async function listLlmModels(_req: Request, res: Response): Promise<void> {
  try {
    const items = await llmModelService.list();
    success(res, items);
  } catch (err: unknown) {
    handleError(res, err, '获取LLM模型列表失败');
  }
}

export async function listEnabledLlmModels(_req: Request, res: Response): Promise<void> {
  try {
    const items = await llmModelService.listEnabled();
    success(res, items);
  } catch (err: unknown) {
    handleError(res, err, '获取启用的LLM模型列表失败');
  }
}

export async function getLlmModel(req: Request, res: Response): Promise<void> {
  try {
    const id = parseId(req.params.id as string);
    if (!id) { fail(res, 400, '无效的模型ID'); return; }

    const item = await llmModelService.getById(id);
    success(res, item);
  } catch (err: unknown) {
    handleError(res, err, '获取LLM模型详情失败', { id: req.params.id });
  }
}

export async function createLlmModel(req: Request, res: Response): Promise<void> {
  const { provider, base_url, api_key, model_name } = req.body;
  try {
    const errors = [
      validateRequiredString(provider, '供应商', MAX_FIELD_LENGTH.provider),
      validateRequiredString(base_url, 'Base URL', MAX_FIELD_LENGTH.base_url),
      validateRequiredString(api_key, 'API Key', MAX_FIELD_LENGTH.api_key),
      validateRequiredString(model_name, '模型名称', MAX_FIELD_LENGTH.model_name),
    ].filter((e): e is string => e !== null);

    if (errors.length > 0) { fail(res, 400, errors[0]); return; }

    const urlResult = isUrlSafe(base_url);
    if (!urlResult.safe) { fail(res, 400, urlResult.error!); return; }

    const item = await llmModelService.create({ provider, base_url, api_key, model_name });
    auditLog(req, 'create_llm_model', { id: item.id, provider, model_name });
    created(res, item, '创建LLM模型成功');
  } catch (err: unknown) {
    handleError(res, err, '创建LLM模型失败', { provider, model_name });
  }
}

export async function updateLlmModel(req: Request, res: Response): Promise<void> {
  const rawId = req.params.id as string;
  try {
    const id = parseId(rawId);
    if (!id) { fail(res, 400, '无效的模型ID'); return; }

    const { provider, base_url, api_key, model_name, status } = req.body;

    if ([provider, base_url, api_key, model_name, status].every(v => v === undefined)) {
      fail(res, 400, '至少提供一个更新字段'); return;
    }

    if (provider !== undefined) {
      const err = validateOptionalString(provider, '供应商', MAX_FIELD_LENGTH.provider);
      if (err) { fail(res, 400, err); return; }
    }
    if (base_url !== undefined) {
      const err = validateOptionalString(base_url, 'Base URL', MAX_FIELD_LENGTH.base_url);
      if (err) { fail(res, 400, err); return; }
      const urlResult = isUrlSafe(base_url);
      if (!urlResult.safe) { fail(res, 400, urlResult.error!); return; }
    }
    if (api_key !== undefined) {
      const err = validateOptionalString(api_key, 'API Key', MAX_FIELD_LENGTH.api_key);
      if (err) { fail(res, 400, err); return; }
    }
    if (model_name !== undefined) {
      const err = validateOptionalString(model_name, '模型名称', MAX_FIELD_LENGTH.model_name);
      if (err) { fail(res, 400, err); return; }
    }
    if (status !== undefined && typeof status !== 'boolean') {
      fail(res, 400, 'status 必须为布尔值'); return;
    }

    const item = await llmModelService.update(id, { provider, base_url, api_key, model_name, status });
    const updatedFields = Object.keys(req.body).filter(k =>
      ['provider', 'base_url', 'api_key', 'model_name', 'status'].includes(k)
    );
    auditLog(req, 'update_llm_model', { id, updatedFields });
    success(res, item, '更新LLM模型成功');
  } catch (err: unknown) {
    handleError(res, err, '更新LLM模型失败', { id: rawId });
  }
}

export async function deleteLlmModel(req: Request, res: Response): Promise<void> {
  const rawId = req.params.id as string;
  try {
    const id = parseId(rawId);
    if (!id) { fail(res, 400, '无效的模型ID'); return; }

    await llmModelService.delete(id);
    auditLog(req, 'delete_llm_model', { id });
    success(res, null, '删除LLM模型成功');
  } catch (err: unknown) {
    handleError(res, err, '删除LLM模型失败', { id: rawId });
  }
}
