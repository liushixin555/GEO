/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SystemAdminPage from '../../pages/sysadmin';
import CompanyForm from '../../pages/sysadmin/CompanyForm';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to render with router
const renderWithRouter = (initialPath = '/sysadmin') => {
  window.history.pushState({}, '', initialPath);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/sysadmin" element={<SystemAdminPage />} />
        <Route path="/sysadmin/add" element={<CompanyForm />} />
        <Route path="/sysadmin/edit/:id" element={<CompanyForm />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('SystemAdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('should render page title', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { code: 0, data: [] },
    });

    renderWithRouter('/sysadmin');

    await waitFor(() => {
      expect(screen.getByText('系统管理')).toBeInTheDocument();
    });
  });

  it('should display company cards', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        code: 0,
        data: [
          { id: 1, short_name: 'DEFAULT', full_name: 'Default Company', address: null, contact_person: 'System', contact_phone: '0000000000' },
          { id: 2, short_name: 'ACME', full_name: 'ACME Corp', address: 'Beijing', contact_person: 'Zhang San', contact_phone: '13800138000' },
        ],
      },
    });

    renderWithRouter('/sysadmin');

    await waitFor(() => {
      expect(screen.getByText('DEFAULT')).toBeInTheDocument();
      expect(screen.getByText('ACME')).toBeInTheDocument();
    });
  });

  it('should display add company card', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { code: 0, data: [] },
    });

    renderWithRouter('/sysadmin');

    await waitFor(() => {
      expect(screen.getByText('添加公司')).toBeInTheDocument();
    });
  });

  it('should show error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { message: '获取公司列表失败' } },
    });

    renderWithRouter('/sysadmin');

    await waitFor(() => {
      expect(screen.getByText('获取公司列表失败')).toBeInTheDocument();
    });
  });
});

describe('CompanyForm - Add', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('should render add company form', () => {
    renderWithRouter('/sysadmin/add');

    expect(screen.getByText('添加公司')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入公司名短名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入公司名全名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入运营者')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入admin密码')).toBeInTheDocument();
  });

  it('should show validation errors for required fields', async () => {
    renderWithRouter('/sysadmin/add');

    const submitButton = screen.getByText('创建公司');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('公司名短名不能为空')).toBeInTheDocument();
      expect(screen.getByText('公司名全名不能为空')).toBeInTheDocument();
    });
  });

  it('should create company on submit', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { code: 0, data: { id: 3, short_name: 'NEWCO' } },
    });

    renderWithRouter('/sysadmin/add');

    fireEvent.change(screen.getByPlaceholderText('请输入公司名短名'), { target: { value: 'NEWCO' } });
    fireEvent.change(screen.getByPlaceholderText('请输入公司名全名'), { target: { value: 'New Company' } });
    fireEvent.change(screen.getByPlaceholderText('请输入接口人姓名'), { target: { value: 'Zhang San' } });
    fireEvent.change(screen.getByPlaceholderText('请输入接口人电话'), { target: { value: '13800138000' } });
    fireEvent.change(screen.getByPlaceholderText('请输入运营者'), { target: { value: 'newco_admin' } });
    fireEvent.change(screen.getByPlaceholderText('请输入admin密码'), { target: { value: 'admin123' } });

    const submitButton = screen.getByText('创建公司');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/companies',
        expect.objectContaining({
          short_name: 'NEWCO',
          full_name: 'New Company',
          contact_person: 'Zhang San',
          contact_phone: '13800138000',
          admin_username: 'newco_admin',
          admin_password: 'admin123',
        }),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });
  });

  it('should show server error on create failure', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: '用户名已存在' } },
    });

    renderWithRouter('/sysadmin/add');

    fireEvent.change(screen.getByPlaceholderText('请输入公司名短名'), { target: { value: 'NEWCO' } });
    fireEvent.change(screen.getByPlaceholderText('请输入公司名全名'), { target: { value: 'New Company' } });
    fireEvent.change(screen.getByPlaceholderText('请输入接口人姓名'), { target: { value: 'Zhang' } });
    fireEvent.change(screen.getByPlaceholderText('请输入接口人电话'), { target: { value: '138' } });
    fireEvent.change(screen.getByPlaceholderText('请输入运营者'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('请输入admin密码'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByText('创建公司'));

    await waitFor(() => {
      expect(screen.getByText('用户名已存在')).toBeInTheDocument();
    });
  });
});

describe('CompanyForm - Edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('should load and display existing company data', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        code: 0,
        data: {
          id: 2,
          short_name: 'ACME',
          full_name: 'ACME Corp',
          address: 'Beijing',
          contact_person: 'Zhang San',
          contact_phone: '13800138000',
          admin_username: 'acme_admin',
          view_username: 'acme_view',
          view_cn_name: 'ACME Viewer',
        },
      },
    });

    renderWithRouter('/sysadmin/edit/2');

    await waitFor(() => {
      expect(screen.getByDisplayValue('ACME')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ACME Corp')).toBeInTheDocument();
      expect(screen.getByDisplayValue('acme_admin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('acme_view')).toBeInTheDocument();
    });
  });

  it('should show modify title for edit mode', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        code: 0,
        data: {
          id: 2,
          short_name: 'ACME',
          full_name: 'ACME Corp',
          address: '',
          contact_person: 'Zhang',
          contact_phone: '138',
          admin_username: 'admin',
          view_username: '',
          view_cn_name: '',
        },
      },
    });

    renderWithRouter('/sysadmin/edit/2');

    await waitFor(() => {
      expect(screen.getByText('修改公司')).toBeInTheDocument();
    });
  });
});
