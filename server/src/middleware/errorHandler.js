import multer from 'multer';
import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Validation failed', details: error.flatten() }
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: { message: error.message } });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: { message: 'A record with those details already exists' } });
  }

  if (error.code === '23503' || error.code === '22P02') {
    return res.status(400).json({ error: { message: 'A referenced record is invalid' } });
  }

  const status = error.status ?? 500;
  const payload = { message: status === 500 ? 'Internal server error' : error.message };
  if (error.details) payload.details = error.details;
  if (status === 500 && process.env.NODE_ENV !== 'test') {
    req.log?.error({ err: error, requestId: req.id }, 'Unhandled request error');
  }
  return res.status(status).json({ error: payload });
}
