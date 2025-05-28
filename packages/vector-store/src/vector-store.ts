import {
  VectorStoreAdapter,
  VectorDocument,
  SearchResult,
  SearchOptions,
  UpsertOptions,
  CollectionInfo,
  VectorStoreStats,
} from './types';
import {
  QdrantAdapter,
  PineconeAdapter,
  WeaviateAdapter,
  ChromaAdapter,
  PgVectorAdapter,
  type QdrantConfig,
  type PineconeConfig,
  type WeaviateConfig,
  type ChromaConfig,
  type PgVectorConfig,
} from './adapters';
import { Logger } from '@nestjs/common';

export type VectorStoreProvider = 'qdrant' | 'pinecone' | 'weaviate' | 'chroma' | 'pgvector';

export type VectorStoreConfig = {
  provider: 'qdrant';
  config: QdrantConfig;
} | {
  provider: 'pinecone';
  config: PineconeConfig;
} | {
  provider: 'weaviate';
  config: WeaviateConfig;
} | {
  provider: 'chroma';
  config: ChromaConfig;
} | {
  provider: 'pgvector';
  config: PgVectorConfig;
};

export interface VectorStoreOptions {
  enableHealthCheck?: boolean;
  healthCheckInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
}

export class VectorStore {
  private readonly logger = new Logger(VectorStore.name);
  private adapter: VectorStoreAdapter;
  private options: VectorStoreOptions;
  private healthCheckTimer?: NodeJS.Timeout;
  private metrics: {
    operations: number;
    errors: number;
    lastHealthCheck?: Date;
    isHealthy: boolean;
  } = {
    operations: 0,
    errors: 0,
    isHealthy: true,
  };

  constructor(config: VectorStoreConfig, options: VectorStoreOptions = {}) {
    this.options = {
      enableHealthCheck: true,
      healthCheckInterval: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      enableMetrics: true,
      ...options,
    };

    this.adapter = this.createAdapter(config);
  }

  async initialize(): Promise<void> {
    try {
      await this.adapter.initialize();
      
      if (this.options.enableHealthCheck) {
        this.startHealthCheck();
      }
      
      this.logger.log(`Vector store initialized with provider: ${this.adapter.name}`);
    } catch (error) {
      this.logger.error('Failed to initialize vector store', error);
      throw error;
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options?: any,
  ): Promise<void> {
    return this.executeWithRetry(() => 
      this.adapter.createCollection(name, dimensions, options)
    );
  }

  async deleteCollection(name: string): Promise<void> {
    return this.executeWithRetry(() => 
      this.adapter.deleteCollection(name)
    );
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options?: UpsertOptions,
  ): Promise<void> {
    return this.executeWithRetry(() => 
      this.adapter.upsert(collectionName, documents, options)
    );
  }

  async search(
    collectionName: string,
    queryVector: number[],
    options?: SearchOptions,
  ): Promise<SearchResult[]> {
    return this.executeWithRetry(() => 
      this.adapter.search(collectionName, queryVector, options)
    );
  }

  async delete(
    collectionName: string,
    ids: string[],
    options?: any,
  ): Promise<void> {
    return this.executeWithRetry(() => 
      this.adapter.delete(collectionName, ids, options)
    );
  }

  async batchUpsert(
    collectionName: string,
    documents: VectorDocument[],
    batchSize?: number,
    options?: UpsertOptions,
  ): Promise<void> {
    return this.executeWithRetry(() => 
      this.adapter.batchUpsert(collectionName, documents, batchSize, options)
    );
  }

  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    return this.executeWithRetry(() => 
      this.adapter.getCollectionInfo(name)
    );
  }

  async listCollections(): Promise<string[]> {
    return this.executeWithRetry(() => 
      this.adapter.listCollections()
    );
  }

  async getStats(): Promise<VectorStoreStats> {
    return this.executeWithRetry(() => 
      this.adapter.getStats()
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const isHealthy = await this.adapter.healthCheck();
      this.metrics.isHealthy = isHealthy;
      this.metrics.lastHealthCheck = new Date();
      return isHealthy;
    } catch (error) {
      this.logger.error('Health check failed', error);
      this.metrics.isHealthy = false;
      this.metrics.lastHealthCheck = new Date();
      return false;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getProvider(): string {
    return this.adapter.name;
  }

  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Close adapter if it has a close method
    if ('close' in this.adapter && typeof this.adapter.close === 'function') {
      await (this.adapter as any).close();
    }
    
    this.logger.log('Vector store destroyed');
  }

  private createAdapter(config: VectorStoreConfig): VectorStoreAdapter {
    switch (config.provider) {
      case 'qdrant':
        return new QdrantAdapter(config.config);
      case 'pinecone':
        return new PineconeAdapter(config.config);
      case 'weaviate':
        return new WeaviateAdapter(config.config);
      case 'chroma':
        return new ChromaAdapter(config.config);
      case 'pgvector':
        return new PgVectorAdapter(config.config);
      default:
        throw new Error(`Unsupported vector store provider: ${(config as any).provider}`);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        if (this.options.enableMetrics) {
          this.metrics.operations++;
        }
        
        const result = await operation();
        
        // Reset error count on success
        if (attempt > 1) {
          this.logger.log(`Operation succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (this.options.enableMetrics) {
          this.metrics.errors++;
        }
        
        if (attempt === this.options.retryAttempts) {
          this.logger.error(
            `Operation failed after ${attempt} attempts: ${error.message}`,
            error,
          );
          throw error;
        }
        
        this.logger.warn(
          `Operation failed (attempt ${attempt}/${this.options.retryAttempts}): ${error.message}. Retrying in ${this.options.retryDelay}ms...`,
        );
        
        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
      }
    }
    
    throw lastError!;
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        this.logger.error('Scheduled health check failed', error);
      }
    }, this.options.healthCheckInterval);
    
    this.logger.log(`Health check started with interval: ${this.options.healthCheckInterval}ms`);
  }
}