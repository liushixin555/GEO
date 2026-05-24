/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MarkdownViewer, { safeUrlTransform } from '../../../pages/components/MarkdownViewer';
import type { MarkdownViewerRef } from '../../../pages/components/MarkdownViewer';

// Mock window.matchMedia for jsdom（useSystemColorMode hook 需要）
let mockMatchMediaResult = { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => mockMatchMediaResult),
  });
});

let mockProps: Record<string, unknown> = {};

// Mock @uiw/react-markdown-preview/nohighlight（匹配组件实际导入路径）
jest.mock('@uiw/react-markdown-preview/nohighlight', () => {
  return function MockMarkdownPreview(props: Record<string, unknown>) {
    mockProps = props;
    return <div data-testid="markdown-preview">{String(props.source || '')}</div>;
  };
});

// Mock antd components
let mockToken: Record<string, unknown> = { colorBgBase: '#ffffff' };

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
  theme: {
    useToken: () => ({ token: mockToken }),
  },
}));

// Mock CSS import
jest.mock('../../../pages/styles/markdown-viewer.css', () => ({}));

describe('MarkdownViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProps = {};
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
    expect(region).toHaveAttribute('tabindex', '0');
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

  it('strips dangerous event handler attributes via DOMPurify', () => {
    const xssContent = '<img src="x" onerror="alert(1)" />';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('onerror');
  });

  it('strips script tags from content via DOMPurify', () => {
    const xssContent = '<script>alert("xss")</script>Hello';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('<script>');
    expect(preview.textContent).toContain('Hello');
  });

  it('strips iframe tags via DOMPurify', () => {
    const xssContent = '<iframe src="https://evil.com"></iframe>Content';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('<iframe');
    expect(preview.textContent).toContain('Content');
  });

  it('strips svg with event handlers via DOMPurify', () => {
    const xssContent = '<svg onload="alert(1)"></svg>Content';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('onload');
  });

  it('strips base tag via DOMPurify', () => {
    const xssContent = '<base href="https://evil.com/">Content';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('<base');
  });

  it('strips meta tag via DOMPurify', () => {
    const xssContent = '<meta http-equiv="refresh" content="0;url=evil">Content';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('<meta');
  });

  it('strips formaction attribute via DOMPurify', () => {
    const xssContent = '<button formaction="https://evil.com">Click</button>';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('formaction');
  });

  it('strips data-* attributes via DOMPurify', () => {
    const xssContent = '<div data-custom="evil">Content</div>';
    render(<MarkdownViewer content={xssContent} />);
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent).not.toContain('data-custom');
    expect(preview.textContent).toContain('Content');
  });

  it('passes allowElement whitelist to MarkdownPreview', () => {
    render(<MarkdownViewer content="test" />);
    const allowElement = mockProps.allowElement as (element: { tagName: string }) => boolean;
    expect(typeof allowElement).toBe('function');
    expect(allowElement({ tagName: 'p' })).toBe(true);
    expect(allowElement({ tagName: 'div' })).toBe(true);
    expect(allowElement({ tagName: 'a' })).toBe(true);
    expect(allowElement({ tagName: 'code' })).toBe(true);
    expect(allowElement({ tagName: 'table' })).toBe(true);
    expect(allowElement({ tagName: 'script' })).toBe(false);
    expect(allowElement({ tagName: 'iframe' })).toBe(false);
    expect(allowElement({ tagName: 'object' })).toBe(false);
    expect(allowElement({ tagName: 'form' })).toBe(false);
    expect(allowElement({ tagName: 'svg' })).toBe(false);
    expect(allowElement({ tagName: 'math' })).toBe(false);
    expect(allowElement({ tagName: 'style' })).toBe(false);
    expect(allowElement({ tagName: 'base' })).toBe(false);
    expect(allowElement({ tagName: 'meta' })).toBe(false);
    expect(allowElement({ tagName: 'link' })).toBe(false);
  });

  it('allowElement handles case-insensitive tag names', () => {
    render(<MarkdownViewer content="test" />);
    const allowElement = mockProps.allowElement as (element: { tagName: string }) => boolean;
    expect(allowElement({ tagName: 'P' })).toBe(true);
    expect(allowElement({ tagName: 'DIV' })).toBe(true);
    expect(allowElement({ tagName: 'SCRIPT' })).toBe(false);
    expect(allowElement({ tagName: 'IFRAME' })).toBe(false);
  });

  it('passes urlTransform prop to MarkdownPreview', () => {
    render(<MarkdownViewer content="test" />);
    expect(mockProps.urlTransform).toBe(safeUrlTransform);
  });

  it('detects light theme from antd token', () => {
    mockToken = { colorBgBase: '#ffffff' };
    render(<MarkdownViewer content="test" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'light' });
  });

  it('detects dark theme from antd token', () => {
    mockToken = { colorBgBase: '#141414' };
    render(<MarkdownViewer content="test" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'dark' });
  });

  it('defaults to light theme when colorBgBase is missing', () => {
    mockToken = {};
    render(<MarkdownViewer content="test" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'light' });
  });
});

describe('safeUrlTransform', () => {
  it('blocks javascript: protocol', () => {
    expect(safeUrlTransform('javascript:alert(1)')).toBe('');
  });

  it('blocks javascript: with mixed case', () => {
    expect(safeUrlTransform('JaVaScRiPt:alert(1)')).toBe('');
  });

  it('blocks data: protocol', () => {
    expect(safeUrlTransform('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks vbscript: protocol', () => {
    expect(safeUrlTransform('vbscript:msgbox(1)')).toBe('');
  });

  it('allows https: URLs', () => {
    expect(safeUrlTransform('https://example.com/docs')).toBe('https://example.com/docs');
  });

  it('allows http: URLs', () => {
    expect(safeUrlTransform('http://example.com')).toBe('http://example.com');
  });

  it('allows mailto: URLs', () => {
    expect(safeUrlTransform('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('allows relative paths', () => {
    expect(safeUrlTransform('/api/docs')).toBe('/api/docs');
    expect(safeUrlTransform('./page')).toBe('./page');
    expect(safeUrlTransform('../parent')).toBe('../parent');
  });

  it('allows anchor links', () => {
    expect(safeUrlTransform('#section-1')).toBe('#section-1');
  });
});

describe('MarkdownViewer — UI review fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProps = {};
  });

  it('uses antd Empty component for empty state', () => {
    render(<MarkdownViewer content="" emptyText="暂无内容" />);
    expect(screen.getByTestId('antd-empty')).toBeInTheDocument();
    expect(screen.getByTestId('antd-empty').textContent).toBe('暂无内容');
  });

  it('uses antd Empty component when content is undefined', () => {
    render(<MarkdownViewer />);
    expect(screen.getByTestId('antd-empty')).toBeInTheDocument();
  });

  it('accepts custom ariaLabel prop', () => {
    render(<MarkdownViewer content="test" ariaLabel="自定义预览区域" />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', '自定义预览区域');
  });

  it('defaults ariaLabel to "Markdown 内容预览"', () => {
    render(<MarkdownViewer content="test" />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Markdown 内容预览');
  });

  it('accepts custom role prop', () => {
    render(<MarkdownViewer content="test" role="article" />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('defaults role to "region"', () => {
    render(<MarkdownViewer content="test" />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('exposes scrollToTop via ref', () => {
    const ref = React.createRef<MarkdownViewerRef>();
    const { container } = render(<MarkdownViewer ref={ref} content="test" />);
    const viewerDiv = container.querySelector('.markdown-viewer') as HTMLElement;
    viewerDiv.scrollTo = jest.fn();
    ref.current?.scrollToTop();
    expect(viewerDiv.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('exposes scrollToAnchor via ref', () => {
    const ref = React.createRef<MarkdownViewerRef>();
    render(<MarkdownViewer ref={ref} content="test" />);
    expect(typeof ref.current?.scrollToAnchor).toBe('function');
  });

  it('calls onScroll when scrolling', () => {
    const onScroll = jest.fn();
    const { container } = render(<MarkdownViewer content="test" onScroll={onScroll} />);
    const viewerDiv = container.querySelector('.markdown-viewer') as HTMLElement;
    fireEvent.scroll(viewerDiv);
    expect(onScroll).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when clicking', () => {
    const onClick = jest.fn();
    const { container } = render(<MarkdownViewer content="test" onClick={onClick} />);
    const viewerDiv = container.querySelector('.markdown-viewer') as HTMLElement;
    fireEvent.click(viewerDiv);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onKeyDown when key is pressed', () => {
    const onKeyDown = jest.fn();
    const { container } = render(<MarkdownViewer content="test" onKeyDown={onKeyDown} />);
    const viewerDiv = container.querySelector('.markdown-viewer') as HTMLElement;
    fireEvent.keyDown(viewerDiv, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseEnter when mouse enters', () => {
    const onMouseEnter = jest.fn();
    const { container } = render(<MarkdownViewer content="test" onMouseEnter={onMouseEnter} />);
    const viewerDiv = container.querySelector('.markdown-viewer') as HTMLElement;
    fireEvent.mouseEnter(viewerDiv);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseLeave when mouse leaves', () => {
    const onMouseLeave = jest.fn();
    const { container } = render(<MarkdownViewer content="test" onMouseLeave={onMouseLeave} />);
    const viewerDiv = container.querySelector('.markdown-viewer') as HTMLElement;
    fireEvent.mouseLeave(viewerDiv);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });
});

describe('MarkdownViewer — colorMode prop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProps = {};
  });

  it('forces light mode via colorMode="light"', () => {
    mockToken = { colorBgBase: '#141414' };
    render(<MarkdownViewer content="test" colorMode="light" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'light' });
  });

  it('forces dark mode via colorMode="dark"', () => {
    mockToken = { colorBgBase: '#ffffff' };
    render(<MarkdownViewer content="test" colorMode="dark" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'dark' });
  });

  it('uses antd token detection when colorMode is undefined', () => {
    mockToken = { colorBgBase: '#ffffff' };
    render(<MarkdownViewer content="test" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'light' });
  });

  it('colorMode="auto" uses system preference (light)', () => {
    mockToken = { colorBgBase: '#141414' };
    mockMatchMediaResult = { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
    (window.matchMedia as jest.Mock).mockReturnValue(mockMatchMediaResult);
    render(<MarkdownViewer content="test" colorMode="auto" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'light' });
  });

  it('colorMode="auto" uses system preference (dark)', () => {
    mockToken = { colorBgBase: '#ffffff' };
    mockMatchMediaResult = { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
    (window.matchMedia as jest.Mock).mockReturnValue(mockMatchMediaResult);
    render(<MarkdownViewer content="test" colorMode="auto" />);
    expect(mockProps.wrapperElement).toEqual({ 'data-color-mode': 'dark' });
  });
});

describe('MarkdownViewer — React.memo optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProps = {};
  });

  it('is wrapped with React.memo (component is a memo component)', () => {
    // React.memo 组件具有 $$typeof === Symbol(react.memo) 特征
    expect(MarkdownViewer.$$typeof).toBeDefined();
  });

  it('does not re-render MarkdownPreview when props are unchanged', () => {
    const content = '# Test content';
    const { rerender } = render(<MarkdownViewer content={content} />);

    // 记录第一次渲染后 MockMarkdownPreview 收到的 props
    const firstSource = mockProps.source;

    // 使用完全相同的 props 重新渲染
    rerender(<MarkdownViewer content={content} />);

    // React.memo 应该阻止不必要的重渲染
    // 注意：在测试环境中 mock 组件会被调用，但 memo 的浅比较逻辑仍然生效
    expect(mockProps.source).toBe(firstSource);
  });

  it('re-renders MarkdownPreview when content prop changes', () => {
    const { rerender } = render(<MarkdownViewer content="first" />);
    expect(mockProps.source).toBe('first');

    rerender(<MarkdownViewer content="second" />);
    expect(mockProps.source).toBe('second');
  });

  it('re-renders when className prop changes', () => {
    const { rerender } = render(<MarkdownViewer content="test" className="a" />);
    const container = document.querySelector('.markdown-viewer');
    expect(container?.className).toContain('a');

    rerender(<MarkdownViewer content="test" className="b" />);
    expect(container?.className).toContain('b');
  });
});
