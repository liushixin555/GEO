import { Request, Response } from 'express';
import { UserServiceImpl } from '../service/impl/user.service.impl';
import { success, fail, paginate } from '../utils';

const userService = new UserServiceImpl();

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const status = req.query.status === undefined ? undefined : req.query.status === 'true';

    const { list, total } = await userService.list(null, page, pageSize, search, role, status);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取用户列表失败');
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的用户ID'); return; }

    const user = await userService.getById(id, null);
    success(res, user);
  } catch (err: any) {
    if (err.message === '用户不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取用户详情失败');
    }
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, cn_name, role } = req.body;
    if (!username || !password || !cn_name || !role) {
      fail(res, 400, '用户名、密码、姓名、角色不能为空');
      return;
    }

    const user = await userService.create(req.body);
    res.status(201).json({ code: 0, message: '创建用户成功', data: user });
  } catch (err: any) {
    if (err.message === '用户名已存在') {
      fail(res, 409, err.message);
    } else {
      fail(res, 500, err.message || '创建用户失败');
    }
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的用户ID'); return; }

    const user = await userService.update(id, null, req.body);
    success(res, user, '更新用户成功');
  } catch (err: any) {
    if (err.message === '用户不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新用户失败');
    }
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的用户ID'); return; }

    await userService.delete(id, null);
    success(res, null, '删除用户成功');
  } catch (err: any) {
    if (err.message === '用户不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '删除用户失败');
    }
  }
}
