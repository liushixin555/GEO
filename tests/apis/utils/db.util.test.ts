/**
 * @jest-environment node
 *
 * Tests for apis/utils/db.util.ts
 * Covers: getPrisma singleton, closePrisma disconnect, development/production log config
 */

// Mock PrismaClient before importing db.util
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockPrismaClient = jest.fn().mockImplementation(() => ({
  $disconnect: mockDisconnect,
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient,
}));

// Reset module cache between tests to reset the module-level `prisma` variable
beforeEach(() => {
  jest.resetModules();
  mockPrismaClient.mockClear();
  mockDisconnect.mockClear();
});

describe('apis/utils/db.util.ts', () => {
  describe('getPrisma', () => {
    it('should create a new PrismaClient instance on first call', async () => {
      const { getPrisma } = await import('../../../apis/utils/db.util');
      const prisma = getPrisma();
      expect(prisma).toBeDefined();
      expect(mockPrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should return the same instance on subsequent calls (singleton)', async () => {
      const { getPrisma } = await import('../../../apis/utils/db.util');
      const first = getPrisma();
      const second = getPrisma();
      expect(first).toBe(second);
      expect(mockPrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should pass development log config when NODE_ENV=development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { getPrisma } = await import('../../../apis/utils/db.util');
      getPrisma();

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['query', 'error', 'warn'],
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should pass production log config when NODE_ENV=production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { getPrisma } = await import('../../../apis/utils/db.util');
      getPrisma();

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should pass production log config when NODE_ENV is not set', async () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const { getPrisma } = await import('../../../apis/utils/db.util');
      getPrisma();

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should pass production log config for non-development NODE_ENV', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const { getPrisma } = await import('../../../apis/utils/db.util');
      getPrisma();

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('closePrisma', () => {
    it('should disconnect and reset prisma to null when prisma exists', async () => {
      const { getPrisma, closePrisma } = await import('../../../apis/utils/db.util');
      getPrisma(); // create instance
      await closePrisma();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should not throw when prisma is null', async () => {
      const { closePrisma } = await import('../../../apis/utils/db.util');
      await expect(closePrisma()).resolves.toBeUndefined();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it('should allow creating a new instance after closePrisma', async () => {
      const { getPrisma, closePrisma } = await import('../../../apis/utils/db.util');
      getPrisma(); // first instance
      await closePrisma();
      getPrisma(); // second instance — should call constructor again

      expect(mockPrismaClient).toHaveBeenCalledTimes(2);
    });

    it('should create the same singleton again after close+reopen', async () => {
      const { getPrisma, closePrisma } = await import('../../../apis/utils/db.util');
      getPrisma(); // first instance
      await closePrisma();
      const reopened = getPrisma();
      const again = getPrisma();

      expect(reopened).toBe(again);
      expect(mockPrismaClient).toHaveBeenCalledTimes(2); // two constructions total
    });
  });

    it('should pass production log config when NODE_ENV is empty string', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = '';

      const { getPrisma } = await import('../../../apis/utils/db.util');
      getPrisma();

      expect(mockPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getPrisma + closePrisma interaction', () => {
    it('should support multiple open/close cycles', async () => {
      const { getPrisma, closePrisma } = await import('../../../apis/utils/db.util');

      // Cycle 1
      getPrisma();
      await closePrisma();

      // Cycle 2
      getPrisma();
      await closePrisma();

      // Cycle 3
      getPrisma();
      await closePrisma();

      expect(mockPrismaClient).toHaveBeenCalledTimes(3);
      expect(mockDisconnect).toHaveBeenCalledTimes(3);
    });
  });
});
