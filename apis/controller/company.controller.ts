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

export async function listCompanies(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await companyService.list();
    success(res, companies, '获取公司列表成功');
  } catch (err: unknown) {
    fail(res, 500, MSG_LIST_FAIL);
  }
}

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
