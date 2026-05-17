import { LoginRequest, LoginResponse, SaveSelectionRequest } from '../entity';

export interface IAuthService {
  login(request: LoginRequest): Promise<LoginResponse>;
  verifyToken(token: string): Promise<{ valid: boolean; userId?: number }>;
  saveSelection(userId: number, request: SaveSelectionRequest): Promise<void>;
  getAccessibleCompanies(userId: number, role: string, companyId?: number | null): Promise<{ id: number; short_name: string }[]>;
  getAccessibleProjects(userId: number, role: string, companyId?: number | null): Promise<{ id: number; short_name: string }[]>;
  getCompanyUsers(companyId: number): Promise<{ operators: { id: number; cn_name: string; username: string }[]; viewers: { id: number; cn_name: string; username: string }[] }>;
}
