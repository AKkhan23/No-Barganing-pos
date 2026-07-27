import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './api';

const SOCKET_URL = BACKEND_URL || 'http://localhost:8001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    socket.on('connect', () => console.log('[socket] connected', socket?.id));
    socket.on('disconnect', (reason) => console.log('[socket] disconnected', reason));
    socket.on('connect_error', (err) => console.log('[socket] connect_error', err.message));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
