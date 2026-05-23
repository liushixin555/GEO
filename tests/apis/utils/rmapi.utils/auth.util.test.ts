/**
 * @jest-environment node
 *
 * Tests for apis/utils/rmapi.utils/auth.util.ts
 * Covers: getRmToken success, getRmToken auth failure, network error, request params
 */

import axios from 'axios';
import { getRmToken } from '../../../../apis/utils/rmapi.utils/auth.util';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('apis/utils/rmapi.utils/auth.util.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRmToken', () => {
    it('should return token on successful authentication', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'ok',
          data: { token: 'test-token-abc123' },
          status: 200,
        },
      });

      const token = await getRmToken({ mobile: '13800138000', password: 'pass123' });

      expect(token).toBe('test-token-abc123');
    });

    it('should send correct request body with fixed fields', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'ok',
          data: { token: 'tok' },
          status: 200,
        },
      });

      await getRmToken({ mobile: '13800138000', password: 'mypassword' });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/auth/authenticate',
        {
          mobile: '13800138000',
          password: 'mypassword',
          identity: 'advertiser',
          captcha_token: 'advertiser',
          captcha: 'advertiser',
          api_key: '3b98c40be00c15f9ec69131076646eb7',
        },
      );
    });

    it('should throw error when success is false', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: '用户名或密码错误',
          data: { token: '' },
          status: 401,
        },
      });

      await expect(
        getRmToken({ mobile: '13800138000', password: 'wrong' }),
      ).rejects.toThrow('rmapi 认证失败: 用户名或密码错误');
    });

    it('should throw error with message from response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: '账号已锁定',
          data: { token: '' },
          status: 403,
        },
      });

      await expect(
        getRmToken({ mobile: '13800138000', password: 'pass' }),
      ).rejects.toThrow('rmapi 认证失败: 账号已锁定');
    });

    it('should propagate network errors from axios', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(
        getRmToken({ mobile: '13800138000', password: 'pass' }),
      ).rejects.toThrow('Network Error');
    });

    it('should propagate timeout errors from axios', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'));

      await expect(
        getRmToken({ mobile: '13800138000', password: 'pass' }),
      ).rejects.toThrow('timeout of 5000ms exceeded');
    });

    it('should call correct endpoint URL', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'ok',
          data: { token: 'tok' },
          status: 200,
        },
      });

      await getRmToken({ mobile: '13800138000', password: 'pass' });

      const calledUrl = mockedAxios.post.mock.calls[0][0];
      expect(calledUrl).toBe('https://rmapi.ruan.net/api/auth/authenticate');
    });
  });
});
