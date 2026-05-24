export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) {
    super(`${entity}不存在`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}
