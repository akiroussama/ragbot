import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorStore, VectorStoreConfig } from './vector-store';
import {
  VectorDocument,
  SearchResult,
  SearchOptions,
  UpsertOptions,
  CollectionInfo,
  VectorStoreStats,
} from './types';

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private vectorStore: VectorStore;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const config = this.getVectorStoreConfig();
    this.vectorStore = new VectorStore(config, {
      enableHealthCheck: this.configService.get('VECTOR_STORE_HEALTH_CHECK', true),
      healthCheckInterval: this.configService.get('VECTOR_STORE_HEALTH_CHECK_INTERVAL', 30000),
      retryAttempts: this.configService.get('VECTOR_STORE_RETRY_ATTEMPTS', 3),
      retryDelay: this.configService.get('VECTOR_STORE_RETRY_DELAY', 1000),
      enableMetrics: this.configService.get('VECTOR_STORE_ENABLE_METRICS', true),
    });

    await this.vectorStore.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.vectorStore) {
      await this.vectorStore.destroy();
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options?: any,
  ): Promise<void> {
    return this.vectorStore.createCollection(name, dimensions, options);
  }

  async deleteCollection(name: string): Promise<void> {
    return this.vectorStore.deleteCollection(name);
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options?: UpsertOptions,
  ): Promise<void> {
    return this.vectorStore.upsert(collectionName, documents, options);
  }

  async search(
    collectionName: string,
    queryVector: number[],
    options?: SearchOptions,
  ): Promise<SearchResult[]> {
    return this.vectorStore.search(collectionName, queryVector, options);
  }

  async delete(
    collectionName: string,
    ids: string[],
    options?: any,
  ): Promise<void> {
    return this.vectorStore.delete(collectionName, ids, options);
  }

  async batchUpsert(
    collectionName: string,
    documents: VectorDocument[],
    batchSize?: number,
    options?: UpsertOptions,
  ): Promise<void> {
    return this.vectorStore.batchUpsert(collectionName, documents, batchSize, options);
  }

  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    return this.vectorStore.getCollectionInfo(name);
  }

  async listCollections(): Promise<string[]> {
    return this.vectorStore.listCollections();
  }

  async getStats(): Promise<VectorStoreStats> {
    return this.vectorStore.getStats();
  }

  async healthCheck(): Promise<boolean> {
    return this.vectorStore.healthCheck();
  }

  getMetrics() {
    return this.vectorStore.getMetrics();
  }

  getProvider(): string {
    return this.vectorStore.getProvider();
  }

  private getVectorStoreConfig(): VectorStoreConfig {
    const provider = this.configService.get('VECTOR_STORE_PROVIDER', 'qdrant');

    switch (provider) {
      case 'qdrant':
        return {
          provider: 'qdrant',
          config: {
            url: this.configService.get('QDRANT_URL', 'http://localhost:6333'),
            apiKey: this.configService.get('QDRANT_API_KEY'),
            timeout: this.configService.get('QDRANT_TIMEOUT', 30000),
            prefix: this.configService.get('QDRANT_PREFIX'),
          },
        };

      case 'pinecone':
        return {
          provider: 'pinecone',
          config: {
            apiKey: this.configService.getOrThrow('PINECONE_API_KEY'),
            environment: this.configService.get('PINECONE_ENVIRONMENT'),
            projectName: this.configService.get('PINECONE_PROJECT_NAME'),
            indexPrefix: this.configService.get('PINECONE_INDEX_PREFIX'),
          },
        };

      case 'weaviate':
        return {
          provider: 'weaviate',
          config: {
            scheme: this.configService.get('WEAVIATE_SCHEME', 'http') as 'http' | 'https',
            host: this.configService.get('WEAVIATE_HOST', 'localhost:8080'),
            apiKey: this.configService.get('WEAVIATE_API_KEY'),
            classPrefix: this.configService.get('WEAVIATE_CLASS_PREFIX'),
          },
        };

      case 'chroma':
        return {
          provider: 'chroma',
          config: {
            host: this.configService.get('CHROMA_HOST', 'localhost'),
            port: this.configService.get('CHROMA_PORT', 8000),
            ssl: this.configService.get('CHROMA_SSL', false),
            path: this.configService.get('CHROMA_PATH'),
            collectionPrefix: this.configService.get('CHROMA_COLLECTION_PREFIX'),
          },
        };

      case 'pgvector':
        return {
          provider: 'pgvector',
          config: {
            host: this.configService.get('PGVECTOR_HOST', 'localhost'),
            port: this.configService.get('PGVECTOR_PORT', 5432),
            database: this.configService.getOrThrow('PGVECTOR_DATABASE'),
            user: this.configService.getOrThrow('PGVECTOR_USER'),
            password: this.configService.getOrThrow('PGVECTOR_PASSWORD'),
            ssl: this.configService.get('PGVECTOR_SSL', false),
            schema: this.configService.get('PGVECTOR_SCHEMA', 'public'),
            tablePrefix: this.configService.get('PGVECTOR_TABLE_PREFIX'),
            maxConnections: this.configService.get('PGVECTOR_MAX_CONNECTIONS', 20),
          },
        };

      default:
        throw new Error(`Unsupported vector store provider: ${provider}`);
    }
  }
}