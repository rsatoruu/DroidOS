/**
 * Structured logger for DroidOS server
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const configuredLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';
const configuredLevelNum = LEVELS[configuredLevel] ?? 30;

function formatLog(level: LogLevel, obj: object | string, msg?: string): string {
  const entry = {
    time: new Date().toISOString(),
    level,
    ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg: msg ?? '' }),
  };
  return JSON.stringify(entry);
}

function createLogger() {
  const logDir = process.env.LOG_DIR ?? './logs';

  let fileStream: ReturnType<typeof createWriteStream> | null = null;

  function getStream() {
    if (!fileStream) {
      try {
        mkdirSync(logDir, { recursive: true });
        fileStream = createWriteStream(join(logDir, 'droidos.log'), { flags: 'a' });
      } catch {
        // Can't open log file – just use stdout
      }
    }
    return fileStream;
  }

  function write(level: LogLevel, obj: object | string, msg?: string) {
    if (LEVELS[level] < configuredLevelNum) return;
    const line = formatLog(level, obj, msg);
    process.stdout.write(line + '\n');
    try {
      getStream()?.write(line + '\n');
    } catch {
      // ignore write errors
    }
  }

  return {
    trace: (obj: object | string, msg?: string) => write('trace', obj, msg),
    debug: (obj: object | string, msg?: string) => write('debug', obj, msg),
    info: (obj: object | string, msg?: string) => write('info', obj, msg),
    warn: (obj: object | string, msg?: string) => write('warn', obj, msg),
    error: (obj: object | string, msg?: string) => write('error', obj, msg),
  };
}

export const logger = createLogger();
