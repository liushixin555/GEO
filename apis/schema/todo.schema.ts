import { z } from 'zod';

export const listTodosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  tab: z.enum(['my_open', 'my_closed', 'all_open', 'all_closed']).default('my_open'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  search: z.string().max(100).optional(),
});

export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().optional().nullable(),
  object_type: z.string().min(1),
  object_id: z.number().int().positive().optional().nullable(),
  action: z.string().min(1),
  source: z.string().optional(),
  priority: z.string().optional(),
  assignee_id: z.number().int().positive(),
  due_at: z.string().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  object_type: z.string().min(1).optional(),
  object_id: z.number().int().positive().optional().nullable(),
  action: z.string().min(1).optional(),
  priority: z.string().optional(),
  due_at: z.string().optional().nullable(),
});

export const transferTodoSchema = z.object({
  assignee_id: z.number().int().positive(),
  remark: z.string().max(500).optional(),
});

export const objectOptionsSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  objectType: z.enum(['article', 'keyword']),
  action: z.string().optional(),
});

export const assigneeCandidatesSchema = z.object({
  projectId: z.coerce.number().int().positive(),
});
