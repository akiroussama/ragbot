import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.logRequest(method, url, statusCode, duration);

          // Log slow requests
          if (duration > 1000) {
            this.logger.warn(`Slow request detected: ${method} ${url} took ${duration}ms`, {
              method,
              url,
              duration,
              ip,
              userAgent,
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(`Request failed: ${method} ${url}`, error.stack, {
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent,
            error: error.message,
          });
        },
      }),
    );
  }
}