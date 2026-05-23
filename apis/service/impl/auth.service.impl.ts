import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../../config';
import { getPrisma } from '../../utils';
import { LoginRequest, LoginResponse, LoginSelectionError, SaveSelectionRequest } from '../../entity';
import { IAuthService } from '../auth.service';

type SelectionItem = { id: number; short_name: string };

export class AuthServiceImpl implements IAuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { username, password } = request;
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        selectedCompany: { select: { id: true, shortName: true } },
        selectedProject: { select: { id: true, shortName: true } },
      },
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // Get accessible companies based on role
    const companies = await this.getAccessibleCompanies(user.id, user.role, user.companyId);
    if (companies.length === 0) {
      throw new LoginSelectionError('没有权限访问任何公司');
    }

    // Resolve selected company — check if saved selection is still accessible
    let selectedCompany: SelectionItem | null = null;
    if (user.selectedCompany && companies.some(c => c.id === user.selectedCompany!.id)) {
      selectedCompany = { id: user.selectedCompany.id, short_name: user.selectedCompany.shortName };
    } else {
      selectedCompany = companies[0];
    }

    // Get accessible projects for the selected company
    const projects = await this.getAccessibleProjects(user.id, user.role, selectedCompany.id);
    let selectedProject: SelectionItem | null = null;

    if (projects.length > 0) {
      if (user.selectedProject && projects.some(p => p.id === user.selectedProject!.id)) {
        selectedProject = { id: user.selectedProject.id, short_name: user.selectedProject.shortName };
      } else {
        selectedProject = projects[0];
      }
    } else if (user.role === 'view') {
      throw new LoginSelectionError('没有权限访问任何项目');
    }
    // sysadmin/admin with no projects: selectedProject stays null

    // Persist the resolved selection
    await prisma.user.update({
      where: { id: user.id },
      data: {
        selectedCompanyId: selectedCompany.id,
        selectedProjectId: selectedProject?.id ?? null,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        cn_name: user.cnName,
        role: user.role as any,
        company_id: user.companyId,
        selected_company: selectedCompany,
        selected_project: selectedProject,
      },
    };
  }

  async verifyToken(token: string): Promise<{ valid: boolean; userId?: number }> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      return { valid: true, userId: decoded.userId };
    } catch {
      return { valid: false };
    }
  }

  async saveSelection(userId: number, role: string, userCompanyId: number | null | undefined, request: SaveSelectionRequest): Promise<void> {
    const accessibleCompanies = await this.getAccessibleCompanies(userId, role, userCompanyId);
    if (!accessibleCompanies.some(c => c.id === request.company_id)) {
      throw new Error('无权选择该公司');
    }
    if (request.project_id) {
      const accessibleProjects = await this.getAccessibleProjects(userId, role, request.company_id);
      if (!accessibleProjects.some(p => p.id === request.project_id)) {
        throw new Error('无权选择该项目');
      }
    }
    const prisma = getPrisma();
    await prisma.user.update({
      where: { id: userId },
      data: {
        selectedCompanyId: request.company_id,
        selectedProjectId: request.project_id ?? null,
      },
    });
  }

  async getAccessibleCompanies(userId: number, role: string, companyId?: number | null): Promise<SelectionItem[]> {
    const prisma = getPrisma();

    if (role === 'sysadmin') {
      const all = await prisma.company.findMany({
        where: { status: true },
        select: { id: true, shortName: true },
        orderBy: { id: 'asc' },
      });
      return all.map(c => ({ id: c.id, short_name: c.shortName }));
    }

    // admin/view: only their own enabled company
    if (companyId) {
      const c = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, shortName: true, status: true },
      });
      if (!c || !c.status) return [];
      return [{ id: c.id, short_name: c.shortName }];
    }
    return [];
  }

  async getAccessibleProjects(userId: number, role: string, companyId?: number | null): Promise<SelectionItem[]> {
    if (!companyId) return [];
    const prisma = getPrisma();

    // Check if company is enabled (admin/view should not see disabled company projects)
    if (role !== 'sysadmin') {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { status: true },
      });
      if (!company || !company.status) return [];
    }

    if (role === 'sysadmin') {
      const projects = await prisma.project.findMany({
        where: { companyId, company: { status: true }, status: true },
        select: { id: true, shortName: true },
        orderBy: { id: 'asc' },
      });
      return projects.map(p => ({ id: p.id, short_name: p.shortName }));
    }

    if (role === 'admin') {
      const operators = await prisma.projectOperator.findMany({
        where: { userId, project: { companyId, company: { status: true }, status: true } },
        include: { project: { select: { id: true, shortName: true } } },
        orderBy: { projectId: 'asc' },
      });
      return operators.map(o => ({ id: o.project.id, short_name: o.project.shortName }));
    }

    // view: only projects they are viewers of
    const viewers = await prisma.projectViewer.findMany({
      where: { userId, project: { companyId, company: { status: true }, status: true } },
      include: { project: { select: { id: true, shortName: true } } },
      orderBy: { projectId: 'asc' },
    });
    return viewers.map(v => ({ id: v.project.id, short_name: v.project.shortName }));
  }

  async getCompanyUsers(companyId: number): Promise<{ operators: { id: number; cn_name: string; username: string }[]; viewers: { id: number; cn_name: string; username: string }[] }> {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { companyId, status: true, role: { in: ['admin', 'view'] } },
      select: { id: true, role: true, cnName: true, username: true },
    });
    return {
      operators: users.filter(u => u.role === 'admin').map(u => ({ id: u.id, cn_name: u.cnName, username: u.username })),
      viewers: users.filter(u => u.role === 'view').map(u => ({ id: u.id, cn_name: u.cnName, username: u.username })),
    };
  }
}
