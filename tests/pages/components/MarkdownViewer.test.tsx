/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MarkdownViewer from '../../../pages/components/MarkdownViewer';

// Mock @uiw/react-markdown-preview
jest.mock('@uiw/react-markdown-preview', () => {
  return function MockMarkdownPreview(props: { source?: string }) {
    return <div data-testid="markdown-preview">{props.source || ''}</div>;
  };
});

// Mock antd components
jest.mock('antd', () => ({
  Empty: ({ description }: { description: string }) => (
    <div data-testid="antd-empty">{description}</div>
  ),
  Spin: () => <div data-testid="antd-spin" />,
  Typography: {
    Text: ({ children, type }: { children: React.ReactNode; type?: string }) => (
      <div data-testid="antd-typography-text" data-type={type}>{children}</div>
    ),
  },
}));

// Mock CSS import
jest.mock('../../../pages/styles/markdown-viewer.css', () => ({}));

describe('MarkdownViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders markdown content correctly', () => {
    const content = '# Hello World\nThis is **markdown** content.';
    render(<MarkdownViewer content={content} />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview).toBeInTheDocument();
    expect(preview.textContent).toBe(content);
  });

  it('shows empty text when content is empty', () => {
    render(<MarkdownViewer content="" emptyText="暂无内容" />);

    expect(screen.getByText('暂无内容')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });

  it('shows empty text when content is undefined', () => {
    render(<MarkdownViewer />);

    expect(screen.getByText('暂无内容')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });

  it('shows custom empty text', () => {
    render(<MarkdownViewer content="" emptyText="AI 正在生成文章内容，请稍候..." />);

    expect(screen.getByText('AI 正在生成文章内容，请稍候...')).toBeInTheDocument();
  });

  it('shows loading spinner when loading is true', () => {
    render(<MarkdownViewer loading={true} content="some content" />);

    expect(screen.getByTestId('antd-spin')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<MarkdownViewer error="加载失败" content="some content" />);

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });

  it('truncates source exceeding 1MB', () => {
    const longContent = 'a'.repeat(1048577); // 1MB + 1
    render(<MarkdownViewer content={longContent} />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent?.length).toBe(1048576);
  });

  it('does not truncate source within 1MB limit', () => {
    const content = 'a'.repeat(1000);
    render(<MarkdownViewer content={content} />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent?.length).toBe(1000);
  });

  it('adds a11y attributes to container', () => {
    render(<MarkdownViewer content="test" />);

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Markdown 内容预览');
  });

  it('applies markdown-viewer class name', () => {
    render(<MarkdownViewer content="test" />);

    const region = screen.getByRole('region');
    expect(region.className).toContain('markdown-viewer');
  });

  it('appends custom className to markdown-viewer class', () => {
    render(<MarkdownViewer content="test" className="custom-class" />);

    const region = screen.getByRole('region');
    expect(region.className).toContain('markdown-viewer');
    expect(region.className).toContain('custom-class');
  });

  it('prioritizes loading state over error and content', () => {
    render(<MarkdownViewer loading={true} error="error" content="content" />);

    expect(screen.getByTestId('antd-spin')).toBeInTheDocument();
    expect(screen.queryByText('error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });

  it('prioritizes error state over content', () => {
    render(<MarkdownViewer error="error" content="content" />);

    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });
});
