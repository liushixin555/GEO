import { Todo, TodoLog, CreateTodoRequest, UpdateTodoRequest, TransferTodoRequest } from '../entity';

export interface ITodoService {
  list(params: {
    page: number;
    pageSize: number;
    tab: string;
    priority?: string;
    search?: string;
    userId: number;
    role: string;
    companyId: number | null;
  }): Promise<{ list: Todo[]; total: number }>;
  getById(id: number, userId: number, role: string, companyId: number | null): Promise<Todo>;
  create(request: CreateTodoRequest, createdById: number): Promise<Todo>;
  update(id: number, request: UpdateTodoRequest, userId: number, role: string): Promise<Todo>;
  close(id: number, userId: number, role: string): Promise<Todo>;
  reopen(id: number, userId: number, role: string): Promise<Todo>;
  transfer(id: number, request: TransferTodoRequest, userId: number, role: string): Promise<Todo>;
  reject(id: number, userId: number, role: string): Promise<Todo>;
  getLogs(todoId: number, userId: number, role: string, companyId: number | null): Promise<TodoLog[]>;
  getObjectOptions(params: {
    projectId: number;
    objectType: string;
    action?: string;
  }): Promise<{ id: number; name: string }[]>;
  getAssigneeCandidates(projectId: number): Promise<{
    id: number;
    username: string;
    cn_name: string;
    role: string;
  }[]>;
}
