import winston from 'winston';
import path from 'path';
import { LogEntry, LogLevel } from '../../domain/models';

export interface LoggerOptions {
  level?: LogLevel;
  logDir?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  maxFiles?: number;
  maxSize?: string;
}

export class Logger {
  private logger: winston.Logger;
  private readonly component: string;

  constructor(component: string, options: LoggerOptions = {}) {
    this.component = component;
    this.logger = this.createLogger(options);
  }

  private createLogger(options: LoggerOptions): winston.Logger {
    const {
      level = 'info',
      logDir = './logs',
      enableConsole = true,
      enableFile = true,
      maxFiles = 14,
      maxSize = '20m'
    } = options;

    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    const transports: winston.transport[] = [];

    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, component, operation, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              const operationStr = operation ? ` [${operation}]` : '';
              return `${timestamp} ${level}: [${component}]${operationStr} ${message}${metaStr}`;
            })
          )
        })
      );
    }

    if (enableFile) {
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(...formats),
          maxFiles,
          maxsize: this.parseSize(maxSize)
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: winston.format.combine(...formats),
          maxFiles,
          maxsize: this.parseSize(maxSize)
        })
      );
    }

    return winston.createLogger({
      level,
      format: winston.format.combine(...formats),
      defaultMeta: { component: this.component },
      transports,
      exitOnError: false
    });
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 20 * 1024 * 1024; // Default 20MB

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'k': return value * 1024;
      case 'm': return value * 1024 * 1024;
      case 'g': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  public error(message: string, error?: Error | Record<string, unknown>): void {
    const meta = error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error;
    this.log('error', message, meta);
  }

  public logOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    return this.withPerformanceTracking(operation, fn, meta);
  }

  private async withPerformanceTracking<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();

    this.debug(`Starting operation: ${operation}`, { operation, ...meta });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.info(`Operation completed: ${operation}`, {
        operation,
        duration,
        success: true,
        ...meta
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.error(`Operation failed: ${operation}`, {
        operation,
        duration,
        success: false,
        error: errorMessage,
        ...meta
      });

      throw error;
    }
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const logEntry: Partial<LogEntry> = {
      level,
      message,
      component: this.component,
      metadata: meta
    };

    this.logger.log(level, message, logEntry);
  }

  public createChildLogger(childComponent: string): Logger {
    const fullComponent = `${this.component}:${childComponent}`;
    return new Logger(fullComponent, {
      level: this.logger.level as LogLevel,
      enableConsole: this.hasConsoleTransport(),
      enableFile: this.hasFileTransport()
    });
  }

  private hasConsoleTransport(): boolean {
    return this.logger.transports.some(t => t instanceof winston.transports.Console);
  }

  private hasFileTransport(): boolean {
    return this.logger.transports.some(t => t instanceof winston.transports.File);
  }

  public setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  public getLevel(): string {
    return this.logger.level;
  }

  public close(): void {
    this.logger.close();
  }
}

export const createLogger = (component: string, options?: LoggerOptions): Logger => {
  return new Logger(component, options);
};