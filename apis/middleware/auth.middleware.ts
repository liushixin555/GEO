import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

export interface AuthPayload {
  userId: number;
  username: string;
  role: string;
  companyId?: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

export function roleMiddleware(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 401, message: '未登录，请先登录' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ code: 403, message: '无权限访问' });
      return;
    }
    next();
  };
}
