import axios from 'axios';
import { getPrisma } from '../../utils';
import { ILlmService } from '../llm.service';

export class LlmServiceImpl implements ILlmService {
  async expandKeywords(keyword: string): Promise<string[]> {
    const prisma = getPrisma();
    const model = await prisma.llmModel.findFirst({ where: { status: true }, orderBy: { id: 'asc' } });
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
          'Authorization': `Bearer ${model.apiKey}`,
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
}
