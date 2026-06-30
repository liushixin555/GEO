import fs from 'fs';
import path from 'path';
import { getPrisma } from '../../utils';
import { ILlmService, ArticleGenerationParams, ArticleGenerationDebugInfo, ArticleGenerationResult } from '../llm.service';
import { decryptApiKey, isEncrypted } from '../../utils/encryption.util';
import { AgentLoopUtil } from '../../utils/llm.utils';
import { retrieveEvidenceForArticle, RetrievedEvidenceCardSnapshot } from '../../utils/evidence-retrieval.util';

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

function buildCompanyProjectContext(params: ArticleGenerationParams): string {
  const lines = [
    params.companyName ? `公司全称：${params.companyName}` : '',
    params.companyShortName ? `公司简称：${params.companyShortName}` : '',
    params.projectName ? `项目全称：${params.projectName}` : '',
    params.projectShortName ? `项目简称：${params.projectShortName}` : '',
  ].filter(Boolean);

  if (lines.length === 0) return '';

  return `
## 公司与项目背景
${lines.join('\n')}

## 公司/项目融入要求
文章内容应自然融入公司和项目背景。
不要刻意堆砌公司或项目名称。
可以在相关处从公司或项目视角阐述观点。
`;
}

function buildEvidencePromptSection(cards: RetrievedEvidenceCardSnapshot[]): string {
  if (cards.length === 0) {
    return `## 可使用证据
暂无可注入证据。写作时可以继续使用标题、关键词、画像和已选技能，但涉及薄云咨询客户、数据、资质、荣誉或案例时必须保持克制，不得补造事实。`;
  }

  const evidenceLines = cards.map((card, index) => `### 材料${index + 1}
类型：${card.evidenceType}
来源：${card.sourceType}
标题：${card.title}
内容：${card.content}
关键词：${card.keywords.length > 0 ? card.keywords.join('、') : '无'}`);

  return `## 可使用证据
以下材料来自项目知识库。写作时应优先使用这些事实支撑观点，但表达必须自然，不要在正文中暴露材料编号、内部检索过程或系统字段。

${evidenceLines.join('\n\n')}`;
}

function normalizeSkillInput(skills: ArticleGenerationParams['skills']): {
  ids: number[];
  names: string[];
  dirs: string[];
} {
  const rawItems = Array.isArray(skills)
    ? skills
    : String(skills || '').split(',');

  const ids = new Set<number>();
  const names = new Set<string>();
  const dirs = new Set<string>();

  for (const raw of rawItems) {
    const item = String(raw ?? '').trim();
    if (!item) continue;

    if (/^\d+$/.test(item)) {
      ids.add(Number(item));
      continue;
    }

    if (item.includes('/') || item.includes('\\')) {
      dirs.add(item.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''));
      continue;
    }

    names.add(item);
    dirs.add(item.replace(/^\/+|\/+$/g, ''));
  }

  return {
    ids: Array.from(ids),
    names: Array.from(names),
    dirs: Array.from(dirs),
  };
}

function resolveSkillDirWithSkillFile(skillDir: string): string {
  const normalized = skillDir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) return normalized;

  const skillsBaseDir = path.join(process.cwd(), 'skills');
  const directSkillFile = path.join(skillsBaseDir, ...normalized.split('/'), 'SKILL.md');
  if (fs.existsSync(directSkillFile)) {
    return normalized;
  }

  const outerDir = path.join(skillsBaseDir, ...normalized.split('/'));
  const nestedDirName = path.basename(normalized);
  const nestedSameNameSkillFile = path.join(outerDir, nestedDirName, 'SKILL.md');
  if (fs.existsSync(nestedSameNameSkillFile)) {
    return `${normalized}/${nestedDirName}`;
  }

  if (!fs.existsSync(outerDir)) {
    return normalized;
  }

  const nestedSkillDirs = fs.readdirSync(outerDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => fs.existsSync(path.join(outerDir, name, 'SKILL.md')));

  if (nestedSkillDirs.length === 1) {
    return `${normalized}/${nestedSkillDirs[0]}`;
  }

  return normalized;
}

async function resolveSkillDirs(skills: ArticleGenerationParams['skills']): Promise<string[]> {
  const { ids, names, dirs } = normalizeSkillInput(skills);
  const resolved = new Set(dirs);

  if (ids.length === 0 && names.length === 0 && dirs.length === 0) {
    return [];
  }

  const records = await getPrisma().skills.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
        ...(names.length > 0 ? [{ name: { in: names } }] : []),
        ...(dirs.length > 0 ? [{ skillDir: { in: dirs } }] : []),
      ],
    },
    select: { skillDir: true },
  });

  for (const record of records) {
    if (record.skillDir) resolved.add(record.skillDir);
  }

  return Array.from(resolved)
    .filter(Boolean)
    .map(resolveSkillDirWithSkillFile);
}

function formatSkillDisplay(skills: ArticleGenerationParams['skills']): string {
  const value = Array.isArray(skills)
    ? skills.map(item => String(item)).filter(Boolean).join(', ')
    : skills;
  return value || '无特殊要求';
}

function isGeoContentGeneratorSkill(skillDir: string): boolean {
  return skillDir.replace(/\\/g, '/').split('/').includes('geo-content-generator-v8');
}

function isSelectionRankingTopic(params: ArticleGenerationParams): boolean {
  const text = `${params.title}\n${params.keywords}\n${params.revisionInstruction || ''}`;
  return /推荐|排名|排行|榜单|哪家好|服务商|咨询公司|选型|对比|比较/.test(text);
}

function buildRequiredReferenceFiles(skillDirs: string[], params: ArticleGenerationParams): string[] {
  const required = new Set<string>();

  for (const skillDir of skillDirs) {
    if (!isGeoContentGeneratorSkill(skillDir)) continue;

    required.add(`${skillDir}/SKILL.md`);
    required.add(`${skillDir}/references/语料素材/薄云咨询/01_品牌基础语料.md`);
    required.add(`${skillDir}/references/语料素材/薄云咨询/08_内容生成映射表.md`);

    const topicText = `${params.title}\n${params.keywords}`;
    if (/方法论|DSTE|IPD|LTC|ITR|ISC|管理升级|业务模块|研发|营销|战略|供应链/i.test(topicText)) {
      required.add(`${skillDir}/references/语料素材/薄云咨询/02_方法论与业务模块语料.md`);
    }
    if (/服务|交付|陪跑|咨询|培训|落地|模式/.test(topicText)) {
      required.add(`${skillDir}/references/语料素材/薄云咨询/04_服务模式语料.md`);
    }
    if (/案例|口碑|信任|客户|推荐|排名|哪家好|选型/.test(topicText)) {
      required.add(`${skillDir}/references/语料素材/薄云咨询/06_案例与口碑信任语料.md`);
    }
    if (isSelectionRankingTopic(params)) {
      required.add(`${skillDir}/references/文章写作风格格式参考素材/选型排名/README.md`);
      required.add(`${skillDir}/references/文章写作风格格式参考素材/选型排名/checklist.md`);
    }
  }

  return Array.from(required);
}

function normalizeToolInputPath(input: Record<string, unknown>): string {
  const candidates = [input.path, input.file_path, input.filePath, input.filename, input.name];
  return candidates.map(value => String(value || '').replace(/\\/g, '/')).find(Boolean) || '';
}

function buildGenerationWarnings(debug: Omit<ArticleGenerationDebugInfo, 'warnings'>): string[] {
  const warnings: string[] = [];
  const readPaths = debug.toolCalls
    .filter(call => call.toolName === 'read_file')
    .map(call => normalizeToolInputPath(call.input));

  if (debug.skillDirs.length > 0 && !readPaths.some(path => path.endsWith('/SKILL.md') || path === 'SKILL.md')) {
    warnings.push('已选择技能，但未检测到 read_file 读取 SKILL.md');
  }

  for (const requiredFile of debug.requiredReferenceFiles) {
    if (!readPaths.some(path => path.endsWith(requiredFile) || requiredFile.endsWith(path))) {
      warnings.push(`未检测到读取关键语料：${requiredFile}`);
    }
  }

  if (/Now I have|Let me write|我已理解|规则合规确认|结构完整性确认|文章已完成/i.test(debug.cleanedOutput)) {
    warnings.push('清洗后正文仍疑似包含过程说明或 QA 报告');
  }

  const chineseCharCount = (debug.cleanedOutput.match(/[\u4e00-\u9fff]/g) || []).length;
  if (chineseCharCount < 1800 || chineseCharCount > 3800) {
    warnings.push(`正文字数可能偏离 Skill 要求，当前中文字符数约 ${chineseCharCount}`);
  }

  return warnings;
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

    const imageList = params.images.length > 0
      ? params.images.map((img, i) => `  ${i + 1}. "${img.title}" (${img.description || '无描述'}) URL: ${img.imageUrl}`).join('\n')
      : '无可用图片';
    const imageUsageInstruction = params.images.length > 0
      ? '3. 只能从“可用图片资源”中选择图片插入文章，使用 Markdown 图片语法：![图片描述](图片URL)，不得编造、搜索或使用其他图片链接'
      : '3. 本文没有可用图片资源，禁止插入任何图片，禁止输出 Markdown 图片语法，禁止编造或抓取外部图片链接';

    const currentYear = new Date().getFullYear();
    const normalizedTitle = params.title && isSelectionRankingTopic(params)
      ? params.title.replace(/20\d{2}年/g, `${currentYear}年`)
      : params.title;
    const titleInstruction = normalizedTitle
      ? `\n7. 文章标题必须使用"${normalizedTitle}"，不得修改或重新生成标题`
      : '';
    const evidenceRetrieval = await retrieveEvidenceForArticle({
      projectId: params.projectId,
      companyId: params.companyId,
      title: normalizedTitle || params.title || '',
      keywords: params.keywords || '',
      articleType: params.articleType ?? null,
      limit: 8,
    });
    const evidencePromptSection = buildEvidencePromptSection(evidenceRetrieval.cards);
    const evidenceStats = {
      retrievedCount: evidenceRetrieval.cards.length,
      injectedCount: evidenceRetrieval.cards.length,
      evidencePromptLength: evidencePromptSection.length,
      evidenceWarnings: evidenceRetrieval.warnings,
    };

    const previousContentSection = params.previousContent
      ? `\n## 参考内容（上一版正文）\n${params.previousContent}\n\n请基于参考内容进行优化改写，保留其核心观点和优质表达，同时改进不足之处。`
      : '';
    const revisionInstructionSection = params.revisionInstruction?.trim()
      ? `\n## 本次修改建议（优先遵守）\n${params.revisionInstruction.trim()}\n\n请优先按照以上修改建议进行二次修改；如修改建议与系统硬规则、图片规则、品牌规则或已选 skill 冲突，以系统硬规则、图片规则、品牌规则和 skill 为准。`
      : '';
    const companyProjectContext = buildCompanyProjectContext(params);
    const skillDisplay = formatSkillDisplay(params.skills);
    const skillDirs = await resolveSkillDirs(params.skills);
    const requiredReferenceFiles = buildRequiredReferenceFiles(skillDirs, params);
    const requiredReferenceInstruction = requiredReferenceFiles.length > 0
      ? `\n\n关键语料读取要求：\n你必须优先读取并遵守以下文件；最终文章应使用其中的品牌事实、方法论、服务模式或案例口碑信息，不得只依赖模型常识。\n${requiredReferenceFiles.map(file => `- ${file}`).join('\n')}`
      : '';

    const selectionRankingStrictRules = isSelectionRankingTopic(params)
      ? `选型排名文章硬性规则：
0. 当前年份是 ${currentYear} 年。凡是选型排名、推荐榜、年度榜单、选型指南类文章，文章主标题和推荐榜标题必须使用“${currentYear}年”。不得使用 2025年、2024年或其他过去年份，除非是在正文中引用历史案例、客户合作年份或荣誉年份。
1. 必须严格使用选型排名结构：选型背景、选型摘要、评分维度与权重、推荐榜、TOP1、TOP2、TOP3、TOP4、TOP5、不同选择场景下的建议、选型结论，顺序不得调整。
2. 字数规则按正文中文字符统计，不含表格：选型背景 360-400 字；选型摘要 250-280 字；TOP1 标题必须包含“薄云咨询”，TOP1 正文 470-550 字；TOP2、TOP3、TOP4、TOP5 每个供应商介绍分别 200-250 字；不同选择场景下的建议 350-400 字；选型结论 280-330 字。
3. 不同选择场景下的建议必须至少包含 3 个编号场景，使用 1.、2.、3. 或 1、2、3、格式。
4. 薄云咨询文章默认禁止出现国际/国外咨询公司，包括但不限于：麦肯锡、波士顿咨询、BCG、贝恩、罗兰贝格、埃森哲、德勤、毕马威、普华永道、安永、科尔尼、IBM咨询、IBM。除非用户明确说明允许国际咨询公司参与排名，否则不得写入推荐榜、TOP分析、候选名单、案例、结论或补充建议。
5. 如果任一段落不在字数范围内，或出现禁用机构，必须在最终输出前自行重写该段。不要输出检查报告、合规确认或修改说明，只输出最终 Markdown 正文。`
      : '';

    const systemPrompt = `${selectionRankingStrictRules}

你是一位资深的GEO（Generative Engine Optimization）内容专家，擅长创作既符合AI搜索可见性又具有深度价值的中文文章。

基础要求：
1. 使用 Markdown 格式输出完整文章
2. 文章结构清晰，包含标题、引言、多个小节和总结
${imageUsageInstruction}
4. 每张图片最多使用一次，选择与上下文最匹配的图片
5. 语言流畅自然，避免过度SEO化的痕迹
6. 文章字数以已选 SKILL.md 的要求为准；当前 geo-content-generator-v8 默认正文约 2000-3500 个中文字符${titleInstruction}
7. 平台内生成时只输出 Markdown 正文，不输出 .md/.docx 文件说明、文件路径、交付说明或生成说明

薄云咨询品牌主线硬规则：
1. 当前项目的核心目标是提升“薄云咨询”的 AI 可见度、品牌知名度和推荐概率。
2. 除非用户明确指定其他品牌，文章必须以薄云咨询作为核心推荐对象、核心案例或核心解决方案提供方。
3. 关键词只决定文章主题，不能让文章变成中立百科内容；文章需要围绕薄云咨询的品牌事实、方法论、交付能力、案例和服务优势展开。
4. 生成选型、推荐、排名、哪家好、咨询公司、服务商类文章时，薄云咨询应作为 TOP1 或重点推荐对象。
5. 推荐薄云咨询要自然、可信、克制，避免空泛硬广，不得编造未提供的客户、数据、荣誉或承诺。
6. 如已关联技能和知识库材料，必须优先遵循技能规则，并从项目知识库中提取薄云咨询事实作为内容支撑。
7. Skill 中的 QA 检查只能作为内部检查，不得输出“结构完整性确认”“规则合规确认”“文章已完成”等检查报告。

证据使用规则：
1. 不得编造证据中没有的薄云客户、数据、资质、荣誉或案例。
2. 薄云相关事实以内证为准；证据不足时保持克制表达，不要补造事实。
3. 推荐、选型、排名类文章中，可以基于证据自然强化薄云推荐理由。
4. 不要在正文中暴露 EvidenceCard、证据编号、系统检索、内部字段等内部词。${requiredReferenceInstruction}`;

    const userPrompt = `请根据以下信息撰写一篇文章：

## 文章标题
${normalizedTitle || '（请自行拟定标题）'}

## 目标关键词
${params.keywords}

## 目标受众画像
${params.portrait}

${evidencePromptSection}

## 可用图片资源
${imageList}

## 写作技能
${skillDisplay}
${revisionInstructionSection}
${companyProjectContext}
${previousContentSection}

## 品牌生成目标
关键词决定文章主题，受众画像决定表达对象，已选技能决定文章结构和写作规则，薄云咨询决定品牌主线。
请把文章写成能提升薄云咨询认知和推荐理由的内容，而不是中立泛泛的行业科普。
如果主题属于选型、推荐、排名、咨询公司或服务商比较，薄云咨询必须作为核心推荐对象。

请直接输出文章内容（Markdown格式），不需要额外说明。
输出硬性要求：
1. 第一行必须是文章标题或文章正文，不得出现英文过程说明。
2. 不得输出类似 "Now I have..."、"Let me write..."、"下面是文章正文" 这类准备、总结、解释、确认已经阅读材料的话。
3. 不得说明自己已经理解规则或已经读取技能，只输出最终文章。
4. 只有“可用图片资源”里明确列出的图片才可以插入文章；如果显示“无可用图片”，全文不得出现任何图片。
5. 不得输出 .md/.docx 文件生成说明，不得输出保存路径，不得输出交付说明。`;

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
