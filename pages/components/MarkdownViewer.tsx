import React from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Empty, Spin, Typography } from 'antd';
import type { CSSProperties } from 'react';
import '../styles/markdown-viewer.css';

const MAX_SOURCE_LENGTH = 1048576; // 1MB 安全长上限

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

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  loading,
  error,
  emptyText = '暂无内容',
  style,
  className,
}) => {
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

  const safeSource =
    content.length > MAX_SOURCE_LENGTH
      ? content.slice(0, MAX_SOURCE_LENGTH)
      : content;

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
      />
    </div>
  );
};

export default MarkdownViewer;
