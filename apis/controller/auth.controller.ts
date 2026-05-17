import { Request, Response } from 'express';
import { AuthServiceImpl } from '../service/impl/auth.service.impl';
import { LoginSelectionError } from '../entity';
import { success, fail } from '../utils';

const authService = new AuthServiceImpl();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: No accessible company/project
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      fail(res, 400, '用户名和密码不能为空');
      return;
    }
    const result = await authService.login({ username, password });
    success(res, result, '登录成功');
  } catch (err: any) {
    if (err instanceof LoginSelectionError) {
      fail(res, 403, err.message);
      return;
    }
    fail(res, 401, err.message || '登录失败');
  }
}

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  success(res, null, '登出成功');
}

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify token validity
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 */
export async function verify(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.substring(7);
  if (!token) {
    fail(res, 401, '未提供token');
    return;
  }
  const result = await authService.verifyToken(token);
  if (result.valid) {
    success(res, { valid: true }, 'token有效');
  } else {
    fail(res, 401, 'token无效或已过期');
  }
}

/**
 * @swagger
 * /api/auth/selection:
 *   put:
 *     summary: Save user's selected company/project
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *             properties:
 *               company_id:
 *                 type: integer
 *               project_id:
 *                 type: integer
 *                 nullable: true
 */
export async function saveSelection(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const { company_id, project_id } = req.body;
    if (!company_id) {
      fail(res, 400, 'company_id 不能为空');
      return;
    }
    await authService.saveSelection(userId, { company_id, project_id });
    success(res, null, '保存成功');
  } catch (err: any) {
    fail(res, 500, err.message || '保存失败');
  }
}

/**
 * @swagger
 * /api/auth/companies:
 *   get:
 *     summary: Get accessible companies for current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
export async function getAccessibleCompanies(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
    success(res, companies);
  } catch (err: any) {
    fail(res, 500, err.message || '获取公司列表失败');
  }
}

/**
 * @swagger
 * /api/auth/projects:
 *   get:
 *     summary: Get accessible projects for current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 */
export async function getAccessibleProjects(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const companyId = parseInt(req.query.company_id as string, 10);
    if (!companyId) {
      fail(res, 400, 'company_id 不能为空');
      return;
    }
    const projects = await authService.getAccessibleProjects(user.userId, user.role, companyId);
    success(res, projects);
  } catch (err: any) {
    fail(res, 500, err.message || '获取项目列表失败');
  }
}

/**
 * @swagger
 * /api/auth/context:
 *   get:
 *     summary: Get accessible companies and projects for the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         description: Company ID to fetch projects for
 *     responses:
 *       200:
 *         description: Context data with companies and projects
 */
export async function getContext(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const targetCompanyId = req.query.company_id ? Number(req.query.company_id) : undefined;
    const companies = await authService.getAccessibleCompanies(user.userId, user.role, user.companyId);
    const projects = targetCompanyId
      ? await authService.getAccessibleProjects(user.userId, user.role, targetCompanyId)
      : [];
    success(res, { companies, projects }, '获取成功');
  } catch (err: any) {
    fail(res, 500, err.message || '获取上下文失败');
  }
}

/**
 * @swagger
 * /api/auth/companies/{id}:
 *   get:
 *     summary: Get company users (operators/viewers) for project form
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
export async function getCompanyDetail(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的公司ID'); return; }

    const user = req.user!;
    // admin/view can only query their own company
    if (user.role !== 'sysadmin' && user.companyId !== id) {
      fail(res, 403, '无权查看其他公司的用户');
      return;
    }

    const result = await authService.getCompanyUsers(id);
    success(res, result);
  } catch (err: any) {
    fail(res, 500, err.message || '获取公司用户失败');
  }
}
