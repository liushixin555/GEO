import { getPrisma } from '../../utils';
import { Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail } from '../../entity';
import { mapCompany } from '../../map';
import { ICompanyService } from '../company.service';

export class CompanyServiceImpl implements ICompanyService {
  async list(): Promise<Company[]> {
    const prisma = getPrisma();
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });
    return companies.map(mapCompany);
  }

  async getById(id: number): Promise<CompanyDetail> {
    const prisma = getPrisma();
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company || company.deletedAt) {
      throw new Error('公司不存在');
    }

    const users = await prisma.user.findMany({
      where: { companyId: id, status: true, role: { in: ['admin', 'view'] } },
      select: { id: true, role: true, cnName: true, username: true },
    });

    const operators = users.filter(u => u.role === 'admin');
    const viewers = users.filter(u => u.role === 'view');

    return {
      ...mapCompany(company),
      operator_ids: operators.map(u => u.id),
      operators: operators.map(u => ({ id: u.id, cn_name: u.cnName, username: u.username })),
      viewer_ids: viewers.map(u => u.id),
      viewers: viewers.map(u => ({ id: u.id, cn_name: u.cnName, username: u.username })),
    };
  }

  async create(request: CreateCompanyRequest): Promise<Company> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      // 校验所有 operator/viewer IDs 的合法性
      await this.validateUserIds(tx, request.operator_ids, request.viewer_ids);

      const company = await tx.company.create({
        data: {
          shortName: request.short_name,
          fullName: request.full_name,
          address: request.address || null,
          contactPerson: request.contact_person,
          contactPhone: request.contact_phone,
        },
      });

      // 批量设置 operators
      await tx.user.updateMany({
        where: { id: { in: request.operator_ids } },
        data: { companyId: company.id },
      });

      // 批量设置 viewers
      if (request.viewer_ids?.length) {
        await tx.user.updateMany({
          where: { id: { in: request.viewer_ids } },
          data: { companyId: company.id },
        });
      }

      return mapCompany(company);
    });
  }

  async update(id: number, request: UpdateCompanyRequest): Promise<Company> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.company.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        throw new Error('公司不存在');
      }

      const company = await tx.company.update({
        where: { id },
        data: {
          shortName: request.short_name,
          fullName: request.full_name,
          address: request.address || null,
          contactPerson: request.contact_person,
          contactPhone: request.contact_phone,
        },
      });

      // 解绑旧的 admin/view 用户
      await tx.user.updateMany({
        where: { companyId: id, role: { in: ['admin', 'view'] } },
        data: { companyId: null },
      });

      // 校验新的 operator/viewer IDs 合法性
      await this.validateUserIds(tx, request.operator_ids, request.viewer_ids);

      // 批量绑定新的 operators
      await tx.user.updateMany({
        where: { id: { in: request.operator_ids } },
        data: { companyId: id },
      });

      // 批量绑定新的 viewers
      if (request.viewer_ids?.length) {
        await tx.user.updateMany({
          where: { id: { in: request.viewer_ids } },
          data: { companyId: id },
        });
      }

      return mapCompany(company);
    });
  }

  async toggleStatus(id: number, status: boolean): Promise<Company> {
    const prisma = getPrisma();
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new Error('公司不存在');

    const company = await prisma.company.update({
      where: { id },
      data: { status },
    });
    return mapCompany(company);
  }

  /** 校验用户 ID 列表的合法性：存在性、角色、状态 */
  private async validateUserIds(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    operatorIds: number[],
    viewerIds?: number[],
  ): Promise<void> {
    const targetIds = [...operatorIds, ...(viewerIds ?? [])];

    if (targetIds.length === 0) return;

    const users: { id: number; role: string; status: boolean }[] = await tx.user.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, role: true, status: true },
    });

    // 检查所有 ID 存在
    const foundIds = new Set(users.map(u => u.id));
    const missingIds = targetIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(`用户不存在: ${missingIds.join(', ')}`);
    }

    // 检查无 sysadmin 被关联
    const sysadminIds = users.filter(u => u.role === 'sysadmin').map(u => u.id);
    if (sysadminIds.length > 0) {
      throw new Error('系统管理员不可被关联到公司');
    }

    // 检查用户状态
    const inactiveIds = users.filter(u => !u.status).map(u => u.id);
    if (inactiveIds.length > 0) {
      throw new Error(`用户已禁用: ${inactiveIds.join(', ')}`);
    }
  }
}
