import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '@chatbot-rag/queue';
import { EventService } from './event.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    QueueModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [EventService],
  exports: [EventService, EventEmitterModule],
})
export class EventsModule {}