import axios from 'axios';
import { getPrisma } from '../../utils';
import { ILlmService, ArticleGenerationParams } from '../llm.service';
import { decryptApiKey, isEncrypted } from '../../utils/encryption.util';
import { AgentLoopUtil } from '../../utils/llm.utils';

function resolveApiKey(raw: string): string {
  return isEncrypted(raw) ? decryptApiKey(raw) : raw;
}

export class LlmServiceImpl implements ILlmService {
  async expandKeywords(keyword: string): Promise<string[]> {
    const prisma = getPrisma();
    const model = await prisma.llmModel.findFirst({ where: { status: true, deletedAt: null }, orderBy: { id: 'asc' } });
    if (!model) throw new Error('没有可用的LLM模型，请先在系统管理中配置');

    const prompt = `请根据给定的关键词，生成20个相关的长尾关键词扩展。要求：
1. 每个关键词占一行
2. 不要编号，不要多余的解释
3. 关键词要与原始关键词语义相关
4. 包含不同角度的扩展（同义词、相关术语、应用场景等）

原始关键词：${keyword}`;

    const url = `${model.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    let response;
    try {
      response = await axios.post(url, {
        model: model.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }, {
        headers: {
          'Authorization': `Bearer ${resolveApiKey(model.apiKey)}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000,
      });
    } catch (err: any) {
      const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      throw new Error(`LLM调用失败(${err.response?.status || '未知'}): ${detail}`);
    }

    const content = response.data?.choices?.[0]?.message?.content || '';
    const keywords = content
      .split('\n')
      .map((line: string) => line.replace(/^[\d]+[.、)\s]+/, '').trim())
      .filter((line: string) => line.length > 0 && line.length < 100);

    return keywords;
  }

  async mineKeywordsFromContent(content: string): Promise<string[]> {
    const prisma = getPrisma();
    const model = await prisma.llmModel.findFirst({ where: { status: true, deletedAt: null }, orderBy: { id: 'asc' } });
    if (!model) throw new Error('没有可用的LLM模型，请先在系统管理中配置');

    const prompt = `请从以下内容中提取所有可以作为SEO关键词的词语和短语。要求：
1. 每个关键词占一行
2. 不要编号，不要多余解释
3. 提取专业术语、产品名称、行业关键词、技术名词等
4. 每个关键词长度2-20个字
5. 尽可能全面，至少提取20个关键词

内容：
${content}`;

    const url = `${model.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    let response;
    try {
      response = await axios.post(url, {
        model: model.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }, {
        headers: {
          'Authorization': `Bearer ${resolveApiKey(model.apiKey)}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000,
      });
    } catch (err: any) {
      const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      throw new Error(`LLM调用失败(${err.response?.status || '未知'}): ${detail}`);
    }

    const result = response.data?.choices?.[0]?.message?.content || '';
    const keywords = result
      .split('\n')
      .map((line: string) => line.replace(/^[\d]+[.、)\s]+/, '').trim())
      .filter((line: string) => line.length > 1 && line.length < 100);

    return keywords;
  }

  async generateArticle(params: ArticleGenerationParams): Promise<string> {
    const prisma = getPrisma();
    const model = await prisma.llmModel.findFirst({ where: { status: true, deletedAt: null }, orderBy: { id: 'asc' } });
    if (!model) throw new Error('没有可用的LLM模型，请先在系统管理中配置');

    const imageList = params.images.length > 0
      ? params.images.map((img, i) => `  ${i + 1}. "${img.title}" (${img.description || '无描述'}) URL: ${img.imageUrl}`).join('\n')
      : '无可用图片';

    const titleInstruction = params.title
      ? `\n7. 文章标题必须使用"${params.title}"，不得修改或重新生成标题`
      : '';

    const previousContentSection = params.previousContent
      ? `\n## 参考内容（上一版正文）\n${params.previousContent}\n\n请基于参考内容进行优化改写，保留其核心观点和优质表达，同时改进不足之处。`
      : '';

    const systemPrompt = `你是一位资深的GEO（Generative Engine Optimization）内容专家，擅长创作既符合搜索引擎优化又具有深度价值的文章。

要求：
1. 使用 Markdown 格式输出完整文章
2. 文章结构清晰，包含标题、引言、多个小节和总结
3. 自然地在文章中插入可用图片资源，使用 Markdown 图片语法：![图片描述](图片URL)
4. 每张图片最多使用一次，选择与上下文最匹配的图片
5. 语言流畅自然，避免过度SEO化的痕迹
6. 文章字数控制在1500-3000字${titleInstruction}`;

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
${params.skills || '无特殊要求'}
${previousContentSection}
请直接输出文章内容（Markdown格式），不需要额外说明。`;

    const result = await AgentLoopUtil.run({
      baseUrl: model.baseUrl.replace(/\/+$/, ''),
      apiKey: resolveApiKey(model.apiKey),
      modelName: model.modelName,
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7,
    });

    if (!result.content.trim()) {
      throw new Error('LLM返回内容为空');
    }
    return result.content;
  }
}
