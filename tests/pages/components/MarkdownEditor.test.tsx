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

  describe('commandsFilter — help command filtered', () => {
    it('should filter out help command', () => {
      render(<MarkdownEditor value="" />);
      const result = commandsFilterFn!({ name: 'help' }, false);
      expect(result).toBe(false);
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
