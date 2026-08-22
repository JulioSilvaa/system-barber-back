import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

import RequestBarbershopPasswordResetUseCase from '@/application/useCases/auth/RequestBarbershopPasswordReset';
import ResetBarbershopPasswordUseCase from '@/application/useCases/auth/ResetBarbershopPassword';
import type { SendEmailInput } from '@/domain/services/IEmailSender';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('RequestBarbershopPasswordResetUseCase', () => {
  let findUniqueMock: ReturnType<typeof vi.fn>;
  let deleteManyMock: ReturnType<typeof vi.fn>;
  let createMock: ReturnType<typeof vi.fn>;
  let emails: SendEmailInput[];
  let useCase: RequestBarbershopPasswordResetUseCase;

  function buildPrisma() {
    findUniqueMock = vi.fn().mockResolvedValue({ id: 'barbershop-1', isActive: true });
    deleteManyMock = vi.fn().mockResolvedValue({ count: 0 });
    createMock = vi.fn().mockResolvedValue({});
    return {
      barbershop: { findUnique: findUniqueMock },
      passwordResetToken: { deleteMany: deleteManyMock, create: createMock },
    };
  }

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.systembarber.com';
    emails = [];
    const emailSender = {
      send: vi.fn(async (input: SendEmailInput) => {
        emails.push(input);
      }),
    };
    useCase = new RequestBarbershopPasswordResetUseCase(buildPrisma() as never, emailSender);
  });

  it('deve criar token com hash e enviar e-mail quando a barbearia existe', async () => {
    const output = await useCase.execute({ email: 'DomLuca@Teste.com ' });

    expect(output).toEqual({ sent: true });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'domluca@teste.com' },
      select: { id: true, isActive: true },
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { barbershopId: 'barbershop-1', usedAt: null },
    });

    expect(emails).toHaveLength(1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: sha256(extractToken(emails[0].text)),
        barbershopId: 'barbershop-1',
        expiresAt: expect.any(Date),
      }),
    });
    expect(emails[0].text).toContain('https://app.systembarber.com/reset-password?token=');
  });

  it('deve responder sent=true sem criar token nem e-mail quando o e-mail não existe', async () => {
    findUniqueMock.mockResolvedValue(null);

    const output = await useCase.execute({ email: 'naoexiste@teste.com' });

    expect(output).toEqual({ sent: true });
    expect(createMock).not.toHaveBeenCalled();
    expect(emails).toHaveLength(0);
  });

  it('deve responder sent=true sem criar token para barbearia inativa', async () => {
    findUniqueMock.mockResolvedValue({ id: 'barbershop-2', isActive: false });

    const output = await useCase.execute({ email: 'inativa@teste.com' });

    expect(output).toEqual({ sent: true });
    expect(createMock).not.toHaveBeenCalled();
    expect(emails).toHaveLength(0);
  });

  it('deve rejeitar e-mail inválido', async () => {
    await expect(useCase.execute({ email: 'sem-arroba' })).rejects.toThrow('Email inválido');
    await expect(useCase.execute({ email: '' })).rejects.toThrow('Email é obrigatório');
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

describe('ResetBarbershopPasswordUseCase', () => {
  const VALID_TOKEN = 'a'.repeat(64);

  let findUniqueMock: ReturnType<typeof vi.fn>;
  let hashMock: ReturnType<typeof vi.fn>;
  let transactionMock: ReturnType<typeof vi.fn>;
  let barbershopUpdateMock: ReturnType<typeof vi.fn>;
  let tokenUpdateMock: ReturnType<typeof vi.fn>;
  let tokenDeleteManyMock: ReturnType<typeof vi.fn>;

  function buildUseCase() {
    findUniqueMock = vi.fn().mockResolvedValue({
      id: 'token-1',
      barbershopId: 'barbershop-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    hashMock = vi.fn().mockResolvedValue('$bcrypt-hash');
    transactionMock = vi.fn(async (ops: unknown[]) => ops);
    barbershopUpdateMock = vi.fn().mockReturnValue({});
    tokenUpdateMock = vi.fn().mockReturnValue({});
    tokenDeleteManyMock = vi.fn().mockReturnValue({});

    const prisma = {
      passwordResetToken: {
        findUnique: findUniqueMock,
        update: tokenUpdateMock,
        deleteMany: tokenDeleteManyMock,
      },
      barbershop: { update: barbershopUpdateMock },
      $transaction: transactionMock,
    };
    return new ResetBarbershopPasswordUseCase(prisma as never, { hash: hashMock } as never);
  }

  it('deve redefinir a senha, consumir o token e limpar tokens pendentes', async () => {
    const useCase = buildUseCase();

    const output = await useCase.execute({ token: VALID_TOKEN, password: 'NovaSenha123' });

    expect(output).toEqual({ success: true });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { tokenHash: sha256(VALID_TOKEN) },
      select: { id: true, barbershopId: true, expiresAt: true, usedAt: true },
    });
    expect(hashMock).toHaveBeenCalledWith('NovaSenha123');
    expect(barbershopUpdateMock).toHaveBeenCalledWith({
      where: { id: 'barbershop-1' },
      data: { password: '$bcrypt-hash' },
    });
    expect(tokenUpdateMock).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { barbershopId: 'barbershop-1', id: { not: 'token-1' }, usedAt: null },
    });
    expect(transactionMock).toHaveBeenCalled();
  });

  it('deve rejeitar token inexistente, usado ou expirado', async () => {
    const expired = buildUseCase();
    findUniqueMock.mockResolvedValueOnce({
      id: 'token-2',
      barbershopId: 'barbershop-1',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    await expect(expired.execute({ token: VALID_TOKEN, password: 'NovaSenha123' })).rejects.toThrow(
      'Token inválido ou expirado',
    );

    const used = buildUseCase();
    findUniqueMock.mockResolvedValueOnce({
      id: 'token-3',
      barbershopId: 'barbershop-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });
    await expect(used.execute({ token: VALID_TOKEN, password: 'NovaSenha123' })).rejects.toThrow(
      'Token inválido ou expirado',
    );

    const missing = buildUseCase();
    findUniqueMock.mockResolvedValueOnce(null);
    await expect(missing.execute({ token: VALID_TOKEN, password: 'NovaSenha123' })).rejects.toThrow(
      'Token inválido ou expirado',
    );
  });

  it('deve aplicar a mesma política de senha do cadastro', async () => {
    const useCase = buildUseCase();

    await expect(useCase.execute({ token: VALID_TOKEN, password: '' })).rejects.toThrow(
      'Nova senha é obrigatória',
    );
    await expect(useCase.execute({ token: VALID_TOKEN, password: 'curta1' })).rejects.toThrow(
      'A senha deve ter pelo menos 8 caracteres, com pelo menos uma letra e um número',
    );
    await expect(
      useCase.execute({ token: VALID_TOKEN, password: 'semnumerosaqui' }),
    ).rejects.toThrow(
      'A senha deve ter pelo menos 8 caracteres, com pelo menos uma letra e um número',
    );
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('deve exigir token', async () => {
    const useCase = buildUseCase();

    await expect(useCase.execute({ password: 'NovaSenha123' })).rejects.toThrow(
      'Token é obrigatório',
    );
  });
});

function extractToken(text: string): string {
  const match = /token=([a-f0-9]+)/.exec(text);
  if (!match) throw new Error('link sem token');
  return match[1];
}
