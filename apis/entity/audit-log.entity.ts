export interface AuditLog {
  id: number;
  level: string;
  event: string;
  user_id: number | null;
  user_name: string | null;
  ip: string | null;
  method: string | null;
  url: string | null;
  status: number | null;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListParams {
  page: number;
  pageSize: number;
  level?: string;
  event?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}
