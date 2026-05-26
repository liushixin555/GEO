/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ArticleImageManager from '../../../../pages/article/components/ArticleImageManager';
import type { KbImage } from '../../../../pages/article/types';

const mockMessage = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('antd', () => {
  const React = require('react');
  const createComp = (name: string) => {
    const Comp: any = (props: any) => {
      if (name === 'Segmented' && Array.isArray(props.options)) {
        return React.createElement('div', { 'data-testid': name },
          ...props.options.map((opt: any) =>
            React.createElement('button', {
              key: opt.value,
              'data-testid': `segmented-${opt.value}`,
              onClick: () => props.onChange?.(opt.value),
            }, opt.label)
          )
        );
      }
      if (name === 'Popconfirm') {
        return React.createElement('div',
          { 'data-testid': name, onClick: () => props.onConfirm?.() },
          props.children
        );
      }
      if (name === 'Empty') {
        const attrs: Record<string, any> = { 'data-testid': name };
        if (props.description) attrs.description = props.description;
        return React.createElement('div', attrs, props.description);
      }
      const htmlAttrs: Record<string, any> = { 'data-testid': name };
      for (const key of ['href', 'target', 'rel', 'aria-label', 'aria-hidden', 'role', 'type', 'disabled', 'className', 'id', 'placeholder', 'value', 'src', 'alt', 'name', 'onClick', 'image', 'description']) {
        if (props[key] !== undefined) htmlAttrs[key] = props[key];
      }
      return React.createElement('div', htmlAttrs, props.title || props.tip || props.label || props.description, props.children);
    };
    Comp.displayName = name;
    const cache: Record<string, any> = {};
    return new Proxy(Comp, {
      get: (target, prop) => {
        if (prop === 'useForm') return () => [{}];
        if (prop === 'useApp') return () => ({ message: mockMessage });
        if (prop === 'useBreakpoint') return () => ({});
        if (prop === 'useToken') return () => ({ token: {} });
        if (prop === 'PRESENTED_IMAGE_SIMPLE') return 'simple';
        if (typeof prop === 'string' && prop !== 'displayName' && prop !== 'prototype' && prop !== 'name') {
          if (!cache[prop]) {
            const subName = `${name}.${prop}`;
            const SubComp: any = (subProps?: any) => {
              if (!subProps) return React.createElement('div', { 'data-testid': subName });
              if (subName === 'Input.Search') {
                return React.createElement('div', { 'data-testid': subName },
                  React.createElement('input', {
                    'data-testid': 'url-input',
                    placeholder: subProps.placeholder || '',
                    value: subProps.value || '',
                    onChange: (e: any) => {
                      if (subProps.onChange) subProps.onChange(e);
                    },
                  }),
                  React.createElement('button', {
                    'data-testid': 'url-search-btn',
                    onClick: () => {
                      const inputValue = subProps.value || '';
                      if (subProps.onSearch) subProps.onSearch(inputValue);
                    },
                  }, '搜索')
                );
              }
              return React.createElement('div', { 'data-testid': subName }, subProps.children);
            };
            SubComp.displayName = subName;
            cache[prop] = SubComp;
          }
          return cache[prop];
        }
        return (target as any)[prop];
      },
    });
  };
  return new Proxy({}, {
    get: (_, name) => {
      if (name === '__esModule') return false;
      if (typeof name !== 'string') return undefined;
      return createComp(String(name));
    },
  });
});

jest.mock('@ant-design/icons', () => {
  const React = require('react');
  const createIcon = (name: string) => {
    const Comp: any = (props: any) => React.createElement('span', { 'data-icon': name });
    Comp.displayName = name;
    return Comp;
  };
  return new Proxy({}, {
    get: (_, name) => {
      if (name === '__esModule') return false;
      if (typeof name !== 'string') return undefined;
      return createIcon(String(name));
    },
  });
});

jest.mock('../../../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockKbImages: KbImage[] = [
  { id: 1, title: '图片A', image_url: 'https://example.com/a.jpg' },
  { id: 2, title: '图片B', image_url: 'https://example.com/b.jpg' },
];

const defaultProps = {
  imageList: [] as string[],
  imageListChange: jest.fn(),
  editable: true,
  kbImages: mockKbImages,
  kbLoading: false,
};

const renderComponent = (overrides = {}) => {
  const props = { ...defaultProps, ...overrides };
  return render(<ArticleImageManager {...(props as any)} />);
};

describe('ArticleImageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('非编辑态', () => {
    it('图片列表为空时显示 Empty 组件', () => {
      renderComponent({ editable: false, imageList: [] });
      expect(screen.getByTestId('Empty')).toBeInTheDocument();
      expect(screen.getByTestId('Empty')).toHaveAttribute('description', '暂无插图');
    });

    it('显示图片列表', () => {
      renderComponent({ editable: false, imageList: ['https://img/1.jpg', 'https://img/2.jpg'] });
      const images = screen.getAllByTestId('Image');
      expect(images.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('编辑态 - 模式切换', () => {
    it('默认显示知识库模式', () => {
      renderComponent();
      expect(screen.getByTestId('Segmented')).toBeInTheDocument();
    });

    it('切换到上传模式', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('segmented-upload'));
      expect(screen.getByTestId('Upload.Dragger')).toBeInTheDocument();
    });

    it('切换到URL模式', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('segmented-url'));
      expect(screen.getByTestId('Input.Search')).toBeInTheDocument();
    });
  });

  describe('知识库图片选择', () => {
    it('点击图片可选中', () => {
      const onChange = jest.fn();
      renderComponent({ imageListChange: onChange });
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalledWith(['https://example.com/a.jpg']);
    });

    it('点击已选中图片可取消', () => {
      const onChange = jest.fn();
      renderComponent({ imageList: ['https://example.com/a.jpg'], imageListChange: onChange });
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('键盘 Enter 可触发选择', () => {
      const onChange = jest.fn();
      renderComponent({ imageListChange: onChange });
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.keyDown(checkboxes[0], { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(['https://example.com/a.jpg']);
    });

    it('键盘 Space 可触发选择', () => {
      const onChange = jest.fn();
      renderComponent({ imageListChange: onChange });
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.keyDown(checkboxes[0], { key: ' ' });
      expect(onChange).toHaveBeenCalledWith(['https://example.com/a.jpg']);
    });

    it('知识库为空时显示 Empty', () => {
      renderComponent({ kbImages: [], kbLoading: false });
      expect(screen.getByTestId('Empty')).toBeInTheDocument();
    });
  });

  describe('上传图片', () => {
    it('上传区域渲染', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('segmented-upload'));
      expect(screen.getByTestId('Upload.Dragger')).toBeInTheDocument();
    });
  });

  describe('URL 添加', () => {
    it('空URL不触发添加', () => {
      const onChange = jest.fn();
      renderComponent({ imageListChange: onChange });
      fireEvent.click(screen.getByTestId('segmented-url'));
      const searchBtn = screen.getByTestId('url-search-btn');
      fireEvent.click(searchBtn);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('无效URL格式被拒绝', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('segmented-url'));
      const input = screen.getByTestId('url-input');
      fireEvent.change(input, { target: { value: 'not-a-url' } });
      const searchBtn = screen.getByTestId('url-search-btn');
      fireEvent.click(searchBtn);
      expect(mockMessage.error).toHaveBeenCalledWith('请输入有效的图片 URL');
    });

    it('ftp协议被拒绝', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('segmented-url'));
      const input = screen.getByTestId('url-input');
      fireEvent.change(input, { target: { value: 'ftp://example.com/img.jpg' } });
      const searchBtn = screen.getByTestId('url-search-btn');
      fireEvent.click(searchBtn);
      expect(mockMessage.error).toHaveBeenCalledWith('仅支持 http/https 协议的图片 URL');
    });
  });

  describe('图片数量上限', () => {
    it('已达上限时选择知识库图片被拒绝', () => {
      const fullList = Array.from({ length: 20 }, (_, i) => `https://img/${i}.jpg`);
      const onChange = jest.fn();
      renderComponent({ imageList: fullList, imageListChange: onChange });
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(mockMessage.warning).toHaveBeenCalledWith('最多添加 20 张图片');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('已达上限时添加URL被拒绝', () => {
      const fullList = Array.from({ length: 20 }, (_, i) => `https://img/${i}.jpg`);
      const onChange = jest.fn();
      renderComponent({ imageList: fullList, imageListChange: onChange });
      fireEvent.click(screen.getByTestId('segmented-url'));
      const input = screen.getByTestId('url-input');
      fireEvent.change(input, { target: { value: 'https://new.com/img.jpg' } });
      const searchBtn = screen.getByTestId('url-search-btn');
      fireEvent.click(searchBtn);
      expect(mockMessage.warning).toHaveBeenCalledWith('最多添加 20 张图片');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('删除图片', () => {
    it('已选图片显示删除按钮', () => {
      renderComponent({ imageList: ['https://img/1.jpg'] });
      expect(screen.getByLabelText('删除图片 1')).toBeInTheDocument();
    });

    it('点击删除图标触发删除', () => {
      const onChange = jest.fn();
      renderComponent({ imageList: ['https://img/1.jpg'], imageListChange: onChange });
      // Popconfirm mock triggers onConfirm on click inside its div
      fireEvent.click(screen.getByTestId('Popconfirm'));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('键盘 Enter 在删除区域生效', () => {
      const onChange = jest.fn();
      renderComponent({ imageList: ['https://img/1.jpg'], imageListChange: onChange });
      const deleteBtn = screen.getByLabelText('删除图片 1');
      fireEvent.keyDown(deleteBtn, { key: 'Enter' });
      // onKeyDown calls click() on the delete button, which bubbles to Popconfirm
      fireEvent.click(screen.getByTestId('Popconfirm'));
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('已选列表', () => {
    it('无图片时不显示已选列表', () => {
      renderComponent({ imageList: [] });
      expect(screen.queryByLabelText(/删除图片/)).not.toBeInTheDocument();
    });

    it('有图片时显示 Divider 和已选列表', () => {
      renderComponent({ imageList: ['https://img/1.jpg'] });
      expect(screen.getByTestId('Divider')).toBeInTheDocument();
      expect(screen.getByLabelText('删除图片 1')).toBeInTheDocument();
    });

    it('多张图片全部显示', () => {
      renderComponent({ imageList: ['https://img/1.jpg', 'https://img/2.jpg', 'https://img/3.jpg'] });
      expect(screen.getByLabelText('删除图片 1')).toBeInTheDocument();
      expect(screen.getByLabelText('删除图片 2')).toBeInTheDocument();
      expect(screen.getByLabelText('删除图片 3')).toBeInTheDocument();
    });
  });

  describe('URL 输入校验', () => {
    it('重复URL被拒绝', () => {
      renderComponent({ imageList: ['https://img/existing.jpg'] });
      fireEvent.click(screen.getByTestId('segmented-url'));
      const input = screen.getByTestId('url-input');
      fireEvent.change(input, { target: { value: 'https://img/existing.jpg' } });
      const searchBtn = screen.getByTestId('url-search-btn');
      fireEvent.click(searchBtn);
      expect(mockMessage.warning).toHaveBeenCalledWith('该URL已存在');
    });

    it('有效URL可成功添加', () => {
      const onChange = jest.fn();
      renderComponent({ imageListChange: onChange });
      fireEvent.click(screen.getByTestId('segmented-url'));
      const input = screen.getByTestId('url-input');
      fireEvent.change(input, { target: { value: 'https://img/new.jpg' } });
      const searchBtn = screen.getByTestId('url-search-btn');
      fireEvent.click(searchBtn);
      expect(onChange).toHaveBeenCalledWith(['https://img/new.jpg']);
    });
  });
});
