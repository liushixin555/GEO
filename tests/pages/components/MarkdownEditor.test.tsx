/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MarkdownEditor from '../../../pages/components/MarkdownEditor';

// Mock window.matchMedia for jsdom
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

// Capture commandsFilter result
let capturedCommands: Record<string, any> = {};
let commandsFilterFn: ((command: any, isExtra: boolean) => any) | null = null;

// Mock @uiw/react-md-editor/nohighlight
jest.mock('@uiw/react-md-editor/nohighlight', () => {
  return function MockMDEditor(props: Record<string, unknown>) {
    // Extract commandsFilter from props and invoke it with test commands
    const filter = props.commandsFilter as ((command: any, isExtra: boolean) => any) | undefined;
    if (filter) {
      commandsFilterFn = filter;
    }
    return <div data-testid="md-editor">{String(props.value || '')}</div>;
  };
});

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((val: string) => val),
  __esModule: true,
  default: {
    sanitize: jest.fn((val: string) => val),
  },
}));

// Mock MarkdownViewer exports
jest.mock('../../../pages/components/MarkdownViewer', () => ({
  safeUrlTransform: (url: string) => url,
  SAFE_TAGS: new Set(['p', 'br', 'strong', 'em', 'a', 'code', 'pre']),
}));

// Mock antd
jest.mock('antd', () => ({
  Empty: ({ description }: { description: string }) => (
    <div data-testid="antd-empty">{description}</div>
  ),
}));

// Mock @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  FullscreenOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-fullscreen-icon" style={style} />
  ),
  FontSizeOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-fontsize-icon" style={style} />
  ),
  QuestionCircleOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-question-icon" style={style} />
  ),
  EditOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-edit-icon" style={style} />
  ),
  SplitCellsOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-splitcells-icon" style={style} />
  ),
  EyeOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-eye-icon" style={style} />
  ),
  LinkOutlined: ({ style }: { style?: React.CSSProperties }) => (
    <svg data-testid="antd-link-icon" style={style} />
  ),
}));

// Mock CSS import
jest.mock('../../../pages/styles/markdown-editor.css', () => ({}));

describe('MarkdownEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCommands = {};
    commandsFilterFn = null;
  });

  it('renders the editor with default props', () => {
    render(<MarkdownEditor value="test content" />);
    expect(screen.getByTestId('md-editor')).toBeInTheDocument();
  });

  it('passes value to MDEditor', () => {
    render(<MarkdownEditor value="hello world" />);
    expect(screen.getByTestId('md-editor')).toHaveTextContent('hello world');
  });

  describe('commandsFilter — fullscreen command override', () => {
    it('should override fullscreen command shortcuts to ctrlcmd+shift+f', () => {
      render(<MarkdownEditor value="" />);
      expect(commandsFilterFn).toBeTruthy();

      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );
      expect(result.shortcuts).toBe('ctrlcmd+shift+f');
    });

    it('should override fullscreen buttonProps to Chinese labels', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );
      expect(result.buttonProps['aria-label']).toBe('切换全屏模式');
      expect(result.buttonProps.title).toBe('切换全屏模式 (Ctrl+Shift+F)');
    });

    it('should override fullscreen icon with antd FullscreenOutlined', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );
      // The icon should be a React element (JSX)
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
    });

    it('should fix execute: dispatch called without shortcuts condition (button click)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );

      const mockDispatch = jest.fn();
      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };
      const mockExecuteCommandState = { fullscreen: false };

      // Simulate button click — shortcuts parameter is undefined
      result.execute({}, mockApi, mockDispatch, mockExecuteCommandState, undefined);

      // The fix: dispatch should be called even without shortcuts
      expect(mockDispatch).toHaveBeenCalledWith({ fullscreen: true });
      expect(mockFocus).toHaveBeenCalled();
    });

    it('should fix execute: dispatch called when shortcuts is provided (keyboard)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );

      const mockDispatch = jest.fn();
      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };
      const mockExecuteCommandState = { fullscreen: true };

      // Simulate keyboard shortcut — shortcuts parameter is provided
      result.execute({}, mockApi, mockDispatch, mockExecuteCommandState, ['ctrlcmd+shift+f']);

      expect(mockDispatch).toHaveBeenCalledWith({ fullscreen: false });
      expect(mockFocus).toHaveBeenCalled();
    });

    it('should not dispatch when dispatch is undefined', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );

      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };

      result.execute({}, mockApi, undefined, { fullscreen: false }, undefined);

      expect(mockFocus).not.toHaveBeenCalled();
    });

    it('should not dispatch when executeCommandState is undefined', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );

      const mockDispatch = jest.fn();
      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };

      result.execute({}, mockApi, mockDispatch, undefined, undefined);

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockFocus).not.toHaveBeenCalled();
    });

    it('should toggle fullscreen state correctly', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'fullscreen', shortcuts: 'ctrlcmd+0' },
        false,
      );

      const mockDispatch = jest.fn();
      const mockApi = { textArea: { focus: jest.fn() } };

      // First toggle: false → true
      result.execute({}, mockApi, mockDispatch, { fullscreen: false }, undefined);
      expect(mockDispatch).toHaveBeenLastCalledWith({ fullscreen: true });

      // Second toggle: true → false
      result.execute({}, mockApi, mockDispatch, { fullscreen: true }, undefined);
      expect(mockDispatch).toHaveBeenLastCalledWith({ fullscreen: false });
    });
  });

  describe('commandsFilter — help command safe override', () => {
    it('should override help command with safe noopener+noreferrer', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);
      expect(result).not.toBe(false);
      expect(result).toBeTruthy();

      // Verify execute uses noopener+noreferrer
      const mockOpen = jest.spyOn(window, 'open').mockReturnValue({} as Window);
      result.execute();
      expect(mockOpen).toHaveBeenCalledWith(
        'https://www.markdownguide.org/basic-syntax/',
        '_blank',
        'noopener,noreferrer',
      );
      mockOpen.mockRestore();
    });

    it('should fallback to window.location.href when popup is blocked', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);

      // Mock window.open to return null (popup blocked)
      const mockOpen = jest.spyOn(window, 'open').mockReturnValue(null);
      // Capture assignment to window.location.href
      const originalLocation = window.location;
      const hrefSetter = jest.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        get: () => ({ ...originalLocation, set href(val: string) { hrefSetter(val); } }),
      });

      result.execute();
      expect(hrefSetter).toHaveBeenCalledWith('https://www.markdownguide.org/basic-syntax/');

      mockOpen.mockRestore();
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('should fallback when window.open returns closed window', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);

      const closedWindow = { closed: true } as unknown as Window;
      const mockOpen = jest.spyOn(window, 'open').mockReturnValue(closedWindow);
      const originalLocation = window.location;
      const hrefSetter = jest.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        get: () => ({ ...originalLocation, set href(val: string) { hrefSetter(val); } }),
      });

      result.execute();
      expect(hrefSetter).toHaveBeenCalledWith('https://www.markdownguide.org/basic-syntax/');

      mockOpen.mockRestore();
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('should use Chinese ARIA labels for help button', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);
      expect(result.buttonProps['aria-label']).toBe('打开 Markdown 语法帮助（外部链接）');
      expect(result.buttonProps.title).toBe('打开 Markdown 语法帮助 (F1)');
    });

    it('should override help icon with antd QuestionCircleOutlined', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
    });

    it('should add F1 keyboard shortcut for help', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);
      expect(result.shortcuts).toBe('f1');
    });

    // ARCH-H1: SSR 安全——window 不存在时 execute 不崩溃
    it('should not crash when window is undefined (SSR safety)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);

      const originalWindow = global.window;
      // @ts-expect-error — 模拟 SSR 环境
      delete global.window;

      expect(() => {
        result.execute();
      }).not.toThrow();

      global.window = originalWindow;
    });

    // ARCH-L2: 错误边界——window.open 抛出异常时 execute 不崩溃
    it('should handle window.open throwing error gracefully (ARCH-L2)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);

      const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => {
        throw new Error('CSP blocked window.open');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        result.execute();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] help 命令执行失败:',
        expect.any(Error),
      );

      mockOpen.mockRestore();
      consoleSpy.mockRestore();
    });

    // ARCH-M2: 弹窗拦截可观测性——console.warn 输出降级日志
    it('should log console.warn when popup is blocked (ARCH-M2)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);

      const mockOpen = jest.spyOn(window, 'open').mockReturnValue(null);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocation = window.location;
      const hrefSetter = jest.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        get: () => ({ ...originalLocation, set href(val: string) { hrefSetter(val); } }),
      });

      result.execute();

      expect(warnSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] help 命令: 弹窗被拦截，降级为同窗口导航',
      );
      expect(hrefSetter).toHaveBeenCalledWith('https://www.markdownguide.org/basic-syntax/');

      mockOpen.mockRestore();
      warnSpy.mockRestore();
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    // ARCH-H2: 常量验证——HELP_URL 使用模块级常量
    it('should use centralized HELP_URL constant', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);

      const mockOpen = jest.spyOn(window, 'open').mockReturnValue({} as Window);
      result.execute();
      expect(mockOpen).toHaveBeenCalledWith(
        'https://www.markdownguide.org/basic-syntax/',
        '_blank',
        'noopener,noreferrer',
      );
      mockOpen.mockRestore();
    });
  });

  describe('commandsFilter — issue command defensive override', () => {
    const createIssueCommand = () => ({
      name: 'issue',
      keyCommand: 'issue',
      prefix: '#',
      suffix: '',
      buttonProps: { 'aria-label': 'Add issue', title: 'Add issue' },
      execute: jest.fn(),
    });

    const createMockApi = () => ({
      setSelectionRange: jest.fn((range: { start: number; end: number }) => ({
        selectedText: 'test',
      })),
      replaceSelection: jest.fn(),
    });

    it('should use Chinese ARIA labels for buttonProps', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createIssueCommand(), false);
      expect(result.buttonProps['aria-label']).toBe('插入 Issue 引用 (#)');
      expect(result.buttonProps.title).toBe('插入 Issue 引用 (#)');
    });

    it('should replace icon with 16px SVG with aria-hidden and title', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createIssueCommand(), false);
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
      expect(result.icon.props.width).toBe('16');
      expect(result.icon.props.height).toBe('16');
      expect(result.icon.props['aria-hidden']).toBe('true');
      // SVG should have <title> and <path> as children
      const children = React.Children.toArray(result.icon.props.children);
      const titleEl = children.find((c: any) => c.type === 'title');
      expect(titleEl).toBeTruthy();
      expect((titleEl as any).props.children).toBe('Issue 引用');
    });

    it('should skip execution when prefix is missing (S1/Q4)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 2, end: 2 }, command: { prefix: undefined } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
      expect(api.setSelectionRange).not.toHaveBeenCalled();
    });

    it('should skip execution at line start to prevent H1 collision (ARCH-CRITICAL-1)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // Cursor at line start (position 0)
      result.execute(
        { text: 'Hello world', selection: { start: 0, end: 0 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip execution when beforeCursor is only # (H1 heading)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // Text: "# Title", cursor at position 2 (after "# ")
      result.execute(
        { text: '# Title', selection: { start: 2, end: 2 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip at line start after newline', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // Cursor at start of second line (position 6, right after \n)
      result.execute(
        { text: 'Hello\nWorld', selection: { start: 6, end: 6 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should call original execute for valid mid-line position', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // Cursor at position 3 within "Hello" (mid-line)
      const state = {
        text: 'Hello world',
        selection: { start: 3, end: 3 },
        command: { prefix: '#' },
      };
      result.execute(state, api);

      expect(cmd.execute).toHaveBeenCalledWith(state, api);
    });

    it('should call original execute after # in mid-line (e.g., #123)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // Text: "See #123 for", cursor at position 7 (after #123)
      const state = {
        text: 'See #123 for',
        selection: { start: 7, end: 7 },
        command: { prefix: '#' },
      };
      result.execute(state, api);

      // "See " before cursor is not empty and not just "#", so should proceed
      expect(cmd.execute).toHaveBeenCalledWith(state, api);
    });

    it('should handle execution error gracefully (S2)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = {
        ...createIssueCommand(),
        execute: jest.fn(() => { throw new Error('selectWord crash'); }),
      };
      const result = commandsFilterFn!(cmd, false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: { start: 3, end: 3 }, command: { prefix: '#' } },
          api,
        );
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] issue 命令执行失败:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('should not crash when state.text is undefined', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: undefined as any, selection: { start: 0, end: 0 }, command: { prefix: '#' } },
          api,
        );
      }).not.toThrow();
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should not crash when state.selection is null', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: null as any, command: { prefix: '#' } },
          api,
        );
      }).not.toThrow();
    });

    // S3: 选区范围校验——start < 0 / end < start / end > text.length 均应跳过
    it('should skip when selection.start is negative (S3)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: -1, end: 3 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip when selection.end < selection.start (S3)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 4, end: 2 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip when selection.end exceeds text.length (S3)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 2, end: 100 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip when text is not a string (S3)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 123 as any, selection: { start: 1, end: 2 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    // S4: 标题语义碰撞检测——H1~H6 标题行应跳过
    it('should skip on H1 heading line (# Title) (S4)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: '# Important Notice', selection: { start: 10, end: 10 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip on H2 heading line (## Subtitle) (S4)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: '## Section Title', selection: { start: 10, end: 10 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip on H3 heading line (### Subtitle) (S4)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: '### Deep Heading', selection: { start: 10, end: 10 }, command: { prefix: '#' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should allow issue command on non-heading # in mid-text (S4)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createIssueCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // Line starts with "See " (not heading), cursor after "See #123"
      const state = {
        text: 'See #123 for details',
        selection: { start: 8, end: 8 },
        command: { prefix: '#' },
      };
      result.execute(state, api);

      expect(cmd.execute).toHaveBeenCalledWith(state, api);
    });
  });

  describe('commandsFilter — quote command override', () => {
    const createQuoteCommand = () => ({
      name: 'quote',
      keyCommand: 'quote',
      shortcuts: 'ctrlcmd+q',
      prefix: '> ',
      buttonProps: { 'aria-label': 'Insert a quote (ctrl + q)', title: 'Insert a quote (ctrl + q)' },
      execute: jest.fn(),
    });

    const createMockApi = () => ({
      setSelectionRange: jest.fn((range: { start: number; end: number }) => ({
        selectedText: 'test',
        text: 'test text',
        selection: range,
      })),
      replaceSelection: jest.fn(),
    });

    it('should override shortcut from ctrlcmd+q to ctrlcmd+shift+q (P1-1)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createQuoteCommand(), false);
      expect(result.shortcuts).toBe('ctrlcmd+shift+q');
    });

    it('should use Chinese ARIA labels (P2-1)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createQuoteCommand(), false);
      expect(result.buttonProps['aria-label']).toBe('插入引用 (Ctrl+Shift+Q)');
      expect(result.buttonProps.title).toBe('插入引用 (Ctrl+Shift+Q)');
    });

    it('should wrap execute with defensive guard and call original (S1)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();
      const state = {
        text: 'Hello world',
        selection: { start: 0, end: 5 },
        command: { prefix: '> ' },
      };

      result.execute(state, api);
      expect(cmd.execute).toHaveBeenCalledWith(state, api);
    });

    it('should skip execution when prefix is missing (S1)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 0, end: 5 }, command: { prefix: undefined } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip execution when text is not a string (S1)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: undefined as any, selection: { start: 0, end: 0 }, command: { prefix: '> ' } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip execution when selection.start is null', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: null as any, end: 5 }, command: { prefix: '> ' } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip execution when selection is out of bounds', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hi', selection: { start: 0, end: 100 }, command: { prefix: '> ' } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip execution when start < 0', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: -1, end: 3 }, command: { prefix: '> ' } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should skip execution when start > end', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 4, end: 2 }, command: { prefix: '> ' } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should handle execution error gracefully (Q-6)', () => {
      render(<MarkdownEditor value="" />);
      const cmd = {
        ...createQuoteCommand(),
        execute: jest.fn(() => { throw new Error('insertBeforeEachLine crash'); }),
      };
      const result = commandsFilterFn!(cmd, false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: { start: 0, end: 5 }, command: { prefix: '> ' } },
          api,
        );
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] quote 命令执行失败:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('should not crash when state.selection is null', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createQuoteCommand();
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: null as any, command: { prefix: '> ' } },
          api,
        );
      }).not.toThrow();
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should not wrap commands without execute', () => {
      render(<MarkdownEditor value="" />);
      const cmd = {
        name: 'quote',
        keyCommand: 'quote',
        shortcuts: 'ctrlcmd+q',
        prefix: '> ',
        execute: undefined,
      };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });
  });

  describe('commandsFilter — other commands pass through', () => {
    it('should pass through unknown commands unchanged', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'unknownCommand', shortcuts: 'ctrlcmd+z' };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });
  });

  describe('commandsFilter — italic/bold/strikethrough defensive override', () => {
    const createFormattingCommand = (name: string, prefix: string) => ({
      name,
      keyCommand: name,
      shortcuts: `ctrlcmd+${name[0]}`,
      prefix,
      buttonProps: { 'aria-label': `Add ${name} text`, title: `Add ${name} text` },
      execute: jest.fn(),
    });

    const createMockApi = () => ({
      setSelectionRange: jest.fn((range: { start: number; end: number }) => ({
        selectedText: 'test',
      })),
      replaceSelection: jest.fn(),
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should wrap $name command execute with defensive guard', ({ name, prefix }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, prefix);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();
      const state = {
        text: 'Hello world',
        selection: { start: 0, end: 5 },
        command: { prefix },
      };

      result.execute(state, api);
      expect(cmd.execute).toHaveBeenCalledWith(state, api);
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should skip $name execution when prefix is missing (SEC-M1)', ({ name }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, '*');
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 0, end: 5 }, command: { prefix: undefined } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should skip $name execution when text is not a string (SEC-M2)', ({ name, prefix }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, prefix);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: undefined as any, selection: { start: 0, end: 0 }, command: { prefix } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should skip $name execution when selection is out of bounds (SEC-M2)', ({ name, prefix }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, prefix);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      // end > text.length
      result.execute(
        { text: 'Hi', selection: { start: 0, end: 100 }, command: { prefix } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should skip $name execution when start < 0 (SEC-M2)', ({ name, prefix }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, prefix);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: -1, end: 3 }, command: { prefix } },
        api,
      );
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should handle $name execution error gracefully (QUAL-L2)', ({ name, prefix }) => {
      render(<MarkdownEditor value="" />);
      const cmd = {
        ...createFormattingCommand(name, prefix),
        execute: jest.fn(() => { throw new Error('selectWord crash'); }),
      };
      const result = commandsFilterFn!(cmd, false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: { start: 0, end: 5 }, command: { prefix } },
          api,
        );
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        `[MarkdownEditor] 命令 "${name}" 执行失败:`,
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it.each([
      { name: 'italic', prefix: '*' },
      { name: 'bold', prefix: '**' },
      { name: 'strikethrough', prefix: '~~' },
    ])('should not crash when $name state.selection is null', ({ name, prefix }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, prefix);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: null as any, command: { prefix } },
          api,
        );
      }).not.toThrow();
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should not wrap commands without execute', () => {
      render(<MarkdownEditor value="" />);
      const cmd = {
        name: 'italic',
        keyCommand: 'italic',
        shortcuts: 'ctrlcmd+i',
        prefix: '*',
        execute: undefined,
      };
      const result = commandsFilterFn!(cmd, false);
      // Should return the original command unchanged (no execute to wrap)
      expect(result).toBe(cmd);
    });

    // I18N-01: 中文 ARIA 标注——渲染时即生效
    it.each([
      { name: 'bold', expectedLabel: '粗体 (Ctrl+B)' },
      { name: 'italic', expectedLabel: '斜体 (Ctrl+I)' },
      { name: 'strikethrough', expectedLabel: '删除线' },
    ])('should use Chinese buttonProps for $name (I18N-01)', ({ name, expectedLabel }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createFormattingCommand(name, name === 'bold' ? '**' : name === 'italic' ? '*' : '~~');
      const result = commandsFilterFn!(cmd, false);
      expect(result.buttonProps['aria-label']).toBe(expectedLabel);
      expect(result.buttonProps.title).toBe(expectedLabel);
    });
  });

  describe('commandsFilter — table command override', () => {
    const createTableCommand = () => ({
      name: 'table',
      keyCommand: 'table',
      prefix: '\n| Header | Header |\n|--------|--------|\n| Cell | Cell |\n| Cell | Cell |\n| Cell | Cell |\n\n',
      suffix: '',
      buttonProps: { 'aria-label': 'Add table', title: 'Add table' },
      execute: jest.fn(),
    });

    const createMockApi = () => ({
      setSelectionRange: jest.fn(),
      replaceSelection: jest.fn(),
    });

    // UI-P2: 快捷键覆盖
    it('should override table shortcut to ctrlcmd+shift+t', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      expect(result.shortcuts).toBe('ctrlcmd+shift+t');
    });

    // UI-P3: 中文 ARIA 标签
    it('should use Chinese ARIA labels', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      expect(result.buttonProps['aria-label']).toBe('插入表格 (Ctrl+Shift+T)');
      expect(result.buttonProps.title).toBe('插入表格 (Ctrl+Shift+T)');
    });

    // QUALITY-L4/SEC-L4/UI-P3: SVG 无障碍
    it('should replace icon with 16px SVG with aria-hidden, title, and focusable', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
      expect(result.icon.props.width).toBe('16');
      expect(result.icon.props.height).toBe('16');
      expect(result.icon.props['aria-hidden']).toBe('true');
      expect(result.icon.props.focusable).toBe('false');
      expect(result.icon.props.role).toBe('img');
      // SVG should have <title> and <path> as children
      const children = React.Children.toArray(result.icon.props.children);
      const titleEl = children.find((c: any) => c.type === 'title');
      expect(titleEl).toBeTruthy();
      expect((titleEl as any).props.children).toBe('表格');
    });

    // ARCH-H1/H2: 纯模板插入——空文档
    it('should insert Chinese table template at cursor in empty text', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      result.execute({ text: '', selection: { start: 0, end: 0 } }, api);

      expect(api.setSelectionRange).toHaveBeenCalledWith({ start: 0, end: 0 });
      const inserted = api.replaceSelection.mock.calls[0][0];
      expect(inserted).toContain('表头');
      expect(inserted).toContain('内容');
    });

    // ARCH-H1: 无 toggle，始终插入
    it('should always insert template (no toggle)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      // 光标在已有表格内
      const state = {
        text: '\n| 已编辑 | 已编辑 |\n|------|------|\n| 数据 | 数据 |\n',
        selection: { start: 5, end: 5 },
      };
      result.execute(state, api);

      // 应插入新表格（加前缀空行分隔），而非移除
      expect(api.replaceSelection).toHaveBeenCalled();
      const inserted = api.replaceSelection.mock.calls[0][0];
      expect(inserted).toContain('表头');
      // 因为光标在已有表格行内，应该加空行分隔
      expect(inserted.startsWith('\n\n')).toBe(true);
    });

    // SEC-L2: 选区边界校验
    it('should clamp selection start to text boundaries (SEC-L2)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      result.execute({ text: 'Hello', selection: { start: 100, end: 100 } }, api);

      expect(api.setSelectionRange).toHaveBeenCalledWith({ start: 5, end: 5 });
    });

    // QUALITY-L3/SEC-M1: 空文本防护
    it('should return early when text is empty', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      result.execute({ text: '', selection: { start: 0, end: 0 } }, api);

      // 空文本应正常插入（start 0 不越界）
      expect(api.replaceSelection).toHaveBeenCalled();
    });

    // QUALITY-L3/SEC-M1: text 缺失防护
    it('should return early when text is undefined', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      result.execute({ text: undefined as any, selection: { start: 0, end: 0 } }, api);

      expect(api.replaceSelection).not.toHaveBeenCalled();
    });

    // SEC-M1: selection.start 缺失防护
    it('should return early when selection.start is null', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      result.execute({ text: 'Hello', selection: { start: null as any, end: 0 } }, api);

      expect(api.replaceSelection).not.toHaveBeenCalled();
    });

    // SEC-M1: selection 缺失防护
    it('should return early when selection is null', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      expect(() => {
        result.execute({ text: 'Hello', selection: null as any }, api);
      }).not.toThrow();
      expect(api.replaceSelection).not.toHaveBeenCalled();
    });

    // SEC-L2: start > end 检测
    it('should return early when start > end', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      result.execute({ text: 'Hello', selection: { start: 4, end: 2 } }, api);

      expect(api.replaceSelection).not.toHaveBeenCalled();
    });

    // SEC-L3: 超长文本防护
    it('should return early when text exceeds 1MB limit (SEC-L3)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      const longText = 'a'.repeat(1_000_001);
      result.execute({ text: longText, selection: { start: 5, end: 5 } }, api);

      expect(api.replaceSelection).not.toHaveBeenCalled();
    });

    // SEC-L3: 1MB 边界内正常工作
    it('should work when text is exactly at 1MB limit', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      const exactLimitText = 'a'.repeat(1_000_000);
      result.execute({ text: exactLimitText, selection: { start: 5, end: 5 } }, api);

      expect(api.replaceSelection).toHaveBeenCalled();
    });

    // 光标在表格行内时加空行分隔
    it('should add leading newline when cursor is inside an existing table', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      const state = {
        text: '| A | B |\n|---|---|\n| 1 | 2 |',
        selection: { start: 5, end: 5 },
      };
      result.execute(state, api);

      const inserted = api.replaceSelection.mock.calls[0][0];
      expect(inserted.startsWith('\n\n')).toBe(true);
    });

    // 光标在普通文本行内时不需要额外空行
    it('should not add extra separator when cursor is in normal text', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const api = createMockApi();

      const state = {
        text: 'Hello world',
        selection: { start: 5, end: 5 },
      };
      result.execute(state, api);

      const inserted = api.replaceSelection.mock.calls[0][0];
      expect(inserted.startsWith('\n|')).toBe(true);
      expect(inserted.startsWith('\n\n')).toBe(false);
    });

    // 错误边界
    it('should handle execution error gracefully', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createTableCommand(), false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const api = {
        setSelectionRange: jest.fn(() => { throw new Error('test error'); }),
        replaceSelection: jest.fn(),
      };

      expect(() => {
        result.execute({ text: 'Hello', selection: { start: 0, end: 0 } }, api);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] table 命令执行失败:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    // 不影响其他命令
    it('should not affect non-table commands', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'otherCommand', keyCommand: 'other' };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });
  });

  describe('commandsFilter — hr command override', () => {
    it('should override hr shortcut from ctrlcmd+h to ctrlcmd+shift+h', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );
      expect(result.shortcuts).toBe('ctrlcmd+shift+h');
    });

    it('should use Chinese ARIA labels', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );
      expect(result.buttonProps['aria-label']).toBe('插入水平分割线 (Ctrl+Shift+H)');
      expect(result.buttonProps.title).toBe('插入水平分割线 (Ctrl+Shift+H)');
    });

    it('should replace SVG icon with horizontal line', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
      // SVG should have role="img" and aria-hidden="true"
      const svg = result.icon;
      expect(svg.props.role).toBe('img');
      expect(svg.props['aria-hidden']).toBe('true');
      expect(svg.props.viewBox).toBe('0 0 12 12');
    });

    it('should insert HR at cursor when no existing HR', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockReplaceSelection = jest.fn();
      const mockSetSelectionRange = jest.fn();
      const mockApi = {
        replaceSelection: mockReplaceSelection,
        setSelectionRange: mockSetSelectionRange,
      };

      // Cursor at start of "World" line (position 6, right after \n)
      const state = {
        text: 'Hello\nWorld',
        selection: { start: 6, end: 6 },
        command: { prefix: '\n\n---\n', suffix: '' },
      };

      result.execute(state, mockApi);

      expect(mockSetSelectionRange).toHaveBeenCalledWith({ start: 6, end: 6 });
      // No extra leading newline needed since previous char is \n
      expect(mockReplaceSelection).toHaveBeenCalledWith('\n---\n');
    });

    it('should insert HR with leading newline when cursor is mid-line', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockReplaceSelection = jest.fn();
      const mockSetSelectionRange = jest.fn();
      const mockApi = {
        replaceSelection: mockReplaceSelection,
        setSelectionRange: mockSetSelectionRange,
      };

      // Cursor at position 3 within "Hello" (not at line start)
      const state = {
        text: 'Hello\nWorld',
        selection: { start: 3, end: 3 },
        command: { prefix: '\n\n---\n', suffix: '' },
      };

      result.execute(state, mockApi);

      // Should add leading newline since previous char is not \n
      expect(mockReplaceSelection).toHaveBeenCalledWith('\n\n---\n');
    });

    it('should remove existing --- line', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockReplaceSelection = jest.fn();
      const mockSetSelectionRange = jest.fn();
      const mockApi = {
        replaceSelection: mockReplaceSelection,
        setSelectionRange: mockSetSelectionRange,
      };

      // Cursor on the --- line
      const state = {
        text: 'Hello\n---\nWorld',
        selection: { start: 7, end: 7 },
        command: { prefix: '\n\n---\n', suffix: '' },
      };

      result.execute(state, mockApi);

      // Should select the --- line (from position 6 to 9)
      expect(mockSetSelectionRange).toHaveBeenCalledWith({ start: 6, end: 9 });
      // Should delete with replaceSelection('')
      expect(mockReplaceSelection).toHaveBeenCalledWith('');
    });

    it('should remove existing *** line', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockReplaceSelection = jest.fn();
      const mockSetSelectionRange = jest.fn();
      const mockApi = {
        replaceSelection: mockReplaceSelection,
        setSelectionRange: mockSetSelectionRange,
      };

      const state = {
        text: 'Hello\n***\nWorld',
        selection: { start: 7, end: 7 },
        command: { prefix: '\n\n---\n', suffix: '' },
      };

      result.execute(state, mockApi);
      expect(mockReplaceSelection).toHaveBeenCalledWith('');
    });

    it('should remove existing ___ line', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockReplaceSelection = jest.fn();
      const mockSetSelectionRange = jest.fn();
      const mockApi = {
        replaceSelection: mockReplaceSelection,
        setSelectionRange: mockSetSelectionRange,
      };

      const state = {
        text: 'Hello\n___\nWorld',
        selection: { start: 7, end: 7 },
        command: { prefix: '\n\n---\n', suffix: '' },
      };

      result.execute(state, mockApi);
      expect(mockReplaceSelection).toHaveBeenCalledWith('');
    });

    it('should handle error gracefully without crashing', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockApi = {
        replaceSelection: jest.fn(() => { throw new Error('test error'); }),
        setSelectionRange: jest.fn(),
      };

      // Should not throw
      expect(() => {
        result.execute(
          { text: 'Hello', selection: { start: 0, end: 0 }, command: {} },
          mockApi,
        );
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] hr 命令执行失败:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('should return early when text is empty', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockApi = {
        replaceSelection: jest.fn(),
        setSelectionRange: jest.fn(),
      };

      result.execute({ text: '', selection: { start: 0, end: 0 } }, mockApi);

      expect(mockApi.replaceSelection).not.toHaveBeenCalled();
      expect(mockApi.setSelectionRange).not.toHaveBeenCalled();
    });

    it('should return early when selection.start is null', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { name: 'hr', shortcuts: 'ctrlcmd+h', prefix: '\n\n---\n', suffix: '' },
        false,
      );

      const mockApi = {
        replaceSelection: jest.fn(),
        setSelectionRange: jest.fn(),
      };

      result.execute({ text: 'Hello', selection: { start: null as any, end: 0 } }, mockApi);

      expect(mockApi.replaceSelection).not.toHaveBeenCalled();
    });
  });

  describe('commandsFilter — group command override', () => {
    it('should detect group command by keyCommand', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { keyCommand: 'group', name: 'title', groupName: 'title', children: [] },
        false,
      );
      expect(result).toBeTruthy();
      expect(result).not.toBe(false);
    });

    it('should replace icon with antd FontSizeOutlined', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { keyCommand: 'group', name: 'title', groupName: 'title', children: [] },
        false,
      );
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
    });

    it('should inject Chinese ARIA labels', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        { keyCommand: 'group', name: 'title', groupName: 'title', children: [] },
        false,
      );
      expect(result.buttonProps['aria-label']).toBe('选择标题级别');
      expect(result.buttonProps['aria-haspopup']).toBe('menu');
      expect(result.buttonProps.title).toBe('选择标题级别');
    });

    it('should preserve existing buttonProps when adding ARIA', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(
        {
          keyCommand: 'group',
          name: 'title',
          groupName: 'title',
          children: [],
          buttonProps: { 'data-custom': 'value', className: 'my-btn' },
        },
        false,
      );
      expect(result.buttonProps['data-custom']).toBe('value');
      expect(result.buttonProps.className).toBe('my-btn');
      expect(result.buttonProps['aria-label']).toBe('选择标题级别');
    });

    it('should not affect non-group commands with children', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'list', keyCommand: 'unorderedList', children: [] };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });
  });

  describe('commandsFilter — image command override', () => {
    const createImageCommand = () => ({
      name: 'image',
      keyCommand: 'image',
      shortcuts: 'ctrlcmd+k',
      prefix: '![image](',
      suffix: ')',
      buttonProps: { 'aria-label': 'Add image (ctrl + k)', title: 'Add image (ctrl + k)' },
    });

    const createMockApi = () => ({
      replaceSelection: jest.fn(),
      setSelectionRange: jest.fn(),
    });

    it('should override shortcuts from ctrlcmd+k to ctrlcmd+shift+k', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      expect(result.shortcuts).toBe('ctrlcmd+shift+k');
    });

    it('should use Chinese ARIA labels', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      expect(result.buttonProps['aria-label']).toBe('插入图片 (Ctrl+Shift+K)');
      expect(result.buttonProps.title).toBe('插入图片 (Ctrl+Shift+K)');
    });

    it('should replace icon with 16px SVG with aria-hidden and focusable', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
      expect(result.icon.props.width).toBe('16');
      expect(result.icon.props.height).toBe('16');
      expect(result.icon.props['aria-hidden']).toBe('true');
      expect(result.icon.props.focusable).toBe('false');
    });

    it('should wrap valid https URL as image', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'See https://img.com/a.png here',
        selection: { start: 4, end: 26 },
      };
      result.execute(state, api);
      expect(api.setSelectionRange).toHaveBeenCalledWith({ start: 4, end: 26 });
      expect(api.replaceSelection).toHaveBeenCalledWith('![image](https://img.com/a.png)');
    });

    it('should wrap valid http URL as image', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'Link: http://example.com/img.jpg end',
        selection: { start: 6, end: 32 },
      };
      result.execute(state, api);
      expect(api.replaceSelection).toHaveBeenCalledWith('![image](http://example.com/img.jpg)');
    });

    it('should NOT treat "the http protocol" as URL', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'See the http protocol here',
        selection: { start: 4, end: 19 },
      };
      result.execute(state, api);
      expect(api.replaceSelection).not.toHaveBeenCalledWith(
        expect.stringContaining('![image]('),
      );
      expect(api.replaceSelection).toHaveBeenCalledWith(
        expect.stringMatching(/^!\[.*\]\(\)$/),
      );
    });

    it('should NOT treat "www example" as URL', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'Use www example here',
        selection: { start: 4, end: 14 },
      };
      result.execute(state, api);
      expect(api.replaceSelection).not.toHaveBeenCalledWith(
        expect.stringContaining('![image]('),
      );
    });

    it('should insert placeholder when selection is empty', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'Hello world',
        selection: { start: 5, end: 5 },
      };
      result.execute(state, api);
      expect(api.replaceSelection).toHaveBeenCalledWith('![image](url)');
    });

    it('should wrap selected text as alt with empty URL', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'This is my logo here',
        selection: { start: 8, end: 16 },
      };
      result.execute(state, api);
      expect(api.replaceSelection).toHaveBeenCalledWith('![my logo]()');
    });

    it('should escape Markdown special characters in alt text', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'See img](x)![y here',
        selection: { start: 4, end: 16 },
      };
      result.execute(state, api);
      const call = api.replaceSelection.mock.calls[0][0];
      expect(call).toContain('![');
      expect(call).toContain(']()');
      expect(call).toContain('\\]');
      expect(call).toContain('\\[');
    });

    it('should clamp selection to text boundaries', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'Hello',
        selection: { start: 3, end: 100 },
      };
      result.execute(state, api);
      expect(api.setSelectionRange).toHaveBeenCalledWith({ start: 3, end: 5 });
    });

    it('should handle negative start gracefully', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      const state = {
        text: 'Hello',
        selection: { start: -5, end: 3 },
      };
      result.execute(state, api);
      expect(api.setSelectionRange).toHaveBeenCalledWith({ start: 0, end: 3 });
    });

    it('should return early when text is empty', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      result.execute({ text: '', selection: { start: 0, end: 0 } }, api);
      expect(api.replaceSelection).not.toHaveBeenCalled();
      expect(api.setSelectionRange).not.toHaveBeenCalled();
    });

    it('should return early when selection.start is null', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const api = createMockApi();
      result.execute({ text: 'Hello', selection: { start: null as any, end: 0 } }, api);
      expect(api.replaceSelection).not.toHaveBeenCalled();
    });

    it('should handle execution error gracefully', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createImageCommand(), false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const api = {
        setSelectionRange: jest.fn(() => { throw new Error('test error'); }),
        replaceSelection: jest.fn(),
      };
      expect(() => {
        result.execute(
          { text: 'Hello', selection: { start: 0, end: 0 } },
          api,
        );
      }).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] image 命令执行失败:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('commandsFilter — preview/edit/live mode command override', () => {
    const createPreviewCommand = (name: string, shortcut: string) => ({
      name,
      keyCommand: 'preview',
      value: name,
      shortcuts: shortcut,
      buttonProps: { 'aria-label': `${name} code`, title: `${name} code` },
      execute: jest.fn(),
    });

    it.each([
      { name: 'edit', shortcut: 'ctrlcmd+7', expectedLabel: '编辑模式 (Ctrl+7)' },
      { name: 'live', shortcut: 'ctrlcmd+8', expectedLabel: '实时预览 (Ctrl+8)' },
      { name: 'preview', shortcut: 'ctrlcmd+9', expectedLabel: '预览模式 (Ctrl+9)' },
    ])('should override $name command with Chinese buttonProps', ({ name, shortcut, expectedLabel }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand(name, shortcut), false);
      expect(result.buttonProps['aria-label']).toBe(expectedLabel);
      expect(result.buttonProps.title).toBe(expectedLabel);
    });

    it.each([
      { name: 'edit' },
      { name: 'live' },
      { name: 'preview' },
    ])('should replace $name SVG with antd icon', ({ name }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand(name, 'ctrlcmd+9'), false);
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
      // Verify icon has fontSize: 16 (Carbon standard)
      expect(result.icon.props.style?.fontSize).toBe(16);
    });

    it.each([
      { name: 'edit', shortcut: 'ctrlcmd+7' },
      { name: 'live', shortcut: 'ctrlcmd+8' },
      { name: 'preview', shortcut: 'ctrlcmd+9' },
    ])('should fix execute: dispatch called on button click (no shortcuts) for $name', ({ name }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand(name, 'ctrlcmd+9'), false);

      const mockDispatch = jest.fn();
      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };

      // Simulate button click — shortcuts parameter is undefined
      result.execute({}, mockApi, mockDispatch, undefined, undefined);

      // A-02 fix: dispatch should be called even without shortcuts
      expect(mockDispatch).toHaveBeenCalledWith({ preview: name });
      expect(mockFocus).toHaveBeenCalled();
    });

    it.each([
      { name: 'edit' },
      { name: 'live' },
      { name: 'preview' },
    ])('should fix execute: dispatch called with keyboard shortcuts for $name', ({ name }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand(name, 'ctrlcmd+9'), false);

      const mockDispatch = jest.fn();
      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };

      // Simulate keyboard shortcut
      result.execute({}, mockApi, mockDispatch, undefined, ['ctrlcmd+9']);

      expect(mockDispatch).toHaveBeenCalledWith({ preview: name });
      expect(mockFocus).toHaveBeenCalled();
    });

    it.each([
      { name: 'edit' },
      { name: 'live' },
      { name: 'preview' },
    ])('should not dispatch when dispatch is undefined for $name', ({ name }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand(name, 'ctrlcmd+9'), false);

      const mockFocus = jest.fn();
      const mockApi = { textArea: { focus: mockFocus } };

      result.execute({}, mockApi, undefined, undefined, undefined);

      // S-01/A-07 fix: focus always called with optional chaining, but dispatch skipped
      expect(mockFocus).toHaveBeenCalled();
    });

    it('should handle null api.textArea gracefully (S-01)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand('edit', 'ctrlcmd+7'), false);

      const mockDispatch = jest.fn();
      const mockApi = { textArea: null };

      // S-01 fix: optional chaining prevents TypeError
      expect(() => {
        result.execute({}, mockApi, mockDispatch, undefined, undefined);
      }).not.toThrow();
      expect(mockDispatch).toHaveBeenCalledWith({ preview: 'edit' });
    });

    it('should not affect commands with different keyCommand', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'edit', keyCommand: 'otherCommand', shortcuts: 'ctrlcmd+7' };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });

    it('should pass through unknown mode name in preview keyCommand', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'unknownMode', keyCommand: 'preview', shortcuts: 'ctrlcmd+5' };
      const result = commandsFilterFn!(cmd, false);
      // Should return original command since mode is not in modeMap
      expect(result).toBe(cmd);
    });

    it('should set icon fontSize to 16px (Carbon standard)', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createPreviewCommand('edit', 'ctrlcmd+7'), false);
      expect(result.icon.props.style.fontSize).toBe(16);
    });
  });

  describe('commandsFilter — heading1~6 command override', () => {
    const createHeadingCommand = (level: number) => ({
      name: `heading${level}`,
      keyCommand: `heading${level}`,
      shortcuts: `ctrlcmd+${level}`,
      prefix: `${'#'.repeat(level)} `,
      suffix: '',
      buttonProps: { 'aria-label': `Heading ${level}`, title: `Heading ${level}` },
      execute: jest.fn(),
    });

    const createMockApi = () => ({
      setSelectionRange: jest.fn(),
      replaceSelection: jest.fn(),
    });

    // 中文 ARIA 标签
    it.each([
      { level: 1 },
      { level: 2 },
      { level: 3 },
      { level: 4 },
      { level: 5 },
      { level: 6 },
    ])('should use Chinese ARIA labels for heading$level', ({ level }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createHeadingCommand(level), false);
      expect(result.buttonProps['aria-label']).toBe(`${level}级标题 (Ctrl+${level})`);
      expect(result.buttonProps.title).toBe(`${level}级标题 (Ctrl+${level})`);
    });

    // 图标替换为 HN span
    it.each([
      { level: 1, expectedFontSize: 18 },
      { level: 2, expectedFontSize: 16 },
      { level: 3, expectedFontSize: 14 },
      { level: 4, expectedFontSize: 12 },
      { level: 5, expectedFontSize: 12 },
      { level: 6, expectedFontSize: 12 },
    ])('should replace icon with H$level span (fontSize=$expectedFontSize)', ({ level, expectedFontSize }) => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!(createHeadingCommand(level), false);
      expect(result.icon).toBeTruthy();
      expect(React.isValidElement(result.icon)).toBe(true);
      // span with text H{level} — JSX 编译为数组 ["H", "N"]
      expect(result.icon.type).toBe('span');
      const children = result.icon.props.children;
      expect(children).toEqual(['H', `${level}`]);
      expect(result.icon.props.style.fontSize).toBe(expectedFontSize);
      // aria-hidden="true" — 图标装饰性，不播报给屏幕阅读器
      expect(result.icon.props['aria-hidden']).toBe('true');
      // 不应有 role="img"（与 aria-hidden 矛盾）
      expect(result.icon.props.role).toBeUndefined();
    });

    // prefix! 防御：prefix 缺失时跳过执行
    it.each([
      { level: 1 },
      { level: 2 },
      { level: 3 },
    ])('should skip heading$level execution when prefix is missing (P2-01)', ({ level }) => {
      render(<MarkdownEditor value="" />);
      const cmd = createHeadingCommand(level);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 0, end: 5 }, command: { prefix: undefined } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    // text 非字符串时跳过
    it('should skip execution when text is not a string', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createHeadingCommand(2);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: undefined as any, selection: { start: 0, end: 0 }, command: { prefix: '## ' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    // 选区越界时跳过
    it('should skip execution when selection is out of bounds', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createHeadingCommand(2);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hi', selection: { start: 0, end: 100 }, command: { prefix: '## ' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    // start < 0 时跳过
    it('should skip execution when start is negative', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createHeadingCommand(2);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: -1, end: 3 }, command: { prefix: '## ' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    // start > end 时跳过
    it('should skip execution when start > end', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createHeadingCommand(2);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();

      result.execute(
        { text: 'Hello', selection: { start: 4, end: 2 }, command: { prefix: '## ' } },
        api,
      );

      expect(cmd.execute).not.toHaveBeenCalled();
    });

    // 正常执行
    it('should call original execute for valid state', () => {
      render(<MarkdownEditor value="" />);
      const cmd = createHeadingCommand(2);
      const result = commandsFilterFn!(cmd, false);
      const api = createMockApi();
      const state = {
        text: 'Hello world',
        selection: { start: 0, end: 5 },
        command: { prefix: '## ' },
      };

      result.execute(state, api);

      expect(cmd.execute).toHaveBeenCalledWith(state, api);
    });

    // 错误边界
    it('should handle execution error gracefully', () => {
      render(<MarkdownEditor value="" />);
      const cmd = {
        ...createHeadingCommand(2),
        execute: jest.fn(() => { throw new Error('headingExecute crash'); }),
      };
      const result = commandsFilterFn!(cmd, false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const api = createMockApi();

      expect(() => {
        result.execute(
          { text: 'Hello', selection: { start: 0, end: 5 }, command: { prefix: '## ' } },
          api,
        );
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MarkdownEditor] 命令 "heading2" 执行失败:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    // 不匹配的命令应透传
    it('should not affect non-heading commands', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'heading7', keyCommand: 'heading7' };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });

    // 不匹配 heading0 或其他无效级别
    it('should not match heading0 or invalid levels', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'heading0', keyCommand: 'heading0' };
      const result = commandsFilterFn!(cmd, false);
      expect(result).toBe(cmd);
    });
  });
});
