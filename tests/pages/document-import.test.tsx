import { act, renderHook } from '@testing-library/react';
import mammoth from 'mammoth';
import { App } from 'antd';
import { useDocumentImport } from '../../pages/article/hooks/useDocumentImport';

jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
}));

jest.spyOn(App, 'useApp').mockReturnValue({
  message: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
  notification: {} as any,
  modal: {} as any,
});

const mockedConvertToHtml = mammoth.convertToHtml as jest.Mock;

describe('useDocumentImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('preserves docx tables as markdown tables when importing', async () => {
    mockedConvertToHtml.mockResolvedValue({
      value: [
        '<h1>导入标题</h1>',
        '<p>正文开头</p>',
        '<table>',
        '<tr><th>姓名</th><th>年龄</th></tr>',
        '<tr><td>张三</td><td>30</td></tr>',
        '</table>',
      ].join(''),
      messages: [],
    });
    const setFieldValue = jest.fn();
    const onContentImport = jest.fn();
    const file = {
      name: 'table.docx',
      size: 4,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(4)),
    } as unknown as File;

    const { result } = renderHook(() => useDocumentImport({ setFieldValue } as any, onContentImport));

    await act(async () => {
      await result.current.importDocument(file);
    });

    expect(setFieldValue).toHaveBeenCalledWith('title', '导入标题');
    expect(onContentImport).toHaveBeenCalledWith([
      '正文开头',
      '',
      '| 姓名 | 年龄 |',
      '| --- | --- |',
      '| 张三 | 30 |',
    ].join('\n'));
  });
});
