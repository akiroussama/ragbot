import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger/winston.logger';
import { LoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initializeSentry } from './common/logger/sentry.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLogger(),
  });

  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');

  // Initialize Sentry
  initializeSentry(configService);

  // Sentry request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string[]>('CORS_ORIGINS', ['http://localhost:3001', 'http://localhost:3002']),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(loggerService),
  );

  // Sentry error handler must be after all other middleware
  app.use(Sentry.Handlers.errorHandler());

  const config = new DocumentBuilder()
    .setTitle('Chatbot RAG API')
    .setDescription('API documentation for the Chatbot RAG platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'ApiKey')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Organizations', 'Organization management')
    .addTag('Projects', 'Project management')
    .addTag('Sources', 'Data source management')
    .addTag('Chat', 'Chat interaction endpoints')
    .addTag('Admin', 'Admin-only endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}${apiPrefix}`);
  console.log(`📚 API Documentation: http://localhost:${port}${apiPrefix}/docs`);
}

bootstrap();