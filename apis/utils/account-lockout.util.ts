/**
 * Per-username login attempt tracking and account lockout.
 * Prevents brute-force attacks against a single username across IPs.
 * Memory-safe: periodic cleanup + max entries eviction.
 */

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ENTRIES = 10_000;

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts) {
    if (now > attempt.lockedUntil && now - attempt.lastAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}, 60_000);
cleanupTimer.unref();

function evictIfNeeded(): void {
  if (loginAttempts.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, attempt] of loginAttempts) {
      if (attempt.lastAttempt < oldestTime) {
        oldestTime = attempt.lastAttempt;
        oldestKey = key;
      }
    }
    if (oldestKey) loginAttempts.delete(oldestKey);
  }
}

export function isAccountLocked(username: string): boolean {
  const attempt = loginAttempts.get(username);
  if (!attempt) return false;
  const now = Date.now();
  if (now >= attempt.lockedUntil) {
    loginAttempts.delete(username);
    return false;
  }
  return true;
}

export function recordLoginFailure(username: string): void {
  const now = Date.now();
  let attempt = loginAttempts.get(username);
  if (!attempt || now - attempt.lastAttempt > ATTEMPT_WINDOW_MS) {
    evictIfNeeded();
    attempt = { count: 0, lastAttempt: now, lockedUntil: 0 };
    loginAttempts.set(username, attempt);
  }
  attempt.count++;
  attempt.lastAttempt = now;
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
}

export function recordLoginSuccess(username: string): void {
  loginAttempts.delete(username);
}

export function getLockoutConfig(): {
  maxAttempts: number;
  lockoutDurationMs: number;
  attemptWindowMs: number;
  maxEntries: number;
} {
  return {
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    lockoutDurationMs: LOCKOUT_DURATION_MS,
    attemptWindowMs: ATTEMPT_WINDOW_MS,
    maxEntries: MAX_ENTRIES,
  };
}

/** @internal Test helper — clears all lockout state */
export function _resetForTesting(): void {
  loginAttempts.clear();
}
