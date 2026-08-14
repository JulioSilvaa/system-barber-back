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
