/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ApiDocsPage from '../../pages/api-docs';

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

  it('should render open swagger button with correct props', () => {
    renderWithRouter();
    const buttonText = screen.getByText('打开 Swagger 文档');
    expect(buttonText).toBeInTheDocument();
    // In mock, Button renders as a generic element with href as attribute
    const buttonElement = buttonText.closest('[href]');
    expect(buttonElement?.getAttribute('href')).toBe('/api-docs/');
    expect(buttonElement?.getAttribute('target')).toBe('_blank');
    expect(buttonElement?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should have aria-label on button', () => {
    renderWithRouter();
    const button = screen.getByLabelText('在新窗口打开 Swagger API 文档');
    expect(button).toBeInTheDocument();
  });

  it('should render ApiOutlined icon', () => {
    renderWithRouter();
    const icon = document.querySelector('[data-icon="ApiOutlined"]');
    expect(icon).toBeTruthy();
  });
});
