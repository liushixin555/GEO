import { Request } from 'express';

/**
 * Extract the real client IP from the request.
 *
 * Priority order:
 * 1. X-Forwarded-For header — first IP in the comma-separated chain (set by Nginx / CDN / Vite proxy)
 * 2. X-Real-IP header — set by Nginx
 * 3. req.ip — Express resolved IP (requires trust proxy)
 * 4. req.socket.remoteAddress — direct TCP connection IP
 */
export function getClientIp(req: Request): string {
  // 1. X-Forwarded-For: client, proxy1, proxy2, ...
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    const firstIp = xff.split(',')[0].trim();
    if (firstIp) return stripIp(firstIp);
  }

  // 2. X-Real-IP (commonly set by Nginx)
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.trim()) {
    return stripIp(xri.trim());
  }

  // 3. Express resolved IP (trust proxy enabled)
  if (req.ip) {
    return stripIp(req.ip);
  }

  // 4. Direct TCP connection
  const remoteAddr = req.socket?.remoteAddress;
  if (remoteAddr) {
    return stripIp(remoteAddr);
  }

  return 'unknown';
}

/** Strip IPv6-mapped IPv4 prefix (::ffff:) for readability */
function stripIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}
