import { z } from 'zod';

const keyword = z.string({ error: '关键词不能为空' })
  .min(1, '关键词不能为空')
  .max(200, '关键词不能超过200个字符')
  .trim();

const title = z.string({ error: '标题不能为空' })
  .min(1, '标题不能为空')
  .max(200, '标题不能超过200个字符')
  .trim();

const content = z.string({ error: '内容不能为空' })
  .min(1, '内容不能为空')
  .max(10000, '内容不能超过10000个字符');

const imageUrl = z.string({ error: '图片地址不能为空' })
  .min(1, '图片地址不能为空')
  .max(2000, '图片地址不能超过2000个字符')
  .refine(val => /^(https?:\/\/|\/)[^\s]+/.test(val), { message: '图片地址必须是有效的URL' });

const description = z.string()
  .max(2000, '描述不能超过2000个字符')
  .optional()
  .nullable()
  .transform(v => v ?? undefined);

const fileUrl = z.string({ error: '文档地址不能为空' })
  .min(1, '文档地址不能为空')
  .max(2000, '文档地址不能超过2000个字符')
  .refine(val => /^(https?:\/\/|\/)[^\s]+/.test(val), { message: '文档地址必须是有效的URL' });

const fileName = z.string({ error: '文件名不能为空' })
  .min(1, '文件名不能为空')
  .max(500, '文件名不能超过500个字符');

const fileType = z.string({ error: '文件类型不能为空' })
  .min(1, '文件类型不能为空')
  .max(50, '文件类型不能超过50个字符');

const fileSize = z.number({ error: '文件大小不能为空' })
  .positive('文件大小必须为正整数')
  .finite('文件大小必须为正整数');

const sourceType = z.enum(['all', 'document', 'portrait', 'image'], {
  error: '无效的资源类型，应为 all/document/portrait/image',
}).optional().default('all');

export const createKeywordSchema = z.object({
  keyword,
});

export const updateKeywordSchema = z.object({
  keyword,
});

export const batchCreateKeywordsSchema = z.object({
  keywords: z.array(z.string().min(1).max(200), { error: '关键词列表不能为空' })
    .min(1, '关键词列表不能为空')
    .max(500, '单次批量创建不能超过500个'),
  seed_word: z.string().max(200).optional(),
});

export const expandKeywordsSchema = z.object({
  keyword,
});

export const createPortraitSchema = z.object({
  title,
  content,
  description,
});

export const updatePortraitSchema = z.object({
  title: title.optional(),
  content: content.optional(),
  description,
});

export const createImageSchema = z.object({
  title,
  image_url: imageUrl,
  description,
});

export const updateImageSchema = z.object({
  title: title.optional(),
  description,
});

export const createDocumentSchema = z.object({
  title,
  file_url: fileUrl,
  file_name: fileName,
  file_type: fileType,
  file_size: fileSize,
  description,
});

export const updateDocumentSchema = z.object({
  title: title.optional(),
  description,
});

export const mineKeywordsSchema = z.object({
  source_type: sourceType,
});

export const saveMinedKeywordsSchema = z.object({
  keywords: z.array(z.string().min(1).max(200), { error: '请选择至少一个关键词' })
    .min(1, '请选择至少一个关键词')
    .max(500, '单次保存不能超过500个'),
});

export const toggleMinedKeywordsBatchSchema = z.object({
  ids: z.array(z.number().int().positive(), { error: '请选择关键词' })
    .min(1, '请选择关键词')
    .max(500, '单次操作不能超过500个'),
  selected: z.boolean({ error: 'selected必须为布尔值' }),
});

export const projectIdParamSchema = z.object({
  projectId: z.coerce.number().int().positive('项目ID必须为正整数'),
});

export const listProjectKnowledgeSchema = z.object({
  page: z.coerce.number().int().min(1, '页码不能小于1').max(10000, '页码不能超过10000').default(1),
  pageSize: z.coerce.number().int().min(1, '每页数量不能小于1').max(100, '每页数量不能超过100').default(10),
  search: z.string().trim().max(200, '搜索关键词不能超过200个字符').optional(),
});
