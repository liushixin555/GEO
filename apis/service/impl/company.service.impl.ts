import { getPrisma } from '../../utils';
import { Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail } from '../../entity';
import { mapCompany } from '../../map';
import { ICompanyService } from '../company.service';

export class CompanyServiceImpl implements ICompanyService {
  async list(): Promise<Company[]> {
    const prisma = getPrisma();
    const companies = await prisma.company.findMany({ orderBy: { id: 'asc' } });
    return companies.map(mapCompany);
  }

  async getById(id: number): Promise<CompanyDetail> {
    const prisma = getPrisma();
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
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
      const company = await tx.company.create({
        data: {
          shortName: request.short_name,
          fullName: request.full_name,
          address: request.address || null,
          contactPerson: request.contact_person,
          contactPhone: request.contact_phone,
        },
      });

      for (const operatorId of request.operator_ids) {
        await tx.user.update({
          where: { id: operatorId },
          data: { companyId: company.id },
        });
      }

      if (request.viewer_ids?.length) {
        for (const viewerId of request.viewer_ids) {
          await tx.user.update({
            where: { id: viewerId },
            data: { companyId: company.id },
          });
        }
      }

      return mapCompany(company);
    });
  }

  async update(id: number, request: UpdateCompanyRequest): Promise<Company> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
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

      // Unlink previous admin/view users
      await tx.user.updateMany({
        where: { companyId: id, role: 'admin' },
        data: { companyId: null },
      });
      await tx.user.updateMany({
        where: { companyId: id, role: 'view' },
        data: { companyId: null },
      });

      // Link new operators
      for (const operatorId of request.operator_ids) {
        await tx.user.update({
          where: { id: operatorId },
          data: { companyId: id },
        });
      }

      // Link new viewers
      if (request.viewer_ids?.length) {
        for (const viewerId of request.viewer_ids) {
          await tx.user.update({
            where: { id: viewerId },
            data: { companyId: id },
          });
        }
      }

      return mapCompany(company);
    });
  }

  async toggleStatus(id: number, status: boolean): Promise<Company> {
    const prisma = getPrisma();
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new Error('公司不存在');

    const company = await prisma.company.update({
      where: { id },
      data: { status },
    });
    return mapCompany(company);
  }
}
