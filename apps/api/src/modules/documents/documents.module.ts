import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { QueueModule } from '@chatbot-rag/queue';
import { EventsModule } from '@chatbot-rag/events';
import { AuthModule } from '../auth/auth.module';
import { DocumentsController } from './documents.controller';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    QueueModule,
    EventsModule,
    AuthModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [DocumentsController],
  exports: [],
})
export class DocumentsModule {}