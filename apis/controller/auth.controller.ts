import { Request, Response } from 'express';
import { AuthServiceImpl } from '../service/impl/auth.service.impl';
import { LoginSelectionError } from '../entity';
import { success, fail } from '../utils';

const authService = new AuthServiceImpl();

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      fail(res, 400, '用户名和密码不能为空');
      return;
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      fail(res, 400, '用户名和密码格式不正确');
      return;
    }
    if (username.length > 100 || password.length > 200) {
      fail(res, 400, '输入长度超出限制');
      return;
    }
    const result = await authService.login({ username, password });
    success(res, result, '登录成功');
  } catch (err: unknown) {
    if (err instanceof LoginSelectionError) {
      fail(res, 403, err.message);
      return;
    }
    const message = err instanceof Error ? err.message : '';
    fail(res, 401, message || '登录失败');
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');
}

export async function verify(_req: Request, res: Response): Promise<void> {
  const token = _req.headers.authorization?.substring(7);
  if (!token) {
    fail(res, 401, '未登录');
    return;
  }
  const result = await authService.verifyToken(token);
  if (!result.valid) {
    fail(res, 401, '登录已过期');
    return;
  }
  success(res, { valid: true, user: result.user }, 'token有效');
}

export async function saveSelection(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      fail(res, 401, '未登录');
      return;
    }

    const companyId = parseInt(req.body.company_id, 10);
    const projectId = req.body.project_id != null ? parseInt(req.body.project_id, 10) : null;

    if (isNaN(companyId) || companyId <= 0) {
      fail(res, 400, 'company_id 必须为正整数');
      return;
    }
    if (projectId !== null && (isNaN(projectId) || projectId <= 0)) {
      fail(res, 400, 'project_id 必须为正整数或 null');
      return;
    }

    await authService.saveSelection(user.userId, user.role, user.companyId, { company_id: companyId, project_id: projectId });
    success(res, null, '保存成功');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('无权')) {
      fail(res, 403, err.message);
      return;
    }
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
    const companyId = parseInt(req.query.company_id as string, 10);
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
    const targetCompanyId = req.query.company_id ? Number(req.query.company_id) : undefined;
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
    // admin/view can only query their own company
    if (user.role !== 'sysadmin' && user.companyId !== id) {
      fail(res, 403, '无权查看其他公司的用户');
      return;
    }

    const result = await authService.getCompanyUsers(id);
    success(res, result);
  } catch (err: unknown) {
    fail(res, 500, '获取公司用户失败，请稍后重试');
  }
}
