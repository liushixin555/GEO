import bcrypt from 'bcryptjs';
import { getPrisma } from '../../utils';
import { UserListItem, CreateUserRequest, UpdateUserRequest } from '../../entity';
import { mapUser } from '../../map';
import { IUserService, UserListOptions } from '../user.service';
import { NotFoundError, ForbiddenError, ConflictError } from '../../errors';

export class UserServiceImpl implements IUserService {
  async list(page: number, pageSize: number, options?: UserListOptions): Promise<{ list: UserListItem[]; total: number }> {
    const prisma = getPrisma();
    const { companyId, search, role, status } = options ?? {};

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

  async getById(id: number): Promise<UserListItem> {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { id },
    });
    if (!user) throw new NotFoundError('用户');
    return mapUser(user);
  }

  async create(request: CreateUserRequest): Promise<UserListItem> {
    const prisma = getPrisma();

    const existing = await prisma.user.findUnique({ where: { username: request.username } });
    if (existing) throw new ConflictError('用户名已存在');

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

  async update(id: number, request: UpdateUserRequest): Promise<UserListItem> {
    const prisma = getPrisma();

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('用户');

    if (existing.role === 'sysadmin' && request.role !== undefined && request.role !== 'sysadmin') {
      throw new ForbiddenError('系统管理员角色不可修改');
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

  async delete(id: number): Promise<void> {
    const prisma = getPrisma();

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('用户');

    if (existing.role === 'sysadmin') throw new ForbiddenError('系统管理员不可删除');

    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
