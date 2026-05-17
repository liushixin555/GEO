import { Response } from 'express';

export function success<T>(res: Response, data: T, message = '操作成功') {
  return res.json({ code: 0, message, data });
}

export function fail(res: Response, code: number, message: string) {
  return res.status(code >= 400 ? code : 400).json({ code, message });
}

export function paginate<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return res.json({
    code: 0,
    data: {
      list: data,
      total,
      page,
      pageSize,
    },
  });
}
