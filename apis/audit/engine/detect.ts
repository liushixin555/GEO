/**
 * 品牌自动检测 — 简化版
 *
 * geo-audit 的 autoDetect 含 HTML 抓取 + Doubao 富化；
 * 本实现仅做 URL 解析 + 主机名提取，作为 Phase 3 占位。
 * 后续可在 Phase 5 引入更复杂的 LLM 富化。
 */

import type { DetectResponse } from '../entity/audit.entity';

function hostnameToBrand(hostname: string): string {
  // 去除 www. / 子域 / TLD，提取主品牌名
  const noWww = hostname.replace(/^www\./, '');
  const parts = noWww.split('.');
  // 取倒数第二段（主域），如 example.com → example；shop.example.com.cn → example
  if (parts.length >= 2) {
    // 处理 .com.cn / .net.cn 等双段 TLD
    const last = parts[parts.length - 1];
    if (last.length <= 3 && parts.length >= 3) {
      return parts[parts.length - 3];
    }
    return parts[parts.length - 2];
  }
  return parts[0] || hostname;
}

export async function detectBrand(website: string): Promise<DetectResponse> {
  let hostname: string;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    hostname = new URL(url).hostname;
  } catch {
    hostname = website.replace(/^https?:\/\//, '').split('/')[0];
  }

  const brand = hostnameToBrand(hostname);
  const titleBrand = brand.charAt(0).toUpperCase() + brand.slice(1);

  return {
    brand: titleBrand,
    industry: '',
    keywords: [],
    features: [],
    competitors: [],
  };
}
