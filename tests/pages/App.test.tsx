/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from '../../pages/App';

jest.mock('axios', () => {
  const mockAxios = {
    get: jest.fn(() => Promise.resolve({ data: { data: { user: null } } })),
    post: jest.fn(() => Promise.resolve({})),
    create: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ data: { data: { user: null } } })),
      post: jest.fn(() => Promise.resolve({})),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    })),
  };
  return mockAxios;
});

jest.mock('../../pages/components/Layout', () => {
  return function MockLayout() {
    return <div data-testid="mock-layout">Layout Component</div>;
  };
});

jest.mock('../../pages/login', () => {
  return function MockLoginPage() {
    return <div data-testid="mock-login">LoginPage</div>;
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

const renderWithRouter = (initialPath = '/') => {
  window.history.pushState({}, '', initialPath);
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('App.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('路由匹配 — 未认证状态', () => {
    it('/login 应渲染 LoginPage', () => {
      renderWithRouter('/login');
      expect(screen.getByTestId('mock-login')).toBeInTheDocument();
    });

    it('根路径 / 未认证应重定向到 /login', async () => {
      renderWithRouter('/');
      await waitFor(() => {
        expect(screen.getByTestId('mock-login')).toBeInTheDocument();
      });
    });

    it('未知路径 /nonexistent 未认证应重定向到 /login', async () => {
      renderWithRouter('/nonexistent');
      await waitFor(() => {
        expect(screen.getByTestId('mock-login')).toBeInTheDocument();
      });
    });

    it('/publish 未认证应重定向到 /login', async () => {
      renderWithRouter('/publish');
      await waitFor(() => {
        expect(screen.getByTestId('mock-login')).toBeInTheDocument();
      });
    });
  });

  describe('路由匹配 — 已认证状态', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      (axios.get as jest.Mock).mockResolvedValue({
        data: { data: { user: mockUser } },
      });
    });

    it('根路径 / 已认证应渲染 Layout', async () => {
      renderWithRouter('/');
      await waitFor(() => {
        expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
      });
    });

    it('/publish 已认证应渲染 Layout', async () => {
      renderWithRouter('/publish');
      await waitFor(() => {
        expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
      });
    });

    it('未知路径 /nonexistent 已认证应渲染 Layout', async () => {
      renderWithRouter('/nonexistent');
      await waitFor(() => {
        expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
      });
    });
  });

  describe('认证失败处理', () => {
    it('token 无效应清除 token 并重定向到 /login', async () => {
      localStorage.setItem('token', 'invalid-token');
      (axios.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      renderWithRouter('/publish');

      await waitFor(() => {
        expect(screen.getByTestId('mock-login')).toBeInTheDocument();
      });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('ErrorBoundary', () => {
    it('应捕获渲染异常并显示错误提示', () => {
      const ErrorBoundary = require('../../pages/components/ErrorBoundary').default;

      const ThrowingComponent = () => {
        throw new Error('render crash');
      };

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const resultEl = document.querySelector('result');
      expect(resultEl).toBeTruthy();
      expect(resultEl?.getAttribute('status')).toBe('error');
      expect(resultEl?.getAttribute('title')).toBe('页面出现异常');

      spy.mockRestore();
    });

    it('正常组件应在 ErrorBoundary 内正常渲染', () => {
      const ErrorBoundary = require('../../pages/components/ErrorBoundary').default;

      const NormalComponent = () => <div data-testid="normal">正常内容</div>;

      render(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('normal')).toBeInTheDocument();
    });

    it('错误后 state 保持错误状态', () => {
      const ErrorBoundary = require('../../pages/components/ErrorBoundary').default;

      const ThrowingComponent = () => {
        throw new Error('crash');
      };

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(document.querySelector('result')?.getAttribute('status')).toBe('error');

      const NormalComponent = () => <div data-testid="normal">ok</div>;
      rerender(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      );

      // Error boundary keeps showing error until state is reset
      expect(document.querySelector('result')).toBeTruthy();

      spy.mockRestore();
    });
  });
});
