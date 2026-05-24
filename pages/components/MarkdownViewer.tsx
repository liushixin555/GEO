/**
 * MarkdownViewer — 安全封装层
 *
 * 第三方组件 @uiw/react-markdown-preview preview.tsx 存在以下安全缺陷：
 *   S1: defaultUrlTransform = (url) => url — 禁用 URL 消毒，javascript: 协议可通过
 *   S2: skipHtml={!skipHtml} — 语义反转，配置意图与实际行为矛盾
 *   S3: allowElement 正则 /^[A-Za-z0-9]+$/ — 标签白名单过宽，允许 script/iframe 等
 *   S4: rehype-raw 无二次过滤 — 事件处理器属性可通过
 *
 * 封装层防护措施（纵深防御）：
 *   1. safeUrlTransform — 安全 URL 过滤，白名单协议 (http/https/mailto/tel)
 *   2. SAFE_TAGS allowElement — 显式标签白名单，仅允许安全 HTML 标签
 *   3. DOMPurify 消毒 — 消毒所有 HTML 标签和属性，过滤事件处理器（安全关键 — 不可删除）
 *   4. source 长度截断 — 防止超长内容导致 DoS
 *   5. MarkdownErrorBoundary — 防止渲染异常导致页面白屏
 *
 * ⚠️ skipHtml 语义陷阱：
 *   preview.tsx 内部使用 skipHtml={!skipHtml}（双重否定），导致：
 *   - skipHtml=true（意图跳过HTML） → 实际传入 skipHtml=false → 会渲染 HTML
 *   - skipHtml=false（意图渲染HTML） → 实际传入 skipHtml=true → 会跳过 HTML
 *   本封装层不传 skipHtml，使用 DOMPurify 消毒后的 safeSource 代替，绕过此陷阱。
 */
import React, { useMemo, useCallback, useState, useEffect, Component, forwardRef, useRef, useImperativeHandle, memo } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview/nohighlight';
import { Spin, Typography, Empty, theme } from 'antd';
import DOMPurify from 'dompurify';
import type { CSSProperties, ReactNode, UIEvent, MouseEvent, KeyboardEvent } from 'react';
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

const EVENT_ATTRS = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
  'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress', 'onchange',
  'onsubmit', 'onreset', 'ondrag', 'ondrop', 'oncontextmenu',
  'onwheel', 'onpointerdown', 'onpointerup', 'onpointermove', 'oninput',
];

const DANGEROUS_ATTRS = [
  ...EVENT_ATTRS,
  'formaction', 'xlink:href', 'srcdoc', 'action',
];

// S3/A-03 修复：显式标签白名单（白名单方式比黑名单更安全）
const SAFE_TAGS = new Set([
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

export const safeUrlTransform: (url: string) => string = (url) => {
  const lower = url.toLowerCase().trim();
  if (ALLOWED_URL_PROTOCOLS.some((p) => lower.startsWith(p))) return url;
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

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
          内容渲染异常，请刷新页面重试
        </div>
      );
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
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|telnet):|[^a-z]|[a+][a-z+.]+(?:\.|%20|\/))+$/i,
    });
  }, [content]);

  // P2-a11y + SEC-03: 为复制按钮注入 ARIA 属性 + 超长代码块跳过复制按钮
  const rehypeRewrite = useCallback(
    (node: any, index: number | undefined, parent: any) => {
      if (node.type === 'element' && node.tagName === 'div') {
        const props = node.properties;
        if (props?.className === 'copied' || (Array.isArray(props?.className) && props.className.includes('copied'))) {
          // a11y: 注入 ARIA 属性
          props.role = 'button';
          props.tabindex = '0';
          props['aria-label'] = '复制代码';
          // SEC-03: 超长代码块移除 data-code，防止 DOM 膨胀
          if (typeof props['data-code'] === 'string' && props['data-code'].length > MAX_CODE_BLOCK_LENGTH) {
            delete props['data-code'];
            props['aria-label'] = '代码过长，无法复制';
          }
        }
      }
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    scrollToTop() {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToAnchor(anchor: string) {
      containerRef.current?.querySelector(`#${CSS.escape(anchor)}`)?.scrollIntoView({ behavior: 'smooth' });
    },
  }));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return <Typography.Text type="danger">{error}</Typography.Text>;
  }

  if (!content) {
    return <Empty description={emptyText} />;
  }

  return (
    <MarkdownErrorBoundary>
      <div
        ref={containerRef}
        role={roleProp}
        aria-label={ariaLabel}
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
          wrapperElement={{ 'data-color-mode': resolvedColorMode }}
          urlTransform={safeUrlTransform}
          rehypeRewrite={rehypeRewrite}
          allowElement={(element) => SAFE_TAGS.has(element.tagName.toLowerCase())}
        />
      </div>
    </MarkdownErrorBoundary>
  );
});

MarkdownViewerBase.displayName = 'MarkdownViewer';

const MarkdownViewer = memo(MarkdownViewerBase);
MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;
