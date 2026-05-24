import { UserListItem, CreateUserRequest, UpdateUserRequest } from '../entity';

export interface UserListOptions {
  companyId?: number | null;
  search?: string;
  role?: string;
  status?: boolean;
}

export interface IUserService {
  list(page: number, pageSize: number, options?: UserListOptions): Promise<{ list: UserListItem[]; total: number }>;
  getById(id: number): Promise<UserListItem>;
  create(request: CreateUserRequest): Promise<UserListItem>;
  update(id: number, request: UpdateUserRequest): Promise<UserListItem>;
  delete(id: number): Promise<void>;
}
