/**
 * MarkdownViewer — 安全封装层
 *
 * 第三方组件 @uiw/react-markdown-preview preview.tsx 存在以下安全缺陷：
 *   S1: defaultUrlTransform = (url) => url — 禁用 URL 消毒，javascript: 协议可通过
 *   S2: skipHtml={!skipHtml} — 语义反转，配置意图与实际行为矛盾
 *   S3: allowElement 正则 /^[A-Za-z0-9]+$/ — 标签白名单过宽，允许 script/iframe 等
 *   S4: rehype-raw 无二次过滤 — 事件处理器属性可通过
 *   S5: rehype-attr 允许通过代码块元信息注入任意 HTML 属性（#3 修复）
 *
 * 封装层防护措施（纵深防御）：
 *   1. safeUrlTransform — 安全 URL 过滤，白名单协议 (http/https/mailto/tel)
 *   2. SAFE_TAGS allowElement — 显式标签白名单 + URL 属性危险协议检查（#4 修复）
 *   3. DOMPurify 消毒 — FORBID_TAGS 显式黑名单 + FORBID_ATTR 事件处理器（#2 修复增强）
 *   4. rehypeRewrite 属性清理 — 清理 rehype-attr 注入的 on* 事件属性和危险 URL（#3 修复）
 *   5. source 长度截断 — 防止超长内容导致 DoS
 *   6. MarkdownErrorBoundary — 防止渲染异常导致页面白屏
 *
 * ⚠️ skipHtml 语义陷阱：
 *   preview.tsx 内部使用 skipHtml={!skipHtml}（双重否定），导致：
 *   - skipHtml=true（意图跳过HTML） → 实际传入 skipHtml=false → 会渲染 HTML
 *   - skipHtml=false（意图渲染HTML） → 实际传入 skipHtml=true → 会跳过 HTML
 *   本封装层不传 skipHtml，使用 DOMPurify 消毒后的 safeSource 代替，绕过此陷阱。
 */
import { useMemo, useCallback, useState, useEffect, Component, forwardRef, useRef, useImperativeHandle, memo } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview/nohighlight';
import { Skeleton, Alert, Empty, theme } from 'antd';
import DOMPurify from 'dompurify';
import type { CSSProperties, ReactNode, UIEvent, MouseEvent, KeyboardEvent, ErrorInfo } from 'react';
import '../styles/markdown-viewer.css';

const MAX_SOURCE_LENGTH = 1048576; // 1MB 安全长上限
const MAX_CODE_BLOCK_LENGTH = 100_000; // 单个代码块复制按钮上限（100KB）

function useSystemColorMode(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mode;
}

const ALLOWED_URL_PROTOCOLS = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', './', '../'];
const ALLOWED_URL_PARSED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
export const SAFE_INPUT_TYPES = new Set(['checkbox']);

// === DOMPurify 配置 ===

const EVENT_ATTRS = [
  // 鼠标 / 指针事件
  'onclick', 'ondblclick', 'onmouseover', 'onmouseout', 'onmouseenter', 'onmouseleave',
  'onmousedown', 'onmouseup', 'onwheel',
  'onpointerdown', 'onpointerup', 'onpointermove', 'onpointerenter', 'onpointerleave',
  'onpointercancel', 'ongotpointercapture', 'onlostpointercapture',
  // 键盘事件
  'onkeydown', 'onkeyup', 'onkeypress',
  // 焦点事件
  'onfocus', 'onblur', 'onfocusin', 'onfocusout',
  // 表单事件
  'oninput', 'onchange', 'onsubmit', 'onreset', 'onselect', 'oninvalid',
  // 拖拽事件
  'ondrag', 'ondragstart', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondrop',
  // 资源加载 / 错误
  'onerror', 'onload', 'onloadstart', 'onloadend', 'onabort',
  // CSS 动画 / 过渡触发型（无需用户交互即可触发）
  'onanimationstart', 'onanimationend', 'onanimationiteration',
  'ontransitionend', 'ontransitionstart', 'ontransitionrun', 'ontransitioncancel',
  // 剪贴板事件
  'oncopy', 'oncut', 'onpaste',
  // 触控事件
  'ontouchstart', 'ontouchmove', 'ontouchend', 'ontouchcancel',
  // 滚动 / 大小
  'onscroll', 'onresize',
  // 上下文菜单
  'oncontextmenu',
  // 拖拽相关
  'onbeforeinput', 'onautocomplete', 'onautocompleteerror',
];

const DANGEROUS_ATTRS = [
  ...EVENT_ATTRS,
  'formaction', 'xlink:href', 'srcdoc', 'action',
];

// #2/#3/#4 修复增强：危险标签黑名单（DOMPurify FORBID_TAGS 纵深防御）
const FORBID_TAGS_ARR = [
  'script', 'iframe', 'object', 'embed', 'applet',
  'form', 'textarea', 'select', 'button',
  'meta', 'base', 'link', 'style',
  'svg', 'math',
  'noscript', 'template',
];

// === rehypeRewrite 清理 ===

// #4 修复增强：危险 URL 协议正则
const DANGEROUS_URL_RE = /^(javascript|data|vbscript):/i;

// #3/#4 修复增强：事件处理器属性正则
const DANGEROUS_ATTR_RE = /^on/i;

// #4 修复增强：可能包含 URL 的属性名（含 ping 防止点击追踪）
const URL_PROPERTIES = new Set([
  'href', 'src', 'action', 'formaction', 'xlink:href',
  'poster', 'background', 'dynsrc', 'lowsrc', 'ping',
]);

// === allowElement 过滤 ===

// S3/A-03 修复：显式标签白名单（白名单方式比黑名单更安全）
export const SAFE_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'br', 'hr',
  'blockquote', 'pre', 'code', 'kbd', 'samp',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'strong', 'em', 'del', 'ins', 'sub', 'sup', 'mark',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'details', 'summary', 'figure', 'figcaption',
  'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'abbr', 'cite', 'ruby', 'rt', 'rp',
  'input',
]);

// === 类型定义 ===

export interface RehypeElement {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: RehypeElement[];
}

export interface AllowElementParam {
  tagName: string;
  properties?: Record<string, unknown>;
}

export const safeUrlTransform: (url: string) => string = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // 快速路径：允许相对路径和锚点
  if (ALLOWED_URL_PROTOCOLS.some((p) => trimmed.toLowerCase().startsWith(p))) return url;
  // 使用 URL 解析进行严格协议校验
  try {
    const parsed = new URL(trimmed, 'https://placeholder.com');
    if (ALLOWED_URL_PARSED_PROTOCOLS.has(parsed.protocol)) return url;
  } catch {
    // fail-closed：解析失败 → 拒绝（上层 allowElement + DOMPurify 纵深兜底）
    return '';
  }
  return '';
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MarkdownViewer] 渲染异常:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <Empty description="内容渲染异常，请刷新页面重试" />;
    }
    return this.props.children;
  }
}

interface MarkdownViewerProps {
  /** Markdown 内容（应经过服务端消毒） */
  content?: string;
  /** 加载状态 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
  /** 无内容时的提示文字 */
  emptyText?: string;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 容器的 ARIA 标签，默认 "Markdown 内容预览" */
  ariaLabel?: string;
  /** 容器的 ARIA 角色，默认 "region" */
  role?: 'region' | 'document' | 'article';
  /** 滚动事件 */
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  /** 点击事件 */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** 键盘事件 */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** 鼠标进入事件（不冒泡） */
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  /** 鼠标离开事件（不冒泡） */
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  /** 颜色模式：'auto' 跟随系统，'light'/'dark' 强制指定。默认从 antd token 自动检测 */
  colorMode?: 'light' | 'dark' | 'auto';
}

export interface MarkdownViewerRef {
  /** 滚动到顶部 */
  scrollToTop(): void;
  /** 滚动到指定锚点 */
  scrollToAnchor(anchor: string): void;
}

const MarkdownViewerBase = forwardRef<MarkdownViewerRef, MarkdownViewerProps>(({
  content,
  loading,
  error,
  emptyText = '暂无内容',
  style,
  className,
  ariaLabel = 'Markdown 内容预览',
  role: roleProp = 'region',
  onScroll,
  onClick,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  colorMode: colorModeProp,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef<string | undefined>(content);
  const { token } = theme.useToken();
  const systemMode = useSystemColorMode();

  const resolvedColorMode = useMemo(() => {
    if (colorModeProp === 'auto') return systemMode;
    if (colorModeProp) return colorModeProp;
    const bg = token.colorBgBase;
    if (!bg || typeof bg !== 'string') return 'light';
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5 ? 'dark' : 'light';
  }, [colorModeProp, systemMode, token.colorBgBase]);

  // 安全关键 — DOMPurify 消毒不可删除、不可降级、不可绕过
  // 这是防御 preview.tsx S1-S4 安全缺陷的最后防线
  const safeSource = useMemo(() => {
    if (!content) return '';
    const truncated = content.length > MAX_SOURCE_LENGTH
      ? content.slice(0, MAX_SOURCE_LENGTH)
      : content;
    return DOMPurify.sanitize(truncated, {
      FORBID_ATTR: DANGEROUS_ATTRS,
      FORBID_TAGS: FORBID_TAGS_ARR,
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[/.#])/i,
    });
  }, [content]);

  // A-01 架构修复：useCallback 稳定引用，防止 MarkdownPreview 不必要管线重建
  // #4 修复增强：标签白名单 + URL 属性危险协议检查
  const allowElement = useCallback(
    (element: AllowElementParam) => {
      const tag = element.tagName.toLowerCase();
      if (!SAFE_TAGS.has(tag)) return false;
      if (tag === 'input') {
        const type = element.properties?.type;
        return typeof type === 'string' && SAFE_INPUT_TYPES.has(type);
      }
      // #4 修复：检查 URL 属性中的危险协议（javascript:/data:/vbscript:）
      if (element.properties) {
        for (const [key, value] of Object.entries(element.properties)) {
          if (URL_PROPERTIES.has(key) && typeof value === 'string' && DANGEROUS_URL_RE.test(value)) {
            return false;
          }
        }
      }
      return true;
    },
    [],
  );

  // P2-a11y + SEC-03: 为复制按钮注入 ARIA 属性 + 超长代码块跳过复制按钮
  // B-1: 锚点链接 aria-label + 代码块 role="region" aria-label
  // #3 修复：清理 rehype-attr 注入的危险属性（事件处理器 + 危险 URL）
  const rehypeRewrite = useCallback(
    (node: RehypeElement, _index: number | undefined, parent: RehypeElement | undefined) => {
      if (node.type !== 'element') return;
      const props = node.properties;

      // #3 修复增强：清理 rehype-attr 注入的危险属性
      if (props && typeof props === 'object') {
        for (const key of Object.keys(props)) {
          // 清理事件处理器属性（on*）
          if (DANGEROUS_ATTR_RE.test(key)) {
            delete props[key];
          }
          // 清理 style 属性（防止 CSS 注入/UI 伪装/点击劫持）
          else if (key === 'style') {
            delete props[key];
          }
          // 清理包含危险 URL 协议的属性（保留 data-code 用于复制按钮）
          else if (key !== 'data-code' && typeof props[key] === 'string' && URL_PROPERTIES.has(key) && DANGEROUS_URL_RE.test(props[key])) {
            delete props[key];
          }
        }
      }

      // 复制按钮 — 注入 ARIA 属性 + aria-live 动态通知
      if (node.tagName === 'div') {
        if (props?.className === 'copied' || (Array.isArray(props?.className) && props.className.includes('copied'))) {
          props.role = 'button';
          props.tabindex = '0';
          props['aria-label'] = '复制代码';
          props['aria-live'] = 'polite';
          if (typeof props['data-code'] === 'string' && props['data-code'].length > MAX_CODE_BLOCK_LENGTH) {
            delete props['data-code'];
            props['aria-label'] = '代码过长，无法复制';
          }
        }
      }

      // B-1: 标题锚点链接 — 注入 aria-label
      if (node.tagName === 'a' && Array.isArray(props?.className) && props.className.includes('anchor')) {
        props['aria-label'] = '链接到此标题';
      }

      // B-1: 代码块 — 注入 role="region" + aria-label
      if (node.tagName === 'pre' && parent?.type === 'element' && props) {
        if (!props.role) props.role = 'region';
        if (!props['aria-label']) props['aria-label'] = '代码块';
      }
    },
    [],
  );

  // A-01 架构修复：useMemo 稳定引用，仅在 resolvedColorMode 变化时创建新对象
  const wrapperElement = useMemo(
    () => ({ 'data-color-mode': resolvedColorMode }),
    [resolvedColorMode],
  );

  useImperativeHandle(ref, () => ({
    scrollToTop() {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToAnchor(anchor: string) {
      containerRef.current?.querySelector(`#${CSS.escape(anchor)}`)?.scrollIntoView({ behavior: 'smooth' });
    },
  }));

  // A-02: 内容切换时焦点管理 — 键盘用户无需从页顶重新 Tab
  useEffect(() => {
    if (content && prevContentRef.current !== content) {
      prevContentRef.current = content;
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [content]);

  // UI-P1-03: 复制按钮键盘支持 — Enter/Space 触发 click()
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).closest('.copied')) {
        e.preventDefault();
        (e.target as HTMLElement).click();
      }
    };
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (error) {
    return <Alert type="error" message={error} showIcon />;
  }

  if (!content) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <MarkdownErrorBoundary>
      <div
        ref={containerRef}
        role={roleProp}
        aria-label={ariaLabel}
        aria-live="polite"
        tabIndex={0}
        className={`markdown-viewer${className ? ` ${className}` : ''}`}
        style={style}
        onScroll={onScroll}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <MarkdownPreview
          source={safeSource}
          wrapperElement={wrapperElement}
          urlTransform={safeUrlTransform}
          rehypeRewrite={rehypeRewrite}
          allowElement={allowElement}
        />
      </div>
    </MarkdownErrorBoundary>
  );
});

MarkdownViewerBase.displayName = 'MarkdownViewerBase';

const MarkdownViewer = memo(MarkdownViewerBase);
MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;
