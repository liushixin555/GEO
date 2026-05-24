import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../utils';

const ALLOWED_ROLES = ['sysadmin', 'admin'];

export async function swaggerAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
    res.status(401).json({ code: 401, message: '需要登录才能访问 API 文档' });
    return;
  }

  const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) {
    res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
    res.status(401).json({ code: 401, message: '认证格式错误' });
    return;
  }

  const username = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, passwordHash: true, role: true, status: true },
    });

    if (!user || !user.status) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
      res.status(401).json({ code: 401, message: '用户名或密码错误' });
      return;
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      res.status(403).json({ code: 403, message: '无权限访问 API 文档' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
      res.status(401).json({ code: 401, message: '用户名或密码错误' });
      return;
    }

    next();
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}
