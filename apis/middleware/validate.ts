import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
    const result = schema.safeParse(data);
    if (!result.success) {
      res.status(400).json({
        code: 400,
        message: `参数验证失败: ${result.error.issues.map(i => i.message).join('; ')}`,
      });
      return;
    }
    if (source === 'query') {
      req.query = result.data as typeof req.query;
    } else if (source === 'params') {
      req.params = result.data as typeof req.params;
    } else {
      req.body = result.data;
    }
    next();
  };
}
