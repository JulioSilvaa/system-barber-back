import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', socket => {
    const { barbershopId } = socket.handshake.auth ?? {};
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
