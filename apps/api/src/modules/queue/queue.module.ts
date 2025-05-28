import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CrawlingProcessor } from './processors/crawling.processor';
import { DocumentProcessor } from './processors/document.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [
    LoggerModule,
    BullModule.registerQueue(
      { name: 'crawling' },
      { name: 'document-processing' },
      { name: 'embedding-generation' },
    ),
  ],
  providers: [CrawlingProcessor, DocumentProcessor, EmbeddingProcessor],
  exports: [],
})
export class QueueModule {}