import { createHash, randomBytes } from 'node:crypto';

import type { IEmailSender } from '@/domain/services/IEmailSender';
import { ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export type RequestBarbershopPasswordResetInput = {
  email?: unknown;
};

export type RequestBarbershopPasswordResetOutput = {
  sent: boolean;
};

const TOKEN_TTL_MS = 30 * 60 * 1000;

export default class RequestBarbershopPasswordResetUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(
    input: RequestBarbershopPasswordResetInput,
  ): Promise<RequestBarbershopPasswordResetOutput> {
    const email = String(input.email ?? '')
      .trim()
      .toLowerCase();

    if (!email) throw new ValidationError('Email é obrigatório');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Email inválido');
    }

    const barbershop = await this.prisma.barbershop.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (!barbershop || !barbershop.isActive) {
      return { sent: true };
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: { barbershopId: barbershop.id, usedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        barbershopId: barbershop.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const baseUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

    await this.emailSender.send({
      to: email,
      subject: 'Redefinição de senha — System Barber',
      text:
        `Recebemos uma solicitação para redefinir a senha da sua barbearia.\n\n` +
        `Use o link abaixo (válido por 30 minutos):\n` +
        `${baseUrl}/reset-password?token=${token}\n\n` +
        `Se não foi você, ignore este e-mail.`,
    });

    return { sent: true };
  }
}
