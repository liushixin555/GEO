import { Request, Response } from 'express';
import { createCompanyService } from '../service';
import { success, fail, created } from '../utils';
import { CreateCompanyRequest, UpdateCompanyRequest } from '../entity';
import { NotFoundError, BusinessError } from '../errors';
import { createCompanySchema, updateCompanySchema, toggleCompanyStatusSchema } from '../schema/company.schema';

const companyService = createCompanyService();

/** 常量消息 */
const MSG_INVALID_ID = '无效的公司ID';
const MSG_NOT_FOUND = '公司不存在';
const MSG_LIST_FAIL = '获取公司列表失败';
const MSG_DETAIL_FAIL = '获取公司详情失败';
const MSG_CREATE_FAIL = '创建公司失败';
const MSG_UPDATE_FAIL = '更新公司失败';
const MSG_TOGGLE_FAIL = '操作失败';
const MSG_ENABLED = '公司已启用';
const MSG_DISABLED = '公司已禁用';

export async function listCompanies(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await companyService.list();
    success(res, companies, '获取公司列表成功');
  } catch (err: unknown) {
    console.error('[CompanyController] listCompanies failed:', err);
    fail(res, 500, MSG_LIST_FAIL);
  }
}

export async function getCompany(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) {
      fail(res, 400, MSG_INVALID_ID);
      return;
    }
    const company = await companyService.getById(id);
    success(res, company, '获取公司详情成功');
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      fail(res, 404, MSG_NOT_FOUND);
    } else {
      console.error('[CompanyController] getCompany failed:', err);
      fail(res, 500, MSG_DETAIL_FAIL);
    }
  }
}

export async function createCompany(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }

    const parsed = createCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.issues.map(e => e.message).join('; '));
      return;
    }

    const createRequest: CreateCompanyRequest = parsed.data;
    const company = await companyService.create(createRequest, req.user.userId);
    created(res, company, '创建公司成功');
  } catch (err: unknown) {
    if (err instanceof BusinessError) {
      fail(res, 400, err.message);
    } else {
      console.error('[CompanyController] createCompany failed:', err);
      fail(res, 500, MSG_CREATE_FAIL);
    }
  }
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) {
      fail(res, 400, MSG_INVALID_ID);
      return;
    }

    const parsed = updateCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.issues.map(e => e.message).join('; '));
      return;
    }

    const updateRequest: UpdateCompanyRequest = parsed.data;
    const company = await companyService.update(id, updateRequest, req.user.userId);
    success(res, company, '更新公司成功');
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      fail(res, 404, MSG_NOT_FOUND);
    } else if (err instanceof BusinessError) {
      fail(res, 400, err.message);
    } else {
      console.error('[CompanyController] updateCompany failed:', err);
      fail(res, 500, MSG_UPDATE_FAIL);
    }
  }
}

export async function toggleCompanyStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) {
      fail(res, 400, MSG_INVALID_ID);
      return;
    }

    const parsed = toggleCompanyStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, parsed.error.issues.map(e => e.message).join('; '));
      return;
    }

    const { status } = parsed.data;
    const company = await companyService.toggleStatus(id, status, req.user.userId);
    success(res, company, status ? MSG_ENABLED : MSG_DISABLED);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      fail(res, 404, MSG_NOT_FOUND);
    } else if (err instanceof BusinessError) {
      fail(res, 400, err.message);
    } else {
      console.error('[CompanyController] toggleCompanyStatus failed:', err);
      fail(res, 500, MSG_TOGGLE_FAIL);
    }
  }
}
