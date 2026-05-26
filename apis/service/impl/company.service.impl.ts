import { getPrisma } from '../../utils';
import { Company, CompanyListItem, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail, UserRef } from '../../entity';
import { mapCompany } from '../../map';
import { ICompanyService } from '../company.service';
import { NotFoundError, BusinessError } from '../../errors';

function toListItem(company: Company): CompanyListItem {
  const { contact_person, contact_phone, address, deleted_at, created_by, updated_by, ...rest } = company;
  return rest;
}

export class CompanyServiceImpl implements ICompanyService {
  async list(): Promise<CompanyListItem[]> {
    const prisma = getPrisma();
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });
    return companies.map(mapCompany).map(toListItem);
  }

  async getById(id: number): Promise<CompanyDetail> {
    const prisma = getPrisma();
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company || company.deletedAt) {
      throw new NotFoundError('公司');
    }

    const users = await prisma.user.findMany({
      where: { companyId: id, status: true, role: { in: ['admin', 'view'] } },
      select: { id: true, role: true, cnName: true },
    });

    const operators: UserRef[] = users.filter(u => u.role === 'admin').map(u => ({ id: u.id, cn_name: u.cnName }));
    const viewers: UserRef[] = users.filter(u => u.role === 'view').map(u => ({ id: u.id, cn_name: u.cnName }));

    const { deleted_at, ...companyWithoutDeletedAt } = mapCompany(company);
    return {
      ...companyWithoutDeletedAt,
      operator_ids: operators.map(u => u.id),
      operators,
      viewer_ids: viewers.map(u => u.id),
      viewers,
    };
  }

  async create(request: CreateCompanyRequest, userId: number): Promise<Company> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      this.validateOperatorViewerExclusive(request.operator_ids, request.viewer_ids);
      await this.validateUserIds(tx, request.operator_ids, request.viewer_ids);

      const company = await tx.company.create({
        data: {
          shortName: request.short_name,
          fullName: request.full_name,
          address: request.address ?? null,
          contactPerson: request.contact_person,
          contactPhone: request.contact_phone,
          createdById: userId,
        },
      });

      await tx.user.updateMany({
        where: { id: { in: request.operator_ids } },
        data: { companyId: company.id },
      });

      if (request.viewer_ids?.length) {
        await tx.user.updateMany({
          where: { id: { in: request.viewer_ids } },
          data: { companyId: company.id },
        });
      }

      return mapCompany(company);
    });
  }

  async update(id: number, request: UpdateCompanyRequest, userId: number): Promise<Company> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.company.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        throw new NotFoundError('公司');
      }

      const data: Record<string, unknown> = { updatedById: userId };
      if (request.short_name !== undefined) data.shortName = request.short_name;
      if (request.full_name !== undefined) data.fullName = request.full_name;
      if (request.address !== undefined) data.address = request.address ?? null;
      if (request.contact_person !== undefined) data.contactPerson = request.contact_person;
      if (request.contact_phone !== undefined) data.contactPhone = request.contact_phone;

      const company = await tx.company.update({
        where: { id },
        data,
      });

      if (request.operator_ids !== undefined || request.viewer_ids !== undefined) {
        await tx.user.updateMany({
          where: { companyId: id, role: { in: ['admin', 'view'] } },
          data: { companyId: null },
        });

        const operatorIds = request.operator_ids ?? [];
        const viewerIds = request.viewer_ids ?? [];

        this.validateOperatorViewerExclusive(operatorIds, viewerIds);
        await this.validateUserIds(tx, operatorIds, viewerIds.length > 0 ? viewerIds : undefined);

        if (operatorIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: operatorIds } },
            data: { companyId: id },
          });
        }

        if (viewerIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: viewerIds } },
            data: { companyId: id },
          });
        }
      }

      return mapCompany(company);
    });
  }

  async toggleStatus(id: number, status: boolean, userId: number): Promise<Company> {
    const prisma = getPrisma();
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundError('公司');

    if (existing.status === status) {
      throw new BusinessError(`公司已处于${status ? '启用' : '禁用'}状态`);
    }

    const company = await prisma.company.update({
      where: { id },
      data: { status, updatedById: userId },
    });
    return mapCompany(company);
  }

  /** 校验 operator_ids 与 viewer_ids 无交集 */
  private validateOperatorViewerExclusive(operatorIds: number[], viewerIds?: number[]): void {
    if (!viewerIds?.length) return;
    const opSet = new Set(operatorIds);
    const overlap = viewerIds.filter(id => opSet.has(id));
    if (overlap.length > 0) {
      throw new BusinessError(`同一用户不能同时出现在运营者和查看者列表中: ${overlap.join(', ')}`);
    }
  }

  /** 校验用户 ID 列表的合法性：存在性、角色、状态 */
  private async validateUserIds(
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

    const foundIds = new Set(users.map(u => u.id));
    const missingIds = targetIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new BusinessError(`用户不存在: ${missingIds.join(', ')}`);
    }

    const sysadminIds = users.filter(u => u.role === 'sysadmin').map(u => u.id);
    if (sysadminIds.length > 0) {
      throw new BusinessError('系统管理员不可被关联到公司');
    }

    const inactiveIds = users.filter(u => !u.status).map(u => u.id);
    if (inactiveIds.length > 0) {
      throw new BusinessError(`用户已禁用: ${inactiveIds.join(', ')}`);
    }
  }
}
