/**
 * token-blacklist.util.ts — JWT token 内存黑名单
 *
 * 单实例部署有效（进程内存存储），多实例需改 Redis。
 * 与 config/index.ts validateTimeSpan 共享同一单位集合 (ms/s/m/h/d/w/y)。
 */

import { createHash } from 'crypto';
import { logger } from './logger.util';

const MAX_BLACKLIST_SIZE = 10_000;
const MAX_TOKEN_LENGTH = 2048;
const CLEANUP_INTERVAL_MS = 60_000;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const revokedTokens = new Map<string, number>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function tokenKey(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, expiresAt] of revokedTokens) {
    if (expiresAt <= now) {
      revokedTokens.delete(key);
    }
  }
}

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export function revokeToken(token: string, expiresInMs: number): void {
  if (!token || expiresInMs <= 0 || Number.isNaN(expiresInMs)) return;

  // 纵深防御：JWT 格式校验 + 长度限制
  if (token.length > MAX_TOKEN_LENGTH || !JWT_PATTERN.test(token)) {
    logger.warn('token.revoke.invalid_format', { length: token.length });
    return;
  }

  // 容量上限保护
  if (revokedTokens.size >= MAX_BLACKLIST_SIZE) {
    cleanupExpired();
    if (revokedTokens.size >= MAX_BLACKLIST_SIZE) {
      logger.warn('token.revoke.capacity_exceeded', { size: revokedTokens.size });
      return;
    }
  }

  const key = tokenKey(token);
  revokedTokens.set(key, Date.now() + expiresInMs);
  logger.info('token.revoked', { tokenHash: key, expiresInMs });
  startCleanup();
}

export function isTokenRevoked(token: string): boolean {
  if (!token) return false;
  const key = tokenKey(token);
  const expiresAt = revokedTokens.get(key);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    revokedTokens.delete(key);
    return false;
  }
  return true;
}

/** 仅用于测试清理。生产环境禁止调用。 */
export function clearBlacklist(): void {
  if (process.env.NODE_ENV === 'production') {
    logger.error('token.clearblacklist.production_call', { message: 'clearBlacklist called in production' });
    return;
  }
  revokedTokens.clear();
  stopCleanup();
}

const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_536_000_000,
};

export function parseExpiryToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(ms|s|m|h|d|w|y)?$/);
  if (!match) {
    logger.error('token.parse_expiry.invalid', { input: expiresIn, fallback: '2h' });
    return 7_200_000;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  const result = value * (UNIT_MS[unit] ?? 1);
  if (result > Number.MAX_SAFE_INTEGER) {
    logger.error('token.parse_expiry.overflow', { input: expiresIn, result });
    return 7_200_000;
  }
  return result;
}
