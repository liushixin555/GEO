import React, { useMemo } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview/common';
import { Spin, Typography } from 'antd';
import DOMPurify from 'dompurify';
import type { CSSProperties } from 'react';
import '../styles/markdown-viewer.css';

const MAX_SOURCE_LENGTH = 1048576; // 1MB 安全长上限

const ALLOWED_URL_PROTOCOLS = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', './', '../'];

export const safeUrlTransform: (url: string) => string = (url) => {
  const lower = url.toLowerCase().trim();
  if (ALLOWED_URL_PROTOCOLS.some((p) => lower.startsWith(p))) return url;
  return '';
};

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
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = React.memo(({
  content,
  loading,
  error,
  emptyText = '暂无内容',
  style,
  className,
}) => {
  const safeSource = useMemo(() => {
    if (!content) return '';
    const truncated = content.length > MAX_SOURCE_LENGTH
      ? content.slice(0, MAX_SOURCE_LENGTH)
      : content;
    return DOMPurify.sanitize(truncated, {
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|telnet):|[^a-z]|[a+][a-z+.]+(?:\.|%20|\/))+$/i,
    });
  }, [content]);

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
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Markdown 内容预览"
      className={`markdown-viewer${className ? ` ${className}` : ''}`}
      style={style}
    >
      <MarkdownPreview
        source={safeSource}
        wrapperElement={{ 'data-color-mode': 'light' }}
        urlTransform={safeUrlTransform}
      />
    </div>
  );
});

MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;
