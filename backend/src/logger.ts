import pino from 'pino';

/**
 * Structured JSON logger. Use `logger.info({ ...context }, 'message')`.
 * Set LOG_LEVEL (trace|debug|info|warn|error) to change verbosity.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.refreshToken',
      '*.token',
    ],
    censor: '[redacted]',
  },
  base: { service: 'autotrack-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
