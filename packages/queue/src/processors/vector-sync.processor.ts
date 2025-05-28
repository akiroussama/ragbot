import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import {
  VectorSyncJobData,
  VectorSyncJobResult,
  QUEUE_NAMES,
} from '../types';

@Injectable()
@Processor(QUEUE_NAMES.VECTOR_SYNC)
export class VectorSyncProcessor extends BaseProcessor<
  VectorSyncJobData,
  VectorSyncJobResult
> {
  constructor() {
    super('VectorSyncProcessor');
  }

  @Process('sync-vectors')
  async process(job: Job<VectorSyncJobData>): Promise<VectorSyncJobResult> {
    return this.executeWithErrorHandling(
      job,
      async () => {
        this.validateJobData(job, ['chunkIds', 'tenantId', 'collectionName', 'operation']);
        
        const {
          chunkIds,
          tenantId,
          collectionName,
          operation,
          batchSize = 50,
        } = job.data;
        
        await this.updateProgress(job, {
          current: 0,
          total: chunkIds.length,
          message: `Starting vector ${operation} operation`,
        });

        let processedItems = 0;
        let skippedItems = 0;

        if (operation === 'upsert') {
          const result = await this.upsertVectors(job, chunkIds, tenantId, collectionName, batchSize);
          processedItems = result.processed;
          skippedItems = result.skipped;
        } else if (operation === 'delete') {
          processedItems = await this.deleteVectors(job, chunkIds, collectionName, batchSize);
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
        
        await this.updateProgress(job, {
          current: chunkIds.length,
          total: chunkIds.length,
          message: `Vector ${operation} operation completed`,
        });

        return this.createSuccessResult(
          {
            processedItems,
            skippedItems,
          },
          {
            tenantId,
            collectionName,
            operation,
            totalItems: chunkIds.length,
            processingTime: Date.now() - job.timestamp,
          },
        );
      },
      'Vector sync',
    );
  }

  private async upsertVectors(
    job: Job<VectorSyncJobData>,
    chunkIds: string[],
    tenantId: string,
    collectionName: string,
    batchSize: number,
  ): Promise<{ processed: number; skipped: number }> {
    let processed = 0;
    let skipped = 0;
    
    // Fetch chunk data with embeddings
    const chunks = await this.fetchChunksWithEmbeddings(chunkIds, tenantId);
    
    // Filter out chunks without embeddings
    const chunksWithEmbeddings = chunks.filter(chunk => chunk.embedding);
    skipped = chunks.length - chunksWithEmbeddings.length;
    
    if (skipped > 0) {
      this.logger.warn(
        `Skipping ${skipped} chunks without embeddings in job ${job.id}`,
      );
    }
    
    // Process in batches
    const batches = this.createBatches(chunksWithEmbeddings, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      await this.updateProgress(job, {
        current: processed,
        total: chunkIds.length,
        message: `Upserting batch ${i + 1}/${batches.length}`,
      });
      
      await this.upsertBatch(batch, collectionName, tenantId);
      processed += batch.length;
    }
    
    return { processed, skipped };
  }

  private async deleteVectors(
    job: Job<VectorSyncJobData>,
    chunkIds: string[],
    collectionName: string,
    batchSize: number,
  ): Promise<number> {
    let processed = 0;
    
    // Process in batches
    const batches = this.createBatches(chunkIds, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      await this.updateProgress(job, {
        current: processed,
        total: chunkIds.length,
        message: `Deleting batch ${i + 1}/${batches.length}`,
      });
      
      await this.deleteBatch(batch, collectionName);
      processed += batch.length;
    }
    
    return processed;
  }

  private async fetchChunksWithEmbeddings(
    chunkIds: string[],
    tenantId: string,
  ): Promise<Array<{
    id: string;
    content: string;
    embedding?: number[];
    metadata: Record<string, any>;
  }>> {
    return this.withRetry(async () => {
      this.logger.debug(
        `Fetching ${chunkIds.length} chunks with embeddings for tenant ${tenantId}`,
      );
      
      // In a real implementation, fetch from database with embeddings
      // Simulate database fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return chunkIds.map(id => ({
        id,
        content: `Content for chunk ${id}`,
        embedding: new Array(1536).fill(0).map(() => Math.random()), // Simulate embedding
        metadata: {
          chunkId: id,
          tenantId,
        },
      }));
    });
  }

  private async upsertBatch(
    chunks: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: Record<string, any>;
    }>,
    collectionName: string,
    tenantId: string,
  ): Promise<void> {
    return this.withRetry(async () => {
      // Import vector store service dynamically
      const { VectorStoreService } = await import('@chatbot-rag/vector-store');
      const vectorStoreService = new VectorStoreService(null as any); // Would be injected
      
      const documents = chunks.map(chunk => ({
        id: chunk.id,
        vector: chunk.embedding,
        content: chunk.content,
        metadata: chunk.metadata,
        tenantId,
      }));
      
      // In a real implementation:
      // await vectorStoreService.upsert(collectionName, documents);
      
      this.logger.debug(
        `Upserted ${chunks.length} vectors to collection ${collectionName}`,
      );
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  }

  private async deleteBatch(
    chunkIds: string[],
    collectionName: string,
  ): Promise<void> {
    return this.withRetry(async () => {
      // Import vector store service dynamically
      const { VectorStoreService } = await import('@chatbot-rag/vector-store');
      const vectorStoreService = new VectorStoreService(null as any); // Would be injected
      
      // In a real implementation:
      // await vectorStoreService.delete(collectionName, chunkIds);
      
      this.logger.debug(
        `Deleted ${chunkIds.length} vectors from collection ${collectionName}`,
      );
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 25));
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}