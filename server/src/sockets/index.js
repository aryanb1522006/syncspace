import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { canAccessTeam } from '../models/teamModel.js';
import { logger } from '../config/logger.js';

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
      credentials: false
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');
      const payload = jwt.verify(token, env.jwtSecret);
      const id = Number(payload.sub);
      const collegeId = Number(payload.collegeId);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(collegeId) || collegeId <= 0) {
        throw new Error('Invalid identity claims');
      }
      socket.data.user = { id, collegeId, role: payload.role };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('workspace:join', async (teamId) => {
      const id = Number(teamId);
      if (!Number.isSafeInteger(id) || id <= 0) return;
      const { user } = socket.data;
      try {
        const allowed = await canAccessTeam(id, user.id, user.collegeId);
        if (allowed) socket.join(`team:${id}`);
      } catch (error) {
        logger.warn({ err: error }, 'Failed to join workspace room');
      }
    });

    socket.on('workspace:leave', (teamId) => {
      const id = Number(teamId);
      if (Number.isSafeInteger(id) && id > 0) socket.leave(`team:${id}`);
    });
  });

  return io;
}

// Never throws — safe to call even if a route/test imports the controller
// before the socket server has been initialized (e.g. supertest against app.js).
export function getIO() {
  return io ?? { to: () => ({ emit: () => {} }) };
}