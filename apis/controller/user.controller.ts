import { Request, Response } from 'express';
import { z } from 'zod';
import { createUserService } from '../service';
import { success, fail, created, paginate } from '../utils';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors';

const userService = createUserService();

function handleError(res: Response, err: unknown, defaultMsg: string): void {
  if (err instanceof z.ZodError) {
    fail(res, 400, err.issues.map((e: any) => e.message).join('; '));
  } else if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else if (err instanceof ForbiddenError) {
    fail(res, 403, err.message);
  } else if (err instanceof ConflictError) {
    fail(res, 409, err.message);
  } else {
    fail(res, 500, defaultMsg);
  }
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    // req.query already validated and transformed by validate(listUsersSchema, 'query') middleware
    const q = req.query as Record<string, any>;
    const { list, total } = await userService.list(q.page, q.pageSize, {
      search: q.search,
      role: q.role,
      status: q.status,
    });
    paginate(res, list, total, q.page, q.pageSize);
  } catch (err: unknown) {
    handleError(res, err, '获取用户列表失败');
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的用户ID'); return; }

    const user = await userService.getById(id);
    success(res, user);
  } catch (err: unknown) {
    handleError(res, err, '获取用户详情失败');
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    // req.body already validated by validate(createUserSchema) middleware
    const user = await userService.create(req.body);
    created(res, user, '创建用户成功');
  } catch (err: unknown) {
    handleError(res, err, '创建用户失败');
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的用户ID'); return; }

    // req.body already validated by validate(updateUserSchema) middleware
    const user = await userService.update(id, req.body);
    success(res, user, '更新用户成功');
  } catch (err: unknown) {
    handleError(res, err, '更新用户失败');
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的用户ID'); return; }

    await userService.delete(id);
    success(res, null, '删除用户成功');
  } catch (err: unknown) {
    handleError(res, err, '删除用户失败');
  }
}
