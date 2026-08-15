import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '@/infra/http/helpers/authCookie';
import { isOriginAllowed } from '@/infra/http/helpers/cors';

let io: SocketIOServer | null = null;

interface IPayload {
  sub: string;
  actor?: 'USER' | 'BARBERSHOP' | 'ADMIN';
}

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  }
  return cookies;
}

export function createSocketAuthMiddleware(secret = process.env.JWT_ACCESS_SECRET) {
  return (socket: Socket, next: (err?: Error) => void) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie ?? '');
      const token = cookies[ACCESS_COOKIE];

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      if (!secret) {
        return next(new Error('Erro de configuração do servidor'));
      }

      const decoded = jwt.verify(token, secret) as IPayload;
      if (decoded.actor !== 'BARBERSHOP' || !decoded.sub) {
        return next(new Error('Acesso negado'));
      }

      socket.data.barbershopId = decoded.sub;
      return next();
    } catch {
      return next(new Error('Token inválido ou expirado'));
    }
  };
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin(origin, callback) {
        return callback(null, isOriginAllowed(origin ?? undefined));
      },
      credentials: true,
    },
  });

  io.use(createSocketAuthMiddleware());

  io.on('connection', socket => {
    const barbershopId = socket.data.barbershopId as string | undefined;
    if (barbershopId) {
      socket.join(`barbershop:${barbershopId}`);
    }
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function emitToBarbershop(barbershopId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`barbershop:${barbershopId}`).emit(event, payload);
}

export function emitDataChanged(barbershopId: string): void {
  emitToBarbershop(barbershopId, 'data:changed', null);
}
