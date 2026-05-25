import { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; lastReset: number }>();
const blockedIPs = new Map<string, number>();
const SUSPICIOUS_THRESHOLD = 200;
const WINDOW_MS = 60_000;
const BLOCK_DURATION_MS = 10 * 60_000;
const MAX_ENTRIES = 10_000;

// Periodic cleanup of stale entries to prevent memory leak
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts) {
    if (now - record.lastReset > WINDOW_MS) requestCounts.delete(ip);
  }
  for (const [ip, expiry] of blockedIPs) {
    if (now >= expiry) blockedIPs.delete(ip);
  }
}, WINDOW_MS);
cleanupTimer.unref(); // Don't prevent process exit

function evictOldest(map: Map<string, unknown>): void {
  const firstKey = map.keys().next().value;
  if (firstKey !== undefined) map.delete(firstKey);
}

export function antiCrawlMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // Check if IP is blocked
  const blockExpiry = blockedIPs.get(ip);
  if (blockExpiry && now < blockExpiry) {
    res.status(403).json({ code: 403, message: '访问被拒绝' });
    return;
  }
  if (blockExpiry) {
    blockedIPs.delete(ip);
  }

  // Track request count
  const record = requestCounts.get(ip);
  if (!record || now - record.lastReset > WINDOW_MS) {
    if (requestCounts.size >= MAX_ENTRIES) evictOldest(requestCounts);
    requestCounts.set(ip, { count: 1, lastReset: now });
  } else {
    record.count++;
    if (record.count > SUSPICIOUS_THRESHOLD) {
      if (blockedIPs.size >= MAX_ENTRIES) evictOldest(blockedIPs);
      blockedIPs.set(ip, now + BLOCK_DURATION_MS);
      requestCounts.delete(ip);
      res.status(403).json({ code: 403, message: '访问被拒绝' });
      return;
    }
  }

  // Check User-Agent
  const ua = req.headers['user-agent'] as string | undefined;
  if (!ua || ua.length < 10) {
    res.status(403).json({ code: 403, message: '访问被拒绝' });
    return;
  }

  // M-5: Block known automation/bot User-Agent patterns
  const BOT_UA_PATTERNS = [
    /\bcurl\/\d/i,
    /\bwget\/\d/i,
    /\bpython-requests\/\d/i,
    /\bpython-urllib\d/i,
    /\bgo-http-client/i,
    /\bscrapy\/\d/i,
    /\bmechanize/i,
    /\bphantomjs\/\d/i,
    /\bselenium/i,
    /\bpuppeteer/i,
    /\bheadlesschrome/i,
  ];
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) {
      res.status(403).json({ code: 403, message: '访问被拒绝' });
      return;
    }
  }

  next();
}
