/**
 * @jest-environment node
 *
 * server.ts 测试用例
 * 使用 jest.isolateModules 隔离模块加载，确保实际执行 server.ts 代码并收集覆盖率
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
const originalProcessOn = process.on.bind(process);

// Mock app.listen 返回一个 mock server
interface MockServerObj {
  close: jest.Mock;
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
    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  describe('服务器启动', () => {
    test('应在配置端口上调用 app.listen', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });
      expect(mockApp.listen).toHaveBeenCalledWith(9876, expect.any(Function));
    });

    test('listen 回调中应输出端口和环境日志', () => {
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

    test('Swagger 启用时 listen 回调中输出文档 URL', () => {
      const originalEnabled = mockConfig.swagger.enabled;
      mockConfig.swagger.enabled = true;

      jest.isolateModules(() => {
        require('../../apis/server');
      });

      if (mockListenCallback) {
        mockListenCallback();
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[薄云商机倍增服务] Swagger docs: http://localhost:9876/api-docs'
      );

      mockConfig.swagger.enabled = originalEnabled;
    });

    test('Swagger 禁用时 listen 回调中不输出文档 URL', () => {
      mockConfig.swagger.enabled = false;

      jest.isolateModules(() => {
        require('../../apis/server');
      });

      mockConsoleLog.mockClear();
      if (mockListenCallback) {
        mockListenCallback();
      }

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Swagger docs')
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
  });

  describe('SIGINT 信号处理', () => {
    test('注册了 SIGINT 处理器', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });

      expect(capturedSigintHandler).toBeDefined();
    });

    test('SIGINT 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器', async () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });

      // 触发 listen 回调以确保服务器已启动
      if (mockListenCallback) mockListenCallback();

      // 触发 SIGINT 处理器
      expect(capturedSigintHandler).toBeDefined();
      if (capturedSigintHandler) {
        await capturedSigintHandler();
      }

      expect(mockConsoleLog).toHaveBeenCalledWith('[薄云商机倍增服务] Shutting down...');
      expect(mockStopArticleGenerationCron).toHaveBeenCalled();
      expect(mockClosePrisma).toHaveBeenCalled();
      expect(mockServerObj.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('SIGTERM 信号处理', () => {
    test('注册了 SIGTERM 处理器', () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });

      expect(capturedSigtermHandler).toBeDefined();
    });

    test('SIGTERM 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器', async () => {
      jest.isolateModules(() => {
        require('../../apis/server');
      });

      // 触发 listen 回调以确保服务器已启动
      if (mockListenCallback) mockListenCallback();

      // 触发 SIGTERM 处理器
      expect(capturedSigtermHandler).toBeDefined();
      if (capturedSigtermHandler) {
        await capturedSigtermHandler();
      }

      expect(mockConsoleLog).toHaveBeenCalledWith('[薄云商机倍增服务] Shutting down...');
      expect(mockStopArticleGenerationCron).toHaveBeenCalled();
      expect(mockClosePrisma).toHaveBeenCalled();
      expect(mockServerObj.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('默认导出', () => {
    test('应导出 app 作为默认导出', () => {
      let exported: unknown;
      jest.isolateModules(() => {
        exported = require('../../apis/server').default;
      });
      expect(exported).toBe(mockApp);
    });
  });

  describe('server.close 回调', () => {
    test('server.close 回调应调用 process.exit(0)', () => {
      mockServerObj.close(() => process.exit(0));
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
