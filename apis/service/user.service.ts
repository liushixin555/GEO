import { UserListItem, CreateUserRequest, UpdateUserRequest } from '../entity';

export interface IUserService {
  list(companyId: number | null, page: number, pageSize: number, search?: string, role?: string, status?: boolean): Promise<{ list: UserListItem[]; total: number }>;
  getById(id: number, companyId: number | null): Promise<UserListItem>;
  create(request: CreateUserRequest): Promise<UserListItem>;
  update(id: number, companyId: number | null, request: UpdateUserRequest): Promise<UserListItem>;
  delete(id: number, companyId: number | null): Promise<void>;
}
