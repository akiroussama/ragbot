import { QdrantClient, Schemas } from '@qdrant/js-client-rest';
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

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  prefix?: string;
}

export class QdrantAdapter implements VectorStoreAdapter {
  public readonly name = 'qdrant';
  private readonly logger = new Logger(QdrantAdapter.name);
  private client: QdrantClient;
  private config: QdrantConfig;

  constructor(config: QdrantConfig) {
    this.config = config;
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.getCollections();
      this.logger.log('Qdrant client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Qdrant client', error);
      throw new Error(`Qdrant initialization failed: ${error.message}`);
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options: any = {},
  ): Promise<void> {
    const collectionName = this.getCollectionName(name);
    
    try {
      await this.client.createCollection(collectionName, {
        vectors: {
          size: dimensions,
          distance: options.distance || 'Cosine',
        },
        optimizers_config: {
          default_segment_number: options.segmentNumber || 2,
        },
        replication_factor: options.replicationFactor || 1,
        write_consistency_factor: options.writeConsistency || 1,
      });
      
      this.logger.log(`Created Qdrant collection: ${collectionName}`);
    } catch (error) {
      if (error.status === 409) {
        this.logger.warn(`Collection ${collectionName} already exists`);
        return;
      }
      throw new Error(`Failed to create collection ${collectionName}: ${error.message}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    const collectionName = this.getCollectionName(name);
    
    try {
      await this.client.deleteCollection(collectionName);
      this.logger.log(`Deleted Qdrant collection: ${collectionName}`);
    } catch (error) {
      throw new Error(`Failed to delete collection ${collectionName}: ${error.message}`);
    }
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options: UpsertOptions = {},
  ): Promise<void> {
    const collection = this.getCollectionName(collectionName);
    
    try {
      const points = documents.map((doc) => ({
        id: doc.id,
        vector: doc.vector,
        payload: {
          ...doc.metadata,
          content: doc.content,
          tenantId: doc.tenantId,
        },
      }));

      await this.client.upsert(collection, {
        wait: options.wait !== false,
        points,
      });
      
      this.logger.debug(`Upserted ${documents.length} documents to ${collection}`);
    } catch (error) {
      throw new Error(`Failed to upsert documents to ${collection}: ${error.message}`);
    }
  }

  async search(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const collection = this.getCollectionName(collectionName);
    
    try {
      const filter: any = {};
      
      if (options.filter) {
        Object.assign(filter, this.buildFilter(options.filter));
      }
      
      if (options.tenantId) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'tenantId',
          match: { value: options.tenantId },
        });
      }

      const searchParams: any = {
        vector: queryVector,
        limit: options.limit || 10,
        with_payload: true,
        with_vector: options.includeVectors || false,
      };

      if (Object.keys(filter).length > 0) {
        searchParams.filter = filter;
      }

      if (options.scoreThreshold !== undefined) {
        searchParams.score_threshold = options.scoreThreshold;
      }

      const response = await this.client.search(collection, searchParams);
      
      return response.map((point) => ({
        id: point.id as string,
        score: point.score,
        content: point.payload?.content as string,
        metadata: {
          ...point.payload,
          content: undefined,
          tenantId: undefined,
        },
        tenantId: point.payload?.tenantId as string,
        vector: point.vector as number[] | undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to search in collection ${collection}: ${error.message}`);
    }
  }

  async delete(
    collectionName: string,
    ids: string[],
    options: any = {},
  ): Promise<void> {
    const collection = this.getCollectionName(collectionName);
    
    try {
      await this.client.delete(collection, {
        wait: options.wait !== false,
        points: ids,
      });
      
      this.logger.debug(`Deleted ${ids.length} documents from ${collection}`);
    } catch (error) {
      throw new Error(`Failed to delete documents from ${collection}: ${error.message}`);
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
    }
  }

  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    const collectionName = this.getCollectionName(name);
    
    try {
      const info = await this.client.getCollection(collectionName);
      
      return {
        name: collectionName,
        dimensions: info.config.params.vectors.size,
        documentCount: info.points_count || 0,
        indexedCount: info.indexed_vectors_count || 0,
        storageSize: info.disk_data_size || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get collection info for ${collectionName}: ${error.message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const response = await this.client.getCollections();
      const prefix = this.config.prefix ? `${this.config.prefix}_` : '';
      
      return response.collections
        .map((collection) => collection.name)
        .filter((name) => !prefix || name.startsWith(prefix))
        .map((name) => prefix ? name.substring(prefix.length) : name);
    } catch (error) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    try {
      const collections = await this.client.getCollections();
      let totalDocuments = 0;
      let totalStorageSize = 0;
      
      for (const collection of collections.collections) {
        const info = await this.client.getCollection(collection.name);
        totalDocuments += info.points_count || 0;
        totalStorageSize += info.disk_data_size || 0;
      }
      
      return {
        totalCollections: collections.collections.length,
        totalDocuments,
        totalStorageSize,
        provider: this.name,
      };
    } catch (error) {
      throw new Error(`Failed to get Qdrant stats: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      this.logger.error('Qdrant health check failed', error);
      return false;
    }
  }

  private getCollectionName(name: string): string {
    return this.config.prefix ? `${this.config.prefix}_${name}` : name;
  }

  private buildFilter(filter: Record<string, any>): any {
    const qdrantFilter: any = { must: [] };
    
    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        qdrantFilter.must.push({
          key,
          match: { any: value },
        });
      } else if (typeof value === 'object' && value !== null) {
        if (value.gte !== undefined || value.lte !== undefined) {
          const range: any = {};
          if (value.gte !== undefined) range.gte = value.gte;
          if (value.lte !== undefined) range.lte = value.lte;
          qdrantFilter.must.push({ key, range });
        } else {
          qdrantFilter.must.push({
            key,
            match: { value },
          });
        }
      } else {
        qdrantFilter.must.push({
          key,
          match: { value },
        });
      }
    }
    
    return qdrantFilter;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}