import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import {
  DocumentProcessingJobData,
  DocumentProcessingJobResult,
  QUEUE_NAMES,
} from '../types';

@Injectable()
@Processor(QUEUE_NAMES.DOCUMENT_PROCESSING)
export class DocumentProcessingProcessor extends BaseProcessor<
  DocumentProcessingJobData,
  DocumentProcessingJobResult
> {
  constructor() {
    super('DocumentProcessingProcessor');
  }

  @Process('process-document')
  async process(job: Job<DocumentProcessingJobData>): Promise<DocumentProcessingJobResult> {
    return this.executeWithErrorHandling(
      job,
      async () => {
        this.validateJobData(job, ['documentId', 'tenantId', 'filePath', 'fileName', 'mimeType']);
        
        const { documentId, tenantId, filePath, fileName, mimeType, metadata = {} } = job.data;
        
        await this.updateProgress(job, {
          current: 0,
          total: 100,
          message: 'Starting document processing',
        });

        // Step 1: Parse document content
        await this.updateProgress(job, {
          current: 10,
          total: 100,
          message: 'Parsing document content',
        });
        
        const content = await this.parseDocument(filePath, mimeType);
        
        // Step 2: Chunk the content
        await this.updateProgress(job, {
          current: 40,
          total: 100,
          message: 'Chunking document content',
        });
        
        const chunks = await this.chunkContent(content, {
          documentId,
          fileName,
          mimeType,
          ...metadata,
        });
        
        // Step 3: Save chunks to database
        await this.updateProgress(job, {
          current: 70,
          total: 100,
          message: 'Saving chunks to database',
        });
        
        await this.saveChunks(chunks, tenantId, documentId);
        
        // Step 4: Trigger embedding generation
        await this.updateProgress(job, {
          current: 90,
          total: 100,
          message: 'Scheduling embedding generation',
        });
        
        await this.scheduleEmbeddingGeneration(chunks.map(c => c.id), tenantId, documentId);
        
        await this.updateProgress(job, {
          current: 100,
          total: 100,
          message: 'Document processing completed',
        });

        return this.createSuccessResult(
          {
            chunks: chunks.map(chunk => ({
              id: chunk.id,
              content: chunk.content,
              metadata: chunk.metadata,
            })),
            totalChunks: chunks.length,
          },
          {
            documentId,
            tenantId,
            processingTime: Date.now() - job.timestamp,
          },
        );
      },
      'Document processing',
    );
  }

  private async parseDocument(filePath: string, mimeType: string): Promise<string> {
    return this.withRetry(async () => {
      // Import parser service dynamically to avoid circular dependencies
      const { ParserService } = await import('@chatbot-rag/parser');
      const parserService = new ParserService();
      
      const result = await parserService.parseFile(filePath);
      return result.content;
    });
  }

  private async chunkContent(
    content: string,
    metadata: Record<string, any>,
  ): Promise<Array<{ id: string; content: string; metadata: Record<string, any> }>> {
    return this.withRetry(async () => {
      // Import chunker service dynamically
      const { ChunkerService } = await import('@chatbot-rag/chunker');
      const chunkerService = new ChunkerService();
      
      const chunks = await chunkerService.chunkText(content, {
        autoDetectStrategy: true,
        metadata,
      });
      
      return chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          ...metadata,
        },
      }));
    });
  }

  private async saveChunks(
    chunks: Array<{ id: string; content: string; metadata: Record<string, any> }>,
    tenantId: string,
    documentId: string,
  ): Promise<void> {
    return this.withRetry(async () => {
      // This would typically use a database service
      // For now, we'll simulate the operation
      this.logger.debug(
        `Saving ${chunks.length} chunks for document ${documentId} in tenant ${tenantId}`,
      );
      
      // In a real implementation, you would:
      // 1. Insert chunks into the database
      // 2. Update document status
      // 3. Store chunk metadata
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  }

  private async scheduleEmbeddingGeneration(
    chunkIds: string[],
    tenantId: string,
    documentId: string,
  ): Promise<void> {
    return this.withRetry(async () => {
      // Import queue service dynamically
      const { QueueService } = await import('../queue.service');
      
      // This would typically inject the queue service
      // For now, we'll simulate scheduling the job
      this.logger.debug(
        `Scheduling embedding generation for ${chunkIds.length} chunks`,
      );
      
      // In a real implementation, you would:
      // await this.queueService.addEmbeddingJob({
      //   chunkIds,
      //   tenantId,
      //   documentId,
      // });
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  }
}