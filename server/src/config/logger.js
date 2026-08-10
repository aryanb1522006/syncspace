import { randomUUID } from 'node:crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env.js';

export const logger = pino({
  level: env.nodeEnv === 'test' || process.env.NODE_TEST_CONTEXT ? 'silent' : env.logLevel,
  base: { service: 'syncspace-api', environment: env.nodeEnv },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password', '*.token'],
    censor: '[redacted]'
  }
});

export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', requestId);
    return requestId;
  },
  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  }
});
