import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crawling',
    }),
  ],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}