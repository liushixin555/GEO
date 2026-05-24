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

  describe('commandsFilter — other commands pass through', () => {
    it('should pass through unknown commands unchanged', () => {
      render(<MarkdownEditor value="" />);
      const cmd = { name: 'bold', shortcuts: 'ctrlcmd+b' };
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
});
