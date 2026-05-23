/**
 * @jest-environment node
 *
 * Tests for apis/utils/rmapi.utils/order.util.ts
 * Covers: submitRmOrder (success, request body, errors)
 */

import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('apis/utils/rmapi.utils/order.util.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitRmOrder', () => {
    it('should return response on successful order submission', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const mockResponse = {
        data: {
          success: true,
          message: '订单提交成功',
          data: { order_id: 12345 },
          status: 200,
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await submitRmOrder({
        token: 'test-token',
        title: '测试标题',
        content: '测试内容',
        resource_id: 100,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('订单提交成功');
      expect(result.data).toEqual({ order_id: 12345 });
      expect(result.status).toBe(200);
    });

    it('should send correct request body', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: 'my-token-xyz',
        title: '文章标题',
        content: '文章内容',
        resource_id: 42,
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_order',
        {
          token: 'my-token-xyz',
          title: '文章标题',
          content: '文章内容',
          resource_id: 42,
        },
      );
    });

    it('should call correct endpoint URL', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: 'tok',
        title: 't',
        content: 'c',
        resource_id: 1,
      });

      const calledUrl = mockedAxios.post.mock.calls[0][0];
      expect(calledUrl).toBe('https://rmapi.ruan.net/api/news_order');
    });

    it('should return response even when success is false', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: '余额不足',
          data: null,
          status: 400,
        },
      });

      const result = await submitRmOrder({
        token: 'tok',
        title: 't',
        content: 'c',
        resource_id: 1,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('余额不足');
      expect(result.status).toBe(400);
    });

    it('should propagate network errors', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(
        submitRmOrder({ token: 'tok', title: 't', content: 'c', resource_id: 1 }),
      ).rejects.toThrow('Network Error');
    });

    it('should propagate timeout errors', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));

      await expect(
        submitRmOrder({ token: 'tok', title: 't', content: 'c', resource_id: 1 }),
      ).rejects.toThrow('timeout of 10000ms exceeded');
    });

    it('should propagate HTTP error with response', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const error: any = new Error('Request failed with status code 500');
      error.response = { status: 500, data: { message: 'Internal Server Error' } };
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        submitRmOrder({ token: 'tok', title: 't', content: 'c', resource_id: 1 }),
      ).rejects.toThrow('Request failed with status code 500');
    });

    it('should handle response with various data types', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const complexData = {
        order_id: 999,
        items: [{ id: 1, name: 'item1' }],
        metadata: { key: 'value' },
      };
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'ok',
          data: complexData,
          status: 201,
        },
      });

      const result = await submitRmOrder({
        token: 'tok',
        title: 't',
        content: 'c',
        resource_id: 1,
      });

      expect(result.data).toEqual(complexData);
      expect(result.status).toBe(201);
    });
  });
});
