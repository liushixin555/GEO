import path from 'path';
import { getPrisma } from '../../utils';
import { ILlmService, ArticleGenerationParams, ArticleGenerationDebugInfo, ArticleGenerationResult } from '../llm.service';
import { decryptApiKey, isEncrypted } from '../../utils/encryption.util';
import { AgentLoopUtil } from '../../utils/llm.utils';
import { retrieveEvidenceForArticle } from '../../utils/evidence-retrieval.util';
import {
  buildArticlePrompt,
  buildGenerationWarnings,
  isSelectionRankingTopic,
  normalizeArticleTitle,
} from '../../utils/article-prompt-builder.util';

function resolveApiKey(raw: string): string {
  return isEncrypted(raw) ? decryptApiKey(raw) : raw;
}

const CHAR_COUNT_TOLERANCE = 30;

async function getActiveModels() {
  const prisma = getPrisma();
  const models = await prisma.llmModel.findMany({ where: { status: true, deletedAt: null }, orderBy: { id: 'asc' } });
  if (models.length === 0) throw new Error('没有可用的LLM模型，请先在系统管理中配置');
  return models;
}

async function getActiveModel() {
  const models = await getActiveModels();
  return models[0];
}

function parseKeywords(content: string, minLen: number): string[] {
  return content
    .split('\n')
    .map(line => line.replace(/^[\d]+[.、\s]+/, '').trim())
    .filter(line => line.length > minLen && line.length < 100);
}

function splitMarkdownTableRow(line: string, keepEmptyCells = false): string[] {
  const cells = line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map(cell => cell.replace(/\\\|/g, '|').trim());

  return keepEmptyCells ? cells : cells.filter(cell => cell.length > 0);
}

function isMarkdownTableCandidateLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.includes('|', 1);
}

function isMarkdownTableSeparatorCell(cell: string): boolean {
  return /^:?-{3,}:?$/.test(cell.trim());
}

function isMarkdownTableSeparatorLine(line: string): boolean {
  if (!isMarkdownTableCandidateLine(line)) return false;
  const cells = splitMarkdownTableRow(line);
  return cells.length > 0 && cells.every(isMarkdownTableSeparatorCell);
}

function normalizeTableRowCells(cells: string[], columnCount: number): string[] {
  if (cells.length === columnCount) return cells;
  if (cells.length < columnCount) {
    return [...cells, ...Array(columnCount - cells.length).fill('')];
  }

  return [
    ...cells.slice(0, columnCount - 1),
    cells.slice(columnCount - 1).join(' | '),
  ];
}

function normalizeSeparatorCells(cells: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => {
    const cell = cells[index]?.trim();
    return cell && isMarkdownTableSeparatorCell(cell) ? cell : '---';
  });
}

function formatMarkdownTableRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function expandCompactMarkdownTableLine(line: string): string[] {
  if (!line.includes('|---') && !line.includes('|:---')) return [line];

  const cells = splitMarkdownTableRow(line, true);
  const separatorStart = cells.findIndex(isMarkdownTableSeparatorCell);
  if (separatorStart <= 0) return [line];

  let separatorEnd = separatorStart;
  while (separatorEnd < cells.length && isMarkdownTableSeparatorCell(cells[separatorEnd])) {
    separatorEnd++;
  }

  const headerCells = cells.slice(0, separatorStart).filter(cell => cell.length > 0);
  if (headerCells.length < 2) return [line];

  const columnCount = headerCells.length;
  const expandedLines = [
    formatMarkdownTableRow(headerCells),
    formatMarkdownTableRow(normalizeSeparatorCells(cells.slice(separatorStart, separatorEnd), columnCount)),
  ];

  const remainingCells = cells.slice(separatorEnd);
  const groups: string[][] = [];
  let currentGroup: string[] = [];
  let hasExplicitRowBoundary = false;

  for (const cell of remainingCells) {
    if (cell.length === 0) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        hasExplicitRowBoundary = true;
      }
      continue;
    }
    currentGroup.push(cell);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  if (!hasExplicitRowBoundary && groups.length === 1 && groups[0].length > columnCount) {
    const flatCells = groups[0];
    groups.length = 0;
    for (let index = 0; index < flatCells.length; index += columnCount) {
      groups.push(flatCells.slice(index, index + columnCount));
    }
  }

  for (const group of groups) {
    if (group.length > 0) {
      expandedLines.push(formatMarkdownTableRow(normalizeTableRowCells(group, columnCount)));
    }
  }

  return expandedLines;
}

function normalizeMarkdownTableBlock(lines: string[]): string[] {
  const headerCells = splitMarkdownTableRow(lines[0]);
  if (headerCells.length < 2 || !isMarkdownTableSeparatorLine(lines[1])) {
    return lines;
  }

  const columnCount = headerCells.length;
  const normalizedLines = [
    formatMarkdownTableRow(headerCells),
    formatMarkdownTableRow(normalizeSeparatorCells(splitMarkdownTableRow(lines[1]), columnCount)),
  ];

  for (const line of lines.slice(2)) {
    if (isMarkdownTableSeparatorLine(line)) continue;
    const cells = splitMarkdownTableRow(line);
    if (cells.length === 0) continue;
    normalizedLines.push(formatMarkdownTableRow(normalizeTableRowCells(cells, columnCount)));
  }

  return normalizedLines;
}

function normalizeMarkdownTables(content: string): string {
  const expandedLines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap(expandCompactMarkdownTableLine);

  const normalizedLines: string[] = [];

  for (let index = 0; index < expandedLines.length;) {
    const line = expandedLines[index];
    const nextLine = expandedLines[index + 1];

    if (
      isMarkdownTableCandidateLine(line) &&
      nextLine &&
      isMarkdownTableSeparatorLine(nextLine)
    ) {
      const tableLines = [line, nextLine];
      index += 2;

      while (
        index < expandedLines.length &&
        isMarkdownTableCandidateLine(expandedLines[index]) &&
        expandedLines[index].trim()
      ) {
        tableLines.push(expandedLines[index]);
        index++;
      }

      normalizedLines.push(...normalizeMarkdownTableBlock(tableLines));
      continue;
    }

    normalizedLines.push(line);
    index++;
  }

  return normalizedLines.join('\n');
}

function cleanGeneratedArticleContent(content: string, allowedImageUrls: string[] = []): string {
  const processPreamblePatterns = [
    /^now i have (?:a )?comprehensive understanding of all the rules and materials\.?\s*let me write the article\.?\s*/i,
    /^i have (?:a )?comprehensive understanding of all the rules and materials\.?\s*let me write the article\.?\s*/i,
    /^now i'll write the article\.?\s*/i,
    /^let me write the article\.?\s*/i,
    /^我已经(?:全面)?理解了所有规则和材料，?现在(?:开始)?撰写文章。?\s*/i,
    /^下面(?:开始|是)文章正文[:：]?\s*/i,
  ];

  let cleaned = content.trimStart();
  for (const pattern of processPreamblePatterns) {
    cleaned = cleaned.replace(pattern, '').trimStart();
  }

  cleaned = cleanProcessTextPrefix(cleaned);

  const allowedUrlSet = new Set(allowedImageUrls.map(url => url.trim()).filter(Boolean));
  cleaned = cleaned
    .split('\n')
    .map((line) => {
      const nextLine = line.replace(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (match, url) => {
        const normalizedUrl = String(url || '').trim();
        return allowedUrlSet.has(normalizedUrl) ? match : '';
      });
      return nextLine.trim() ? nextLine : '';
    })
    .join('\n');

  return normalizeMarkdownTables(cleaned).trim();
}

function cleanProcessTextPrefix(content: string): string {
  const headingMatch = content.match(/^#{1,6}\s+/m);
  if (!headingMatch || headingMatch.index === 0) return content;

  const prefix = content.slice(0, headingMatch.index).trim();
  if (!prefix) return content;

  if (/\b(?:now\s+(?:i'?ll?|let|we)|let\s+me|i'?ll?\s+(?:count|check|verify|write|produce|generate)|here'?s\s+(?:the|my|a)\s+(?:corrected|fixed|adjusted|rewritten))/i.test(prefix)) {
    return content.slice(headingMatch.index).trimStart();
  }

  if (/→|->|chars?|target:|\(current|字数统计|字符数/.test(prefix)) {
    return content.slice(headingMatch.index).trimStart();
  }

  const chineseChars = (prefix.match(/[\u4e00-\u9fff]/g) || []).length;
  if (chineseChars < 5 && prefix.length > 30) {
    return content.slice(headingMatch.index).trimStart();
  }

  return content;
}

interface ArticleValidationIssue {
  code: string;
  message: string;
  section?: string;
}

const SELECTION_SECTION_RULES: Array<{ key: string; label: string; min?: number; max?: number }> = [
  { key: '选型背景', label: '选型背景', min: 360, max: 400 },
  { key: '选型摘要', label: '选型摘要', min: 250, max: 280 },
  { key: '评分维度', label: '评分维度与权重' },
  { key: '推荐榜', label: '推荐榜' },
  { key: 'TOP1', label: 'TOP1', min: 470, max: 550 },
  { key: 'TOP2', label: 'TOP2', min: 200, max: 250 },
  { key: 'TOP3', label: 'TOP3', min: 200, max: 250 },
  { key: 'TOP4', label: 'TOP4', min: 200, max: 250 },
  { key: 'TOP5', label: 'TOP5', min: 200, max: 250 },
  { key: '不同选择场景', label: '不同选择场景下的建议', min: 350, max: 400 },
  { key: '选型结论', label: '选型结论', min: 280, max: 330 },
];

const FORBIDDEN_PEERS = [
  '百思特咨询',
  '乔诺咨询',
  '汉捷咨询',
  '传世智慧',
  '和君咨询',
  '北大纵横',
  '正略咨询',
  '正略钧策',
  '金蓝盟',
  '远大方略',
  '华夏基石',
  '朗欧咨询',
];

const FORBIDDEN_INTERNATIONAL_CONSULTANTS = [
  '麦肯锡',
  '波士顿咨询',
  'BCG',
  '贝恩',
  '罗兰贝格',
  '埃森哲',
  '德勤',
  '毕马威',
  '普华永道',
  '安永',
  '科尔尼',
  'IBM咨询',
  'IBM',
];

function countChineseChars(content: string): number {
  return (content.match(/[\u4e00-\u9fff]/g) || []).length;
}

function removeMarkdownTables(content: string): string {
  return content
    .split('\n')
    .filter(line => !/^\s*\|.*\|\s*$/.test(line))
    .join('\n');
}

function getMarkdownSections(content: string): Array<{ heading: string; body: string; index: number }> {
  const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm))
    .map(match => ({
      heading: match[1].trim(),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }));

  return matches.map((match, index) => ({
    heading: match.heading,
    body: content.slice(match.end, index + 1 < matches.length ? matches[index + 1].start : content.length).trim(),
    index,
  }));
}

function findSection(
  sections: Array<{ heading: string; body: string; index: number }>,
  key: string,
): { heading: string; body: string; index: number } | undefined {
  return sections.find(section => section.heading.includes(key));
}

function getMarkdownTableBlocks(content: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of content.split('\n')) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      current.push(line);
    } else if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  }

  if (current.length > 0) blocks.push(current);
  return blocks;
}

function hasValidRecommendationTable(content: string): boolean {
  const blocks = getMarkdownTableBlocks(content);
  return blocks.some((block) => {
    const header = splitMarkdownTableRow(block[0] || '');
    const rows = block.filter(line => /^\|\s*TOP[1-5]\s*\|/.test(line));
    return header.length === 4
      && header[0] === '排名'
      && header[1] === '供应商'
      && header[2] === '综合评分'
      && header[3] === '推荐理由'
      && rows.length === 5
      && block.every(line => splitMarkdownTableRow(line, true).length === 4);
  });
}

function validateSelectionRankingArticle(content: string): ArticleValidationIssue[] {
  const issues: ArticleValidationIssue[] = [];
  const sections = getMarkdownSections(content);

  let lastIndex = -1;
  for (const rule of SELECTION_SECTION_RULES) {
    const section = findSection(sections, rule.key);
    if (!section) {
      issues.push({
        code: 'SECTION_MISSING',
        section: rule.label,
        message: `缺少必备模块：${rule.label}`,
      });
      continue;
    }

    if (section.index < lastIndex) {
      issues.push({
        code: 'SECTION_ORDER_INVALID',
        section: rule.label,
        message: `模块顺序错误：${rule.label} 应位于前序模块之后`,
      });
    }
    lastIndex = section.index;

    if (rule.min !== undefined && rule.max !== undefined) {
      const length = countChineseChars(removeMarkdownTables(section.body));
      if (length < rule.min - CHAR_COUNT_TOLERANCE || length > rule.max + CHAR_COUNT_TOLERANCE) {
        issues.push({
          code: 'SECTION_LENGTH_INVALID',
          section: rule.label,
          message: `${rule.label} 正文字数为 ${length}，要求 ${rule.min}-${rule.max} 字（不含表格）`,
        });
      }
    }
  }

  const top1 = findSection(sections, 'TOP1');
  if (!top1?.heading.includes('薄云咨询')) {
    issues.push({
      code: 'TOP1_BRAND_MISSING',
      section: 'TOP1',
      message: 'TOP1 标题必须包含“薄云咨询”',
    });
  }

  const sceneSection = findSection(sections, '不同选择场景');
  const sceneCount = (sceneSection?.body.match(/^\s*\d+[.、]/gm) || []).length;
  if (sceneCount < 3) {
    issues.push({
      code: 'SCENE_COUNT_INVALID',
      section: '不同选择场景下的建议',
      message: `不同选择场景下的建议必须至少包含 3 个编号场景，当前为 ${sceneCount} 个`,
    });
  }

  if (!hasValidRecommendationTable(content)) {
    issues.push({
      code: 'RECOMMENDATION_TABLE_INVALID',
      section: '推荐榜',
      message: '推荐榜表格必须存在，且必须严格包含 4 列：排名 / 供应商 / 综合评分 / 推荐理由，并包含 TOP1-TOP5 五行',
    });
  }

  const forbiddenNames = [...FORBIDDEN_PEERS, ...FORBIDDEN_INTERNATIONAL_CONSULTANTS]
    .filter(name => content.includes(name));
  if (forbiddenNames.length > 0) {
    issues.push({
      code: 'FORBIDDEN_ORGANIZATION_FOUND',
      message: `发现禁用机构：${Array.from(new Set(forbiddenNames)).join('、')}`,
    });
  }

  return issues;
}

function buildRewritePrompt(originalContent: string, issues: ArticleValidationIssue[]): string {
  return `以下文章未通过生成质量校验。请基于原文重写，只修正列出的问题，不要输出解释、检查报告、合规确认或修改说明，只输出最终 Markdown 正文。

不合格问题：
${issues.map((issue, index) => `${index + 1}. ${issue.section ? `【${issue.section}】` : ''}${issue.message}`).join('\n')}

修正要求：
1. 保持文章主题、核心品牌和 Markdown 结构不变。
2. 按问题清单逐项修正，尤其是分段字数、推荐榜表格、TOP1 品牌露出、禁用机构替换。
 3. 如果发现禁用机构，必须替换为非禁用的本土或垂直领域服务商，并同步修改推荐榜和对应 TOP 小节。
4. 只输出最终可入库的 Markdown 正文，不附带任何额外说明。
5. 禁止输出字数统计、修正思路、修改确认或任何英文过程说明（如 "Now I'll count...", "Let me check..."）。
6. 正文第一行必须是 Markdown 标题（以 "# " 或 "## " 开头）。

 原文：
 ${originalContent}`;
 }

function buildTargetedRepairPrompt(currentContent: string, issues: ArticleValidationIssue[]): string {
  return `以下 Markdown 文章经过一次重写后仍有少量质量校验问题。请只针对不合格问题进行精准修正，其他已经合格的模块、表格、供应商名称和文章结构尽量保持不变。

你必须输出完整 Markdown 正文，而不是只输出被修改的段落。不要输出解释、检查报告、合规确认或修改说明。

仍不合格的问题：
${issues.map((issue, index) => `${index + 1}. ${issue.section ? `【${issue.section}】` : ''}${issue.message}`).join('\n')}

修正方式：
1. 如果是字数不合格，只调整对应模块正文，使其落入要求区间。
2. 如果某段偏长，删减重复背景、泛泛解释和弱信息句。
3. 如果某段偏短，补充具体判断标准、适配场景或行动建议。
 4. 不要改动已经合格的 TOP 小节、推荐榜表格、标题年份、禁用机构规则。
5. 修正后仍必须只输出最终可入库的完整 Markdown 正文，不附带任何额外说明。
6. 禁止输出字数统计、修正思路、修改确认或任何英文过程说明（如 "Now I'll count...", "Let me check..."）。
7. 正文第一行必须是 Markdown 标题（以 "# " 或 "## " 开头）。

 当前正文：
 ${currentContent}`;
 }

export class LlmServiceImpl implements ILlmService {
  async expandKeywords(keyword: string): Promise<string[]> {
    const model = await getActiveModel();

    const prompt = `请根据给定的关键词，生成20个相关的长尾关键词扩展。要求：
1. 每个关键词占一行
2. 不要编号，不要多余的解释
3. 关键词要与原始关键词语义相关
4. 包含不同角度的扩展（同义词、相关术语、应用场景等）

原始关键词：${keyword}`;

    const result = await AgentLoopUtil.run({
      baseUrl: model.baseUrl.replace(/\/+$/, ''),
      apiKey: resolveApiKey(model.apiKey),
      modelName: model.modelName,
      prompt,
      temperature: 0,
    });

    return parseKeywords(result.content, 0);
  }

  async mineKeywordsFromContent(content: string): Promise<string[]> {
    const model = await getActiveModel();

    const prompt = `请从以下内容中提取所有可以作为SEO关键词的词语和短语。要求：
1. 每个关键词占一行
2. 不要编号，不要多余解释
3. 提取专业术语、产品名称、行业关键词、技术名词等
4. 每个关键词长度2-20个字
5. 尽可能全面，至少提取20个关键词

内容：
${content}`;

    const result = await AgentLoopUtil.run({
      baseUrl: model.baseUrl.replace(/\/+$/, ''),
      apiKey: resolveApiKey(model.apiKey),
      modelName: model.modelName,
      prompt,
      temperature: 0,
    });

    return parseKeywords(result.content, 1);
  }

  async generateArticle(params: ArticleGenerationParams): Promise<ArticleGenerationResult> {
    const models = await getActiveModels();
    let lastAttempt;

    const currentYear = new Date().getFullYear();
    const normalizedTitle = normalizeArticleTitle(params, currentYear);
    const evidenceRetrieval = await retrieveEvidenceForArticle({
      projectId: params.projectId,
      companyId: params.companyId,
      title: normalizedTitle || params.title || '',
      keywords: params.keywords || '',
      articleType: params.articleType ?? null,
      limit: 8,
    });
    const promptBuild = await buildArticlePrompt({
      params,
      evidenceCards: evidenceRetrieval.cards,
      evidenceWarnings: evidenceRetrieval.warnings,
      normalizedTitle,
      currentYear,
    });
    const {
      systemPrompt,
      userPrompt,
      requiredReferenceFiles,
      promptWarnings,
      skillDirs,
      evidencePromptSection,
      evidenceStats,
    } = promptBuild;

    for (const model of models) {
    let result = await AgentLoopUtil.run({
      baseUrl: model.baseUrl.replace(/\/+$/, ''),
      apiKey: resolveApiKey(model.apiKey),
      modelName: model.modelName,
      prompt: userPrompt,
      systemPrompt,
      skills: skillDirs.length > 0 ? skillDirs : undefined,
      skillsBaseDir: skillDirs.length > 0 ? path.join(process.cwd(), 'skills') : undefined,
      temperature: 0,
    });

    let content = cleanGeneratedArticleContent(result.content, params.images.map(image => image.imageUrl));

    if (!content) {
      throw new Error('LLM返回内容为空');
    }

    const validationIssues = isSelectionRankingTopic(params)
      ? validateSelectionRankingArticle(content)
      : [];

    if (validationIssues.length > 0) {
      const rewriteResult = await AgentLoopUtil.run({
        baseUrl: model.baseUrl.replace(/\/+$/, ''),
        apiKey: resolveApiKey(model.apiKey),
        modelName: model.modelName,
        prompt: buildRewritePrompt(content, validationIssues),
        systemPrompt,
        skills: skillDirs.length > 0 ? skillDirs : undefined,
        skillsBaseDir: skillDirs.length > 0 ? path.join(process.cwd(), 'skills') : undefined,
        temperature: 0,
      });

      const rewrittenContent = cleanGeneratedArticleContent(rewriteResult.content, params.images.map(image => image.imageUrl));
      if (rewrittenContent) {
        result = {
          content: `【FIRST_GENERATION】\n${result.content}\n\n【REWRITE_GENERATION】\n${rewriteResult.content}`,
          iterations: result.iterations + rewriteResult.iterations,
          toolCalls: [
            ...result.toolCalls,
            ...rewriteResult.toolCalls,
          ],
        };
        content = rewrittenContent;
      }
    }

    let finalValidationIssues = isSelectionRankingTopic(params)
      ? validateSelectionRankingArticle(content)
      : [];
    let targetedRepairAttempted = false;
    let targetedRepairIssueCount = 0;

    if (finalValidationIssues.length > 0) {
      targetedRepairAttempted = true;
      targetedRepairIssueCount = finalValidationIssues.length;
      const repairResult = await AgentLoopUtil.run({
        baseUrl: model.baseUrl.replace(/\/+$/, ''),
        apiKey: resolveApiKey(model.apiKey),
        modelName: model.modelName,
        prompt: buildTargetedRepairPrompt(content, finalValidationIssues),
        systemPrompt,
        skills: skillDirs.length > 0 ? skillDirs : undefined,
        skillsBaseDir: skillDirs.length > 0 ? path.join(process.cwd(), 'skills') : undefined,
        temperature: 0,
      });

      const repairedContent = cleanGeneratedArticleContent(repairResult.content, params.images.map(image => image.imageUrl));
      if (repairedContent) {
        result = {
          content: `${result.content}\n\n【TARGETED_REPAIR_GENERATION】\n${repairResult.content}`,
          iterations: result.iterations + repairResult.iterations,
          toolCalls: [
            ...result.toolCalls,
            ...repairResult.toolCalls,
          ],
        };
        content = repairedContent;
        finalValidationIssues = isSelectionRankingTopic(params)
          ? validateSelectionRankingArticle(content)
          : [];
      }
    }

    const debugWithoutWarnings: Omit<ArticleGenerationDebugInfo, 'warnings'> = {
      modelName: model.modelName,
      skillDirs,
      requiredReferenceFiles,
      systemPrompt,
      userPrompt,
      toolCalls: result.toolCalls,
      rawLlmOutput: result.content,
      cleanedOutput: content,
      retrievedEvidenceCards: evidenceRetrieval.cards,
      evidenceRetrievalQuery: evidenceRetrieval.query as unknown as Record<string, unknown>,
      evidenceWarnings: evidenceRetrieval.warnings,
      evidencePromptPreview: evidencePromptSection,
      evidenceStats,
    };

    lastAttempt = {
      content,
      qualityPassed: finalValidationIssues.length === 0,
      debug: {
        ...debugWithoutWarnings,
        warnings: [
          ...promptWarnings,
          ...buildGenerationWarnings(debugWithoutWarnings),
          ...evidenceRetrieval.warnings.map(warning => `证据检索提示：${warning}`),
          ...(validationIssues.length > 0 ? [`首次生成未通过质量校验，已自动重写一次；问题数：${validationIssues.length}`] : []),
          ...(targetedRepairAttempted ? [`整篇重写后仍未完全合格，已进行精准修段一次；修段前问题数：${targetedRepairIssueCount}`] : []),
          ...finalValidationIssues.map(issue => `最终质量校验未通过：${issue.section ? `【${issue.section}】` : ''}${issue.message}`),
        ],
      },
    };
    if (lastAttempt && lastAttempt.qualityPassed) return lastAttempt;
  }
  if (lastAttempt) return lastAttempt;
  throw new Error('所有LLM模型均无法生成合格文章');

}
}
