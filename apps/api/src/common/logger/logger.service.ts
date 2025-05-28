import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    this.logger = this.createLogger();
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context;
    
    this.logger.error(this.formatMessage(message), {
      context: ctx,
      trace,
    });

    // Send to Sentry
    if (this.configService.get<string>('sentry.dsn')) {
      Sentry.captureException(new Error(message), {
        extra: {
          context: ctx,
          trace,
        },
      });
    }
  }

  warn(message: any, context?: string) {
    this.logger.warn(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  debug(message: any, context?: string) {
    this.logger.debug(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  private createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context,
          message,
          ...meta,
        });
      }),
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (this.configService.get<string>('nodeEnv') !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }

    // File transports
    if (this.configService.get<string>('nodeEnv') === 'production') {
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
        }),
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: logFormat,
        }),
      );
    }

    return winston.createLogger({
      level: this.configService.get<string>('LOG_LEVEL', 'info'),
      format: logFormat,
      transports,
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
      ],
    });
  }

  private formatMessage(message: any): string {
    return typeof message === 'object' ? JSON.stringify(message) : message;
  }

  // Custom logging methods
  logRequest(method: string, url: string, statusCode: number, duration: number) {
    this.logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      type: 'http_request',
    });
  }

  logDatabaseQuery(query: string, duration: number, params?: any[]) {
    this.logger.debug('Database Query', {
      query,
      duration,
      params,
      type: 'database_query',
    });
  }

  logExternalApiCall(service: string, endpoint: string, duration: number, statusCode?: number) {
    this.logger.info('External API Call', {
      service,
      endpoint,
      duration,
      statusCode,
      type: 'external_api_call',
    });
  }

  logBusinessEvent(event: string, userId?: string, metadata?: any) {
    this.logger.info('Business Event', {
      event,
      userId,
      metadata,
      type: 'business_event',
    });
  }

  logSecurityEvent(event: string, userId?: string, ip?: string, metadata?: any) {
    this.logger.warn('Security Event', {
      event,
      userId,
      ip,
      metadata,
      type: 'security_event',
    });
  }
}