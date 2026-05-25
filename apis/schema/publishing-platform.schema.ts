import { z } from 'zod';

export const listPublishingPlatformsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  taxonomy: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'taxonomy', 'price', 'include_rate', 'publish_rate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
