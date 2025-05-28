import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import {
  DocumentProcessingProcessor,
  EmbeddingProcessor,
  VectorSyncProcessor,
  WebhookProcessor,
} from './processors';
import { QUEUE_NAMES } from './types';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        },
        defaultJobOptions: {
          removeOnComplete: configService.get('QUEUE_REMOVE_ON_COMPLETE', 10),
          removeOnFail: configService.get('QUEUE_REMOVE_ON_FAIL', 50),
          attempts: configService.get('QUEUE_DEFAULT_ATTEMPTS', 3),
          backoff: {
            type: 'exponential',
            delay: configService.get('QUEUE_BACKOFF_DELAY', 2000),
          },
        },
        settings: {
          stalledInterval: 30000,
          maxStalledCount: 1,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.DOCUMENT_PROCESSING },
      { name: QUEUE_NAMES.EMBEDDING_GENERATION },
      { name: QUEUE_NAMES.VECTOR_SYNC },
      { name: QUEUE_NAMES.WEBHOOKS },
      { name: QUEUE_NAMES.CLEANUP },
      { name: QUEUE_NAMES.EXPORT },
    ),
  ],
  providers: [
    QueueService,
    DocumentProcessingProcessor,
    EmbeddingProcessor,
    VectorSyncProcessor,
    WebhookProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}