export type AppErrorCode =
  | 'CASH_REGISTER_REQUIRED'
  | 'CASH_REGISTER_ALREADY_OPEN'
  | 'CASH_REGISTER_ALREADY_CLOSED'
  | 'EVALUATION_ALREADY_EXISTS';

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
