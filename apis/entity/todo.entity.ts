export interface Todo {
  id: number;
  title: string;
  company_id: number;
  company_name: string;
  project_id: number | null;
  project_name: string | null;
  object_type: string;
  object_id: number | null;
  action: string;
  source: string;
  priority: string;
  assignee_id: number;
  assignee_name: string;
  status: string;
  created_by_id: number;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface TodoLog {
  id: number;
  todo_id: number;
  operator_id: number;
  operator_name: string;
  action: string;
  object_type: string | null;
  object_id: number | null;
  remark: string | null;
  created_at: Date;
}

export interface CreateTodoRequest {
  title: string;
  company_id: number;
  project_id?: number | null;
  object_type: string;
  object_id?: number | null;
  action: string;
  source?: string;
  priority?: string;
  assignee_id: number;
}

export interface UpdateTodoRequest {
  title?: string;
  object_type?: string;
  object_id?: number | null;
  action?: string;
  priority?: string;
}

export interface TransferTodoRequest {
  assignee_id: number;
  remark?: string;
}
