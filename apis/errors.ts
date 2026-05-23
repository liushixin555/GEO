export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) {
    super(`${entity}不存在`);
    this.name = 'NotFoundError';
  }
}

export class BusinessError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
