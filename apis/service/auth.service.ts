import { LoginRequest, LoginResponse, SaveSelectionRequest, UserRole } from '../entity';

export interface VerifyUserData {
  id: number;
  username: string;
  cn_name: string;
  role: UserRole;
  company_id?: number | null;
  selected_company: { id: number; short_name: string } | null;
  selected_project: { id: number; short_name: string } | null;
}

export interface IAuthService {
  login(request: LoginRequest): Promise<LoginResponse>;
  verifyToken(token: string): Promise<{ valid: boolean; user?: VerifyUserData }>;
  getLatestUserState(userId: number): Promise<VerifyUserData>;
  saveSelection(userId: number, role: string, userCompanyId: number | null | undefined, request: SaveSelectionRequest): Promise<void>;
  getAccessibleCompanies(userId: number, role: string, companyId?: number | null): Promise<{ id: number; short_name: string }[]>;
  getAccessibleProjects(userId: number, role: string, companyId?: number | null): Promise<{ id: number; short_name: string }[]>;
  getCompanyUsers(companyId: number): Promise<{ operators: { id: number; cn_name: string; username: string }[]; viewers: { id: number; cn_name: string; username: string }[] }>;
}
