/**
 * @jest-environment node
 */
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

import {
  getRmToken,
  getRmResources,
  getAllRmResources,
  submitRmOrder,
} from '../../apis/utils/rmapi.utils';

// ─── 构造 mock 数据 ──────────────────────────────────────────

const mockResourceItem = (id: number) => ({
  id,
  taxonomy: '新闻',
  title_limit: 20,
  name: `测试媒体${id}`,
  price: 100,
  in_level: 1,
  url_type: ['news'],
  baidu: 1,
  remark: '',
  url: `https://example.com/${id}`,
  case_url: '',
  include_rate: 90,
  publish_rate: 80,
  publish_type_name: null,
  price_market: 200,
  price_agenta: 150,
  price_agentb: 130,
  price_agentc: 120,
});

const mockResourceResponse = (
  page: number,
  lastPage: number,
  items: ReturnType<typeof mockResourceItem>[]
) => ({
  success: true,
  pagination: {
    current_page: page,
    last_page: lastPage,
    per_page: 20,
    total: items.length * lastPage,
  },
  data: items,
  status: 1,
});

// ─── getRmToken ──────────────────────────────────────────────

describe('getRmToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return token on successful authentication', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'ok',
        data: { token: 'mock-token-abc' },
        status: 1,
      },
    });

    const token = await getRmToken({ mobile: '13800000000', password: 'pass' });

    expect(token).toBe('mock-token-abc');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://rmapi.ruan.net/api/auth/authenticate',
      expect.objectContaining({
        mobile: '13800000000',
        password: 'pass',
        identity: 'advertiser',
      })
    );
  });

  it('should throw error when authentication fails', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: '密码错误',
        data: { token: '' },
        status: 0,
      },
    });

    await expect(
      getRmToken({ mobile: '13800000000', password: 'wrong' })
    ).rejects.toThrow('rmapi 认证失败: 密码错误');
  });

  it('should propagate network errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

    await expect(
      getRmToken({ mobile: '13800000000', password: 'pass' })
    ).rejects.toThrow('Network Error');
  });
});

// ─── getRmResources ──────────────────────────────────────────

describe('getRmResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch page 1 by default when page is not specified', async () => {
    const items = [mockResourceItem(1), mockResourceItem(2)];
    const responseBody = mockResourceResponse(1, 3, items);

    mockedAxios.get.mockResolvedValueOnce({ data: responseBody });

    const result = await getRmResources({ token: 'test-token' });

    expect(result).toEqual(responseBody);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://rmapi.ruan.net/api/news_resource/data',
      { params: { token: 'test-token', page: 1 } }
    );
  });

  it('should fetch the specified page', async () => {
    const items = [mockResourceItem(3)];
    const responseBody = mockResourceResponse(2, 3, items);

    mockedAxios.get.mockResolvedValueOnce({ data: responseBody });

    const result = await getRmResources({ token: 'test-token', page: 2 });

    expect(result).toEqual(responseBody);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://rmapi.ruan.net/api/news_resource/data',
      { params: { token: 'test-token', page: 2 } }
    );
  });

  it('should pass page=1 explicitly when provided', async () => {
    const responseBody = mockResourceResponse(1, 1, [mockResourceItem(1)]);

    mockedAxios.get.mockResolvedValueOnce({ data: responseBody });

    const result = await getRmResources({ token: 't', page: 1 });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://rmapi.ruan.net/api/news_resource/data',
      { params: { token: 't', page: 1 } }
    );
    expect(result.pagination.current_page).toBe(1);
  });

  it('should return empty data array when API returns no items', async () => {
    const responseBody = mockResourceResponse(1, 1, []);

    mockedAxios.get.mockResolvedValueOnce({ data: responseBody });

    const result = await getRmResources({ token: 'test-token' });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('should return full resource item fields', async () => {
    const item = mockResourceItem(42);
    const responseBody = mockResourceResponse(1, 1, [item]);

    mockedAxios.get.mockResolvedValueOnce({ data: responseBody });

    const result = await getRmResources({ token: 'test-token' });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 42,
        taxonomy: '新闻',
        title_limit: 20,
        name: '测试媒体42',
        price: 100,
        include_rate: 90,
        publish_rate: 80,
      })
    );
  });

  it('should propagate axios errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'));

    await expect(
      getRmResources({ token: 'test-token', page: 1 })
    ).rejects.toThrow('timeout');
  });

  it('should propagate HTTP error responses (e.g. 401)', async () => {
    const error = new Error('Request failed with status code 401');
    mockedAxios.get.mockRejectedValueOnce(error);

    await expect(
      getRmResources({ token: 'invalid-token' })
    ).rejects.toThrow('Request failed with status code 401');
  });
});

// ─── getAllRmResources ───────────────────────────────────────

describe('getAllRmResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all pages and combine results', async () => {
    const page1Items = [mockResourceItem(1), mockResourceItem(2)];
    const page2Items = [mockResourceItem(3), mockResourceItem(4)];
    const page3Items = [mockResourceItem(5)];

    mockedAxios.get
      .mockResolvedValueOnce({
        data: mockResourceResponse(1, 3, page1Items),
      })
      .mockResolvedValueOnce({
        data: mockResourceResponse(2, 3, page2Items),
      })
      .mockResolvedValueOnce({
        data: mockResourceResponse(3, 3, page3Items),
      });

    const result = await getAllRmResources('test-token');

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      1,
      'https://rmapi.ruan.net/api/news_resource/data',
      { params: { token: 'test-token', page: 1 } }
    );
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      'https://rmapi.ruan.net/api/news_resource/data',
      { params: { token: 'test-token', page: 2 } }
    );
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      3,
      'https://rmapi.ruan.net/api/news_resource/data',
      { params: { token: 'test-token', page: 3 } }
    );
  });

  it('should return first page items when there is only one page', async () => {
    const items = [mockResourceItem(1), mockResourceItem(2)];
    mockedAxios.get.mockResolvedValueOnce({
      data: mockResourceResponse(1, 1, items),
    });

    const result = await getAllRmResources('test-token');

    expect(result).toEqual(items);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when first page has no items', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: mockResourceResponse(1, 1, []),
    });

    const result = await getAllRmResources('test-token');

    expect(result).toEqual([]);
  });

  it('should propagate errors from getRmResources', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Server Error'));

    await expect(getAllRmResources('bad-token')).rejects.toThrow('Server Error');
  });

  it('should propagate errors from a later page fetch', async () => {
    const page1Items = [mockResourceItem(1)];

    mockedAxios.get
      .mockResolvedValueOnce({
        data: mockResourceResponse(1, 2, page1Items),
      })
      .mockRejectedValueOnce(new Error('timeout on page 2'));

    await expect(getAllRmResources('test-token')).rejects.toThrow(
      'timeout on page 2'
    );
  });
});

// ─── submitRmOrder ───────────────────────────────────────────

describe('submitRmOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit order and return response', async () => {
    const orderResponse = {
      success: true,
      message: '提交成功',
      data: { order_id: 12345 },
      status: 1,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: orderResponse });

    const result = await submitRmOrder({
      token: 'test-token',
      title: '测试标题',
      content: '<p>测试内容</p>',
      resource_id: 100,
    });

    expect(result).toEqual(orderResponse);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://rmapi.ruan.net/api/news_order',
      {
        token: 'test-token',
        title: '测试标题',
        content: '<p>测试内容</p>',
        resource_id: 100,
      }
    );
  });

  it('should propagate submission errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Order Failed'));

    await expect(
      submitRmOrder({
        token: 'test-token',
        title: '测试',
        content: '内容',
        resource_id: 1,
      })
    ).rejects.toThrow('Order Failed');
  });
});
