import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingModule } from '@chatbot-rag/embeddings';
import { VectorStoreModule } from '@chatbot-rag/vector-store';
import { ChatService } from './chat.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    EmbeddingModule,
    VectorStoreModule,
  ],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}