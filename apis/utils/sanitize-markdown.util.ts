/**
 * sanitize-markdown.util — 服务端 Markdown 内容消毒工具
 *
 * REQ-3 (P1): 深度防御，不依赖前端 DOMPurify 防护。
 * 用于 article content 写入数据库前的内容校验和清洗。
 *
 * 防护范围：
 *   1. <script> 标签注入（XSS）
 *   2. on* 事件属性（onclick、onerror 等）
 *   3. javascript:/data:/vbscript: 危险协议 URL
 *   4. <iframe>/<embed>/<object>/<form> 等危险标签
 *   5. 内容长度上限（防止 DoS）
 *   6. 非 UTF-8 控制字符
 */

/** Markdown 内容最大长度（2MB，与前端 MAX_CONTENT_LENGTH 对齐） */
export const MAX_MARKDOWN_LENGTH = 2_097_152;

/** 危险 HTML 标签（正则，不区分大小写） */
const DANGEROUS_TAG_RE =
  /<(script|iframe|embed|object|form|input|textarea|select|button|applet|base|link|meta|style)\b[^>]*>[\s\S]*?<\/\1>|<(script|iframe|embed|object|form|input|textarea|select|button|applet|base|link|meta|style)\b[^>]*\/?>/gi;

/** on* 事件属性（如 onclick、onerror、onload） */
const EVENT_ATTR_RE = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;

/** 危险 URL 协议 */
const DANGEROUS_URL_RE = /(href|src|action)\s*=\s*["']?\s*(javascript|data|vbscript)\s*:/gi;

/** 控制字符（除 \t \n \r 外的 C0 控制字符 + DEL） */
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export interface SanitizeResult {
  /** 清洗后的内容 */
  sanitized: string;
  /** 是否检测到并移除了危险内容 */
  wasCleaned: boolean;
  /** 被移除的内容类型列表 */
  removedItems: string[];
}

/**
 * 校验 Markdown 内容长度
 * @throws Error 当内容超过上限
 */
export function validateMarkdownLength(content: string): void {
  if (content.length > MAX_MARKDOWN_LENGTH) {
    throw new Error(`Markdown 内容超过最大长度限制（${MAX_MARKDOWN_LENGTH} 字符）`);
  }
}

/**
 * 清洗 Markdown 内容中的危险 HTML 标签和属性
 *
 * 策略：移除而非转义，因为 Markdown 渲染器对转义 HTML 的行为不一致。
 * 仅保留安全的 Markdown 语法，不尝试修复危险内容。
 */
export function sanitizeMarkdown(raw: string): SanitizeResult {
  const removedItems: string[] = [];
  let sanitized = raw;

  // 1. 移除控制字符（保留 \t \n \r）
  const controlCleaned = sanitized.replace(CONTROL_CHAR_RE, '');
  if (controlCleaned !== sanitized) {
    removedItems.push('控制字符');
    sanitized = controlCleaned;
  }

  // 2. 移除危险 HTML 标签
  const tagCleaned = sanitized.replace(DANGEROUS_TAG_RE, '');
  if (tagCleaned !== sanitized) {
    removedItems.push('危险HTML标签');
    sanitized = tagCleaned;
  }

  // 3. 移除 on* 事件属性
  const eventCleaned = sanitized.replace(EVENT_ATTR_RE, '');
  if (eventCleaned !== sanitized) {
    removedItems.push('事件属性');
    sanitized = eventCleaned;
  }

  // 4. 移除危险 URL 协议
  const urlCleaned = sanitized.replace(DANGEROUS_URL_RE, '$1="#"');
  if (urlCleaned !== sanitized) {
    removedItems.push('危险URL协议');
    sanitized = urlCleaned;
  }

  return {
    sanitized,
    wasCleaned: removedItems.length > 0,
    removedItems,
  };
}

/**
 * 校验并清洗 Markdown 内容（一站式接口）
 * - 校验长度
 * - 清洗危险内容
 * - 日志记录清洗事件
 *
 * @returns 清洗后的安全内容
 * @throws Error 内容超过长度上限
 */
export function validateAndSanitizeMarkdown(raw: string): string {
  if (typeof raw !== 'string') {
    throw new Error('Markdown 内容必须为字符串');
  }

  validateMarkdownLength(raw);

  const result = sanitizeMarkdown(raw);

  if (result.wasCleaned) {
    // 使用结构化日志（logger 可能循环依赖，用 console.warn 仅在此处）
    console.warn(
      '[sanitize-markdown] 检测到并移除危险内容:',
      result.removedItems.join(', '),
    );
  }

  return result.sanitized;
}
