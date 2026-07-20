import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';

let io: SocketServer | null = null;

function parseOrigins(val: string): (string | boolean)[] {
  if (val === '*') return [true];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: parseOrigins(env.CORS_ORIGINS),
      credentials: env.CORS_ORIGINS !== '*',
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('product:scanned', (data) => {
      socket.broadcast.emit('product:scanned', data);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
