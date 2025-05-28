import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validate } from './config/validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SourcesModule } from './modules/sources/sources.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ChatModule } from './modules/chat/chat.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { QueueModule as ApiQueueModule } from './modules/queue/queue.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Import shared packages
import { QueueModule } from '@chatbot-rag/queue';
import { EventsModule } from '@chatbot-rag/events';
import { EmbeddingModule } from '@chatbot-rag/embeddings';
import { VectorStoreModule } from '@chatbot-rag/vector-store';
import { ParserModule } from '@chatbot-rag/parser';
import { ChunkerModule } from '@chatbot-rag/chunker';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('throttle.ttl'),
          limit: config.get('throttle.limit'),
        },
      ],
    }),
    // Shared packages
    QueueModule,
    EventsModule,
    EmbeddingModule,
    VectorStoreModule,
    ParserModule,
    ChunkerModule,
    // Core modules
    LoggerModule,
    TenantModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    SourcesModule,
    DocumentsModule,
    ChatModule,
    WebsocketModule,
    ApiQueueModule,
    WebhooksModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, TenantMiddleware)
      .forRoutes('*');
  }
}