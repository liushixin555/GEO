/**
 * Skill ZIP 打包器 — 输出符合规范的可下载诊断报告 Skill 包
 *
 * 包结构：
 *   /SKILL.md         主文档（含诊断摘要 + 改进建议）
 *   /report.json      完整结果 JSON（便于程序化消费）
 *   /prompts.json     提示词与回复明细
 */

import AdmZip from 'adm-zip';
import type { AuditDetail, AuditResult, AuditPromptDetail } from '../entity/audit.entity';

const CATEGORY_LABELS_ZH: Record<string, string> = {
  brand: '品牌认知',
  category: '品类认知',
  competitor: '竞品对比',
  buying_intent: '购买意向',
  conversational: '自然对话',
  discovery: '产品发现',
};

/** 生成诊断报告 Skill ZIP Buffer */
export function buildAuditSkillZip(
  detail: AuditDetail,
  result: AuditResult | null
): Buffer {
  const zip = new AdmZip();

  // 1. SKILL.md 主文档
  const skillMd = buildSkillMd(detail, result);
  zip.addFile('SKILL.md', Buffer.from(skillMd, 'utf8'));

  // 2. report.json
  zip.addFile(
    'report.json',
    Buffer.from(JSON.stringify(result ?? {}, null, 2), 'utf8')
  );

  // 3. prompts.json
  zip.addFile(
    'prompts.json',
    Buffer.from(JSON.stringify(serializePrompts(detail.prompts), null, 2), 'utf8')
  );

  return zip.toBuffer();
}

function serializePrompts(prompts: AuditPromptDetail[]) {
  return prompts.map((p) => ({
    promptIndex: p.promptIndex,
    category: CATEGORY_LABELS_ZH[p.category] ?? p.category,
    engine: p.engine,
    prompt: p.prompt,
    mentioned: p.result?.mentioned ?? false,
    blindSpot: p.result?.blindSpot ?? false,
    latencyMs: p.result?.latencyMs ?? null,
    snippet: p.result?.snippet ?? null,
    error: p.result?.error ?? null,
  }));
}

function buildSkillMd(detail: AuditDetail, result: AuditResult | null): string {
  const lines: string[] = [];
  lines.push(`# ${detail.brand} — AI 可见度诊断报告`);
  lines.push('');
  lines.push('## 概要');
  lines.push('');
  lines.push(`- **品牌**：${detail.brand}`);
  if (detail.website) lines.push(`- **网址**：${detail.website}`);
  if (detail.industry) lines.push(`- **行业**：${detail.industry}`);
  lines.push(`- **诊断时间**：${detail.createdAt}`);
  lines.push(`- **使用引擎**：${detail.engineCount} 个`);
  if (result) {
    lines.push(`- **总分**：${result.overall_score} / 100（等级 ${result.grade}）`);
    lines.push(`- **知识得分**：${result.knowledge_score}`);
    lines.push(`- **可发现性**：${result.discoverability_score}`);
    lines.push(`- **引用得分**：${result.citation_score}`);
  }
  lines.push('');

  if (result?.narrative) {
    lines.push('## 综合评语');
    lines.push('');
    lines.push(result.narrative);
    lines.push('');
  }

  if (result && Object.keys(result.engines).length > 0) {
    lines.push('## 引擎细分');
    lines.push('');
    lines.push('| 引擎 | 分数 | 提及 | 总题 | 盲点 |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const [key, data] of Object.entries(result.engines)) {
      lines.push(
        `| ${key} | ${data.score} | ${data.mentioned_count} | ${data.total_count} | ${data.blind_spots} |`
      );
    }
    lines.push('');
  }

  if (result && result.blind_spots.length > 0) {
    lines.push('## 关键盲点');
    lines.push('');
    lines.push('以下提示词所有引擎均未提及该品牌：');
    lines.push('');
    for (const b of result.blind_spots.slice(0, 20)) {
      lines.push(`- **[${CATEGORY_LABELS_ZH[b.category] ?? b.category}]** ${b.prompt}`);
    }
    lines.push('');
  }

  lines.push('## 改进建议');
  lines.push('');
  lines.push('1. **结构化数据**：确保网站含 Schema.org 标记（Organization、Product、FAQPage）。');
  lines.push('2. **内容深度**：针对盲点提示词补充专门的中文内容页面。');
  lines.push('3. **外部引用**：增加品牌在第三方平台（百科、新闻、行业门户）的可见度。');
  lines.push('4. **引擎一致性**：覆盖更多主流引擎以提升跨平台稳定性。');
  lines.push('');

  return lines.join('\n');
}
