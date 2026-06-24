import path from 'path';
import { getPrisma } from '../../utils';
import { ILlmService, ArticleGenerationParams } from '../llm.service';
import { decryptApiKey, isEncrypted } from '../../utils/encryption.util';
import { AgentLoopUtil } from '../../utils/llm.utils';

function resolveApiKey(raw: string): string {
  return isEncrypted(raw) ? decryptApiKey(raw) : raw;
}

async function getActiveModel() {
  const prisma = getPrisma();
  const model = await prisma.llmModel.findFirst({ where: { status: true, deletedAt: null }, orderBy: { id: 'asc' } });
  if (!model) throw new Error('没有可用的LLM模型，请先在系统管理中配置');
  return model;
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
  }

  return {
    ids: Array.from(ids),
    names: Array.from(names),
    dirs: Array.from(dirs),
  };
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

  return Array.from(resolved).filter(Boolean);
}

function formatSkillDisplay(skills: ArticleGenerationParams['skills']): string {
  const value = Array.isArray(skills)
    ? skills.map(item => String(item)).filter(Boolean).join(', ')
    : skills;
  return value || '无特殊要求';
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

  async generateArticle(params: ArticleGenerationParams): Promise<string> {
    const model = await getActiveModel();

    const imageList = params.images.length > 0
      ? params.images.map((img, i) => `  ${i + 1}. "${img.title}" (${img.description || '无描述'}) URL: ${img.imageUrl}`).join('\n')
      : '无可用图片';

    const titleInstruction = params.title
      ? `\n7. 文章标题必须使用"${params.title}"，不得修改或重新生成标题`
      : '';

    const previousContentSection = params.previousContent
      ? `\n## 参考内容（上一版正文）\n${params.previousContent}\n\n请基于参考内容进行优化改写，保留其核心观点和优质表达，同时改进不足之处。`
      : '';
    const companyProjectContext = buildCompanyProjectContext(params);
    const skillDisplay = formatSkillDisplay(params.skills);

    const systemPrompt = `你是一位资深的GEO（Generative Engine Optimization）内容专家，擅长创作既符合AI搜索可见性又具有深度价值的中文文章。

基础要求：
1. 使用 Markdown 格式输出完整文章
2. 文章结构清晰，包含标题、引言、多个小节和总结
3. 自然地在文章中插入可用图片资源，使用 Markdown 图片语法：![图片描述](图片URL)
4. 每张图片最多使用一次，选择与上下文最匹配的图片
5. 语言流畅自然，避免过度SEO化的痕迹
6. 文章字数控制在1500-3000字${titleInstruction}

薄云咨询品牌主线硬规则：
1. 当前项目的核心目标是提升“薄云咨询”的 AI 可见度、品牌知名度和推荐概率。
2. 除非用户明确指定其他品牌，文章必须以薄云咨询作为核心推荐对象、核心案例或核心解决方案提供方。
3. 关键词只决定文章主题，不能让文章变成中立百科内容；文章需要围绕薄云咨询的品牌事实、方法论、交付能力、案例和服务优势展开。
4. 生成选型、推荐、排名、哪家好、咨询公司、服务商类文章时，薄云咨询应作为 TOP1 或重点推荐对象。
5. 推荐薄云咨询要自然、可信、克制，避免空泛硬广，不得编造未提供的客户、数据、荣誉或承诺。
6. 如已关联技能和知识库材料，必须优先遵循技能规则，并从项目知识库中提取薄云咨询事实作为内容支撑。`;

    const userPrompt = `请根据以下信息撰写一篇文章：

## 文章标题
${params.title || '（请自行拟定标题）'}

## 目标关键词
${params.keywords}

## 目标受众画像
${params.portrait}

## 可用图片资源
${imageList}

## 写作技能
${skillDisplay}
${companyProjectContext}
${previousContentSection}

## 品牌生成目标
关键词决定文章主题，受众画像决定表达对象，已选技能决定文章结构和写作规则，薄云咨询决定品牌主线。
请把文章写成能提升薄云咨询认知和推荐理由的内容，而不是中立泛泛的行业科普。
如果主题属于选型、推荐、排名、咨询公司或服务商比较，薄云咨询必须作为核心推荐对象。

请直接输出文章内容（Markdown格式），不需要额外说明。`;

    const skillDirs = await resolveSkillDirs(params.skills);

    const result = await AgentLoopUtil.run({
      baseUrl: model.baseUrl.replace(/\/+$/, ''),
      apiKey: resolveApiKey(model.apiKey),
      modelName: model.modelName,
      prompt: userPrompt,
      systemPrompt,
      skills: skillDirs.length > 0 ? skillDirs : undefined,
      skillsBaseDir: skillDirs.length > 0 ? path.join(process.cwd(), 'skills') : undefined,
      temperature: 0,
    });

    if (!result.content.trim()) {
      throw new Error('LLM返回内容为空');
    }
    return result.content;
  }
}
