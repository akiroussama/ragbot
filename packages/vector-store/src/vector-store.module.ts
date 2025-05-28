import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}