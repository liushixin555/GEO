/**
 * @jest-environment node
 *
 * Tests for apis/utils/rmapi.utils/debug-getRmResources.ts
 * Covers: parseArgs (arg parsing), main (token acquisition, resource fetching, error handling, file output)
 *
 * Note: parseArgs and main are not exported. Tests exercise them via module import with mocked dependencies.
 * jest.isolateModules re-imports the module for each test with fresh module registry.
 * process.exit is mocked as a no-op (doesn't throw) to avoid unhandled rejection issues.
 * After the no-op process.exit, code continues but external calls are also mocked to prevent errors.
 */

const mockGetRmToken = jest.fn();
const mockGetAllRmResources = jest.fn();
const mockWriteFileSync = jest.fn();

jest.mock('../../../../apis/utils/rmapi.utils/index', () => ({
  getRmToken: mockGetRmToken,
  getAllRmResources: mockGetAllRmResources,
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    writeFileSync: mockWriteFileSync,
  };
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('debug-getRmResources', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;
  let originalArgv: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // No-op: doesn't throw. Code continues after process.exit but external calls are mocked.
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    originalArgv = [...process.argv];

    // Default fallback mocks to prevent errors after no-op process.exit
    mockGetRmToken.mockResolvedValue('fallback-token');
    mockGetAllRmResources.mockResolvedValue([]);
  });

  afterEach(() => {
    process.argv = originalArgv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    jest.resetModules();
  });

  async function importAndFlush(): Promise<void> {
    jest.isolateModules(() => {
      require('../../../../apis/utils/rmapi.utils/debug-getRmResources');
    });
    await flushPromises();
  }

  // ─── parseArgs ────────────────────────────────────────────────

  describe('parseArgs', () => {
    it('should parse --token argument', async () => {
      process.argv = ['node', 'script', '--token', 'my-token-123'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetRmToken).not.toHaveBeenCalled();
      expect(mockGetAllRmResources).toHaveBeenCalledWith('my-token-123');
    });

    it('should parse --mobile and --password arguments', async () => {
      process.argv = ['node', 'script', '--mobile', '13800000000', '--password', 'pass123'];
      mockGetRmToken.mockResolvedValueOnce('generated-token');
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetRmToken).toHaveBeenCalledWith({ mobile: '13800000000', password: 'pass123' });
      expect(mockGetAllRmResources).toHaveBeenCalledWith('generated-token');
    });

    it('should use --token over --mobile/--password when all provided', async () => {
      process.argv = ['node', 'script', '--token', 'direct-token', '--mobile', '13800000000', '--password', 'pass'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetRmToken).not.toHaveBeenCalled();
      expect(mockGetAllRmResources).toHaveBeenCalledWith('direct-token');
    });

    it('should return empty object when no args provided', async () => {
      process.argv = ['node', 'script'];

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '错误: 需要提供 --token 或 (--mobile + --password) 来获取 token'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should skip flag when no value follows (next arg starts with --)', async () => {
      // --token has no value (next is --mobile), so token is undefined
      // --mobile gets a value, but password is missing → error path
      process.argv = ['node', 'script', '--token', '--mobile', '13800000000'];

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should skip flag when it is the last arg with no value', async () => {
      // --token is the last arg, args[i+1] is undefined → condition fails
      process.argv = ['node', 'script', '--token'];

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should ignore single-dash args like -t', async () => {
      process.argv = ['node', 'script', '-t', 'value', '--token', 'real-token'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetAllRmResources).toHaveBeenCalledWith('real-token');
    });

    it('should ignore bare values that do not start with --', async () => {
      process.argv = ['node', 'script', 'bare-value', '--token', 'my-token'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetAllRmResources).toHaveBeenCalledWith('my-token');
    });

    it('should parse unknown flags into result without side effects', async () => {
      process.argv = ['node', 'script', '--verbose', 'true', '--token', 'tok'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetAllRmResources).toHaveBeenCalledWith('tok');
    });
  });

  // ─── main - token acquisition ─────────────────────────────────

  describe('main - token acquisition', () => {
    it('should exit(1) when no token and no credentials', async () => {
      process.argv = ['node', 'script'];

      await importAndFlush();

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '错误: 需要提供 --token 或 (--mobile + --password) 来获取 token'
      );
    });

    it('should use provided token directly without calling getRmToken', async () => {
      process.argv = ['node', 'script', '--token', 'direct-token'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(mockGetRmToken).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[2] 正在请求全部资源 (自动分页) ...');
    });

    it('should get token via mobile+password and log progress', async () => {
      process.argv = ['node', 'script', '--mobile', '13800138000', '--password', 'mypass'];
      mockGetRmToken.mockResolvedValueOnce('acquired-token-xyz');
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith('[1] 正在获取 token (mobile: 13800138000) ...');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('token 获取成功'));
      expect(consoleLogSpy).toHaveBeenCalledWith('[2] 正在请求全部资源 (自动分页) ...');
    });

    it('should log first 20 chars of acquired token', async () => {
      process.argv = ['node', 'script', '--mobile', '13800138000', '--password', 'mypass'];
      mockGetRmToken.mockResolvedValueOnce('abcdefghijklmnopqrstuvwxyz');
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('abcdefghijklmnopqrst')
      );
    });

    it('should exit(1) when getRmToken fails', async () => {
      process.argv = ['node', 'script', '--mobile', '13800138000', '--password', 'wrong'];
      mockGetRmToken.mockRejectedValueOnce(new Error('Authentication failed'));

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[1] token 获取失败:', 'Authentication failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit(1) when mobile provided but password missing', async () => {
      process.argv = ['node', 'script', '--mobile', '13800138000'];

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('需要提供 --token 或 (--mobile + --password)')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit(1) when password provided but mobile missing', async () => {
      process.argv = ['node', 'script', '--password', 'onlypass'];

      await importAndFlush();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should log usage examples in error output', async () => {
      process.argv = ['node', 'script'];

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('--mobile'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('--token'));
    });

    it('should display full token when shorter than 20 chars', async () => {
      process.argv = ['node', 'script', '--mobile', '13800138000', '--password', 'mypass'];
      mockGetRmToken.mockResolvedValueOnce('short-tok');
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('short-tok'));
    });

    it('should display full token when exactly 20 chars', async () => {
      const token20 = '12345678901234567890'; // exactly 20 chars
      process.argv = ['node', 'script', '--mobile', '13800138000', '--password', 'mypass'];
      mockGetRmToken.mockResolvedValueOnce(token20);
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(token20));
    });
  });

  // ─── main - resource fetching success ─────────────────────────

  describe('main - resource fetching (success)', () => {
    it('should log total count and preview for items', async () => {
      const items = [
        { id: 1, name: 'Resource A', price: 100, taxonomy: 'tech' },
        { id: 2, name: 'Resource B', price: 200, taxonomy: 'news' },
        { id: 3, name: 'Resource C', price: 300, taxonomy: 'blog' },
      ];
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('总数据条数: 3'));
      expect(consoleLogSpy).toHaveBeenCalledWith('─'.repeat(60));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('前 5 条数据预览'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('id=1'));
    });

    it('should not show preview when result is empty', async () => {
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith('  总数据条数: 0');
      const previewCalls = consoleLogSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('前 5 条数据预览')
      );
      expect(previewCalls).toHaveLength(0);
    });

    it('should show "还有 N 条" when more than 5 items', async () => {
      const items = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `Resource ${i + 1}`,
        price: 100,
        taxonomy: 'tech',
      }));
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith('  ... 还有 3 条');
    });

    it('should NOT show "还有 N 条" when exactly 5 items', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Resource ${i + 1}`,
        price: 100,
        taxonomy: 'tech',
      }));
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      const moreCalls = consoleLogSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('还有')
      );
      expect(moreCalls).toHaveLength(0);
    });

    it('should write results to JSON file', async () => {
      const items = [{ id: 1, name: 'Test', price: 50, taxonomy: 'general' }];
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rmResources-all.json'),
        JSON.stringify(items, null, 2),
        'utf-8'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('完整响应已保存到'));
    });

    it('should log elapsed time on success', async () => {
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce([]);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/\[2\] 请求成功 \(\d+ms\)/));
    });

    it('should preview first 5 items with correct fields', async () => {
      const items = [
        { id: 10, name: 'Alpha', price: 99, taxonomy: 'cat-a' },
        { id: 20, name: 'Beta', price: 199, taxonomy: 'cat-b' },
      ];
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      const previewCalls = consoleLogSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('id=10')
      );
      expect(previewCalls.length).toBeGreaterThan(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('name="Alpha"'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('taxonomy="cat-a"'));
    });

    it('should show preview with exactly 1 item', async () => {
      const items = [{ id: 1, name: 'Solo', price: 10, taxonomy: 'type' }];
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith('  总数据条数: 1');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('前 5 条数据预览'));
      const moreCalls = consoleLogSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('还有')
      );
      expect(moreCalls).toHaveLength(0);
    });

    it('should show "还有 1 条" when exactly 6 items', async () => {
      const items = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        name: `R${i + 1}`,
        price: 100,
        taxonomy: 't',
      }));
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith('  ... 还有 1 条');
    });

    it('should handle items with Chinese and special characters', async () => {
      const items = [
        { id: 1, name: '测试资源-特殊@#$', price: 0, taxonomy: '中文分类' },
      ];
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('测试资源-特殊@#$'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('中文分类'));
    });

    it('should save JSON file with correct path containing rmResources-all.json', async () => {
      const items = [{ id: 1, name: 'A', price: 1, taxonomy: 'x' }];
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockResolvedValueOnce(items);

      await importAndFlush();

      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(writeCall[0]).toMatch(/rmResources-all\.json$/);
      expect(writeCall[2]).toBe('utf-8');
    });
  });

  // ─── main - resource fetching error ───────────────────────────

  describe('main - resource fetching (error)', () => {
    it('should handle error with HTTP response data', async () => {
      const error: any = new Error('Server Error');
      error.response = {
        status: 500,
        data: { message: 'Internal Server Error' },
      };
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(error);

      await importAndFlush();

      // console.error(`[2] 请求失败 (${elapsed}ms):`, err.message)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/请求失败/),
        'Server Error'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('  HTTP status:', 500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '  响应数据:',
        JSON.stringify({ message: 'Internal Server Error' }, null, 2)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle error without response (network error)', async () => {
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(new Error('Network timeout'));

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/请求失败/),
        'Network timeout'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should log elapsed time even on failure', async () => {
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(new Error('fail'));

      await importAndFlush();

      const failCall = consoleErrorSpy.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('请求失败')
      );
      expect(failCall).toBeDefined();
      expect(failCall![0]).toMatch(/\d+ms/);
    });

    it('should NOT log HTTP status when error has no response', async () => {
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(new Error('timeout'));

      await importAndFlush();

      const httpCalls = consoleErrorSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('HTTP status')
      );
      expect(httpCalls).toHaveLength(0);
    });

    it('should handle error where response.data is a string', async () => {
      const error: any = new Error('Bad Request');
      error.response = {
        status: 400,
        data: 'plain text error message',
      };
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(error);

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith('  响应数据:', '"plain text error message"');
    });

    it('should handle error where response exists but data is undefined', async () => {
      const error: any = new Error('No Data');
      error.response = {
        status: 502,
        data: undefined,
      };
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(error);

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith('  HTTP status:', 502);
      expect(consoleErrorSpy).toHaveBeenCalledWith('  响应数据:', undefined);
    });

    it('should handle error with complex response data object', async () => {
      const error: any = new Error('Validation Error');
      error.response = {
        status: 422,
        data: { errors: [{ field: 'name', message: 'required' }], code: 'VALIDATION_FAILED' },
      };
      process.argv = ['node', 'script', '--token', 'test-token'];
      mockGetAllRmResources.mockRejectedValueOnce(error);

      await importAndFlush();

      expect(consoleErrorSpy).toHaveBeenCalledWith('  HTTP status:', 422);
      const dataCall = consoleErrorSpy.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0] === '  响应数据:'
      );
      expect(dataCall).toBeDefined();
      expect(dataCall![1]).toContain('VALIDATION_FAILED');
    });
  });
});
