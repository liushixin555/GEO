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

  // =========================================================
  // 8. evictOldest 驱逐策略（MAX_ENTRIES 触发）
  // =========================================================
  describe('evictOldest 驱逐策略', () => {
    it('requestCounts 超过 MAX_ENTRIES 时应驱逐最旧条目', () => {
      // 填满 MAX_ENTRIES (10,000) 个不同 IP
      for (let i = 0; i < 10_000; i++) {
        const req = createMockReq({ ip: `10.1.${Math.floor(i / 256)}.${i % 256}` });
        antiCrawlMiddleware(req as Request, mockRes as Response, mockNext);
      }

      // 第一个 IP 发过请求，计数为 1
      // 现在添加第 10,001 个 IP，应触发 evictOldest，移除第一个 IP 的记录
      const extraReq = createMockReq({ ip: '99.99.99.99' });
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(extraReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 第一个 IP (10.1.0.0) 已被驱逐，重新发送应从 count=1 开始
      const firstReq = createMockReq({ ip: '10.1.0.0' });
      for (let i = 0; i < 200; i++) {
        (mockNext as jest.Mock).mockClear();
        antiCrawlMiddleware(firstReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('blockedIPs 超过 MAX_ENTRIES 时应驱逐最旧条目', () => {
      // 让 10,000 个不同 IP 都被封锁
      for (let i = 0; i < 10_000; i++) {
        const req = createMockReq({ ip: `192.168.${Math.floor(i / 256)}.${i % 256}` });
        for (let j = 0; j <= 200; j++) {
          antiCrawlMiddleware(req as Request, mockRes as Response, mockNext);
        }
      }

      // 再让一个新 IP 被封锁，触发 blockedIPs 的 evictOldest
      const newReq = createMockReq({ ip: '88.88.88.88' });
      for (let j = 0; j <= 200; j++) {
        antiCrawlMiddleware(newReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      // 第一个被封锁的 IP (192.168.0.0) 应已被驱逐
      const firstBlockedReq = createMockReq({ ip: '192.168.0.0' });
      antiCrawlMiddleware(firstBlockedReq as Request, mockRes as Response, mockNext);
      // 由于封锁记录被驱逐，请求应该通过（不再被封锁）
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 9. 清理定时器（setInterval 回调）
  // =========================================================
  describe('清理定时器', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('定时器应清理过期的请求计数记录', () => {
      jest.resetModules();
      const { antiCrawlMiddleware: middleware } = require('../../../apis/middleware/anti-crawl.middleware');

      const req = createMockReq({ ip: '55.55.55.55' });
      // 发送 150 次请求建立计数
      for (let i = 0; i < 150; i++) {
        middleware(req as Request, mockRes as Response, mockNext);
      }

      // 推进时间超过 WINDOW_MS，触发清理定时器
      jest.advanceTimersByTime(60_001);

      // 计数应被清理，重新从 count=1 开始
      // 发送 200 次请求不应触发封锁（因为计数已重置）
      (mockNext as jest.Mock).mockClear();
      statusFn.mockClear();
      for (let i = 0; i < 200; i++) {
        (mockNext as jest.Mock).mockClear();
        middleware(req as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 第 201 次才触发封锁
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      middleware(req as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('定时器应清理过期的封锁记录', () => {
      jest.resetModules();
      const { antiCrawlMiddleware: middleware } = require('../../../apis/middleware/anti-crawl.middleware');

      const req = createMockReq({ ip: '66.66.66.66' });
      // 触发封锁
      for (let i = 0; i <= 200; i++) {
        middleware(req as Request, mockRes as Response, mockNext);
      }

      // 推进时间超过 BLOCK_DURATION_MS (10 分钟)，触发清理
      jest.advanceTimersByTime(10 * 60_000 + 1);

      // 封锁已过期，请求应通过
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      middleware(req as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('定时器不应清理未过期的请求计数', () => {
      jest.resetModules();
      const { antiCrawlMiddleware: middleware } = require('../../../apis/middleware/anti-crawl.middleware');

      // 先发旧请求（将被清理）
      const oldReq = createMockReq({ ip: '77.77.77.77' });
      for (let i = 0; i < 50; i++) {
        middleware(oldReq as Request, mockRes as Response, mockNext);
      }

      // 推进时间 30 秒后发新请求（不会被清理）
      jest.advanceTimersByTime(30_000);
      const freshReq = createMockReq({ ip: '88.88.88.88' });
      for (let i = 0; i < 50; i++) {
        middleware(freshReq as Request, mockRes as Response, mockNext);
      }

      // 再推进 30_001ms，总共 60_001ms，触发定时器回调
      // oldReq 的 lastReset = 0ms，now = 60_001ms → 60_001 > 60_000 → 清理
      // freshReq 的 lastReset = 30_000ms，now = 60_001ms → 30_001 <= 60_000 → 保留
      jest.advanceTimersByTime(30_001);

      // freshReq 的计数应保留（50+），再发 151 次就触发封锁
      (mockNext as jest.Mock).mockClear();
      statusFn.mockClear();
      for (let i = 0; i < 150; i++) {
        (mockNext as jest.Mock).mockClear();
        middleware(freshReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 第 201 次触发封锁
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      middleware(freshReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);

      // oldReq 的计数已被清理，重新从 1 开始
      (mockNext as jest.Mock).mockClear();
      statusFn.mockClear();
      middleware(oldReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 10. IP 解析边界条件
  // =========================================================
  describe('IP 解析边界条件', () => {
    it('req.ip 为空字符串时应回退到 socket.remoteAddress', () => {
      mockReq = createMockReq({ ip: '', remoteAddress: '172.16.0.1' });

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('req.socket.remoteAddress 为 undefined 时应使用 "unknown"', () => {
      mockReq = {
        ip: undefined,
        socket: { remoteAddress: undefined } as any,
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) normal-browser' },
      } as any;

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('使用 "unknown" IP 的请求也应正确计数和封锁', () => {
      mockReq = {
        ip: undefined,
        socket: {} as any,
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) normal-browser' },
      } as any;

      // 发送 201 次请求
      for (let i = 0; i <= 200; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
    });
  });

  // =========================================================
  // 11. User-Agent 边界条件补充
  // =========================================================
  describe('User-Agent 边界条件补充', () => {
    it('User-Agent 为空字符串时应返回 403', () => {
      mockReq.headers = { 'user-agent': '' };

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '访问被拒绝' });
    });

    it('User-Agent 为 undefined（header 不存在）时应返回 403', () => {
      mockReq.headers = {};

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('User-Agent 为全空格但长度>=10时应通过', () => {
      mockReq.headers = { 'user-agent': '          ' }; // 10 个空格

      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 12. 封锁持续时间验证
  // =========================================================
  describe('封锁持续时间验证', () => {
    it('封锁应在恰好 10 分钟后过期', () => {
      // 触发封锁
      for (let i = 0; i <= 200; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      const currentTime = Date.now();

      // 9 分 59 秒后仍应被封锁
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 599_999);
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();

      // 10 分钟后应解除封锁
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600_000);
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });
  });

  // =========================================================
  // 13. 连续封锁与解封
  // =========================================================
  describe('连续封锁与解封', () => {
    it('IP 被封锁、解封后再次超限应再次被封锁', () => {
      // 第一次封锁
      for (let i = 0; i <= 200; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 解封（时间过去 10 分钟）
      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600_001);
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 再次超限
      for (let i = 0; i <= 200; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);

      (Date.now as jest.Mock).mockRestore();
    });

    it('多个 IP 同时被封锁和同时解封', () => {
      const ip1Req = createMockReq({ ip: '10.10.10.1' });
      const ip2Req = createMockReq({ ip: '10.10.10.2' });

      // 封锁两个 IP
      for (let i = 0; i <= 200; i++) {
        antiCrawlMiddleware(ip1Req as Request, mockRes as Response, mockNext);
        antiCrawlMiddleware(ip2Req as Request, mockRes as Response, mockNext);
      }

      // 两个 IP 都应被封锁
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(ip1Req as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(ip2Req as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);

      // 10 分钟后两个 IP 都解封
      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600_001);

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(ip1Req as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(ip2Req as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });
  });

  // =========================================================
  // 14. 封锁后请求计数被清除验证
  // =========================================================
  describe('封锁后请求计数清除', () => {
    it('IP 被封锁后 requestCounts 中该 IP 的记录应被删除', () => {
      // 封锁 IP
      for (let i = 0; i <= 200; i++) {
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 解封后立即发送请求，计数应从 1 开始
      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime + 600_001);

      // 发送 200 次请求都不应触发封锁（从 count=1 重新开始）
      for (let i = 0; i < 200; i++) {
        (mockNext as jest.Mock).mockClear();
        statusFn.mockClear();
        antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 第 201 次才再次触发封锁
      statusFn.mockClear();
      (mockNext as jest.Mock).mockClear();
      antiCrawlMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);

      (Date.now as jest.Mock).mockRestore();
    });
  });
});
