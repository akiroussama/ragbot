import { ChromaApi, CreateCollection, Collection, QueryResponse } from 'chromadb';
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

export interface ChromaConfig {
  path?: string;
  host?: string;
  port?: number;
  ssl?: boolean;
  auth?: {
    provider: string;
    credentials?: string;
    tokenHeaderType?: string;
  };
  collectionPrefix?: string;
}

export class ChromaAdapter implements VectorStoreAdapter {
  public readonly name = 'chroma';
  private readonly logger = new Logger(ChromaAdapter.name);
  private client: ChromaApi;
  private config: ChromaConfig;
  private collections: Map<string, Collection> = new Map();

  constructor(config: ChromaConfig = {}) {
    this.config = config;
    
    const clientConfig: any = {};
    
    if (config.path) {
      clientConfig.path = config.path;
    } else {
      clientConfig.host = config.host || 'localhost';
      clientConfig.port = config.port || 8000;
      clientConfig.ssl = config.ssl || false;
    }
    
    if (config.auth) {
      clientConfig.auth = config.auth;
    }
    
    this.client = new ChromaApi(clientConfig);
  }

  async initialize(): Promise<void> {
    try {
      await this.client.listCollections();
      this.logger.log('Chroma client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Chroma client', error);
      throw new Error(`Chroma initialization failed: ${error.message}`);
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options: any = {},
  ): Promise<void> {
    const collectionName = this.getCollectionName(name);
    
    try {
      const createParams: CreateCollection = {
        name: collectionName,
        metadata: {
          dimensions,
          ...options.metadata,
        },
      };
      
      if (options.embeddingFunction) {
        createParams.embeddingFunction = options.embeddingFunction;
      }
      
      await this.client.createCollection(createParams);
      
      this.logger.log(`Created Chroma collection: ${collectionName}`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.warn(`Collection ${collectionName} already exists`);
        return;
      }
      throw new Error(`Failed to create collection ${collectionName}: ${error.message}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    const collectionName = this.getCollectionName(name);
    
    try {
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      this.logger.log(`Deleted Chroma collection: ${collectionName}`);
    } catch (error) {
      throw new Error(`Failed to delete collection ${collectionName}: ${error.message}`);
    }
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options: UpsertOptions = {},
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);
    
    try {
      const ids = documents.map((doc) => doc.id);
      const embeddings = documents.map((doc) => doc.vector);
      const metadatas = documents.map((doc) => ({
        ...doc.metadata,
        tenantId: doc.tenantId,
      }));
      const documentsData = documents.map((doc) => doc.content);
      
      await collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents: documentsData,
      });
      
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
    const collection = await this.getCollection(collectionName);
    
    try {
      const queryParams: any = {
        queryEmbeddings: [queryVector],
        nResults: options.limit || 10,
        include: ['metadatas', 'documents', 'distances'],
      };
      
      if (options.includeVectors) {
        queryParams.include.push('embeddings');
      }
      
      // Build where filter
      const where: any = {};
      
      if (options.tenantId) {
        where.tenantId = { $eq: options.tenantId };
      }
      
      if (options.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          if (Array.isArray(value)) {
            where[key] = { $in: value };
          } else if (typeof value === 'object' && value !== null) {
            if (value.gte !== undefined || value.lte !== undefined) {
              const range: any = {};
              if (value.gte !== undefined) range.$gte = value.gte;
              if (value.lte !== undefined) range.$lte = value.lte;
              where[key] = range;
            } else {
              where[key] = { $eq: value };
            }
          } else {
            where[key] = { $eq: value };
          }
        }
      }
      
      if (Object.keys(where).length > 0) {
        queryParams.where = where;
      }
      
      const response: QueryResponse = await collection.query(queryParams);
      
      const results: SearchResult[] = [];
      
      for (let i = 0; i < (response.ids?.[0]?.length || 0); i++) {
        const distance = response.distances?.[0]?.[i] || 0;
        const score = 1 - distance; // Convert distance to similarity score
        
        if (options.scoreThreshold === undefined || score >= options.scoreThreshold) {
          const metadata = response.metadatas?.[0]?.[i] || {};
          const { tenantId, ...cleanMetadata } = metadata;
          
          results.push({
            id: response.ids[0][i],
            score,
            content: response.documents?.[0]?.[i] || '',
            metadata: cleanMetadata,
            tenantId: tenantId as string,
            vector: response.embeddings?.[0]?.[i] as number[] | undefined,
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to search in collection ${collectionName}: ${error.message}`);
    }
  }

  async delete(
    collectionName: string,
    ids: string[],
    options: any = {},
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);
    
    try {
      await collection.delete({ ids });
      
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
    }
  }

  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    const collectionName = this.getCollectionName(name);
    
    try {
      const collection = await this.getCollection(name);
      const count = await collection.count();
      
      return {
        name: collectionName,
        dimensions: 0, // Chroma doesn't expose dimensions easily
        documentCount: count,
        indexedCount: count,
        storageSize: 0, // Chroma doesn't provide storage size
      };
    } catch (error) {
      throw new Error(`Failed to get collection info for ${collectionName}: ${error.message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections();
      const prefix = this.config.collectionPrefix ? `${this.config.collectionPrefix}_` : '';
      
      return collections
        .map((collection) => collection.name)
        .filter((name) => !prefix || name.startsWith(prefix))
        .map((name) => prefix ? name.substring(prefix.length) : name);
    } catch (error) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    try {
      const collections = await this.client.listCollections();
      let totalDocuments = 0;
      
      for (const collectionInfo of collections) {
        try {
          const collection = await this.client.getCollection({ name: collectionInfo.name });
          const count = await collection.count();
          totalDocuments += count;
        } catch (error) {
          this.logger.warn(`Failed to get stats for collection ${collectionInfo.name}`, error);
        }
      }
      
      return {
        totalCollections: collections.length,
        totalDocuments,
        totalStorageSize: 0, // Chroma doesn't provide storage size
        provider: this.name,
      };
    } catch (error) {
      throw new Error(`Failed to get Chroma stats: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      this.logger.error('Chroma health check failed', error);
      return false;
    }
  }

  private async getCollection(collectionName: string): Promise<Collection> {
    const fullName = this.getCollectionName(collectionName);
    
    if (!this.collections.has(fullName)) {
      const collection = await this.client.getCollection({ name: fullName });
      this.collections.set(fullName, collection);
    }
    
    return this.collections.get(fullName)!;
  }

  private getCollectionName(name: string): string {
    return this.config.collectionPrefix ? `${this.config.collectionPrefix}_${name}` : name;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}