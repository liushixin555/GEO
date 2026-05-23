import { z } from 'zod';

const shortName = z.string({ error: '公司简称不能为空' })
  .min(1, '公司简称不能为空')
  .max(50, '公司简称不能超过50个字符')
  .trim();

const fullName = z.string({ error: '公司全称不能为空' })
  .min(1, '公司全称不能为空')
  .max(200, '公司全称不能超过200个字符')
  .trim();

const address = z.string({ error: '地址不能为空' })
  .max(500, '地址不能超过500个字符')
  .trim()
  .optional();

const contactPerson = z.string({ error: '联系人不能为空' })
  .min(1, '联系人不能为空')
  .max(100, '联系人不能超过100个字符')
  .trim();

const contactPhone = z.string({ error: '联系电话不能为空' })
  .min(1, '联系电话不能为空')
  .max(20, '联系电话不能超过20个字符')
  .trim()
  .regex(/^[\d\-+()#\s]+$/, '电话格式无效，仅允许数字、+、-、()、#');

const positiveInt = z.number({ error: 'ID不能为空' })
  .int('ID必须为整数')
  .positive('ID必须为正数');

const operatorIds = z.array(positiveInt, { error: '运营者不能为空' })
  .min(1, '运营者不能为空')
  .max(100, '运营者不能超过100个');

const viewerIds = z.array(positiveInt)
  .max(100, '查看者不能超过100个')
  .optional();

export const createCompanySchema = z.object({
  short_name: shortName,
  full_name: fullName,
  address,
  contact_person: contactPerson,
  contact_phone: contactPhone,
  operator_ids: operatorIds,
  viewer_ids: viewerIds,
});

export const updateCompanySchema = z.object({
  short_name: shortName,
  full_name: fullName,
  address,
  contact_person: contactPerson,
  contact_phone: contactPhone,
  operator_ids: operatorIds,
  viewer_ids: viewerIds,
});
