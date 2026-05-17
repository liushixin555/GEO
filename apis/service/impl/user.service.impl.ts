import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../../utils';
import { UserListItem, CreateUserRequest, UpdateUserRequest } from '../../entity';
import { mapUser } from '../../map';
import { IUserService } from '../user.service';

export class UserServiceImpl implements IUserService {
  async list(companyId: number | null, page: number, pageSize: number, search?: string, role?: string, status?: boolean): Promise<{ list: UserListItem[]; total: number }> {
    const prisma = getPrisma();

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { cnName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (status !== undefined) where.status = status;
    if (companyId) where.companyId = companyId;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { list: items.map(mapUser), total };
  }

  async getById(id: number, companyId: number | null): Promise<UserListItem> {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { id },
    });
    if (!user) throw new Error('用户不存在');
    return mapUser(user);
  }

  async create(request: CreateUserRequest): Promise<UserListItem> {
    const prisma = getPrisma();

    const existing = await prisma.user.findUnique({ where: { username: request.username } });
    if (existing) throw new Error('用户名已存在');

    const passwordHash = await bcrypt.hash(request.password, 10);
    const user = await prisma.user.create({
      data: {
        username: request.username,
        passwordHash,
        cnName: request.cn_name,
        role: request.role,
        ...(request.company_id ? { companyId: request.company_id } : {}),
      },
    });
    return mapUser(user);
  }

  async update(id: number, companyId: number | null, request: UpdateUserRequest): Promise<UserListItem> {
    const prisma = getPrisma();

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) throw new Error('用户不存在');

    if (existing.role === 'sysadmin' && request.role !== undefined && request.role !== 'sysadmin') {
      throw new Error('系统管理员角色不可修改');
    }

    const data: any = {};
    if (request.cn_name !== undefined) data.cnName = request.cn_name;
    if (request.role !== undefined) data.role = request.role;
    if (request.status !== undefined) data.status = request.status;
    if (request.password) data.passwordHash = await bcrypt.hash(request.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return mapUser(user);
  }

  async delete(id: number, companyId: number | null): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) throw new Error('用户不存在');

    if (existing.role === 'sysadmin') throw new Error('系统管理员不可删除');

    await prisma.user.delete({ where: { id } });
  }
}
