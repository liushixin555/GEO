/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ApiDocsPage from '../../pages/swagger';

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
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  it('should set document title', () => {
    renderWithRouter();
    expect(document.title).toBe('API 文档 - 薄云商机倍增服务');
  });

  it('should render breadcrumb', () => {
    renderWithRouter();
    expect(document.querySelector('[data-testid="Breadcrumb"]')).toBeTruthy();
  });

  it('should render API 文档 heading', () => {
    renderWithRouter();
    expect(screen.getByText(/API 文档/)).toBeInTheDocument();
  });

  it('should render description text', () => {
    renderWithRouter();
    expect(screen.getByText(/查看、测试和管理所有 API 接口/)).toBeInTheDocument();
  });

  it('should render open API docs button when Swagger is available', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('打开 API 文档')).toBeInTheDocument();
    });
    const buttonWrapper = screen.getByText('打开 API 文档').closest('[data-testid="Button"]');
    expect(buttonWrapper).toBeTruthy();
  });

  it('should render ApiOutlined icon in heading', () => {
    renderWithRouter();
    expect(document.querySelector('[data-icon="ApiOutlined"]')).toBeTruthy();
  });

  it('should show alert with message when Swagger returns 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('API 文档服务当前不可用')).toBeInTheDocument();
    });
  });

  it('should show button when Swagger returns 401 (needs auth)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('打开 API 文档')).toBeInTheDocument();
    });
  });

  it('should show alert when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('API 文档服务当前不可用')).toBeInTheDocument();
    });
  });

  it('should show spinner while checking Swagger availability', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(document.querySelector('[data-testid="Spin"]')).toBeTruthy();
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

  it('should render heading via Typography.Title component', () => {
    renderWithRouter();
    const titleElement = document.querySelector('[data-testid="Typography.Title"]');
    expect(titleElement).toBeTruthy();
    expect(titleElement?.textContent).toContain('API 文档');
  });

  it('should use Card and Space layout components', () => {
    renderWithRouter();
    expect(document.querySelector('[data-testid="Card"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="Space"]')).toBeTruthy();
  });
});
