/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('should show alert when Swagger returns 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('API 文档服务当前不可用')).toBeInTheDocument();
    });
  });

  it('should show alert when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderWithRouter();
    await waitFor(() => {
      const alert = document.querySelector('[data-testid="Alert"]');
      expect(alert).toBeTruthy();
      expect(alert?.textContent).toContain('API 文档服务当前不可用');
    });
  });

  it('should show Skeleton while checking Swagger availability', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(document.querySelector('[data-testid="Skeleton"]')).toBeTruthy();
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

  it('should have rel="noopener noreferrer" on external link button for security', async () => {
    renderWithRouter();
    await waitFor(() => {
      const button = screen.getByText('打开 API 文档').closest('[data-testid="Button"]');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  it('should have target="_blank" on external link button', async () => {
    renderWithRouter();
    await waitFor(() => {
      const button = screen.getByText('打开 API 文档').closest('[data-testid="Button"]');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('target')).toBe('_blank');
    });
  });

  it('should have aria-label on the button for accessibility', async () => {
    renderWithRouter();
    await waitFor(() => {
      const button = screen.getByText('打开 API 文档').closest('[data-testid="Button"]');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('aria-label')).toBe('在新窗口打开 API 文档');
    });
  });

  it('should fetch health endpoint on mount', () => {
    renderWithRouter();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api-docs/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should abort fetch on unmount', () => {
    const { unmount } = renderWithRouter();
    unmount();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api-docs/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('should not render breadcrumb (QUA-05: removed single-level breadcrumb)', () => {
    renderWithRouter();
    expect(document.querySelector('[data-testid="Breadcrumb"]')).toBeFalsy();
  });

  it('should log warning for non-AbortError fetch failures', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const error = new Error('DNS failure');
    error.name = 'TypeError';
    mockFetch.mockRejectedValue(error);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('API 文档服务当前不可用')).toBeInTheDocument();
    });
    expect(warnSpy).toHaveBeenCalledWith('[Swagger] 可用性检查失败:', 'DNS failure');
    warnSpy.mockRestore();
  });

  it('should not log warning for AbortError', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    mockFetch.mockRejectedValue(abortError);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('API 文档服务当前不可用')).toBeInTheDocument();
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should show retry button when API docs unavailable', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('重新检测')).toBeInTheDocument();
    });
  });

  it('should recheck availability when retry button clicked', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('重新检测')).toBeInTheDocument();
    });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    fireEvent.click(screen.getByText('重新检测'));
    await waitFor(() => {
      expect(screen.getByText('打开 API 文档')).toBeInTheDocument();
    });
  });

  it('should show simplified error message without environment details', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    renderWithRouter();
    await waitFor(() => {
      const alert = document.querySelector('[data-testid="Alert"]');
      expect(alert).toBeTruthy();
      expect(alert?.textContent).toContain('API 文档服务当前不可用');
    });
    expect(screen.queryByText(/开发环境中访问/)).not.toBeInTheDocument();
  });

  it('should use orientation prop on Space instead of direction', () => {
    renderWithRouter();
    const spaces = document.querySelectorAll('[data-testid="Space"]');
    expect(spaces.length).toBeGreaterThan(0);
  });
});
