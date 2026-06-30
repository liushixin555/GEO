import { Request, Response } from 'express';
import { z } from 'zod';
import { createEvidenceCardService } from '../service';
import { listEvidenceCardSchema } from '../schema/evidence-card.schema';
import { AppError, UnauthorizedError } from '../errors';
import { created, fail, paginate, success } from '../utils';
import { logger } from '../utils/logger.util';

function parseId(value: string | string[] | undefined): number | null {
  if (value === undefined || Array.isArray(value)) return null;
  const id = parseInt(value, 10);
  if (Number.isNaN(id) || id <= 0) return null;
  return id;
}

function getUser(req: Request): { userId: number; role: string } {
  const user = req.user;
  if (!user) throw new UnauthorizedError();
  return user;
}

function handleControllerError(err: unknown, res: Response, fallbackMsg: string): void {
  if (err instanceof z.ZodError) {
    fail(res, 400, err.issues.map((e: z.ZodIssue) => e.message).join('; '));
  } else if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('[EvidenceCardController] unexpected error', { error: err instanceof Error ? err.message : String(err) });
    fail(res, 500, fallbackMsg);
  }
}

export async function listEvidenceCards(req: Request, res: Response): Promise<void> {
  try {
    getUser(req);
    const params = listEvidenceCardSchema.parse(req.query);
    const evidenceCardService = createEvidenceCardService();
    const { list, total } = await evidenceCardService.list(params);
    paginate(res, list, total, params.page, params.pageSize);
  } catch (err: unknown) {
    handleControllerError(err, res, 'Failed to list EvidenceCards');
  }
}

export async function getEvidenceCard(req: Request, res: Response): Promise<void> {
  try {
    getUser(req);
    const id = parseId(req.params.id);
    if (id === null) { fail(res, 400, 'Invalid EvidenceCard id'); return; }

    const evidenceCardService = createEvidenceCardService();
    const item = await evidenceCardService.getById(id);
    success(res, item);
  } catch (err: unknown) {
    handleControllerError(err, res, 'Failed to get EvidenceCard');
  }
}

export async function createEvidenceCard(req: Request, res: Response): Promise<void> {
  try {
    getUser(req);
    const evidenceCardService = createEvidenceCardService();
    const item = await evidenceCardService.create(req.body);
    created(res, item, 'EvidenceCard created');
  } catch (err: unknown) {
    handleControllerError(err, res, 'Failed to create EvidenceCard');
  }
}

export async function updateEvidenceCard(req: Request, res: Response): Promise<void> {
  try {
    getUser(req);
    const id = parseId(req.params.id);
    if (id === null) { fail(res, 400, 'Invalid EvidenceCard id'); return; }

    const evidenceCardService = createEvidenceCardService();
    const item = await evidenceCardService.update(id, req.body);
    success(res, item, 'EvidenceCard updated');
  } catch (err: unknown) {
    handleControllerError(err, res, 'Failed to update EvidenceCard');
  }
}

export async function deleteEvidenceCards(req: Request, res: Response): Promise<void> {
  try {
    getUser(req);
    const evidenceCardService = createEvidenceCardService();
    const deleted = await evidenceCardService.deleteMany(req.body.ids);
    success(res, { deleted }, 'EvidenceCards deleted');
  } catch (err: unknown) {
    handleControllerError(err, res, 'Failed to delete EvidenceCards');
  }
}
