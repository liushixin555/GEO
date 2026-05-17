import { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; lastReset: number }>();
const SUSPICIOUS_THRESHOLD = 200;
const WINDOW_MS = 60_000;
const BLOCK_DURATION_MS = 10 * 60_000;

const blockedIPs = new Map<string, number>();

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
    requestCounts.set(ip, { count: 1, lastReset: now });
  } else {
    record.count++;
    if (record.count > SUSPICIOUS_THRESHOLD) {
      blockedIPs.set(ip, now + BLOCK_DURATION_MS);
      requestCounts.delete(ip);
      res.status(403).json({ code: 403, message: '访问被拒绝' });
      return;
    }
  }

  // Check User-Agent
  const ua = req.headers['user-agent'];
  if (!ua || ua.length < 10) {
    res.status(403).json({ code: 403, message: '访问被拒绝' });
    return;
  }

  next();
}
