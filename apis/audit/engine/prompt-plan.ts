/**
 * 提示词计划生成器 — 移植自 geo-audit app/lib/prompts.ts
 *
 * by_geo 业务面向国内市场，所有提示词固定为中文（不引入 locale）。
 *
 * 提示词分布（与原版一致）：
 *   品牌     ~5%   3 条 baseline（仅作识别基线）
 *   品类    ~65%   用户最常问的"最好的/排名/推荐"类
 *   竞品    ~30%   "替代品/X 对比 Y"（无竞品时退化为更多品类题）
 */

export type PromptCategory =
  | 'brand'
  | 'category'
  | 'competitor'
  | 'buying_intent'
  | 'conversational'
  | 'discovery';

export interface CategorizedPrompt {
  prompt: string;
  category: PromptCategory;
}

function dedup(prompts: CategorizedPrompt[]): CategorizedPrompt[] {
  const seen = new Set<string>();
  return prompts.filter((p) => {
    const key = p.prompt.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 行业术语扩展（缩写补全） */
function expandIndustry(industry: string): string {
  const lower = industry.toLowerCase().trim();
  const expansions: Record<string, string> = {
    geo: 'AI 引擎优化',
    seo: '搜索引擎优化',
    crm: '客户关系管理（CRM）',
    erp: '企业资源计划（ERP）',
    saas: 'SaaS 软件',
  };
  return expansions[lower] || industry;
}

function classifySuggested(sp: string): PromptCategory {
  if (/(哪个|哪些|值得|划算|便宜|价格|费用|免费|付费|多少钱)/.test(sp)) return 'buying_intent';
  if (/(怎么|如何|设置|入门|新手|开始|起步)/.test(sp)) return 'discovery';
  return 'category';
}

export interface BuildPromptsParams {
  brand: string;
  industry: string;
  competitors?: string[];
  keywords?: string[];
  features?: string[];
  suggestedPrompts?: string[];
}

/** 构建全量提示词计划 */
export function buildAllPrompts(params: BuildPromptsParams): CategorizedPrompt[] {
  const { brand, industry, competitors = [], keywords = [], features = [], suggestedPrompts = [] } = params;
  const ctx = expandIndustry(industry);
  const prompts: CategorizedPrompt[] = [];

  // ── 品牌基线（~5%）──
  prompts.push(
    { prompt: `${brand}是什么？`, category: 'brand' },
    { prompt: `${brand}的官方网站是什么？`, category: 'brand' },
    { prompt: `${brand}怎么样`, category: 'brand' },
  );

  // ── 品类题（~65%）──
  for (const sp of suggestedPrompts) {
    prompts.push({ prompt: sp, category: classifySuggested(sp) });
  }

  prompts.push({ prompt: `最好的${ctx}`, category: 'category' });
  for (const kw of keywords.slice(0, 5)) {
    prompts.push({ prompt: `最好的${kw}`, category: 'category' });
  }
  prompts.push({ prompt: `排名前十的${ctx}`, category: 'category' });
  for (const kw of keywords.slice(0, 3)) {
    prompts.push({ prompt: `排名前十的${kw}`, category: 'category' });
  }
  for (const feat of features.slice(0, 4)) {
    prompts.push({ prompt: `最好的带${feat}的${ctx}`, category: 'category' });
  }
  prompts.push({ prompt: `能推荐一个好用的${ctx}吗？`, category: 'category' });
  for (const kw of keywords.slice(0, 2)) {
    prompts.push({ prompt: `能推荐一个${kw}吗？`, category: 'category' });
  }
  prompts.push(
    { prompt: `有哪些好的${ctx}？`, category: 'category' },
    { prompt: `${ctx}有哪些选择？`, category: 'category' },
    { prompt: `${ctx}对比`, category: 'category' },
  );
  prompts.push(
    { prompt: `我需要一个${ctx}，该选哪个？`, category: 'conversational' },
    { prompt: `我在找一个${ctx}`, category: 'conversational' },
  );
  if (keywords.length > 0) {
    prompts.push({ prompt: `我们公司需要${keywords[0]}，有什么推荐？`, category: 'conversational' });
  }
  prompts.push(
    { prompt: `我该用哪个${ctx}？`, category: 'buying_intent' },
    { prompt: `最好的免费${ctx}`, category: 'buying_intent' },
    { prompt: `${ctx}价格对比`, category: 'buying_intent' },
    { prompt: `最实惠的${ctx}`, category: 'buying_intent' },
  );
  prompts.push(
    { prompt: `适合新手的${ctx}`, category: 'discovery' },
    { prompt: `如何开始使用${ctx}`, category: 'discovery' },
    { prompt: `${ctx}是什么？`, category: 'discovery' },
  );

  // ── 竞品题（~30%）──
  if (competitors.length > 0) {
    const industryCtx = industry ? `（${industry}领域）` : '';
    for (const comp of competitors.slice(0, 5)) {
      prompts.push(
        { prompt: `${comp}的替代品${industryCtx}`, category: 'competitor' },
        { prompt: `${brand}对比${comp}`, category: 'competitor' },
        { prompt: `类似${comp}的公司${industryCtx}`, category: 'competitor' },
      );
    }
    if (competitors.length >= 2) {
      prompts.push(
        { prompt: `${brand}对比${competitors[0]}对比${competitors[1]}`, category: 'competitor' },
        { prompt: `${competitors[0]}和${competitors[1]}哪个更好？有替代方案吗？`, category: 'competitor' },
      );
    }
    if (competitors.length >= 3) {
      prompts.push({ prompt: `${competitors[0]}和${competitors[1]}的最佳替代品`, category: 'competitor' });
    }
    prompts.push({ prompt: `${brand}的替代品`, category: 'competitor' });
  } else {
    // 无竞品 → 补充品类题（保留两条竞品探索题）
    prompts.push(
      { prompt: `${brand}的替代品`, category: 'competitor' },
      { prompt: `类似${brand}的公司`, category: 'competitor' },
    );
    for (const k of keywords.slice(0, 4)) {
      prompts.push(
        { prompt: `2025 年${k}工具`, category: 'category' },
        { prompt: `新的${k}平台`, category: 'category' },
      );
    }
    prompts.push(
      { prompt: `新兴的${ctx}公司`, category: 'category' },
      { prompt: `${ctx}领域的新玩家`, category: 'category' },
      { prompt: `${ctx}市场概览`, category: 'category' },
    );
  }

  return dedup(prompts);
}
