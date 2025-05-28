import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { WinstonLogger } from './winston.logger';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LoggerService,
    {
      provide: 'LOGGER',
      useClass: WinstonLogger,
    },
    LoggingInterceptor,
  ],
  exports: [LoggerService, 'LOGGER', LoggingInterceptor],
})
export class LoggerModule {}