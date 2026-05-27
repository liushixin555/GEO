import { z } from 'zod';

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  event: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().max(200).optional(),
});
