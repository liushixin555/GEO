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
});
