/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../../pages/login';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to render with router
const renderWithRouter = (initialPath = '/login') => {
  window.history.pushState({}, '', initialPath);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/score" element={<div data-testid="score">GEO Score Page</div>} />
      </Routes>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form with title', () => {
    renderWithRouter();

    expect(screen.getByText('薄云商机倍增服务')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('should show error when both fields are empty', async () => {
    renderWithRouter();

    const submitButton = screen.getByRole('button', { name: /登录/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('用户名和密码不能为空')).toBeInTheDocument();
    });
  });

  it('should show error when username is empty', async () => {
    renderWithRouter();

    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('用户名和密码不能为空')).toBeInTheDocument();
    });
  });

  it('should show error when password is empty', async () => {
    renderWithRouter();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('用户名和密码不能为空')).toBeInTheDocument();
    });
  });

  it('should show error on login failure with server message', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: '用户名或密码错误' } },
    });

    renderWithRouter();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    });
  });

  it('should show fallback error when server has no message', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

    renderWithRouter();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(passwordInput, { target: { value: 'pass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('登录失败，请稍后重试')).toBeInTheDocument();
    });
  });

  it('should store token and redirect after successful login', async () => {
    const mockResponse = {
      data: {
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 1,
            username: 'admin',
            cn_name: '运营者',
            role: 'admin',
            company_id: 1,
          },
        },
      },
    };
    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    renderWithRouter();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(JSON.parse(localStorage.getItem('user') || '{}').username).toBe('admin');
    });
  });

  it('should redirect to saved path after login', async () => {
    localStorage.setItem('redirect_after_login', '/article');

    const mockResponse = {
      data: {
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'admin', cn_name: '运营者', role: 'admin', company_id: 1 },
        },
      },
    };
    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    renderWithRouter();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // redirect_after_login should be cleared after use
      expect(localStorage.getItem('redirect_after_login')).toBeNull();
    });
  });

  it('should show loading state during login', async () => {
    // Create a promise that we control
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => { resolveLogin = resolve; });
    mockedAxios.post.mockReturnValueOnce(loginPromise as any);

    renderWithRouter();

    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const submitButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(screen.getByText('登录中...')).toBeInTheDocument();

    // Resolve the login
    await act(async () => {
      resolveLogin!({
        data: {
          data: {
            token: 'token',
            user: { id: 1, username: 'admin', cn_name: '运营者', role: 'admin', company_id: 1 },
          },
        },
      });
    });
  });
});
