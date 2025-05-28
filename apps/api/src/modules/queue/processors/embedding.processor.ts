import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { prisma, JobStatus } from '@chatbot-rag/database';
import { IntelligentChunker, ChunkingStrategy } from '@chatbot-rag/chunker';
import { vectorStore } from '@chatbot-rag/database';
import { LoggerService } from '../../common/logger/logger.service';
import { ConfigService } from '@nestjs/config';

@Processor('embedding-generation')
@Injectable()
export class EmbeddingProcessor {
  private chunker: IntelligentChunker;

  constructor(
    private logger: LoggerService,
    private configService: ConfigService,
  ) {
    this.logger.setContext('EmbeddingProcessor');
    this.chunker = new IntelligentChunker();
  }

  @Process('generate-embeddings')
  async handleEmbeddingGeneration(job: Job<{
    documentId: string;
    projectId: string;
    content: string;
  }>) {
    const { documentId, projectId, content } = job.data;

    this.logger.log(`Starting embedding generation for document ${documentId}`);

    // Create job record
    const embeddingJob = await prisma.job.create({
      data: {
        projectId,
        type: 'embedding_generate',
        status: JobStatus.processing,
        config: {
          documentId,
        },
      },
    });

    try {
      // Update job start time
      await prisma.job.update({
        where: { id: embeddingJob.id },
        data: {
          startedAt: new Date(),
        },
      });

      // Get document and source info
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          source: true,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Chunk the content
      const chunkingResult = await this.chunker.chunk(content, {
        chunkSize: this.configService.get<number>('embedding.chunkSize', 1000),
        chunkOverlap: this.configService.get<number>('embedding.chunkOverlap', 200),
        strategy: this.detectChunkingStrategy(document),
        tokenizer: 'tiktoken',
        model: 'text-embedding-ada-002',
      });

      // Delete existing chunks
      await prisma.documentChunk.deleteMany({
        where: { documentId },
      });

      // Delete from vector store
      await vectorStore.deleteByDocument(documentId);

      // Process chunks in batches
      const batchSize = this.configService.get<number>('embedding.batchSize', 100);
      const chunksToProcess = chunkingResult.chunks;
      
      for (let i = 0; i < chunksToProcess.length; i += batchSize) {
        const batch = chunksToProcess.slice(i, i + batchSize);
        
        // Generate embeddings (placeholder - would use actual embedding service)
        const embeddings = await this.generateEmbeddings(
          batch.map(chunk => chunk.content),
        );

        // Save chunks to database
        const dbChunks = await Promise.all(
          batch.map((chunk, idx) =>
            prisma.documentChunk.create({
              data: {
                documentId,
                chunkIndex: chunk.metadata.index,
                content: chunk.content,
                tokens: chunk.metadata.tokens,
                metadata: chunk.metadata as any,
              },
            }),
          ),
        );

        // Add to vector store
        await vectorStore.addDocumentChunks(
          dbChunks.map((dbChunk, idx) => ({
            id: dbChunk.id,
            content: dbChunk.content,
            embedding: embeddings[idx],
            documentId: dbChunk.documentId,
            sourceId: document.sourceId,
            projectId,
            metadata: {
              chunkIndex: dbChunk.chunkIndex,
              title: document.title,
              url: document.url,
            },
          })),
        );

        // Update progress
        job.progress(Math.round(((i + batch.length) / chunksToProcess.length) * 100));
      }

      // Update document chunk count
      await prisma.document.update({
        where: { id: documentId },
        data: {
          chunkCount: chunksToProcess.length,
          embeddingModel: 'text-embedding-ada-002',
        },
      });

      // Mark job as completed
      await prisma.job.update({
        where: { id: embeddingJob.id },
        data: {
          status: JobStatus.completed,
          completedAt: new Date(),
          result: {
            chunksCreated: chunksToProcess.length,
            embeddingModel: 'text-embedding-ada-002',
            chunkingStrategy: chunkingResult.metadata.strategy,
          },
        },
      });

      this.logger.log(`Completed embedding generation for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to generate embeddings for document ${documentId}`, error);

      // Mark job as failed
      await prisma.job.update({
        where: { id: embeddingJob.id },
        data: {
          status: JobStatus.failed,
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  private detectChunkingStrategy(document: any): ChunkingStrategy {
    const mimeType = document.metadata?.mimeType || '';
    const title = document.title.toLowerCase();

    if (mimeType.includes('markdown') || title.endsWith('.md')) {
      return ChunkingStrategy.MARKDOWN;
    }

    if (
      mimeType.includes('javascript') ||
      mimeType.includes('typescript') ||
      mimeType.includes('python') ||
      title.match(/\.(js|ts|py|java|cpp|cs|go|rb|php)$/)
    ) {
      return ChunkingStrategy.CODE;
    }

    return ChunkingStrategy.RECURSIVE;
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Placeholder implementation
    // In production, this would call OpenAI, Anthropic, or another embedding service
    
    // For now, return random embeddings
    return texts.map(() => {
      const embedding = new Array(1536);
      for (let i = 0; i < 1536; i++) {
        embedding[i] = Math.random() * 2 - 1;
      }
      return embedding;
    });
  }
}