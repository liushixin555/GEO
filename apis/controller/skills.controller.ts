import { Request, Response } from 'express';
import { SkillsServiceImpl } from '../service/impl/skills.service.impl';
import { success, fail, paginate } from '../utils';

const skillsService = new SkillsServiceImpl();

export async function listSkills(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const status = req.query.status === undefined ? undefined : req.query.status === 'true';

    // sysadmin + admin can see all skills (no filtering)
    const { list, total } = await skillsService.list(page, pageSize, search, category, status);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取技能列表失败');
  }
}

export async function getSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    // sysadmin + admin can see all skills (no filtering)
    const item = await skillsService.getById(id);
    success(res, item);
  } catch (err: any) {
    if (err.message === '技能不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取技能详情失败');
    }
  }
}

export async function createSkills(req: Request, res: Response): Promise<void> {
  try {
    const { name, category } = req.body;
    if (!name || !category) { fail(res, 400, '技能名称和类别不能为空'); return; }

    // Set creator to current user
    req.body.created_by = req.user!.userId;

    const item = await skillsService.create(req.body);
    res.status(201).json({ code: 0, message: '创建技能成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建技能失败');
  }
}

export async function updateSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    // admin can only update their own skills
    if (req.user?.role === 'admin') {
      const existing = await skillsService.getById(id);
      if (existing.created_by !== req.user.userId) {
        fail(res, 403, '只能修改自己创建的技能');
        return;
      }
    }

    const item = await skillsService.update(id, req.body);
    success(res, item, '更新技能成功');
  } catch (err: any) {
    if (err.message === '技能不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新技能失败');
    }
  }
}

export async function deleteSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    // admin can only delete their own skills
    if (req.user?.role === 'admin') {
      const existing = await skillsService.getById(id);
      if (existing.created_by !== req.user.userId) {
        fail(res, 403, '只能删除自己创建的技能');
        return;
      }
    }

    await skillsService.delete(id);
    success(res, null, '删除技能成功');
  } catch (err: any) {
    if (err.message === '技能不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '删除技能失败');
    }
  }
}
