import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getPrisma } from './db.util';
import { decryptApiKey, isEncrypted } from './encryption.util';

export type CitationPlatform = string;

export interface CitationSource {
  url: string;
  title?: string | null;
  answer_snippet?: string | null;
  citation_snippet?: string | null;
  source_index?: number | null;
  raw_source?: unknown;
}

export interface CitationCollectResult {
  platform: CitationPlatform;
  model_name: string;
  prompt: string;
  answer: string;
  sources: CitationSource[];
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

export interface CitationModelConfig {
  id?: number;
  provider: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  key: string;
}

const DEFAULT_PLATFORMS: CitationPlatform[] = ['DeepSeek', '豆包', '元宝', '千问', 'Kimi'];
const GEO_MONITOR_CONFIG = path.join('geo-monitorv12', 'GEO', 'geo_monitor_v8_package 2', 'config.py');

const fallbackVarMap: Record<CitationPlatform, { key: string; url: string; model: string }> = {
  DeepSeek: { key: 'DEEPSEEK_API_KEY', url: 'DEEPSEEK_URL', model: 'DEEPSEEK_MODEL' },
  豆包: { key: 'DOUBAO_API_KEY', url: 'DOUBAO_URL', model: 'DOUBAO_MODEL' },
  元宝: { key: 'YUANBAO_API_KEY', url: 'YUANBAO_URL', model: 'YUANBAO_MODEL' },
  千问: { key: 'QIANWEN_API_KEY', url: 'QIANWEN_URL', model: 'QIANWEN_MODEL' },
  Kimi: { key: 'MOONSHOT_API_KEY', url: 'MOONSHOT_URL', model: 'MOONSHOT_MODEL' },
};

const providerAliases: Record<CitationPlatform, string[]> = {
  DeepSeek: ['deepseek', 'deep seek', '深度求索'],
  豆包: ['doubao', '豆包', 'volc', 'ark'],
  元宝: ['yuanbao', '元宝', 'hunyuan', '腾讯'],
  千问: ['qianwen', '千问', 'qwen', 'dashscope', '通义'],
  Kimi: ['kimi', 'moonshot', '月之暗面'],
};

function safeDecryptApiKey(value: string): string {
  if (!value) return '';
  if (!isEncrypted(value)) return value.trim();
  try {
    return decryptApiKey(value).trim();
  } catch {
    return '';
  }
}

function readGeoMonitorConfig(): Record<string, string> {
  const configPath = path.resolve(process.cwd(), GEO_MONITOR_CONFIG);
  if (!fs.existsSync(configPath)) return {};
  const content = fs.readFileSync(configPath, 'utf8');
  const values: Record<string, string> = {};
  const pattern = /^([A-Z0-9_]+)\s*=\s*["']([^"']*)["']/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    values[match[1]] = match[2];
  }
  return values;
}

function citationModelKey(provider: string, modelName: string): string {
  return `${provider}:${modelName}`;
}

function filterMatchesModel(filter: string, model: CitationModelConfig): boolean {
  const normalized = filter.trim().toLowerCase();
  return [model.provider, model.modelName, model.key].some((value) => value.toLowerCase() === normalized);
}

export function normalizeChatCompletionsUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

export async function loadEnabledCitationModels(filters?: string[]): Promise<CitationModelConfig[]> {
  const rows = await getPrisma().llmModel.findMany({
    where: { status: true, deletedAt: null },
    select: { id: true, provider: true, baseUrl: true, apiKey: true, modelName: true, status: true, deletedAt: true },
    orderBy: { id: 'asc' },
  });
  const requestedFilters = (filters || []).map((item) => item.trim()).filter(Boolean);

  return rows
    .filter((row: any) => row.status === true && !row.deletedAt)
    .map((row: any) => {
      const apiKey = safeDecryptApiKey(row.apiKey || '');
      const provider = String(row.provider || '').trim();
      const modelName = String(row.modelName || '').trim();
      const baseUrl = String(row.baseUrl || '').trim();
      return {
        id: row.id,
        provider,
        modelName,
        baseUrl,
        apiKey,
        key: citationModelKey(provider, modelName),
      };
    })
    .filter((model) => Boolean(model.provider && model.modelName && model.baseUrl && model.apiKey))
    .filter((model) => requestedFilters.length === 0 || requestedFilters.some((filter) => filterMatchesModel(filter, model)));
}

async function resolveProviderConfig(platform: CitationPlatform): Promise<CitationModelConfig | null> {
  const enabledModels = await loadEnabledCitationModels([platform]);
  if (enabledModels.length > 0) return enabledModels[0];

  const aliases = (providerAliases[platform] || [platform]).map((item) => item.toLowerCase());
  const models = await getPrisma().llmModel.findMany({
    where: { status: true, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
  const model = models.find((item: any) => {
    const haystack = `${item.provider || ''} ${item.modelName || ''} ${item.baseUrl || ''}`.toLowerCase();
    return aliases.some((alias) => haystack.includes(alias));
  });
  if (model) {
    const apiKey = safeDecryptApiKey(model.apiKey);
    if (apiKey && model.baseUrl && model.modelName) {
      const provider = model.provider || platform;
      const modelName = model.modelName;
      return { apiKey, baseUrl: model.baseUrl, modelName, provider, key: citationModelKey(provider, modelName) };
    }
  }

  const fallback = readGeoMonitorConfig();
  const map = fallbackVarMap[platform];
  if (!map) return null;
  const apiKey = fallback[map.key]?.trim();
  const baseUrl = fallback[map.url]?.trim();
  const modelName = fallback[map.model]?.trim();
  if (!apiKey || !baseUrl || !modelName) return null;
  return { apiKey, baseUrl, modelName, provider: platform, key: citationModelKey(platform, modelName) };
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function responsesText(responseData: any): string {
  if (Array.isArray(responseData?.output)) {
    const parts: string[] = [];
    for (const item of responseData.output) {
      if (item?.type !== 'message') continue;
      for (const content of item.content || []) {
        if (content?.type === 'output_text' && content.text) parts.push(content.text);
      }
    }
    return parts.join('\n');
  }
  return '';
}

function extractAnswer(responseData: any): string {
  return (
    responseData?.output?.choices?.[0]?.message?.content ||
    responseData?.choices?.[0]?.message?.content ||
    responsesText(responseData) ||
    ''
  );
}

function cleanText(value: unknown, maxLength = 5000): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/[)\]}>"'，。；、]+$/u, '');
  return /^https?:\/\//i.test(text) ? text : null;
}

function toSourceIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function collectUrlsDeep(value: unknown, urls: Set<string>): void {
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>，。；、)）\]}]+/gi) || [];
    for (const match of matches) {
      const url = cleanUrl(match);
      if (url) urls.add(url);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrlsDeep(item, urls));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectUrlsDeep(item, urls));
  }
}

function sourceFromObject(item: Record<string, unknown>, fallbackIndex: number | null, answer: string): CitationSource | null {
  const url = cleanUrl(
    item.url ||
    item.link ||
    item.href ||
    item.source_url ||
    item.sourceUrl ||
    item.citation_url ||
    item.citationUrl ||
    item.reference_url ||
    item.referenceUrl ||
    item.page_url ||
    item.pageUrl
  );
  if (!url) return null;

  const sourceIndex = toSourceIndex(
    item.index ||
    item.source_index ||
    item.sourceIndex ||
    item.ref_index ||
    item.refIndex ||
    item.number ||
    item.id
  ) ?? fallbackIndex;
  const startIndex = typeof item.start_index === 'number' ? item.start_index : typeof item.startIndex === 'number' ? item.startIndex : null;
  const endIndex = typeof item.end_index === 'number' ? item.end_index : typeof item.endIndex === 'number' ? item.endIndex : null;
  const answerSnippet = startIndex !== null && endIndex !== null
    ? cleanText(answer.slice(Math.max(0, startIndex - 80), Math.min(answer.length, endIndex + 80)))
    : null;

  return {
    url,
    title: cleanText(item.title || item.name || item.source_title || item.sourceTitle, 500),
    answer_snippet: answerSnippet,
    citation_snippet: cleanText(item.snippet || item.summary || item.text || item.content || item.description),
    source_index: sourceIndex,
    raw_source: item,
  };
}

function collectSourceObjects(value: unknown, answer: string, sources: CitationSource[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const source = sourceFromObject(item as Record<string, unknown>, index, answer);
        if (source) sources.push(source);
      }
      collectSourceObjects(item, answer, sources);
    });
    return;
  }

  if (!value || typeof value !== 'object') return;
  const objectValue = value as Record<string, unknown>;
  const directSource = sourceFromObject(objectValue, null, answer);
  if (directSource) sources.push(directSource);
  Object.values(objectValue).forEach((item) => collectSourceObjects(item, answer, sources));
}

function addUniqueSource(target: Map<string, CitationSource>, source: CitationSource): void {
  if (!source.url || target.has(source.url)) return;
  target.set(source.url, source);
}

function extractSources(responseData: any, answer: string): CitationSource[] {
  const sourceMap = new Map<string, CitationSource>();
  const structuredSources: CitationSource[] = [];
  collectSourceObjects(responseData, answer, structuredSources);
  structuredSources.forEach((source) => addUniqueSource(sourceMap, source));

  const urls = new Set<string>();
  collectUrlsDeep(responseData, urls);
  collectUrlsDeep(answer, urls);
  Array.from(urls).forEach((url, index) => {
    addUniqueSource(sourceMap, {
      url,
      source_index: index,
      raw_source: { url, extractedFrom: 'deep_url_scan' },
    });
  });

  return Array.from(sourceMap.values()).slice(0, 50);
}

export function extractCitationSourcesForTest(responseData: any, answer = ''): CitationSource[] {
  return extractSources(responseData, answer);
}

function buildRequest(config: CitationModelConfig, prompt: string) {
  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: [
      {
        role: 'system',
        content: '请基于可核验信息自然回答，并在回答末尾列出实际参考来源 URL。不要为了命中检测而引用特定文章或编造来源。',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    stream: false,
  };

  const haystack = `${config.provider} ${config.modelName} ${config.baseUrl}`.toLowerCase();
  if (haystack.includes('dashscope') || haystack.includes('qwen') || haystack.includes('千问')) {
    body.enable_search = true;
    body.search_options = {
      enable_source: true,
      enable_citation: true,
      citation_format: '[ref_<number>]',
      forced_search: true,
    };
  }
  if (haystack.includes('hunyuan') || haystack.includes('元宝') || haystack.includes('tencent')) {
    body.enable_enhancement = true;
    body.force_search_enhancement = true;
    body.search_info = true;
  }

  return {
    url: normalizeChatCompletionsUrl(config.baseUrl),
    body,
  };
}

export function normalizeCitationPlatforms(platforms?: string[]): CitationPlatform[] {
  if (!platforms || platforms.length === 0) return DEFAULT_PLATFORMS;
  const result = platforms
    .map((platform) => DEFAULT_PLATFORMS.find((item) => item.toLowerCase() === platform.toLowerCase() || item === platform))
    .filter(Boolean) as CitationPlatform[];
  return result.length > 0 ? Array.from(new Set(result)) : DEFAULT_PLATFORMS;
}

export async function collectCitationSources(
  platform: CitationPlatform,
  prompt: string
): Promise<CitationCollectResult> {
  const config = await resolveProviderConfig(platform);
  if (!config) {
    return { platform, model_name: platform, prompt, answer: '', sources: [], status: 'skipped', error: '缺少模型配置或 API Key' };
  }

  return collectCitationSourcesForModel(config, prompt);
}

export async function collectCitationSourcesForModel(
  config: CitationModelConfig,
  prompt: string
): Promise<CitationCollectResult> {
  const request = buildRequest(config, prompt);
  try {
    const response = await axios.post(request.url, request.body, {
      headers: headers(config.apiKey),
      timeout: 120000,
    });
    const answer = extractAnswer(response.data);
    return {
      platform: config.provider,
      model_name: config.key,
      prompt,
      answer,
      sources: extractSources(response.data, answer),
      status: 'success',
    };
  } catch (err: any) {
    const status = err?.response?.status ? `HTTP ${err.response.status}` : err?.message || '调用失败';
    return { platform: config.provider, model_name: config.key, prompt, answer: '', sources: [], status: 'error', error: status };
  }
}
