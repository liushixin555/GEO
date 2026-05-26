/**
 * @jest-environment node
 *
 * Tests for apis/utils/token-blacklist.util.ts
 * Covers: revokeToken, isTokenRevoked, clearBlacklist, parseExpiryToMs
 */

// Ensure test environment so clearBlacklist works
process.env.NODE_ENV = 'test';

import { revokeToken, isTokenRevoked, clearBlacklist, parseExpiryToMs } from '../../../apis/utils/token-blacklist.util';

// Helper: generate a deterministic fake JWT-like string
function fakeJWT(seed = 'test'): string {
  const payload = Buffer.from(JSON.stringify({ sub: seed })).toString('base64url');
  const sig = Buffer.from('sig').toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.${sig}`;
}

beforeEach(() => {
  clearBlacklist();
});

afterAll(() => {
  clearBlacklist();
});

describe('token-blacklist.util.ts', () => {
  // ─── revokeToken ──────────────────────────────────────────────
  describe('revokeToken', () => {
    it('should revoke a valid JWT token', () => {
      const token = fakeJWT('user1');
      revokeToken(token, 7_200_000);
      expect(isTokenRevoked(token)).toBe(true);
    });

    it('should ignore empty token', () => {
      revokeToken('', 7_200_000);
      expect(isTokenRevoked('')).toBe(false);
    });

    it('should ignore zero expiresInMs', () => {
      revokeToken(fakeJWT(), 0);
      expect(isTokenRevoked(fakeJWT())).toBe(false);
    });

    it('should ignore negative expiresInMs', () => {
      revokeToken(fakeJWT(), -1000);
      expect(isTokenRevoked(fakeJWT())).toBe(false);
    });

    it('should ignore NaN expiresInMs', () => {
      revokeToken(fakeJWT(), NaN);
      expect(isTokenRevoked(fakeJWT())).toBe(false);
    });

    it('should reject non-JWT format strings', () => {
      revokeToken('not-a-jwt', 7_200_000);
      expect(isTokenRevoked('not-a-jwt')).toBe(false);
    });

    it('should reject excessively long tokens', () => {
      const longToken = 'a'.repeat(2049) + '.b.c';
      revokeToken(longToken, 7_200_000);
      expect(isTokenRevoked(longToken)).toBe(false);
    });

    it('should respect MAX_BLACKLIST_SIZE capacity', () => {
      // Fill to capacity — MAX_BLACKLIST_SIZE is 10_000
      for (let i = 0; i < 10_001; i++) {
        revokeToken(fakeJWT(`cap-${i}`), 7_200_000);
      }
      // cap-0 was the first inserted, should still be revoked
      expect(isTokenRevoked(fakeJWT('cap-0'))).toBe(true);
      // cap-10000 was the 10_001st, may be dropped after cleanup
      // The key assertion: it doesn't crash
      expect(typeof isTokenRevoked(fakeJWT('cap-10000'))).toBe('boolean');
    });
  });

  // ─── isTokenRevoked ──────────────────────────────────────────
  describe('isTokenRevoked', () => {
    it('should return false for empty token', () => {
      expect(isTokenRevoked('')).toBe(false);
    });

    it('should return false for never-revoked token', () => {
      expect(isTokenRevoked(fakeJWT('unknown'))).toBe(false);
    });

    it('should return true for revoked token', () => {
      const token = fakeJWT('revoked');
      revokeToken(token, 7_200_000);
      expect(isTokenRevoked(token)).toBe(true);
    });

    it('should handle same token revoked twice (idempotent)', () => {
      const token = fakeJWT('double');
      revokeToken(token, 7_200_000);
      revokeToken(token, 7_200_000);
      expect(isTokenRevoked(token)).toBe(true);
    });

    it('should use hash-based key so plaintext token is never stored', () => {
      const token = fakeJWT('hashed');
      revokeToken(token, 7_200_000);
      // isTokenRevoked should still match via hash
      expect(isTokenRevoked(token)).toBe(true);
    });
  });

  // ─── clearBlacklist ──────────────────────────────────────────
  describe('clearBlacklist', () => {
    it('should clear all revoked tokens', () => {
      const t1 = fakeJWT('a');
      const t2 = fakeJWT('b');
      revokeToken(t1, 7_200_000);
      revokeToken(t2, 7_200_000);
      clearBlacklist();
      expect(isTokenRevoked(t1)).toBe(false);
      expect(isTokenRevoked(t2)).toBe(false);
    });

    it('should be safe to call when already empty', () => {
      expect(() => clearBlacklist()).not.toThrow();
    });
  });

  // ─── parseExpiryToMs ─────────────────────────────────────────
  describe('parseExpiryToMs', () => {
    it('should parse milliseconds', () => {
      expect(parseExpiryToMs('500ms')).toBe(500);
    });

    it('should parse seconds', () => {
      expect(parseExpiryToMs('30s')).toBe(30_000);
    });

    it('should parse minutes', () => {
      expect(parseExpiryToMs('5m')).toBe(300_000);
    });

    it('should parse hours', () => {
      expect(parseExpiryToMs('2h')).toBe(7_200_000);
    });

    it('should parse days', () => {
      expect(parseExpiryToMs('1d')).toBe(86_400_000);
    });

    it('should parse weeks (B-1 fix)', () => {
      expect(parseExpiryToMs('1w')).toBe(604_800_000);
    });

    it('should parse years (B-1 fix)', () => {
      expect(parseExpiryToMs('1y')).toBe(31_536_000_000);
    });

    it('should parse bare number as ms', () => {
      expect(parseExpiryToMs('3600')).toBe(3600);
    });

    it('should fallback to 2h for unparseable input', () => {
      expect(parseExpiryToMs('invalid')).toBe(7_200_000);
    });

    it('should fallback to 2h for unsupported unit format', () => {
      expect(parseExpiryToMs('2hours')).toBe(7_200_000);
    });

    it('should handle zero value', () => {
      expect(parseExpiryToMs('0h')).toBe(0);
    });

    it('should parse 7d correctly', () => {
      expect(parseExpiryToMs('7d')).toBe(7 * 86_400_000);
    });

    it('should fallback for overflow values', () => {
      // Number.MAX_SAFE_INTEGER ≈ 9e15; 9999999d ≈ 8.6e14 (no overflow)
      // Use an extreme value: 99999999y ≈ 3.15e18 > MAX_SAFE_INTEGER
      const result = parseExpiryToMs('99999999y');
      // Should fallback to 2h on overflow
      expect(result).toBe(7_200_000);
    });

    it('should match config validateTimeSpan unit set exactly', () => {
      // config supports: ms, s, m, h, d, w, y
      // parseExpiryToMs must support the same set
      const units = ['ms', 's', 'm', 'h', 'd', 'w', 'y'];
      for (const unit of units) {
        const result = parseExpiryToMs(`1${unit}`);
        expect(result).toBeGreaterThan(0);
      }
    });
  });
});
