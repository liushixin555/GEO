import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getPrisma } from './db.util';
import { decryptApiKey, isEncrypted } from './encryption.util';

export type CitationPlatform = 'DeepSeek' | '豆包' | '元宝' | '千问' | 'Kimi';

export interface CitationSource {
  url: string;
  title?: string | null;
}

export interface CitationCollectResult {
  platform: CitationPlatform;
  prompt: string;
  answer: string;
  sources: CitationSource[];
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
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

async function resolveProviderConfig(platform: CitationPlatform): Promise<ProviderConfig | null> {
  const aliases = providerAliases[platform].map((item) => item.toLowerCase());
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
      return { apiKey, baseUrl: model.baseUrl, modelName: model.modelName };
    }
  }

  const fallback = readGeoMonitorConfig();
  const map = fallbackVarMap[platform];
  const apiKey = fallback[map.key]?.trim();
  const baseUrl = fallback[map.url]?.trim();
  const modelName = fallback[map.model]?.trim();
  if (!apiKey || !baseUrl || !modelName) return null;
  return { apiKey, baseUrl, modelName };
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

function collectUrlsDeep(value: unknown, urls: Set<string>): void {
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>，。；、)）\]}]+/gi) || [];
    for (const match of matches) urls.add(match.replace(/[.,，。;；]+$/u, ''));
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

function extractSources(responseData: any, answer: string): CitationSource[] {
  const urls = new Set<string>();
  collectUrlsDeep(responseData, urls);
  collectUrlsDeep(answer, urls);
  return Array.from(urls).slice(0, 50).map((url) => ({ url }));
}

function buildRequest(platform: CitationPlatform, config: ProviderConfig, prompt: string) {
  if (platform === 'DeepSeek' && config.baseUrl.includes('dashscope.aliyuncs.com/compatible-mode')) {
    return {
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      body: {
        model: config.modelName,
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: {
          enable_search: true,
          search_options: {
            enable_source: true,
            enable_citation: true,
            citation_format: '[ref_<number>]',
            forced_search: true,
          },
          result_format: 'message',
        },
      },
    };
  }

  if (platform === '豆包') {
    return {
      url: config.baseUrl.replace('/chat/completions', '/responses'),
      body: {
        model: config.modelName,
        stream: false,
        max_output_tokens: 4096,
        tools: [{ type: 'web_search' }],
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      },
    };
  }

  if (platform === '千问') {
    return {
      url: config.baseUrl.includes('/chat/completions')
        ? config.baseUrl.replace('/chat/completions', '/responses')
        : config.baseUrl,
      body: {
        model: config.modelName,
        input: prompt,
        tools: [{ type: 'web_search' }],
      },
    };
  }

  if (platform === '元宝') {
    return {
      url: config.baseUrl,
      body: {
        model: config.modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        enable_enhancement: true,
        force_search_enhancement: true,
        search_info: true,
      },
    };
  }

  return {
    url: config.baseUrl,
    body: {
      model: config.modelName,
      messages: [
        {
          role: 'system',
          content: '请基于联网搜索回答，并在回答末尾列出实际引用来源 URL。',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      tools: [{ type: 'builtin_function', function: { name: '$web_search' } }],
      thinking: { type: 'disabled' },
    },
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
    return { platform, prompt, answer: '', sources: [], status: 'skipped', error: '缺少模型配置或 API Key' };
  }

  const request = buildRequest(platform, config, prompt);
  try {
    const response = await axios.post(request.url, request.body, {
      headers: headers(config.apiKey),
      timeout: 120000,
    });
    const answer = extractAnswer(response.data);
    return {
      platform,
      prompt,
      answer,
      sources: extractSources(response.data, answer),
      status: 'success',
    };
  } catch (err: any) {
    const status = err?.response?.status ? `HTTP ${err.response.status}` : err?.message || '调用失败';
    return { platform, prompt, answer: '', sources: [], status: 'error', error: status };
  }
}
