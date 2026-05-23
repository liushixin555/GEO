/**
 * @jest-environment node
 */
import { Request, Response, NextFunction } from 'express';

// Helper to create a mock request with mutable ip
function createMockReq(overrides: { ip?: string; remoteAddress?: string; userAgent?: string } = {}) {
  const req: any = {
    socket: { remoteAddress: overrides.remoteAddress ?? '127.0.0.1' },
    headers: { 'user-agent': overrides.userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) normal-browser' },
  };
  Object.defineProperty(req, 'ip', {
    get: () => overrides.ip,
    configurable: true,
  });
  return req as Partial<Request>;
}

describe('antiCrawlMiddleware', () => {
  let antiCrawlMiddleware: (req: Request, res: Response, next: NextFunction) => void;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    antiCrawlMiddleware = require('../../../apis/middleware/anti-crawl.middleware').antiCrawlMiddleware;

    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockReq = createMockReq();
    mockRes = { status: statusFn } as Partial<Response>;
    mockNext = jest.fn();
  });

  // =========================================================
  // 1. 正常请求通过 next()
  // =========================================================
  describe('正常请求', () => {
    it('应该对带有合法 User-Agent 的请求调用 next()', () => {
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('应该使用 req.ip 作为标识', () => {
      mockReq = createMockReq({ ip: '10.0.0.1' });
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('当 req.ip 不存在时应该使用 socket.remoteAddress', () => {
      mockReq = createMockReq({ remoteAddress: '192.168.1.1' });

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('当 ip 和 remoteAddress 都不存在时应该使用 "unknown"', () => {
      // Create a bare object without ip getter
      mockReq = {
        ip: undefined,
        socket: {} as any,
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) normal-browser' },
      } as any;

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2. IP 封锁检查
  // =========================================================
  describe('IP 封锁检查', () => {
    it('被封锁的 IP 应该返回 403', () => {
      const THRESHOLD = 200;
      for (let i = 0; i <= THRESHOLD; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '访问被拒绝' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 3. 封锁过期自动解除
  // =========================================================
  describe('封锁过期自动解除', () => {
    it('封锁到期后应该自动解除并允许请求通过', () => {
      const THRESHOLD = 200;
      for (let i = 0; i <= THRESHOLD; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600001);

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });
  });

  // =========================================================
  // 4. 请求计数与窗口重置
  // =========================================================
  describe('请求计数与窗口重置', () => {
    it('同一 IP 多次请求应该累计计数直到阈值', () => {
      const THRESHOLD = 200;
      for (let i = 0; i < THRESHOLD; i++) {
        (mockNext as jest.Mock).mockClear();
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '访问被拒绝' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('不同 IP 应该独立计数', () => {
      // 100 requests from IP1
      const req1 = createMockReq({ ip: '10.0.0.1' });
      for (let i = 0; i < 100; i++) {
        antiCrawlMiddleware(req1 as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 100 requests from IP2 should also all pass
      const req2 = createMockReq({ ip: '10.0.0.2' });
      (mockNext as jest.Mock).mockClear();
      for (let i = 0; i < 100; i++) {
        antiCrawlMiddleware(req2 as Request, mockRes as Response, mockNext);
      }
      expect((mockNext as jest.Mock).mock.calls.length).toBe(100);
    });

    it('窗口过期后计数应该重置', () => {
      for (let i = 0; i < 150; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 60001);

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // Count resets to 1
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();

      // Should be able to send another 200 requests
      for (let i = 0; i < 200; i++) {
        (mockNext as jest.Mock).mockClear();
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);

      (Date.now as jest.Mock).mockRestore();
    });
  });

  // =========================================================
  // 5. User-Agent 检查
  // =========================================================
  describe('User-Agent 检查', () => {
    it('没有 User-Agent 应该返回 403', () => {
      mockReq.headers = {};

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '访问被拒绝' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('User-Agent 长度小于 10 应该返回 403', () => {
      mockReq.headers = { 'user-agent': 'short' };

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '访问被拒绝' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('User-Agent 长度等于 10 应该通过', () => {
      mockReq.headers = { 'user-agent': '0123456789' };

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('User-Agent 长度为 9 应该返回 403', () => {
      mockReq.headers = { 'user-agent': '012345678' };

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('合法的 User-Agent 应该通过', () => {
      mockReq.headers = { 'user-agent': 'Mozilla/5.0 (compatible; Bot/1.0)' };

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 6. 超过阈值触发封锁
  // =========================================================
  describe('超过阈值触发封锁', () => {
    it('达到阈值（201次请求）后应该封锁 IP 并返回 403', () => {
      const THRESHOLD = 200;

      for (let i = 0; i < THRESHOLD; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '访问被拒绝' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('封锁后清除该 IP 的请求计数', () => {
      const THRESHOLD = 200;

      for (let i = 0; i <= THRESHOLD; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600001);

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });
  });

  // =========================================================
  // 7. 边界条件与复合场景
  // =========================================================
  describe('边界条件与复合场景', () => {
    it('被封锁 IP 的后续请求在封锁期内都应返回 403', () => {
      const THRESHOLD = 200;

      for (let i = 0; i <= THRESHOLD; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      for (let i = 0; i < 5; i++) {
        statusFn.mockClear();
        jsonFn.mockClear();
        (mockNext as jest.Mock).mockClear();

        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(statusFn).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      }
    });

    it('一个 IP 被封锁不应影响其他 IP', () => {
      const THRESHOLD = 200;

      const req1 = createMockReq({ ip: '10.0.0.1' });
      for (let i = 0; i <= THRESHOLD; i++) {
        antiCrawlMiddleware(req1 as Request, mockRes as Response, mockNext);
      }

      const req2 = createMockReq({ ip: '10.0.0.2' });
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(req2 as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('恰好 200 次请求不应触发封锁（第 201 次才触发）', () => {
      const THRESHOLD = 200;

      for (let i = 0; i < THRESHOLD; i++) {
        (mockNext as jest.Mock).mockClear();
        statusFn.mockClear();
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(statusFn).not.toHaveBeenCalled();
      }

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('窗口内请求计数准确（验证 count 递增）', () => {
      for (let i = 0; i < 50; i++) {
        (mockNext as jest.Mock).mockClear();
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      for (let i = 0; i < 150; i++) {
        (mockNext as jest.Mock).mockClear();
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('封锁到期后，过期的封锁记录应被清除', () => {
      const THRESHOLD = 200;

      for (let i = 0; i <= THRESHOLD; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600001);

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });

    it('请求计数恰好等于阈值时不应封锁（count > THRESHOLD 才封锁）', () => {
      for (let i = 0; i < 200; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
    });
  });
});
