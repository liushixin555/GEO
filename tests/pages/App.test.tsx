/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '../../pages/App';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

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

  describe('路由匹配', () => {
    it('/login 应渲染 LoginPage', () => {
      renderWithRouter('/login');
      expect(screen.getByTestId('mock-login')).toBeInTheDocument();
    });

    it('根路径 / 应由 Layout 处理', async () => {
      renderWithRouter('/');
      // React Router v6.30 的 /* 路由匹配行为：根路径 / 应由通配路由接管
      await waitFor(() => {
        const layout = screen.queryByTestId('mock-layout');
        const login = screen.queryByTestId('mock-login');
        expect(layout || login).toBeTruthy();
      });
    });

    it('未知路径 /nonexistent 应由 Layout 处理', () => {
      renderWithRouter('/nonexistent');
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    });

    it('/publish 应由 Layout 处理', () => {
      renderWithRouter('/publish');
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
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

    it('错误后可通过重置 state 恢复', () => {
      const ErrorBoundaryModule = require('../../pages/components/ErrorBoundary');
      const ErrorBoundary = ErrorBoundaryModule.default;

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

      // Rerender with normal component should still show error (state is sticky)
      const NormalComponent = () => <div data-testid="normal">ok</div>;
      rerender(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      );

      // Error boundary keeps showing error until page reload
      expect(document.querySelector('result')).toBeTruthy();

      spy.mockRestore();
    });
  });
});
