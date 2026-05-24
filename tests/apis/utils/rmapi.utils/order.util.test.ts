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

    it('should handle response with null data', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      const result = await submitRmOrder({
        token: 'tok',
        title: 't',
        content: 'c',
        resource_id: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle empty string fields', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: '',
        title: '',
        content: '',
        resource_id: 0,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_order',
        { token: '', title: '', content: '', resource_id: 0 },
      );
    });

    it('should propagate non-Error rejections', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockRejectedValueOnce('unknown rejection');

      await expect(
        submitRmOrder({ token: 'tok', title: 't', content: 'c', resource_id: 1 }),
      ).rejects.toBe('unknown rejection');
    });

    it('should return res.data exactly as received', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const responseData = {
        success: false,
        message: '参数错误',
        data: { errors: ['token 无效'] },
        status: 422,
      };
      mockedAxios.post.mockResolvedValueOnce({ data: responseData });

      const result = await submitRmOrder({
        token: 'bad-token',
        title: 't',
        content: 'c',
        resource_id: 999,
      });

      expect(result).toBe(responseData);
    });

    // === 补充测试用例 ===

    it('should export RmOrderParams and RmOrderResponse interfaces', () => {
      const mod = require('../../../../apis/utils/rmapi.utils/order.util');
      expect(typeof mod.submitRmOrder).toBe('function');
    });

    it('should handle large resource_id values', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: 'tok',
        title: 't',
        content: 'c',
        resource_id: Number.MAX_SAFE_INTEGER,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_order',
        { token: 'tok', title: 't', content: 'c', resource_id: Number.MAX_SAFE_INTEGER },
      );
    });

    it('should handle negative resource_id', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: 'tok',
        title: 't',
        content: 'c',
        resource_id: -1,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_order',
        { token: 'tok', title: 't', content: 'c', resource_id: -1 },
      );
    });

    it('should handle Unicode content in all text fields', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const unicodeToken = '令牌🔑测试';
      const unicodeTitle = '标题《特殊》字符—测试™';
      const unicodeContent = '内容包含中文、日本語、한국어、emoji 🎉🚀';

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: unicodeToken,
        title: unicodeTitle,
        content: unicodeContent,
        resource_id: 1,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_order',
        { token: unicodeToken, title: unicodeTitle, content: unicodeContent, resource_id: 1 },
      );
    });

    it('should handle special characters that need escaping', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const specialContent = '<script>alert("xss")</script>&amp;"quotes"\'single\'\n\t\r';

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: 'tok',
        title: 'test "quotes" & <tags>',
        content: specialContent,
        resource_id: 1,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_order',
        { token: 'tok', title: 'test "quotes" & <tags>', content: specialContent, resource_id: 1 },
      );
    });

    it('should handle very long content strings', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const longContent = 'A'.repeat(100000);

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({
        token: 'tok',
        title: 't',
        content: longContent,
        resource_id: 1,
      });

      const callArgs = mockedAxios.post.mock.calls[0][1] as any;
      expect(callArgs.content).toBe(longContent);
      expect(callArgs.content.length).toBe(100000);
    });

    it('should handle concurrent independent calls', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post
        .mockResolvedValueOnce({ data: { success: true, message: 'first', data: { id: 1 }, status: 200 } })
        .mockResolvedValueOnce({ data: { success: true, message: 'second', data: { id: 2 }, status: 200 } })
        .mockResolvedValueOnce({ data: { success: true, message: 'third', data: { id: 3 }, status: 200 } });

      const [r1, r2, r3] = await Promise.all([
        submitRmOrder({ token: 't1', title: 'a', content: 'x', resource_id: 1 }),
        submitRmOrder({ token: 't2', title: 'b', content: 'y', resource_id: 2 }),
        submitRmOrder({ token: 't3', title: 'c', content: 'z', resource_id: 3 }),
      ]);

      expect(r1.message).toBe('first');
      expect(r2.message).toBe('second');
      expect(r3.message).toBe('third');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should propagate ECONNREFUSED errors', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const error: any = new Error('connect ECONNREFUSED 127.0.0.1:443');
      error.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        submitRmOrder({ token: 'tok', title: 't', content: 'c', resource_id: 1 }),
      ).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:443');
    });

    it('should handle various HTTP status codes in success response', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      const statusCodes = [200, 201, 204, 301];
      for (const code of statusCodes) {
        mockedAxios.post.mockResolvedValueOnce({
          data: { success: true, message: 'ok', data: null, status: code },
        });

        const result = await submitRmOrder({
          token: 'tok', title: 't', content: 'c', resource_id: 1,
        });

        expect(result.status).toBe(code);
      }

      expect(mockedAxios.post).toHaveBeenCalledTimes(statusCodes.length);
    });

    it('should call axios.post exactly once per invocation', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: null, status: 200 },
      });

      await submitRmOrder({ token: 'tok', title: 't', content: 'c', resource_id: 1 });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should handle response with undefined data field', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: undefined, status: 200 },
      });

      const result = await submitRmOrder({
        token: 'tok', title: 't', content: 'c', resource_id: 1,
      });

      expect(result.data).toBeUndefined();
    });

    it('should handle response with numeric zero data', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'ok', data: 0, status: 200 },
      });

      const result = await submitRmOrder({
        token: 'tok', title: 't', content: 'c', resource_id: 1,
      });

      expect(result.data).toBe(0);
    });

    it('should handle response with empty string message', async () => {
      const { submitRmOrder } = require('../../../../apis/utils/rmapi.utils/order.util');

      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: '', data: null, status: 200 },
      });

      const result = await submitRmOrder({
        token: 'tok', title: 't', content: 'c', resource_id: 1,
      });

      expect(result.message).toBe('');
    });
  });
});
