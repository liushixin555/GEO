import { Request, Response } from 'express';
import { createAuthService, IAuthService } from '../service';
import { LoginSelectionError, PermissionDeniedError } from '../entity';
import { success, fail } from '../utils';
import { revokeToken, parseExpiryToMs } from '../utils/token-blacklist.util';
import { isAccountLocked, recordLoginFailure, recordLoginSuccess } from '../utils/account-lockout.util';
import config from '../config';
import { logger } from '../utils/logger.util';

const authService: IAuthService = createAuthService();

const BEARER_PREFIX = 'Bearer ';

export async function login(req: Request, res: Response): Promise<void> {
  // Zod loginSchema 已验证 username/password 为非空字符串且长度合规
  const { username, password } = req.body;

  // M-1: 按用户名的暴力破解防护
  if (isAccountLocked(username)) {
    logger.warn('auth.login.locked', { username, ip: req.ip });
    fail(res, 429, '登录尝试次数过多，请稍后重试');
    return;
  }

  try {
    const result = await authService.login({ username, password });
    recordLoginSuccess(username);
    logger.info('auth.login.success', { userId: result.user.id, username, ip: req.ip });
    success(res, result, '登录成功');
  } catch (err: unknown) {
    recordLoginFailure(username);
    // M-6: 统一返回 401 防止用户名枚举
    if (err instanceof LoginSelectionError) {
      logger.warn('auth.login.no_access', { username, reason: err.message, ip: req.ip });
      fail(res, 401, '用户名或密码错误');
      return;
    }
    logger.warn('auth.login.failed', { username, ip: req.ip });
    fail(res, 401, '用户名或密码错误');
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length);
    const expiryMs = parseExpiryToMs(config.jwt.expiresIn);
    revokeToken(token, expiryMs);
  }
  logger.info('auth.logout', { userId: req.user?.userId, ip: req.ip });
  success(res, null, '登出成功');
}

export async function verify(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }
    const freshUser = await authService.getLatestUserState(user.userId);
    success(res, { valid: true, user: freshUser }, 'token有效');
  } catch (err: unknown) {
    logger.warn('auth.verify.failed', { userId: req.user?.userId, ip: req.ip });
    fail(res, 401, '登录已过期');
  }
}

export async function saveSelection(req: Request, res: Response): Promise<void> {
  const user = req.user;
  try {
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }

    // Zod saveSelectionSchema 已验证 company_id 为正整数、project_id 为正整数或 null
    const companyId: number = req.body.company_id;
    const projectId: number | null = req.body.project_id ?? null;

    await authService.saveSelection(user.userId, user.role, user.companyId, { company_id: companyId, project_id: projectId });
    logger.info('auth.selection.saved', { userId: user.userId, companyId, projectId, ip: req.ip });
    success(res, null, '保存成功');
  } catch (err: unknown) {
    if (err instanceof PermissionDeniedError) {
      logger.warn('auth.selection.denied', { userId: user!.userId, ip: req.ip });
      fail(res, 403, err.message);
      return;
    }
    logger.error('auth.selection.error', { userId: user?.userId, err: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '保存失败，请稍后重试');
  }
}

export async function getAccessibleCompanies(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }
    const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
    success(res, companies);
  } catch (err: unknown) {
    fail(res, 500, '获取公司列表失败，请稍后重试');
  }
}

export async function getAccessibleProjects(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }
    const rawCompanyId = req.query.company_id;
    if (Array.isArray(rawCompanyId)) {
      fail(res, 400, 'company_id 不允许多个值');
      return;
    }
    const companyId = parseInt(rawCompanyId as string, 10);
    if (isNaN(companyId) || companyId <= 0) {
      fail(res, 400, 'company_id 必须为正整数');
      return;
    }
    const projects = await authService.getAccessibleProjects(user.userId, user.role, companyId);
    success(res, projects);
  } catch (err: unknown) {
    fail(res, 500, '获取项目列表失败，请稍后重试');
  }
}

export async function getContext(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }
    let targetCompanyId: number | undefined;
    if (req.query.company_id) {
      const rawCompanyId = req.query.company_id;
      if (Array.isArray(rawCompanyId)) {
        fail(res, 400, 'company_id 不允许多个值');
        return;
      }
      targetCompanyId = parseInt(rawCompanyId as string, 10);
      if (isNaN(targetCompanyId) || targetCompanyId <= 0) {
        fail(res, 400, 'company_id 必须为正整数');
        return;
      }
    }
    const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
    const projects = targetCompanyId
      ? await authService.getAccessibleProjects(user.userId, user.role, targetCompanyId)
      : [];
    success(res, { companies, projects }, '获取成功');
  } catch (err: unknown) {
    fail(res, 500, '获取上下文失败，请稍后重试');
  }
}

export async function getCompanyDetail(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, '无效的公司ID'); return; }

    const user = req.user;
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }
    if (user.role === 'view') {
      fail(res, 403, '当前角色无权查看公司用户');
      return;
    }
    if (user.role !== 'sysadmin' && (user.companyId == null || user.companyId !== id)) {
      fail(res, 403, '无权查看其他公司的用户');
      return;
    }

    const result = await authService.getCompanyUsers(id);
    success(res, result);
  } catch (err: unknown) {
    logger.error('auth.company_detail.error', { id: req.params.id, err: err instanceof Error ? err.message : String(err) });
    fail(res, 500, '获取公司用户失败，请稍后重试');
  }
}
