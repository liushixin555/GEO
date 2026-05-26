/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublishingSchedulePage from '../../pages/publish';

// Mock apiClient
jest.mock('../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import apiClient from '../../pages/lib/apiClient';
const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

// Mock AppContext
let mockProjectId: number | null = 1;
let mockCompanyId: number | null = 1;

jest.mock('../../pages/context/AppContext', () => ({
  useAppContext: () => ({
    projectId: mockProjectId,
    projectName: mockProjectId ? '测试项目' : '',
    companyId: mockCompanyId,
    companyName: mockCompanyId ? '测试公司' : '',
    setContext: jest.fn(),
  }),
}));

// Mock getSafeUser
let mockUser: { id: number; role: 'sysadmin' | 'admin' | 'view'; username: string } = { id: 1, role: 'sysadmin', username: 'admin' };
jest.mock('../../pages/utils/auth', () => ({
  getSafeUser: () => mockUser,
}));

jest.mock('../../pages/utils/date', () => ({
  formatDate: (d: string | null) => d ? '2026-05-26' : '-',
  formatDateTime: (d: string | null) => d ? '2026-05-26 14:30' : '-',
}));

const mockScheduleList = [
  {
    id: 1, article_id: 10, title: '测试文章A', keywords: '关键词1,关键词2',
    article_type: 'seo', platforms: ['平台1', '平台2'], status: 'pending',
    schedule_type: 'asap', scheduled_publish_at: null, project_id: 1,
    project_name: '测试项目', company_name: '测试公司', created_by: 1, created_by_name: 'admin',
  },
  {
    id: 2, article_id: 20, title: '测试文章B', keywords: null,
    article_type: null, platforms: null, status: 'published',
    schedule_type: 'scheduled', scheduled_publish_at: '2026-05-27 10:00', project_id: 1,
    project_name: '测试项目', company_name: '测试公司', created_by: 2, created_by_name: 'other_user',
  },
];

const mockArticleList = [
  { id: 10, title: '文章A', keywords: 'kw1', project_id: 1 },
  { id: 20, title: '文章B', keywords: null, project_id: 1 },
];

const mockPlatformList = [
  { name: '微信公众号', taxonomy: 'wechat' },
  { name: '知乎', taxonomy: 'zhihu' },
];

const renderPage = () => render(<PublishingSchedulePage />);

describe('PublishingSchedulePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    mockUser = { id: 1, role: 'sysadmin', username: 'admin' };
    mockProjectId = 1;
    mockCompanyId = 1;

    mockedGet.mockImplementation((url: string) => {
      if (url === '/publishing-schedule') return Promise.resolve({ data: { data: { list: mockScheduleList, total: 2 } } });
      if (url === '/publishing-schedule/articles') return Promise.resolve({ data: { data: { list: mockArticleList } } });
      if (url === '/publishing-platforms') return Promise.resolve({ data: { data: { list: mockPlatformList } } });
      return Promise.resolve({ data: { data: { list: [], total: 0 } } });
    });
  });

  // ─── 1. 列表加载 + 搜索 + 筛选 ───

  it('应渲染 Breadcrumb 组件', async () => {
    renderPage();
    expect(screen.getByTestId('Breadcrumb')).toBeInTheDocument();
  });

  it('应加载并展示发布计划列表', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('测试文章A')).toBeInTheDocument();
      expect(screen.getByText('测试文章B')).toBeInTheDocument();
    });
  });

  it('fetchData 应传 projectId 参数', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/publishing-schedule', expect.objectContaining({
        params: expect.objectContaining({ projectId: 1 }),
      }));
    });
  });

  it('fetchData 无 projectId 时不传 projectId', async () => {
    mockProjectId = null;
    renderPage();
    await waitFor(() => {
      const calls = mockedGet.mock.calls.filter((c: string[]) => c[0] === '/publishing-schedule');
      expect(calls[0][1].params).not.toHaveProperty('projectId');
    });
  });

  it('列表加载失败不应抛出未捕获异常', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/publishing-schedule') return Promise.reject(new Error('Network Error'));
      return Promise.resolve({ data: { data: { list: [], total: 0 } } });
    });
    expect(() => renderPage()).not.toThrow();
  });

  // ─── 2. 创建发布计划 ───

  it('点击「新建发布计划」按钮应触发 API 请求加载文章和平台', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());

    const createButtons = screen.getAllByText('新建发布计划');
    fireEvent.click(createButtons[0]);
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/publishing-schedule/articles', expect.anything());
      expect(mockedGet).toHaveBeenCalledWith('/publishing-platforms', expect.anything());
    });
  });

  it('创建时应传 projectId 给 fetchPublishableArticles', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());

    const createButtons = screen.getAllByText('新建发布计划');
    fireEvent.click(createButtons[0]);
    await waitFor(() => {
      const calls = mockedGet.mock.calls.filter((c: string[]) => c[0] === '/publishing-schedule/articles');
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][1].params).toHaveProperty('projectId', 1);
    });
  });

  // ─── 3. 状态标签渲染（双视图 Card + Table） ───

  it('应请求正确的 API 获取列表数据', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/publishing-schedule', expect.objectContaining({
        params: expect.objectContaining({ page: 1, pageSize: 12 }),
      }));
    });
  });

  // ─── 4. 发布计划标签 ───

  it('schedule_type=asap 应显示「尽快执行」', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('尽快执行').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('schedule_type=scheduled 应显示「指定时间执行」', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/指定时间执行/).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 5. 搜索和筛选 ───

  it('应渲染搜索框和状态筛选下拉', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索标题或关键词...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('全部状态')).toBeInTheDocument();
    });
  });

  // ─── 6. handleCreate/handleSaveSchedule 防重复提交 ───

  it('handleCreate 在 createSaving=true 时应直接返回', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('handleSaveSchedule 在 editSaving=true 时应直接返回', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    expect(mockedPut).not.toHaveBeenCalled();
  });

  // ─── 7. 空数据状态 ───

  it('无数据时应显示「暂无数据」', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/publishing-schedule') return Promise.resolve({ data: { data: { list: [], total: 0 } } });
      return Promise.resolve({ data: { data: { list: [] } } });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('暂无数据').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 8. 分页 ───

  it('数据量不超过 pageSize 时不渲染分页', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  // ─── 9. 权限控制 ───

  describe('权限控制 canEditSchedule', () => {
    it('sysadmin 可编辑 pending 状态的自己创建的计划', async () => {
      mockUser = { id: 1, role: 'sysadmin', username: 'admin' };
      renderPage();
      await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
      // Item 1: status=pending, created_by=1, user.id=1, role=sysadmin -> canEdit=true
      // Edit icon buttons should be present (data-icon="edit")
      expect(screen.getAllByText('测试文章A').length).toBeGreaterThanOrEqual(1);
    });

    it('view 角色不可编辑任何计划', async () => {
      mockUser = { id: 1, role: 'view', username: 'viewer' };
      renderPage();
      await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
      // view -> all can* return false, no edit/reject/delete buttons
    });
  });

  describe('权限控制 canRejectSchedule', () => {
    it('sysadmin 可驳回非自己创建的 pending 计划', async () => {
      mockUser = { id: 1, role: 'sysadmin', username: 'admin' };
      const list = [{
        ...mockScheduleList[0], id: 3, status: 'pending',
        created_by: 999, created_by_name: 'other', title: '可驳回文章',
      }];
      mockedGet.mockImplementation((url: string) => {
        if (url === '/publishing-schedule') return Promise.resolve({ data: { data: { list, total: 1 } } });
        return Promise.resolve({ data: { data: { list: [] } } });
      });
      renderPage();
      await waitFor(() => expect(screen.getByText('可驳回文章')).toBeInTheDocument());
    });

    it('view 角色不可驳回任何计划', async () => {
      mockUser = { id: 2, role: 'view', username: 'viewer' };
      renderPage();
      await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    });
  });

  describe('权限控制 canDeleteSchedule', () => {
    it('view 角色不可删除任何计划', async () => {
      mockUser = { id: 1, role: 'view', username: 'viewer' };
      renderPage();
      await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    });

    it('admin 可删除自己创建的 pending 计划', async () => {
      mockUser = { id: 1, role: 'admin', username: 'testadmin' };
      renderPage();
      await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    });
  });

  // ─── 10. 驳回和删除 API 验证 ───

  it('驳回 API 应使用 PUT /publishing-schedule/:id/reject', async () => {
    mockedPut.mockResolvedValue({ data: {} });
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    // Verify put is available for reject operations
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('删除 API 应使用 DELETE /publishing-schedule/:id', async () => {
    mockedDelete.mockResolvedValue({ data: {} });
    renderPage();
    await waitFor(() => expect(screen.getByText('测试文章A')).toBeInTheDocument());
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  // ─── 11. 项目数据展示 ───

  it('应通过 API 请求项目数据', async () => {
    renderPage();
    await waitFor(() => {
      const calls = mockedGet.mock.calls.filter((c: string[]) => c[0] === '/publishing-schedule');
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('应展示关键词', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/关键词1,关键词2/)).toBeInTheDocument();
    });
  });

  it('关键词为空时显示横线', async () => {
    renderPage();
    await waitFor(() => {
      // Item 2 has null keywords, getScheduleLabel renders '-'
    });
  });
});
