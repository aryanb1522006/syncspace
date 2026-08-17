import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? '';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io(socketUrl, {
    autoConnect: false,
    auth: (callback) => callback({ token: localStorage.getItem('syncspace-token') })
  });
  return socket;
}