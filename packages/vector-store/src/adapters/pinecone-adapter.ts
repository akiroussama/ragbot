import { Pinecone, Index } from '@pinecone-database/pinecone';
import {
  VectorStoreAdapter,
  VectorDocument,
  SearchResult,
  SearchOptions,
  UpsertOptions,
  CollectionInfo,
  VectorStoreStats,
} from '../types';
import { Logger } from '@nestjs/common';

export interface PineconeConfig {
  apiKey: string;
  environment?: string;
  projectName?: string;
  indexPrefix?: string;
}

export class PineconeAdapter implements VectorStoreAdapter {
  public readonly name = 'pinecone';
  private readonly logger = new Logger(PineconeAdapter.name);
  private client: Pinecone;
  private config: PineconeConfig;
  private indexes: Map<string, Index> = new Map();

  constructor(config: PineconeConfig) {
    this.config = config;
    this.client = new Pinecone({
      apiKey: config.apiKey,
      environment: config.environment,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.listIndexes();
      this.logger.log('Pinecone client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone client', error);
      throw new Error(`Pinecone initialization failed: ${error.message}`);
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options: any = {},
  ): Promise<void> {
    const indexName = this.getIndexName(name);
    
    try {
      await this.client.createIndex({
        name: indexName,
        dimension: dimensions,
        metric: options.metric || 'cosine',
        spec: {
          serverless: {
            cloud: options.cloud || 'aws',
            region: options.region || 'us-east-1',
          },
        },
        waitUntilReady: true,
      });
      
      this.logger.log(`Created Pinecone index: ${indexName}`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.warn(`Index ${indexName} already exists`);
        return;
      }
      throw new Error(`Failed to create index ${indexName}: ${error.message}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    const indexName = this.getIndexName(name);
    
    try {
      await this.client.deleteIndex(indexName);
      this.indexes.delete(indexName);
      this.logger.log(`Deleted Pinecone index: ${indexName}`);
    } catch (error) {
      throw new Error(`Failed to delete index ${indexName}: ${error.message}`);
    }
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options: UpsertOptions = {},
  ): Promise<void> {
    const index = await this.getIndex(collectionName);
    
    try {
      const vectors = documents.map((doc) => ({
        id: doc.id,
        values: doc.vector,
        metadata: {
          ...doc.metadata,
          content: doc.content,
          tenantId: doc.tenantId,
        },
      }));

      await index.upsert(vectors);
      
      this.logger.debug(`Upserted ${documents.length} documents to ${collectionName}`);
    } catch (error) {
      throw new Error(`Failed to upsert documents to ${collectionName}: ${error.message}`);
    }
  }

  async search(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const index = await this.getIndex(collectionName);
    
    try {
      const filter: any = {};
      
      if (options.filter) {
        Object.assign(filter, options.filter);
      }
      
      if (options.tenantId) {
        filter.tenantId = { $eq: options.tenantId };
      }

      const queryRequest: any = {
        vector: queryVector,
        topK: options.limit || 10,
        includeMetadata: true,
        includeValues: options.includeVectors || false,
      };

      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }

      const response = await index.query(queryRequest);
      
      return (response.matches || []).map((match) => ({
        id: match.id,
        score: match.score || 0,
        content: match.metadata?.content as string || '',
        metadata: {
          ...match.metadata,
          content: undefined,
          tenantId: undefined,
        },
        tenantId: match.metadata?.tenantId as string,
        vector: match.values as number[] | undefined,
      })).filter((result) => {
        return options.scoreThreshold === undefined || result.score >= options.scoreThreshold;
      });
    } catch (error) {
      throw new Error(`Failed to search in index ${collectionName}: ${error.message}`);
    }
  }

  async delete(
    collectionName: string,
    ids: string[],
    options: any = {},
  ): Promise<void> {
    const index = await this.getIndex(collectionName);
    
    try {
      await index.deleteMany(ids);
      
      this.logger.debug(`Deleted ${ids.length} documents from ${collectionName}`);
    } catch (error) {
      throw new Error(`Failed to delete documents from ${collectionName}: ${error.message}`);
    }
  }

  async batchUpsert(
    collectionName: string,
    documents: VectorDocument[],
    batchSize: number = 100,
    options: UpsertOptions = {},
  ): Promise<void> {
    const batches = this.chunkArray(documents, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      await this.upsert(collectionName, batches[i], options);
      this.logger.debug(`Processed batch ${i + 1}/${batches.length}`);
      
      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    const indexName = this.getIndexName(name);
    
    try {
      const indexList = await this.client.listIndexes();
      const indexInfo = indexList.indexes?.find((idx) => idx.name === indexName);
      
      if (!indexInfo) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = await this.getIndex(name);
      const stats = await index.describeIndexStats();
      
      return {
        name: indexName,
        dimensions: indexInfo.dimension || 0,
        documentCount: stats.totalVectorCount || 0,
        indexedCount: stats.totalVectorCount || 0,
        storageSize: 0, // Pinecone doesn't provide storage size
      };
    } catch (error) {
      throw new Error(`Failed to get index info for ${indexName}: ${error.message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const response = await this.client.listIndexes();
      const prefix = this.config.indexPrefix ? `${this.config.indexPrefix}-` : '';
      
      return (response.indexes || [])
        .map((index) => index.name)
        .filter((name) => !prefix || name.startsWith(prefix))
        .map((name) => prefix ? name.substring(prefix.length) : name);
    } catch (error) {
      throw new Error(`Failed to list indexes: ${error.message}`);
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    try {
      const indexList = await this.client.listIndexes();
      let totalDocuments = 0;
      
      for (const indexInfo of indexList.indexes || []) {
        try {
          const index = this.client.index(indexInfo.name);
          const stats = await index.describeIndexStats();
          totalDocuments += stats.totalVectorCount || 0;
        } catch (error) {
          this.logger.warn(`Failed to get stats for index ${indexInfo.name}`, error);
        }
      }
      
      return {
        totalCollections: (indexList.indexes || []).length,
        totalDocuments,
        totalStorageSize: 0, // Pinecone doesn't provide storage size
        provider: this.name,
      };
    } catch (error) {
      throw new Error(`Failed to get Pinecone stats: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.listIndexes();
      return true;
    } catch (error) {
      this.logger.error('Pinecone health check failed', error);
      return false;
    }
  }

  private async getIndex(collectionName: string): Promise<Index> {
    const indexName = this.getIndexName(collectionName);
    
    if (!this.indexes.has(indexName)) {
      const index = this.client.index(indexName);
      this.indexes.set(indexName, index);
    }
    
    return this.indexes.get(indexName)!;
  }

  private getIndexName(name: string): string {
    return this.config.indexPrefix ? `${this.config.indexPrefix}-${name}` : name;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}