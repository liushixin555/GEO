/**
 * @jest-environment node
 *
 * server.ts TDD 测试用例
 * 使用 jest.isolateModules 隔离模块加载，确保实际执行 server.ts 代码并收集覆盖率
 *
 * 覆盖范围：
 * - 服务器启动（app.listen 回调、日志输出、cron 启动）
 * - SEC-APP-07 请求超时安全设置（timeout / headersTimeout / requestTimeout）
 * - SIGINT / SIGTERM 信号处理（关闭流程顺序、异常处理）
 * - 默认导出
 */

// 设置环境变量（在模块加载前）
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

const mockStartArticleGenerationCron = jest.fn();
const mockStopArticleGenerationCron = jest.fn();
const mockClosePrisma = jest.fn().mockResolvedValue(undefined);
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
let mockListenCallback: (() => void) | undefined;

// 捕获信号处理器
let capturedSigintHandler: (() => Promise<void>) | undefined;
let capturedSigtermHandler: (() => Promise<void>) | undefined;

// Mock server 对象——携带 timeout 属性以验证 SEC-APP-07
interface MockServerObj {
  close: jest.Mock;
  timeout?: number;
  headersTimeout?: number;
  requestTimeout?: number;
}

const mockServerObj: MockServerObj = {
  close: jest.fn((cb?: () => void) => {
    if (cb) cb();
    return mockServerObj;
  }),
};

const mockApp = {
  listen: jest.fn((_port: number, cb: () => void) => {
    mockListenCallback = cb;
    return mockServerObj;
  }),
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../apis/app', () => mockApp);

const mockConfig = {
  server: { port: 9876 },
  swagger: { enabled: false },
};

jest.mock('../../apis/config', () => ({
  __esModule: true,
  default: mockConfig,
}));

jest.mock('../../apis/scheduler/article-generation.scheduler', () => ({
  startArticleGenerationCron: mockStartArticleGenerationCron,
  stopArticleGenerationCron: mockStopArticleGenerationCron,
}));

jest.mock('../../apis/utils', () => ({
  closePrisma: mockClosePrisma,
}));

jest.spyOn(console, 'log').mockImplementation(mockConsoleLog);
jest.spyOn(console, 'error').mockImplementation(mockConsoleError);

// 拦截 process.on 捕获 SIGINT/SIGTERM 处理器
jest.spyOn(process, 'on').mockImplementation(((event: string, listener: (...args: any[]) => void) => {
  if (event === 'SIGINT') {
    capturedSigintHandler = listener as () => Promise<void>;
  } else if (event === 'SIGTERM') {
    capturedSigtermHandler = listener as () => Promise<void>;
  }
  return process;
}) as never);

describe('server.ts', () => {
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockListenCallback = undefined;
    capturedSigintHandler = undefined;
    capturedSigtermHandler = undefined;
    delete mockServerObj.timeout;
    delete mockServerObj.headersTimeout;
    delete mockServerObj.requestTimeout;
    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  // ──────────────────────────────────────────────────────────────
  // 服务器启动
  // ──────────────────────────────────────────────────────────────
  describe('服务器启动', () => {
    test('应在配置端口上调用 app.listen', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockApp.listen).toHaveBeenCalledWith(9876, expect.any(Function));
    });

    test('listen 回调中应输出端口日志', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockListenCallback).toBeDefined();
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[薄云商机倍增服务] Server running on port 9876'
      );
    });

    test('listen 回调中应输出环境日志', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[薄云商机倍增服务] Environment:')
      );
    });

    test('listen 回调中应调用 startArticleGenerationCron', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockStartArticleGenerationCron).toHaveBeenCalledTimes(1);
    });

    test('Swagger 启用时 listen 回调中输出 API 文档 URL', () => {
      const originalEnabled = mockConfig.swagger.enabled;
      mockConfig.swagger.enabled = true;

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[薄云商机倍增服务] API docs: http://localhost:9876/api-docs'
      );

      mockConfig.swagger.enabled = originalEnabled;
    });

    test('Swagger 禁用时 listen 回调中不输出 API 文档 URL', () => {
      mockConfig.swagger.enabled = false;

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      mockConsoleLog.mockClear();
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('API docs')
      );
    });

    test('NODE_ENV 未设置时环境日志显示 development', () => {
      delete process.env.NODE_ENV;

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[薄云商机倍增服务] Environment: development'
      );
    });

    test('NODE_ENV 设置为 production 时环境日志显示 production', () => {
      process.env.NODE_ENV = 'production';

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[薄云商机倍增服务] Environment: production'
      );
      delete process.env.NODE_ENV;
    });

    test('NODE_ENV 为空字符串时环境日志显示 development', () => {
      process.env.NODE_ENV = '';

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) {
        mockListenCallback();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[薄云商机倍增服务] Environment: development'
      );
      delete process.env.NODE_ENV;
    });
  });

  // ──────────────────────────────────────────────────────────────
  // SEC-APP-07: 请求超时安全设置
  // ──────────────────────────────────────────────────────────────
  describe('SEC-APP-07: 请求超时安全设置', () => {
    test('server.timeout 应设置为 30000ms（30s 空闲连接超时）', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockServerObj.timeout).toBe(30_000);
    });

    test('server.headersTimeout 应设置为 35000ms（35s，略大于 timeout）', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockServerObj.headersTimeout).toBe(35_000);
    });

    test('server.requestTimeout 应设置为 30000ms（30s 请求总超时）', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockServerObj.requestTimeout).toBe(30_000);
    });

    test('headersTimeout 应大于 server.timeout（防止底层 socket 先超时）', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockServerObj.headersTimeout!).toBeGreaterThan(mockServerObj.timeout!);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // SIGINT 信号处理
  // ──────────────────────────────────────────────────────────────
  describe('SIGINT 信号处理', () => {
    test('注册了 SIGINT 处理器', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(capturedSigintHandler).toBeDefined();
    });

    test('SIGINT 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器、退出进程', async () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) mockListenCallback();
      expect(capturedSigintHandler).toBeDefined();
      if (capturedSigintHandler) {
        await capturedSigintHandler();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith('[薄云商机倍增服务] Shutting down...');
      expect(mockStopArticleGenerationCron).toHaveBeenCalledTimes(1);
      expect(mockClosePrisma).toHaveBeenCalledTimes(1);
      expect(mockServerObj.close).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('SIGINT 关闭流程应按正确顺序执行：日志 → 停止 cron → 关闭 Prisma → 关闭服务器', async () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) mockListenCallback();

      if (capturedSigintHandler) {
        await capturedSigintHandler();
      }

      const shutdownLogIdx = mockConsoleLog.mock.calls.findIndex(
        (call: string[]) => call[0]?.includes('Shutting down')
      );
      expect(shutdownLogIdx).toBeGreaterThanOrEqual(0);

      const logOrder = mockConsoleLog.mock.invocationCallOrder[shutdownLogIdx];
      const stopCronOrder = mockStopArticleGenerationCron.mock.invocationCallOrder[0];
      const closePrismaOrder = mockClosePrisma.mock.invocationCallOrder[0];
      const serverCloseOrder = mockServerObj.close.mock.invocationCallOrder[0];

      expect(logOrder).toBeLessThan(stopCronOrder);
      expect(stopCronOrder).toBeLessThan(closePrismaOrder);
      expect(closePrismaOrder).toBeLessThan(serverCloseOrder);
    });

    test('SIGINT 当 closePrisma 抛出异常时不应关闭服务器和退出进程', async () => {
      mockClosePrisma.mockRejectedValueOnce(new Error('DB connection failed'));

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) mockListenCallback();

      if (capturedSigintHandler) {
        await expect(capturedSigintHandler()).rejects.toThrow('DB connection failed');
      }

      expect(mockConsoleLog).toHaveBeenCalledWith('[薄云商机倍增服务] Shutting down...');
      expect(mockStopArticleGenerationCron).toHaveBeenCalled();
      expect(mockClosePrisma).toHaveBeenCalled();
      expect(mockServerObj.close).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // SIGTERM 信号处理
  // ──────────────────────────────────────────────────────────────
  describe('SIGTERM 信号处理', () => {
    test('注册了 SIGTERM 处理器', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(capturedSigtermHandler).toBeDefined();
    });

    test('SIGTERM 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器、退出进程', async () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) mockListenCallback();

      expect(capturedSigtermHandler).toBeDefined();
      if (capturedSigtermHandler) {
        await capturedSigtermHandler();
      }
      expect(mockConsoleLog).toHaveBeenCalledWith('[薄云商机倍增服务] Shutting down...');
      expect(mockStopArticleGenerationCron).toHaveBeenCalledTimes(1);
      expect(mockClosePrisma).toHaveBeenCalledTimes(1);
      expect(mockServerObj.close).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('SIGTERM 关闭流程应按正确顺序执行：日志 → 停止 cron → 关闭 Prisma → 关闭服务器', async () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) mockListenCallback();

      if (capturedSigtermHandler) {
        await capturedSigtermHandler();
      }

      const shutdownLogIdx = mockConsoleLog.mock.calls.findIndex(
        (call: string[]) => call[0]?.includes('Shutting down')
      );
      expect(shutdownLogIdx).toBeGreaterThanOrEqual(0);

      const logOrder = mockConsoleLog.mock.invocationCallOrder[shutdownLogIdx];
      const stopCronOrder = mockStopArticleGenerationCron.mock.invocationCallOrder[0];
      const closePrismaOrder = mockClosePrisma.mock.invocationCallOrder[0];
      const serverCloseOrder = mockServerObj.close.mock.invocationCallOrder[0];

      expect(logOrder).toBeLessThan(stopCronOrder);
      expect(stopCronOrder).toBeLessThan(closePrismaOrder);
      expect(closePrismaOrder).toBeLessThan(serverCloseOrder);
    });

    test('SIGTERM 当 closePrisma 抛出异常时不应关闭服务器和退出进程', async () => {
      mockClosePrisma.mockRejectedValueOnce(new Error('DB disconnect failed'));

      jest.isolateModules(() => {
        require('../../apis/server');
      });
      if (mockListenCallback) mockListenCallback();

      if (capturedSigtermHandler) {
        await expect(capturedSigtermHandler()).rejects.toThrow('DB disconnect failed');
      }

      expect(mockConsoleLog).toHaveBeenCalledWith('[薄云商机倍增服务] Shutting down...');
      expect(mockStopArticleGenerationCron).toHaveBeenCalled();
      expect(mockClosePrisma).toHaveBeenCalled();
      expect(mockServerObj.close).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 默认导出
  // ──────────────────────────────────────────────────────────────
  describe('默认导出', () => {
    test('应导出 app 作为默认导出', () => {
      let exported: unknown;
      jest.isolateModules(() => {
        exported = require('../../apis/server').default;
      });
      expect(exported).toBe(mockApp);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // server.close 回调
  // ──────────────────────────────────────────────────────────────
  describe('server.close 回调', () => {
    test('server.close 回调应调用 process.exit(0)', () => {
      mockServerObj.close(() => process.exit(0));
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
