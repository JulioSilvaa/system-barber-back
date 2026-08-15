export type AppErrorCode = 'EVALUATION_ALREADY_EXISTS';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: AppErrorCode,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, undefined, 404);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, undefined, 403);
    this.name = 'ForbiddenError';
  }
}
