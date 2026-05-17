import { Request, Response } from 'express';
import { CompanyServiceImpl } from '../service/impl/company.service.impl';
import { success, fail } from '../utils';

const companyService = new CompanyServiceImpl();

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: List all companies
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies
 */
export async function listCompanies(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await companyService.list();
    success(res, companies, '获取公司列表成功');
  } catch (err: any) {
    fail(res, 500, err.message || '获取公司列表失败');
  }
}

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company detail by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Company detail
 *       404:
 *         description: Company not found
 */
export async function getCompany(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      fail(res, 400, '无效的公司ID');
      return;
    }
    const company = await companyService.getById(id);
    success(res, company, '获取公司详情成功');
  } catch (err: any) {
    if (err.message === '公司不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取公司详情失败');
    }
  }
}

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - short_name
 *               - full_name
 *               - contact_person
 *               - contact_phone
 *               - operator_ids
 *             properties:
 *               short_name:
 *                 type: string
 *               full_name:
 *                 type: string
 *               address:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               operator_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               viewer_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Company created
 *       400:
 *         description: Validation error
 */
export async function createCompany(req: Request, res: Response): Promise<void> {
  try {
    const { short_name, full_name, contact_person, contact_phone, operator_ids } = req.body;

    if (!short_name || !full_name || !contact_person || !contact_phone) {
      fail(res, 400, '公司名短名、公司名全名、接口人、接口人电话不能为空');
      return;
    }

    if (!Array.isArray(operator_ids) || operator_ids.length === 0) {
      fail(res, 400, '运营者不能为空');
      return;
    }

    const company = await companyService.create(req.body);
    res.status(201).json({ code: 0, message: '创建公司成功', data: company });
  } catch (err: any) {
    fail(res, 500, err.message || '创建公司失败');
  }
}

/**
 * @swagger
 * /api/companies/{id}:
 *   put:
 *     summary: Update a company
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - short_name
 *               - full_name
 *               - contact_person
 *               - contact_phone
 *               - operator_ids
 *             properties:
 *               short_name:
 *                 type: string
 *               full_name:
 *                 type: string
 *               address:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               operator_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               viewer_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Company updated
 *       404:
 *         description: Company not found
 */
export async function updateCompany(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      fail(res, 400, '无效的公司ID');
      return;
    }

    const { short_name, full_name, contact_person, contact_phone, operator_ids } = req.body;

    if (!short_name || !full_name || !contact_person || !contact_phone) {
      fail(res, 400, '公司名短名、公司名全名、接口人、接口人电话不能为空');
      return;
    }

    if (!Array.isArray(operator_ids) || operator_ids.length === 0) {
      fail(res, 400, '运营者不能为空');
      return;
    }

    const company = await companyService.update(id, req.body);
    success(res, company, '更新公司成功');
  } catch (err: any) {
    if (err.message === '公司不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新公司失败');
    }
  }
}
