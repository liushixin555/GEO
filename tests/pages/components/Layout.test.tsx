/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Layout from '../../../pages/components/Layout';

const mockUseAuth = jest.fn();
jest.mock('../../../pages/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../pages/components/Sidebar', () => {
  return function MockSidebar(props: { collapsed: boolean; isMobile?: boolean }) {
    return <div data-testid="mock-sidebar" data-collapsed={String(props.collapsed)} data-mobile={String(props.isMobile ?? false)} />;
  };
});

jest.mock('../../../pages/router/routes', () => {
  return function MockPageRouter() {
    return <div data-testid="mock-pagerouter" />;
  };
});

const mockUser = {
  id: 1,
  username: 'admin',
  cn_name: '管理员',
  role: 'admin',
  company_id: 1,
  selected_company: null,
  selected_project: null,
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderLayout = (initialPath = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Layout />
      <LocationDisplay />
    </MemoryRouter>
  );
};

describe('Layout.tsx', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    window.innerWidth = 1024;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('认证守卫', () => {
    it('loading 状态应显示 Spin 而非布局', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      renderLayout();
      expect(screen.getByTestId('Spin')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-pagerouter')).not.toBeInTheDocument();
    });

    it('未认证应重定向到 /login', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      renderLayout();
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
    });

    it('已认证应正常渲染布局', () => {
      renderLayout();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-pagerouter')).toBeInTheDocument();
    });
  });

  describe('桌面端渲染', () => {
    it('应同时渲染 Sider 和 Content', () => {
      renderLayout();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-pagerouter')).toBeInTheDocument();
    });

    it('桌面端不应显示展开按钮', () => {
      renderLayout();
      expect(screen.queryByLabelText('展开侧边栏')).not.toBeInTheDocument();
    });

    it('应渲染 skip-to-content 链接', () => {
      renderLayout();
      expect(screen.getByText('跳到主要内容')).toBeInTheDocument();
    });

    it('桌面端 Escape 键不应折叠侧边栏', () => {
      renderLayout();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });
  });

  describe('移动端响应式', () => {
    const goMobile = () => {
      window.innerWidth = 600;
      fireEvent(window, new Event('resize'));
      act(() => { jest.advanceTimersByTime(200); });
    };

    it('窄屏 resize 应自动折叠并显示展开按钮', () => {
      renderLayout();
      goMobile();
      expect(screen.getByLabelText('展开侧边栏')).toBeInTheDocument();
    });

    it('折叠态 Sider 不应渲染 DOM', () => {
      renderLayout();
      goMobile();
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
    });

    it('展开按钮点击应展开侧边栏', () => {
      renderLayout();
      goMobile();
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('展开侧边栏'));

      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.queryByLabelText('展开侧边栏')).not.toBeInTheDocument();
    });

    it('遮罩点击应折叠侧边栏', () => {
      renderLayout();
      goMobile();
      fireEvent.click(screen.getByLabelText('展开侧边栏'));

      const overlay = document.querySelector('.mobile-overlay');
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay!);

      expect(screen.getByLabelText('展开侧边栏')).toBeInTheDocument();
    });

    it('Escape 键应在移动端展开态关闭侧边栏', () => {
      renderLayout();
      goMobile();
      fireEvent.click(screen.getByLabelText('展开侧边栏'));

      fireEvent.keyDown(document.body, { key: 'Escape' });

      expect(screen.getByLabelText('展开侧边栏')).toBeInTheDocument();
    });

    it('Escape 键在 Modal 打开时不应关闭侧边栏', () => {
      renderLayout();
      goMobile();
      fireEvent.click(screen.getByLabelText('展开侧边栏'));

      const modal = document.createElement('div');
      modal.className = 'ant-modal';
      document.body.appendChild(modal);

      fireEvent.keyDown(modal, { key: 'Escape' });

      expect(screen.queryByLabelText('展开侧边栏')).not.toBeInTheDocument();

      document.body.removeChild(modal);
    });

    it('从移动端回到桌面端应恢复 Sider 渲染', () => {
      renderLayout();
      goMobile();
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();

      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      act(() => { jest.advanceTimersByTime(200); });

      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });
  });

  describe('组件元数据', () => {
    it('应设置 displayName 为 Layout', () => {
      const LayoutModule = require('../../../pages/components/Layout');
      expect(LayoutModule.default.displayName).toBe('Layout');
    });
  });
});
