/**
 * Tavily 搜索客户端 — 用于补充外部网络引用证据
 *
 * 用途：
 *   - citation_score：品牌官网域名是否出现在 Tavily 搜索结果中
 *   - discoverability_score：用 Tavily 答案文本做品牌提及分析
 *   - citations：报告中的引用来源列表
 *
 * API Key 通过 SystemConfig 表管理（key=`tavily_api_key`），
 * 在 /sysadmin 系统管理页面配置；缺失时所有结果降级为空（不影响主流程）。
 *
 * 默认聚焦中国市场：country=cn + 主流中文平台 include_domains。
 */

import { getPrisma } from '../../utils/db.util';

export interface TavilyResult {
  answer: string;
  results: Array<{ title: string; url: string; content: string }>;
}

export interface TavilyQueryOptions {
  /** ISO 国家代码（默认 "cn"，聚焦中国市场） */
  country?: string;
  /** 限定域名（默认使用 CHINESE_DOMAINS 让结果聚焦中文平台） */
  includeDomains?: string[];
  /** 是否禁用域名过滤（极少数场景用，如全量检索） */
  disableDomainFilter?: boolean;
  /** 最大结果数（默认 5） */
  maxResults?: number;
}

/**
 * 主流中文权威平台域名 — 默认 include_domains
 * 通过限定到这些平台让搜索结果聚焦中国市场
 */
export const CHINESE_DOMAINS = [
  'baidu.com', 'zhihu.com', 'sohu.com', 'sina.com.cn', '163.com',
  'qq.com', 'csdn.net', 'douban.com', 'bilibibili.com', 'toutiao.com',
  '36kr.com', 'ifeng.com', 'sogou.com', 'weibo.com', 'xiaohongshu.com',
  'tencent.com', 'alibaba.com', 'jd.com', 'tmall.com', 'hupu.com',
];

/** 读取 Tavily API Key（从 SystemConfig 表） */
async function getApiKey(): Promise<string | null> {
  const row = await getPrisma().systemConfig.findFirst({
    where: { configKey: 'tavily_api_key' },
    select: { configValue: true },
  });
  return row?.configValue || null;
}

/**
 * 调用 Tavily 搜索 API。
 * 失败、超时、未配置 key 时返回空结果（不抛错）。
 *
 * 默认参数聚焦中国网站：country=cn + include_domains 限定主流中文平台。
 */
export async function queryTavily(
  query: string,
  options: TavilyQueryOptions = {},
  timeoutMs = 15000,
): Promise<TavilyResult> {
  const apiKey = await getApiKey();
  if (!apiKey) return { answer: '', results: [] };

  const body: Record<string, unknown> = {
    query,
    include_answer: true,
    max_results: options.maxResults ?? 5,
    // 聚焦中国市场（Tavily 支持 ISO 3166-1 alpha-2 国家代码）
    country: options.country ?? 'cn',
  };

  if (!options.disableDomainFilter) {
    body.include_domains = options.includeDomains ?? CHINESE_DOMAINS;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(JSON.stringify({
        level: 'warn',
        type: 'tavily_http_error',
        status: res.status,
      }));
      return { answer: '', results: [] };
    }

    const data: any = await res.json();
    if (data.status === 'error') {
      return { answer: '', results: [] };
    }
    return {
      answer: data.answer || '',
      results: Array.isArray(data.results) ? data.results : [],
    };
  } catch (err: any) {
    console.warn(JSON.stringify({
      level: 'warn',
      type: 'tavily_call_failed',
      error: err?.name === 'AbortError' ? 'timeout' : (err?.message || String(err)),
    }));
    return { answer: '', results: [] };
  }
}

/**
 * 计算品牌官网在搜索结果中的引用得分（0-100）。
 *
 * 规则：每命中 1 个结果 +20 分，最高 100。
 * 域名匹配 hostname（去 www 前缀；支持子域共享主域）。
 */
export function computeCitationScore(
  results: Array<{ url: string }>,
  brandUrl: string | null | undefined,
): number {
  if (!brandUrl || results.length === 0) return 0;

  let domain: string;
  try {
    domain = new URL(brandUrl.startsWith('http') ? brandUrl : `https://${brandUrl}`).hostname.replace(/^www\./, '');
  } catch {
    return 0;
  }
  if (!domain) return 0;

  let hits = 0;
  for (const r of results) {
    try {
      const rDomain = new URL(r.url).hostname.replace(/^www\./, '');
      if (rDomain === domain || rDomain.endsWith('.' + domain)) hits++;
    } catch {
      // 无效 URL 忽略
    }
  }
  return Math.min(hits * 20, 100);
}
