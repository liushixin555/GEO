const revokedTokens = new Map<string, number>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
const CLEANUP_INTERVAL_MS = 60_000;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of revokedTokens) {
      if (expiresAt <= now) {
        revokedTokens.delete(token);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function revokeToken(token: string, expiresInMs: number): void {
  if (!token || expiresInMs <= 0) return;
  revokedTokens.set(token, Date.now() + expiresInMs);
  startCleanup();
}

export function isTokenRevoked(token: string): boolean {
  if (!token) return false;
  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}

export function clearBlacklist(): void {
  revokedTokens.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export function parseExpiryToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return 7_200_000;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60_000;
    case 'h': return value * 3_600_000;
    case 'd': return value * 86_400_000;
    default: return value;
  }
}
