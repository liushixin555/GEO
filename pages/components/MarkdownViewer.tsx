import React, { useMemo, Component, forwardRef, useRef, useImperativeHandle } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview/nohighlight';
import { Spin, Typography, Empty, theme } from 'antd';
import DOMPurify from 'dompurify';
import type { CSSProperties, ReactNode, UIEvent, MouseEvent, KeyboardEvent } from 'react';
import '../styles/markdown-viewer.css';

const MAX_SOURCE_LENGTH = 1048576; // 1MB 安全长上限

const ALLOWED_URL_PROTOCOLS = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', './', '../'];

const EVENT_ATTRS = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
  'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress', 'onchange',
  'onsubmit', 'onreset', 'ondrag', 'ondrop', 'oncontextmenu',
  'onwheel', 'onpointerdown', 'onpointerup', 'onpointermove', 'oninput',
];

const DANGEROUS_ELEMENTS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input',
  'textarea', 'select', 'button', 'applet', 'base', 'basefont',
  'link', 'meta', 'style', 'noscript', 'template', 'svg', 'math',
];

const DANGEROUS_ATTRS = [
  ...EVENT_ATTRS,
  'formaction', 'xlink:href', 'srcdoc', 'action',
];

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

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
}

export interface MarkdownViewerRef {
  /** 滚动到顶部 */
  scrollToTop(): void;
  /** 滚动到指定锚点 */
  scrollToAnchor(anchor: string): void;
}

const MarkdownViewer = forwardRef<MarkdownViewerRef, MarkdownViewerProps>(({
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
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();
  const colorMode = useMemo(() => {
    const bg = token.colorBgBase;
    if (!bg || typeof bg !== 'string') return 'light';
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5 ? 'dark' : 'light';
  }, [token.colorBgBase]);

  const safeSource = useMemo(() => {
    if (!content) return '';
    const truncated = content.length > MAX_SOURCE_LENGTH
      ? content.slice(0, MAX_SOURCE_LENGTH)
      : content;
    return DOMPurify.sanitize(truncated, {
      FORBID_TAGS: DANGEROUS_ELEMENTS,
      FORBID_ATTR: DANGEROUS_ATTRS,
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|telnet):|[^a-z]|[a+][a-z+.]+(?:\.|%20|\/))+$/i,
    });
  }, [content]);

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
          wrapperElement={{ 'data-color-mode': colorMode }}
          urlTransform={safeUrlTransform}
          disallowedElements={DANGEROUS_ELEMENTS}
        />
      </div>
    </MarkdownErrorBoundary>
  );
});

MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;
