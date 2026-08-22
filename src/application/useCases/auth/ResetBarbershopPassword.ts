import { createHash } from 'node:crypto';

import HashRepository from '@/domain/repository/HashRepository';
import { ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export type ResetBarbershopPasswordInput = {
  token?: unknown;
  password?: unknown;
};

export type ResetBarbershopPasswordOutput = {
  success: boolean;
};

export default class ResetBarbershopPasswordUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly hashService: HashRepository,
  ) {}

  async execute(input: ResetBarbershopPasswordInput): Promise<ResetBarbershopPasswordOutput> {
    const token = String(input.token ?? '').trim();
    const password = String(input.password ?? '');

    if (!token) throw new ValidationError('Token é obrigatório');
    if (!password) throw new ValidationError('Nova senha é obrigatória');

    validatePasswordPolicy(password);

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, barbershopId: true, expiresAt: true, usedAt: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new ValidationError('Token inválido ou expirado');
    }

    const passwordHash = await this.hashService.hash(password);

    await this.prisma.$transaction([
      this.prisma.barbershop.update({
        where: { id: record.barbershopId },
        data: { password: passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { barbershopId: record.barbershopId, id: { not: record.id }, usedAt: null },
      }),
    ]);

    return { success: true };
  }
}

function validatePasswordPolicy(password: string): void {
  const isValid = password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);

  if (!isValid) {
    throw new ValidationError(
      'A senha deve ter pelo menos 8 caracteres, com pelo menos uma letra e um número',
    );
  }
}
