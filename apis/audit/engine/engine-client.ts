/**
 * 引擎客户端 — 直接使用 LlmModel 表中所有启用的模型
 *
 * 设计原则：
 *   - 配置完全由 LlmModel 表驱动（系统管理 → 模型管理 维护）
 *   - 不做 provider 归一化，不限制引擎种类
 *   - 每个启用的 LlmModel 都是一个独立的"引擎实例"参与诊断
 *   - 引擎唯一标识 = `${provider}:${modelName}`，天然唯一且人类可读
 */

import { getPrisma } from '../../utils/db.util';
import { decryptApiKey, isEncrypted } from '../../utils/encryption.util';

export interface EngineModelConfig {
  /** LlmModel 主键 */
  id: number;
  /** 原始 provider 名（中文/英文都允许） */
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

/**
 * 引擎实例的唯一标识（写入 AuditPrompt.engine 列）。
 *
 * 选择 `${provider}:${modelName}` 而非 llmModelId 数字字符串，原因：
 *   1. 人类可读（诊断报告 / Skill ZIP 直接展示）
 *   2. 天然唯一（同 provider 不同 modelName 也能区分）
 *   3. 不依赖外部 id 映射表，聚合层零额外查询
 */
export function engineKey(cfg: Pick<EngineModelConfig, 'provider' | 'modelName'>): string {
  return `${cfg.provider}:${cfg.modelName}`;
}

/**
 * 加载所有启用的模型配置，按 LlmModel.id 索引。
 *
 * 不做任何 provider 过滤 —— 只要 status=true 且未软删除，全部纳入诊断。
 */
export async function loadEnabledEngines(): Promise<Map<number, EngineModelConfig>> {
  const rows = await getPrisma().llmModel.findMany({
    where: { status: true, deletedAt: null },
    select: { id: true, provider: true, baseUrl: true, apiKey: true, modelName: true },
    orderBy: { id: 'asc' },
  });

  const map = new Map<number, EngineModelConfig>();
  for (const row of rows) {
    // LlmModel 表中 apiKey 为 AES-256-GCM 加密存储（见 llm-model.service.impl.ts），
    // 调用 LLM 前必须解密；同时兼容历史明文数据。
    const apiKey = isEncrypted(row.apiKey) ? decryptApiKey(row.apiKey) : row.apiKey;
    map.set(row.id, {
      id: row.id,
      provider: row.provider,
      baseUrl: row.baseUrl,
      apiKey,
      modelName: row.modelName,
    });
  }
  return map;
}

/** 将 base URL 规范化为完整的 /chat/completions 端点 */
function toChatCompletionsURL(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

export interface QueryResult {
  text: string;
  latencyMs: number;
  error: string | null;
}

/**
 * 调用单个引擎回答单个提示词 — OpenAI 兼容 /chat/completions 协议
 *
 * 失败时返回空字符串而非抛错，便于聚合层无差别处理。
 */
export async function queryEngine(
  cfg: EngineModelConfig,
  prompt: string,
  timeoutMs = 60000,
): Promise<QueryResult> {
  const start = Date.now();
  const url = toChatCompletionsURL(cfg.baseUrl);
  const body = {
    model: cfg.modelName,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.7,
    stream: false,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        text: '',
        latencyMs: Date.now() - start,
        error: `HTTP ${res.status}: ${errText.slice(0, 300)}`,
      };
    }

    const data: any = await res.json();
    if (data?.error) {
      const errMsg = typeof data.error === 'string' ? data.error : data.error.message;
      return {
        text: '',
        latencyMs: Date.now() - start,
        error: `API error: ${errMsg || JSON.stringify(data.error).slice(0, 300)}`,
      };
    }

    const text = data?.choices?.[0]?.message?.content || '';
    return { text, latencyMs: Date.now() - start, error: null };
  } catch (err: any) {
    return {
      text: '',
      latencyMs: Date.now() - start,
      error: err?.name === 'AbortError'
        ? `Timeout after ${timeoutMs}ms`
        : (err?.message || String(err)).slice(0, 300),
    };
  }
}
