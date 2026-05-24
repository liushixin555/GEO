import { z } from 'zod';

const name = z.string({ error: '知识库名称不能为空' })
  .min(1, '知识库名称不能为空')
  .max(200, '知识库名称不能超过200个字符')
  .trim();

const description = z.string()
  .max(2000, '描述不能超过2000个字符')
  .optional()
  .nullable();

const scope = z.enum(['platform', 'company', 'project'], { error: '知识库范围不合法，应为 platform/company/project' });

const positiveInt = z.number({ error: 'ID必须为正整数' })
  .int('ID必须为整数')
  .positive('ID必须为正数');

export const createKnowledgeBaseSchema = z.object({
  name,
  description,
  scope,
  company_id: positiveInt.optional(),
  project_id: positiveInt.optional(),
});

export const updateKnowledgeBaseSchema = z.object({
  name: name.optional(),
  description,
  scope: scope.optional(),
  status: z.boolean().optional(),
  company_id: positiveInt.optional(),
  project_id: positiveInt.optional(),
});
