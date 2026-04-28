import pino, { type Logger } from 'pino';
import { loadConfig } from '../config.js';

let rootLogger: Logger | undefined;

export function createLogger(name: string): Logger {
  if (!rootLogger) {
    const cfg = loadConfig();
    const isProd = process.env.NODE_ENV === 'production';
    rootLogger = pino({
      level: cfg.LOG_LEVEL,
      base: { service: 'jobstash-mcp' },
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
    });
  }
  return rootLogger.child({ name });
}
