import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors';
import { fail } from './response.util';

export function handleControllerError(res: Response, err: unknown, defaultMsg: string): void {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else if (err instanceof z.ZodError) {
    fail(res, 400, err.issues.map((e: { message: string }) => e.message).join('; '));
  } else {
    console.error(`[ControllerError] ${defaultMsg}:`, err);
    fail(res, 500, defaultMsg);
  }
}
