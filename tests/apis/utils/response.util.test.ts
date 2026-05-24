/**
 * @jest-environment node
 *
 * Tests for apis/utils/response.util.ts
 * Covers: success, fail, paginate
 */

import { success, created, fail, paginate } from '../../../apis/utils/response.util';
import { Response } from 'express';

function mockResponse(): Response {
  const res: Record<string, jest.Mock> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
}

describe('apis/utils/response.util.ts', () => {
  describe('success', () => {
    it('should return json with code 0, default message and data', () => {
      const res = mockResponse();
      success(res, { id: 1 });

      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: { id: 1 },
      });
    });

    it('should use custom message when provided', () => {
      const res = mockResponse();
      success(res, null, '创建成功');

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: null,
      });
    });

    it('should handle string data', () => {
      const res = mockResponse();
      success(res, 'hello');

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: 'hello',
      });
    });

    it('should handle array data', () => {
      const res = mockResponse();
      success(res, [1, 2, 3]);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: [1, 2, 3],
      });
    });

    it('should handle undefined data', () => {
      const res = mockResponse();
      success(res, undefined);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: undefined,
      });
    });

    it('should return the result of res.json', () => {
      const res = mockResponse();
      const result = success(res, 'data');

      expect(result).toBe(res);
    });

    it('should handle numeric data', () => {
      const res = mockResponse();
      success(res, 42);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: 42,
      });
    });

    it('should handle boolean data', () => {
      const res = mockResponse();
      success(res, false);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: false,
      });
    });

    it('should handle empty object data', () => {
      const res = mockResponse();
      success(res, {});

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '操作成功',
        data: {},
      });
    });
  });

  describe('created', () => {
    it('should return status 201 with code 0, default message and data', () => {
      const res = mockResponse();
      created(res, { id: 1 });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: { id: 1 },
      });
    });

    it('should use custom message when provided', () => {
      const res = mockResponse();
      created(res, null, '用户已创建');

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '用户已创建',
        data: null,
      });
    });

    it('should handle undefined data', () => {
      const res = mockResponse();
      created(res, undefined);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: undefined,
      });
    });

    it('should handle array data', () => {
      const res = mockResponse();
      created(res, [1, 2, 3]);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: [1, 2, 3],
      });
    });

    it('should handle empty string message', () => {
      const res = mockResponse();
      created(res, { id: 1 }, '');

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '',
        data: { id: 1 },
      });
    });

    it('should return the result of res.json', () => {
      const res = mockResponse();
      const result = created(res, 'data');

      expect(result).toBe(res);
    });

    it('should handle numeric data', () => {
      const res = mockResponse();
      created(res, 100);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: 100,
      });
    });

    it('should handle boolean data', () => {
      const res = mockResponse();
      created(res, true);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: true,
      });
    });

    it('should handle empty object data', () => {
      const res = mockResponse();
      created(res, {});

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: {},
      });
    });
  });

  describe('fail', () => {
    it('should return status 400 and json with code and message for code < 400', () => {
      const res = mockResponse();
      fail(res, 0, '参数错误');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: '参数错误',
      });
    });

    it('should return status 400 and json for code exactly 400', () => {
      const res = mockResponse();
      fail(res, 400, 'Bad Request');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Bad Request',
      });
    });

    it('should return status 401 for code 401', () => {
      const res = mockResponse();
      fail(res, 401, '未授权');

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: '未授权',
      });
    });

    it('should return status 403 for code 403', () => {
      const res = mockResponse();
      fail(res, 403, '禁止访问');

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        message: '禁止访问',
      });
    });

    it('should return status 404 for code 404', () => {
      const res = mockResponse();
      fail(res, 404, '资源不存在');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message: '资源不存在',
      });
    });

    it('should return status 500 for code 500', () => {
      const res = mockResponse();
      fail(res, 500, '服务器内部错误');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '服务器内部错误',
      });
    });

    it('should return status 400 for arbitrary code like 100', () => {
      const res = mockResponse();
      fail(res, 100, '自定义错误');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 100,
        message: '自定义错误',
      });
    });

    it('should return status 422 for code 422', () => {
      const res = mockResponse();
      fail(res, 422, '验证失败');

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        code: 422,
        message: '验证失败',
      });
    });

    it('should return status 400 for negative code', () => {
      const res = mockResponse();
      fail(res, -1, '负数错误码');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: -1,
        message: '负数错误码',
      });
    });

    it('should return status 503 for code 503', () => {
      const res = mockResponse();
      fail(res, 503, '服务不可用');

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        code: 503,
        message: '服务不可用',
      });
    });

    it('should handle empty string message', () => {
      const res = mockResponse();
      fail(res, 400, '');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '',
      });
    });

    it('should return the result of res.json chain', () => {
      const res = mockResponse();
      const result = fail(res, 400, 'error');

      expect(result).toBe(res);
    });

    it('should use code as status when code is exactly 399 (boundary < 400)', () => {
      const res = mockResponse();
      fail(res, 399, '接近400');

      expect(res.status).toHaveBeenCalledWith(400); // 399 < 400 so fallback to 400
      expect(res.json).toHaveBeenCalledWith({
        code: 399,
        message: '接近400',
      });
    });

    it('should return status 429 for code 429 (rate limit)', () => {
      const res = mockResponse();
      fail(res, 429, '请求过于频繁');

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        code: 429,
        message: '请求过于频繁',
      });
    });

    it('should handle very large error code', () => {
      const res = mockResponse();
      fail(res, 599, '自定义5xx');

      expect(res.status).toHaveBeenCalledWith(599);
      expect(res.json).toHaveBeenCalledWith({
        code: 599,
        message: '自定义5xx',
      });
    });

    it('should handle unicode message', () => {
      const res = mockResponse();
      fail(res, 400, '参数错误：名称包含特殊字符 🎉');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '参数错误：名称包含特殊字符 🎉',
      });
    });
  });

  describe('paginate', () => {
    it('should return paginated result with all fields', () => {
      const res = mockResponse();
      const list = [{ id: 1 }, { id: 2 }];
      paginate(res, list, 100, 1, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: [{ id: 1 }, { id: 2 }],
          total: 100,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it('should handle empty list', () => {
      const res = mockResponse();
      paginate(res, [], 0, 1, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it('should handle last page with partial results', () => {
      const res = mockResponse();
      paginate(res, [{ id: 97 }, { id: 98 }, { id: 99 }], 99, 10, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: [{ id: 97 }, { id: 98 }, { id: 99 }],
          total: 99,
          page: 10,
          pageSize: 10,
        },
      });
    });

    it('should handle large page numbers', () => {
      const res = mockResponse();
      paginate(res, [], 50, 999, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: [],
          total: 50,
          page: 999,
          pageSize: 10,
        },
      });
    });

    it('should handle page size of 1', () => {
      const res = mockResponse();
      paginate(res, [{ id: 1 }], 500, 1, 1);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: [{ id: 1 }],
          total: 500,
          page: 1,
          pageSize: 1,
        },
      });
    });

    it('should return the result of res.json', () => {
      const res = mockResponse();
      const result = paginate(res, [], 0, 1, 10);

      expect(result).toBe(res);
    });

    it('should handle string list items', () => {
      const res = mockResponse();
      paginate(res, ['a', 'b', 'c'], 3, 1, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: ['a', 'b', 'c'],
          total: 3,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it('should handle single item list with total 1', () => {
      const res = mockResponse();
      paginate(res, [{ id: 1 }], 1, 1, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: [{ id: 1 }],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it('should handle nested object data', () => {
      const res = mockResponse();
      const items = [{ user: { name: 'Alice', age: 30 } }];
      paginate(res, items, 1, 1, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          list: items,
          total: 1,
          page: 1,
          pageSize: 10,
        },
      });
    });

    it('should handle zero page and zero pageSize', () => {
      const res = mockResponse();
      paginate(res, [], 0, 0, 0);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: { list: [], total: 0, page: 0, pageSize: 0 },
      });
    });

    it('should handle negative page and pageSize values', () => {
      const res = mockResponse();
      paginate(res, [], 0, -1, -10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: { list: [], total: 0, page: -1, pageSize: -10 },
      });
    });

    it('should handle very large total', () => {
      const res = mockResponse();
      paginate(res, [{ id: 1 }], Number.MAX_SAFE_INTEGER, 1, 10);

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: { list: [{ id: 1 }], total: Number.MAX_SAFE_INTEGER, page: 1, pageSize: 10 },
      });
    });
  });
});
