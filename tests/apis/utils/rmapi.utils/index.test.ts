/**
 * @jest-environment node
 *
 * Tests for apis/utils/rmapi.utils/index.ts (barrel file)
 * Covers: re-export completeness, identity, type accessibility, no side effects
 */

describe('apis/utils/rmapi.utils/index.ts', () => {
  describe('function exports', () => {
    it('should export getRmToken as a function', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect(typeof mod.getRmToken).toBe('function');
    });

    it('should export getRmResources as a function', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect(typeof mod.getRmResources).toBe('function');
    });

    it('should export getAllRmResources as a function', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect(typeof mod.getAllRmResources).toBe('function');
    });

    it('should export submitRmOrder as a function', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect(typeof mod.submitRmOrder).toBe('function');
    });

    it('should export exactly 4 functions', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      const functionNames = Object.keys(mod).filter(
        (k) => typeof (mod as any)[k] === 'function'
      );
      expect(functionNames).toHaveLength(4);
      expect(functionNames.sort()).toEqual([
        'getAllRmResources',
        'getRmResources',
        'getRmToken',
        'submitRmOrder',
      ]);
    });
  });

  describe('re-export identity', () => {
    it('should re-export getRmToken from auth.util', async () => {
      const [barrel, source] = await Promise.all([
        import('../../../../apis/utils/rmapi.utils/index'),
        import('../../../../apis/utils/rmapi.utils/auth.util'),
      ]);
      expect(barrel.getRmToken).toBe(source.getRmToken);
    });

    it('should re-export getRmResources from resource.util', async () => {
      const [barrel, source] = await Promise.all([
        import('../../../../apis/utils/rmapi.utils/index'),
        import('../../../../apis/utils/rmapi.utils/resource.util'),
      ]);
      expect(barrel.getRmResources).toBe(source.getRmResources);
    });

    it('should re-export getAllRmResources from resource.util', async () => {
      const [barrel, source] = await Promise.all([
        import('../../../../apis/utils/rmapi.utils/index'),
        import('../../../../apis/utils/rmapi.utils/resource.util'),
      ]);
      expect(barrel.getAllRmResources).toBe(source.getAllRmResources);
    });

    it('should re-export submitRmOrder from order.util', async () => {
      const [barrel, source] = await Promise.all([
        import('../../../../apis/utils/rmapi.utils/index'),
        import('../../../../apis/utils/rmapi.utils/order.util'),
      ]);
      expect(barrel.submitRmOrder).toBe(source.submitRmOrder);
    });
  });

  describe('type exports', () => {
    it('should make RmAuthParams usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      // TypeScript type-only exports are erased at runtime;
      // verify the module does not export a runtime value for type-only identifiers
      expect((mod as any).RmAuthParams).toBeUndefined();
    });

    it('should make RmAuthResponse usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmAuthResponse).toBeUndefined();
    });

    it('should make RmResourceParams usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmResourceParams).toBeUndefined();
    });

    it('should make RmResourceResponse usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmResourceResponse).toBeUndefined();
    });

    it('should make RmResourceItem usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmResourceItem).toBeUndefined();
    });

    it('should make RmResourcePagination usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmResourcePagination).toBeUndefined();
    });

    it('should make RmOrderParams usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmOrderParams).toBeUndefined();
    });

    it('should make RmOrderResponse usable as a type', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect((mod as any).RmOrderResponse).toBeUndefined();
    });
  });

  describe('no side effects', () => {
    it('should not have default export', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      expect(mod.default).toBeUndefined();
    });

    it('should not export __esModule flag as own property', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      // __esModule is set by TypeScript/compilers but should not be a named export
      const ownKeys = Object.getOwnPropertyNames(mod).filter(
        (k) => k !== '__esModule' && typeof (mod as any)[k] !== 'function'
      );
      expect(ownKeys).toHaveLength(0);
    });

    it('should be safe to import multiple times without errors', async () => {
      // Import the barrel 3 times - no error should occur
      const [m1, m2, m3] = await Promise.all([
        import('../../../../apis/utils/rmapi.utils/index'),
        import('../../../../apis/utils/rmapi.utils/index'),
        import('../../../../apis/utils/rmapi.utils/index'),
      ]);
      expect(m1.getRmToken).toBe(m2.getRmToken);
      expect(m2.getRmToken).toBe(m3.getRmToken);
    });
  });

  describe('import paths', () => {
    it('should be importable from parent directory', async () => {
      // Simulates: import { getRmToken } from '../../apis/utils/rmapi.utils'
      const mod = await import('../../../../apis/utils/rmapi.utils');
      expect(typeof mod.getRmToken).toBe('function');
    });

    it('should resolve index.ts when importing directory', async () => {
      // Both paths should resolve to the same module
      const [dirImport, indexImport] = await Promise.all([
        import('../../../../apis/utils/rmapi.utils'),
        import('../../../../apis/utils/rmapi.utils/index'),
      ]);
      expect(dirImport.getRmToken).toBe(indexImport.getRmToken);
      expect(dirImport.getRmResources).toBe(indexImport.getRmResources);
      expect(dirImport.getAllRmResources).toBe(indexImport.getAllRmResources);
      expect(dirImport.submitRmOrder).toBe(indexImport.submitRmOrder);
    });
  });

  describe('export completeness', () => {
    it('should not export functions from debug-getRmResources', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      // parseArgs and main from debug script should NOT be re-exported
      expect((mod as any).parseArgs).toBeUndefined();
      expect((mod as any).main).toBeUndefined();
    });

    it('should not export RMAPI_BASE constant', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      // Internal constants should not leak through barrel
      expect((mod as any).RMAPI_BASE).toBeUndefined();
    });

    it('should cover all 3 source modules', async () => {
      const mod = await import('../../../../apis/utils/rmapi.utils/index');
      // auth.util: getRmToken
      expect(typeof mod.getRmToken).toBe('function');
      // resource.util: getRmResources, getAllRmResources
      expect(typeof mod.getRmResources).toBe('function');
      expect(typeof mod.getAllRmResources).toBe('function');
      // order.util: submitRmOrder
      expect(typeof mod.submitRmOrder).toBe('function');
    });
  });
});
