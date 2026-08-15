import { beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { createSocketAuthMiddleware } from '@/infra/websocket/socketServer';

const SECRET = 'socket-test-secret';

function makeSocket(cookie: string): Socket {
  return {
    handshake: { headers: { cookie } },
    data: {},
  } as unknown as Socket;
}

function makeNext() {
  const errors: Array<Error | undefined> = [];
  const next = (err?: Error) => {
    errors.push(err);
  };
  return { errors, next };
}

describe('Socket auth middleware', () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = SECRET;
  });

  it('rejeita conexão sem cookie de acesso', () => {
    const { errors, next } = makeNext();
    createSocketAuthMiddleware()(makeSocket(''), next);
    expect(errors[0]?.message).toBe('Token não fornecido');
  });

  it('rejeita token inválido ou expirado', () => {
    const { errors, next } = makeNext();
    createSocketAuthMiddleware()(makeSocket('sb_access_token=abc.def.ghi'), next);
    expect(errors[0]?.message).toBe('Token inválido ou expirado');
  });

  it('rejeita token de actor USER', () => {
    const token = jwt.sign({ sub: 'user-1', actor: 'USER' }, SECRET);
    const { errors, next } = makeNext();
    createSocketAuthMiddleware()(makeSocket(`sb_access_token=${token}`), next);
    expect(errors[0]?.message).toBe('Acesso negado');
  });

  it('rejeita token sem actor BARBERSHOP', () => {
    const token = jwt.sign({ sub: 'shop-1', actor: 'ADMIN' }, SECRET);
    const { errors, next } = makeNext();
    createSocketAuthMiddleware()(makeSocket(`sb_access_token=${token}`), next);
    expect(errors[0]?.message).toBe('Acesso negado');
  });

  it('aceita token de BARBERSHOP e deriva a sala do token', () => {
    const token = jwt.sign({ sub: 'shop-1', actor: 'BARBERSHOP' }, SECRET);
    const socket = makeSocket(`sb_access_token=${token}`);
    const { errors, next } = makeNext();
    createSocketAuthMiddleware()(socket, next);
    expect(errors[0]).toBeUndefined();
    expect(socket.data.barbershopId).toBe('shop-1');
  });

  it('não extrai barbershopId de handshake.auth', () => {
    const token = jwt.sign({ sub: 'shop-1', actor: 'BARBERSHOP' }, SECRET);
    const socket = {
      handshake: {
        headers: { cookie: `sb_access_token=${token}` },
        auth: { barbershopId: 'shop-999' },
      },
      data: {},
    } as unknown as Socket;
    const { errors, next } = makeNext();
    createSocketAuthMiddleware()(socket, next);
    expect(errors[0]).toBeUndefined();
    expect(socket.data.barbershopId).toBe('shop-1');
  });
});
