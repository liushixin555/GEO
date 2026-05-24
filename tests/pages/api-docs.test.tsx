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
    const breadcrumb = document.querySelector('breadcrumb');
    expect(breadcrumb).toBeTruthy();
  });

  it('should render API 文档 heading', () => {
    renderWithRouter();
    expect(screen.getByText(/API 文档/)).toBeInTheDocument();
  });

  it('should render description text', () => {
    renderWithRouter();
    expect(screen.getByText(/查看、测试和管理所有 API 接口/)).toBeInTheDocument();
  });

  it('should render open API docs button with correct props when available', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('打开 API 文档')).toBeInTheDocument();
    });
    const buttonText = screen.getByText('打开 API 文档');
    const buttonElement = buttonText.closest('[href]');
    expect(buttonElement?.getAttribute('href')).toBe('/api-docs/');
    expect(buttonElement?.getAttribute('target')).toBe('_blank');
    expect(buttonElement?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should have aria-label on button', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByLabelText('在新窗口打开 API 文档')).toBeInTheDocument();
    });
  });

  it('should render ApiOutlined icon', () => {
    renderWithRouter();
    const icon = document.querySelector('[data-icon="ApiOutlined"]');
    expect(icon).toBeTruthy();
  });

  it('should show alert when API docs returns not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    renderWithRouter();
    await waitFor(() => {
      expect(document.querySelector('alert')).toBeTruthy();
    });
    const alert = document.querySelector('alert');
    expect(alert?.getAttribute('message')).toBe('API 文档服务当前不可用');
    expect(alert?.getAttribute('description')).toContain('API 文档服务未启用');
  });

  it('should show button when API docs returns 401 (needs auth)', async () => {
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
      expect(document.querySelector('alert')).toBeTruthy();
    });
    expect(document.querySelector('alert')?.getAttribute('message')).toBe('API 文档服务当前不可用');
  });

  it('should show spinner while checking API docs availability', () => {
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
    const container = icon?.closest('[style]');
    expect(container?.getAttribute('style')).toContain('margin-right');
  });

  it('should render API 文档 heading as Typography.Title', () => {
    renderWithRouter();
    const heading = screen.getByText(/API 文档/);
    expect(heading).toBeTruthy();
    expect(heading.textContent).toContain('API 文档');
  });
});
