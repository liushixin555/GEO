/**
 * @jest-environment node
 *
 * Tests for apis/utils/rmapi.utils/resource.util.ts
 * Covers: getRmResources (success, params, error), getAllRmResources (pagination, caching, errors)
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

const mockedFs = fs as jest.Mocked<typeof fs>;

// Helper to create a valid RmResourceResponse
function makeResourceResponse(
  page: number,
  totalPages: number,
  items: Array<{ id: number; name: string }>,
) {
  return {
    data: {
      success: true,
      pagination: {
        current_page: page,
        last_page: totalPages,
        per_page: 10,
        total: items.length,
      },
      data: items,
      status: 200,
    },
  };
}

describe('apis/utils/rmapi.utils/resource.util.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getRmResources ──────────────────────────────────────────

  describe('getRmResources', () => {
    it('should return resource response on success', async () => {
      const { getRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');
      const response = makeResourceResponse(1, 1, [{ id: 1, name: 'Resource A' }]);
      mockedAxios.get.mockResolvedValueOnce(response);

      const result = await getRmResources({ token: 'test-token' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
    });

    it('should default page to 1 when not provided', async () => {
      const { getRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');
      mockedAxios.get.mockResolvedValueOnce(makeResourceResponse(1, 1, []));

      await getRmResources({ token: 'my-token' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_resource/data',
        { params: { token: 'my-token', page: 1 } },
      );
    });

    it('should use provided page number', async () => {
      const { getRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');
      mockedAxios.get.mockResolvedValueOnce(makeResourceResponse(3, 5, []));

      await getRmResources({ token: 'my-token', page: 3 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://rmapi.ruan.net/api/news_resource/data',
        { params: { token: 'my-token', page: 3 } },
      );
    });

    it('should call correct endpoint URL', async () => {
      const { getRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');
      mockedAxios.get.mockResolvedValueOnce(makeResourceResponse(1, 1, []));

      await getRmResources({ token: 'tok' });

      const calledUrl = mockedAxios.get.mock.calls[0][0];
      expect(calledUrl).toBe('https://rmapi.ruan.net/api/news_resource/data');
    });

    it('should propagate network errors', async () => {
      const { getRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(getRmResources({ token: 'tok' })).rejects.toThrow('Network Error');
    });

    it('should propagate HTTP errors from axios', async () => {
      const { getRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');
      const error: any = new Error('Request failed with status code 500');
      error.response = { status: 500, data: 'Internal Server Error' };
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(getRmResources({ token: 'tok' })).rejects.toThrow('Request failed with status code 500');
    });
  });

  // ─── getAllRmResources ────────────────────────────────────────

  describe('getAllRmResources', () => {
    it('should fetch all pages and combine results', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      // No cache exists
      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);

      // Page 1: 2 pages total
      mockedAxios.get.mockResolvedValueOnce(
        makeResourceResponse(1, 2, [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]),
      );
      // Page 2
      mockedAxios.get.mockResolvedValueOnce(
        makeResourceResponse(2, 2, [{ id: 3, name: 'C' }]),
      );

      const result = await getAllRmResources('test-token');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[2].id).toBe(3);
    });

    it('should return all items when only one page', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);
      mockedAxios.get.mockResolvedValueOnce(
        makeResourceResponse(1, 1, [{ id: 1, name: 'Only' }]),
      );

      const result = await getAllRmResources('test-token');

      expect(result).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should create data directory with mkdirSync', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);
      mockedAxios.get.mockResolvedValueOnce(
        makeResourceResponse(1, 1, [{ id: 1, name: 'A' }]),
      );

      await getAllRmResources('test-token');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('data/rmdata'),
        { recursive: true },
      );
    });

    it('should write fetched data to JSON files when no cache', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);
      const page1Data = makeResourceResponse(1, 2, [{ id: 1, name: 'A' }]);
      const page2Data = makeResourceResponse(2, 2, [{ id: 2, name: 'B' }]);
      mockedAxios.get.mockResolvedValueOnce(page1Data);
      mockedAxios.get.mockResolvedValueOnce(page2Data);

      await getAllRmResources('test-token');

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('resources-page1.json'),
        expect.any(String),
        'utf-8',
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('resources-page2.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('should read from cache when file exists', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      // First call: cache exists for page 1 (returns true), no cache for page 2 (returns false)
      (mockedFs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)   // page 1 cache check
        .mockReturnValueOnce(false); // page 2 cache check

      // Cached data is the full RmResourceResponse (what getRmResources returns, i.e. res.data)
      const cachedPage1: any = {
        success: true,
        pagination: { current_page: 1, last_page: 2, per_page: 10, total: 1 },
        data: [{ id: 10, name: 'Cached' }],
        status: 200,
      };
      (mockedFs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(cachedPage1));

      const page2Data = makeResourceResponse(2, 2, [{ id: 20, name: 'Fetched' }]);
      mockedAxios.get.mockResolvedValueOnce(page2Data);

      const result = await getAllRmResources('test-token');

      // Should read cache for page 1 (readFileSync called once)
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
      // Should fetch page 2 from API
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        { params: { token: 'test-token', page: 2 } },
      );
      // Combined results
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(10);
      expect(result[1].id).toBe(20);
    });

    it('should handle 3+ pages correctly', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      // Return false for all existsSync calls (page 1, page 2, page 3)
      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);

      mockedAxios.get
        .mockResolvedValueOnce(makeResourceResponse(1, 3, [{ id: 1, name: 'A' }]))
        .mockResolvedValueOnce(makeResourceResponse(2, 3, [{ id: 2, name: 'B' }]))
        .mockResolvedValueOnce(makeResourceResponse(3, 3, [{ id: 3, name: 'C' }]));

      const result = await getAllRmResources('test-token');

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('should propagate errors from getRmResources', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);
      mockedAxios.get.mockRejectedValueOnce(new Error('API unavailable'));

      await expect(getAllRmResources('test-token')).rejects.toThrow('API unavailable');
    });

    it('should read subsequent pages from cache in for loop', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      // Page 1: no cache, page 2: cache exists
      (mockedFs.existsSync as jest.Mock)
        .mockReturnValueOnce(false)  // page 1 check (before loop)
        .mockReturnValueOnce(true);  // page 2 check (in loop)

      mockedAxios.get.mockResolvedValueOnce(
        makeResourceResponse(1, 2, [{ id: 1, name: 'A' }]),
      );

      const cachedPage2: any = {
        success: true,
        pagination: { current_page: 2, last_page: 2, per_page: 10, total: 1 },
        data: [{ id: 2, name: 'B' }],
        status: 200,
      };
      (mockedFs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(cachedPage2));

      const result = await getAllRmResources('test-token');

      // Only 1 API call for page 1; page 2 from cache
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      // readFileSync called once for page 2 cache
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return empty array when response has no data', async () => {
      const { getAllRmResources } = require('../../../../apis/utils/rmapi.utils/resource.util');

      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);
      mockedAxios.get.mockResolvedValueOnce(
        makeResourceResponse(1, 1, []),
      );

      const result = await getAllRmResources('test-token');

      expect(result).toHaveLength(0);
    });
  });
});
