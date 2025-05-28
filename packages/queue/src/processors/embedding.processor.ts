import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import {
  EmbeddingJobData,
  EmbeddingJobResult,
  QUEUE_NAMES,
} from '../types';

@Injectable()
@Processor(QUEUE_NAMES.EMBEDDING_GENERATION)
export class EmbeddingProcessor extends BaseProcessor<
  EmbeddingJobData,
  EmbeddingJobResult
> {
  constructor() {
    super('EmbeddingProcessor');
  }

  @Process('generate-embeddings')
  async process(job: Job<EmbeddingJobData>): Promise<EmbeddingJobResult> {
    return this.executeWithErrorHandling(
      job,
      async () => {
        this.validateJobData(job, ['chunkIds', 'tenantId']);
        
        const {
          chunkIds,
          tenantId,
          documentId,
          model = 'text-embedding-ada-002',
          provider = 'openai',
          batchSize = 10,
        } = job.data;
        
        await this.updateProgress(job, {
          current: 0,
          total: chunkIds.length,
          message: 'Starting embedding generation',
        });

        // Step 1: Fetch chunk contents
        await this.updateProgress(job, {
          current: 0,
          total: chunkIds.length,
          message: 'Fetching chunk contents',
        });
        
        const chunks = await this.fetchChunks(chunkIds, tenantId);
        
        // Step 2: Generate embeddings in batches
        const embeddings: Array<{ chunkId: string; embedding: number[] }> = [];
        const batches = this.createBatches(chunks, batchSize);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          await this.updateProgress(job, {
            current: i * batchSize,
            total: chunkIds.length,
            message: `Processing batch ${i + 1}/${batches.length}`,
          });
          
          const batchEmbeddings = await this.generateEmbeddingsBatch(
            batch,
            model,
            provider,
          );
          
          embeddings.push(...batchEmbeddings);
          
          // Save embeddings to database
          await this.saveEmbeddings(batchEmbeddings, tenantId);
          
          // Schedule vector store sync
          await this.scheduleVectorSync(
            batchEmbeddings.map(e => e.chunkId),
            tenantId,
          );
        }
        
        await this.updateProgress(job, {
          current: chunkIds.length,
          total: chunkIds.length,
          message: 'Embedding generation completed',
        });

        return this.createSuccessResult(
          {
            processedChunks: embeddings.length,
            embeddings,
          },
          {
            tenantId,
            documentId,
            model,
            provider,
            batchCount: batches.length,
            processingTime: Date.now() - job.timestamp,
          },
        );
      },
      'Embedding generation',
    );
  }

  private async fetchChunks(
    chunkIds: string[],
    tenantId: string,
  ): Promise<Array<{ id: string; content: string }>> {
    return this.withRetry(async () => {
      // In a real implementation, fetch from database
      this.logger.debug(
        `Fetching ${chunkIds.length} chunks for tenant ${tenantId}`,
      );
      
      // Simulate database fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return chunkIds.map(id => ({
        id,
        content: `Sample content for chunk ${id}`, // This would come from DB
      }));
    });
  }

  private async generateEmbeddingsBatch(
    chunks: Array<{ id: string; content: string }>,
    model: string,
    provider: string,
  ): Promise<Array<{ chunkId: string; embedding: number[] }>> {
    return this.withRetry(async () => {
      // Import embedding service dynamically
      const { EmbeddingService } = await import('@chatbot-rag/embeddings');
      const embeddingService = new EmbeddingService();
      
      const texts = chunks.map(chunk => chunk.content);
      
      const response = await embeddingService.embed(texts, {
        model,
        provider,
      });
      
      return chunks.map((chunk, index) => ({
        chunkId: chunk.id,
        embedding: response.embeddings[index],
      }));
    });
  }

  private async saveEmbeddings(
    embeddings: Array<{ chunkId: string; embedding: number[] }>,
    tenantId: string,
  ): Promise<void> {
    return this.withRetry(async () => {
      this.logger.debug(
        `Saving ${embeddings.length} embeddings for tenant ${tenantId}`,
      );
      
      // In a real implementation, save to database
      // This would update the chunks table with embedding data
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  }

  private async scheduleVectorSync(
    chunkIds: string[],
    tenantId: string,
  ): Promise<void> {
    return this.withRetry(async () => {
      this.logger.debug(
        `Scheduling vector sync for ${chunkIds.length} chunks`,
      );
      
      // In a real implementation, schedule vector sync job
      // await this.queueService.addVectorSyncJob({
      //   chunkIds,
      //   tenantId,
      //   collectionName: `tenant_${tenantId}`,
      //   operation: 'upsert',
      // });
      
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