export type UserRole = 'sysadmin' | 'admin' | 'view';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  cn_name: string;
  role: UserRole;
  status: boolean;
  company_id?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    cn_name: string;
    role: UserRole;
    company_id?: number | null;
    selected_company: { id: number; short_name: string } | null;
    selected_project: { id: number; short_name: string } | null;
  };
}

export interface SaveSelectionRequest {
  company_id: number;
  project_id?: number | null;
}

export class LoginSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoginSelectionError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export interface UserListItem {
  id: number;
  username: string;
  cn_name: string;
  role: UserRole;
  status: boolean;
  company_id?: number | null;
  company_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  cn_name: string;
  role: UserRole;
  company_id?: number | null;
}

export interface UpdateUserRequest {
  cn_name?: string;
  role?: UserRole;
  status?: boolean;
  password?: string;
}
