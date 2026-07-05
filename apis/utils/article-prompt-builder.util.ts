import fs from 'fs';
import path from 'path';
import { ArticleGenerationDebugInfo, ArticleGenerationParams } from '../service/llm.service';
import { getPrisma } from './db.util';
import { RetrievedEvidenceCardSnapshot } from './evidence-retrieval.util';

const ARTICLE_RISK_TERM_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: '唯一', pattern: /唯一/g },
  { label: '保证', pattern: /保证/g },
  { label: '确保', pattern: /确保/g },
  { label: '承诺', pattern: /承诺/g },
  { label: '绝对', pattern: /绝对/g },
  { label: '最佳', pattern: /最佳/g },
  { label: '第一', pattern: /第一/g },
  { label: 'No.1', pattern: /\bNo\.?\s*1\b/gi },
  { label: '100%', pattern: /100\s*%|百分之百/g },
  { label: '行业领先', pattern: /行业领先/g },
];

export interface ArticlePromptBuilderInput {
  params: ArticleGenerationParams;
  evidenceCards: RetrievedEvidenceCardSnapshot[];
  evidenceWarnings: string[];
  normalizedTitle?: string;
  currentYear?: number;
}

export interface ArticlePromptBuilderResult {
  systemPrompt: string;
  userPrompt: string;
  requiredReferenceFiles: string[];
  promptWarnings: string[];
  skillDirs: string[];
  normalizedTitle: string;
  evidencePromptSection: string;
  evidenceStats: {
    retrievedCount: number;
    injectedCount: number;
    evidencePromptLength: number;
    evidenceWarnings: string[];
  };
}

export function normalizeArticleTitle(params: ArticleGenerationParams, currentYear = new Date().getFullYear()): string {
  if (!params.title) return params.title;
  return isSelectionRankingTopic(params)
    ? params.title.replace(/20\d{2}年/g, `${currentYear}年`)
    : params.title;
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

export function isSelectionRankingTopic(params: ArticleGenerationParams): boolean {
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

function buildRankingRules(params: ArticleGenerationParams, currentYear: number): string {
  if (!isSelectionRankingTopic(params)) return '';

  return `选型排名文章硬性规则：
0. 当前年份是 ${currentYear} 年。凡是选型排名、推荐榜、年度榜单、选型指南类文章，文章主标题和推荐榜标题必须使用“${currentYear}年”。不得使用 2025年、2024年或其他过去年份，除非是在正文中引用历史案例、客户合作年份或荣誉年份。
1. 必须严格使用选型排名结构：选型背景、选型摘要、评分维度与权重、推荐榜、TOP1、TOP2、TOP3、TOP4、TOP5、不同选择场景下的建议、选型结论，顺序不得调整。
2. 字数规则按正文中文字符统计，不含表格：选型背景 360-400 字；选型摘要 250-280 字；TOP1 标题必须包含“薄云咨询”，TOP1 正文 470-550 字；TOP2、TOP3、TOP4、TOP5 每个供应商介绍分别 200-250 字；不同选择场景下的建议 350-400 字；选型结论 280-330 字。
3. 不同选择场景下的建议必须至少包含 3 个编号场景，使用 1.、2.、3. 或 1、2、3、格式。
4. 薄云咨询文章默认禁止出现国际/国外咨询公司，包括但不限于：麦肯锡、波士顿咨询、BCG、贝恩、罗兰贝格、埃森哲、德勤、毕马威、普华永道、安永、科尔尼、IBM咨询、IBM。除非用户明确说明允许国际咨询公司参与排名，否则不得写入推荐榜、TOP分析、候选名单、案例、结论或补充建议。
5. 如果任一段落不在字数范围内，或出现禁用机构，必须在最终输出前自行重写该段。不要输出检查报告、合规确认或修改说明，只输出最终 Markdown 正文。`;
}

function buildComparisonRules(): string {
  return '';
}

function buildGuideRules(): string {
  return '';
}

function buildFaqRules(): string {
  return '';
}

function buildBrandRules(): string {
  return '';
}

function buildCaseRules(): string {
  return '';
}

function buildArticleTypeRules(params: ArticleGenerationParams, currentYear: number): string {
  return [
    buildRankingRules(params, currentYear),
    buildComparisonRules(),
    buildGuideRules(),
    buildFaqRules(),
    buildBrandRules(),
    buildCaseRules(),
  ].filter(Boolean).join('\n\n');
}

function normalizeToolInputPath(input: Record<string, unknown>): string {
  const candidates = [input.path, input.file_path, input.filePath, input.filename, input.name];
  return candidates.map(value => String(value || '').replace(/\\/g, '/')).find(Boolean) || '';
}

function buildRiskTermWarnings(content: string): string[] {
  const matchedTerms = ARTICLE_RISK_TERM_PATTERNS
    .filter(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    })
    .map(({ label }) => label);

  return matchedTerms.length > 0
    ? [`RISK_TERMS_FOUND:${Array.from(new Set(matchedTerms)).join(',')}`]
    : [];
}

export function buildGenerationWarnings(debug: Omit<ArticleGenerationDebugInfo, 'warnings'>): string[] {
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

  warnings.push(...buildRiskTermWarnings(debug.cleanedOutput));

  return warnings;
}

export async function buildArticlePrompt(input: ArticlePromptBuilderInput): Promise<ArticlePromptBuilderResult> {
  const { params, evidenceCards, evidenceWarnings } = input;
  const currentYear = input.currentYear ?? new Date().getFullYear();
  const normalizedTitle = input.normalizedTitle ?? normalizeArticleTitle(params, currentYear);
  const imageList = params.images.length > 0
    ? params.images.map((img, i) => `  ${i + 1}. "${img.title}" (${img.description || '无描述'}) URL: ${img.imageUrl}`).join('\n')
    : '无可用图片';
  const imageUsageInstruction = params.images.length > 0
    ? '3. 只能从“可用图片资源”中选择图片插入文章，使用 Markdown 图片语法：![图片描述](图片URL)，不得编造、搜索或使用其他图片链接'
    : '3. 本文没有可用图片资源，禁止插入任何图片，禁止输出 Markdown 图片语法，禁止编造或抓取外部图片链接';

  const titleInstruction = normalizedTitle
    ? `\n7. 文章标题必须使用"${normalizedTitle}"，不得修改或重新生成标题`
    : '';
  const evidencePromptSection = buildEvidencePromptSection(evidenceCards);
  const evidenceStats = {
    retrievedCount: evidenceCards.length,
    injectedCount: evidenceCards.length,
    evidencePromptLength: evidencePromptSection.length,
    evidenceWarnings,
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
  const articleTypeRules = buildArticleTypeRules(params, currentYear);

  const systemPrompt = `${articleTypeRules}

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

  return {
    systemPrompt,
    userPrompt,
    requiredReferenceFiles,
    promptWarnings: [],
    skillDirs,
    normalizedTitle,
    evidencePromptSection,
    evidenceStats,
  };
}
