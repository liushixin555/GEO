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
  } catch (_err: any) {
    fail(res, 500, '获取用户列表失败');
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
      fail(res, 500, '获取用户详情失败');
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

    // H-3: 角色值白名单校验
    if (!['sysadmin', 'admin', 'view'].includes(role)) {
      fail(res, 400, '角色值不合法');
      return;
    }

    // H-4: 密码强度验证
    if (password.length < 8) {
      fail(res, 400, '密码长度不能少于8位');
      return;
    }

    const user = await userService.create(req.body);
    res.status(201).json({ code: 0, message: '创建用户成功', data: user });
  } catch (err: any) {
    if (err.message === '用户名已存在') {
      fail(res, 409, err.message);
    } else {
      fail(res, 500, '创建用户失败');
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
    } else if (err.message === '系统管理员角色不可修改') {
      fail(res, 403, err.message);
    } else {
      fail(res, 500, '更新用户失败');
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
    } else if (err.message === '系统管理员不可删除') {
      fail(res, 403, err.message);
    } else {
      fail(res, 500, '删除用户失败');
    }
  }
}
