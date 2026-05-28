import { ChatOpenAI } from '@langchain/openai';
import { createDeepAgent, StateBackend } from 'deepagents';
import type { BaseMessage } from '@langchain/core/messages';

// ─── 类型定义 ────────────────────────────────────────────

/** Agent Loop 输入配置 */
export interface AgentLoopOptions {
  /** OpenAI 兼容 API 的 Base URL（如 https://api.openai.com/v1） */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型名称（如 gpt-4o、deepseek-chat） */
  modelName: string;
  /** 用户提示词 */
  prompt: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 技能源路径列表（POSIX 路径，如 ["/skills/"]） */
  skills?: string[];
  /** 生成温度（默认 0） */
  temperature?: number;
}

/** 单次工具调用记录 */
export interface ToolCallRecord {
  /** 工具名称 */
  toolName: string;
  /** 工具输入参数 */
  input: Record<string, unknown>;
  /** 工具执行结果 */
  output: string;
}

/** Agent Loop 执行结果 */
export interface AgentLoopResult {
  /** Agent 最终回复文本 */
  content: string;
  /** 推理迭代次数（AI 消息轮数） */
  iterations: number;
  /** 全部工具调用记录 */
  toolCalls: ToolCallRecord[];
}

// ─── 工具类实现 ──────────────────────────────────────────

/**
 * Agent Loop 工具类
 *
 * 基于 deepagents + langchain 实现 ReAct 风格的 Agent Loop。
 * 输入: baseUrl / apiKey / modelName / prompt
 * 输出: agent loop 执行的最终结果
 *
 * 内置工具（由 deepagents 默认 middleware 提供）:
 *  - ls / read_file / write_file / edit_file / glob / grep  (文件系统，StateBackend 内存存储)
 *  - write_todos  (任务规划与进度跟踪)
 *  - task  (子代理任务委派)
 *  - 上下文自动摘要（长文本场景）
 *
 * @example
 * ```ts
 * import { AgentLoopUtil } from '@/utils/llm.utils';
 *
 * const result = await AgentLoopUtil.run({
 *   baseUrl: 'https://api.openai.com/v1',
 *   apiKey: 'sk-xxx',
 *   modelName: 'gpt-4o',
 *   prompt: '请分析以下文本的关键信息...',
 * });
 *
 * console.log(result.content);     // 最终回复
 * console.log(result.iterations);  // 迭代次数
 * console.log(result.toolCalls);   // 工具调用记录
 * ```
 */
export class AgentLoopUtil {
  /**
   * 执行 Agent Loop
   *
   * 流程:
   *  1. 根据 baseUrl/apiKey/modelName 创建 ChatOpenAI 模型
   *  2. 使用 createDeepAgent 构建 Agent（内置全部默认工具）
   *  3. 调用 agent.invoke 执行 ReAct 循环
   *  4. 提取最终回复、迭代次数、工具调用记录
   */
  static async run(options: AgentLoopOptions): Promise<AgentLoopResult> {
    const {
      baseUrl,
      apiKey,
      modelName,
      prompt,
      systemPrompt,
      skills,
      temperature = 0,
    } = options;

    // 1. 创建 ChatOpenAI 模型（支持任何 OpenAI 兼容 API）
    const model = new ChatOpenAI({
      model: modelName,
      apiKey,
      temperature,
      configuration: {
        baseURL: baseUrl,
      },
    });

    // 2. 创建 DeepAgent
    //    不传 middleware → 使用默认中间件栈:
    //      filesystem (ls/read_file/write_file/edit_file/glob/grep)
    //      todoList (write_todos)
    //      summarization (上下文摘要)
    //      subAgent (task 子代理)
    //    不传 backend → 默认 StateBackend (内存存储，安全)
    const agent = createDeepAgent({
      model,
      systemPrompt: systemPrompt ?? '你是一个有用的AI助手，善于利用工具来完成任务。请仔细思考并给出准确的回答。',
      skills,
    });

    // 3. 执行 Agent Loop
    const result = await agent.invoke({
      messages: [{ role: 'user', content: prompt }],
    });

    // 4. 提取结果
    return extractResult(result);
  }
}

// ─── 内部辅助函数 ────────────────────────────────────────

/** 从 LangGraph agent state 中提取结构化结果 */
function extractResult(raw: { messages?: BaseMessage[] }): AgentLoopResult {
  const messages = raw?.messages ?? [];
  const toolCalls: ToolCallRecord[] = [];

  // 分类消息
  const aiMsgs = messages.filter((m) => (m as any)._getType?.() === 'ai');
  const toolMsgs = messages.filter((m) => (m as any)._getType?.() === 'tool');

  // 收集工具调用记录（AIMessage.tool_calls → ToolMessage.content）
  for (const msg of aiMsgs) {
    const tc = (msg as any).tool_calls;
    if (tc?.length) {
      for (const call of tc) {
        toolCalls.push({
          toolName: call.name,
          input: call.args ?? {},
          output: '',
        });
      }
    }
  }

  // 将 ToolMessage 结果匹配回对应的工具调用
  let tcIdx = 0;
  for (const msg of toolMsgs) {
    if (tcIdx < toolCalls.length) {
      const c = (msg as any).content;
      toolCalls[tcIdx].output = typeof c === 'string' ? c : JSON.stringify(c);
      tcIdx++;
    }
  }

  // 提取最后一条 AI 消息作为最终回复
  const lastAi = aiMsgs[aiMsgs.length - 1];
  const content = lastAi ? extractTextContent(lastAi) : '';

  return {
    content,
    iterations: aiMsgs.length,
    toolCalls,
  };
}

/** 从 BaseMessage 中提取纯文本内容 */
function extractTextContent(msg: BaseMessage): string {
  const c = (msg as any).content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .filter((x: any) => x.type === 'text')
      .map((x: any) => x.text)
      .join('');
  }
  return JSON.stringify(c);
}
