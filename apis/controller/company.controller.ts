import { Request, Response } from 'express';
import { CompanyServiceImpl } from '../service/impl/company.service.impl';
import { success, fail, created } from '../utils';
import { CreateCompanyRequest, UpdateCompanyRequest } from '../entity';
import { createCompanySchema, updateCompanySchema } from '../schema/company.schema';

const companyService = new CompanyServiceImpl();

/** 常量消息 */
const MSG_INVALID_ID = '无效的公司ID';
const MSG_NOT_FOUND = '公司不存在';
const MSG_LIST_FAIL = '获取公司列表失败';
const MSG_DETAIL_FAIL = '获取公司详情失败';
const MSG_CREATE_FAIL = '创建公司失败';
const MSG_UPDATE_FAIL = '更新公司失败';
const MSG_TOGGLE_FAIL = '操作失败';

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message === MSG_NOT_FOUND;
}

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
  } catch (err: unknown) {
    fail(res, 500, MSG_LIST_FAIL);
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
      fail(res, 400, MSG_INVALID_ID);
      return;
    }
    const company = await companyService.getById(id);
    success(res, company, '获取公司详情成功');
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      fail(res, 404, MSG_NOT_FOUND);
    } else {
      fail(res, 500, MSG_DETAIL_FAIL);
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
    const parsed = createCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.issues.map((e: { message: string }) => e.message).join('; '));
      return;
    }

    const createRequest: CreateCompanyRequest = parsed.data;
    const company = await companyService.create(createRequest);
    created(res, company, '创建公司成功');
  } catch (err: unknown) {
    fail(res, 500, MSG_CREATE_FAIL);
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
      fail(res, 400, MSG_INVALID_ID);
      return;
    }

    const parsed = updateCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.issues.map((e: { message: string }) => e.message).join('; '));
      return;
    }

    const updateRequest: UpdateCompanyRequest = parsed.data;
    const company = await companyService.update(id, updateRequest);
    success(res, company, '更新公司成功');
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      fail(res, 404, MSG_NOT_FOUND);
    } else {
      fail(res, 500, MSG_UPDATE_FAIL);
    }
  }
}

/**
 * @swagger
 * /api/companies/{id}/status:
 *   put:
 *     summary: Toggle company status (enable/disable)
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
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company status updated
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Company not found
 */
export async function toggleCompanyStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      fail(res, 400, MSG_INVALID_ID);
      return;
    }

    const { status } = req.body;
    if (typeof status !== 'boolean') {
      fail(res, 400, 'status参数无效');
      return;
    }

    const company = await companyService.toggleStatus(id, status);
    success(res, company, status ? '公司已启用' : '公司已禁用');
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      fail(res, 404, MSG_NOT_FOUND);
    } else {
      fail(res, 500, MSG_TOGGLE_FAIL);
    }
  }
}
