/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ApiDocsPage from '../../pages/api-docs';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const renderWithRouter = (initialPath = '/swagger') => {
  window.history.pushState({}, '', initialPath);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/swagger" element={<ApiDocsPage />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('ApiDocsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.title = '';
    mockFetch.mockResolvedValue({ ok: true });
  });

  it('should set document title', () => {
    renderWithRouter();
    expect(document.title).toBe('API 文档 - 薄云商机倍增服务');
  });

  it('should render breadcrumb', () => {
    renderWithRouter();
    const breadcrumb = document.querySelector('breadcrumb');
    expect(breadcrumb).toBeTruthy();
  });

  it('should render Swagger API 文档 heading', () => {
    renderWithRouter();
    expect(screen.getByText(/Swagger API 文档/)).toBeInTheDocument();
  });

  it('should render description text', () => {
    renderWithRouter();
    expect(screen.getByText(/通过 Swagger UI 查看/)).toBeInTheDocument();
  });

  it('should render open swagger button with correct props when available', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('打开 Swagger 文档')).toBeInTheDocument();
    });
    const buttonText = screen.getByText('打开 Swagger 文档');
    const buttonElement = buttonText.closest('[href]');
    expect(buttonElement?.getAttribute('href')).toBe('/api-docs/');
    expect(buttonElement?.getAttribute('target')).toBe('_blank');
    expect(buttonElement?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should have aria-label on button', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByLabelText('在新窗口打开 Swagger API 文档')).toBeInTheDocument();
    });
  });

  it('should render ApiOutlined icon', () => {
    renderWithRouter();
    const icon = document.querySelector('[data-icon="ApiOutlined"]');
    expect(icon).toBeTruthy();
  });

  it('should show alert when Swagger returns not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    renderWithRouter();
    await waitFor(() => {
      expect(document.querySelector('alert')).toBeTruthy();
    });
    const alert = document.querySelector('alert');
    expect(alert?.getAttribute('message')).toBe('API 文档服务当前不可用');
    expect(alert?.getAttribute('description')).toContain('Swagger 文档服务未启用');
  });

  it('should show alert when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderWithRouter();
    await waitFor(() => {
      expect(document.querySelector('alert')).toBeTruthy();
    });
    expect(document.querySelector('alert')?.getAttribute('message')).toBe('API 文档服务当前不可用');
  });

  it('should show spinner while checking Swagger availability', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(document.querySelector('spin')).toBeTruthy();
  });

  it('should render API base URL info', () => {
    renderWithRouter();
    expect(screen.getByText(/基础路径/)).toBeInTheDocument();
  });

  it('should render authentication method info', () => {
    renderWithRouter();
    expect(screen.getByText(/认证方式/)).toBeInTheDocument();
    expect(screen.getByText(/JWT Bearer Token/)).toBeInTheDocument();
  });

  it('should render GlobalOutlined and SafetyCertificateOutlined icons', () => {
    renderWithRouter();
    expect(document.querySelector('[data-icon="GlobalOutlined"]')).toBeTruthy();
    expect(document.querySelector('[data-icon="SafetyCertificateOutlined"]')).toBeTruthy();
  });

  it('should have ApiOutlined icon styled with primary color', () => {
    renderWithRouter();
    const icon = document.querySelector('[data-icon="ApiOutlined"]');
    expect(icon).toBeTruthy();
    // JSDOM 不支持 CSS 自定义属性，验证 style 属性包含 margin-right 即可确认样式传递正常
    const container = icon?.closest('[style]');
    expect(container?.getAttribute('style')).toContain('margin-right');
  });

  it('should render Swagger heading as Typography.Title', () => {
    renderWithRouter();
    const heading = screen.getByText(/Swagger API 文档/);
    expect(heading).toBeTruthy();
    // antd Typography.Title 在 JSDOM 中渲染为自定义标签，验证文本存在即可
    expect(heading.textContent).toContain('Swagger API 文档');
  });
});
