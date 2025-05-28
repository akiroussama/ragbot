import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { prisma, JobStatus } from '@chatbot-rag/database';
import { ParserFactory } from '@chatbot-rag/parser';
import { LoggerService } from '../../common/logger/logger.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('document-processing')
@Injectable()
export class DocumentProcessor {
  constructor(
    private logger: LoggerService,
    @InjectQueue('embedding-generation') private embeddingQueue: Queue,
  ) {
    this.logger.setContext('DocumentProcessor');
  }

  @Process('process-document')
  async handleDocumentProcessing(job: Job<{
    documentId: string;
    sourceId: string;
    projectId: string;
    fileBuffer: string; // Base64 encoded
    filename: string;
    mimeType?: string;
  }>) {
    const { documentId, sourceId, projectId, fileBuffer, filename, mimeType } = job.data;

    this.logger.log(`Starting document processing for ${filename}`);

    // Create job record
    const processJob = await prisma.job.create({
      data: {
        projectId,
        type: 'document_process',
        status: JobStatus.processing,
        config: {
          documentId,
          filename,
          mimeType,
        },
      },
    });

    try {
      // Update job start time
      await prisma.job.update({
        where: { id: processJob.id },
        data: {
          startedAt: new Date(),
        },
      });

      // Convert base64 back to buffer
      const buffer = Buffer.from(fileBuffer, 'base64');

      // Parse the document
      const parseResult = await ParserFactory.parse(buffer, filename, {
        extractMetadata: true,
        ocrEnabled: true,
        language: 'eng',
      });

      if (parseResult.error) {
        throw new Error(parseResult.error);
      }

      // Update document with parsed content
      await prisma.document.update({
        where: { id: documentId },
        data: {
          content: parseResult.content,
          metadata: {
            ...parseResult.metadata,
            originalFilename: filename,
            parsedAt: new Date(),
          },
          tokenCount: this.estimateTokenCount(parseResult.content),
        },
      });

      // Queue for embedding generation
      await this.embeddingQueue.add('generate-embeddings', {
        documentId,
        projectId,
        content: parseResult.content,
      });

      // Mark job as completed
      await prisma.job.update({
        where: { id: processJob.id },
        data: {
          status: JobStatus.completed,
          completedAt: new Date(),
          result: {
            contentLength: parseResult.content.length,
            wordCount: parseResult.metadata.wordCount,
            metadata: parseResult.metadata,
          },
        },
      });

      this.logger.log(`Completed document processing for ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to process document ${filename}`, error);

      // Mark job as failed
      await prisma.job.update({
        where: { id: processJob.id },
        data: {
          status: JobStatus.failed,
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: {
            processingError: error instanceof Error ? error.message : String(error),
            failedAt: new Date(),
          },
        },
      });

      throw error;
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}