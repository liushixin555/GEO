/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';

// Mock mammoth
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html: string) => html),
  },
}));

const mockForm = {
  setFieldValue: jest.fn(),
};

const createWrapper = () => {
  const React = require('react');
  const { App } = require('antd');
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(App, null, children);
  };
};

// Helper: create a File with mocked text() and arrayBuffer()
function createMockFile(content: string, name: string, type: string) {
  const file = new File([content], name, { type });
  file.text = jest.fn().mockResolvedValue(content);
  file.arrayBuffer = jest.fn().mockResolvedValue(Buffer.from(content).buffer);
  return file;
}

describe('useDocumentImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应导入 .md 文件并提取标题', async () => {
    const onContentImport = jest.fn();
    const { useDocumentImport } = require('../../../../pages/article/hooks/useDocumentImport');
    const { result } = renderHook(
      () => useDocumentImport(mockForm as any, onContentImport),
      { wrapper: createWrapper() },
    );

    const mdFile = createMockFile('# 测试标题\n\n正文内容', 'test.md', 'text/markdown');

    await act(async () => {
      await result.current.importDocument(mdFile);
    });

    expect(mockForm.setFieldValue).toHaveBeenCalledWith('title', '测试标题');
    expect(onContentImport).toHaveBeenCalledWith('正文内容');
  });

  it('应导入 .docx 文件', async () => {
    const mammoth = require('mammoth');
    mammoth.convertToHtml.mockResolvedValueOnce({ value: '<h1>Word标题</h1><p>Word正文</p>' });

    const onContentImport = jest.fn();
    const { useDocumentImport } = require('../../../../pages/article/hooks/useDocumentImport');
    const { result } = renderHook(
      () => useDocumentImport(mockForm as any, onContentImport),
      { wrapper: createWrapper() },
    );

    const docxFile = createMockFile(
      'fake content',
      'test.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    await act(async () => {
      await result.current.importDocument(docxFile);
    });

    expect(mammoth.convertToHtml).toHaveBeenCalled();
    expect(onContentImport).toHaveBeenCalled();
  });

  it('不支持的文件格式应报错', async () => {
    const onContentImport = jest.fn();
    const { useDocumentImport } = require('../../../../pages/article/hooks/useDocumentImport');
    const { result } = renderHook(
      () => useDocumentImport(mockForm as any, onContentImport),
      { wrapper: createWrapper() },
    );

    const txtFile = createMockFile('content', 'test.txt', 'text/plain');

    await act(async () => {
      await result.current.importDocument(txtFile);
    });

    expect(onContentImport).not.toHaveBeenCalled();
  });

  it('超过 10MB 的文件应报错', async () => {
    const onContentImport = jest.fn();
    const { useDocumentImport } = require('../../../../pages/article/hooks/useDocumentImport');
    const { result } = renderHook(
      () => useDocumentImport(mockForm as any, onContentImport),
      { wrapper: createWrapper() },
    );

    const largeFile = createMockFile('x'.repeat(100), 'large.md', 'text/markdown');
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    await act(async () => {
      await result.current.importDocument(largeFile);
    });

    expect(onContentImport).not.toHaveBeenCalled();
  });

  it('空内容的文档应提示', async () => {
    const onContentImport = jest.fn();
    const { useDocumentImport } = require('../../../../pages/article/hooks/useDocumentImport');
    const { result } = renderHook(
      () => useDocumentImport(mockForm as any, onContentImport),
      { wrapper: createWrapper() },
    );

    const emptyFile = createMockFile('   ', 'empty.md', 'text/markdown');

    await act(async () => {
      await result.current.importDocument(emptyFile);
    });

    expect(onContentImport).not.toHaveBeenCalled();
  });
});
